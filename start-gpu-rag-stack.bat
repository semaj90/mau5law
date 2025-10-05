@echo off
REM Complete GPU RAG Stack Startup
REM Ollama GPU + embeddinggemma + Qdrant + LiteLLM + SvelteKit with QUIC

echo ========================================
echo   GPU RAG Stack - Legal AI Platform
echo ========================================
echo.

REM Set environment variables
set CUDA_VISIBLE_DEVICES=0
set ENABLE_GPU=true
set RTX_3060_OPTIMIZATION=true
set OLLAMA_GPU_LAYERS=30
set OLLAMA_FLASH_ATTENTION=true
set REDIS_PASSWORD=redis
set QUIC_ENABLED=true

echo [1/5] Starting Redis Cache...
start "Redis" /MIN redis-server

timeout /t 2 /nobreak > nul

echo [2/5] Starting Qdrant Vector Database...
start "Qdrant" /MIN docker start qdrant 2>nul || docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

timeout /t 3 /nobreak > nul

echo [3/5] Starting Ollama GPU Server...
start "Ollama-GPU" /MIN cmd /c "start-ollama-gpu.bat"

timeout /t 3 /nobreak > nul

echo [4/5] Starting LiteLLM Proxy (GPU + Cache)...
start "LiteLLM" /MIN cmd /c "start-litellm-gpu-cache.bat"

timeout /t 3 /nobreak > nul

echo [5/5] Starting SvelteKit Frontend with QUIC...
cd sveltekit-frontend
start "SvelteKit-QUIC" cmd /c "npm run dev:quic"

timeout /t 5 /nobreak > nul

echo.
echo ========================================
echo   GPU RAG Stack Running!
echo ========================================
echo.
echo   Access Points:
echo   - Frontend (HTTP):  http://localhost:5173
echo   - Frontend (QUIC):  http://localhost:5178/agent-demo
echo   - LiteLLM Proxy:    http://localhost:4000
echo   - Ollama GPU:       http://localhost:11434
echo   - Qdrant:           http://localhost:6333
echo   - Redis:            localhost:6379
echo.
echo   Stack Components:
echo   [x] Ollama GPU (30 layers, FlashAttention)
echo   [x] embeddinggemma:latest (GPU accelerated)
echo   [x] Qdrant (vector database)
echo   [x] LiteLLM (with Redis cache)
echo   [x] SvelteKit (QUIC enabled)
echo.
echo   Test RAG Search:
echo   curl -X POST http://localhost:5173/api/rag/search ^
echo     -H "Content-Type: application/json" ^
echo     -d "{\"query\":\"contract law\",\"limit\":5}"
echo.
echo ========================================
echo.

pause
