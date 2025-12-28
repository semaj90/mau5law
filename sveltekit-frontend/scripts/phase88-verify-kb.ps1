#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 88: Knowledge Base Verification Script

.DESCRIPTION
    Tests retrieval quality for Svelte 5, SvelteKit 2, Bits-UI, and other ingested docs.
    Validates that KB can answer common framework questions accurately.

.PARAMETER Quick
    Run quick test (3 queries only)

.PARAMETER Full
    Run comprehensive test suite (20+ queries across all frameworks)

.EXAMPLE
    .\scripts\phase88-verify-kb.ps1 -Quick
    # Fast verification (3 test queries)

.EXAMPLE
    .\scripts\phase88-verify-kb.ps1 -Full
    # Comprehensive test suite
#>

param(
    [switch]$Quick,
    [switch]$Full
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Configuration
$FASTMCP_URL = "http://localhost:3002"
$QDRANT_URL = $env:QDRANT_URL ?? "http://localhost:6333"
$COLLECTION = $env:QDRANT_COLLECTION ?? "phase76_knowledge_base"

Write-Host "`n🔍 Phase 88: Knowledge Base Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Collection: $COLLECTION" -ForegroundColor Yellow
Write-Host "Mode: $(if ($Full) { 'Full' } elseif ($Quick) { 'Quick' } else { 'Standard' })" -ForegroundColor Yellow
Write-Host ""

# Test queries
$testQueries = if ($Quick) {
    @(
        @{
            Query = 'Svelte 5 runes $state $derived $effect'
            ExpectedTags = @('svelte5', 'docs', 'runes')
            MinScore = 0.6
        },
        @{
            Query = 'SvelteKit 2 load function +page.server.ts actions'
            ExpectedTags = @('sveltekit2', 'docs')
            MinScore = 0.6
        },
        @{
            Query = 'Bits UI Dialog Svelte 5 headless components'
            ExpectedTags = @('bits-ui', 'svelte5')
            MinScore = 0.5
        }
    )
} elseif ($Full) {
    @(
        # Svelte 5
        @{ Query = 'Svelte 5 runes $state $derived $effect'; ExpectedTags = @('svelte5', 'runes'); MinScore = 0.6 },
        @{ Query = 'Svelte 5 component props $props bindable'; ExpectedTags = @('svelte5'); MinScore = 0.6 },
        @{ Query = 'Svelte 5 snippets children content slots'; ExpectedTags = @('svelte5'); MinScore = 0.5 },
        @{ Query = 'Svelte 5 migration from Svelte 4 export let'; ExpectedTags = @('svelte5'); MinScore = 0.5 },

        # SvelteKit 2
        @{ Query = 'SvelteKit 2 routing +page +layout file structure'; ExpectedTags = @('sveltekit2', 'routing'); MinScore = 0.6 },
        @{ Query = 'SvelteKit 2 load function server universal'; ExpectedTags = @('sveltekit2'); MinScore = 0.6 },
        @{ Query = 'SvelteKit 2 form actions progressive enhancement'; ExpectedTags = @('sveltekit2'); MinScore = 0.6 },
        @{ Query = 'SvelteKit 2 adapters deployment node vercel'; ExpectedTags = @('sveltekit2'); MinScore = 0.5 },

        # Bits UI
        @{ Query = 'Bits UI Dialog component Svelte 5 accessible'; ExpectedTags = @('bits-ui'); MinScore = 0.6 },
        @{ Query = 'Bits UI Dropdown Menu headless'; ExpectedTags = @('bits-ui'); MinScore = 0.5 },
        @{ Query = 'Bits UI Popover positioning'; ExpectedTags = @('bits-ui'); MinScore = 0.5 },

        # UnoCSS
        @{ Query = 'UnoCSS atomic utilities configuration'; ExpectedTags = @('unocss'); MinScore = 0.6 },
        @{ Query = 'UnoCSS presets icons shortcuts'; ExpectedTags = @('unocss'); MinScore = 0.5 },

        # Drizzle
        @{ Query = 'Drizzle ORM schema definition PostgreSQL'; ExpectedTags = @('drizzle', 'postgres'); MinScore = 0.6 },
        @{ Query = 'Drizzle ORM queries select where joins'; ExpectedTags = @('drizzle'); MinScore = 0.6 },
        @{ Query = 'Drizzle ORM migrations generate push'; ExpectedTags = @('drizzle'); MinScore = 0.5 },

        # PostgreSQL + pgvector
        @{ Query = 'PostgreSQL 17 performance indexes vacuum'; ExpectedTags = @('postgres17'); MinScore = 0.5 },
        @{ Query = 'pgvector cosine distance HNSW index'; ExpectedTags = @('pgvector'); MinScore = 0.6 },
        @{ Query = 'pgvector operators inner product L1 L2'; ExpectedTags = @('pgvector'); MinScore = 0.6 }
    )
} else {
    # Standard (10 queries)
    @(
        @{ Query = 'Svelte 5 runes $state $derived'; ExpectedTags = @('svelte5'); MinScore = 0.6 },
        @{ Query = 'SvelteKit 2 load function'; ExpectedTags = @('sveltekit2'); MinScore = 0.6 },
        @{ Query = 'Bits UI Dialog component'; ExpectedTags = @('bits-ui'); MinScore = 0.5 },
        @{ Query = 'UnoCSS atomic utilities'; ExpectedTags = @('unocss'); MinScore = 0.5 },
        @{ Query = 'Drizzle ORM schema'; ExpectedTags = @('drizzle'); MinScore = 0.6 },
        @{ Query = 'PostgreSQL 17 performance'; ExpectedTags = @('postgres17'); MinScore = 0.5 },
        @{ Query = 'pgvector HNSW index'; ExpectedTags = @('pgvector'); MinScore = 0.6 },
        @{ Query = 'Svelte 5 migration from Svelte 4'; ExpectedTags = @('svelte5'); MinScore = 0.5 },
        @{ Query = 'SvelteKit 2 form actions'; ExpectedTags = @('sveltekit2'); MinScore = 0.6 },
        @{ Query = 'Docker Compose networking'; ExpectedTags = @('docker'); MinScore = 0.5 }
    )
}

Write-Host "🧪 Running $($testQueries.Count) test queries..." -ForegroundColor Cyan
Write-Host ""

# Check FastMCP health
try {
    $health = Invoke-RestMethod -Uri "$FASTMCP_URL/health" -Method GET -TimeoutSec 5
    if ($health.ok) {
        Write-Host "✅ FastMCP: healthy ($($health.tools) tools)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  FastMCP: degraded" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FastMCP unreachable: $FASTMCP_URL" -ForegroundColor Red
    Write-Host "   Start with: node scripts/fastmcp-server.mjs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test loop
$results = @()

foreach ($test in $testQueries) {
    Write-Host "🔎 Query: $($test.Query)" -ForegroundColor Cyan
    Write-Host "   Expected tags: $($test.ExpectedTags -join ', ')" -ForegroundColor Gray

    try {
        # Call knowledge_retrieve tool
        $body = @{
            name = 'knowledge_retrieve'
            arguments = @{
                query = $test.Query
                limit = 5
                threshold = $test.MinScore
            }
        } | ConvertTo-Json -Depth 10

        $response = Invoke-RestMethod -Uri "$FASTMCP_URL/function-call" `
            -Method POST `
            -Body $body `
            -ContentType 'application/json' `
            -TimeoutSec 30

        # Parse results
        $contexts = $response.contexts
        $hitCount = $contexts.Count

        if ($hitCount -eq 0) {
            Write-Host "   ❌ No results (threshold too high or docs missing)" -ForegroundColor Red
            $results += @{
                Query = $test.Query
                Success = $false
                Hits = 0
                Reason = 'No results'
            }
            continue
        }

        # Check if any result has expected tags
        $hasExpectedTag = $false
        $topScore = 0

        foreach ($ctx in $contexts) {
            if ($ctx.score -gt $topScore) { $topScore = $ctx.score }

            foreach ($tag in $test.ExpectedTags) {
                if ($ctx.provenance.tags -contains $tag) {
                    $hasExpectedTag = $true
                    break
                }
            }
        }

        if ($hasExpectedTag) {
            Write-Host "   ✅ Pass: $hitCount results (top score: $([math]::Round($topScore, 3)))" -ForegroundColor Green
            $results += @{
                Query = $test.Query
                Success = $true
                Hits = $hitCount
                TopScore = $topScore
            }
        } else {
            Write-Host "   ⚠️  Partial: $hitCount results but missing expected tags" -ForegroundColor Yellow
            $results += @{
                Query = $test.Query
                Success = $false
                Hits = $hitCount
                TopScore = $topScore
                Reason = 'Missing expected tags'
            }
        }

    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            Query = $test.Query
            Success = $false
            Error = $_.Exception.Message
        }
    }

    Write-Host ""
}

# Summary
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Success }).Count
$failed = $results.Count - $passed
$passRate = [math]::Round(($passed / $results.Count) * 100, 1)

