@echo off
echo Starting PostgreSQL 17 with pgvector GPU acceleration and Gemma embeddings...
echo.

REM Start Docker Desktop if not running
echo Ensuring Docker Desktop is running...
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker to start...
    timeout /t 30 /nobreak
)

REM Pull Gemma embedding model in Ollama
echo.
echo Pulling Gemma embedding model...
docker run --rm ollama/ollama pull embeddinggemma:latest

REM Start services
echo.
echo Starting PostgreSQL 17 with pgvector and GPU services...
docker-compose -f docker-compose-pgvector-gpu.yml up -d

REM Wait for services to be ready
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak

REM Check service health
echo.
echo Checking service health...
docker-compose -f docker-compose-pgvector-gpu.yml ps

REM Test pgvector extension
echo.
echo Testing pgvector extension...
docker exec postgres-pgvector-gpu psql -U legal_admin -d legal_ai_db -c "SELECT vector_version();"

REM Show connection info
echo.
echo ========================================
echo Services are running!
echo.
echo PostgreSQL 17 + pgvector (GPU):
echo   Host: localhost
echo   Port: 5434
echo   Database: legal_ai_db
echo   User: legal_admin
echo   Password: 123456
echo.
echo Ollama (Gemma embeddings):
echo   URL: http://localhost:11436
echo   Model: embeddinggemma:latest
echo.
echo CUDA Service (RTX 3060 Ti):
echo   URL: http://localhost:8097
echo   Health: http://localhost:8097/api/v1/health
echo   Search: http://localhost:8097/api/v1/search
echo ========================================
echo.
pause