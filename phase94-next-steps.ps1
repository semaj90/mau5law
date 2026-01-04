#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 94+: Unified AST Graph - Next Steps Execution

.DESCRIPTION
    Complete execution script for phases 94-100 of the unified multi-language AST pipeline

.EXAMPLE
    .\phase94-next-steps.ps1 -Phase 94 -Action Complete
    .\phase94-next-steps.ps1 -Phase 95 -Action Generate
    .\phase94-next-steps.ps1 -Phase All -Action Test
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("94", "95", "96", "100", "All")]
    [string]$Phase = "All",

    [Parameter(Mandatory=$false)]
    [ValidateSet("Test", "Complete", "Generate", "Validate")]
    [string]$Action = "Test"
)

$ErrorActionPreference = "Continue"

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "🚀 Unified AST Graph - Next Steps Execution" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Phase 94: Complete Unified Pipeline
# ============================================================================
function Execute-Phase94 {
    param([string]$Action)

    Write-Host "📊 Phase 94: Unified Multi-Language Pipeline" -ForegroundColor Yellow
    Write-Host ""

    if ($Action -eq "Test") {
        Write-Host "🧪 Testing Phase 94 components..." -ForegroundColor Green

        # Test Redis glyph query
        Write-Host "`n1. Redis Glyph Query:" -ForegroundColor White
        python backend\scripts\phase94_redis_glyph_query.py --stats

        # Test FastMCP registry
        Write-Host "`n2. FastMCP Tool Registry:" -ForegroundColor White
        python backend\scripts\phase94_fastmcp_registry.py --list

        # Test Qdrant collections
        Write-Host "`n3. Qdrant Collections:" -ForegroundColor White
        $response = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method GET
        foreach ($collection in $response.result.collections) {
            Write-Host "   ✅ $($collection.name): $($collection.vectors_count) vectors" -ForegroundColor Green
        }

        # Test Neo4j connection
        Write-Host "`n4. Neo4j Graph:" -ForegroundColor White
        try {
            docker exec phase66-neo4j cypher-shell -u neo4j -p password "MATCH (n) RETURN count(n) as total" 2>$null
            Write-Host "   ✅ Neo4j connected" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Neo4j not available" -ForegroundColor Yellow
        }
    }

    if ($Action -eq "Complete") {
        Write-Host "🔄 Completing Phase 94 unified pipeline..." -ForegroundColor Green

        # Resume embedding from checkpoint
        Write-Host "`n1. Resuming unified embedding (from 4,400/10,320)..." -ForegroundColor White
        python backend\scripts\phase94_unified_pipeline.py

        # Generate recommendations
        Write-Host "`n2. Generating agentic recommendations..." -ForegroundColor White
        # This will be created next
        # python backend\scripts\phase94_generate_recommendations.py

        # Export tool registry
        Write-Host "`n3. Exporting tool registries..." -ForegroundColor White
        python backend\scripts\phase94_fastmcp_registry.py --export-openapi reports\unified-ast-openapi.json
        python backend\scripts\phase94_fastmcp_registry.py --export-mcp reports\unified-ast-mcp.json
    }

    if ($Action -eq "Validate") {
        Write-Host "✅ Validating Phase 94 outputs..." -ForegroundColor Green

        # Check Qdrant collections exist
        $collections = @("phase90_cuda_embeddings", "phase91_go_errors", "phase92_python_errors", "phase94_unified_errors")
        foreach ($col in $collections) {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:6333/collections/$col" -Method GET
                Write-Host "   ✅ $col: $($response.result.points_count) points" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ $col: Not found" -ForegroundColor Red
            }
        }

        # Check Redis keys
        $redisKeys = docker exec phase66-redis redis-cli DBSIZE 2>$null
        Write-Host "   ✅ Redis: $redisKeys keys" -ForegroundColor Green
    }
}

