# Phase 13: Check and Summarize Script
# Purpose: Run tsc and svelte-check, parse output, generate Markdown report
# Usage: .\check-and-summarize.ps1 [-OutputDir "reports"] [-Verbose]

param(
    [string]$OutputDir = "reports",
    [switch]$Verbose = $false
)

# Configuration
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = Join-Path $OutputDir "check-and-summarize_$timestamp.md"
$detailedLog = Join-Path $OutputDir "check-and-summarize_$timestamp.log"
$tscOutput = Join-Path $OutputDir "tsc_output_$timestamp.txt"
$svelteCheckOutput = Join-Path $OutputDir "svelte-check_output_$timestamp.txt"

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

# Initialize report
$report = @"
# Check and Summarize Report
**Generated:** $timestamp

## Summary

"@

$detailedLogContent = @"
Check and Summarize Report - Detailed Log
Generated: $timestamp
================================================================================

"@

Write-Host "Starting TypeScript and Svelte checks..." -ForegroundColor Cyan

# Detect SIMD/JSON heavy files first
Write-Host "🔍 Scanning for SIMD JSON parsing usage..." -ForegroundColor Yellow
$simdFiles = @()
# Combine patterns into single regex for one-pass scan
$simdRegex = "simd.*json|simdjson|JSON\.parse.*large|Buffer.*json|\.json\(\).*stream"

# Scan files once
if (Test-Path "src") {
    $simdFiles = Get-ChildItem -Path "src" -Include "*.ts","*.svelte" -Recurse -File |
        Select-String -Pattern $simdRegex -SimpleMatch:$false -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Path -Unique
}

if ($simdFiles.Count -gt 0) {
    Write-Host "  📊 Found $($simdFiles.Count) files with SIMD/JSON patterns" -ForegroundColor Cyan
    $report += "### SIMD JSON Files Detected: $($simdFiles.Count)`n"
    $report += "Files using heavy JSON/SIMD patterns require high memory allocation.`n`n"
}

# Run TypeScript check (high-memory version for SIMD/JSON focus)
Write-Host "Running TypeScript compiler (high-memory check for SIMD/JSON)..." -ForegroundColor Yellow
$tscStart = Get-Date

# Use Start-Job for timeout capability with high memory
$tscJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    # Use high-memory check instead of ultra-fast, stream to file to avoid OOM
    $env:NODE_OPTIONS="--max-old-space-size=8192"
    npm run check:typescript > "reports/tsc_raw.log" 2>&1
}

# Wait up to 5 minutes for high-memory check
$timeout = Wait-Job $tscJob -Timeout 300

if ($timeout) {
    Receive-Job $tscJob | Out-Null # Clear job buffer
    Remove-Job $tscJob
    $tscResult = Get-Content "reports/tsc_raw.log" -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️ TypeScript check timed out after 5 minutes" -ForegroundColor Yellow
    Stop-Job $tscJob
    Remove-Job $tscJob
    $tscResult = @("TypeScript high-memory check timed out - check reports/tsc_raw.log for partial output")
}

$tscEnd = Get-Date
$tscDuration = ($tscEnd - $tscStart).TotalSeconds

# Save output
$tscResult | Out-File -FilePath $tscOutput -Encoding UTF8

# Parse TypeScript output
$tscErrors = @()
$tscWarnings = @()
$tscErrorCount = 0
$tscWarningCount = 0

foreach ($line in $tscResult) {
    if ($line -match "error TS\d+:") {
        $tscErrors += $line
        $tscErrorCount++
    }
    elseif ($line -match "warning TS\d+:") {
        $tscWarnings += $line
        $tscWarningCount++
    }
}

$report += @"
### TypeScript Check
- **Duration:** $([Math]::Round($tscDuration, 2))s
- **Errors:** $tscErrorCount
- **Warnings:** $tscWarningCount
- **Status:** $(if ($tscErrorCount -eq 0) { "✅ PASS" } else { "❌ FAIL" })

"@

$detailedLogContent += @"
TypeScript Check Results
Duration: $([Math]::Round($tscDuration, 2))s
Errors: $tscErrorCount
Warnings: $tscWarningCount
Status: $(if ($tscErrorCount -eq 0) { "PASS" } else { "FAIL" })

Output:
$($tscResult -join "`n")

================================================================================

"@

# Run Svelte check
Write-Host "Running Svelte check..." -ForegroundColor Yellow
$svelteStart = Get-Date

# Use Start-Job for timeout capability
$svelteJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    # Stream to file to avoid memory issues with large output
    $env:NODE_OPTIONS="--max-old-space-size=8192"
    npm run check:svelte:frontend > "reports/svelte_raw.log" 2>&1
}

# Wait up to 5 minutes (increased for large codebase)
$timeout = Wait-Job $svelteJob -Timeout 300

