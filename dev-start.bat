@echo off
REM Legal AI Development Environment Startup Script for Windows
REM Integrates with existing LLM orchestrator and adds Go hot-reload

setlocal enabledelayedexpansion

echo 🚀 Starting Legal AI Development Environment...
echo ==================================================

REM Check prerequisites
echo 🔍 Checking prerequisites...

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    pause
    exit /b 1
)

where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed or not in PATH
    pause
    exit /b 1
)

where go >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go is not installed or not in PATH
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js/npm is not installed or not in PATH
    pause
    exit /b 1
)

REM Install Air if not present
where air >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Air for Go hot reload...
    go install github.com/cosmtrek/air@latest
)

echo ✅ All prerequisites satisfied

REM Create tmp directory
if not exist tmp mkdir tmp

REM Step 1: Start backend infrastructure
echo.
echo 📦 Starting backend infrastructure...

REM Stop any existing containers
docker-compose -f docker-compose.dev.yml down --remove-orphans >nul 2>&1

REM Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d postgres redis minio qdrant

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo ✅ Infrastructure services started

REM Step 2: Start Go services with hot reload
echo.
echo 🐹 Starting Go microservices with hot reload...

REM Start Legal Gateway
echo    Starting Legal Gateway (port 8080)...
start /b "Legal Gateway" cmd /c "air -c .air.toml > tmp\legal-gateway.log 2>&1"

REM Start Enhanced RAG Service
echo    Starting Enhanced RAG Service (port 8094)...
start /b "Enhanced RAG" cmd /c "air -c .air-rag.toml > tmp\enhanced-rag.log 2>&1"

REM Start GPU Orchestrator
echo    Starting GPU Orchestrator (port 8095)...
start /b "GPU Orchestrator" cmd /c "air -c .air-gpu.toml > tmp\gpu-orchestrator.log 2>&1"

REM Give Go services time to start
echo ⏳ Waiting for Go services to initialize...
timeout /t 10 /nobreak >nul

REM Step 3: Start MCP Multi-core server
echo.
echo 🔄 Starting MCP Multi-core server...
cd sveltekit-frontend

if exist "scripts\mcp-multicore-server.mjs" (
    echo    Starting MCP server (port 3002)...
    start /b "MCP Server" cmd /c "set MCP_PORT=3002 && node scripts\mcp-multicore-server.mjs > ..\tmp\mcp-multicore.log 2>&1"
) else (
    echo ⚠️ MCP server script not found, skipping
)

REM Step 4: Start SvelteKit with LLM orchestrator
echo.
echo ⚡ Starting SvelteKit with LLM orchestrator...

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing npm dependencies...
    npm install
)

REM Start SvelteKit dev server
echo    Starting SvelteKit dev server (port 5173)...

REM Check if dev:full script exists and start accordingly
npm run --silent dev:full --dry-run >nul 2>&1
if %errorlevel% equ 0 (
    start /b "SvelteKit" cmd /c "npm run dev:full > ..\tmp\sveltekit.log 2>&1"
) else (
    echo ⚠️ dev:full script not found, using regular dev
    start /b "SvelteKit" cmd /c "npm run dev > ..\tmp\sveltekit.log 2>&1"
)

cd ..

REM Step 5: Wait for services to be ready
echo.
echo ⏳ Waiting for all services to be ready...
timeout /t 20 /nobreak >nul

REM Step 6: Display status and usage information
echo.
echo 🎉 Legal AI Development Environment Started!
echo ==================================================
echo 📊 Service Status:
echo    🌐 Frontend (SvelteKit): http://localhost:5173
echo    🔧 Legal Gateway API: http://localhost:8080
echo    🤖 Enhanced RAG API: http://localhost:8094
echo    🖥️  GPU Orchestrator: http://localhost:8095
echo    🔄 MCP Multi-core: http://localhost:3002
echo    🗄️  PostgreSQL: localhost:5433
echo    🔴 Redis: localhost:6379
echo    📦 MinIO: http://localhost:9001
echo.
echo 🧠 LLM Orchestrator Features:
echo    • Smart routing between server/client/MCP orchestrators
echo    • Automatic fallback handling
echo    • Legal domain detection
echo    • Performance monitoring
echo.
echo 🧪 Testing ^& Development:
echo    • Test integration: curl http://localhost:5173/api/ai/test-orchestrator
echo    • Chat API: curl -X POST http://localhost:5173/api/ai/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
echo    • Load testing: cd load-tester ^&^& go run . -ramp -rampStart 1 -rampMax 10
echo.
echo 📝 Log Files:
echo    • Legal Gateway: tmp\legal-gateway.log
echo    • Enhanced RAG: tmp\enhanced-rag.log
echo    • GPU Orchestrator: tmp\gpu-orchestrator.log
echo    • SvelteKit: tmp\sveltekit.log
echo    • MCP Server: tmp\mcp-multicore.log
echo.
echo 🔧 Hot Reload Active:
echo    • Go services will auto-rebuild on code changes
echo    • SvelteKit will auto-reload on frontend changes
echo    • Database schema changes require manual migration
echo.
echo 🛑 To stop all services:
echo    .\dev-stop.bat
echo.
echo 🚀 Ready for development! Open http://localhost:5173
echo.

REM Open browser to the frontend
echo 🌐 Opening browser...
start http://localhost:5173

echo 📡 Development environment is running...
echo Press Ctrl+C to stop monitoring (services will continue running)
echo.

REM Simple monitoring loop
:monitor
timeout /t 30 /nobreak >nul
REM Add health checks here if needed
goto monitor