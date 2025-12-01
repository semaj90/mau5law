@echo off
echo ========================================
echo SIMD JSON Accelerator Port Test
echo ========================================
echo.

echo [1/5] Checking if port 8096 is available...
netstat -ano | findstr :8096 >nul
if %errorlevel% equ 0 (
    echo ❌ Port 8096 is already in use
    netstat -ano | findstr :8096
    echo.
    echo To fix: taskkill /PID [process_id] /F
    goto :end
) else (
    echo ✅ Port 8096 is available
)
echo.

echo [2/5] Checking if SIMD executable exists...
if exist "go-services\simd-json-accelerator\simd-json-accelerator.exe" (
    echo ✅ SIMD executable found
) else (
    echo ❌ SIMD executable not found
    echo Expected location: go-services\simd-json-accelerator\simd-json-accelerator.exe
    goto :end
)
echo.

echo [3/5] Checking startup script...
if exist "sveltekit-frontend\scripts\start-simd-service.bat" (
    echo ✅ Startup script found
) else (
    echo ❌ Startup script not found
    goto :end
)
echo.

echo [4/5] Checking environment config...
if exist "sveltekit-frontend\.env.simd" (
    echo ✅ Environment config found
    type "sveltekit-frontend\.env.simd"
) else (
    echo ❌ Environment config not found
    goto :end
)
echo.

echo [5/5] Checking MCP configurations...
if exist ".kiro\settings\mcp.json" (
    echo ✅ MCP config found
) else (
    echo ⚠️  MCP config not found (optional)
)

if exist "mcp-multicore-config.json" (
    echo ✅ Multi-core config found
) else (
    echo ⚠️  Multi-core config not found (optional)
)
echo.

echo ========================================
echo ✅ All checks passed!
echo ========================================
echo.
echo To start the SIMD service:
echo   cd sveltekit-frontend
echo   npm run simd:exe:start
echo.
echo To verify it's running:
echo   curl http://localhost:8096/health
echo.
echo To start with dev:quic:
echo   cd sveltekit-frontend
echo   npm run dev:quic
echo.

:end
pause
