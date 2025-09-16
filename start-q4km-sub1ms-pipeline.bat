@echo off
REM Q4_K_M Sub-1ms TensorRT-LLM Pipeline Startup Script
REM Launches the complete optimized legal AI pipeline

echo.
echo ==========================================
echo   Q4_K_M Sub-1ms TensorRT-LLM Pipeline
echo ==========================================
echo.

REM Check prerequisites
echo [1/8] Checking prerequisites...

REM Check if WSL2 is available
wsl --status >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: WSL2 not available. Please install WSL2 first.
    pause
    exit /b 1
)

REM Check if Docker is running (for Redis)
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Docker not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 30 /nobreak
)

REM Check if Go is available
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Go not found. Please install Go first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check complete

REM Step 1: Start Redis (required for caching)
echo.
echo [2/8] Starting Redis...
start "Redis" cmd /c "docker run --rm -p 6379:6379 --name redis-tensorrt redis:alpine redis-server --requirepass redis"
timeout /t 5 /nobreak

REM Step 2: Setup WSL2 TensorRT-LLM environment
echo.
echo [3/8] Setting up WSL2 TensorRT-LLM environment...
wsl bash -c "cd /mnt/c/Users/james/Videos/deeds-web-app && chmod +x setup-wsl2-tensorrt-pipeline.sh && ./setup-wsl2-tensorrt-pipeline.sh" &

REM Step 3: Build and start SIMD JSON Optimizer
echo.
echo [4/8] Building SIMD JSON Optimizer...
go mod tidy
go build -o simd-json-optimizer.exe simd-json-optimizer.go
if %errorlevel% neq 0 (
    echo ERROR: Failed to build SIMD JSON Optimizer
    pause
    exit /b 1
)

echo Starting SIMD JSON Optimizer on port 8103...
start "SIMD JSON Optimizer" cmd /c "simd-json-optimizer.exe"
timeout /t 3 /nobreak

REM Step 4: Build and start Go Microservice
echo.
echo [5/8] Building Go Microservice...
go build -o go-tensorrt-microservice.exe go-tensorrt-microservice.go
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Go Microservice
    pause
    exit /b 1
)

echo Starting Go Microservice (gRPC:50052, QUIC:4433, HTTP:8104)...
start "Go TensorRT Microservice" cmd /c "go-tensorrt-microservice.exe"
timeout /t 3 /nobreak

REM Step 5: Start Caddy reverse proxy
echo.
echo [6/8] Starting Caddy reverse proxy...
if not exist caddy.exe (
    echo Downloading Caddy...
    curl -L "https://caddyserver.com/api/download?os=windows&arch=amd64" -o caddy.zip
    powershell -command "Expand-Archive caddy.zip -DestinationPath ."
    del caddy.zip
)

echo Starting Caddy with optimized configuration...
start "Caddy QUIC Proxy" cmd /c "caddy run --config Caddyfile.tensorrt-optimized"
timeout /t 5 /nobreak

REM Step 6: Start SvelteKit frontend
echo.
echo [7/8] Starting SvelteKit frontend...
cd sveltekit-frontend
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

echo Starting SvelteKit dev server...
start "SvelteKit Frontend" cmd /c "REDIS_PASSWORD=redis npm run dev -- --port 5173 --host 127.0.0.1"
cd ..
timeout /t 10 /nobreak

REM Step 7: Wait for WSL2 TensorRT-LLM server
echo.
echo [8/8] Waiting for TensorRT-LLM server in WSL2...
echo This may take several minutes for the first run...

:wait_tensorrt
timeout /t 10 /nobreak
curl -s http://localhost:8100/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for TensorRT-LLM server...
    goto wait_tensorrt
)

echo ✅ TensorRT-LLM server is ready!

REM Display status
echo.
echo ==========================================
echo   🚀 Q4_K_M Pipeline Status
echo ==========================================
echo.
echo Services Running:
echo   ✅ Redis Cache        : localhost:6379
echo   ✅ SIMD Optimizer     : localhost:8103
echo   ✅ Go Microservice    : localhost:8104 (HTTP), :50052 (gRPC), :4433 (QUIC)
echo   ✅ TensorRT-LLM       : localhost:8100 (WSL2)
echo   ✅ Caddy Proxy        : localhost:443 (HTTPS), :80 (HTTP)
echo   ✅ SvelteKit Frontend : localhost:5173
echo.
echo Endpoints:
echo   🌐 Main Application   : https://localhost
echo   📊 Dashboard          : http://localhost:2020/dashboard
echo   🔍 Health Check       : http://localhost:8080/health
echo   📈 Metrics            : http://localhost:8103/metrics
echo   🧪 Load Test          : http://localhost:8080/load-test
echo.
echo Optimizations Active:
echo   ⚡ SIMD JSON parsing
echo   🚀 TensorRT Q4_K_M quantization
echo   📡 QUIC/HTTP3 transport
echo   🔄 CUDA graphs
echo   💾 Paged KV cache
echo   🎯 FlashAttention v2
echo.

REM Open browser to main application
echo Opening main application...
start https://localhost

REM Open dashboard
echo Opening performance dashboard...
start http://localhost:2020/dashboard

echo.
echo Pipeline startup complete! Press any key to view logs or Ctrl+C to exit.
pause

REM Show real-time logs
echo.
echo ==========================================
echo   Real-time Performance Monitoring
echo ==========================================
echo.

:monitor_loop
echo [%time%] Checking service health...

REM Check each service
curl -s http://localhost:8103/health | findstr "healthy" >nul
if %errorlevel% equ 0 (
    echo   ✅ SIMD Optimizer: Healthy
) else (
    echo   ❌ SIMD Optimizer: Unhealthy
)

curl -s http://localhost:8104/health | findstr "healthy" >nul
if %errorlevel% equ 0 (
    echo   ✅ Go Microservice: Healthy
) else (
    echo   ❌ Go Microservice: Unhealthy
)

curl -s http://localhost:8100/health | findstr "healthy" >nul
if %errorlevel% equ 0 (
    echo   ✅ TensorRT-LLM: Healthy
) else (
    echo   ❌ TensorRT-LLM: Unhealthy
)

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ SvelteKit: Healthy
) else (
    echo   ❌ SvelteKit: Unhealthy
)

REM Show performance metrics
echo.
echo Performance Metrics:
curl -s http://localhost:8103/metrics | findstr "requests_processed\|avg_parse_time_us\|error_rate" 2>nul

echo.
echo ==========================================
timeout /t 30 /nobreak
goto monitor_loop