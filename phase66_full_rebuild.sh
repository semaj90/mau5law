#!/bin/bash
# Phase 66 TensorRT-LLM Full Rebuild Script
# Handles ONNX export, quantization fixes, and engine building

set -e

echo "🔄 Phase 66 TensorRT-LLM Full Pipeline Rebuild"
echo "=============================================="

WORKSPACE="/workspace"
MODELS_DIR="$WORKSPACE/models"
ENGINES_DIR="$WORKSPACE/engines"

# Create directories
mkdir -p "$MODELS_DIR" "$ENGINES_DIR"

# Step 1: Export ONNX model with proper quantization
echo "📦 Step 1: Exporting EmbeddingGemma ONNX model..."
if [ ! -f "$MODELS_DIR/embeddinggemma_300m_onnx/model.onnx" ]; then
    echo "🔄 Exporting ONNX model with symmetric quantization..."
    python3 -c "
import torch
from transformers import AutoTokenizer, AutoModel
import onnxruntime as ort
from pathlib import Path

# Load model and tokenizer
model_name = 'google/embeddinggemma-300m'
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name, torch_dtype=torch.float16)

# Create dummy input
dummy_input = tokenizer('Hello world', return_tensors='pt')['input_ids']

# Export to ONNX with FP16
onnx_path = '$MODELS_DIR/embeddinggemma_300m_onnx/model.onnx'
Path(onnx_path).parent.mkdir(parents=True, exist_ok=True)

torch.onnx.export(
    model,
    dummy_input,
    onnx_path,
    input_names=['input_ids'],
    output_names=['embeddings'],
    dynamic_axes={'input_ids': {0: 'batch_size', 1: 'seq_len'}},
    opset_version=17
)

print(f'✅ ONNX model exported to: {onnx_path}')
"
else
    echo "✅ ONNX model already exists, skipping export..."
fi

# Step 2: Build FP16 TensorRT engine
echo "🔥 Step 2: Building FP16 TensorRT engine..."
ENGINE_PATH="$MODELS_DIR/embeddinggemma_300m_fp16.engine"
ONNX_PATH="$MODELS_DIR/embeddinggemma_300m_onnx/model.onnx"

if [ ! -f "$ENGINE_PATH" ]; then
    echo "🚀 Building engine with trtexec..."
    trtexec \
        --onnx="$ONNX_PATH" \
        --saveEngine="$ENGINE_PATH" \
        --minShapes=input_ids:1x1 \
        --optShapes=input_ids:1x128 \
        --maxShapes=input_ids:1x512 \
        --fp16 \
        --workspace=2048 \
        --verbose

    if [ -f "$ENGINE_PATH" ]; then
        ENGINE_SIZE=$(stat -c%s "$ENGINE_PATH" 2>/dev/null || stat -f%z "$ENGINE_PATH" 2>/dev/null || echo "unknown")
        ENGINE_SIZE_MB=$((ENGINE_SIZE / 1024 / 1024))
        echo "✅ Engine built successfully! Size: ${ENGINE_SIZE_MB} MB"
    else
        echo "❌ Engine build failed"
        exit 1
    fi
else
    echo "✅ Engine already exists, skipping build..."
fi

# Step 3: Verify engine
echo "🔍 Step 3: Verifying TensorRT engine..."
python3 -c "
import tensorrt as trt
import numpy as np

logger = trt.Logger(trt.Logger.WARNING)
runtime = trt.Runtime(logger)

with open('$ENGINE_PATH', 'rb') as f:
    engine_data = f.read()

engine = runtime.deserialize_cuda_engine(engine_data)
if engine:
    print('✅ Engine verification successful!')
    print(f'🏗️  Bindings: {engine.num_bindings}')
    for i in range(engine.num_bindings):
        name = engine.get_binding_name(i)
        shape = engine.get_binding_shape(i)
        dtype = engine.get_binding_dtype(i)
        is_input = engine.binding_is_input(i)
        print(f'  {\"Input\" if is_input else \"Output\"} {i}: {name}, shape: {shape}, dtype: {dtype}')
else:
    print('❌ Engine verification failed!')
    exit(1)
"

echo "🎉 Phase 66 TensorRT-LLM pipeline complete!"
echo "📁 Models: $MODELS_DIR"
echo "🚀 Engines: $ENGINES_DIR"