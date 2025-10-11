param(
    [string]$RepoPath = "${PWD}",
    [string]$Image = 'nvcr.io/nvidia/tensorrt-llm/release:latest'
)

Write-Host "Starting TensorRT-LLM smoke-run using image: $Image"

$abs = (Resolve-Path $RepoPath).Path

docker run --rm -it --gpus all --ipc=host --ulimit memlock=-1 --ulimit stack=67108864 -v "${abs}:/workspace" -w /workspace $Image /bin/bash -lc "cd /workspace/smoke-test && chmod +x build.sh && ./build.sh"
