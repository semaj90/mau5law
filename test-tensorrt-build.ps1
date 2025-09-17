# Quick Docker Build Test for TensorRT-LLM
# Tests multiple approaches to find the working solution

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🔧 TENSORRT-LLM DOCKER BUILD TEST" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Check Docker availability
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "❌ Docker is required but not available" -ForegroundColor Red
    exit 1
}

# Check GPU availability
try {
    $gpuInfo = nvidia-smi --query-gpu=name --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GPU: $gpuInfo" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No NVIDIA GPU detected" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ nvidia-smi not available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Testing Build Approach 1: Fixed Dockerfile (Recommended)" -ForegroundColor Blue

$buildStart = Get-Date
docker build -f Dockerfile.tensorrt-fixed -t tensorrt-llm-test-1:latest . 2>&1 | Tee-Object -Variable build1Output

if ($LASTEXITCODE -eq 0) {
    $buildTime = ((Get-Date) - $buildStart).TotalMinutes
    Write-Host "✅ Build 1 SUCCESS! Time: $($buildTime.ToString('F1')) minutes" -ForegroundColor Green

    # Test the container
    Write-Host "🧪 Testing container startup..." -ForegroundColor Blue
    docker run -d --name tensorrt-test-1 -p 8101:8100 tensorrt-llm-test-1:latest | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Start-Sleep -Seconds 10

        # Test health endpoint
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8101/health" -TimeoutSec 5
            Write-Host "✅ Container test SUCCESS! Status: $($health.status)" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Container started but health check failed" -ForegroundColor Yellow
        }

        # Clean up test container
        docker stop tensorrt-test-1 2>&1 | Out-Null
        docker rm tensorrt-test-1 2>&1 | Out-Null
    } else {
        Write-Host "❌ Container failed to start" -ForegroundColor Red
    }

    # Tag as production image
    docker tag tensorrt-llm-test-1:latest tensorrt-llm-legal:latest
    Write-Host "🏷️ Tagged as tensorrt-llm-legal:latest for production use" -ForegroundColor Green

} else {
    $buildTime = ((Get-Date) - $buildStart).TotalMinutes
    Write-Host "❌ Build 1 FAILED after $($buildTime.ToString('F1')) minutes" -ForegroundColor Red

    Write-Host ""
    Write-Host "🧪 Testing Build Approach 2: Original Dockerfile" -ForegroundColor Blue

    $buildStart2 = Get-Date
    docker build -f Dockerfile.tensorrt-ollama -t tensorrt-llm-test-2:latest . 2>&1 | Tee-Object -Variable build2Output

    if ($LASTEXITCODE -eq 0) {
        $buildTime2 = ((Get-Date) - $buildStart2).TotalMinutes
        Write-Host "✅ Build 2 SUCCESS! Time: $($buildTime2.ToString('F1')) minutes" -ForegroundColor Green

        # Tag as production image
        docker tag tensorrt-llm-test-2:latest tensorrt-llm-legal:latest
        Write-Host "🏷️ Tagged as tensorrt-llm-legal:latest for production use" -ForegroundColor Green

    } else {
        $buildTime2 = ((Get-Date) - $buildStart2).TotalMinutes
        Write-Host "❌ Build 2 FAILED after $($buildTime2.ToString('F1')) minutes" -ForegroundColor Red

        Write-Host ""
        Write-Host "🔄 All Docker builds failed, will use Python fallback" -ForegroundColor Yellow
        Write-Host "💡 Ensure Python 3.8+ and required packages are installed" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "📋 BUILD SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Show available images
$images = docker images --filter "reference=tensorrt-llm*" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
if ($images) {
    Write-Host "🐳 Available TensorRT Images:" -ForegroundColor Green
    Write-Host $images
} else {
    Write-Host "❌ No TensorRT images built successfully" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor White
try {
    $imageExists = docker images tensorrt-llm-legal:latest --format "{{.Repository}}" 2>$null
    if ($imageExists) {
        Write-Host "   ✅ Production image ready: tensorrt-llm-legal:latest" -ForegroundColor Green
        Write-Host "   📋 Run the full stack: .\launch-tensorrt-sveltekit-stack.ps1" -ForegroundColor Cyan
    } else {
        throw "No image found"
    }
} catch {
    Write-Host "   ⚠️ No production image available" -ForegroundColor Yellow
    Write-Host "   🐍 Python fallback will be used automatically" -ForegroundColor Cyan
    Write-Host "   📋 Run the stack: .\launch-tensorrt-sveltekit-stack.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔧 Manual Commands:" -ForegroundColor White
Write-Host "   🐳 Test container: docker run -p 8100:8100 tensorrt-llm-legal:latest" -ForegroundColor Gray
Write-Host "   🐍 Test Python: python tensorrt-llm-production-server.py" -ForegroundColor Gray
Write-Host "   💾 Check models: ls ~/.ollama/models/" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ Build test completed!" -ForegroundColor Green