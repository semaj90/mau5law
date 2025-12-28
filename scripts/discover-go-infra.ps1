#!/usr/bin/env pwsh
# Phase 87: Go Infrastructure Discovery Script

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Go Services Infrastructure Discovery" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$outputFile = "go-services/knowledge-plane/DISCOVERY.md"

Write-Host "📋 Discovering existing infrastructure patterns..." -ForegroundColor Yellow
Write-Host ""

# A) Find config loaders
Write-Host "A) Config Loaders:" -ForegroundColor Cyan
$configFiles = rg -t go "func.*Load.*Config|func.*NewConfig" --files-with-matches go-services/ 2>$null
if ($configFiles) {
    $configFiles | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# B) Find loggers
Write-Host "B) Loggers:" -ForegroundColor Cyan
$logFiles = rg -t go "slog|zerolog|logrus|func.*NewLogger" --files-with-matches go-services/ 2>$null
if ($logFiles) {
    $logFiles | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# C) Find Redis clients
Write-Host "C) Redis Clients:" -ForegroundColor Cyan
$redisFiles = rg -t go "redis.NewClient|redigo|go-redis" --files-with-matches go-services/ 2>$null
if ($redisFiles) {
    $redisFiles | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# D) Find Postgres clients
Write-Host "D) Postgres Clients:" -ForegroundColor Cyan
$pgFiles = rg -t go "pgx|pgxpool|sql.Open.*postgres" --files-with-matches go-services/ 2>$null
if ($pgFiles) {
    $pgFiles | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# E) Find HTTP servers
Write-Host "E) HTTP Servers:" -ForegroundColor Cyan
$httpFiles = rg -t go "http.Server|fiber|gin|echo" --files-with-matches go-services/ 2>$null
if ($httpFiles) {
    $httpFiles | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# F) List all Go packages
Write-Host "F) Go Packages:" -ForegroundColor Cyan
Push-Location go-services
$packages = go list ./... 2>$null
Pop-Location
if ($packages) {
    $packages | ForEach-Object { Write-Host "   - $_" }
} else {
    Write-Host "   None found" -ForegroundColor Yellow
}
Write-Host ""

# Save results
Write-Host "💾 Saving results to $outputFile..." -ForegroundColor Green
@"
# Go Services Infrastructure Discovery

## A) Config Loaders
$($configFiles -join "`n")

## B) Loggers
$($logFiles -join "`n")

## C) Redis Clients
$($redisFiles -join "`n")

## D) Postgres Clients
$($pgFiles -join "`n")

## E) HTTP Servers
$($httpFiles -join "`n")

## F) Go Packages
$($packages -join "`n")

## Next Steps

1. Review the files above to identify reusable infrastructure
2. Update `internal/infra/compat/*.go` to import these packages
3. Replace placeholder implementations with thin wrappers
4. Implement `internal/core/*` business logic

"@ | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ Discovery complete! Results saved to: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Next: Review DISCOVERY.md and update compat/*.go files" -ForegroundColor Cyan
