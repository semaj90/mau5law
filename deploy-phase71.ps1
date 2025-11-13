#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 71 Complete AI Platform Deployment Script
.DESCRIPTION
    Orchestrates the deployment of the unified legal AI platform with:
    - TensorRT-LLM service for sub-ms inference
    - Ollama with gemma3-legal for legal reasoning
    - Go microservices with SIMD acceleration
    - PostgreSQL + pgvector for vector storage
    - Redis for caching and session management
    - SvelteKit frontend with real-time monitoring
.PARAMETER Action
    Action to perform: deploy, start, stop, restart, test, cleanup
.PARAMETER Services
    Comma-separated list of services to manage (default: all)
.PARAMETER Environment
    Environment: development, staging, production
.PARAMETER SkipTests
    Skip integration tests after deployment
.EXAMPLE
    .\deploy-phase71.ps1 -Action deploy
    .\deploy-phase71.ps1 -Action start -Services "ollama,tensorrt-llm-service"
    .\deploy-phase71.ps1 -Action test
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "start", "stop", "restart", "test", "cleanup", "status")]
    [string]$Action,

    [string]$Services = "all",

    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",

    [switch]$SkipTests,

    [switch]$Force
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Paths
$RootDir = Split-Path -Parent $PSScriptRoot
$DockerComposeFile = Join-Path $RootDir "docker-compose.phase71.yml"
$EnvFile = Join-Path $RootDir ".env.phase71.$Environment"

# Service definitions
$AllServices = @(
    "postgres",
    "redis",
    "minio",
    "qdrant",
    "ollama",
    "tensorrt-llm-service",
    "go-microservice",
    "python-services",
    "sveltekit-frontend",
    "nginx",
    "prometheus",
    "grafana"
)

# Functions
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

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Test-Docker {
    try {
        $null = docker --version
        return $true
    } catch {
        return $false
    }
}

function Test-DockerCompose {
    try {
        $null = docker-compose --version
        return $true
    } catch {
        try {
            $null = docker compose version
            return $true
        } catch {
            return $false
        }
    }
}

function Get-DockerComposeCommand {
    try {
        $null = docker compose version
        return "docker compose"
    } catch {
        return "docker-compose"
    }
}

function Wait-ForService {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$TimeoutSeconds = 300
    )

    Write-Step "Waiting for $ServiceName to be ready..."

    $startTime = Get-Date
    $timeout = $startTime.AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName is ready"
                return $true
            }
        } catch {
            # Service not ready yet
        }

        Start-Sleep -Seconds 5
    }

    Write-Error "$ServiceName failed to start within $TimeoutSeconds seconds"
    return $false
}

function Initialize-Environment {
    Write-Step "Initializing environment for $Environment"

    # Create .env file if it doesn't exist
    if (!(Test-Path $EnvFile)) {
        Write-Step "Creating environment file: $EnvFile"

        $envContent = @"
# Phase 71 Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Database
POSTGRES_PASSWORD=123456
POSTGRES_DB=legal_ai_db

# Redis
REDIS_PASSWORD=redis

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Grafana
GRAFANA_PASSWORD=admin

# Ollama
OLLAMA_GPU_LAYERS=25
OLLAMA_MAX_LOADED_MODELS=2

# CUDA
CUDA_VISIBLE_DEVICES=0
TORCH_USE_CUDA_DSA=1

# Service URLs
DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db
REDIS_URL=redis://:redis@localhost:6379
OLLAMA_URL=http://localhost:11434
TENSORRT_URL=http://localhost:8099
MINIO_ENDPOINT=localhost:9000
QDRANT_URL=http://localhost:6333
"@

        $envContent | Out-File -FilePath $EnvFile -Encoding UTF8
        Write-Success "Environment file created"
    }

    # Validate Docker and Docker Compose
    if (!(Test-Docker)) {
        throw "Docker is not installed or not running"
    }

    if (!(Test-DockerCompose)) {
        throw "Docker Compose is not installed"
    }

    Write-Success "Environment initialized"
}

function Start-Services {
    param([string[]]$ServiceList)

    $dockerCompose = Get-DockerComposeCommand

    Write-Step "Starting services: $($ServiceList -join ', ')"

    # Build and start services
    $buildArgs = @("--build", "-d") + $ServiceList
    & $dockerCompose -f $dockerComposeFile --env-file $EnvFile up @buildArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start services"
    }

    Write-Success "Services started successfully"
}

function Stop-Services {
    param([string[]]$ServiceList)

    $dockerCompose = Get-DockerComposeCommand

    Write-Step "Stopping services: $($ServiceList -join ', ')"

    $stopArgs = @("down") + $ServiceList
    & $dockerCompose -f $dockerComposeFile --env-file $EnvFile @stopArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Some services may not have stopped cleanly"
    } else {
        Write-Success "Services stopped successfully"
    }
}

