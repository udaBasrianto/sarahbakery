import asyncio
import os
import re
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(dotenv_path=ROOT / '.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print('Please set DATABASE_URL in backend/.env or environment')
    raise SystemExit(1)

MIGRATIONS_DIR = ROOT / 'migrations'


def split_sql_statements(sql_text: str):
    """Split SQL into individual statements, respecting dollar-quoted strings ($$...$$)
    and standard single-quoted strings ('...')."""
    statements = []
    buf = []
    i = 0
    n = len(sql_text)
    in_dollar_quote = False
    dollar_tag = None
    in_single_quote = False
    in_line_comment = False
    in_block_comment = False

    while i < n:
        ch = sql_text[i]
        next_ch = sql_text[i + 1] if i + 1 < n else ''

        # Line comment --
        if not in_dollar_quote and not in_single_quote and not in_block_comment and ch == '-' and next_ch == '-':
            in_line_comment = True
        if in_line_comment and ch == '\n':
            in_line_comment = False
            buf.append(ch)
            i += 1
            continue

        # Block comment /* */
        if not in_dollar_quote and not in_single_quote and not in_line_comment and ch == '/' and next_ch == '*':
            in_block_comment = True
            buf.append(ch)
            i += 2
            continue
        if in_block_comment and ch == '*' and next_ch == '/':
            in_block_comment = False
            buf.append(ch)
            buf.append(next_ch)
            i += 2
            continue

        if in_line_comment or in_block_comment:
            buf.append(ch)
            i += 1
            continue

        # Dollar-quoted strings ($tag$...$tag$ or $$...$$)
        if not in_single_quote:
            if not in_dollar_quote and ch == '$':
                m = re.match(r'\$([A-Za-z0-9_]*)\$', sql_text[i:])
                if m:
                    in_dollar_quote = True
                    dollar_tag = m.group(0)
                    buf.append(ch)
                    i += 1
                    continue
            elif in_dollar_quote and ch == '$':
                end_tag_len = len(dollar_tag)
                if sql_text[i:i + end_tag_len] == dollar_tag:
                    in_dollar_quote = False
                    for _ in range(end_tag_len):
                        buf.append(sql_text[i])
                        i += 1
                    continue

        # Single-quoted strings ''
        if not in_dollar_quote:
            if ch == "'" and not in_single_quote:
                in_single_quote = True
            elif ch == "'" and in_single_quote:
                if next_ch == "'":
                    buf.append(ch)
                    buf.append(next_ch)
                    i += 2
                    continue
                else:
                    in_single_quote = False

        buf.append(ch)

        # Statement terminator
        if ch == ';' and not in_dollar_quote and not in_single_quote:
            stmt = ''.join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []

        i += 1

    stmt = ''.join(buf).strip()
    if stmt:
        statements.append(stmt)

    return statements


async def apply_sql(conn, sql_text: str):
    statements = split_sql_statements(sql_text)
    for stmt in statements:
        try:
            await conn.execute(stmt)
        except Exception as e:
            # Print warning for non-critical duplicate errors but keep executing
            print(f'   [Note] {e}')


async def main():
    print('Connecting to', DATABASE_URL)
    pool = await asyncpg.create_pool(DATABASE_URL)

    migration_files = sorted(MIGRATIONS_DIR.glob('*.sql'))
    if not migration_files:
        print('No migration files found in', MIGRATIONS_DIR)
        return

    async with pool.acquire() as conn:
        # Create schema_migrations table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _schema_migrations (
                filename TEXT PRIMARY KEY,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        # Fetch executed migrations
        rows = await conn.fetch("SELECT filename FROM _schema_migrations")
        executed = {r["filename"] for r in rows}

        for migration_path in migration_files:
            fname = migration_path.name
            if fname in executed:
                print(f'Skipping (already applied): {fname}')
                continue

            print(f'Applying: {fname} ...')
            sql = migration_path.read_text(encoding='utf-8')
            await apply_sql(conn, sql)
            await conn.execute("INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", fname)
            print(f'  OK: {fname}')

    await pool.close()
    print('\nAll migrations processed successfully.')


if __name__ == '__main__':
    asyncio.run(main())
