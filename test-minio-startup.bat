@echo off
REM Quick MinIO Test Script
REM Tests MinIO startup and basic functionality

echo =================================================================
echo   MinIO Quick Test and Setup
echo =================================================================
echo.

REM Download MinIO if not present
if not exist "minio.exe" (
    echo Downloading MinIO...
    powershell -Command "Invoke-WebRequest -Uri 'https://dl.min.io/server/minio/release/windows-amd64/minio.exe' -OutFile 'minio.exe' -UseBasicParsing"
    
    if exist "minio.exe" (
        echo ✅ MinIO downloaded successfully
    ) else (
        echo ❌ Failed to download MinIO
        pause
        exit /b 1
    )
) else (
    echo ✅ MinIO executable found
)

REM Create basic data directory
if not exist "minio-data" (
    mkdir "minio-data"
    echo ✅ Created minio-data directory
)

REM Set credentials
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin

REM Check if MinIO is already running
echo Checking if MinIO is running on port 9000...
netstat -an | find ":9000 " >nul
if %ERRORLEVEL% equ 0 (
    echo ✅ MinIO appears to be running on port 9000
    
    REM Test MinIO health
    echo Testing MinIO health endpoint...
    curl -s http://localhost:9000/minio/health/live >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo ✅ MinIO is healthy and responding
        echo    API: http://localhost:9000
        echo    Console: http://localhost:9001
        echo    Credentials: minioadmin / minioadmin
    ) else (
        echo ⚠️  Port 9000 is in use but MinIO may not be responding
    )
) else (
    echo ❌ MinIO is not running
    echo.
    echo Starting MinIO server...
    
    start "MinIO Test Server" minio.exe server "minio-data" --address ":9000" --console-address ":9001"
    
    echo Waiting for MinIO to start...
    timeout /t 5 /nobreak >nul
    
    REM Test if it started
    curl -s http://localhost:9000/minio/health/live >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo ✅ MinIO started successfully!
        echo    API: http://localhost:9000
        echo    Console: http://localhost:9001 
        echo    Credentials: minioadmin / minioadmin
        echo.
        echo You can now test with your enhanced vector pipeline!
    ) else (
        echo ❌ MinIO failed to start or is not responding
        echo Check for port conflicts or other issues
    )
)

echo.
echo =================================================================
echo   Next Steps
echo =================================================================
echo   1. Open MinIO Console: http://localhost:9001
echo   2. Login with: minioadmin / minioadmin
echo   3. Create buckets: legal-docs, evidence, contracts, case-files
echo   4. Run your development server: npm run dev
echo   5. Test vector pipeline: /api/v2/vector-pipeline
echo =================================================================

pause