#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 76: Start all required Docker services
.DESCRIPTION
    Starts PostgreSQL, Redis, RabbitMQ, Qdrant, CouchDB, and MinIO using docker run/start
#>

Write-Host "🚀 Phase 76: Starting Docker Services" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{
        Name = "phase76-postgres"
        Image = "pgvector/pgvector:pg17"
        Ports = @("5432:5432")
        Env = @(
            "POSTGRES_USER=postgres",
            "POSTGRES_PASSWORD=password",
            "POSTGRES_DB=deeds_db"
        )
        Volume = "phase76_postgres_data:/var/lib/postgresql/data"
    },
    @{
        Name = "phase76-redis"
        Image = "redis:7-alpine"
        Ports = @("6379:6379")
        Env = @()
        Volume = "phase76_redis_data:/data"
    },
    @{
        Name = "phase76-rabbitmq"
        Image = "rabbitmq:3-management-alpine"
        Ports = @("5672:5672", "15672:15672")
        Env = @(
            "RABBITMQ_DEFAULT_USER=admin",
            "RABBITMQ_DEFAULT_PASS=password"
        )
        Volume = "phase76_rabbitmq_data:/var/lib/rabbitmq"
    },
    @{
        Name = "phase76-qdrant"
        Image = "qdrant/qdrant:latest"
        Ports = @("6333:6333")
        Env = @()
        Volume = "phase76_qdrant_data:/qdrant/storage"
    },
    @{
        Name = "phase76-couchdb"
        Image = "couchdb:3.3"
        Ports = @("5984:5984")
        Env = @(
            "COUCHDB_USER=admin",
            "COUCHDB_PASSWORD=password"
        )
        Volume = "phase76_couchdb_data:/opt/couchdb/data"
    },
    @{
        Name = "phase76-minio"
        Image = "minio/minio:latest"
        Ports = @("9000:9000", "9001:9001")
        Env = @(
            "MINIO_ROOT_USER=minioadmin",
            "MINIO_ROOT_PASSWORD=minioadmin123"
        )
        Volume = "phase76_minio_data:/data"
        Command = "server /data --console-address :9001"
    }
)

foreach ($service in $services) {
    Write-Host "📦 Checking $($service.Name)..." -ForegroundColor Yellow

    # Check if container exists
    $exists = docker ps -a --filter "name=$($service.Name)" --format "{{.Names}}" 2>$null

    if ($exists) {
        # Container exists, check if running
        $running = docker ps --filter "name=$($service.Name)" --format "{{.Names}}" 2>$null

        if ($running) {
            Write-Host "   ✅ Already running" -ForegroundColor Green
        } else {
            Write-Host "   🔄 Starting existing container..." -ForegroundColor Cyan
            docker start $service.Name | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Started" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Failed to start" -ForegroundColor Red
            }
        }
    } else {
        # Check if port is already in use by another container
        $firstPort = $service.Ports[0].Split(':')[0]
        $portInUse = docker ps --format "{{.Ports}}" | Select-String ":$firstPort->"

        if ($portInUse) {
            Write-Host "   ⚠️  Port $firstPort already in use - skipping" -ForegroundColor Yellow
            continue
        }

        # Container doesn't exist, create it
        Write-Host "   🆕 Creating new container..." -ForegroundColor Cyan        $runArgs = @("run", "-d", "--name", $service.Name, "--restart", "unless-stopped")

        foreach ($port in $service.Ports) {
            $runArgs += "-p"
            $runArgs += $port
        }

        foreach ($env in $service.Env) {
            $runArgs += "-e"
            $runArgs += $env
        }

        if ($service.Volume) {
            $runArgs += "-v"
            $runArgs += $service.Volume
        }

        $runArgs += $service.Image

        if ($service.Command) {
            $runArgs += $service.Command -split " "
        }

        docker @runArgs | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Created and started" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to create" -ForegroundColor Red
        }
    }

    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🔍 Service Health Check:" -ForegroundColor Cyan
Write-Host ""

# Check each service
$healthChecks = @(
    @{ Name = "PostgreSQL"; Command = "docker exec phase76-postgres pg_isready -U postgres" },
    @{ Name = "Redis"; Command = "docker exec phase76-redis redis-cli ping" },
    @{ Name = "RabbitMQ"; Command = "docker exec phase76-rabbitmq rabbitmqctl status" },
    @{ Name = "Qdrant"; Command = 'curl -s http://localhost:6333/health' },
    @{ Name = "CouchDB"; Command = 'curl -s http://localhost:5984/_up' },
    @{ Name = "MinIO"; Command = 'curl -s http://localhost:9000/minio/health/live' }
)

$allHealthy = $true

foreach ($check in $healthChecks) {
    try {
        Invoke-Expression $check.Command 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $($check.Name) - Healthy" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $($check.Name) - Starting up..." -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host "   ⚠️  $($check.Name) - Starting up..." -ForegroundColor Yellow
        $allHealthy = $false
    }
}

Write-Host ""
if ($allHealthy) {
    Write-Host "✅ All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services are still starting up. Wait 10-20 seconds and check again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   PostgreSQL:  localhost:5432 (postgres/password)" -ForegroundColor White
Write-Host "   Redis:       localhost:6379" -ForegroundColor White
Write-Host "   RabbitMQ:    http://localhost:15672 (admin/password)" -ForegroundColor White
Write-Host "   Qdrant:      http://localhost:6333" -ForegroundColor White
Write-Host "   CouchDB:     http://localhost:5984/_utils (admin/password)" -ForegroundColor White
Write-Host "   MinIO:       http://localhost:9001 (minioadmin/minioadmin123)" -ForegroundColor White
Write-Host ""
