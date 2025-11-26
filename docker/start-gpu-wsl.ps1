# Legal AI Evidence Processing System - GPU Docker Run Startup
# WSL Linux Build and Run Script (PowerShell)
# Usage: .\docker\start-gpu-wsl.ps1 [action]
# Actions: build, run, stop, logs, shell, clean

param(
    [string]$Action = "help"
)

# Configuration
$ImageName = "legal-ai-gpu"
$ImageTag = "latest"
$ContainerName = "legal-ai-gpu-container"
$Dockerfile = "docker/Dockerfile.cuda"
$Context = "."

# Colors
$Colors = @{
    Red    = "`e[0;31m"
    Green  = "`e[0;32m"
    Yellow = "`e[1;33m"
    Blue   = "`e[0;34m"
    Reset  = "`e[0m"
}

# Functions
function Print-Header {
    param([string]$Message)
    Write-Host "$($Colors.Blue)========================================$($Colors.Reset)"
    Write-Host "$($Colors.Blue)$Message$($Colors.Reset)"
    Write-Host "$($Colors.Blue)========================================$($Colors.Reset)"
}

function Print-Success {
    param([string]$Message)
    Write-Host "$($Colors.Green)✅ $Message$($Colors.Reset)"
}

function Print-Error {
    param([string]$Message)
    Write-Host "$($Colors.Red)❌ $Message$($Colors.Reset)"
}

function Print-Warning {
    param([string]$Message)
    Write-Host "$($Colors.Yellow)⚠️  $Message$($Colors.Reset)"
}

function Print-Info {
    param([string]$Message)
    Write-Host "$($Colors.Blue)ℹ️  $Message$($Colors.Reset)"
}

# Check prerequisites
function Check-Prerequisites {
    Print-Header "Checking Prerequisites"

    # Check Docker
    try {
        $dockerVersion = docker --version
        Print-Success "Docker found: $dockerVersion"
    }
    catch {
        Print-Error "Docker not found. Please install Docker."
        exit 1
    }

    # Check Dockerfile
    if (-not (Test-Path $Dockerfile)) {
        Print-Error "Dockerfile not found at $Dockerfile"
        exit 1
    }
    Print-Success "Dockerfile found"

    # Check requirements.txt
    if (-not (Test-Path "requirements.txt")) {
        Print-Warning "requirements.txt not found - build may fail"
    }
    else {
        Print-Success "requirements.txt found"
    }
}

# Build Docker image
function Build-Image {
    Print-Header "Building Docker Image"

    Print-Info "Building $ImageName`:$ImageTag from $Dockerfile"
    Print-Info "Context: $Context"

    docker build `
        -f $Dockerfile `
        -t "$ImageName`:$ImageTag" `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        $Context

    if ($LASTEXITCODE -eq 0) {
        Print-Success "Docker image built successfully"
        docker images | Select-String $ImageName
    }
    else {
        Print-Error "Docker build failed"
        exit 1
    }
}

# Run Docker container
function Run-Container {
    Print-Header "Starting Docker Container"

    # Check if container already running
    $running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"
    if ($running) {
        Print-Warning "Container $ContainerName already running"
        Print-Info "Use '.\docker\start-gpu-wsl.ps1 stop' to stop it first"
        return
    }

    # Check if container exists but stopped
    $exists = docker ps -a --format '{{.Names}}' | Select-String "^$ContainerName$"
    if ($exists) {
        Print-Info "Removing stopped container $ContainerName"
        docker rm $ContainerName
    }

    Print-Info "Starting container with GPU support..."

    $workingDir = Get-Location

    docker run `
        --name $ContainerName `
        --gpus all `
        -d `
        -p 8000:8000 `
        -p 5432:5432 `
        -p 6379:6379 `
        -p 6333:6333 `
        -p 9000:9000 `
        -p 5672:5672 `
        -p 7687:7687 `
        -e CUDA_VISIBLE_DEVICES=0 `
        -e PYTHONUNBUFFERED=1 `
        -e LOG_LEVEL=INFO `
        -v "$workingDir/backend:/app/backend" `
        -v "$workingDir/sveltekit-frontend:/app/frontend" `
        -v legal-ai-cuda-cache:/app/.cuda_cache `
        "$ImageName`:$ImageTag"

    if ($LASTEXITCODE -eq 0) {
        Print-Success "Container started successfully"
        $containerId = docker ps --filter "name=$ContainerName" --format '{{.ID}}'
        Print-Info "Container name: $ContainerName"
        Print-Info "Container ID: $containerId"

        # Wait for container to be ready
        Print-Info "Waiting for container to be ready..."
        Start-Sleep -Seconds 5

        # Check if container is still running
        $running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"
        if ($running) {
            Print-Success "Container is running"
            Print-Info "API available at: http://localhost:8000"
            Print-Info "View logs: .\docker\start-gpu-wsl.ps1 logs"
        }
        else {
            Print-Error "Container stopped unexpectedly"
            Print-Info "Check logs: docker logs $ContainerName"
            exit 1
        }
    }
    else {
        Print-Error "Failed to start container"
        exit 1
    }
}

# Stop container
function Stop-Container {
    Print-Header "Stopping Docker Container"

    $running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"
    if (-not $running) {
        Print-Warning "Container $ContainerName is not running"
        return
    }

    Print-Info "Stopping container $ContainerName..."
    docker stop $ContainerName

    if ($LASTEXITCODE -eq 0) {
        Print-Success "Container stopped successfully"
    }
    else {
        Print-Error "Failed to stop container"
        exit 1
    }
}

