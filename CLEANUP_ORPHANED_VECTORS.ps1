# ═════════════════════════════════════════════════════════════
# CLEANUP_ORPHANED_VECTORS.ps1
# Removes orphaned evidence_vectors before migration
# ═════════════════════════════════════════════════════════════

Write-Host "🧹 Phase 78: Cleaning Orphaned Evidence Vectors" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Gray

$ErrorActionPreference = "Stop"

$dbHost = "localhost"
$dbPort = "5432"
$dbName = "legal_ai_db"
$pgUser = "postgres"
$pgPassword = "123456"

Write-Host "`n📍 Database: $dbName @ $($dbHost):$dbPort" -ForegroundColor Yellow
Write-Host "🔑 Using superuser: $pgUser" -ForegroundColor Yellow

$env:PGPASSWORD = $pgPassword

try {
    Write-Host "`n1️⃣  Removing orphaned vectors (evidence_id not in evidence table)..." -ForegroundColor Cyan

    $cleanupQuery = @"
DELETE FROM evidence_vectors
WHERE evidence_id NOT IN (SELECT id FROM evidence);
"@

    $result = & psql -h $dbHost -p $dbPort -U $pgUser -d $dbName -c $cleanupQuery 2>&1
    Write-Host "✅ Cleanup complete:`n$result" -ForegroundColor Green

    Write-Host "`n2️⃣  Dropping existing foreign key constraint if present..." -ForegroundColor Cyan

    $dropConstraintQuery = @"
ALTER TABLE IF EXISTS evidence_vectors
  DROP CONSTRAINT IF EXISTS evidence_vectors_evidence_id_evidence_id_fk;
"@

    $result2 = & psql -h $dbHost -p $dbPort -U $pgUser -d $dbName -c $dropConstraintQuery 2>&1
    Write-Host "✅ Constraint drop attempt complete" -ForegroundColor Green

    Write-Host "`n✅ Cleanup complete - database is ready for migration" -ForegroundColor Green
    Write-Host "`n📌 Next: Run FIX_DATABASE_PERMISSIONS.ps1 to apply the migration" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path variable:env:PGPASSWORD) {
        Remove-Item env:PGPASSWORD
    }
}
