@echo off
echo Starting Legal AI Complete System
echo ===================================

REM Set environment variables
set DATABASE_URL=postgres://legal_admin:123456@localhost:5434/legal_ai_db?sslmode=disable
set OLLAMA_URL=http://localhost:11434
set CUDA_WORKER_URL=http://localhost:8096
set REDIS_PASSWORD=redis

echo Environment configured:
echo DATABASE_URL=%DATABASE_URL%
echo OLLAMA_URL=%OLLAMA_URL%
echo CUDA_WORKER_URL=%CUDA_WORKER_URL%
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL database...
PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -c "\q" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL database is not accessible
    echo Please start PostgreSQL and ensure the database exists
    pause
    exit /b 1
)
echo ✓ PostgreSQL database is accessible

REM Check if Ollama is running
echo Checking Ollama service...
curl -s %OLLAMA_URL%/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama service is not running
    echo Please start Ollama on %OLLAMA_URL%
    pause
    exit /b 1
)
echo ✓ Ollama service is running

REM Setup database schema (optional - will only run if needed)
echo Setting up database schema...
PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -f "go-microservice\setup-database.sql" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Database schema updated
) else (
    echo ! Database schema update skipped (may already exist)
)

echo.
echo Starting services...
echo.

REM Start CUDA Service Worker in new window
echo Starting CUDA Service Worker (RTX 3060 Ti)...
start "CUDA Worker" cmd /k "cd go-microservice && go run cuda-service-worker.go"
timeout /t 3 >nul

REM Wait for CUDA worker to start
:wait_cuda
curl -s http://localhost:8096/api/v1/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Waiting for CUDA Worker to start...
    timeout /t 2 >nul
    goto wait_cuda
)
echo ✓ CUDA Service Worker started on port 8096

REM Start Legal AI Microservice in new window
echo Starting Legal AI Microservice...
start "Legal AI Service" cmd /k "cd go-microservice && go run legal-ai-microservice-complete.go"
timeout /t 3 >nul

REM Wait for Legal AI service to start
:wait_legal_ai
curl -s http://localhost:8095/api/v1/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Waiting for Legal AI Service to start...
    timeout /t 2 >nul
    goto wait_legal_ai
)
echo ✓ Legal AI Microservice started on port 8095

REM Start SvelteKit frontend in new window
echo Starting SvelteKit Frontend...
cd sveltekit-frontend
start "SvelteKit Frontend" cmd /k "REDIS_PASSWORD=redis npm run dev -- --port 5173"
cd ..
timeout /t 5 >nul

echo.
echo ===================================
echo Legal AI System Started Successfully!
echo ===================================
echo.
echo Services running:
echo 🖥️  CUDA Worker (RTX 3060 Ti):  http://localhost:8096/api/v1/health
echo ⚖️  Legal AI Service:           http://localhost:8095/api/v1/health
echo 🌐 SvelteKit Frontend:         http://localhost:5173
echo 📊 Test Interface:             http://localhost:5173/legal-ai/embedding-search-test
echo.
echo Available API endpoints:
echo.
echo Legal AI Service (Port 8095):
echo   GET  /api/v1/health           - Service health check
echo   POST /api/v1/submit           - Submit text for embedding
echo   GET  /api/v1/search?q=...     - Simple vector search
echo   POST /api/v1/search           - Advanced vector search with filters
echo   GET  /api/v1/stats            - Search statistics
echo.
echo CUDA Worker (Port 8096):
echo   GET  /api/v1/health           - CUDA health and GPU status
echo   POST /api/v1/submit           - Submit CUDA task (embedding, inference)
echo   GET  /api/v1/workers          - Worker status and GPU metrics
echo   GET  /api/v1/metrics          - Performance metrics
echo.
echo Test the complete pipeline:
echo 1. Go to: http://localhost:5173/legal-ai/embedding-search-test
echo 2. Submit a legal document for embedding
echo 3. Search for similar documents using vector similarity
echo 4. Test CUDA acceleration features
echo.
echo Example curl commands:
echo.
echo # Submit embedding:
echo curl -X POST http://localhost:8095/api/v1/submit \
echo   -H "Content-Type: application/json" \
echo   -d "{\"type\":\"embedding\",\"payload\":\"Legal contract clause\",\"metadata\":{\"caseId\":\"TEST_001\"}}"
echo.
echo # Search documents:
echo curl "http://localhost:8095/api/v1/search?q=contract%%20clause&limit=5"
echo.
echo # Check CUDA status:
echo curl http://localhost:8096/api/v1/health
echo.
echo Press any key to open the test interface in your browser...
pause >nul

REM Open browser to test interface
start http://localhost:5173/legal-ai/embedding-search-test

echo.
echo System is running! Check the opened browser window.
echo Press any key to exit this script (services will continue running)...
pause >nul