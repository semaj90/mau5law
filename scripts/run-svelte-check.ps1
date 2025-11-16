#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run svelte-check and capture raw output for error analysis
.DESCRIPTION
    Runs svelte-check from the sveltekit-frontend directory and captures all output
    to a log file for subsequent parsing and analysis.
.PARAMETER OutputLog
    Path to the output log file (default: .svelte-errors-raw.log)
.PARAMETER VerboseOutput
    Show truncated output in console
.EXAMPLE
    .\scripts\run-svelte-check.ps1
.EXAMPLE
    .\scripts\run-svelte-check.ps1 -OutputLog "custom-errors.log" -VerboseOutput
#>

param(
    [string] $OutputLog = ".svelte-errors-raw.log",
    [switch] $VerboseOutput
)

Write-Host "▶ Running svelte-check..." -ForegroundColor Cyan
Write-Host "  Log file: $OutputLog" -ForegroundColor Gray

# Make sure we run from repo root
$root = Split-Path $PSCommandPath -Parent | Split-Path -Parent
Set-Location $root

# Run svelte-check and capture **all** output
# We don't stop on non-zero exit since svelte-check exits with errors when it finds issues.
$sveltekitDir = Join-Path $PSScriptRoot ".." "sveltekit-frontend"
$logPath = Join-Path $PSScriptRoot ".." $OutputLog

# Change to the sveltekit directory and run the command
Push-Location $sveltekitDir
try {
    & npm run check *>&1 | Out-File -FilePath $logPath -Encoding UTF8
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($VerboseOutput) {
    Write-Host ""
    Write-Host "Raw svelte-check output (truncated):" -ForegroundColor Yellow
    Get-Content $OutputLog -TotalCount 50 | ForEach-Object { Write-Host $_ }
}

Write-Host ""
Write-Host "✅ svelte-check finished with exit code $($process.ExitCode)" -ForegroundColor Green
Write-Host "   Raw log: $OutputLog" -ForegroundColor Cyan