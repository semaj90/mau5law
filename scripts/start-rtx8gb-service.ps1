#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start RTX 8GB Optimized TensorRT-LLM Service
.DESCRIPTION
    Launches the streaming inference server optimized for 8GB RTX GPUs
    with model sharding, quantization, and memory management.
.PARAMETER ContainerName
    Name of the TensorRT-LLM Docker container
.PARAMETER EnginePath
    Path to the RTX 8GB optimized engine
.PARAMETER Port
    Port to run the streaming server on
.PARAMETER MaxMemoryGB
    Maximum GPU memory to use (default: 6GB)
.EXAMPLE
    .\start-rtx8gb-service.ps1 -Port 8099
#>

param(
    [string]$ContainerName = "legal-ai-tensorrt-llm",
    [string]$EnginePath = "/workspace/engines/rtx8gb/engine",
    [int]$Port = 8099,
    [int]$MaxMemoryGB = 6
)

Write-Host "🚀 Starting RTX 8GB Optimized TensorRT Service" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "Container: $ContainerName" -ForegroundColor Cyan
Write-Host "Engine Path: $EnginePath" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan
Write-Host "Max Memory: ${MaxMemoryGB}GB" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $ContainerName -Quiet
if (-not $containerRunning) {
    Write-Host "❌ Container '$ContainerName' is not running. Please start it first." -ForegroundColor Red
    exit 1
}

# Check if engine exists
$engineExists = docker exec $ContainerName test -d $EnginePath && echo "exists" || echo "not found"
if ($engineExists -notmatch "exists") {
    Write-Host "❌ Engine not found at $EnginePath. Please build the RTX 8GB engine first." -ForegroundColor Red
    Write-Host "Run: Build TensorRT Engines (RTX 8GB Optimized)" -ForegroundColor Yellow
    exit 1
}

# Set environment variables for RTX 8GB optimization
$envCommand = @"
export CUDA_VISIBLE_DEVICES=0
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export TORCH_USE_CUDA_DSA=1
export RTX_8GB_OPTIMIZATION=true
export MAX_MEMORY_GB=$MaxMemoryGB
"@

# Start the streaming server
$startCommand = @"
cd /workspace/engines/rtx8gb
$envCommand
python3 streaming_inference.py --port $Port --max-memory-gb $MaxMemoryGB
"@

Write-Host "🔄 Starting streaming inference server..." -ForegroundColor Yellow

try {
    # Start server in background
    $job = Start-Job -ScriptBlock {
        param($ContainerName, $startCommand)
        docker exec $ContainerName bash -c $startCommand
    } -ArgumentList $ContainerName, $startCommand

    # Wait a moment for server to start
    Start-Sleep -Seconds 5

    # Test health endpoint
    Write-Host "🩺 Testing health endpoint..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 10
        $healthData = $healthResponse.Content | ConvertFrom-Json

        Write-Host "✅ Service started successfully!" -ForegroundColor Green
        Write-Host "Health Status: $($healthData.status)" -ForegroundColor Green
        Write-Host "Memory Usage: $($healthData.memory_usage_gb)GB / $($healthData.max_memory_gb)GB" -ForegroundColor Green
        Write-Host "Device: $($healthData.device)" -ForegroundColor Green

    } catch {
        Write-Host "⚠️ Service may be starting slowly. Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Try again in a few seconds: curl http://localhost:$Port/health" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "🌐 Service Endpoints:" -ForegroundColor Cyan
    Write-Host "  Health: http://localhost:$Port/health" -ForegroundColor White
    Write-Host "  Generate: http://localhost:$Port/generate" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Example Usage:" -ForegroundColor Cyan
    Write-Host "  curl -X POST http://localhost:$Port/generate \" -ForegroundColor White
    Write-Host "    -H 'Content-Type: application/json' \" -ForegroundColor White
    Write-Host "    -d '{\"prompt\":\"Explain legal contract basics\",\"max_tokens\":200}'" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 RTX 8GB Optimizations Active:" -ForegroundColor Magenta
    Write-Host "  • Model sharding with CPU offloading" -ForegroundColor White
    Write-Host "  • INT4 quantization for reduced VRAM usage" -ForegroundColor White
    Write-Host "  • Streaming/chunking for long sequences" -ForegroundColor White
    Write-Host "  • Automatic memory management" -ForegroundColor White
    Write-Host "  • KV cache offloading to CPU" -ForegroundColor White

} catch {
    Write-Host "❌ Failed to start service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💡 Monitoring:" -ForegroundColor Cyan
Write-Host "  • Use YoRHa System Monitor to track GPU memory usage" -ForegroundColor White
Write-Host "  • Monitor logs: docker logs $ContainerName" -ForegroundColor White
Write-Host "  • Stop service: docker exec $ContainerName pkill -f streaming_inference.py" -ForegroundColor White