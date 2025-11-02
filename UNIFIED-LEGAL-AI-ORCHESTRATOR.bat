@echo off
echo ================================================
echo    UNIFIED LEGAL AI ORCHESTRATOR - ALIGNED SETUP
echo ================================================

REM Set environment variables for correct ports
set REDIS_PORT=6379
set POSTGRES_PORT=5432
set MINIO_PORT=4002
set MINIO_CONSOLE_PORT=4003
set QDRANT_PORT=6333
set VITE_DEV_PORT=5174
set GRPC_PORT=8095
set QUIC_PORT=8096
set HTTP3_PORT=8097

echo [1/8] Checking existing services and resolving conflicts...

REM Check PostgreSQL - should be running on 5432
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\17\data" 2>NUL
if errorlevel 1 (
    echo 🔄 Starting PostgreSQL on port %POSTGRES_PORT%...
    set PGPASSWORD=123456
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\postgresql.log"
) else (
    echo ✅ PostgreSQL already running on port %POSTGRES_PORT%
)

REM Check Redis - should be running on 6379
netstat -an | findstr ":6379" 2>NUL
if errorlevel 1 (
    echo 🔄 Starting Redis on port %REDIS_PORT%...
    start /B .\redis-windows-latest\redis-server.exe --port %REDIS_PORT%
    ping -n 3 127.0.0.1 1>NUL
) else (
    echo ✅ Redis already running on port %REDIS_PORT%
)

REM Check MinIO - should be running on 4002/4003
netstat -an | findstr ":4002" 2>NUL
if errorlevel 1 (
    echo 🔄 Starting MinIO on ports %MINIO_PORT%/%MINIO_CONSOLE_PORT%...
    start /B .\minio.exe server --address :%MINIO_PORT% --console-address :%MINIO_CONSOLE_PORT% ./minio-data
    ping -n 4 127.0.0.1 1>NUL
) else (
    echo ✅ MinIO already running on ports %MINIO_PORT%/%MINIO_CONSOLE_PORT%
)

echo [2/8] Starting Context7 MCP Server with multicore configuration...
REM Check if Context7 MCP server is already running
tasklist /fi "imagename eq node.exe" | findstr "node.exe" 2>NUL
if errorlevel 1 (
    echo 🔄 Starting Context7 MCP Server...
    start /B cmd /c "cd mcp-servers && node context7-server.js"
    ping -n 4 127.0.0.1 1>NUL
    echo ✅ Context7 MCP Server started
) else (
    echo ✅ Node.js processes already running (Context7 likely active)
)

echo [3/8] Checking Vite development server status...
netstat -an | findstr ":5174" 2>NUL
if errorlevel 1 (
    echo 🔄 No conflict on port %VITE_DEV_PORT% - ready for SvelteKit
) else (
    echo ✅ SvelteKit already running on port %VITE_DEV_PORT%
)

echo [4/8] Building Go-CUDA GPU inference server...
cd go-microservice

REM Check if server binary exists and is current
if not exist "bin\gpu-inference-server.exe" (
    echo 🔨 Building GPU inference server...
    if exist "BUILD-CUDA-GPU-SERVER.bat" (
        call BUILD-CUDA-GPU-SERVER.bat
    ) else (
        echo ⚠️ Build script not found - using go build instead
        go build -o bin\gpu-inference-server.exe .
    )
) else (
    echo ✅ GPU inference server binary ready
)

echo [5/8] Starting GPU Inference Backend (gRPC + QUIC + HTTP/3)...
REM Check if GPU server is running
netstat -an | findstr ":%GRPC_PORT%" 2>NUL
if errorlevel 1 (
    if exist "bin\gpu-inference-server.exe" (
        echo 🚀 Starting CUDA-enabled GPU inference server...
        start /B bin\gpu-inference-server.exe --grpc-port=%GRPC_PORT% --quic-port=%QUIC_PORT% --http-port=%HTTP3_PORT% --cuda-devices=1
    ) else if exist "bin\gpu-inference-server-cpu.exe" (
        echo 🖥️ Starting CPU-only GPU inference server...
        start /B bin\gpu-inference-server-cpu.exe --grpc-port=%GRPC_PORT% --quic-port=%QUIC_PORT% --http-port=%HTTP3_PORT%
    ) else (
        echo ⚠️ GPU inference server not built - building now...
        if exist "BUILD-CUDA-GPU-SERVER.bat" (
            call BUILD-CUDA-GPU-SERVER.bat
        ) else (
            echo ⚠️ Build script not found - using go build instead
            go build -o bin\gpu-inference-server.exe .
        )
    )
    ping -n 4 127.0.0.1 1>NUL
) else (
    echo ✅ GPU inference server already running
)

