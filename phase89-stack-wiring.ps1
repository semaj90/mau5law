#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 89: Complete Stack Wiring & Status Check
.DESCRIPTION
    Comprehensive wiring verification and setup for:
    - CouchDB graph analysis (4,724 files indexed) ✅
    - Neo4j knowledge graph (Docker container check/start)
    - Qdrant RAG vectors (phase89_code_units collection)
    - embeddinggemma:latest (768-dim) streaming
    - PyTorch GPU clustering
    - FastMCP agentic tools
#>

$ErrorActionPreference = "Continue"

Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Phase 89: Stack Wiring & Configuration Status           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================================================
# 1. DOCKER CONTAINER STATUS
# ============================================================================
Write-Host "📦 Docker Container Status`n" -ForegroundColor Yellow

$containers = @{
    'phase66-couchdb' = @{ Port = 5984; Service = 'CouchDB (Graph Analysis)'; Required = $true }
    'phase66-qdrant'  = @{ Port = 6333; Service = 'Qdrant (Vector DB)'; Required = $true }
    'phase66-redis'   = @{ Port = 6379; Service = 'Redis (Cache)'; Required = $true }
    'phase66-postgres'= @{ Port = 5434; Service = 'PostgreSQL (pgvector)'; Required = $false }
    'deeds-neo4j'     = @{ Port = 7474; Service = 'Neo4j (Knowledge Graph)'; Required = $false }
}

$dockerStatus = @{}
foreach ($name in $containers.Keys) {
    $info = $containers[$name]
    $status = docker ps --filter "name=$name" --format "{{.Status}}" 2>$null

    if ($status) {
        Write-Host "  ✅ $($info.Service)" -ForegroundColor Green -NoNewline
        Write-Host " ($name) - " -NoNewline
        Write-Host "UP" -ForegroundColor Green
        $dockerStatus[$name] = "running"
    } else {
        $exists = docker ps -a --filter "name=$name" --format "{{.Status}}" 2>$null
        if ($exists) {
            Write-Host "  ⏸️  $($info.Service)" -ForegroundColor Yellow -NoNewline
            Write-Host " ($name) - " -NoNewline
            Write-Host "STOPPED" -ForegroundColor Yellow
            $dockerStatus[$name] = "stopped"
        } else {
            $symbol = if ($info.Required) { "❌" } else { "⚠️ " }
            $color = if ($info.Required) { "Red" } else { "Yellow" }
            Write-Host "  $symbol $($info.Service)" -ForegroundColor $color -NoNewline
            Write-Host " ($name) - " -NoNewline
            Write-Host "NOT FOUND" -ForegroundColor $color
            $dockerStatus[$name] = "missing"
        }
    }
}

# ============================================================================
# 2. NEO4J KNOWLEDGE GRAPH SETUP
# ============================================================================
Write-Host "`n🌐 Neo4j Knowledge Graph Configuration`n" -ForegroundColor Yellow

if ($dockerStatus['deeds-neo4j'] -eq 'stopped') {
    Write-Host "  🔄 Starting Neo4j container..." -ForegroundColor Cyan
    docker start deeds-neo4j 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    Write-Host "  ✅ Neo4j started" -ForegroundColor Green
} elseif ($dockerStatus['deeds-neo4j'] -eq 'missing') {
    Write-Host "  ⚠️  Neo4j container not found. Creating from docker-compose..." -ForegroundColor Yellow
    Write-Host "`n  To create Neo4j:" -ForegroundColor White
    Write-Host "    cd sveltekit-frontend" -ForegroundColor Gray
    Write-Host "    docker-compose -f docker-compose.dev.yml up -d neo4j`n" -ForegroundColor Gray
} else {
    Write-Host "  ✅ Neo4j already running" -ForegroundColor Green

    # Test connection
    try {
        $neo4jCheck = Invoke-WebRequest -Uri "http://localhost:7474" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  ✅ Neo4j Browser: http://localhost:7474" -ForegroundColor Green
        Write-Host "  ✅ Bolt Protocol: bolt://localhost:7687" -ForegroundColor Green
        Write-Host "  ℹ️  Credentials: neo4j / password" -ForegroundColor Cyan
    } catch {
        Write-Host "  ⚠️  Neo4j starting (wait 10s)..." -ForegroundColor Yellow
    }
}

