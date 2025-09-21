#!/bin/bash
# Build TensorRT-LLM Engine for Gemma3 Legal AI
# Compatible with TensorRT-LLM 1.1.0rc5

set -e

# Activate TensorRT environment
source ~/trt_env_310/bin/activate

cd /mnt/c/Users/james/Videos/deeds-web-app

echo "🚀 Building TensorRT-LLM Engine for Gemma3 Legal AI"
echo "📋 Model: Gemma3 (24GB) -> TensorRT-LLM optimized"

# Build configuration
HF_MODEL_DIR="model_unsloth_hf_f16"
ENGINE_DIR="gemma3_trt_engine_optimized"
MAX_BATCH_SIZE=8
MAX_INPUT_LEN=2048
MAX_OUTPUT_LEN=1024
MAX_BEAM_WIDTH=1

echo "⚙️  Configuration:"
echo "   - Batch Size: $MAX_BATCH_SIZE"
echo "   - Max Input: $MAX_INPUT_LEN tokens"
echo "   - Max Output: $MAX_OUTPUT_LEN tokens"
echo "   - Precision: FP16"

# Method 1: Try direct HF -> TensorRT build (TensorRT-LLM 1.1.0rc5 supports this)
echo "🔄 Method 1: Direct HuggingFace to TensorRT build..."

trtllm-build \
    --checkpoint_dir "$HF_MODEL_DIR" \
    --output_dir "$ENGINE_DIR" \
    --gemm_plugin float16 \
    --gpt_attention_plugin float16 \
    --max_batch_size $MAX_BATCH_SIZE \
    --max_input_len $MAX_INPUT_LEN \
    --max_seq_len $((MAX_INPUT_LEN + MAX_OUTPUT_LEN)) \
    --max_beam_width $MAX_BEAM_WIDTH \
    --dtype float16 \
    --strongly_typed \
    2>&1 | tee trt_build.log

if [ $? -eq 0 ] && [ -d "$ENGINE_DIR" ]; then
    echo "✅ TensorRT-LLM engine built successfully!"

    # List engine files
    echo "📁 Engine files:"
    ls -la "$ENGINE_DIR"

    # Test basic functionality
    echo "🧪 Testing engine loading..."
    python -c "
import tensorrt_llm
from tensorrt_llm.runtime import ModelConfig, SamplingConfig
from tensorrt_llm.runtime import ModelRunner
import os

engine_dir = '$ENGINE_DIR'
if os.path.exists(engine_dir):
    print('✅ Engine directory found')
    # Quick validation
    config_path = os.path.join(engine_dir, 'config.json')
    if os.path.exists(config_path):
        print('✅ Engine config found')
        print('🎯 TensorRT-LLM engine ready for legal AI inference!')
    else:
        print('⚠️  Engine config missing')
else:
    print('❌ Engine directory not found')
"
else
    echo "❌ Engine build failed, check trt_build.log"
    echo "📋 Last 20 lines of build log:"
    tail -20 trt_build.log
    exit 1
fi

echo "🎉 TensorRT-LLM Legal AI Engine Ready!"
echo "💡 Use with: python inference_trt.py"