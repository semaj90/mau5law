@echo off
echo ===============================================
echo   RTX 3060 Enhanced System with QUIC/HTTP3
echo   OLLAMA_GPU_LAYERS=999 + Full Stack Startup
echo ===============================================
echo.

REM Kill existing processes
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8777') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1

REM Check PostgreSQL
echo Checking PostgreSQL...
"C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -p 5432 >nul 2>&1
if errorlevel 1 (
    echo Starting PostgreSQL...
    set PGPASSWORD=123456
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\postgresql.log" >nul 2>&1
)

REM Check Redis
echo Checking Redis...
..\redis-latest\redis-cli.exe -p 4005 ping >nul 2>&1
if errorlevel 1 (
    echo Starting Redis...
    start "Redis Server" /MIN cmd /c "..\redis-latest\redis-server.exe --port 4005"
    timeout /t 3 /nobreak >nul
)

REM Start MCP Context7 Server
echo Starting MCP Context7 Server...
start "MCP Context7" /MIN cmd /c "cd ..\mcp-servers && node context7-server.js --port=8777"
timeout /t 2 /nobreak >nul

REM Start Vite with RTX 3060 + GPU optimization
echo Starting Vite with RTX 3060 Optimization + GPU Layers...
start "Vite GPU RTX" /MIN cmd /c "npm run dev:gpu:quic"
timeout /t 8 /nobreak >nul

REM Start Caddy QUIC Proxy
echo Starting Caddy QUIC/HTTP3 Proxy...
start "Caddy QUIC" cmd /c "caddy.exe run --config Caddyfile"
timeout /t 3 /nobreak >nul

echo.
echo ===============================================
echo   🚀 RTX 3060 QUIC Stack Started Successfully!
echo ===============================================
echo   📊 GPU Optimization: RTX_3060_OPTIMIZATION=true
echo   🧠 AI Layers: OLLAMA_GPU_LAYERS=999
echo   🔄 Multi-Core: CONTEXT7_MULTICORE=true
echo   🌐 QUIC/HTTP3: https://localhost:5173
echo   ⚡ Vite HMR: http://localhost:5174
echo   🔗 Context7: http://localhost:8777
echo ===============================================
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping all services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8777') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo All services stopped.