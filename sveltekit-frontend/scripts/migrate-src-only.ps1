<#
.SYNOPSIS
    SvelteKit 2 + Svelte 5 Migration Script (Source Code Only)

.DESCRIPTION
    Runs official sv-migrate scripts targeting ONLY the src/ folder.
    This avoids parse errors from logs, build artifacts, backups, etc.

    Migration order:
    1. npx sv migrate package (update @sveltejs/package)
    2. npx sv migrate sveltekit-2 (Kit v1 → v2)
    3. npx sv migrate svelte-5 (Svelte 4 → 5)
    4. npx sv migrate self-closing-tags (optional cleanup)

.PARAMETER Step
    Which migration step to run: 'package', 'sveltekit-2', 'svelte-5', 'self-closing-tags', 'all'

.PARAMETER DryRun
    Preview what would happen without making changes

.PARAMETER SkipInstall
    Skip npm install after each step

.EXAMPLE
    .\scripts\migrate-src-only.ps1 -Step sveltekit-2
    .\scripts\migrate-src-only.ps1 -Step svelte-5
    .\scripts\migrate-src-only.ps1 -Step all -DryRun
#>

param (
    [ValidateSet('package', 'sveltekit-2', 'svelte-5', 'self-closing-tags', 'routes', 'all')]
    [string]$Step = 'all',

    [Switch]$DryRun,
    [Switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host "`n$('═' * 60)" -ForegroundColor Magenta
    Write-Host "  $Message" -ForegroundColor Magenta
    Write-Host "$('═' * 60)`n" -ForegroundColor Magenta
}

function Write-Step {
    param([string]$Message)
    Write-Host "👉 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Ensure we're in the right directory
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Header "SvelteKit 2 + Svelte 5 Migration (src/ only)"

Write-Host "Project Root: $projectRoot" -ForegroundColor DarkGray
Write-Host "Target Folder: src/" -ForegroundColor DarkGray
Write-Host "Step: $Step" -ForegroundColor DarkGray
Write-Host "Dry Run: $DryRun" -ForegroundColor DarkGray
Write-Host ""

# Pre-flight checks
Write-Step "Pre-flight checks..."

# Check node_modules
if (!(Test-Path "node_modules")) {
    Write-Warning "node_modules not found. Running npm install first..."
    npm install
}

# Check src/ exists
if (!(Test-Path "src")) {
    Write-ErrorMsg "src/ folder not found! Are you in the right project?"
    exit 1
}

Write-Success "Pre-flight checks passed"

# Run svelte-check first to identify parse errors
Write-Step "Running svelte-check to identify blocking parse errors..."
Write-Host "(This helps identify files that need manual fixes before migration)" -ForegroundColor DarkGray

$checkResult = npx svelte-check --threshold error 2>&1 | Out-String
$parseErrors = $checkResult | Select-String -Pattern "ParseError|Unexpected|unterminated" -AllMatches
if ($parseErrors.Matches.Count -gt 0) {
    Write-Warning "Found $($parseErrors.Matches.Count) potential parse errors"
    Write-Host "Consider fixing these before running migration:" -ForegroundColor Yellow
    Write-Host $parseErrors.Line -ForegroundColor DarkGray
}

# Migration functions
function Run-Migration {
    param(
        [string]$Name,
        [string]$Command
    )

    Write-Header "Running: $Name"

    if ($DryRun) {
        Write-Host "[DRY RUN] Would execute: $Command" -ForegroundColor Yellow
        return
    }

    Write-Step "Executing migration..."
    Write-Host "Command: $Command" -ForegroundColor DarkGray
    Write-Host ""
    Write-Warning "When prompted 'Which folders should be migrated?', select ONLY 'src/'"
    Write-Host ""

    # Run the migration
    Invoke-Expression $Command

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Migration failed with exit code $LASTEXITCODE"
        Write-Host "Check the output above for errors. Common issues:" -ForegroundColor Yellow
        Write-Host "  - Parse errors in .svelte files (fix manually first)" -ForegroundColor DarkGray
        Write-Host "  - Missing dependencies (run npm install)" -ForegroundColor DarkGray
        return $false
    }

    # Run npm install after migration (unless skipped)
    if (!$SkipInstall) {
        Write-Step "Running npm install to update dependencies..."
        npm install
    }

    Write-Success "$Name completed successfully"
    return $true
}

# Execute requested migrations
$migrations = @{
    'package' = 'npx sv migrate package'
    'sveltekit-2' = 'npx sv migrate sveltekit-2'
    'svelte-5' = 'npx sv migrate svelte-5'
    'self-closing-tags' = 'npx sv migrate self-closing-tags'
    'routes' = 'npx sv migrate routes'
}

$order = @('package', 'sveltekit-2', 'svelte-5', 'self-closing-tags')

if ($Step -eq 'all') {
    Write-Header "Running ALL migrations in order"

    foreach ($migrationName in $order) {
        $success = Run-Migration -Name $migrationName -Command $migrations[$migrationName]
        if (!$success -and !$DryRun) {
            Write-ErrorMsg "Migration pipeline stopped at: $migrationName"
            Write-Host "Fix the issues above, then rerun with: -Step $migrationName" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Run-Migration -Name $Step -Command $migrations[$Step]
}

# Final summary
Write-Header "Migration Summary"

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review changes: git diff" -ForegroundColor Gray
Write-Host "  2. Run svelte-check: npx svelte-check" -ForegroundColor Gray
Write-Host "  3. Test the app: npm run dev" -ForegroundColor Gray
Write-Host "  4. Commit when ready: git add -A && git commit -m 'Migrate to SvelteKit 2 + Svelte 5'" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Warning "This was a DRY RUN - no changes were made"
    Write-Host "Run again without -DryRun to apply migrations" -ForegroundColor Yellow
} else {
    Write-Success "Migration complete! Review the changes before committing."
}
