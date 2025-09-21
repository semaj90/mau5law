#!/bin/bash
# Build both FP16 and INT8 TensorRT engines from master BF16 checkpoint
# Master checkpoint: ~/gemma3_trtllm_checkpoint (19GB BF16)

echo "=== TensorRT-LLM Dual Engine Build ==="
echo "Master checkpoint: gemma3_trtllm_checkpoint (19GB BF16)"
echo "Building: FP16 engine (~9GB) + INT8 engine (~4-5GB)"
echo ""

# Activate TensorRT environment
source ~/trt_env_310/bin/activate

# Build FP16 engine (higher quality, ~9GB)
echo "=== Building FP16 Engine (Quality Mode) ==="
echo "19GB BF16 checkpoint → ~9GB FP16 engine"
trtllm-build \
    --checkpoint_dir ~/gemma3_trtllm_checkpoint \
    --output_dir ~/gemma3_engines/fp16 \
    --dtype float16 \
    --gemma_plugin float16 \
    --max_batch_size 8 \
    --max_input_len 4096 \
    --max_output_len 2048 \
    --max_beam_width 1 \
    --tp_size 1 \
    --pp_size 1

# Build INT8 engine (performance mode, ~4-5GB)
echo ""
echo "=== Building INT8 Engine (Performance Mode) ==="
echo "19GB BF16 checkpoint → ~4-5GB INT8 engine"
trtllm-build \
    --checkpoint_dir ~/gemma3_trtllm_checkpoint \
    --output_dir ~/gemma3_engines/int8 \
    --dtype float16 \
    --use_weight_only \
    --weight_only_precision int8 \
    --gemma_plugin float16 \
    --max_batch_size 16 \
    --max_input_len 4096 \
    --max_output_len 2048 \
    --max_beam_width 1 \
    --tp_size 1 \
    --pp_size 1

echo ""
echo "=== Build Complete ==="
echo "Engines created:"
echo "  FP16: ~/gemma3_engines/fp16/gemma_fp16.plan (~9GB)"
echo "  INT8: ~/gemma3_engines/int8/gemma_int8.plan (~4-5GB)"
echo ""
echo "Total VRAM requirements:"
echo "  FP16: ~11-12GB (engine + runtime)"
echo "  INT8: ~6-7GB (engine + runtime)"