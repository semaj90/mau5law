# PowerShell script to find and compact WSL Ubuntu VHDX

Write-Host "Shutting down WSL..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3

Write-Host "`nSearching for Ubuntu VHDX files..." -ForegroundColor Yellow

# Common WSL2 VHDX locations
$searchPaths = @(
    "$env:LOCALAPPDATA\Packages",
    "$env:USERPROFILE",
    "$env:LOCALAPPDATA\Docker",
    "$env:ProgramData\DockerDesktop",
    "C:\WSL",
    "D:\WSL"
)

$vhdxFiles = @()

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "Searching in: $path"
        $found = Get-ChildItem -Path $path -Filter "*.vhdx" -Recurse -ErrorAction SilentlyContinue |
                 Where-Object { $_.Length -gt 1GB }
        if ($found) {
            $vhdxFiles += $found
        }
    }
}

if ($vhdxFiles.Count -eq 0) {
    Write-Host "`nNo VHDX files found larger than 1GB" -ForegroundColor Red
    exit
}

Write-Host "`nFound VHDX files:" -ForegroundColor Green
$vhdxFiles | ForEach-Object {
    $sizeGB = [math]::Round($_.Length / 1GB, 2)
    Write-Host "  $($_.FullName) - Size: $sizeGB GB"
}

# Ask user to confirm
$ubuntuVhdx = $vhdxFiles | Where-Object { $_.Name -like "*ext4*" -or $_.Directory -like "*Ubuntu*" } | Select-Object -First 1

if ($ubuntuVhdx) {
    Write-Host "`nLikely Ubuntu VHDX: $($ubuntuVhdx.FullName)" -ForegroundColor Cyan
    $confirm = Read-Host "Compact this file? (Y/N)"

    if ($confirm -eq 'Y') {
        Write-Host "`nCompacting VHDX..." -ForegroundColor Yellow

        # Create diskpart script
        $scriptPath = "$env:TEMP\compact-vhdx.txt"
        @"
select vdisk file="$($ubuntuVhdx.FullName)"
compact vdisk
exit
"@ | Out-File -FilePath $scriptPath -Encoding ASCII

        # Run diskpart
        diskpart /s $scriptPath

        # Clean up
        Remove-Item $scriptPath

        Write-Host "`nCompaction complete!" -ForegroundColor Green
    }
}