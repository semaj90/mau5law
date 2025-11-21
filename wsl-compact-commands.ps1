<#
.SYNOPSIS
  WSL2 VHDX optimization and export/import helper script.

.DESCRIPTION
  This script helps locate WSL ext4.vhdx files, optionally run Hyper-V's
  Optimize-VHD (if available), or perform a safe export -> unregister -> import
  cycle to reclaim disk space. It performs `wsl --shutdown` automatically
  (unless --no-shutdown) and supports a dry-run mode.

.NOTES
  - Running Optimize-VHD requires the Hyper-V PowerShell module and admin
    privileges. If Optimize-VHD is not available, use the export/import flow.
  - Export/import requires free disk space for the exported tar (roughly the
    used data size inside the distro).
  - This script is careful and prints commands before executing them when
    running in DryRun mode.

EXAMPLES
  # Find VHDX files and show them:
  .\wsl-compact-commands.ps1 -List

  # Optimize a specific VHDX (requires admin + Hyper-V module):
  .\wsl-compact-commands.ps1 -VhdxPath 'C:\Users\james\AppData\Local\Packages\...\LocalState\ext4.vhdx' -OptimizeVhd

  # Export, unregister, and re-import a distro (recommended if Optimize-VHD unavailable):
  .\wsl-compact-commands.ps1 -DistroName Ubuntu -ExportTar C:\temp\Ubuntu-export.tar -ImportLocation C:\wsl\Ubuntu -ExportImport

#>

[CmdletBinding()]
param(
  [switch]$List,
  [string]$VhdxPath,
  [string]$DistroName,
  [string]$ExportTar,
  [string]$ImportLocation,
  [switch]$OptimizeVhd,
  [switch]$ExportImport,
  [switch]$NoShutdown,
  [switch]$DryRun
)

function Write-Log {
  param([string]$Message, [string]$Level = 'INFO')
  $ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  Write-Output "[$ts] [$Level] $Message"
}

function Find-VhdxFiles {
  $roots = @($env:LOCALAPPDATA, $env:ProgramData, 'C:\') | Where-Object { $_ }
  $found = @()
  foreach ($r in $roots) {
    try {
      $items = Get-ChildItem -Path $r -Filter ext4.vhdx -Recurse -ErrorAction SilentlyContinue -Force
      if ($items) { $found += $items }
    } catch { }
  }
  return $found | Select-Object -Unique FullName
}

if ($List) {
  Write-Log 'Listing ext4.vhdx files (this may take a moment)...'
  $v = Find-VhdxFiles
  if (!$v) { Write-Log 'No WSL ext4.vhdx files found.' 'WARN'; exit 0 }
  $v | ForEach-Object { Write-Output $_ }
  exit 0
}

if (-not $NoShutdown) {
  Write-Log 'Shutting down WSL to ensure VHDX files are quiescent...'
  if ($DryRun) { Write-Log 'DryRun: would run: wsl --shutdown' } else { wsl --shutdown }
}

if ($VhdxPath) {
  if (-not (Test-Path $VhdxPath)) { Write-Log "VHDX not found at: $VhdxPath" 'ERROR'; exit 2 }
  $vhdx = (Get-Item -LiteralPath $VhdxPath).FullName
} else {
  Write-Log 'Auto-searching for ext4.vhdx files...'
  $found = Find-VhdxFiles
  if (-not $found) { Write-Log 'No ext4.vhdx files found. Use -List to search.' 'ERROR'; exit 3 }
  if ($found.Count -gt 1) {
    Write-Log "Multiple VHDX files found; using the first one. Run with -List to see all." 'WARN'
  }
  $vhdx = $found[0]
}

Write-Log "Selected VHDX: $vhdx"

if ($OptimizeVhd) {
  # Check for Optimize-VHD
  $optCmd = Get-Command -Name Optimize-VHD -ErrorAction SilentlyContinue
  if (-not $optCmd) {
    Write-Log 'Optimize-VHD not available on this system. Install Hyper-V PowerShell module or use -ExportImport.' 'ERROR'
    exit 4
  }
  Write-Log 'Optimize-VHD is available.'
  if ($DryRun) {
    Write-Log "DryRun: would run Optimize-VHD -Path '$vhdx' -Mode Full" 'INFO'
    exit 0
  }
  # Ensure admin
  $isAdmin = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Log 'Optimize-VHD requires Administrator privileges. Re-run this script from an elevated PowerShell.' 'ERROR'
    exit 5
  }
  Write-Log 'Running Optimize-VHD (this may take several minutes)...'
  Optimize-VHD -Path $vhdx -Mode Full
  Write-Log 'Optimize-VHD completed.'
  exit 0
}

if ($ExportImport) {
  if (-not $DistroName) { Write-Log 'When using -ExportImport you must specify -DistroName' 'ERROR'; exit 6 }
  if (-not $ExportTar) {
    $tmp = Join-Path $env:TEMP ("$DistroName-export-$(Get-Date -Format yyyyMMdd-HHmmss).tar")
    Write-Log "No -ExportTar provided. Using temporary tar: $tmp"
    $ExportTar = $tmp
  }
  if (-not $ImportLocation) {
    $defaultImport = Join-Path 'C:\wsl' $DistroName
    Write-Log "No -ImportLocation provided. Using default: $defaultImport"
    $ImportLocation = $defaultImport
  }

  Write-Log "Exporting distro '$DistroName' to: $ExportTar"
  if ($DryRun) {
    Write-Log "DryRun: would run: wsl --export $DistroName $ExportTar" 'INFO'
    Write-Log "DryRun: would run: wsl --unregister $DistroName" 'INFO'
    Write-Log "DryRun: would run: wsl --import $DistroName $ImportLocation $ExportTar --version 2" 'INFO'
    exit 0
  }

  try {
    Write-Log 'Running: wsl --export' ; wsl --export $DistroName $ExportTar
  } catch {
    Write-Log "wsl --export failed: $_" 'ERROR'; exit 7
  }

  try {
    Write-Log 'Unregistering distro (this removes the distro registration, not the exported tar)'; wsl --unregister $DistroName
  } catch {
    Write-Log "wsl --unregister failed: $_" 'ERROR'; exit 8
  }

  # Create import folder if missing
  if (-not (Test-Path $ImportLocation)) { New-Item -ItemType Directory -Path $ImportLocation -Force | Out-Null }

  try {
    Write-Log "Importing distro from tar into: $ImportLocation"; wsl --import $DistroName $ImportLocation $ExportTar --version 2
  } catch {
    Write-Log "wsl --import failed: $_" 'ERROR'; exit 9
  }

  Write-Log 'Export/import cycle completed successfully.'
  Write-Log "You can delete the exported tar if you no longer need it: $ExportTar" 'INFO'
  exit 0
}

Write-Log 'No action specified. Use -OptimizeVhd or -ExportImport, or use -List to locate VHDX files.'
exit 0
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