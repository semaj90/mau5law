#!/bin/bash
# TensorRT .plan Engine Builder for Unsloth Legal Model
# Builds .plan files that Go TensorRT C++ runtime can directly load

set -e

echo "🚀 Building TensorRT .plan Engine for Unsloth Legal Model"
echo "=========================================================="

cd /mnt/c/Users/james/Videos/deeds-web-app

# Configuration
SOURCE_MODEL="model_unsloth_hf_f16"
CHECKPOINT_DIR="tensorrt_workspace/unsloth_conversion/checkpoint"
ENGINE_DIR="tensorrt_models/unsloth_legal_engine"

# Activate environment
source tensorrt_conversion_env/bin/activate

echo "✅ Model: $SOURCE_MODEL (Gemma3ForCausalLM)"
echo "✅ Target: RTX 3060 Ti optimized .plan engine"
echo "✅ Output: $ENGINE_DIR"

# Step 1: Convert HuggingFace → TensorRT checkpoint
echo ""
echo "🔄 Step 1: Converting Unsloth HF → TensorRT checkpoint..."
python -m tensorrt_llm.commands.convert_checkpoint \
    --model_dir "$SOURCE_MODEL" \
    --output_dir "$CHECKPOINT_DIR" \
    --dtype float16 \
    --tp_size 1 \
    --pp_size 1

# Step 2: Build TensorRT .plan engine
echo ""
echo "🏗️  Step 2: Building optimized .plan engine..."
python -m tensorrt_llm.commands.build \
    --checkpoint_dir "$CHECKPOINT_DIR" \
    --output_dir "$ENGINE_DIR" \
    --gemm_plugin float16 \
    --gpt_attention_plugin float16 \
    --layernorm_plugin float16 \
    --max_batch_size 2 \
    --max_input_len 2048 \
    --max_output_len 1024 \
    --max_beam_width 1 \
    --use_custom_all_reduce enable \
    --strongly_typed

# Step 3: Copy tokenizer files
echo ""
echo "📄 Step 3: Copying tokenizer files..."
cp "$SOURCE_MODEL"/*.json "$ENGINE_DIR"/ 2>/dev/null || true
cp "$SOURCE_MODEL"/tokenizer.model "$ENGINE_DIR"/ 2>/dev/null || true

# Step 4: Validate engine
echo ""
echo "🔍 Step 4: Validating .plan engine..."
ls -lh "$ENGINE_DIR"

# Find .plan files
PLAN_FILES=$(find "$ENGINE_DIR" -name "*.plan" -o -name "*.engine")
if [ -z "$PLAN_FILES" ]; then
    echo "❌ No .plan engine files found!"
    exit 1
fi

echo ""
echo "🎉 SUCCESS: TensorRT .plan engine built!"
echo "📂 Engine location: $ENGINE_DIR"
echo "🔗 Ready for Go TensorRT C++ runtime consumption"
echo ""
echo "Engine files:"
for file in $PLAN_FILES; do
    size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    size_mb=$((size / 1024 / 1024))
    echo "  • $(basename "$file"): ${size_mb}MB"
done
echo ""
echo "✅ Your Go services can now load these .plan files directly!"
echo "✅ No Python runtime needed for inference!"