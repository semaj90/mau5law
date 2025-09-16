@echo off
echo 🚀 FlashAttention Docker Build Script
echo =====================================

echo ✅ Checking Docker and NVIDIA runtime...
docker --version
nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader,nounits

echo.
echo 🔧 Building FlashAttention Docker container...
echo This will take 15-30 minutes depending on your system

docker build -f Dockerfile.flashattention -t legal-ai-flashattention:latest . --progress=plain

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker build failed
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.
echo 🎯 To run the container:
echo docker run --gpus all -p 8097:8097 -p 8098:8098 -p 8099:8099 legal-ai-flashattention:latest
echo.
echo 🎮 To run interactively:
echo docker run --gpus all -it legal-ai-flashattention:latest /bin/bash
echo.

pause