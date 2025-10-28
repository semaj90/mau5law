<#
  Adds GPU acceleration configuration for RTX 3060 Ti to VS Code settings.json.
  It will:
   - Merge CMake CUDA configuration (NVCC, sm_75, Release)
   - Add terminal CUDA environment vars
   - Preserve all existing keys in the settings file
#>

# Accept a -dryRun switch to preview changes without writing files
param(
  [switch]$dryRun,
  [switch]$AutoAccept
)

$settingsPath = ".vscode\settings.json"
$backupPath = ".vscode\settings.json.bak"

# Helper to safely append a path fragment to an existing PATH-like value
function Append-PathFragment([string]$existing, [string]$fragment) {
  if ([string]::IsNullOrWhiteSpace($existing)) { return $fragment }
  # Normalize separators for comparison
  $normExisting = $existing -replace '\\','/'
  $normFragment = $fragment -replace '\\','/'
  if ($normExisting -like "*$normFragment*") { return $existing }
  return "${existing};${fragment}"
}

  # Auto-detect installed CUDA root directory (returns first highest-version folder)
  # Returns an array of candidate CUDA roots (may be empty)
  function Detect-CudaRoots {
    $candidates = @(
      'C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA',
      'C:\\Program Files (x86)\\NVIDIA GPU Computing Toolkit\\CUDA'
    )
    $found = @()
    foreach ($base in $candidates) {
      if (Test-Path $base) {
        $dirs = Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
        $found += $dirs
      }
    }

    # Also attempt to find nvcc on PATH
    try {
      $nvccCmd = Get-Command nvcc.exe -ErrorAction SilentlyContinue
      if ($nvccCmd) {
        $nvccPath = Split-Path $nvccCmd.Path -Parent
        # parent of bin is root
        $root = Split-Path $nvccPath -Parent
        if ($root -and (-not ($found -contains $root))) { $found += $root }
      }
    } catch { }

    # Try registry (HKLM) for CUDA installation information (best-effort)
    try {
      $regKeys = @(
        'HKLM:\SOFTWARE\NVIDIA Corporation\CUDA',
        'HKLM:\SOFTWARE\WOW6432Node\NVIDIA Corporation\CUDA'
      )
      foreach ($rk in $regKeys) {
        if (Test-Path $rk) {
          Get-ChildItem -Path $rk -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.PSChildName -and $_.PSChildName -match 'v?\d+') {
              $v = $_.PSChildName
              $candidate = "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\$v"
              if (Test-Path $candidate -and (-not ($found -contains $candidate))) { $found += $candidate }
            }
          }
        }
      }
    } catch { }

    return $found | Sort-Object -Unique
  }

Write-Host "🚀 Enabling GPU acceleration in $settingsPath ..."

# Ensure .vscode directory exists
$dir = Split-Path $settingsPath -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

# Ensure file exists
# If dry-run and a backup exists, prefer reading from the backup for a realistic preview
if ($dryRun -and (Test-Path $backupPath)) {
  Write-Host "Dry-run: reading existing settings from $backupPath"
  $raw = Get-Content $backupPath -Raw
} else {
  if (-not (Test-Path $settingsPath)) {
    Write-Host "Creating new settings.json..."
    New-Item -ItemType File -Path $settingsPath -Force | Out-Null
    Set-Content $settingsPath "{}"
  }
  $raw = Get-Content $settingsPath -Raw
}

# Backup current settings (attempt; ignore failures for read-only environments)
try {
  if (Test-Path $settingsPath) { Copy-Item -Path $settingsPath -Destination $backupPath -Force }
  Write-Host "Backup created at $backupPath"
} catch {
  Write-Host "⚠️ Failed to create backup (continuing): $_" -ForegroundColor Yellow
}

# Read current JSON safely
if (Test-Path $settingsPath) { $raw = Get-Content $settingsPath -Raw } else { $raw = "" }
try {
  $json = if ($raw.Trim() -eq '') { @{} } else { $raw | ConvertFrom-Json }
} catch {
  Write-Host "⚠️ Failed to parse existing JSON. Overwriting with a merged object." -ForegroundColor Yellow
  $json = @{}
}

