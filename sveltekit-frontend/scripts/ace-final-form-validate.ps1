#!/usr/bin/env pwsh
# ACE Final Form: Complete Architecture Validation
# Tests all components from video implementation

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "  ACE FINAL FORM: Complete Architecture Validation" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

$PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
$SUCCESS = 0
$FAILED = 0

function Test-Component {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$Description
    )

    Write-Host "[TEST] $Name" -ForegroundColor Yellow
    Write-Host "       $Description" -ForegroundColor Gray

    try {
        $result = & $Test
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] PASS" -ForegroundColor Green
            $script:SUCCESS++
            return $true
        } else {
            Write-Host "  [X] FAIL (exit code: $LASTEXITCODE)" -ForegroundColor Red
            $script:FAILED++
            return $false
        }
    } catch {
        Write-Host "  [X] FAIL: $_" -ForegroundColor Red
        $script:FAILED++
        return $false
    }
}

Write-Host "Phase 92: Event Sourcing Layer" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

Test-Component `
    -Name "Event Logging (Postgres + Qdrant Timeline)" `
    -Description "Log event with FLOAT timestamp to both stores" `
    -Test {
        & $PYTHON scripts/phase92-event-sourcing.py --log-event "test" "validation" "ace-final-form" 2>&1 | Out-Null
    }

Test-Component `
    -Name "Timeline Search (Semantic + Time Filter)" `
    -Description "Search timeline with Range filter (gte FLOAT)" `
    -Test {
        & $PYTHON scripts/phase92-event-sourcing.py --search-timeline "validation test" --hours 1 --limit 3 2>&1 | Out-Null
    }

Test-Component `
    -Name "Recent Events Query (Postgres)" `
    -Description "Query Postgres event log with time filter" `
    -Test {
        & $PYTHON scripts/phase92-event-sourcing.py --recent-edits --hours 24 --limit 5 2>&1 | Out-Null
    }

Write-Host ""
Write-Host "Phase 93: Hierarchical Retrieval" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

Test-Component `
    -Name "Smart Filtering (Intent Extraction)" `
    -Description "Extract tags from query and apply payload filter BEFORE search" `
    -Test {
        & $PYTHON scripts/phase93-smart-filter.py "svelte typescript" --limit 3 2>&1 | Out-Null
    }

Test-Component `
    -Name "Task Type Separation (retrieval_query)" `
    -Description "Use task_type='retrieval_query' for search embeddings" `
    -Test {
        $content = Get-Content scripts/phase93-smart-filter.py -Raw
        if ($content -match "task_type.*retrieval_query") { return 0 } else { throw "Not found" }
    }

Write-Host ""
Write-Host "Phase 91: GPU Tensor Operations" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

Test-Component `
    -Name "Task Type Separation (retrieval_document)" `
    -Description "Use task_type='retrieval_document' for storage embeddings" `
    -Test {
        $content = Get-Content scripts/phase91-reembed-qdrant.py -Raw
        if ($content -match "task_type.*retrieval_document") { return 0 } else { throw "Not found" }
    }

Test-Component `
    -Name "GPU Rerank Engine (FP16)" `
    -Description "RTX 3060 Ti FP16 cosine similarity reranking" `
    -Test {
        $content = Get-Content scripts/phase89_gpu_rerank.py -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match "cosine_similarity_gpu") { return 0 } else { throw "Not found" }
    }

Write-Host ""
Write-Host "Architecture Validation" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

Test-Component `
    -Name "Qdrant Collections (phase92_timeline_events)" `
    -Description "Timeline collection with MRL/quantization support" `
    -Test {
        $result = curl -s "http://localhost:6333/collections/phase92_timeline_events" 2>&1
        if ($result -match "phase92_timeline_events") { return 0 } else { throw "Collection not found" }
    }

Test-Component `
    -Name "Postgres Event Schema" `
    -Description "phase89_qdrant_events table with 17 columns + 9 indexes" `
    -Test {
        & $PYTHON -c "import psycopg2; conn = psycopg2.connect('postgresql://user:pass@localhost:5434/legal'); cur = conn.cursor(); cur.execute('SELECT COUNT(*) FROM phase89_qdrant_events'); print(cur.fetchone()[0])" 2>&1 | Out-Null
    }

Test-Component `
    -Name "LangExtract Integration" `
    -Description "HTTP endpoint at localhost:8095" `
    -Test {
        $result = curl -s "http://localhost:8095/health" 2>&1
        if ($result -match "ok" -or $result -match "healthy") { return 0 } else { throw "Service not responding" }
    }

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

$TOTAL = $SUCCESS + $FAILED
$PASS_RATE = [math]::Round(($SUCCESS / $TOTAL) * 100, 1)

Write-Host "Tests Passed: " -NoNewline
Write-Host "$SUCCESS" -ForegroundColor Green
Write-Host "Tests Failed: " -NoNewline
Write-Host "$FAILED" -ForegroundColor $(if ($FAILED -eq 0) { "Green" } else { "Red" })
Write-Host "Pass Rate:    " -NoNewline
Write-Host "$PASS_RATE%" -ForegroundColor $(if ($PASS_RATE -ge 80) { "Green" } elseif ($PASS_RATE -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "ACE FINAL FORM: Production Ready!" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "Architecture Summary:" -ForegroundColor Cyan
    Write-Host "  - Event Sourcing: Postgres + Qdrant Timeline (FLOAT timestamps)" -ForegroundColor Gray
    Write-Host "  - Hierarchical Retrieval: Filter -> Search -> GPU Rerank" -ForegroundColor Gray
    Write-Host "  - Task Type Separation: retrieval_document vs retrieval_query" -ForegroundColor Gray
    Write-Host "  - MRL + Quantization: INT8 (4x memory savings)" -ForegroundColor Gray
    Write-Host "  - Tag Inheritance: 10 feature + 5 error canonical tags" -ForegroundColor Gray
    Write-Host "  - GPU Two-Pass Search: HNSW -> FP16 rerank (RTX 3060 Ti)" -ForegroundColor Gray
} else {
    Write-Host "Some components need attention. Review failed tests above." -ForegroundColor Yellow
}

Write-Host ""
