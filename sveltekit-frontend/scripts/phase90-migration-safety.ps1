# ============================================================================
# Phase 90: Migration Safety Wrapper
# ============================================================================
# Automates before/after snapshots and comparison
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('before', 'after', 'compare', 'check-duplicates')]
    [string]$Action = 'check-duplicates'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlScript = Join-Path $ScriptDir 'phase90-migration-check.sql'
$OutputDir = Join-Path $ScriptDir '..\logs\phase90'

# Ensure output directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Database connection params (from Phase 14 env)
$DbHost = 'localhost'
$DbPort = '5432'
$DbName = 'legal_ai_db'
$DbUser = 'legal_admin'
$env:PGPASSWORD = '123456'

function Write-Header {
    param([string]$Text)
    Write-Host "`n============================================================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "============================================================================`n" -ForegroundColor Cyan
}

function Test-DatabaseConnection {
    Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow

    $testQuery = "SELECT 1;"
    $result = psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -A -c $testQuery 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Cannot connect to PostgreSQL at ${DbHost}:${DbPort}" -ForegroundColor Red
        Write-Host "  Database: $DbName" -ForegroundColor Gray
        Write-Host "  User: $DbUser" -ForegroundColor Gray
        Write-Host "`nError: $result" -ForegroundColor Red
        Write-Host "`nPlease ensure PostgreSQL is running:" -ForegroundColor Yellow
        Write-Host "  docker-compose up -d postgres" -ForegroundColor Gray
        Write-Host "  OR: npm run postgres:start" -ForegroundColor Gray
        exit 1
    }

    Write-Host "✓ PostgreSQL connection successful" -ForegroundColor Green
}

function Run-SqlCheck {
    param([string]$OutputFile)

    # Always test connection first
    Test-DatabaseConnection

    Write-Host "Running Phase 90 safety checks..." -ForegroundColor Yellow
    Write-Host "Output: $OutputFile`n" -ForegroundColor Gray

    psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SqlScript > $OutputFile 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Check complete" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ Check failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "See output file for details: $OutputFile" -ForegroundColor Yellow
        exit 1
    }
}

function Check-Duplicates {
    Write-Header "DUPLICATE EMAIL CHECK"

    # Test connection first
    Test-DatabaseConnection

    $query = @"
SELECT
    email,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) AS user_ids
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
"@

    $result = psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -A -c $query 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Query failed" -ForegroundColor Red
        Write-Host $result -ForegroundColor Yellow
        exit 1
    }

    if ([string]::IsNullOrWhiteSpace($result)) {
        Write-Host "✓ No duplicate emails found - safe to add UNIQUE constraint" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "✗ DUPLICATE EMAILS FOUND:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Yellow
        Write-Host "`nYou must fix these duplicates before adding UNIQUE(email) constraint!" -ForegroundColor Red
        Write-Host "Example fix:" -ForegroundColor Gray
        Write-Host "  DELETE FROM users WHERE id = '<duplicate-id>';" -ForegroundColor Gray
        exit 1
    }
}

function Compare-Snapshots {
    $beforeFile = Join-Path $OutputDir 'before-migration.txt'
    $afterFile = Join-Path $OutputDir 'after-migration.txt'

    if (-not (Test-Path $beforeFile)) {
        Write-Host "✗ Before snapshot not found: $beforeFile" -ForegroundColor Red
        Write-Host "Run: .\phase90-migration-safety.ps1 -Action before" -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-Path $afterFile)) {
        Write-Host "✗ After snapshot not found: $afterFile" -ForegroundColor Red
        Write-Host "Run: .\phase90-migration-safety.ps1 -Action after" -ForegroundColor Yellow
        exit 1
    }

    Write-Header "COMPARING BEFORE/AFTER SNAPSHOTS"

    # Extract row counts
    $beforeCounts = Select-String -Path $beforeFile -Pattern "^\s*public\s+\|\s+\w+\s+\|\s+\d+" | ForEach-Object { $_.Line }
    $afterCounts = Select-String -Path $afterFile -Pattern "^\s*public\s+\|\s+\w+\s+\|\s+\d+" | ForEach-Object { $_.Line }

    Write-Host "Row count comparison:" -ForegroundColor Cyan
    if ($beforeCounts -eq $afterCounts) {
        Write-Host "✓ All row counts IDENTICAL - no data loss" -ForegroundColor Green
    } else {
        Write-Host "✗ Row counts DIFFER - investigate!" -ForegroundColor Red
        Write-Host "`nBEFORE:" -ForegroundColor Yellow
        $beforeCounts | ForEach-Object { Write-Host "  $_" }
        Write-Host "`nAFTER:" -ForegroundColor Yellow
        $afterCounts | ForEach-Object { Write-Host "  $_" }
        exit 1
    }

    # Full diff
    Write-Host "`nFull diff:" -ForegroundColor Cyan
    $diffOutput = Compare-Object (Get-Content $beforeFile) (Get-Content $afterFile)

    if ($null -eq $diffOutput) {
        Write-Host "✓ No changes detected (files identical)" -ForegroundColor Green
    } else {
        $diffOutput | ForEach-Object {
            if ($_.SideIndicator -eq '=>') {
                Write-Host "  + $($_.InputObject)" -ForegroundColor Green
            } else {
                Write-Host "  - $($_.InputObject)" -ForegroundColor Red
            }
        }
    }
}

# ============================================================================
# Main Execution
# ============================================================================

switch ($Action) {
    'before' {
        Write-Header "PHASE 90: BEFORE MIGRATION SNAPSHOT"
        $outputFile = Join-Path $OutputDir 'before-migration.txt'
        Run-SqlCheck -OutputFile $outputFile
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "  1. Run migration: npm run db:migrate" -ForegroundColor Gray
        Write-Host "  2. Run after check: .\phase90-migration-safety.ps1 -Action after" -ForegroundColor Gray
    }

    'after' {
        Write-Header "PHASE 90: AFTER MIGRATION SNAPSHOT"
        $outputFile = Join-Path $OutputDir 'after-migration.txt'
        Run-SqlCheck -OutputFile $outputFile
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "  1. Compare snapshots: .\phase90-migration-safety.ps1 -Action compare" -ForegroundColor Gray
    }

    'compare' {
        Compare-Snapshots
    }

    'check-duplicates' {
        Check-Duplicates
    }
}

Write-Host ""
