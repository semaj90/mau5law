# Phase 89: Embedding Progress Monitor
# Run this periodically to check embedding progress

Write-Host "`n📊 Phase 89: Embedding Progress Monitor`n" -ForegroundColor Cyan

# ============================================================
# Check Database Stats
# ============================================================
Write-Host "🔍 Checking database..." -ForegroundColor Yellow

$stats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "
SELECT
  COALESCE(source, 'TOTAL') as source,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
  COUNT(*) FILTER (WHERE embedding IS NULL) as pending
FROM raw_error_embeddings
GROUP BY ROLLUP(source)
ORDER BY source NULLS LAST;
" 2>&1

if ($stats) {
    Write-Host $stats
}

# ============================================================
# Calculate Progress
# ============================================================
$embedded = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL;" 2>&1 | Select-String "\d+" | ForEach-Object { $_.Matches.Value }

$total = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings;" 2>&1 | Select-String "\d+" | ForEach-Object { $_.Matches.Value }

if ($embedded -and $total) {
    $embedded = [int]$embedded
    $total = [int]$total
    $pending = $total - $embedded
    $pct = [math]::Round(($embedded / $total) * 100, 1)

    Write-Host "`n📈 Overall Progress:" -ForegroundColor Cyan
    Write-Host "   Embedded: $($embedded.ToString('N0')) / $($total.ToString('N0')) ($pct%)" -ForegroundColor Green
    Write-Host "   Pending:  $($pending.ToString('N0'))" -ForegroundColor Yellow

    # Estimate time remaining (assumes ~200 embeddings/min)
    $minutesRemaining = [math]::Ceiling($pending / 200)
    Write-Host "   ETA:      ~$minutesRemaining minutes" -ForegroundColor Gray
}

# ============================================================
# Check Table Size
# ============================================================
$size = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT pg_size_pretty(pg_total_relation_size('raw_error_embeddings'));" 2>&1

if ($size) {
    Write-Host "`n💾 Database Size:" -ForegroundColor Cyan
    Write-Host "   Table: $($size.Trim())" -ForegroundColor Gray
}

# ============================================================
# Check if Process is Running
# ============================================================
Write-Host "`n🔄 Process Status:" -ForegroundColor Cyan

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*phase89-raw-text-embedder*" }

if ($nodeProcesses) {
    Write-Host "   ✅ Embedder is running (PID: $($nodeProcesses.Id))" -ForegroundColor Green
    Write-Host "   CPU: $($nodeProcesses.CPU.ToString('N1'))s | Memory: $([math]::Round($nodeProcesses.WorkingSet64 / 1MB, 0)) MB" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Embedder process not detected" -ForegroundColor Yellow
    Write-Host "      Check terminal or restart with: node scripts/phase89-raw-text-embedder.mjs" -ForegroundColor Gray
}

Write-Host "`n✅ Monitoring complete!`n" -ForegroundColor Green
