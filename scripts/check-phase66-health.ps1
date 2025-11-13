# Phase 66 Service Health Check
Write-Host "🔍 Phase 66 Service Health Check" -ForegroundColor Cyan

# Test MCP Server
try {
    $response = Invoke-RestMethod -Uri "/mcp/health" -TimeoutSec 5
    Write-Host "✅ MCP Server: Healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ MCP Server: Unhealthy" -ForegroundColor Red
}

# Test TensorRT-LLM
try {
    $response = Invoke-RestMethod -Uri "/health" -TimeoutSec 5
    Write-Host "✅ TensorRT-LLM: Healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ TensorRT-LLM: Unhealthy" -ForegroundColor Red
}

# Test Ollama
try {
    $response = Invoke-RestMethod -Uri "/api/tags" -TimeoutSec 5
    Write-Host "✅ Ollama: 0 models available" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama: Unhealthy" -ForegroundColor Red
}

# Test SvelteKit
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5
    Write-Host "✅ SvelteKit: Healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ SvelteKit: Unhealthy" -ForegroundColor Red
}

Write-Host "
🏁 Health check complete" -ForegroundColor Cyan
