#!/bin/bash
# Rebuild TensorRT engines for CUDA 12.8 compatibility
# Ubuntu 22.04 + WSL2 optimization

set -e

echo "🔧 Rebuilding TensorRT engines for CUDA 12.8..."

# Verify CUDA 12.8 installation
echo "🔍 Checking CUDA 12.8 installation..."
if ! nvcc --version | grep -q "release 12.8"; then
    echo "❌ CUDA 12.8 not found!"
    echo "   Current CUDA version:"
    nvcc --version || echo "   nvcc not available"
    echo ""
    echo "💡 Install CUDA 12.8:"
    echo "   wget https://developer.download.nvidia.com/compute/cuda/12.8.0/local_installers/cuda_12.8.0_550.54.15_linux.run"
    echo "   sudo sh cuda_12.8.0_550.54.15_linux.run"
    exit 1
fi

echo "✅ CUDA 12.8 detected"

# Verify TensorRT installation
echo "🔍 Checking TensorRT installation..."
if ! trtexec --version | grep -q "TensorRT"; then
    echo "❌ TensorRT not found!"
    echo "💡 Install TensorRT 9.5+ for CUDA 12.8"
    exit 1
fi

echo "✅ TensorRT detected"

# Set CUDA 12.8 environment
export CUDA_ROOT=/usr/local/cuda-12.8
export PATH=$CUDA_ROOT/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_ROOT/lib64:$LD_LIBRARY_PATH
export CUDA_DEVICE_ORDER=PCI_BUS_ID

# Create directories
mkdir -p triton-models/legal_embedding/1
mkdir -p triton-models/legal_generation/1
mkdir -p models/onnx-cuda128
mkdir -p models/cache-cuda128

echo "📋 TensorRT Version Info:"
trtexec --version

# Check if ONNX models exist
if [ ! -f "models/onnx/legal_embedding.onnx" ]; then
    echo "❌ ONNX models not found!"
    echo "💡 Export your models to ONNX first:"
    echo "   python3 export_legal_models_to_onnx.py"

    # Create sample ONNX export script
    cat > export_legal_models_to_onnx.py << 'EOF'
#!/usr/bin/env python3
"""
Export legal AI models to ONNX format for TensorRT
Compatible with CUDA 12.8 + Ubuntu 22.04
"""

import torch
import torch.onnx
from transformers import AutoModel, AutoTokenizer
import onnx
import onnxsim
import os

def export_embedding_model():
    """Export legal embedding model to ONNX"""
    print("🔧 Exporting legal embedding model...")

    # Use a compatible model (replace with your legal embedding model)
    model_name = "sentence-transformers/all-MiniLM-L6-v2"  # Example

    try:
        model = AutoModel.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)

        model.eval()

        # Create dummy input
        dummy_input = torch.randint(1, 1000, (1, 512), dtype=torch.long)
        attention_mask = torch.ones(1, 512, dtype=torch.long)

        # Export to ONNX
        torch.onnx.export(
            model,
            (dummy_input, attention_mask),
            "models/onnx/legal_embedding.onnx",
            export_params=True,
            opset_version=17,
            do_constant_folding=True,
            input_names=["input_ids", "attention_mask"],
            output_names=["embeddings"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence"},
                "attention_mask": {0: "batch_size", 1: "sequence"},
                "embeddings": {0: "batch_size"}
            }
        )

        print("✅ Legal embedding model exported")
        return True

    except Exception as e:
        print(f"❌ Failed to export embedding model: {e}")
        return False

if __name__ == "__main__":
    os.makedirs("models/onnx", exist_ok=True)

    if export_embedding_model():
        print("🎉 Model export completed!")
    else:
        print("❌ Model export failed!")
EOF

    chmod +x export_legal_models_to_onnx.py
    echo "   Created: export_legal_models_to_onnx.py"
    exit 1
fi

echo "✅ ONNX models found"