# ============================================================================
# Phase 95: Auto-Generate TypeScript Types
# ============================================================================
function Execute-Phase95 {
    param([string]$Action)

    Write-Host "`n📝 Phase 95: Auto-Generate TypeScript Types" -ForegroundColor Yellow
    Write-Host ""

    if ($Action -eq "Test") {
        Write-Host "🧪 Testing type generation..." -ForegroundColor Green

        # Test Go struct extraction
        Write-Host "`n1. Go struct types:" -ForegroundColor White
        Get-ChildItem -Path go-services -Recurse -Filter "*.go" | Select-Object -First 5 | ForEach-Object {
            Write-Host "   - $($_.FullName)"
        }

        # Test Python Pydantic models
        Write-Host "`n2. Python Pydantic models:" -ForegroundColor White
        Select-String -Path "backend\**\*.py" -Pattern "class.*\(BaseModel\)" | Select-Object -First 5 | ForEach-Object {
            Write-Host "   - $($_.Line.Trim())"
        }
    }

    if ($Action -eq "Generate") {
        Write-Host "🔄 Generating TypeScript types..." -ForegroundColor Green

        Write-Host "`nℹ️  Phase 95 type generation scripts coming in next iteration" -ForegroundColor Cyan
        Write-Host "   Planned tools:" -ForegroundColor White
        Write-Host "   - Go structs → TypeScript (using tygo)" -ForegroundColor Gray
        Write-Host "   - Python Pydantic → TypeScript" -ForegroundColor Gray
        Write-Host "   - OpenAPI → TypeScript (using openapi-typescript)" -ForegroundColor Gray
    }
}

# ============================================================================
# Phase 96: WebGPU + UnoCSS Analysis
# ============================================================================
function Execute-Phase96 {
    param([string]$Action)

    Write-Host "`n🎨 Phase 96: WebGPU + UnoCSS Analysis" -ForegroundColor Yellow
    Write-Host ""

    if ($Action -eq "Test") {
        Write-Host "🧪 Testing WebGPU/UnoCSS detection..." -ForegroundColor Green

        # Check for UnoCSS config
        if (Test-Path "sveltekit-frontend\uno.config.ts") {
            Write-Host "   ✅ UnoCSS config found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  UnoCSS config not found" -ForegroundColor Yellow
        }

        # Check for WebGPU usage
        $webgpuFiles = Select-String -Path "sveltekit-frontend\src\**\*.ts" -Pattern "navigator\.gpu|GPUDevice" -ErrorAction SilentlyContinue
        if ($webgpuFiles) {
            Write-Host "   ✅ WebGPU usage detected" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No WebGPU usage found" -ForegroundColor Yellow
        }
    }
}

# ============================================================================
# Phase 100: Full Agentic Auto-Remediation
# ============================================================================
function Execute-Phase100 {
    param([string]$Action)

    Write-Host "`n🤖 Phase 100: Full Agentic Auto-Remediation" -ForegroundColor Yellow
    Write-Host ""

    if ($Action -eq "Test") {
        Write-Host "🧪 Testing agentic fixer..." -ForegroundColor Green

        # Run dry-run on small batch
        Write-Host "`n1. TypeScript dry-run (10 files):" -ForegroundColor White
        python backend\scripts\phase89_3_agentic_fixer.py --dry-run --limit 10

        Write-Host "`nℹ️  Phase 100 will extend this to all languages" -ForegroundColor Cyan
    }
}

# ============================================================================
# Main Execution
# ============================================================================

if ($Phase -eq "All") {
    Execute-Phase94 -Action $Action
    Execute-Phase95 -Action $Action
    Execute-Phase96 -Action $Action
    Execute-Phase100 -Action $Action
} else {
    switch ($Phase) {
        "94"  { Execute-Phase94 -Action $Action }
        "95"  { Execute-Phase95 -Action $Action }
        "96"  { Execute-Phase96 -Action $Action }
        "100" { Execute-Phase100 -Action $Action }
    }
}

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "✅ Execution Complete" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review unified AST graph usage guide: docs\UNIFIED_AST_GRAPH_USAGE_GUIDE.md" -ForegroundColor White
Write-Host "   2. Test FastMCP tools: python backend\scripts\phase94_fastmcp_registry.py --list" -ForegroundColor White
Write-Host "   3. Query Redis glyphs: python backend\scripts\phase94_redis_glyph_query.py --cluster 0" -ForegroundColor White
Write-Host "   4. Complete Phase 94 embedding: .\phase94-next-steps.ps1 -Phase 94 -Action Complete" -ForegroundColor White
Write-Host ""
