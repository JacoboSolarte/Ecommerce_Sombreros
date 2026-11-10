# Casa Guaico: backend

FastAPI + SQLAlchemy 2 + Alembic on MySQL 8. API contract: `../docs/ARCHITECTURE.md`.

## Layout

```
app/
  domain/          pure rules: entities, errors, order state machine, totals, stock, validation
  application/     ports (Protocols) and use cases grouped by module (use_cases/*.py)
  infrastructure/  config, SQLAlchemy models/repositories/UnitOfWork, bcrypt, JWT, simulated gateway, file storage
  presentation/    FastAPI routers, camelCase schemas, auth dependencies, error handlers
  container.py     wires adapters      main.py   create_app() composition root
alembic/           migrations          scripts/  create_db.py, seed.py
tests/             unit (fakes) + api (MySQL casa_guaico_test)
```

`domain` and `application` never import FastAPI or SQLAlchemy.

## Setup on Windows (PowerShell, from `backend/`)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env        # then edit: replace CHANGE_ME with your MySQL password and the JWT secret
.\.venv\Scripts\python.exe scripts\create_db.py       # creates casa_guaico and casa_guaico_test
.\.venv\Scripts\alembic.exe upgrade head              # creates the schema
.\.venv\Scripts\python.exe scripts\seed.py --reset    # sample catalog, users and orders
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/api/docs, health at http://localhost:8000/api/health.

Seed accounts: `admin@casaguaico.co` / `Admin1234` (admin), `cliente@casaguaico.co` / `Cliente1234` (customer).

`seed.py` reads `../frontend/public/images/manifest.json` to attach product photos. If it is missing it falls back to
`/images/products/placeholder-sq.jpg` and prints a warning; run `seed.py --reset` again once the manifest exists.
Without `--reset` it only seeds an empty database.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
```

The API tests rebuild the schema in `casa_guaico_test` (`TEST_DATABASE_URL`) and clear it between tests; they never touch `casa_guaico`.

## Notes

- Money is integer COP, prices include IVA; totals come from one domain function used by cart and orders.
- Stock is only decremented when a payment is approved (single transaction, `SELECT ... FOR UPDATE` on the variants).
- Sessions are an httpOnly `cg_session` JWT cookie; logout stores the `jti` in `revoked_tokens`.
- Denied admin access (anonymous or customer) is written to `audit_log`.
- Uploads are stored in `backend/uploads/` and served at `/api/uploads/<name>`.
- New migration after changing models: `alembic revision --autogenerate -m "message"`.
