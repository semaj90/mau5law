<#
List WSL VHDX finder
Run this from an elevated PowerShell (Run as Administrator) to reliably discover
WSL / Docker ext4.vhdx files and their sizes.

Usage:
  .\list-wsl-vhdx.ps1 -List

#>

param(
    [switch]$List
)

function Find-WSLVhdx {
    $wslPaths = @(
        # Standard Ubuntu/Distro location
        "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\ext4.vhdx",
        # Docker Desktop legacy location
        "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx",
        # Docker Desktop newer main location
        "$env:LOCALAPPDATA\Docker\wsl\distro\ext4.vhdx",
        # Another common Docker Desktop VHDX location
        "$env:LOCALAPPDATA\Docker\wsl\main\ext4.vhdx",
        # Generic packages location
        "$env:LOCALAPPDATA\Packages\*ext4.vhdx"
    )

    $foundVhdx = @()
    foreach ($path in $wslPaths) {
        $files = Get-Item $path -ErrorAction SilentlyContinue
        if ($files) {
            $foundVhdx += $files
        }
    }

    if ($foundVhdx.Count -eq 0) {
        Write-Host "No WSL VHDX files found." -ForegroundColor Yellow
        return $null
    }

    Write-Host "--- Discovered WSL VHDX Files ---" -ForegroundColor Cyan
    $foundVhdx | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "Path: $($_.FullName)" -ForegroundColor White
        Write-Host "Size: $sizeMB MB" -ForegroundColor Yellow
        Write-Host "---"
    }

    return $foundVhdx
}

if ($List) {
    Find-WSLVhdx | Out-Null
    exit 0
}

Write-Host "No action specified. Use -List to enumerate VHDX files." -ForegroundColor Gray
exit 0
