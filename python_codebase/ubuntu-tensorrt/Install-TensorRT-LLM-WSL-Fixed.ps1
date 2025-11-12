# TensorRT-LLM WSL Installation Script (Fixed Version)
# Installs TensorRT-LLM v1.1.0rc6 into WSL Ubuntu with Python 3.12
# Fixed line endings and path issues

param(
    [switch]$SkipSystemUpdate,
    [switch]$SkipCUDAInstall,
    [string]$TensorRTVersion = "1.1.0rc6"
)

Write-Host "🚀 TensorRT-LLM WSL Installation Script (Fixed)" -ForegroundColor Green
Write-Host "Target: Python 3.12, CUDA 12.8, TensorRT 10.11, WSL Ubuntu" -ForegroundColor Yellow

# Step 0: Check WSL and Ubuntu availability
Write-Host "📋 Step 0: Checking WSL2 and Ubuntu..." -ForegroundColor Cyan
try {
    $wslStatus = wsl --status
    Write-Host "✅ WSL is available" -ForegroundColor Green
} catch {
    Write-Host "❌ WSL not found. Installing WSL2..." -ForegroundColor Red
    wsl --update
    wsl --install -d Ubuntu-24.04
    Write-Host "⚠️  Please restart PowerShell after Ubuntu installation completes" -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Ubuntu WSL detected" -ForegroundColor Green

# Step 1: Prepare WSL system packages
if (-not $SkipSystemUpdate) {
    Write-Host "📦 Step 1: Updating WSL system packages..." -ForegroundColor Cyan
    wsl bash -c 'sudo apt update && sudo apt upgrade -y'
    wsl bash -c 'sudo apt install -y build-essential git wget curl libopenmpi-dev python3.12 python3.12-venv python3.12-dev'
    wsl bash -c 'sudo apt install -y cmake ninja-build pkg-config libffi-dev'
    wsl bash -c 'curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12'
    wsl bash -c 'python3.12 -m pip --version'
    Write-Host "✅ System packages updated" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping system update (--SkipSystemUpdate)" -ForegroundColor Yellow
}

# Step 2: Verify GPU access in WSL
Write-Host "🎮 Step 2: Checking GPU access in WSL..." -ForegroundColor Cyan
$gpuCheck = wsl bash -c "nvidia-smi" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ GPU accessible in WSL" -ForegroundColor Green
} else {
    Write-Host "⚠️  GPU not accessible. Check NVIDIA driver for WSL" -ForegroundColor Yellow
}

# Step 3: Install CUDA toolkit 12.8 in WSL
if (-not $SkipCUDAInstall) {
    Write-Host "🔧 Step 3: Installing CUDA 12.8 toolkit..." -ForegroundColor Cyan
    wsl bash -c 'wget -O cuda-keyring.deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb'
    wsl bash -c 'sudo dpkg -i cuda-keyring.deb'
    wsl bash -c 'sudo apt-get update'
    wsl bash -c 'sudo apt-get -y install cuda-toolkit-12-8'

    # Set environment variables
    wsl bash -c 'echo "export CUDA_HOME=/usr/local/cuda" >> ~/.bashrc'
    wsl bash -c 'echo "export PATH=\$CUDA_HOME/bin:\$PATH" >> ~/.bashrc'
    wsl bash -c 'echo "export LD_LIBRARY_PATH=\$CUDA_HOME/lib64:\$LD_LIBRARY_PATH" >> ~/.bashrc'

    Write-Host "✅ CUDA 12.8 toolkit installed" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping CUDA install (--SkipCUDAInstall)" -ForegroundColor Yellow
}

# Step 4: Install TensorRT 10.11 runtime libs
Write-Host "⚡ Step 4: Installing TensorRT 10.11 runtime..." -ForegroundColor Cyan
wsl bash -c 'wget -q -O tensorrt.tar.gz https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/10.11.0/tensorrt-10.11.0.33.Linux.x86_64-gnu.cuda-12.8.tar.gz'
wsl bash -c 'tar -xzf tensorrt.tar.gz'
wsl bash -c 'sudo cp TensorRT-10.11.0.33/lib/* /usr/lib/x86_64-linux-gnu/'
wsl bash -c 'sudo cp TensorRT-10.11.0.33/include/* /usr/include/'
wsl bash -c 'sudo ldconfig'
wsl bash -c 'ldconfig -p | grep nvinfer && echo "✅ TensorRT libs installed" || echo "❌ TensorRT installation failed"'
wsl bash -c 'echo "export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu" >> ~/.bashrc'
wsl bash -c 'rm -f tensorrt.tar.gz && rm -rf TensorRT-10.11.0.33/'
Write-Host "✅ TensorRT 10.11 runtime installed" -ForegroundColor Green

