#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 88: Quick Start - Run All Ingestion Steps

.DESCRIPTION
    One-command orchestrator for complete KB setup:
    1. Web docs ingestion (Svelte 5, SvelteKit 2, Bits-UI, UnoCSS, Drizzle, PG, pgvector, Docker)
    2. Local repo docs ingestion (operator brain)
    3. Verification test suite

.PARAMETER SkipWeb
    Skip web docs crawl (use if already ingested)

.PARAMETER SkipRepo
    Skip local repo docs (use if already ingested)

.PARAMETER Quick
    Quick mode (depth 1 for web docs, minimal verification)

.EXAMPLE
    .\scripts\phase88-quick-start.ps1
    # Complete setup (first run)

.EXAMPLE
    .\scripts\phase88-quick-start.ps1 -SkipWeb
    # Re-ingest repo docs only

.EXAMPLE
    .\scripts\phase88-quick-start.ps1 -Quick
    # Fast mode for testing
#>

param(
    [switch]$SkipWeb,
    [switch]$SkipRepo,
    [switch]$Quick
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🚀 Phase 88: Quick Start - Knowledge Base Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Mode: $(if ($Quick) { 'Quick' } else { 'Full' })" -ForegroundColor Yellow
Write-Host ""

$totalStart = Get-Date

# Step 1: Web docs ingestion
if (-not $SkipWeb) {
    Write-Host "📥 Step 1/3: Web Documentation Ingestion" -ForegroundColor Cyan
    Write-Host "   This will crawl Svelte 5, SvelteKit 2, Bits-UI, UnoCSS, Drizzle, PG, pgvector, Docker" -ForegroundColor Gray
    Write-Host ""

    $webArgs = if ($Quick) { '-Quick' } else { '' }
    $webScript = Join-Path $SCRIPT_DIR "phase88-ingest-web-docs.ps1"

    try {
        & $webScript $webArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Web docs ingestion failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Web docs ingestion error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
} else {
    Write-Host "⏭️  Skipping web docs ingestion" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Local repo docs ingestion
if (-not $SkipRepo) {
    Write-Host "📚 Step 2/3: Repository Documentation Ingestion" -ForegroundColor Cyan
    Write-Host "   This will ingest operator brain docs (NEXT_STEPS_LOG, MCP guides, etc.)" -ForegroundColor Gray
    Write-Host ""

    $repoScript = Join-Path $SCRIPT_DIR "phase88-ingest-repo-docs.ps1"

    try {
        & $repoScript
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Repo docs ingestion failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Repo docs ingestion error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
} else {
    Write-Host "⏭️  Skipping repo docs ingestion" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Verification
Write-Host "🔍 Step 3/3: Knowledge Base Verification" -ForegroundColor Cyan
Write-Host "   Testing retrieval quality with framework-specific queries" -ForegroundColor Gray
Write-Host ""

$verifyArgs = if ($Quick) { '-Quick' } else { '' }
$verifyScript = Join-Path $SCRIPT_DIR "phase88-verify-kb.ps1"

try {
    & $verifyScript $verifyArgs
    $verifyExitCode = $LASTEXITCODE
} catch {
    Write-Host "⚠️  Verification error: $($_.Exception.Message)" -ForegroundColor Yellow
    $verifyExitCode = 1
}

Write-Host ""

# Summary
$totalEnd = Get-Date
$totalDuration = ($totalEnd - $totalStart).TotalMinutes

Write-Host "📊 Quick Start Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Total time: $([math]::Round($totalDuration, 2)) minutes" -ForegroundColor Yellow

if ($verifyExitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ Phase 88 setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Start FastMCP server:" -ForegroundColor Gray
    Write-Host "      node scripts/fastmcp-server.mjs" -ForegroundColor White
    Write-Host ""
    Write-Host "   2. Test knowledge_retrieve tool:" -ForegroundColor Gray
    Write-Host "      curl -X POST http://localhost:3002/function-call -H 'Content-Type: application/json' -d '{\"name\": \"knowledge_retrieve\", \"arguments\": {\"query\": \"Svelte 5 runes\"}}'" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Run autonomous error fixing:" -ForegroundColor Gray
    Write-Host "      node scripts/phase86-autonomous-loop.mjs" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Setup complete with warnings" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verification failed (pass rate below 60%)." -ForegroundColor Yellow
    Write-Host "This may be normal on first run before docs are fully indexed." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Retry verification in 5 minutes:" -ForegroundColor Cyan
    Write-Host "   .\scripts\phase88-verify-kb.ps1 -Full" -ForegroundColor White
    Write-Host ""
}

exit 0
