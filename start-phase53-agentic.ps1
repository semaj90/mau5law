#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Phase 53 Agentic Orchestrator
    Builds AST graph + invokes Gemma3-Legal fix loop + logs to Redis/Neo4j
.DESCRIPTION
    Automated pipeline: Phase52 errors → AST graph → Agentic fixes → Neo4j export
.PARAMETER DryRun
    Show what would be executed without running
.PARAMETER SkipGraph
    Skip AST graph building (use existing)
.PARAMETER SkipNeo4j
    Skip Neo4j export
.EXAMPLE
    .\start-phase53-agentic.ps1
.EXAMPLE
    .\start-phase53-agentic.ps1 -DryRun
#>

param(
    [switch]$DryRun,
    [switch]$SkipGraph,
    [switch]$SkipNeo4j
)

# Configuration
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $scriptDir "sveltekit-frontend"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"

function Write-Step {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Test-Service {
    param([string]$Name, [string]$Url)
    try {
        if ($Url -match "6379") {
            # Redis binary protocol check
            try {
                $pong = docker exec legal-ai-redis redis-cli ping 2>$null
                if ($pong -match "PONG") {
                    Write-Success "$Name reachable via redis-cli"
                    return $true
                } else {
                    Write-Warning "$Name did not reply PONG"
                }
            } catch {
                Write-Warning "$Name check failed: $($_.Exception.Message)"
            }
            return $false
        } elseif ($Url -match "11434") {
            # Ollama HTTP check
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$Name reachable"
                return $true
            }
        } elseif ($Url -match "7474") {
            # Neo4j HTTP check
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$Name reachable"
                return $true
            }
        } else {
            # Generic HTTP check
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$Name reachable"
                return $true
            }
        }
    } catch {
        Write-Warning "$Name not reachable: $($_.Exception.Message)"
    }
    return $false
}

function Invoke-Command {
    param([string]$Command, [string]$Description)
    if ($DryRun) {
        Write-Host "DRY RUN: $Description" -ForegroundColor $Yellow
        Write-Host "  Command: $Command" -ForegroundColor Gray
        return $true
    }

    Write-Step $Description
    try {
        Invoke-Expression $Command
        return $true
    } catch {
        Write-Error-Log "Failed: $($_.Exception.Message)"
        return $false
    }
}

# Main execution
Write-Host "🧠 Phase 53 Agentic Orchestrator" -ForegroundColor $Cyan
Write-Host "=================================" -ForegroundColor $Cyan

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No actual execution"
}

# 1. Service health checks
Write-Step "Checking service dependencies..."
$services = @(
    @{Name="Redis"; Url="http://localhost:6379"},
    @{Name="Ollama"; Url="http://localhost:11434/api/tags"}
)

$allHealthy = $true
foreach ($service in $services) {
    if (-not (Test-Service -Name $service.Name -Url $service.Url)) {
        $allHealthy = $false
    }
}

if (-not $allHealthy) {
    Write-Error-Log "Some services are not healthy. Please start required services first."
    exit 1
}

# 2. Run TSC Scan & Extract Errors
$success = Invoke-Command `
    -Command "cd $frontendDir; node scripts/phase52-ast-repair.mjs" `
    -Description "Running full TSC scan and extracting structured errors to Redis"
if (-not $success) { exit 1 }

# 3. Build AST Graph (unless skipped)
if (-not $SkipGraph) {
    $success = Invoke-Command `
        -Command "cd $frontendDir; node scripts/phase52-ast-graph.mjs" `
        -Description "Building AST import/export graph in Redis"
    if (-not $success) { exit 1 }
} else {
    Write-Warning "Skipping AST graph build (using existing)"
}

# 4. Run Phase 53 Agentic Fix Loop
$success = Invoke-Command `
    -Command "cd $frontendDir; node scripts/phase53-agentic-fix.mjs" `
    -Description "Running Gemma3-Legal agentic fix loop"
if (-not $success) { exit 1 }

# 5. Export to Neo4j (unless skipped)
if (-not $SkipNeo4j) {
    Write-Step "Exporting graph to Neo4j..."

    # Check if Neo4j is running
    if (Test-Service -Name "Neo4j" -Url "http://localhost:7474") {
        $cypherScript = @"
LOAD CSV WITH HEADERS FROM 'file:///phase52_graph.csv' AS row
MERGE (f:File {name: row.name})
FOREACH (imp IN split(row.imports,';') | MERGE (i:File {name: imp}) MERGE (f)-[:IMPORTS]->(i));
"@

        $success = Invoke-Command `
            -Command "docker exec legal-ai-neo4j cypher-shell -u neo4j -p neo4j '$cypherScript'" `
            -Description "Exporting AST graph to Neo4j for visualization"
    } else {
        Write-Warning "Neo4j not available, skipping graph export"
    }
} else {
    Write-Warning "Skipping Neo4j export"
}

# 5. Summary
Write-Success "Phase 53 Agentic Orchestrator completed"
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor $Cyan
Write-Host "  • AST Graph: Built in Redis" -ForegroundColor White
Write-Host "  • Agentic Fixes: Generated via Gemma3-Legal" -ForegroundColor White
Write-Host "  • Neo4j Export: Graph relationships loaded" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Check Redis keys:" -ForegroundColor $Yellow
Write-Host "  • phase52:graph:* (AST nodes)" -ForegroundColor White
Write-Host "  • phase53:suggestions:* (fix suggestions)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Neo4j Browser: http://localhost:7474" -ForegroundColor $Yellow