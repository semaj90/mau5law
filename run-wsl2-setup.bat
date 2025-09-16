@echo off
REM Complete WSL2 TensorRT-LLM Setup for Gemma3-Legal Q4_K_M Pipeline

echo 🚀 Starting WSL2 TensorRT-LLM Setup for Gemma3-Legal
echo ==================================================

REM Check if WSL2 is available
wsl --list --quiet | findstr Ubuntu >nul
if errorlevel 1 (
    echo ❌ WSL2 Ubuntu not found
    echo Please install WSL2 Ubuntu first
    pause
    exit /b 1
)

echo ✅ WSL2 Ubuntu detected

REM Make scripts executable and run in WSL2
wsl chmod +x /mnt/c/Users/james/Videos/deeds-web-app/wsl2-tensorrt-complete.sh
wsl chmod +x /mnt/c/Users/james/Videos/deeds-web-app/wsl2-final-setup.sh

echo 📦 Step 1: Installing dependencies and TensorRT-LLM...
wsl bash -c "cd /mnt/c/Users/james/Videos/deeds-web-app && ./wsl2-tensorrt-complete.sh"

if errorlevel 1 (
    echo ❌ Step 1 failed
    pause
    exit /b 1
)

echo ✅ Step 1 complete

echo 🎯 Step 2: Setting up server and scripts...
wsl bash -c "cd /mnt/c/Users/james/Videos/deeds-web-app && ./wsl2-final-setup.sh"

if errorlevel 1 (
    echo ❌ Step 2 failed
    pause
    exit /b 1
)

echo ✅ Step 2 complete

echo 🎉 WSL2 TensorRT-LLM setup complete!
echo.
echo 📋 Next steps:
echo    1. Open WSL2 terminal: wsl
echo    2. Navigate to workspace: cd ~/tensorrt_workspace
echo    3. Start server: ./start_server.sh
echo    4. Test performance: python3 test_performance.py
echo.
echo 🌐 Server will be available at: http://localhost:8100
echo 📊 Metrics: http://localhost:8100/metrics
echo 🔍 Health: http://localhost:8100/health
echo.
pause