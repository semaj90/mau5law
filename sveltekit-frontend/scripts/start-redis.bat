@echo off
REM Start Redis Server on Port 4005 for Phase 72 KAG
REM Location: C:\Users\james\Videos\deeds-web-app\redis-latest\redis-server.exe

echo Starting Redis Server on port 4005...
cd /d "%~dp0.."
start /B redis-latest\redis-server.exe --port 4005

timeout /t 2 /nobreak > nul

REM Test connection
redis-latest\redis-cli.exe -p 4005 PING > nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Redis started successfully on port 4005
    redis-latest\redis-cli.exe -p 4005 INFO server | findstr redis_version
) else (
    echo ❌ Redis failed to start
    exit /b 1
)
