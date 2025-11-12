#!/bin/bash
# Check TensorRT-LLM Installation with Pause
echo "🔍 Checking TensorRT-LLM Installation..."
echo "Press any key after each test to continue..."

cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt

# Activate environment
echo "Activating environment..."
./trt_env_clean/bin/python --version
read -p "Press Enter to continue..."

# Test PyTorch
echo "Testing PyTorch..."
./trt_env_clean/bin/python -c "import torch; print('✅ Torch:', torch.__version__, 'CUDA:', torch.version.cuda)"
read -p "Press Enter to continue..."

# Test GPU access
echo "Testing GPU access..."
./trt_env_clean/bin/python -c "import torch; print('✅ GPU Available:', torch.cuda.is_available())"
read -p "Press Enter to continue..."

# Test TensorRT-LLM
echo "Testing TensorRT-LLM..."
./trt_env_clean/bin/python -c "import tensorrt_llm; print('✅ TensorRT-LLM:', tensorrt_llm.__version__)"
read -p "Press Enter to continue..."

# Check command line tools
echo "Checking command line tools..."
export PATH="./trt_env_clean/bin:$PATH"
which trtllm-build && echo "✅ trtllm-build found" || echo "⚠️  trtllm-build not in PATH"
which trtllm-serve && echo "✅ trtllm-serve found" || echo "⚠️  trtllm-serve not in PATH"
read -p "Press Enter to continue..."

# Show package list
echo "Installed packages:"
./trt_env_clean/bin/pip list | grep -E "(torch|tensorrt|transformers)"
read -p "Press Enter to continue..."

echo "🎉 Installation check complete!"
echo "📋 To use TensorRT-LLM:"
echo "1. wsl"
echo "2. cd /mnt/c/Users/james/Videos/deeds-web-app/ubuntu-tensorrt"
echo "3. source trt_env_clean/bin/activate"
echo "4. Your 23GB model is ready for conversion!"

read -p "Press Enter to exit..."