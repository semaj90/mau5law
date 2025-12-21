# Verification script for ACE RabbitMQ Queue Setup (PowerShell)
# Checks if RabbitMQ is running and queue is properly configured

$ErrorActionPreference = "Stop"

$RABBITMQ_URL = if ($env:RABBITMQ_URL) { $env:RABBITMQ_URL } else { "http://localhost:15672" }
$RABBITMQ_USER = if ($env:RABBITMQ_USER) { $env:RABBITMQ_USER } else { "legal_admin" }
$RABBITMQ_PASS = if ($env:RABBITMQ_PASS) { $env:RABBITMQ_PASS } else { "secret123" }
$QUEUE_NAME = "ace_web_ingest"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ACE RabbitMQ Queue Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Create credentials for Basic Auth
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${RABBITMQ_USER}:${RABBITMQ_PASS}"))
$headers = @{
    Authorization = "Basic $base64AuthInfo"
}

# Check if RabbitMQ is running
Write-Host "1. Checking if RabbitMQ is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$RABBITMQ_URL/api/overview" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ RabbitMQ is running at $RABBITMQ_URL" -ForegroundColor Green
} catch {
    Write-Host "   ✗ RabbitMQ is not running at $RABBITMQ_URL" -ForegroundColor Red
    Write-Host "   Start RabbitMQ with: docker exec rabbitmq rabbitmq-server -detached" -ForegroundColor Yellow
    Write-Host "   Or: docker-compose up -d rabbitmq" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get RabbitMQ version and status
Write-Host "2. Checking RabbitMQ version and status..." -ForegroundColor Yellow
try {
    $overview = Invoke-WebRequest -Uri "$RABBITMQ_URL/api/overview" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    $overviewData = $overview.Content | ConvertFrom-Json

    Write-Host "   - Version: $($overviewData.rabbitmq_version)" -ForegroundColor Gray
    Write-Host "   - Cluster: $($overviewData.cluster_name)" -ForegroundColor Gray
    Write-Host "   ✓ RabbitMQ is healthy" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Could not retrieve RabbitMQ status" -ForegroundColor Red
}

Write-Host ""

# Check if queue exists
Write-Host "3. Checking if queue '$QUEUE_NAME' exists..." -ForegroundColor Yellow
try {
    $queueResponse = Invoke-WebRequest -Uri "$RABBITMQ_URL/api/queues/%2F/$QUEUE_NAME" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    $queueData = $queueResponse.Content | ConvertFrom-Json

    Write-Host "   ✓ Queue '$QUEUE_NAME' exists" -ForegroundColor Green
    Write-Host "   - Messages: $($queueData.messages)" -ForegroundColor Gray
    Write-Host "   - Consumers: $($queueData.consumers)" -ForegroundColor Gray
    Write-Host "   - Durable: $($queueData.durable)" -ForegroundColor Gray

    if ($queueData.durable -eq $true) {
        Write-Host "   ✓ Queue is durable (survives restarts)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Queue is not durable" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "   ✗ Queue '$QUEUE_NAME' does not exist" -ForegroundColor Yellow
        Write-Host "   Queue will be created automatically by worker on first use" -ForegroundColor Gray
        Write-Host "   Or create manually via Management UI: $RABBITMQ_URL" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Error checking queue: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# List all queues
Write-Host "4. Available queues:" -ForegroundColor Yellow
try {
    $queuesResponse = Invoke-WebRequest -Uri "$RABBITMQ_URL/api/queues" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    $queuesData = $queuesResponse.Content | ConvertFrom-Json

    if ($queuesData.Count -gt 0) {
        foreach ($queue in $queuesData) {
            Write-Host "   - $($queue.name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (no queues found)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Error listing queues: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check connections
Write-Host "5. Checking active connections..." -ForegroundColor Yellow
try {
    $connectionsResponse = Invoke-WebRequest -Uri "$RABBITMQ_URL/api/connections" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    $connectionsData = $connectionsResponse.Content | ConvertFrom-Json

    Write-Host "   - Active connections: $($connectionsData.Count)" -ForegroundColor Gray

    if ($connectionsData.Count -gt 0) {
        Write-Host "   ✓ Workers are connected" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ No workers connected (expected if worker not started)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Error checking connections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Management UI: $RABBITMQ_URL" -ForegroundColor Yellow
Write-Host "Credentials: $RABBITMQ_USER / $RABBITMQ_PASS" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Access Management UI: start $RABBITMQ_URL" -ForegroundColor Gray
Write-Host "  2. Start worker: python backend/workers/ace_web_worker.py" -ForegroundColor Gray
Write-Host "  3. Test ingestion: curl -X POST http://localhost:5173/api/ace/web/ingest" -ForegroundColor Gray
Write-Host ""
