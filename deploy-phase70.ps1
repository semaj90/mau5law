#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 70 AI Stack Deployment Script
    Builds and tests the complete Phase 70 AI platform without heavy downloads

.DESCRIPTION
    This script orchestrates the deployment of the Phase 70 AI stack including:
    - TensorRT-LLM service with agentic fallback
    - PyTorch fallback service (4-bit quantized)
    - OCR service with Tesseract
    - Language extraction service (tree-sitter)
    - Web crawl service
    - RAG ingest service with ChromaDB
    - Engine builder and QLoRA training pipeline

.PARAMETER Action
    Action to perform: build, test, deploy, or all

.PARAMETER SkipTests
    Skip health checks and integration tests

.EXAMPLE
    .\deploy-phase70.ps1 -Action build
    .\deploy-phase70.ps1 -Action test
    .\deploy-phase70.ps1 -Action all
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("build", "test", "deploy", "all")]
    [string]$Action = "all",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$Magenta = "Magenta"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
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
        return $false
    }
}

function Test-NvidiaDocker {
    try {
        $result = docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi --query-gpu=name --format=csv,noheader,nounits -i 0
        return $true
    } catch {
        return $false
    }
}

function Build-Phase70Services {
    Write-ColorOutput "🔨 Building Phase 70 AI Services..." $Cyan

    # Build TensorRT-LLM service
    Write-ColorOutput "Building TensorRT-LLM service..." $Yellow
    docker build -f Dockerfile.trtllm -t legal-ai-tensorrt-llm:latest .

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Failed to build TensorRT-LLM service" $Red
        exit 1
    }

    Write-ColorOutput "✅ TensorRT-LLM service built successfully" $Green
}

function Test-Phase70Services {
    if ($SkipTests) {
        Write-ColorOutput "⏭️  Skipping tests as requested" $Yellow
        return
    }

    Write-ColorOutput "🧪 Testing Phase 70 Services..." $Cyan

    # Test basic container functionality
    Write-ColorOutput "Testing TensorRT-LLM container..." $Yellow
    try {
        $result = docker run --rm legal-ai-tensorrt-llm:latest python3 -c "import tensorrt_llm; print('TensorRT-LLM OK')"
        Write-ColorOutput "✅ TensorRT-LLM container test passed" $Green
    } catch {
        Write-ColorOutput "❌ TensorRT-LLM container test failed" $Red
        exit 1
    }

    # Test Python services
    $services = @(
        @{Name="pytorch_fallback_service"; Port="8100"},
        @{Name="ocr_tesseract"; Port="8101"},
        @{Name="lang_extract"; Port="8102"},
        @{Name="web_crawl"; Port="8103"},
        @{Name="rag_ingest"; Port="8104"}
    )

    foreach ($service in $services) {
        Write-ColorOutput "Testing $($service.Name)..." $Yellow
        try {
            $result = docker run --rm legal-ai-tensorrt-llm:latest python3 -c "import sys; sys.path.append('python-services'); import $($service.Name); print('$($service.Name) import OK')"
            Write-ColorOutput "✅ $($service.Name) import test passed" $Green
        } catch {
            Write-ColorOutput "❌ $($service.Name) import test failed" $Red
            exit 1
        }
    }

    Write-ColorOutput "✅ All Phase 70 service tests passed" $Green
}

function Deploy-Phase70Stack {
    Write-ColorOutput "🚀 Deploying Phase 70 AI Stack..." $Cyan

    # Start only Phase 70 services
    Write-ColorOutput "Starting Phase 70 services..." $Yellow
    docker-compose up -d tensorrt-llm-service pytorch-fallback-service ocr-service lang-extract-service web-crawl-service rag-ingest-service

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Failed to start Phase 70 services" $Red
        exit 1
    }

    Write-ColorOutput "✅ Phase 70 services started successfully" $Green

    # Wait for services to be healthy
    Write-ColorOutput "Waiting for services to be healthy..." $Yellow
    Start-Sleep -Seconds 30

    # Check service health
    $services = @(
        @{Name="tensorrt-llm-service"; Port="8099"},
        @{Name="pytorch-fallback-service"; Port="8100"},
        @{Name="ocr-service"; Port="8101"},
        @{Name="lang-extract-service"; Port="8102"},
        @{Name="web-crawl-service"; Port="8103"},
        @{Name="rag-ingest-service"; Port="8104"}
    )

    foreach ($service in $services) {
        Write-ColorOutput "Checking $($service.Name) health..." $Yellow
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)/health" -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "✅ $($service.Name) is healthy" $Green
            } else {
                Write-ColorOutput "❌ $($service.Name) health check failed" $Red
            }
        } catch {
            Write-ColorOutput "❌ $($service.Name) health check failed: $($_.Exception.Message)" $Red
        }
    }
}