Write-Host "Pass rate: $passRate% ($passed / $($results.Count))" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } elseif ($passRate -ge 60) { 'Yellow' } else { 'Red' })

if ($failed -gt 0) {
    Write-Host "`n❌ Failed queries:" -ForegroundColor Red
    foreach ($result in ($results | Where-Object { -not $_.Success })) {
        $reason = $result.Reason ?? $result.Error ?? 'Unknown'
        Write-Host "   - $($result.Query): $reason" -ForegroundColor Gray
    }
}

# Recommendations
Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan

if ($passRate -lt 60) {
    Write-Host "   - Run ingestion scripts to populate KB:" -ForegroundColor Yellow
    Write-Host "     .\scripts\phase88-ingest-web-docs.ps1" -ForegroundColor Gray
    Write-Host "     .\scripts\phase88-ingest-repo-docs.ps1" -ForegroundColor Gray
} elseif ($passRate -lt 80) {
    Write-Host "   - Some docs may be missing. Re-run specific source ingestion:" -ForegroundColor Yellow
    Write-Host "     .\scripts\phase88-ingest-web-docs.ps1 -Source svelte5" -ForegroundColor Gray
} else {
    Write-Host "   ✅ KB is well-populated! Ready for autonomous agent usage." -ForegroundColor Green
}

Write-Host ""

# Check collection stats
try {
    $collInfo = Invoke-RestMethod -Uri "$QDRANT_URL/collections/$COLLECTION" -Method GET
    Write-Host "📊 Collection Stats:" -ForegroundColor Cyan
    Write-Host "   Total points: $($collInfo.result.points_count)" -ForegroundColor Gray
    Write-Host "   Indexed: $($collInfo.result.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not fetch collection stats" -ForegroundColor Yellow
}

Write-Host "`n✨ Verification complete!" -ForegroundColor Cyan
Write-Host ""

exit $(if ($passRate -ge 60) { 0 } else { 1 })
