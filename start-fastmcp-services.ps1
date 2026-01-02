# FastMCP + ACE Timeline - Start All Services
# Author: ACE System
# Date: 2026-01-02

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🚀 Starting FastMCP + ACE Timeline Services" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Set environment
$env:PYTHONUTF8 = '1'
$env:PYTHONPATH = 'C:\Users\james\Videos\deeds-web-app'

# Check if Ollama is running
Write-Host "1️⃣  Checking Ollama..." -ForegroundColor Yellow
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2
    Write-Host "   ✅ Ollama running" -ForegroundColor Green

    # Check for gemma3-legal model
    $hasModel = $ollama.models | Where-Object { $_.name -like "gemma3-legal*" }
    if ($hasModel) {
        Write-Host "   ✅ gemma3-legal model available" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  gemma3-legal model not found. Run: ollama pull gemma3-legal:latest" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Ollama not running. Start Ollama first!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start ACE Timeline Service
Write-Host "2️⃣  Starting ACE Timeline Service (port 8002)..." -ForegroundColor Yellow

$aceProcess = Start-Process python `
    -ArgumentList "backend/services/ace_timeline_service.py","--server","--port","8002" `
    -WindowStyle Normal `
    -PassThru

Start-Sleep 3

# Check if ACE Timeline is healthy
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8002/health" -TimeoutSec 2
    Write-Host "   ✅ ACE Timeline Service healthy" -ForegroundColor Green
    Write-Host "      Status: $($health.status)" -ForegroundColor Gray
    Write-Host "      Service: $($health.service)" -ForegroundColor Gray
    Write-Host "      Version: $($health.version)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ ACE Timeline Service failed to start" -ForegroundColor Red
    Stop-Process -Id $aceProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""

# Check PostgreSQL
Write-Host "3️⃣  Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgContainer = docker ps --filter "name=phase66-postgres" --format "{{.Status}}"
    if ($pgContainer -like "Up*") {
        Write-Host "   ✅ PostgreSQL running" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  PostgreSQL not running. Start with: docker start phase66-postgres" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check PostgreSQL" -ForegroundColor Yellow
}

Write-Host ""

# Check Gemini API key
Write-Host "4️⃣  Checking Gemini API..." -ForegroundColor Yellow
$geminiKey = Get-Content .env | Where-Object { $_ -like "GEMINI_API_KEY=*" } | ForEach-Object { $_.Split('=')[1] }
if ($geminiKey -and $geminiKey -ne "" -and $geminiKey -ne "your_api_key_here") {
    Write-Host "   ✅ Gemini API key configured" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Gemini API key not configured in .env" -ForegroundColor Yellow
    Write-Host "      Add: GEMINI_API_KEY=your_key" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ Services Started Successfully!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Service Status:" -ForegroundColor Cyan
Write-Host "   Ollama:           http://localhost:11434 ✅" -ForegroundColor White
Write-Host "   ACE Timeline:     http://localhost:8002 ✅" -ForegroundColor White
Write-Host "   PostgreSQL:       localhost:5434 (check above)" -ForegroundColor White
Write-Host "   Gemini API:       (check above)" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test Commands:" -ForegroundColor Cyan
Write-Host "   # Check ACE Timeline health" -ForegroundColor Gray
Write-Host "   curl http://localhost:8002/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "   # Log a test fix" -ForegroundColor Gray
Write-Host "   python backend/scripts/test_fastmcp_simple.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "   # View recent timeline events" -ForegroundColor Gray
Write-Host "   curl http://localhost:8001/api/timeline/recent?limit=5" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "   FASTMCP_ACE_INTEGRATION_COMPLETE.md" -ForegroundColor Yellow
Write-Host "   copilot.md - GitHub Copilot integration" -ForegroundColor Yellow
Write-Host "   gemini.md - Gemini API guide" -ForegroundColor Yellow
Write-Host "   claude.md - Claude API guide" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop services..." -ForegroundColor Gray

# Keep script running
try {
    while ($true) {
        Start-Sleep 1
    }
} finally {
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    Stop-Process -Id $aceProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}
