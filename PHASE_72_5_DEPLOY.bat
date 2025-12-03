@echo off
REM Phase 72.5: Topology Brain Deployment Script
REM Initializes all infrastructure and runs Phase 72 topology pipeline

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo Phase 72.5: Topology Brain Deployment
echo ============================================================
echo.

REM Step 1: Check if Redis is running
echo [1/6] Checking Redis on port 4005...
redis-cli -p 4005 ping >nul 2>&1
if errorlevel 1 (
    echo WARNING: Redis not running on port 4005
    echo Start Redis with: redis-server --port 4005
    echo.
) else (
    echo ✓ Redis is running
)

REM Step 2: Check if Postgres is running
echo [2/6] Checking Postgres...
psql -U legal_admin -d legal_ai_db -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Postgres not accessible
    echo Start with: docker-compose up -d postgres
    echo.
) else (
    echo ✓ Postgres is running
)

REM Step 3: Check if Qdrant is running
echo [3/6] Checking Qdrant...
curl -s http://127.0.0.1:6333/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Qdrant not running
    echo Start with: docker-compose up -d qdrant
    echo.
) else (
    echo ✓ Qdrant is running
)

REM Step 4: Check if Ollama is running
echo [4/6] Checking Ollama...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo WARNING: Ollama not running
    echo Start with: docker-compose up -d ollama
    echo.
) else (
    echo ✓ Ollama is running
)

REM Step 5: Initialize Postgres schema
echo [5/6] Initializing Postgres schema...
psql -U legal_admin -d legal_ai_db -f backend/sql/phase72_topology_minimal.sql >nul 2>&1
if errorlevel 1 (
    echo WARNING: Could not initialize Postgres schema
    echo Run manually: psql -U legal_admin -d legal_ai_db -f backend/sql/phase72_topology_minimal.sql
) else (
    echo ✓ Postgres schema initialized
)

REM Step 6: Run Phase 72 topology
echo [6/6] Running Phase 72 topology pipeline...
cd sveltekit-frontend
node scripts/phase72-topology-store.mjs stats
echo.
echo ============================================================
echo Phase 72.5 Deployment Complete!
echo ============================================================
echo.
echo Next steps:
echo 1. Start infrastructure: docker-compose up -d postgres redis qdrant ollama
echo 2. Start Redis: redis-server --port 4005
echo 3. Run Phase 72 fast scan: npm run phase72:fast-scan
echo.
