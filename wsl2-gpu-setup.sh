#!/bin/bash
# WSL2 GPU setup and optimization for Triton Legal AI
# Ubuntu 22.04 + CUDA 12.8 + Docker integration

set -e

echo "🐧 Setting up WSL2 GPU environment for Triton Legal AI..."

# Check if running in WSL2
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    echo "❌ This script must be run inside WSL2"
    echo "💡 Start WSL2: wsl -d Ubuntu-22.04"
    exit 1
fi

echo "✅ Running in WSL2 environment"

# Update system
echo "📦 Updating Ubuntu 22.04 packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y \
    wget \
    curl \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    build-essential \
    python3 \
    python3-pip \
    git \
    htop \
    nvidia-utils-550 \
    jq

# Check WSL2 GPU support
echo "🔍 Checking WSL2 GPU support..."
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected in WSL2:"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
else
    echo "❌ NVIDIA GPU not detected in WSL2!"
    echo "💡 Enable GPU support in Docker Desktop:"
    echo "   Settings > Resources > WSL Integration > Enable GPU support"
    echo "   Settings > Resources > Advanced > Memory: 8GB+"
    exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."

    # Add Docker repository
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add user to docker group
    sudo usermod -aG docker $USER

    echo "✅ Docker installed"
    echo "⚠️  You need to restart your shell or run: newgrp docker"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install NVIDIA Container Toolkit for WSL2
echo "🔧 Installing NVIDIA Container Toolkit..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt update
sudo apt install -y nvidia-container-toolkit

# Configure Docker for NVIDIA runtime
echo "🔧 Configuring Docker for GPU support..."
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker || echo "Docker service restart skipped in WSL2"

# Verify GPU access in Docker
echo "🔍 Testing GPU access in Docker..."
if docker run --rm --gpus all nvidia/cuda:12.8-base-ubuntu22.04 nvidia-smi; then
    echo "✅ GPU access in Docker working!"
else
    echo "❌ GPU access in Docker failed!"
    echo "💡 Try restarting Docker Desktop and WSL2"
    exit 1
fi

# Install CUDA 12.8 (if not present)
if ! nvcc --version | grep -q "release 12.8"; then
    echo "🔧 Installing CUDA 12.8..."

    # Add NVIDIA CUDA repository
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
    sudo dpkg -i cuda-keyring_1.0-1_all.deb
    sudo apt update

    # Install CUDA 12.8
    sudo apt install -y cuda-toolkit-12-8

    # Add CUDA to PATH
    echo 'export PATH=/usr/local/cuda-12.8/bin:$PATH' >> ~/.bashrc
    echo 'export LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc

    echo "✅ CUDA 12.8 installed"
    echo "⚠️  Source your bashrc: source ~/.bashrc"
else
    echo "✅ CUDA 12.8 already installed"
fi

# Install Python packages for legal AI
echo "🐍 Installing Python packages for legal AI..."
pip3 install --user --upgrade \
    torch==2.1.0+cu121 -f https://download.pytorch.org/whl/torch_stable.html \
    transformers>=4.36.0 \
    tokenizers \
    accelerate \
    optimum[onnxruntime-gpu] \
    tritonclient[all] \
    numpy \
    pandas \
    scikit-learn \
    sentence-transformers \
    langchain \
    chromadb \
    faiss-cpu \
    spacy \
    nltk \
    psutil \
    gpustat \
    aiohttp \
    asyncio

# Download spaCy model
python3 -m spacy download en_core_web_sm

# Create WSL2 optimization script
cat > ~/optimize-wsl2-gpu.sh << 'EOF'
#!/bin/bash
# WSL2 GPU optimization script

echo "🚀 Optimizing WSL2 for GPU workloads..."

# Set optimal CUDA environment variables
export CUDA_VISIBLE_DEVICES=0
export NVIDIA_VISIBLE_DEVICES=all
export CUDA_DEVICE_ORDER=PCI_BUS_ID
export CUDA_LAUNCH_BLOCKING=0
export CUDA_CACHE_DISABLE=0

# Optimize memory settings
echo "🔧 Setting GPU memory optimizations..."
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf

