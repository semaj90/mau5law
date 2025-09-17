#!/bin/bash
# Quick Ubuntu TensorRT Setup - Run in Ubuntu terminal

echo "🐧 Ubuntu TensorRT-LLM Quick Setup"
echo "=================================="

# Check environment
echo "📋 Environment Check:"
echo "   Ubuntu: $(lsb_release -d | cut -f2)"
echo "   Python: $(python3.12 --version)"
echo "   Docker: $(docker --version | cut -d' ' -f3)"
echo "   GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader,nounits)"

# Create workspace
mkdir -p ~/legal-ai-ubuntu
cd ~/legal-ai-ubuntu

# Copy essential files
echo "📁 Copying files..."
cp /mnt/c/Users/james/Videos/deeds-web-app/tensorrt-llm-production-server.py .
cp /mnt/c/Users/james/Videos/deeds-web-app/simple-legal-ai-server.py .
cp /mnt/c/Users/james/Videos/deeds-web-app/Dockerfile.ubuntu-tensorrt .
cp /mnt/c/Users/james/Videos/deeds-web-app/docker-compose.ubuntu-tensorrt.yml .

echo "✅ Setup complete! Files in ~/legal-ai-ubuntu:"
ls -la

echo ""
echo "🚀 Next: Run Docker build"
echo "docker build -f Dockerfile.ubuntu-tensorrt -t tensorrt-legal-ubuntu ."