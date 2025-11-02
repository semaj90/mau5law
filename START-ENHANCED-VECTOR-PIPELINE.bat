@echo off
REM Enhanced Vector Pipeline Startup Script
REM Optimized for RTX 3060 Ti with CUDA acceleration

echo =================================================================
echo   Legal AI Enhanced Vector Pipeline - RTX 3060 Ti Optimized
echo =================================================================
echo.

REM Set environment variables
set DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db
set MINIO_ENDPOINT=localhost:9000
set MINIO_ACCESS_KEY=minioadmin
set MINIO_SECRET_KEY=minioadmin
set QDRANT_URL=http://localhost:6333
set REDIS_URL=redis://localhost:6379
set FASTEMBED_URL=http://localhost:8001
set CUDA_ENABLED=true
set BATCH_SIZE=16
set WORKER_COUNT=4

echo Setting up environment variables...
echo DATABASE_URL: %DATABASE_URL%
echo FASTEMBED_URL: %FASTEMBED_URL%
echo CUDA_ENABLED: %CUDA_ENABLED%
echo BATCH_SIZE: %BATCH_SIZE%
echo.

REM Check if Python FastEmbed service is running
echo Checking FastEmbed service...
curl -s http://localhost:8001/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting FastEmbed service...
    start "FastEmbed Service" cmd /k "cd gpu-inference-worker && python fastembed_service.py"
    
    echo Waiting for FastEmbed service to start...
    timeout /t 10 /nobreak >nul
    
    REM Wait for service to be ready
    :wait_fastembed
    curl -s http://localhost:8001/health >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo Still waiting for FastEmbed...
        timeout /t 2 /nobreak >nul
        goto wait_fastembed
    )
    echo FastEmbed service is ready!
) else (
    echo FastEmbed service is already running!
)

echo.

REM Build and start Go microservice
echo Building enhanced vector pipeline Go service...
cd go-microservice\cmd\enhanced-vector-pipeline

REM Install Go dependencies
echo Installing Go dependencies...
go mod tidy

REM Build the service
echo Building Go binary...
go build -o enhanced-vector-pipeline.exe .

if not exist enhanced-vector-pipeline.exe (
    echo ERROR: Failed to build Go service
    pause
    exit /b 1
)

echo Starting enhanced vector pipeline service...
start "Enhanced Vector Pipeline" cmd /k "enhanced-vector-pipeline.exe"

REM Wait for service to start
echo Waiting for Go service to start...
timeout /t 5 /nobreak >nul

REM Check if Go service is running
curl -s http://localhost:8080/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Go service may not be ready yet...
    echo Check the service window for errors.
) else (
    echo Go service is ready!
)

cd ..\..\..

echo.
echo =================================================================
echo   Enhanced Vector Pipeline Services Status
echo =================================================================

REM Check all services
echo Checking FastEmbed Service (Python)...
curl -s http://localhost:8001/health | jq .status 2>nul
if %ERRORLEVEL% neq 0 (
    echo   Status: Not responding or jq not installed
) else (
    echo   Status: OK
)

echo.
echo Checking Vector Pipeline Service (Go)...
curl -s http://localhost:8080/health | jq .status 2>nul
if %ERRORLEVEL% neq 0 (
    echo   Status: Not responding or jq not installed
) else (
    echo   Status: OK
)

echo.
echo Checking SvelteKit API...
curl -s http://localhost:5173/api/v2/vector-pipeline?action=stats >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   SvelteKit API: Not ready (may need to start separately)
) else (
    echo   SvelteKit API: OK
)

echo.
echo =================================================================
echo   Service Endpoints
echo =================================================================
echo   FastEmbed Service:     http://localhost:8001
echo   Vector Pipeline:       http://localhost:8080
echo   SvelteKit API:         http://localhost:5173/api/v2/vector-pipeline
echo   
echo   Health Checks:
echo   - FastEmbed:           http://localhost:8001/health
echo   - Vector Pipeline:     http://localhost:8080/health
echo   - Performance Stats:   http://localhost:8001/performance
echo.

echo =================================================================
echo   Usage Examples
echo =================================================================
echo.
echo   Process documents from MinIO:
echo   curl -X POST http://localhost:8080/process \
echo        -H "Content-Type: application/json" \
echo        -d "{\"bucket_name\":\"legal-docs\",\"object_key\":\"document.pdf\"}"
echo.
echo   Search similar documents:
echo   curl "http://localhost:5173/api/v2/vector-pipeline?action=search&q=contract+terms"
echo.
echo   Get pipeline statistics:
echo   curl "http://localhost:5173/api/v2/vector-pipeline?action=stats"
echo.

echo All services should now be running!
echo Press any key to continue...
pause >nul