# GPU memory management
echo "🔧 Configuring GPU memory management..."
if command -v nvidia-smi &> /dev/null; then
    # Set GPU performance mode
    sudo nvidia-smi -pm 1
    # Set maximum performance mode
    sudo nvidia-smi -ac 405,1410  # Adjust for your GPU
fi

# Docker optimizations
echo "🐳 Optimizing Docker for GPU workloads..."
if [ -f /etc/docker/daemon.json ]; then
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
fi

sudo tee /etc/docker/daemon.json > /dev/null << 'DOCKER_EOF'
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    },
    "default-shm-size": "2G",
    "max-concurrent-downloads": 6,
    "max-concurrent-uploads": 6,
    "storage-driver": "overlay2",
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
DOCKER_EOF

echo "✅ WSL2 GPU optimizations applied"
echo "💡 Restart Docker and WSL2 for changes to take effect"
EOF

chmod +x ~/optimize-wsl2-gpu.sh

# Run optimizations
echo "🚀 Applying WSL2 optimizations..."
~/optimize-wsl2-gpu.sh

# Create performance monitoring script
cat > ~/monitor-gpu-performance.sh << 'EOF'
#!/bin/bash
# GPU performance monitoring for legal AI workloads

echo "📊 Starting GPU performance monitoring..."

# Function to show GPU stats
show_gpu_stats() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 GPU Performance - $(date)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if command -v nvidia-smi &> /dev/null; then
        nvidia-smi --query-gpu=timestamp,name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu,power.draw --format=csv,noheader,nounits

        echo ""
        echo "🔥 GPU Processes:"
        nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader

        echo ""
        echo "⚡ GPU Clock Speeds:"
        nvidia-smi --query-gpu=clocks.gr,clocks.mem --format=csv,noheader
    else
        echo "❌ nvidia-smi not available"
    fi

    echo ""
    echo "💾 System Memory:"
    free -h

    echo ""
    echo "⚙️  CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2 " " $3 " " $4 " " $5 " " $6 " " $7 " " $8}'

    echo ""
}

# Monitor continuously
if [ "$1" = "--continuous" ]; then
    while true; do
        clear
        show_gpu_stats
        echo "Press Ctrl+C to stop monitoring..."
        sleep 5
    done
else
    show_gpu_stats
fi
EOF

chmod +x ~/monitor-gpu-performance.sh

# Test Triton compatibility
echo "🧪 Testing Triton compatibility..."
if docker run --rm --gpus all nvcr.io/nvidia/tritonserver:24.08-py3 tritonserver --help | head -5; then
    echo "✅ Triton server compatible with WSL2 GPU"
else
    echo "⚠️  Triton compatibility test failed"
fi

# Final status
echo ""
echo "🎉 WSL2 GPU setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Ubuntu 22.04 updated"
echo "  ✅ Docker with GPU support"
echo "  ✅ NVIDIA Container Toolkit"
echo "  ✅ CUDA 12.8 toolkit"
echo "  ✅ Python packages for legal AI"
echo "  ✅ WSL2 optimizations applied"
echo ""
echo "🛠️  Available Commands:"
echo "  📊 Monitor GPU:          ~/monitor-gpu-performance.sh"
echo "  📊 Continuous monitor:   ~/monitor-gpu-performance.sh --continuous"
echo "  🚀 Optimize WSL2:        ~/optimize-wsl2-gpu.sh"
echo "  🧪 Test GPU in Docker:   docker run --rm --gpus all nvidia/cuda:12.8-base-ubuntu22.04 nvidia-smi"
echo ""
echo "🚀 Ready to run Triton Legal AI:"
echo "   git clone your-legal-ai-repo"
echo "   cd your-legal-ai-repo"
echo "   ./rebuild-engines-cuda128.sh"
echo "   ./start-triton-legal-ai.sh"
echo ""
echo "⚠️  Important:"
echo "   1. Restart your shell: source ~/.bashrc"
echo "   2. Verify GPU access: nvidia-smi"
echo "   3. Test Docker GPU: docker run --rm --gpus all nvidia/cuda:12.8-base-ubuntu22.04 nvidia-smi"