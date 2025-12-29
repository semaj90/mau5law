# Phase 89: System Verification Script
# Checks all components are wired correctly

Write-Host "🔍 Phase 89: Full System Verification" -ForegroundColor Cyan
Write-Host ""

$errors = @()

# =====================================================
# 1. PostgreSQL Connection
# =====================================================
Write-Host "1️⃣ Checking PostgreSQL..." -ForegroundColor Yellow
$PGHOST = "127.0.0.1"
$PGPORT = "5434"
$PGDATABASE = "legal"
$PGUSER = "user"
$env:PGPASSWORD = "pass"

try {
    $pgResult = psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c "SELECT 1" -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL connected" -ForegroundColor Green

        # Check Phase 89 tables
        $tables = @('phase89_fix_attempts', 'phase89_kb_cards', 'phase89_error_clusters', 'phase89_timeline', 'phase89_cosine_rankings', 'phase89_ast_signatures')
        $query = "SELECT tablename FROM pg_tables WHERE tablename LIKE 'phase89%'"
        $existingTables = (psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c $query -t).Trim() -split "`n" | ForEach-Object { $_.Trim() }

        $missingTables = $tables | Where-Object { $_ -notin $existingTables }
        if ($missingTables.Count -eq 0) {
            Write-Host "   ✅ All Phase 89 tables exist" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Missing tables: $($missingTables -join ', ')" -ForegroundColor Yellow
            $errors += "Missing PostgreSQL tables"
        }
    } else {
        Write-Host "   ❌ PostgreSQL connection failed" -ForegroundColor Red
        $errors += "PostgreSQL not accessible"
    }
} catch {
    Write-Host "   ❌ PostgreSQL check failed: $($_.Exception.Message)" -ForegroundColor Red
    $errors += "PostgreSQL error"
}

Write-Host ""

# =====================================================
# 2. Redis Connection
# =====================================================
Write-Host "2️⃣ Checking Redis..." -ForegroundColor Yellow
try {
    $redisTest = redis-cli PING 2>&1
    if ($redisTest -eq "PONG") {
        Write-Host "   ✅ Redis connected" -ForegroundColor Green

        # Check keyspace
        $keyCount = redis-cli DBSIZE
        Write-Host "   ℹ️ Total keys: $keyCount" -ForegroundColor Cyan

        if ($keyCount -gt 1000) {
            Write-Host "   ✅ Keyspace populated (target: 75K)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Low key count (run learning pipeline to populate)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Redis connection failed" -ForegroundColor Red
        $errors += "Redis not accessible"
    }
} catch {
    Write-Host "   ❌ Redis check failed: $($_.Exception.Message)" -ForegroundColor Red
    $errors += "Redis error"
}

Write-Host ""

# =====================================================
# 3. Qdrant Connection
# =====================================================
Write-Host "3️⃣ Checking Qdrant..." -ForegroundColor Yellow
try {
    $qdrantHealth = Invoke-RestMethod -Uri "http://localhost:6333/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Qdrant connected" -ForegroundColor Green

    # Check collections
    $collections = @('phase89_error_chunks', 'phase89_ast_chunks', 'phase89_kb_cards', 'phase76_knowledge_base')
    foreach ($collection in $collections) {
        try {
            $collectionInfo = Invoke-RestMethod -Uri "http://localhost:6333/collections/$collection" -Method GET -TimeoutSec 5
            $pointCount = $collectionInfo.result.points_count
            if ($pointCount -gt 0) {
                Write-Host "   ✅ $collection`: $pointCount points" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ $collection`: empty (run CUDA pipeline)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ $collection`: not found" -ForegroundColor Red
            $errors += "Missing Qdrant collection: $collection"
        }
    }
} catch {
    Write-Host "   ❌ Qdrant connection failed" -ForegroundColor Red
    $errors += "Qdrant not accessible"
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
            $errors += "Missing Ollama model: $model"
        }
    }
} catch {
    Write-Host "   ❌ Ollama connection failed" -ForegroundColor Red
    $errors += "Ollama not accessible"
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
} catch {
    Write-Host "   ⚠️ API endpoints not accessible (dev server not running?)" -ForegroundColor Yellow
    Write-Host "   Run: npm run dev" -ForegroundColor Cyan
}

Write-Host ""

# =====================================================
# 6. Namespace Coherence
# =====================================================
Write-Host "6️⃣ Checking Namespace Coherence..." -ForegroundColor Yellow

# Check Redis prefixes
$prefixes = @('phase89:', 'emb:', 'topk:', 'kb:')
foreach ($prefix in $prefixes) {
    try {
        $keyCount = (redis-cli KEYS "$prefix*").Count
        if ($keyCount -gt 0) {
            Write-Host "   ✅ Prefix $prefix`: $keyCount keys" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Prefix $prefix`: no keys (run pipeline)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Failed to check prefix: $prefix" -ForegroundColor Red
    }
}

Write-Host ""

# =====================================================
# Summary
# =====================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
if ($errors.Count -eq 0) {
    Write-Host "✅ Phase 89 System: FULLY WIRED" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ready to use!" -ForegroundColor Cyan
    Write-Host "   Dashboard: http://localhost:5175/admin/phase89" -ForegroundColor White
    Write-Host "   Explorer: http://localhost:5175/admin/explorer" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️ Phase 89 System: PARTIALLY WIRED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Issues found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Fix steps:" -ForegroundColor Cyan
    Write-Host "   1. Run: scripts/setup-phase89-db.ps1" -ForegroundColor White
    Write-Host "   2. Run: node scripts/phase89-cuda-integrated-pipeline.mjs" -ForegroundColor White
    Write-Host "   3. Start dev server: npm run dev" -ForegroundColor White
    Write-Host ""
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
