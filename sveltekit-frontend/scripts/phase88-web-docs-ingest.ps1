#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 88: Comprehensive Web Documentation Ingestion Pipeline

.DESCRIPTION
Orchestrates crawling and ingestion of authoritative documentation:
- Svelte 5 (runes, components, reactivity)
- SvelteKit 2 (routing, load functions, actions)
- Bits-UI v2 (Svelte 5 headless UI)
- UnoCSS (atomic CSS)
- Drizzle ORM 0.44+ (PostgreSQL)
- PostgreSQL 17 (pgvector, HNSW)
- Docker (containerization)

All docs land in Qdrant phase76_knowledge_base with proper tags for retrieval.

.PARAMETER DryRun
Show what would be crawled without actually crawling

.PARAMETER SkipExisting
Skip URLs that already have chunks in Qdrant

.PARAMETER Depth
Override default depth for all crawls (default: varies by source)

.EXAMPLE
.\phase88-web-docs-ingest.ps1
.\phase88-web-docs-ingest.ps1 -DryRun
.\phase88-web-docs-ingest.ps1 -SkipExisting -Depth 2
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,

    [Parameter(Mandatory=$false)]
    [switch]$SkipExisting,

    [Parameter(Mandatory=$false)]
    [int]$Depth = 0  # 0 = use per-source defaults
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Phase 88: Web Documentation Ingestion Pipeline           ║" -ForegroundColor Cyan
Write-Host "║      Svelte 5 / SvelteKit 2 / Bits-UI / UnoCSS / Drizzle      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Configuration: Crawl Targets
# ============================================================================

$crawlTargets = @(
    @{
        Name = "Svelte 5 Core Docs"
        Url = "https://svelte.dev/docs/svelte"
        Depth = 2
        Tags = "svelte5,docs,frontend,runes,reactivity"
        Priority = 1
        Description = "Svelte 5 runes, components, reactivity primitives"
    },
    @{
        Name = "SvelteKit 2 Docs"
        Url = "https://kit.svelte.dev/docs"
        Depth = 2
        Tags = "sveltekit2,docs,fullstack,routing,load-functions,actions"
        Priority = 1
        Description = "SvelteKit 2 routing, load functions, form actions, server-side"
    },
    @{
        Name = "Bits-UI (Svelte 5 Headless)"
        Url = "https://www.bits-ui.com/docs/introduction"
        Depth = 2
        Tags = "bits-ui,docs,svelte5,headless-ui,components"
        Priority = 1
        Description = "Bits-UI v2 headless components for Svelte 5"
    },
    @{
        Name = "UnoCSS Docs"
        Url = "https://unocss.dev/guide/"
        Depth = 2
        Tags = "unocss,docs,styling,atomic-css,utilities"
        Priority = 2
        Description = "UnoCSS atomic CSS engine with presets"
    },
    @{
        Name = "Drizzle ORM Docs"
        Url = "https://orm.drizzle.team/docs/overview"
        Depth = 2
        Tags = "drizzle,docs,orm,postgres,sql,migrations"
        Priority = 1
        Description = "Drizzle ORM 0.44+ for PostgreSQL with type-safety"
    },
    @{
        Name = "PostgreSQL 17 Docs"
        Url = "https://www.postgresql.org/docs/current/"
        Depth = 1
        Tags = "postgres17,docs,db,sql,indexing"
        Priority = 2
        Description = "PostgreSQL 17 core documentation (depth 1 to avoid explosion)"
    },
    @{
        Name = "pgvector Extension Docs"
        Url = "https://github.com/pgvector/pgvector"
        Depth = 1
        Tags = "pgvector,docs,db,embeddings,hnsw,cosine"
        Priority = 1
        Description = "pgvector operators, indexes, HNSW performance tuning"
    },
    @{
        Name = "Docker Docs"
        Url = "https://docs.docker.com/"
        Depth = 1
        Tags = "docker,docs,infra,containers,compose"
        Priority = 3
        Description = "Docker CLI, Compose, best practices (depth 1 to stay focused)"
    }
)

