#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix bits-ui v2 API usage across SvelteKit frontend

.DESCRIPTION
    Audits and fixes:
    - bits-ui v2 named export issues (uses default exports)
    - Uno.css styling integration
    - Svelte 5 runes compatibility
    - Barrel export patterns
    - Store imports from new ui-store.ts

.EXAMPLE
    .\fix-bits-ui-v2-api.ps1 -Audit
    .\fix-bits-ui-v2-api.ps1 -Fix
    .\fix-bits-ui-v2-api.ps1 -Report
#>

param(
    [switch]$Audit,
    [switch]$Fix,
    [switch]$Report,
    [string]$Path = "sveltekit-frontend"
)

$ErrorActionPreference = "Continue"
$issues = @()
$fixed = @()

# ============================================
# Helper Functions
# ============================================

function Write-Header {
    param([string]$Text)
    Write-Host "`n$('='*60)" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host $('='*60) -ForegroundColor Cyan
}

function Write-Issue {
    param([string]$File, [string]$Issue, [string]$Severity = "Warning")
    $color = if ($Severity -eq "Error") { "Red" } else { "Yellow" }
    Write-Host "[$Severity] $File" -ForegroundColor $color
    Write-Host "  → $Issue" -ForegroundColor Gray
    $issues += @{ File = $File; Issue = $Issue; Severity = $Severity }
}

function Write-Fixed {
    param([string]$File, [string]$Action)
    Write-Host "[FIXED] $File" -ForegroundColor Green
    Write-Host "  → $Action" -ForegroundColor Gray
    $fixed += @{ File = $File; Action = $Action }
}

# ============================================
# Audit Phase
# ============================================

function Invoke-Audit {
    Write-Header "AUDITING bits-ui v2 API Usage"

    # Find all .svelte and .ts files
    $files = Get-ChildItem -Path $Path -Recurse -Include "*.svelte", "*.ts" -Exclude "node_modules", ".svelte-kit", "dist"

    Write-Host "Scanning $($files.Count) files..." -ForegroundColor Cyan

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        $relativePath = $file.FullName -replace [regex]::Escape($Path), ""

        # Check 1: Named exports from bits-ui (should be default exports)
        if ($content -match 'from\s+["\']bits-ui["\']' -and $content -match 'import\s+\{\s*\w+\s*\}') {
            Write-Issue $relativePath "Uses named exports from bits-ui (v2 uses default exports)" "Error"
        }

        # Check 2: Old .svelte.ts store imports
        if ($content -match "from\s+['\"].*ui-store\.svelte['\"]") {
            Write-Issue $relativePath "Imports from ui-store.svelte (should be ui-store.ts)" "Error"
        }

        # Check 3: Missing Uno.css classes
        if ($file.Extension -eq ".svelte" -and $content -match 'class="[^"]*"' -and -not ($content -match 'class="[^"]*(?:p-|m-|w-|h-|flex|grid|text-)[^"]*"')) {
            if ($content -match 'style=') {
                Write-Issue $relativePath "Uses inline styles instead of Uno.css classes" "Warning"
            }
        }

        # Check 4: Svelte 5 runes in .svelte files
        if ($file.Extension -eq ".svelte") {
            if ($content -match 'export let' -and -not ($content -match '\$props')) {
                Write-Issue $relativePath "Uses export let instead of Svelte 5 \$props()" "Warning"
            }
            if ($content -match 'let.*=' -and -not ($content -match '\$state')) {
                # This is a heuristic - not all let statements need $state
                # Only flag if it looks like reactive state
                if ($content -match 'let\s+\w+\s*=\s*\$state') {
                    # Already using $state, skip
                } elseif ($content -match 'bind:' -or $content -match 'on:') {
                    # Likely needs $state
                    Write-Issue $relativePath "Reactive variable may need Svelte 5 \$state() rune" "Warning"
                }
            }
        }

        # Check 5: Barrel export patterns
        if ($file.Name -eq "index.ts" -and $content -match 'export.*from.*bits-ui') {
            if ($content -match 'export\s+\{\s*\w+\s*\}.*from.*bits-ui') {
                Write-Issue $relativePath "Barrel export uses named exports from bits-ui" "Error"
            }
        }
    }

    Write-Host "`nAudit complete: $($issues.Count) issues found" -ForegroundColor Cyan
    return $issues
}

# ============================================
# Fix Phase
# ============================================

