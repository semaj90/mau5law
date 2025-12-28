# Phase 89: Complete Agentic Error Fixer Pipeline
# Redis cache + Top-K index + Web search + LLM fixes

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('setup', 'index', 'query', 'fix', 'stats', 'full')]
    [string]$Action = 'full',

    [Parameter(Mandatory=$false)]
    [string]$Query = '',

    [Parameter(Mandatory=$false)]
    [int]$TopK = 10,

    [Parameter(Mandatory=$false)]
    [int]$FixLimit = 50
)

function Show-Header {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  🚀 Phase 89: Agentic Error Fixer with Redis Cache & Top-K Index" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
}

function Check-Services {
    Write-Host "🔍 Checking services..." -ForegroundColor Yellow

    # Postgres
    $pgStatus = docker ps --filter "name=phase66-postgres" --format "{{.Status}}" 2>$null
    if ($pgStatus -like "*Up*") {
        Write-Host "   ✅ PostgreSQL (legal_ai_db)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL not running" -ForegroundColor Red
        exit 1
    }

    # Redis
    $redisStatus = docker ps --filter "name=phase66-redis" --format "{{.Status}}" 2>$null
    if ($redisStatus -like "*Up*") {
        Write-Host "   ✅ Redis" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis not running" -ForegroundColor Red
        exit 1
    }

    # Ollama
    try {
        $ollamaTest = curl -s http://localhost:11434/api/tags 2>$null
        Write-Host "   ✅ Ollama" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Ollama may not be running" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Show-Statistics {
    Write-Host "📊 Current Statistics:`n" -ForegroundColor Cyan

    # Error embeddings
    $embedStats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT source, COUNT(*) as total, COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded FROM raw_error_embeddings GROUP BY source ORDER BY source" 2>$null
    Write-Host "Error Embeddings:" -ForegroundColor Yellow
    Write-Host $embedStats

    # Top-K index
    $topkStats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(DISTINCT error_id) as errors, COUNT(*) as relationships, AVG(similarity)::numeric(10,4) as avg_similarity FROM error_topk_index" 2>$null
    if ($topkStats) {
        Write-Host "`nTop-K Index:" -ForegroundColor Yellow
        Write-Host $topkStats
    }

    # Redis cache
    $redisSize = docker exec phase66-redis redis-cli DBSIZE 2>$null
    Write-Host "`nRedis Cache: $redisSize keys" -ForegroundColor Yellow

    Write-Host ""
}

function Build-TopKIndex {
    Write-Host "🔗 Building Top-K Inverse Index (Top-20)...`n" -ForegroundColor Cyan

    # Check if already built
    $indexCount = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(DISTINCT error_id) FROM error_topk_index" 2>$null
    $indexCount = [int]($indexCount.Trim())
    $totalErrors = 45661

    if ($indexCount -ge $totalErrors) {
        Write-Host "   ✅ Index already complete ($indexCount errors)" -ForegroundColor Green
        Write-Host ""
        return
    }

    if ($indexCount -gt 0) {
        Write-Host "   ⏳ Index building in progress ($indexCount / $totalErrors errors)" -ForegroundColor Yellow
        Write-Host "   Use './scripts/phase89-monitor-topk.ps1' to monitor progress" -ForegroundColor Cyan
        Write-Host ""
        return
    }

    Write-Host "   Starting index builder..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath "node" -ArgumentList "scripts/phase89-build-topk-index.mjs", "20"
    Write-Host "   ✅ Index builder started (runs in background)" -ForegroundColor Green
    Write-Host "   Monitor: ./scripts/phase89-monitor-topk.ps1`n" -ForegroundColor Cyan
}

function Query-Errors {
    param([string]$SearchQuery, [int]$Top)

    Write-Host "🔍 Querying similar errors for: '$SearchQuery'`n" -ForegroundColor Cyan

    # Use enhanced ranker with Redis cache
    $result = node scripts/phase89-enhanced-ranker.mjs "$SearchQuery" --top $Top 2>&1
    Write-Host $result
    Write-Host ""
}

function Fix-Errors {
    param([int]$Limit)

    Write-Host "🤖 Running agentic error fixer (limit: $Limit)...`n" -ForegroundColor Cyan

    $result = node scripts/phase89-agentic-fixer.mjs --limit $Limit 2>&1
    Write-Host $result
    Write-Host ""
}

function Web-Search {
    param([string]$SearchQuery)

    Write-Host "🌐 Searching web for solutions: '$SearchQuery'`n" -ForegroundColor Cyan

    $result = node scripts/phase89-web-search.mjs "$SearchQuery" 2>&1
    Write-Host $result
    Write-Host ""
}

function Run-Full-Pipeline {
    Show-Header
    Check-Services

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

    Write-Host "🎯 Phase 89: Full Agentic Pipeline`n" -ForegroundColor Yellow
    Write-Host "This will run the complete error fixing workflow:`n"
    Write-Host "  1. Check Top-K index status"
    Write-Host "  2. Query top error patterns"
    Write-Host "  3. Search web for solutions"
    Write-Host "  4. Apply automated fixes"
    Write-Host "  5. Show statistics`n"

    $confirm = Read-Host "Proceed? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "`nAborted." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

    # Step 1: Check index
    Build-TopKIndex

    # Step 2: Query common errors
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
    Query-Errors "TS1005" 10

    # Step 3: Web search
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
    Web-Search "TS1005"

    # Step 4: Fix errors
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
    Fix-Errors 20

    # Step 5: Statistics
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
    Show-Statistics

    Write-Host "✅ Full pipeline complete!`n" -ForegroundColor Green
}

# Main execution
switch ($Action) {
    'setup' {
        Show-Header
        Check-Services
        Show-Statistics
    }

    'index' {
        Show-Header
        Check-Services
        Build-TopKIndex
    }

    'query' {
        if (-not $Query) {
            Write-Host "❌ Query required. Use: -Query 'TS1005'" -ForegroundColor Red
            exit 1
        }
        Show-Header
        Query-Errors $Query $TopK
    }

    'fix' {
        Show-Header
        Check-Services
        Fix-Errors $FixLimit
    }

    'stats' {
        Show-Header
        Show-Statistics
    }

    'full' {
        Run-Full-Pipeline
    }
}
