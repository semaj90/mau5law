#!/usr/bin/env pwsh
# Start SIMD JSON Accelerator on port 8103

$env:SIMD_JSON_ACCEL_PORT = "8103"
$simdPath = Join-Path $PSScriptRoot "..\..\..\go-services\simd-json-accelerator\simd-json-accelerator.exe"

Write-Host "🚀 Starting SIMD JSON Accelerator on port 8103..." -ForegroundColor Cyan

if (-not (Test-Path $simdPath)) {
    Write-Host "❌ SIMD accelerator not found: $simdPath" -ForegroundColor Red
    exit 1
}

# Start with environment variable
& $simdPath
