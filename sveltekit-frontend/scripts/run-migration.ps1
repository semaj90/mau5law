#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 80: Database Migration Runner
.DESCRIPTION
    Applies chat_messages and chat_metadata table migration to legal_ai_db
.EXAMPLE
    .\run-migration.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "🔧 Phase 80: Database Migration" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Loaded .env file" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found, using system environment" -ForegroundColor Yellow
}

# Get database URL
$dbUrl = $env:DATABASE_URL_MIGRATOR
if (-not $dbUrl) {
    $dbUrl = $env:DATABASE_URL
}

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL not found in environment" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Database: legal_ai_db" -ForegroundColor Cyan
Write-Host ""

# Parse connection string
if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]

    Write-Host "Host: $dbHost"
    Write-Host "Port: $dbPort"
    Write-Host "Database: $dbName"
    Write-Host "User: $dbUser"
    Write-Host ""
} else {
    Write-Host "⚠️  Could not parse DATABASE_URL" -ForegroundColor Yellow
}

# Set PGPASSWORD for psql
$env:PGPASSWORD = $dbPass

$migrationFile = "migrations\001_create_chat_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file: $migrationFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Running migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Run migration with psql
    $output = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationFile 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $output
        Write-Host ""

        # Verify tables exist
        Write-Host "🔍 Verifying tables..." -ForegroundColor Cyan
        $checkQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'chat%';"
        $tables = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $checkQuery 2>&1

        Write-Host "Tables created:" -ForegroundColor Green
        Write-Host $tables

    } else {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host $output
        exit 1
    }

} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Phase 80 Database Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test migration endpoint: POST /api/chat/migrate"
Write-Host "  2. Apply validation to API endpoints"
Write-Host "  3. See: PHASE_80_COMPLETION_GUIDE.md"
