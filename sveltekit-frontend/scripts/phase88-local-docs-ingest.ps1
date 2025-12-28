#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 88: Local Repository Documentation Ingestion

.DESCRIPTION
Ingests your "operator brain" documentation into the knowledge base:
- Project summaries (NEXT_STEPS_LOG.md, MCP guides, etc.)
- ACE agentic patterns
- Phase guides and fixes
- Error reduction strategies

This is the documentation that makes agents understand YOUR specific codebase context.

.PARAMETER Force
Re-ingest even if documents already exist in Qdrant

.EXAMPLE
.\phase88-local-docs-ingest.ps1
.\phase88-local-docs-ingest.ps1 -Force
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║      Phase 88: Local Operator Documentation Ingestion         ║" -ForegroundColor Magenta
Write-Host "║      Your Project Brain → Qdrant Knowledge Base               ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ============================================================================
# Configuration
# ============================================================================

$manifestPath = Join-Path $PSScriptRoot "..\data\knowledge\kb-manifest-core.txt"
$ingestWrapper = Join-Path $PSScriptRoot "phase76-run-kb-ingest.ps1"

# ============================================================================
# Pre-Flight Checks
# ============================================================================

Write-Host "1️⃣ Pre-flight checks..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $manifestPath)) {
    Write-Host "   ❌ Missing manifest: $manifestPath" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Manifest: $manifestPath" -ForegroundColor Green

if (-not (Test-Path $ingestWrapper)) {
    Write-Host "   ❌ Missing ingestion wrapper: $ingestWrapper" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Ingestion wrapper: $ingestWrapper" -ForegroundColor Green

Write-Host ""

# ============================================================================
# Load Manifest
# ============================================================================

Write-Host "2️⃣ Loading manifest..." -ForegroundColor Yellow
Write-Host ""

$docPaths = Get-Content $manifestPath | Where-Object { $_.Trim() -ne "" -and -not $_.StartsWith("#") }

Write-Host "   📋 Found $($docPaths.Count) documents in manifest" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Validate Paths
# ============================================================================

Write-Host "3️⃣ Validating paths..." -ForegroundColor Yellow
Write-Host ""

$validPaths = @()
$missingPaths = @()
$rootDir = Split-Path $PSScriptRoot -Parent

foreach ($docPath in $docPaths) {
    # Try multiple locations
    $candidates = @(
        (Join-Path $rootDir $docPath),
        (Join-Path $PSScriptRoot ".." $docPath),
        $docPath  # Absolute path
    )

    $found = $false
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $validPaths += $candidate
            $found = $true
            Write-Host "   ✅ $docPath" -ForegroundColor Green
            break
        }
    }

    if (-not $found) {
        $missingPaths += $docPath
        Write-Host "   ⚠️  Missing: $docPath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "   Valid: $($validPaths.Count) | Missing: $($missingPaths.Count)" -ForegroundColor Cyan
Write-Host ""

if ($validPaths.Count -eq 0) {
    Write-Host "   ❌ No valid documents found!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Ingest Documents
# ============================================================================

Write-Host "4️⃣ Ingesting documents..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failureCount = 0

foreach ($docPath in $validPaths) {
    $docName = Split-Path $docPath -Leaf
    Write-Host "   📄 $docName" -ForegroundColor Cyan

    try {
        # Determine tags based on file name/path
        $tags = "ace,operator-docs,phase88,kb_doc"

        if ($docPath -match "MCP") {
            $tags += ",mcp"
        }
        if ($docPath -match "ACE|agentic") {
            $tags += ",agentic,prompts"
        }
        if ($docPath -match "ERROR|error") {
            $tags += ",error-fixing,diagnostics"
        }
        if ($docPath -match "PHASE\d+") {
            $tags += ",phase-guide"
        }
        if ($docPath -match "TEST") {
            $tags += ",testing"
        }

        # Run ingestion
        $output = & $ingestWrapper -Paths $docPath -Tags $tags -Kind "kb_doc" 2>&1

        # Check for success
        $outputStr = $output | Out-String
        if ($outputStr -match "✅|SUCCESS|ingested|stored") {
            Write-Host "      ✅ Ingested" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "      ⚠️  Uncertain - check output" -ForegroundColor Yellow
            Write-Host "      $($outputStr.Substring(0, [Math]::Min(200, $outputStr.Length)))" -ForegroundColor DarkGray
        }

    } catch {
        Write-Host "      ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        $failureCount++
    }

    Write-Host ""
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                      Ingestion Summary                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Results:" -ForegroundColor Cyan
Write-Host "   ✅ Success: $successCount" -ForegroundColor Green
Write-Host "   ❌ Failed: $failureCount" -ForegroundColor Red
Write-Host "   📈 Total: $($validPaths.Count)" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq $validPaths.Count) {
    Write-Host "✅ All operator documentation ingested successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify KB: .\scripts\phase88-verify-kb.ps1" -ForegroundColor Gray
    Write-Host "2. Test retrieval: node scripts/fastmcp-server.mjs (then call knowledge_retrieve)" -ForegroundColor Gray
    Write-Host "3. Run ACE with KB: node scripts/phase76-ace-prompt-engineer.mjs --task 'Review project status'" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "⚠️  Some documents failed to ingest (review errors above)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
