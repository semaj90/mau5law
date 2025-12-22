#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated Error Fix Script for Svelte 5 + SvelteKit 2 Migration

.DESCRIPTION
    Applies systematic fixes for common TypeScript/Svelte errors
    - SuperForms v2 adapter pattern
    - ESM import extensions
    - Type import corrections
    - Svelte 5 runes migration preparation

.PARAMETER DryRun
    Show what would be changed without applying fixes

.PARAMETER Category
    Fix only specific category: superforms, esm, types, all (default: all)
#>

param(
    [switch]$DryRun,
    [ValidateSet('superforms', 'esm', 'types', 'all')]
    [string]$Category = 'all'
)

$ErrorActionPreference = 'Stop'
$fixed = 0
$errors = 0

Write-Host "🔧 Automated Fix System - Svelte 5 + SvelteKit 2" -ForegroundColor Cyan
Write-Host "=" * 80
Write-Host ""

# ============================================================================
# Fix 1: SuperForms v2 Adapter Pattern
# ============================================================================
function Fix-SuperForms {
    Write-Host "📋 Fix 1: SuperForms v2 Adapter Pattern" -ForegroundColor Yellow
    Write-Host "   Converting to zod() adapter wrapper..." -ForegroundColor Gray

    $files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.svelte" `
        | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.svelte-kit\\|\\.bak' }

    $count = 0

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content

        # Pattern 1: Missing zod import
        if ($content -match "superValidate\(" -and $content -notmatch "import.*\{.*zod.*\}.*from.*sveltekit-superforms/adapters") {
            # Add zod import after superValidate import
            $content = $content -replace `
                "(import\s+\{[^}]*superValidate[^}]*\}\s+from\s+['`"]sveltekit-superforms(?:/server)?['`"];?)", `
                "`$1`nimport { zod } from 'sveltekit-superforms/adapters';"
        }

        # Pattern 2: Direct schema usage (needs zod wrapper)
        $content = $content -replace `
            "superValidate\((\w+Schema)\)", `
            "superValidate(zod(`$1))"

        # Pattern 3: With data parameter
        $content = $content -replace `
            "superValidate\((\w+),\s*(\w+Schema)\)", `
            "superValidate(`$1, zod(`$2))"

        # Pattern 4: Type-only import of zod (should be value import)
        $content = $content -replace `
            "import\s+type\s+\{\s*zod\s*\}\s+from\s+['`"]sveltekit-superforms/adapters['`"]", `
            "import { zod } from 'sveltekit-superforms/adapters'"

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content $file.FullName -Value $content -NoNewline
            }
            Write-Host "  ✅ Fixed: $($file.Name)" -ForegroundColor Green
            $count++
            $script:fixed++
        }
    }

    Write-Host "   Fixed $count files`n" -ForegroundColor Cyan
}

# ============================================================================
# Fix 2: ESM Import Extensions
# ============================================================================
function Fix-ESMImports {
    Write-Host "📋 Fix 2: ESM Import Extensions (.js)" -ForegroundColor Yellow
    Write-Host "   Adding .js extensions to relative imports..." -ForegroundColor Gray

    $files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.js" `
        | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.svelte-kit\\|\\.bak|\.d\.ts$' }

    $count = 0

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content

        # Pattern: Relative imports without .js extension
        # Matches: from './file' or from '../dir/file' but not from './file.js'
        $content = $content -replace `
            "from\s+['`"](\./[^'`"]+?)(?<!\.js|\.ts|\.svelte)['`"]", `
            "from '`$1.js'"

        $content = $content -replace `
            "from\s+['`"](\.\./[^'`"]+?)(?<!\.js|\.ts|\.svelte)['`"]", `
            "from '`$1.js'"

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content $file.FullName -Value $content -NoNewline
            }
            Write-Host "  ✅ Fixed: $($file.Name)" -ForegroundColor Green
            $count++
            $script:fixed++
        }
    }

    Write-Host "   Fixed $count files`n" -ForegroundColor Cyan
}

