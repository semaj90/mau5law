<#
  verify-gpu-build.ps1
  Verifies GPU toolchain availability and basic CMake CUDA detection.

  Checks:
   - nvcc in PATH and at configured path
   - nvidia-smi output
   - CMake configure output (build/gpu-release/CMakeFiles/CMakeOutput.log)
#>

Write-Host "Verifying GPU toolchain and CMake configuration..."

$nvccPathsToCheck = @(
  "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v13.0\\bin\\nvcc.exe",
  "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v12.2\\bin\\nvcc.exe",
  "nvcc"
)

 $nvccFound = $false
 foreach ($p in $nvccPathsToCheck) {
  try {
    $which = $null
    if ($p -eq 'nvcc') {
      $cmd = Get-Command nvcc -ErrorAction SilentlyContinue
      if ($cmd) { $which = $cmd.Source }
    } else {
      if (Test-Path $p) { $which = $p }
    }
    if ($which) {
      Write-Host "nvcc found: $which"
      $nvccFound = $true
      # Try to get nvcc version
      try {
        $ver = & "$which" --version 2>&1
        if ($ver) { Write-Host "nvcc --version:`n$ver" }
      } catch { }
      break
    }
  } catch {
    # ignore individual probe errors
  }
 }
 if (-not $nvccFound) { Write-Host "nvcc not found on PATH or standard locations" -ForegroundColor Red }

# Check nvidia-smi
try {
  $nvsmi = & nvidia-smi 2>&1
  if ($LASTEXITCODE -eq 0) {
        Write-Host "nvidia-smi detected"
        # Print a few header lines
        try {
          $slice = $nvsmi[0..5] -join "`n"
          Write-Host $slice
        } catch {
          Write-Host $nvsmi -join "`n"
        }
  } else {
    Write-Host "⚠️ nvidia-smi returned non-zero exit code; check drivers" -ForegroundColor Yellow
    Write-Host $nvsmi -join "`n"
  }
} catch {
  Write-Host "❌ nvidia-smi not found or failed to execute" -ForegroundColor Red
}

# Check CMake configure logs for CUDA compiler detection
$cmakeLog = "build/gpu-release/CMakeFiles/CMakeOutput.log"
if (Test-Path $cmakeLog) {
  Write-Host "Parsing CMake output log for CUDA compiler lines..."
  $lines = Get-Content $cmakeLog -Raw
  if ($lines -match "CMAKE_CUDA_COMPILER") {
    Write-Host "✅ CMake configured CUDA compiler: ($matches[0])"
  } elseif ($lines -match "Using CMAKE_CUDA_COMPILER") {
    Write-Host "✅ CMake explicitly logged 'Using CMAKE_CUDA_COMPILER'"
  } else {
    Write-Host "CMake log does not explicitly show CUDA compiler selection; run 'CMake: Configure' in VS Code and inspect output." -ForegroundColor Yellow
  }
} else {
  Write-Host "CMake output log not found at $cmakeLog; run CMake configure step first" -ForegroundColor Yellow
}

Write-Host "Done. If nvcc and nvidia-smi are detected, you should be ready to build CUDA-enabled targets."