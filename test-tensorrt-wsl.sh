#!/bin/bash
# TensorRT-LLM WSL Test Script
cd ~/legal-ai-system
source tensorrt_env/bin/activate

# Set up CUDA environment
export CUDA_HOME=/usr/local/cuda
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:/usr/lib/wsl/lib:$LD_LIBRARY_PATH
export PATH=/usr/local/cuda/bin:$PATH

echo "🔧 Testing TensorRT-LLM with existing CUDA runtime..."
echo "🎯 CUDA Home: $CUDA_HOME"
echo "📚 Library Path: $LD_LIBRARY_PATH"

echo ""
echo "🔥 Testing PyTorch CUDA:"
python -c "import torch; print(f'PyTorch CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"No device\"}')"

echo ""
echo "🚀 Testing TensorRT-LLM import:"
python -c "
try:
    import tensorrt_llm
    print('✅ TensorRT-LLM imported successfully!')
    print(f'📦 Version: {tensorrt_llm.__version__}')
except Exception as e:
    print(f'❌ TensorRT-LLM import failed: {e}')
    print('🔧 Checking specific error...')
    import traceback
    traceback.print_exc()
"

echo ""
echo "✅ Test complete!"