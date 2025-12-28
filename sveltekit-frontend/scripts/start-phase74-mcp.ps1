#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 74: Start Unified FastMCP Server with proper environment

.DESCRIPTION
    Starts the FastMCP server with:
    - Postgres credentials for Docker container (user/pass/legal)
    - Ollama embeddinggemma:latest model
    - Qdrant surgical_fixes_phase66_85 collection
    - LangExtract container integration (port 8095)
#>

Write-Host "`n🚀 Phase 74: Starting Unified FastMCP Server" -ForegroundColor Cyan
Write-Host "=" * 80

# Set environment variables for Docker containers
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:POSTGRES_USER = "user"          # Docker container user
$env:POSTGRES_PASSWORD = "pass"      # Docker container password
$env:POSTGRES_DB = "legal"           # Docker container database

$env:OLLAMA_URL = "http://localhost:11434"
$env:QDRANT_URL = "http://localhost:6333"
$env:REDIS_URL = "redis://localhost:6379"
$env:MINIO_ENDPOINT = "localhost"
$env:MINIO_PORT = "9000"
$env:LANGEXTRACT_URL = "http://localhost:8095"

Write-Host "`n📋 Environment Configuration:" -ForegroundColor Yellow
Write-Host "   Postgres: $env:POSTGRES_USER@$($env:POSTGRES_HOST):$($env:POSTGRES_PORT)/$($env:POSTGRES_DB)"
Write-Host "   Ollama: $env:OLLAMA_URL (embeddinggemma:latest)"
Write-Host "   Qdrant: $env:QDRANT_URL (surgical_fixes_phase66_85)"
Write-Host "   LangExtract: $env:LANGEXTRACT_URL"

# Verify dependencies
Write-Host "`n🔍 Checking dependencies..." -ForegroundColor Yellow

# Check Ollama
try {
    $ollama = Invoke-RestMethod -Uri "$env:OLLAMA_URL/api/tags" -TimeoutSec 2
    $hasEmbedding = $ollama.models | Where-Object { $_.name -like "*embeddinggemma*" }
    if ($hasEmbedding) {
        Write-Host "   ✅ Ollama: embeddinggemma:latest available" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Ollama: embeddinggemma:latest not found, pulling..." -ForegroundColor Yellow
        ollama pull embeddinggemma:latest
    }
} catch {
    Write-Host "   ❌ Ollama not running at $env:OLLAMA_URL" -ForegroundColor Red
    Write-Host "      Start with: ollama serve" -ForegroundColor Yellow
}

# Check Qdrant
try {
    $qdrant = Invoke-RestMethod -Uri "$env:QDRANT_URL/collections" -TimeoutSec 2
    $hasCollection = $qdrant.result.collections | Where-Object { $_.name -eq "surgical_fixes_phase66_85" }
    if ($hasCollection) {
        Write-Host "   ✅ Qdrant: surgical_fixes_phase66_85 ($($hasCollection.points_count) vectors)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Qdrant: surgical_fixes_phase66_85 not found" -ForegroundColor Yellow
        Write-Host "      Create with: node scripts/ingest-ace-thinking.mjs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Qdrant not running at $env:QDRANT_URL" -ForegroundColor Red
}

# Check Postgres
try {
    $pgTest = docker exec phase66-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Postgres: Connected to $env:POSTGRES_DB" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Postgres connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Docker container 'phase66-postgres' not found" -ForegroundColor Red
}

# Check LangExtract
try {
    $langextract = Invoke-RestMethod -Uri "$env:LANGEXTRACT_URL/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "   ✅ LangExtract: Container running on port 8095" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  LangExtract: Container may be unhealthy (port 8095)" -ForegroundColor Yellow
    $dockerStatus = docker ps --filter "name=langextract" --format "{{.Status}}"
    Write-Host "      Status: $dockerStatus" -ForegroundColor Gray
}

# Check ripgrep
try {
    $rgVersion = rg --version 2>&1 | Select-Object -First 1
    Write-Host "   ✅ Ripgrep: $rgVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ripgrep (rg) not found in PATH" -ForegroundColor Red
    Write-Host "      Install: winget install BurntSushi.ripgrep.MSVC" -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 80)
Write-Host "🚀 Starting FastMCP Server on port 3002..." -ForegroundColor Cyan
Write-Host ""

# Start the server
node scripts/fastmcp-server.mjs