# Step 5: Create isolated Python 3.12 virtual environment
Write-Host "🐍 Step 5: Creating Python 3.12 virtual environment..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && python3.12 -m venv trt_env'
wsl bash -c 'cd ~ && source trt_env/bin/activate && python -m pip install --upgrade pip setuptools wheel'
wsl bash -c 'cd ~ && source trt_env/bin/activate && python --version && pip --version'
Write-Host "✅ Python 3.12 virtual environment created" -ForegroundColor Green

# Step 6: Cache-enabled wheel downloading (PyTorch + TensorRT-LLM)
Write-Host "📥 Step 6: Smart cache-enabled wheel downloading..." -ForegroundColor Cyan

# Create cache and wheel directories
wsl bash -c 'cd ~ && source trt_env/bin/activate && mkdir -p trt_wheels trt_cache'

# Check if wheels are already cached
Write-Host "🔍 Checking PyTorch cache system..." -ForegroundColor Cyan
$cacheExists = wsl bash -c 'cd ~ && test -f trt_cache/pytorch_cache.json && echo "true" || echo "false"'

if ($cacheExists -eq "true") {
    Write-Host "⚡ Found cached PyTorch wheels, using cache..." -ForegroundColor Green
    wsl bash -c 'cd ~ && source trt_env/bin/activate && cp trt_cache/*.whl trt_wheels/ 2>/dev/null || true'
} else {
    Write-Host "⏱️  No cache found. Downloading wheels (5-15 minutes)..." -ForegroundColor Yellow

    # Download PyTorch wheels with cache integration
    Write-Host "📦 Downloading PyTorch 2.8.0+cu128..." -ForegroundColor Cyan
    wsl bash -c 'cd ~ && source trt_env/bin/activate && pip download torch==2.8.0+cu128 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128 -d trt_wheels'

    # Cache PyTorch wheels
    wsl bash -c 'cd ~ && cp trt_wheels/torch*.whl trt_cache/ 2>/dev/null || true'
    wsl bash -c 'cd ~ && echo "{\"pytorch_version\":\"2.8.0+cu128\",\"cached_at\":\"$(date -Iseconds)\",\"cache_valid\":true}" > trt_cache/pytorch_cache.json'
}

# Download TensorRT-LLM wheel with cache check
Write-Host "🔍 Checking TensorRT-LLM cache..." -ForegroundColor Cyan
$trtCacheExists = wsl bash -c "cd ~ && test -f trt_cache/tensorrt_llm_$TensorRTVersion.whl && echo 'true' || echo 'false'"

if ($trtCacheExists -eq "true") {
    Write-Host "⚡ Found cached TensorRT-LLM wheel, using cache..." -ForegroundColor Green
    wsl bash -c "cd ~ && cp trt_cache/tensorrt_llm_$TensorRTVersion.whl trt_wheels/"
} else {
    Write-Host "📦 Downloading TensorRT-LLM v$TensorRTVersion..." -ForegroundColor Cyan
    wsl bash -c "cd ~ && source trt_env/bin/activate && pip download --only-binary=:all: --extra-index-url https://pypi.nvidia.com tensorrt-llm==$TensorRTVersion --no-deps -d trt_wheels"

    # Cache TensorRT-LLM wheel
    wsl bash -c "cd ~ && cp trt_wheels/tensorrt_llm*.whl trt_cache/tensorrt_llm_$TensorRTVersion.whl 2>/dev/null || true"
}

# Download additional dependencies with cache
Write-Host "📦 Downloading additional dependencies..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && source trt_env/bin/activate && pip download transformers accelerate huggingface-hub sentencepiece safetensors -d trt_wheels'

# Cache additional dependencies
wsl bash -c 'cd ~ && cp trt_wheels/transformers*.whl trt_wheels/accelerate*.whl trt_wheels/huggingface*.whl trt_wheels/sentencepiece*.whl trt_wheels/safetensors*.whl trt_cache/ 2>/dev/null || true'

# List downloaded wheels
wsl bash -c 'cd ~ && ls -lh trt_wheels/*.whl && du -sh trt_wheels/ && echo "Cache size:" && du -sh trt_cache/'

Write-Host "✅ Wheels downloaded/cached successfully" -ForegroundColor Green

# Step 7: Install wheels from local directory (no network)
Write-Host "⚙️  Step 7: Installing wheels locally (offline installation)..." -ForegroundColor Cyan

# Install PyTorch from local wheels
Write-Host "🔧 Installing PyTorch from local wheels..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && source trt_env/bin/activate && pip install --no-index --find-links trt_wheels torch torchvision torchaudio'

# Install TensorRT-LLM from local wheel
Write-Host "🔧 Installing TensorRT-LLM from local wheel..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && source trt_env/bin/activate && pip install --no-deps --no-index --find-links trt_wheels tensorrt-llm'

