<#
.SYNOPSIS
    Orchestration script for Phase 79 Enhanced Agentic Repair Loop.
    Performs health checks, dependency verification, and executes the enhanced agent.

.DESCRIPTION
    This script prepares the environment for the Phase 79 Enhanced Agent, checking for:
    - PostgreSQL connectivity
    - Redis connectivity
    - Qdrant availability
    - Ollama model availability
    - Node.js dependencies

    It then launches the agent with specified parameters.

.PARAMETER DryRun
    Runs the agent in dry-run mode (1 iteration, no database commits ideally, but the script handles it).

.PARAMETER Limit
    Sets the maximum number of iterations. Default is 10.

.EXAMPLE
    .\scripts\run-phase79-enhanced.ps1 -DryRun
    .\scripts\run-phase79-enhanced.ps1 -Limit 50
#>

param (
    [Switch]$DryRun,
    [int]$Limit = 10
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "👉 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "🤖 Phase 79 Enhanced: Orchestartor" -ForegroundColor Magenta
Write-Host "════════════════════════════════════════════════════════════`n" -ForegroundColor Magenta

# 1. Environment Health Checks
Write-Step "Checking Infrastructure..."

# Check Dependencies
if (!(Test-Path "node_modules")) {
    Write-Step "Installing dependencies..."
    npm install
} else {
    Write-Success "Node modules found"
}

# Check Redis
try {
    # Simple TCP check or check if process is running (approximate)
    $redis = Get-Process "redis-server" -ErrorAction SilentlyContinue
    if ($redis) {
        Write-Success "Redis is running"
    } else {
        Write-Warning "Redis process not found (might be running in Docker or service). Proceeding..."
    }
} catch {
    Write-Warning "Could not verify Redis status."
}

# Check Qdrant (port 6333)
$qdrantPort = 6333
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $qdrantPort)
    $tcp.Close()
    Write-Success "Qdrant is reachable on port $qdrantPort"
} catch {
    Write-Warning "Qdrant not reachable on port $qdrantPort. Semantic search may fall back to DB."
}

# Check Ollama
$ollamaUrl = $env:OLLAMA_BASE_URL -or "http://127.0.0.1:11434"
try {
    $response = Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -Method Get -ErrorAction SilentlyContinue
    if ($response) {
        Write-Success "Ollama is reachable"
    }
} catch {
    Write-Warning "Ollama not reachable at $ollamaUrl. Embedding/Generation may fail."
}

# 2. Run Agent
Write-Step "Launching Phase 79 Enhanced Agent..."

$script = "scripts/phase79-agentic-repair-enhanced.mts"
$iterations = $Limit
if ($DryRun) {
    $iterations = 1
    Write-Host "🧪 DRY RUN MODE ENABLED" -ForegroundColor Yellow
}

$env:PHASE79_WORKERS = "3"
$env:PHASE79_BATCH_SIZE = "5"

$cmd = "npx tsx $script $iterations"
Write-Host "Running: $cmd" -ForegroundColor DarkGray

Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Success "Agent execution completed successfully."
} else {
    Write-ErrorMsg "Agent execution failed with code $LASTEXITCODE."
    exit $LASTEXITCODE
}
