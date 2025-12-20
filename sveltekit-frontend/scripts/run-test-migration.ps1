#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Execute test migration and .txt organization
.DESCRIPTION
    Runs the three-step process to organize .txt files and migrate tests
#>

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Test Fix & .txt Organization - Execution Starting       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Organize .txt files
Write-Host "📁 Step 1: Organizing .txt files..." -ForegroundColor Yellow
Write-Host "   Running: node scripts/organize-txt-files.mjs --apply`n" -ForegroundColor Gray

Push-Location "c:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
& node scripts/organize-txt-files.mjs --apply

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Step 1 Complete: .txt files organized`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Step 1 Failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 2: Migrate tests
Write-Host "🔧 Step 2: Migrating tests to new mock infrastructure..." -ForegroundColor Yellow
Write-Host "   Running: node scripts/migrate-tests-to-mocks.mjs --apply`n" -ForegroundColor Gray

& node scripts/migrate-tests-to-mocks.mjs --apply

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Step 2 Complete: Tests migrated`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Step 2 Failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 3: Run tests
Write-Host "🧪 Step 3: Running tests to verify..." -ForegroundColor Yellow
Write-Host "   Running: npm run test:run`n" -ForegroundColor Gray

& npm run test:run

Pop-Location

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Execution Complete - Check Results Above                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
