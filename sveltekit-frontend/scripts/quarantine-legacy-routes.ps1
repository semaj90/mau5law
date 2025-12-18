# scripts/quarantine-legacy-routes.ps1
# Safely quarantines legacy route trees and backup files so they stop compiling.
# - Moves known legacy/disabled routes out of src/routes into src/_quarantine_routes/<timestamp>
# - Moves backup suffix files (*.any-backup, *.css-bak, *.bak, *.backup) out of src
# - Creates backups under .svelte5-fix-backups/<timestamp>
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\quarantine-legacy-routes.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\quarantine-legacy-routes.ps1 -DryRun

param(
  [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

$root = Get-Location
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $root ".svelte5-fix-backups\$ts"
$quarantineRoot = Join-Path $root "src\_quarantine_routes\$ts"

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $quarantineRoot | Out-Null

function Move-WithBackup($srcPath, $destPath) {
  if (!(Test-Path $srcPath)) { return }

  $item = Get-Item $srcPath
  $name = $item.Name
  $backupPath = Join-Path $backupRoot $name
  $destFull = Join-Path $destPath $name

  Write-Host "▶ Quarantine: $srcPath -> $destFull"
  Write-Host "  Backup:     $srcPath -> $backupPath"

  if ($DryRun) { return }

  # Ensure destination directory exists
  if (!(Test-Path $destPath)) { New-Item -ItemType Directory -Force -Path $destPath | Out-Null }

  if ($item.PSIsContainer) {
      # Directory: Use Robocopy for robust handling of deep paths/locks
      # 1. Backup
      robocopy $srcPath $backupPath /E /NFL /NDL /NJH /NJS | Out-Null

      # 2. Move
      robocopy $srcPath $destFull /MOVE /E /NFL /NDL /NJH /NJS | Out-Null

      # Cleanup source if left behind (Robocopy /MOVE deletes files but sometimes leaves root)
      if (Test-Path $srcPath) { Remove-Item $srcPath -Force -Recurse -ErrorAction SilentlyContinue }
  } else {
      # File
      # 1. Backup
      Copy-Item -Force $srcPath $backupPath

      # 2. Move
      $parent = $item.DirectoryName
      robocopy $parent $destPath $name /MOV /NFL /NDL /NJH /NJS | Out-Null
  }
}

# 1) Quarantine known legacy/disabled route trees.
$targets = @(
  "src\routes\_yorha_legacy",
  "src\routes\archive",
  "src\routes\dashboard_disabled",
  "src\routes\(legal)_disabled",
  "src\routes\(tools)_disabled"
)

foreach ($t in $targets) {
  Move-WithBackup -srcPath (Join-Path $root $t) -destPath $quarantineRoot
}

# 2) Quarantine backup-suffix files in src/.
$backupGlobs = @("*.any-backup", "*.css-bak", "*.bak", "*.backup")
$found = @()

$srcPath = Join-Path $root "src"
if (Test-Path $srcPath) {
  foreach ($g in $backupGlobs) {
    $found += Get-ChildItem -Path $srcPath -Recurse -File -Filter $g -ErrorAction SilentlyContinue
  }
}

if ($found.Count -gt 0) {
  $junkDest = Join-Path $quarantineRoot "_loose_backups"
  New-Item -ItemType Directory -Force -Path $junkDest | Out-Null

  foreach ($f in $found) {
    Write-Host "▶ Quarantine file: $($f.FullName)"
    if ($DryRun) { continue }

    $backupFilePath = Join-Path $backupRoot ("file_" + $f.Name)
    Copy-Item -Force $f.FullName $backupFilePath
    Move-Item -Force $f.FullName (Join-Path $junkDest $f.Name)
  }
} else {
  Write-Host "✓ No loose backup files found under src/"
}

Write-Host ""
Write-Host "✅ Quarantine complete."
Write-Host "   Quarantine folder: $quarantineRoot"
Write-Host "   Backup folder:     $backupRoot"
Write-Host ""
Write-Host "Next checks:"
Write-Host "  npm run check:typescript"
Write-Host "  npm run build"
