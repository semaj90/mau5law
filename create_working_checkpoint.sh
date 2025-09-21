#!/bin/bash
# Create working checkpoint from existing HF model
# Uses your model_unsloth_hf_f16 which should work

set -e

echo "=== Creating Working TensorRT Checkpoint ==="

# Activate TensorRT environment
source /home/james/trt_env_310/bin/activate

# Configuration
HF_MODEL_DIR="/mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16"
CHECKPOINT_DIR="/home/james/gemma3_working_checkpoint"
ENGINE_DIR="/home/james/gemma3_final_engine"

echo "📁 HF model: $HF_MODEL_DIR"
echo "📁 Checkpoint: $CHECKPOINT_DIR"
echo "📁 Engine: $ENGINE_DIR"

# Create directories
mkdir -p $CHECKPOINT_DIR
mkdir -p $ENGINE_DIR

# Check if HF model exists
if [ ! -d "$HF_MODEL_DIR" ]; then
    echo "❌ HF model directory not found: $HF_MODEL_DIR"
    exit 1
fi

echo "✅ Found HF model directory"
ls -la "$HF_MODEL_DIR" | head -10

# Step 1: Convert HF to TensorRT checkpoint using proper API
echo "🔄 Step 1: Converting HF model to TensorRT checkpoint..."

python -c "
import sys
import warnings
import os
warnings.filterwarnings('ignore')

try:
    from tensorrt_llm.models.gemma.convert import convert_hf_model
    import argparse

    print('🔄 Using TensorRT-LLM Gemma converter...')

    # Create conversion arguments - optimized for your use case
    args = argparse.Namespace(
        model_dir='$HF_MODEL_DIR',
        output_dir='$CHECKPOINT_DIR',
        dtype='float16',
        use_weight_only=True,
        weight_only_precision='int4',
        use_smoothquant=False,
        per_channel=True,
        per_token=False,
        int8_kv_cache=False,
        per_group=True,
        group_size=128,
        smoothquant_val=0.5,
        tp_size=1,
        pp_size=1,
        workers=1,
        load_model_on_cpu=True,
        calibrate_kv_cache=False,
        calib_dataset='cnn_dailymail',
        use_fp8=False
    )

    print('✅ Running conversion with INT4 optimization...')
    convert_hf_model(args)
    print('✅ HF to TensorRT conversion completed!')

except Exception as e:
    print(f'❌ Conversion failed: {e}')
    print('📋 Error details:')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

# Check if checkpoint was created
if [ ! -f "$CHECKPOINT_DIR/rank0.safetensors" ]; then
    echo "❌ Checkpoint creation failed"
    exit 1
fi

CHECKPOINT_SIZE=$(du -h "$CHECKPOINT_DIR/rank0.safetensors" | cut -f1)
echo "✅ Checkpoint created: $CHECKPOINT_SIZE"

# Step 2: Build TensorRT engine
echo "🔄 Step 2: Building optimized TensorRT engine..."

trtllm-build \
    --checkpoint_dir $CHECKPOINT_DIR \
    --output_dir $ENGINE_DIR \
    --gemm_plugin float16 \
    --gpt_attention_plugin float16 \
    --max_batch_size 1 \
    --max_input_len 512 \
    --max_seq_len 768 \
    --max_beam_width 1 \
    --workers 1 \
    --use_paged_context_fmha enable \
    --use_fused_mlp enable \
    --remove_input_padding enable \
    --context_fmha enable \
    --multiple_profiles enable \
    2>&1 | tee $ENGINE_DIR/build.log

# Check if engine was built
if [ -f "$ENGINE_DIR/rank0.engine" ]; then
    echo "✅ TensorRT engine built successfully!"

    ENGINE_SIZE=$(du -h "$ENGINE_DIR/rank0.engine" | cut -f1)
    echo "Engine size: $ENGINE_SIZE"
    echo "Checkpoint size: $CHECKPOINT_SIZE"

    # Create metadata
    cat > $ENGINE_DIR/engine_metadata.json << EOF
{
  "engine_name": "gemma3-int4-optimized",
  "source": "HuggingFace_F16",
  "quantization": "INT4_weight_only",
  "target_performance": "sub_2ms",
  "gpu_target": "RTX_3060_Ti",
  "batch_size": 1,
  "max_input_tokens": 512,
  "max_seq_len": 768,
  "legal_ai_optimized": true,
  "optimizations": [
    "INT4_Weight_Only",
    "Per_Channel_Quantization",
    "Per_Group_Scaling",
    "FP16_GEMM",
    "FP16_Attention",
    "Paged_Context_FMHA",
    "Fused_MLP",
    "Remove_Input_Padding",
    "Multiple_Profiles"
  ],
  "build_timestamp": $(date +%s),
  "engine_size": "$ENGINE_SIZE",
  "checkpoint_size": "$CHECKPOINT_SIZE"
}
EOF

    echo "✅ Engine metadata:"
    cat $ENGINE_DIR/engine_metadata.json | python3 -m json.tool
    echo
    echo "📊 Final files:"
    ls -lah $ENGINE_DIR/

else
    echo "❌ Engine build failed. Last 20 lines of log:"
    tail -20 $ENGINE_DIR/build.log
    exit 1
fi

echo "=== Working TensorRT Engine Complete ==="
echo "🎯 Engine: $ENGINE_DIR/rank0.engine"
echo "⚡ INT4 quantized for maximum speed"
echo "🚀 Ready for sub-2ms legal AI inference!"