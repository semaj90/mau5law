#!/usr/bin/env pwsh
<#
.SYNOPSIS
Create safety guards for Phase 87 incremental ingestion

.DESCRIPTION
Adds two critical database invariants:
1. Unique error identity (prevents duplicate ts_errors)
2. One embedding per error (prevents duplicate embeddings)

This enables safe scale-up from 5k → 10k → 33k without re-embedding.

.EXAMPLE
.\phase87-create-safety-guards.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "🛡️  Phase 87: Creating Incremental Ingestion Safety Guards" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Database connection (adjust if needed)
$DB_USER = "user"
$DB_HOST = "127.0.0.1"
$DB_PORT = "5434"
$DB_NAME = "legal"

Write-Host "📊 Target Database:" -ForegroundColor Yellow
Write-Host "   postgresql://$DB_USER@${DB_HOST}:${DB_PORT}/$DB_NAME" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# Safety Guard 1: Unique Error Identity
# ============================================================================

Write-Host "1️⃣ Creating unique index on ts_errors (prevents duplicates)..." -ForegroundColor Cyan

$sql1 = @"
CREATE UNIQUE INDEX IF NOT EXISTS ts_errors_identity_uniq
ON ts_errors (file_path, line_number, column_number, error_code, error_message);
"@

try {
    $result = docker exec phase66-postgres psql -U $DB_USER -d $DB_NAME -c $sql1 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Index created: ts_errors_identity_uniq" -ForegroundColor Green
        Write-Host "      Prevents: Duplicate errors in corpus" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed to create index" -ForegroundColor Red
        Write-Host "   $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# Safety Guard 2: One Embedding Per Error
# ============================================================================

Write-Host "2️⃣ Creating unique index on error_embeddings (one embedding per error)..." -ForegroundColor Cyan

$sql2 = @"
CREATE UNIQUE INDEX IF NOT EXISTS error_embeddings_error_id_uniq
ON error_embeddings (error_id);
"@

try {
    $result = docker exec phase66-postgres psql -U $DB_USER -d $DB_NAME -c $sql2 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Index created: error_embeddings_error_id_uniq" -ForegroundColor Green
        Write-Host "      Prevents: Re-embedding the same error twice" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed to create index" -ForegroundColor Red
        Write-Host "   $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# Verification
# ============================================================================

Write-Host "3️⃣ Verifying indexes..." -ForegroundColor Cyan

$sql3 = @"
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('ts_errors', 'error_embeddings')
  AND indexname LIKE '%_uniq'
ORDER BY tablename, indexname;
"@

try {
    $indexes = docker exec phase66-postgres psql -U $DB_USER -d $DB_NAME -c $sql3 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Unique indexes:" -ForegroundColor Green
        Write-Host "$indexes" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️ Could not verify indexes" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Verification failed: $_" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Next Steps
# ============================================================================

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "✅ Safety Guards Created!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now safely run incremental ingestion:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   # Scale to 10,000 errors (only new errors will be embedded)" -ForegroundColor White
Write-Host "   node scripts/phase87-ingest-error-corpus.mjs --limit 10000" -ForegroundColor White
Write-Host ""
Write-Host "   # Or process all 33,595 errors (28k syntax + 5k other)" -ForegroundColor White
Write-Host "   node scripts/phase87-ingest-error-corpus.mjs --limit 33595" -ForegroundColor White
Write-Host ""
Write-Host "The script will automatically skip already-embedded errors." -ForegroundColor Gray
Write-Host ""
