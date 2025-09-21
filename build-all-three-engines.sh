#!/bin/bash
# Build all 3 TensorRT engines + maintain fallback options
# Master checkpoints: TensorRT (19GB) + PyTorch (29GB) + AWQ4 (12GB)

echo "=== Triple-Engine TensorRT Build Strategy ==="
echo "Building: FP16, INT8, AWQ4 engines + maintaining fallbacks"
echo ""

# Activate TensorRT environment
source ~/trt_env_310/bin/activate

echo "=== Available Master Checkpoints ==="
echo "1. TensorRT master: gemma3_trtllm_checkpoint (19GB BF16)"
echo "2. PyTorch backup:  gemma3_complete (29GB: .pt + .safetensors)"
echo "3. AWQ4 master:     gemma3_awq4_working (12GB AWQ4 quantized)"
echo ""

# Create engine directories
mkdir -p ~/gemma3_engines/{fp16,int8,awq4}

# Build FP16 engine from TensorRT master (Quality Tier)
echo "=== Building FP16 Engine (Quality Tier) ==="
echo "Source: gemma3_trtllm_checkpoint → Target: ~9GB FP16 engine"
trtllm-build \
    --checkpoint_dir ~/gemma3_trtllm_checkpoint \
    --output_dir ~/gemma3_engines/fp16 \
    --dtype float16 \
    --gemma_plugin float16 \
    --max_batch_size 8 \
    --max_input_len 4096 \
    --max_output_len 2048 \
    --max_beam_width 1

# Build INT8 engine from TensorRT master (Performance Tier)
echo ""
echo "=== Building INT8 Engine (Performance Tier) ==="
echo "Source: gemma3_trtllm_checkpoint → Target: ~4-5GB INT8 engine"
trtllm-build \
    --checkpoint_dir ~/gemma3_trtllm_checkpoint \
    --output_dir ~/gemma3_engines/int8 \
    --dtype float16 \
    --use_weight_only \
    --weight_only_precision int8 \
    --gemma_plugin float16 \
    --max_batch_size 16 \
    --max_input_len 4096 \
    --max_output_len 2048

# Build AWQ4 engine from AWQ4 master (Efficiency Tier)
echo ""
echo "=== Building AWQ4 Engine (Efficiency Tier) ==="
echo "Source: gemma3_awq4_working → Target: ~3-4GB AWQ4 engine"
trtllm-build \
    --checkpoint_dir ~/gemma3_awq4_working \
    --output_dir ~/gemma3_engines/awq4 \
    --dtype float16 \
    --use_weight_only \
    --weight_only_precision int4_awq \
    --gemma_plugin float16 \
    --max_batch_size 32 \
    --max_input_len 4096 \
    --max_output_len 2048

echo ""
echo "=== Build Complete: 3-Tier Engine Strategy ==="
echo ""
echo "TensorRT Engines Built:"
echo "  Tier 1 - FP16:  ~/gemma3_engines/fp16/  (~9GB,  VRAM: 11-12GB, Quality: Highest)"
echo "  Tier 2 - INT8:  ~/gemma3_engines/int8/  (~5GB,  VRAM: 6-7GB,   Quality: High)"
echo "  Tier 3 - AWQ4:  ~/gemma3_engines/awq4/  (~3GB,  VRAM: 4-5GB,   Quality: Good)"
echo ""
echo "Backup Options Available:"
echo "  PyTorch:  gemma3_complete (29GB) → Ollama/llama.cpp"
echo "  AWQ4:     gemma3_awq4_working (12GB) → Direct PyTorch"
echo ""
echo "Performance Targets:"
echo "  FP16: 50 tok/s,  batch=8,  best quality"
echo "  INT8: 100 tok/s, batch=16, good quality"
echo "  AWQ4: 150 tok/s, batch=32, efficient"