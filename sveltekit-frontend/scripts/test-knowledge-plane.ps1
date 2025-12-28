# Phase 87: Knowledge Plane Test Script
# Tests DATABASE_URL fix, FastMCP health check, and prepares for Knowledge Plane deployment

Write-Host "🧪 Phase 87: Knowledge Plane Integration Test`n" -ForegroundColor Cyan

# ============================================================================
# Test 1: Environment Variables
# ============================================================================
Write-Host "1️⃣ Testing Environment Configuration..." -ForegroundColor Yellow

if (Test-Path ".env.phase87") {
    Write-Host "   ✅ .env.phase87 exists" -ForegroundColor Green
    Get-Content .env.phase87 | ForEach-Object {
        if ($_ -match "^([A-Z_]+)=(.+)$") {
            Write-Host "      $($matches[1]) = $($matches[2].Substring(0, [Math]::Min(50, $matches[2].Length)))..." -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ❌ .env.phase87 missing!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Test 2: Set Environment Variables (for this session)
# ============================================================================
Write-Host "`n2️⃣ Loading Environment Variables..." -ForegroundColor Yellow

$env:DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"
$env:QDRANT_URL = "http://127.0.0.1:6333"
$env:OLLAMA_URL = "http://127.0.0.1:11434"
$env:REDIS_URL = "redis://127.0.0.1:6379"

Write-Host "   ✅ DATABASE_URL = $env:DATABASE_URL" -ForegroundColor Green
Write-Host "   ✅ QDRANT_URL = $env:QDRANT_URL" -ForegroundColor Green
Write-Host "   ✅ OLLAMA_URL = $env:OLLAMA_URL" -ForegroundColor Green
Write-Host "   ✅ REDIS_URL = $env:REDIS_URL" -ForegroundColor Green

# ============================================================================
# Test 3: Direct Postgres Connection (Verify 5434/legal)
# ============================================================================
Write-Host "`n3️⃣ Testing Direct Postgres Connection..." -ForegroundColor Yellow

$dbTest = docker exec phase66-postgres psql -U user -d legal -c "SELECT inet_server_addr() as ip, current_user, current_database()" -t 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Direct connection successful" -ForegroundColor Green
    $dbTest | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    Write-Host "   ❌ Direct connection failed" -ForegroundColor Red
    Write-Host "      $dbTest" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Test 4: Kill Existing FastMCP (if running)
# ============================================================================
Write-Host "`n4️⃣ Checking for Existing FastMCP..." -ForegroundColor Yellow

$port = 3002
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcp) {
    $proc = Get-Process -Id $tcp.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "   ⚠️  Killing existing process: $($proc.Name) (PID: $($proc.Id))" -ForegroundColor Yellow
        Stop-Process -Id $tcp.OwningProcess -Force
        Start-Sleep -Seconds 2
    }
}

Write-Host "   ✅ Port $port is free" -ForegroundColor Green

# ============================================================================
# Test 5: Start FastMCP Server (with DB verification)
# ============================================================================
Write-Host "`n5️⃣ Starting FastMCP Server..." -ForegroundColor Yellow

$fastmcpJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DATABASE_URL = $using:env:DATABASE_URL
    $env:QDRANT_URL = $using:env:QDRANT_URL
    $env:OLLAMA_URL = $using:env:OLLAMA_URL
    $env:REDIS_URL = $using:env:REDIS_URL
    node scripts/fastmcp-server.mjs
}

Write-Host "   ⏳ Waiting for server to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Check if job is still running
$jobState = (Get-Job -Id $fastmcpJob.Id).State
if ($jobState -ne "Running") {
    Write-Host "   ❌ FastMCP failed to start!" -ForegroundColor Red
    Receive-Job -Id $fastmcpJob.Id
    Remove-Job -Id $fastmcpJob.Id -Force
    exit 1
}

Write-Host "   ✅ FastMCP started (Job ID: $($fastmcpJob.Id))" -ForegroundColor Green

