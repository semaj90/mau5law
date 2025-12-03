# Archive WebGPU and CUDA Demos
# Moves GPU-related demo routes to archive

$ErrorActionPreference = "Stop"
$baseDir = "sveltekit-frontend/src/routes"
$archiveBase = "$baseDir/archive/gpu-demos"

# Create archive directory
if (!(Test-Path $archiveBase)) {
    New-Item -ItemType Directory -Force -Path $archiveBase | Out-Null
    Write-Host "🗂️  Created archive directory: $archiveBase" -ForegroundColor Cyan
}

# Define routes to archive
$gpuRoutes = @(
    "webgpu",
    "webgpu-test",
    "cuda-streaming",
    "gpu-demo",
    "tensorrt",
    "api/webgpu",
    "api/cuda",
    "api/gpu-test-simple",
    "api/test-wasm-inference"
)

$moved = 0
$skipped = 0

Write-Host "🖥️  Starting GPU demo archival..." -ForegroundColor Cyan

foreach ($route in $gpuRoutes) {
    $sourcePath = Join-Path $baseDir $route

    if (Test-Path $sourcePath) {
        # Handle nested paths (e.g. api/webgpu)
        $routeName = Split-Path $route -Leaf
        $destPath = Join-Path $archiveBase $routeName

        # Check for name conflicts
        if (Test-Path $destPath) {
             $destPath = Join-Path $archiveBase "$routeName-$(Get-Random)"
        }

        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "   ✅ Moved: $route" -ForegroundColor Green
            $moved++
        }
        catch {
            Write-Host "   ❌ Failed to move: $route - $($_.Exception.Message)" -ForegroundColor Red
            $skipped++
        }
    }
    else {
        Write-Host "   ⏭️  Skipped (not found): $route" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host "`n✅ GPU demo archival complete!" -ForegroundColor Green
Write-Host "   Moved: $moved" -ForegroundColor Cyan
Write-Host "   Skipped: $skipped" -ForegroundColor DarkGray
