Setup and initialize PostgreSQL schema for the backend

1) Create a virtual environment (recommended)

Windows (PowerShell):

```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Copy `.env.example` to `.env` and set `DATABASE_URL` appropriately

3) Run migration to create tables

```
cd backend
python db_init.py
```

4) Start the app (example)

```
# from repo root
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 3000
```

Notes:
- `db_init.py` executes `backend/migrations/001_initial.sql`.
- If you prefer a migration tool (alembic, flyway), migrate these statements into its flow.
