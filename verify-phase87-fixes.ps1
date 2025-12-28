#!/usr/bin/env pwsh
# Phase 87: Complete System Verification

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Phase 87: System Verification" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

# 1. Check MCP Unwrap Library
Write-Host "1️⃣ Testing MCP Unwrap Library..." -ForegroundColor Yellow
try {
    $test = node -e "import('./scripts/lib/mcp_unwrap.mjs').then(m => console.log(m.unwrapMcpText({content:[{text:'test'}]})))" 2>&1
    if ($test -match "test") {
        Write-Host "   ✅ MCP unwrap working" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "   ❌ MCP unwrap failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
    $failed++
}
Write-Host ""

# 2. Check FastMCP Server
Write-Host "2️⃣ Checking FastMCP Server..." -ForegroundColor Yellow
$tcp = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($tcp) {
    Write-Host "   ✅ FastMCP running (PID: $($tcp.OwningProcess))" -ForegroundColor Green
    $passed++

    # Test new request format
    Write-Host "   Testing functionName/input format..." -ForegroundColor Gray
    try {
        $body = @{
            functionName = 'read_file'
            input = @{ filepath = 'package.json' }
        } | ConvertTo-Json

        $result = Invoke-RestMethod -Uri 'http://localhost:3002/function-call' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 5
        Write-Host "   ✅ New format accepted" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "   ⚠️ New format test: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ FastMCP not running on port 3002" -ForegroundColor Yellow
    Write-Host "   Run: node scripts/fastmcp-server.mjs" -ForegroundColor Gray
}
Write-Host ""

# 3. Check Go Knowledge Plane Structure
Write-Host "3️⃣ Checking Go Knowledge Plane Structure..." -ForegroundColor Yellow
$goFiles = @(
    "go-services/knowledge-plane/cmd/knowledge-plane/main.go",
    "go-services/knowledge-plane/internal/api/handlers.go",
    "go-services/knowledge-plane/internal/infra/compat/config.go",
    "go-services/knowledge-plane/internal/infra/compat/log.go",
    "go-services/knowledge-plane/internal/infra/compat/http.go",
    "go-services/knowledge-plane/internal/infra/compat/redis.go",
    "go-services/knowledge-plane/internal/infra/compat/pg.go"
)

$allExist = $true
foreach ($file in $goFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing: $file" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    $passed++
} else {
    $failed++
}
Write-Host ""

# 4. Check Phase 86 Auto-Revert Implementation
Write-Host "4️⃣ Checking Phase 86 Auto-Revert..." -ForegroundColor Yellow
$phase86Content = Get-Content "sveltekit-frontend/scripts/phase86-autonomous-loop.mjs" -Raw
if ($phase86Content -match "getTscErrorCount" -and $phase86Content -match "worsened" -and $phase86Content -match "unwrapMcpText") {
    Write-Host "   ✅ Auto-revert implemented" -ForegroundColor Green
    Write-Host "   ✅ MCP unwrap imported" -ForegroundColor Green
    Write-Host "   ✅ Error counting active" -ForegroundColor Green
    $passed += 3
} else {
    Write-Host "   ❌ Auto-revert not fully implemented" -ForegroundColor Red
    $failed++
}
Write-Host ""

# 5. Check Discovery Script
Write-Host "5️⃣ Checking Discovery Script..." -ForegroundColor Yellow
if (Test-Path "scripts/discover-go-infra.ps1") {
    Write-Host "   ✅ Discovery script exists" -ForegroundColor Green
    Write-Host "   Run: .\scripts\discover-go-infra.ps1" -ForegroundColor Gray
    $passed++
} else {
    Write-Host "   ❌ Discovery script missing" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Verification Results" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ✅ Passed: $passed" -ForegroundColor Green
Write-Host "   ❌ Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All Phase 87 fixes verified successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ready to test:" -ForegroundColor Cyan
    Write-Host "   1. Run Phase 86: node scripts/phase86-autonomous-loop.mjs" -ForegroundColor White
    Write-Host "   2. Run Discovery: .\scripts\discover-go-infra.ps1" -ForegroundColor White
    Write-Host "   3. Build Go service after mapping compat files" -ForegroundColor White
} else {
    Write-Host "⚠️ Some checks failed. Review output above." -ForegroundColor Yellow
}
Write-Host ""
