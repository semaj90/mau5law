# Ubuntu WSL2 TensorRT-LLM Setup Script
# Run this in Ubuntu WSL2: bash setup-tensorrt-ubuntu.sh

#!/bin/bash
set -e

echo "============================================================"
echo "🐧 UBUNTU WSL2 TENSORRT-LLM SETUP"
echo "============================================================"

# Check environment
echo "🔍 Checking Ubuntu environment..."
echo "   Ubuntu Version: $(lsb_release -d | cut -f2)"
echo "   Kernel: $(uname -r)"
echo "   Python: $(python3.12 --version)"
echo "   Docker: $(docker --version | cut -d' ' -f3)"

# Check CUDA
echo "🎮 Checking CUDA..."
if command -v nvidia-smi &> /dev/null; then
    echo "   GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader,nounits)"
    echo "   CUDA: $(nvidia-smi | grep "CUDA Version" | cut -d' ' -f9)"
else
    echo "   ❌ NVIDIA drivers not found"
    exit 1
fi

# Create workspace
echo "📁 Setting up workspace..."
cd ~
mkdir -p legal-ai-ubuntu
cd legal-ai-ubuntu

# Copy files from Windows
echo "📋 Copying files from Windows..."
cp /mnt/c/Users/james/Videos/deeds-web-app/tensorrt-llm-production-server.py .
cp /mnt/c/Users/james/Videos/deeds-web-app/simple-legal-ai-server.py .
cp /mnt/c/Users/james/Videos/deeds-web-app/test-legal-ai-simple.py .

# Copy Docker files
echo "🐳 Copying Docker configurations..."
cp /mnt/c/Users/james/Videos/deeds-web-app/Dockerfile.tensorrt-fixed .
cp /mnt/c/Users/james/Videos/deeds-web-app/docker-compose.tensorrt-llm.yml .

echo "✅ Files copied successfully:"
ls -la

echo ""
echo "============================================================"
echo "🚀 READY FOR TENSORRT-LLM BUILD"
echo "============================================================"
echo "Next steps:"
echo "1. cd ~/legal-ai-ubuntu"
echo "2. docker build -f Dockerfile.tensorrt-fixed -t tensorrt-legal-ubuntu ."
echo "3. docker run --gpus all -p 8100:8100 tensorrt-legal-ubuntu"
echo "============================================================"