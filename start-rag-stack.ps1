#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start the complete RAG/KAG stack

.DESCRIPTION
    Launches all services needed for the custom RAG system:
    - SvelteKit dev server (port 5175)
    - FastAPI backend (optional, port 8000)

    Prerequisites (should already be running):
    - Qdrant (port 6333)
    - Ollama (port 11434)
    - CouchDB (port 5984)
    - PostgreSQL (port 5432)
    - Redis (port 6379)

.EXAMPLE
    .\start-rag-stack.ps1
#>

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 69)
Write-Host "🚀 Starting Custom RAG/KAG Stack" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 69)

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow

$services = @(
    @{Name="Qdrant"; Port=6333; Required=$true},
    @{Name="Ollama"; Port=11434; Required=$true},
    @{Name="CouchDB"; Port=5984; Required=$true},
    @{Name="PostgreSQL"; Port=5432; Required=$false},
    @{Name="Redis"; Port=6379; Required=$false}
)

$allGood = $true
foreach ($service in $services) {
    $connection = Test-NetConnection -ComputerName localhost -Port $service.Port -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($connection) {
        Write-Host "  ✅ $($service.Name) (port $($service.Port))" -ForegroundColor Green
    } elseif ($service.Required) {
        Write-Host "  ❌ $($service.Name) (port $($service.Port)) - REQUIRED" -ForegroundColor Red
        $allGood = $false
    } else {
        Write-Host "  ⚠️  $($service.Name) (port $($service.Port)) - Optional" -ForegroundColor Yellow
    }
}

if (-not $allGood) {
    Write-Host "`n❌ Missing required services. Please start them first." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All required services are running!" -ForegroundColor Green

# Start SvelteKit dev server
Write-Host "`n🌐 Starting SvelteKit dev server (port 5175)..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:5175" -ForegroundColor Gray
Write-Host "   RAG Search: http://localhost:5175/rag-search" -ForegroundColor Gray

Set-Location "$PSScriptRoot\sveltekit-frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n🚀 Starting dev server..." -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start the dev server
npm run dev
