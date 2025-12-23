#!/usr/bin/env pwsh
# Phase 76: Database Setup Script
# Sets up PostgreSQL + pgvector, CouchDB, Qdrant, RabbitMQ, Redis

Write-Host "🚀 Phase 76: Setting up Polyglot Persistence Stack" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start databases using docker-compose
Write-Host ""
Write-Host "📦 Starting databases with Docker Compose..." -ForegroundColor Yellow
docker-compose -f docker-compose.phase76.yml up -d

# Wait for services to be healthy
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check PostgreSQL
Write-Host ""
Write-Host "🐘 Checking PostgreSQL + pgvector..." -ForegroundColor Cyan
try {
    $pgReady = docker exec deeds-postgres pg_isready -U postgres
    if ($pgReady -match "accepting connections") {
        Write-Host "  ✅ PostgreSQL is ready" -ForegroundColor Green

        # Run migrations
        Write-Host "  📄 Running migrations..." -ForegroundColor Yellow
        Get-Content "sveltekit-frontend/migrations/phase76_knowledge_graph_schema.sql" | docker exec -i deeds-postgres psql -U postgres -d deeds_db
        Write-Host "  ✅ Migrations complete" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ PostgreSQL not ready" -ForegroundColor Red
}

# Check CouchDB
Write-Host ""
Write-Host "🛋️  Checking CouchDB..." -ForegroundColor Cyan
try {
    $couchHealth = Invoke-RestMethod -Uri "http://admin:password@localhost:5984/_up" -Method GET -ErrorAction SilentlyContinue
    if ($couchHealth.status -eq "ok") {
        Write-Host "  ✅ CouchDB is ready" -ForegroundColor Green

        # Create knowledge_graph database
        Write-Host "  📄 Creating knowledge_graph database..." -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "http://admin:password@localhost:5984/knowledge_graph" -Method PUT -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  ✅ Database created" -ForegroundColor Green
        } catch {
            Write-Host "  ℹ️  Database already exists" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ CouchDB not ready" -ForegroundColor Red
}

# Check Qdrant
Write-Host ""
Write-Host "🔍 Checking Qdrant..." -ForegroundColor Cyan
try {
    $qdrantHealth = Invoke-RestMethod -Uri "http://localhost:6333/healthz" -Method GET -ErrorAction SilentlyContinue
    if ($qdrantHealth) {
        Write-Host "  ✅ Qdrant is ready" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Qdrant not ready" -ForegroundColor Red
}

# Check RabbitMQ
Write-Host ""
Write-Host "🐰 Checking RabbitMQ..." -ForegroundColor Cyan
try {
    Start-Sleep -Seconds 5  # RabbitMQ takes longer to start
    $rabbitHealth = Invoke-RestMethod -Uri "http://admin:password@localhost:15672/api/overview" -Method GET -ErrorAction SilentlyContinue
    if ($rabbitHealth) {
        Write-Host "  ✅ RabbitMQ is ready" -ForegroundColor Green
        Write-Host "  🌐 Management UI: http://localhost:15672 (admin/password)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⏳ RabbitMQ still starting (may take 30s)..." -ForegroundColor Yellow
}

# Check Redis
Write-Host ""
Write-Host "💾 Checking Redis..." -ForegroundColor Cyan
try {
    $redisPing = docker exec deeds-redis redis-cli ping
    if ($redisPing -eq "PONG") {
        Write-Host "  ✅ Redis is ready" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Redis not ready" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 76: Database Stack Status                        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "PostgreSQL:  localhost:5432  (postgres/postgres)" -ForegroundColor White
Write-Host "CouchDB:     localhost:5984  (admin/password)" -ForegroundColor White
Write-Host "Qdrant:      localhost:6333  (no auth)" -ForegroundColor White
Write-Host "RabbitMQ:    localhost:5672  (admin/password)" -ForegroundColor White
Write-Host "             localhost:15672 (management UI)" -ForegroundColor Gray
Write-Host "Redis:       localhost:6379  (no auth)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run tests: node scripts/test-polyglot-persistence.mjs" -ForegroundColor White
Write-Host "2. Copy .env.phase76 to .env" -ForegroundColor White
Write-Host "3. Start SvelteKit: npm run dev" -ForegroundColor White
Write-Host ""