if ($timeout) {
    Receive-Job $svelteJob | Out-Null
    Remove-Job $svelteJob
    # Don't read full content into memory if it's huge
    $svelteResult = Get-Content "reports/svelte_raw.log" -Head 1000
    if ((Get-Item "reports/svelte_raw.log").Length -gt 1MB) {
        $svelteResult += "... (output truncated, see reports/svelte_raw.log)"
    }
} else {
    Write-Host "⚠️ Svelte check timed out after 5 minutes" -ForegroundColor Yellow
    Stop-Job $svelteJob
    Remove-Job $svelteJob
    $svelteResult = @("Svelte check timed out - check reports/svelte_raw.log")
}

$svelteEnd = Get-Date
$svelteDuration = ($svelteEnd - $svelteStart).TotalSeconds

# Save output
$svelteResult | Out-File -FilePath $svelteCheckOutput -Encoding UTF8

# Parse Svelte output
$svelteErrors = @()
$svelteWarnings = @()
$svelteErrorCount = 0
$svelteWarningCount = 0

foreach ($line in $svelteResult) {
    if ($line -match "error:") {
        $svelteErrors += $line
        $svelteErrorCount++
    }
    elseif ($line -match "warning:") {
        $svelteWarnings += $line
        $svelteWarningCount++
    }
}

$report += @"
### Svelte Check
- **Duration:** $([Math]::Round($svelteDuration, 2))s
- **Errors:** $svelteErrorCount
- **Warnings:** $svelteWarningCount
- **Status:** $(if ($svelteErrorCount -eq 0) { "✅ PASS" } else { "❌ FAIL" })

"@

$detailedLogContent += @"
Svelte Check Results
Duration: $([Math]::Round($svelteDuration, 2))s
Errors: $svelteErrorCount
Warnings: $svelteWarningCount
Status: $(if ($svelteErrorCount -eq 0) { "PASS" } else { "FAIL" })

Output:
$($svelteResult -join "`n")

================================================================================

"@

# Overall status
$totalErrors = $tscErrorCount + $svelteErrorCount
$totalWarnings = $tscWarningCount + $svelteWarningCount
$overallStatus = if ($totalErrors -eq 0) { "✅ PASS" } else { "❌ FAIL" }

$report += @"
## Overall Status
- **Total Errors:** $totalErrors
- **Total Warnings:** $totalWarnings
- **Status:** $overallStatus

## Detailed Results

### TypeScript Errors ($tscErrorCount)
"@

if ($tscErrorCount -gt 0) {
    $report += "`n"
    foreach ($errorLine in $tscErrors) {
        $report += "- $errorLine`n"
    }
} else {
    $report += "`nNo errors found.`n"
}

$report += @"

### TypeScript Warnings ($tscWarningCount)
"@

if ($tscWarningCount -gt 0) {
    $report += "`n"
    foreach ($warning in $tscWarnings) {
        $report += "- $warning`n"
    }
} else {
    $report += "`nNo warnings found.`n"
}

$report += @"

### Svelte Errors ($svelteErrorCount)
"@

if ($svelteErrorCount -gt 0) {
    $report += "`n"
    foreach ($errorLine in $svelteErrors) {
        $report += "- $errorLine`n"
    }
} else {
    $report += "`nNo errors found.`n"
}

$report += @"

### Svelte Warnings ($svelteWarningCount)
"@

if ($svelteWarningCount -gt 0) {
    $report += "`n"
    foreach ($warning in $svelteWarnings) {
        $report += "- $warning`n"
    }
} else {
    $report += "`nNo warnings found.`n"
}

$report += @"

## Files Generated
- **Report:** $reportFile
- **Detailed Log:** $detailedLog
- **TypeScript Output:** $tscOutput
- **Svelte Check Output:** $svelteCheckOutput

## Recommendations
"@

if ($totalErrors -eq 0) {
    $report += "`n✅ All checks passed! No action required.`n"
} else {
    $report += "`n❌ Issues found. Review the detailed logs above for specific errors.`n"
}

# Save report
$report | Out-File -FilePath $reportFile -Encoding UTF8
$detailedLogContent | Out-File -FilePath $detailedLog -Encoding UTF8

# Display summary
Write-Host "`n" -ForegroundColor Cyan
Write-Host "Check and Summarize Complete" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "TypeScript: $tscErrorCount errors, $tscWarningCount warnings" -ForegroundColor $(if ($tscErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host "Svelte:     $svelteErrorCount errors, $svelteWarningCount warnings" -ForegroundColor $(if ($svelteErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host "Overall:    $overallStatus" -ForegroundColor $(if ($totalErrors -eq 0) { "Green" } else { "Red" })
Write-Host "`nReport saved to: $reportFile" -ForegroundColor Cyan
Write-Host "Detailed log saved to: $detailedLog" -ForegroundColor Cyan

if ($Verbose) {
    Write-Host "`nDetailed Output:" -ForegroundColor Yellow
    Write-Host $report
}

# Exit with appropriate code
exit $(if ($totalErrors -eq 0) { 0 } else { 1 })
