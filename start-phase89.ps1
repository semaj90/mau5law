#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 89: Master Start Script
.DESCRIPTION
    Orchestrates complete Phase 89 setup:
    1. Start dependencies (hardened, no rebuilds)
    2. Verify connections
    3. Apply schema (if needed)
    4. Build knowledge graph (if needed)
    5. Launch visualization
#>

param(
  [switch]$SkipBuild,
  [switch]$SkipUI,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Phase($msg) { Write-Host "`n====== $msg ======" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info($msg)  { Write-Host "ℹ️  $msg" -ForegroundColor Gray }

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              🚀 Phase 89: Complete System Startup            ║
║                                                               ║
║  Deliverable 1: Safeguarded Dependency Startup               ║
║  Deliverable 2: Agentic Error Analysis Map                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ---- Phase 1: Start Dependencies ----
Write-Phase "Phase 1: Starting Dependencies (Hardened Mode)"

$kpPath = "go-services\knowledge-plane"
if (-not (Test-Path $kpPath)) {
  Write-Err "Knowledge plane directory not found: $kpPath"
  Write-Info "Expected location: C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane"
  exit 1
}

Push-Location $kpPath
try {
  Write-Info "Running hardened startup (no rebuilds)..."
  .\run-safe-hardened.ps1
  if ($LASTEXITCODE -ne 0) {
    throw "Hardened startup failed"
  }
  Write-Ok "Dependencies started"
} catch {
  Write-Err "Failed to start dependencies: $($_.Exception.Message)"
  Pop-Location
  exit 1
} finally {
  Pop-Location
}

Start-Sleep -Seconds 3

# ---- Phase 2: Verify Connections ----
Write-Phase "Phase 2: Verifying Connections"

$checks = @(
  @{
    Name = "PostgreSQL"
    Test = { docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1;" 2>&1 | Out-Null }
  },
  @{
    Name = "Qdrant"
    Test = { Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -TimeoutSec 5 | Out-Null }
  },
  @{
    Name = "Redis"
    Test = { docker exec phase66-redis redis-cli ping 2>&1 | Out-Null }
  },
  @{
    Name = "Ollama"
    Test = { Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5 | Out-Null }
  }
)

$allOk = $true
foreach ($check in $checks) {
  try {
    & $check.Test
    Write-Ok "$($check.Name) connected"
  } catch {
    Write-Warn "$($check.Name) not reachable: $($_.Exception.Message)"
    $allOk = $false
  }
}

if (-not $allOk) {
  Write-Warn "Some services not reachable. Wait 10 seconds and try again, or check logs."
  Write-Info "Continue anyway? (Y/N)"
  $response = Read-Host
  if ($response -ne "Y" -and $response -ne "y") {
    Write-Info "Aborted by user"
    exit 1
  }
}

# ---- Phase 3: Schema Setup ----
Write-Phase "Phase 3: Database Schema"

Push-Location "sveltekit-frontend"
try {
  # Check if schema already applied
  $tables = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "\dt" 2>&1
  $hasSchema = $tables -match "kg_nodes" -and $tables -match "kg_edges"

  if ($hasSchema -and -not $Force) {
    Write-Ok "Schema already exists (use -Force to reapply)"
  } else {
    if ($hasSchema) {
      Write-Warn "Dropping existing schema (forced)..."
      docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "DROP TABLE IF EXISTS kg_edges, kg_nodes, file_index, error_embeddings, fix_patterns CASCADE;" 2>&1 | Out-Null
    }

    Write-Info "Applying Phase 89 schema..."
    $schemaPath = "migrations\phase89-error-graph-schema.sql"
    if (-not (Test-Path $schemaPath)) {
      Write-Err "Schema file not found: $schemaPath"
      Pop-Location
      exit 1
    }

    Get-Content $schemaPath | docker exec -i phase66-postgres psql -U legal_admin -d legal_ai_db 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Schema application failed"
    }
    Write-Ok "Schema applied"
  }
} catch {
  Write-Err "Schema setup failed: $($_.Exception.Message)"
  Pop-Location
  exit 1
}

# ---- Phase 4: Build Knowledge Graph ----
Write-Phase "Phase 4: Knowledge Graph"

if ($SkipBuild) {
  Write-Warn "Skipping graph build (use without -SkipBuild to build)"
} else {
  # Check if graph already built
  $nodeCount = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM kg_nodes;" 2>&1
  $nodeCount = $nodeCount.Trim()

  if ([int]$nodeCount -gt 10 -and -not $Force) {
    Write-Ok "Graph already built ($nodeCount nodes, use -Force to rebuild)"
  } else {
    Write-Info "Building knowledge graph (this may take 2-5 minutes)..."
    Write-Info "Progress:"
    Write-Info "  1. Parsing TypeScript/Svelte files with ts-morph"
    Write-Info "  2. Extracting symbols, imports, exports"
    Write-Info "  3. Linking errors to code"
    Write-Info "  4. Generating embeddings (768-dim)"
    Write-Info "  5. Uploading to Qdrant + Redis"

    node scripts\phase89-error-map-builder.mjs
    if ($LASTEXITCODE -ne 0) {
      Write-Err "Graph build failed"
      Pop-Location
      exit 1
    }

    # Verify build
    $newNodeCount = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM kg_nodes;" 2>&1
    $newNodeCount = $newNodeCount.Trim()
    Write-Ok "Graph built: $newNodeCount nodes"
  }
}

# ---- Phase 5: Launch Visualization ----
Write-Phase "Phase 5: Visualization"

if ($SkipUI) {
  Write-Warn "Skipping UI (use without -SkipUI to launch)"
  Write-Info "Start manually with: npm run dev"
} else {
  Write-Info "Starting dev server..."
  Write-Info "Visualization will be available at: http://localhost:5175/phase89/error-map"
  Write-Info ""
  Write-Info "Press Ctrl+C to stop the server when done."
  Write-Info ""

  # Check if dev server already running
  try {
    Invoke-WebRequest -Uri "http://localhost:5175" -UseBasicParsing -TimeoutSec 2 | Out-Null
    Write-Warn "Dev server already running on port 5175"
    Write-Info "Open: http://localhost:5175/phase89/error-map"
  } catch {
    # Start dev server
    npm run dev
  }
}

Pop-Location

# ---- Summary ----
Write-Phase "Phase 89: Ready!"

Write-Host @"

✅ All systems operational!

📦 Containers:
   - phase66-postgres (5434)
   - phase66-qdrant (6333)
   - phase66-redis (6379)
   - phase66-minio (9000-9001)

📊 Knowledge Graph:
   - Nodes: $(docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM kg_nodes;" 2>&1 | ForEach-Object Trim)
   - Edges: $(docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM kg_edges;" 2>&1 | ForEach-Object Trim)

🌐 Visualization:
   http://localhost:5175/phase89/error-map

🔍 Query Interface:
   cd sveltekit-frontend
   node scripts\phase89-error-map-query.mjs "TS1005"

📚 Documentation:
   - PHASE89_EXECUTIVE_SUMMARY.md (start here)
   - PHASE89_COMPLETE_SUMMARY.md (full details)
   - PHASE89_QUICK_REFERENCE.md (cheat sheet)

"@ -ForegroundColor Green

Write-Host "Happy error hunting! 🎯" -ForegroundColor Cyan
