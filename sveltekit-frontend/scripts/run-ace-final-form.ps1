# Phase 89: ACE Final Form Pipeline - Complete Orchestration
# Local-first architecture with PyTorch multiprocessing (GIL-free)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 89: ACE Final Form Pipeline                              ║" -ForegroundColor Cyan
Write-Host "║   Local-First | PyTorch Multiprocessing | GPU Acceleration       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Python executable
$PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

if (-not (Test-Path $PYTHON)) {
    Write-Host "❌ Python not found: $PYTHON" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: Test JSON Backend
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "1️⃣ Testing JSON Backend..." -ForegroundColor Yellow
Write-Host ""

& $PYTHON scripts/phase89_json.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ JSON backend test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: Check Services
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "2️⃣ Checking Services..." -ForegroundColor Yellow
Write-Host ""

# Redis
try {
    $redis_ping = docker exec phase66-redis redis-cli PING 2>&1
    if ($redis_ping -match "PONG") {
        $redis_keys = docker exec phase66-redis redis-cli DBSIZE 2>&1 | Select-String -Pattern "\d+"
        Write-Host "   ✅ Redis: Connected ($redis_keys keys)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis: Not responding" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Redis: Error - $_" -ForegroundColor Red
    exit 1
}

# Qdrant
try {
    $qdrant_health = Invoke-RestMethod -Uri "http://localhost:6333/healthz" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ Qdrant: Connected" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant: Not running" -ForegroundColor Red
    exit 1
}

# Ollama
try {
    $ollama_models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
    $has_embedding = $ollama_models.models | Where-Object { $_.name -match "embeddinggemma" }
    $has_legal = $ollama_models.models | Where-Object { $_.name -match "gemma3-legal" }

    if ($has_embedding) {
        Write-Host "   ✅ Ollama: embeddinggemma:latest" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Ollama: embeddinggemma:latest not found" -ForegroundColor Yellow
    }

    if ($has_legal) {
        Write-Host "   ✅ Ollama: gemma3-legal:latest" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Ollama: gemma3-legal:latest not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Ollama: Not running" -ForegroundColor Red
    exit 1
}

# GPU
try {
    $gpu_check = & $PYTHON -c "import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only')" 2>&1
    Write-Host "   ✅ GPU: $gpu_check" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  CUDA not available, using CPU" -ForegroundColor Yellow
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: Ripgrep Error Analysis
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "3️⃣ Ripgrep Error Analysis..." -ForegroundColor Yellow
Write-Host ""

# Check if ripgrep is installed
$rg_version = rg --version 2>&1 | Select-String -Pattern "ripgrep"
if (-not $rg_version) {
    Write-Host "   ⚠️  Ripgrep not installed, skipping error analysis" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Ripgrep: $rg_version" -ForegroundColor Green

    # Count TypeScript errors
    $ts_errors = rg --count-matches "error TS\d+" src --type typescript --type svelte 2>$null |
        Measure-Object -Line | Select-Object -ExpandProperty Lines

    Write-Host "   📊 Found $ts_errors files with TypeScript errors" -ForegroundColor Cyan
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# Step 4: Run ACE Context Builder
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "4️⃣ ACE Context Builder (Final Form)..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Running comprehensive analysis..." -ForegroundColor Cyan
Write-Host ""

& $PYTHON scripts/ace-context-builder-final.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ACE Context Builder failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ ACE Context Builder complete!" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# Step 5: Show Results
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "5️⃣ Results Summary..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "reports/ace-context-packet.json") {
    $context_packet = Get-Content "reports/ace-context-packet.json" | ConvertFrom-Json

    Write-Host "   📊 ACE Context Packet:" -ForegroundColor Cyan
    Write-Host "      • Goal: $($context_packet.goal)" -ForegroundColor White
    Write-Host "      • Error Chunks: $($context_packet.evidence.top_error_chunks.Count)" -ForegroundColor White
    Write-Host "      • Code Chunks: $($context_packet.evidence.top_code_chunks.Count)" -ForegroundColor White
    Write-Host "      • Related Units: $($context_packet.evidence.related_units.Count)" -ForegroundColor White
    Write-Host "      • KB Cards: $($context_packet.evidence.kb_cards.Count)" -ForegroundColor White
    Write-Host "      • Cache Hits: $($context_packet.evidence.cache_hits.Count)" -ForegroundColor White
    Write-Host "      • Confidence: $($context_packet.confidence)" -ForegroundColor White
    Write-Host ""

    if ($context_packet.recommended_actions) {
        Write-Host "   🔧 Recommended Actions:" -ForegroundColor Cyan
        $context_packet.recommended_actions | ForEach-Object {
            Write-Host "      • $_" -ForegroundColor White
        }
        Write-Host ""
    }
} else {
    Write-Host "   ⚠️  Context packet not generated" -ForegroundColor Yellow
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "═" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Phase 89 ACE Final Form Pipeline Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Generated Files:" -ForegroundColor Yellow
Write-Host "   • reports/ace-context-packet.json" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review context packet in reports/" -ForegroundColor White
Write-Host "   2. Use recommended actions for fixes" -ForegroundColor White
Write-Host "   3. Run pipeline again to build cache" -ForegroundColor White
Write-Host ""
Write-Host "📚 Architecture:" -ForegroundColor Yellow
Write-Host "   • Local-first (Qdrant + Redis + code index)" -ForegroundColor White
Write-Host "   • PyTorch multiprocessing (GIL-free)" -ForegroundColor White
Write-Host "   • GPU acceleration (RTX 3060 Ti)" -ForegroundColor White
Write-Host "   • Validated KB cards only" -ForegroundColor White
Write-Host ""
