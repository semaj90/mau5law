# Phase 66 Quick Start Script
# Unified MCP Server Stack with ESM + TSX + SIMD + Redis + pgvector + TensorRT-LLM

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Health,
    [switch]$Logs,
    [switch]$Clean,
    [string]$Service = "all"
)

$COMPOSE_FILE = "docker-compose.phase66.yml"
$PROJECT_NAME = "phase66"

function Write-Header {
    Write-Host "🚀 Phase 66 - Unified MCP Server Stack" -ForegroundColor Cyan
    Write-Host "ESM + TSX + SIMD + Redis + pgvector + TensorRT-LLM" -ForegroundColor Yellow
    Write-Host ("=" * 60) -ForegroundColor Magenta
}

function Start-Stack {
    Write-Host "Starting Phase 66 AI Stack..." -ForegroundColor Green

    if ($Service -eq "all") {
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
    } else {
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d $Service
    }

    Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    Test-Health
}

function Stop-Stack {
    Write-Host "Stopping Phase 66 AI Stack..." -ForegroundColor Red
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
}

function Restart-Stack {
    Write-Host "Restarting Phase 66 AI Stack..." -ForegroundColor Yellow
    Stop-Stack
    Start-Sleep -Seconds 5
    Start-Stack
}

function Test-Health {
    Write-Host "`n🔍 Health Check Results:" -ForegroundColor Cyan
    Write-Host ("-" * 30) -ForegroundColor Yellow

    # MCP Server
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/mcp/health" -Method GET -TimeoutSec 5
        Write-Host "✅ MCP Server (3003): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ MCP Server (3003): DOWN" -ForegroundColor Red
    }

    # TensorRT-LLM
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8098/health" -Method GET -TimeoutSec 5
        Write-Host "✅ TensorRT-LLM (8096/8098): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ TensorRT-LLM (8096/8098): DOWN" -ForegroundColor Red
    }

    # PostgreSQL
    try {
        $result = docker exec phase66-postgres pg_isready -U legal_admin -d legal_ai_db 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL (5432): OK" -ForegroundColor Green
        } else {
            Write-Host "❌ PostgreSQL (5432): DOWN" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ PostgreSQL (5432): DOWN" -ForegroundColor Red
    }

    # Redis
    try {
        $result = docker exec phase66-redis redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Write-Host "✅ Redis (6379): OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis (6379): DOWN" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Redis (6379): DOWN" -ForegroundColor Red
    }

    # Qdrant
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:6333/collections" -Method GET -TimeoutSec 5
        Write-Host "✅ Qdrant (6333): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ Qdrant (6333): DOWN" -ForegroundColor Red
    }

    # MinIO
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -Method GET -TimeoutSec 5
        Write-Host "✅ MinIO (9000): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ MinIO (9000): DOWN" -ForegroundColor Red
    }

    Write-Host ("-" * 30) -ForegroundColor Yellow
}

function Show-Logs {
    if ($Service -eq "all") {
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    } else {
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f $Service
    }
}

function Clear-Stack {
    Write-Host "Cleaning Phase 66 AI Stack (removing volumes)..." -ForegroundColor Red
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v
    docker system prune -f
}

# Main execution
Write-Header

if ($Start) {
    Start-Stack
} elseif ($Stop) {
    Stop-Stack
} elseif ($Restart) {
    Restart-Stack
} elseif ($Health) {
    Test-Health
} elseif ($Logs) {
    Show-Logs
} elseif ($Clean) {
    Clear-Stack
} else {
    Write-Host "Usage: .\start-phase66.ps1 [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Start     Start the Phase 66 stack"
    Write-Host "  -Stop      Stop the Phase 66 stack"
    Write-Host "  -Restart   Restart the Phase 66 stack"
    Write-Host "  -Health    Check health of all services"
    Write-Host "  -Logs      Show logs for services"
    Write-Host "  -Clean     Stop and remove all data volumes"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Cyan
    Write-Host "  -Service   Specific service name (default: all)"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\start-phase66.ps1 -Start"
    Write-Host "  .\start-phase66.ps1 -Health"
    Write-Host "  .\start-phase66.ps1 -Logs -Service mcp-server"
    Write-Host "  .\start-phase66.ps1 -Start -Service redis"
}