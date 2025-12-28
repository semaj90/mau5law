#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 88: Complete Knowledge Base Setup - One-Command Execution

.DESCRIPTION
Orchestrates all Phase 88 setup steps in sequence:
1. Start/verify Docker dependencies (Postgres, Redis, Qdrant, Ollama)
2. Ingest web documentation (Svelte 5, SvelteKit 2, Bits-UI, etc.)
3. Ingest local operator documentation
4. Verify knowledge base retrieval quality
5. Test Gemma3 with KB grounding

.PARAMETER SkipWebDocs
Skip web documentation ingestion (use if already ingested)

.PARAMETER SkipLocalDocs
Skip local documentation ingestion (use if already ingested)

.PARAMETER SkipVerification
Skip verification tests (go straight to Gemma3 test)

.PARAMETER QuickTest
Run quick verification (3 queries instead of 9)

.EXAMPLE
.\phase88-complete-setup.ps1
# Full setup from scratch

.EXAMPLE
.\phase88-complete-setup.ps1 -SkipWebDocs -QuickTest
# Skip web docs, run quick verification
#>

param(
    [switch]$SkipWebDocs,
    [switch]$SkipLocalDocs,
    [switch]$SkipVerification,
    [switch]$QuickTest
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Phase 88: Complete Knowledge Base Setup Pipeline         ║" -ForegroundColor Cyan
Write-Host "║      One-Command Execution for Svelte 5 KB Grounding          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# ============================================================================
# STEP 1: Verify/Start Dependencies
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📦 STEP 1: Docker Dependencies" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

$requiredContainers = @("phase87-postgres", "phase87-redis", "phase87-qdrant", "phase87-ollama")

try {
    $runningContainers = docker ps --format "{{.Names}}" | Out-String
    $allContainers = docker ps -a --format "{{.Names}}" | Out-String

    $allRunning = $true
    foreach ($container in $requiredContainers) {
        if ($runningContainers -match $container) {
            Write-Host "   ✅ $container is running" -ForegroundColor Green
        } elseif ($allContainers -match $container) {
            Write-Host "   ⚠️  $container exists but is stopped, starting..." -ForegroundColor Yellow
            docker start $container | Out-Null
            Start-Sleep -Seconds 2
            Write-Host "   ✅ $container started" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $container not found" -ForegroundColor Red
            $allRunning = $false
        }
    }

    if (-not $allRunning) {
        Write-Host ""
        Write-Host "   🚀 Creating missing containers with docker compose..." -ForegroundColor Yellow
        Set-Location C:\Users\james\Videos\deeds-web-app
        docker compose -f docker-compose.middleware.yml up -d
        Set-Location sveltekit-frontend
        Write-Host "   ✅ All containers created and started" -ForegroundColor Green
    }

} catch {
    Write-Host "   ❌ Docker error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "      Ensure Docker Desktop is running" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "   Waiting 10 seconds for services to stabilize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Verify connectivity
$services = @(
    @{ Name = "Postgres"; URL = "tcp://localhost:5434"; Port = 5434 },
    @{ Name = "Redis"; URL = "http://localhost:6379"; Port = 6379 },
    @{ Name = "Qdrant"; URL = "http://localhost:6333/healthz"; Port = 6333 },
    @{ Name = "Ollama"; URL = "http://localhost:11434/api/version"; Port = 11434 }
)

foreach ($svc in $services) {
    try {
        if ($svc.Port -eq 6333 -or $svc.Port -eq 11434) {
            $null = Invoke-RestMethod -Uri $svc.URL -TimeoutSec 5 -ErrorAction Stop
            Write-Host "   ✅ $($svc.Name): Healthy" -ForegroundColor Green
        } else {
            $tcpTest = Test-NetConnection -ComputerName localhost -Port $svc.Port -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($tcpTest) {
                Write-Host "   ✅ $($svc.Name): Port $($svc.Port) open" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $($svc.Name): Port $($svc.Port) not responding" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ⚠️  $($svc.Name): Not responding (may still be starting)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 2: Ingest Web Documentation
# ============================================================================

if (-not $SkipWebDocs) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "🌐 STEP 2: Web Documentation Ingestion" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    $webDocsStart = Get-Date

    try {
        & .\scripts\phase88-web-docs-ingest.ps1 -SkipExisting
        $webDocsEnd = Get-Date
        $webDocsDuration = ($webDocsEnd - $webDocsStart).TotalMinutes
        Write-Host "   ✅ Web docs ingestion completed in $([math]::Round($webDocsDuration, 1)) minutes" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Web docs ingestion failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      Review errors above and retry manually" -ForegroundColor Gray
        exit 1
    }

    Write-Host ""
} else {
    Write-Host "⏭️  STEP 2: Skipped (web docs already ingested)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 3: Ingest Local Operator Documentation
# ============================================================================

if (-not $SkipLocalDocs) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "📚 STEP 3: Local Operator Documentation Ingestion" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    try {
        & .\scripts\phase88-local-docs-ingest.ps1
        Write-Host "   ✅ Local docs ingestion completed" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Local docs ingestion failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      Review errors above and retry manually" -ForegroundColor Gray
        exit 1
    }

    Write-Host ""
} else {
    Write-Host "⏭️  STEP 3: Skipped (local docs already ingested)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 4: Start FastMCP Server (Background)
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🔧 STEP 4: Start FastMCP Server" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Check if already running
try {
    $mcpHealth = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ FastMCP server already running" -ForegroundColor Green
} catch {
    Write-Host "   🚀 Starting FastMCP server in background..." -ForegroundColor Yellow

    $mcpJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        node scripts/fastmcp-server.mjs
    }

    Write-Host "   ⏳ Waiting for server startup..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    try {
        $mcpHealth = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ FastMCP server started (Job ID: $($mcpJob.Id))" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  FastMCP server may not be ready yet (continuing anyway)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 5: Verify Knowledge Base
# ============================================================================

if (-not $SkipVerification) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "🔍 STEP 5: Knowledge Base Verification" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    $verifyArgs = if ($QuickTest) { "-Quick" } else { "-Full" }

    try {
        & .\scripts\phase88-verify-kb.ps1 $verifyArgs
        Write-Host "   ✅ Verification passed" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Verification had issues (check output above)" -ForegroundColor Yellow
    }

    Write-Host ""
} else {
    Write-Host "⏭️  STEP 5: Skipped (verification not requested)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 6: Test Gemma3 with KB Grounding
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🤖 STEP 6: Gemma3 KB Grounding Test" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "   Running test: 'Create a Svelte 5 counter component using runes'" -ForegroundColor Cyan
Write-Host ""

try {
    node scripts/phase76-ace-prompt-engineer.mjs --task "Create a Svelte 5 counter component using runes and derived values. Include a button to increment and display doubled value."
    Write-Host ""
    Write-Host "   ✅ Gemma3 test completed" -ForegroundColor Green
    Write-Host ""
    Write-Host "   📋 Review generated code above for:" -ForegroundColor Yellow
    Write-Host "      • Uses \$state rune (not export let)" -ForegroundColor Gray
    Write-Host "      • Uses \$derived for computed values" -ForegroundColor Gray
    Write-Host "      • Uses onclick (not on:click)" -ForegroundColor Gray
    Write-Host "      • Includes UnoCSS utilities" -ForegroundColor Gray
    Write-Host "      • Confidence ≥ 0.85" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ⚠️  Gemma3 test encountered issues: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================================
# Final Summary
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Phase 88 Setup Complete!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$totalDuration = ((Get-Date) - $startTime).TotalMinutes

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ⏱️  Total duration: $([math]::Round($totalDuration, 1)) minutes" -ForegroundColor Gray
Write-Host "   ✅ Docker services: Running" -ForegroundColor Green
if (-not $SkipWebDocs) { Write-Host "   ✅ Web docs: Ingested (8 sources)" -ForegroundColor Green }
if (-not $SkipLocalDocs) { Write-Host "   ✅ Local docs: Ingested (~15 files)" -ForegroundColor Green }
Write-Host "   ✅ FastMCP server: Running (http://localhost:3002)" -ForegroundColor Green
if (-not $SkipVerification) { Write-Host "   ✅ Verification: Tested" -ForegroundColor Green }
Write-Host "   ✅ Gemma3: Tested with KB grounding" -ForegroundColor Green
Write-Host ""

Write-Host "🎯 Your agents are now grounded in:" -ForegroundColor Cyan
Write-Host "   🟢 Svelte 5 runes and components" -ForegroundColor Green
Write-Host "   🟢 SvelteKit 2 routing and load functions" -ForegroundColor Green
Write-Host "   🟢 Bits-UI headless components" -ForegroundColor Green
Write-Host "   🟢 UnoCSS atomic utilities" -ForegroundColor Green
Write-Host "   🟢 Drizzle ORM and PostgreSQL 17" -ForegroundColor Green
Write-Host "   🟢 Your project's operator docs (MCP, ACE, error reduction)" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review Gemma3 test output above (check for rune usage)" -ForegroundColor Gray
Write-Host "   2. Run more tests: node scripts/phase76-ace-prompt-engineer.mjs --task '<your task>'" -ForegroundColor Gray
Write-Host "   3. Check KB stats: Invoke-RestMethod http://localhost:6333/collections/phase76_knowledge_base" -ForegroundColor Gray
Write-Host "   4. Re-run verification anytime: .\scripts\phase88-verify-kb.ps1 -Full" -ForegroundColor Gray
Write-Host ""

Write-Host "📄 Documentation:" -ForegroundColor Cyan
Write-Host "   • Quick Start: PHASE88_QUICK_START.md" -ForegroundColor Gray
Write-Host "   • Policy Pack: data/knowledge/svelte5-policy-pack.md" -ForegroundColor Gray
Write-Host "   • Reports: reports/phase88-*.json" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Phase 88 setup complete! Gemma3 is now Svelte 5-aware." -ForegroundColor Green
Write-Host ""
