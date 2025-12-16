# Phase 13: Extract Implementation Notes Script
# Purpose: Scan for PHASE13, TODO, IMPLEMENT, FIXME, NOTE tags and generate documentation
# Usage: .\extract-impl-notes.ps1 [-OutputDir "reports"] [-Verbose]

param(
    [string]$OutputDir = "reports",
    [switch]$Verbose = $false
)

# Configuration
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = Join-Path $OutputDir "extract-impl-notes_$timestamp.md"

# Tag patterns to search for
$tagPatterns = @(
    @{ Tag = "PHASE13"; Color = "Cyan"; Priority = "High" },
    @{ Tag = "TODO"; Color = "Yellow"; Priority = "Medium" },
    @{ Tag = "IMPLEMENT"; Color = "Magenta"; Priority = "High" },
    @{ Tag = "FIXME"; Color = "Red"; Priority = "Critical" },
    @{ Tag = "NOTE"; Color = "Green"; Priority = "Low" }
)

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

# Initialize report
$report = @"
# Implementation Notes Report
**Generated:** $timestamp

## Summary

"@

$tagCounts = @{}
$allNotes = @()

Write-Host "Scanning for implementation notes..." -ForegroundColor Cyan

# Find all source files
$files = Get-ChildItem -Path "src" -Recurse -Include "*.svelte", "*.ts", "*.tsx", "*.js", "*.jsx" -ErrorAction SilentlyContinue

Write-Host "Found $($files.Count) files to scan" -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $lineNumber = 0
    foreach ($line in $content) {
        $lineNumber++

        foreach ($pattern in $tagPatterns) {
            if ($line -match "\b$($pattern.Tag)\b") {
                # Extract the note text
                $noteText = $line -replace ".*\b$($pattern.Tag)\b\s*:?\s*", ""
                $noteText = $noteText -replace "^\s*//\s*", ""
                $noteText = $noteText -replace "^\s*\*\s*", ""
                $noteText = $noteText.Trim()

                if ($noteText) {
                    $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ""

                    $note = @{
                        Tag = $pattern.Tag
                        Priority = $pattern.Priority
                        File = $relativePath
                        Line = $lineNumber
                        Text = $noteText
                        Color = $pattern.Color
                    }

                    $allNotes += $note

                    if (-not $tagCounts.ContainsKey($pattern.Tag)) {
                        $tagCounts[$pattern.Tag] = 0
                    }
                    $tagCounts[$pattern.Tag]++

                    Write-Host "[$($pattern.Tag)] $relativePath:$lineNumber" -ForegroundColor $pattern.Color
                    if ($Verbose) {
                        Write-Host "  $noteText" -ForegroundColor Gray
                    }
                }
            }
        }
    }
}

# Build summary section
$report += "| Tag | Count | Priority |`n"
$report += "|-----|-------|----------|`n"

foreach ($pattern in $tagPatterns) {
    $count = if ($tagCounts.ContainsKey($pattern.Tag)) { $tagCounts[$pattern.Tag] } else { 0 }
    $report += "| $($pattern.Tag) | $count | $($pattern.Priority) |`n"
}

$totalNotes = $allNotes.Count
$report += "`n- **Total Notes:** $totalNotes`n"
$report += "- **Files Scanned:** $($files.Count)`n"
$report += "- **Files with Notes:** $($allNotes | Select-Object -ExpandProperty File -Unique | Measure-Object).Count`n"

# Group by priority
$report += @"

## By Priority

### Critical
"@

$criticalNotes = $allNotes | Where-Object { $_.Priority -eq "Critical" }
if ($criticalNotes.Count -gt 0) {
    foreach ($note in $criticalNotes) {
        $report += "`n- **[$($note.Tag)]** $($note.File):$($note.Line)`n"
        $report += "  > $($note.Text)`n"
    }
} else {
    $report += "`nNo critical notes found.`n"
}

$report += @"

### High
"@

$highNotes = $allNotes | Where-Object { $_.Priority -eq "High" }
if ($highNotes.Count -gt 0) {
    foreach ($note in $highNotes) {
        $report += "`n- **[$($note.Tag)]** $($note.File):$($note.Line)`n"
        $report += "  > $($note.Text)`n"
    }
} else {
    $report += "`nNo high priority notes found.`n"
}

$report += @"

### Medium
"@

$mediumNotes = $allNotes | Where-Object { $_.Priority -eq "Medium" }
if ($mediumNotes.Count -gt 0) {
    foreach ($note in $mediumNotes) {
        $report += "`n- **[$($note.Tag)]** $($note.File):$($note.Line)`n"
        $report += "  > $($note.Text)`n"
    }
} else {
    $report += "`nNo medium priority notes found.`n"
}

$report += @"

### Low
"@

$lowNotes = $allNotes | Where-Object { $_.Priority -eq "Low" }
if ($lowNotes.Count -gt 0) {
    foreach ($note in $lowNotes) {
        $report += "`n- **[$($note.Tag)]** $($note.File):$($note.Line)`n"
        $report += "  > $($note.Text)`n"
    }
} else {
    $report += "`nNo low priority notes found.`n"
}

# Group by tag
$report += @"

## By Tag

"@

foreach ($pattern in $tagPatterns) {
    $tagNotes = $allNotes | Where-Object { $_.Tag -eq $pattern.Tag }
    $count = $tagNotes.Count

    $report += @"
### $($pattern.Tag) ($count)
"@

    if ($count -gt 0) {
        foreach ($note in $tagNotes) {
            $report += "`n- $($note.File):$($note.Line)`n"
            $report += "  > $($note.Text)`n"
        }
    } else {
        $report += "`nNo notes found.`n"
    }

    $report += "`n"
}

# Group by file
$report += @"

## By File

"@

$fileGroups = $allNotes | Group-Object -Property File | Sort-Object -Property Name

foreach ($group in $fileGroups) {
    $report += "`n### $($group.Name)`n"
    foreach ($note in $group.Group) {
        $report += "- Line $($note.Line): [$($note.Tag)] $($note.Text)`n"
    }
}

$report += @"

## Statistics

- **Total Notes:** $totalNotes
- **Files Scanned:** $($files.Count)
- **Files with Notes:** $($allNotes | Select-Object -ExpandProperty File -Unique | Measure-Object).Count
- **Average Notes per File:** $([Math]::Round($totalNotes / $files.Count, 2))

## Tag Distribution

"@

foreach ($pattern in $tagPatterns) {
    $count = if ($tagCounts.ContainsKey($pattern.Tag)) { $tagCounts[$pattern.Tag] } else { 0 }
    $percentage = if ($totalNotes -gt 0) { [Math]::Round(($count / $totalNotes) * 100, 1) } else { 0 }
    $report += "- $($pattern.Tag): $count ($percentage%)`n"
}

# Save report
$report | Out-File -FilePath $reportFile -Encoding UTF8

# Display summary
Write-Host "`n" -ForegroundColor Cyan
Write-Host "Extract Implementation Notes Complete" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Total Notes Found:  $totalNotes" -ForegroundColor Cyan
Write-Host "Files Scanned:      $($files.Count)" -ForegroundColor Cyan
Write-Host "Files with Notes:   $($allNotes | Select-Object -ExpandProperty File -Unique | Measure-Object).Count" -ForegroundColor Cyan
Write-Host "`nReport saved to: $reportFile" -ForegroundColor Cyan

if ($Verbose) {
    Write-Host "`nDetailed Report:" -ForegroundColor Yellow
    Write-Host $report
}

exit 0
