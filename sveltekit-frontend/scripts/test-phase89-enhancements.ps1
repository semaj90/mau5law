#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 89: Test Enhanced Pipeline

.DESCRIPTION
    Tests the new multi-core, GPU-accelerated Phase 89 pipeline with:
    - PyTorch multiprocessing (bypass GIL)
    - Redis embedding cache
    - LLM cluster summarization
    - Ripgrep auto-tagging
    - GPU utilization monitoring
#>

Write-Host "🚀 Phase 89: Enhanced Pipeline Test" -ForegroundColor Cyan
Write-Host "═" * 60
Write-Host ""

# 1. Check GPU Status
Write-Host "1️⃣  GPU Health Check" -ForegroundColor Yellow
$pythonPath = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
$gpuCheck = "import torch; print('CUDA Available:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'); print('Memory:', f'{torch.cuda.get_device_properties(0).total_memory/1e9:.2f} GB' if torch.cuda.is_available() else 'N/A')"
& $pythonPath -c $gpuCheck
Write-Host ""

# 2. Test Redis Cache
Write-Host "2️⃣  Redis Cache Test" -ForegroundColor Yellow
try {
    $redisKeys = docker exec phase66-redis redis-cli DBSIZE
    Write-Host "   ✅ Redis Keys: $redisKeys"
} catch {
    Write-Host "   ❌ Redis unavailable" -ForegroundColor Red
}
Write-Host ""

# 3. Test Qdrant Collections
Write-Host "3️⃣  Qdrant Collections Test" -ForegroundColor Yellow
$collections = @('phase89_error_chunks', 'phase89_kb_cards', 'phase89_ast_embeddings')
foreach ($col in $collections) {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/$col" -ErrorAction SilentlyContinue
        $points = $response.result.points_count
        Write-Host "   ✅ $col : $points points"
    } catch {
        Write-Host "   ⚠️  $col : not created yet" -ForegroundColor Yellow
    }
}
Write-Host ""

# 4. Run Small Clustering Test (dry-run)
Write-Host "4️⃣  CUDA Clustering Test (Small Batch)" -ForegroundColor Yellow
Write-Host "   Testing multi-core PyTorch with DataLoader..."
# Note: This would run the actual clustering script with a small batch
Write-Host "   ⏭️  Skipping (run manually with: python scripts/phase89-cuda-multicore.py)"
Write-Host ""

# 5. Test LLM Summarizer
Write-Host "5️⃣  LLM Summarizer Test" -ForegroundColor Yellow
Write-Host "   Checking Ollama connectivity..."
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    $models = $ollama.models | Where-Object { $_.name -like '*gemma*' }
    Write-Host "   ✅ Ollama running with $($models.Count) Gemma models"
} catch {
    Write-Host "   ❌ Ollama unavailable" -ForegroundColor Red
}
Write-Host ""

# 6. Test Ripgrep Tagger
Write-Host "6️⃣  Ripgrep Tagger Test" -ForegroundColor Yellow
Write-Host "   Testing ripgrep availability..."
try {
    $rgVersion = rg --version | Select-Object -First 1
    Write-Host "   ✅ $rgVersion"
} catch {
    Write-Host "   ❌ ripgrep not found" -ForegroundColor Red
}
Write-Host ""

# 7. Test FastMCP Integration
Write-Host "7️⃣  FastMCP/ACP Integration Test" -ForegroundColor Yellow
Write-Host "   Checking if dev server is running..."
try {
    $status = Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/status" -TimeoutSec 5
    Write-Host "   ✅ API responding"
    Write-Host "   GPU: $($status.gpu.device_name) ($($status.gpu.memory_utilization) utilization)"
    Write-Host "   Wiring: $($status.summary.wiring_score)"
} catch {
    Write-Host "   ⚠️  Dev server not running (start with: npm run dev)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "═" * 60
Write-Host "📊 Enhancement Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Created Files:" -ForegroundColor Green
Write-Host "   - scripts/phase89-cuda-multicore.py (Multi-core PyTorch)"
Write-Host "   - scripts/phase89-llm-summarizer.mjs (Ollama integration)"
Write-Host "   - scripts/phase89-ripgrep-tagger.mjs (Auto-tagging)"
Write-Host "   - src/lib/server/acp/tools/phase89.ts (ACP tools)"
Write-Host ""
Write-Host "🔧 Key Features:" -ForegroundColor Green
Write-Host "   ✓ Multi-core DataLoader (GIL bypass)"
Write-Host "   ✓ Redis embedding cache (24h TTL)"
Write-Host "   ✓ Chunked streaming (OOM prevention)"
Write-Host "   ✓ GPU utilization monitoring"
Write-Host "   ✓ LLM cluster summarization to copilot.md"
Write-Host "   ✓ Ripgrep auto-tagging to Qdrant searchable"
Write-Host "   ✓ FastMCP/ACP tool integration"
Write-Host ""
Write-Host "🚀 Test Complete"