if (-not $json) { $json = @{} }

# --- CMake GPU config ---
# Ensure cmake.configureSettings exists
if (-not $json."cmake.configureSettings") { $json | Add-Member -NotePropertyName "cmake.configureSettings" -NotePropertyValue @{} -Force }

# Discover CUDA roots and pick one (interactive if multiple)
$candidates = Detect-CudaRoots
if ($candidates.Count -eq 0) {
  Write-Host "⚠️ No CUDA installations found under Program Files or on PATH. Falling back to v13.0 defaults." -ForegroundColor Yellow
  $chosenRoot = 'C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v13.0'
} elseif ($candidates.Count -eq 1) {
  $chosenRoot = $candidates[0]
  Write-Host "Detected CUDA root: $chosenRoot"
} else {
  Write-Host "Multiple CUDA installations detected:" -ForegroundColor Cyan
  for ($i = 0; $i -lt $candidates.Count; $i++) { Write-Host "  [$($i+1)] $($candidates[$i])" }
  if ($AutoAccept) {
    Write-Host "AutoAccept enabled: selecting first candidate by default." -ForegroundColor Cyan
    $idx = 0
  } else {
    try {
      $choice = Read-Host "Select CUDA installation [default: 1] (enter number)"
      if ([string]::IsNullOrWhiteSpace($choice)) { $choice = '1' }
      $idx = [int]$choice - 1
      if ($idx -lt 0 -or $idx -ge $candidates.Count) { $idx = 0 }
    } catch {
      $idx = 0
    }
  }
  $chosenRoot = $candidates[$idx]
}

# Normalize chosen root and nvcc path
$chosenRoot = $chosenRoot -replace '/','\\'
$nvccPath = (Join-Path $chosenRoot 'bin\nvcc.exe') -replace '\\','/'
$cudaPathWin = $chosenRoot

# Try to get nvcc version via nvcc --version if available
function Get-NvccVersionFromNvcc([string]$nvccFullPath) {
  try {
    $cmd = & "$nvccFullPath" --version 2>$null
    if ($cmd) {
      foreach ($line in $cmd) {
        if ($line -match 'release\s+([0-9]+)\.([0-9]+)') { return "$($Matches[1]).$($Matches[2])" }
      }
    }
  } catch { }
  return $null
}

$nvccVersion = Get-NvccVersionFromNvcc($nvccPath)
if ($nvccVersion) { Write-Host "nvcc version detected: $nvccVersion" }

# --- GPU model detection (best-effort) ---
function Detect-GPUModel {
  try {
    $out = & nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
    if ($out) { return $out -split "`n" | Select-Object -First 1 }
  } catch { }
  return $null
}

$gpuModel = Detect-GPUModel
if ($gpuModel) { Write-Host "Detected GPU model: $gpuModel" }

# Map GPU model to CUDA architecture (heuristic)
function Guess-CudaArchFromModel([string]$model) {
  if (-not $model) { return '75' }
  $m = $model.ToLower()
  if ($m -match '4090|4080') { return '89' }
  # Ampere (30-series) compute capability 8.6 for 3060 / 3060 Ti; 3080/3090 use 8.6/8.6 variants
  if ($m -match '3090|3080|3080 ti|3090 ti') { return '86' }
  if ($m -match '3070') { return '86' }
  if ($m -match '3060') { return '86' }
  if ($m -match 'a100|a40|a30') { return '80' }
  return '75'
}

$defaultArch = Guess-CudaArchFromModel($gpuModel)
Write-Host "Suggested CMAKE_CUDA_ARCHITECTURES: $defaultArch"
if ($AutoAccept) {
  $archChoice = $defaultArch
} else {
  try {
    $archChoice = Read-Host "Enter CUDA arch (e.g. 75) or press Enter to accept suggested [$defaultArch]"
    if ([string]::IsNullOrWhiteSpace($archChoice)) { $archChoice = $defaultArch }
  } catch { $archChoice = $defaultArch }
}