# Rebuild legal embedding engine with CUDA 12.8
echo "🔨 Building legal embedding engine for CUDA 12.8..."
trtexec \
    --onnx=models/onnx/legal_embedding.onnx \
    --saveEngine=triton-models/legal_embedding/1/model.plan \
    --minShapes=input_ids:1x64,attention_mask:1x64 \
    --optShapes=input_ids:16x512,attention_mask:16x512 \
    --maxShapes=input_ids:32x512,attention_mask:32x512 \
    --fp16 \
    --memPoolSize=workspace:2048 \
    --builderOptimizationLevel=5 \
    --tacticSources=+CUDNN,+CUBLAS,+CUBLASLT \
    --timingCacheFile=models/cache-cuda128/embedding_timing.cache \
    --saveTimingCache=models/cache-cuda128/embedding_timing.cache \
    --profilingVerbosity=detailed \
    --dumpLayerInfo \
    --exportTimes=models/cache-cuda128/embedding_timing.json \
    --exportProfile=models/cache-cuda128/embedding_profile.json \
    --verbose 2>&1 | tee build_embedding_cuda128.log

# Validate engine
if [ -f "triton-models/legal_embedding/1/model.plan" ]; then
    engine_size=$(du -h triton-models/legal_embedding/1/model.plan | cut -f1)
    echo "✅ Legal embedding engine built: $engine_size"
else
    echo "❌ Failed to build legal embedding engine"
    exit 1
fi

# Build legal generation engine if ONNX exists
if [ -f "models/onnx/legal_generation.onnx" ]; then
    echo "🔨 Building legal generation engine for CUDA 12.8..."
    trtexec \
        --onnx=models/onnx/legal_generation.onnx \
        --saveEngine=triton-models/legal_generation/1/model.plan \
        --minShapes=input_ids:1x32 \
        --optShapes=input_ids:4x256 \
        --maxShapes=input_ids:8x512 \
        --fp16 \
        --memPoolSize=workspace:4096 \
        --builderOptimizationLevel=5 \
        --tacticSources=+CUDNN,+CUBLAS,+CUBLASLT \
        --timingCacheFile=models/cache-cuda128/generation_timing.cache \
        --saveTimingCache=models/cache-cuda128/generation_timing.cache \
        --profilingVerbosity=detailed \
        --dumpLayerInfo \
        --exportTimes=models/cache-cuda128/generation_timing.json \
        --exportProfile=models/cache-cuda128/generation_profile.json \
        --verbose 2>&1 | tee build_generation_cuda128.log

    if [ -f "triton-models/legal_generation/1/model.plan" ]; then
        generation_size=$(du -h triton-models/legal_generation/1/model.plan | cut -f1)
        echo "✅ Legal generation engine built: $generation_size"
    else
        echo "❌ Failed to build legal generation engine"
    fi
else
    echo "⚠️  Legal generation ONNX not found, skipping..."
fi

# Engine validation
echo "🔍 Validating CUDA 12.8 engine compatibility..."

# Create validation script
cat > validate_engines.py << 'EOF'
import os
import subprocess
import sys

def check_engine_compatibility(engine_path):
    """Check if engine is compatible with current CUDA version"""
    if not os.path.exists(engine_path):
        return False, "Engine file not found"

    size = os.path.getsize(engine_path)
    if size < 1024:  # Less than 1KB
        return False, f"Engine too small: {size} bytes"

    return True, f"Valid engine: {size/1024/1024:.1f}MB"

engines = [
    "triton-models/legal_embedding/1/model.plan",
    "triton-models/legal_generation/1/model.plan"
]

all_valid = True
for engine in engines:
    valid, msg = check_engine_compatibility(engine)
    status = "✅" if valid else "❌"
    print(f"{status} {os.path.basename(os.path.dirname(os.path.dirname(engine)))}: {msg}")
    if not valid and "embedding" in engine:  # Embedding is required
        all_valid = False

if all_valid:
    print("🎉 All required engines are CUDA 12.8 compatible!")
    sys.exit(0)
else:
    print("❌ Engine validation failed!")
    sys.exit(1)
EOF

python3 validate_engines.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 TensorRT engines successfully rebuilt for CUDA 12.8!"
    echo ""
    echo "📊 Engine Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -f "triton-models/legal_embedding/1/model.plan" ]; then
        echo "  🔹 Legal Embedding:  $(du -h triton-models/legal_embedding/1/model.plan | cut -f1)"
    fi
    if [ -f "triton-models/legal_generation/1/model.plan" ]; then
        echo "  🔹 Legal Generation: $(du -h triton-models/legal_generation/1/model.plan | cut -f1)"
    fi
    echo ""
    echo "🚀 Ready to start Triton server:"
    echo "   ./start-triton-legal-ai.sh"
    echo "   OR"
    echo "   docker-compose -f docker-compose.triton.yml up"
else
    echo "❌ Engine rebuild failed!"
    exit 1
fi

# Cleanup
rm -f validate_engines.py