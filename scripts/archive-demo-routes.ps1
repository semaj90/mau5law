# Archive Demo and Test Routes
# Moves all demo, test, and experimental routes to organized archive directory

$ErrorActionPreference = "Stop"
$baseDir = "sveltekit-frontend/src/routes"
$archiveBase = "$baseDir/archive"

# Create archive directory structure
$archiveDirs = @(
    "$archiveBase/demos",
    "$archiveBase/tests/api",
    "$archiveBase/tests/pages",
    "$archiveBase/dev-playground",
    "$archiveBase/experiments"
)

Write-Host "🗂️  Creating archive directory structure..." -ForegroundColor Cyan
foreach ($dir in $archiveDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "   ✅ Created: $dir" -ForegroundColor Green
    }
}

# Define routes to archive (organized by category)
$routesToArchive = @{
    "Demos" = @{
        "SourceDirs" = @(
            "demo",
            "trt-llm-demo",
            "api/demo",
            "api/evidence/demo",
            "api/auth/demo-login",
            "mcp/demo",
            "detective/ui-demo",
            "dev/cache-demo",
            "dev/tensor-demo",
            "dev/upload-demo",
            "dev/vite-error-demo",
            "admin/gpu-demo",
            "api/demo/full-stack-demo",
            "dev/vector-search-demo",
            "legal-ai/embedding-demo"
        )
        "Destination" = "$archiveBase/demos"
    }

    "Tests - API" = @{
        "SourceDirs" = @(
            "api/test",
            "api/testing",
            "api/chat-test",
            "api/database-test",
            "api/db-test",
            "api/gpu-test-simple",
            "api/integration-test",
            "api/system-integration-test",
            "api/test-ai-integration",
            "api/test-ai-suggestions",
            "api/test-auth",
            "api/test-case",
            "api/test-cases",
            "api/test-context7",
            "api/test-crud",
            "api/test-custom",
            "api/test-database-health",
            "api/test-db",
            "api/test-db-basic",
            "api/test-gemma-upload",
            "api/test-health",
            "api/test-join",
            "api/test-login",
            "api/test-lucia",
            "api/test-mcp",
            "api/test-minimal",
            "api/test-performance-redis",
            "api/test-rag",
            "api/test-search",
            "api/test-simple",
            "api/test-unified-db",
            "api/test-update-logic",
            "api/test-vector-pipeline",
            "api/test-wasm-inference",
            "api/cache/test",
            "api/ai/test-gemma3",
            "api/ai/test-ollama",
            "api/ai/test-orchestration-status",
            "api/glyph/test",
            "api/pipeline/test",
            "api/simd/test",
            "api/webgpu/test",
            "api/v1/test",
            "api/v1/cache/test",
            "api/yorha/test-db",
            "api/cuda-rabbitmq-test",
            "api/instant-search-test",
            "api/postgresql-first-test",
            "api/vector-search-demo",
            "api/ai-synthesizer-test"
        )
        "Destination" = "$archiveBase/tests/api"
    }

    "Tests - Pages" = @{
        "SourceDirs" = @(
            "test",
            "test-grey-balance",
            "test-rag",
            "test-route-discovery",
            "ui-test",
            "upload-test",
            "webgpu-test",
            "auth/test",
            "auth/test-relay",
            "yorha/api-test",
            "yorha/detective/test-system",
            "legal-ai/database-test"
        )
        "Destination" = "$archiveBase/tests/pages"
    }

    "Dev Playground" = @{
        "SourceDirs" = @(
            "dev/client-embedding-test",
            "dev/client-gemma-test",
            "dev/context7-test",
            "dev/dynamic-routing-test",
            "dev/embedding-gemma-onnx",
            "dev/gpu-som-test",
            "dev/pgvector-test",
            "dev/self-prompting-test",
            "dev/webgl-fallback-test"
        )
        "Destination" = "$archiveBase/dev-playground"
    }

    "Experiments" = @{
        "SourceDirs" = @(
            "api/sync/qlora-sample-test",
            "api/faiss/scale-demo",
            "api/ingest/smoke-test",
            "api/v1/pipeline/react-integration-test",
            "api/v1/webgpu/cache-test"
        )
        "Destination" = "$archiveBase/experiments"
    }
}

# Track statistics
$stats = @{
    TotalMoved = 0
    TotalSkipped = 0
    Categories = @{}
}

