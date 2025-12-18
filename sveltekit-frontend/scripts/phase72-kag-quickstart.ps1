#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 72: KAG/RAG Integration Quick Start

.DESCRIPTION
    Production-ready execution of Phase 72 error fixing with KAG (Knowledge-Action-Graph)
    and RAG (Retrieval-Augmented Generation) integration.

    Steps:
    1. Verify all services running (Redis, Ollama)
    2. Integrate KAG into factory-fixer-v2.mjs
    3. Apply 100 fixes to seed KAG store
    4. Apply 500 more fixes (should see KAG replay)
    5. Show learning dashboard
    6. Generate completion report

.PARAMETER SkipIntegration
    Skip KAG integration (already integrated)

.PARAMETER SkipServices
    Skip service checks (assume running)

.PARAMETER FixCount
    Number of fixes to apply (default: 500)

.EXAMPLE
    .\phase72-kag-quickstart.ps1
    Full pipeline with all checks

.EXAMPLE
    .\phase72-kag-quickstart.ps1 -SkipServices -FixCount 1000
    Apply 1000 fixes, skip service checks
#>

param(
    [switch]$SkipIntegration,
    [switch]$SkipServices,
    [int]$FixCount = 500
)

$ErrorActionPreference = "Continue"

# ==================== Config ====================

$REDIS_PORT = 4005
$OLLAMA_PORT = 11434
$REDIS_URL = "redis://127.0.0.1:$REDIS_PORT"
$OLLAMA_URL = "http://localhost:$OLLAMA_PORT"

# ==================== Helper Functions ====================

function Write-Step {
    param([string]$Message, [string]$Icon = "🔧")
    Write-Host ""
    Write-Host "$Icon $Message" -ForegroundColor Cyan
    Write-Host ("─" * 70) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Test-ServiceRunning {
    param([string]$Url, [string]$ServiceName)

    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Success "$ServiceName is running ($Url)"
        return $true
    } catch {
        Write-Error "$ServiceName is NOT running ($Url)"
        return $false
    }
}

function Test-RedisConnection {
    param([string]$Host = "127.0.0.1", [int]$Port = 4005)

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($Host, $Port)
        $tcpClient.Close()
        Write-Success "Redis is running (${Host}:${Port})"
        return $true
    } catch {
        Write-Error "Redis is NOT running (${Host}:${Port})"
        return $false
    }
}

# ==================== Main Pipeline ====================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Phase 72: KAG/RAG Integration Quick Start                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Services
if (-not $SkipServices) {
    Write-Step "Verifying Required Services" "🔍"

    $redisOk = Test-RedisConnection -Port $REDIS_PORT
    $ollamaOk = Test-ServiceRunning -Url "$OLLAMA_URL/api/tags" -ServiceName "Ollama"

    if (-not $redisOk) {
        Write-Warning "Redis not running. Start with:"
        Write-Host "  cd c:\Users\james\Videos\deeds-web-app" -ForegroundColor Yellow
        Write-Host "  .\redis-latest\redis-server.exe --port $REDIS_PORT" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne 'y') { exit 1 }
    }

    if (-not $ollamaOk) {
        Write-Warning "Ollama not running. Start with:"
        Write-Host "  ollama serve" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne 'y') { exit 1 }
    }
}

# Step 2: Integrate KAG
if (-not $SkipIntegration) {
    Write-Step "Integrating KAG into factory-fixer-v2.mjs" "🔧"

    node scripts/integrate-kag-into-fixer.mjs --apply

    if ($LASTEXITCODE -ne 0) {
        Write-Error "KAG integration failed"
        exit 1
    }

    Write-Success "KAG integration complete"
}

# Step 3: Seed KAG with 100 fixes
Write-Step "Seeding KAG Store (100 fixes)" "🌱"

Write-Host "Running: node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100" -ForegroundColor DarkGray
$seedStart = Get-Date
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100
$seedEnd = Get-Date
$seedDuration = ($seedEnd - $seedStart).TotalSeconds

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Seeding completed with errors (exit code: $LASTEXITCODE)"
} else {
    Write-Success "Seeding complete in ${seedDuration}s"
}

# Step 4: Show initial KAG stats
Write-Step "Initial KAG Statistics" "📊"

node scripts/kag-rag-dashboard.mjs

# Step 5: Apply more fixes with KAG replay
Write-Step "Applying $FixCount fixes with KAG Replay" "🚀"

Write-Host "Running: node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit $FixCount --kag" -ForegroundColor DarkGray
$applyStart = Get-Date
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit $FixCount --kag
$applyEnd = Get-Date
$applyDuration = ($applyEnd - $applyStart).TotalSeconds

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Fix application completed with errors (exit code: $LASTEXITCODE)"
} else {
    Write-Success "Applied $FixCount fixes in ${applyDuration}s"
}

# Step 6: Show final KAG stats
Write-Step "Final KAG Statistics" "📊"

node scripts/kag-rag-dashboard.mjs

# Step 7: Verify errors reduced
Write-Step "Verification: Error Count Check" "🔍"

Write-Host "Running: npm run check:svelte 2>&1 | Select-String 'error'" -ForegroundColor DarkGray

# Count errors (simplified - full pipeline uses parse-fast.mjs)
$errorOutput = npm run check:svelte 2>&1 | Out-String
$errorCount = ($errorOutput | Select-String -Pattern "error" -AllMatches).Matches.Count

Write-Host "Current Error Count: $errorCount" -ForegroundColor $(if ($errorCount -lt 2000) { "Green" } elseif ($errorCount -lt 5000) { "Yellow" } else { "Red" })

# Step 8: Generate completion report
Write-Step "Phase 72 Completion Report" "📝"

$reportPath = "reports/runs/phase72-kag-completion-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"

$report = @{
    timestamp = (Get-Date).ToString("o")
    seedDuration = $seedDuration
    applyDuration = $applyDuration
    totalDuration = ($applyEnd - $seedStart).TotalSeconds
    fixesApplied = $FixCount
    finalErrorCount = $errorCount
    kagEnabled = $true
    ragEnabled = $true
} | ConvertTo-Json -Depth 5

if (!(Test-Path "reports/runs")) {
    New-Item -ItemType Directory -Path "reports/runs" -Force | Out-Null
}

$report | Out-File -FilePath $reportPath -Encoding UTF8

Write-Success "Report saved: $reportPath"

# Summary
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Phase 72 Quick Start Complete!                              ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Seed Time: ${seedDuration}s (100 fixes)" -ForegroundColor White
Write-Host "   Apply Time: ${applyDuration}s ($FixCount fixes)" -ForegroundColor White
Write-Host "   Total Time: $(($applyEnd - $seedStart).TotalSeconds)s" -ForegroundColor White
Write-Host "   Current Errors: $errorCount" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Monitor learning: node scripts/kag-rag-dashboard.mjs --watch" -ForegroundColor White
Write-Host "   2. Apply more fixes: node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 1000" -ForegroundColor White
Write-Host "   3. Check hit rate: node scripts/kag-rag-dashboard.mjs" -ForegroundColor White
Write-Host "   4. Export data: node scripts/kag-rag-dashboard.mjs --export" -ForegroundColor White
Write-Host ""
