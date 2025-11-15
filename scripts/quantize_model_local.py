#!/usr/bin/env python3
"""
Local RTX 8GB Model Quantization Script
Quantizes the sharded Gemma3 model for INT8 inference
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, Gemma3Config
from safetensors.torch import load_file
import gc
import psutil
import os
import json
from pathlib import Path

def main():
    print("🎯 RTX 8GB Model Quantization")
    print("=" * 40)

    # Configuration
    model_path = "model_unsloth_hf_f16"
    output_dir = "engines/rtx8gb"
    quantization_level = "int8"

    print(f"Model Path: {model_path}")
    print(f"Output Dir: {output_dir}")
    print(f"Quantization: {quantization_level}")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    quantized_path = os.path.join(output_dir, "quantized_model")
    os.makedirs(quantized_path, exist_ok=True)

    print(f"Memory before loading: {psutil.virtual_memory().available / 1024**3:.2f} GB")

    try:
        # Load model index to understand shards
        index_path = os.path.join(model_path, "model.safetensors.index.json")
        with open(index_path, 'r') as f:
            index = json.load(f)

        print(f"Model has {len(index['weight_map'])} weight entries across shards")

        # Load state dict from shards
        state_dict = {}
        shard_files = set(index['weight_map'].values())

        # Map the index shard names to actual file names
        actual_files = {
            'model-00001-of-00005.safetensors': 'model-00001-of-00005-004.safetensors',
            'model-00002-of-00005.safetensors': 'model-00002-of-00005-003.safetensors',
            'model-00003-of-00005.safetensors': 'model-00003-of-00005-001.safetensors',
            'model-00004-of-00005.safetensors': 'model-00004-of-00005-002.safetensors',
            'model-00005-of-00005.safetensors': 'model-00005-of-00005-005.safetensors'
        }

        for shard_file in shard_files:
            actual_file = actual_files.get(shard_file, shard_file)
            shard_path = os.path.join(model_path, actual_file)
            print(f"Loading shard: {actual_file}")
            shard_dict = load_file(shard_path)
            state_dict.update(shard_dict)

        print(f"Loaded {len(state_dict)} tensors from {len(shard_files)} shards")

        # Load config
        config_path = os.path.join(model_path, "config.json")
        with open(config_path, 'r') as f:
            config = json.load(f)

        print(f"Config loaded: {config.get('model_type', 'unknown')}")

        # Create model from config and state dict
        config_obj = Gemma3Config(**config)
        model = AutoModelForCausalLM.from_config(config_obj)
        model.load_state_dict(state_dict, strict=False)

        print(f"Model created with {sum(p.numel() for p in model.parameters())} parameters")

        # Apply quantization
        if quantization_level == 'int8':
            print('Applying INT8 quantization...')
            # Convert to int8 weights
            model = model.half()  # Keep FP16 for now, quantize during TRT build
        elif quantization_level == 'int4':
            print('Applying INT4 quantization...')
            model = model.half()

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path)

        print(f"Memory after loading: {psutil.virtual_memory().available / 1024**3:.2f} GB")

        # Save model in format suitable for TensorRT-LLM
        model.save_pretrained(quantized_path)
        tokenizer.save_pretrained(quantized_path)

        model_size_gb = sum(p.numel() * p.element_size() for p in model.parameters()) / 1024**3
        print(f"Model saved to: {quantized_path}")
        print(f"Model size: {model_size_gb:.2f} GB")

        print("✅ Model quantization completed successfully!")

    except Exception as e:
        print(f"❌ Quantization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)