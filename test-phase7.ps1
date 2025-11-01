<#
.SYNOPSIS
  Test worker-based codemods (Phase 7)
.DESCRIPTION
  Tests fix-imports.js and fix-types.js independently
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING PHASE 7: WORKER CODEMODS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptsPath = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend\scripts"
$workerScript = Join-Path $scriptsPath "codemods\run-worker-codemods.mjs"

if (-not (Test-Path $workerScript)) {
    Write-Host "❌ Worker script not found at: $workerScript" -ForegroundColor Red
    exit 1
}

# Check dependencies
$nodeModules = Join-Path $scriptsPath "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $scriptsPath
    & npm install --no-audit --no-fund
    Pop-Location
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""
Write-Host "Running worker-based codemods..." -ForegroundColor Yellow
Write-Host "This will process all .ts, .svelte, and .js files in src/" -ForegroundColor Gray
Write-Host ""

# Run worker codemods
Push-Location "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
& node $workerScript
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 7 Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review summary: sveltekit-frontend\worker-codemods-summary-*.json"
Write-Host "  2. Test Phase 9: .\test-phase9.ps1"
Write-Host "  3. Run full migration: .\fix-svelte5-migration.ps1"
