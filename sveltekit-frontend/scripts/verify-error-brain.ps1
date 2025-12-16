#!/usr/bin/env pwsh
# Quick verification that error-brain system is ready

Write-Host "`n🔍 Error-Brain System Verification`n" -ForegroundColor Cyan

$errors = 0

# Check 1: Core files exist
Write-Host "Test 1: Core Files" -ForegroundColor Yellow
$coreFiles = @(
    "src\lib\server\error-brain\events.ts",
    "src\lib\server\error-brain\feature-flags.ts",
    "src\lib\server\error-brain\middleware.ts",
    "src\lib\server\error-brain\run-tracker.ts"
)

foreach ($file in $coreFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $errors++
    }
}

# Check 2: Transport files
Write-Host "`nTest 2: Transport Layer" -ForegroundColor Yellow
$transportFiles = @(
    "src\lib\server\error-brain\transport\interface.ts",
    "src\lib\server\error-brain\transport\none.ts",
    "src\lib\server\error-brain\transport\sse.ts",
    "src\lib\server\error-brain\transport\redis.ts",
    "src\lib\server\error-brain\transport\mux.ts",
    "src\lib\server\error-brain\transport\factory.ts"
)

foreach ($file in $transportFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $errors++
    }
}

# Check 3: API endpoints
Write-Host "`nTest 3: API Endpoints" -ForegroundColor Yellow
$endpoints = @(
    "src\routes\api\internal\error-brain\status\+server.ts",
    "src\routes\api\internal\error-brain\runs\+server.ts",
    "src\routes\api\internal\error-brain\runs\[runId]\+server.ts",
    "src\routes\api\internal\error-brain\stream\+server.ts"
)

foreach ($file in $endpoints) {
    # Escape brackets for Test-Path
    $testPath = $file -replace '\[', '`[' -replace '\]', '`]'
    if (Test-Path $testPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $errors++
    }
}

# Check 4: Diff scripts
Write-Host "`nTest 4: Diff Scripts" -ForegroundColor Yellow
$diffScripts = @(
    "scripts\diff\generator.mjs",
    "scripts\diff\applier.mjs",
    "scripts\diff\reporter.mjs"
)

foreach ($file in $diffScripts) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $errors++
    }
}

# Check 5: Documentation
Write-Host "`nTest 5: Documentation" -ForegroundColor Yellow
$docs = @(
    "ERROR_BRAIN_GUIDE.md",
    "ERROR_BRAIN_INCIDENTS.md",
    "ERROR_BRAIN_COMPLETE.md",
    "ERROR_BRAIN_TESTING.md"
)

foreach ($file in $docs) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $errors++
    }
}

# Check 6: Test scripts
Write-Host "`nTest 6: Test Scripts" -ForegroundColor Yellow
if (Test-Path "scripts\test-error-brain-http.mjs") {
    Write-Host "  ✅ scripts\test-error-brain-http.mjs" -ForegroundColor Green
} else {
    Write-Host "  ❌ scripts\test-error-brain-http.mjs MISSING" -ForegroundColor Red
    $errors++
}

if (Test-Path "scripts\batch-merger-fixer-v2.mjs") {
    Write-Host "  ✅ scripts\batch-merger-fixer-v2.mjs" -ForegroundColor Green
} else {
    Write-Host "  ❌ scripts\batch-merger-fixer-v2.mjs MISSING" -ForegroundColor Red
    $errors++
}

# Check 7: CI workflow
Write-Host "`nTest 7: CI Configuration" -ForegroundColor Yellow
if (Test-Path "..\.github\workflows\error-brain-check.yml") {
    Write-Host "  ✅ .github/workflows/error-brain-check.yml" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .github/workflows/error-brain-check.yml MISSING (optional)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n$('=' * 60)" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✅ All critical files present!" -ForegroundColor Green
    Write-Host "   Error-Brain system is ready to test." -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Start dev server: npm run dev" -ForegroundColor White
    Write-Host "   2. Run HTTP test: node scripts/test-error-brain-http.mjs" -ForegroundColor White
    Write-Host "   3. See ERROR_BRAIN_TESTING.md for full instructions" -ForegroundColor White
} else {
    Write-Host "❌ $errors critical file(s) missing!" -ForegroundColor Red
    Write-Host "   Review implementation logs and re-create missing files." -ForegroundColor Red
    exit 1
}
Write-Host "$('=' * 60)`n" -ForegroundColor Cyan
