#!/bin/bash
# Simple optimized TensorRT engine builder for legal AI
# Minimal configuration for reliable builds

set -e

echo "=== Building Simple Optimized Gemma3 TensorRT Engine ==="

# Configuration
CHECKPOINT_DIR="/home/james/gemma3_complete"
OUTPUT_DIR="/home/james/gemma3_simple_optimized"

# Create output directory
mkdir -p $OUTPUT_DIR

# Check if we have the checkpoint
if [ ! -f "$CHECKPOINT_DIR/rank0.safetensors" ]; then
    echo "Error: Checkpoint not found at $CHECKPOINT_DIR/rank0.safetensors"
    exit 1
fi

# Use the Python 3.10 environment
source /home/james/trt_env_310/bin/activate

# Verify TensorRT-LLM is available
python -c "import tensorrt_llm; print(f'TensorRT-LLM version: {tensorrt_llm.__version__}')"

# Build simple optimized engine
echo "Building simple optimized TensorRT engine..."
trtllm-build \
    --checkpoint_dir $CHECKPOINT_DIR \
    --output_dir $OUTPUT_DIR \
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
    2>&1 | tee $OUTPUT_DIR/build.log

# Verify the engine was created
if [ -f "$OUTPUT_DIR/rank0.engine" ]; then
    echo "✅ Simple optimized TensorRT engine built successfully!"

    # Get engine file size
    ENGINE_SIZE=$(du -h "$OUTPUT_DIR/rank0.engine" | cut -f1)
    echo "Engine size: $ENGINE_SIZE"

    # Create metadata
    cat > $OUTPUT_DIR/engine_metadata.json << EOF
{
  "engine_name": "gemma3-simple-optimized",
  "target_performance": "sub_2ms",
  "gpu_target": "RTX_3060_Ti",
  "batch_size": 1,
  "max_input_tokens": 512,
  "max_seq_len": 768,
  "optimizations": [
    "FP16_GEMM",
    "FP16_Attention",
    "Paged_Context_FMHA",
    "Fused_MLP",
    "Remove_Input_Padding",
    "Multiple_Profiles"
  ],
  "build_timestamp": $(date +%s),
  "engine_size": "$ENGINE_SIZE"
}
EOF

    ls -lah $OUTPUT_DIR/
else
    echo "❌ Engine build failed. Check $OUTPUT_DIR/build.log for details"
    tail -20 $OUTPUT_DIR/build.log
    exit 1
fi

echo "=== Simple Optimized Build Complete ==="
echo "Engine location: $OUTPUT_DIR/rank0.engine"