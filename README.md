# Enhanced Personalized Learning Dashboard (Phase 1)

## Quickstart

1) Create environment variables (copy `.env.example` to `.env` and fill values):

2) Install dependencies:
```
python -m venv .venv && source .venv/bin/activate
python -m pip install -U pip
pip install -r requirements.txt
```

3) Initialize database:
```
export FLASK_APP=manage.py
flask db upgrade
```

4) Run the app:
```
flask run --host=0.0.0.0 --port=5000
```

5) Open the frontend:
- Serve `frontend/` via Flask static or an HTTP server; default is via Flask at `/`.

## Default API Prefix
- `/api/v1`

## Phase 1 Scope
- JWT auth, user management
- Goal and resource CRUD
- Basic analytics summary
- Email system configuration
- Scheduler bootstrapped (no heavy jobs yet)

## Environment Variables
See `.env.example` for all supported variables.
