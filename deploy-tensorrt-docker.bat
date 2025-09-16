@echo off
REM TensorRT-LLM Docker Deployment Script
REM Complete Q4_K_M pipeline with Ollama integration

echo === TensorRT-LLM Docker Deployment ===
echo Building and deploying Gemma3-Legal Q4_K_M pipeline
echo.

REM Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found or not running
    echo Please install Docker Desktop and ensure it's running
    pause
    exit /b 1
)

echo [OK] Docker detected

REM Check if NVIDIA Docker support is available
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [WARNING] NVIDIA Docker support not detected
    echo Container will run in CPU mode
) else (
    echo [OK] NVIDIA Docker support available
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama not detected on localhost:11434
    echo Container will start in mock mode
) else (
    echo [OK] Ollama detected and accessible
)

REM Create workspace directory
if not exist tensorrt_workspace mkdir tensorrt_workspace
if not exist logs mkdir logs

echo.
echo === Building TensorRT-LLM Container ===

REM Build the Docker image
docker build -f Dockerfile.tensorrt-llm -t tensorrt-llm-legal:latest .

if errorlevel 1 (
    echo [ERROR] Docker build failed
    pause
    exit /b 1
)

echo [OK] Docker image built successfully

echo.
echo === Deploying Container ===

REM Stop and remove existing container if it exists
docker stop tensorrt-llm-legal 2>nul
docker rm tensorrt-llm-legal 2>nul

REM Run the container
echo Starting TensorRT-LLM Legal AI container...

docker run -d ^
    --name tensorrt-llm-legal ^
    --gpus all ^
    -p 8100:8100 ^
    -e OLLAMA_HOST=host.docker.internal:11434 ^
    -e CUDA_VISIBLE_DEVICES=0 ^
    -v %cd%\tensorrt_workspace:/workspace/shared ^
    -v %cd%\logs:/workspace/logs ^
    --restart unless-stopped ^
    tensorrt-llm-legal:latest

if errorlevel 1 (
    echo [ERROR] Container failed to start
    echo Trying without GPU support...

    docker run -d ^
        --name tensorrt-llm-legal ^
        -p 8100:8100 ^
        -e OLLAMA_HOST=host.docker.internal:11434 ^
        -v %cd%\tensorrt_workspace:/workspace/shared ^
        -v %cd%\logs:/workspace/logs ^
        --restart unless-stopped ^
        tensorrt-llm-legal:latest
)

echo.
echo === Waiting for Container to Start ===

REM Wait for container to be healthy
for /l %%i in (1,1,30) do (
    timeout /t 2 >nul
    curl -s http://localhost:8100/health >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Container is healthy
        goto :container_ready
    )
    echo Waiting for container... %%i/30
)

echo [WARNING] Container health check timeout

:container_ready

echo.
echo === Deployment Summary ===

REM Show container status
docker ps --filter name=tensorrt-llm-legal --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo === Testing Container ===

REM Test health endpoint
echo Testing health endpoint...
curl -s http://localhost:8100/health | python -m json.tool 2>nul || echo Health check response received

echo.
echo === Deployment Complete ===
echo.
echo Container Status:
docker logs --tail 10 tensorrt-llm-legal
echo.
echo Available Endpoints:
echo   - Health Check: http://localhost:8100/health
echo   - API Docs:     http://localhost:8100/docs
echo   - Completions:  http://localhost:8100/v1/completions
echo   - Metrics:      http://localhost:8100/metrics
echo.
echo To stop container:   docker stop tensorrt-llm-legal
echo To view logs:        docker logs -f tensorrt-llm-legal
echo To restart:          docker restart tensorrt-llm-legal
echo.
pause