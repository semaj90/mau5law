@echo off
REM Production Deployment Script for Legal AI Platform (Windows)
REM This script deploys the complete production stack using Docker Compose

setlocal enabledelayedexpansion

REM Colors for output (using color codes)
REM Note: Windows CMD color support is limited, using simple prefixes

REM Configuration
set COMPOSE_FILE=docker-compose.production.yml
set PROJECT_NAME=legal-ai-production
set ENV_FILE=.env.production

REM Function to print colored output
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking prerequisites..."

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed. Please install Docker first."
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        call :print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit /b 1
    )
)

REM Check if .env.production file exists
if not exist "%ENV_FILE%" (
    call :print_warning "Environment file %ENV_FILE% not found. Creating template..."
    call :create_env_template
)

call :print_success "Prerequisites check passed"
goto :eof

REM Function to create environment template
:create_env_template
(
echo # Production Environment Configuration
echo # Please update these values before deployment
echo.
echo # Database Configuration
echo POSTGRES_PASSWORD=secure_password_123
echo.
echo # MinIO Configuration
echo MINIO_ROOT_USER=admin
echo MINIO_ROOT_PASSWORD=password123
echo.
echo # Grafana Configuration
echo GRAFANA_PASSWORD=admin
echo.
echo # AI API Configuration
echo REDIS_URL=redis://redis:6379
echo RAY_HEAD_NODE=ray-head:6379
echo DISTRIBUTED_MODE=true
echo NUM_WORKERS=4
echo BATCH_SIZE=64
echo CACHE_TTL=7200
echo.
echo # Frontend Configuration
echo PUBLIC_API_BASE=http://advanced-ai-api:8001
echo PUBLIC_WS_URL=ws://advanced-ai-api:8001/ws/advanced-ai
echo DATABASE_URL=postgresql://ai_user:%%POSTGRES_PASSWORD%%@postgres:5432/legal_ai_prod
echo REDIS_URL=redis://redis:6379
echo MINIO_ENDPOINT=minio:9000
) > "%ENV_FILE%"

call :print_warning "Created %ENV_FILE% template. Please update the values before proceeding."
echo Press any key to continue after updating the environment file...
pause >nul
goto :eof

REM Function to build and deploy
:deploy_stack
call :print_status "Starting production deployment..."

REM Load environment variables
if exist "%ENV_FILE%" (
    for /f "tokens=*" %%i in (%ENV_FILE%) do (
        if not "%%i"=="" if not "%%i:~0,1%%"=="#" (
            set %%i
        )
    )
)

REM Stop any existing containers
call :print_status "Stopping existing containers..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down >nul 2>&1

REM Remove old images (optional)
set /p choice="Remove old Docker images to free up space? (y/N): "
if /i "!choice!"=="y" (
    call :print_status "Removing unused Docker images..."
    docker image prune -f
)

REM Build and start services
call :print_status "Building and starting production stack..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up --build -d

REM Wait for services to be healthy
call :print_status "Waiting for services to become healthy..."
timeout /t 30 /nobreak >nul

REM Check service health
call :check_services_health

call :print_success "Production deployment completed successfully!"
call :print_status "Access your application at:"
echo   - Frontend: http://localhost
echo   - API: http://localhost/api/
echo   - Grafana: http://localhost:3001 (admin/admin)
echo   - Prometheus: http://localhost:9090
echo   - MinIO Console: http://localhost:9001
goto :eof

REM Function to check service health
:check_services_health
call :print_status "Checking service health..."

set services=advanced-ai-api sveltekit-frontend postgres redis minio prometheus grafana

for %%s in (%services%) do (
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps %%s | findstr /c:"Up" >nul
    if errorlevel 1 (
        call :print_error "%%s failed to start"
    ) else (
        call :print_success "%%s is running"
    )
)
goto :eof

REM Function to show logs
:show_logs
call :print_status "Showing service logs..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" logs -f
goto :eof

REM Function to stop stack
:stop_stack
call :print_status "Stopping production stack..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down
call :print_success "Production stack stopped"
goto :eof

REM Function to restart stack
:restart_stack
call :print_status "Restarting production stack..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" restart
call :print_success "Production stack restarted"
goto :eof

REM Function to update stack
:update_stack
call :print_status "Updating production stack..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" pull
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d
call :print_success "Production stack updated"
goto :eof

REM Function to backup data
:backup_data
call :print_status "Creating data backup..."

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set DATE=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a%%b
set TIMESTAMP=%DATE%_%TIME:~0,2%%TIME:~3,2%

set BACKUP_DIR=.\backups\%TIMESTAMP%
mkdir "%BACKUP_DIR%" 2>nul

REM Backup PostgreSQL
call :print_status "Backing up PostgreSQL data..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" exec -T postgres pg_dump -U ai_user legal_ai_prod > "%BACKUP_DIR%\postgres_backup.sql"

REM Backup Redis (if needed)
call :print_status "Backing up Redis data..."
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" exec -T redis redis-cli --rdb "%BACKUP_DIR%\redis_backup.rdb"

call :print_success "Backup completed: %BACKUP_DIR%"
goto :eof

REM Main menu
:show_menu
echo.
echo ========================================
echo   Legal AI Platform - Production Deployment
echo ========================================
echo 1. Deploy Production Stack
echo 2. Check Service Health
echo 3. Show Logs
echo 4. Stop Stack
echo 5. Restart Stack
echo 6. Update Stack
echo 7. Backup Data
echo 8. Exit
echo ========================================
echo.
goto :eof

REM Main script logic
:main
call :check_prerequisites

:main_loop
call :show_menu
set /p choice="Choose an option (1-8): "

if "%choice%"=="1" (
    call :deploy_stack
) else if "%choice%"=="2" (
    call :check_services_health
) else if "%choice%"=="3" (
    call :show_logs
) else if "%choice%"=="4" (
    call :stop_stack
) else if "%choice%"=="5" (
    call :restart_stack
) else if "%choice%"=="6" (
    call :update_stack
) else if "%choice%"=="7" (
    call :backup_data
) else if "%choice%"=="8" (
    call :print_status "Exiting..."
    goto :end
) else (
    call :print_error "Invalid option. Please choose 1-8."
)

echo.
pause
goto main_loop

:end
goto :eof

REM Run main function
call :main %*