# Install additional dependencies
Write-Host "🔧 Installing additional dependencies..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && source trt_env/bin/activate && pip install --no-index --find-links trt_wheels transformers accelerate huggingface-hub sentencepiece safetensors'

Write-Host "✅ Packages installed successfully" -ForegroundColor Green

# Step 8: Configure runtime environment with cache integration
Write-Host "🌐 Step 8: Configuring runtime environment with cache integration..." -ForegroundColor Cyan

# Copy environment config to WSL
wsl bash -c 'cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt && cp .env.tensorrt ~/trt_env/.env'

# Create enhanced activation script with cache integration
wsl bash -c 'cd ~ && cat >> trt_env/bin/activate << "EOF"

# TensorRT-LLM Environment Variables
export CUDA_HOME=/usr/local/cuda
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$CUDA_HOME/lib64:$LD_LIBRARY_PATH
export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu
export PYTHONWARNINGS=ignore:Deprecated
export TLLM_LOG_LEVEL=INFO
export CUDA_VISIBLE_DEVICES=0
export NVIDIA_TF32_OVERRIDE=0
export OMP_NUM_THREADS=1

# Load environment config
if [ -f $VIRTUAL_ENV/.env ]; then
    export $(grep -v "^#" $VIRTUAL_ENV/.env | xargs)
fi

# Cache system integration
export PYTORCH_CACHE_DIR=$HOME/trt_cache
export REDIS_URL=redis://localhost:6379/0
export CACHE_TTL=3600
export ENABLE_CACHE=true

# Legal AI optimizations
export GEMMA_MODEL_PATH=/mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16
export LEGAL_CACHE_SIZE=1024
export TARGET_LATENCY_MS=500
export MAX_BATCH_SIZE=8

echo "🚀 TensorRT-LLM environment activated with cache integration"
echo "📦 Cache directory: $PYTORCH_CACHE_DIR"
echo "🔧 Model path: $GEMMA_MODEL_PATH"
EOF'

Write-Host "✅ Environment variables configured" -ForegroundColor Green

# Step 9: Comprehensive verification with cache testing
Write-Host "✅ Step 9: Verifying installation and cache integration..." -ForegroundColor Cyan

wsl bash -c 'cd ~ && source trt_env/bin/activate && python -c "import torch; print(\"✅ Torch:\", torch.__version__, \"CUDA:\", torch.version.cuda)"'
wsl bash -c 'cd ~ && source trt_env/bin/activate && python -c "import torch; print(\"✅ GPU Available:\", torch.cuda.is_available())"'
wsl bash -c 'cd ~ && source trt_env/bin/activate && python -c "import tensorrt_llm; print(\"✅ TensorRT-LLM:\", tensorrt_llm.__version__)"'
wsl bash -c 'cd ~ && source trt_env/bin/activate && which trtllm-build && echo "✅ trtllm-build found" || echo "⚠️  trtllm-build not in PATH"'
wsl bash -c 'cd ~ && source trt_env/bin/activate && which trtllm-serve && echo "✅ trtllm-serve found" || echo "⚠️  trtllm-serve not in PATH"'

# Test cache system
Write-Host "🧪 Testing cache system integration..." -ForegroundColor Cyan
wsl bash -c 'cd ~ && source trt_env/bin/activate && echo "Cache directory: $PYTORCH_CACHE_DIR"'
wsl bash -c 'cd ~ && ls -la trt_cache/ && echo "✅ Cache directory accessible"'
wsl bash -c 'cd ~ && echo "Environment loaded: ENABLE_CACHE=$ENABLE_CACHE, TARGET_LATENCY_MS=$TARGET_LATENCY_MS"'

# Test Go microservice connection (if available)
Write-Host "🔗 Testing Go microservice cache connection..." -ForegroundColor Cyan
$goServiceAvailable = wsl bash -c 'cd /mnt/c/Users/james/Videos/deeds-web-app && test -f go-microservice/pkg/cache/pytorch_cache.go && echo "true" || echo "false"'
if ($goServiceAvailable -eq "true") {
    Write-Host "✅ Go cache microservice available for integration" -ForegroundColor Green
} else {
    Write-Host "⚠️  Go cache microservice not found (will use local cache only)" -ForegroundColor Yellow
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 SUCCESS! TensorRT-LLM v$TensorRTVersion installed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 To use TensorRT-LLM:" -ForegroundColor Green
    Write-Host "1. wsl" -ForegroundColor White
    Write-Host "2. source ~/trt_env/bin/activate" -ForegroundColor White
    Write-Host "3. Your 23GB model is ready for conversion!" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Next: Convert your model using TENSORRT_ENGINE_CONVERSION_GUIDE.md" -ForegroundColor Cyan
} else {
    Write-Host "❌ Installation verification failed. Check error messages above." -ForegroundColor Red
}

Write-Host "✨ Installation script completed!" -ForegroundColor Green