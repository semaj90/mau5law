#!/bin/bash
# WSL2 TensorRT-LLM Conversion Script for Unsloth Model

set -e

echo "=== WSL2 TensorRT-LLM Conversion ==="
echo "Converting Unsloth Gemma3 model to TensorRT engine"

# Configuration
WINDOWS_PATH="/mnt/c/Users/james/Videos/deeds-web-app"
SOURCE_MODEL="model_unsloth_hf_f16"
WORKSPACE="tensorrt_workspace/unsloth_conversion"
OUTPUT_DIR="tensorrt_models/unsloth_legal_engine"

cd "$WINDOWS_PATH"

# Create directories
mkdir -p "$WORKSPACE/checkpoint"
mkdir -p "$OUTPUT_DIR"

echo "Model source: $SOURCE_MODEL"
echo "Workspace: $WORKSPACE"
echo "Output: $OUTPUT_DIR"

# Check if virtual environment exists, create if not
if [ ! -d "tensorrt_wsl_env" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv tensorrt_wsl_env
fi

# Activate virtual environment
source tensorrt_wsl_env/bin/activate

echo "Installing TensorRT-LLM dependencies..."
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install tensorrt-llm --extra-index-url https://pypi.nvidia.com --timeout 600

echo "Checking TensorRT-LLM installation..."
python3 -c "import tensorrt_llm; print('TensorRT-LLM version:', tensorrt_llm.__version__)"

echo "=== Step 1: Convert to TensorRT-LLM Checkpoint ==="
python3 -m tensorrt_llm.commands.convert_checkpoint \
    --model_dir "$SOURCE_MODEL" \
    --output_dir "$WORKSPACE/checkpoint" \
    --dtype float16 \
    --tp_size 1 \
    --pp_size 1

echo "=== Step 2: Build TensorRT Engine ==="
python3 -m tensorrt_llm.commands.build \
    --checkpoint_dir "$WORKSPACE/checkpoint" \
    --output_dir "$OUTPUT_DIR" \
    --gemm_plugin float16 \
    --gpt_attention_plugin float16 \
    --layernorm_plugin float16 \
    --max_batch_size 2 \
    --max_input_len 2048 \
    --max_output_len 1024 \
    --max_beam_width 1 \
    --use_custom_all_reduce enable \
    --strongly_typed

echo "=== Step 3: Copy Supporting Files ==="
cp "$SOURCE_MODEL/tokenizer.json" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$SOURCE_MODEL/tokenizer_config.json" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$SOURCE_MODEL/special_tokens_map.json" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$SOURCE_MODEL/tokenizer.model" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$SOURCE_MODEL/config.json" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$SOURCE_MODEL/generation_config.json" "$OUTPUT_DIR/" 2>/dev/null || true

echo "=== Validation ==="
echo "Checking generated files..."
ls -la "$OUTPUT_DIR"

echo "Engine files:"
find "$OUTPUT_DIR" -name "*.plan" -o -name "*.engine" | while read file; do
    size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    size_mb=$((size / 1024 / 1024))
    echo "  $(basename "$file"): ${size_mb}MB"
done

echo ""
echo "=== CONVERSION COMPLETED ==="
echo "TensorRT engine location: $OUTPUT_DIR"
echo "Ready for legal AI inference with RTX GPU acceleration"
echo ""
echo "Test the engine with:"
echo "python3 test-tensorrt-engine.py"