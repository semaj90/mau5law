@echo off
echo 🚀 Setting up Legal AI GPU Development Environment
echo.

rem Set optimal CUDA environment variables for RTX 3060 Ti
set CUDA_VISIBLE_DEVICES=0
set RTX_3060_OPTIMIZATION=true
set ENABLE_GPU=true
set OLLAMA_GPU_LAYERS=35
set OLLAMA_URL=http://localhost:11434

rem Set additional optimization flags
set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128
set CUDA_LAUNCH_BLOCKING=0
set NVIDIA_VISIBLE_DEVICES=0

echo ✅ Environment configured:
echo   CUDA_VISIBLE_DEVICES=%CUDA_VISIBLE_DEVICES%
echo   RTX_3060_OPTIMIZATION=%RTX_3060_OPTIMIZATION%
echo   ENABLE_GPU=%ENABLE_GPU%
echo   OLLAMA_GPU_LAYERS=%OLLAMA_GPU_LAYERS%
echo   OLLAMA_URL=%OLLAMA_URL%
echo.

echo 🎮 Starting RTX 3060 Ti GPU Monitor...
cd sveltekit-frontend
node scripts/gpu-monitor.mjs

pause