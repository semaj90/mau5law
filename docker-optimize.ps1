# Phase 66 Docker Build Optimization Script
# Sets optimal Docker Desktop memory limits and enables BuildKit

param(
    [switch]$SetMemory,
    [switch]$Build,
    [switch]$Clean,
    [switch]$Verify,
    [string]$ComposeFile = "docker-compose.phase66-full.yml"
)

# Enable BuildKit for faster builds
$env:DOCKER_BUILDKIT = 1
$env:COMPOSE_DOCKER_CLI_BUILD = 1

Write-Host "🐳 Phase 66 Docker Optimization Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($SetMemory) {
    Write-Host "📊 Setting Docker Desktop Memory Limits..." -ForegroundColor Yellow

    # Check if Docker Desktop is running
    $dockerProcesses = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerProcesses) {
        Write-Host "⚠️  Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
    Write-Host "💡 Recommended: Set Docker Desktop → Resources → Memory = 12-16 GB, Swap = 2 GB" -ForegroundColor Yellow
    Write-Host "🔗 Open Docker Desktop settings manually to adjust memory limits" -ForegroundColor Cyan
}

if ($Clean) {
    Write-Host "🧹 Cleaning Docker cache and unused images..." -ForegroundColor Yellow

    # Stop all containers
    docker-compose -f $ComposeFile down --remove-orphans

    # Remove unused containers, networks, and images
    docker system prune -f

    # Remove dangling build cache
    docker builder prune -f

    Write-Host "✅ Docker cleanup completed" -ForegroundColor Green
}

if ($Build) {
    Write-Host "🏗️  Building Phase 66 stack with optimizations..." -ForegroundColor Yellow
    Write-Host "📊 Build context size check:" -ForegroundColor Cyan

    # Check build context size
    $contextSize = (Get-ChildItem -Path . -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host ("📁 Build context: {0:N2} GB" -f $contextSize) -ForegroundColor White

    if ($contextSize -gt 1) {
        Write-Host "⚠️  Large build context detected. .dockerignore should reduce this." -ForegroundColor Yellow
    }

    # Build with BuildKit
    Write-Host "🚀 Starting optimized build..." -ForegroundColor Green
    $startTime = Get-Date

    docker-compose -f $ComposeFile build --parallel

    $buildTime = (Get-Date) - $startTime
    Write-Host ("✅ Build completed in {0:mm}m {0:ss}s" -f $buildTime) -ForegroundColor Green
}

if ($Verify) {
    Write-Host "🔍 Verifying Phase 66 stack..." -ForegroundColor Yellow

    # Check if services are running
    Write-Host "📋 Service Status:" -ForegroundColor Cyan
    docker-compose -f $ComposeFile ps

    # Test health endpoints
    Write-Host "`n🏥 Health Checks:" -ForegroundColor Cyan

    $services = @(
        @{Name="MCP Server"; Url="http://localhost:3003/mcp/health"},
        @{Name="TensorRT-LLM"; Url="http://localhost:8099/health"},
        @{Name="SvelteKit"; Url="http://localhost:5173"}
    )

    foreach ($service in $services) {
        try {
            Invoke-WebRequest -Uri $service.Url -TimeoutSec 10 -ErrorAction Stop | Out-Null
            Write-Host ("✅ {0}: Healthy" -f $service.Name) -ForegroundColor Green
        } catch {
            Write-Host ("❌ {0}: Unhealthy" -f $service.Name) -ForegroundColor Red
        }
    }

    # Check GPU access
    Write-Host "`n🎮 GPU Check:" -ForegroundColor Cyan
    try {
        $gpuCheck = docker exec phase66-tensorrt-llm nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader,nounits
        Write-Host "✅ GPU Access: OK" -ForegroundColor Green
        Write-Host "📊 GPU Info: $gpuCheck" -ForegroundColor White
    } catch {
        Write-Host "❌ GPU Access: Failed" -ForegroundColor Red
    }
}

if (-not ($SetMemory -or $Build -or $Clean -or $Verify)) {
    Write-Host "Usage: .\docker-optimize.ps1 [options]" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -SetMemory    Display Docker memory configuration tips" -ForegroundColor White
    Write-Host "  -Build        Build the Phase 66 stack with optimizations" -ForegroundColor White
    Write-Host "  -Clean        Clean Docker cache and unused resources" -ForegroundColor White
    Write-Host "  -Verify       Verify all services are running and healthy" -ForegroundColor White
    Write-Host "  -ComposeFile  Specify docker-compose file (default: docker-compose.phase66-full.yml)" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\docker-optimize.ps1 -Clean -Build -Verify" -ForegroundColor White
    Write-Host "  .\docker-optimize.ps1 -SetMemory" -ForegroundColor White
}

Write-Host "`n🎯 Optimization Tips:" -ForegroundColor Cyan
Write-Host "• Use WSL2 for faster file operations (move repo to /home/user/)" -ForegroundColor White
Write-Host "• Enable Docker BuildKit: `$env:DOCKER_BUILDKIT=1" -ForegroundColor White
Write-Host "• Monitor memory usage during builds" -ForegroundColor White
Write-Host "• Keep .dockerignore updated to minimize build context" -ForegroundColor White