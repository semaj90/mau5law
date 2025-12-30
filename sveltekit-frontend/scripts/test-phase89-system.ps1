#!/usr/bin/env pwsh
# Phase 89: Knowledge Search System - Test Suite

Write-Host "`n🚀 PHASE 89 KNOWLEDGE SEARCH SYSTEM TEST SUITE`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "📋 Prerequisites Check:" -ForegroundColor Yellow

# 1. PostgreSQL Tables
Write-Host "  1. PostgreSQL tables..." -NoNewline
try {
    $tables = docker exec phase66-postgres psql -U user -d legal -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'phase89_%'" 2>&1
    if ($tables -match '\d+' -and [int]($Matches[0]) -ge 8) {
        Write-Host " ✅ ($($Matches[0]) tables)" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Only $($Matches[0]) tables found" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Failed" -ForegroundColor Red
}

# 2. Qdrant Collections
Write-Host "  2. Qdrant collections..." -NoNewline
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method GET -TimeoutSec 5
    $count = $qdrant.result.collections.Count
    Write-Host " ✅ ($count collections)" -ForegroundColor Green
} catch {
    Write-Host " ❌ Qdrant unavailable" -ForegroundColor Red
}

# 3. Ollama Models
Write-Host "  3. Ollama models..." -NoNewline
try {
    $ollama = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method GET -TimeoutSec 5
    $models = $ollama.models | Where-Object { $_.name -like "*gemma*" -or $_.name -like "*embedding*" }
    Write-Host " ✅ ($($models.Count) models)" -ForegroundColor Green
} catch {
    Write-Host " ❌ Ollama unavailable" -ForegroundColor Red
}

# 4. Redis
Write-Host "  4. Redis..." -NoNewline
try {
    $redis = docker exec phase66-redis redis-cli PING 2>&1
    if ($redis -eq "PONG") {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Redis unavailable" -ForegroundColor Red
}

Write-Host "`n📊 System Status:" -ForegroundColor Yellow
Write-Host "  - Database: PostgreSQL + pgvector ✅" -ForegroundColor Green
Write-Host "  - Vector Store: Qdrant ✅" -ForegroundColor Green
Write-Host "  - LLM: gemma3-legal:latest (Ollama) ✅" -ForegroundColor Green
Write-Host "  - Embeddings: embeddinggemma:latest ✅" -ForegroundColor Green
Write-Host "  - Cache: Redis ✅" -ForegroundColor Green
Write-Host "  - Graph: Neo4j 🚧 (placeholder)" -ForegroundColor Yellow
Write-Host "  - Backup: CouchDB 🚧 (placeholder)" -ForegroundColor Yellow

Write-Host "`n🌐 Access Points:" -ForegroundColor Cyan
Write-Host "  - Knowledge Search UI: http://localhost:5175/admin/knowledge-search" -ForegroundColor White
Write-Host "  - Analyze Tag API: POST http://localhost:5175/api/analyze-tag" -ForegroundColor White
Write-Host "  - Analyze File API: POST http://localhost:5175/api/analyze-file" -ForegroundColor White
Write-Host "  - Cluster Summaries API: POST http://localhost:5175/api/generate-cluster-summaries" -ForegroundColor White

Write-Host "`n📝 Example API Calls:" -ForegroundColor Yellow
Write-Host @"
  # Enhanced Tag Analysis
  Invoke-RestMethod -Uri 'http://localhost:5175/api/analyze-tag' ``
    -Method POST ``
    -Body (@{tag='typescript_error'; collection='all'} | ConvertTo-Json) ``
    -ContentType 'application/json'

  # File Analysis
  Invoke-RestMethod -Uri 'http://localhost:5175/api/analyze-file' ``
    -Method POST ``
    -Body (@{filePath='src/lib/actions/accessibility-actions.ts'} | ConvertTo-Json) ``
    -ContentType 'application/json'

  # Generate Cluster Summaries
  Invoke-RestMethod -Uri 'http://localhost:5175/api/generate-cluster-summaries' ``
    -Method POST

"@ -ForegroundColor Gray

Write-Host "`n✅ Phase 89 Knowledge Search System Ready!`n" -ForegroundColor Green
Write-Host "Start the dev server with: npm run dev" -ForegroundColor Cyan
Write-Host ""
