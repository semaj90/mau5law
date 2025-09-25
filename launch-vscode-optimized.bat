@echo off
echo ========================================
echo   🚀 LAUNCHING GPU-ACCELERATED VS CODE
echo     with Context7 Multi-Core Processing
echo ========================================

:: Set GPU and Multi-Core Environment Variables
set NODE_OPTIONS=--max-old-space-size=28672
set ELECTRON_DISABLE_GPU_SANDBOX=1
set ELECTRON_ENABLE_GPU_RASTERIZATION=1
set ELECTRON_ENABLE_STACK_DUMPING=1
set CHROME_ENABLE_GPU_RASTERIZATION=1
set CONTEXT7_GPU_ENABLED=true
set CONTEXT7_MULTICORE=true
set ZX_CONCURRENCY=16
set WEB_WORKERS_MAX=8
set SERVICE_WORKERS_MAX=4

:: Set Process Priority to High
wmic process where name="Code.exe" CALL setpriority "high priority" 2>nul

:: Start MCP Context7 Multi-Core Server
echo 🔧 Starting MCP Context7 Multi-Core Server...
cd sveltekit-frontend
start /B "MCP-Server" cmd /c "set MCP_PORT=3002 && node scripts/mcp-multicore-server.mjs"
timeout /t 2 /nobreak >nul 2>&1

:: Copy Optimized Settings
echo 📝 Activating GPU-accelerated VS Code settings...
copy ".vscode\settings.optimized.json" ".vscode\settings.json" /Y >nul
echo ✅ Optimized settings activated

:: Launch VS Code with GPU Acceleration
echo 🖥️  Launching VS Code with GPU acceleration...
echo    - GPU Rendering: ENABLED
echo    - Multi-Core TypeScript: 28GB Memory
echo    - Web Workers: 8 concurrent instances
echo    - Service Workers: 4 concurrent instances
echo    - ZX Concurrency: 16 parallel tasks
echo    - Prettier: ENABLED with multi-core processing
echo    - MCP Context7 Server: RUNNING on port 3002
echo.

"%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd" . --disable-gpu-sandbox --enable-gpu-rasterization --max_old_space_size=28672 --enable-features=VaapiVideoDecoder --enable-accelerated-2d-canvas --enable-accelerated-mjpeg-decode

echo.
echo 🎯 VS Code launched with optimizations!
echo 📊 Monitor performance in Task Manager
echo 🔧 MCP server running on localhost:3002
pause