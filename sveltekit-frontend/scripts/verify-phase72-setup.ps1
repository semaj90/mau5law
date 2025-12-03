#!/usr/bin/env pwsh

<#
.SYNOPSIS
Verify Phase 72-78 Error Brain setup
.DESCRIPTION
Checks all components are in place and ready
#>

Write-Host "🔍 Phase 72-78 Setup Verification" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$checks = @(
    @{
        name = "Error watcher script"
        path = "scripts/phase72-watch-dev-logs.mjs"
        type = "file"
    },
    @{
        name = "Theme CSS"
        path = "src/lib/styles/yorha-crimson-theme.css"
        type = "file"
    },
    @{
        name = "Shared layout"
        path = "src/routes/(yorha)/+layout.svelte"
        type = "file"
    },
    @{
        name = "Analysis center page"
        path = "src/routes/analysis-center/+page.svelte"
        type = "file"
    },
    @{
        name = "Analysis center server"
        path = "src/routes/analysis-center/+page.server.ts"
        type = "file"
    },
    @{
        name = "Capture error API"
        path = "src/routes/api/phase72/capture-error/+server.ts"
        type = "file"
    },
    @{
        name = "Suggest fix API"
        path = "src/routes/api/phase72/suggest-fix/+server.ts"
        type = "file"
    }
)

$passed = 0
$failed = 0

foreach ($check in $checks) {
    $fullPath = Join-Path $PSScriptRoot ".." $check.path

    if (Test-Path $fullPath) {
        Write-Host "✅ $($check.name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ $($check.name) - NOT FOUND" -ForegroundColor Red
        Write-Host "   Expected: $fullPath" -ForegroundColor Yellow
        $failed++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Check package.json for dev:brain script
Write-Host ""
Write-Host "📦 Checking package.json scripts..." -ForegroundColor Cyan

$packageJson = Get-Content (Join-Path $PSScriptRoot ".." "package.json") | ConvertFrom-Json

if ($packageJson.scripts."dev:brain") {
    Write-Host "✅ dev:brain script found" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ dev:brain script NOT found in package.json" -ForegroundColor Red
    $failed++
}

if ($packageJson.scripts."dev:quic:vite-only") {
    Write-Host "✅ dev:quic:vite-only script found" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ dev:quic:vite-only script NOT found in package.json" -ForegroundColor Red
    $failed++
}

# Check infrastructure
Write-Host ""
Write-Host "🔧 Checking infrastructure..." -ForegroundColor Cyan

try {
    $ollamaHealth = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -ErrorAction SilentlyContinue
    if ($ollamaHealth) {
        Write-Host "✅ Ollama is running" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "⚠️  Ollama not responding (optional)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "  ✅ Passed: $passed" -ForegroundColor Green
Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All checks passed! Ready to start." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. npm run dev:brain" -ForegroundColor Yellow
    Write-Host "  2. Introduce a TypeScript error" -ForegroundColor Yellow
    Write-Host "  3. Watch terminal for 🧠 Error Brain Suggestion" -ForegroundColor Yellow
    Write-Host ""
    exit 0
} else {
    Write-Host "⚠️  Some checks failed. Please review above." -ForegroundColor Red
    exit 1
}
