@echo off
echo ================================================
echo    GPU INFERENCE DEMO - DEVELOPMENT MODE
echo ================================================

REM Kill any existing processes on our ports
echo [1/5] Cleaning up existing processes...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":5173"') do (
    echo Stopping process on port 5173: %%i
    taskkill /PID %%i /F >nul 2>&1
)
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":5174"') do (
    echo Stopping process on port 5174: %%i
    taskkill /PID %%i /F >nul 2>&1
)

echo [2/5] Checking Prerequisites...
REM Check if PostgreSQL is running
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\17\data" >nul 2>&1
if errorlevel 1 (
    echo ❌ Starting PostgreSQL...
    set PGPASSWORD=123456
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\postgresql.log"
    timeout /t 3 >nul
) else (
    echo ✅ PostgreSQL is running
)

echo [3/5] Setting up development environment...
cd sveltekit-frontend

REM Use development Vite config
copy /Y vite.config.js vite.config.dev.js >nul 2>&1

echo [4/5] Starting Vite development server...
REM Start development server on port 5174 to avoid conflicts
echo Starting GPU inference demo on http://localhost:5174...

set VITE_PORT=5174
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db

REM Open Chrome to the GPU inference demo page after a short delay
start /B timeout /t 3 >nul && start chrome "http://localhost:5174/demo/gpu-inference"

REM Start Vite dev server with specific port and config
npx vite dev --port 5174 --host 0.0.0.0

echo.
echo [5/5] Server stopped. 
pause