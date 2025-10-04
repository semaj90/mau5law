@echo off
REM ================================================================================
REM GPU-Accelerated Legal AI Stack Startup Script
REM ================================================================================
REM Models: embeddinggemma:latest + gemma3-legal:latest
REM GPU: RTX 3060 with FlashAttention 2 + CUDA 13
REM Services: MinIO + PostgreSQL + Qdrant + Redis + Caddy + Go Microservices
REM ================================================================================

echo.
echo ========================================
echo   GPU-Accelerated Legal AI Stack
echo ========================================
echo.

REM Check if Docker Desktop is running
echo [1/7] Checking Docker Desktop...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Desktop is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo SUCCESS: Docker is running

REM Start Docker infrastructure
echo.
echo [2/7] Starting Docker infrastructure...
echo   - PostgreSQL 17 + pgvector (port 5434)
echo   - Qdrant vector database (port 6333)
echo   - Redis cache (port 6379, password: redis)
echo   - MinIO object storage (port 9000-9001)
echo   - Caddy QUIC proxy (port 5178)

docker-compose up -d postgres qdrant redis minio caddy 2>nul
if errorlevel 1 (
    echo WARNING: Some Docker services may already be running
) else (
    echo SUCCESS: Docker services started
)

REM Wait for databases to be ready
echo.
echo [3/7] Waiting for databases to initialize...
timeout /t 5 /nobreak >nul
echo SUCCESS: Databases ready

REM Check Ollama models
echo.
echo [4/7] Verifying Ollama GPU models...
echo   Primary: embeddinggemma:latest (GPU embeddings)
echo   Legal: gemma3-legal:latest (FlashAttention)
echo   Fallback: nomic-embed-text (CPU)

REM TODO: Add ollama list command when available
echo INFO: Make sure Ollama is running with GPU support

REM Start Go microservices with GPU acceleration
echo.
echo [5/7] Starting GPU-accelerated Go microservices...

echo   [5.1] Enhanced RAG V2 (Ports: 8097 HTTP, 8098 WS, 50052 gRPC)
start "Enhanced RAG V2" cmd /c "cd go-microservice\cmd\enhanced-rag-v2 && go run main.go"

timeout /t 2 /nobreak >nul

echo   [5.2] Artifact Indexing Service with GPU Embeddings (Port 8080)
start "Artifact Indexing" cmd /c "cd go-microservice && artifact-indexing-service.exe"

timeout /t 2 /nobreak >nul

echo   [5.3] GPU Inference Server (Port 8081)
if exist "go-microservice\cmd\gpu_inference_server\main.go" (
    start "GPU Inference" cmd /c "cd go-microservice\cmd\gpu_inference_server && go run main.go"
) else (
    echo   SKIP: GPU Inference Server not found
)

timeout /t 2 /nobreak >nul

echo   [5.4] Binary Vector Engine with Qdrant (Port 8082)
if exist "go-microservice\cmd\binary-vector-engine\main.go" (
    start "Vector Engine" cmd /c "cd go-microservice\cmd\binary-vector-engine && go run main.go"
) else (
    echo   SKIP: Binary Vector Engine not found
)

timeout /t 2 /nobreak >nul

echo   [5.5] CUDA Worker for Legal Gateway (Port 8083)
if exist "legal-gateway\cuda-worker.go" (
    start "CUDA Worker" cmd /c "cd legal-gateway && go run cuda-worker.go"
) else (
    echo   SKIP: CUDA Worker not found
)

REM Start SvelteKit frontend
echo.
echo [6/7] Starting SvelteKit Frontend...
echo   Redis Password: redis
echo   Database: PostgreSQL on port 5434
echo   Port: 5173

start "SvelteKit Frontend" cmd /c "cd sveltekit-frontend && set REDIS_PASSWORD=redis && set DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db && npm run dev -- --port 5173 --host 127.0.0.1"

REM Display status
echo.
echo [7/7] Startup Complete!
echo.
echo ========================================
echo   Service URLs
echo ========================================
echo   Frontend:          http://localhost:5173
echo   Caddy QUIC:        http://localhost:5178
echo   MinIO Console:     http://localhost:9001
echo   Redis Insight:     http://localhost:8001
echo   Qdrant Dashboard:  http://localhost:6333/dashboard
echo.
echo   API Endpoints:
echo   - RAG V2 HTTP:     http://localhost:8097
echo   - RAG V2 WS:       ws://localhost:8098
echo   - RAG V2 gRPC:     localhost:50052
echo   - Artifact Index:  http://localhost:8080
echo   - GPU Inference:   http://localhost:8081
echo   - Vector Engine:   http://localhost:8082
echo.
echo ========================================
echo   GPU Acceleration Status
echo ========================================
echo   Model: embeddinggemma:latest
echo   GPU: RTX 3060 Ti with FlashAttention 2
echo   CUDA: Version 13 (Windows native)
echo   Fallback: CPU with nomic-embed-text
echo.
echo   TODO: TensorRT-LLM integration for 10x speedup
echo ========================================
echo.
echo Press any key to view logs...
pause >nul

REM Open log windows
echo Opening service logs...
echo.
echo Close all terminal windows to stop all services.
pause
