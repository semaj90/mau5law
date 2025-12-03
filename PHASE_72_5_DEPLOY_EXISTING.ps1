# Phase 72.5: Topology Brain Deployment
# Uses existing Docker containers (phase66-redis, phase66-postgres, phase66-qdrant)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 72.5: Topology Brain Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Redis
Write-Host "[1/5] Checking Redis (phase66-redis:6379)..." -ForegroundColor Yellow
$redisCheck = docker exec phase66-redis redis-cli ping 2>&1
if ($redisCheck -eq "PONG") {
    Write-Host "✓ Redis is running" -ForegroundColor Green
} else {
    Write-Host "✗ Redis not responding" -ForegroundColor Red
    exit 1
}

# Step 2: Verify Postgres
Write-Host "[2/5] Checking Postgres (phase66-postgres:5432)..." -ForegroundColor Yellow
$postgresCheck = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1" 2>&1
if ($postgresCheck -like "*1*") {
    Write-Host "✓ Postgres is running" -ForegroundColor Green
} else {
    Write-Host "✗ Postgres not responding" -ForegroundColor Red
    exit 1
}

# Step 3: Verify Qdrant
Write-Host "[3/5] Checking Qdrant (phase66-qdrant:6333)..." -ForegroundColor Yellow
$qdrantCheck = docker exec phase66-qdrant curl -s http://127.0.0.1:6333/health 2>&1
if ($qdrantCheck -like "*ok*") {
    Write-Host "✓ Qdrant is running" -ForegroundColor Green
} else {
    Write-Host "⚠ Qdrant may be unhealthy (continuing anyway)" -ForegroundColor Yellow
}

# Step 4: Initialize Postgres schema
Write-Host "[4/5] Initializing Postgres schema..." -ForegroundColor Yellow

$sqlScript = @"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS phase72_error (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_hash      TEXT NOT NULL UNIQUE,
    file_path       TEXT NOT NULL,
    line            INT NOT NULL,
    column          INT NOT NULL,
    code            TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'error',
    message         TEXT NOT NULL,
    phase           INT NOT NULL DEFAULT 72,
    cycle           INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase72_error_vector (
    error_id    UUID PRIMARY KEY REFERENCES phase72_error(id) ON DELETE CASCADE,
    model       TEXT NOT NULL DEFAULT 'embeddinggemma:latest',
    embedding   vector(768) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase72_cluster (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label       TEXT,
    phase       INT NOT NULL DEFAULT 72,
    cycle       INT NOT NULL,
    size        INT NOT NULL DEFAULT 0,
    centroid    vector(768),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase72_cluster_summary (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id      UUID NOT NULL REFERENCES phase72_cluster(id) ON DELETE CASCADE,
    summary_text    TEXT NOT NULL,
    model           TEXT NOT NULL DEFAULT 'gemma3-legal:latest',
    embedding       vector(768),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
"@

$schemaInit = $sqlScript | docker exec -i phase66-postgres psql -U legal_admin -d legal_ai_db 2>&1

if ($schemaInit -like "*CREATE*" -or $schemaInit -like "*already exists*") {
    Write-Host "✓ Postgres schema initialized" -ForegroundColor Green
} else {
    Write-Host "⚠ Schema initialization output: $schemaInit" -ForegroundColor Yellow
}

# Step 5: Verify tables
Write-Host "[5/5] Verifying tables..." -ForegroundColor Yellow
$tableCheck = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "\dt phase72_*" 2>&1
if ($tableCheck -like "*phase72_error*") {
    Write-Host "✓ All tables created" -ForegroundColor Green
} else {
    Write-Host "✗ Tables not found" -ForegroundColor Red
    Write-Host $tableCheck
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 72.5 Deployment Complete!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Environment variables to set (.env.local):" -ForegroundColor Yellow
Write-Host "  REDIS_URL=redis://127.0.0.1:6379" -ForegroundColor Cyan
Write-Host "  DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -ForegroundColor Cyan
Write-Host "  QDRANT_URL=http://127.0.0.1:6333" -ForegroundColor Cyan
Write-Host "  OLLAMA_ENDPOINT=http://127.0.0.1:11434" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create .env.local in sveltekit-frontend/ with above variables" -ForegroundColor Cyan
Write-Host "  2. Start Ollama: docker-compose up -d ollama" -ForegroundColor Cyan
Write-Host "  3. Run Phase 72 fast scan: npm run phase72:fast-scan" -ForegroundColor Cyan
Write-Host ""