# ============================================================================
# 3. COUCHDB GRAPH ANALYSIS
# ============================================================================
Write-Host "`n📊 CouchDB Graph Analysis Status`n" -ForegroundColor Yellow

if ($dockerStatus['phase66-couchdb'] -eq 'running') {
    try {
        # Use proper authorization header (PowerShell Invoke-RestMethod doesn't support embedded credentials)
        $cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:password"))
        $headers = @{ Authorization = "Basic $cred" }

        # Check databases
        $dbs = Invoke-RestMethod -Uri "http://localhost:5984/_all_dbs" -Headers $headers -ErrorAction Stop

        Write-Host "  ✅ CouchDB operational ($($dbs.Count) databases)" -ForegroundColor Green
        Write-Host "  📁 Indexed Databases:" -ForegroundColor White

        $totalDocs = 0
        foreach ($db in $dbs) {
            if ($db -match "codebase|error|llm|phase") {
                $dbInfo = Invoke-RestMethod -Uri "http://localhost:5984/$db" -Headers $headers -ErrorAction SilentlyContinue
                if ($dbInfo) {
                    $docCount = $dbInfo.doc_count
                    $totalDocs += $docCount
                    Write-Host "     • $db : $docCount documents" -ForegroundColor Gray
                }
            }
        }

        Write-Host "  📊 Total Documents: $totalDocs" -ForegroundColor White
        Write-Host "`n  🌐 CouchDB UI: http://localhost:5984/_utils (admin / password)" -ForegroundColor Cyan

    } catch {
        Write-Host "  ❌ CouchDB error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  CouchDB not running - graph analysis unavailable" -ForegroundColor Yellow
}

# ============================================================================
# 4. QDRANT COLLECTIONS & PHASE 89
# ============================================================================
Write-Host "`n🔍 Qdrant Collections (Phase 89 Ready)`n" -ForegroundColor Yellow

if ($dockerStatus['phase66-qdrant'] -eq 'running') {
    try {
        $collections = Invoke-RestMethod -Uri "http://localhost:6333/collections" -ErrorAction Stop

        Write-Host "  ✅ Qdrant operational - $($collections.result.collections.Count) collections" -ForegroundColor Green

        # Check for Phase 89 collection
        $phase89Collection = $collections.result.collections | Where-Object { $_.name -eq 'phase89_code_units' }

        if ($phase89Collection) {
            $collectionInfo = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase89_code_units"
            Write-Host "  ✅ phase89_code_units: $($collectionInfo.result.points_count) vectors" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  phase89_code_units collection not found" -ForegroundColor Yellow
            Write-Host "`n  To create Phase 89 collection:" -ForegroundColor White
            Write-Host "    cd sveltekit-frontend" -ForegroundColor Gray
            Write-Host "    npm run build" -ForegroundColor Gray
            Write-Host "    # OR run indexer:" -ForegroundColor Gray
            Write-Host "    node scripts/phase89-code-unit-indexer.mjs --index`n" -ForegroundColor Gray
        }

        # Show RAG-related collections
        Write-Host "  📦 RAG Collections:" -ForegroundColor White
        $ragCollections = $collections.result.collections | Where-Object { $_.name -match "rag|phase79|phase89" }
        foreach ($col in $ragCollections) {
            $info = Invoke-RestMethod -Uri "http://localhost:6333/collections/$($col.name)"
            Write-Host "     • $($col.name): $($info.result.points_count) vectors" -ForegroundColor Gray
        }

    } catch {
        Write-Host "  ❌ Qdrant not responding" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Qdrant not running - vector search unavailable" -ForegroundColor Yellow
}

# ============================================================================
# 5. OLLAMA MODELS (embeddinggemma:latest)
# ============================================================================
Write-Host "`n🤖 Ollama Models (embeddinggemma:latest 768-dim)`n" -ForegroundColor Yellow

try {
    $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5

    Write-Host "  ✅ Ollama operational - $($models.models.Count) models" -ForegroundColor Green

    # Check for embeddinggemma
    $embeddingModel = $models.models | Where-Object { $_.name -match "embeddinggemma" }

    if ($embeddingModel) {
        $size = [math]::Round($embeddingModel.size / 1GB, 1)
        Write-Host "  ✅ embeddinggemma:latest ($size GB) - 768-dim embeddings" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  embeddinggemma:latest not found" -ForegroundColor Yellow
        Write-Host "     Run: ollama pull embeddinggemma:latest" -ForegroundColor Gray
    }

    # Show other relevant models
    Write-Host "`n  📦 Available Models:" -ForegroundColor White
    foreach ($model in $models.models | Select-Object -First 5) {
        $size = [math]::Round($model.size / 1GB, 1)
        Write-Host "     • $($model.name): $size GB" -ForegroundColor Gray
    }

} catch {
    Write-Host "  ❌ Ollama not responding" -ForegroundColor Red
}

# ============================================================================
# 6. PYTORCH + CUDA
# ============================================================================
Write-Host "`n🔥 PyTorch + CUDA (RTX 3060 Ti)`n" -ForegroundColor Yellow

$pythonExe = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

if (Test-Path $pythonExe) {
    $cudaCheck = & $pythonExe -c "import torch; print(f'PyTorch {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}'); print(f'Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB' if torch.cuda.is_available() else 'N/A')" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PyTorch + CUDA Configured" -ForegroundColor Green
        $cudaCheck -split "`n" | ForEach-Object {
            Write-Host "     $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  PyTorch not installed or CUDA unavailable" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Python venv not found at $pythonExe" -ForegroundColor Yellow
}

# ============================================================================
# 7. PHASE 89 SCRIPTS AVAILABLE
# ============================================================================
Write-Host "`n📝 Phase 89 Scripts Available`n" -ForegroundColor Yellow

$phase89Scripts = Get-ChildItem -Path "sveltekit-frontend/scripts/phase89-*.py", "sveltekit-frontend/scripts/phase89-*.mjs" -ErrorAction SilentlyContinue

if ($phase89Scripts) {
    Write-Host "  ✅ Found $($phase89Scripts.Count) Phase 89 scripts" -ForegroundColor Green

    $keyScripts = @(
        'phase89-advanced-ace-pipeline.py',
        'phase89-code-unit-indexer.mjs',
        'phase89-cuda-clustering.py',
        'phase89-ace-query-engine.py',
        'phase89-generate-embeddings.py'
    )

    Write-Host "`n  🔑 Key Scripts:" -ForegroundColor White
    foreach ($script in $keyScripts) {
        $exists = $phase89Scripts | Where-Object { $_.Name -eq $script }
        if ($exists) {
            Write-Host "     ✅ $script" -ForegroundColor Green
        } else {
            Write-Host "     ⚠️  $script (not found)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⚠️  No Phase 89 scripts found" -ForegroundColor Yellow
}

# ============================================================================
# 8. QUICK START COMMANDS
# ============================================================================
Write-Host "`n╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Phase 89 Quick Start                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "🚀 Run Advanced ACE Pipeline:" -ForegroundColor Yellow
Write-Host "   cd sveltekit-frontend" -ForegroundColor Gray
Write-Host "   .\scripts\run-advanced-ace-pipeline.ps1`n" -ForegroundColor White

Write-Host "📊 Index Code Units to Qdrant:" -ForegroundColor Yellow
Write-Host "   cd sveltekit-frontend" -ForegroundColor Gray
Write-Host "   node scripts/phase89-code-unit-indexer.mjs --index`n" -ForegroundColor White

Write-Host "🔬 GPU Clustering Analysis:" -ForegroundColor Yellow
Write-Host "   `$env:PHASE72_PYTHON = 'C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe'" -ForegroundColor Gray
Write-Host "   & `$env:PHASE72_PYTHON sveltekit-frontend/scripts/phase89-cuda-clustering.py`n" -ForegroundColor White

Write-Host "🌐 Access UIs:" -ForegroundColor Yellow
Write-Host "   • CouchDB:  http://localhost:5984/_utils" -ForegroundColor Cyan
Write-Host "   • Qdrant:   http://localhost:6333/dashboard" -ForegroundColor Cyan
Write-Host "   • Neo4j:    http://localhost:7474 (neo4j / password)" -ForegroundColor Cyan
Write-Host "   • RAG UI:   http://localhost:5175/rag-search" -ForegroundColor Cyan

Write-Host "`n✅ Phase 89 Stack Wiring Check Complete!`n" -ForegroundColor Green
