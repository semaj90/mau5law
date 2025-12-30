#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 89: Advanced ACE Pipeline Test Runner
.DESCRIPTION
    Run comprehensive ACE pipeline with:
    - embeddinggemma:latest (768-dim)
    - SIMD JSON parsing
    - Auto-tagging + PyTorch clustering
    - FastMCP agentic tools
    - GPU-accelerated RAG/KAG
#>

$ErrorActionPreference = "Stop"
$env:PHASE89_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 89: Advanced ACE Pipeline - embeddinggemma:latest (768)  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Pre-flight checks
Write-Host "🔍 Pre-flight Checks`n" -ForegroundColor Yellow

# 1. Python + PyTorch
Write-Host "1️⃣ Python + PyTorch + CUDA..." -ForegroundColor White
$torchCheck = & $env:PHASE89_PYTHON -c "import torch; print(f'PyTorch {torch.__version__}, CUDA {torch.cuda.is_available()}')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ $torchCheck" -ForegroundColor Green
} else {
    Write-Host "   ❌ PyTorch/CUDA not available" -ForegroundColor Red
    exit 1
}

# 2. Additional dependencies
Write-Host "`n2️⃣ Checking dependencies..." -ForegroundColor White

$deps = @('simdjson', 'scikit-learn', 'requests')
foreach ($dep in $deps) {
    $check = & $env:PHASE89_PYTHON -c "import $dep; print('OK')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $dep" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $dep not installed (will install)" -ForegroundColor Yellow
        & $env:PHASE89_PYTHON -m pip install $dep -q
    }
}

# 3. Ollama (embeddinggemma:latest)
Write-Host "`n3️⃣ Ollama Status..." -ForegroundColor White
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 -ErrorAction Stop
    $embeddingModel = $ollama.models | Where-Object { $_.name -like '*embeddinggemma*' }

    if ($embeddingModel) {
        Write-Host "   ✅ embeddinggemma:latest available" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  embeddinggemma not found (will use simulation)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Ollama not accessible (will use simulation)" -ForegroundColor Yellow
}

# 4. Qdrant
Write-Host "`n4️⃣ Qdrant Status..." -ForegroundColor White
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ Qdrant: $($qdrant.result.collections.Count) collections" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Qdrant not accessible (will use simulation)" -ForegroundColor Yellow
}

# 5. FastMCP
Write-Host "`n5️⃣ FastMCP Status..." -ForegroundColor White
try {
    $fastmcp = Invoke-RestMethod -Uri "http://localhost:3003/tools" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ FastMCP: $($fastmcp.Count) tools available" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  FastMCP not accessible (will use simulation)" -ForegroundColor Yellow
}

# 6. GPU
Write-Host "`n6️⃣ GPU Status..." -ForegroundColor White
try {
    $gpu = nvidia-smi --query-gpu=name,memory.total,utilization.gpu --format=csv,noheader 2>&1
    Write-Host "   ✅ $gpu" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  nvidia-smi not available" -ForegroundColor Yellow
}

Write-Host "`n" + ("═" * 70)
Write-Host "`n🚀 Running Advanced ACE Pipeline...`n" -ForegroundColor Green

# Run pipeline
& $env:PHASE89_PYTHON scripts/phase89-advanced-ace-pipeline.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Pipeline complete!`n" -ForegroundColor Green

    # Show results
    $resultsPath = "reports/phase89-advanced-ace-pipeline.json"
    if (Test-Path $resultsPath) {
        Write-Host ("═" * 70)
        Write-Host "`n📊 Quick Results`n" -ForegroundColor Cyan

        $results = Get-Content $resultsPath | ConvertFrom-Json

        Write-Host "GPU: $($results.gpu.name)" -ForegroundColor White
        Write-Host "Model: $($results.gpu.embedding_model) ($($results.gpu.embedding_dim)-dim)" -ForegroundColor White
        Write-Host ""

        if ($results.simd_json) {
            Write-Host "SIMD JSON:" -ForegroundColor Yellow
            Write-Host "   • Speedup: $($results.simd_json.speedup)x vs stdlib" -ForegroundColor White
            Write-Host "   • Throughput: $($results.simd_json.throughput_mb_sec) MB/sec" -ForegroundColor White
            Write-Host ""
        }

        if ($results.auto_tagging) {
            Write-Host "Auto-Tagging:" -ForegroundColor Yellow
            Write-Host "   • Documents: $($results.auto_tagging.documents)" -ForegroundColor White
            Write-Host "   • Clusters: $($results.auto_tagging.clusters)" -ForegroundColor White
            Write-Host "   • Time: $($results.auto_tagging.total_ms)ms" -ForegroundColor White
            Write-Host ""
        }

        Write-Host "ACE Pipeline:" -ForegroundColor Yellow
        Write-Host "   • Search: $($results.ace_synthesis.search_time_ms)ms" -ForegroundColor White
        Write-Host "   • Synthesis: $($results.ace_synthesis.synthesis_time_ms)ms" -ForegroundColor White
        Write-Host "   • Total: $($results.ace_synthesis.total_time_ms)ms" -ForegroundColor White
        Write-Host "   • Throughput: $($results.ace_synthesis.throughput_docs_per_sec) docs/sec" -ForegroundColor White
        Write-Host "   • Status: $($results.ace_synthesis.performance)" -ForegroundColor $(
            if ($results.ace_synthesis.performance -eq 'EXCELLENT') { 'Green' }
            elseif ($results.ace_synthesis.performance -eq 'GOOD') { 'Yellow' }
            else { 'Red' }
        )
        Write-Host ""
    }

    Write-Host ("═" * 70)
    Write-Host "`n🎯 Next Steps:`n" -ForegroundColor Cyan
    Write-Host "   1. Review: reports/phase89-advanced-ace-pipeline.json" -ForegroundColor White
    Write-Host "   2. Full indexing: python scripts/phase89-pytorch-multicore.py index" -ForegroundColor White
    Write-Host "   3. Start FastMCP: pwsh scripts/start-context7-agentic.ps1" -ForegroundColor White
    Write-Host "   4. Test ACE prompting: npm run phase76:ace" -ForegroundColor White
    Write-Host ""

} else {
    Write-Host "`n❌ Pipeline failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
    exit 1
}
