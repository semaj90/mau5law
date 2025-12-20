# Phase 76: Complete System Startup Guide
# Run this script to start all services in correct order

Write-Host "`n🚀 Phase 76: Complete RAG/KAG/MCP System Startup`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "📋 Checking Prerequisites..." -ForegroundColor Yellow

# Check Ollama
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction Stop
    Write-Host "   ✅ Ollama running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ollama not running" -ForegroundColor Red
    Write-Host "      Run: ollama serve" -ForegroundColor Yellow
    exit 1
}

# Check Qdrant
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase76_knowledge_base" -ErrorAction Stop
    Write-Host "   ✅ Qdrant running ($($qdrant.result.points_count) docs)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant not running" -ForegroundColor Red
    Write-Host "      Run: docker run -p 6333:6333 qdrant/qdrant" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🎯 Starting Phase 76 Services...`n" -ForegroundColor Cyan

# Option 1: Start FastMCP Server (Optional)
Write-Host "1️⃣  FastMCP Server (Optional - for agentic tools)" -ForegroundColor Yellow
$startMCP = Read-Host "   Start MCP server? (y/N)"

if ($startMCP -eq 'y') {
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; node scripts/fastmcp-server.mjs"
    Write-Host "   ✅ MCP server starting on port 3002" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ⏭️  Skipped (not required)" -ForegroundColor Gray
}

# Option 2: Start SvelteKit Dev Server (Required)
Write-Host "`n2️⃣  SvelteKit Dev Server (Required)" -ForegroundColor Yellow
Write-Host "   Starting on port 5175..." -ForegroundColor Cyan

Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"
Write-Host "   ✅ Dev server starting" -ForegroundColor Green

Write-Host "`n⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verify services
Write-Host "`n🔍 Verifying Services...`n" -ForegroundColor Cyan

$services = @{
    "SvelteKit Dev" = "http://localhost:5175"
    "Knowledge API" = "http://localhost:5175/api/knowledge/search?q=test"
    "Search UI" = "http://localhost:5175/knowledge"
}

if ($startMCP -eq 'y') {
    $services["MCP Server"] = "http://localhost:3002/function-call"
}

foreach ($service in $services.GetEnumerator()) {
    try {
        $null = Invoke-WebRequest -Uri $service.Value -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   ✅ $($service.Key)" -ForegroundColor Green
    } catch {
        Write-Host "   ⏳ $($service.Key) (still starting...)" -ForegroundColor Yellow
    }
}

Write-Host "`n✨ Phase 76 System Ready!`n" -ForegroundColor Green

Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   🌐 Search UI:       http://localhost:5175/knowledge" -ForegroundColor White
Write-Host "   🔌 Knowledge API:   http://localhost:5175/api/knowledge/search" -ForegroundColor White
Write-Host "   📊 Qdrant Admin:    http://localhost:6333/dashboard" -ForegroundColor White
if ($startMCP -eq 'y') {
    Write-Host "   🛠️  MCP Server:      http://localhost:3002/function-call" -ForegroundColor White
}

Write-Host "`n🎯 Quick Commands:" -ForegroundColor Cyan
Write-Host "   Test system:        node scripts/test-phase76-system.mjs" -ForegroundColor White
Write-Host "   Query knowledge:    npm run phase76:query 'your question'" -ForegroundColor White
Write-Host "   Run ACE agent:      npm run phase76:ace" -ForegroundColor White
Write-Host "   Add docs:           npm run phase76:kb:crawl <urls>" -ForegroundColor White

Write-Host "`n🚀 Try opening: http://localhost:5175/knowledge`n" -ForegroundColor Green
