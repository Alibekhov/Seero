# Usolve (Seero) - React + Django rebuild

This repo contains:
- `frontend/`: React SPA (Vite) that preserves the existing HTML/CSS look
- `backend/`: Django + DRF API (PostgreSQL-ready) with JWT auth, study-time tracking, and spaced repetition

## Local dev

### Run everything (recommended)
- `scripts\\dev.cmd`
- Stop: `scripts\\stop-dev.cmd`

### Backend (Django)
1. `cd backend`
2. Create env file: copy `backend\\.env.example` -> `backend\\.env`
3. Create venv + install:
   - `py -m venv .venv`
   - `.venv\\Scripts\\python -m pip install -r requirements.txt`
4. Migrate + seed:
   - `.venv\\Scripts\\python manage.py migrate`
   - `.venv\\Scripts\\python manage.py seed_content`
5. Run:
   - `.venv\\Scripts\\python manage.py runserver 127.0.0.1:8000`

API docs:
- `http://127.0.0.1:8000/api/docs/`

### Frontend (React)
1. `cd frontend`
2. Optional env: create `frontend\\.env` with:
   - `VITE_API_BASE_URL=http://127.0.0.1:8000/api`
3. Install + run:
   - `npm install`
   - `npm run dev -- --host 127.0.0.1 --port 5173`

App:
- `http://127.0.0.1:5173/`

## Key features implemented
- Contact form -> `POST /api/contact/` (stored in `ContactMessage`)
- JWT auth: register/login/refresh/logout
- Dashboard stats: today/weekly/total study time + revision queue
- Study time: real active time via session start/ping/stop
- Practice + flashcards: mnemonic hidden by default + TTS speaker icon
- Spaced repetition schedule: 24h -> 72h -> 7d -> 14d -> 28d
