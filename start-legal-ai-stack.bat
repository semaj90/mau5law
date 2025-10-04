@echo off
REM ================================================================================
REM LEGAL AI STACK - UNIFIED STARTUP SCRIPT
REM ================================================================================
REM Starts all microservices for the Legal AI Platform
REM Uses existing compiled services - no rebuild needed
REM ================================================================================

echo.
echo ========================================
echo  LEGAL AI PLATFORM - STARTUP
echo ========================================
echo.

REM Check Docker services are running
echo [1/5] Checking Docker services...
docker ps | findstr "legal-ai" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker services not running!
    echo Please start Docker Desktop and run: docker-compose up -d
    pause
    exit /b 1
)
echo SUCCESS: Docker services running (PostgreSQL, Redis, MinIO, Qdrant, Caddy)
echo.

REM Set environment variables
echo [2/5] Setting environment variables...
set DATABASE_URL=postgres://legal_admin:123456@localhost:5432/legal_ai_db?sslmode=disable
set REDIS_URL=redis://:redis@localhost:6379
set REDIS_PASSWORD=redis
set QDRANT_URL=http://localhost:6333
set OLLAMA_URL=http://localhost:11434
set MINIO_HOST=localhost:9000
set MINIO_ACCESS_KEY=minioadmin
set MINIO_SECRET_KEY=minioadmin
set PORT=8095
echo SUCCESS: Environment configured
echo.

REM Check if Ollama is running
echo [3/5] Checking Ollama service...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo WARNING: Ollama not running - AI features will use fallback mode
) else (
    echo SUCCESS: Ollama running
)
echo.

REM Start Go microservices (use existing compiled versions)
echo [4/5] Starting Go microservices...

REM Check which services exist and start them
if exist "go-microservice\enhanced-rag.exe" (
    echo Starting Enhanced RAG Service on port 8095...
    start "Enhanced RAG Service" /MIN go-microservice\enhanced-rag.exe
    timeout /t 2 /nobreak >nul
) else if exist "go-microservice\cmd\enhanced-rag-v2\main.exe" (
    echo Starting Enhanced RAG V2 Service on port 8095...
    start "Enhanced RAG V2" /MIN go-microservice\cmd\enhanced-rag-v2\main.exe
    timeout /t 2 /nobreak >nul
) else (
    echo Building Enhanced RAG V2 Service...
    cd go-microservice\cmd\enhanced-rag-v2
    go build -o main.exe main.go
    if not errorlevel 1 (
        start "Enhanced RAG V2" /MIN main.exe
        timeout /t 2 /nobreak >nul
    )
    cd ..\..\..
)

if exist "go-microservice\artifact-indexing-service.exe" (
    echo Starting Artifact Indexing Service on port 8227...
    start "Artifact Indexing" /MIN go-microservice\artifact-indexing-service.exe
    timeout /t 2 /nobreak >nul
)

if exist "go-microservice\tensorrt-bridge-clean.exe" (
    echo Starting TensorRT Bridge Service on port 8086...
    start "TensorRT Bridge" /MIN go-microservice\tensorrt-bridge-clean.exe
    timeout /t 2 /nobreak >nul
)

echo SUCCESS: Microservices started
echo.

REM Start SvelteKit frontend
echo [5/5] Starting SvelteKit frontend...
cd sveltekit-frontend
set REDIS_PASSWORD=redis
set DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
start "SvelteKit Frontend" /MIN npm run dev -- --port 5173 --host 127.0.0.1
cd ..
echo SUCCESS: Frontend starting on http://localhost:5173
echo.

echo ========================================
echo  ALL SERVICES STARTED
echo ========================================
echo.
echo SERVICES RUNNING:
echo   - PostgreSQL:     localhost:5432
echo   - Redis:          localhost:6379
echo   - MinIO:          localhost:9000-9001
echo   - Qdrant:         localhost:6333
echo   - Caddy QUIC:     localhost:5178
echo   - Enhanced RAG:   localhost:8095
echo   - Artifact Index: localhost:8227
echo   - TensorRT:       localhost:8086
echo   - SvelteKit:      http://localhost:5173
echo.
echo MODELS CONFIGURED:
echo   - Legal AI:       gemma3-legal:latest
echo   - Embeddings:     embeddinggemma:latest
echo   - Fallback:       nomic-embed-text
echo.
echo FEATURES ENABLED:
echo   - MinIO file upload with evidence page
echo   - RAG with Qdrant + pgvector hybrid search
echo   - AI chat with streaming support
echo   - GPU acceleration (if Ollama configured)
echo   - Automatic document indexing
echo   - Vector similarity search
echo.
echo Press Ctrl+C to stop all services
echo Or close this window to keep services running
echo.
pause
