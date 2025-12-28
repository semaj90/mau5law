# Phase 89: Top-K Index Builder Monitor
# Check progress of inverse index generation

Write-Host "🔍 Phase 89: Top-K Index Build Monitor`n" -ForegroundColor Cyan

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"

    # Get database stats
    $dbStats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(DISTINCT error_id) as errors, COUNT(*) as relationships FROM error_topk_index" 2>$null

    if ($dbStats) {
        $parts = $dbStats.Trim() -split '\|'
        $errors = [int]$parts[0].Trim()
        $relationships = [int]$parts[1].Trim()

        # Total errors to index
        $totalErrors = 45661

        # Calculate progress
        $progress = if ($totalErrors -gt 0) { [math]::Round(($errors / $totalErrors) * 100, 2) } else { 0 }
        $avgNeighbors = if ($errors -gt 0) { [math]::Round($relationships / $errors, 1) } else { 0 }

        Write-Host "[$timestamp] " -NoNewline -ForegroundColor DarkGray
        Write-Host "Indexed: " -NoNewline
        Write-Host "$errors" -NoNewline -ForegroundColor Green
        Write-Host " / $totalErrors errors ($progress%) | " -NoNewline
        Write-Host "Relationships: $relationships " -NoNewline -ForegroundColor Cyan
        Write-Host "| Avg: $avgNeighbors neighbors" -NoNewline

        # Check if complete
        if ($errors -eq $totalErrors) {
            Write-Host " ✅" -ForegroundColor Green
            Write-Host "`n✅ Top-K index build complete!" -ForegroundColor Green

            # Show final stats
            Write-Host "`n📊 Final Statistics:" -ForegroundColor Yellow
            $finalStats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT AVG(similarity)::numeric(10,4) as avg_sim, MIN(similarity)::numeric(10,4) as min_sim, MAX(similarity)::numeric(10,4) as max_sim FROM error_topk_index"
            Write-Host $finalStats

            break
        } else {
            Write-Host ""
        }
    } else {
        Write-Host "[$timestamp] Waiting for index build to start..." -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 10
}

# Check Redis cache
Write-Host "`n💾 Redis Cache Status:" -ForegroundColor Cyan
try {
    $redisKeys = docker exec phase66-redis redis-cli DBSIZE 2>$null
    if ($redisKeys) {
        Write-Host "   Total keys: $redisKeys" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not connect to Redis" -ForegroundColor Yellow
}
