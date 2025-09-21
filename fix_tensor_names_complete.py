#!/usr/bin/env python3
"""
Complete TensorRT-LLM tensor name mapping for Gemma3
Loads all sharded safetensor files and creates proper mapping
"""

import os
import json
from pathlib import Path
from safetensors.torch import load_file, save_file
import torch
from collections import OrderedDict

def load_all_shards():
    """Load all sharded safetensor files from HuggingFace checkpoint"""

    checkpoint_dir = "/home/james/gemma3_checkpoint_fixed"
    all_weights = OrderedDict()

    # Load all 5 shards
    shard_files = [
        "model-00001-of-00005.safetensors",
        "model-00002-of-00005.safetensors",
        "model-00003-of-00005.safetensors",
        "model-00004-of-00005.safetensors",
        "model-00005-of-00005.safetensors"
    ]

    for shard_file in shard_files:
        shard_path = os.path.join(checkpoint_dir, shard_file)
        print(f"📁 Loading {shard_file}...")

        shard_weights = load_file(shard_path)
        print(f"   Loaded {len(shard_weights)} tensors")

        # Merge into all_weights
        all_weights.update(shard_weights)

    print(f"📊 Total tensors loaded: {len(all_weights)}")

    # Check layer distribution
    layer_counts = {}
    for key in all_weights.keys():
        if "layers." in key:
            layer_num = key.split(".layers.")[1].split(".")[0]
            if layer_num.isdigit():
                layer_counts[int(layer_num)] = layer_counts.get(int(layer_num), 0) + 1

    if layer_counts:
        min_layer = min(layer_counts.keys())
        max_layer = max(layer_counts.keys())
        print(f"📊 Layers found: {min_layer} to {max_layer} ({len(layer_counts)} layers)")

    return all_weights

def create_tensor_mapping():
    """Create complete mapping from HuggingFace names to TensorRT-LLM names"""

    mapping = {
        # Embedding layer
        "language_model.model.embed_tokens.weight": "transformer.vocab_embedding.weight",

        # Final layer norm
        "language_model.model.norm.weight": "transformer.ln_f.weight",

        # LM head (will be shared with embeddings in TensorRT-LLM)
        "language_model.lm_head.weight": "lm_head.weight"
    }

    # Generate layer mappings for all 48 layers
    for i in range(48):
        layer_prefix_hf = f"language_model.model.layers.{i}"
        layer_prefix_trt = f"transformer.layers.{i}"

        # Layer norm mappings
        mapping[f"{layer_prefix_hf}.input_layernorm.weight"] = f"{layer_prefix_trt}.input_layernorm.weight"
        mapping[f"{layer_prefix_hf}.post_attention_layernorm.weight"] = f"{layer_prefix_trt}.post_layernorm.weight"

        # MLP mappings
        mapping[f"{layer_prefix_hf}.mlp.gate_proj.weight"] = f"{layer_prefix_trt}.mlp.gate.weight"
        mapping[f"{layer_prefix_hf}.mlp.up_proj.weight"] = f"{layer_prefix_trt}.mlp.fc.weight"
        mapping[f"{layer_prefix_hf}.mlp.down_proj.weight"] = f"{layer_prefix_trt}.mlp.proj.weight"

        # Attention projections (will be combined into qkv)
        # Individual q,k,v projections will be combined in convert_checkpoint()
        mapping[f"{layer_prefix_hf}.self_attn.o_proj.weight"] = f"{layer_prefix_trt}.attention.dense.weight"

    return mapping

def combine_qkv_weights(hf_weights, layer_idx):
    """Combine separate q,k,v weights into single qkv weight for TensorRT-LLM"""

    layer_prefix = f"language_model.model.layers.{layer_idx}.self_attn"

    # Get individual projection weights
    q_key = f"{layer_prefix}.q_proj.weight"
    k_key = f"{layer_prefix}.k_proj.weight"
    v_key = f"{layer_prefix}.v_proj.weight"

    if not all(key in hf_weights for key in [q_key, k_key, v_key]):
        print(f"⚠️  Missing q/k/v weights for layer {layer_idx}")
        return None

    q_weight = hf_weights[q_key]
    k_weight = hf_weights[k_key]
    v_weight = hf_weights[v_key]

    # Combine into qkv format expected by TensorRT-LLM
    # Format: [q_heads, k_heads, v_heads] concatenated along dim 0
    qkv_weight = torch.cat([q_weight, k_weight, v_weight], dim=0)

    return qkv_weight

