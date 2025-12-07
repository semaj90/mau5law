#Requires -Version 7.0
<#
.SYNOPSIS
    Phase 90: Compare before/after snapshots to verify zero data loss
#>

$ErrorActionPreference = 'Stop'

Write-Host "`n📊 Phase 90: Comparing snapshots..." -ForegroundColor Cyan

$logsDir = Join-Path $PSScriptRoot ".." "logs"

# Find most recent before/after snapshots
$beforeFiles = Get-ChildItem -Path $logsDir -Filter "db-snapshot-before-*.json" | Sort-Object LastWriteTime -Descending
$afterFiles = Get-ChildItem -Path $logsDir -Filter "db-snapshot-after-*.json" | Sort-Object LastWriteTime -Descending

if (!$beforeFiles -or !$afterFiles) {
    Write-Host "❌ Snapshot files not found!" -ForegroundColor Red
    Write-Host "   Run: npm run db:snapshot-before and npm run db:snapshot-after" -ForegroundColor Yellow
    exit 1
}

$beforeFile = $beforeFiles[0].FullName
$afterFile = $afterFiles[0].FullName

Write-Host "`n📄 Comparing:" -ForegroundColor Magenta
Write-Host "  Before: $($beforeFiles[0].Name)" -ForegroundColor Gray
Write-Host "  After:  $($afterFiles[0].Name)" -ForegroundColor Gray
Write-Host ""

try {
    $before = Get-Content $beforeFile -Raw | ConvertFrom-Json
    $after = Get-Content $afterFile -Raw | ConvertFrom-Json

    # Build lookup tables
    $beforeTables = @{}
    $before.tables | ForEach-Object {
        $beforeTables[$_.table_name] = $_.row_count
    }

    $afterTables = @{}
    $after.tables | ForEach-Object {
        $afterTables[$_.table_name] = $_.row_count
    }

    # Compare
    $allTables = ($beforeTables.Keys + $afterTables.Keys) | Sort-Object -Unique

    $dataLoss = $false
    $results = @()

    foreach ($table in $allTables) {
        $beforeCount = if ($beforeTables.ContainsKey($table)) { $beforeTables[$table] } else { 0 }
        $afterCount = if ($afterTables.ContainsKey($table)) { $afterTables[$table] } else { 0 }
        $delta = $afterCount - $beforeCount

        $status = if ($delta -eq 0) { '✅' }
                  elseif ($delta -gt 0) { '🆕' }
                  else { '❌' }

        if ($delta -lt 0) {
            $dataLoss = $true
        }

        $results += [PSCustomObject]@{
            Table = $table
            Before = $beforeCount
            After = $afterCount
            Delta = $delta
            Status = $status
        }
    }

    # Display results
    $results | Format-Table -Property Status, Table, Before, After, Delta -AutoSize

    # Summary
    if ($dataLoss) {
        Write-Host "❌ DATA LOSS DETECTED!" -ForegroundColor Red
        Write-Host "   Some tables have fewer rows after migration" -ForegroundColor Yellow
        Write-Host "   Review the migration and consider rollback" -ForegroundColor Yellow
        exit 1
    } else {
        $newTables = ($results | Where-Object { $_.Delta -gt 0 }).Count
        $unchanged = ($results | Where-Object { $_.Delta -eq 0 }).Count

        Write-Host "`n✅ Phase 90 Safety Check: PASSED" -ForegroundColor Green
        Write-Host "   Unchanged: $unchanged tables" -ForegroundColor Gray
        if ($newTables -gt 0) {
            Write-Host "   New rows: $newTables tables (expected for additive migrations)" -ForegroundColor Gray
        }
        Write-Host "   Zero data loss confirmed ✅" -ForegroundColor Green
        Write-Host ""
    }

} catch {
    Write-Host "❌ Error comparing snapshots: $_" -ForegroundColor Red
    exit 1
}
