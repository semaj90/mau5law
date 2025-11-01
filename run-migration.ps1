<#
.SYNOPSIS
  Combined Svelte 5 migration runner - runs both regex and AST fixes
.DESCRIPTION
  Two-phase approach:
  Phase 1: Fast regex-based structural fixes (HTML, CSS, events)
  Phase 2: AST-based TypeScript transformations (imports, types)
.EXAMPLE
  .\run-migration.ps1 -DryRun
  .\run-migration.ps1 -TargetSrcOnly
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$TargetSrcOnly = $true,  # Only process src/ by default
    [string]$RootPath = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SVELTE 5 MIGRATION - TWO-PHASE RUNNER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Root: $RootPath"
Write-Host "Dry Run: $DryRun"
Write-Host "Target src/ only: $TargetSrcOnly"
Write-Host ""

# Check prerequisites
if (-not (Test-Path (Join-Path $RootPath "package.json"))) {
    Write-Host "ERROR: package.json not found in $RootPath" -ForegroundColor Red
    exit 1
}

Write-Host "PHASE 1: Regex-based structural fixes" -ForegroundColor Yellow
Write-Host "--------------------------------------"

# Run Phase 1 script
$phase1Script = Join-Path (Split-Path $RootPath) "fix-svelte5-migration.ps1"
if (Test-Path $phase1Script) {
    if ($DryRun) {
        & $phase1Script -DryRun -RootPath $RootPath
    } else {
        & $phase1Script -RootPath $RootPath
    }
    Write-Host "`nPhase 1 complete!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Phase 1 script not found at $phase1Script" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PHASE 2: AST-based TypeScript fixes" -ForegroundColor Yellow
Write-Host "------------------------------------"

# Run Phase 2 script (existing AST fixes)
$phase2Script = Join-Path (Split-Path $RootPath) "fix-svelte5-ast.ps1"
if (Test-Path $phase2Script) {
    if ($DryRun) {
        & $phase2Script -DryRun -RootPath $RootPath -FilesLimit 500
    } else {
        & $phase2Script -RootPath $RootPath
    }
    Write-Host "`nPhase 2 complete!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Phase 2 script not found at $phase2Script" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PHASE 3: AST normalization (ts-morph)" -ForegroundColor Yellow
Write-Host "--------------------------------------"

# Run Phase 3 - AST normalization
$scriptsPath = Join-Path $RootPath "scripts"
$astScript = Join-Path $scriptsPath "codemods\ast-normalize.mjs"

if (Test-Path $astScript) {
    Write-Host "Running ts-morph AST normalization..." -ForegroundColor Cyan
    
    # Check dependencies
    $nodeModules = Join-Path $scriptsPath "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing codemod dependencies..." -ForegroundColor Yellow
        Push-Location $scriptsPath
        & npm install --no-audit --no-fund 2>&1 | Out-Null
        Pop-Location
    }
    
    if (-not $DryRun) {
        & node --max-old-space-size=8192 $astScript
        Write-Host "`nPhase 3 complete!" -ForegroundColor Green
    } else {
        Write-Host "Skipping Phase 3 in dry-run mode" -ForegroundColor Gray
    }
} else {
    Write-Host "WARNING: Phase 3 script not found" -ForegroundColor Yellow
    Write-Host "Install with: cd sveltekit-frontend\scripts && npm install" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MIGRATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review logs in: $RootPath\*-$timestamp.log"
Write-Host "  2. Run: cd $RootPath"
Write-Host "  3. Run: npx svelte-check --threshold error"
Write-Host "  4. Run: npm run check"
Write-Host "  5. Run: npm run dev"
Write-Host ""

if ($DryRun) {
    Write-Host "NOTE: This was a DRY RUN - no files were modified" -ForegroundColor Magenta
    Write-Host "Run without -DryRun to apply changes" -ForegroundColor Magenta
}
