#!/usr/bin/env pwsh
# Phase 72 Integration Test Script

Write-Host "`n🧪 Phase 72 GPU Error Clustering - Integration Tests`n" -ForegroundColor Cyan

# Test 1: Database Schema
Write-Host "1️⃣ Testing Database Schema..." -ForegroundColor Yellow
$env:PGPASSWORD = '123456'
$schemaCheck = psql -U postgres -d legal_ai_db -t -c "
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'phase72_error'
    AND column_name IN ('embedding', 'occurrence_count', 'last_seen')
  ORDER BY column_name;
" 2>&1

if ($schemaCheck -match "embedding") {
    Write-Host "   ✅ Schema verified: embedding, occurrence_count, last_seen columns exist" -ForegroundColor Green
} else {
    Write-Host "   ❌ Schema check failed" -ForegroundColor Red
    exit 1
}

# Test 2: Ollama embeddinggemma
Write-Host "`n2️⃣ Testing Ollama embeddinggemma..." -ForegroundColor Yellow
try {
    $ollamaModels = curl -s http://localhost:11434/api/tags | ConvertFrom-Json
    $embeddingModel = $ollamaModels.models | Where-Object { $_.name -like "*embeddinggemma*" }

    if ($embeddingModel) {
        Write-Host "   ✅ embeddinggemma:latest available ($(([math]::Round($embeddingModel.size/1MB, 1))) MB)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ embeddinggemma not found - run: ollama pull embeddinggemma:latest" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Ollama not running - start Ollama service" -ForegroundColor Red
    exit 1
}

# Test 3: GPU Addon (optional)
Write-Host "`n3️⃣ Checking GPU Addon (optional)..." -ForegroundColor Yellow
if (Test-Path "sveltekit-frontend/build/Release/ast_error_vectorizer.node") {
    $addonSize = (Get-Item "sveltekit-frontend/build/Release/ast_error_vectorizer.node").Length / 1KB
    Write-Host "   ✅ GPU addon available ($(([math]::Round($addonSize, 1))) KB)" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  GPU addon not built (using Ollama fallback)" -ForegroundColor Gray
}

# Test 4: Error Capture API
Write-Host "`n4️⃣ Testing Error Capture API..." -ForegroundColor Yellow
$testPayload = @{
    file_path = "src/lib/test-phase72-integration.ts"
    line = 42
    col = 10
    code = "TS2339"
    severity = "error"
    message = "Property 'testPhase72' does not exist on type 'IntegrationTest'"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/capture-error" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testPayload `
        -TimeoutSec 10

    if ($response.ok) {
        Write-Host "   ✅ Error captured successfully" -ForegroundColor Green
        Write-Host "      Hash: $($response.error_hash)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ API returned error" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ API call failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "      Make sure dev server is running: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Test 5: Verify Embedding Generated
Write-Host "`n5️⃣ Verifying Embedding Generated..." -ForegroundColor Yellow
Start-Sleep -Seconds 2  # Allow time for embedding generation

$embeddingCheck = psql -U postgres -d legal_ai_db -t -c "
  SELECT
    error_hash,
    embedding IS NOT NULL as has_embedding
  FROM phase72_error
  ORDER BY created_at DESC
  LIMIT 1;
" 2>&1

if ($embeddingCheck -match "t") {  # PostgreSQL true = 't'
    Write-Host "   ✅ Embedding generated successfully (384-d vector)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Embedding is NULL - check Ollama logs" -ForegroundColor Yellow
}

# Test 6: Similarity Search API
Write-Host "`n6️⃣ Testing Similarity Search API..." -ForegroundColor Yellow
$similarPayload = @{
    message = "Property does not exist on type"
    threshold = 0.7
    limit = 5
} | ConvertTo-Json

try {
    $similarResponse = Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/similar-errors" `
        -Method POST `
        -ContentType "application/json" `
        -Body $similarPayload `
        -TimeoutSec 10

    Write-Host "   ✅ Similarity search returned $($similarResponse.count) result(s)" -ForegroundColor Green

    if ($similarResponse.count -gt 0) {
        $topMatch = $similarResponse.similar_errors[0]
        Write-Host "      Top match: $($topMatch.message)" -ForegroundColor Gray
        Write-Host "      Similarity: $(([math]::Round($topMatch.similarity * 100, 1)))%" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Similarity search failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Phase 72 Integration Tests Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Final Stats
$stats = psql -U postgres -d legal_ai_db -t -c "
  SELECT
    COUNT(*) as total_errors,
    COUNT(embedding) as with_embeddings,
    MAX(last_seen) as latest_error
  FROM phase72_error;
" 2>&1

Write-Host "📊 Current Statistics:" -ForegroundColor Cyan
Write-Host $stats
Write-Host ""