# View logs
function View-Logs {
    Print-Header "Container Logs"

    $exists = docker ps -a --format '{{.Names}}' | Select-String "^$ContainerName$"
    if (-not $exists) {
        Print-Error "Container $ContainerName does not exist"
        exit 1
    }

    docker logs -f $ContainerName
}

# Open shell in container
function Open-Shell {
    Print-Header "Opening Shell in Container"

    $running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"
    if (-not $running) {
        Print-Error "Container $ContainerName is not running"
        exit 1
    }

    Print-Info "Opening bash shell in $ContainerName..."
    docker exec -it $ContainerName bash
}

# Clean up
function Clean-Up {
    Print-Header "Cleaning Up"

    # Stop container
    $running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"
    if ($running) {
        Print-Info "Stopping container..."
        docker stop $ContainerName
    }

    # Remove container
    $exists = docker ps -a --format '{{.Names}}' | Select-String "^$ContainerName$"
    if ($exists) {
        Print-Info "Removing container..."
        docker rm $ContainerName
    }

    # Remove image
    $imageExists = docker images --format '{{.Repository}}:{{.Tag}}' | Select-String "^$ImageName`:$ImageTag$"
    if ($imageExists) {
        Print-Info "Removing image..."
        docker rmi "$ImageName`:$ImageTag"
    }

    # Remove volume
    $volumeExists = docker volume ls --format '{{.Name}}' | Select-String "^legal-ai-cuda-cache$"
    if ($volumeExists) {
        Print-Info "Removing volume..."
        docker volume rm legal-ai-cuda-cache
    }

    Print-Success "Cleanup completed"
}

# Status
function Show-Status {
    Print-Header "System Status"

    Print-Info "Docker version:"
    docker --version

    Print-Info "Image status:"
    $imageExists = docker images --format '{{.Repository}}:{{.Tag}}' | Select-String "^$ImageName`:$ImageTag$"
    if ($imageExists) {
        docker images | Select-String $ImageName
    }
    else {
        Print-Warning "Image not found"
    }

    Print-Info "Container status:"
    $containerExists = docker ps -a --format '{{.Names}}' | Select-String "^$ContainerName$"
    if ($containerExists) {
        docker ps -a | Select-String $ContainerName
    }
    else {
        Print-Warning "Container not found"
    }

    Print-Info "Volumes:"
    $volumes = docker volume ls | Select-String "legal-ai"
    if ($volumes) {
        $volumes
    }
    else {
        Print-Warning "No volumes found"
    }
}

# Help
function Show-Help {
    $help = @"
$($Colors.Blue)Legal AI GPU Docker Run Startup$($Colors.Reset)

$($Colors.Yellow)Usage:$($Colors.Reset)
    .\docker\start-gpu-wsl.ps1 [action]

$($Colors.Yellow)Actions:$($Colors.Reset)
    build       - Build Docker image
    run         - Run Docker container
    stop        - Stop Docker container
    logs        - View container logs
    shell       - Open shell in container
    status      - Show system status
    clean       - Clean up (stop, remove container, image, volume)
    help        - Show this help message

$($Colors.Yellow)Examples:$($Colors.Reset)
    .\docker\start-gpu-wsl.ps1 build       # Build image
    .\docker\start-gpu-wsl.ps1 run         # Start container
    .\docker\start-gpu-wsl.ps1 logs        # View logs
    .\docker\start-gpu-wsl.ps1 shell       # Open shell
    .\docker\start-gpu-wsl.ps1 stop        # Stop container
    .\docker\start-gpu-wsl.ps1 clean       # Clean everything

$($Colors.Yellow)Ports:$($Colors.Reset)
    8000  - FastAPI server
    5432  - PostgreSQL
    6379  - Redis
    6333  - Qdrant
    9000  - MinIO
    5672  - RabbitMQ
    7687  - Neo4j

$($Colors.Yellow)Volumes:$($Colors.Reset)
    legal-ai-cuda-cache - CUDA cache

$($Colors.Yellow)Environment:$($Colors.Reset)
    CUDA_VISIBLE_DEVICES=0
    PYTHONUNBUFFERED=1
    LOG_LEVEL=INFO

$($Colors.Yellow)Notes:$($Colors.Reset)
    - Requires Docker with NVIDIA GPU support
    - WSL 2 with GPU passthrough recommended
    - Build happens in WSL Linux environment
    - Existing compose and build files are not modified

"@
    Write-Host $help
}

# Main
switch ($Action.ToLower()) {
    "build" {
        Check-Prerequisites
        Build-Image
    }
    "run" {
        Check-Prerequisites
        $imageExists = docker images --format '{{.Repository}}:{{.Tag}}' | Select-String "^$ImageName`:$ImageTag$"
        if (-not $imageExists) {
            Print-Warning "Image not found, building first..."
            Build-Image
        }
        Run-Container
    }
    "stop" {
        Stop-Container
    }
    "logs" {
        View-Logs
    }
    "shell" {
        Open-Shell
    }
    "status" {
        Show-Status
    }
    "clean" {
        Clean-Up
    }
    "help" {
        Show-Help
    }
    default {
        Print-Error "Unknown action: $Action"
        Show-Help
        exit 1
    }
}
