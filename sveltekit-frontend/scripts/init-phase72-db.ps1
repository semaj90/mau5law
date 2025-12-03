#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Initialize Phase 72 tables in legal_ai_db

.DESCRIPTION
    Applies the phase72_topology_schema.sql to legal_ai_db

.EXAMPLE
    .\init-phase72-db.ps1 -Verify
#>

Param(
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      Phase 72 DB Init – legal_ai_db (Postgres)      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Locate repo + schema file
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Resolve-Path (Join-Path $scriptDir "..\..")
$sqlPath   = Join-Path $repoRoot "backend\sql\phase72_topology_schema.sql"

if (-not (Test-Path $sqlPath)) {
    Write-Host "❌ Could not find schema file at: $sqlPath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Using schema file:" -NoNewline
Write-Host " $sqlPath" -ForegroundColor Yellow

$env:PGPASSWORD = "postgres"

function Invoke-Phase72Schema {
    param(
        [string]$HostName,
        [int]$Port = 5432
    )

    Write-Host ""
    Write-Host "🗄  Applying schema to legal_ai_db via ${HostName}:${Port} ..." -ForegroundColor Cyan

    & psql `
        -h $HostName `
        -p $Port `
        -U postgres `
        -d legal_ai_db `
        -f $sqlPath

    if ($LASTEXITCODE -ne 0) {
        throw "psql returned exit code $LASTEXITCODE"
    }
}

try {
    # Try host Postgres first (Windows native)
    Invoke-Phase72Schema -HostName "localhost"
} catch {
    Write-Host "⚠️  Host psql failed, trying Docker container phase66-postgres..." -ForegroundColor Yellow

    try {
        Get-Content $sqlPath | docker exec -i phase66-postgres psql -U postgres -d legal_ai_db -f -

        if ($LASTEXITCODE -ne 0) {
            throw "docker exec psql returned exit code $LASTEXITCODE"
        }
    } catch {
        Write-Host "❌ Failed to apply schema via both localhost and Docker." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Phase 72 schema applied to legal_ai_db" -ForegroundColor Green

if ($Verify) {
    Write-Host ""
    Write-Host "🔍 Verifying phase72_* tables..." -ForegroundColor Cyan

    & psql `
        -h localhost `
        -p 5432 `
        -U postgres `
        -d legal_ai_db `
        -c "\dt phase72_*"

    Write-Host ""
    Write-Host "🔍 Checking row counts..." -ForegroundColor Cyan

    & psql `
        -h localhost `
        -p 5432 `
        -U postgres `
        -d legal_ai_db `
        -c "SELECT 'phase72_error' AS table, COUNT(*) FROM phase72_error UNION ALL SELECT 'phase72_error_vector', COUNT(*) FROM phase72_error_vector UNION ALL SELECT 'phase72_cluster', COUNT(*) FROM phase72_cluster UNION ALL SELECT 'phase72_cluster_summary', COUNT(*) FROM phase72_cluster_summary;"
}

Write-Host ""
Write-Host "🎉 Phase 72 DB initialization complete." -ForegroundColor Green
