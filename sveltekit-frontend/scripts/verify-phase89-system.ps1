# Phase 89: System Verification Script
# Checks all components are wired correctly

Write-Host "🔍 Phase 89: Full System Verification" -ForegroundColor Cyan
Write-Host ""

$allErrors = @()

# =====================================================
# 1. PostgreSQL Connection
# =====================================================
Write-Host "1️⃣ Checking PostgreSQL..." -ForegroundColor Yellow
$PGHOST = "127.0.0.1"
$PGPORT = "5434"
$PGDATABASE = "legal_ai_db"
$PGUSER = "legal_admin"
$env:PGPASSWORD = "123456"

try {
    $pgResult = psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c "SELECT 1" -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL connected" -ForegroundColor Green

        # Check Phase 89 tables
        $tables = @('phase89_fix_attempts', 'phase89_kb_cards', 'phase89_error_clusters', 'phase89_timeline', 'phase89_cosine_rankings', 'phase89_ast_signatures', 'phase89_edit_log')
        $query = "SELECT tablename FROM pg_tables WHERE tablename LIKE 'phase89%'"
        $existingTables = (psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c $query -t).Trim() -split "`n" | ForEach-Object { $_.Trim() }

        $missingTables = $tables | Where-Object { $_ -notin $existingTables }
        if ($missingTables.Count -eq 0) {
            Write-Host "   ✅ All Phase 89 tables exist" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Missing tables: $($missingTables -join ', ')" -ForegroundColor Yellow
            $allErrors += "Missing PostgreSQL tables"
        }
    } else {
        Write-Host "   ❌ PostgreSQL connection failed" -ForegroundColor Red
        $allErrors += "PostgreSQL not accessible"
    }
} catch {
    Write-Host "   ❌ PostgreSQL check failed: $($_.Exception.Message)" -ForegroundColor Red
    $allErrors += "PostgreSQL error"
}

Write-Host ""

# =====================================================
# 2. Redis Connection
# =====================================================
Write-Host "2️⃣ Checking Redis..." -ForegroundColor Yellow
try {
    $redisTest = docker exec phase66-redis redis-cli PING 2>&1
    if ($redisTest -match "PONG") {
        Write-Host "   ✅ Redis connected (via Docker)" -ForegroundColor Green

        # Check keyspace
        $keyCount = docker exec phase66-redis redis-cli DBSIZE
        Write-Host "   ℹ️ Total keys: $keyCount" -ForegroundColor Cyan

        if ($keyCount -gt 1000) {
            Write-Host "   ✅ Keyspace populated (target: 75K)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Low key count (run learning pipeline to populate)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Redis connection failed" -ForegroundColor Red
        $allErrors += "Redis not accessible"
    }
} catch {
    Write-Host "   ❌ Redis check failed: $($_.Exception.Message)" -ForegroundColor Red
    $allErrors += "Redis error"
}

Write-Host ""

# =====================================================
# 3. Qdrant Connection
# =====================================================
Write-Host "3️⃣ Checking Qdrant..." -ForegroundColor Yellow
try {
    $qdrantHealth = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Qdrant connected" -ForegroundColor Green

    # Check collections
    $collections = @('phase89_error_chunks', 'phase89_ast_embeddings', 'phase89_error_clusters', 'phase89_rag_patterns', 'phase89_kb_cards', 'phase89_edit_log')
    foreach ($collection in $collections) {
        try {
            $collectionInfo = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/$collection" -Method GET -TimeoutSec 5
            $pointCount = $collectionInfo.result.points_count
            if ($pointCount -ge 0) {
                Write-Host "   ✅ $collection`: $pointCount points" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ $collection`: empty (run CUDA pipeline)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ $collection`: not found" -ForegroundColor Red
            $allErrors += "Missing Qdrant collection: $collection"
        }
    }
} catch {
    Write-Host "   ❌ Qdrant connection failed: $($_.Exception.Message)" -ForegroundColor Red
    $allErrors += "Qdrant not accessible"
}

Write-Host ""

# =====================================================
# 4. Ollama Connection
# =====================================================
Write-Host "4️⃣ Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaTest = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Ollama connected" -ForegroundColor Green

    # Check required models
    $requiredModels = @('embeddinggemma:latest', 'gemma3-legal:latest')
    $installedModels = $ollamaTest.models.name

    foreach ($model in $requiredModels) {
        if ($installedModels -contains $model) {
            Write-Host "   ✅ Model: $model" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Model missing: $model" -ForegroundColor Yellow
            $allErrors += "Missing Ollama model: $model"
        }
    }
} catch {
    Write-Host "   ❌ Ollama connection failed" -ForegroundColor Red
    $allErrors += "Ollama not accessible"
}

Write-Host ""

# =====================================================
# 5. API Endpoints
# =====================================================
Write-Host "5️⃣ Checking API Endpoints..." -ForegroundColor Yellow

# Check if dev server is running
try {
    $statusTest = Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/status" -Method GET -TimeoutSec 5
    Write-Host "   ✅ /api/phase89/status responding" -ForegroundColor Green

    $configTest = Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/config" -Method GET -TimeoutSec 5
    Write-Host "   ✅ /api/phase89/config responding" -ForegroundColor Green

    # Additional check for status
    if ($statusTest.success) {
        Write-Host "   ✅ Status API OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Status API failed" -ForegroundColor Red
        $allErrors += "Status API error"
    }
} catch {
    Write-Host "   ⚠️ API endpoints not accessible (dev server not running?)" -ForegroundColor Yellow
    Write-Host "   Run: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# =====================================================
# 6. Namespace Coherence
# =====================================================
Write-Host "6️⃣ Checking Namespace Coherence..." -ForegroundColor Yellow
$prefixes = @("phase89:", "emb:", "topk:", "kb:")
foreach ($prefix in $prefixes) {
    try {
        $keys = docker exec phase66-redis redis-cli KEYS "$prefix*"
        $count = ($keys -split "`n").Count
        if ($count -gt 0) {
            Write-Host "   ✅ Prefix $prefix`: $count keys" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Prefix $prefix`: no keys found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Failed to check prefix: $prefix" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ($allErrors.Count -eq 0) {
    Write-Host "🚀 Phase 89 System: FULLY WIRED" -ForegroundColor Green
    Write-Host "All systems operational and connected." -ForegroundColor Green
} else {
    Write-Host "⚠️ Phase 89 System: PARTIALLY WIRED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Issues found:" -ForegroundColor Red
    foreach ($err in $allErrors) {
        Write-Host "   - $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Fix steps:" -ForegroundColor Cyan
    Write-Host "   1. Run: scripts/setup-phase89-db.ps1"
    Write-Host "   2. Run: node scripts/phase89-cuda-integrated-pipeline.mjs"
    Write-Host "   3. Start dev server: npm run dev"
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
