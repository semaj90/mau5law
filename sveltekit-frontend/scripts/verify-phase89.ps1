Write-Host "Phase 89 Verification" -ForegroundColor Cyan

# 1. Check GPU
Write-Host "1. GPU Check"
$pythonPath = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
& $pythonPath -c "import torch; print('CUDA:', torch.cuda.is_available())"

# 2. Check Redis
Write-Host "2. Redis Check"
docker exec phase66-redis redis-cli DBSIZE

# 3. Check Qdrant
Write-Host "3. Qdrant Check"
$cols = @('phase89_error_chunks', 'phase89_kb_cards', 'phase89_code_units')
foreach ($c in $cols) {
    try {
        $r = Invoke-RestMethod "http://localhost:6333/collections/$c"
        Write-Host "$c : $($r.result.points_count)"
    } catch {
        Write-Host "$c : Missing"
    }
}
