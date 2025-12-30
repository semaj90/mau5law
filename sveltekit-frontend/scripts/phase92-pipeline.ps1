#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 92: Complete Timeline Pipeline
    Postgres → LangExtract → EmbeddingGemma → Qdrant → Smart Search
#>

param(
    [switch]$CreateCollection,
    [switch]$ProcessEvents,
    [switch]$TestSearch,
    [switch]$FullPipeline,
    [int]$EventLimit = 50,
    [switch]$EnableQuantization
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Phase 92: Timeline Pipeline Orchestrator" -ForegroundColor Cyan
Write-Host ("=" * 70)

$python = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

# Step 1: Create Timeline Collection (with optional quantization)
if ($CreateCollection -or $FullPipeline) {
    Write-Host "`n📦 Step 1: Creating Timeline Collection" -ForegroundColor Yellow
    Write-Host "   → phase92-timeline-collection.py"

    if ($EnableQuantization) {
        Write-Host "   → Quantization: ENABLED (INT8, MRL-friendly)" -ForegroundColor Green
        & $python scripts/phase92-timeline-collection.py --quantize
    } else {
        Write-Host "   → Quantization: DISABLED (Full FP32)" -ForegroundColor Yellow
        & $python scripts/phase92-timeline-collection.py
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Collection creation failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Timeline collection ready" -ForegroundColor Green
}

# Step 2: Process Events (Postgres → LangExtract → Qdrant)
if ($ProcessEvents -or $FullPipeline) {
    Write-Host "`n🔄 Step 2: Processing Timeline Events" -ForegroundColor Yellow
    Write-Host "   → Postgres events → LangExtract → EmbeddingGemma → Qdrant"
    Write-Host "   → Limit: $EventLimit events"

    & $python scripts/phase92-timeline-embedder.py --limit $EventLimit

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Event processing failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Events embedded and indexed" -ForegroundColor Green
}

# Step 3: Test Smart Search
if ($TestSearch -or $FullPipeline) {
    Write-Host "`n🔍 Step 3: Testing Smart Search" -ForegroundColor Yellow
    Write-Host "   → Hierarchical filtering + vector search"

    & $python scripts/phase92-smart-search.py

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Search test failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Smart search validated" -ForegroundColor Green
}

# Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "📊 Pipeline Summary" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Check Qdrant collection stats
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase92_timeline_events" -Method GET
    $points = $stats.result.points_count
    $vectors = $stats.result.vectors_count

    Write-Host "`n✅ Qdrant Collection: phase92_timeline_events" -ForegroundColor Green
    Write-Host "   Points: $points"
    Write-Host "   Vectors: $vectors"
} catch {
    Write-Host "`n⚠️  Collection not yet created" -ForegroundColor Yellow
}

# Check Postgres event count
try {
    $pgCount = docker exec phase66-postgres psql -U user -d legal -t -c "SELECT COUNT(*) FROM phase89_qdrant_events;" 2>$null
    if ($pgCount) {
        Write-Host "`n✅ Postgres Events: $($pgCount.Trim())" -ForegroundColor Green
    }
} catch {
    Write-Host "`n⚠️  Postgres check failed" -ForegroundColor Yellow
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Run full pipeline: .\scripts\phase92-pipeline.ps1 -FullPipeline" -ForegroundColor White
Write-Host "   2. Enable quantization: .\scripts\phase92-pipeline.ps1 -FullPipeline -EnableQuantization" -ForegroundColor White
Write-Host "   3. Process more events: .\scripts\phase92-pipeline.ps1 -ProcessEvents -EventLimit 100" -ForegroundColor White
Write-Host "   4. Test search: .\scripts\phase92-pipeline.ps1 -TestSearch" -ForegroundColor White

Write-Host "`n✅ Pipeline ready!" -ForegroundColor Green
