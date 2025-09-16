@echo off
REM TensorRT Production Startup Script
REM Safely launches TensorRT services without disturbing existing containers

echo 🚀 Starting TensorRT Legal AI Production Environment
echo ====================================================

REM Check if Docker Desktop is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker Desktop is running

REM Check existing containers (won't disturb them)
echo 📊 Current running containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo 🔍 Checking if legal-ai-network exists...
docker network inspect legal-ai-network >nul 2>&1
if errorlevel 1 (
    echo 🛠️ Creating legal-ai-network...
    docker network create legal-ai-network
) else (
    echo ✅ legal-ai-network already exists
)

echo.
echo 🔧 Building TensorRT services (this may take a few minutes)...

REM Build TensorRT Legal service
echo 📦 Building TensorRT service for gemma3-legal:latest...
docker build -f Dockerfile.tensorrt-legal -t legal-ai-tensorrt:latest .

if errorlevel 1 (
    echo ❌ Failed to build TensorRT service
    pause
    exit /b 1
)

REM Build WebAssembly llama.cpp service
echo 📦 Building WebAssembly llama.cpp service for gemma3:270m...
docker build -f Dockerfile.webasm-onnx -t legal-ai-webasm:latest .

if errorlevel 1 (
    echo ❌ Failed to build WebAssembly service
    pause
    exit /b 1
)

REM Build PostgreSQL Vector service
echo 📦 Building PostgreSQL Vector integration service...
docker build -f Dockerfile.postgres-vector -t legal-ai-postgres-vector:latest .

if errorlevel 1 (
    echo ❌ Failed to build PostgreSQL Vector service
    pause
    exit /b 1
)

echo.
echo 🚀 Starting TensorRT production services...

REM Start all services using docker-compose
docker-compose -f docker-compose.tensorrt-production.yml up -d

if errorlevel 1 (
    echo ❌ Failed to start services
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to become healthy...
timeout /t 10 >nul

echo.
echo 🏥 Checking service health...

REM Check TensorRT service
curl -s http://localhost:8100/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️ TensorRT service health check failed (still starting up?)
) else (
    echo ✅ TensorRT service is healthy
)

REM Check WebAssembly service
curl -s http://localhost:8102/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️ WebAssembly service health check failed (still starting up?)
) else (
    echo ✅ WebAssembly service is healthy
)

REM Check PostgreSQL Vector service
curl -s http://localhost:8103/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️ PostgreSQL Vector service health check failed (still starting up?)
) else (
    echo ✅ PostgreSQL Vector service is healthy
)

echo.
echo 🎉 TensorRT Legal AI Production Environment Started!
echo ===================================================
echo.
echo 📊 Service URLs:
echo    🔥 TensorRT GPU Service:     http://localhost:8098 (XState)
echo    ⚡ TensorRT Model API:       http://localhost:8099
echo    🏥 TensorRT Health:          http://localhost:8100/health
echo.
echo    🔧 WebAssembly llama.cpp:    http://localhost:8101
echo    🏥 WebAssembly Health:       http://localhost:8102/health
echo.
echo    🗄️ PostgreSQL Vector API:    http://localhost:8103
echo.
echo 🧪 Test Commands:
echo.
echo # Test TensorRT inference:
echo curl -X POST http://localhost:8099/api/inference \
echo   -H "Content-Type: application/json" \
echo   -d "{\"prompt\":\"Legal contract analysis\",\"model\":\"gemma3-legal:latest\"}"
echo.
echo # Test WebAssembly inference:
echo curl -X POST http://localhost:8101/api/inference \
echo   -H "Content-Type: application/json" \
echo   -d "{\"prompt\":\"Contract review\",\"model\":\"gemma3:270m\"}"
echo.
echo # Test vector search:
echo curl -X POST http://localhost:8103/api/search/legal-similarity \
echo   -H "Content-Type: application/json" \
echo   -d "{\"query\":\"contract dispute\",\"limit\":5}"
echo.
echo 📈 Integration Architecture:
echo    • TensorRT ↔️ gemma3-legal:latest (GPU acceleration)
echo    • WebAssembly ↔️ gemma3:270m (client-side fallback)
echo    • PostgreSQL ↔️ pgvector (vector storage)
echo    • Redis ↔️ caching layer
echo    • Drizzle-ORM ↔️ database abstraction
echo.
echo 💡 All services integrate with your existing containers safely!
echo    Your current legal-ai-* containers continue running normally.
echo.
echo Press any key to view real-time logs or Ctrl+C to exit...
pause >nul

echo.
echo 📊 Real-time service logs:
docker-compose -f docker-compose.tensorrt-production.yml logs -f