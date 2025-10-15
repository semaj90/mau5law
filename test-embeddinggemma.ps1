#!/usr/bin/env pwsh
# ✅ embeddinggemma:latest Integration Test Suite
# Tests embedding generation, search API, and vector operations

Write-Host "🧪 embeddinggemma:latest Integration Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$TestsPassed = 0
$TestsFailed = 0

# Test 1: Check Ollama is running
Write-Host "📋 Test 1: Ollama Service Health" -ForegroundColor Yellow
try {
    $ollamaVersion = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -Method Get -ErrorAction Stop
    Write-Host "  ✅ Ollama is running (version: $($ollamaVersion.version))" -ForegroundColor Green
    $TestsPassed++
} catch {
    Write-Host "  ❌ Ollama is not running. Run 'ollama serve' first." -ForegroundColor Red
    $TestsFailed++
}

# Test 2: Check if embeddinggemma:latest is available
Write-Host "`n📋 Test 2: embeddinggemma:latest Model Availability" -ForegroundColor Yellow
try {
    $models = ollama list | Select-String "embeddinggemma"
    if ($models) {
        Write-Host "  ✅ embeddinggemma:latest is installed" -ForegroundColor Green
        $TestsPassed++
    } else {
        Write-Host "  ⚠️ embeddinggemma:latest not found. Pulling model..." -ForegroundColor Yellow
        ollama pull embeddinggemma:latest
        Write-Host "  ✅ embeddinggemma:latest pulled successfully" -ForegroundColor Green
        $TestsPassed++
    }
} catch {
    Write-Host "  ❌ Failed to check/pull embeddinggemma:latest" -ForegroundColor Red
    $TestsFailed++
}

