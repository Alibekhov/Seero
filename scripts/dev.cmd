@echo off
setlocal

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

echo [1/2] Starting backend...
pushd "%BACKEND%"
if not exist ".venv\Scripts\python.exe" (
  py -m venv .venv
)
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
)
.\.venv\Scripts\python -m pip install -r requirements.txt >nul
.\.venv\Scripts\python manage.py migrate >nul
.\.venv\Scripts\python manage.py seed_content >nul
if not exist ".logs" mkdir ".logs"
start "usolve-backend" /B cmd /c ".\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload 1> .logs\runserver.out.log 2> .logs\runserver.err.log"
popd

echo [2/2] Starting frontend...
pushd "%FRONTEND%"
if not exist "node_modules" (
  npm install
)
if not exist ".logs" mkdir ".logs"
start "usolve-frontend" /B cmd /c "npm.cmd run dev -- --host 127.0.0.1 --port 5173 1> .logs\vite.out.log 2> .logs\vite.err.log"
popd

echo.
echo Frontend: http://127.0.0.1:5173/
echo Backend API docs: http://127.0.0.1:8000/api/docs/
echo.
echo Logs:
echo - %BACKEND%\.logs\
echo - %FRONTEND%\.logs\
echo.

endlocal

