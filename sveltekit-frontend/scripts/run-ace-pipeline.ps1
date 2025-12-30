<#
.SYNOPSIS
    Run Phase 89 ACE Contextual Engineering Pipeline
.DESCRIPTION
    Orchestrates the entire Phase 89 pipeline including:
    - Redis Cache Indexing (Node.js)
    - ACE Contextual Synthesis (Python/PyTorch)
    - Context7 Multi-Core Server (Python)
    - Semantic Search Verification
#>

param (
    [string]$Option = ""
)

$ErrorActionPreference = "Stop"
$PYTHON = "python"
# Try to find python in venv if it exists
if (Test-Path "..\.venv\Scripts\python.exe") {
    $PYTHON = "..\.venv\Scripts\python.exe"
}

function Show-Header {
    Clear-Host
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Phase 89: ACE Contextual Engineering Pipeline                   ║" -ForegroundColor Cyan
    Write-Host "║   Redis Cache • Qdrant Vector • PyTorch GPU • Context7            ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Services {
    Write-Host "🔍 Checking services..." -ForegroundColor Yellow

    # Check Redis
    if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
        $redisPong = redis-cli ping
        if ($redisPong -eq "PONG") {
            Write-Host "   ✅ Redis (Healthy)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Redis (Not responding)" -ForegroundColor Red
        }
    }

    # Check Qdrant
    try {
        $qdrant = Invoke-WebRequest -Uri "http://localhost:6333" -Method Get -ErrorAction SilentlyContinue
        Write-Host "   ✅ Qdrant (Healthy)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Qdrant (Unhealthy/Offline)" -ForegroundColor Red
    }

    # Check Ollama
    try {
        $ollama = Invoke-WebRequest -Uri "http://localhost:11434" -Method Get -ErrorAction SilentlyContinue
        Write-Host "   ✅ Ollama (Healthy)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Ollama (Offline)" -ForegroundColor Red
    }
    Write-Host ""
}

function Run-Cache-Indexer {
    Write-Host "🚀 Starting Redis -> Qdrant Cache Indexer..." -ForegroundColor Yellow
    node scripts/phase89-redis-qdrant-cache-indexer.mjs index
}

function Run-ACE-Synthesis {
    Write-Host "🚀 Starting ACE Contextual Synthesis Analysis..." -ForegroundColor Yellow
    & $PYTHON scripts/phase89_ace_contextual_synthesis.py
}

function Run-Context7-Server {
    Write-Host "🚀 Starting Context7 Multi-Core Server..." -ForegroundColor Yellow
    & $PYTHON scripts/phase89-context7-python-multicore.py
}

function Run-Search-Test {
    param($query)
    Write-Host "🔍 Searching Cache: '$query'..." -ForegroundColor Yellow
    node scripts/phase89-redis-qdrant-cache-indexer.mjs search "$query"
}

# Main Loop
while ($true) {
    if ($Option -ne "") {
        $choice = $Option
        $Option = "" # Clear after first run
    } else {
        Show-Header
        Check-Services

        Write-Host "Select an operation:" -ForegroundColor White
        Write-Host "1. Index Redis Cache (complete scan)"
        Write-Host "2. Run ACE Synthesis Test (PyTorch)"
        Write-Host "3. Start Context7 Multi-Core Server"
        Write-Host "4. Both: Index + Test (Recommended)"
        Write-Host "5. Quick Search 'embedding'"
        Write-Host "Q. Quit"
        Write-Host ""
        $choice = Read-Host "Enter choice"
    }

    switch ($choice) {
        "1" { Run-Cache-Indexer; Pause }
        "2" { Run-ACE-Synthesis; Pause }
        "3" { Run-Context7-Server; Pause }
        "4" {
            Run-Cache-Indexer
            Run-ACE-Synthesis
            Pause
        }
        "5" { Run-Search-Test "embedding"; Pause }
        "Q" { exit }
        "q" { exit }
        Default { Write-Warning "Invalid choice" }
    }
}
