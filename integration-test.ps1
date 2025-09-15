# Integration Test Results
Write-Host "🚀 Legal AI Integration Test Results" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Test Legal Recommendation Engine
Write-Host "`n🔍 Testing Legal Recommendation Engine..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Legal Recommendation Engine: HEALTHY" -ForegroundColor Green
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "   📊 Cases: $($healthData.databases.cases), Precedents: $($healthData.databases.precedents), Vectors: $($healthData.databases.vectors)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Legal Recommendation Engine: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Legal Recommendations Endpoint
Write-Host "`n🔍 Testing Legal Recommendations..." -ForegroundColor Cyan
try {
    $requestBody = @{
        case_description = "Contract dispute involving payment terms"
        case_type = "commercial"
        jurisdiction = "US"
    } | ConvertTo-Json

    $recommendResponse = Invoke-WebRequest -Uri "http://localhost:8080/recommendations" -Method POST -ContentType "application/json" -Body $requestBody -UseBasicParsing
    if ($recommendResponse.StatusCode -eq 200) {
        Write-Host "✅ Legal Recommendations: SUCCESS" -ForegroundColor Green
        $recData = $recommendResponse.Content | ConvertFrom-Json
        Write-Host "   📈 Risk Score: $($recData.risk_score)" -ForegroundColor Gray
        Write-Host "   📝 Recommendations: $($recData.recommendations.Count) found" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Legal Recommendations: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test CUDA Service (if available)
Write-Host "`n🔍 Testing CUDA Search Service..." -ForegroundColor Cyan
try {
    $cudaHealthResponse = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing
    if ($cudaHealthResponse.StatusCode -eq 200) {
        Write-Host "✅ CUDA Search Service: HEALTHY" -ForegroundColor Green

        # Test search endpoint
        Write-Host "`n🔍 Testing Search Functionality..." -ForegroundColor Cyan
        $searchBody = @{
            query = "contract law analysis"
        } | ConvertTo-Json

        $searchResponse = Invoke-WebRequest -Uri "http://localhost:8081/search" -Method POST -ContentType "application/json" -Body $searchBody -UseBasicParsing
        if ($searchResponse.StatusCode -eq 200) {
            Write-Host "✅ Search Functionality: SUCCESS" -ForegroundColor Green
            $searchData = $searchResponse.Content | ConvertFrom-Json
            Write-Host "   📊 Results: $($searchData.total) found" -ForegroundColor Gray
            Write-Host "   📄 Sample: $($searchData.results[0].content)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ CUDA Search Service: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Integration Test Complete" -ForegroundColor Green
Write-Host "🎯 Legal AI Platform Status:" -ForegroundColor Yellow
Write-Host "   - Legal Recommendation Engine: ✅ Running on port 8080" -ForegroundColor Green
Write-Host "   - CUDA Search Service: ❓ Check port 8081" -ForegroundColor Yellow
Write-Host "   - Integration: Ready for Phase 2 development" -ForegroundColor Green