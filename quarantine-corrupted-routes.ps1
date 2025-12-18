# Automated Quarantine Script for Corrupted Routes
# Phase 7 - Build Blocker Resolution

$ErrorActionPreference = "Continue"
$quarantineDir = "sveltekit-frontend/src/routes/_quarantine"
$maxAttempts = 20
$attempt = 0

# Ensure quarantine directory exists
New-Item -ItemType Directory -Force -Path $quarantineDir | Out-Null

Write-Host "🔍 Starting automated quarantine process..." -ForegroundColor Cyan
Write-Host "Max attempts: $maxAttempts" -ForegroundColor Gray

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "`n📦 Attempt $attempt/$maxAttempts - Running build..." -ForegroundColor Yellow

    # Run build and capture output
    $buildOutput = & npm run build --prefix sveltekit-frontend 2>&1 | Out-String

    # Check if build succeeded
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "Total routes quarantined: $($attempt - 1)" -ForegroundColor Cyan
        break
    }

    # Extract file path from error
    if ($buildOutput -match 'src/routes/([^\s]+\.svelte)') {
        $errorFile = $matches[1]
        $relativePath = $errorFile -replace '\.svelte.*', ''

        Write-Host "❌ Error in: $errorFile" -ForegroundColor Red

        # Extract route name for quarantine
        $routeName = ($relativePath -split '/')[-1]
        if ([string]::IsNullOrEmpty($routeName)) {
            $routeName = ($relativePath -split '/')[-2]
        }

        $sourcePath = "sveltekit-frontend/src/routes/$relativePath"
        $destPath = "$quarantineDir/$routeName"

        # Check if source exists
        if (Test-Path $sourcePath) {
            Write-Host "🚚 Quarantining: $relativePath → _quarantine/$routeName" -ForegroundColor Yellow

            # Move to quarantine
            try {
                Move-Item $sourcePath $destPath -Force -ErrorAction Stop
                Write-Host "✅ Quarantined successfully" -ForegroundColor Green

                # Log to file
                Add-Content -Path "PHASE7_QUARANTINE_LOG.txt" -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Quarantined: $relativePath"
            }
            catch {
                Write-Host "⚠️  Failed to quarantine: $_" -ForegroundColor Red
                break
            }
        }
        else {
            Write-Host "⚠️  Source path not found: $sourcePath" -ForegroundColor Red
            Write-Host "Trying parent directory..." -ForegroundColor Gray

            # Try parent directory
            $parentPath = Split-Path $sourcePath -Parent
            if (Test-Path $parentPath) {
                $parentName = Split-Path $parentPath -Leaf
                $destPath = "$quarantineDir/$parentName"
                Write-Host "🚚 Quarantining parent: $parentPath → _quarantine/$parentName" -ForegroundColor Yellow

                try {
                    Move-Item $parentPath $destPath -Force -ErrorAction Stop
                    Write-Host "✅ Quarantined successfully" -ForegroundColor Green
                    Add-Content -Path "PHASE7_QUARANTINE_LOG.txt" -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Quarantined: $parentPath"
                }
                catch {
                    Write-Host "⚠️  Failed to quarantine: $_" -ForegroundColor Red
                    break
                }
            }
            else {
                Write-Host "❌ Cannot find file to quarantine" -ForegroundColor Red
                break
            }
        }
    }
    else {
        Write-Host "❌ Could not extract error file from build output" -ForegroundColor Red
        Write-Host "Last 20 lines of output:" -ForegroundColor Gray
        $buildOutput -split "`n" | Select-Object -Last 20 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
        break
    }

    Start-Sleep -Seconds 1
}

if ($attempt -ge $maxAttempts) {
    Write-Host "`n⚠️  Reached maximum attempts ($maxAttempts)" -ForegroundColor Red
    Write-Host "Manual intervention may be required" -ForegroundColor Yellow
}

Write-Host "`n📊 Quarantine Summary:" -ForegroundColor Cyan
Write-Host "Attempts: $attempt" -ForegroundColor Gray
Write-Host "Quarantined routes:" -ForegroundColor Gray
Get-ChildItem $quarantineDir -Directory | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor DarkCyan
}
