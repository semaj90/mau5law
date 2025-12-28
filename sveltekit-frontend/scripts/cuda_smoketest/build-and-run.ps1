#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and run the CUDA smoketest to verify NVCC + CUDAToolkit chain

.DESCRIPTION
    This script:
    1. Runs CMake configure with Visual Studio generator
    2. Builds the CUDA executable
    3. Runs the smoketest

.EXAMPLE
    .\scripts\cuda_smoketest\build-and-run.ps1
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🔧 CUDA Smoketest Build & Run" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check for NVCC
Write-Host "1️⃣ Checking for NVCC..." -ForegroundColor Yellow
try {
    $nvccVersion = nvcc --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ NVCC found" -ForegroundColor Green
        $nvccVersion | Select-String "release" | ForEach-Object { Write-Host "      $_" -ForegroundColor Cyan }
    } else {
        Write-Host "   ❌ NVCC not found in PATH" -ForegroundColor Red
        Write-Host "   Add CUDA bin to PATH: C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\bin" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ NVCC not found: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check for CMake
Write-Host "2️⃣ Checking for CMake..." -ForegroundColor Yellow
try {
    $cmakeVersion = cmake --version 2>&1 | Select-Object -First 1
    Write-Host "   ✅ $cmakeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ CMake not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Configure
Write-Host "3️⃣ Running CMake Configure..." -ForegroundColor Yellow
Push-Location $ScriptDir
try {
    # Clean previous build
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
    }

    # Configure with VS2022 (adjust if you have different version)
    cmake -S . -B build -G "Visual Studio 17 2022" -A x64

    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ CMake configure failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Configure successful" -ForegroundColor Green
} finally {
    Pop-Location
}
Write-Host ""

# Build
Write-Host "4️⃣ Building CUDA executable..." -ForegroundColor Yellow
Push-Location $ScriptDir
try {
    cmake --build build --config Release

    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Build successful" -ForegroundColor Green
} finally {
    Pop-Location
}
Write-Host ""

# Run
Write-Host "5️⃣ Running CUDA smoketest..." -ForegroundColor Yellow
$exePath = Join-Path $ScriptDir "build\Release\cuda_smoketest.exe"

if (Test-Path $exePath) {
    & $exePath

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 CUDA toolchain is fully functional!" -ForegroundColor Green
        Write-Host "   You can use CUDA acceleration in your Python/Node scripts" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "⚠️  Smoketest returned exit code $LASTEXITCODE" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Executable not found at: $exePath" -ForegroundColor Red
    exit 1
}
