import asyncio
import hashlib
import json
import re
import secrets
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import asyncpg
import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
import os
from pathlib import Path

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", os.path.join(os.path.dirname(__file__), "storage")))

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required")

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False
app = FastAPI()
app.state.pool = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ALLOW_ORIGINS") is None else os.getenv("ALLOW_ORIGINS").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/favicon.ico")
async def favicon():
    favicon_path = Path(__file__).resolve().parent.parent / "public" / "favicon.ico"
    if favicon_path.exists() and favicon_path.is_file():
        return FileResponse(favicon_path)
    raise HTTPException(status_code=404, detail={"message": "Favicon not found"})

@app.get("/robots.txt")
async def robots_txt(request: Request):
    host_url = str(request.base_url).rstrip("/")
    content = f"""User-agent: *
Allow: /

Disallow: /admin
Disallow: /dashboard

Sitemap: {host_url}/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")

@app.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    base_url = str(request.base_url).rstrip("/")
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    urls = [
        {"loc": f"{base_url}/", "lastmod": now_iso, "changefreq": "daily", "priority": "1.0"},
        {"loc": f"{base_url}/products", "lastmod": now_iso, "changefreq": "daily", "priority": "0.9"},
        {"loc": f"{base_url}/custom-order", "lastmod": now_iso, "changefreq": "weekly", "priority": "0.8"},
        {"loc": f"{base_url}/blog", "lastmod": now_iso, "changefreq": "daily", "priority": "0.8"},
        {"loc": f"{base_url}/sitemap", "lastmod": now_iso, "changefreq": "monthly", "priority": "0.5"},
        {"loc": f"{base_url}/affiliate", "lastmod": now_iso, "changefreq": "weekly", "priority": "0.6"},
    ]

    # Fetch active products
    if app.state.pool:
        try:
            products = await fetch_all(app.state.pool, "SELECT id, slug, updated_at, created_at FROM products WHERE is_available = true ORDER BY id DESC")
            for p in products:
                slug_or_id = p.get("slug") or str(p.get("id"))
                lastmod = p.get("updated_at") or p.get("created_at") or datetime.utcnow()
                lastmod_str = lastmod.strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(lastmod, datetime) else now_iso
                urls.append({
                    "loc": f"{base_url}/product/{slug_or_id}",
                    "lastmod": lastmod_str,
                    "changefreq": "weekly",
                    "priority": "0.8"
                })
        except Exception:
            pass

        # Fetch published blog posts
        try:
            posts = await fetch_all(app.state.pool, "SELECT id, slug, published_at, created_at FROM blog_posts WHERE is_published = true ORDER BY id DESC")
            for post in posts:
                slug_or_id = post.get("slug") or str(post.get("id"))
                lastmod = post.get("published_at") or post.get("created_at") or datetime.utcnow()
                lastmod_str = lastmod.strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(lastmod, datetime) else now_iso
                urls.append({
                    "loc": f"{base_url}/blog/{slug_or_id}",
                    "lastmod": lastmod_str,
                    "changefreq": "weekly",
                    "priority": "0.7"
                })
        except Exception:
            pass

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        xml_content += "  <url>\n"
        xml_content += f"    <loc>{u['loc']}</loc>\n"
        xml_content += f"    <lastmod>{u['lastmod']}</lastmod>\n"
        xml_content += f"    <changefreq>{u['changefreq']}</changefreq>\n"
        xml_content += f"    <priority>{u['priority']}</priority>\n"
        xml_content += "  </url>\n"
    xml_content += "</urlset>"

    return Response(content=xml_content, media_type="application/xml")


class QueryOrder(BaseModel):
    column: Optional[str] = None
    field: Optional[str] = None
    ascending: bool = True

    def get_column(self) -> str:
        return self.column or self.field or ""

class QueryFilter(BaseModel):
    model_config = {"extra": "allow"}
    field: Optional[str] = None
    column: Optional[str] = None
    operator: Optional[str] = None
    op: Optional[str] = None
    value: Any

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if isinstance(obj, dict):
            if not obj.get("field") and obj.get("column"):
                obj["field"] = obj["column"]
            if not obj.get("operator") and obj.get("op"):
                obj["operator"] = obj["op"]
        return super().model_validate(obj, *args, **kwargs)

    def get_field(self) -> str:
        return self.field or self.column or ""

    def get_operator(self) -> str:
        return self.operator or self.op or ""



class QueryRequest(BaseModel):
    table: str
    select: str = "*"
    filters: List[QueryFilter] = []
    order: Optional[QueryOrder] = None
    limit: Optional[int] = None
    single: bool = False
    maybeSingle: bool = False
    operation: str = "GET"
    data: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = None
    count: Optional[str] = None
    head: Optional[bool] = False

class AuthRequest(BaseModel):
    email: EmailStr
    password: str
    options: Optional[Dict[str, Any]] = None

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    options: Optional[Dict[str, Any]] = None

class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None

async def open_pool() -> asyncpg.Pool:
    if app.state.pool is None:
        app.state.pool = await asyncpg.create_pool(DATABASE_URL, max_size=10)
    return app.state.pool

@app.on_event("shutdown")
async def close_pool():
    if app.state.pool is not None:
        await app.state.pool.close()
        app.state.pool = None

async def fetch_one(pool: asyncpg.Pool, query: str, *args):
    async with pool.acquire() as connection:
        return await connection.fetchrow(query, *args)

async def fetch_all(pool: asyncpg.Pool, query: str, *args):
    async with pool.acquire() as connection:
        return await connection.fetch(query, *args)

async def execute(pool: asyncpg.Pool, query: str, *args):
    async with pool.acquire() as connection:
        return await connection.execute(query, *args)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(request: Request) -> Optional[Dict[str, Any]]:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

@app.exception_handler(asyncpg.PostgresError)
async def db_exception_handler(request: Request, exc: asyncpg.PostgresError):
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"error": {"message": str(exc)}})

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"error": {"message": str(exc)}})

RELATION_RE = re.compile(r"([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)")
FK_MAP: Dict[str, Dict[str, str]] = {
    "products": {"categories": "category_id", "stores": "store_id"},
    "categories": {"stores": "store_id"},
    "product_images": {"products": "product_id"},
    "reviews": {"products": "product_id", "users": "user_id", "profiles": "user_id"},
    "order_items": {"products": "product_id", "orders": "order_id"},
    "orders": {"users": "user_id"},
    "blog_posts": {"users": "author_id", "profiles": "author_id"},
    "wishlists": {"products": "product_id", "users": "user_id"},
    "cart_items": {"products": "product_id", "users": "user_id"},
    "profiles": {"users": "user_id", "referrers": "referred_by"},
    "referrals": {"referrers": "referrer_id", "referreds": "referred_id", "orders": "order_id"},
    "affiliates": {"users": "user_id", "stores": "store_id"},
    "affiliate_commissions": {"affiliates": "affiliate_id", "orders": "order_id"},
    "affiliate_withdrawals": {"affiliates": "affiliate_id"},
    "point_transactions": {"users": "user_id", "orders": "order_id"},
    "banners": {"stores": "store_id"},
    "images": {"products": "product_id"},
    "settings": {"stores": "store_id"},
}


def _split_select_fields(select: str) -> List[str]:
    """Split select string by commas, but NOT inside parentheses `(...)`.
    Handles nested parens & quoted strings with parens safely (ignores quotes for our use case).
    """
    result: List[str] = []
    current: List[str] = []
    depth = 0
    for ch in select:
        if ch == "," and depth == 0:
            token = "".join(current).strip()
            if token:
                result.append(token)
            current = []
        else:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth = max(0, depth - 1)
            current.append(ch)
    tail = "".join(current).strip()
    if tail:
        result.append(tail)
    return result


def _coerce_json_strings(obj: Any) -> Any:
    """Recursively walk dict/list; any string that looks like a JSON object/array
    (starts with `{` or `[`) will be json.loads()'d.
    """
    if isinstance(obj, dict):
        out: Dict[str, Any] = {}
        for k, v in obj.items():
            new_v = _coerce_json_strings(v)
            if isinstance(new_v, dict) and all(v2 is None for v2 in new_v.values()):
                out[k] = None
            elif isinstance(new_v, list) and len(new_v) == 0:
                out[k] = None
            else:
                out[k] = new_v
        return out
    if isinstance(obj, list):
        return [_coerce_json_strings(x) for x in obj]
    if isinstance(obj, str):
        s = obj.strip()
        if len(s) >= 2 and s[0] in "{[" and s[-1] in "}]":
            try:
                parsed = json.loads(s)
                return _coerce_json_strings(parsed)
            except Exception:
                return obj
    return obj


def _clean_relation_row(data: dict, parsed: dict) -> dict:
    """After asyncpg row is converted to dict, clean relation fields:
    - Coerce JSON strings to real dicts (via _coerce_json_strings)
    - Handle __all_fields merge
    - Drop relation dict if all values are None (LEFT JOIN null)
    """
    data = _coerce_json_strings(data)
    if not parsed.get("relations"):
        return data
    for rel in parsed["relations"]:
        rname = rel["table"]
        rval = data.get(rname)
        if not isinstance(rval, dict):
            continue
        all_fields = rval.pop("__all_fields", None)
        if isinstance(all_fields, dict):
            merged = {k: v for k, v in all_fields.items() if v is not None}
            for k, v in rval.items():
                if v is not None:
                    merged[k] = v
            data[rname] = merged if merged else None
        else:
            filtered = {k: v for k, v in rval.items() if k != "__all_fields" and v is not None}
            data[rname] = filtered if filtered else None
    return data


INT_COLUMNS = {
    "id", "user_id", "store_id", "category_id", "product_id", "order_id",
    "affiliate_id", "referrer_id", "referred_id", "author_id", "view_count",
    "sold_count", "review_count", "stock", "sort_order", "preorder_days",
    "shelf_life_days", "quantity"
}

def _coerce_val_for_db(key: str, val: Any) -> Any:
    if val is None or val == "":
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str or val_str.lower() in ("null", "undefined", "none"):
            return None
        if key.endswith("_id") or key in INT_COLUMNS or key == "id":
            if val_str.isdigit() or (val_str.startswith("-") and val_str[1:].isdigit()):
                try:
                    return int(val_str)
                except ValueError:
                    return None
    return val

_coerce_int_if_needed = _coerce_val_for_db


def parse_select_with_relations(base_table: str, select: str):
    """
    Parse select string like "*, categories(name, icon), users(email)" into:
    - direct_fields: fields to select from base table
    - relations: list of (rel_name, alias, fields, join_fk_field)
    - final_select_parts: SELECT expression parts including json_build_object for rels
    - join_clauses: LEFT JOIN clauses
    """
    parts = _split_select_fields(select)
    direct_fields: List[str] = []
    relations: List[Dict[str, Any]] = []
    final_select_parts: List[str] = []
    join_clauses: List[str] = []
    seen_aliases: Dict[str, int] = {}

    base_table_safe = re.sub(r"[^a-zA-Z0-9_]", "", base_table)

    for part in parts:
        m = RELATION_RE.fullmatch(part)
        if not m:
            direct_fields.append(part)
            if part == "*":
                final_select_parts.append(f'"{base_table_safe}".*')
            else:
                field_safe = re.sub(r"[^a-zA-Z0-9_\.\* ]", "", part).strip()
                if "." in field_safe:
                    final_select_parts.append(field_safe)
                else:
                    final_select_parts.append(f'"{base_table_safe}"."{field_safe}"')
            continue

        rel_table = m.group(1)
        rel_fields_raw = [f.strip() for f in m.group(2).split(",") if f.strip()]
        rel_fields = rel_fields_raw if rel_fields_raw else ["*"]

        alias_num = seen_aliases.get(rel_table, 0) + 1
        seen_aliases[rel_table] = alias_num
        rel_alias = f"__rel_{rel_table}" if alias_num == 1 else f"__rel_{rel_table}_{alias_num}"

        candidates: List[str] = []
        if base_table_safe in FK_MAP and rel_table in FK_MAP[base_table_safe]:
            candidates.append(FK_MAP[base_table_safe][rel_table])
        default_fk = f"{rel_table.rstrip('s')}_id"
        candidates.append(default_fk)
        candidates.append(f"{rel_table}_id")

        join_fk_field = candidates[0] if candidates else f"{rel_table}_id"

        json_kv: List[str] = []
        for rf in rel_fields:
            rf_safe = re.sub(r"[^a-zA-Z0-9_\* ]", "", rf).strip()
            if rf_safe == "*":
                for k in ("id", "name", "icon", "email", "slug", "description", "image_url", "price",
                          "created_at", "username", "full_name", "phone", "role", "rating", "comment",
                          "review_count", "avg_rating", "quantity", "unit_price", "total_price",
                          "status", "order_date", "address", "note", "weight", "sku", "stock",
                          "is_available", "is_preorder", "preorder_days"):
                    json_kv.append(f"'{k}'")
                    json_kv.append(f'"{rel_alias}"."{k}"')
                json_kv.append("'__all_fields'")
                json_kv.append(f"to_jsonb({rel_alias}.*)")
            else:
                json_kv.append(f"'{rf_safe}'")
                json_kv.append(f'"{rel_alias}"."{rf_safe}"')

        final_select_parts.append(
            f'json_build_object({", ".join(json_kv)}) AS "{rel_table}"'
        )

        join_clauses.append(
            f'LEFT JOIN "{rel_table}" AS "{rel_alias}" '
            f'ON "{base_table_safe}"."{join_fk_field}" = "{rel_alias}"."id"'
        )

        relations.append({
            "table": rel_table,
            "alias": rel_alias,
            "fields": rel_fields,
            "fk": join_fk_field,
        })

    if not direct_fields:
        final_select_parts.insert(0, f'"{base_table_safe}".*')

    return {
        "direct_fields": direct_fields,
        "relations": relations,
        "select_expr": ", ".join(final_select_parts),
        "from_clause": f'"{base_table_safe}"',
        "join_clauses": " ".join(join_clauses),
    }


@app.post("/query")
async def query_endpoint(request: QueryRequest):
    try:
        pool = await open_pool()
        table = request.table
        select = request.select
        conditions = []
        args = []
        arg_idx = 0

        def next_arg(val: Any, col_for_int: Optional[str] = None) -> int:
            nonlocal arg_idx, args
            arg_idx += 1
            if col_for_int is not None:
                val = _coerce_int_if_needed(col_for_int, val)
            args.append(val)
            return arg_idx

        for filter_item in request.filters:
            field_safe = filter_item.get_field()
            bare_field = field_safe.split(".")[-1].strip('"')
            if "." not in field_safe:
                field_safe = f'"{table}"."{field_safe}"'
            val = filter_item.value
            fop = filter_item.get_operator()
            if fop == "eq":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} = ${i}")
            elif fop == "ilike":
                i = next_arg(val, None)
                conditions.append(f"{field_safe} ILIKE ${i}")
            elif fop == "in":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} = ANY(${i})")
            elif fop == "neq":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} <> ${i}")
            elif fop == "gt":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} > ${i}")
            elif fop == "gte":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} >= ${i}")
            elif fop == "lt":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} < ${i}")
            elif fop == "lte":
                i = next_arg(val, bare_field)
                conditions.append(f"{field_safe} <= ${i}")
            elif fop == "is":
                i = next_arg(val, None)
                conditions.append(f"{field_safe} IS ${i}")
            else:
                raise HTTPException(status_code=400, detail={"message": f"Unsupported filter operator: {fop}"})

        table_safe = re.sub(r"[^a-zA-Z0-9_]", "", table)

        parsed = parse_select_with_relations(table_safe, "*" if request.count == "exact" else select)
        select_expr = parsed["select_expr"]
        from_clause = parsed["from_clause"]
        join_clauses = parsed["join_clauses"]

        if request.count == "exact":
            select_expr = "COUNT(*)"

        query = f"SELECT {select_expr} FROM {from_clause}"
        if join_clauses:
            query += f" {join_clauses}"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        if request.order and not request.count:
            col_safe = request.order.get_column() if hasattr(request.order, "get_column") else (request.order.column or request.order.field or "")
            if col_safe and "." not in col_safe:
                col_safe = f'"{table_safe}"."{col_safe}"'
            if col_safe:
                query += f" ORDER BY {col_safe} {'ASC' if request.order.ascending else 'DESC'}"
        if request.limit is not None and not request.count:
            query += f" LIMIT {request.limit}"

        if request.operation == "GET":
            if request.count and request.head:
                row = await fetch_one(pool, query, *args)
                return {"data": None, "error": None, "count": int(row[0]) if row else 0}
            if request.single or request.maybeSingle:
                row = await fetch_one(pool, query, *args)
                data = _clean_relation_row(dict(row), parsed) if row else None
                return {"data": data, "error": None}
            rows = await fetch_all(pool, query, *args)
            result = [_clean_relation_row(dict(r), parsed) for r in rows]
            return {"data": result, "error": None}
        elif request.operation == "POST":
            if not request.data:
                raise HTTPException(status_code=400, detail={"message": "Missing request data"})

            def _prepare_insert(item: dict):
                """Coerce values and strip None entries so DB defaults kick in."""
                pairs = [(k, _coerce_int_if_needed(k, v)) for k, v in item.items()]
                pairs = [(k, v) for k, v in pairs if v is not None]
                if not pairs:
                    return [], []
                keys, vals = zip(*pairs)
                return list(keys), list(vals)

            if isinstance(request.data, list):
                if len(request.data) == 0:
                    return {"data": [], "error": None}
                inserted_rows = []
                for item in request.data:
                    if not isinstance(item, dict):
                        continue
                    keys, post_values = _prepare_insert(item)
                    if not keys:
                        continue
                    quoted_keys = [f'"{k}"' for k in keys]
                    placeholders = ", ".join(f"${i}" for i in range(1, len(keys) + 1))
                    row = await fetch_one(pool, f'INSERT INTO "{table_safe}" ({", ".join(quoted_keys)}) VALUES ({placeholders}) RETURNING *', *post_values)
                    if row:
                        inserted_rows.append(dict(row))
                return {"data": inserted_rows, "error": None}
            elif isinstance(request.data, dict):
                keys, post_values = _prepare_insert(request.data)
                if not keys:
                    raise HTTPException(status_code=400, detail={"message": "No valid data fields after processing"})
                quoted_keys = [f'"{k}"' for k in keys]
                placeholders = ", ".join(f"${i}" for i in range(1, len(keys) + 1))
                row = await fetch_one(pool, f'INSERT INTO "{table_safe}" ({", ".join(quoted_keys)}) VALUES ({placeholders}) RETURNING *', *post_values)
                data = dict(row) if row else None
                return {"data": data, "error": None}
        elif request.operation == "PATCH":
            if not request.data:
                raise HTTPException(status_code=400, detail={"message": "Missing request data"})
            if not conditions:
                raise HTTPException(status_code=400, detail={"message": "Update requires a filter"})
            set_keys = list(request.data.keys())
            set_args = [_coerce_int_if_needed(k, v) for k, v in request.data.items()]
            set_clause_parts = []
            patch_arglist = []
            local_idx = 0
            def patch_next(v: Any) -> int:
                nonlocal local_idx, patch_arglist
                local_idx += 1
                patch_arglist.append(v)
                return local_idx
            for k in set_keys:
                i = patch_next(set_args[set_keys.index(k)])
                set_clause_parts.append(f'"{k}" = ${i}')
            patch_conditions = []
            for filter_item in request.filters:
                field_safe = filter_item.get_field()
                bare_field = field_safe.split(".")[-1].strip('"')
                if "." not in field_safe:
                    field_safe = f'"{table_safe}"."{field_safe}"'
                val = _coerce_int_if_needed(bare_field, filter_item.value)
                op = filter_item.get_operator()
                if op == "eq":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} = ${i}")
                elif op == "ilike":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} ILIKE ${i}")
                elif op == "in":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} = ANY(${i})")
                elif op == "neq":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} <> ${i}")
                elif op == "gt":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} > ${i}")
                elif op == "gte":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} >= ${i}")
                elif op == "lt":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} < ${i}")
                elif op == "lte":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} <= ${i}")
                elif op == "is":
                    i = patch_next(val)
                    patch_conditions.append(f"{field_safe} IS ${i}")
                else:
                    raise HTTPException(status_code=400, detail={"message": f"Unsupported filter operator: {op}"})
            await execute(
                pool,
                f'UPDATE "{table_safe}" SET {", ".join(set_clause_parts)} WHERE {" AND ".join(patch_conditions)}',
                *patch_arglist,
            )
            return {"data": None, "error": None}
        elif request.operation == "DELETE":
            if not conditions:
                raise HTTPException(status_code=400, detail={"message": "Delete requires a filter"})
            await execute(pool, f'DELETE FROM "{table_safe}" WHERE {" AND ".join(conditions)}', *args)
            return {"data": None, "error": None}
        else:
            raise HTTPException(status_code=400, detail={"message": f"Unsupported operation: {request.operation}"})
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Query Error] Table: {request.table}, Data: {request.data}, Error: {exc}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"data": None, "error": {"message": f"{type(exc).__name__}: {str(exc)}"}})

@app.post("/rpc/{name}")
async def rpc_endpoint(name: str, params: dict = {}):
    pool = await open_pool()
    if name == "has_purchased_product":
        user_id = params.get("_user_id") or params.get("user_id")
        product_id = params.get("_product_id") or params.get("product_id")
        if not user_id or not product_id:
            raise HTTPException(status_code=400, detail={"message": "Missing user_id or product_id (accept _user_id/_product_id or user_id/product_id)"})
        try:
            uid = int(user_id)
        except (ValueError, TypeError):
            uid = user_id
        try:
            pid = int(product_id)
        except (ValueError, TypeError):
            pid = product_id
        row = await fetch_one(pool, "SELECT EXISTS(SELECT 1 FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.user_id = $1 AND oi.product_id = $2)", uid, pid)
        return {"data": bool(row[0]) if row else False, "error": None}
    raise HTTPException(status_code=404, detail={"message": "RPC endpoint not found"})

@app.post("/auth/signin")
async def signin(auth: AuthRequest):
    pool = await open_pool()
    user = await fetch_one(pool, "SELECT * FROM users WHERE email = $1", auth.email)
    if not user:
        return {"data": None, "error": {"message": "Invalid credentials"}}
    if not verify_password(auth.password, user["password_hash"]):
        return {"data": None, "error": {"message": "Invalid credentials"}}

    token = create_access_token({"sub": str(user["id"]), "email": auth.email})
    refresh_token = create_access_token({"sub": str(user["id"]), "email": auth.email}, timedelta(days=30))
    session = {
        "user": {"id": str(user["id"]), "email": user["email"]},
        "access_token": token,
        "refresh_token": refresh_token,
        "expires_at": int((datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)).timestamp()),
    }
    return {"data": {"session": session}, "error": None}

@app.post("/auth/signup")
async def signup(auth: AuthRequest):
    pool = await open_pool()
    existing = await fetch_one(pool, "SELECT id FROM users WHERE email = $1", auth.email)
    if existing:
        return {"data": None, "error": {"message": "Email already registered"}}
    opts = auth.options or {}
    data = opts.get("data") or {}
    full_name = data.get("name") or data.get("full_name")
    phone = data.get("phone")

    hashed_password = hash_password(auth.password)
    if full_name or phone:
        cols = ["email", "password_hash", "created_at"]
        ph = ["$1", "$2", "NOW()"]
        vals: list = [auth.email, hashed_password]
        if full_name:
            cols.append("full_name")
            ph.append(f"${len(vals)+1}")
            vals.append(full_name)
        if phone:
            cols.append("phone")
            ph.append(f"${len(vals)+1}")
            vals.append(phone)
        insert_sql = f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join(ph)}) RETURNING id, email, full_name, phone"
        result = await fetch_one(pool, insert_sql, *vals)
    else:
        result = await fetch_one(pool, "INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email, full_name, phone", auth.email, hashed_password)
    user_id = result["id"]

    # Auto-create matching profile row so client .update({name}).eq(user_id) works
    profile_name = full_name or (data.get("name") if isinstance(data, dict) else None) or auth.email.split("@")[0]
    try:
        await execute(
            pool,
            "INSERT INTO profiles (user_id, name, full_name, phone, points, referral_code, created_at) VALUES ($1, $2, $3, $4, 0, $5, NOW()) ON CONFLICT (user_id) DO NOTHING",
            int(user_id),
            profile_name,
            full_name or profile_name,
            phone if phone else None,
            "REF" + str(user_id).zfill(6),
        )
    except Exception:
        # profiles table may have unique referral_code; ignore non-critical error
        try:
            existing_profile = await fetch_one(pool, "SELECT id FROM profiles WHERE user_id = $1", int(user_id))
            if not existing_profile:
                await execute(pool, "INSERT INTO profiles (user_id, name, full_name, phone, points, created_at) VALUES ($1, $2, $3, $4, 0, NOW())",
                              int(user_id), profile_name, full_name or profile_name, phone if phone else None)
        except Exception:
            pass

    token = create_access_token({"sub": str(user_id), "email": result["email"]})
    refresh_token = create_access_token({"sub": str(user_id), "email": result["email"]}, timedelta(days=30))
    session = {
        "user": {"id": str(user_id), "email": result["email"]},
        "access_token": token,
        "refresh_token": refresh_token,
        "expires_at": int((datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)).timestamp()),
    }
    return {"data": {"session": session}, "error": None}

@app.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    return {"data": {"message": "Password reset flow not implemented"}, "error": None}

@app.get("/auth/user")
async def get_user(request: Request, token: Optional[Dict[str, Any]] = Depends(verify_token)):
    if not token:
        return {"data": None, "error": {"message": "Unauthorized"}}
    pool = await open_pool()
    try:
        user_id = int(token["sub"])
    except (ValueError, TypeError, KeyError):
        return {"data": None, "error": {"message": "Invalid token"}}
    user = await fetch_one(pool, "SELECT id, email, phone FROM users WHERE id = $1", user_id)
    if not user:
        return {"data": None, "error": {"message": "User not found"}}
    return {"data": dict(user), "error": None}

@app.put("/auth/user")
async def update_user(request_data: UpdateUserRequest, request: Request, token: Optional[Dict[str, Any]] = Depends(verify_token)):
    if not token:
        return {"data": None, "error": {"message": "Unauthorized"}}
    try:
        user_id = int(token["sub"])
    except (ValueError, TypeError, KeyError):
        return {"data": None, "error": {"message": "Invalid token"}}
    pool = await open_pool()
    sets = []
    args = []
    idx = 1
    if request_data.email:
        sets.append(f"email = ${idx}")
        args.append(request_data.email)
        idx += 1
    if request_data.phone is not None:
        sets.append(f"phone = ${idx}")
        args.append(request_data.phone)
        idx += 1
    if request_data.password:
        sets.append(f"password_hash = ${idx}")
        args.append(hash_password(request_data.password))
        idx += 1
    if request_data.full_name is not None:
        sets.append(f"full_name = ${idx}")
        args.append(request_data.full_name)
        idx += 1
    if not sets:
        return {"data": None, "error": {"message": "No fields to update"}}
    args.append(user_id)
    await execute(pool, f"UPDATE users SET {', '.join(sets)} WHERE id = ${idx}", *args)
    user = await fetch_one(pool, "SELECT id, email, phone FROM users WHERE id = $1", user_id)
    return {"data": dict(user), "error": None}

# ----------------- Admin User & Role Management -----------------
class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "user"

class AdminRoleUpdateRequest(BaseModel):
    user_id: int
    role: str

class AdminPasswordUpdateRequest(BaseModel):
    user_id: int
    new_password: str

@app.get("/api/admin/users")
async def admin_get_users():
    pool = await open_pool()
    query = """
        SELECT 
            u.id, 
            u.email, 
            COALESCE(u.phone, p.phone) as phone, 
            COALESCE(u.full_name, p.full_name, p.name) as full_name,
            COALESCE(p.avatar_url, NULL) as avatar_url,
            COALESCE(p.address, NULL) as address,
            COALESCE(p.points, 0) as points,
            CASE 
                WHEN sa.id IS NOT NULL OR u.role = 'admin' OR u.id = 1 THEN 'admin'
                ELSE 'user'
            END as role,
            u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as total_orders,
            (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id) as total_spent
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN super_admins sa ON sa.user_id = u.id
        ORDER BY u.id ASC
    """
    rows = await fetch_all(pool, query)
    users = [dict(r) for r in rows]
    for u in users:
        if u.get("total_spent") is not None:
            u["total_spent"] = float(u["total_spent"])
        if u.get("total_orders") is not None:
            u["total_orders"] = int(u["total_orders"])
        if u.get("points") is not None:
            u["points"] = int(u["points"])
        if u.get("created_at"):
            u["created_at"] = u["created_at"].isoformat()
    return {"data": users, "error": None}

@app.post("/api/admin/users/role")
async def admin_update_user_role(req: AdminRoleUpdateRequest):
    pool = await open_pool()
    user = await fetch_one(pool, "SELECT id FROM users WHERE id = $1", req.user_id)
    if not user:
        return {"data": None, "error": {"message": "Pengguna tidak ditemukan"}}
    
    target_role = req.role.lower().strip()
    if target_role == "admin":
        await execute(pool, "INSERT INTO super_admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", req.user_id)
        await execute(pool, "UPDATE users SET role = 'admin' WHERE id = $1", req.user_id)
    else:
        if req.user_id == 1:
            return {"data": None, "error": {"message": "Admin utama (ID 1) tidak dapat diubah menjadi user"}}
        await execute(pool, "DELETE FROM super_admins WHERE user_id = $1", req.user_id)
        await execute(pool, "UPDATE users SET role = 'user' WHERE id = $1", req.user_id)
        
    return {"data": {"success": True, "user_id": req.user_id, "role": target_role}, "error": None}

@app.post("/api/admin/users/create")
async def admin_create_user(req: AdminUserCreateRequest):
    pool = await open_pool()
    existing = await fetch_one(pool, "SELECT id FROM users WHERE email = $1", req.email)
    if existing:
        return {"data": None, "error": {"message": "Email sudah terdaftar"}}
    
    hashed_pwd = hash_password(req.password)
    target_role = (req.role or "user").lower().strip()
    
    insert_sql = """
        INSERT INTO users (email, password_hash, full_name, phone, role, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, email, full_name, phone, role, created_at
    """
    row = await fetch_one(pool, insert_sql, req.email, hashed_pwd, req.full_name, req.phone, target_role)
    new_user_id = row["id"]
    
    profile_name = req.full_name or req.email.split("@")[0]
    try:
        await execute(
            pool,
            "INSERT INTO profiles (user_id, name, full_name, phone, points, referral_code, created_at) VALUES ($1, $2, $3, $4, 0, $5, NOW()) ON CONFLICT (user_id) DO NOTHING",
            int(new_user_id),
            profile_name,
            req.full_name or profile_name,
            req.phone if req.phone else None,
            "REF" + str(new_user_id).zfill(6),
        )
    except Exception:
        pass

    if target_role == "admin":
        await execute(pool, "INSERT INTO super_admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", new_user_id)
        
    result = dict(row)
    if result.get("created_at"):
        result["created_at"] = result["created_at"].isoformat()
    return {"data": result, "error": None}

@app.post("/api/admin/users/password")
async def admin_reset_user_password(req: AdminPasswordUpdateRequest):
    pool = await open_pool()
    user = await fetch_one(pool, "SELECT id FROM users WHERE id = $1", req.user_id)
    if not user:
        return {"data": None, "error": {"message": "Pengguna tidak ditemukan"}}
    
    hashed_pwd = hash_password(req.new_password)
    await execute(pool, "UPDATE users SET password_hash = $1 WHERE id = $2", hashed_pwd, req.user_id)
    return {"data": {"success": True, "message": "Password berhasil diubah"}, "error": None}

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: int):
    if user_id == 1:
        return {"data": None, "error": {"message": "Admin utama (ID 1) tidak dapat dihapus"}}
    pool = await open_pool()
    user = await fetch_one(pool, "SELECT id FROM users WHERE id = $1", user_id)
    if not user:
        return {"data": None, "error": {"message": "Pengguna tidak ditemukan"}}
    
    await execute(pool, "DELETE FROM users WHERE id = $1", user_id)
    return {"data": {"success": True, "message": "Pengguna berhasil dihapus"}, "error": None}


IMG_CACHE_DIR = STORAGE_ROOT / "images_cache"
IMG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMG_HOSTS = (
    "images.unsplash.com",
    "images.pexels.com",
    "picsum.photos",
    "images.unsplash.it",
    "plus.unsplash.com",
    "fastly.picsum.photos",
    "storage.googleapis.com",
)
ALLOWED_IMG_SCHEMES = ("http", "https")
IMG_HEADERS = {"User-Agent": "SarahBakery/1.0 (ImageProxy)"}
MAX_IMG_BYTES = 20 * 1024 * 1024  # 20 MB
IMG_CACHE_TTL_SECONDS = int(os.getenv("IMG_CACHE_TTL", str(60 * 60 * 24 * 7)))  # 7 hari

def _safe_image_url(raw: str) -> Optional[str]:
    """Validate URL: whitelist scheme + host, strip newline, fragment."""
    try:
        if not raw or not isinstance(raw, str):
            return None
        raw2 = raw.strip().split("#", 1)[0]
        p = urllib.parse.urlparse(raw2)
        if p.scheme.lower() not in ALLOWED_IMG_SCHEMES:
            return None
        host = p.hostname or ""
        if host not in ALLOWED_IMG_HOSTS and not any(host.endswith("." + h) for h in ALLOWED_IMG_HOSTS):
            return None
        return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, p.query, ""))
    except Exception:
        return None

def _cache_path_for(url: str) -> Path:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return IMG_CACHE_DIR / h[:2] / h

@app.get("/images/proxy")
async def proxy_image(
    response: Response,
    url: str = Query(..., description="External image URL to proxy (whitelist: unsplash/pexels/picsum)"),
):
    safe = _safe_image_url(url)
    if not safe:
        raise HTTPException(status_code=400, detail={"message": "Invalid or blocked image URL"})

    cache_file = _cache_path_for(safe)
    meta_file = cache_file.with_suffix(cache_file.suffix + ".meta")

    # Try cache
    if cache_file.is_file() and meta_file.is_file():
        try:
            ctime = cache_file.stat().st_mtime
            age = time.time() - ctime
            if age < IMG_CACHE_TTL_SECONDS:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                ct = meta.get("content_type") or "image/jpeg"
                response.headers["Cache-Control"] = f"public, max-age={IMG_CACHE_TTL_SECONDS}, immutable"
                response.headers["Content-Type"] = ct
                response.headers["X-Image-Proxy-Cache"] = "HIT"
                return FileResponse(cache_file, media_type=ct)
        except Exception:
            pass

    # Fetch upstream
    try:
        req = urllib.request.Request(safe, headers=IMG_HEADERS, method="GET")
        loop = asyncio.get_event_loop()
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
            if resp.status and resp.status >= 400:
                raise HTTPException(status_code=502, detail={"message": f"Upstream {resp.status}"})
            ct = resp.headers.get("Content-Type") or "image/jpeg"
            if not ct.lower().startswith("image/") and ct.lower() not in ("application/octet-stream",):
                raise HTTPException(status_code=400, detail={"message": "Not an image"})
            cl_raw = resp.headers.get("Content-Length")
            if cl_raw and int(cl_raw) > MAX_IMG_BYTES:
                raise HTTPException(status_code=413, detail={"message": "Image too large"})
            chunks = []
            total = 0
            while True:
                chunk = await loop.run_in_executor(None, resp.read, 65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_IMG_BYTES:
                    raise HTTPException(status_code=413, detail={"message": "Image too large"})
                chunks.append(chunk)
            body = b"".join(chunks)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail={"message": f"Fetch failed: {e}"})

    # Write cache async-friendly
    try:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        tmp = cache_file.with_suffix(".tmp")
        tmp.write_bytes(body)
        tmp.replace(cache_file)
        try:
            meta_file.write_text(json.dumps({"url": safe, "content_type": ct, "size": len(body)}), encoding="utf-8")
        except Exception:
            pass
    except Exception:
        pass

    response.headers["Cache-Control"] = f"public, max-age={IMG_CACHE_TTL_SECONDS}, immutable"
    response.headers["Content-Type"] = ct
    response.headers["Content-Length"] = str(len(body))
    response.headers["X-Image-Proxy-Cache"] = "MISS"
    return Response(content=body, media_type=ct)

@app.get("/images/unsplash/{photo_id}")
async def unsplash_image(
    response: Response,
    photo_id: str,
    w: Optional[int] = None,
    h: Optional[int] = None,
    q: int = 80,
    fm: str = "jpg",
    fit: str = "crop",
):
    params = {"w": w or 800, "q": q, "fm": fm, "fit": fit}
    if h:
        params["h"] = h
    url = "https://images.unsplash.com/photo-" + urllib.parse.quote(photo_id) + "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    return await proxy_image(response, url=url)


@app.post("/storage/{bucket}/upload")
async def upload_storage(bucket: str, file: UploadFile = File(...), path: str = Form(...)):
    storage_dir = STORAGE_ROOT / bucket
    storage_dir.mkdir(parents=True, exist_ok=True)
    destination = storage_dir / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    contents = await file.read()
    destination.write_bytes(contents)
    return {"data": {"publicUrl": f"/storage/{bucket}/{path}"}, "error": None}

@app.get("/storage/{bucket}/public/{path:path}")
async def storage_public(bucket: str, path: str):
    file_path = STORAGE_ROOT / bucket / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail={"message": "File not found"})
    return FileResponse(file_path)

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    messages = body.get("messages", [])

    async def event_stream():
        prompt = "".join([m["content"] for m in messages if m.get("role") == "user"])
        text = f"AI response to: {prompt}"
        for chunk in [text[i : i + 40] for i in range(0, len(text), 40)]:
            yield f"data: {{\"choices\": [{{\"delta\": {{\"content\": \"{chunk}\"}}}}]}}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# =================== GOOGLE OAUTH ===================
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


async def _get_oauth_settings(pool) -> Dict[str, str]:
    rows = await pool.fetch(
        "SELECT key, value FROM settings WHERE key IN ('google_oauth_client_id', 'google_oauth_client_secret')"
    )
    cfg = {r["key"]: r["value"] or "" for r in rows}
    cfg.setdefault("google_oauth_client_id", "")
    cfg.setdefault("google_oauth_client_secret", "")
    return cfg


def _make_random_password() -> str:
    # Google OAuth users get a long random password (user tidak pernah dipakai user login manual)
    return secrets.token_urlsafe(32)


@app.get("/auth/google/config")
async def google_oauth_config():
    pool = await open_pool()
    cfg = await _get_oauth_settings(pool)
    client_id = cfg.get("google_oauth_client_id", "") or ""
    has_client_secret = bool((cfg.get("google_oauth_client_secret") or "") != "")
    return {
        "data": {
            "enabled": bool(client_id) and has_client_secret,
            "client_id": client_id,
            "has_client_secret": has_client_secret,
        },
        "error": None,
    }


@app.get("/auth/google/login")
async def google_oauth_login(
    request: Request,
    redirect_to: str = Query(default="/dashboard"),
    admin: int = Query(default=0, ge=0, le=1),
):
    pool = await open_pool()
    cfg = await _get_oauth_settings(pool)
    client_id = (cfg.get("google_oauth_client_id") or "").strip()
    client_secret = (cfg.get("google_oauth_client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Google OAuth belum diatur. Silakan minta admin untuk memasukkan Client ID & Client Secret di halaman Pengaturan admin, tab OAuth Google."
            },
        )

    # Build redirect_uri: origin = request base
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    redirect_uri = f"{forwarded_proto}://{forwarded_host}/auth/google/callback"

    state = secrets.token_urlsafe(24)
    # Store state + redirect_to + admin di session cookie (signed by JWT mini 15 menit)
    state_payload = {"s": state, "r": redirect_to, "a": bool(admin), "exp": datetime.utcnow() + timedelta(minutes=15)}
    state_token = jwt.encode(state_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    scope = "openid email profile"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "state": state,
        "access_type": "offline",
        "prompt": "select_account consent",
        "include_granted_scopes": "true",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    resp = JSONResponse(
        status_code=302,
        content={"data": {"redirect": auth_url, "state": state}, "error": None},
        headers={"Location": auth_url},
    )
    # Set state via query params redirect as fallback, but for browser 302 the browser will navigate.
    # Also set HttpOnly cookie for state validation
    from fastapi.responses import RedirectResponse
    resp2 = RedirectResponse(url=auth_url, status_code=302)
    resp2.set_cookie(
        key="goauth_state",
        value=state_token,
        httponly=True,
        secure=forwarded_proto == "https",
        samesite="lax",
        max_age=15 * 60,
        path="/auth/google",
    )
    return resp2


@app.get("/auth/google/callback")
async def google_oauth_callback(request: Request, code: str = Query(...), state: str = Query(...), error: Optional[str] = Query(default=None), error_description: Optional[str] = Query(default=None)):
    if error:
        detail = error_description or error
        # Redirect back to login page with error query
        home = "/"
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{home}?oauth_error={urllib.parse.quote(detail)}", status_code=302)

    pool = await open_pool()
    cfg = await _get_oauth_settings(pool)
    client_id = (cfg.get("google_oauth_client_id") or "").strip()
    client_secret = (cfg.get("google_oauth_client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail={"message": "Google OAuth belum dikonfigurasi di server."})

    # Validate state from cookie
    from fastapi.responses import RedirectResponse
    state_cookie = request.cookies.get("goauth_state", "")
    redirect_to = "/dashboard"
    admin_dashboard = False
    try:
        if state_cookie:
            state_p = jwt.decode(state_cookie, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if state_p.get("s") != state:
                raise HTTPException(status_code=400, detail={"message": "Invalid OAuth state (CSRF)"})
            redirect_to = state_p.get("r", "/dashboard") or "/dashboard"
            admin_dashboard = bool(state_p.get("a", False))
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail={"message": "Invalid or expired OAuth state. Coba login ulang."})

    # Build redirect_uri sama persis dengan /auth/google/login
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    redirect_uri = f"{forwarded_proto}://{forwarded_host}/auth/google/callback"

    # 1) Tukar code → access_token via urllib.request (run_in_executor)
    token_req_data = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }).encode("utf-8")
    token_req = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=token_req_data,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )

    def _fetch_token():
        with urllib.request.urlopen(token_req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        loop = asyncio.get_event_loop()
        token_json = await loop.run_in_executor(None, _fetch_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"message": f"Gagal menukar OAuth code: {e}"})

    access_token = token_json.get("access_token") or ""
    if not access_token:
        raise HTTPException(status_code=400, detail={"message": f"Google token error: {json.dumps(token_json)}"})

    # 2) Get userinfo profile + email
    info_req = urllib.request.Request(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        method="GET",
    )

    def _fetch_userinfo():
        with urllib.request.urlopen(info_req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        userinfo = await loop.run_in_executor(None, _fetch_userinfo)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"message": f"Gagal mengambil profile Google: {e}"})

    google_id = str(userinfo.get("sub") or "")
    email = (userinfo.get("email") or "").strip().lower()
    given_name = userinfo.get("given_name") or userinfo.get("name") or ""
    family_name = userinfo.get("family_name") or ""
    full_name = userinfo.get("name") or f"{given_name} {family_name}".strip() or email.split("@")[0]
    email_verified = bool(userinfo.get("email_verified", True))

    if not google_id or not email:
        raise HTTPException(status_code=400, detail={"message": "Google account tidak punya id/email."})

    # 3) Upsert user: cari dulu by google_id, else by email. Jika keduanya ada gabung.
    existing_by_google = await fetch_one(pool, "SELECT * FROM users WHERE google_id = $1", google_id)
    existing_by_email = None if existing_by_google else await fetch_one(pool, "SELECT * FROM users WHERE email = $1", email)

    user = existing_by_google or existing_by_email
    if not user:
        # Create new user
        rand_pw = _make_random_password()
        hashed = hash_password(rand_pw)
        new_id_row = await fetch_one(
            pool,
            "INSERT INTO users (email, password_hash, full_name, google_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
            email, hashed, full_name, google_id,
        )
        user = new_id_row
        uid = int(user["id"])
        # Auto-create profile
        pname = given_name or full_name or email.split("@")[0]
        try:
            await execute(
                pool,
                "INSERT INTO profiles (user_id, name, full_name, points, referral_code, created_at) VALUES ($1, $2, $3, 0, $4, NOW()) ON CONFLICT (user_id) DO NOTHING",
                uid, pname, full_name or pname, "REF" + str(uid).zfill(6),
            )
        except Exception:
            try:
                await execute(
                    pool,
                    "INSERT INTO profiles (user_id, name, full_name, points, created_at) VALUES ($1, $2, $3, 0, NOW()) ON CONFLICT (user_id) DO NOTHING",
                    uid, pname, full_name or pname,
                )
            except Exception:
                pass
    else:
        uid = int(user["id"])
        # Update google_id + full_name jk belum di-set
        sets = []
        vals: list = []
        idx = 1
        if not user.get("google_id") and google_id:
            sets.append(f"google_id = ${len(vals)+1}")
            vals.append(google_id)
        if (not user.get("full_name")) and full_name:
            sets.append(f"full_name = ${len(vals)+1}")
            vals.append(full_name)
        if sets:
            vals.append(int(uid))
            await execute(pool, f"UPDATE users SET {', '.join(sets)} WHERE id = ${len(vals)}", *vals)

    # 4) Buat JWT session
    token = create_access_token({"sub": str(uid), "email": email})
    refresh_token = create_access_token({"sub": str(uid), "email": email}, timedelta(days=30))
    session_json = json.dumps({
        "user": {"id": str(uid), "email": email},
        "access_token": token,
        "refresh_token": refresh_token,
        "expires_at": int((datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)).timestamp()),
    })

    # 5) Redirect ke FE with session in URL fragment? Atau set cookie lalu redirect. Pakai redirect page yang di FE dengan query #access_token=... fallback ke localStorage.
    #    Alternatif terbaik: redirect ke frontend HTML kecil yang set session via postMessage ke window.opener / simpan localStorage lalu redirect ke redirect_to.
    session_qs = urllib.parse.quote(session_json)
    if admin_dashboard:
        final_redirect = "/admin/dashboard"
    else:
        final_redirect = redirect_to or "/dashboard"
    # Safe validation: redirect_to tidak boleh cross-origin (hanya path absolute path saja)
    if not final_redirect.startswith("/"):
        final_redirect = "/" + final_redirect.lstrip("/")
    # Return HTML auto submit form ke JS set localStorage untuk client auth session token lalu document.location
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Login Google Berhasil</title></head><body>
<script>
try {{
  var session = JSON.parse(decodeURIComponent({json.dumps(session_qs)}));
  var ls = window.localStorage;
  try {{ ls.setItem('sarah-auth-session', JSON.stringify(session)); }} catch(e){{}}
  try {{ ls.setItem('sb-auth-session', JSON.stringify(session)); }} catch(e){{}}
  try {{
    // Supabase-compatible storage keys (client.integrations):
    var sb = JSON.stringify({{ currentSession: session, expiresAt: session.expires_at * 1000 }});
    try {{ ls.setItem('sb-session-token', JSON.stringify(session.access_token)); }} catch(e){{}}
    try {{ ls.setItem('sb-refresh-token', JSON.stringify(session.refresh_token)); }} catch(e){{}}
    // Emit storage event
    window.dispatchEvent(new Event('storage'));
  }} catch(e){{}}
  try {{
    if (window.opener) {{ window.opener.postMessage({{ type:'oauth-success', session: session }}, '*'); setTimeout(function(){{ try{{window.close()}}catch(e){{}} }}, 200); }}
  }} catch(e){{}}
  document.location = {json.dumps(final_redirect)};
}} catch(err) {{
  document.body.innerHTML = '<p style=font-family:sans-serif>Terjadi kesalahan login: '+String(err).replace(/</g,'&lt;')+'. <a href=/>Kembali</a></p>';
}}
</script></body></html>"""
    from fastapi.responses import HTMLResponse
    resp = HTMLResponse(content=html, status_code=200)
    resp.delete_cookie(key="goauth_state", path="/auth/google")
    return resp