function Wait-ForAllServices {
    Write-Step "Waiting for all services to be healthy..."

    $serviceChecks = @(
        @{ Name = "PostgreSQL"; Url = "http://localhost:5432" },
        @{ Name = "Redis"; Url = "http://localhost:6379" },
        @{ Name = "MinIO"; Url = "http://localhost:9000/minio/health/live" },
        @{ Name = "Qdrant"; Url = "http://localhost:6333/health" },
        @{ Name = "Ollama"; Url = "http://localhost:11434/api/tags" },
        @{ Name = "TensorRT-LLM"; Url = "http://localhost:8099/health" },
        @{ Name = "Go Microservice"; Url = "http://localhost:8097/health" },
        @{ Name = "Python Services"; Url = "http://localhost:8092/health" },
        @{ Name = "SvelteKit Frontend"; Url = "http://localhost:3000" },
        @{ Name = "Nginx"; Url = "http://localhost:80" },
        @{ Name = "Prometheus"; Url = "http://localhost:9090/-/healthy" },
        @{ Name = "Grafana"; Url = "http://localhost:3001/api/health" }
    )

    $failedServices = @()

    foreach ($check in $serviceChecks) {
        if (!(Wait-ForService -ServiceName $check.Name -Url $check.Url -TimeoutSeconds 180)) {
            $failedServices += $check.Name
        }
    }

    if ($failedServices.Count -gt 0) {
        Write-Error "The following services failed to start: $($failedServices -join ', ')"
        return $false
    }

    Write-Success "All services are healthy"
    return $true
}

function Run-IntegrationTests {
    Write-Step "Running integration tests..."

    # Test TensorRT-LLM service
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8099/health" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Success "TensorRT-LLM service health check passed"
        }
    } catch {
        Write-Error "TensorRT-LLM service health check failed"
        return $false
    }

    # Test legal analysis endpoint
    try {
        $testData = @{
            document_text = "This is a test contract for breach of agreement."
            analysis_type = "contract_review"
            max_tokens = 100
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "http://localhost:8099/analyze-legal" -Method POST -Body $testData -ContentType "application/json"
        if ($response.StatusCode -eq 200) {
            Write-Success "Legal analysis endpoint test passed"
        }
    } catch {
        Write-Error "Legal analysis endpoint test failed: $_"
        return $false
    }

    # Test Go microservice
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8097/health" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Success "Go microservice health check passed"
        }
    } catch {
        Write-Error "Go microservice health check failed"
        return $false
    }

    # Test frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend health check passed"
        }
    } catch {
        Write-Error "Frontend health check failed"
        return $false
    }

    Write-Success "All integration tests passed"
    return $true
}

function Get-ServiceStatus {
    $dockerCompose = Get-DockerComposeCommand

    Write-Step "Checking service status..."

    try {
        $result = & $dockerCompose -f $dockerComposeFile --env-file $EnvFile ps
        Write-Host $result
    } catch {
        Write-Error "Failed to get service status"
    }
}

function Cleanup-Environment {
    Write-Step "Cleaning up environment..."

    $dockerCompose = Get-DockerComposeCommand

    # Stop and remove all services
    & $dockerCompose -f $dockerComposeFile --env-file $EnvFile down --volumes --remove-orphans

    # Remove dangling images and volumes
    docker system prune -f
    docker volume prune -f

    Write-Success "Environment cleaned up"
}

# Main execution
try {
    Write-Host "🚀 Phase 71 Legal AI Platform Deployment" -ForegroundColor Magenta
    Write-Host "Environment: $Environment" -ForegroundColor Blue
    Write-Host "Action: $Action" -ForegroundColor Blue
    Write-Host ""

    # Parse services
    if ($Services -eq "all") {
        $targetServices = $AllServices
    } else {
        $targetServices = $Services -split ',' | ForEach-Object { $_.Trim() }
    }

    switch ($Action) {
        "deploy" {
            Initialize-Environment
            Start-Services -ServiceList $targetServices

            if (Wait-ForAllServices) {
                if (!$SkipTests) {
                    if (Run-IntegrationTests) {
                        Write-Success "Phase 71 deployment completed successfully!"
                        Write-Host ""
                        Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
                        Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
                        Write-Host "  Monitor:         http://localhost:3000/monitor" -ForegroundColor White
                        Write-Host "  TensorRT-LLM:    http://localhost:8099" -ForegroundColor White
                        Write-Host "  Go Services:     http://localhost:8097" -ForegroundColor White
                        Write-Host "  Python Services: http://localhost:8092" -ForegroundColor White
                        Write-Host "  Grafana:         http://localhost:3001 (admin/admin)" -ForegroundColor White
                        Write-Host "  MinIO:           http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
                    } else {
                        Write-Error "Integration tests failed"
                        exit 1
                    }
                }
            } else {
                Write-Error "Service startup failed"
                exit 1
            }
        }

        "start" {
            Start-Services -ServiceList $targetServices
        }

        "stop" {
            Stop-Services -ServiceList $targetServices
        }

        "restart" {
            Stop-Services -ServiceList $targetServices
            Start-Services -ServiceList $targetServices
        }

        "test" {
            if (Run-IntegrationTests) {
                Write-Success "All tests passed"
            } else {
                Write-Error "Some tests failed"
                exit 1
            }
        }

        "status" {
            Get-ServiceStatus
        }

        "cleanup" {
            if (!$Force) {
                $confirmation = Read-Host "This will remove all containers, volumes, and data. Are you sure? (y/N)"
                if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
                    Write-Host "Cleanup cancelled"
                    exit 0
                }
            }
            Cleanup-Environment
        }
    }

} catch {
    Write-Error "Deployment failed: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}

Write-Host ""
Write-Host "🎯 Phase 71 deployment script completed" -ForegroundColor Magenta