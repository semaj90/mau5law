# Phase 89: Enhanced Agentic Error Fixing Pipeline
# Redis cache + language detection + top-K index + web search

param(
    [switch]$SkipReports,
    [switch]$SkipEmbedding,
    [switch]$SkipIndex,
    [switch]$TestOnly,
    [int]$MaxFixes = 100
)

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Phase 89: Enhanced Agentic Error Fixing Pipeline" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# 1. Generate error reports
if (-not $SkipReports) {
    Write-Host "📋 Step 1: Generating error reports..." -ForegroundColor Yellow

    # TSC errors
    Write-Host "   Running tsc --noEmit..." -ForegroundColor Gray
    $tscOutput = npx tsc --noEmit 2>&1 | Out-String
    $tscOutput | Set-Content -Path "reports/tsc-errors.txt" -NoNewline

    $tscLines = ($tscOutput -split "`n" | Where-Object { $_.Trim() }).Count
    Write-Host "   ✅ TSC: $tscLines lines" -ForegroundColor Green

    # Svelte-check errors
    Write-Host "   Running svelte-check..." -ForegroundColor Gray
    $svelteOutput = npx svelte-check --output human 2>&1 | Out-String
    $svelteOutput | Set-Content -Path "reports/svelte-check-errors.json" -NoNewline

    $svelteLines = ($svelteOutput -split "`n" | Where-Object { $_.Trim() }).Count
    Write-Host "   ✅ Svelte: $svelteLines lines" -ForegroundColor Green

    $totalLines = $tscLines + $svelteLines
    Write-Host "`n   Total: $totalLines error lines to process`n" -ForegroundColor Cyan
} else {
    Write-Host "⏭️  Step 1: Skipping report generation (using existing)" -ForegroundColor Gray
}

