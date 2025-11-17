# Phase AST: QLoRA Training Pipeline Orchestrator
# This script coordinates the complete QLoRA training workflow

param(
    [Parameter(Mandatory=$false)]
    [string]$Mode = "full",

    [Parameter(Mandatory=$false)]
    [string]$DatasetPath = "datasets/legal_corpus.json",

    [Parameter(Mandatory=$false)]
    [string]$ModelName = "google/gemma-3-4b-it",

    [Parameter(Mandatory=$false)]
    [int]$MaxEpochs = 3,

    [Parameter(Mandatory=$false)]
    [int]$BatchSize = 4,

    [Parameter(Mandatory=$false)]
    [switch]$SkipIngestion,

    [Parameter(Mandatory=$false)]
    [switch]$SkipTraining,

    [Parameter(Mandatory=$false)]
    [switch]$SkipInference,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Service endpoints
$TrainerGrpcUrl = "localhost:8098"
$IngestionGrpcUrl = "localhost:8099"
$TensorRTGrpcUrl = "localhost:8100"
$RedisUrl = "localhost:6379"
$MinioUrl = "localhost:9000"

# Paths
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $WorkspaceRoot "logs"
$DatasetsDir = Join-Path $WorkspaceRoot "datasets"
$CheckpointsDir = Join-Path $WorkspaceRoot "checkpoints"
$AdaptersDir = Join-Path $WorkspaceRoot "adapters"
$EnginesDir = Join-Path $WorkspaceRoot "engines"

# Ensure directories exist
@($LogsDir, $DatasetsDir, $CheckpointsDir, $AdaptersDir, $EnginesDir) | ForEach-Object {
    if (!(Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Logging function
function Write-PhaseLog {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Write-Host $LogMessage -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } elseif ($Level -eq "WARN") { "Yellow" } else { "Green" })
    Add-Content -Path (Join-Path $LogsDir "phase_ast_qlora.log") -Value $LogMessage
}

# Check service health
function Test-ServiceHealth {
    param([string]$ServiceName, [string]$Url, [string]$HealthEndpoint = "/health")

    Write-PhaseLog "Checking $ServiceName health at $Url$HealthEndpoint"

    try {
        if ($Url -match ":\d+$") {
            # gRPC service
            $result = & grpc_health_probe -addr=$Url 2>$null
            return $LASTEXITCODE -eq 0
        } else {
            # HTTP service
            $response = Invoke-WebRequest -Uri "$Url$HealthEndpoint" -TimeoutSec 10 -ErrorAction Stop
            return $response.StatusCode -eq 200
        }
    } catch {
        Write-PhaseLog "Health check failed for $ServiceName`: $($_.Exception.Message)" "WARN"
        return $false
    }
}

# Start Docker services
function Start-PhaseAStServices {
    Write-PhaseLog "Starting Phase AST QLoRA services..."

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would start Docker Compose services"
        return $true
    }

    try {
        Push-Location $WorkspaceRoot
        & docker-compose -f docker-compose.qlora.yml up -d

        # Wait for services to be healthy
        $services = @(
            @{Name="Redis"; Url=$RedisUrl; Endpoint=""},
            @{Name="MinIO"; Url="http://$MinioUrl"; Endpoint="/minio/health/live"},
            @{Name="QLoRA Trainer"; Url=$TrainerGrpcUrl; Endpoint=""},
            @{Name="Dataset Ingestion"; Url=$IngestionGrpcUrl; Endpoint=""},
            @{Name="TensorRT-LLM"; Url=$TensorRTGrpcUrl; Endpoint=""}
        )

        $maxRetries = 30
        $retryCount = 0

        while ($retryCount -lt $maxRetries) {
            $allHealthy = $true

            foreach ($service in $services) {
                if (!(Test-ServiceHealth $service.Name $service.Url $service.Endpoint)) {
                    $allHealthy = $false
                    break
                }
            }

            if ($allHealthy) {
                Write-PhaseLog "All services are healthy!"
                return $true
            }

            $retryCount++
            Write-PhaseLog "Waiting for services to be healthy... ($retryCount/$maxRetries)"
            Start-Sleep -Seconds 10
        }

        Write-PhaseLog "Services failed to become healthy within timeout" "ERROR"
        return $false

    } catch {
        Write-PhaseLog "Failed to start services: $($_.Exception.Message)" "ERROR"
        return $false
    } finally {
        Pop-Location
    }
}

# Dataset ingestion phase
function Invoke-DatasetIngestion {
    Write-PhaseLog "Phase 1: Dataset Ingestion"

    if (!(Test-Path $DatasetPath)) {
        Write-PhaseLog "Dataset file not found: $DatasetPath" "ERROR"
        return $false
    }

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would process dataset $DatasetPath"
        return $true
    }

    try {
        # Call dataset ingestion service
        $ingestionCmd = "dataset_ingestion_pipeline.exe `"$DatasetPath`" `"$DatasetsDir/processed`""
        Write-PhaseLog "Running: $ingestionCmd"

        $result = Invoke-Expression $ingestionCmd
        if ($LASTEXITCODE -ne 0) {
            Write-PhaseLog "Dataset ingestion failed" "ERROR"
            return $false
        }

        Write-PhaseLog "Dataset ingestion completed successfully"
        return $true

    } catch {
        Write-PhaseLog "Dataset ingestion error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# QLoRA training phase
function Invoke-QLoRATraining {
    Write-PhaseLog "Phase 2: QLoRA Training"

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would train QLoRA model for $MaxEpochs epochs with batch size $BatchSize"
        return $true
    }

    try {
        # Prepare training command
        $trainCmd = "rag_lora_trainer.exe --model $ModelName --epochs $MaxEpochs --batch-size $BatchSize --dataset $DatasetsDir/processed/train --output $CheckpointsDir"
        Write-PhaseLog "Running: $trainCmd"

        $result = Invoke-Expression $trainCmd
        if ($LASTEXITCODE -ne 0) {
            Write-PhaseLog "QLoRA training failed" "ERROR"
            return $false
        }

        Write-PhaseLog "QLoRA training completed successfully"
        return $true

    } catch {
        Write-PhaseLog "QLoRA training error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# TensorRT-LLM integration phase
function Invoke-TensorRTIntegration {
    Write-PhaseLog "Phase 3: TensorRT-LLM Integration"

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would build TensorRT engine and integrate LoRA adapter"
        return $true
    }

    try {
        # Build TensorRT engine
        $engineCmd = "tensorrt_llm_integration.exe --build-engine --model $ModelName --output $EnginesDir"
        Write-PhaseLog "Building TensorRT engine: $engineCmd"

        $result = Invoke-Expression $engineCmd
        if ($LASTEXITCODE -ne 0) {
            Write-PhaseLog "TensorRT engine build failed" "ERROR"
            return $false
        }

        # Integrate LoRA adapter
        $adapterPath = Join-Path $CheckpointsDir "final_adapter.pt"
        $integrateCmd = "tensorrt_llm_integration.exe --integrate-lora --adapter $adapterPath --engine $EnginesDir/engine.engine"
        Write-PhaseLog "Integrating LoRA adapter: $integrateCmd"

        $result = Invoke-Expression $integrateCmd
        if ($LASTEXITCODE -ne 0) {
            Write-PhaseLog "LoRA integration failed" "ERROR"
            return $false
        }

        Write-PhaseLog "TensorRT-LLM integration completed successfully"
        return $true

    } catch {
        Write-PhaseLog "TensorRT integration error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Inference testing phase
function Invoke-InferenceTesting {
    Write-PhaseLog "Phase 4: Inference Testing"

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would test inference with sample prompts"
        return $true
    }

    try {
        # Test inference
        $testPrompts = @(
            "Explain legal contract basics in simple terms.",
            "What are the key elements of a valid will?",
            "How does breach of contract work in business law?"
        )

        foreach ($prompt in $testPrompts) {
            Write-PhaseLog "Testing inference with prompt: $prompt"

            $inferenceCmd = "tensorrt_llm_integration.exe --generate --prompt `"$prompt`" --max-tokens 100"
            $result = Invoke-Expression $inferenceCmd

            if ($LASTEXITCODE -ne 0) {
                Write-PhaseLog "Inference test failed for prompt: $prompt" "WARN"
            } else {
                Write-PhaseLog "Inference test passed for prompt: $prompt"
            }
        }

        Write-PhaseLog "Inference testing completed"
        return $true

    } catch {
        Write-PhaseLog "Inference testing error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Performance benchmarking
function Invoke-PerformanceBenchmark {
    Write-PhaseLog "Phase 5: Performance Benchmarking"

    if ($DryRun) {
        Write-PhaseLog "DRY RUN: Would run performance benchmarks"
        return $true
    }

    try {
        # Run benchmarks
        $benchmarkCmd = "qlora_benchmark.exe --comprehensive --output $LogsDir/benchmark_results.json"
        Write-PhaseLog "Running benchmarks: $benchmarkCmd"

        $result = Invoke-Expression $benchmarkCmd
        if ($LASTEXITCODE -ne 0) {
            Write-PhaseLog "Benchmarking failed" "WARN"
        } else {
            Write-PhaseLog "Benchmarking completed successfully"
        }

        return $true

    } catch {
        Write-PhaseLog "Benchmarking error: $($_.Exception.Message)" "WARN"
        return $true # Non-critical
    }
}

# Main execution
function Invoke-Main {
    Write-PhaseLog "=== Phase AST: QLoRA Training Pipeline Starting ==="
    Write-PhaseLog "Mode: $Mode, Model: $ModelName, Dataset: $DatasetPath"

    $startTime = Get-Date
    $success = $true

    try {
        # Phase 0: Service startup
        if (!(Start-PhaseAStServices)) {
            throw "Service startup failed"
        }

        # Phase 1: Dataset ingestion
        if (!$SkipIngestion -and ($Mode -eq "full" -or $Mode -eq "ingestion")) {
            if (!(Invoke-DatasetIngestion)) {
                throw "Dataset ingestion failed"
            }
        }

        # Phase 2: QLoRA training
        if (!$SkipTraining -and ($Mode -eq "full" -or $Mode -eq "training")) {
            if (!(Invoke-QLoRATraining)) {
                throw "QLoRA training failed"
            }
        }

        # Phase 3: TensorRT integration
        if ($Mode -eq "full" -or $Mode -eq "integration") {
            if (!(Invoke-TensorRTIntegration)) {
                throw "TensorRT integration failed"
            }
        }

        # Phase 4: Inference testing
        if (!$SkipInference -and ($Mode -eq "full" -or $Mode -eq "inference")) {
            if (!(Invoke-InferenceTesting)) {
                throw "Inference testing failed"
            }
        }

        # Phase 5: Performance benchmarking
        if ($Mode -eq "full" -or $Mode -eq "benchmark") {
            Invoke-PerformanceBenchmark
        }

        Write-PhaseLog "=== Phase AST Pipeline Completed Successfully ==="

    } catch {
        Write-PhaseLog "Pipeline failed: $($_.Exception.Message)" "ERROR"
        $success = $false
    }

    $endTime = Get-Date
    $duration = $endTime - $startTime

    Write-PhaseLog "Total execution time: $($duration.TotalMinutes.ToString("F2")) minutes"
    Write-PhaseLog "Pipeline result: $(if ($success) { "SUCCESS" } else { "FAILED" })"

    return $success
}

# Execute main function
$result = Invoke-Main
exit $(if ($result) { 0 } else { 1 })