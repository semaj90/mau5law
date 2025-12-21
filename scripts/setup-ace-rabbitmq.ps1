# Setup script for ACE RabbitMQ Queue (PowerShell)
# Creates the ace_web_ingest queue using docker exec

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = if ($env:RABBITMQ_CONTAINER) { $env:RABBITMQ_CONTAINER } else { "legal-ai-rabbitmq" }
$QUEUE_NAME = "ace_web_ingest"
$VHOST = "/"

Write-Host================================" -ForegroundColor Cyan
Write-Host "ACE RabbitMQ Queue Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
Write-Host "1. Checking if RabbitMQ container is running..." -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}"
    if ($containers -contains $CONTAINER_NAME) {
        Write-Host "   ✓ Container '$CONTAINER_NAME' is running" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Container '$CONTAINER_NAME' is not running" -ForegroundColor Red
        Write-Host "   Start with: docker-compose up -d rabbitmq" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ✗ Error checking container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Wait for RabbitMQ to be ready
Write-Host "2. Waiting for RabbitMQ to be ready..." -ForegroundColor Yellow
$MAX_RETRIES = 30
$RETRY_COUNT = 0
$isReady = $false

while ($RETRY_COUNT -lt $MAX_RETRIES) {
    try {
        $result = docker exec $CONTAINER_NAME rabbitmq-diagnostics -q ping 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ RabbitMQ is ready" -ForegroundColor Green
            $isReady = $true
            break
        }
    } catch {
        # Continue waiting
    }

    $RETRY_COUNT++
    Write-Host "   Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if (-not $isReady) {
    Write-Host "   ✗ RabbitMQ did not become ready in time" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create queue using docker exec
Write-Host "3. Creating queue '$QUEUE_NAME'..." -ForegroundColor Yellow

try {
    # Check if rabbitmqadmin is available
    $hasAdmin = docker exec $CONTAINER_NAME which rabbitmqadmin 2>&1

    if ($LASTEXITCODE -eq 0) {
        # Use rabbitmqadmin (preferred)
        docker exec $CONTAINER_NAME rabbitmqadmin declare queue `
            name="$QUEUE_NAME" `
            durable=true `
            auto_delete=false `
            arguments='{}' 2>&1 | Out-Null
        Write-Host "   ✓ Queue created using rabbitmqadmin" -ForegroundColor Green
    } else {
        # Fallback: Use rabbitmqctl
        $evalCmd = "rabbit_amqqueue:declare({resource, <<\`"$VHOST\`">>, queue, <<\`"$QUEUE_NAME\`">>}, true, false, [], none, <<\`"legal_admin\`">>)."
        docker exec $CONTAINER_NAME rabbitmqctl eval $evalCmd 2>&1 | Out-Null
        Write-Host "   ✓ Queue created using rabbitmqctl" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠ Queue creation command executed (may already exist)" -ForegroundColor Yellow
}

Write-Host ""

# Verify queue was created
Write-Host "4. Verifying queue creation..." -ForegroundColor Yellow
try {
    $queueList = docker exec $CONTAINER_NAME rabbitmqctl list_queues name durable messages consumers

    if ($queueList -match $QUEUE_NAME) {
        Write-Host "   ✓ Queue '$QUEUE_NAME' exists" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Queue details:" -ForegroundColor Gray

        # Parse queue details
        $lines = $queueList -split "`n"
        foreach ($line in $lines) {
            if ($line -match $QUEUE_NAME) {
                $parts = $line -split "\s+"
                if ($parts.Count -ge 4) {
                    Write-Host "   - Name: $($parts[0])" -ForegroundColor Gray
                    Write-Host "   - Durable: $($parts[1])" -ForegroundColor Gray
                    Write-Host "   - Messages: $($parts[2])" -ForegroundColor Gray
                    Write-Host "   - Consumers: $($parts[3])" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "   ⚠ Queue may not have been created (will be auto-created by worker)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠ Could not verify queue: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Show all queues
Write-Host "5. All queues:" -ForegroundColor Yellow
try {
    $allQueues = docker exec $CONTAINER_NAME rabbitmqctl list_queues name durable messages consumers
    $lines = $allQueues -split "`n" | Select-Object -Skip 1

    foreach ($line in $lines) {
        if ($line.Trim()) {
            Write-Host "   $line" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ✗ Error listing queues: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Queue '$QUEUE_NAME' is ready for use." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify setup: .\scripts\verify-ace-rabbitmq.ps1" -ForegroundColor Gray
Write-Host "  2. Start worker: python backend/workers/ace_web_worker.py" -ForegroundColor Gray
Write-Host "  3. Test ingestion: curl -X POST http://localhost:5173/api/ace/web/ingest" -ForegroundColor Gray
Write-Host ""
Write-Host "Management UI: http://localhost:15672" -ForegroundColor Yellow
Write-Host "Credentials: legal_admin / secret123" -ForegroundColor Yellow
Write-Host ""
