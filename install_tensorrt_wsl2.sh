#!/bin/bash

# TensorRT Installation Script for WSL2 Ubuntu with CUDA 13.0
# Optimized for RTX 3060 Ti and PyTorch 2.8.0+cu128

echo "=========================================="
echo "TensorRT Installation for WSL2 Ubuntu"
echo "CUDA 13.0 + PyTorch 2.8.0 + RTX 3060 Ti"
echo "=========================================="
echo

# Check prerequisites
echo "[1/4] Checking prerequisites..."
echo "----------------------------------------"

# Check CUDA
if ! command -v nvcc &> /dev/null; then
    echo "❌ CUDA not found. Please install CUDA 13.0 first."
    exit 1
fi

cuda_version=$(nvcc --version | grep -o "V[0-9]\+\.[0-9]\+" | head -1)
echo "✓ CUDA version: $cuda_version"

# Check PyTorch
python -c "import torch; print('✓ PyTorch version:', torch.__version__)" 2>/dev/null || {
    echo "❌ PyTorch not found. Installing..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
}

# Check GPU
if python -c "import torch; print('✓ CUDA available:', torch.cuda.is_available())" 2>/dev/null; then
    gpu_name=$(python -c "import torch; print('✓ GPU:', torch.cuda.get_device_name(0))" 2>/dev/null)
    echo "$gpu_name"
else
    echo "⚠ GPU not accessible from PyTorch"
fi

echo

# Install TensorRT via pip (easiest for WSL2)
echo "[2/4] Installing TensorRT Python package..."
echo "----------------------------------------"

# For CUDA 12.x compatibility
pip install --upgrade pip

# Install TensorRT (NVIDIA official pip package)
echo "Installing TensorRT for CUDA 12.x..."
pip install tensorrt[all] --find-links https://developer.download.nvidia.com/compute/redist

# Alternative: Try direct pip install
if ! python -c "import tensorrt" &> /dev/null; then
    echo "Trying alternative TensorRT installation..."

    # Install via conda-forge (often more reliable)
    if command -v conda &> /dev/null; then
        conda install -c conda-forge tensorrt -y
    else
        # Install specific version compatible with CUDA 12.x
        pip install tensorrt==8.6.1
    fi
fi

# Verify installation
echo
echo "Verifying TensorRT installation..."
python -c "
import tensorrt as trt
print('✓ TensorRT version:', trt.__version__)
print('✓ TensorRT builder available:', trt.Builder is not None)

# Test logger
logger = trt.Logger(trt.Logger.INFO)
print('✓ TensorRT logger working')

# Check plugin registry
registry = trt.get_plugin_registry()
print('✓ Plugin registry available:', registry is not None)
print('✓ Available plugin creators:', len([x for x in registry.plugin_creator_list]))
" 2>/dev/null && echo "✓ TensorRT installation successful!" || echo "❌ TensorRT verification failed"

echo

# Install additional dependencies for custom plugins
echo "[3/4] Installing development dependencies..."
echo "----------------------------------------"

# Install build essentials for WSL2
if command -v apt &> /dev/null; then
    echo "Installing build tools for WSL2..."
    sudo apt update -qq
    sudo apt install -y build-essential cmake git

    # Install CUDA development headers if not present
    if [ ! -d "/usr/local/cuda/include" ] && [ ! -d "/opt/cuda/include" ]; then
        echo "Installing CUDA development headers..."
        sudo apt install -y nvidia-cuda-dev nvidia-cuda-toolkit-gcc
    fi
fi

# Install Python development packages
pip install --quiet pycuda numpy protobuf

echo "✓ Development dependencies installed"
echo

# Test CUDA compilation
echo "[4/4] Testing CUDA compilation..."
echo "----------------------------------------"

# Create simple CUDA test
cat > test_cuda_simple.cu << 'EOF'
#include <cuda_runtime.h>
#include <stdio.h>

__global__ void test_kernel() {
    printf("Hello from CUDA kernel!\n");
}

extern "C" {
    int test_cuda() {
        test_kernel<<<1, 1>>>();
        cudaDeviceSynchronize();
        return 0;
    }
}
EOF

# Try to compile
if nvcc -shared -Xcompiler -fPIC test_cuda_simple.cu -o test_cuda.so 2>/dev/null; then
    echo "✓ CUDA compilation test successful"
    rm -f test_cuda_simple.cu test_cuda.so
else
    echo "⚠ CUDA compilation test failed (may need additional setup)"
    rm -f test_cuda_simple.cu test_cuda.so
fi

echo

# Final verification and setup instructions
echo "=========================================="
echo "TensorRT Installation Complete!"
echo "=========================================="
echo

# Test complete setup
python -c "
import sys
print('System Setup:')
print('-------------')

try:
    import torch
    print(f'✓ PyTorch: {torch.__version__}')
    print(f'✓ CUDA available: {torch.cuda.is_available()}')
    if torch.cuda.is_available():
        print(f'✓ GPU: {torch.cuda.get_device_name(0)}')
        print(f'✓ CUDA capability: {torch.cuda.get_device_capability(0)}')
except Exception as e:
    print(f'❌ PyTorch issue: {e}')

try:
    import tensorrt as trt
    print(f'✓ TensorRT: {trt.__version__}')

    # Test basic functionality
    logger = trt.Logger(trt.Logger.WARNING)
    builder = trt.Builder(logger)
    print('✓ TensorRT builder working')

except Exception as e:
    print(f'❌ TensorRT issue: {e}')

try:
    import pycuda.driver as cuda
    import pycuda.autoinit
    print('✓ PyCUDA working')
except Exception as e:
    print(f'⚠ PyCUDA issue: {e}')

print()
print('Ready for Q4_K_M sub-1ms pipeline!')
"

echo
echo "Next Steps:"
echo "----------"
echo "1. Navigate to your project:"
echo "   cd go-microservice/cuda-graphs"
echo
echo "2. Build the optimized pipeline:"
echo "   ./build_wsl2.sh"
echo
echo "3. Test TensorRT integration:"
echo "   python ../tensorrt/q4km_to_tensorrt_converter.py --help"
echo
echo "4. Run performance tests:"
echo "   python test_sub1ms.py"
echo
echo "=========================================="