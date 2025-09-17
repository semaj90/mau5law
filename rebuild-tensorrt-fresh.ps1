# Clear Docker Build Cache and Test TensorRT-LLM
# Forces fresh build without cached layers

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🧹 CLEARING DOCKER CACHE & REBUILDING TENSORRT" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Stop and remove any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Blue
docker stop tensorrt-legal-server postgres-legal-ai 2>&1 | Out-Null
docker rm tensorrt-legal-server postgres-legal-ai 2>&1 | Out-Null

# Remove existing images
Write-Host "🗑️ Removing existing images..." -ForegroundColor Blue
docker rmi tensorrt-llm-legal:latest tensorrt-llm-test-1:latest 2>&1 | Out-Null

# Clear build cache
Write-Host "🧹 Clearing Docker build cache..." -ForegroundColor Blue
docker builder prune -f

Write-Host ""
Write-Host "🔨 Building fresh container with fixed dependencies..." -ForegroundColor Green

# Build with no cache
docker build --no-cache -f Dockerfile.tensorrt-fixed -t tensorrt-llm-legal:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Fresh build completed successfully!" -ForegroundColor Green

    # Test the fresh container
    Write-Host "🧪 Testing fresh container..." -ForegroundColor Blue

    docker run -d --name tensorrt-legal-server --gpus all -p 8100:8100 tensorrt-llm-legal:latest

    if ($LASTEXITCODE -eq 0) {
        Write-Host "⏳ Waiting for container to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15

        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8100/health" -TimeoutSec 10
            Write-Host "✅ Container is healthy! Status: $($health.status)" -ForegroundColor Green
            Write-Host "🚀 TensorRT-LLM server ready at http://localhost:8100" -ForegroundColor Cyan
        } catch {
            Write-Host "⚠️ Health check failed, checking logs..." -ForegroundColor Yellow
            docker logs tensorrt-legal-server
        }
    } else {
        Write-Host "❌ Failed to start container" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build failed even with fresh cache" -ForegroundColor Red
    Write-Host "💡 Trying Python fallback instead..." -ForegroundColor Yellow

    # Start Python server directly
    python tensorrt-llm-production-server.py
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor White
Write-Host "   1. If container is running: http://localhost:8100/health" -ForegroundColor Gray
Write-Host "   2. Test embedding: curl -X POST http://localhost:8100/v1/embeddings -H 'Content-Type: application/json' -d '{\"text\":\"test\",\"model\":\"gemma3-legal:latest\",\"dimensions\":512}'" -ForegroundColor Gray
Write-Host "   3. Launch full stack: .\launch-tensorrt-sveltekit-stack.ps1" -ForegroundColor Gray