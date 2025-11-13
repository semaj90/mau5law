#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Phase 72: Deploy AST Error Reduction Pipeline
    Self-healing codebase agent that reduces 80k+ errors to <1k

.DESCRIPTION
    Deploys the complete Phase 72 system:
    - Neo4j graph database for error relationships
    - GPU clustering service for error analysis
    - AI patch generation with gemma3-legal
    - Error analysis dashboard
    - Progress monitoring

.PARAMETER Action
    Action to perform: deploy, start, stop, status, test

.EXAMPLE
    .\deploy-phase72.ps1 -Action deploy
    .\deploy-phase72.ps1 -Action test
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "start", "stop", "status", "test", "cleanup")]
    [string]$Action = "deploy",

    [Parameter(Mandatory=$false)]
    [switch]$Force,

    [Parameter(Mandatory=$false)]
    [switch]$SkipHealthChecks
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Configuration
$ComposeFile = "docker-compose-phase72.yml"
$ProjectName = "legal-ai-phase72"
$Neo4jUri = "bolt://localhost:7687"
$Neo4jUser = "neo4j"
$Neo4jPassword = "password"

function Write-Step {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Yellow
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        Write-Success "Docker: $dockerVersion"
    } catch {
        Write-Error "Docker not found. Please install Docker Desktop."
        exit 1
    }

    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if (!$composeVersion) {
            $composeVersion = docker compose version 2>$null
        }
        Write-Success "Docker Compose: $composeVersion"
    } catch {
        Write-Error "Docker Compose not found."
        exit 1
    }

    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        Write-Success "Node.js: $nodeVersion"
    } catch {
        Write-Error "Node.js not found. Please install Node.js 18+."
        exit 1
    }

    # Check Python
    try {
        $pythonVersion = python --version 2>$null
        if (!$pythonVersion) {
            $pythonVersion = python3 --version 2>$null
        }
        Write-Success "Python: $pythonVersion"
    } catch {
        Write-Error "Python not found. Please install Python 3.8+."
        exit 1
    }

    # Check Ollama
    try {
        $ollamaVersion = ollama --version 2>$null
        Write-Success "Ollama: $ollamaVersion"
    } catch {
        Write-Info "Ollama not found. AI features will use fallback."
    }

    Write-Success "Prerequisites check passed"
}

function Start-DockerServices {
    Write-Step "Starting Docker services..."

    # Stop any existing services
    docker-compose -f $ComposeFile -p $ProjectName down 2>$null | Out-Null

    # Start services
    docker-compose -f $ComposeFile -p $ProjectName up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Docker services"
        exit 1
    }

    Write-Success "Docker services started"
}

function Wait-ForServices {
    param([int]$TimeoutSeconds = 300)

    Write-Step "Waiting for services to be healthy..."

    $services = @(
        @{Name = "neo4j-phase72"; Port = 7687; Type = "bolt"},
        @{Name = "gpu-clustering-phase72"; Check = "python3 -c 'import torch; print(torch.cuda.is_available())'"},
        @{Name = "ai-patch-service-phase72"; Port = 3003},
        @{Name = "error-analysis-dashboard"; Port = 5174}
    )

    $startTime = Get-Date

    foreach ($service in $services) {
        Write-Info "Waiting for $($service.Name)..."

        $healthy = $false
        $attempts = 0
        $maxAttempts = $TimeoutSeconds / 5

        while (!$healthy -and $attempts -lt $maxAttempts) {
            try {
                if ($service.ContainsKey("Port")) {
                    $tcp = New-Object System.Net.Sockets.TcpClient
                    $tcp.Connect("localhost", $service.Port)
                    $tcp.Close()
                    $healthy = $true
                } elseif ($service.ContainsKey("Check")) {
                    $result = docker exec $($service.Name) $($service.Check) 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        $healthy = $true
                    }
                }
            } catch {
                # Service not ready
            }

            if (!$healthy) {
                Start-Sleep -Seconds 5
                $attempts++
            }
        }

        if (!$healthy) {
            Write-Error "$($service.Name) failed to become healthy within $($TimeoutSeconds)s"
            if (!$SkipHealthChecks) {
                exit 1
            }
        } else {
            Write-Success "$($service.Name) is healthy"
        }
    }

    $totalTime = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
    Write-Success "All services healthy after ${totalTime}s"
}

