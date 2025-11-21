#!/usr/bin/env python3
"""
Merge LoRA Adapter with Base Model for Inference
Combines fine-tuned LoRA weights with base Gemma3 model
"""

import os
import sys
import torch
from pathlib import Path
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

def main():
    parser = argparse.ArgumentParser(description="Merge LoRA adapter with base model")
    parser.add_argument("--adapter", required=True, help="LoRA adapter directory")
    parser.add_argument("--base_model", default="/workspace/tensorrt_build/input", help="Base model path")
    parser.add_argument("--output", required=True, help="Output directory for merged model")

    args = parser.parse_args()

    print("🔗 Merging LoRA Adapter with Base Model")
    print("=" * 50)
    print(f"Adapter: {args.adapter}")
    print(f"Base Model: {args.base_model}")
    print(f"Output: {args.output}")
    print()

    # Check if adapter exists
    if not Path(args.adapter).exists():
        print("❌ LoRA adapter not found")
        return 1

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    try:
        print("🔄 Loading base model...")
        # Load base model in bfloat16 for memory efficiency
        model = AutoModelForCausalLM.from_pretrained(
            args.base_model,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True
        )

        print("🔄 Loading LoRA adapter...")
        model = PeftModel.from_pretrained(model, args.adapter)

        print("🔄 Merging weights...")
        merged_model = model.merge_and_unload()

        print("💾 Saving merged model...")
        merged_model.save_pretrained(args.output)

        # Try to copy tokenizer if available
        tokenizer_paths = [
            args.base_model,
            "/workspace/gemma3-12b-finetuned-fp16"
        ]

        tokenizer_saved = False
        for tokenizer_path in tokenizer_paths:
            try:
                if Path(tokenizer_path).exists():
                    tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
                    tokenizer.save_pretrained(args.output)
                    print(f"✅ Tokenizer saved from {tokenizer_path}")
                    tokenizer_saved = True
                    break
            except Exception as e:
                print(f"⚠️ Could not load tokenizer from {tokenizer_path}: {e}")

        if not tokenizer_saved:
            print("⚠️ No tokenizer found - you'll need to add one manually")

        print("✅ Model merging complete!")
        print(f"📄 Merged model saved to {args.output}")

        # Calculate model size
        model_size = sum(p.numel() for p in merged_model.parameters()) * 2 / (1024**3)  # GB in BF16
        print(".2f"
        return 0

    except Exception as e:
        print(f"❌ Merging failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())