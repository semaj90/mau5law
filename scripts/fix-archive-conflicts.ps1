# Fix Name Conflicts from Demo Routes Archival
# Resolves the 6 routes that had naming conflicts

$ErrorActionPreference = "Stop"

Write-Host "🔧 Fixing name conflicts from archival..." -ForegroundColor Cyan

$conflicts = @(
    @{ Source = "sveltekit-frontend/src/routes/api/glyph/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/glyph-test" },
    @{ Source = "sveltekit-frontend/src/routes/api/pipeline/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/pipeline-test" },
    @{ Source = "sveltekit-frontend/src/routes/api/simd/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/simd-test" },
    @{ Source = "sveltekit-frontend/src/routes/api/webgpu/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/webgpu-test" },
    @{ Source = "sveltekit-frontend/src/routes/api/v1/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/v1-test" },
    @{ Source = "sveltekit-frontend/src/routes/api/v1/cache/test"; Dest = "sveltekit-frontend/src/routes/archive/tests/api/v1-cache-test" }
)

$moved = 0
$skipped = 0

foreach ($conflict in $conflicts) {
    if (Test-Path $conflict.Source) {
        try {
            Move-Item -Path $conflict.Source -Destination $conflict.Dest -Force
            Write-Host "   ✅ Moved: $($conflict.Source) → $($conflict.Dest)" -ForegroundColor Green
            $moved++
        }
        catch {
            Write-Host "   ❌ Failed: $($conflict.Source) - $($_.Exception.Message)" -ForegroundColor Red
            $skipped++
        }
    }
    else {
        Write-Host "   ⏭️  Already processed: $($conflict.Source)" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host "`n✅ Conflict resolution complete!" -ForegroundColor Green
Write-Host "   Moved: $moved" -ForegroundColor Cyan
Write-Host "   Skipped: $skipped" -ForegroundColor DarkGray
