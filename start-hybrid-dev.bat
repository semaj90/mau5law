@echo off
REM Docker + npm run dev integration script
REM This gives you the best of both worlds: Docker infrastructure + native frontend performance

echo 🚀 Starting Hybrid Development Environment
echo Docker Infrastructure + Native Frontend Performance
echo ════════════════════════════════════════════════════

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop and try again.
    exit /b 1
)

REM Create Docker network
echo 🔗 Setting up Docker network...
docker network create legal-ai-network 2>nul || echo    Network already exists

REM Start Docker infrastructure
echo 🐳 Starting Docker infrastructure services...
docker-compose -f docker-compose.yml up -d postgres redis minio

REM Wait for PostgreSQL
echo ⏳ Waiting for PostgreSQL...
:wait_postgres
docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db >nul 2>&1
if errorlevel 1 (
    echo    Waiting for PostgreSQL on port 5433...
    timeout /t 2 >nul
    goto wait_postgres
)
echo ✅ PostgreSQL is ready on port 5433

REM Wait for Redis
echo ⏳ Waiting for Redis...
:wait_redis
docker exec legal-ai-redis redis-cli ping | findstr PONG >nul
if errorlevel 1 (
    echo    Waiting for Redis on port 6379...
    timeout /t 2 >nul
    goto wait_redis
)
echo ✅ Redis is ready on port 6379

echo.
echo 🎯 Docker Infrastructure Ready!
echo    PostgreSQL: localhost:5433
echo    Redis: localhost:6379
echo    MinIO: localhost:9000
echo.

REM Start the native frontend
echo 🖥️  Starting native SvelteKit frontend...
echo    Using npm run dev for optimal performance and hot reload
echo.

cd sveltekit-frontend

echo 🚀 Starting SvelteKit with npm run dev...
echo    Frontend: http://localhost:5174
echo    Protected Route: http://localhost:5174/protected
echo    Login: http://localhost:5174/auth/login
echo.
echo 💡 Press Ctrl+C to stop (Docker services will keep running)
echo 💡 Run 'docker-compose -f docker-compose.yml down' to stop Docker services
echo.

REM Set environment variables for Docker services and start
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5433
set REDIS_HOST=localhost
set REDIS_PORT=6379
set DATABASE_URL=postgresql://legal_admin:123456@localhost:5433/legal_ai_db
set REDIS_URL=redis://localhost:6379

npm run dev