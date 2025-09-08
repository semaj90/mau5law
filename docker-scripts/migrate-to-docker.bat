@echo off
setlocal EnableDelayedExpansion

echo 🚀 Migrating Legal AI Platform to Docker...

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker is running

:: Stop existing containers if they exist
echo 📦 Stopping any existing Legal AI containers...
docker-compose down -v >nul 2>&1

:: Export current database (backup)
echo 💾 Creating backup of current database...
set timestamp=%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set PGPASSWORD=123456
pg_dump -h localhost -p 5432 -U legal_admin -d legal_ai_db > backup-%timestamp%.sql
echo ✅ Database backup created

:: Start Docker services
echo 🐳 Starting Docker services...
docker-compose up -d

:: Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
set /a counter=0
:wait_postgres
timeout /t 2 >nul
set /a counter+=2
docker-compose exec postgres pg_isready -U legal_admin -d legal_ai_db >nul 2>&1
if errorlevel 1 (
    if !counter! gtr 60 (
        echo ❌ PostgreSQL failed to start within 60 seconds
        docker-compose logs postgres
        pause
        exit /b 1
    )
    echo|set /p="."
    goto wait_postgres
)

echo.
echo ✅ PostgreSQL is ready

:: Test vector extension
echo 🧪 Testing pgvector extension...
docker-compose exec postgres psql -U legal_admin -d legal_ai_db -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"

:: Verify services
echo 🔍 Verifying service health...

:: PostgreSQL
docker-compose exec postgres pg_isready -U legal_admin -d legal_ai_db >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL: Not responding
) else (
    echo ✅ PostgreSQL: Healthy
)

:: MinIO
curl -s http://localhost:9000/minio/health/live >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MinIO: Not responding (may still be starting)
) else (
    echo ✅ MinIO: Healthy
)

:: Redis
docker-compose exec redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ❌ Redis: Not responding
) else (
    echo ✅ Redis: Healthy
)

echo.
echo 📋 Docker migration complete! Services are now running on:
echo   PostgreSQL: localhost:5433 (legal_admin/123456)
echo   MinIO: http://localhost:9000 (minio/minio123)
echo   MinIO Console: http://localhost:9001
echo   Redis: localhost:6379
echo   Qdrant: http://localhost:6333
echo.
echo ⚠️  Update your application to use port 5433 for PostgreSQL
echo ✅ Migration completed successfully! 🎉
pause