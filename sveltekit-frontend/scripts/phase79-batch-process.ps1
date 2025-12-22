#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 79 - Batch Error Processor with Code Validation

.DESCRIPTION
Processes TypeScript/Svelte errors in batches with proper code validation
to prevent LLM from generating explanatory text instead of actual patches.

.EXAMPLE
.\phase79-batch-process.ps1 -ErrorCode "1434" -Limit 10
.\phase79-batch-process.ps1 -RiskLevel "medium" -Limit 50 -GPU
#>

param(
    [string]$ErrorCode = "",
    [string]$RiskLevel = "medium,high",
    [int]$Limit = 20,
    [switch]$GPU,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🔄 PHASE 79 BATCH PROCESSOR                             ║" -ForegroundColor Cyan
Write-Host "║   Code Validation + Multi-LLM + RAG/KAG                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check infrastructure
Write-Host "📊 Checking infrastructure..." -ForegroundColor Yellow

$checks = @{
    "Redis" = { (redis-cli PING 2>&1) -match "PONG" }
    "Qdrant" = { (Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_knowledge_base" -Method GET -ErrorAction SilentlyContinue).result.points_count -gt 0 }
    "PostgreSQL" = { (psql -c "SELECT 1" 2>&1) -notmatch "error" }
    "Ollama" = { (Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -ErrorAction SilentlyContinue).models.Count -gt 0 }
}

foreach ($check in $checks.GetEnumerator()) {
    try {
        $result = & $check.Value
        if ($result) {
            Write-Host "   ✅ $($check.Key): OK" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $($check.Key): Not responding" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ $($check.Key): Failed" -ForegroundColor Red
    }
}

Write-Host ""

# Step 2: Check current error distribution
Write-Host "📈 Current error distribution..." -ForegroundColor Yellow

$errorDistribution = psql -h localhost -U postgres -d legal_ai_db -t -c @"
SELECT error_code, COUNT(*) as count
FROM error_cluster
WHERE error_code IS NOT NULL
  AND error_code != 'UNKNOWN'
GROUP BY error_code
ORDER BY count DESC
LIMIT 10;
"@

Write-Host $errorDistribution
Write-Host ""

# Step 3: Re-populate suggestions based on criteria
Write-Host "🔄 Re-populating suggestions..." -ForegroundColor Yellow

$whereClause = "WHERE es.applied = false"

if ($ErrorCode) {
    $whereClause += " AND ec.error_code = '$ErrorCode'"
}

if ($RiskLevel) {
    $riskLevels = $RiskLevel -split "," | ForEach-Object { "'$($_.Trim())'" }
    $whereClause += " AND es.risk_level IN ($($riskLevels -join ','))"
}

$query = @"
SELECT COUNT(*)
FROM error_suggestions es
LEFT JOIN error_cluster ec ON es.cluster_id = ec.cluster_id
$whereClause
  AND ec.file_path IS NOT NULL
  AND ec.file_path NOT LIKE '%/__non_route__%';
"@

$count = psql -h localhost -U postgres -d legal_ai_db -t -c $query

Write-Host "   📋 Found $($count.Trim()) eligible suggestions" -ForegroundColor Cyan

# Step 4: Run Phase 79 with validation
Write-Host ""
Write-Host "🚀 Starting Phase 79 Cognitive Agent..." -ForegroundColor Yellow
Write-Host "   Limit: $Limit suggestions" -ForegroundColor White
Write-Host "   GPU: $(if ($GPU) { 'ENABLED' } else { 'DISABLED' })" -ForegroundColor White
Write-Host "   Dry Run: $(if ($DryRun) { 'YES' } else { 'NO' })" -ForegroundColor White
Write-Host ""

$args = @("scripts/phase79-cognitive-ultimate.mts", $Limit)
if ($GPU) { $args += "--gpu" }
if ($DryRun) { $args += "--dry-run" }

$logFile = "logs/phase79-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
New-Item -Path (Split-Path $logFile) -ItemType Directory -Force | Out-Null

Write-Host "   📝 Logging to: $logFile" -ForegroundColor Gray
Write-Host ""

# Run with real-time output and logging
npx tsx $args 2>&1 | Tee-Object -FilePath $logFile

# Step 5: Summary report
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   📊 BATCH PROCESSING SUMMARY                             ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Count validation failures
$validationFailures = (Get-Content $logFile | Select-String "\[VALIDATION FAILED\]").Count
$validationPasses = (Get-Content $logFile | Select-String "\[VALIDATION PASSED\]").Count
$successes = (Get-Content $logFile | Select-String "\[SUCCESS\]").Count
$failures = (Get-Content $logFile | Select-String "\[FAILURE\]").Count

Write-Host "Code Validation:" -ForegroundColor Yellow
Write-Host "   ✅ Passed: $validationPasses" -ForegroundColor Green
Write-Host "   ❌ Failed: $validationFailures" -ForegroundColor Red
Write-Host ""

Write-Host "Patch Application:" -ForegroundColor Yellow
Write-Host "   ✅ Successful: $successes" -ForegroundColor Green
Write-Host "   ❌ Failed: $failures" -ForegroundColor Red
Write-Host ""

# Check knowledge base growth
$kbGrowth = psql -h localhost -U postgres -d legal_ai_db -t -c @"
SELECT chunk_type, COUNT(*) as count
FROM knowledge_base
GROUP BY chunk_type
ORDER BY count DESC;
"@

Write-Host "Knowledge Base:" -ForegroundColor Yellow
Write-Host $kbGrowth
Write-Host ""

# Strategy guides created
$strategyGuides = (Get-ChildItem docs/fix-strategies/*.md -ErrorAction SilentlyContinue).Count
Write-Host "Strategy Guides: $strategyGuides files" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Batch processing complete!" -ForegroundColor Green
Write-Host "📄 Full log: $logFile" -ForegroundColor Gray
