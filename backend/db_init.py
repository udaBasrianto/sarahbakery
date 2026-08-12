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
                # Try to detect dollar-quote start
                # Match $tag$ where tag can be empty ($$) or identifier
                m = re.match(r'\$([A-Za-z0-9_]*)\$', sql_text[i:])
                if m:
                    in_dollar_quote = True
                    dollar_tag = m.group(0)
                    buf.append(ch)
                    i += 1
                    continue
            elif in_dollar_quote and ch == '$':
                # Try to match end tag
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
                # escaped '' means continue string
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

    # Last statement (may not end with ;)
    stmt = ''.join(buf).strip()
    if stmt:
        statements.append(stmt)

    return statements


async def apply_sql(conn, sql_text: str):
    statements = split_sql_statements(sql_text)
    for stmt in statements:
        await conn.execute(stmt)


async def main():
    print('Connecting to', DATABASE_URL)
    pool = await asyncpg.create_pool(DATABASE_URL)

    migration_files = sorted(MIGRATIONS_DIR.glob('*.sql'))
    if not migration_files:
        print('No migration files found in', MIGRATIONS_DIR)
        return

    async with pool.acquire() as conn:
        for migration_path in migration_files:
            print(f'Applying: {migration_path.name} ...')
            sql = migration_path.read_text(encoding='utf-8')
            await apply_sql(conn, sql)
            print(f'  OK: {migration_path.name}')

    await pool.close()
    print('\nAll migrations applied successfully.')


if __name__ == '__main__':
    asyncio.run(main())
