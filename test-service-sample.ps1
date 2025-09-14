# 🧪 SERVICE DISCOVERY & TESTING SCRIPT
# Systematically test all services to understand their capabilities

# Test a representative sample of services to understand patterns
$testServices = @(
    @{name="enhanced-rag-service.exe"; expectedPort=8094; category="RAG"},
    @{name="gpu-orchestrator.exe"; expectedPort=8095; category="GPU"},
    @{name="multi-protocol-gateway.exe"; expectedPort=8090; category="Gateway"},
    @{name="legal-recommendation-engine.exe"; expectedPort=8100; category="Legal"},
    @{name="health-server.exe"; expectedPort=8085; category="Infrastructure"}
)

Write-Host "🔍 SYSTEMATIC SERVICE TESTING" -ForegroundColor Cyan
Write-Host "Testing representative services to understand capabilities..." -ForegroundColor White
Write-Host ""

foreach ($service in $testServices) {
    Write-Host "Testing: $($service.name) [$($service.category)]" -ForegroundColor Yellow

    # Check if executable exists
    $found = Get-ChildItem -Recurse -Name $service.name -ErrorAction SilentlyContinue

    if ($found) {
        Write-Host "  📁 Found at: $found" -ForegroundColor Green

        # Try to run the service
        try {
            $fullPath = (Get-ChildItem -Recurse -Name $service.name | Select-Object -First 1)
            Write-Host "  🚀 Attempting to start..." -ForegroundColor Cyan

            # Start service in background
            $proc = Start-Process $fullPath -PassThru -WindowStyle Hidden -ErrorAction SilentlyContinue
            Start-Sleep 3

            # Test health endpoint
            try {
                $health = Invoke-RestMethod "http://localhost:$($service.expectedPort)/health" -TimeoutSec 5
                Write-Host "  ✅ HEALTHY: $($health.status)" -ForegroundColor Green
                Write-Host "     Details: $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray

                # Test additional endpoints
                try {
                    $info = Invoke-RestMethod "http://localhost:$($service.expectedPort)/" -TimeoutSec 3
                    Write-Host "  📊 Service Info Available" -ForegroundColor Blue
                } catch {
                    Write-Host "  ℹ️  No service info endpoint" -ForegroundColor Gray
                }

            } catch {
                Write-Host "  ❌ No health response on port $($service.expectedPort)" -ForegroundColor Red

                # Try alternative common ports
                $altPorts = @(8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090)
                foreach ($port in $altPorts) {
                    try {
                        $health = Invoke-RestMethod "http://localhost:$port/health" -TimeoutSec 2
                        Write-Host "  ✅ FOUND on port $port: $($health.status)" -ForegroundColor Green
                        break
                    } catch {
                        # Continue checking
                    }
                }
            }

            # Stop the service
            if ($proc -and !$proc.HasExited) {
                $proc | Stop-Process -Force -ErrorAction SilentlyContinue
                Write-Host "  🛑 Service stopped" -ForegroundColor Gray
            }

        } catch {
            Write-Host "  ❌ Failed to start: $($_.Exception.Message)" -ForegroundColor Red
        }

    } else {
        Write-Host "  ❌ Executable not found" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "🎯 RECOMMENDATION:" -ForegroundColor Cyan
Write-Host "Based on this sample testing, we can categorize the full set of services." -ForegroundColor White
Write-Host "Services that start and respond are likely valuable implementations." -ForegroundColor White
Write-Host "Services that don't start are likely stubs or broken experiments." -ForegroundColor White