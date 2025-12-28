#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 88: Local Repository Documentation Ingestion

.DESCRIPTION
    Ingests operator brain docs (NEXT_STEPS_LOG, MCP guides, ACE patterns) into KB.
    These are the "always know this" docs for autonomous agents.

.PARAMETER ManifestPath
    Path to manifest file listing docs to ingest (default: data/knowledge/kb-manifest-core.txt)

.PARAMETER Tags
    Comma-separated tags to apply to all ingested docs

.EXAMPLE
    .\scripts\phase88-ingest-repo-docs.ps1
    # Ingest all core operator docs

.EXAMPLE
    .\scripts\phase88-ingest-repo-docs.ps1 -Tags "ace,phase88,critical"
    # Add custom tags
#>

param(
    [string]$ManifestPath = "data/knowledge/kb-manifest-core.txt",
    [string]$Tags = "ace,operator-docs,phase76,phase87,phase88"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Configuration
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$WRAPPER_SCRIPT = Join-Path $SCRIPT_DIR "phase76-run-kb-ingest.ps1"
$QDRANT_URL = $env:QDRANT_URL ?? "http://localhost:6333"
$COLLECTION = $env:QDRANT_COLLECTION ?? "phase76_knowledge_base"

Write-Host "`n📚 Phase 88: Repository Documentation Ingestion" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Manifest: $ManifestPath" -ForegroundColor Yellow
Write-Host "Tags: $Tags" -ForegroundColor Yellow
Write-Host "Collection: $COLLECTION" -ForegroundColor Yellow
Write-Host ""

# Create manifest if missing
if (-not (Test-Path $ManifestPath)) {
    Write-Host "📝 Creating default manifest..." -ForegroundColor Cyan

    $defaultDocs = @(
        'NEXT_STEPS_LOG.md',
        'MCP_ARCHITECTURE_GUIDE.md',
        'MCP_SESSION_SUMMARY.md',
        'MCP_IMPLEMENTATION_SUMMARY.md',
        'LLM_ROUTER_README.md',
        'ERROR_REDUCTION_SUMMARY.md',
        'TEST_MIGRATION_SUMMARY.md',
        'CRAWLER_MANIFEST.md',
        'data/knowledge/ace-agentic-patterns.md',
        'PHASE87_FIXES_APPLIED.md'
    )

    New-Item -ItemType Directory -Path (Split-Path $ManifestPath) -Force | Out-Null
    Set-Content -Path $ManifestPath -Value ($defaultDocs -join "`n")
    Write-Host "   ✅ Created: $ManifestPath" -ForegroundColor Green
}

# Read manifest
$docs = Get-Content $ManifestPath | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
Write-Host "📋 Manifest contains $($docs.Count) documents" -ForegroundColor Cyan
Write-Host ""

# Verify prerequisites
Write-Host "🔍 Verifying prerequisites..." -ForegroundColor Cyan

if (-not (Test-Path $WRAPPER_SCRIPT)) {
    Write-Host "❌ Wrapper script not found: $WRAPPER_SCRIPT" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Wrapper script: $WRAPPER_SCRIPT" -ForegroundColor Green

# Check Qdrant
try {
    $qdrantHealth = Invoke-RestMethod -Uri "$QDRANT_URL/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Qdrant: healthy" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant unreachable: $QDRANT_URL" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Ingest loop
$results = @()
$startTime = Get-Date

foreach ($doc in $docs) {
    # Resolve path (support both absolute and relative)
    $docPath = if ([System.IO.Path]::IsPathRooted($doc)) {
        $doc
    } else {
        Join-Path (Get-Location) $doc
    }

    # Check if file exists
    if (-not (Test-Path $docPath)) {
        Write-Host "⚠️  Skipping (not found): $doc" -ForegroundColor Yellow
        $results += @{
            Doc = $doc
            Success = $false
            Error = 'File not found'
        }
        continue
    }

    # Get file size
    $fileInfo = Get-Item $docPath
    $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)

    Write-Host "📥 Ingesting: $doc ($sizeKB KB)" -ForegroundColor Cyan

    $ingestStart = Get-Date

    try {
        # Call wrapper script
        $output = & $WRAPPER_SCRIPT -Paths $docPath -Tags $Tags -Kind "kb_doc" 2>&1

        $ingestEnd = Get-Date
        $duration = ($ingestEnd - $ingestStart).TotalSeconds

        # Parse chunks ingested (if wrapper outputs this)
        $chunks = 0
        if ($output -match 'Ingested (\d+) chunks') {
            $chunks = [int]$Matches[1]
        } elseif ($output -match '(\d+) chunks') {
            $chunks = [int]$Matches[1]
        } else {
            $chunks = 1  # Assume at least 1 chunk
        }

        Write-Host "   ✅ Complete: $chunks chunks in $([math]::Round($duration, 1))s" -ForegroundColor Green

        $results += @{
            Doc = $doc
            Success = $true
            Chunks = $chunks
            Duration = $duration
            SizeKB = $sizeKB
        }
    } catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red

        $results += @{
            Doc = $doc
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

# Summary
Write-Host "`n📊 Ingestion Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Total time: $([math]::Round($totalDuration, 1))s" -ForegroundColor Yellow

$successful = $results | Where-Object { $_.Success }
$failed = $results | Where-Object { -not $_.Success }

Write-Host "`n✅ Successful ($($successful.Count)):" -ForegroundColor Green
foreach ($result in $successful) {
    Write-Host "   - $($result.Doc): $($result.Chunks) chunks ($($result.SizeKB) KB)" -ForegroundColor Gray
}

if ($failed.Count -gt 0) {
    Write-Host "`n❌ Failed ($($failed.Count)):" -ForegroundColor Red
    foreach ($result in $failed) {
        Write-Host "   - $($result.Doc): $($result.Error)" -ForegroundColor Gray
    }
}

$totalChunks = ($successful | Measure-Object -Property Chunks -Sum).Sum
Write-Host "`nTotal chunks ingested: $totalChunks" -ForegroundColor Cyan

Write-Host "`n✨ Repository docs ingestion complete!" -ForegroundColor Cyan
Write-Host ""

# Save manifest
$manifestPath = "reports/phase88-repo-docs-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
$manifestData = @{
    timestamp = (Get-Date).ToString('o')
    duration_seconds = [math]::Round($totalDuration, 1)
    total_chunks = $totalChunks
    qdrant_collection = $COLLECTION
    tags = $Tags
    results = $results
} | ConvertTo-Json -Depth 10

New-Item -ItemType Directory -Path (Split-Path $manifestPath) -Force | Out-Null
Set-Content -Path $manifestPath -Value $manifestData
Write-Host "📄 Manifest saved: $manifestPath" -ForegroundColor Gray

exit 0
