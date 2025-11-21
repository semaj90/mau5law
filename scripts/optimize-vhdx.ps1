<#
.SYNOPSIS
  Run Hyper-V Optimize-VHD on a given VHDX (compact) with safety checks.

.DESCRIPTION
  This helper invokes the Hyper-V `Optimize-VHD` cmdlet to compact a VHDX file.
  The script checks for Administrator rights, verifies the presence of
  `Optimize-VHD`, supports a DryRun mode, and prints clear guidance if the
  environment isn't suitable (e.g., no Hyper-V module).

.EXAMPLE
  # Dry-run (prints actions only)
  .\optimize-vhdx.ps1 -Path 'C:\Users\james\AppData\Local\Docker\wsl\main\ext4.vhdx' -DryRun

.EXAMPLE
  # Real run (requires elevated PowerShell and Hyper-V PowerShell module)
  Start-Process powershell -Verb runAs -ArgumentList '-NoProfile -File "C:\path\to\optimize-vhdx.ps1" -Path "C:\...\ext4.vhdx"'

#>

param(
  [Parameter(Mandatory=$true)]
  [string]$Path,
  [ValidateSet('Full','Quick')]
  [string]$Mode = 'Full',
  [switch]$DryRun
)

function Write-Log { param($m,$l='INFO'); $t = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'); Write-Output "[$t] [$l] $m" }

# Check file exists
if (-not (Test-Path -LiteralPath $Path)) {
  Write-Log "VHDX not found: $Path" 'ERROR'
  exit 2
}

# Check for Admin
$isAdmin = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Log 'Optimize-VHD requires Administrator privileges. Re-run this script from an elevated PowerShell.' 'ERROR'
  Write-Log 'Example: Start-Process powershell -Verb runAs -ArgumentList "-NoProfile -File \"' + $MyInvocation.MyCommand.Definition + '\" -Path \"' + $Path + '\""' 'INFO'
  exit 3
}

# Check Optimize-VHD availability
$opt = Get-Command -Name Optimize-VHD -ErrorAction SilentlyContinue
if (-not $opt) {
  Write-Log 'Optimize-VHD cmdlet not found on this system. The Hyper-V PowerShell module is required.' 'ERROR'
  Write-Log 'If you do not have the module, use the diskpart or export/import flow instead.' 'INFO'
  exit 4
}

Write-Log "Preparing to run Optimize-VHD on: $Path (Mode: $Mode)"
if ($DryRun) { Write-Log "DryRun: would run Optimize-VHD -Path '$Path' -Mode $Mode" 'INFO'; exit 0 }

try {
  Write-Log 'Running Optimize-VHD (this may take minutes)...'
  Optimize-VHD -Path $Path -Mode $Mode
  Write-Log 'Optimize-VHD completed successfully.'
  exit 0
} catch {
  Write-Log "Optimize-VHD failed: $_" 'ERROR'
  exit 5
}
