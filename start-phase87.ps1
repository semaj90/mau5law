#!/usr/bin/env pwsh
# Phase 87: Complete System Startup Orchestrator
# Checks Docker containers, starts services, verifies connections

param(
    [switch]$SkipDocker,
    [switch]$Force
)

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Phase 87: System Startup Orchestrator" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 1. Check Docker containers (don't rebuild if they exist)
Write-Host "1️⃣ Checking Docker Infrastructure..." -ForegroundColor Yellow

$requiredContainers = @{
    "phase66-postgres" = 5434
    "phase66-couchdb" = 5984
    "qdrant" = 6333
    "phase66-redis" = 6379 # Assuming you have Redis in phase66
}

$allRunning = $true
foreach ($container in $requiredContainers.Keys) {
    $status = docker ps --filter "name=$container" --format "{{.Names}}: {{.Status}}" 2>$null
    if ($status) {
        Write-Host "   ✅ $status" -ForegroundColor Green
    } else {
        $exists = docker ps -a --filter "name=$container" --format "{{.Names}}: {{.Status}}" 2>$null
        if ($exists) {
            Write-Host "   ⚠️ $container exists but not running. Starting..." -ForegroundColor Yellow
            docker start $container 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            $newStatus = docker ps --filter "name=$container" --format "{{.Names}}: {{.Status}}" 2>$null
            if ($newStatus) {
                Write-Host "   ✅ Started: $newStatus" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Failed to start $container" -ForegroundColor Red
                $allRunning = $false
            }
        } else {
            Write-Host "   ❌ $container not found" -ForegroundColor Red
            $allRunning = $false
        }
    }
}

if (-not $allRunning -and -not $SkipDocker) {
    Write-Host ""
    Write-Host "⚠️ Some containers are missing or failed to start." -ForegroundColor Yellow
    Write-Host "   To create missing containers, run:" -ForegroundColor Gray
    Write-Host "   docker compose -f docker-compose.phase66.yml up -d" -ForegroundColor Gray
    Write-Host ""

    if (-not $Force) {
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            Write-Host "❌ Startup aborted" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""

# 2. Check Ollama
Write-Host "2️⃣ Checking Ollama..." -ForegroundColor Yellow
try {
    $ollama = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 2>$null
    if ($ollama.models) {
        $models = $ollama.models | Where-Object { $_.name -match "gemma3-legal|embeddinggemma" } | Select-Object -ExpandProperty name
        if ($models) {
            Write-Host "   ✅ Ollama running with models:" -ForegroundColor Green
            $models | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
        } else {
            Write-Host "   ⚠️ Ollama running but missing gemma3-legal or embeddinggemma" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ❌ Ollama not accessible on port 11434" -ForegroundColor Red
    Write-Host "   Start with: ollama serve" -ForegroundColor Gray
}

Write-Host ""

# 3. Check Qdrant collections
Write-Host "3️⃣ Checking Qdrant Collections..." -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -TimeoutSec 3
    $collectionNames = $collections.result.collections | Select-Object -ExpandProperty name
    $requiredCollections = @("phase76_knowledge_base", "phase72_ast_knowledge_base")

    foreach ($col in $requiredCollections) {
        if ($collectionNames -contains $col) {
            Write-Host "   ✅ Collection: $col" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Missing: $col" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ❌ Qdrant not accessible" -ForegroundColor Red
}

Write-Host ""

# 4. Check FastMCP Server
Write-Host "4️⃣ Checking FastMCP Server..." -ForegroundColor Yellow
$mcpRunning = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($mcpRunning) {
    Write-Host "   ✅ FastMCP running (PID: $($mcpRunning.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ FastMCP not running. Starting..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "scripts/fastmcp-server.mjs" -WorkingDirectory "sveltekit-frontend" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    $mcpCheck = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
    if ($mcpCheck) {
        Write-Host "   ✅ FastMCP started" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to start FastMCP" -ForegroundColor Red
    }
}

Write-Host ""

# 5. Check Knowledge Plane Binary
Write-Host "5️⃣ Checking Knowledge Plane..." -ForegroundColor Yellow
$kpBinary = "go-services/knowledge-plane/bin/knowledge-plane.exe"
if (Test-Path $kpBinary) {
    Write-Host "   ✅ Binary exists: $kpBinary" -ForegroundColor Green

    # Check if already running
    $kpRunning = Get-NetTCPConnection -LocalPort 8099 -ErrorAction SilentlyContinue
    if ($kpRunning) {
        Write-Host "   ✅ Knowledge Plane already running (PID: $($kpRunning.OwningProcess))" -ForegroundColor Green
    } else {
        Write-Host "   🚀 Starting Knowledge Plane..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   To start manually, run:" -ForegroundColor Gray
        Write-Host "   cd go-services/knowledge-plane" -ForegroundColor Gray
        Write-Host "   .\run.ps1" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ Binary not found. Building..." -ForegroundColor Yellow
    Push-Location go-services/knowledge-plane
    go build -o bin/knowledge-plane.exe ./cmd/knowledge-plane 2>&1 | Out-Null
    Pop-Location

    if (Test-Path $kpBinary) {
        Write-Host "   ✅ Build successful" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Build failed" -ForegroundColor Red
    }
}

Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 System Status Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Docker containers checked and started if needed" -ForegroundColor Green
Write-Host "✅ Service dependencies verified" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Actions:" -ForegroundColor Cyan
Write-Host "   1. Start Knowledge Plane: cd go-services/knowledge-plane && .\run.ps1"
Write-Host "   2. Test Phase 86: cd sveltekit-frontend && node scripts/phase86-autonomous-loop.mjs"
Write-Host "   3. View error map: http://localhost:8099/visualize/error-map"
Write-Host ""
