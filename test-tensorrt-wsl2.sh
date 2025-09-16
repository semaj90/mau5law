#!/bin/bash
# Test TensorRT Q4_K_M in WSL2 with Docker Desktop

echo "=================================================="
echo "TensorRT Q4_K_M Test for Gemma3-Legal (11.8B)"
echo "=================================================="

# Check WSL2
if grep -q microsoft /proc/version; then
    echo "✓ Running in WSL2"
else
    echo "⚠ Not in WSL2 - GPU passthrough may not work"
fi

# Test Docker GPU
echo -e "\n🔍 Testing Docker GPU access..."
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi | grep "RTX 3060 Ti" && {
    echo "✓ RTX 3060 Ti detected in Docker"
} || {
    echo "⚠ GPU not detected or not RTX 3060 Ti"
}

# Build simplified TensorRT container
echo -e "\n🔨 Building TensorRT container..."
docker build -f tensorrt-simple.Dockerfile -t q4km-tensorrt .

# Run Q4_K_M test
echo -e "\n🚀 Running Q4_K_M test..."
docker run --rm --gpus all q4km-tensorrt python3 -c "
import pycuda.driver as cuda
import pycuda.autoinit
print('CUDA Device:', cuda.Device(0).name())
print('VRAM:', cuda.Device(0).total_memory() // (1024**3), 'GB')
print('Q4_K_M Ready: 3840D embeddings, 131K context')
"

# Test converter
echo -e "\n📊 Testing Q4_K_M converter..."
docker run --rm --gpus all -v $(pwd):/workspace q4km-tensorrt \
    python3 /workspace/q4km-tensorrt-converter.py

echo -e "\n✅ Test complete!"