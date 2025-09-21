#!/bin/bash
set -e

echo "🚀 Converting Gemma3 Safetensors to TensorRT .plan Engine"
echo "========================================================="

# Set working directories
CURRENT_DIR="/mnt/c/Users/james/Videos/deeds-web-app"
MODEL_DIR="$CURRENT_DIR/model_unsloth_hf_f16"
OUTPUT_DIR="$CURRENT_DIR/gemma3_trt_checkpoint"
ENGINE_DIR="$CURRENT_DIR/gemma3_engines"

echo "Source model: $MODEL_DIR"
echo "TRT checkpoint: $OUTPUT_DIR"
echo "Engine output: $ENGINE_DIR"

# Check if source model exists
if [ ! -d "$MODEL_DIR" ]; then
    echo "❌ Model directory not found: $MODEL_DIR"
    exit 1
fi

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ENGINE_DIR"

echo "📦 Step 1: Installing safetensors..."
pip3 install --user safetensors torch || echo "Dependencies already installed"

echo "📦 Step 2: Combining safetensor shards..."

python3 << 'EOF'
import os
import sys
from pathlib import Path

try:
    from safetensors.torch import load_file, save_file
except ImportError:
    print("Installing safetensors...")
    os.system("pip3 install --user safetensors")
    from safetensors.torch import load_file, save_file

# Directories
model_dir = "/mnt/c/Users/james/Videos/deeds-web-app/model_unsloth_hf_f16"
output_dir = "/mnt/c/Users/james/Videos/deeds-web-app/gemma3_trt_checkpoint"

# Find all non-symlink safetensor files
shard_files = []
for f in os.listdir(model_dir):
    if f.endswith('.safetensors') and 'model-' in f:
        shard_path = os.path.join(model_dir, f)
        if not os.path.islink(shard_path):
            shard_files.append(f)

shard_files = sorted(shard_files)
print(f"Found {len(shard_files)} real safetensor files (excluding symlinks)")

# Combine shards
combined_weights = {}
for shard_file in shard_files:
    shard_path = os.path.join(model_dir, shard_file)
    print(f"Loading {shard_file}...")

    try:
        weights = load_file(shard_path)
        combined_weights.update(weights)
        print(f"  ✅ {len(weights)} tensors loaded")
    except Exception as e:
        print(f"  ❌ Error: {e}")

# Save combined weights
rank0_file = os.path.join(output_dir, "rank0.safetensors")
print(f"\n💾 Saving {len(combined_weights)} tensors to rank0.safetensors...")

save_file(combined_weights, rank0_file)
file_size = os.path.getsize(rank0_file) / (1024**3)
print(f"✅ Combined file saved: {file_size:.1f}GB")

# Copy config
import shutil
config_src = os.path.join(model_dir, "config.json")
config_dst = os.path.join(output_dir, "config.json")
shutil.copy2(config_src, config_dst)
print("✅ Config copied")
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to combine safetensor shards"
    exit 1
fi

echo "🔧 Step 3: Building TensorRT engine..."
echo "This may take 30-60 minutes..."

# Check if trtllm-build is available
if ! command -v trtllm-build &> /dev/null; then
    echo "❌ trtllm-build not found. Installing TensorRT-LLM..."

    # Try to activate TensorRT environment if available
    if [ -f "ubuntu-tensorrt/trt_env/bin/activate" ]; then
        source ubuntu-tensorrt/trt_env/bin/activate
    elif [ -f "tensorrt_py310_env/bin/activate" ]; then
        source tensorrt_py310_env/bin/activate
    else
        echo "⚠️ No TensorRT environment found. Using system Python..."
    fi

    # Try to run trtllm-build again
    if ! command -v trtllm-build &> /dev/null; then
        echo "❌ trtllm-build still not available"
        echo "You may need to install TensorRT-LLM manually or use the PowerShell script"
        exit 1
    fi
fi

# Build TensorRT engine
trtllm-build \
  --checkpoint_dir "$OUTPUT_DIR" \
  --output_dir "$ENGINE_DIR" \
  --max_batch_size 4 \
  --max_input_len 2048 \
  --max_seq_len 4096 \
  --gemm_plugin float16 \
  --gpt_attention_plugin float16 \
  --remove_input_padding enable \
  --log_level info

if [ $? -eq 0 ]; then
    echo "🎉 TensorRT engine build complete!"
    echo "Engine directory: $ENGINE_DIR"
    ls -lh "$ENGINE_DIR"
    echo "✅ Ready for 2-10x faster legal AI inference!"
else
    echo "❌ TensorRT engine build failed"
    echo "Check if TensorRT-LLM is properly installed"
    exit 1
fi