# 2. Enhanced embedding with Redis cache
if (-not $SkipEmbedding) {
    Write-Host "`n🧮 Step 2: Enhanced embedding with Redis cache..." -ForegroundColor Yellow

    # Check if embeddings already exist
    $existing = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings" 2>$null

    if ($existing -and [int]$existing.Trim() -gt 0) {
        Write-Host "   Found $($existing.Trim()) existing embeddings" -ForegroundColor Gray
        $continue = Read-Host "   Continue embedding (will skip duplicates via hash)? (y/n)"
        if ($continue -ne 'y') {
            Write-Host "   ⏭️  Skipping embedding" -ForegroundColor Gray
            $SkipEmbedding = $true
        }
    }

    if (-not $SkipEmbedding) {
        node scripts/phase89-enhanced-embedder.mjs

        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ Embedding failed" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "`n⏭️  Step 2: Skipping embedding (using existing)" -ForegroundColor Gray
}

# 3. Build top-K similarity index
if (-not $SkipIndex) {
    Write-Host "`n🔗 Step 3: Building top-K similarity index..." -ForegroundColor Yellow
    Write-Host "   This precomputes the top-100 most similar errors for each error" -ForegroundColor Gray
    Write-Host "   Making similarity search O(1) instead of O(n)`n" -ForegroundColor Gray

    # Index is built automatically by embedder, verify it exists
    $indexCount = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(DISTINCT error_id) FROM error_similarity_index" 2>$null

    if ($indexCount -and [int]$indexCount.Trim() -gt 0) {
        Write-Host "   ✅ Index exists: $($indexCount.Trim()) errors indexed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No index found - will be created on next embedding run" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⏭️  Step 3: Skipping index build" -ForegroundColor Gray
}

# 4. Test similarity search
Write-Host "`n🔍 Step 4: Testing enhanced similarity search..." -ForegroundColor Yellow
Write-Host "   Testing with common error patterns`n" -ForegroundColor Gray

$testQueries = @(
    @{ query = "Cannot find name"; desc = "TS2304 pattern" },
    @{ query = "TS1005"; desc = "Syntax error code" },
    @{ query = "Type is not assignable"; desc = "Type mismatch" }
)

foreach ($test in $testQueries) {
    Write-Host "   Testing: $($test.desc)" -ForegroundColor Gray
    node scripts/phase89-enhanced-ranker.mjs "$($test.query)" --top 5 2>&1 | Select-String -Pattern "(Cache HIT|Cache MISS|Found \d+ similar|⚡ Using top-K)" | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
}

Write-Host ""

# 5. Web search integration test
Write-Host "`n📚 Step 5: Testing web search integration..." -ForegroundColor Yellow

$commonErrors = @("TS1005", "TS2304", "TS2339")
foreach ($code in $commonErrors) {
    Write-Host "   Looking up: $code" -ForegroundColor Gray
    node scripts/phase89-web-search.mjs $code 2>&1 | Select-String -Pattern "(Cache HIT|Category|Official Docs)" | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
}

Write-Host ""

if ($TestOnly) {
    Write-Host "`n✅ Test complete (--TestOnly flag set)" -ForegroundColor Green
    exit 0
}

# 6. Show system statistics
Write-Host "`n📊 Step 6: System Statistics" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

# Database stats
$stats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "
SELECT
    source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
    COUNT(DISTINCT language) as languages,
    COUNT(DISTINCT error_code) as codes
FROM raw_error_embeddings
GROUP BY source
" 2>$null

Write-Host "Embeddings by Source:" -ForegroundColor Cyan
Write-Host $stats

# Index stats
$indexStats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "
SELECT
    COUNT(DISTINCT error_id) as indexed_errors,
    COUNT(*) as total_neighbors,
    AVG(similarity_score) as avg_similarity
FROM error_similarity_index
" 2>$null

Write-Host "`nTop-K Index:" -ForegroundColor Cyan
Write-Host $indexStats

# Redis cache stats
Write-Host "`nRedis Cache:" -ForegroundColor Cyan
$redisKeys = docker exec phase66-redis redis-cli DBSIZE 2>$null
Write-Host "   Keys: $redisKeys"

$embeddingKeys = docker exec phase66-redis redis-cli KEYS "phase89:embed:*" 2>$null | Measure-Object -Line
$queryKeys = docker exec phase66-redis redis-cli KEYS "phase89:query:*" 2>$null | Measure-Object -Line
$docKeys = docker exec phase66-redis redis-cli KEYS "phase89:docsearch:*" 2>$null | Measure-Object -Line

Write-Host "   Embedding cache: $($embeddingKeys.Lines) entries"
Write-Host "   Query cache: $($queryKeys.Lines) entries"
Write-Host "   Documentation cache: $($docKeys.Lines) entries"

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

# 7. Run autonomous fixer (optional)
Write-Host "`n🤖 Step 7: Run autonomous error fixer?" -ForegroundColor Yellow
Write-Host "   This will cluster similar errors and attempt to fix them" -ForegroundColor Gray
Write-Host "   Max fixes: $MaxFixes errors`n" -ForegroundColor Gray

$runFixer = Read-Host "   Proceed with autonomous fixing? (y/n)"

if ($runFixer -eq 'y') {
    Write-Host "`n   Starting agentic fixer...`n" -ForegroundColor Green
    node scripts/phase89-agentic-fixer.mjs --limit $MaxFixes

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n   ✅ Fixer complete - check results above" -ForegroundColor Green
    } else {
        Write-Host "`n   ⚠️  Fixer encountered issues" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n   ⏭️  Skipping autonomous fixer" -ForegroundColor Gray
}

Write-Host "`n✅ Phase 89 Enhanced Pipeline Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   • Test similarity search: node scripts/phase89-enhanced-ranker.mjs `"your query`"" -ForegroundColor Gray
Write-Host "   • Look up error docs: node scripts/phase89-web-search.mjs TS2304" -ForegroundColor Gray
Write-Host "   • Run fixer manually: node scripts/phase89-agentic-fixer.mjs --limit 50" -ForegroundColor Gray
Write-Host ""
