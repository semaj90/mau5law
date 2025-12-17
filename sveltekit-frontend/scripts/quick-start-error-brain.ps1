#!/usr/bin/env pwsh
# Quick Start Script for Error-Brain System Testing
# Run this to test the complete system in one command

param(
    [switch]$SkipVerify,
    [switch]$DryRun = $true
)

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Error-Brain System - Quick Start Test               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Set environment
Write-Host "Step 1: Setting environment variables..." -ForegroundColor Yellow
$env:ERROR_BRAIN_ENABLED = "true"
$env:ERROR_BRAIN_TRANSPORT = "sse"
$env:ERROR_BRAIN_APPLY_MODE = "off"
$env:ERROR_BRAIN_DRY_RUN = if ($DryRun) { "true" } else { "false" }
$env:BATCH_REPORT_STAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "  ✅ ERROR_BRAIN_ENABLED = $env:ERROR_BRAIN_ENABLED" -ForegroundColor Green
Write-Host "  ✅ ERROR_BRAIN_TRANSPORT = $env:ERROR_BRAIN_TRANSPORT" -ForegroundColor Green
Write-Host "  ✅ ERROR_BRAIN_APPLY_MODE = $env:ERROR_BRAIN_APPLY_MODE" -ForegroundColor Green
Write-Host "  ✅ ERROR_BRAIN_DRY_RUN = $env:ERROR_BRAIN_DRY_RUN" -ForegroundColor Green
Write-Host "  ✅ BATCH_REPORT_STAMP = $env:BATCH_REPORT_STAMP" -ForegroundColor Green

# Step 2: Verify system
if (-not $SkipVerify) {
    Write-Host "`nStep 2: Verifying system files..." -ForegroundColor Yellow
    $verifyOutput = .\scripts\verify-error-brain.ps1
    Write-Host $verifyOutput

    # Check for success message instead of exit code
    if ($verifyOutput -match "All critical files present") {
        Write-Host "`n  ✅ Verification passed!" -ForegroundColor Green
    } else {
        Write-Host "`n  ❌ Verification failed! Please review missing files." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`nStep 2: Skipped verification (--SkipVerify)" -ForegroundColor Yellow
}# Step 3: Check if dev server is running
Write-Host "`nStep 3: Checking dev server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Dev server is running" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Dev server not detected" -ForegroundColor Yellow
    Write-Host "  ℹ️  Please start dev server in another terminal:" -ForegroundColor Cyan
    Write-Host "     npm run dev" -ForegroundColor White
    Write-Host "`n  Press any key after starting dev server..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Step 4: Run HTTP integration test
Write-Host "`nStep 4: Running HTTP integration test..." -ForegroundColor Yellow
node scripts/test-error-brain-http.mjs

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ HTTP test failed!" -ForegroundColor Red
    Write-Host "   Check ERROR_BRAIN_TESTING.md for troubleshooting" -ForegroundColor Yellow
    exit 1
}

# Step 5: Instructions for next steps
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Quick Start Test Complete!                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Watch SSE stream (in new terminal):" -ForegroundColor White
Write-Host "   curl http://localhost:5173/api/internal/error-brain/stream" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run analyzer with events:" -ForegroundColor White
Write-Host "   node scripts/batch-merger-fixer-v2.mjs --analyze" -ForegroundColor Gray
Write-Host ""
Write-Host "3. View run reports:" -ForegroundColor White
Write-Host "   ls reports/runs/" -ForegroundColor Gray
Write-Host ""
Write-Host "4. View patch reports:" -ForegroundColor White
Write-Host "   ls reports/patches/" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   ERROR_BRAIN_EXECUTE.md  - Full execution guide" -ForegroundColor Gray
Write-Host "   ERROR_BRAIN_TESTING.md  - Testing protocols" -ForegroundColor Gray
Write-Host "   ERROR_BRAIN_GUIDE.md    - Complete reference" -ForegroundColor Gray
Write-Host ""

# Optional: Prompt to run analyzer
Write-Host "Would you like to run the analyzer now? (y/N): " -ForegroundColor Yellow -NoNewline
$runAnalyzer = Read-Host

if ($runAnalyzer -eq 'y' -or $runAnalyzer -eq 'Y') {
    Write-Host "`nRunning analyzer..." -ForegroundColor Yellow
    node scripts/batch-merger-fixer-v2.mjs --analyze

    Write-Host "`n✅ Analyzer complete! Check reports/runs/ for results." -ForegroundColor Green
}

Write-Host "`n🎉 Error-Brain system is ready for use!`n" -ForegroundColor Green
