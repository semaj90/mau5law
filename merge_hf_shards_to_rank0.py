#!/usr/bin/env python3
"""
Merge HuggingFace Gemma3 shards into a single TensorRT-LLM rank file.
"""

import argparse
import json
import os
import shutil
from typing import Dict

from safetensors import safe_open
from safetensors.torch import save_file


def sizeof_tensor(tensor) -> int:
    """Return tensor size in bytes."""
    return tensor.numel() * tensor.element_size()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Merge HF Gemma3 shards into a single TensorRT-LLM-style rankX.safetensors"
        )
    )
    parser.add_argument(
        "--src",
        required=True,
        help="Source HF checkpoint directory (contains model-00001-of-00005.safetensors, etc.)",
    )
    parser.add_argument(
        "--dst",
        required=True,
        help="Destination directory for merged checkpoint + config/tokenizer files",
    )
    parser.add_argument(
        "--rank_name",
        default="rank0.safetensors",
        help="Output safetensors filename (default: rank0.safetensors)",
    )
    return parser.parse_args()


def discover_shards(src: str):
    shards = sorted(
        f for f in os.listdir(src) if f.endswith(".safetensors") and "model-" in f
    )
    if not shards:
        raise SystemExit(f"[FATAL] No HF shards found in {src}")
    return shards


def merge_shards(src: str, shards) -> Dict[str, "torch.Tensor"]:
    merged = {}
    total_bytes = 0
    total_tensors = 0

    for idx, shard in enumerate(shards, start=1):
        path = os.path.join(src, shard)
        print(f"\nLoading shard {idx}/{len(shards)}: {path}")
        with safe_open(path, framework="pt", device="cpu") as sf:
            keys = list(sf.keys())
            print(f"  tensors in this shard: {len(keys)}")
            for key in keys:
                if key in merged:
                    raise RuntimeError(f"Duplicate tensor key detected: {key}")
                tensor = sf.get_tensor(key)
                merged[key] = tensor
                total_tensors += 1
                total_bytes += sizeof_tensor(tensor)
        approx_gib = total_bytes / (1024 ** 3)
        print(
            f"  cumulative tensors: {total_tensors}, approx size: {approx_gib:0.2f} GiB"
        )

    print("\n=== Merge complete ===")
    print(f"Total tensors: {total_tensors}")
    print(f"Approx total size: {total_bytes / (1024 ** 3):0.2f} GiB")
    return merged


def copy_metadata(src: str, dst: str):
    for name in ["config.json", "tokenizer.json", "tokenizer.model", "tokenizer_config.json"]:
        src_path = os.path.join(src, name)
        dst_path = os.path.join(dst, name)
        if os.path.exists(src_path):
            shutil.copy(src_path, dst_path)
            print(f"Copied {name} -> {dst_path}")
        else:
            print(f"[WARN] {name} not found in {src}")


def validate_rank_file(rank_path: str):
    print("\n=== Validating merged rank file ===")
    with safe_open(rank_path, framework="pt", device="cpu") as sf:
        keys = list(sf.keys())
        print(f"✅ rank file opened successfully, tensors: {len(keys)}")
        if keys:
            print("   First 5 keys:", keys[:5])
            print("   Last 5 keys:", keys[-5:])


def main():
    args = parse_args()

    src = args.src
    dst = args.dst
    rank_path = os.path.join(dst, args.rank_name)

    print("=== Gemma3 HF → TensorRT-LLM rank merger ===")
    print(f"Source dir:      {src}")
    print(f"Destination dir: {dst}")
    print(f"Output file:     {rank_path}")

    if not os.path.isdir(src):
        raise SystemExit(f"[FATAL] Source directory does not exist: {src}")

    os.makedirs(dst, exist_ok=True)

    shards = discover_shards(src)
    merged = merge_shards(src, shards)

    if os.path.exists(rank_path):
        print(f"[WARN] Existing {rank_path} found — overwriting.")
    print(f"Writing merged checkpoint to {rank_path} ...")
    save_file(merged, rank_path)
    print("✅ Wrote:", rank_path)

    copy_metadata(src, dst)
    validate_rank_file(rank_path)

    print("\n🎉 Done. TensorRT-LLM checkpoint is ready at:")
    print(f"   {rank_path}")


if __name__ == "__main__":
    main()
