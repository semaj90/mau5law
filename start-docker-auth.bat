@echo off
REM Start SvelteKit with Authentication in Docker Desktop
REM Supports dynamic port allocation and service discovery

echo 🐳 Starting Legal AI SvelteKit with Authentication
echo ════════════════════════════════════════════════

REM Check if Docker Desktop is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop and try again.
    exit /b 1
)

REM Set default ports if not specified
if not defined VITE_PORT set VITE_PORT=5174
if not defined PROXY_PORT set PROXY_PORT=8080

REM Create network if it doesn't exist
echo 🔗 Creating Docker network...
docker network create legal-ai-network 2>nul || echo Network already exists

echo 📊 Port Configuration:
echo    Vite Dev Server: %VITE_PORT%
echo    Error Logger Proxy: %PROXY_PORT%
echo    PostgreSQL: 5433
echo    Redis: 6379

REM Start core infrastructure first
echo 🏗️  Starting infrastructure services...
docker-compose -f docker-compose.yml up -d postgres redis minio

REM Wait for services to be healthy
echo ⏳ Waiting for infrastructure services...
:wait_postgres
docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db >nul 2>&1
if errorlevel 1 (
    echo    Waiting for PostgreSQL...
    timeout /t 2 >nul
    goto wait_postgres
)

:wait_redis
docker exec legal-ai-redis redis-cli ping | findstr PONG >nul
if errorlevel 1 (
    echo    Waiting for Redis...
    timeout /t 2 >nul
    goto wait_redis
)

echo ✅ Infrastructure ready!

REM Start SvelteKit with authentication
echo 🚀 Starting SvelteKit with Authentication...
docker-compose -f docker-compose.sveltekit.yml up --build

echo.
echo 🎉 SvelteKit with Authentication is ready!
echo ════════════════════════════════════════════════
echo 🌐 Frontend (Direct):     http://localhost:%VITE_PORT%
echo 🔧 Error Logger Proxy:    http://localhost:%PROXY_PORT%
echo 🔒 Protected Route:       http://localhost:%VITE_PORT%/protected
echo 👤 Login:                 http://localhost:%VITE_PORT%/auth/login
echo 📝 Register:              http://localhost:%VITE_PORT%/auth/register
echo.
echo 💡 Tip: Use Ctrl+C to stop all services