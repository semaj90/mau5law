@echo off
echo ================================================
echo    GPU INFERENCE DEMO - WINDOWS PRODUCTION DEPLOYMENT
echo ================================================

REM Set environment variables
set NODE_ENV=production
set PORT=4173
set DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db

echo [1/6] Checking Prerequisites...
REM Check if PostgreSQL is running
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\17\data" >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL not running. Starting PostgreSQL...
    set PGPASSWORD=123456
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\postgresql.log"
    timeout /t 3 >nul
) else (
    echo ✅ PostgreSQL is running
)

REM Check database connection
echo [2/6] Verifying Database Connection...
set PGPASSWORD=123456
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d legal_ai_db -c "SELECT 1 as test;" --quiet >nul 2>&1
if errorlevel 1 (
    echo ❌ Database connection failed
    pause
    exit /b 1
) else (
    echo ✅ Database connection verified
)

echo [3/6] Building Production Application...
cd sveltekit-frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Build for production with error handling
echo Building application...
npm run build 2>build-errors.log
if errorlevel 1 (
    echo ❌ Build failed. Check build-errors.log for details.
    echo ================================================
    type build-errors.log
    echo ================================================
    pause
    exit /b 1
)

echo ✅ Production build completed

echo [4/6] Testing Production Build...
REM Start preview server in background to test
start /B npm run preview

REM Wait for server to start
timeout /t 5 >nul

REM Test health endpoints
echo Testing GPU inference endpoints...
curl -s http://localhost:4173/demo/gpu-inference/api/health/webgpu >nul 2>&1
if errorlevel 1 (
    echo ⚠️  WebGPU health check failed - service may be offline
) else (
    echo ✅ WebGPU engine accessible
)

curl -s http://localhost:4173/demo/gpu-inference/api/health/ollama >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Ollama health check failed - service may be offline
) else (
    echo ✅ Ollama engine accessible
)

echo [5/6] Production Server Ready!
echo ================================================
echo 🚀 GPU INFERENCE DEMO PRODUCTION DEPLOYMENT
echo ================================================
echo 📍 Application URL: http://localhost:4173
echo 🎮 GPU Inference Demo: http://localhost:4173/demo/gpu-inference
echo 💾 Database: PostgreSQL running on port 5432
echo ⚡ Build: Production optimized with code splitting
echo ================================================

echo [6/6] Opening Production Application...
REM Open in default browser
start http://localhost:4173/demo/gpu-inference

echo.
echo Production server is running on port 4173
echo Press Ctrl+C to stop the server
echo.
echo 📊 Features Available:
echo   ✅ Multi-engine AI inference (WebGPU, Ollama, vLLM, FastEmbed)
echo   ✅ Database-persistent chat sessions
echo   ✅ Real-time performance metrics
echo   ✅ Professional YoRHa-themed interface
echo   ✅ Health monitoring for all AI engines
echo.

REM Keep the preview server running
npm run preview