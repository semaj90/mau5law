#Requires -Version 7.0
<#
.SYNOPSIS
    Phase 90: Take database snapshot BEFORE migration
#>

$ErrorActionPreference = 'Stop'

Write-Host "`n📸 Phase 90: Taking database snapshot (BEFORE)..." -ForegroundColor Cyan

# Load DATABASE_URL from .env
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

$dbUrl = $env:DATABASE_URL
if (!$dbUrl) {
    Write-Host "❌ DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

# Extract connection details from DATABASE_URL
# Format: postgresql://user:pass@host:port/db
if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $pgUser = $Matches[1]
    $pgPass = $Matches[2]
    $pgHost = $Matches[3]
    $pgPort = $Matches[4]
    $pgDb = $Matches[5]
} else {
    Write-Host "❌ Could not parse DATABASE_URL" -ForegroundColor Red
    exit 1
}

# Set PGPASSWORD for psql
$env:PGPASSWORD = $pgPass

# Output file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $PSScriptRoot ".." "logs" "db-snapshot-before-$timestamp.json"
$outputDir = Split-Path $outputFile -Parent

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# SQL query to get row counts
$sql = @"
SELECT
    json_build_object(
        'timestamp', NOW(),
        'tables', json_agg(
            json_build_object(
                'table_name', table_name,
                'row_count', row_count
            ) ORDER BY table_name
        )
    )
FROM (
    SELECT
        tablename AS table_name,
        n_live_tup AS row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
) AS table_stats;
"@

try {
    # Execute query and save to JSON
    $result = psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb -t -A -c $sql

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database query failed" -ForegroundColor Red
        exit 1
    }

    $result | Set-Content -Path $outputFile -Encoding UTF8

    Write-Host "✅ Snapshot saved: $outputFile" -ForegroundColor Green

    # Parse and display summary
    $snapshot = $result | ConvertFrom-Json
    Write-Host "`n📊 Current row counts:" -ForegroundColor Magenta

    $snapshot.tables | ForEach-Object {
        Write-Host ("  {0,-30} {1,8} rows" -f $_.table_name, $_.row_count) -ForegroundColor Gray
    }

    Write-Host ""

} catch {
    Write-Host "❌ Error taking snapshot: $_" -ForegroundColor Red
    exit 1
}
