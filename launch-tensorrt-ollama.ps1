#!/usr/bin/env powershell
# TensorRT-LLM + Ollama Knowledge Distillation Launcher
# Spins up complete legal AI inference pipeline

Write-Host "🚀 TensorRT-LLM + Ollama Legal AI Pipeline" -ForegroundColor Green
Write-Host "🎯 Knowledge Distillation: gemma3-legal → gemma3:270m (350MB target)" -ForegroundColor Cyan
Write-Host "⚡ Target: <1ms inference with Q4_K_M optimization" -ForegroundColor Yellow

# Check Docker Desktop
Write-Host "`n🔍 Checking Docker Desktop..." -ForegroundColor Blue
$dockerInfo = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker Desktop is running" -ForegroundColor Green

# Check NVIDIA Docker support
Write-Host "`n🔍 Checking NVIDIA Docker support..." -ForegroundColor Blue
$nvidiaSupport = docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu20.04 nvidia-smi 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ NVIDIA Docker support available" -ForegroundColor Green
} else {
    Write-Host "⚠️  NVIDIA Docker support not detected. GPU acceleration may not work." -ForegroundColor Yellow
}

# Check if Ollama is running
Write-Host "`n🔍 Checking Ollama service..." -ForegroundColor Blue
try {
    $ollamaTest = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama is running with $($ollamaTest.models.Count) models" -ForegroundColor Green

    # List available models
    Write-Host "`n📋 Available Ollama models:" -ForegroundColor Cyan
    foreach ($model in $ollamaTest.models) {
        $sizeGB = [math]::Round($model.size / 1GB, 2)
        Write-Host "   $($model.name) ($sizeGB GB)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Ollama not accessible. Starting Ollama in Docker..." -ForegroundColor Yellow
}

# Build TensorRT-LLM container if needed
Write-Host "`n🔧 Checking TensorRT-LLM container..." -ForegroundColor Blue
$imageExists = docker images tensorrt-llm-ollama:latest -q
if ($imageExists) {
    Write-Host "✅ TensorRT-LLM container image exists" -ForegroundColor Green
} else {
    Write-Host "🔨 Building TensorRT-LLM container (this may take several minutes)..." -ForegroundColor Yellow
    docker build -f Dockerfile.tensorrt-ollama -t tensorrt-llm-ollama:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TensorRT-LLM container built successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to build TensorRT-LLM container" -ForegroundColor Red
        exit 1
    }
}

# Create necessary directories
Write-Host "`n📁 Creating necessary directories..." -ForegroundColor Blue
$directories = @("engines", "models", "logs", "ollama-models", "converted-models")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Gray
    }
}
Write-Host "✅ Directories ready" -ForegroundColor Green

# Start the complete stack
Write-Host "`n🚀 Starting TensorRT-LLM + Ollama stack..." -ForegroundColor Green
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  1. Start Ollama service (if not running)" -ForegroundColor White
Write-Host "  2. Start PostgreSQL with pgvector" -ForegroundColor White
Write-Host "  3. Start Redis cache" -ForegroundColor White
Write-Host "  4. Convert Ollama models to TensorRT engines" -ForegroundColor White
Write-Host "  5. Set up knowledge distillation pipeline" -ForegroundColor White
Write-Host "  6. Start TensorRT-LLM server on port 8100" -ForegroundColor White

Write-Host "`n⏳ Starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.tensorrt-ollama.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 LEGAL AI PIPELINE STARTED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "`n📍 Service URLs:" -ForegroundColor Cyan
    Write-Host "  TensorRT-LLM API: http://localhost:8100" -ForegroundColor White
    Write-Host "  Health Check:     http://localhost:8100/health" -ForegroundColor White
    Write-Host "  Embeddings:       http://localhost:8100/v1/embeddings" -ForegroundColor White
    Write-Host "  Ollama API:       http://localhost:11434" -ForegroundColor White
    Write-Host "  PostgreSQL:       localhost:5432 (legal_ai database)" -ForegroundColor White
    Write-Host "  Redis Cache:      localhost:6379" -ForegroundColor White

    Write-Host "`n🧠 Knowledge Distillation Pipeline:" -ForegroundColor Yellow
    Write-Host "  Teacher Models:   embeddinggemma:latest, nomic-embed-text:latest" -ForegroundColor White
    Write-Host "  Student Model:    gemma3:270m (291MB → 350MB target)" -ForegroundColor White
    Write-Host "  Method:           Knowledge distillation + PPO reinforcement" -ForegroundColor White
    Write-Host "  Target Latency:   <1ms inference" -ForegroundColor White

    Write-Host "`n⚡ Performance Targets:" -ForegroundColor Green
    Write-Host "  Current:  6ms (simulation mode)" -ForegroundColor White
    Write-Host "  Target:   <1ms (TensorRT optimization)" -ForegroundColor White
    Write-Host "  Goal:     0.5ms (CUDA Graphs + FlashAttention)" -ForegroundColor White

    Write-Host "`n📊 To monitor the system:" -ForegroundColor Cyan
    Write-Host "  docker-compose -f docker-compose.tensorrt-ollama.yml logs -f" -ForegroundColor Gray
    Write-Host "`n🔍 To check conversion status:" -ForegroundColor Cyan
    Write-Host "  curl http://localhost:8100/health" -ForegroundColor Gray
    Write-Host "`n🧪 To test embeddings:" -ForegroundColor Cyan
    Write-Host '  curl -X POST http://localhost:8100/v1/embeddings -H "Content-Type: application/json" -d "{\"text\":\"Legal contract analysis\",\"model\":\"gemma3-270m-legal\"}"' -ForegroundColor Gray

} else {
    Write-Host "`n❌ Failed to start services. Check Docker logs:" -ForegroundColor Red
    Write-Host "docker-compose -f docker-compose.tensorrt-ollama.yml logs" -ForegroundColor Gray
    exit 1
}

Write-Host "`n🎯 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Wait for model conversion (check logs)" -ForegroundColor White
Write-Host "2. Test knowledge distillation pipeline" -ForegroundColor White
Write-Host "3. Integrate with SvelteKit frontend" -ForegroundColor White
Write-Host "4. Optimize for <1ms production performance" -ForegroundColor White

Write-Host "`n🚀 Legal AI revolution in progress! 🚀" -ForegroundColor Green