# Apply CMake settings
$json."cmake.configureSettings"."CMAKE_CUDA_COMPILER" = $nvccPath
$json."cmake.configureSettings"."CMAKE_CUDA_ARCHITECTURES" = $archChoice
$json."cmake.configureSettings"."CMAKE_CUDA_STANDARD" = "17"
$json."cmake.configureSettings"."CMAKE_CUDA_SEPARABLE_COMPILATION" = "ON"
$json."cmake.configureSettings"."CMAKE_CUDA_RESOLVE_DEVICE_SYMBOLS" = "ON"
$json."cmake.configureSettings"."CMAKE_BUILD_TYPE" = "Release"

$json."cmake.generator" = "Ninja"
$json."cmake.parallelJobs" = 12
$json."cmake.buildDirectory" = '${workspaceFolder}/build/gpu-release'
$json."cmake.configureOnOpen" = $true

# --- Terminal CUDA env vars ---
if (-not $json."terminal.integrated.env.windows") { $json | Add-Member -NotePropertyName "terminal.integrated.env.windows" -NotePropertyValue @{} -Force }

$envConfig = $json."terminal.integrated.env.windows"

# Set CUDA path and visibility
$envConfig."CUDA_PATH" = $cudaPathWin
$envConfig."CUDA_VISIBLE_DEVICES" = "0"

# Append CUDA bin & lib paths to existing PATH safely
$existingPath = $envConfig."PATH" -as [string]
if (-not $existingPath) { $existingPath = '${env:PATH}' }
$binFragment = Join-Path $cudaPathWin 'bin'
$libFragment = Join-Path $cudaPathWin 'libnvvp'
$existingPath = Append-PathFragment $existingPath $binFragment
$existingPath = Append-PathFragment $existingPath $libFragment
$envConfig."PATH" = $existingPath

$envConfig."NVIDIA_VISIBLE_DEVICES" = "all"
# TORCH expects dotted form like 8.6 for Ampere; convert numeric archChoice into dotted when applicable
function Arch-ToDotted([string]$arch) {
  if ($arch -match '^([0-9]{2})$') { return "$($Matches[1].Substring(0,1)).$($Matches[1].Substring(1))" }
  return $arch
}
$envConfig."TORCH_CUDA_ARCH_LIST" = Arch-ToDotted($archChoice)
$envConfig."NODE_OPTIONS" = "--max-old-space-size=20480"

$json."terminal.integrated.env.windows" = $envConfig


# If dry-run, print merged JSON and exit without writing
try {
  $outJson = $json | ConvertTo-Json -Depth 10
} catch {
  Write-Host "❌ Failed to serialize merged JSON: $_" -ForegroundColor Red
  exit 1
}

if ($dryRun) {
  Write-Host "--- DRY RUN: Merged .vscode/settings.json preview ---`n"
  Write-Host $outJson
  Write-Host "--- END DRY RUN ---"
  exit 0
}

# Write merged JSON (pretty)
try {
  $json | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
  Write-Host "✅ GPU acceleration settings applied successfully!"
  Write-Host "→ Open VS Code, run 'CMake: Configure', and verify nvcc.exe is detected."
} catch {
  Write-Host "❌ Failed to write settings.json: $_" -ForegroundColor Red
}

# Post-configure verifier: check for CMake logs
function Check-CMakeOutputLog {
  $cmakeLog = Join-Path "build/gpu-release" "CMakeFiles/CMakeOutput.log"
  if (Test-Path $cmakeLog) {
    Write-Host "🔎 CMake output log found at: $cmakeLog" -ForegroundColor Green
    try {
      $first = Get-Content $cmakeLog -TotalCount 20
      Write-Host "--- CMakeOutput.log (head) ---"
      $first | ForEach-Object { Write-Host $_ }
      Write-Host "--- end ---"
    } catch { }
  } else {
    Write-Host "ℹ️ CMakeOutput.log not found. Run CMake configure (CMake: Configure) to generate logs." -ForegroundColor Yellow
  }
}

if ($AutoAccept) { Check-CMakeOutputLog }
