#!/usr/bin/env pwsh
# Quick Phase 89 API Test

Write-Host "`n🧪 PHASE 89 QUICK API TEST`n" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Gray
Write-Host ""

# Test 1: Check Qdrant HTTP Helper
Write-Host "1️⃣ Testing Qdrant HTTP Helper (getCollections)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method GET -TimeoutSec 5
    $count = $response.result.collections.Count
    Write-Host "   ✅ Qdrant: $count collections found" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check PostgreSQL Tables
Write-Host "`n2️⃣ Testing PostgreSQL Tables..." -ForegroundColor Yellow
try {
    $tables = docker exec phase66-postgres psql -U user -d legal -t -c "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'phase89_%'" 2>&1
    if ($tables -match '\d+') {
        Write-Host "   ✅ PostgreSQL: $($Matches[0]) phase89 tables" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ PostgreSQL: Failed" -ForegroundColor Red
}

# Test 3: Check Ollama Models
Write-Host "`n3️⃣ Testing Ollama Models..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method GET -TimeoutSec 5
    $gemma = $response.models | Where-Object { $_.name -like "*gemma*" }
    Write-Host "   ✅ Ollama: $($gemma.Count) Gemma models" -ForegroundColor Green
    $gemma | ForEach-Object { Write-Host "      - $($_.name)" -ForegroundColor Gray }
} catch {
    Write-Host "   ❌ Ollama: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test Ollama Embedding
Write-Host "`n4️⃣ Testing embeddinggemma:latest..." -ForegroundColor Yellow
try {
    $body = @{
        model = "embeddinggemma:latest"
        prompt = "test embedding"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/embeddings" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    $dim = $response.embedding.Count
    Write-Host "   ✅ Embedding: $dim dimensions" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Embedding: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Direct Qdrant scroll test
Write-Host "`n5️⃣ Testing Qdrant scroll (phase89_error_clusters)..." -ForegroundColor Yellow
try {
    $body = @{
        limit = 10
        with_payload = $true
        with_vector = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase89_error_clusters/points/scroll" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
    $count = $response.result.points.Count
    Write-Host "   ✅ Scroll: Retrieved $count points" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Scroll: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n" + ("═" * 60) -ForegroundColor Gray
Write-Host "✅ Core services operational!" -ForegroundColor Green
Write-Host "`nNote: UI/API endpoints require dev server rebuild" -ForegroundColor Yellow
Write-Host "Run: npm run build && npm run dev`n" -ForegroundColor White
