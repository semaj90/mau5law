#!/bin/bash
# Quick TensorRT-LLM Setup Script
# Simple WSL installation without complex paths

echo "🚀 Quick TensorRT-LLM Setup"
echo "Installing TensorRT-LLM v1.1.0rc5 in WSL ubuntu-tensorrt environment"

# Navigate to project directory in WSL
cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt

# Use existing trt_env from home directory
TRT_ENV_PATH="$HOME/trt_env"
TRT_WHEELS_PATH="$HOME/trt_wheels"

if [ ! -f "$TRT_ENV_PATH/bin/python" ]; then
    echo "❌ trt_env not found at $TRT_ENV_PATH"
    echo "Please create it first or run from correct location"
    exit 1
fi

echo "✅ Virtual environment ready"

# Use existing cache and wheel directories
echo "📁 Using existing cache directories..."
echo "Using wheels: $TRT_WHEELS_PATH"
echo "Using cache: $HOME/trt_cache"

# Check if wheels are already cached
echo "🔍 Checking PyTorch cache system..."
if [ -f "$HOME/trt_cache/pytorch_cache.json" ]; then
    echo "⚡ Found cached PyTorch wheels, using cache..."
    cp $HOME/trt_cache/*.whl $TRT_WHEELS_PATH/ 2>/dev/null || true
else
    echo "⏱️  No cache found. Downloading wheels for offline installation..."

    # Download PyTorch wheels with cache integration
    echo "📦 Downloading PyTorch 2.8.0+cu128..."
    $TRT_ENV_PATH/bin/python -m pip download torch==2.8.0+cu128 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128 -d $TRT_WHEELS_PATH

    # Cache PyTorch wheels
    cp $TRT_WHEELS_PATH/torch*.whl $HOME/trt_cache/ 2>/dev/null || true
    echo "{\"pytorch_version\":\"2.8.0+cu128\",\"cached_at\":\"$(date -Iseconds)\",\"cache_valid\":true}" > $HOME/trt_cache/pytorch_cache.json
fi

# Download TensorRT-LLM wheel with cache check
echo "🔍 Checking TensorRT-LLM cache..."
if [ -f "$HOME/trt_cache/tensorrt_llm_1.1.0rc5.whl" ]; then
    echo "⚡ Found cached TensorRT-LLM wheel, using cache..."
    cp $HOME/trt_cache/tensorrt_llm_1.1.0rc5.whl $TRT_WHEELS_PATH/
elif [ -f "$TRT_WHEELS_PATH/tensorrt_llm"*".whl" ]; then
    echo "⚡ Found TensorRT-LLM wheel in wheels directory, using existing..."
    # Cache it for next time
    cp $TRT_WHEELS_PATH/tensorrt_llm*.whl $HOME/trt_cache/tensorrt_llm_1.1.0rc5.whl 2>/dev/null || true
else
    echo "📦 Downloading TensorRT-LLM v1.1.0rc5 (3.6GB)..."
    $TRT_ENV_PATH/bin/python -m pip download --only-binary=:all: --extra-index-url https://pypi.nvidia.com tensorrt-llm==1.1.0rc5 --no-deps -d $TRT_WHEELS_PATH

    # Cache TensorRT-LLM wheel
    cp $TRT_WHEELS_PATH/tensorrt_llm*.whl $HOME/trt_cache/tensorrt_llm_1.1.0rc5.whl 2>/dev/null || true
fi

# Download additional dependencies with cache
echo "📦 Downloading additional dependencies..."
$TRT_ENV_PATH/bin/python -m pip download transformers accelerate huggingface-hub sentencepiece safetensors -d $TRT_WHEELS_PATH

# Cache additional dependencies
cp $TRT_WHEELS_PATH/transformers*.whl $TRT_WHEELS_PATH/accelerate*.whl $TRT_WHEELS_PATH/huggingface*.whl $TRT_WHEELS_PATH/sentencepiece*.whl $TRT_WHEELS_PATH/safetensors*.whl $HOME/trt_cache/ 2>/dev/null || true

# List downloaded wheels
ls -lh $TRT_WHEELS_PATH/*.whl && du -sh $TRT_WHEELS_PATH/ && echo "Cache size:" && du -sh $HOME/trt_cache/

echo "✅ Wheels downloaded/cached successfully"

# Install from local wheels (offline installation)
echo "⚙️  Installing PyTorch from local wheels..."
$TRT_ENV_PATH/bin/python -m pip install --no-index --find-links $TRT_WHEELS_PATH torch torchvision torchaudio

echo "⚙️  Installing TensorRT-LLM from local wheel..."
$TRT_ENV_PATH/bin/python -m pip install --no-deps --no-index --find-links $TRT_WHEELS_PATH tensorrt-llm

echo "⚙️  Installing additional dependencies..."
$TRT_ENV_PATH/bin/python -m pip install --no-index --find-links $TRT_WHEELS_PATH transformers accelerate huggingface-hub sentencepiece safetensors

echo "✅ Verifying installation..."
echo "Testing PyTorch:"
$TRT_ENV_PATH/bin/python -c "import torch; print('✅ Torch:', torch.__version__, 'CUDA:', torch.version.cuda)"

echo "Testing GPU access:"
$TRT_ENV_PATH/bin/python -c "import torch; print('✅ GPU Available:', torch.cuda.is_available())"

echo "Testing TensorRT-LLM:"
$TRT_ENV_PATH/bin/python -c "import tensorrt_llm; print('✅ TensorRT-LLM:', tensorrt_llm.__version__)"

echo "Checking for command line tools:"
export PATH="$(pwd)/trt_env/bin:$PATH"
which trtllm-build && echo "✅ trtllm-build found" || echo "⚠️  trtllm-build not in PATH"
which trtllm-serve && echo "✅ trtllm-serve found" || echo "⚠️  trtllm-serve not in PATH"

echo "📋 Installed packages:"
$TRT_ENV_PATH/bin/python -m pip list | grep -E "(torch|tensorrt|transformers)"

echo ""
echo "🎉 TensorRT-LLM setup complete!"
echo "📋 To use:"
echo "1. cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt"
echo "2. source trt_env/bin/activate"
echo "3. Your 23GB model is ready for conversion!"
echo ""
echo "📚 Model location: /mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16/"
echo "💾 Cache directories: $HOME/trt_cache/ (persistent), $TRT_WHEELS_PATH/ (working)"
echo "🔧 Engine build ready: Use cached wheels for faster repeated setups"
echo "📖 Next: Build .engine and .plan files for inference optimization"

read -p "Press Enter to exit..."