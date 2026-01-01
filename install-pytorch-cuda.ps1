#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Install PyTorch 2.9.1 with CUDA 12.6 Support for RTX 3060 Ti
.DESCRIPTION
    Uninstalls CPU-only PyTorch and installs CUDA-enabled version
    Compatible with CUDA 13.0 driver (580.88) on Windows
#>

$ErrorActionPreference = "Stop"
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Installing PyTorch 2.9.1 with CUDA 12.6 (RTX 3060 Ti)        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. Check NVIDIA GPU
Write-Host "1️⃣ Checking NVIDIA GPU..." -ForegroundColor Yellow
$gpuInfo = nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ GPU: $gpuInfo" -ForegroundColor Green
} else {
    Write-Host "   ❌ NVIDIA GPU not found!" -ForegroundColor Red
    exit 1
}

# 2. Check CUDA driver version
Write-Host "`n2️⃣ Checking CUDA driver..." -ForegroundColor Yellow
$cudaVersion = nvidia-smi | Select-String "CUDA Version: (\d+\.\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
Write-Host "   ✅ CUDA Driver: $cudaVersion" -ForegroundColor Green

# 3. Backup current PyTorch version
Write-Host "`n3️⃣ Checking current PyTorch..." -ForegroundColor Yellow
$currentTorch = & $env:PHASE72_PYTHON -m pip show torch 2>&1 | Select-String "Version:"

if ($currentTorch) {
    Write-Host "   ⚠️  Current: $currentTorch" -ForegroundColor Yellow
} else {
    Write-Host "   ℹ️  PyTorch not installed" -ForegroundColor Cyan
}

# 4. Uninstall CPU version
Write-Host "`n4️⃣ Uninstalling CPU-only PyTorch..." -ForegroundColor Yellow
& $env:PHASE72_PYTHON -m pip uninstall -y torch torchvision torchaudio 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ CPU version removed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Uninstall had warnings (continuing)" -ForegroundColor Yellow
}

# 5. Install PyTorch with CUDA 12.6
Write-Host "`n5️⃣ Installing PyTorch 2.9.1 with CUDA 12.6..." -ForegroundColor Yellow
Write-Host "   (This may take 2-5 minutes, downloading ~2.5 GB)`n" -ForegroundColor Cyan

$installCmd = "pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu126"
& $env:PHASE72_PYTHON -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n   ❌ Installation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n   ✅ PyTorch installed successfully!" -ForegroundColor Green

# 6. Verify CUDA availability
Write-Host "`n6️⃣ Verifying CUDA support..." -ForegroundColor Yellow

$verification = & $env:PHASE72_PYTHON -c @"
import torch
print(f'PyTorch Version: {torch.__version__}')
print(f'CUDA Available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA Version: {torch.version.cuda}')
    print(f'GPU Name: {torch.cuda.get_device_name(0)}')
    print(f'GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
    print(f'cuDNN Enabled: {torch.backends.cudnn.enabled}')
    print(f'cuDNN Version: {torch.backends.cudnn.version()}')
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n$verification" -ForegroundColor Green
} else {
    Write-Host "`n   ❌ Verification failed!" -ForegroundColor Red
    exit 1
}

# 7. Quick GPU test
Write-Host "`n7️⃣ Testing GPU tensor operations..." -ForegroundColor Yellow

$gpuTest = & $env:PHASE72_PYTHON -c @"
import torch
import time

# Create random tensor on GPU
x = torch.rand(1000, 1000).cuda()
y = torch.rand(1000, 1000).cuda()

# Measure GPU matmul speed
start = time.time()
z = torch.matmul(x, y)
torch.cuda.synchronize()
elapsed = (time.time() - start) * 1000

print(f'GPU Matrix Multiplication (1000x1000): {elapsed:.2f}ms')
print(f'Result shape: {z.shape}')
print(f'Device: {z.device}')
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n$gpuTest" -ForegroundColor Green
} else {
    Write-Host "`n   ⚠️  GPU test had issues" -ForegroundColor Yellow
}

Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              ✅ PyTorch CUDA Installation Complete!               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run Advanced ACE Pipeline:" -ForegroundColor White
Write-Host "     cd sveltekit-frontend" -ForegroundColor Gray
Write-Host "     .\scripts\run-advanced-ace-pipeline.ps1`n" -ForegroundColor Gray

Write-Host "  2. Run GPU Clustering:" -ForegroundColor White
Write-Host "     `$env:PHASE72_PYTHON = 'C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe'" -ForegroundColor Gray
Write-Host "     & `$env:PHASE72_PYTHON sveltekit-frontend/scripts/phase89-cuda-clustering.py`n" -ForegroundColor Gray

Write-Host "  3. Verify stack wiring:" -ForegroundColor White
Write-Host "     .\phase89-stack-wiring.ps1`n" -ForegroundColor Gray
