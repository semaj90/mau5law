param(
  [Parameter(Mandatory=$true)][string]$ConvertedDir,
  [Parameter(Mandatory=$true)][string]$EngineOutDir,
  [Parameter(Mandatory=$true)][ValidateSet('int4','fp8','fp16')][string]$Profile,
  [int]$MaxBatch=1,
  [int]$MaxInputTokens=4096
)
if (-not (Test-Path $ConvertedDir)) { Write-Error "ConvertedDir not found"; exit 1 }
New-Item -ItemType Directory -Force -Path $EngineOutDir | Out-Null
$common = @('--checkpoint_dir', $ConvertedDir, '--output_dir', $EngineOutDir, '--max_batch_size', $MaxBatch, '--max_input_len', $MaxInputTokens)
if ($Profile -eq 'int4') { $common += '--int4' }
elseif ($Profile -eq 'fp8') { $common += '--fp8' }
Write-Host "Running trtllm-build profile=$Profile"
trtllm-build @common
Write-Host "Engine build complete -> $EngineOutDir"
