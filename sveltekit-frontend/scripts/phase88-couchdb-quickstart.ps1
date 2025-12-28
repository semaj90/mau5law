<#
.SYNOPSIS
Phase 88: CouchDB RAG+KAG Integration - Quick Start

.DESCRIPTION
Automated deployment script for CouchDB Python middleware integration
- Starts CouchDB container
- Creates databases
- Validates connectivity
- Prepares Python service directory structure
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipPython
)

Write-Host "`n🚀 Phase 88: CouchDB RAG+KAG Integration - Quick Start`n" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Start CouchDB Container
# ============================================================================

if (-not $SkipDocker) {
    Write-Host "1️⃣  Starting CouchDB Container..." -ForegroundColor Yellow
    Write-Host ""

    # Check if container exists
    $existing = docker ps -a --filter "name=phase87-couchdb" --format "{{.Names}}"

    if ($existing) {
        Write-Host "   ℹ️  CouchDB container exists: $existing" -ForegroundColor Gray

        # Check if running
        $running = docker ps --filter "name=phase87-couchdb" --format "{{.Names}}"

        if ($running) {
            Write-Host "   ✅ CouchDB already running" -ForegroundColor Green
        } else {
            Write-Host "   🔄 Starting existing container..." -ForegroundColor Gray
            docker start phase87-couchdb | Out-Null
            Start-Sleep -Seconds 3
            Write-Host "   ✅ CouchDB started" -ForegroundColor Green
        }
    } else {
        Write-Host "   📦 Creating new CouchDB container..." -ForegroundColor Gray

        docker run -d `
            --name phase87-couchdb `
            --network deeds-web-app_legal-ai-network `
            -p 5984:5984 `
            -e COUCHDB_USER=admin `
            -e COUCHDB_PASSWORD=legal_ai_pass `
            -v couchdb_data:/opt/couchdb/data `
            couchdb:3.3 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ CouchDB container created" -ForegroundColor Green
            Write-Host "   ⏳ Waiting for CouchDB to initialize (10 seconds)..." -ForegroundColor Gray
            Start-Sleep -Seconds 10
        } else {
            Write-Host "   ❌ Failed to create CouchDB container" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ""
}

# ============================================================================
# STEP 2: Verify CouchDB Connectivity
# ============================================================================

Write-Host "2️⃣  Verifying CouchDB Connectivity..." -ForegroundColor Yellow
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:5984/_up" -Method Get -TimeoutSec 5

    if ($health.status -eq "ok") {
        Write-Host "   ✅ CouchDB health check passed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CouchDB health check returned: $($health.status)" -ForegroundColor Yellow
    }

    # Get CouchDB info
    $info = Invoke-RestMethod -Uri "http://admin:legal_ai_pass@127.0.0.1:5984/" -Method Get -TimeoutSec 5
    Write-Host "   📊 Version: $($info.version)" -ForegroundColor Gray
    Write-Host "   📊 Vendor: $($info.vendor.name)" -ForegroundColor Gray

} catch {
    Write-Host "   ❌ Failed to connect to CouchDB: $_" -ForegroundColor Red
    Write-Host "   💡 Try: docker logs phase87-couchdb" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 3: Create Databases
# ============================================================================

Write-Host "3️⃣  Creating Databases..." -ForegroundColor Yellow
Write-Host ""

$databases = @(
    @{
        name = "error_analysis_kb"
        description = "Error analysis sessions with LLM synthesis results"
    },
    @{
        name = "llm_model_checkpoints"
        description = "Gradient checkpoints for model fine-tuning"
    }
)

foreach ($db in $databases) {
    try {
        $result = Invoke-RestMethod `
            -Uri "http://admin:legal_ai_pass@127.0.0.1:5984/$($db.name)" `
            -Method Put `
            -TimeoutSec 5 `
            -ErrorAction SilentlyContinue

        if ($result.ok) {
            Write-Host "   ✅ Created: $($db.name)" -ForegroundColor Green
            Write-Host "      $($db.description)" -ForegroundColor Gray
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 412) {
            Write-Host "   ℹ️  Database already exists: $($db.name)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Failed to create $($db.name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""

# ============================================================================
# STEP 4: Verify Database Access
# ============================================================================

Write-Host "4️⃣  Verifying Database Access..." -ForegroundColor Yellow
Write-Host ""

try {
    $allDbs = Invoke-RestMethod `
        -Uri "http://admin:legal_ai_pass@127.0.0.1:5984/_all_dbs" `
        -Method Get `
        -TimeoutSec 5

    Write-Host "   📊 Total databases: $($allDbs.Count)" -ForegroundColor Gray

    $ourDbs = $allDbs | Where-Object { $_ -match "error_analysis_kb|llm_model_checkpoints" }
    Write-Host "   ✅ Phase 88 databases:" -ForegroundColor Green
    foreach ($db in $ourDbs) {
        Write-Host "      - $db" -ForegroundColor Gray
    }

} catch {
    Write-Host "   ❌ Failed to list databases: $_" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# STEP 5: Create Python Service Directory Structure
# ============================================================================

if (-not $SkipPython) {
    Write-Host "5️⃣  Creating Python Service Directory..." -ForegroundColor Yellow
    Write-Host ""

    $pythonRoot = "..\..\python-services\rag-kag-middleware"

    if (-not (Test-Path $pythonRoot)) {
        New-Item -ItemType Directory -Path $pythonRoot -Force | Out-Null
        Write-Host "   ✅ Created: $pythonRoot" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Directory exists: $pythonRoot" -ForegroundColor Gray
    }

    # Create subdirectories
    $directories = @(
        "app",
        "app/models",
        "app/services",
        "app/routes",
        "tests",
        "checkpoints"
    )

    foreach ($dir in $directories) {
        $fullPath = Join-Path $pythonRoot $dir
        if (-not (Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Host "   ✅ Created: $dir" -ForegroundColor Green
        }
    }

    Write-Host ""
}

# ============================================================================
# STEP 6: Create requirements.txt
# ============================================================================

if (-not $SkipPython) {
    Write-Host "6️⃣  Creating requirements.txt..." -ForegroundColor Yellow
    Write-Host ""

    $requirementsPath = Join-Path $pythonRoot "requirements.txt"

    $requirements = @"
# FastAPI Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3

# CouchDB Client
couchdb==1.2

# Vector Database
qdrant-client==1.7.0

# PostgreSQL
psycopg2-binary==2.9.9

# Redis
redis==5.0.1

# Ollama Python Client
ollama==0.1.6

# Utilities
python-dotenv==1.0.0
httpx==0.26.0
"@

    Set-Content -Path $requirementsPath -Value $requirements
    Write-Host "   ✅ Created: requirements.txt" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# STEP 7: Create Basic FastAPI App
# ============================================================================

if (-not $SkipPython) {
    Write-Host "7️⃣  Creating FastAPI Skeleton..." -ForegroundColor Yellow
    Write-Host ""

    $mainPyPath = Join-Path $pythonRoot "app/main.py"

    $mainPy = @"
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import couchdb
import os

app = FastAPI(title="RAG+KAG Middleware", version="1.0.0")

# CouchDB connection
COUCHDB_URL = os.getenv('COUCHDB_URL', 'http://admin:legal_ai_pass@127.0.0.1:5984/')
couch = couchdb.Server(COUCHDB_URL)

try:
    db = couch['error_analysis_kb']
    print(f"✅ Connected to CouchDB: {COUCHDB_URL}")
except:
    print(f"⚠️  CouchDB connection failed: {COUCHDB_URL}")
    db = None

class AnalysisSessionRequest(BaseModel):
    error_id: int
    error_code: str
    file_path: str
    line: int
    message: str
    impact_score: float

@app.get("/")
async def root():
    return {
        "name": "RAG+KAG Middleware",
        "version": "1.0.0",
        "status": "operational" if db else "degraded",
        "couchdb_url": COUCHDB_URL.split('@')[-1]  # Hide credentials
    }

@app.get("/health")
async def health():
    services = {
        "couchdb": "connected" if db else "disconnected",
        "ollama": "pending",
        "qdrant": "pending",
        "postgres": "pending",
        "redis": "pending"
    }

    return {
        "status": "ok" if db else "degraded",
        "services": services
    }

@app.post("/api/v1/analysis/session")
async def create_session(req: AnalysisSessionRequest):
    if not db:
        raise HTTPException(status_code=503, detail="CouchDB not available")

    from datetime import datetime

    session_id = f"session_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}_{req.error_code}_{req.file_path.split('/')[-1].replace('.ts', '')}"

    doc = {
        "_id": session_id,
        "type": "analysis_session",
        "created_at": datetime.now().isoformat(),
        "error_context": {
            "error_id": req.error_id,
            "code": req.error_code,
            "file_path": req.file_path,
            "line": req.line,
            "message": req.message,
            "impact_score": req.impact_score
        },
        "status": "created"
    }

    doc_id, doc_rev = db.save(doc)

    return {
        "session_id": session_id,
        "status": "created",
        "couchdb_id": doc_id,
        "couchdb_rev": doc_rev
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
"@

    Set-Content -Path $mainPyPath -Value $mainPy
    Write-Host "   ✅ Created: app/main.py" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "✅ Phase 88: CouchDB Integration - Setup Complete!`n" -ForegroundColor Green

Write-Host "📊 Current Status:" -ForegroundColor Cyan
Write-Host "   CouchDB:     http://127.0.0.1:5984/_utils" -ForegroundColor Gray
Write-Host "   Databases:   error_analysis_kb, llm_model_checkpoints" -ForegroundColor Gray
Write-Host "   Credentials: admin / legal_ai_pass" -ForegroundColor Gray
Write-Host ""

if (-not $SkipPython) {
    Write-Host "📦 Python Service:" -ForegroundColor Cyan
    Write-Host "   Directory:   $pythonRoot" -ForegroundColor Gray
    Write-Host "   Status:      Skeleton created" -ForegroundColor Gray
    Write-Host ""

    Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Install Python dependencies:" -ForegroundColor White
    Write-Host "      cd $pythonRoot" -ForegroundColor Gray
    Write-Host "      pip install -r requirements.txt" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Start the FastAPI service:" -ForegroundColor White
    Write-Host "      python -m app.main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Test the API:" -ForegroundColor White
    Write-Host "      Invoke-RestMethod -Uri http://127.0.0.1:8765/health -Method Get" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   Architecture: COUCHDB_RAG_KAG_ARCHITECTURE.md" -ForegroundColor Gray
Write-Host "   Phase 87:     PHASE87-COMPLETE.md" -ForegroundColor Gray
Write-Host "   Quick Start:  QUICK-START.md" -ForegroundColor Gray
Write-Host ""

Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""
