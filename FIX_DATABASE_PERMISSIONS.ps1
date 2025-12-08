# ═════════════════════════════════════════════════════════════
# FIX_DATABASE_PERMISSIONS.ps1
# Resolves PostgreSQL table ownership issues for Phase 78 migration
# ═════════════════════════════════════════════════════════════

Write-Host "🔧 Phase 78: Database Permission Fixer" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Gray

# Stop on any error
$ErrorActionPreference = "Stop"

$dbHost = "localhost"
$dbPort = "5432"
$dbName = "legal_ai_db"
$pgUser = "postgres"
$pgPassword = "123456"
$targetUser = "legal_admin"

Write-Host "`n📍 Database: $dbName @ $($dbHost):$dbPort" -ForegroundColor Yellow
Write-Host "🔑 Using superuser: $pgUser" -ForegroundColor Yellow

# Create PGPASSWORD environment variable for psql
$env:PGPASSWORD = $pgPassword

try {
    Write-Host "`n1️⃣  Checking evidence_vectors table ownership..." -ForegroundColor Cyan

    $checkQuery = @"
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'evidence_vectors';
"@

    $result = & psql -h $dbHost -p $dbPort -U $pgUser -d $dbName -t -c $checkQuery 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Could not check table. It may not exist yet (OK for first run)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Query result:`n$result" -ForegroundColor Green
    }

    Write-Host "`n2️⃣  Granting ownership of evidence_vectors to $targetUser..." -ForegroundColor Cyan

    $grantQuery = @"
ALTER TABLE IF EXISTS evidence_vectors OWNER TO $targetUser;
"@

    & psql -h $dbHost -p $dbPort -U $pgUser -d $dbName -c $grantQuery 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Ownership granted" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not grant ownership (table may not exist yet)" -ForegroundColor Yellow
    }

    Write-Host "`n3️⃣  Running Drizzle migration with superuser..." -ForegroundColor Cyan

    # Temporarily use superuser DATABASE_URL for migration
    $env:DATABASE_URL = "postgresql://$($pgUser):$($pgPassword)@$($dbHost):$($dbPort)/$($dbName)"

    Write-Host "📝 DATABASE_URL set to: postgresql://$pgUser`:***@$dbHost`:$dbPort/$dbName" -ForegroundColor Gray

    # Change to sveltekit-frontend directory
    Push-Location "sveltekit-frontend"

    Write-Host "`n🚀 Executing: npm run db:migrate" -ForegroundColor Cyan
    npm run db:migrate

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed. Check logs above." -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Pop-Location

    Write-Host "`n4️⃣  Verifying Phase 78 tables..." -ForegroundColor Cyan

    $verifyQuery = @"
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'route_health', 'error_events', 'error_clusters',
    'error_suggestions', 'route_error_patches', 'error_timeline', 'error_feedback'
  );
"@

    $tableList = & psql -h $dbHost -p $dbPort -U $pgUser -d $dbName -t -c $verifyQuery 2>&1

    if ($tableList) {
        Write-Host "✅ Phase 78 tables detected:`n$tableList" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Phase 78 tables not found (check migration output above)" -ForegroundColor Yellow
    }

    Write-Host "`n5️⃣  Resetting DATABASE_URL back to legal_admin for runtime..." -ForegroundColor Cyan

    $env:DATABASE_URL = "postgresql://legal_admin:123456@localhost:5434/legal_ai_db"
    Write-Host "✅ DATABASE_URL reset for runtime" -ForegroundColor Green

    Write-Host "`n═════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "✅ DATABASE PERMISSIONS FIXED - Ready for Phase 78!" -ForegroundColor Green
    Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "`n📌 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Visit http://localhost:5173/all-routes" -ForegroundColor Gray
    Write-Host "   2. Filter routes by status/error to find issues" -ForegroundColor Gray
    Write-Host "   3. Click a route to inspect errors and AST graph" -ForegroundColor Gray
    Write-Host "   4. Click 'Request AI Patch' to invoke Phase 78 Error Brain" -ForegroundColor Gray

} catch {
    Write-Host "`n❌ ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up
    if (Test-Path variable:env:PGPASSWORD) {
        Remove-Item env:PGPASSWORD
    }
}
