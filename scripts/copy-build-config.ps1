param(
  [string]$Container = "phase66-tensorrt-llm"
)

$localConfig = "$PSScriptRoot\build_config_int4.json"
$containerPath = "/workspace/engines/gemma3-legal-production/checkpoint_trt/build_config_int4.json"

# Ensure the directory exists in the container
docker exec $Container mkdir -p /workspace/engines/gemma3-legal-production/checkpoint_trt

# Copy the config file
docker cp $localConfig "${Container}:${containerPath}"

Write-Host "✅ Copied build_config_int4.json to container at ${containerPath}"