# WSL Disk Space Management Commands
# Run these in PowerShell as Administrator

# 1. Check current VHDX file sizes
Write-Host "=== Current WSL Disk Usage ===" -ForegroundColor Cyan
$vhdxFiles = Get-ChildItem -Path "$env:LOCALAPPDATA\Packages" -Include "*.vhdx" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $vhdxFiles) {
    $sizeGB = [math]::Round($file.Length/1GB, 2)
    Write-Host "$($file.FullName): $sizeGB GB"
}

# 2. Shutdown WSL (required before compact)
Write-Host "`n=== Shutting down WSL ===" -ForegroundColor Yellow
wsl --shutdown

# 3. Compact Ubuntu disk
Write-Host "`n=== Compacting Ubuntu disk ===" -ForegroundColor Green
$ubuntuVhdx = "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu_79rhkp1fndgsc\LocalState\ext4.vhdx"
if (Test-Path $ubuntuVhdx) {
    diskpart /s compact-ubuntu.txt
    Write-Host "Ubuntu disk compacted"
} else {
    Write-Host "Ubuntu VHDX not found at expected location" -ForegroundColor Red
}

# 4. Compact Docker Desktop disk
Write-Host "`n=== Compacting Docker Desktop disk ===" -ForegroundColor Green
$dockerVhdx = "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx"
if (Test-Path $dockerVhdx) {
    diskpart /s compact-docker.txt
    Write-Host "Docker disk compacted"
} else {
    Write-Host "Docker VHDX not found at expected location" -ForegroundColor Red
}

Write-Host "`n=== Compact Complete ===" -ForegroundColor Cyan
Write-Host "Restart WSL with: wsl"