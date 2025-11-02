@echo off
echo Starting Vite + Caddy with QUIC/HTTP3 support...
echo.

REM Kill any existing processes on these ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do taskkill /PID %%a /F >nul 2>&1

REM Start Vite dev server on port 5174
echo Starting Vite dev server on port 5174...
start "Vite Dev Server" /MIN cmd /c "vite dev"

REM Wait a moment for Vite to start
timeout /t 5 /nobreak >nul

REM Start Caddy proxy on port 5173 with QUIC
echo Starting Caddy proxy with QUIC on port 5173...
start "Caddy QUIC Proxy" cmd /c "caddy.exe run --config Caddyfile"

echo.
echo ===================================
echo  Development server starting...
echo ===================================
echo  HTTP/HTTPS: http://localhost:5173
echo  QUIC/HTTP3: https://localhost:5173
echo  Vite HMR:   http://localhost:5174
echo ===================================
echo.
echo Press any key to stop all servers...
pause >nul

echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do taskkill /PID %%a /F >nul 2>&1

echo All servers stopped.