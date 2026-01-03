#!/usr/bin/env pwsh
# Phase 90 - TS1005 Corruption Auto-Fixer
# Fixes common syntax corruption patterns found by ripgrep

param(
    [string]$DryRun = "false"
)

$isDryRun = $DryRun -eq "true"

Write-Host "🔧 Phase 90: TS1005 Corruption Auto-Fixer" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""

if ($isDryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Target files with known corruption patterns (from ripgrep scan)
$corruptionFixes = @(
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'memory: \{ used: 0, total: 0 percentage: 0 \}'
        replacement = 'memory: { used: 0, total: 0, percentage: 0 }'
        description = "Fix missing comma in object property"
    },
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'disk: \{ used: 0, total: 0 percentage: 0 \}'
        replacement = 'disk: { used: 0, total: 0, percentage: 0 }'
        description = "Fix missing comma in object property"
    },
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'cpu: \{ usage: 0, cores: 0: 0 \}'
        replacement = 'cpu: { usage: 0, cores: 0 }'
        description = "Fix colon instead of value"
    },
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'memory: \{ used: 8192, total: 16384 percentage: 50 \}'
        replacement = 'memory: { used: 8192, total: 16384, percentage: 50 }'
        description = "Fix missing comma in mock data"
    },
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'disk: \{ used: 256, total: 512 percentage: 50 \}'
        replacement = 'disk: { used: 256, total: 512, percentage: 50 }'
        description = "Fix missing comma in mock data"
    },
    @{
        file = "src\routes\(app)\system-configuration\+page.svelte"
        pattern = 'cpu: \{ usage: 45, cores: 8: 8 \}'
        replacement = 'cpu: { usage: 45, cores: 8 }'
        description = "Fix colon duplication in mock data"
    },
    @{
        file = "src\routes\page.complex.svelte"
        pattern = 'activeCases: 3, evidenceItems: 27 personsOfInterest: 8'
        replacement = 'activeCases: 3, evidenceItems: 27, personsOfInterest: 8'
        description = "Fix missing comma between properties"
    },
    @{
        file = "src\routes\page.complex.svelte"
        pattern = 'recentActivity: 12: 12'
        replacement = 'recentActivity: 12'
        description = "Fix duplicate colon"
    }
)

$fixed = 0
$skipped = 0

foreach ($fix in $corruptionFixes) {
    $filePath = Join-Path "." $fix.file

    if (-not (Test-Path $filePath)) {
        Write-Host "⏭️  Skipped: $($fix.file) (not found)" -ForegroundColor Gray
        $skipped++
        continue
    }

    $content = Get-Content $filePath -Raw -Encoding UTF8

    if ($content -match [regex]::Escape($fix.pattern)) {
        if ($isDryRun) {
            Write-Host "✅ Would fix: $($fix.file)" -ForegroundColor Yellow
            Write-Host "   Pattern: $($fix.pattern)" -ForegroundColor Gray
            Write-Host "   Replace: $($fix.replacement)" -ForegroundColor Gray
        } else {
            $newContent = $content -replace [regex]::Escape($fix.pattern), $fix.replacement
            Set-Content $filePath -Value $newContent -Encoding UTF8 -NoNewline
            Write-Host "✅ Fixed: $($fix.file)" -ForegroundColor Green
            Write-Host "   $($fix.description)" -ForegroundColor Gray
        }
        $fixed++
    } else {
        Write-Host "⏭️  Skipped: $($fix.file) (already fixed or pattern not found)" -ForegroundColor Gray
        $skipped++
    }
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Fixed: $fixed files" -ForegroundColor Green
Write-Host "   ⏭️  Skipped: $skipped files" -ForegroundColor Gray

if ($isDryRun) {
    Write-Host ""
    Write-Host "💡 Run without -DryRun to apply fixes" -ForegroundColor Yellow
}

exit 0
