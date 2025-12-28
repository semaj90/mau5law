#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Phase 89 FastAPI + FastMCP Server
.DESCRIPTION
    Starts the CUDA-accelerated RAG server on port 8090
    - FastAPI REST endpoints
    - FastMCP tool integration
    - Redis tensor cache
    - Streaming SSE responses
#>

param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 8090
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Phase 89 RAG Server..." -ForegroundColor Cyan
Write-Host ""

# Verify dependencies
$python = "C:/Users/james/Videos/deeds-web-app/.venv/Scripts/python.exe"

if (-not (Test-Path $python)) {
    Write-Host "❌ Python venv not found: $python" -ForegroundColor Red
    exit 1
}

# Check services
Write-Host "🔍 Checking services..." -ForegroundColor Yellow

# Redis
try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:6379" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "  ✅ Redis: Running" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Redis: Not responding (will retry on startup)" -ForegroundColor Yellow
}

# Qdrant
try {
    $qdrant = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -Method GET -TimeoutSec 2
    Write-Host "  ✅ Qdrant: Running ($($qdrant.result.collections.Count) collections)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Qdrant: Not running - please start docker container phase66-qdrant" -ForegroundColor Red
    exit 1
}

# Ollama
try {
    $ollama = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method GET -TimeoutSec 2
    Write-Host "  ✅ Ollama: Running ($($ollama.models.Count) models)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Ollama: Not running - please start Ollama service" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📡 Starting FastAPI server on http://${Host}:${Port}" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start server
& $python scripts/phase89-fastapi-server.py --host $Host --port $Port
