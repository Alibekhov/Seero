# System architecture

## High level
- **Frontend**: React SPA (`frontend/`) renders the existing UI structure and calls the backend REST API.
- **Backend**: Django + DRF (`backend/`) provides JWT auth, study-time tracking, and spaced repetition.
- **Data**: PostgreSQL in production (dev falls back to SQLite when `DATABASE_URL` is not set).

## Frontend structure
- `frontend/src/app/`: providers (Auth/Theme) + routing
- `frontend/src/pages/`: page-level UI (`LandingPage`, `DashboardPage`)
- `frontend/src/features/`: cross-cutting features (study-time tracking)
- `frontend/src/shared/`: API, hooks, utils

## Backend structure
- `backend/config/`: settings + URL routing
- `backend/apps/accounts/`: custom user + JWT endpoints
- `backend/apps/learning/`: courses/lessons/cards + seed command
- `backend/apps/tracking/`: study sessions + spaced repetition schedules
- `backend/apps/contact/`: contact messages

## API overview
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `POST /api/contact/`
- `GET /api/dashboard/`
- `POST /api/study-sessions/start/`
- `POST /api/study-sessions/ping/`
- `POST /api/study-sessions/stop/`
- `GET /api/lessons/`
- `GET /api/lessons/<lesson_slug>/cards/`
- `POST /api/lessons/<lesson_slug>/complete/`
- `GET /api/revisions/due/`
- `POST /api/revisions/<schedule_id>/review/`

