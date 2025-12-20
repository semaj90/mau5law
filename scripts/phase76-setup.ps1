# Phase 76 Level 2 Setup Script
# Verifies Docker containers and sets up the database schema

Write-Host "🚀 Phase 76 Level 2 Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check Postgres container
Write-Host ""
Write-Host "🐘 Checking Postgres container..." -ForegroundColor Yellow
$postgresContainer = docker ps --filter "name=postgres" --format "{{.Names}}"
if (-not $postgresContainer) {
    Write-Host "❌ Postgres container not found. Please start it with docker-compose." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Postgres container: $postgresContainer" -ForegroundColor Green

# Check MinIO container
Write-Host ""
Write-Host "📦 Checking MinIO container..." -ForegroundColor Yellow
$minioContainer = docker ps --filter "name=minio" --format "{{.Names}}"
if (-not $minioContainer) {
    Write-Host "⚠️  MinIO container not found. It will be created when needed." -ForegroundColor Yellow
} else {
    Write-Host "✅ MinIO container: $minioContainer" -ForegroundColor Green
}

# Check Redis container
Write-Host ""
Write-Host "🔴 Checking Redis container..." -ForegroundColor Yellow
$redisContainer = docker ps --filter "name=redis" --format "{{.Names}}"
if (-not $redisContainer) {
    Write-Host "⚠️  Redis container not found. Caching will be disabled." -ForegroundColor Yellow
} else {
    Write-Host "✅ Redis container: $redisContainer" -ForegroundColor Green
}

# Check Qdrant
Write-Host ""
Write-Host "🔍 Checking Qdrant..." -ForegroundColor Yellow
try {
    $qdrantResponse = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method Get -ErrorAction Stop
    Write-Host "✅ Qdrant is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Qdrant is not accessible at http://localhost:6333" -ForegroundColor Red
    Write-Host "   Please start Qdrant or update QDRANT_URL in .env" -ForegroundColor Yellow
    exit 1
}

# Check Ollama
Write-Host ""
Write-Host "🤖 Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green

    # Check for required models
    $models = $ollamaResponse.models.name
    $hasGemma3 = $models -contains "gemma3-legal:latest"
    $hasEmbedding = $models -contains "embeddinggemma:latest"

    if (-not $hasGemma3) {
        Write-Host "⚠️  gemma3-legal:latest not found. Run: ollama pull gemma3-legal:latest" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ gemma3-legal:latest" -ForegroundColor Green
    }

    if (-not $hasEmbedding) {
        Write-Host "⚠️  embeddinggemma:latest not found. Run: ollama pull embeddinggemma:latest" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ embeddinggemma:latest" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Ollama is not accessible at http://localhost:11434" -ForegroundColor Red
    Write-Host "   Please start Ollama or update OLLAMA_URL in .env" -ForegroundColor Yellow
    exit 1
}

# Run database migration
Write-Host ""
Write-Host "📊 Setting up database schema..." -ForegroundColor Yellow
Write-Host "   Running: npm run phase76:setup" -ForegroundColor Gray

try {
    npm run phase76:setup
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database schema created successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Database migration failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run database migration: $_" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Phase 76 Level 2 Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Index documentation:" -ForegroundColor White
Write-Host "     npm run phase76:kb:crawl `"https://svelte.dev/docs/svelte/v5-migration-guide`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Test agentic task execution:" -ForegroundColor White
Write-Host "     npm run phase76:ace --task=`"Fix the on:change event handler`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Read the full documentation:" -ForegroundColor White
Write-Host "     cat scripts/PHASE76_README.md" -ForegroundColor Gray
Write-Host ""
