# Stop All Real-Time Communication Services

Write-Host "🛑 Stopping Real-Time Communication Stack..." -ForegroundColor Yellow
Write-Host "=" * 70

# Function to stop process on port
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)

    Write-Host "`n🔍 Checking port $Port ($ServiceName)..." -ForegroundColor Cyan

    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess | Select-Object -First 1
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "   Found process: $($process.Name) (PID: $processId)" -ForegroundColor Yellow
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "   ✅ Stopped $ServiceName" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to stop $ServiceName : $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   No process running on port $Port" -ForegroundColor Gray
    }
}

# Stop services on known ports
Stop-ProcessOnPort 5173 "Vite Dev Server (possible)"
Stop-ProcessOnPort 5174 "Vite Dev Server"
Stop-ProcessOnPort 5175 "WebSocket Service"
Stop-ProcessOnPort 5176 "WebSocket Service"
Stop-ProcessOnPort 5177 "WebSocket Service"
Stop-ProcessOnPort 5178 "Caddy Proxy"
Stop-ProcessOnPort 8100 "QUIC Bridge (HTTPS)"
Stop-ProcessOnPort 8101 "QUIC Bridge (HTTP)"

# Kill remaining Go processes (be careful!)
Write-Host "`n🔍 Checking for orphaned Go processes..." -ForegroundColor Cyan
$goProcesses = Get-Process -Name "go" -ErrorAction SilentlyContinue
if ($goProcesses) {
    Write-Host "   Found $($goProcesses.Count) Go process(es)" -ForegroundColor Yellow
    $kill = Read-Host "   Kill all Go processes? (y/n)"
    if ($kill -eq "y") {
        $goProcesses | Stop-Process -Force
        Write-Host "   ✅ Stopped Go processes" -ForegroundColor Green
    }
}

# Kill Caddy processes
Write-Host "`n🔍 Checking for Caddy processes..." -ForegroundColor Cyan
$caddyProcesses = Get-Process -Name "caddy" -ErrorAction SilentlyContinue
if ($caddyProcesses) {
    Write-Host "   Found $($caddyProcesses.Count) Caddy process(es)" -ForegroundColor Yellow
    $caddyProcesses | Stop-Process -Force
    Write-Host "   ✅ Stopped Caddy processes" -ForegroundColor Green
} else {
    Write-Host "   No Caddy processes running" -ForegroundColor Gray
}

# Kill Node processes (Vite)
Write-Host "`n🔍 Checking for Node processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*" -or $_.CommandLine -like "*sveltekit*"
}
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node/Vite process(es)" -ForegroundColor Yellow
    $kill = Read-Host "   Kill Node/Vite processes? (y/n)"
    if ($kill -eq "y") {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   ✅ Stopped Node processes" -ForegroundColor Green
    }
}

Write-Host "`n" + "=" * 70
Write-Host "✅ Real-Time Communication Stack Stopped" -ForegroundColor Green
Write-Host "=" * 70
Write-Host ""
