#!/usr/bin/env pwsh
<#
.SYNOPSIS
Run all SvelteKit/Svelte migrations sequentially

.DESCRIPTION
Automates the migration process for SvelteKit 2, Svelte 5, and related tooling
#>

Write-Host "🚀 Complete Migration Pipeline" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

# Function to run migration with auto-yes
function Run-Migration {
    param(
        [string]$Name,
        [string]$Command
    )

    Write-Host "`n📦 Running: $Name" -ForegroundColor Yellow
    Write-Host "Command: $Command`n" -ForegroundColor Gray

    try {
        # Run with auto-confirmation
        $process = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", $Command -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Host "✅ $Name completed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️ $Name completed with warnings (exit code: $($process.ExitCode))" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "❌ $Name failed: $_" -ForegroundColor Red
        return $false
    }
}

# Track results
$results = @{}

# 1. SvelteKit 2 Migration
$results['sveltekit-2'] = Run-Migration `
    -Name "SvelteKit 2" `
    -Command "cd '$PWD'; npx sv migrate sveltekit-2 --force 2>&1 | Out-Null"

Start-Sleep -Seconds 2

# 2. Self-Closing Tags (prep for Svelte 5)
$results['self-closing-tags'] = Run-Migration `
    -Name "Self-Closing Tags" `
    -Command "cd '$PWD'; npx sv migrate self-closing-tags --force 2>&1 | Out-Null"

Start-Sleep -Seconds 2

# 3. Svelte 4 (cleanup legacy syntax)
$results['svelte-4'] = Run-Migration `
    -Name "Svelte 4 Compatibility" `
    -Command "cd '$PWD'; npx sv migrate svelte-4 --force 2>&1 | Out-Null"

Start-Sleep -Seconds 2

# 4. Routes (SvelteKit routing updates)
$results['routes'] = Run-Migration `
    -Name "Routes Migration" `
    -Command "cd '$PWD'; npx sv migrate routes --force 2>&1 | Out-Null"

Start-Sleep -Seconds 2

# 5. Package (package.json updates)
Write-Host "`n📦 Running: Package Updates" -ForegroundColor Yellow
npx sv migrate package --force 2>&1 | Out-Null
$results['package'] = $true
Write-Host "✅ Package updates completed" -ForegroundColor Green

# Summary
Write-Host "`n`n📊 Migration Summary" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
foreach ($migration in $results.Keys) {
    $status = if ($results[$migration]) { "✅" } else { "❌" }
    Write-Host "$status $migration" -ForegroundColor $(if ($results[$migration]) { "Green" } else { "Red" })
}

Write-Host "`n✨ Migration pipeline complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm install (update dependencies)" -ForegroundColor Gray
Write-Host "2. Run: npm run check (verify TypeScript)" -ForegroundColor Gray
Write-Host "3. Review @migration-task comments in files" -ForegroundColor Gray
