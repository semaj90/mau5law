<#
.SYNOPSIS
    Phase 90: Scan codebase for embedding dimensions using ripgrep + PowerShell

.DESCRIPTION
    Replacement for "rg + awk" on Windows. Finds all hardcoded embedding
    dimensions (384, 768, 1536) and validates consistency with Phase 90 rules.

.EXAMPLE
    .\Find-EmbeddingDimensions.ps1

.EXAMPLE
    .\Find-EmbeddingDimensions.ps1 -Unique

.EXAMPLE
    .\Find-EmbeddingDimensions.ps1 -Grouped
#>

[CmdletBinding()]
param(
    [switch]$Unique,
    [switch]$Grouped,
    [string]$Path = "."
)

$ErrorActionPreference = 'Stop'

Write-Host "`n🔍 Phase 90: Embedding Dimension Scanner" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# Check if ripgrep is available
if (!(Get-Command rg -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ripgrep (rg) not found!" -ForegroundColor Red
    Write-Host "   Install: choco install ripgrep" -ForegroundColor Yellow
    Write-Host "   Or download from: https://github.com/BurntSushi/ripgrep/releases" -ForegroundColor Yellow
    exit 1
}

# Search patterns for embedding dimensions
$patterns = @(
    'dimensions\s*[:=]\s*\d+',
    'EMBEDDING_DIMENSION\s*[:=]\s*\d+',
    'vector\s*\(\s*\d+\s*\)',
    'vector\(''embedding'',\s*\{\s*dimensions:\s*\d+',
    'size\s*[:=]\s*\d+.*embedd',
    'embeddinggemma.*\d+d'
)

Write-Host "`n📋 Searching for embedding dimension declarations..." -ForegroundColor Magenta

$results = @()

foreach ($pattern in $patterns) {
    $output = rg $pattern -n --no-heading --color=never 2>$null

    if ($output) {
        $output | ForEach-Object {
            # rg format: path:line:match
            if ($_ -match '^([^:]+):(\d+):(.+)$') {
                $file = $Matches[1]
                $line = [int]$Matches[2]
                $match = $Matches[3].Trim()

                # Extract dimension number
                $dimension = $null
                if ($match -match '\b(\d{3,4})\b') {
                    $dimension = [int]$Matches[1]
                }

                # Only keep valid embedding dimensions
                if ($dimension -in @(128, 256, 384, 512, 768, 1024, 1536, 2048)) {
                    $results += [PSCustomObject]@{
                        File      = $file
                        Line      = $line
                        Dimension = $dimension
                        Snippet   = $match.Substring(0, [Math]::Min(80, $match.Length))
                    }
                }
            }
        }
    }
}

# Remove duplicates based on file + line
$results = $results | Sort-Object File, Line -Unique

if ($results.Count -eq 0) {
    Write-Host "⚠️  No embedding dimensions found!" -ForegroundColor Yellow
    exit 0
}

if ($Unique) {
    # Show unique dimensions only
    Write-Host "`n🎯 Unique Embedding Dimensions:" -ForegroundColor Green
    $uniqueDims = $results | Select-Object -ExpandProperty Dimension -Unique | Sort-Object
    $uniqueDims | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Cyan
    }
    Write-Host "`nTotal unique dimensions: $($uniqueDims.Count)" -ForegroundColor Yellow
} elseif ($Grouped) {
    # Group by dimension
    Write-Host "`n📊 Dimensions Grouped:" -ForegroundColor Green
    $grouped = $results | Group-Object Dimension | Sort-Object Name

    foreach ($group in $grouped) {
        Write-Host "`n  Dimension $($group.Name): $($group.Count) occurrences" -ForegroundColor Cyan
        $group.Group | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.File):$($_.Line)" -ForegroundColor Gray
        }
        if ($group.Count -gt 5) {
            Write-Host "    ... and $($group.Count - 5) more" -ForegroundColor DarkGray
        }
    }
} else {
    # Full table
    Write-Host "`n📄 All Embedding Dimension References:" -ForegroundColor Green
    $results | Format-Table -Property File, Line, Dimension, Snippet -AutoSize

    Write-Host "`n📊 Summary:" -ForegroundColor Magenta
    $summary = $results | Group-Object Dimension | Sort-Object Name
    foreach ($group in $summary) {
        $color = switch ($group.Name) {
            384  { 'Green' }   # Legal documents (memory-optimized)
            768  { 'Yellow' }  # Phase 72 errors (high-precision)
            1536 { 'Cyan' }    # OpenAI ada-002
            default { 'White' }
        }
        Write-Host "  $($group.Name)d: $($group.Count) occurrences" -ForegroundColor $color
    }
}

# Phase 90 validation
Write-Host "`n✅ Phase 90 Dimension Validation:" -ForegroundColor Magenta

$has384 = $results | Where-Object { $_.Dimension -eq 384 }
$has768 = $results | Where-Object { $_.Dimension -eq 768 }

if ($has384) {
    Write-Host "  ✅ 384d found (legal documents - memory-optimized)" -ForegroundColor Green
}
if ($has768) {
    Write-Host "  ✅ 768d found (Phase 72 errors - high-precision)" -ForegroundColor Green
}

$unexpected = $results | Where-Object { $_.Dimension -notin @(384, 768) }
if ($unexpected) {
    Write-Host "  ⚠️  Unexpected dimensions found:" -ForegroundColor Yellow
    $unexpected | Group-Object Dimension | ForEach-Object {
        Write-Host "    $($_.Name)d: $($_.Count) occurrences" -ForegroundColor Yellow
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "Total references found: $($results.Count)" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan
