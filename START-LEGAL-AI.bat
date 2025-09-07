@echo off
echo =======================================================
echo   LEGAL AI PLATFORM - COMPREHENSIVE STARTUP SCRIPT
echo =======================================================
echo.

echo [1/4] Starting PostgreSQL Database...
pg_ctl start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\log\postgresql.log"
if errorlevel 1 (
    echo Warning: PostgreSQL may already be running or path needs adjustment
    echo You can also start via: net start postgresql-x64-17
)
echo.

echo [2/4] Ensuring Legal AI Database exists...
createdb legal_ai_db 2>nul
if errorlevel 1 (
    echo Database legal_ai_db already exists or PostgreSQL not ready
)
echo.

echo [3/4] Applying Database Schema Migration...
cd sveltekit-frontend
echo Running Drizzle migrations...
npx drizzle-kit push:pg 2>nul
if errorlevel 1 (
    echo Note: Manual schema application may be needed
    echo Check: src/lib/server/db/schema-postgres.ts
)
echo.

echo [4/4] Starting Development Services...
echo.
REM Ensure Redis env defaults to port 4005 for the platform
set REDIS_URL=redis://127.0.0.1:4005
echo Using REDIS_URL=%REDIS_URL%

REM Try starting RabbitMQ Windows service if installed (safe no-op otherwise)
sc query RabbitMQ >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Attempting to start RabbitMQ service...
    net start RabbitMQ >nul 2>&1 || echo RabbitMQ may already be running or needs installation
) else (
    echo RabbitMQ service not found; ensure RabbitMQ is running on ports 5672/15672
)

REM If redis-server binary exists in ../redis-latest, attempt to start it
if exist "..\redis-latest\redis-server.exe" (
    echo Starting local redis-server from ../redis-latest on port 4005
    start "Redis" "..\redis-latest\redis-server.exe" --port 4005
) else (
    echo Warning: redis-server.exe not found in ../redis-latest. Set REDIS_URL to a reachable Redis instance if you do not run Redis locally.
)

echo Choose startup mode:
echo [A] Frontend Only     - npm run dev
echo [B] Full Stack        - npm run dev:full
echo [C] VS Code Debug     - code . then F5
echo [Q] Quit
echo.
set /p choice="Enter choice (A/B/C/Q): "

if /i "%choice%"=="A" (
    echo Starting Frontend Only...
    npm run dev
) else if /i "%choice%"=="B" (
    echo Starting Full Stack...
    npm run dev:full
) else if /i "%choice%"=="C" (
    echo Opening VS Code for debugging...
    code .
    echo.
    echo VS Code opened. Press F5 to start debugging or use:
    echo - Run and Debug panel
    echo - Select "Launch SvelteKit" configuration
) else if /i "%choice%"=="Q" (
    echo Exiting...
    goto :end
) else (
    echo Invalid choice. Starting default Frontend mode...
    npm run dev
)

:end
echo.
echo =======================================================
echo   LEGAL AI PLATFORM STARTUP COMPLETE
echo   Visit: http://localhost:5177
echo   Auth endpoints: /api/auth/login /api/auth/register
echo =======================================================
pause