# ==============================================================
# PHASE 34–37 PROTECTED PIPELINE
# --------------------------------------------------------------
# Safe end-to-end cleanup for:
#   • TypeScript AST reconstruction (Phase 34)
#   • AssemblyScript / WASM repair (Phase 35)
#   • Svelte 5 syntax cleanup (Protected)
#   • Validation + Reporting (Phases 36–37)
# ==============================================================

$ErrorActionPreference = "Stop"
$root = "C:\Users\james\Videos\deeds-web-app"

Write-Host "`n$('═' * 60)" -ForegroundColor Cyan
Write-Host "🚀 Starting PHASE 34–37 PROTECTED CLEANUP" -ForegroundColor Cyan
Write-Host "$('═' * 60)`n" -ForegroundColor Cyan

# Create log directory
$logDir = "$root\scripts\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Start timestamp
$startTime = Get-Date
Write-Host "⏱️  Start time: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))`n" -ForegroundColor Gray

# --------------------------------------------------------------
# Pre-flight: Git Safety Backup
# --------------------------------------------------------------
Write-Host "💾 Creating pre-phase backup commit..." -ForegroundColor Yellow
cd $root
git add -A 2>&1 | Out-Null
$commitResult = git commit -m "pre-phase34-37-protected: comprehensive cleanup" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup commit created`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  No changes to commit (already backed up)`n" -ForegroundColor Yellow
}

# --------------------------------------------------------------
# Phase 34 – AST Reconstruction
# --------------------------------------------------------------
Write-Host "$('═' * 50)" -ForegroundColor Cyan
Write-Host "🔧 Phase 34: AST Token Reconstruction" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

$phase34Start = Get-Date
node "$root\scripts\fix-phase34-ast.mjs" 2>&1 | Tee-Object -FilePath "$logDir\phase34-output.log"
$phase34Duration = (Get-Date) - $phase34Start

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Phase 34 completed in $([math]::Round($phase34Duration.TotalSeconds, 1))s" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Phase 34 had issues (continuing...)" -ForegroundColor Yellow
}

# --------------------------------------------------------------
# Phase 35 – WASM / AssemblyScript Repair
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "🔧 Phase 35: WASM / AssemblyScript Repair" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

$phase35Start = Get-Date
node "$root\scripts\fix-phase35-wasm.mjs" 2>&1 | Tee-Object -FilePath "$logDir\phase35-output.log"
$phase35Duration = (Get-Date) - $phase35Start

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Phase 35 completed in $([math]::Round($phase35Duration.TotalSeconds, 1))s" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Phase 35 had issues (continuing...)" -ForegroundColor Yellow
}

# --------------------------------------------------------------
# Phase 35.5 – Svelte 5 Syntax & Script Tag Fix (Protected)
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "🧩 Phase 35.5: Svelte 5 Script Tag & Import Cleanup (Protected)" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

$phase355Start = Get-Date
node "$root\scripts\fix-svelte-phase5-protected.mjs" 2>&1 | Tee-Object -FilePath "$logDir\phase35-5-output.log"
$phase355Duration = (Get-Date) - $phase355Start

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Phase 35.5 completed in $([math]::Round($phase355Duration.TotalSeconds, 1))s" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Phase 35.5 had issues (continuing...)" -ForegroundColor Yellow
}

# --------------------------------------------------------------
# Phase 36 – TypeScript Validation
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "🔍 Phase 36: TypeScript Validation" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

cd "$root\sveltekit-frontend"
Write-Host "Running TypeScript check..." -ForegroundColor Yellow

$phase36Start = Get-Date
npm run check:typescript 2>&1 | Out-File "$logDir\phase36-typescript-validation.log" -Encoding utf8
$phase36Duration = (Get-Date) - $phase36Start

# Count errors
$tsErrors = (Get-Content "$logDir\phase36-typescript-validation.log" | Select-String "error TS" | Measure-Object).Count

Write-Host "`n📊 TypeScript validation results:" -ForegroundColor Cyan
Write-Host "   Total TS errors: $tsErrors" -ForegroundColor $(if ($tsErrors -lt 8000) { 'Green' } elseif ($tsErrors -lt 20000) { 'Yellow' } else { 'Red' })
Write-Host "   Log saved: scripts\logs\phase36-typescript-validation.log" -ForegroundColor Gray
Write-Host "   Completed in $([math]::Round($phase36Duration.TotalSeconds, 1))s" -ForegroundColor Gray

cd $root

# --------------------------------------------------------------
# Phase 36.5 – Svelte Validation
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "🔍 Phase 36.5: Svelte Validation" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

cd "$root\sveltekit-frontend"
Write-Host "Running Svelte check..." -ForegroundColor Yellow

$phase365Start = Get-Date
npm run check:svelte 2>&1 | Out-File "$logDir\phase36-5-svelte-validation.log" -Encoding utf8
$phase365Duration = (Get-Date) - $phase365Start

# Count Svelte errors
$svelteErrors = (Get-Content "$logDir\phase36-5-svelte-validation.log" | Select-String "Error:" | Measure-Object).Count

