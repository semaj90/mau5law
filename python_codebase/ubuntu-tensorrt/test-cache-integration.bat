@echo off
REM TensorRT-LLM Cache Integration Test Script
REM Tests the updated installation with cache system
REM Date: 2025-09-19

echo 🧪 TensorRT-LLM Cache Integration Test
echo =====================================

echo.
echo 📋 Step 1: Testing PowerShell installation script...
echo Running Install-TensorRT-LLM-WSL-Fixed.ps1 in test mode...

REM Test the PowerShell script with skip flags to avoid reinstallation
powershell -ExecutionPolicy Bypass -File "Install-TensorRT-LLM-WSL-Fixed.ps1" -SkipSystemUpdate -SkipCUDAInstall

if %ERRORLEVEL% neq 0 (
    echo ❌ PowerShell installation test failed
    pause
    exit /b 1
)

echo ✅ PowerShell script test completed

echo.
echo 📋 Step 2: Testing WSL Ubuntu deployment...
echo Running deploy-tensorrt-wsl-ubuntu.sh...

wsl bash -c "cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt && ./deploy-tensorrt-wsl-ubuntu.sh"

if %ERRORLEVEL% neq 0 (
    echo ❌ WSL deployment test failed
    pause
    exit /b 1
)

echo ✅ WSL deployment test completed

echo.
echo 📋 Step 3: Testing cache system integration...

REM Test cache directory creation
wsl bash -c "test -d ~/trt_cache && echo '✅ Cache directory exists' || echo '❌ Cache directory missing'"

REM Test environment loading
wsl bash -c "source ~/trt_env/bin/activate && echo 'Cache enabled: $ENABLE_CACHE' && echo 'Cache dir: $PYTORCH_CACHE_DIR'"

REM Test Redis connection (if available)
wsl bash -c "redis-cli ping 2>/dev/null && echo '✅ Redis available' || echo '⚠️  Redis not available (using local cache)'"

REM Test Go microservice cache
if exist "..\go-microservice\pkg\cache\pytorch_cache.go" (
    echo ✅ Go cache microservice available
) else (
    echo ⚠️  Go cache microservice not found
)

echo.
echo 📋 Step 4: Testing TensorRT-LLM functionality...

REM Test TensorRT-LLM imports
wsl bash -c "source ~/trt_env/bin/activate && python -c 'import tensorrt_llm; print(\"✅ TensorRT-LLM:\", tensorrt_llm.__version__)'"

REM Test PyTorch GPU access
wsl bash -c "source ~/trt_env/bin/activate && python -c 'import torch; print(\"✅ PyTorch CUDA:\", torch.cuda.is_available())'"

REM Test cache performance
wsl bash -c "source ~/trt_env/bin/activate && test -f ~/trt_cache/cache_test.py && python ~/trt_cache/cache_test.py"

echo.
echo 📋 Step 5: Testing model path access...

REM Check if model exists
if exist "..\model_unsloth_hf_f16" (
    echo ✅ Gemma model found
    dir "..\model_unsloth_hf_f16" | find "File(s)"
) else (
    echo ⚠️  Gemma model not found at expected location
)

echo.
echo 📊 Cache Integration Test Results:
echo =====================================

REM Display cache status
wsl bash -c "test -f ~/trt_cache/deployment_status.json && cat ~/trt_cache/deployment_status.json | python -m json.tool || echo 'No deployment status found'"

echo.
echo 🎉 Cache integration test completed!
echo.
echo 📋 Next Steps:
echo    1. If all tests passed, your cache-enabled TensorRT-LLM is ready
echo    2. Use 'wsl' then 'source ~/trt_env/bin/activate' to start
echo    3. Model conversion: Use TENSORRT_ENGINE_CONVERSION_GUIDE.md
echo    4. Performance: Expect 2-10x faster inference with cache
echo.

pause