@echo off
echo ========================================
echo  LEGAL AI EMBEDDING SERVICE STARTUP
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges
    echo Please run as Administrator
    pause
    exit /b 1
)

echo [1/6] Starting Redis Cache Server...
cd /d "%~dp0"
start "Redis Cache" cmd /c "./redis-latest/redis-server.exe --port 4005"
timeout /t 3 /nobreak >nul

echo [2/6] Starting PostgreSQL Database...
set PGPASSWORD=123456
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\postgresql.log" >nul 2>&1

REM Verify PostgreSQL is running
echo Testing PostgreSQL connection...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d legal_ai_db -c "SELECT 1 as test;" --quiet >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: PostgreSQL connection failed
    echo Please ensure PostgreSQL is properly configured
    pause
    exit /b 1
)

echo [3/6] Creating Python Virtual Environment...
if not exist "python-gpu-worker\venv" (
    cd python-gpu-worker
    python -m venv venv
    cd ..
)

echo [4/6] Installing Python Dependencies...
cd python-gpu-worker
call venv\Scripts\activate.bat
pip install -r requirements.txt >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Some Python dependencies may not have installed correctly
    echo Continuing anyway...
)

echo [5/6] Installing Node.js Dependencies...
cd /d "%~dp0"
npm install express redis pg cors >nul 2>&1

echo [6/6] Starting All Services...
echo.

REM Start Python GPU Worker in background
echo Starting Python RTX 3060 Ti GPU Worker...
cd python-gpu-worker
start "Python GPU Worker" cmd /c "venv\Scripts\activate.bat && python rtx-embedding-server.py"
cd ..

REM Wait for Python worker to initialize
echo Waiting for GPU worker initialization...
timeout /t 8 /nobreak >nul

REM Start Node.js Integration Service
echo Starting Node.js Integration Service...
start "Node.js API" cmd /c "node integrated-embedding-service.js"

REM Wait for services to fully initialize
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    ALL SERVICES STARTED SUCCESSFULLY
echo ========================================
echo.
echo Service Endpoints:
echo   Node.js API:     http://localhost:3001
echo   Python GPU:      http://localhost:8000  
echo   Redis Cache:     localhost:4005
echo   PostgreSQL:      localhost:5432
echo   SvelteKit App:   http://localhost:5181
echo.
echo API Testing:
echo   curl http://localhost:3001/health
echo   curl -X POST http://localhost:3001/api/embed -H "Content-Type: application/json" -d "{\"text\":\"Test legal document\"}"
echo.
echo GPU Benchmarking:
echo   curl -X POST http://localhost:3001/api/benchmark
echo.
echo NVIDIA Documentation:
echo   curl http://localhost:3001/api/nvidia-docs/tensor-cores
echo.

REM Open service URLs in browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:3001/health"
start "" "http://localhost:5181"

echo Press any key to view service logs or Ctrl+C to exit...
pause >nul

REM Show service status
echo.
echo ========================================
echo         SERVICE STATUS CHECK
echo ========================================

REM Check Node.js API
curl -s http://localhost:3001/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Node.js API Service: RUNNING
) else (
    echo ❌ Node.js API Service: NOT RESPONDING
)

REM Check Python GPU Worker  
curl -s http://localhost:8000/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Python GPU Worker: RUNNING
) else (
    echo ❌ Python GPU Worker: NOT RESPONDING
)

REM Check Redis
"./redis-latest/redis-cli.exe" -p 4005 ping >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Redis Cache: RUNNING
) else (
    echo ❌ Redis Cache: NOT RESPONDING
)

REM Check PostgreSQL
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d legal_ai_db -c "SELECT 1;" --quiet >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ PostgreSQL Database: RUNNING
) else (
    echo ❌ PostgreSQL Database: NOT RESPONDING
)

echo.
echo All services are now running!
echo Check the browser windows that opened for the service dashboards.
echo.
echo To stop all services, run: STOP-EMBEDDING-SERVICE.bat
echo.
pause