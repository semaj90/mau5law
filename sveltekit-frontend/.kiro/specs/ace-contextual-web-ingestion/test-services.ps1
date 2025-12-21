Write-Host "=== Service Health Check ===" -ForegroundColor Cyan

# Function to check a URL
function Check-Http {
    param (
        [string]$Name,
        [string]$Url
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  SUCCESS: $Name is healthy (HTTP)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  FAILED: $Name not responding at $Url ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Function to check a TCP Port
function Check-Port {
    param (
        [string]$Name,
        [string]$HostName,
        [int]$Port
    )
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($connect)
            $tcp.Close()
            Write-Host "  SUCCESS: $Name is listening on port $Port" -ForegroundColor Green
            return $true
        } else {
            $tcp.Close()
            Write-Host "  FAILED: $Name not listening on port $Port" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "  FAILED: $Name error ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Check Services
# Qdrant: Check /readyz for readiness (v1.x standard)
$qdrant = Check-Http -Name "Qdrant" -Url "http://localhost:6333/readyz"

# MinIO: Check /minio/health/live
$minio = Check-Http -Name "MinIO" -Url "http://localhost:9000/minio/health/live"

# RabbitMQ: Check TCP port 5672 (AMQP) as Management API (15672) might require auth
$rabbitmq = Check-Port -Name "RabbitMQ" -HostName "localhost" -Port 5672

# Ollama: Check root
$ollama = Check-Http -Name "Ollama" -Url "http://localhost:11434"

Write-Host "`n=== Health Check Complete ===" -ForegroundColor Cyan

if ($qdrant -and $minio -and $rabbitmq -and $ollama) {
    Write-Host "✅ All services are running!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some services are missing." -ForegroundColor Red
    exit 1
}