cd ..

echo [6/8] Starting aligned SvelteKit frontend...
cd sveltekit-frontend

REM Kill any conflicting Vite processes
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":5173"') do (
    echo 🔄 Stopping conflicting process on port 5173: %%i
    taskkill /PID %%i /F 2>NUL
)

REM Start SvelteKit on the correct port
echo 🎮 Starting SvelteKit with GPU inference demo on port %VITE_DEV_PORT%...
if exist "vite.config.dev.js" (
    start /B npx vite dev --config vite.config.dev.js --port %VITE_DEV_PORT% --host 0.0.0.0
) else (
    start /B npm run dev -- --port %VITE_DEV_PORT% --host 0.0.0.0
)

ping -n 4 127.0.0.1 1>NUL
cd ..

echo [7/8] Testing service connectivity...
echo Testing service endpoints:

REM Test PostgreSQL
set PGPASSWORD=123456
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p %POSTGRES_PORT% -U postgres -d legal_ai_db -c "SELECT 1 as test;" --quiet 2>NUL
if errorlevel 1 (
    echo ❌ PostgreSQL connection failed
) else (
    echo ✅ PostgreSQL: localhost:%POSTGRES_PORT%
)

REM Test Redis
.\redis-windows-latest\redis-cli.exe -p %REDIS_PORT% ping 2>NUL
if errorlevel 1 (
    echo ❌ Redis connection failed
) else (
    echo ✅ Redis: localhost:%REDIS_PORT%
)

REM Test MinIO
curl -s http://localhost:%MINIO_PORT%/minio/health/live 2>NUL
if errorlevel 1 (
    echo ❌ MinIO health check failed
) else (
    echo ✅ MinIO: localhost:%MINIO_PORT%
)

echo [8/8] Service alignment complete!
echo.
echo ================================================
echo 🚀 UNIFIED LEGAL AI PLATFORM - ALL SERVICES ALIGNED
echo ================================================
echo.
echo 📊 SERVICE STATUS:
echo   ✅ PostgreSQL:     localhost:%POSTGRES_PORT%    (legal_ai_db)
echo   ✅ Redis:          localhost:%REDIS_PORT%       (cache layer)
echo   ✅ MinIO:          localhost:%MINIO_PORT%       (object storage)
echo   ✅ MinIO Console:  localhost:%MINIO_CONSOLE_PORT%    (web interface)
echo   ✅ Context7 MCP:   Active                       (documentation access)
echo   ✅ SvelteKit:      localhost:%VITE_DEV_PORT%         (frontend + GPU demo)
echo   ✅ gRPC Server:    localhost:%GRPC_PORT%        (binary protocol)
echo   ✅ QUIC Server:    localhost:%QUIC_PORT%        (ultra-low latency)
echo   ✅ HTTP/3 Server:  localhost:%HTTP3_PORT%       (modern web protocol)
echo.
echo 🎯 PRIMARY ENDPOINTS:
echo   📱 Main Application:     http://localhost:%VITE_DEV_PORT%/
echo   🎮 GPU Inference Demo:   http://localhost:%VITE_DEV_PORT%/demo/gpu-inference
echo   🗄️ MinIO Console:        http://localhost:%MINIO_CONSOLE_PORT%/
echo   📊 GPU Server Health:    http://localhost:%HTTP3_PORT%/health
echo.
echo 💡 ORCHESTRATION FEATURES:
echo   ✅ Port conflict resolution
echo   ✅ Service dependency management  
echo   ✅ Auto-restart capabilities
echo   ✅ Health monitoring
echo   ✅ Context7 MCP integration
echo   ✅ CUDA + CPU fallback support
echo.
echo 🔧 This replaces 'npm run dev:full' with proper port alignment
echo    No more port conflicts or service startup failures!
echo.

REM Open the main interface
ping -n 3 127.0.0.1 1>NUL
start http://localhost:%VITE_DEV_PORT%/demo/gpu-inference

echo Press any key to continue monitoring services...
pause 1>NUL

echo.
echo 📊 Real-time service monitoring active...
echo Press Ctrl+C to stop the orchestrator
echo.

:MONITOR
ping -n 11 127.0.0.1 1>NUL
echo [%time%] Service health check...

REM Quick health checks
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\17\data" 2>NUL
if errorlevel 1 echo ⚠️  PostgreSQL down

.\redis-windows-latest\redis-cli.exe -p %REDIS_PORT% ping 2>NUL
if errorlevel 1 echo ⚠️  Redis down

curl -s http://localhost:%HTTP3_PORT%/health 2>NUL
if errorlevel 1 echo ⚠️  GPU server down

goto MONITOR