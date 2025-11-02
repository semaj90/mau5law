@echo off
setlocal EnableDelayedExpansion

REM Legal AI Platform - Native Windows Development Environment
REM Starts MinIO + SvelteKit with enhanced vector pipeline support

echo =================================================================
echo   Legal AI Platform - Native Windows Development
echo   Enhanced Vector Pipeline with MinIO Integration  
echo =================================================================
echo.

REM Set core environment variables
set DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db
set MINIO_ENDPOINT=localhost:4002
set MINIO_ACCESS_KEY=minioadmin
set MINIO_SECRET_KEY=minioadmin
set REDIS_URL=redis://localhost:6379
set CUDA_ENABLED=true
set FASTEMBED_URL=http://localhost:8001

echo Environment Configuration:
echo   DATABASE_URL: %DATABASE_URL%
echo   MINIO_ENDPOINT: %MINIO_ENDPOINT%
echo   CUDA_ENABLED: %CUDA_ENABLED%
echo   FASTEMBED_URL: %FASTEMBED_URL%
echo.

REM Check for existing minio.exe in various locations
set MINIO_EXE=
if exist "minio.exe" (
    set MINIO_EXE=minio.exe
    echo ✅ Found MinIO executable in project root
) else if exist "bin\minio.exe" (
    set MINIO_EXE=bin\minio.exe  
    echo ✅ Found MinIO executable in bin directory
) else if exist "tools\minio.exe" (
    set MINIO_EXE=tools\minio.exe
    echo ✅ Found MinIO executable in tools directory
) else (
    echo ⬇️  MinIO executable not found - will download
)

REM Function to check if a port is in use
:CheckPort
netstat -an | find ":%1 " >nul
if %ERRORLEVEL% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

echo =================================================================
echo   Service Status Check
echo =================================================================

REM Check if MinIO is already running
call :CheckPort 4002
if %ERRORLEVEL% equ 0 (
    echo ✅ MinIO is already running on port 4002
    set MINIO_RUNNING=true
) else (
    echo ❌ MinIO is not running on port 4002
    set MINIO_RUNNING=false
)

REM Check if SvelteKit dev server is running  
call :CheckPort 5173
if %ERRORLEVEL% equ 0 (
    echo ✅ SvelteKit dev server is running on port 5173
    set SVELTEKIT_RUNNING=true
) else (
    echo ❌ SvelteKit dev server is not running on port 5173
    set SVELTEKIT_RUNNING=false
)

echo.

REM Start MinIO if not running
if "!MINIO_RUNNING!"=="false" (
    echo =================================================================
    echo   Starting MinIO Server
    echo =================================================================
    
    REM Download MinIO if we don't have it
    if "!MINIO_EXE!"=="" (
        echo Downloading MinIO for Windows x64...
        powershell -Command "try { Invoke-WebRequest -Uri 'https://dl.min.io/server/minio/release/windows-amd64/minio.exe' -OutFile 'minio.exe' -UseBasicParsing; Write-Host '✅ MinIO downloaded successfully' } catch { Write-Host '❌ Download failed'; exit 1 }"
        
        if !ERRORLEVEL! neq 0 (
            echo Failed to download MinIO. Please download manually and place in project root.
            echo URL: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
            pause
            exit /b 1
        )
        
        set MINIO_EXE=minio.exe
    )
    
    REM Create MinIO data directories for legal AI
    if not exist "minio-data" mkdir "minio-data"
    if not exist "minio-data\legal-docs" mkdir "minio-data\legal-docs"
    if not exist "minio-data\evidence" mkdir "minio-data\evidence"
    if not exist "minio-data\contracts" mkdir "minio-data\contracts"
    if not exist "minio-data\case-files" mkdir "minio-data\case-files"
    
    echo Created legal AI document structure in minio-data/
    
    REM Set MinIO credentials
    set MINIO_ROOT_USER=%MINIO_ACCESS_KEY%
    set MINIO_ROOT_PASSWORD=%MINIO_SECRET_KEY%
    
    REM Start MinIO server in background
    echo Starting MinIO server...
    start "MinIO Server" /MIN "!MINIO_EXE!" server "minio-data" --address ":4002" --console-address ":4003"
    
    REM Wait for MinIO to start
    echo Waiting for MinIO to start up...
    timeout /t 5 /nobreak >nul
    
    REM Verify MinIO started successfully
    call :CheckPort 4002
    if !ERRORLEVEL! equ 0 (
        echo ✅ MinIO server started successfully!
        echo    📁 API Endpoint: http://localhost:4002
        echo    🖥️  Web Console: http://localhost:4003
        echo    🔑 Credentials: %MINIO_ACCESS_KEY% / %MINIO_SECRET_KEY%
    ) else (
        echo ❌ MinIO failed to start on port 4002
        echo    Check if the port is already in use
        pause
        exit /b 1
    )
    echo.
) else (
    echo MinIO is already running - skipping startup
    echo.
)

REM Now start the SvelteKit development server
echo =================================================================
echo   Starting SvelteKit Development Server
echo   with Enhanced Vector Pipeline Support
echo =================================================================

REM Navigate to SvelteKit frontend directory
if not exist "sveltekit-frontend" (
    echo ❌ sveltekit-frontend directory not found!
    echo Make sure you're running this from the project root directory.
    pause
    exit /b 1
)

cd sveltekit-frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
)

REM Clear any cached build artifacts to prevent compilation errors
echo 🧹 Clearing build cache...
if exist ".svelte-kit" rmdir /s /q ".svelte-kit" >nul 2>&1
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" >nul 2>&1

REM Export all environment variables for the development server
set DATABASE_URL=%DATABASE_URL%
set MINIO_ENDPOINT=%MINIO_ENDPOINT%  
set MINIO_ACCESS_KEY=%MINIO_ACCESS_KEY%
set MINIO_SECRET_KEY=%MINIO_SECRET_KEY%
set REDIS_URL=%REDIS_URL%
set CUDA_ENABLED=%CUDA_ENABLED%
set FASTEMBED_URL=%FASTEMBED_URL%
set NODE_ENV=development

echo.
echo 🚀 Starting SvelteKit development server...
echo    Frontend will be available at: http://localhost:5173
echo    Enhanced vector pipeline endpoints will be available
echo.
echo Press Ctrl+C to stop the development server
echo.

REM Start the development server
call npm run dev

REM Development server has stopped
echo.
echo =================================================================
echo   Development Server Stopped
echo =================================================================

REM Ask about stopping background services
choice /C YN /M "Stop MinIO server (running in background)"
if !ERRORLEVEL! equ 1 (
    echo Stopping MinIO server...
    taskkill /F /IM minio.exe >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo ✅ MinIO server stopped
    ) else (
        echo ⚠️  MinIO may have already stopped or wasn't found
    )
)

echo.
echo 🎯 Legal AI Platform development session ended.
echo    Enhanced vector pipeline ready for next session!
echo.
pause

goto :eof

REM Function definitions
:CheckPort
netstat -an | find ":%1 " >nul
exit /b %ERRORLEVEL%