# ============================================================================
# Fix 3: Type Import Corrections
# ============================================================================
function Fix-TypeImports {
    Write-Host "📋 Fix 3: Type Import Corrections" -ForegroundColor Yellow
    Write-Host "   Separating type-only imports..." -ForegroundColor Gray

    $files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.svelte" `
        | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.svelte-kit\\|\\.bak' }

    $count = 0

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content

        # Pattern 1: PageServerLoad, PageLoad, etc. should be type imports
        $content = $content -replace `
            "import\s+\{\s*(PageServerLoad|PageLoad|LayoutServerLoad|LayoutLoad|RequestHandler)\s*\}\s+from\s+['`"]\.\/\$types['`"]", `
            "import type { `$1 } from './$types'"

        # Pattern 2: Type imports without 'type' keyword from type-only modules
        $typeOnlyModules = @(
            '\$lib/types',
            '\$lib/server/db/schema',
            '@sveltejs/kit'
        )

        foreach ($module in $typeOnlyModules) {
            $content = $content -replace `
                "import\s+\{([^}]+)\}\s+from\s+['`"]$module['`"]", `
                "import type {`$1} from '$module'"
        }

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content $file.FullName -Value $content -NoNewline
            }
            Write-Host "  ✅ Fixed: $($file.Name)" -ForegroundColor Green
            $count++
            $script:fixed++
        }
    }

    Write-Host "   Fixed $count files`n" -ForegroundColor Cyan
}

# ============================================================================
# Fix 4: Common Svelte 5 Compatibility Issues
# ============================================================================
function Fix-Svelte5Compat {
    Write-Host "📋 Fix 4: Svelte 5 Compatibility Prep" -ForegroundColor Yellow
    Write-Host "   Preparing for Svelte 5 runes migration..." -ForegroundColor Gray

    $files = Get-ChildItem -Path "src" -Recurse -Include "*.svelte" `
        | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.svelte-kit\\|\\.bak' }

    $count = 0

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content

        # Pattern 1: Fix store auto-subscriptions (already compatible with Svelte 5)
        # Just flag files that need manual review for $: reactive statements

        # Pattern 2: Replace deprecated $$ syntax
        $content = $content -replace '\$\$props', '$props()'
        $content = $content -replace '\$\$slots', '$slots()'

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content $file.FullName -Value $content -NoNewline
            }
            Write-Host "  ✅ Fixed: $($file.Name)" -ForegroundColor Green
            $count++
            $script:fixed++
        }
    }

    Write-Host "   Fixed $count files`n" -ForegroundColor Cyan
}

# ============================================================================
# Main Execution
# ============================================================================

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified`n" -ForegroundColor Magenta
}

try {
    if ($Category -eq 'all' -or $Category -eq 'superforms') {
        Fix-SuperForms
    }

    if ($Category -eq 'all' -or $Category -eq 'esm') {
        Fix-ESMImports
    }

    if ($Category -eq 'all' -or $Category -eq 'types') {
        Fix-TypeImports
    }

    if ($Category -eq 'all') {
        Fix-Svelte5Compat
    }

    Write-Host ""
    Write-Host "=" * 80
    Write-Host "📊 Fix Summary:" -ForegroundColor Cyan
    Write-Host "   ✅ Files Fixed: $fixed" -ForegroundColor Green

    if ($DryRun) {
        Write-Host "`n💡 Run without -DryRun to apply these fixes" -ForegroundColor Yellow
    } else {
        Write-Host "`n🔍 Running type check to verify fixes...`n" -ForegroundColor Cyan

        # Run TypeScript check
        $checkOutput = npm run check 2>&1
        $errorCount = ($checkOutput | Select-String "error TS" | Measure-Object).Count

        Write-Host "📊 Type Check Results:" -ForegroundColor Cyan
        Write-Host "   Errors: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })

        if ($errorCount -gt 0) {
            Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
            Write-Host "   1. Review remaining errors: npm run check" -ForegroundColor Gray
            Write-Host "   2. Apply AI suggestions: node scripts/apply-ai-patches.mjs" -ForegroundColor Gray
            Write-Host "   3. Run Svelte 5 migration: npx sv migrate svelte-5" -ForegroundColor Gray
        }
    }

    Write-Host "=" * 80
    Write-Host ""

} catch {
    Write-Host "❌ Error during fix application: $_" -ForegroundColor Red
    $script:errors++
    exit 1
}

exit 0
