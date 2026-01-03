#!/usr/bin/env pwsh
# Phase 89: Enhanced Codebase Indexing - Progress Checker
# Check current status of full codebase indexing

Write-Host "📊 Phase 89: Indexing Progress Check" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""

# 1. Check Qdrant collection
Write-Host "1️⃣ Qdrant Collection Status:" -ForegroundColor Yellow
try {
    $qdrant = Invoke-RestMethod -Uri 'http://localhost:6333/collections/fastmcp_file_profiles' -Method GET -TimeoutSec 5
    $points = $qdrant.result.points_count
    $total = 13039  # Total files in codebase
    $progress = [math]::Round(($points / $total) * 100, 2)

    Write-Host "   ✅ Collection: fastmcp_file_profiles" -ForegroundColor Green
    Write-Host "   📈 Indexed: $points / $total files ($progress%)" -ForegroundColor Green
    Write-Host "   🔢 Vectors: 768d" -ForegroundColor Green
    Write-Host "   📊 Status: $($qdrant.result.status)" -ForegroundColor Green
} catch {
    Write-Host "   ⏳ Collection not yet created or Qdrant offline" -ForegroundColor Yellow
}
Write-Host ""

# 2. Check Python process
Write-Host "2️⃣ Indexer Process:" -ForegroundColor Yellow
$pythonProcs = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.WorkingSet -gt 10MB }
if ($pythonProcs) {
    foreach ($proc in $pythonProcs) {
        $memMB = [math]::Round($proc.WorkingSet / 1MB, 2)
        $cpuSec = [math]::Round($proc.CPU, 0)
        Write-Host "   ✅ PID: $($proc.Id) | CPU: ${cpuSec}s | Memory: ${memMB}MB" -ForegroundColor Green
    }
} else {
    Write-Host "   ⏸️  No active indexing processes" -ForegroundColor Yellow
}
Write-Host ""

# 3. Check Ollama availability
Write-Host "3️⃣ Ollama Status:" -ForegroundColor Yellow
try {
    $ollama = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -Method GET -TimeoutSec 3
    $models = $ollama.models | Where-Object { $_.name -match 'gemma3|embedding' }
    Write-Host "   ✅ Ollama online" -ForegroundColor Green
    Write-Host "   🤖 Models loaded:" -ForegroundColor Green
    foreach ($model in $models) {
        Write-Host "      - $($model.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Ollama offline or busy" -ForegroundColor Red
}
Write-Host ""

# 4. Estimate completion
Write-Host "4️⃣ Estimated Completion:" -ForegroundColor Yellow
if ($points -and $points -gt 100) {
    $remaining = $total - $points
    $filesPerSec = 0.9  # Average speed with 8 workers
    $remainingSec = $remaining / $filesPerSec
    $remainingMin = [math]::Round($remainingSec / 60, 0)
    $eta = (Get-Date).AddMinutes($remainingMin).ToString("HH:mm:ss")

    Write-Host "   ⏱️  Remaining: $remaining files" -ForegroundColor Cyan
    Write-Host "   ⏱️  ETA: ~$remainingMin minutes (around $eta)" -ForegroundColor Cyan
    Write-Host "   📊 Speed: ~$filesPerSec files/sec" -ForegroundColor Cyan
} else {
    Write-Host "   ⏳ Waiting for more data to estimate..." -ForegroundColor Yellow
}
Write-Host ""

# 5. Next steps
Write-Host "5️⃣ Next Steps:" -ForegroundColor Yellow
if ($points -lt $total) {
    Write-Host "   🔄 Indexing in progress - wait for completion" -ForegroundColor Cyan
    Write-Host "   💡 Run this script again to check progress" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ Indexing complete!" -ForegroundColor Green
    Write-Host "   🚀 Ready to run ACE check ingest:" -ForegroundColor Green
    Write-Host "      python scripts/ace-check-ingest.py --input check_output.txt" -ForegroundColor Gray
}
Write-Host ""
