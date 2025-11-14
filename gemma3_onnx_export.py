#!/usr/bin/env python3
"""
Direct Gemma3 → ONNX export (no Optimum)
Works with all Gemma3 models (270M, 1B, 2B, Legal)
"""

import argparse
import os
import torch
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer

def export_gemma3(model_id, output_dir):
    print(f"📦 Loading model: {model_id}")
    model = AutoModelForCausalLM.from_pretrained(model_id, torchscript=True)
    tokenizer = AutoTokenizer.from_pretrained(model_id)

    model.eval()

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    print("🔧 Building dummy inputs")
    dummy = tokenizer("Hello world", return_tensors="pt")

    # Disable caching (HybridCache breaks export)
    torch_model = model
    torch_model.config.use_cache = False

    print("📝 Tracing TorchScript")
    traced = torch.jit.trace(torch_model, (dummy["input_ids"], dummy["attention_mask"]))

    onnx_path = output / "gemma3.onnx"

    print(f"📤 Exporting ONNX → {onnx_path}")

    torch.onnx.export(
        traced,
        (dummy["input_ids"], dummy["attention_mask"]),
        f=onnx_path.as_posix(),
        opset_version=17,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq"},
            "attention_mask": {0: "batch", 1: "seq"},
            "logits": {0: "batch", 1: "seq"},
        }
    )

    tokenizer.save_pretrained(output_dir)
    print("✅ Export finished successfully!")
    print(f"📁 Saved to: {output_dir}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()

    export_gemma3(args.model, args.output)


if __name__ == "__main__":
    main()