function Show-Usage {
    Write-ColorOutput @"
Phase 70 AI Stack Deployment Script

Usage:
    .\deploy-phase70.ps1 -Action <action> [-SkipTests]

Actions:
    build   - Build the Phase 70 services
    test    - Test the Phase 70 services
    deploy  - Deploy the Phase 70 services
    all     - Build, test, and deploy (default)

Parameters:
    -SkipTests    Skip health checks and integration tests

Examples:
    .\deploy-phase70.ps1 -Action build
    .\deploy-phase70.ps1 -Action test
    .\deploy-phase70.ps1 -Action all -SkipTests

Services Deployed:
    - TensorRT-LLM Service (port 8099) - GPU-accelerated inference
    - PyTorch Fallback Service (port 8100) - 4-bit quantized fallback
    - OCR Service (port 8101) - Tesseract-based document OCR
    - Language Extraction Service (port 8102) - Tree-sitter code analysis
    - Web Crawl Service (port 8103) - URL content extraction
    - RAG Ingest Service (port 8104) - Document chunking and embedding

"@ $Cyan
}

# Main execution
Write-ColorOutput "🚀 Phase 70 AI Stack Deployment" $Magenta
Write-ColorOutput "=================================" $Magenta

# Pre-flight checks
Write-ColorOutput "🔍 Running pre-flight checks..." $Cyan

if (-not (Test-Docker)) {
    Write-ColorOutput "❌ Docker is not installed or not running" $Red
    exit 1
}
Write-ColorOutput "✅ Docker is available" $Green

if (-not (Test-DockerCompose)) {
    Write-ColorOutput "❌ Docker Compose is not installed" $Red
    exit 1
}
Write-ColorOutput "✅ Docker Compose is available" $Green

if (-not (Test-NvidiaDocker)) {
    Write-ColorOutput "⚠️  NVIDIA Docker runtime not detected - GPU services may not work" $Yellow
} else {
    Write-ColorOutput "✅ NVIDIA Docker runtime is available" $Green
}

# Execute requested action
switch ($Action) {
    "build" {
        Build-Phase70Services
    }
    "test" {
        Test-Phase70Services
    }
    "deploy" {
        Deploy-Phase70Stack
    }
    "all" {
        Build-Phase70Services
        Test-Phase70Services
        Deploy-Phase70Stack
    }
    default {
        Show-Usage
        exit 1
    }
}

Write-ColorOutput "🎉 Phase 70 deployment completed successfully!" $Green
Write-ColorOutput "" $White
Write-ColorOutput "Service Endpoints:" $Cyan
Write-ColorOutput "  TensorRT-LLM:     http://localhost:8099" $White
Write-ColorOutput "  PyTorch Fallback: http://localhost:8100" $White
Write-ColorOutput "  OCR Service:      http://localhost:8101" $White
Write-ColorOutput "  Lang Extract:     http://localhost:8102" $White
Write-ColorOutput "  Web Crawl:       http://localhost:8103" $White
Write-ColorOutput "  RAG Ingest:       http://localhost:8104" $White
Write-ColorOutput "" $White
Write-ColorOutput "Next Steps:" $Yellow
Write-ColorOutput "  1. Build TensorRT engines: docker exec legal-ai-tensorrt-llm-service python3 engine-builder/build_engine.py" $White
Write-ColorOutput "  2. Generate training data: docker exec legal-ai-tensorrt-llm-service python3 training/dataset_builder.py" $White
Write-ColorOutput "  3. Train QLoRA model: docker exec legal-ai-tensorrt-llm-service python3 training/train_qlora.py" $White