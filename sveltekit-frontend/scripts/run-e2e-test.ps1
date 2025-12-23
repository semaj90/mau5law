#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 76: Complete E2E test with screenshots
.DESCRIPTION
    Starts services, runs AI worker, starts SvelteKit, and runs Playwright tests
#>

Write-Host "🚀 Phase 76: Complete E2E Test Pipeline" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start Docker services
Write-Host "📦 Step 1: Starting Docker services..." -ForegroundColor Yellow
& "$PSScriptRoot\start-services.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to be fully ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Start AI Worker in background
Write-Host "🤖 Step 2: Starting AI Worker..." -ForegroundColor Yellow

$workerJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\..
    node workers/ai-processor.ts
}

Write-Host "   ✅ AI Worker started (Job ID: $($workerJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 3

# Step 3: Install Playwright if needed
Write-Host "🎭 Step 3: Ensuring Playwright is installed..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules/@playwright")) {
    Write-Host "   📦 Installing Playwright..." -ForegroundColor Cyan
    npm install --save-dev @playwright/test
    npx playwright install chromium
}

# Step 4: Run Playwright tests
Write-Host "🧪 Step 4: Running Playwright tests..." -ForegroundColor Yellow
Write-Host ""

npx playwright test tests/e2e/chat.spec.ts --reporter=list,html

$testExitCode = $LASTEXITCODE

# Step 5: Stop AI Worker
Write-Host ""
Write-Host "🛑 Step 5: Stopping AI Worker..." -ForegroundColor Yellow
Stop-Job -Id $workerJob.Id
Remove-Job -Id $workerJob.Id
Write-Host "   ✅ AI Worker stopped" -ForegroundColor Green

# Step 6: Show results
Write-Host ""
Write-Host "📊 Test Results:" -ForegroundColor Cyan
Write-Host ""

if ($testExitCode -eq 0) {
    Write-Host "   ✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Some tests failed (exit code: $testExitCode)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📸 Screenshots saved to: test-results/screenshots/" -ForegroundColor Cyan
Write-Host "📄 HTML report: test-results/html/index.html" -ForegroundColor Cyan
Write-Host ""

# Open HTML report
if (Test-Path "test-results/html/index.html") {
    Write-Host "🌐 Opening HTML report..." -ForegroundColor Yellow
    Start-Process "test-results/html/index.html"
}

exit $testExitCode