# ============================================================================
# Test 6: Health Check with DB Identity
# ============================================================================
Write-Host "`n6️⃣ Testing FastMCP Health Endpoint..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/health" -Method Get

    if ($health.ok -eq $true) {
        Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
        Write-Host "   ✅ Tools: $($health.tools)" -ForegroundColor Green

        if ($health.database) {
            Write-Host "   📊 Database Identity:" -ForegroundColor Cyan
            Write-Host "      Server IP: $($health.database.server_ip)" -ForegroundColor Gray
            Write-Host "      User: $($health.database.current_user)" -ForegroundColor Gray
            Write-Host "      Database: $($health.database.current_database)" -ForegroundColor Gray
            Write-Host "      Connection: $($health.database.connectionString)" -ForegroundColor Gray

            if ($health.database.current_database -eq "legal" -and $health.database.current_user -eq "user") {
                Write-Host "`n   ✅ DATABASE_URL FIX VERIFIED!" -ForegroundColor Green -BackgroundColor DarkGreen
                Write-Host "      FastMCP is correctly connected to legal@5434" -ForegroundColor Green
            } else {
                Write-Host "`n   ❌ WRONG DATABASE!" -ForegroundColor Red -BackgroundColor DarkRed
                Write-Host "      Expected: legal@user, Got: $($health.database.current_database)@$($health.database.current_user)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   ❌ Health check failed: $($health.status)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Health endpoint not responding" -ForegroundColor Red
    Write-Host "      Error: $_" -ForegroundColor Red
}

# ============================================================================
# Test 7: Test postgres_query Tool
# ============================================================================
Write-Host "`n7️⃣ Testing postgres_query Tool..." -ForegroundColor Yellow

$queryBody = @{
    name = "postgres_query"
    arguments = @{
        query = "SELECT COUNT(*) as error_count, COUNT(DISTINCT file_path) as file_count FROM ts_errors WHERE status = 'open'"
    }
} | ConvertTo-Json

try {
    $queryResult = Invoke-RestMethod -Uri "http://127.0.0.1:3002/function-call" -Method Post -ContentType "application/json" -Body $queryBody

    if ($queryResult.rows) {
        Write-Host "   ✅ Query successful!" -ForegroundColor Green
        Write-Host "      Errors: $($queryResult.rows[0].error_count)" -ForegroundColor Gray
        Write-Host "      Files: $($queryResult.rows[0].file_count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Query failed: $($queryResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ postgres_query tool failed" -ForegroundColor Red
    Write-Host "      Error: $_" -ForegroundColor Red
}

# ============================================================================
# Test 8: Check Knowledge Plane Service (Go)
# ============================================================================
Write-Host "`n8️⃣ Checking Knowledge Plane Service..." -ForegroundColor Yellow

if (Test-Path "go-services/knowledge-plane/main.go") {
    Write-Host "   ✅ Knowledge Plane source exists" -ForegroundColor Green
    Write-Host "      📁 go-services/knowledge-plane/main.go" -ForegroundColor Gray

    Write-Host "`n   📋 To build and run:" -ForegroundColor Cyan
    Write-Host "      cd go-services/knowledge-plane" -ForegroundColor Gray
    Write-Host "      go mod download" -ForegroundColor Gray
    Write-Host "      go build -o knowledge-plane.exe main.go" -ForegroundColor Gray
    Write-Host "      `$env:DATABASE_URL=`"postgresql://user:pass@127.0.0.1:5434/legal`"" -ForegroundColor Gray
    Write-Host "      .\knowledge-plane.exe" -ForegroundColor Gray
} else {
    Write-Host "   ⏳ Knowledge Plane not created yet" -ForegroundColor Yellow
}

# ============================================================================
# Test 9: Check JSONL Dataset File
# ============================================================================
Write-Host "`n9️⃣ Checking JSONL Dataset..." -ForegroundColor Yellow

if (Test-Path "reports/phase87-ace-dataset.jsonl") {
    $lineCount = (Get-Content "reports/phase87-ace-dataset.jsonl" | Measure-Object -Line).Lines
    Write-Host "   ✅ Dataset file exists: $lineCount entries" -ForegroundColor Green
} else {
    Write-Host "   ⏳ Dataset file will be created on first retrieval" -ForegroundColor Yellow
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n" -NoNewline
Write-Host "="*80 -ForegroundColor Cyan
Write-Host "✅ Phase 87: Knowledge Plane Test Complete!`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test autonomous loop:" -ForegroundColor Gray
Write-Host "     node scripts/phase86-autonomous-loop.mjs" -ForegroundColor Gray
Write-Host "`n  2. Build Knowledge Plane (Go service):" -ForegroundColor Gray
Write-Host "     cd go-services/knowledge-plane && go build" -ForegroundColor Gray
Write-Host "`n  3. Monitor JSONL dataset:" -ForegroundColor Gray
Write-Host "     Get-Content reports/phase87-ace-dataset.jsonl -Tail 10 -Wait" -ForegroundColor Gray

Write-Host "`n"
Write-Host "📊 FastMCP Server is running in background job (ID: $($fastmcpJob.Id))" -ForegroundColor Cyan
Write-Host "   To view logs: Receive-Job -Id $($fastmcpJob.Id) -Keep" -ForegroundColor Gray
Write-Host "   To stop: Stop-Job -Id $($fastmcpJob.Id); Remove-Job -Id $($fastmcpJob.Id)" -ForegroundColor Gray
Write-Host ""
