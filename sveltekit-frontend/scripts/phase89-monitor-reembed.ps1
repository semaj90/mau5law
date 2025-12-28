# Phase 89: Monitor Svelte Re-embedding

Write-Host "🔍 Phase 89: Svelte Re-embedding Monitor`n" -ForegroundColor Cyan

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"

    # Get counts
    $counts = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT source, COUNT(*) as total, COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded FROM raw_error_embeddings GROUP BY source ORDER BY source" 2>$null

    if ($counts) {
        Write-Host "[$timestamp]" -ForegroundColor DarkGray
        Write-Host $counts

        # Calculate total
        $total = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings" 2>$null
        $embedded = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL" 2>$null

        $totalNum = [int]$total.Trim()
        $embeddedNum = [int]$embedded.Trim()
        $progress = if ($totalNum -gt 0) { [math]::Round(($embeddedNum / $totalNum) * 100, 2) } else { 0 }

        Write-Host "`nTotal: $embeddedNum / $totalNum ($progress%)`n" -ForegroundColor Cyan

        # Check if complete (target: ~113K total = 38,930 TSC + 74,866 svelte)
        if ($totalNum -ge 113000 -and $embeddedNum -eq $totalNum) {
            Write-Host "✅ Re-embedding complete!`n" -ForegroundColor Green
            break
        }
    }

    Start-Sleep -Seconds 30
}