# ============================================================================
# Pre-Flight Checks
# ============================================================================

Write-Host "1️⃣ Pre-flight checks..." -ForegroundColor Yellow
Write-Host ""

# Check if knowledge-builder script exists
$builderScript = Join-Path $PSScriptRoot "phase76-knowledge-builder.mjs"
if (-not (Test-Path $builderScript)) {
    Write-Host "   ❌ Missing: $builderScript" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Knowledge builder: $builderScript" -ForegroundColor Green

# Check Qdrant connectivity
$qdrantUrl = $env:QDRANT_URL ?? "http://localhost:6333"
try {
    $qdrantHealth = Invoke-RestMethod -Uri "$qdrantUrl/healthz" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Qdrant: $qdrantUrl (healthy)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant not reachable at $qdrantUrl" -ForegroundColor Red
    Write-Host "      Start with: docker compose -f docker-compose.middleware.yml up -d qdrant" -ForegroundColor Gray
    exit 1
}

# Check Ollama connectivity (for embeddings)
$ollamaUrl = $env:OLLAMA_URL ?? "http://localhost:11434"
try {
    $ollamaVersion = Invoke-RestMethod -Uri "$ollamaUrl/api/version" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Ollama: $ollamaUrl (version $($ollamaVersion.version))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Ollama not reachable at $ollamaUrl (embeddings may fail)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Execution Plan
# ============================================================================

Write-Host "2️⃣ Crawl execution plan:" -ForegroundColor Yellow
Write-Host ""

$totalTargets = $crawlTargets.Count
$priorityGroups = $crawlTargets | Group-Object -Property Priority | Sort-Object Name

foreach ($group in $priorityGroups) {
    $priorityName = switch ($group.Name) {
        "1" { "Critical (P1)" }
        "2" { "High (P2)" }
        "3" { "Low (P3)" }
        default { "Priority $($group.Name)" }
    }

    Write-Host "   📊 $priorityName - $($group.Count) target(s)" -ForegroundColor Cyan
    foreach ($target in $group.Group) {
        $depthDisplay = if ($Depth -gt 0) { $Depth } else { $target.Depth }
        Write-Host "      • $($target.Name)" -ForegroundColor Gray
        Write-Host "        URL: $($target.Url)" -ForegroundColor DarkGray
        Write-Host "        Depth: $depthDisplay | Tags: $($target.Tags)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "   Total: $totalTargets crawl targets" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "   🔍 DRY RUN MODE - No crawls will be executed" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# ============================================================================
# Crawl Execution
# ============================================================================

Write-Host "3️⃣ Starting crawls..." -ForegroundColor Yellow
Write-Host ""

$results = @()
$successCount = 0
$failureCount = 0
$skippedCount = 0

foreach ($target in ($crawlTargets | Sort-Object Priority)) {
    $startTime = Get-Date
    $targetDepth = if ($Depth -gt 0) { $Depth } else { $target.Depth }

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "📚 $($target.Name)" -ForegroundColor Cyan
    Write-Host "   URL: $($target.Url)" -ForegroundColor Gray
    Write-Host "   Depth: $targetDepth | Tags: $($target.Tags)" -ForegroundColor Gray
    Write-Host ""

    # Check if already ingested (if SkipExisting enabled)
    if ($SkipExisting) {
        try {
            $qdrantCollection = $env:QDRANT_COLLECTION ?? "phase76_knowledge_base"
            $searchBody = @{
                filter = @{
                    must = @(
                        @{
                            key = "url"
                            match = @{ value = $target.Url }
                        }
                    )
                }
                limit = 1
            } | ConvertTo-Json -Depth 10

            $existingCheck = Invoke-RestMethod -Uri "$qdrantUrl/collections/$qdrantCollection/points/scroll" `
                -Method Post -Body $searchBody -ContentType "application/json" -ErrorAction Stop

            if ($existingCheck.result.points.Count -gt 0) {
                Write-Host "   ⏭️  Skipping: Already ingested ($($existingCheck.result.points.Count) chunks found)" -ForegroundColor Yellow
                $skippedCount++
                $results += @{
                    Name = $target.Name
                    Status = "Skipped"
                    Reason = "Already ingested"
                }
                Write-Host ""
                continue
            }
        } catch {
            Write-Host "   ⚠️  Could not check existing chunks: $($_.Exception.Message)" -ForegroundColor Yellow
            # Continue with crawl anyway
        }
    }

    # Execute crawl
    try {
        $crawlCmd = "node `"$builderScript`" --crawl `"$($target.Url)`" --depth $targetDepth --tags `"$($target.Tags)`""
        Write-Host "   🚀 Executing: $crawlCmd" -ForegroundColor DarkGray
        Write-Host ""

        $output = Invoke-Expression $crawlCmd 2>&1

        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds

        # Check for success indicators in output
        $outputStr = $output | Out-String
        if ($outputStr -match "✅|SUCCESS|completed|ingested") {
            Write-Host "   ✅ SUCCESS - Duration: $([math]::Round($duration, 2))s" -ForegroundColor Green
            $successCount++
            $results += @{
                Name = $target.Name
                Status = "Success"
                Duration = $duration
                Output = $outputStr.Substring(0, [Math]::Min(500, $outputStr.Length))
            }
        } else {
            Write-Host "   ⚠️  UNCERTAIN - Check output above" -ForegroundColor Yellow
            $results += @{
                Name = $target.Name
                Status = "Uncertain"
                Duration = $duration
                Output = $outputStr.Substring(0, [Math]::Min(500, $outputStr.Length))
            }
        }

    } catch {
        Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failureCount++
        $results += @{
            Name = $target.Name
            Status = "Failed"
            Error = $_.Exception.Message
        }
    }

    Write-Host ""
}

# ============================================================================
# Summary Report
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                      Ingestion Summary                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Results:" -ForegroundColor Cyan
Write-Host "   ✅ Success: $successCount" -ForegroundColor Green
Write-Host "   ❌ Failed: $failureCount" -ForegroundColor Red
Write-Host "   ⏭️  Skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "   📈 Total: $totalTargets" -ForegroundColor Cyan
Write-Host ""

# Show failed targets
if ($failureCount -gt 0) {
    Write-Host "❌ Failed targets:" -ForegroundColor Red
    foreach ($result in ($results | Where-Object { $_.Status -eq "Failed" })) {
        Write-Host "   • $($result.Name): $($result.Error)" -ForegroundColor Red
    }
    Write-Host ""
}

# Save report
$reportPath = Join-Path $PSScriptRoot "..\reports\phase88-web-docs-ingest-report.json"
$reportDir = Split-Path $reportPath -Parent
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportData = @{
    timestamp = (Get-Date).ToString("o")
    summary = @{
        total = $totalTargets
        success = $successCount
        failed = $failureCount
        skipped = $skippedCount
    }
    results = $results
} | ConvertTo-Json -Depth 10

$reportData | Set-Content -Path $reportPath -Encoding UTF8
Write-Host "📄 Report saved: $reportPath" -ForegroundColor Cyan
Write-Host ""

# Exit with success if all critical (P1) targets succeeded
$criticalTargets = $crawlTargets | Where-Object { $_.Priority -eq 1 }
$criticalResults = $results | Where-Object { $_.Status -eq "Success" -and $_.Name -in $criticalTargets.Name }

if ($criticalResults.Count -eq $criticalTargets.Count) {
    Write-Host "✅ All critical documentation ingested successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: .\scripts\phase88-local-docs-ingest.ps1" -ForegroundColor Gray
    Write-Host "2. Verify KB: .\scripts\phase88-verify-kb.ps1" -ForegroundColor Gray
    Write-Host "3. Test Gemma3: node scripts/phase76-ace-prompt-engineer.mjs --task 'Explain Svelte 5 runes'" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "⚠️  Some critical documentation failed to ingest" -ForegroundColor Yellow
    Write-Host "   Review errors above and retry failed targets manually" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
