#!/bin/bash
# TensorRT-LLM Legal AI Production Launch Script
# Date: September 16, 2025
# Launches complete TensorRT-LLM stack with Docker

echo "========================================"
echo "🚀 TensorRT-LLM Legal AI Production"
echo "========================================"
echo "📅 Date: $(date)"
echo "🎯 Target: RTX 3060 Ti + Q4_K_M"
echo "🔥 Performance: <1ms inference"
echo ""

# Check Docker and GPU
echo "🔧 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop"
    exit 1
fi

if ! docker info | grep -q "nvidia"; then
    echo "⚠️ NVIDIA Docker runtime not detected"
    echo "💡 Install nvidia-docker2 or enable GPU support in Docker Desktop"
fi

echo "✅ Docker available"

# Check GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✅ GPU detected:"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠️ nvidia-smi not found - GPU may not be accessible"
fi

echo ""

# Build TensorRT-LLM image
echo "🏗️ Building TensorRT-LLM Docker image..."
docker build -f Dockerfile.tensorrt-llm -t tensorrt-llm-legal:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

echo ""

# Launch container
echo "🚀 Launching TensorRT-LLM Legal AI Server..."
echo "🌐 Server will be available at: http://localhost:8100"
echo "📊 Health check: http://localhost:8100/health"
echo "🧪 Test embedding: curl -X POST http://localhost:8100/v1/embeddings -H 'Content-Type: application/json' -d '{\"text\":\"legal contract analysis\"}'"
echo ""

# Run the container with GPU support
docker run --gpus all \
    --rm \
    -p 8100:8100 \
    -v "$(pwd)/models:/workspace/models" \
    -v "$(pwd)/engines:/workspace/engines" \
    --name tensorrt-llm-legal \
    tensorrt-llm-legal:latest

echo ""
echo "🏁 TensorRT-LLM Legal AI Server stopped"