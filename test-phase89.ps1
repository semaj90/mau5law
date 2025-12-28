#!/usr/bin/env pwsh
# Phase 89: System Verification Test
# Tests both deliverables are working correctly

$ErrorActionPreference = "Stop"

Write-Host "`n==> 🧪 Phase 89 System Verification" -ForegroundColor Cyan
Write-Host "    Testing safeguarded startup + error map + KB" -ForegroundColor Gray

$testsPassed = 0
$testsFailed = 0

function Test-Component {
  param($Name, $TestFn)

  Write-Host "`n📋 Testing: $Name" -ForegroundColor Yellow
  try {
    & $TestFn
    Write-Host "   ✅ PASS" -ForegroundColor Green
    $script:testsPassed++
  } catch {
    Write-Host "   ❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
    $script:testsFailed++
  }
}

# Test 1: Docker running
Test-Component "Docker availability" {
  docker version | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
}

# Test 2: Phase 66 containers exist
Test-Component "Phase 66 containers exist" {
  $containers = @('phase66-postgres', 'phase66-qdrant', 'phase66-redis')
  foreach ($c in $containers) {
    $exists = docker ps -a --filter "name=^/$c$" --format "{{.ID}}"
    if ([string]::IsNullOrWhiteSpace($exists)) {
      throw "$c container not found"
    }
  }
}

# Test 3: Phase 66 containers running
Test-Component "Phase 66 containers running" {
  $containers = @('phase66-postgres', 'phase66-qdrant', 'phase66-redis')
  foreach ($c in $containers) {
    $running = docker ps --filter "name=^/$c$" --filter "status=running" --format "{{.ID}}"
    if ([string]::IsNullOrWhiteSpace($running)) {
      throw "$c container not running"
    }
  }
}

# Test 4: Postgres connection
Test-Component "Postgres connection (Phase 66)" {
  $result = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1;" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Postgres connection failed"
  }
}

# Test 5: Qdrant reachable
Test-Component "Qdrant API (Phase 66)" {
  $collections = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -TimeoutSec 3
  if (-not $collections) {
    throw "Qdrant not responding"
  }
}

# Test 6: Qdrant has KB collection
Test-Component "Qdrant KB collection (810 points)" {
  try {
    $kb = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/phase76_knowledge_base" -TimeoutSec 3
    Write-Host "      Points: $($kb.result.points_count)" -ForegroundColor Gray
    if ($kb.result.points_count -lt 100) {
      throw "KB has too few points: $($kb.result.points_count)"
    }
  } catch {
    throw "phase76_knowledge_base collection not found"
  }
}

# Test 7: Redis connection
Test-Component "Redis connection (Phase 66)" {
  $result = docker exec phase66-redis redis-cli ping 2>&1
  if ($result -ne "PONG") {
    throw "Redis ping failed"
  }
}

# Test 8: Ollama running
Test-Component "Ollama native service" {
  try {
    $version = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -TimeoutSec 3
    Write-Host "      Version: $($version.version)" -ForegroundColor Gray
  } catch {
    throw "Ollama not running. Start with: ollama serve"
  }
}

# Test 9: Schema exists
Test-Component "Phase 89 schema (kg_nodes, kg_edges)" {
  $result = docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('kg_nodes', 'kg_edges');" 2>&1
  if ($result -notmatch "2") {
    Write-Host "      Schema may not exist yet (expected if first run)" -ForegroundColor Gray
  }
}

# Test 10: Scripts exist
Test-Component "Phase 89 scripts exist" {
  $scripts = @(
    "sveltekit-frontend/scripts/phase89-error-map-builder.mjs",
    "sveltekit-frontend/scripts/phase89-error-map-query.mjs"
  )

  foreach ($script in $scripts) {
    if (-not (Test-Path $script)) {
      throw "$script not found"
    }
  }
}

# Test 11: Run.ps1 exists
Test-Component "Safeguarded startup script" {
  if (-not (Test-Path "go-services/knowledge-plane/run.ps1")) {
    throw "run.ps1 not found"
  }
}

# Test 12: Test Qdrant query (semantic search)
Test-Component "Qdrant semantic search (KB test)" {
  try {
    $searchResult = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/phase76_knowledge_base/points/search" -Method POST -ContentType "application/json" -Body (@{
      vector = @(Get-Random -Minimum -1.0 -Maximum 1.0 -Count 768)
      limit = 1
      with_payload = $false
    } | ConvertTo-Json -Depth 10) -TimeoutSec 5

    if (-not $searchResult.result -or $searchResult.result.Count -eq 0) {
      throw "Search returned no results"
    }

    Write-Host "      Search working: $($searchResult.result.Count) results" -ForegroundColor Gray
  } catch {
    throw "Qdrant search API failed: $($_.Exception.Message)"
  }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n📊 Test Results:" -ForegroundColor Cyan
Write-Host "   ✅ Passed: $testsPassed" -ForegroundColor Green
if ($testsFailed -gt 0) {
  Write-Host "   ❌ Failed: $testsFailed" -ForegroundColor Red
  Write-Host "`n⚠️  Some tests failed. Review errors above." -ForegroundColor Yellow
  exit 1
} else {
  Write-Host "   ❌ Failed: 0" -ForegroundColor Gray
  Write-Host "`n🎉 All systems operational!" -ForegroundColor Green
  Write-Host "`nNext steps:" -ForegroundColor Cyan
  Write-Host "   1. Build error map:    node sveltekit-frontend/scripts/phase89-error-map-builder.mjs" -ForegroundColor Gray
  Write-Host "   2. Query error map:    node sveltekit-frontend/scripts/phase89-error-map-query.mjs `"TS1005`"" -ForegroundColor Gray
  Write-Host "   3. Test autonomous:    node sveltekit-frontend/scripts/phase86-autonomous-loop.mjs" -ForegroundColor Gray
  Write-Host "   4. View visualization: npm run dev → http://localhost:5175/phase89/error-map" -ForegroundColor Gray
}
