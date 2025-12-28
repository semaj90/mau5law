#!/usr/bin/env pwsh
# Phase 76: Test FastMCP New Tools (read_file + ripgrep)

$BaseUrl = "http://127.0.0.1:3002"

Write-Host "🧪 Testing FastMCP Tools" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 5
    Write-Host "   ✅ Server healthy: Port $($health.port)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server not responding" -ForegroundColor Red
    exit 1
}

# Test 2: List Tools
Write-Host ""
Write-Host "2️⃣ List Tools" -ForegroundColor Yellow
try {
    $toolsResponse = Invoke-RestMethod -Uri "$BaseUrl/tools" -TimeoutSec 5
    Write-Host "   ✅ Found $($toolsResponse.tools.Count) tools:" -ForegroundColor Green
    $toolsResponse.tools | ForEach-Object {
        Write-Host "      - $($_.name): $($_.description)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to list tools" -ForegroundColor Red
    exit 1
}

# Test 3: read_file with line range
Write-Host ""
Write-Host "3️⃣ Test read_file (lines 1-10 of package.json)" -ForegroundColor Yellow
$readFileBody = @{
    name = "read_file"
    arguments = @{
        filepath = "./package.json"
        startLine = 1
        endLine = 10
    }
} | ConvertTo-Json -Compress

try {
    $readResult = Invoke-RestMethod -Uri "$BaseUrl/function-call" -Method Post -ContentType "application/json" -Body $readFileBody -TimeoutSec 5
    if ($readResult.ok) {
        $preview = $readResult.result.content.Substring(0, [Math]::Min(100, $readResult.result.content.Length))
        Write-Host "   ✅ Read successful" -ForegroundColor Green
        Write-Host "   Preview: $preview..." -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Read failed: $($readResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Request failed: $_" -ForegroundColor Red
}

# Test 4: ripgrep pattern search
Write-Host ""
Write-Host "4️⃣ Test ripgrep (search for 'phase87')" -ForegroundColor Yellow
$ripgrepBody = @{
    name = "ripgrep"
    arguments = @{
        pattern = "phase87"
        globs = @("*.mjs", "*.md")
        maxResults = 5
    }
} | ConvertTo-Json -Compress

try {
    $ripgrepResult = Invoke-RestMethod -Uri "$BaseUrl/function-call" -Method Post -ContentType "application/json" -Body $ripgrepBody -TimeoutSec 10
    if ($ripgrepResult.ok) {
        Write-Host "   ✅ Ripgrep successful: $($ripgrepResult.result.matches.Count) matches" -ForegroundColor Green
        $ripgrepResult.result.matches | Select-Object -First 3 | ForEach-Object {
            Write-Host "      $($_.file):$($_.line)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Ripgrep failed: $($ripgrepResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Request failed: $_" -ForegroundColor Red
}

# Test 5: Postgres query (check error count)
Write-Host ""
Write-Host "5️⃣ Test postgres_query (count errors)" -ForegroundColor Yellow
$pgBody = @{
    name = "postgres_query"
    arguments = @{
        query = "SELECT COUNT(*) as total FROM ts_errors WHERE status = 'open'"
    }
} | ConvertTo-Json -Compress

try {
    $pgResult = Invoke-RestMethod -Uri "$BaseUrl/function-call" -Method Post -ContentType "application/json" -Body $pgBody -TimeoutSec 5
    if ($pgResult.ok) {
        Write-Host "   ✅ Query successful: $($pgResult.result.rows[0].total) open errors" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Query failed: $($pgResult.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Request failed (Postgres may not be running)" -ForegroundColor Yellow
}

# Test 6: Qdrant search
Write-Host ""
Write-Host "6️⃣ Test qdrant_search (find TS1005 patterns)" -ForegroundColor Yellow
$qdrantBody = @{
    name = "qdrant_search"
    arguments = @{
        collection = "phase72_error_patterns"
        query = "TS1005 comma expected"
        topK = 3
    }
} | ConvertTo-Json -Compress

try {
    $qdrantResult = Invoke-RestMethod -Uri "$BaseUrl/function-call" -Method Post -ContentType "application/json" -Body $qdrantBody -TimeoutSec 10
    if ($qdrantResult.ok) {
        Write-Host "   ✅ Search successful: $($qdrantResult.result.results.Count) results" -ForegroundColor Green
        $qdrantResult.result.results | Select-Object -First 2 | ForEach-Object {
            Write-Host "      Score: $($_.score) | Pattern: $($_.payload.pattern)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️ Search failed: $($qdrantResult.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Request failed (Qdrant may not be running)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Tool tests complete!" -ForegroundColor Green
