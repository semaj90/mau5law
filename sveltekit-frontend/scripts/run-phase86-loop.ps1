#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run Phase 86 Autonomous Loop with pinned database configuration

.DESCRIPTION
    Sets environment variables to force connection to Docker PostgreSQL on port 5434,
    then starts the autonomous error-fixing loop.

.EXAMPLE
    .\scripts\run-phase86-loop.ps1
#>

Write-Host "🚀 Phase 86 Autonomous Loop - Starting" -ForegroundColor Cyan
Write-Host ""

# Pin PostgreSQL configuration (avoid Windows local DB on 5432)
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5434"
$env:PGDATABASE = "legal"
$env:PGUSER = "user"
$env:PGPASSWORD = "pass"

Write-Host "📊 Database Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $env:PGHOST"
Write-Host "   Port: $env:PGPORT"
Write-Host "   Database: $env:PGDATABASE"
Write-Host "   User: $env:PGUSER"
Write-Host ""

# Verify Docker container is running
Write-Host "🔍 Checking Docker PostgreSQL container..." -ForegroundColor Yellow
$container = docker ps --filter "name=phase66-postgres" --format "{{.Names}}"
if ($container -eq "phase66-postgres") {
    Write-Host "   ✅ phase66-postgres is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ phase66-postgres is NOT running!" -ForegroundColor Red
    Write-Host "   Run: docker start phase66-postgres" -ForegroundColor Yellow
    exit 1
}

# Test database connection
Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
$testResult = docker exec -i phase66-postgres psql -U user -d legal -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database connection failed!" -ForegroundColor Red
    Write-Host "   Error: $testResult" -ForegroundColor Red
    exit 1
}

# Check if FastMCP server is running on port 3002
Write-Host "🔍 Checking FastMCP server on port 3002..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/health" -Method Get -ErrorAction Stop
    if ($health.ok) {
        Write-Host "   ✅ FastMCP server is healthy ($($health.tools) tools)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  FastMCP server NOT running on port 3002" -ForegroundColor Yellow
    Write-Host "   The loop will auto-start it, but you can start it manually:" -ForegroundColor Yellow
    Write-Host "   node scripts/fastmcp-server.mjs" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "♾️  Starting Autonomous Loop..." -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Run the loop
node scripts/phase86-autonomous-loop.mjs
