#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 88: Test Error Fixes + Update KB (Complete Pipeline)

.DESCRIPTION
    Runs the complete error fixing pipeline:
    1. Tests KB retrieval with real TS/Svelte errors
    2. Validates fixes match expected patterns
    3. Logs successful patterns + negative reinforcements
    4. Updates Qdrant KB with learned patterns

.EXAMPLE
    .\scripts\phase88-test-and-learn.ps1
    # Full pipeline: test → validate → update KB
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host "`n🎓 Phase 88: Test Error Fixes + Knowledge Base Learning" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$totalStart = Get-Date

# Step 1: Run error fix tests
Write-Host "🧪 Step 1/2: Testing Error Fixes with KB Retrieval" -ForegroundColor Cyan
Write-Host ""

try {
    node scripts/phase88-test-error-fixes.mjs
    $testExitCode = $LASTEXITCODE

    if ($testExitCode -eq 0) {
        Write-Host "`n✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Some tests failed (this is expected - we learn from failures)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ Test execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Update KB from test results
Write-Host "📚 Step 2/2: Updating Knowledge Base" -ForegroundColor Cyan
Write-Host ""

try {
    node scripts/phase88-update-kb-from-fixes.mjs
    $updateExitCode = $LASTEXITCODE

    if ($updateExitCode -eq 0) {
        Write-Host "`n✅ KB updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  KB update had issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ KB update failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Summary
$totalEnd = Get-Date
$totalDuration = ($totalEnd - $totalStart).TotalSeconds

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 Pipeline Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Total time: $([math]::Round($totalDuration, 1))s" -ForegroundColor Yellow
Write-Host ""

# Check KB log stats
$logPath = "reports/kb-error-fixes.jsonl"
if (Test-Path $logPath) {
    $logLines = Get-Content $logPath
    $totalEntries = $logLines.Count
    $negativeCount = 0

    foreach ($line in $logLines) {
        try {
            $entry = $line | ConvertFrom-Json
            if ($entry.negative_patterns) {
                $negativeCount++
            }
        } catch {}
    }

    $positiveCount = $totalEntries - $negativeCount

    Write-Host "📚 Knowledge Base Learning Stats:" -ForegroundColor Cyan
    Write-Host "   Total patterns stored: $totalEntries" -ForegroundColor Gray
    Write-Host "   ✅ Positive examples: $positiveCount" -ForegroundColor Green
    Write-Host "   ❌ Negative reinforcements: $negativeCount" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "✨ Pipeline complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Verify KB retrieval:" -ForegroundColor Gray
Write-Host "      .\scripts\phase88-verify-kb.ps1 -Quick" -ForegroundColor White
Write-Host ""
Write-Host "   2. Test autonomous agent:" -ForegroundColor Gray
Write-Host "      node scripts/phase86-autonomous-loop.mjs" -ForegroundColor White
Write-Host ""
Write-Host "   3. View learned patterns:" -ForegroundColor Gray
Write-Host "      Get-Content reports/kb-error-fixes.jsonl | ConvertFrom-Json | Format-Table test_id, validation_passed, error_code" -ForegroundColor White
Write-Host ""

exit 0