def convert_checkpoint():
    """Convert complete HuggingFace checkpoint to TensorRT-LLM format"""

    TRT_CHECKPOINT_DIR = "/home/james/gemma3_trtllm_complete"

    print("🔹 Loading all HuggingFace checkpoint shards...")
    hf_weights = load_all_shards()

    # Create TensorRT-LLM weights dictionary
    trt_weights = OrderedDict()

    # Get mapping
    mapping = create_tensor_mapping()

    print("🔄 Converting tensor names...")

    # Apply direct mappings
    converted_count = 0
    for hf_name, trt_name in mapping.items():
        if hf_name in hf_weights:
            trt_weights[trt_name] = hf_weights[hf_name]
            print(f"✓ {hf_name} -> {trt_name}")
            converted_count += 1

    print(f"📊 Direct mappings applied: {converted_count}")

    # Handle QKV combinations
    print("🔄 Combining QKV projections...")
    qkv_count = 0
    for i in range(48):
        layer_prefix_trt = f"transformer.layers.{i}"

        qkv_weight = combine_qkv_weights(hf_weights, i)
        if qkv_weight is not None:
            trt_weights[f"{layer_prefix_trt}.attention.qkv.weight"] = qkv_weight
            print(f"✓ Layer {i}: Combined q,k,v -> qkv ({qkv_weight.shape})")
            qkv_count += 1

    print(f"📊 QKV combinations created: {qkv_count}")

    # Check for any additional required tensors
    print("🔍 Checking for additional tensor requirements...")

    # Add final layer norm if missing but present in HF
    if "language_model.model.norm.weight" in hf_weights and "transformer.ln_f.weight" not in trt_weights:
        trt_weights["transformer.ln_f.weight"] = hf_weights["language_model.model.norm.weight"]
        print("✓ Added final layer norm")

    print(f"📊 Total TensorRT-LLM tensors created: {len(trt_weights)}")

    # Create output directory
    os.makedirs(TRT_CHECKPOINT_DIR, exist_ok=True)

    # Save converted weights
    print("💾 Saving complete TensorRT-LLM checkpoint...")
    save_file(trt_weights, f"{TRT_CHECKPOINT_DIR}/rank0.safetensors")

    # Create TensorRT-LLM config
    config = {
        "architecture": "GemmaForCausalLM",
        "dtype": "float16",
        "hidden_size": 3840,
        "intermediate_size": 15360,
        "num_hidden_layers": 48,
        "num_attention_heads": 16,
        "num_key_value_heads": 8,
        "vocab_size": 262208,
        "max_position_embeddings": 4096,
        "rotary_base": 10000.0,
        "rope_theta": 1000000.0,
        "rms_norm_eps": 1e-06,
        "builder_config": {
            "name": "gemma",
            "precision": "float16",
            "tensor_parallel": 1,
            "pipeline_parallel": 1,
            "max_batch_size": 4,
            "max_input_len": 2048,
            "max_output_len": 2048,
            "max_beam_width": 1,
            "vocab_size": 262208,
            "num_layers": 48,
            "num_heads": 16,
            "num_kv_heads": 8,
            "hidden_size": 3840,
            "inter_size": 15360,
            "head_size": 256
        }
    }

    with open(f"{TRT_CHECKPOINT_DIR}/config.json", 'w') as f:
        json.dump(config, f, indent=2)

    print(f"✅ Complete TensorRT-LLM checkpoint saved to: {TRT_CHECKPOINT_DIR}")

    # File size info
    checkpoint_size = os.path.getsize(f"{TRT_CHECKPOINT_DIR}/rank0.safetensors") / (1024**3)
    print(f"📁 Files created:")
    print(f"   - rank0.safetensors ({checkpoint_size:.1f}GB)")
    print(f"   - config.json")

    return TRT_CHECKPOINT_DIR

if __name__ == "__main__":
    print("Starting complete HuggingFace to TensorRT-LLM checkpoint conversion...")

    try:
        checkpoint_dir = convert_checkpoint()
        print("\n🎉 Complete conversion successful!")
        print("Next: Build TensorRT engine")
        print(f"Command: trtllm-build --checkpoint_dir {checkpoint_dir} --output_dir /home/james/gemma3_engine_complete")
    except Exception as e:
        print(f"\n❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()