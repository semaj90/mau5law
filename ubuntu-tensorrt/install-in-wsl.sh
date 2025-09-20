#!/bin/bash
# WSL TensorRT-LLM Installation
# Run this FROM WSL: wsl bash install-in-wsl.sh

echo "🚀 Installing TensorRT-LLM v1.1.0rc5 in WSL"

# Ensure we're in WSL
if [[ ! -d "/mnt/c" ]]; then
    echo "❌ This script must be run from WSL"
    echo "Run: wsl bash install-in-wsl.sh"
    exit 1
fi

# Navigate to ubuntu-tensorrt directory
cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt

# Check if environment exists
if [ ! -d "trt_env_clean" ]; then
    echo "Creating Python 3.12 virtual environment..."
    python3.12 -m venv trt_env_clean
fi

echo "📦 Installing PyTorch 2.8.0+cu128..."
./trt_env_clean/bin/python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

echo "📦 Installing TensorRT-LLM v1.1.0rc5 (3.7GB download)..."
./trt_env_clean/bin/python -m pip install --extra-index-url https://pypi.nvidia.com tensorrt-llm==1.1.0rc5

echo "📦 Installing additional dependencies..."
./trt_env_clean/bin/python -m pip install transformers accelerate huggingface-hub sentencepiece safetensors

echo "✅ Testing installation:"
./trt_env_clean/bin/python -c "import torch; print('✅ PyTorch:', torch.__version__, 'CUDA:', torch.version.cuda)"
./trt_env_clean/bin/python -c "import torch; print('✅ GPU Available:', torch.cuda.is_available())"
./trt_env_clean/bin/python -c "import tensorrt_llm; print('✅ TensorRT-LLM:', tensorrt_llm.__version__)"

echo "📋 Checking tools:"
export PATH="$(pwd)/trt_env_clean/bin:$PATH"
which trtllm-build && echo "✅ trtllm-build found" || echo "⚠️  trtllm-build not found"
which trtllm-serve && echo "✅ trtllm-serve found" || echo "⚠️  trtllm-serve not found"

echo ""
echo "🎉 Installation complete!"
echo "📋 To use:"
echo "  cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt"
echo "  source trt_env_clean/bin/activate"
echo ""
echo "📚 Your 23GB model: /mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16/"
echo "📖 Convert using: TENSORRT_ENGINE_CONVERSION_GUIDE.md"

read -p "Press Enter to exit..."