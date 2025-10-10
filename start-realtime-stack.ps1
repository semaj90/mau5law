# Real-Time Communication Stack - Quick Start Script
# Launches all services for WebSocket + QUIC + WebTransport

Write-Host "🚀 Starting Legal AI Real-Time Communication Stack..." -ForegroundColor Green
Write-Host "=" * 70

# Check if running in correct directory
if (-not (Test-Path "go-services/ws-orchestrator/main.go")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Check for required ports
Write-Host "`n📋 Checking required ports..." -ForegroundColor Cyan

$requiredPorts = @{
    5173 = "Vite Dev Server"
    5178 = "Caddy Proxy"
    8100 = "QUIC Bridge (HTTPS)"
    8101 = "QUIC Bridge (HTTP fallback)"
}

$portsInUse = @()
foreach ($port in $requiredPorts.Keys) {
    if (Test-PortInUse $port) {
        Write-Host "   ⚠️  Port $port ($($requiredPorts[$port])) is already in use" -ForegroundColor Yellow
        $portsInUse += $port
    } else {
        Write-Host "   ✅ Port $port ($($requiredPorts[$port])) is available" -ForegroundColor Green
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host "`n⚠️  Warning: Some ports are already in use." -ForegroundColor Yellow
    Write-Host "   Occupied ports: $($portsInUse -join ', ')" -ForegroundColor Yellow

    $action = Read-Host "Choose action: [k]ill processes, [c]ontinue anyway, [q]uit"

    if ($action -eq "k") {
        Write-Host "`n🔪 Stopping processes on occupied ports..." -ForegroundColor Cyan
        foreach ($port in $portsInUse) {
            try {
                $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
                foreach ($conn in $connections) {
                    $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "   Stopping $($process.ProcessName) (PID $($process.Id)) on port $port..." -ForegroundColor Yellow
                        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    }
                }
                Write-Host "   ✅ Port $port freed" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  Could not free port $port" -ForegroundColor Yellow
            }
        }
        Start-Sleep -Seconds 2
    } elseif ($action -eq "q") {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    # Continue if 'c' or any other input
}

# Start WebSocket Orchestrator
Write-Host "`n🔌 Starting WebSocket Orchestrator..." -ForegroundColor Cyan

# Delete old registry if it exists
$registryPath = "sveltekit-frontend/.ws-registry.json"
if (Test-Path $registryPath) {
    Remove-Item $registryPath -Force -ErrorAction SilentlyContinue
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/go-services/ws-orchestrator'; Write-Host '🔌 WebSocket Orchestrator' -ForegroundColor Green; go run main.go"
Start-Sleep -Seconds 3

# Check if registry was created (with timeout)
$attempts = 0
$maxAttempts = 15
while ((-not (Test-Path $registryPath)) -and ($attempts -lt $maxAttempts)) {
    Write-Host "   Waiting for service registry... ($attempts/$maxAttempts)" -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    $attempts++
}

if (Test-Path $registryPath) {
    Write-Host "   ✅ WebSocket orchestrator started" -ForegroundColor Green
    try {
        $registry = Get-Content $registryPath | ConvertFrom-Json
        Write-Host "   📋 Registered services:" -ForegroundColor Cyan
        foreach ($service in $registry) {
            Write-Host "      - $($service.name): port $($service.port)" -ForegroundColor White
        }
    } catch {
        Write-Host "   ⚠️  Registry file exists but couldn't parse it" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Failed to start WebSocket orchestrator (timeout after $maxAttempts seconds)" -ForegroundColor Red
    Write-Host "   💡 Check the WebSocket Orchestrator window for errors" -ForegroundColor Yellow
}

# Start QUIC Bridge
Write-Host "`n⚡ Starting QUIC Bridge..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/go-services/quic-bridge'; Write-Host '⚡ QUIC Bridge' -ForegroundColor Green; go run main.go"
Start-Sleep -Seconds 2

# Test QUIC bridge
try {
    $quicHealth = Invoke-RestMethod -Uri "http://localhost:8101/health" -ErrorAction Stop
    Write-Host "   ✅ QUIC bridge started ($($quicHealth.protocol))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  QUIC bridge may not be ready yet" -ForegroundColor Yellow
}

# Start Caddy
Write-Host "`n🌐 Starting Caddy Proxy..." -ForegroundColor Cyan

# Find Caddy executable
$caddyPath = if (Test-Path ".\caddy.exe") {
    ".\caddy.exe"
} elseif (Get-Command caddy -ErrorAction SilentlyContinue) {
    "caddy"
} else {
    $null
}

if ($caddyPath) {
    $caddyFullPath = if ($caddyPath -eq ".\caddy.exe") { Join-Path $PWD "caddy.exe" } else { $caddyPath }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/sveltekit-frontend'; Write-Host '🌐 Caddy Proxy' -ForegroundColor Green; & '$caddyFullPath' run --config Caddyfile.development"
    Start-Sleep -Seconds 3

    # Test Caddy
    try {
        $caddyTest = Invoke-WebRequest -Uri "http://localhost:5178" -ErrorAction Stop
        Write-Host "   ✅ Caddy proxy started (HTTP $($caddyTest.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Caddy may not be ready yet (port may be in use)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Caddy not found. Please install Caddy or place caddy.exe in project root" -ForegroundColor Red
    Write-Host "   Download from: https://caddyserver.com/download" -ForegroundColor Yellow
}

# Start Vite Dev Server
Write-Host "`n🎨 Starting Vite Dev Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/sveltekit-frontend'; Write-Host '🎨 Vite Dev Server' -ForegroundColor Green; npm run dev"
Start-Sleep -Seconds 3

# Summary
Write-Host "`n" + "=" * 70
Write-Host "✅ Real-Time Communication Stack Started!" -ForegroundColor Green
Write-Host "=" * 70

Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
Write-Host "   🔌 WebSocket Orchestrator: http://localhost:517x (dynamic ports)" -ForegroundColor White
Write-Host "   ⚡ QUIC Bridge (HTTPS):    https://localhost:8100" -ForegroundColor White
Write-Host "   ⚡ QUIC Bridge (HTTP):     http://localhost:8101" -ForegroundColor White
Write-Host "   🌐 Caddy Proxy:            http://localhost:5178" -ForegroundColor White
Write-Host "   🎨 Vite Dev Server:        http://localhost:5174" -ForegroundColor White

Write-Host "`n🧪 Testing:" -ForegroundColor Cyan
Write-Host "   Run integration tests with:" -ForegroundColor White
Write-Host "   node test-realtime-integration.mjs" -ForegroundColor Yellow

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - EXISTING_INFRASTRUCTURE_AUDIT.md" -ForegroundColor White
Write-Host "   - INTEGRATION_GUIDE_EXISTING_INFRASTRUCTURE.md" -ForegroundColor White
Write-Host "   - WEBSOCKET_QUIC_DISCOVERY_SUMMARY.md" -ForegroundColor White

Write-Host "`n🔍 Service Registry:" -ForegroundColor Cyan
if (Test-Path $registryPath) {
    Write-Host "   Location: $registryPath" -ForegroundColor White
    Write-Host "   View with: cat $registryPath | ConvertFrom-Json | Format-Table" -ForegroundColor Yellow
}

Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Access via Caddy proxy for HTTP/3 support" -ForegroundColor White
Write-Host "   - WebSocket services auto-configure on startup" -ForegroundColor White
Write-Host "   - QUIC bridge provides <1ms latency" -ForegroundColor White
Write-Host "   - Frontend uses auto-discovery (.ws-registry.json)" -ForegroundColor White

Write-Host "`n🛑 To Stop All Services:" -ForegroundColor Cyan
Write-Host "   Run: ./stop-realtime-stack.ps1" -ForegroundColor Yellow
Write-Host "   Or close each PowerShell window individually" -ForegroundColor White

Write-Host ""
