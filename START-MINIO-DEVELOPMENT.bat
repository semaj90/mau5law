@echo off
REM MinIO Native Windows Development Server
REM Automatically downloads and starts MinIO for the legal AI platform

echo =================================================================
echo   MinIO Native Windows Development Server  
echo =================================================================
echo.

REM Set MinIO configuration for legal AI platform
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin
set MINIO_DATA_DIR=%~dp0minio-data
set MINIO_PORT=9000
set MINIO_CONSOLE_PORT=9001
set MINIO_EXE=%~dp0minio.exe

echo MinIO Configuration:
echo   Root User: %MINIO_ROOT_USER%  
echo   Data Directory: %MINIO_DATA_DIR%
echo   API Port: %MINIO_PORT%
echo   Console Port: %MINIO_CONSOLE_PORT%
echo   Executable: %MINIO_EXE%
echo.

REM Create data directory structure for legal documents
if not exist "%MINIO_DATA_DIR%" (
    echo Creating MinIO data directory structure...
    mkdir "%MINIO_DATA_DIR%"
    mkdir "%MINIO_DATA_DIR%\legal-docs"
    mkdir "%MINIO_DATA_DIR%\evidence"
    mkdir "%MINIO_DATA_DIR%\contracts"
    mkdir "%MINIO_DATA_DIR%\case-files"
    echo Directory structure created.
    echo.
)

REM Download MinIO if not present
if not exist "%MINIO_EXE%" (
    echo MinIO executable not found. Downloading for Windows x64...
    echo.
    
    REM Use PowerShell for reliable download with progress
    powershell -Command "& {Write-Host 'Downloading MinIO server...'; Invoke-WebRequest -Uri 'https://dl.min.io/server/minio/release/windows-amd64/minio.exe' -OutFile '%MINIO_EXE%' -UseBasicParsing}"
    
    if not exist "%MINIO_EXE%" (
        echo ERROR: Failed to download MinIO automatically.
        echo Please download manually from: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
        echo Place it in: %~dp0
        pause
        exit /b 1
    )
    
    echo MinIO downloaded successfully!
    echo.
)

REM Check if already running
echo Checking if MinIO is already running on port %MINIO_PORT%...
powershell -Command "try { Invoke-RestMethod -Uri 'http://localhost:%MINIO_PORT%/minio/health/live' -Method Get -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo ✅ MinIO is already running!
    echo    API: http://localhost:%MINIO_PORT%
    echo    Console: http://localhost:%MINIO_CONSOLE_PORT%
    echo    Credentials: %MINIO_ROOT_USER% / %MINIO_ROOT_PASSWORD%
    echo.
    echo Press any key to exit (MinIO will continue running)...
    pause >nul
    exit /b 0
)

echo Starting MinIO server in background...
echo.

REM Set environment variables for MinIO
set MINIO_ROOT_USER=%MINIO_ROOT_USER%
set MINIO_ROOT_PASSWORD=%MINIO_ROOT_PASSWORD%

REM Start MinIO server in the background using start command
echo 🚀 Launching MinIO server...
start "MinIO Server" /MIN "%MINIO_EXE%" server "%MINIO_DATA_DIR%" --address ":%MINIO_PORT%" --console-address ":%MINIO_CONSOLE_PORT%"

REM Wait a moment for startup
echo Waiting for MinIO to start...
timeout /t 3 /nobreak >nul

REM Check if it started successfully
powershell -Command "for ($i=0; $i -lt 10; $i++) { try { Invoke-RestMethod -Uri 'http://localhost:%MINIO_PORT%/minio/health/live' -Method Get -TimeoutSec 1 | Out-Null; Write-Host '✅ MinIO started successfully!'; exit 0 } catch { Start-Sleep -Seconds 1 } } Write-Host '❌ MinIO startup timeout'; exit 1"

if %ERRORLEVEL% equ 0 (
    echo.
    echo =================================================================
    echo   MinIO Server Ready for Legal AI Platform
    echo =================================================================
    echo   📁 API Endpoint:     http://localhost:%MINIO_PORT%
    echo   🖥️  Web Console:      http://localhost:%MINIO_CONSOLE_PORT%
    echo   🔑 Access Key:       %MINIO_ROOT_USER%
    echo   🔑 Secret Key:       %MINIO_ROOT_PASSWORD%
    echo   📂 Data Directory:   %MINIO_DATA_DIR%
    echo.
    echo   📋 Pre-configured buckets:
    echo      • legal-docs   - Legal documents and contracts
    echo      • evidence     - Case evidence files  
    echo      • contracts    - Contract documents
    echo      • case-files   - General case files
    echo.
    echo   🔗 Integration: Ready for enhanced vector pipeline
    echo =================================================================
    echo.
) else (
    echo ❌ Failed to start MinIO server.
    echo Check if port %MINIO_PORT% is already in use.
    pause
    exit /b 1
)

echo MinIO is running in the background.
echo You can now start your development server with: npm run dev
echo.
echo Press any key to exit (MinIO will continue running)...
pause >nul