#!/usr/bin/env python3
"""
Validate safetensors files for PyTorch compatibility
"""
import torch
import safetensors.torch as st
import os
import sys

def validate_safetensors_file(file_path):
    """Validate a safetensors file by attempting to load it"""
    print(f"\n🔍 Validating: {file_path}")

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False

    file_size = os.path.getsize(file_path) / (1024**3)  # Size in GB
    print(f"📁 File size: {file_size:.2f} GB")
    try:
        # Try to load the file
        with st.safe_open(file_path, framework='pt', device='cpu') as f:
            keys = list(f.keys())
            print(f"✅ Successfully opened file")
            print(f"📊 Total tensors: {len(keys)}")

            # Check for critical components
            embed_tokens = [k for k in keys if 'embed_tokens' in k]
            lm_head = [k for k in keys if 'lm_head' in k]
            layers = [k for k in keys if 'layers' in k and 'weight' in k]

            print(f"🔤 Embedding tokens: {len(embed_tokens)}")
            print(f"🎯 LM head: {len(lm_head)}")
            print(f"🏗️  Transformer layers: {len(layers)}")

            # Check embedding dimensions if present
            if embed_tokens:
                embed_tensor = f.get_tensor(embed_tokens[0])
                vocab_size, hidden_size = embed_tensor.shape
                print(f"📏 Vocab size: {vocab_size}, Hidden size: {hidden_size}")

                # Gemma3 should have 4096 hidden size for text model
                if hidden_size == 4096:
                    print("✅ Correct hidden size for Gemma3 text model")
                elif hidden_size == 3840:
                    print("⚠️  Vision tower dimensions (3840) - missing text model weights")
                else:
                    print(f"❓ Unexpected hidden size: {hidden_size}")

            # Sample a few tensor shapes
            print("📋 Sample tensor shapes:")
            for i, key in enumerate(keys[:5]):  # First 5 tensors
                tensor = f.get_tensor(key)
                print(f"  {key}: {tensor.shape} ({tensor.dtype})")

            return True

    except Exception as e:
        print(f"❌ Failed to load: {str(e)}")
        return False

def main():
    files_to_check = [
        'engines/gemma3-legal-production/checkpoint/rank0.safetensors',
        'tensorrt_build/input/rank0.safetensors'
    ]

    print("🧪 PyTorch Safetensors Validation")
    print("=" * 40)

    all_valid = True
    for file_path in files_to_check:
        if not validate_safetensors_file(file_path):
            all_valid = False

    print(f"\n{'='*40}")
    if all_valid:
        print("✅ All files are valid PyTorch safetensors")
        print("💡 These could work for PyTorch inference even if TRT-LLM failed")
    else:
        print("❌ Some files are corrupted or incomplete")
        print("🗑️  Safe to delete these files")

if __name__ == "__main__":
    main()