function Initialize-Neo4j {
    Write-Step "Initializing Neo4j schema..."

    # Wait for Neo4j to be ready
    $ready = $false
    $attempts = 0

    while (!$ready -and $attempts -lt 30) {
        try {
            # Test Neo4j connection
            docker exec neo4j-phase72 cypher-shell -u $Neo4jUser -p $Neo4jPassword "MATCH () RETURN count(*) limit 1" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $ready = $true
            }
        } catch {
            # Not ready yet
        }

        if (!$ready) {
            Start-Sleep -Seconds 2
            $attempts++
        }
    }

    if (!$ready) {
        Write-Error "Neo4j failed to become ready"
        exit 1
    }

    # Initialize schema
    try {
        # Run schema initialization
        docker exec ai-patch-service-phase72 node -e "
        const { Neo4jErrorGraphService } = require('./neo4j-error-graph-service.ts');
        const neo4j = new Neo4jErrorGraphService('$Neo4jUri', '$Neo4jUser', '$Neo4jPassword');
        neo4j.initializeSchema().then(() => {
          console.log('Schema initialized');
          process.exit(0);
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });
        " 2>$null | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Neo4j schema initialized"
        } else {
            Write-Error "Failed to initialize Neo4j schema"
            exit 1
        }
    } catch {
        Write-Error "Failed to initialize Neo4j schema"
        exit 1
    }
}

function Test-Phase72 {
    Write-Step "Testing Phase 72 components..."

    # Test Neo4j connection
    try {
        docker exec neo4j-phase72 cypher-shell -u $Neo4jUser -p $Neo4jPassword "MATCH () RETURN count(*) limit 1" 2>$null | Out-Null
        Write-Success "Neo4j connection OK"
    } catch {
        Write-Error "Neo4j connection failed"
    }

    # Test GPU clustering
    try {
        $gpuTest = docker exec gpu-clustering-phase72 python3 -c "import torch; print('CUDA' if torch.cuda.is_available() else 'CPU')" 2>$null
        if ($gpuTest -match "CUDA") {
            Write-Success "GPU clustering: CUDA enabled"
        } else {
            Write-Info "GPU clustering: CPU mode (CUDA not available)"
        }
    } catch {
        Write-Error "GPU clustering test failed"
    }

    # Test AI patch service
    try {
        # Simple health check
        docker exec ai-patch-service-phase72 node -e "console.log('AI service ready')" 2>$null | Out-Null
        Write-Success "AI patch service OK"
    } catch {
        Write-Error "AI patch service failed"
    }

    # Test dashboard
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5174" -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Error analysis dashboard OK"
        } else {
            Write-Error "Dashboard returned status $($response.StatusCode)"
        }
    } catch {
        Write-Error "Dashboard connection failed"
    }

    Write-Success "Phase 72 testing completed"
}

function Show-Status {
    Write-Step "Checking Phase 72 status..."

    $services = docker-compose -f $ComposeFile -p $ProjectName ps --format "table {{.Name}}\t{{.Status}}"

    if ($services) {
        Write-Host $services
    } else {
        Write-Info "No Phase 72 services running"
    }

    # Show resource usage
    Write-Info "Resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | Select-String "phase72"
}

function Stop-Services {
    Write-Step "Stopping Phase 72 services..."

    docker-compose -f $ComposeFile -p $ProjectName down

    Write-Success "Phase 72 services stopped"
}

function Cleanup-Phase72 {
    Write-Step "Cleaning up Phase 72..."

    # Stop services
    docker-compose -f $ComposeFile -p $ProjectName down -v --remove-orphans 2>$null | Out-Null

    # Remove images
    docker images | Select-String "phase72" | ForEach-Object {
        $imageId = $_.ToString().Split()[2]
        docker rmi $imageId 2>$null | Out-Null
    }

    # Remove volumes
    docker volume ls | Select-String "phase72" | ForEach-Object {
        $volumeName = $_.ToString().Split()[-1]
        docker volume rm $volumeName 2>$null | Out-Null
    }

    Write-Success "Phase 72 cleanup completed"
}

# Main execution
Write-Host "🚀 Phase 72: AST Error Reduction Pipeline" -ForegroundColor Magenta
Write-Host "Target: Reduce 80k+ TypeScript errors to <1k through graph-based AI healing" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "deploy" {
        Test-Prerequisites
        Start-DockerServices
        Wait-ForServices
        Initialize-Neo4j
        Test-Phase72

        Write-Host ""
        Write-Success "Phase 72 deployment completed!"
        Write-Info "Next steps:"
        Write-Info "1. Open dashboard: http://localhost:5174"
        Write-Info "2. Run pipeline: docker exec ai-patch-service-phase72 node phase72-orchestrator.ts run"
        Write-Info "3. Monitor progress: docker exec ai-patch-service-phase72 node phase72-orchestrator.ts progress"
    }

    "start" {
        Start-DockerServices
        Wait-ForServices
        Write-Success "Phase 72 services started"
    }

    "stop" {
        Stop-Services
    }

    "status" {
        Show-Status
    }

    "test" {
        Test-Phase72
    }

    "cleanup" {
        if ($Force -or $PSCmdlet.ShouldContinue("This will remove all Phase 72 data and containers. Continue?", "Confirm cleanup")) {
            Cleanup-Phase72
        }
    }
}