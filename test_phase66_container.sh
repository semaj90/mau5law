#!/bin/bash
# Test TensorRT and ONNX Runtime in Phase 66 container

echo "🧪 Testing Phase 66 TensorRT-LLM Container"
echo "=========================================="

# Test 1: TensorRT import
echo "🔍 Test 1: TensorRT Import"
if python3 -c "import tensorrt as trt; print('✅ TensorRT version:', trt.__version__)" 2>/dev/null; then
    echo "✅ TensorRT working!"
else
    echo "❌ TensorRT failed"
    exit 1
fi

# Test 2: ONNX Runtime
echo "🔍 Test 2: ONNX Runtime"
if python3 -c "import onnxruntime as ort; print('✅ ONNX Runtime providers:', ort.get_available_providers())" 2>/dev/null; then
    echo "✅ ONNX Runtime working!"
else
    echo "❌ ONNX Runtime failed"
    exit 1
fi

# Test 3: PyTorch
echo "🔍 Test 3: PyTorch"
if python3 -c "import torch; print('✅ PyTorch version:', torch.__version__)" 2>/dev/null; then
    echo "✅ PyTorch working!"
else
    echo "❌ PyTorch failed"
    exit 1
fi

# Test 4: NumPy
echo "🔍 Test 4: NumPy"
if python3 -c "import numpy as np; print('✅ NumPy version:', np.__version__)" 2>/dev/null; then
    echo "✅ NumPy working!"
else
    echo "❌ NumPy failed"
    exit 1
fi

echo "🎉 All dependencies working correctly!"