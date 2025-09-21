#!/bin/bash
# Create text-only checkpoint and build optimized TensorRT engine

set -e

echo "=== Creating Text-Only Checkpoint and Building TensorRT Engine ==="

# Activate TensorRT environment
source /home/james/trt_env_310/bin/activate

# Step 1: Create text-only checkpoint
echo "Step 1: Creating text-only checkpoint..."
cd /mnt/c/Users/james/Videos/deeds-web-app
python create_text_only_checkpoint.py

# Step 2: Update build script to use text-only checkpoint
echo "Step 2: Building optimized TensorRT engine..."

# Configuration
CHECKPOINT_DIR="/home/james/gemma3_text_only_checkpoint"
OUTPUT_DIR="/home/james/gemma3_text_only_engine"

# Create output directory
mkdir -p $OUTPUT_DIR

# Check if we have the text-only checkpoint
if [ ! -f "$CHECKPOINT_DIR/rank0.safetensors" ]; then
    echo "Error: Text-only checkpoint not found at $CHECKPOINT_DIR/rank0.safetensors"
    exit 1
fi

echo "Building text-only optimized TensorRT engine..."
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
    echo "✅ Text-only optimized TensorRT engine built successfully!"

    # Get engine file size
    ENGINE_SIZE=$(du -h "$OUTPUT_DIR/rank0.engine" | cut -f1)
    echo "Engine size: $ENGINE_SIZE"

    # Create metadata
    cat > $OUTPUT_DIR/engine_metadata.json << EOF
{
  "engine_name": "gemma3-text-only-optimized",
  "target_performance": "sub_2ms",
  "gpu_target": "RTX_3060_Ti",
  "batch_size": 1,
  "max_input_tokens": 512,
  "max_seq_len": 768,
  "text_only": true,
  "vision_removed": true,
  "optimizations": [
    "FP16_GEMM",
    "FP16_Attention",
    "Paged_Context_FMHA",
    "Fused_MLP",
    "Remove_Input_Padding",
    "Multiple_Profiles",
    "Text_Only_Model"
  ],
  "build_timestamp": $(date +%s),
  "engine_size": "$ENGINE_SIZE"
}
EOF

    echo "Engine metadata saved to: $OUTPUT_DIR/engine_metadata.json"
    ls -lah $OUTPUT_DIR/
else
    echo "❌ Engine build failed. Check $OUTPUT_DIR/build.log for details"
    if [ -f "$OUTPUT_DIR/build.log" ]; then
        echo "Last 20 lines of build log:"
        tail -20 $OUTPUT_DIR/build.log
    fi
    exit 1
fi

echo "=== Text-Only Optimized Build Complete ==="
echo "Engine location: $OUTPUT_DIR/rank0.engine"
echo "Ready for fast legal AI inference!"