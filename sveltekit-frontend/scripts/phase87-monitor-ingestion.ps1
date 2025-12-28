#!/usr/bin/env pwsh
<#
.SYNOPSIS
Monitor Phase 87 embedding generation progress in real-time

.DESCRIPTION
Two parallel monitors:
1. Database vector count (updates every 10s)
2. Ollama health check (embeddinggemma availability)

Run this in a second PowerShell window while Phase 87 is ingesting.
#>

$ErrorActionPreference = "Continue"

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📊 Phase 87: Live Embedding Monitor" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$ollamaRunning = $false
$postgresRunning = $false

try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 -ErrorAction SilentlyContinue
    $ollamaRunning = $true
    Write-Host "✅ Ollama: Running" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama: Not accessible" -ForegroundColor Red
}

try {
    $pgCheck = docker exec phase66-postgres psql -U user -d legal -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $postgresRunning = $true
        Write-Host "✅ Postgres: Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Postgres: Not accessible (credentials may be wrong)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Postgres: Docker container not found" -ForegroundColor Red
}

if (-not $ollamaRunning -or -not $postgresRunning) {
    Write-Host ""
    Write-Host "⚠️ Some services are unavailable. Monitoring will be limited." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Monitoring started at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$iteration = 0
$lastVectorCount = 0
$stalledCount = 0

while ($true) {
    $iteration++
    $timestamp = Get-Date -Format "HH:mm:ss"

    Write-Host "[$timestamp] Check #$iteration" -ForegroundColor Cyan

    # ========================================================================
    # Monitor 1: Database Vector Count
    # ========================================================================

    if ($postgresRunning) {
        try {
            $result = docker exec phase66-postgres psql -U user -d legal -t -c "SELECT COUNT(*) FROM error_embeddings" 2>&1

            if ($LASTEXITCODE -eq 0) {
                $vectorCount = [int]($result.Trim())
                $delta = $vectorCount - $lastVectorCount

                if ($delta -gt 0) {
                    Write-Host "   📊 Vectors: $vectorCount (+$delta)" -ForegroundColor Green
                    $stalledCount = 0
                } elseif ($vectorCount -eq $lastVectorCount -and $vectorCount -gt 0) {
                    $stalledCount++
                    Write-Host "   ⏸️  Vectors: $vectorCount (stalled $stalledCount × 10s)" -ForegroundColor Yellow

                    if ($stalledCount -ge 12) {
                        Write-Host ""
                        Write-Host "   ⚠️  ALERT: Vector count hasn't changed in 2 minutes!" -ForegroundColor Red
                        Write-Host "   Possible causes:" -ForegroundColor Yellow
                        Write-Host "      - Ollama queue backed up" -ForegroundColor Gray
                        Write-Host "      - Batch size too large for your machine" -ForegroundColor Gray
                        Write-Host "      - Request timeout (check Phase 87 terminal)" -ForegroundColor Gray
                        Write-Host ""
                    }
                } else {
                    Write-Host "   📊 Vectors: $vectorCount" -ForegroundColor Cyan
                }

                $lastVectorCount = $vectorCount

                # Calculate progress (assuming target is 5000)
                $targetVectors = 5000
                $progress = [Math]::Round(($vectorCount / $targetVectors) * 100, 1)
                $progressBar = "#" * [Math]::Floor($progress / 2)
                $progressBar = $progressBar.PadRight(50)

                Write-Host "   [$progressBar] $progress%" -ForegroundColor Gray

            } else {
                Write-Host "   ❌ Failed to query error_embeddings table" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ❌ DB query failed: $_" -ForegroundColor Red
        }
    }

    # ========================================================================
    # Monitor 2: Ollama Health
    # ========================================================================

    if ($ollamaRunning) {
        try {
            $models = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3
            $embeddingModel = $models.models | Where-Object { $_.name -match "embeddinggemma" } | Select-Object -First 1

            if ($embeddingModel) {
                $modelName = $embeddingModel.name
                $modelSize = [Math]::Round($embeddingModel.size / 1GB, 2)
                Write-Host "   🧠 Model: $modelName ($modelSize GB)" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  embeddinggemma:latest not found in Ollama" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠️  Ollama health check timeout" -ForegroundColor Yellow
        }
    }

    # ========================================================================
    # Monitor 3: System Resources (optional)
    # ========================================================================

    $memUsage = Get-Process -Name ollama -ErrorAction SilentlyContinue | Select-Object -ExpandProperty WorkingSet64 -ErrorAction SilentlyContinue
    if ($memUsage) {
        $memGB = [Math]::Round($memUsage / 1GB, 2)
        Write-Host "   💾 Ollama RAM: $memGB GB" -ForegroundColor Gray
    }

    Write-Host ""

    # Wait 10 seconds
    Start-Sleep -Seconds 10
}
