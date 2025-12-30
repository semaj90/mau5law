# Context7 MCP Agentic Server - Startup & Health Check
# Run with: pwsh scripts/start-context7-agentic.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Context7 MCP Agentic Server - Startup                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# 1. Check Prerequisites
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# PostgreSQL
Write-Host "1️⃣ PostgreSQL (port 5434):" -NoNewline
try {
    $pg = docker ps --filter "name=phase66-postgres" --format "{{.Status}}"
    if ($pg -like "*Up*") {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Start with: docker start phase66-postgres" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ Docker check failed" -ForegroundColor Red
    exit 1
}

# Redis
Write-Host "2️⃣ Redis (port 6379):" -NoNewline
try {
    $redis = docker ps --filter "name=phase66-redis" --format "{{.Status}}"
    if ($redis -like "*Up*") {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Start with: docker start phase66-redis" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ Docker check failed" -ForegroundColor Red
    exit 1
}

# Qdrant
Write-Host "3️⃣ Qdrant (port 6333):" -NoNewline
try {
    $qdrant = docker ps --filter "name=phase66-qdrant" --format "{{.Status}}"
    if ($qdrant -like "*Up*") {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Start with: docker start phase66-qdrant" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ Docker check failed" -ForegroundColor Red
    exit 1
}

# RabbitMQ
Write-Host "4️⃣ RabbitMQ (ports 5672, 15672):" -NoNewline
try {
    $rabbitmq = docker ps --filter "name=phase66-rabbitmq" --format "{{.Status}}"
    if ($rabbitmq -like "*Up*") {
        Write-Host " ✅ Running (phase66-rabbitmq)" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Start with: docker start phase66-rabbitmq" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ Docker check failed" -ForegroundColor Red
    exit 1
}

# Ollama
Write-Host "5️⃣ Ollama (port 11434):" -NoNewline
try {
    $ollama = docker ps --filter "name=ollama-gemma" --format "{{.Status}}"
    if ($ollama -like "*Up*") {
        Write-Host " ✅ Running" -ForegroundColor Green

        # Check models
        $models = docker exec ollama-gemma ollama list 2>&1
        if ($models -match "gemma3-legal:latest") {
            Write-Host "   ✅ gemma3-legal:latest found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  gemma3-legal:latest not found" -ForegroundColor Yellow
            Write-Host "   Pull with: docker exec ollama-gemma ollama pull gemma3-legal:latest" -ForegroundColor Yellow
        }

        if ($models -match "embeddinggemma:latest") {
            Write-Host "   ✅ embeddinggemma:latest found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  embeddinggemma:latest not found" -ForegroundColor Yellow
            Write-Host "   Pull with: docker exec ollama-gemma ollama pull embeddinggemma:latest" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Start with: docker start ollama-gemma" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ Docker check failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# 2. Check Node.js Dependencies
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📦 Checking Node.js dependencies..." -ForegroundColor Yellow
Write-Host ""

$required = @("amqplib", "@qdrant/js-client-rest", "ioredis", "pg", "express")
$missing = @()

foreach ($pkg in $required) {
    if (Test-Path "node_modules/$pkg") {
        Write-Host "   ✅ $pkg" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $pkg (missing)" -ForegroundColor Red
        $missing += $pkg
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Missing dependencies. Install with:" -ForegroundColor Yellow
    Write-Host "   npm install $($missing -join ' ')" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# 3. Start Context7 Server
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starting Context7 MCP Agentic Server..." -ForegroundColor Yellow
Write-Host ""

# Kill existing process on port 3007 (if any)
try {
    $existing = Get-NetTCPConnection -LocalPort 3007 -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
        $pid = $existing.OwningProcess
        Write-Host "   ⚠️  Port 3007 already in use (PID: $pid)" -ForegroundColor Yellow
        Write-Host "   Killing process..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
        Start-Sleep -Seconds 2
    }
} catch {
    # Port not in use - OK
}

# Start server in background
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node scripts/context7-mcp-agentic-server.mjs
}

Write-Host "   ✅ Server started (Job ID: $($job.Id))" -ForegroundColor Green
Write-Host ""

# Wait for startup
Write-Host "⏳ Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# ═══════════════════════════════════════════════════════════════════════════
# 4. Health Check
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "🏥 Running health check..." -ForegroundColor Yellow
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri "http://localhost:3007/health" -Method GET -TimeoutSec 10

    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ Workers: $($health.workers)" -ForegroundColor Green
    Write-Host "   ✅ Tools: $($health.tools)" -ForegroundColor Green
    Write-Host "   ✅ Queues: $($health.queues -join ', ')" -ForegroundColor Green

} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check logs with: Receive-Job $($job.Id)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# 5. Summary
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Context7 MCP Agentic Server is LIVE                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Endpoints:" -ForegroundColor Cyan
Write-Host "   http://localhost:3007/health" -ForegroundColor White
Write-Host "   http://localhost:3007/tools" -ForegroundColor White
Write-Host "   http://localhost:3007/tools/:toolName" -ForegroundColor White
Write-Host "   http://localhost:3007/jobs/:jobId" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Agentic Tools:" -ForegroundColor Cyan
Write-Host "   search_cache, generate_embedding, analyze_errors" -ForegroundColor White
Write-Host "   cluster_errors, query_database, search_qdrant" -ForegroundColor White
Write-Host ""

Write-Host "🧪 Test server:" -ForegroundColor Cyan
Write-Host "   node scripts/test-context7-agentic.mjs" -ForegroundColor White
Write-Host ""

Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   Receive-Job $($job.Id)" -ForegroundColor White
Write-Host ""

Write-Host "🛑 Stop server:" -ForegroundColor Cyan
Write-Host "   Stop-Job $($job.Id); Remove-Job $($job.Id)" -ForegroundColor White
Write-Host ""

Write-Host "🌐 RabbitMQ Management UI:" -ForegroundColor Cyan
Write-Host "   http://localhost:15672 (guest/guest)" -ForegroundColor White
Write-Host ""
