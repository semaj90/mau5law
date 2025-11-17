# WSL2 VHDX Optimization Script
# This script automates the process of compacting WSL2 VHDX files to reclaim disk space

param(
    [string]$VhdxPath = "",
    [switch]$Force
)

# Function to find WSL VHDX files
function Find-WSLVhdx {
    $wslPaths = @(
        "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\ext4.vhdx",
        "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx",
        "$env:LOCALAPPDATA\Docker\wsl\distro\ext4.vhdx",
        "$env:LOCALAPPDATA\Docker\wsl\disk\*.vhdx",
        "$env:LOCALAPPDATA\wsl\*\ext4.vhdx"
    )

    $foundVhdx = @()
    foreach ($path in $wslPaths) {
        $files = Get-Item $path -ErrorAction SilentlyContinue
        if ($files) {
            $foundVhdx += $files
        }
    }

    return $foundVhdx
}

# Function to shutdown WSL
function Stop-WSL {
    Write-Host "Shutting down WSL..." -ForegroundColor Yellow
    wsl --shutdown
    Start-Sleep -Seconds 5
}

# Function to attach VHD read-only
function Mount-VHDReadOnly {
    param([string]$Path)

    $diskpartScript = @"
select vdisk file="$Path"
attach vdisk readonly
"@

    $scriptPath = "$env:TEMP\mount_vhd.txt"
    $diskpartScript | Out-File -FilePath $scriptPath -Encoding ASCII

    Write-Host "Attaching VHD read-only: $Path" -ForegroundColor Yellow

    # Use Start-Process to avoid encoding issues
    $process = Start-Process -FilePath "diskpart.exe" -ArgumentList "/s", $scriptPath -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Error "Failed to attach VHD (exit code: $($process.ExitCode))"
        return $false
    }

    # Find the disk number
    Start-Sleep -Seconds 2  # Wait for disk to be recognized
    $diskInfo = Get-Disk | Where-Object { $_.Location -like "*$Path*" }
    if (-not $diskInfo) {
        Write-Error "Could not find attached disk"
        return $false
    }

    return $diskInfo.Number
}

# Function to optimize VHD
function Optimize-VHD {
    param([int]$DiskNumber)

    Write-Host "Optimizing disk $DiskNumber..." -ForegroundColor Yellow

    # Use defrag.exe to optimize
    $result = defrag.exe /O $DiskNumber 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Defrag returned exit code $LASTEXITCODE. This might be normal for some VHD types."
        Write-Host "Defrag output: $result" -ForegroundColor Gray
    } else {
        Write-Host "Optimization completed successfully" -ForegroundColor Green
    }
}

# Function to detach VHD
function Dismount-VHD {
    param([string]$Path)

    $diskpartScript = @"
select vdisk file="$Path"
detach vdisk
"@

    $scriptPath = "$env:TEMP\dismount_vhd.txt"
    $diskpartScript | Out-File -FilePath $scriptPath -Encoding ASCII

    Write-Host "Detaching VHD: $Path" -ForegroundColor Yellow

    # Use Start-Process to avoid encoding issues
    $process = Start-Process -FilePath "diskpart.exe" -ArgumentList "/s", $scriptPath -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Error "Failed to detach VHD (exit code: $($process.ExitCode))"
        return $false
    }

    return $true
}

# Check for admin rights
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Main script
Write-Host "WSL2 VHDX Optimization Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check admin rights
if (-not (Test-Administrator)) {
    Write-Host "This script requires administrator privileges to work with diskpart." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To run as administrator:" -ForegroundColor Cyan
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as administrator'" -ForegroundColor White
    Write-Host "3. Navigate to: cd 'C:\Users\james\Videos\deeds-web-app'" -ForegroundColor White
    Write-Host "4. Run: .\optimize-wsl-vhdx.ps1 -VhdxPath 'C:\Users\james\AppData\Local\Docker\wsl\disk\docker_data.vhdx' -Force" -ForegroundColor White
    exit 1
}

# Find VHDX files if not specified
if (-not $VhdxPath) {
    $vhdxFiles = Find-WSLVhdx
    if ($vhdxFiles.Count -eq 0) {
        Write-Error "No WSL VHDX files found. Please specify -VhdxPath parameter."
        exit 1
    }

    Write-Host "Found VHDX files:" -ForegroundColor Green
    for ($i = 0; $i -lt $vhdxFiles.Count; $i++) {
        Write-Host "  $($i + 1). $($vhdxFiles[$i].FullName)" -ForegroundColor White
    }

    if ($vhdxFiles.Count -gt 1) {
        $choice = Read-Host "Enter the number of the VHDX to optimize (1-$($vhdxFiles.Count))"
        $index = [int]$choice - 1
        if ($index -lt 0 -or $index -ge $vhdxFiles.Count) {
            Write-Error "Invalid choice"
            exit 1
        }
    } else {
        $index = 0
    }

    $VhdxPath = $vhdxFiles[$index].FullName
}

# Confirm file exists
if (-not (Test-Path $VhdxPath)) {
    Write-Error "VHDX file not found: $VhdxPath"
    exit 1
}

Write-Host "Target VHDX: $VhdxPath" -ForegroundColor Green

# Safety check
if (-not $Force) {
    $confirm = Read-Host "This will shutdown WSL and modify your VHDX file. Continue? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

try {
    # Step 1: Shutdown WSL
    Stop-WSL

    # Step 2: Attach VHD read-only
    $diskNumber = Mount-VHDReadOnly -Path $VhdxPath
    if (-not $diskNumber) {
        throw "Failed to mount VHD"
    }

    Write-Host "VHD attached as disk $diskNumber" -ForegroundColor Green

    # Step 3: Optimize
    Optimize-VHD -DiskNumber $diskNumber

    # Step 4: Detach VHD
    $detached = Dismount-VHD -Path $VhdxPath
    if (-not $detached) {
        Write-Warning "Failed to detach VHD. You may need to detach it manually in Disk Management."
    }

    Write-Host "VHDX optimization completed!" -ForegroundColor Green
    Write-Host "You can now restart WSL/Docker." -ForegroundColor Cyan

} catch {
    Write-Error "Optimization failed: $_"
    Write-Host "You may need to manually detach the VHD in Disk Management if it remains attached." -ForegroundColor Red
    exit 1
}
