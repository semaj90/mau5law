# Phase 66 Environment Configuration Generator
# Generates .env.phase66.generated for docker-compose

param(
    [switch]$Generate,
    [switch]$Validate,
    [string]$OutputFile = ".env.phase66.generated"
)

Write-Host "🔧 Phase 66 Environment Generator" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

if ($Generate) {
    Write-Host "📝 Generating environment configuration..." -ForegroundColor Yellow

    # Base configuration
    $envConfig = @"
# Phase 66 Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Database Configuration
POSTGRES_HOST=phase66-postgres
POSTGRES_PORT=5432
POSTGRES_DB=legal_ai_db
POSTGRES_USER=legal_admin
POSTGRES_PASSWORD=123456
DATABASE_URL=postgresql://legal_admin:123456@phase66-postgres:5432/legal_ai_db

# Redis Configuration
REDIS_HOST=phase66-redis
REDIS_PORT=6379
REDIS_PASSWORD=redis
REDIS_URL=redis://:redis@phase66-redis:6379

# Vector Database (Qdrant)
QDRANT_HOST=phase66-qdrant
QDRANT_PORT=6333
QDRANT_URL=http://phase66-qdrant:6333

# MinIO Object Storage
MINIO_HOST=phase66-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_URL=http://phase66-minio:9000

# MCP Server Configuration
MCP_PORT=3003
MCP_HOST=0.0.0.0
MCP_WORKERS=4
MCP_REDIS_CACHE=true
MCP_PGVECTOR_ENABLED=true

# TensorRT-LLM Configuration
TENSORRT_HOST=phase66-tensorrt-llm
TENSORRT_PORT=8099
TENSORRT_MODEL=gemma3-legal
OLLAMA_ENDPOINT=http://host.docker.internal:11434

# RAG Service Configuration
RAG_MCP_ENDPOINT=http://phase66-mcp-server:3003
RAG_TENSORRT_ENDPOINT=http://phase66-tensorrt-llm:8099
RAG_OLLAMA_ENDPOINT=http://host.docker.internal:11434

# SvelteKit Configuration
PUBLIC_VITE_API_URL=http://localhost:3003
PUBLIC_VITE_RAG_URL=http://localhost:5173/api/v1/rag
VITE_DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
VITE_REDIS_URL=redis://localhost:6379

# GPU Configuration
TORCH_CUDA_DEVICE=0
CUDA_VISIBLE_DEVICES=0
NVIDIA_VISIBLE_DEVICES=all
NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Development Configuration
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=10000
REDIS_CACHE_PREFIX=phase66:

# Security Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3003
SESSION_SECRET=phase66-secure-session-key-change-in-production
JWT_SECRET=phase66-jwt-secret-key-change-in-production

# Performance Configuration
MAX_WORKERS=8
BATCH_SIZE=100
CONCURRENCY_LIMIT=10
TIMEOUT_MS=30000

# Monitoring Configuration
PROMETHEUS_ENABLED=false
METRICS_PORT=9090
TRACING_ENABLED=false
"@

    # Write to file
    $envConfig | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host "✅ Environment file generated: $OutputFile" -ForegroundColor Green
}

if ($Validate) {
    Write-Host "🔍 Validating environment configuration..." -ForegroundColor Yellow

    if (-not (Test-Path $OutputFile)) {
        Write-Host "❌ Environment file not found: $OutputFile" -ForegroundColor Red
        exit 1
    }

    # Read and validate environment file
    $envContent = Get-Content $OutputFile -Raw
    $requiredVars = @(
        'POSTGRES_HOST',
        'REDIS_HOST',
        'DATABASE_URL',
        'REDIS_URL',
        'MCP_PORT',
        'PUBLIC_VITE_API_URL'
    )

    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=") {
            $missingVars += $var
        }
    }

    if ($missingVars.Count -eq 0) {
        Write-Host "✅ All required environment variables present" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing required variables:" -ForegroundColor Red
        $missingVars | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    }

    # Check for sensitive defaults
    $sensitivePatterns = @(
        'password=123456',
        'secret=phase66',
        'admin=admin'
    )

    $hasSensitiveDefaults = $false
    foreach ($pattern in $sensitivePatterns) {
        if ($envContent -match $pattern) {
            $hasSensitiveDefaults = $true
            Write-Host "⚠️  Found sensitive default: $pattern" -ForegroundColor Yellow
        }
    }

    if (-not $hasSensitiveDefaults) {
        Write-Host "✅ No sensitive defaults detected" -ForegroundColor Green
    }
}

if (-not ($Generate -or $Validate)) {
    Write-Host "Usage: .\generate-env.ps1 [options]" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Generate     Generate the Phase 66 environment file" -ForegroundColor White
    Write-Host "  -Validate     Validate existing environment file" -ForegroundColor White
    Write-Host "  -OutputFile   Specify output file (default: .env.phase66.generated)" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\generate-env.ps1 -Generate" -ForegroundColor White
    Write-Host "  .\generate-env.ps1 -Validate" -ForegroundColor White
}

Write-Host "`n💡 Security Notes:" -ForegroundColor Cyan
Write-Host "• Change default passwords before production deployment" -ForegroundColor White
Write-Host "• Use strong, unique secrets for JWT and session keys" -ForegroundColor White
Write-Host "• Consider using Docker secrets for sensitive data" -ForegroundColor White