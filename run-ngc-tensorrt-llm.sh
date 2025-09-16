#!/bin/bash

# NGC TensorRT-LLM Interactive Session
# Run the pre-configured environment with workspace mapping

echo "🚀 Starting NGC TensorRT-LLM Interactive Session"
echo "Container: nvcr.io/nvidia/tensorrt-llm:0.21.0-py3"
echo "Workspace: C:/Users/james/Videos/deeds-web-app → /workspace"
echo "GPU Access: RTX 3060 Ti (all GPUs enabled)"
echo

# Run non-interactive session and directly build Q4_K_M engine
docker run --gpus all --rm \
  -v "C:/Users/james/Videos/deeds-web-app:/workspace" \
  nvcr.io/nvidia/tensorrt-llm:0.21.0-py3 \
  bash -c "
    echo '✅ NGC TensorRT-LLM Environment Ready'
    echo 'Workspace: /workspace'
    echo 'GPU Access: Enabled'
    echo
    echo '🎯 Building Q4_K_M engine with RTX 3060 Ti optimizations'
    echo
    cd /workspace
    ls -la
    echo
    echo 'Starting TensorRT-LLM build...'
    python build-tensorrt-llm-rtx3060ti.py
    echo
    echo 'Build complete!'
  "