# Phase 89: Database Setup Script
# Runs schema creation and sample data insertion

Write-Host "🔧 Phase 89: Database Setup" -ForegroundColor Cyan
Write-Host ""

$PGHOST = "127.0.0.1"
$PGPORT = "5434"
$PGDATABASE = "legal"
$PGUSER = "user"
$env:PGPASSWORD = "pass"

Write-Host "📊 Creating Phase 89 tables..." -ForegroundColor Yellow
psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -f sql/phase89-schema.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema created successfully" -ForegroundColor Green
    Write-Host ""

    Write-Host "📈 Verifying table counts..." -ForegroundColor Yellow

    $query = @"
SELECT
    'fix_attempts' as table_name, COUNT(*) as row_count FROM phase89_fix_attempts
UNION ALL
SELECT 'kb_cards', COUNT(*) FROM phase89_kb_cards
UNION ALL
SELECT 'error_clusters', COUNT(*) FROM phase89_error_clusters
UNION ALL
SELECT 'timeline', COUNT(*) FROM phase89_timeline
UNION ALL
SELECT 'cosine_rankings', COUNT(*) FROM phase89_cosine_rankings
UNION ALL
SELECT 'ast_signatures', COUNT(*) FROM phase89_ast_signatures;
"@

    psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c $query

    Write-Host ""
    Write-Host "🏥 Checking health summary..." -ForegroundColor Yellow
    psql -h $PGHOST -p $PGPORT -d $PGDATABASE -U $PGUSER -c "SELECT * FROM phase89_health_summary;"

    Write-Host ""
    Write-Host "🎉 Phase 89 database setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start dev server: npm run dev" -ForegroundColor White
    Write-Host "  2. Visit dashboard: http://localhost:5175/admin/phase89" -ForegroundColor White
    Write-Host "  3. Check API status: http://localhost:5175/api/phase89/status" -ForegroundColor White
    Write-Host "  4. Check API config: http://localhost:5175/api/phase89/config" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Database setup failed!" -ForegroundColor Red
    Write-Host "Check PostgreSQL connection and credentials" -ForegroundColor Yellow
    exit 1
}
