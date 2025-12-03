#!/usr/bin/env pwsh

<#
.SYNOPSIS
Find Svelte 4 patterns that need migration to Svelte 5 runes
.DESCRIPTION
Scans src/ for old patterns and outputs a prioritized list
#>

Write-Host "🔍 Finding Svelte 5 Migration Targets..." -ForegroundColor Cyan
Write-Host ""

$patterns = @(
    @{
        name = "export let (props)"
        pattern = "export let "
        priority = "HIGH"
    },
    @{
        name = "onMount lifecycle"
        pattern = "onMount\("
        priority = "HIGH"
    },
    @{
        name = "afterUpdate lifecycle"
        pattern = "afterUpdate\("
        priority = "MEDIUM"
    },
    @{
        name = "beforeUpdate lifecycle"
        pattern = "beforeUpdate\("
        priority = "MEDIUM"
    },
    @{
        name = "onDestroy lifecycle"
        pattern = "onDestroy\("
        priority = "MEDIUM"
    },
    @{
        name = "Reactive declarations ($:)"
        pattern = "^\s*\$:"
        priority = "MEDIUM"
    }
)

foreach ($p in $patterns) {
    Write-Host "[$($p.priority)] $($p.name)" -ForegroundColor Yellow

    $results = rg $p.pattern src/routes src/lib -l 2>$null | Sort-Object

    if ($results) {
        if ($results -is [string]) {
            $results = @($results)
        }

        foreach ($file in $results) {
            Write-Host "  • $file" -ForegroundColor Green
        }
    } else {
        Write-Host "  (none found)" -ForegroundColor Gray
    }

    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Migration Priority:" -ForegroundColor Cyan
Write-Host "  1. src/routes/command-center/+page.svelte" -ForegroundColor Yellow
Write-Host "  2. src/routes/evidence-board/+page.svelte" -ForegroundColor Yellow
Write-Host "  3. src/routes/analysis-center/+page.svelte" -ForegroundColor Yellow
Write-Host "  4. src/routes/all-routes/+page.svelte" -ForegroundColor Yellow
Write-Host "  5. src/lib/components/** (reusable)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 See SVELTE5_RUNES_MIGRATION.md for patterns" -ForegroundColor Cyan