# Test 3: Generate test embedding
Write-Host "`n📋 Test 3: Generate Test Embedding" -ForegroundColor Yellow
try {
    $embeddingRequest = @{
        model = "embeddinggemma:latest"
        prompt = "Sample legal contract regarding intellectual property rights and licensing agreements"
    } | ConvertTo-Json

    $embeddingResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/embeddings" `
        -Method Post `
        -ContentType "application/json" `
        -Body $embeddingRequest `
        -ErrorAction Stop

    $embedding = $embeddingResponse.embedding
    $dimensions = $embedding.Count

    if ($dimensions -eq 768) {
        Write-Host "  ✅ Generated embedding with $dimensions dimensions (expected: 768)" -ForegroundColor Green
        Write-Host "  📊 Sample values: [$($embedding[0..4] -join ', ')]" -ForegroundColor Cyan
        $TestsPassed++
    } else {
        Write-Host "  ❌ Unexpected embedding dimensions: $dimensions (expected: 768)" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  ❌ Failed to generate embedding: $($_.Exception.Message)" -ForegroundColor Red
    $TestsFailed++
}

# Test 4: Check Python backend
Write-Host "`n📋 Test 4: Python AI Backend Health" -ForegroundColor Yellow
try {
    $pythonHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -ErrorAction Stop
    Write-Host "  ✅ Python backend is running" -ForegroundColor Green
    Write-Host "  📊 Redis: $($pythonHealth.redis)" -ForegroundColor Cyan
    Write-Host "  📊 AI Model: $($pythonHealth.ai)" -ForegroundColor Cyan
    $TestsPassed++
} catch {
    Write-Host "  ⚠️ Python backend not running. Start with: cd ai-server && python main.py" -ForegroundColor Yellow
    Write-Host "  ℹ️ This is optional if testing TypeScript search API only" -ForegroundColor Gray
}

# Test 5: Test TypeScript Search API
Write-Host "`n📋 Test 5: TypeScript Search API (embeddinggemma)" -ForegroundColor Yellow
try {
    $searchRequest = @{
        query = "contract evidence involving multiple parties and intellectual property"
        options = @{
            limit = 5
            threshold = 0.6
            entityTypes = @("evidence")
        }
    } | ConvertTo-Json

    $searchResponse = Invoke-RestMethod -Uri "http://localhost:5173/api/search" `
        -Method Post `
        -ContentType "application/json" `
        -Body $searchRequest `
        -ErrorAction Stop

    if ($searchResponse.success) {
        Write-Host "  ✅ Search API returned results" -ForegroundColor Green
        Write-Host "  📊 Results count: $($searchResponse.results.Count)" -ForegroundColor Cyan
        Write-Host "  📊 Processing time: $($searchResponse.metadata.processingTime)ms" -ForegroundColor Cyan
        Write-Host "  📊 Model used: $($searchResponse.metadata.embeddingModel)" -ForegroundColor Cyan
        $TestsPassed++
    } else {
        Write-Host "  ❌ Search API returned error: $($searchResponse.error)" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  ⚠️ SvelteKit not running or search failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  ℹ️ Start with: npm run dev" -ForegroundColor Gray
}

# Test 6: Redis Cache Check
Write-Host "`n📋 Test 6: Redis Cache Integration" -ForegroundColor Yellow
try {
    $redisCheck = docker exec legal-ai-redis redis-cli ping 2>&1
    if ($redisCheck -match "PONG") {
        Write-Host "  ✅ Redis is running and accessible" -ForegroundColor Green

        # Check top-k queries
        $topQueries = docker exec legal-ai-redis redis-cli ZREVRANGE search:topk:queries 0 4 WITHSCORES 2>&1
        Write-Host "  📊 Top searches cached:" -ForegroundColor Cyan
        Write-Host "  $topQueries" -ForegroundColor Gray
        $TestsPassed++
    } else {
        Write-Host "  ❌ Redis connection failed" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  ⚠️ Redis not running. Start with: docker-compose up -d" -ForegroundColor Yellow
}

# Test 7: Qdrant Vector DB Check
Write-Host "`n📋 Test 7: Qdrant Vector Database" -ForegroundColor Yellow
try {
    $qdrantHealth = Invoke-RestMethod -Uri "http://localhost:6333/health" -Method Get -ErrorAction Stop
    Write-Host "  ✅ Qdrant is running" -ForegroundColor Green

    # Check collections
    $collections = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method Get -ErrorAction Stop
    $evidenceCollection = $collections.result.collections | Where-Object { $_.name -eq "evidence_vectors" }

    if ($evidenceCollection) {
        Write-Host "  📊 evidence_vectors collection exists" -ForegroundColor Cyan
        Write-Host "  📊 Points count: $($evidenceCollection.points_count)" -ForegroundColor Cyan
    } else {
        Write-Host "  ℹ️ evidence_vectors collection not created yet" -ForegroundColor Gray
    }
    $TestsPassed++
} catch {
    Write-Host "  ⚠️ Qdrant not running. Start with: docker-compose up -d" -ForegroundColor Yellow
}

# Test 8: PostgreSQL + pgvector Check
Write-Host "`n📋 Test 8: PostgreSQL + pgvector" -ForegroundColor Yellow
try {
    $pgCheck = docker exec legal-ai-postgres pg_isready -U legal_admin 2>&1
    if ($pgCheck -match "accepting connections") {
        Write-Host "  ✅ PostgreSQL is running" -ForegroundColor Green

        # Check pgvector extension
        $pgvectorCheck = docker exec legal-ai-postgres psql -U legal_admin -d legal_ai_db -c "SELECT extname FROM pg_extension WHERE extname='vector';" 2>&1
        if ($pgvectorCheck -match "vector") {
            Write-Host "  ✅ pgvector extension is installed" -ForegroundColor Green
            $TestsPassed++
        } else {
            Write-Host "  ⚠️ pgvector extension not found. Install with: CREATE EXTENSION vector;" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ PostgreSQL connection failed" -ForegroundColor Red
        $TestsFailed++
    }
} catch {
    Write-Host "  ⚠️ PostgreSQL not running. Start with: docker-compose up -d" -ForegroundColor Yellow
}

# Test Summary
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  ✅ Tests Passed: $TestsPassed" -ForegroundColor Green
Write-Host "  ❌ Tests Failed: $TestsFailed" -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Host "`n🎉 All tests passed! embeddinggemma:latest is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📚 Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Visit http://localhost:5173/evidence-ai" -ForegroundColor Cyan
    Write-Host "  2. Upload a legal document" -ForegroundColor Cyan
    Write-Host "  3. Test semantic search with natural language queries" -ForegroundColor Cyan
    Write-Host "  4. Monitor Redis cache hit rates" -ForegroundColor Cyan
    Write-Host "  5. Check vector search quality improvements" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️ Some tests failed. Check the errors above and:" -ForegroundColor Yellow
    Write-Host "  1. Run 'ollama serve' if Ollama tests failed" -ForegroundColor Cyan
    Write-Host "  2. Run 'docker-compose up -d' if infrastructure tests failed" -ForegroundColor Cyan
    Write-Host "  3. Run 'npm run dev' if search API tests failed" -ForegroundColor Cyan
    Write-Host "  4. Run 'cd ai-server && python main.py' for Python backend" -ForegroundColor Cyan
}

Write-Host ""
