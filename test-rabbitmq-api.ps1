# RabbitMQ API Integration Test Script
# Tests the new /api/documents/queue endpoint

Write-Host "🧪 RabbitMQ API Integration Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "📊 Test 1: Health Check" -ForegroundColor Yellow
Write-Host "GET http://localhost:5174/api/documents/queue" -ForegroundColor Gray

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5174/api/documents/queue" -ErrorAction Stop
    Write-Host "✅ Health Check Success" -ForegroundColor Green
    Write-Host "  Healthy: $($health.healthy)" -ForegroundColor Green
    Write-Host "  Connection: $($health.connection)" -ForegroundColor Green

    if ($health.queues) {
        Write-Host "  Queues:" -ForegroundColor Green
        $health.queues.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name): $($_.Value.messageCount) messages, $($_.Value.consumerCount) consumers" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "❌ Health Check Failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure the dev server is running:" -ForegroundColor Yellow
    Write-Host "   cd sveltekit-frontend" -ForegroundColor Gray
    Write-Host "   npm run dev:quic" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 2: Queue a Document Processing Job
Write-Host "📤 Test 2: Queue Document Processing Job" -ForegroundColor Yellow
Write-Host "POST http://localhost:5174/api/documents/queue" -ForegroundColor Gray

$jobData = @{
    s3Key = "documents/test/sample-evidence.pdf"
    s3Bucket = "legal-documents"
    originalName = "sample-evidence.pdf"
    mimeType = "application/pdf"
    fileSize = 1024768
    caseId = "test-case-001"
    userId = "test-user-123"
    processingType = "full_analysis"
    priority = 7
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5174/api/documents/queue" `
        -Method POST `
        -ContentType "application/json" `
        -Body $jobData `
        -ErrorAction Stop

    Write-Host "✅ Job Queued Successfully" -ForegroundColor Green
    Write-Host "  Job ID: $($response.jobId)" -ForegroundColor Green
    Write-Host "  Queue: $($response.queue)" -ForegroundColor Green
    Write-Host "  Processing Type: $($response.processingType)" -ForegroundColor Green
    Write-Host "  Priority: $($response.priority)" -ForegroundColor Green
    Write-Host "  Estimated Time: $($response.estimatedProcessingTime)" -ForegroundColor Green

    if ($response.nextSteps) {
        Write-Host "  Next Steps:" -ForegroundColor Cyan
        $response.nextSteps | ForEach-Object {
            Write-Host "    $_" -ForegroundColor Gray
        }
    }

    $savedJobId = $response.jobId
} catch {
    Write-Host "❌ Job Queue Failed" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Details: $($errorJson.error)" -ForegroundColor Red
        if ($errorJson.required) {
            Write-Host "  Required Fields: $($errorJson.required -join ', ')" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 3: Verify in RabbitMQ Management UI
Write-Host "🐰 Test 3: Verify in RabbitMQ Management UI" -ForegroundColor Yellow
Write-Host "Opening http://localhost:15672 in browser..." -ForegroundColor Gray
Write-Host ""
Write-Host "  Username: guest" -ForegroundColor Cyan
Write-Host "  Password: guest" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Navigate to: Queues → doc_processing_queue" -ForegroundColor Cyan
Write-Host "  You should see 1 new message" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:15672"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 4: Queue Multiple Jobs (Batch Test)
Write-Host "📦 Test 4: Batch Queue (5 jobs)" -ForegroundColor Yellow

$batchResults = @()

1..5 | ForEach-Object {
    $batchJob = @{
        s3Key = "documents/test/batch-doc-$_.pdf"
        s3Bucket = "legal-documents"
        originalName = "batch-doc-$_.pdf"
        mimeType = "application/pdf"
        fileSize = 512000 + ($_ * 10000)
        caseId = "test-case-batch"
        userId = "test-user-123"
        processingType = "full_analysis"
        priority = $_
    } | ConvertTo-Json

    try {
        $batchResponse = Invoke-RestMethod -Uri "http://localhost:5174/api/documents/queue" `
            -Method POST `
            -ContentType "application/json" `
            -Body $batchJob `
            -ErrorAction Stop

        $batchResults += [PSCustomObject]@{
            JobNumber = $_
            JobID = $batchResponse.jobId
            Status = "✅ Queued"
            Priority = $batchResponse.priority
        }
    } catch {
        $batchResults += [PSCustomObject]@{
            JobNumber = $_
            JobID = "N/A"
            Status = "❌ Failed"
            Priority = $_
        }
    }
}

Write-Host ""
$batchResults | Format-Table -AutoSize

$successCount = ($batchResults | Where-Object { $_.Status -eq "✅ Queued" }).Count
Write-Host "Batch Summary: $successCount/5 jobs queued successfully" -ForegroundColor $(if ($successCount -eq 5) { "Green" } else { "Yellow" })

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 5: Check Queue Health After Batch
Write-Host "📊 Test 5: Queue Health After Batch" -ForegroundColor Yellow

try {
    $healthAfter = Invoke-RestMethod -Uri "http://localhost:5174/api/documents/queue" -ErrorAction Stop

    if ($healthAfter.queues -and $healthAfter.queues.doc_processing_queue) {
        $messageCount = $healthAfter.queues.doc_processing_queue.messageCount
        Write-Host "✅ Queue Status:" -ForegroundColor Green
        Write-Host "  Messages in queue: $messageCount" -ForegroundColor Cyan
        Write-Host "  Consumers: $($healthAfter.queues.doc_processing_queue.consumerCount)" -ForegroundColor Cyan

        if ($messageCount -gt 0) {
            Write-Host ""
            Write-Host "  💡 Note: $messageCount messages waiting for background workers" -ForegroundColor Yellow
            Write-Host "     Workers will be implemented in the next phase" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Unable to check queue health" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ All Tests Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check RabbitMQ Management UI (http://localhost:15672)" -ForegroundColor Gray
Write-Host "  2. View queue: doc_processing_queue" -ForegroundColor Gray
Write-Host "  3. Implement background workers to consume messages" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  See RABBITMQ_API_INTEGRATION_COMPLETE.md" -ForegroundColor Gray
Write-Host ""
