#!/bin/bash
# TensorRT-LLM Docker Setup for WSL2

echo "🚀 Setting up TensorRT-LLM in Docker WSL2..."

# Check NVIDIA Docker runtime
if ! docker info | grep -q nvidia; then
    echo "⚠️  Installing NVIDIA Container Toolkit..."

    # Add NVIDIA package repository
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

    sudo apt-get update
    sudo apt-get install -y nvidia-container-toolkit
    sudo systemctl restart docker
fi

# Pull TensorRT-LLM image
echo "📦 Pulling TensorRT-LLM Docker image..."
docker pull nvcr.io/nvidia/tensorrt-llm:tensorrt-llm

# Create TensorRT-LLM container
echo "🐳 Creating TensorRT-LLM container..."
docker run -d \
    --name tensorrt-llm \
    --runtime=nvidia \
    --gpus all \
    -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
    -e DISPLAY=$DISPLAY \
    -p 8000:8000 \
    nvcr.io/nvidia/tensorrt-llm:tensorrt-llm

echo "✅ TensorRT-LLM container ready!"
echo "🔗 Access: docker exec -it tensorrt-llm bash"