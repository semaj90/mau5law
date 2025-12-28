# Phase 89: Continuous Embedding Monitor
# Runs every 30 seconds until complete

param(
    [int]$IntervalSeconds = 30,
    [int]$MaxIterations = 1000
)

Write-Host "`n🔄 Phase 89: Continuous Embedding Monitor" -ForegroundColor Cyan
Write-Host "   Checking every $IntervalSeconds seconds (Ctrl+C to stop)`n" -ForegroundColor Gray

$iteration = 0
$lastCount = 0
$startTime = Get-Date

while ($iteration -lt $MaxIterations) {
    $iteration++
    $currentTime = Get-Date
    $elapsed = ($currentTime - $startTime).TotalMinutes

    # Get counts
    $total = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings;" 2>&1 | Select-String "\d+" | ForEach-Object { $_.Matches.Value }
    $embedded = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL;" 2>&1 | Select-String "\d+" | ForEach-Object { $_.Matches.Value }

    if ($total -and $embedded) {
        $total = [int]$total
        $embedded = [int]$embedded
        $pending = $total - $embedded
        $pct = [math]::Round(($embedded / $total) * 100, 1)

        # Calculate rate
        if ($lastCount -gt 0) {
            $rate = ($total - $lastCount) / $IntervalSeconds * 60
            $rateStr = "$([math]::Round($rate, 0)) rows/min"
        } else {
            $rateStr = "calculating..."
        }

        # Display progress
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
        Write-Host "Total: $($total.ToString('N0').PadLeft(6)) | " -NoNewline -ForegroundColor Cyan
        Write-Host "Embedded: $($embedded.ToString('N0').PadLeft(6)) ($pct%) | " -NoNewline -ForegroundColor Green
        Write-Host "Rate: $rateStr" -ForegroundColor Yellow

        $lastCount = $total

        # Check if complete
        if ($pending -eq 0) {
            Write-Host "`n✅ Embedding complete! Total: $($total.ToString('N0')) errors" -ForegroundColor Green

            # Show final stats
            $stats = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT source, COUNT(*) FROM raw_error_embeddings GROUP BY source;" 2>&1
            Write-Host "`nBreakdown by source:" -ForegroundColor Cyan
            Write-Host $stats

            break
        }
    }

    # Wait for next iteration
    Start-Sleep -Seconds $IntervalSeconds
}

$endTime = Get-Date
$totalMinutes = ($endTime - $startTime).TotalMinutes

Write-Host "`n📊 Monitoring complete!" -ForegroundColor Cyan
Write-Host "   Total time: $([math]::Round($totalMinutes, 1)) minutes" -ForegroundColor Gray
Write-Host "   Iterations: $iteration" -ForegroundColor Gray
