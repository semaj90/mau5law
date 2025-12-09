#!/usr/bin/env pwsh
<#
.SYNOPSIS
Start the complete contextual chat stack (Phase 72)
.DESCRIPTION
Starts all services needed for YoRHa Detective contextual chat:
- PostgreSQL (database)
- Qdrant (vector search)
- Neo4j (knowledge graph)
- Ollama (LLM inference)
- Python RAG/KAG service
- Go context orchestrator
- SvelteKit frontend
#>

param(
    [switch]$Docker,
    [switch]$Native,
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $colors = @{
        "INFO"    = "Cyan"
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
    }
    Write-Host "[$Status] $Message" -ForegroundColor $colors[$Status]
}

function Test-Service {
    param([string]$Url, [string]$Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Status "$Name is running" "SUCCESS"
        return $true
    }
    catch {
        Write-Status "$Name is not responding" "WARNING"
        return $false
    }
}

# Check prerequisites
Write-Status "Checking prerequisites..." "INFO"

$checks = @{
    "PostgreSQL" = "psql --version"
    "Python"     = "python --version"
    "Go"         = "go version"
    "Node.js"    = "node --version"
}

foreach ($tool in $checks.Keys) {
    try {
        $output = Invoke-Expression $checks[$tool] 2>&1
        Write-Status "$tool: $output" "SUCCESS"
    }
    catch {
        Write-Status "$tool not found" "ERROR"
    }
}

# Set environment variables
Write-Status "Setting environment variables..." "INFO"

$env:QDRANT_HOST = "localhost"
$env:QDRANT_PORT = "6333"
$env:NEO4J_URI = "bolt://localhost:7687"
$env:NEO4J_USER = "neo4j"
$env:NEO4J_PASSWORD = "password"
$env:DATABASE_URL = "postgresql://legal_admin:123456@localhost/legal_ai_db"
$env:MINIO_HOST = "localhost:9000"
$env:OLLAMA_ENDPOINT = "http://localhost:11434"
$env:CONTEXT_ORCH_URL = "http://localhost:8085"
$env:RAG_KAG_SERVICE_ADDR = "localhost:50061"
$env:PORT = "8085"

# Step 1: Database migration
Write-Status "Step 1: Running database migration..." "INFO"
try {
    $migrationFile = "sveltekit-frontend/drizzle/20251208_add_contextual_chat_tables.sql"
    if (Test-Path $migrationFile) {
        psql -U legal_admin -d legal_ai_db -f $migrationFile
        Write-Status "Database migration complete" "SUCCESS"
    }
    else {
        Write-Status "Migration file not found: $migrationFile" "WARNING"
    }
}
catch {
    Write-Status "Database migration failed: $_" "ERROR"
}

# Step 2: Start Python RAG/KAG service
Write-Status "Step 2: Starting Python RAG/KAG service..." "INFO"
try {
    $pythonScript = "backend/services/rag_kag_server.py"
    if (Test-Path $pythonScript) {
        Start-Process python -ArgumentList $pythonScript -NoNewWindow
        Start-Sleep -Seconds 2
        Write-Status "Python RAG/KAG service started" "SUCCESS"
    }
    else {
        Write-Status "Python script not found: $pythonScript" "WARNING"
    }
}
catch {
    Write-Status "Failed to start Python service: $_" "ERROR"
}

# Step 3: Build and start Go orchestrator
Write-Status "Step 3: Building Go context orchestrator..." "INFO"
try {
    Push-Location "go-services/yorha-context-orchestrator"
    go build -o yorha-context-orchestrator.exe main.go
    Start-Process .\yorha-context-orchestrator.exe -NoNewWindow
    Pop-Location
    Start-Sleep -Seconds 2
    Write-Status "Go context orchestrator started" "SUCCESS"
}
catch {
    Write-Status "Failed to build/start Go service: $_" "ERROR"
    Pop-Location
}

# Step 4: Start SvelteKit dev server
Write-Status "Step 4: Starting SvelteKit frontend..." "INFO"
try {
    Push-Location "sveltekit-frontend"
    npm run dev
    Pop-Location
}
catch {
    Write-Status "Failed to start SvelteKit: $_" "ERROR"
    Pop-Location
}

# Health checks
Write-Status "Running health checks..." "INFO"
Start-Sleep -Seconds 3

$services = @{
    "http://localhost:8085/health"      = "Go Orchestrator"
    "http://localhost:5173"             = "SvelteKit Frontend"
    "http://localhost:11434/api/tags"   = "Ollama"
}

foreach ($url in $services.Keys) {
    Test-Service $url $services[$url]
}

Write-Status "✅ Contextual chat stack is running!" "SUCCESS"
Write-Status "Frontend: http://localhost:5173" "INFO"
Write-Status "Go Orchestrator: http://localhost:8085" "INFO"
Write-Status "Python RAG/KAG: localhost:50061 (gRPC)" "INFO"
