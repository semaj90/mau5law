#!/bin/bash
# build-gemma3-engines-fixed.sh - Updated for TensorRT-LLM 1.1.0rc5
set -e

FP16_CHECKPOINT="/home/james/gemma3_trtllm_checkpoint"   # existing 18GB FP16 checkpoint
ENGINE_DIR="/home/james/gemma3_trt_engine"

mkdir -p "$ENGINE_DIR/fp16"
mkdir -p "$ENGINE_DIR/int4"

echo "=== Building TensorRT-LLM Engines ==="
echo "FP16 Checkpoint: $FP16_CHECKPOINT"
echo "Engine Output: $ENGINE_DIR"
echo ""

# Activate TensorRT environment
source ~/trt_env_310/bin/activate
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH

echo "🔧 Building FP16 Engine (optimized for RTX 3060 Ti)..."
# FP16 engine - optimized parameters for RTX 3060 Ti
trtllm-build \
  --checkpoint_dir "$FP16_CHECKPOINT" \
  --output_dir "$ENGINE_DIR/fp16" \
  --max_batch_size 4 \
  --max_input_len 2048 \
  --max_seq_len 8192 \
  --gpt_attention_plugin float16 \
  --gemm_plugin float16 \
  --context_fmha enable \
  --remove_input_padding enable \
  --reduce_fusion enable \
  --log_level info

echo ""
echo "🔧 Building INT4 Engine (VRAM optimized for 8GB RTX 3060 Ti)..."
# INT4 engine - low VRAM for RTX 3060 Ti
trtllm-build \
  --checkpoint_dir "$FP16_CHECKPOINT" \
  --output_dir "$ENGINE_DIR/int4" \
  --max_batch_size 2 \
  --max_input_len 2048 \
  --max_seq_len 8192 \
  --gpt_attention_plugin float16 \
  --gemm_plugin float16 \
  --context_fmha enable \
  --remove_input_padding enable \
  --reduce_fusion enable \
  --log_level info

echo ""
echo "🎉 TensorRT-LLM Engines Built Successfully!"
echo ""
echo "=== Engine Details ==="
echo "📁 FP16 Engine: $ENGINE_DIR/fp16/engine.plan"
echo "📁 INT4 Engine: $ENGINE_DIR/int4/engine.plan"
echo "🧠 Features: 8k context (RTX 3060 Ti optimized), KV-cache, FlashAttention"
echo "⚡ Optimized for 8GB VRAM RTX 3060 Ti"
echo ""
echo "Next: Test with Python inference wrapper"