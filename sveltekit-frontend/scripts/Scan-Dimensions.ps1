#Requires -Version 7.0
<#
.SYNOPSIS
    Phase 90: Scan for embedding dimensions (PowerShell native)
#>

param(
    [string]$Mode = "table"  # table, unique, grouped
)

Write-Host "`n🔍 Phase 90: Embedding Dimension Scanner" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$patterns = @(
    'dimensions\s*[:=]\s*(\d+)',
    'EMBEDDING_DIMENSION\s*[:=]\s*(\d+)',
    'vector\s*\(\s*(\d+)\s*\)',
    'dimensions:\s*(\d+)'
)

$results = @()

Write-Host "`n📋 Scanning TypeScript/JavaScript files..." -ForegroundColor Magenta

$files = Get-ChildItem -Path . -Include *.ts,*.js,*.svelte,*.mts,*.mjs -Recurse -ErrorAction SilentlyContinue |
         Where-Object { $_.FullName -notmatch 'node_modules|\.svelte-kit|dist|build' }

$totalFiles = $files.Count
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    Write-Progress -Activity "Scanning files" -Status "$currentFile of $totalFiles" -PercentComplete (($currentFile / $totalFiles) * 100)

    $content = Get-Content -Path $file.FullName -ErrorAction SilentlyContinue
    if (!$content) { continue }

    $lineNum = 0
    foreach ($line in $content) {
        $lineNum++

        foreach ($pattern in $patterns) {
            if ($line -match $pattern) {
                $dimension = [int]$Matches[1]

                # Only valid embedding dimensions
                if ($dimension -in @(128, 256, 384, 512, 768, 1024, 1536, 2048)) {
                    $results += [PSCustomObject]@{
                        File      = $file.FullName.Replace((Get-Location).Path + '\', '')
                        Line      = $lineNum
                        Dimension = $dimension
                        Snippet   = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
                    }
                }
            }
        }
    }
}

Write-Progress -Activity "Scanning files" -Completed

if ($results.Count -eq 0) {
    Write-Host "⚠️  No embedding dimensions found!" -ForegroundColor Yellow
    exit 0
}

# Remove duplicates
$results = $results | Sort-Object File, Line -Unique

switch ($Mode.ToLower()) {
    "unique" {
        Write-Host "`n🎯 Unique Dimensions:" -ForegroundColor Green
        $unique = $results | Select-Object -ExpandProperty Dimension -Unique | Sort-Object
        $unique | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Cyan
        }
    }

    "grouped" {
        Write-Host "`n📊 Grouped by Dimension:" -ForegroundColor Green
        $grouped = $results | Group-Object Dimension | Sort-Object Name

        foreach ($group in $grouped) {
            Write-Host "`n  $($group.Name)d: $($group.Count) occurrences" -ForegroundColor Cyan
            $group.Group | Select-Object -First 5 | ForEach-Object {
                Write-Host "    $($_.File):$($_.Line)" -ForegroundColor Gray
            }
            if ($group.Count -gt 5) {
                Write-Host "    ... and $($group.Count - 5) more" -ForegroundColor DarkGray
            }
        }
    }

    default {
        Write-Host "`n📄 All References:" -ForegroundColor Green
        $results | Format-Table File, Line, Dimension, Snippet -AutoSize
    }
}

# Summary
Write-Host "`n📊 Summary:" -ForegroundColor Magenta
$summary = $results | Group-Object Dimension | Sort-Object Name
foreach ($group in $summary) {
    $color = switch ([int]$group.Name) {
        384  { 'Green' }
        768  { 'Yellow' }
        default { 'White' }
    }
    Write-Host "  $($group.Name)d: $($group.Count) occurrences" -ForegroundColor $color
}

# Phase 90 validation
Write-Host "`n✅ Phase 90 Validation:" -ForegroundColor Magenta

$has384 = $results | Where-Object { $_.Dimension -eq 384 }
$has768 = $results | Where-Object { $_.Dimension -eq 768 }

if ($has384) {
    Write-Host "  ✅ 384d found (legal documents)" -ForegroundColor Green
}
if ($has768) {
    Write-Host "  ✅ 768d found (Phase 72 errors)" -ForegroundColor Green
}

$unexpected = $results | Where-Object { $_.Dimension -notin @(384, 768) }
if ($unexpected) {
    Write-Host "  ⚠️  Unexpected dimensions:" -ForegroundColor Yellow
    $unexpected | Group-Object Dimension | ForEach-Object {
        Write-Host "    $($_.Name)d: $($_.Count) occurrences" -ForegroundColor Yellow
    }
}

Write-Host "`nTotal: $($results.Count) references`n" -ForegroundColor Cyan