function Invoke-Fix {
    Write-Header "FIXING bits-ui v2 API Issues"

    $files = Get-ChildItem -Path $Path -Recurse -Include "*.svelte", "*.ts" -Exclude "node_modules", ".svelte-kit", "dist"

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        $relativePath = $file.FullName -replace [regex]::Escape($Path), ""
        $modified = $false

        # Fix 1: Replace ui-store.svelte imports with ui-store
        if ($content -match "from\s+['\"].*ui-store\.svelte['\"]") {
            $content = $content -replace "from\s+['\"]([^'\"]*?)ui-store\.svelte['\"]", "from '$1ui-store'"
            Write-Fixed $relativePath "Updated ui-store.svelte → ui-store"
            $modified = $true
        }

        # Fix 2: Fix bits-ui named exports in barrel files
        if ($file.Name -eq "index.ts" -and $file.FullName -match "components/ui/bits") {
            if ($content -match 'export\s+\{\s*\w+\s*\}.*from\s+["\']bits-ui["\']') {
                # This is complex - would need to rewrite the entire export structure
                Write-Host "[MANUAL] $relativePath - Needs manual bits-ui export fix" -ForegroundColor Yellow
            }
        }

        # Fix 3: Add Uno.css utility classes (basic heuristic)
        if ($file.Extension -eq ".svelte" -and $content -match 'style="padding:' -and -not ($content -match 'p-\d')) {
            $content = $content -replace 'style="padding:\s*(\d+)px"', 'class="p-$1"'
            Write-Fixed $relativePath "Converted inline padding styles to Uno.css"
            $modified = $true
        }

        # Fix 4: Update export let to $props() for Svelte 5
        if ($file.Extension -eq ".svelte" -and $content -match 'export let\s+(\w+)') {
            $matches = [regex]::Matches($content, 'export let\s+(\w+)')
            if ($matches.Count -gt 0) {
                $props = @()
                foreach ($match in $matches) {
                    $props += $match.Groups[1].Value
                }
                $propsStr = ($props | ForEach-Object { "$_" }) -join ", "

                # Only fix if it's a simple case
                if ($props.Count -le 3) {
                    $content = $content -replace 'export let\s+(\w+)(?:\s*:\s*([^;=]+))?(?:\s*=\s*([^;]+))?;', 'let { $1 }: Props = $props();'
                    Write-Fixed $relativePath "Updated export let to Svelte 5 \$props()"
                    $modified = $true
                }
            }
        }

        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        }
    }

    Write-Host "`nFix phase complete: $($fixed.Count) files updated" -ForegroundColor Green
    return $fixed
}

# ============================================
# Report Phase
# ============================================

function Invoke-Report {
    Write-Header "BITS-UI v2 API AUDIT REPORT"

    Write-Host "`nIssues Found: $($issues.Count)" -ForegroundColor Cyan

    if ($issues.Count -gt 0) {
        Write-Host "`nBy Severity:" -ForegroundColor Cyan
        $errors = $issues | Where-Object { $_.Severity -eq "Error" }
        $warnings = $issues | Where-Object { $_.Severity -eq "Warning" }

        Write-Host "  Errors: $($errors.Count)" -ForegroundColor Red
        Write-Host "  Warnings: $($warnings.Count)" -ForegroundColor Yellow

        Write-Host "`nTop Issues:" -ForegroundColor Cyan
        $issues | Group-Object Issue | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
            Write-Host "  [$($_.Count)x] $($_.Name)" -ForegroundColor Gray
        }
    }

    Write-Host "`nFiles Fixed: $($fixed.Count)" -ForegroundColor Green

    Write-Host "`nRecommendations:" -ForegroundColor Cyan
    Write-Host "  1. Review all bits-ui imports - v2 uses default exports" -ForegroundColor Gray
    Write-Host "  2. Update barrel exports in src/lib/components/ui/bits/index.ts" -ForegroundColor Gray
    Write-Host "  3. Migrate remaining components to Svelte 5 \$props() runes" -ForegroundColor Gray
    Write-Host "  4. Replace inline styles with Uno.css utility classes" -ForegroundColor Gray
    Write-Host "  5. Use new ui-store.ts for all UI state management" -ForegroundColor Gray
}

# ============================================
# Main Execution
# ============================================

if (-not (Test-Path $Path)) {
    Write-Host "Error: Path '$Path' not found" -ForegroundColor Red
    exit 1
}

if ($Audit) {
    Invoke-Audit
} elseif ($Fix) {
    Invoke-Audit
    Invoke-Fix
    Invoke-Report
} elseif ($Report) {
    Invoke-Audit
    Invoke-Report
} else {
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\fix-bits-ui-v2-api.ps1 -Audit   # Scan for issues" -ForegroundColor Gray
    Write-Host "  .\fix-bits-ui-v2-api.ps1 -Fix     # Audit and fix issues" -ForegroundColor Gray
    Write-Host "  .\fix-bits-ui-v2-api.ps1 -Report  # Generate report" -ForegroundColor Gray
}
