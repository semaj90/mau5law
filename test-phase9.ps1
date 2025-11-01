<#
.SYNOPSIS
  Test Phase 9 AST Normalization
.DESCRIPTION
  Runs the AST normalization on a small subset to verify it works
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING PHASE 9: AST NORMALIZATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptsPath = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend\scripts"
$astScript = Join-Path $scriptsPath "codemods\ast-normalize.mjs"

if (-not (Test-Path $astScript)) {
    Write-Host "❌ AST script not found at: $astScript" -ForegroundColor Red
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
Write-Host "Running AST normalization (8GB heap)..." -ForegroundColor Yellow
Write-Host "This will process all .ts and .svelte files in src/" -ForegroundColor Gray
Write-Host ""

# Run with output
& node --max-old-space-size=8192 $astScript

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 9 Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review log: sveltekit-frontend\ast-normalize-*.log"
Write-Host "  2. Check summary: sveltekit-frontend\ast-normalize-summary-*.json"
Write-Host "  3. Run full migration: .\fix-svelte5-migration.ps1"
