@echo off
echo ========================================
echo AVX2-Optimized Error Reduction Pipeline
echo ========================================
echo.

echo [1/8] Starting SIMD JSON Accelerator (AVX2)...
cd sveltekit-frontend
start "SIMD-AVX2" cmd /c "npm run simd:exe:start"
timeout /t 3 /nobreak >nul
cd ..

echo [2/8] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama running
) else (
    echo ⚠️  Starting Ollama...
    start "Ollama" cmd /c "ollama serve"
    timeout /t 5 /nobreak >nul
)

echo [3/8] Pulling embeddinggemma model...
ollama pull embeddinggemma:latest

echo [4/8] Starting Redis...
start "Redis" cmd /c "redis-server"
timeout /t 2 /nobreak >nul

echo [5/8] Starting Postgres...
docker-compose up -d postgres
timeout /t 5 /nobreak >nul

echo [6/8] Starting Qdrant...
docker-compose up -d qdrant
timeout /t 3 /nobreak >nul

echo [7/8] Starting MinIO...
docker-compose up -d minio
timeout /t 3 /nobreak >nul

echo [8/8] Starting Frontend with dev:quic...
cd sveltekit-frontend
start "Vite-QUIC" cmd /c "npm run dev:quic"

echo.
echo ========================================
echo ✅ Pipeline Started!
echo ========================================
echo.
echo Services:
echo - SIMD JSON:  http://localhost:8096/health
echo - Ollama:     http://localhost:11434/api/tags
echo - Redis:      localhost:6379
echo - Postgres:   localhost:5432
echo - Qdrant:     http://localhost:6333
echo - MinIO:      http://localhost:9000
echo - Frontend:   http://localhost:5173
echo.
echo AST Analyzer: http://localhost:5173/dev/ast-graph
echo Route Explorer: http://localhost:5173/all-routes
echo.
echo Press any key to view health checks...
pause >nul

echo.
echo Running health checks...
echo.

echo [SIMD JSON]
curl -s http://localhost:8096/health | jq .status 2>nul || curl -s http://localhost:8096/health

echo.
echo [Ollama]
curl -s http://localhost:11434/api/tags | jq .models[].name 2>nul || echo "Check manually"

echo.
echo [Qdrant]
curl -s http://localhost:6333/health 2>nul || echo "Starting..."

echo.
echo [MinIO]
curl -s http://localhost:9000/minio/health/live 2>nul || echo "Starting..."

echo.
echo ========================================
echo Pipeline ready for error reduction!
echo ========================================
pause
