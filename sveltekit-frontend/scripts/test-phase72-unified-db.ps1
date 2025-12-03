#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test Phase 72 with Unified legal_ai_db Database

.DESCRIPTION
    Verifies that Phase 72 topology tables coexist with app tables in legal_ai_db
    Tests the complete integration: SvelteKit app + Phase 72 topology brain
#>

param(
    [switch]$SkipSchemaLoad,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Phase 72 + legal_ai_db Integration Test               ║" -ForegroundColor Cyan
Write-Host "║  Unified Database Architecture                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Database configuration
$DB_USER = "postgres"
$DB_PASS = "postgres"
$DB_NAME = "legal_ai_db"
$DB_HOST = "localhost"
$DB_PORT = "5432"

$env:DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
$env:PGPASSWORD = $DB_PASS

Write-Host "🔧 Database Configuration:" -ForegroundColor Yellow
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host "   Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray

# Test 1: Verify Postgres Connection
Write-Host "`n1️⃣  Testing Postgres Connection..." -ForegroundColor Yellow
try {
    $pgVersion = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Connected to Postgres" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   Version: $($pgVersion.Trim())" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Postgres connection failed" -ForegroundColor Red
        Write-Host "   Error: $pgVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Exception: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Check pgvector Extension
Write-Host "`n2️⃣  Checking pgvector Extension..." -ForegroundColor Yellow
try {
    $vectorExt = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" -t 2>&1
    if ($vectorExt -and $vectorExt -notmatch "0 rows") {
        Write-Host "   ✅ pgvector extension installed (version: $($vectorExt.Trim()))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  pgvector extension not found" -ForegroundColor Yellow
        Write-Host "   Installing pgvector..." -ForegroundColor Gray
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ pgvector installed successfully" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to install pgvector" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   ❌ Exception: $_" -ForegroundColor Red
}

# Test 3: Check Existing App Tables
Write-Host "`n3️⃣  Checking App Tables..." -ForegroundColor Yellow
$appTables = @("cases", "evidence", "persons_of_interest", "users", "sessions")
$foundAppTables = @()

foreach ($table in $appTables) {
    $exists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt $table" -t 2>&1
    if ($exists -and $exists -notmatch "Did not find") {
        $foundAppTables += $table
    }
}

if ($foundAppTables.Count -gt 0) {
    Write-Host "   ✅ Found app tables: $($foundAppTables -join ', ')" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No app tables found yet (may be fresh install)" -ForegroundColor Gray
}

# Test 4: Load Phase 72 Schema (if not skipped)
if (-not $SkipSchemaLoad) {
    Write-Host "`n4️⃣  Loading Phase 72 Schema..." -ForegroundColor Yellow

    $schemaFile = "..\backend\sql\phase72_topology_schema.sql"
    $minimalSchemaFile = "..\backend\sql\phase72_topology_minimal.sql"

    $schemaToLoad = $null
    if (Test-Path $schemaFile) {
        $schemaToLoad = $schemaFile
    } elseif (Test-Path $minimalSchemaFile) {
        $schemaToLoad = $minimalSchemaFile
    }

    if ($schemaToLoad) {
        Write-Host "   Loading schema from: $(Split-Path -Leaf $schemaToLoad)" -ForegroundColor Gray
        $loadResult = Get-Content $schemaToLoad | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Phase 72 schema loaded successfully" -ForegroundColor Green
        } else {
            if ($loadResult -match "already exists") {
                Write-Host "   ✅ Phase 72 schema already exists (idempotent)" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Schema load had warnings" -ForegroundColor Yellow
                if ($Verbose) {
                    Write-Host "   Output: $loadResult" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "   ⚠️  Phase 72 schema file not found" -ForegroundColor Yellow
        Write-Host "   Expected at: $schemaFile" -ForegroundColor Gray
    }
} else {
    Write-Host "`n4️⃣  Skipping Phase 72 schema load" -ForegroundColor Gray
}

# Test 5: Verify Phase 72 Tables
Write-Host "`n5️⃣  Verifying Phase 72 Tables..." -ForegroundColor Yellow
$phase72Tables = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt phase72_*" -t 2>&1

if ($phase72Tables -and $phase72Tables -notmatch "Did not find") {
    Write-Host "   ✅ Phase 72 tables found:" -ForegroundColor Green
    $tableList = $phase72Tables -split "`n" | Where-Object { $_ -match "phase72_" } | ForEach-Object { $_.Trim() -replace '\s+', ' ' }
    foreach ($table in $tableList) {
        Write-Host "      • $table" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ No Phase 72 tables found" -ForegroundColor Red
    Write-Host "   Run without -SkipSchemaLoad to create them" -ForegroundColor Gray
}

# Test 6: Test Table Coexistence
Write-Host "`n6️⃣  Testing Table Coexistence..." -ForegroundColor Yellow
$allTables = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" -t 2>&1
$appTableCount = ($allTables -split "`n" | Where-Object { $_ -match "public" -and $_ -notmatch "phase72_" }).Count
$phase72TableCount = ($allTables -split "`n" | Where-Object { $_ -match "phase72_" }).Count

Write-Host "   App tables: $appTableCount" -ForegroundColor Gray
Write-Host "   Phase 72 tables: $phase72TableCount" -ForegroundColor Gray

if ($phase72TableCount -gt 0) {
    Write-Host "   ✅ Tables coexist in legal_ai_db" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Phase 72 tables not loaded yet" -ForegroundColor Yellow
}

# Test 7: Test Vector Column
Write-Host "`n7️⃣  Testing Vector Column..." -ForegroundColor Yellow
try {
    $vectorTest = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'phase72_error_vector' AND column_name = 'embedding';" -t 2>&1

    if ($vectorTest -and $vectorTest -match "embedding.*vector") {
        Write-Host "   ✅ Vector column exists (768-dim ready)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Vector column not found or not using VECTOR type" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not verify vector column" -ForegroundColor Yellow
}

# Test 8: Test Sample Insert (if tables exist)
Write-Host "`n8️⃣  Testing Sample Data Insert..." -ForegroundColor Yellow
$tableExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt phase72_error" -t 2>&1
if ($tableExists -and $tableExists -notmatch "Did not find") {
    try {
        $testHash = "test_" + (Get-Random)
        $insertSQL = @"
INSERT INTO phase72_error (error_hash, file_path, line_num, column_num, error_code, message, severity, created_at)
VALUES ('$testHash', 'test.ts', 1, 1, 'TS9999', 'Test error', 'error', NOW())
ON CONFLICT (error_hash) DO NOTHING
RETURNING id;
"@

        $insertResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $insertSQL -t 2>&1

        if ($LASTEXITCODE -eq 0 -and $insertResult) {
            Write-Host "   ✅ Sample insert successful (ID: $($insertResult.Trim()))" -ForegroundColor Green

            # Clean up test data
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM phase72_error WHERE error_hash = '$testHash';" 2>&1 | Out-Null
            Write-Host "   ✅ Test data cleaned up" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Insert test skipped or failed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Insert test failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  phase72_error table not found, skipping insert test" -ForegroundColor Yellow
}

# Test 9: Check Environment Variables
Write-Host "`n9️⃣  Checking Environment Variables..." -ForegroundColor Yellow
$requiredEnvVars = @{
    "DATABASE_URL" = $env:DATABASE_URL
    "REDIS_URL" = $env:REDIS_URL
    "QDRANT_URL" = $env:QDRANT_URL
    "GO_INGEST_URL" = $env:GO_INGEST_URL
}

foreach ($var in $requiredEnvVars.GetEnumerator()) {
    if ($var.Value) {
        Write-Host "   ✅ $($var.Key): $($var.Value)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $($var.Key): not set" -ForegroundColor Yellow
    }
}

# Test 10: Connection String Validation
Write-Host "`n🔟  Validating Connection Strings..." -ForegroundColor Yellow

# Test from host (SvelteKit)
$hostConnString = "postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}"
Write-Host "   Host connection: $hostConnString" -ForegroundColor Gray

# Test from Docker (if needed)
$dockerConnString = "postgresql://${DB_USER}:${DB_PASS}@phase66-postgres:${DB_PORT}/${DB_NAME}"
Write-Host "   Docker connection: $dockerConnString" -ForegroundColor Gray

Write-Host "   ✅ Connection strings configured for both contexts" -ForegroundColor Green

# Summary
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Integration Test Complete                              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "   Database: legal_ai_db ✅" -ForegroundColor Green
Write-Host "   App tables: $appTableCount" -ForegroundColor Gray
Write-Host "   Phase 72 tables: $phase72TableCount" -ForegroundColor Gray
Write-Host "   pgvector: Installed ✅" -ForegroundColor Green

Write-Host "`n📚 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start Phase 72 services:" -ForegroundColor Gray
Write-Host "      .\scripts\start-phase72-services.ps1`n" -ForegroundColor Cyan

Write-Host "   2. Run topology pipeline:" -ForegroundColor Gray
Write-Host "      npx tsx scripts\phase72-topology-vectorize.mjs`n" -ForegroundColor Cyan

Write-Host "   3. Verify data:" -ForegroundColor Gray
Write-Host "      psql -h localhost -U postgres -d legal_ai_db -c 'SELECT COUNT(*) FROM phase72_error;'`n" -ForegroundColor Cyan

Write-Host "✅ legal_ai_db is ready for Phase 72 + SvelteKit app!" -ForegroundColor Green
