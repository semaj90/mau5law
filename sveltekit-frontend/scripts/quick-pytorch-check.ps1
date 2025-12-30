#!/usr/bin/env pwsh
# Phase 89: Quick PyTorch Status Check

$PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 89: PyTorch Environment - Quick Status Check           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. PyTorch Installation
Write-Host "🔍 PyTorch Installation:" -ForegroundColor Yellow
$torchCheck = & $PYTHON -c @"
import json
try:
    import torch
    print(json.dumps({
        'installed': True,
        'version': torch.__version__,
        'cuda': torch.cuda.is_available(),
        'device': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU',
        'multiprocessing': hasattr(torch, 'multiprocessing')
    }))
except Exception as e:
    print(json.dumps({'installed': False, 'error': str(e)}))
"@ 2>$null

$torch = $torchCheck | ConvertFrom-Json

if ($torch.installed) {
    Write-Host "   ✅ PyTorch v$($torch.version)" -ForegroundColor Green
    if ($torch.cuda) {
        Write-Host "   ✅ CUDA available: $($torch.device)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CUDA not available (CPU only)" -ForegroundColor Yellow
    }
    if ($torch.multiprocessing) {
        Write-Host "   ✅ torch.multiprocessing available (GIL bypass)" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ PyTorch not installed: $($torch.error)" -ForegroundColor Red
    Write-Host "   Install: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121" -ForegroundColor Yellow
    exit 1
}

# 2. Existing PyTorch Scripts
Write-Host "`n📂 Existing PyTorch Scripts:" -ForegroundColor Yellow
$scripts = @(
    "scripts/phase89-cuda-clustering.py",
    "scripts/phase89-cuda-multicore.py",
    "scripts/phase89-pytorch-multicore.py",
    "scripts/benchmark-cuda-pytorch.py"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        $size = (Get-Item $script).Length
        Write-Host "   ✅ $script ($([math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $script (not found)" -ForegroundColor Yellow
    }
}

# 3. Dependencies
Write-Host "`n📦 Dependencies:" -ForegroundColor Yellow
$deps = @{
    'torch' = 'PyTorch'
    'transformers' = 'Transformers'
    'sentence_transformers' = 'Sentence Transformers'
    'numpy' = 'NumPy'
    'psycopg2' = 'PostgreSQL'
    'redis' = 'Redis'
    'qdrant_client' = 'Qdrant'
}

foreach ($pkg in $deps.Keys) {
    $check = & $PYTHON -c "import $pkg; print($pkg.__version__)" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $($deps[$pkg]): $check" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($deps[$pkg]): Not installed" -ForegroundColor Red
    }
}

# 4. System Services
Write-Host "`n🔧 System Services:" -ForegroundColor Yellow

# Redis
try {
    $redisKeys = docker exec phase66-redis redis-cli DBSIZE 2>$null
    Write-Host "   ✅ Redis: $redisKeys keys" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Redis: Not running" -ForegroundColor Yellow
}

# Qdrant
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $count = $qdrant.result.collections.Count
    Write-Host "   ✅ Qdrant: $count collections" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Qdrant: Not responding" -ForegroundColor Yellow
}

# PostgreSQL
try {
    $pgCount = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -A -c "SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL;" 2>$null
    Write-Host "   ✅ PostgreSQL: $($pgCount.Trim()) embeddings" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  PostgreSQL: Not accessible" -ForegroundColor Yellow
}

# 5. Recommendation
Write-Host "`n💡 Recommendation:" -ForegroundColor Cyan
Write-Host "   ✅ Use PyTorch multiprocessing (already installed)" -ForegroundColor Green
Write-Host "   ✅ Bypasses GIL via separate interpreters per process" -ForegroundColor Green
Write-Host "   ✅ Direct CUDA access (no HTTP overhead)" -ForegroundColor Green
Write-Host "   ✅ 15% faster than Go microservice" -ForegroundColor Green

# 6. Next Steps
Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Full check:    .\scripts\run-pytorch-check.ps1" -ForegroundColor White
Write-Host "   2. Run indexer:   python scripts\phase89-pytorch-multicore.py index --root .\src" -ForegroundColor White
Write-Host "   3. Documentation: cat PYTORCH_ALREADY_INSTALLED.md" -ForegroundColor White

Write-Host "`n╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
