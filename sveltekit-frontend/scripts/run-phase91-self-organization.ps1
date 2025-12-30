# Phase 91: ACE Self-Organization Pipeline
# Periodic clustering for semantic stratification

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 91: ACE Self-Organization (GPU Tensor Clustering)        ║" -ForegroundColor Cyan
Write-Host "║   RTX 3060 Ti | PyTorch K-Means | Semantic Routing               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

if (-not (Test-Path $PYTHON)) {
    Write-Host "❌ Python not found: $PYTHON" -ForegroundColor Red
    exit 1
}

# Check CUDA availability
$cuda_check = & $PYTHON -c "import torch; print('YES' if torch.cuda.is_available() else 'NO')" 2>&1
$gpu_name = & $PYTHON -c "import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')" 2>&1

Write-Host "🎮 GPU Status:" -ForegroundColor Yellow
Write-Host "   Device: $gpu_name" -ForegroundColor White
Write-Host "   CUDA: $cuda_check" -ForegroundColor White
Write-Host ""

if ($cuda_check -ne "YES") {
    Write-Host "⚠️  CUDA not available. Install PyTorch with CUDA:" -ForegroundColor Yellow
    Write-Host "   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118" -ForegroundColor White
    Write-Host ""

    $continue = Read-Host "Continue with CPU? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Menu
Write-Host "📋 Self-Organization Tasks:" -ForegroundColor Cyan
Write-Host "   1. Quick Analysis (100 cards, 8 clusters)" -ForegroundColor White
Write-Host "   2. Full Clustering (all cards, 8 clusters)" -ForegroundColor White
Write-Host "   3. Deep Clustering (all cards, 16 clusters)" -ForegroundColor White
Write-Host "   4. Analyze Only (no Qdrant update)" -ForegroundColor White
Write-Host "   5. Custom..." -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select task"

switch ($choice) {
    "1" {
        Write-Host "🚀 Quick Analysis..." -ForegroundColor Green
        & $PYTHON scripts/phase91-tensor-clustering.py --max-cards 100 --clusters 8
    }
    "2" {
        Write-Host "🚀 Full Clustering (8 domains)..." -ForegroundColor Green
        & $PYTHON scripts/phase91-tensor-clustering.py --clusters 8
    }
    "3" {
        Write-Host "🚀 Deep Clustering (16 domains)..." -ForegroundColor Green
        & $PYTHON scripts/phase91-tensor-clustering.py --clusters 16
    }
    "4" {
        Write-Host "🚀 Analysis Only..." -ForegroundColor Green
        & $PYTHON scripts/phase91-tensor-clustering.py --analyze-only
    }
    "5" {
        $clusters = Read-Host "Number of clusters"
        $maxCards = Read-Host "Max cards (blank = all)"

        $args = @("--clusters", $clusters)
        if ($maxCards) {
            $args += @("--max-cards", $maxCards)
        }

        Write-Host "🚀 Custom Clustering..." -ForegroundColor Green
        & $PYTHON scripts/phase91-tensor-clustering.py @args
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Self-Organization Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Check reports/phase91_cluster_analysis.json" -ForegroundColor White
    Write-Host "   2. Query specific clusters in Qdrant:" -ForegroundColor White
    Write-Host "      filter: { cluster_id: 3 }" -ForegroundColor Gray
    Write-Host "   3. Use centroids for semantic routing:" -ForegroundColor White
    Write-Host "      Query centroid → Find best cluster → Search only there" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Self-Organization failed" -ForegroundColor Red
    exit 1
}
