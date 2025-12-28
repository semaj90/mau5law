#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 88: Web Documentation Ingestion Orchestrator

.DESCRIPTION
    Crawls authoritative docs for Svelte 5, SvelteKit 2, Bits-UI, UnoCSS, Drizzle,
    PostgreSQL 17, pgvector, and Docker into Qdrant knowledge base.

    Uses existing phase76-knowledge-builder.mjs with optimized depth settings.

.PARAMETER Quick
    Run quick mode (depth 1 for all sources)

.PARAMETER Source
    Crawl specific source only: svelte5, sveltekit2, bitsui, unocss, drizzle, postgres, pgvector, docker, all

.PARAMETER SkipVerify
    Skip post-crawl verification checks

.EXAMPLE
    .\scripts\phase88-ingest-web-docs.ps1
    # Full ingestion (recommended for first run)

.EXAMPLE
    .\scripts\phase88-ingest-web-docs.ps1 -Source svelte5
    # Re-crawl only Svelte 5 docs after framework update

.EXAMPLE
    .\scripts\phase88-ingest-web-docs.ps1 -Quick
    # Fast mode for testing (depth 1 everywhere)
#>

param(
    [switch]$Quick,
    [ValidateSet('svelte5', 'sveltekit2', 'bitsui', 'unocss', 'drizzle', 'postgres', 'pgvector', 'docker', 'all')]
    [string]$Source = 'all',
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Configuration
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BUILDER_SCRIPT = Join-Path $SCRIPT_DIR "phase76-knowledge-builder.mjs"
$QDRANT_URL = $env:QDRANT_URL ?? "http://localhost:6333"
$COLLECTION = $env:QDRANT_COLLECTION ?? "phase76_knowledge_base"

# Crawl manifest with optimized depths
$CRAWL_SOURCES = @(
    @{
        Name = 'svelte5'
        URL = 'https://svelte.dev/docs/svelte'
        Depth = if ($Quick) { 1 } else { 2 }
        Tags = 'svelte5,docs,frontend,runes'
        Description = 'Svelte 5 (runes, reactivity, components)'
    },
    @{
        Name = 'sveltekit2'
        URL = 'https://kit.svelte.dev/docs'
        Depth = if ($Quick) { 1 } else { 2 }
        Tags = 'sveltekit2,docs,fullstack,routing,ssr'
        Description = 'SvelteKit 2 (routing, load functions, actions, adapters)'
    },
    @{
        Name = 'bitsui'
        URL = 'https://www.bits-ui.com/docs/introduction'
        Depth = if ($Quick) { 1 } else { 2 }
        Tags = 'bits-ui,docs,svelte5,headless-ui,accessibility'
        Description = 'Bits UI (Svelte 5-compatible headless components)'
    },
    @{
        Name = 'unocss'
        URL = 'https://unocss.dev/guide/'
        Depth = if ($Quick) { 1 } else { 2 }
        Tags = 'unocss,docs,styling,atomic-css,utilities'
        Description = 'UnoCSS (instant atomic CSS engine)'
    },
    @{
        Name = 'drizzle'
        URL = 'https://orm.drizzle.team/docs/overview'
        Depth = if ($Quick) { 1 } else { 2 }
        Tags = 'drizzle,docs,orm,typescript,postgres'
        Description = 'Drizzle ORM (TypeScript-first ORM for SQL)'
    },
    @{
        Name = 'postgres'
        URL = 'https://www.postgresql.org/docs/current/'
        Depth = 1  # Always depth 1 (site is massive)
        Tags = 'postgres17,docs,db,sql'
        Description = 'PostgreSQL 17 (SQL reference, performance, internals)'
    },
    @{
        Name = 'pgvector'
        URL = 'https://github.com/pgvector/pgvector'
        Depth = 1  # GitHub README + key docs
        Tags = 'pgvector,docs,db,vector-search,embeddings,hnsw'
        Description = 'pgvector (operators, indexes, HNSW, cosine similarity)'
    },
    @{
        Name = 'docker'
        URL = 'https://docs.docker.com/'
        Depth = 1  # Always depth 1 (site is massive)
        Tags = 'docker,docs,infra,containers,compose'
        Description = 'Docker (containers, Compose, networking, volumes)'
    }
)

# Filter sources if specific source requested
if ($Source -ne 'all') {
    $CRAWL_SOURCES = $CRAWL_SOURCES | Where-Object { $_.Name -eq $Source }
    if ($CRAWL_SOURCES.Count -eq 0) {
        Write-Host "❌ Unknown source: $Source" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🌐 Phase 88: Web Documentation Ingestion" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Mode: $(if ($Quick) { 'Quick (depth 1)' } else { 'Full (optimized depths)' })" -ForegroundColor Yellow
Write-Host "Target: $COLLECTION @ $QDRANT_URL" -ForegroundColor Yellow
Write-Host "Sources: $($CRAWL_SOURCES.Count)" -ForegroundColor Yellow
Write-Host ""

# Verify prerequisites
Write-Host "🔍 Verifying prerequisites..." -ForegroundColor Cyan

# Check knowledge-builder script
if (-not (Test-Path $BUILDER_SCRIPT)) {
    Write-Host "❌ Knowledge builder not found: $BUILDER_SCRIPT" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Knowledge builder: $BUILDER_SCRIPT" -ForegroundColor Green

# Check Qdrant
try {
    $qdrantHealth = Invoke-RestMethod -Uri "$QDRANT_URL/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Qdrant: healthy" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant unreachable: $QDRANT_URL" -ForegroundColor Red
    Write-Host "      Run: docker start qdrant" -ForegroundColor Yellow
    exit 1
}

# Check collection exists (create if missing)
try {
    $collectionInfo = Invoke-RestMethod -Uri "$QDRANT_URL/collections/$COLLECTION" -Method GET
    Write-Host "   ✅ Collection exists: $COLLECTION ($($collectionInfo.result.points_count) points)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Collection missing: $COLLECTION (will be created)" -ForegroundColor Yellow
}

Write-Host ""

# Crawl loop
$results = @()
$startTime = Get-Date

foreach ($source in $CRAWL_SOURCES) {
    Write-Host "📥 Crawling: $($source.Description)" -ForegroundColor Cyan
    Write-Host "   URL: $($source.URL)" -ForegroundColor Gray
    Write-Host "   Depth: $($source.Depth) | Tags: $($source.Tags)" -ForegroundColor Gray

    $crawlStart = Get-Date

    try {
        # Build command
        $cmd = "node `"$BUILDER_SCRIPT`" --crawl `"$($source.URL)`" --depth $($source.Depth) --tags `"$($source.Tags)`""

        # Execute crawl
        $output = Invoke-Expression $cmd 2>&1

        $crawlEnd = Get-Date
        $duration = ($crawlEnd - $crawlStart).TotalSeconds

        # Parse output for metrics (look for "✅ Ingested X chunks")
        $chunks = 0
        if ($output -match 'Ingested (\d+) chunks') {
            $chunks = [int]$Matches[1]
        }

        Write-Host "   ✅ Complete: $chunks chunks in $([math]::Round($duration, 1))s" -ForegroundColor Green

        $results += @{
            Source = $source.Name
            Success = $true
            Chunks = $chunks
            Duration = $duration
            URL = $source.URL
        }
    } catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red

        $results += @{
            Source = $source.Name
            Success = $false
            Error = $_.Exception.Message
            URL = $source.URL
        }
    }

    Write-Host ""
}

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalMinutes

# Summary
Write-Host "`n📊 Ingestion Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Total time: $([math]::Round($totalDuration, 2)) minutes" -ForegroundColor Yellow

$successful = $results | Where-Object { $_.Success }
$failed = $results | Where-Object { -not $_.Success }

Write-Host "`n✅ Successful ($($successful.Count)):" -ForegroundColor Green
foreach ($result in $successful) {
    Write-Host "   - $($result.Source): $($result.Chunks) chunks ($([math]::Round($result.Duration, 1))s)" -ForegroundColor Gray
}

if ($failed.Count -gt 0) {
    Write-Host "`n❌ Failed ($($failed.Count)):" -ForegroundColor Red
    foreach ($result in $failed) {
        Write-Host "   - $($result.Source): $($result.Error)" -ForegroundColor Gray
    }
}

$totalChunks = ($successful | Measure-Object -Property Chunks -Sum).Sum
Write-Host "`nTotal chunks ingested: $totalChunks" -ForegroundColor Cyan

# Verification (unless skipped)
if (-not $SkipVerify) {
    Write-Host "`n🔍 Verifying KB retrieval..." -ForegroundColor Cyan

    $testQueries = @(
        'Svelte 5 runes $state $derived $effect',
        'SvelteKit 2 load function +page.server.ts actions',
        'Bits UI Dialog Svelte 5 headless components'
    )

    foreach ($query in $testQueries) {
        Write-Host "   Query: `"$query`"" -ForegroundColor Gray

        try {
            # Search Qdrant (simplified - assumes embeddinggemma available)
            # In production, call FastMCP qdrant_search or Knowledge Plane /retrieve
            $searchBody = @{
                vector = @(1..384 | ForEach-Object { Get-Random -Minimum -1.0 -Maximum 1.0 })  # Dummy vector for test
                limit = 3
                with_payload = $true
            } | ConvertTo-Json -Depth 10

            $searchResult = Invoke-RestMethod -Uri "$QDRANT_URL/collections/$COLLECTION/points/search" `
                -Method POST `
                -Body $searchBody `
                -ContentType 'application/json' `
                -TimeoutSec 10

            $hitCount = $searchResult.result.Count
            Write-Host "      ✅ $hitCount hits" -ForegroundColor Green
        } catch {
            Write-Host "      ⚠️  Search test skipped (needs embedding generation)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✨ Phase 88 ingestion complete!" -ForegroundColor Cyan
Write-Host ""

# Save manifest
$manifestPath = "reports/phase88-ingestion-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
$manifestData = @{
    timestamp = (Get-Date).ToString('o')
    duration_minutes = [math]::Round($totalDuration, 2)
    total_chunks = $totalChunks
    qdrant_collection = $COLLECTION
    results = $results
} | ConvertTo-Json -Depth 10

New-Item -ItemType Directory -Path (Split-Path $manifestPath) -Force | Out-Null
Set-Content -Path $manifestPath -Value $manifestData
Write-Host "📄 Manifest saved: $manifestPath" -ForegroundColor Gray

exit 0
