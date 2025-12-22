#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 79: Agentic Repair Loop - Autonomous Error Fixing

.DESCRIPTION
Orchestrates the Phase 79 autonomous agent that:
1. Fetches high-risk error suggestions from Phase 78
2. Applies code patches with backup/rollback
3. Verifies fixes using svelte-check
4. Learns from successes and failures

This is the "Cognitive System" - the agent that acts and learns.

.PARAMETER DryRun
Run in dry-run mode (no files modified)

.PARAMETER Limit
Number of patches to process per run (default: 1)

.PARAMETER SkipDependencies
Skip dependency installation check

.EXAMPLE
.\scripts\run-phase79-agent.ps1
Processes 1 patch with live file modifications

.EXAMPLE
.\scripts\run-phase79-agent.ps1 -DryRun -Limit 5
Simulates processing 5 patches without modifying files
#>

param(
    [switch]$DryRun,
    [int]$Limit = 1,
    [switch]$SkipDependencies,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🤖 PHASE 79: AGENTIC REPAIR LOOP                       ║" -ForegroundColor Cyan
Write-Host "║   Autonomous Error Fixing with Learning                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "📋 Pre-flight Checks" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# 1. Check PostgreSQL connection
Write-Host "  1. PostgreSQL Connection..." -ForegroundColor Gray
$pgTest = psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM error_suggestions WHERE applied = false;" -t 2>&1

if ($LASTEXITCODE -eq 0) {
    $pendingCount = $pgTest.Trim()
    Write-Host "     ✅ PostgreSQL connected" -ForegroundColor Green
    Write-Host "     📊 Pending suggestions: $pendingCount" -ForegroundColor Cyan
} else {
    Write-Host "     ❌ PostgreSQL connection failed" -ForegroundColor Red
    Write-Host "     💡 Ensure PostgreSQL is running and Phase 78 tables exist`n" -ForegroundColor Gray
    exit 1
}

# 2. Check .env configuration
Write-Host "  2. Environment Configuration..." -ForegroundColor Gray
if (Test-Path ".env") {
    $envContent = Get-Content .env -Raw

    $hasDbUrl = $envContent -match "DATABASE_URL"
    $hasGemini = $envContent -match "GEMINI_API_KEY"

    if ($hasDbUrl) {
        Write-Host "     ✅ DATABASE_URL configured" -ForegroundColor Green
    } else {
        Write-Host "     ⚠️  DATABASE_URL not found in .env" -ForegroundColor Yellow
    }

    if ($hasGemini) {
        Write-Host "     ✅ GEMINI_API_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "     ⚠️  GEMINI_API_KEY not configured (optional for LLM-powered patch generation)" -ForegroundColor Yellow
    }
} else {
    Write-Host "     ⚠️  No .env file found" -ForegroundColor Yellow
    Write-Host "     💡 Copy .env.example to .env and configure DATABASE_URL" -ForegroundColor Gray
}

# 3. Check dependencies
if (-not $SkipDependencies) {
    Write-Host "  3. Node Dependencies..." -ForegroundColor Gray

    $requiredPackages = @(
        "drizzle-orm",
        "postgres",
        "chalk"
    )

    $missingPackages = @()

    foreach ($pkg in $requiredPackages) {
        $installed = npm list $pkg --depth=0 2>&1 | Select-String -Pattern $pkg -Quiet
        if (-not $installed) {
            $missingPackages += $pkg
        }
    }

    if ($missingPackages.Count -gt 0) {
        Write-Host "     ⚠️  Missing packages: $($missingPackages -join ', ')" -ForegroundColor Yellow
        Write-Host "     📦 Installing dependencies..." -ForegroundColor Gray
        npm install --legacy-peer-deps
        Write-Host "     ✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "     ✅ All dependencies installed" -ForegroundColor Green
    }
} else {
    Write-Host "  3. Skipping dependency check..." -ForegroundColor Gray
}

# 4. Check for pending suggestions
Write-Host "`n  4. Analyzing Pending Tasks..." -ForegroundColor Gray

$suggestionStats = psql -h localhost -U legal_admin -d legal_ai_db -c "
SELECT
    risk_level,
    COUNT(*) as count
FROM error_suggestions
WHERE applied = false
GROUP BY risk_level
ORDER BY
    CASE risk_level
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
    END;
" -t 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "     📊 Unapplied Suggestions by Risk Level:" -ForegroundColor Cyan
    Write-Host $suggestionStats -ForegroundColor White
} else {
    Write-Host "     ⚠️  Could not query suggestion statistics" -ForegroundColor Yellow
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# AGENT EXECUTION
# ═══════════════════════════════════════════════════════════

Write-Host "🚀 Launching Agent" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$agentArgs = @()

if ($DryRun) {
    $agentArgs += "--dry-run"
    Write-Host "  Mode: ${env:ESC}[33mDRY RUN${env:ESC}[0m (no files will be modified)" -ForegroundColor Yellow
} else {
    Write-Host "  Mode: ${env:ESC}[31mLIVE${env:ESC}[0m (files will be modified with backups)" -ForegroundColor Red
}

if ($Limit -gt 0) {
    $agentArgs += "--limit=$Limit"
    Write-Host "  Limit: $Limit task(s) per run" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  Executing: npx tsx scripts/phase79-agentic-repair.mts $($agentArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

# Run the agent
npx tsx scripts/phase79-agentic-repair.mts @agentArgs

$agentExitCode = $LASTEXITCODE

# ═══════════════════════════════════════════════════════════
# POST-EXECUTION SUMMARY
# ═══════════════════════════════════════════════════════════

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📊 POST-EXECUTION SUMMARY                               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($agentExitCode -eq 0) {
    Write-Host "  ✅ Agent execution completed successfully`n" -ForegroundColor Green

    # Show updated statistics
    Write-Host "  📊 Updated Statistics:" -ForegroundColor Yellow

    $appliedCount = psql -h localhost -U legal_admin -d legal_ai_db -c "
    SELECT COUNT(*) FROM error_suggestions WHERE applied = true;
    " -t 2>&1

    $remainingCount = psql -h localhost -U legal_admin -d legal_ai_db -c "
    SELECT COUNT(*) FROM error_suggestions WHERE applied = false;
    " -t 2>&1

    Write-Host "     Applied:   $($appliedCount.Trim())" -ForegroundColor Green
    Write-Host "     Remaining: $($remainingCount.Trim())" -ForegroundColor Yellow

    # Show recent successes
    Write-Host "`n  🎯 Recently Applied Fixes:" -ForegroundColor Yellow

    psql -h localhost -U legal_admin -d legal_ai_db -c "
    SELECT
        route_path,
        risk_level,
        LEFT(summary, 60) as summary,
        applied_at
    FROM error_suggestions
    WHERE applied = true
    ORDER BY applied_at DESC
    LIMIT 5;
    " 2>&1

} else {
    Write-Host "  ❌ Agent execution failed (exit code: $agentExitCode)`n" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════
# NEXT STEPS
# ═══════════════════════════════════════════════════════════

Write-Host "`n📚 Next Steps:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if (-not $DryRun) {
    Write-Host "  1. Review modified files with backups (*.phase79.bak)" -ForegroundColor Gray
    Write-Host "  2. Re-run error collection: npm run import:errors" -ForegroundColor Gray
    Write-Host "  3. Generate fresh suggestions: npm run phase78:suggest" -ForegroundColor Gray
    Write-Host "  4. Run agent again with higher limit: .\scripts\run-phase79-agent.ps1 -Limit 5" -ForegroundColor Gray
} else {
    Write-Host "  1. Review dry-run output above" -ForegroundColor Gray
    Write-Host "  2. Run in LIVE mode: .\scripts\run-phase79-agent.ps1" -ForegroundColor Gray
    Write-Host "  3. Increase limit for batch processing: .\scripts\run-phase79-agent.ps1 -Limit 10" -ForegroundColor Gray
}

Write-Host "`n  💡 Phase 80 Preview: Build documentation crawler for continuous learning" -ForegroundColor Cyan
Write-Host "     - Google Alerts integration" -ForegroundColor Gray
Write-Host "     - TypeScript/Svelte 5/Go 1.25 docs crawler" -ForegroundColor Gray
Write-Host "     - RAG-powered patch suggestions`n" -ForegroundColor Gray

exit $agentExitCode
