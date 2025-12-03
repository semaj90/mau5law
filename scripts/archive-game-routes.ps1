# Archive Game Routes
# Moves game-related routes (mario, tetris, n64, nes) to archive

$ErrorActionPreference = "Stop"
$baseDir = "sveltekit-frontend/src/routes"
$archiveBase = "$baseDir/archive/games"

# Create archive directory
if (!(Test-Path $archiveBase)) {
    New-Item -ItemType Directory -Force -Path $archiveBase | Out-Null
    Write-Host "🗂️  Created archive directory: $archiveBase" -ForegroundColor Cyan
}

# Define routes to archive
$gameRoutes = @(
    "mario",
    "tetris",
    "n64",
    "nes",
    "game",
    "games",
    "arcade"
)

$moved = 0
$skipped = 0

Write-Host "🎮 Starting game route archival..." -ForegroundColor Cyan

foreach ($route in $gameRoutes) {
    $sourcePath = Join-Path $baseDir $route

    if (Test-Path $sourcePath) {
        $destPath = Join-Path $archiveBase $route

        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "   ✅ Moved: $route" -ForegroundColor Green
            $moved++
        }
        catch {
            Write-Host "   ❌ Failed to move: $route - $($_.Exception.Message)" -ForegroundColor Red
            $skipped++
        }
    }
    else {
        Write-Host "   ⏭️  Skipped (not found): $route" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host "`n✅ Game archival complete!" -ForegroundColor Green
Write-Host "   Moved: $moved" -ForegroundColor Cyan
Write-Host "   Skipped: $skipped" -ForegroundColor DarkGray
