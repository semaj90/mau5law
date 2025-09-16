#!/bin/bash
# Build TensorRT engines for Legal AI models
# Optimized for RTX 3060 with CUDA 12.8

set -e

echo "🚀 Building TensorRT engines for Legal AI models..."

# Ensure CUDA paths are set
export CUDA_PATH=${CUDA_PATH:-"/usr/local/cuda"}
export PATH="$CUDA_PATH/bin:$PATH"
export LD_LIBRARY_PATH="$CUDA_PATH/lib64:$LD_LIBRARY_PATH"

# Create model directories
mkdir -p triton-models/legal_embedding/1
mkdir -p triton-models/legal_generation/1
mkdir -p models/onnx
mkdir -p models/cache

echo "📋 Checking TensorRT installation..."
trtexec --version

# Download or convert models to ONNX if needed
if [ ! -f "models/onnx/legal_embedding.onnx" ]; then
    echo "⚠️  ONNX models not found. Please export your models first:"
    echo "   python scripts/export_legal_models_to_onnx.py"
    echo "   OR place ONNX models in models/onnx/"
    exit 1
fi

echo "🔧 Building Legal Embedding TensorRT engine..."
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
    --timingCacheFile=models/cache/legal_embedding_timing.cache \
    --saveTimingCache=models/cache/legal_embedding_timing.cache \
    --loadTimingCache=models/cache/legal_embedding_timing.cache \
    --profilingVerbosity=detailed \
    --dumpLayerInfo \
    --exportTimes=models/cache/legal_embedding_timing.json \
    --verbose 2>&1 | tee build_embedding_engine.log

if [ -f "models/onnx/legal_generation.onnx" ]; then
    echo "🔧 Building Legal Generation TensorRT engine..."
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
        --timingCacheFile=models/cache/legal_generation_timing.cache \
        --saveTimingCache=models/cache/legal_generation_timing.cache \
        --loadTimingCache=models/cache/legal_generation_timing.cache \
        --profilingVerbosity=detailed \
        --dumpLayerInfo \
        --exportTimes=models/cache/legal_generation_timing.json \
        --verbose 2>&1 | tee build_generation_engine.log
else
    echo "⚠️  Legal generation ONNX model not found, skipping..."
fi

echo "✅ TensorRT engines built successfully!"

# Verify engine files
echo "📊 Engine file statistics:"
if [ -f "triton-models/legal_embedding/1/model.plan" ]; then
    ls -lh triton-models/legal_embedding/1/model.plan
    echo "Legal embedding engine: $(du -h triton-models/legal_embedding/1/model.plan | cut -f1)"
fi

if [ -f "triton-models/legal_generation/1/model.plan" ]; then
    ls -lh triton-models/legal_generation/1/model.plan
    echo "Legal generation engine: $(du -h triton-models/legal_generation/1/model.plan | cut -f1)"
fi

# Test engine validation
echo "🔍 Validating TensorRT engines..."
if command -v python3 &> /dev/null; then
    python3 -c "
import os
import sys

engines = [
    'triton-models/legal_embedding/1/model.plan',
    'triton-models/legal_generation/1/model.plan'
]

for engine in engines:
    if os.path.exists(engine):
        size = os.path.getsize(engine)
        if size > 1024:  # At least 1KB
            print(f'✅ {engine}: {size/1024/1024:.1f}MB - Valid')
        else:
            print(f'❌ {engine}: {size}B - Too small')
            sys.exit(1)
    else:
        print(f'⚠️  {engine}: Not found')

print('🎉 All engines validated successfully!')
"
fi

echo "🚀 Ready to start Triton server:"
echo "   docker-compose -f docker-compose.triton.yml up triton-legal-ai"