Write-Host "`n📊 Svelte validation results:" -ForegroundColor Cyan
Write-Host "   Svelte errors: $svelteErrors" -ForegroundColor $(if ($svelteErrors -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "   Log saved: scripts\logs\phase36-5-svelte-validation.log" -ForegroundColor Gray
Write-Host "   Completed in $([math]::Round($phase365Duration.TotalSeconds, 1))s" -ForegroundColor Gray

cd $root

# --------------------------------------------------------------
# Phase 37 – Summary Report
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "📊 Phase 37: Final Summary Report" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

node "$root\scripts\phase5-report.mjs"

# --------------------------------------------------------------
# Error Scanner
# --------------------------------------------------------------
Write-Host "`n$('═' * 50)" -ForegroundColor Cyan
Write-Host "🔍 Running Error Prioritization Scanner" -ForegroundColor Cyan
Write-Host "$('═' * 50)`n" -ForegroundColor Cyan

node "$root\scripts\prioritize-error-fixes.mjs" 2>&1 | Select-Object -First 40 | Tee-Object -FilePath "$logDir\phase37-error-scan.log"

# --------------------------------------------------------------
# Final Summary
# --------------------------------------------------------------
$totalDuration = (Get-Date) - $startTime

Write-Host "`n$('═' * 60)" -ForegroundColor Green
Write-Host "✅ PHASE 34–37 PROTECTED CLEANUP COMPLETED" -ForegroundColor Green
Write-Host "$('═' * 60)`n" -ForegroundColor Green

Write-Host "⏱️  Total execution time: $([math]::Round($totalDuration.TotalMinutes, 1)) minutes`n" -ForegroundColor Cyan

Write-Host "📊 Phase Execution Times:" -ForegroundColor Cyan
Write-Host "   Phase 34 (AST):        $([math]::Round($phase34Duration.TotalSeconds, 1))s" -ForegroundColor White
Write-Host "   Phase 35 (WASM):       $([math]::Round($phase35Duration.TotalSeconds, 1))s" -ForegroundColor White
Write-Host "   Phase 35.5 (Svelte):   $([math]::Round($phase355Duration.TotalSeconds, 1))s" -ForegroundColor White
Write-Host "   Phase 36 (TS Check):   $([math]::Round($phase36Duration.TotalSeconds, 1))s" -ForegroundColor White
Write-Host "   Phase 36.5 (Svelte):   $([math]::Round($phase365Duration.TotalSeconds, 1))s" -ForegroundColor White

Write-Host "`n📈 Error Metrics:" -ForegroundColor Cyan
Write-Host "   TypeScript errors: $tsErrors" -ForegroundColor $(if ($tsErrors -lt 8000) { 'Green' } elseif ($tsErrors -lt 20000) { 'Yellow' } else { 'Red' })
Write-Host "   Svelte errors:     $svelteErrors" -ForegroundColor $(if ($svelteErrors -eq 0) { 'Green' } else { 'Yellow' })

Write-Host "`n📁 Generated Artifacts:" -ForegroundColor Cyan
Write-Host "   • Backups:      scripts\backups\phase34\, phase35-wasm\, phase5\" -ForegroundColor White
Write-Host "   • Logs:         scripts\logs\phase*-output.log" -ForegroundColor White
Write-Host "   • Reports:      scripts\phase34-report.json, phase35-report.json" -ForegroundColor White
Write-Host "   • Cache:        scripts\cache\phase5-hashes.json" -ForegroundColor White

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan

if ($tsErrors -lt 8000) {
    Write-Host "   ✅ READY FOR PHASE 38: ESLint + AI Autofix" -ForegroundColor Green
    Write-Host "   Run: .\scripts\run-phase38-eslint-ai.ps1`n" -ForegroundColor White
} elseif ($tsErrors -lt 20000) {
    Write-Host "   ⚠️  Manual fixes recommended for top 20 files" -ForegroundColor Yellow
    Write-Host "   Review: scripts\logs\phase37-error-scan.log" -ForegroundColor White
    Write-Host "   Then: .\scripts\run-phase38-eslint-ai.ps1`n" -ForegroundColor White
} else {
    Write-Host "   ⚠️  High error count - manual intervention needed" -ForegroundColor Red
    Write-Host "   1. Review top errors: scripts\logs\phase37-error-scan.log" -ForegroundColor White
    Write-Host "   2. Fix top 10-20 files manually" -ForegroundColor White
    Write-Host "   3. Re-run this pipeline`n" -ForegroundColor White
}

Write-Host "📝 Review changes:" -ForegroundColor Cyan
Write-Host "   git diff --stat" -ForegroundColor White
Write-Host "   git diff sveltekit-frontend/src" -ForegroundColor White

Write-Host "`n💾 Commit changes:" -ForegroundColor Cyan
Write-Host "   git add -A" -ForegroundColor White
Write-Host "   git commit -m 'fix: Phase 34-37 protected cleanup - AST/WASM/Svelte'" -ForegroundColor White

Write-Host ""
exit 0
