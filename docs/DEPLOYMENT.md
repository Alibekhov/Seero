# Deployment (production)

## Backend
1. Set env vars (see `backend/.env.example`):
   - `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`
   - `DATABASE_URL=postgresql://...`
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run migrations + seed:
   - `python backend/manage.py migrate`
   - `python backend/manage.py seed_content`
4. Run with Gunicorn:
   - `gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:8000`

## Frontend
1. Set `VITE_API_BASE_URL` to your backend URL (including `/api`)
2. Build: `npm run build` in `frontend/`
3. Serve `frontend/dist/` via Nginx/Cloudflare Pages/S3 etc.

