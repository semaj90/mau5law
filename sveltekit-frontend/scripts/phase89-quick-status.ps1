#!/usr/bin/env pwsh

<#
.SYNOPSIS
  Phase 89: Quick System Status Check

.DESCRIPTION
  Fast status check for all Phase 89 components
#>

Write-Host "🔍 Phase 89: Quick Status Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Containers
Write-Host "🐳 Docker Containers:" -ForegroundColor Yellow
$containers = @("phase66-postgres", "phase66-redis", "ollama-gemma")
foreach ($c in $containers) {
    $status = docker ps --filter "name=$c" --format "{{.Status}}" 2>$null
    if ($status) {
        Write-Host "   ✅ $c - Running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $c - Stopped" -ForegroundColor Red
    }
}
Write-Host ""

# Database counts
Write-Host "📊 Database Stats:" -ForegroundColor Yellow
try {
    $result = docker exec phase66-postgres psql -U user -d legal -t -c "
        SELECT
            COUNT(*) FILTER (WHERE source='tsc' AND embedding IS NOT NULL) as tsc,
            COUNT(*) FILTER (WHERE source='svelte-check' AND embedding IS NOT NULL) as svelte,
            COUNT(*) as total
        FROM raw_error_embeddings
    " 2>$null | Select-String -Pattern '\d+' -AllMatches

    $counts = $result.Matches.Value
    if ($counts.Count -ge 3) {
        Write-Host "   TSC embedded:          $($counts[0])" -ForegroundColor White
        Write-Host "   Svelte embedded:       $($counts[1])" -ForegroundColor White
        Write-Host "   Total errors:          $($counts[2])" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Cannot query database" -ForegroundColor Red
}
Write-Host ""

# Redis cache
Write-Host "💾 Redis Cache:" -ForegroundColor Yellow
try {
    $keys = docker exec phase66-redis redis-cli DBSIZE 2>$null
    Write-Host "   Total keys: $keys" -ForegroundColor White
} catch {
    Write-Host "   ❌ Cannot query Redis" -ForegroundColor Red
}
Write-Host ""

# MCP Server
Write-Host "🔌 MCP Server:" -ForegroundColor Yellow
$mcpProcess = Get-Process | Where-Object {$_.CommandLine -like '*phase89-fastmcp-tools*'} 2>$null
if ($mcpProcess) {
    Write-Host "   ✅ Running (PID: $($mcpProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Not running" -ForegroundColor Red
}
Write-Host ""

# Re-embedding process
Write-Host "🔄 Re-embedding Process:" -ForegroundColor Yellow
$reembedProcess = Get-Process | Where-Object {$_.CommandLine -like '*phase89-robust-reembed*'} 2>$null
if ($reembedProcess) {
    Write-Host "   ✅ Running (PID: $($reembedProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ⏸️  Not running" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ Status check complete!" -ForegroundColor Green
