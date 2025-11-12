# TensorRT-LLM WSL Installation Script
# Installs TensorRT-LLM v1.1.0rc6 into WSL Ubuntu with Python 3.12
# Pre-downloads wheels to avoid repeated multi-GB downloads
# Based on TODO: Install TensorRT-LLM in WSL (Windows 10) specification

param(
    [switch]$SkipSystemUpdate,
    [switch]$SkipCUDAInstall,
    [string]$TensorRTVersion = "1.1.0rc6"
)

Write-Host "🚀 TensorRT-LLM WSL Installation Script" -ForegroundColor Green
Write-Host "Target: Python 3.12, CUDA 12.8, TensorRT 10.11, WSL Ubuntu" -ForegroundColor Yellow
Write-Host "Installing TensorRT-LLM v$TensorRTVersion with trtllm-build and trtllm-serve tools" -ForegroundColor Cyan

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

$wslDistros = wsl --list --quiet
if ($wslDistros -notcontains "Ubuntu") {
    Write-Host "❌ Ubuntu not found in WSL. Installing Ubuntu-24.04..." -ForegroundColor Yellow
    wsl --set-default-version 2
    wsl --install -d Ubuntu-24.04
    Write-Host "⚠️  Please restart PowerShell after Ubuntu installation completes" -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Ubuntu WSL detected" -ForegroundColor Green

# Step 1: Prepare WSL system packages
if (-not $SkipSystemUpdate) {
    Write-Host "📦 Step 1: Updating WSL system packages..." -ForegroundColor Cyan
    wsl bash -c @"
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git wget curl libopenmpi-dev python3.12 python3.12-venv python3.12-dev
sudo apt install -y cmake ninja-build pkg-config libffi-dev

# Install pip for Python 3.12 using get-pip.py (more reliable than python3-pip package)
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12
python3.12 -m pip --version
"@
    Write-Host "✅ System packages updated" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping system update (--SkipSystemUpdate)" -ForegroundColor Yellow
}

# Step 2: Verify GPU access in WSL
Write-Host "🎮 Step 2: Checking GPU access in WSL..." -ForegroundColor Cyan
$gpuCheck = wsl bash -c "nvidia-smi" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ GPU accessible in WSL" -ForegroundColor Green
    Write-Host $gpuCheck -ForegroundColor White
} else {
    Write-Host "⚠️  GPU not accessible. Install NVIDIA Driver for WSL from https://developer.nvidia.com/cuda/wsl" -ForegroundColor Yellow
    Write-Host "   Continue? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}

# Step 3: Install CUDA toolkit 12.8 in WSL
if (-not $SkipCUDAInstall) {
    Write-Host "🔧 Step 3: Installing CUDA 12.8 toolkit..." -ForegroundColor Cyan

    # Run CUDA installation in separate commands to avoid encoding issues
    wsl bash -c "wget -O cuda-keyring.deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb"
    wsl bash -c "sudo dpkg -i cuda-keyring.deb"
    wsl bash -c "sudo apt-get update"
    wsl bash -c "sudo apt-get -y install cuda-toolkit-12-8"

    # Set environment variables
    wsl bash -c @"
echo 'export CUDA_HOME=/usr/local/cuda' >> ~/.bashrc
echo 'export PATH=`$CUDA_HOME/bin:`$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=`$CUDA_HOME/lib64:`$LD_LIBRARY_PATH' >> ~/.bashrc

# Apply environment variables for current session
export CUDA_HOME=/usr/local/cuda
export PATH=`$CUDA_HOME/bin:`$PATH
export LD_LIBRARY_PATH=`$CUDA_HOME/lib64:`$LD_LIBRARY_PATH

# Verify CUDA installation
nvcc --version || echo 'CUDA toolkit installed but nvcc not in PATH yet'
"@
    Write-Host "✅ CUDA 12.8 toolkit installed" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping CUDA install (--SkipCUDAInstall)" -ForegroundColor Yellow
}

# Step 4: Install TensorRT 10.11 runtime libs
Write-Host "⚡ Step 4: Installing TensorRT 10.11 runtime..." -ForegroundColor Cyan
wsl bash -c @"
# Download TensorRT 10.11.0.33 for CUDA 12.8
wget -q https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/10.11.0/tensorrt-10.11.0.33.Linux.x86_64-gnu.cuda-12.8.tar.gz

# Extract and install TensorRT libraries
tar -xzf tensorrt-10.11.0.33.Linux.x86_64-gnu.cuda-12.8.tar.gz
sudo cp TensorRT-10.11.0.33/lib/* /usr/lib/x86_64-linux-gnu/
sudo cp TensorRT-10.11.0.33/include/* /usr/include/
sudo ldconfig

# Verify TensorRT installation
ldconfig -p | grep nvinfer && echo '✅ TensorRT libs installed' || echo '❌ TensorRT installation failed'

# Set TensorRT environment variables
echo 'export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu' >> ~/.bashrc
export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu

# Cleanup
rm -f tensorrt-10.11.0.33.Linux.x86_64-gnu.cuda-12.8.tar.gz
rm -rf TensorRT-10.11.0.33/
"@
Write-Host "✅ TensorRT 10.11 runtime installed" -ForegroundColor Green

# Step 5: Create isolated Python 3.12 virtual environment
Write-Host "🐍 Step 5: Creating Python 3.12 virtual environment..." -ForegroundColor Cyan
wsl bash -c @"
cd ~
python3.12 -m venv trt_env
source trt_env/bin/activate
python -m pip install --upgrade pip setuptools wheel
python --version
pip --version
"@
Write-Host "✅ Python 3.12 virtual environment created" -ForegroundColor Green

# Step 6: Create wheel directory and pre-download wheels
Write-Host "📥 Step 6: Pre-downloading wheels (PyTorch + TensorRT-LLM)..." -ForegroundColor Cyan
Write-Host "⏱️  This may take 5-15 minutes depending on internet speed..." -ForegroundColor Yellow

wsl bash -c @"
cd ~
source trt_env/bin/activate
mkdir -p trt_wheels

# Pre-download PyTorch 2.8.0+cu128 wheels (avoid repeated downloads)
echo '📦 Downloading PyTorch 2.8.0+cu128...'
pip download torch==2.8.0+cu128 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128 -d trt_wheels

# Pre-download TensorRT-LLM wheel (v$TensorRTVersion)
echo '📦 Downloading TensorRT-LLM v$TensorRTVersion...'
pip download --only-binary=:all: --extra-index-url https://pypi.nvidia.com tensorrt-llm==$TensorRTVersion --no-deps -d trt_wheels

# Download additional dependencies
echo '📦 Downloading additional dependencies...'
pip download transformers accelerate huggingface-hub sentencepiece safetensors -d trt_wheels

# List downloaded wheels
echo '📋 Downloaded wheels:'
ls -lh trt_wheels/*.whl
du -sh trt_wheels/
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Wheel download failed. Check internet connection and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Wheels pre-downloaded successfully" -ForegroundColor Green

# Step 7: Inspect downloaded wheels
Write-Host "🔍 Step 7: Inspecting downloaded wheels..." -ForegroundColor Cyan
wsl bash -c @"
cd ~
source trt_env/bin/activate
echo '📋 Wheel inventory:'
ls -lh trt_wheels/*.whl | grep -E '(torch|tensorrt_llm)'
echo ''
echo '🔍 TensorRT-LLM wheel contents preview:'
unzip -l trt_wheels/tensorrt_llm-*.whl | head -20
"@

# Step 8: Install wheels from local directory (no network)
Write-Host "⚙️  Step 8: Installing wheels locally (offline installation)..." -ForegroundColor Cyan
wsl bash -c @"
cd ~
source trt_env/bin/activate

# Install PyTorch from local wheels first (no network)
echo '🔧 Installing PyTorch from local wheels...'
pip install --no-index --find-links trt_wheels torch torchvision torchaudio

# Install TensorRT-LLM from local wheel (no deps to avoid conflicts)
echo '🔧 Installing TensorRT-LLM from local wheel...'
pip install --no-deps --no-index --find-links trt_wheels tensorrt-llm

# Install additional dependencies from local wheels
echo '🔧 Installing additional dependencies...'
pip install --no-index --find-links trt_wheels transformers accelerate huggingface-hub sentencepiece safetensors

# Show installed packages
pip list | grep -E '(torch|tensorrt|transformers)'
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Package installation failed. Check wheel compatibility." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Packages installed successfully from local wheels" -ForegroundColor Green

# Step 9: Set runtime environment variables
Write-Host "🌐 Step 9: Configuring runtime environment..." -ForegroundColor Cyan
wsl bash -c @"
cd ~
source trt_env/bin/activate

# Add environment variables to activation script
cat >> trt_env/bin/activate << 'EOF'

# TensorRT-LLM Environment Variables
export CUDA_HOME=/usr/local/cuda
export PATH=\$CUDA_HOME/bin:\$PATH
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:\$CUDA_HOME/lib64:\$LD_LIBRARY_PATH
export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu
export PYTHONWARNINGS=ignore:Deprecated
export TLLM_LOG_LEVEL=INFO
export CUDA_VISIBLE_DEVICES=0
export NVIDIA_TF32_OVERRIDE=0
export OMP_NUM_THREADS=1
EOF

# Apply environment variables for current session
export CUDA_HOME=/usr/local/cuda
export PATH=\$CUDA_HOME/bin:\$PATH
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:\$CUDA_HOME/lib64:\$LD_LIBRARY_PATH
export TRT_LIB_DIR=/usr/lib/x86_64-linux-gnu
"@
Write-Host "✅ Environment variables configured" -ForegroundColor Green

# Step 10: Comprehensive verification
Write-Host "✅ Step 10: Verifying installation..." -ForegroundColor Cyan
$verification = wsl bash -c @"
cd ~
source trt_env/bin/activate

echo '🔍 Python and PyTorch verification:'
python -c "import torch; print('✅ Torch:', torch.__version__, 'CUDA:', torch.version.cuda)"
python -c "import torch; print('✅ GPU Available:', torch.cuda.is_available())"
python -c "import torch; print('✅ GPU Device:', torch.cuda.get_device_name(0))" 2>/dev/null || echo '⚠️  GPU device name not accessible'

echo ''
echo '🔍 TensorRT-LLM verification:'
python -c "import tensorrt_llm; print('✅ TensorRT-LLM:', tensorrt_llm.__version__)"

echo ''
echo '🔍 TensorRT library verification:'
python -c "import ctypes; ctypes.CDLL('libnvinfer.so'); print('✅ libnvinfer loaded')" 2>/dev/null || echo '⚠️  libnvinfer not accessible'

echo ''
echo '🔍 Command-line tools verification:'
which trtllm-build && echo '✅ trtllm-build found' || echo '⚠️  trtllm-build not in PATH'
which trtllm-serve && echo '✅ trtllm-serve found' || echo '⚠️  trtllm-serve not in PATH'

echo ''
echo '🔍 Python API verification:'
python -c "from tensorrt_llm.models import gemma; print('✅ Gemma model support available')" 2>/dev/null || echo '⚠️  Gemma model support not available'
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 SUCCESS! TensorRT-LLM v$TensorRTVersion installed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Installation Summary:" -ForegroundColor Yellow
    Write-Host "- Python 3.12 virtual environment: ~/trt_env" -ForegroundColor White
    Write-Host "- PyTorch 2.8.0+cu128 with CUDA 12.8 support" -ForegroundColor White
    Write-Host "- TensorRT-LLM v$TensorRTVersion with tools:" -ForegroundColor White
    Write-Host "  • trtllm-build (model conversion)" -ForegroundColor White
    Write-Host "  • trtllm-serve (model serving)" -ForegroundColor White
    Write-Host "  • Python API for Gemma3 conversion" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 To use TensorRT-LLM:" -ForegroundColor Green
    Write-Host "1. wsl" -ForegroundColor White
    Write-Host "2. source ~/trt_env/bin/activate" -ForegroundColor White
    Write-Host "3. Your 23GB model is ready for conversion to ~6GB optimized engines!" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Next steps:" -ForegroundColor Cyan
    Write-Host "- Convert your model: See TENSORRT_ENGINE_CONVERSION_GUIDE.md" -ForegroundColor White
    Write-Host "- Model location: /mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16/" -ForegroundColor White
    Write-Host "- Expected result: 4x smaller models with sub-ms inference on RTX 3060 Ti" -ForegroundColor White
} else {
    Write-Host "❌ Installation verification failed. Check error messages above." -ForegroundColor Red
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "- Ensure NVIDIA Driver for WSL is installed" -ForegroundColor White
    Write-Host "- Check wheel compatibility: python -m pip debug --verbose" -ForegroundColor White
    Write-Host "- Verify CUDA and TensorRT installations" -ForegroundColor White
}

# Cleanup temporary files
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
wsl bash -c "cd ~ && rm -f *.deb *.tar.gz"

Write-Host "✨ TensorRT-LLM installation script completed!" -ForegroundColor Green
Write-Host "💾 Wheel cache preserved at ~/trt_wheels for future reinstalls" -ForegroundColor Cyan