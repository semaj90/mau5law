# Advanced Error Analysis Pipeline
# Runs svelte-check to stream, then analyzes with Node.js

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "🚀 Starting Advanced Error Analysis Pipeline..." -ForegroundColor Cyan

# 1. Run Svelte Check (Stream to file)
Write-Host "1️⃣  Running svelte-check (streaming to reports/svelte_raw.log)..." -ForegroundColor Yellow
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Use Start-Job to prevent hanging
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:SVELTEKIT_PATHS_BASE = ""
    $env:NODE_OPTIONS="--max-old-space-size=8192"
    npm run check:svelte:frontend > "reports/svelte_raw.log" 2>&1
}

# Wait with progress
$timeout = 600 # 10 minutes
$timer = 0
while ($job.State -eq "Running" -and $timer -lt $timeout) {
    $percent = [math]::Min(100, ($timer / 120) * 100) # Assume 2 min avg
    Write-Progress -Activity "Running svelte-check" -Status "Elapsed: $timer seconds" -PercentComplete $percent
    Start-Sleep -Seconds 5
    $timer += 5
}

Write-Progress -Activity "Running svelte-check" -Completed

if ($job.State -eq "Running") {
    Write-Host "⚠️ Check timed out, stopping job..." -ForegroundColor Red
    Stop-Job $job
}
Receive-Job $job | Out-Null
Remove-Job $job

# 2. Run Analysis
Write-Host "2️⃣  Analyzing logs with Node.js (SIMD-ready)..." -ForegroundColor Yellow
node scripts/analyze-errors-simd.mjs reports/svelte_raw.log

Write-Host "✅ Pipeline Complete." -ForegroundColor Green
