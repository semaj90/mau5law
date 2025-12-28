#!/usr/bin/env pwsh
# Phase 87: Knowledge Plane Verification Script

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Phase 87: Knowledge Plane Verification" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker Container
Write-Host "1️⃣ Checking RAG+KAG Middleware Container..." -ForegroundColor Yellow
$container = docker ps --filter "name=phase87-rag-middleware" --format "{{.Names}}: {{.Status}}"
if ($container) {
    Write-Host "   ✅ $container" -ForegroundColor Green
} else {
    Write-Host "   ❌ Container not running" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check Health Endpoint
Write-Host "2️⃣ Testing Health Endpoint (http://localhost:8765/health)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8765/health" -TimeoutSec 5
    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Test RAG Retrieval
Write-Host "3️⃣ Testing RAG Retrieval Endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        query = "TypeScript syntax errors"
        top_k = 3
    } | ConvertTo-Json

    $result = Invoke-RestMethod -Uri "http://localhost:8765/rag/retrieve" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✅ Retrieved $($result.hits.Count) hits" -ForegroundColor Green
    if ($result.hits.Count -gt 0) {
        Write-Host "   📊 Top result score: $($result.hits[0].score)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ⚠️ RAG retrieval test: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Test KAG Expansion
Write-Host "4️⃣ Testing KAG Expansion Endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        seed_ids = @("error_123", "file_456")
        depth = 1
        limit = 10
    } | ConvertTo-Json

    $result = Invoke-RestMethod -Uri "http://localhost:8765/kag/expand" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
    Write-Host "   ✅ Graph expansion returned $($result.nodes.Count) nodes" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ KAG expansion test: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Check FastMCP Server
Write-Host "5️⃣ Checking FastMCP Server (Port 3002)..." -ForegroundColor Yellow
$tcp = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($tcp) {
    Write-Host "   ✅ FastMCP running (PID: $($tcp.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ FastMCP not detected on port 3002" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Phase 87 Verification Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Available Endpoints:" -ForegroundColor Cyan
Write-Host "   • Health:           http://localhost:8765/health"
Write-Host "   • RAG Embed:        POST http://localhost:8765/rag/embed"
Write-Host "   • RAG Retrieve:     POST http://localhost:8765/rag/retrieve"
Write-Host "   • RAG Hybrid:       POST http://localhost:8765/rag/retrieve/hybrid"
Write-Host "   • KAG Expand:       POST http://localhost:8765/kag/expand"
Write-Host "   • KAG Context:      POST http://localhost:8765/kag/context"
Write-Host "   • Chat Stream:      POST http://localhost:8765/chat/stream"
Write-Host "   • Chat:             POST http://localhost:8765/chat/"
Write-Host "   • KB Ingest:        POST http://localhost:8765/kb/ingest"
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Run Phase 86 autonomous loop:"
Write-Host "      node scripts/phase86-autonomous-loop.mjs"
Write-Host ""
Write-Host "   2. Monitor middleware logs:"
Write-Host "      docker logs -f phase87-rag-middleware"
Write-Host ""
