@echo off
REM Quick launcher for AI components
REM Created: 2025-11-30

echo ========================================
echo YoRHa Detective System - AI Components
echo ========================================
echo.

:menu
echo Select a task:
echo.
echo [1] Start Gemma3-Legal MCP Server
echo [2] Start Go SIMD JSON Optimizer
echo [3] Start All AI Services
echo [4] Test MCP Server
echo [5] Test Python SIMD JSON
echo [6] Test Feature Extractor
echo [7] Run All Tests
echo [8] Build Go SIMD Optimizer
echo [9] Exit
echo.

set /p choice="Enter choice (1-9): "

if "%choice%"=="1" goto start_mcp
if "%choice%"=="2" goto start_go_simd
if "%choice%"=="3" goto start_all
if "%choice%"=="4" goto test_mcp
if "%choice%"=="5" goto test_simd
if "%choice%"=="6" goto test_feature
if "%choice%"=="7" goto test_all
if "%choice%"=="8" goto build_go
if "%choice%"=="9" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:start_mcp
echo.
echo Starting Gemma3-Legal MCP Server...
echo.
python mcp-servers\gemma3-legal-agentic-mcp.py
goto menu

:start_go_simd
echo.
echo Starting Go SIMD JSON Optimizer...
echo.
cd archived-services\root-level
if not exist simd-json-optimizer.exe (
    echo Building first...
    go build -o simd-json-optimizer.exe simd-json-optimizer.go
)
simd-json-optimizer.exe
cd ..\..
goto menu

:start_all
echo.
echo Starting all AI services...
echo.
start "Gemma3-Legal MCP" cmd /k python mcp-servers\gemma3-legal-agentic-mcp.py
timeout /t 2 >nul
start "Go SIMD Optimizer" cmd /k "cd archived-services\root-level && simd-json-optimizer.exe"
echo.
echo ✅ All services started in separate windows!
echo.
pause
goto menu

:test_mcp
echo.
echo Testing Gemma3-Legal MCP Server...
echo.
python mcp-servers\test_gemma_legal_mcp.py
echo.
pause
goto menu

:test_simd
echo.
echo Testing Python SIMD JSON (orjson)...
echo.
python backend\utils\fast_json.py
echo.
pause
goto menu

:test_feature
echo.
echo Testing Multi-Modal Feature Extractor...
echo.
python backend\ml\multimodal_feature_extractor.py
echo.
pause
goto menu

:test_all
echo.
echo Running all tests...
echo.
echo [1/3] Testing MCP Server...
python mcp-servers\test_gemma_legal_mcp.py
echo.
echo [2/3] Testing Python SIMD JSON...
python backend\utils\fast_json.py
echo.
echo [3/3] Testing Feature Extractor...
python backend\ml\multimodal_feature_extractor.py
echo.
echo ✅ All tests complete!
echo.
pause
goto menu

:build_go
echo.
echo Building Go SIMD JSON Optimizer...
echo.
cd archived-services\root-level
go build -o simd-json-optimizer.exe simd-json-optimizer.go
if errorlevel 1 (
    echo.
    echo ❌ Build failed!
    echo.
) else (
    echo.
    echo ✅ Build successful!
    echo.
)
cd ..\..
pause
goto menu

:end
echo.
echo Goodbye!
exit /b 0