Write-Host "`n📦 Starting route archival process..." -ForegroundColor Cyan
Write-Host ""

foreach ($category in $routesToArchive.Keys) {
    $config = $routesToArchive[$category]
    $moved = 0
    $skipped = 0

    Write-Host "📁 Processing: $category" -ForegroundColor Yellow

    foreach ($sourceDir in $config.SourceDirs) {
        $sourcePath = Join-Path $baseDir $sourceDir

        if (Test-Path $sourcePath) {
            $destPath = Join-Path $config.Destination (Split-Path $sourceDir -Leaf)

            try {
                # Create parent directory if needed
                $destParent = Split-Path $destPath -Parent
                if (!(Test-Path $destParent)) {
                    New-Item -ItemType Directory -Force -Path $destParent | Out-Null
                }

                # Move the directory
                Move-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "   ✅ Moved: $sourceDir" -ForegroundColor Green
                $moved++
                $stats.TotalMoved++
            }
            catch {
                Write-Host "   ❌ Failed to move: $sourceDir - $($_.Exception.Message)" -ForegroundColor Red
                $skipped++
                $stats.TotalSkipped++
            }
        }
        else {
            Write-Host "   ⏭️  Skipped (not found): $sourceDir" -ForegroundColor DarkGray
            $skipped++
            $stats.TotalSkipped++
        }
    }

    $stats.Categories[$category] = @{ Moved = $moved; Skipped = $skipped }
    Write-Host "   Summary: $moved moved, $skipped skipped`n" -ForegroundColor Cyan
}

# Clean up __tests__ directories
Write-Host "🧹 Cleaning up __tests__ directories..." -ForegroundColor Cyan
$testDirs = Get-ChildItem -Path $baseDir -Recurse -Directory -Filter "__tests__"
foreach ($testDir in $testDirs) {
    try {
        $relativePath = $testDir.FullName.Replace((Get-Item $baseDir).FullName + "\", "")
        $destPath = Join-Path "$archiveBase/tests/api" $relativePath

        # Create parent directory
        $destParent = Split-Path $destPath -Parent
        if (!(Test-Path $destParent)) {
            New-Item -ItemType Directory -Force -Path $destParent | Out-Null
        }

        Move-Item -Path $testDir.FullName -Destination $destPath -Force
        Write-Host "   ✅ Moved __tests__: $relativePath" -ForegroundColor Green
        $stats.TotalMoved++
    }
    catch {
        Write-Host "   ❌ Failed to move __tests__: $($testDir.FullName)" -ForegroundColor Red
        $stats.TotalSkipped++
    }
}

# Final summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 ARCHIVAL SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`nBy Category:" -ForegroundColor Yellow
foreach ($category in $stats.Categories.Keys | Sort-Object) {
    $catStats = $stats.Categories[$category]
    Write-Host "  $category"
    Write-Host "    Moved:   $($catStats.Moved)" -ForegroundColor Green
    Write-Host "    Skipped: $($catStats.Skipped)" -ForegroundColor DarkGray
}

Write-Host "`nOverall Totals:" -ForegroundColor Yellow
Write-Host "  Total Moved:   $($stats.TotalMoved)" -ForegroundColor Green
Write-Host "  Total Skipped: $($stats.TotalSkipped)" -ForegroundColor DarkGray

# Check consolidation status
Write-Host "`n🎯 Checking consolidation progress..." -ForegroundColor Cyan
$activeRouteCount = (Get-ChildItem -Path $baseDir -Recurse -File | Where-Object {
    $_.Name -match '\+(page|server|layout)' -and $_.FullName -notmatch 'archive'
}).Count

$archivedRouteCount = (Get-ChildItem -Path $archiveBase -Recurse -File | Where-Object {
    $_.Name -match '\+(page|server|layout)'
}).Count

Write-Host "  Active Routes:   $activeRouteCount" -ForegroundColor Cyan
Write-Host "  Archived Routes: $archivedRouteCount" -ForegroundColor Cyan
$reductionPercent = [math]::Round(($archivedRouteCount / ($activeRouteCount + $archivedRouteCount)) * 100, 1)
Write-Host "  Reduction:       $reductionPercent%" -ForegroundColor Green

Write-Host "`n✅ Archival complete!" -ForegroundColor Green
Write-Host "   Next: Run consolidation status check at /api/consolidation/status`n" -ForegroundColor Yellow
