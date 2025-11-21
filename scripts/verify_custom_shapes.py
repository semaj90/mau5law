#!/usr/bin/env python3
"""
Verify Custom Model Shapes for Non-Canonical Gemma3 Architecture
Checks that the model has the expected 3840 hidden size and 30/17 head configuration
"""

import os
import sys
import json
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Verify custom model shapes")
    parser.add_argument("--model_dir", required=True, help="Model directory")
    parser.add_argument("--expected_hidden", type=int, default=3840, help="Expected hidden size")
    parser.add_argument("--expected_q_heads", type=int, default=30, help="Expected Q heads")
    parser.add_argument("--expected_kv_heads", type=int, default=17, help="Expected KV heads")

    args = parser.parse_args()

    print("🔍 Verifying Custom Model Shapes")
    print(f"Model Directory: {args.model_dir}")
    print(f"Expected: Hidden={args.expected_hidden}, Q Heads={args.expected_q_heads}, KV Heads={args.expected_kv_heads}")

    # Check config.json
    config_path = Path(args.model_dir) / "config.json"
    if not config_path.exists():
        print("❌ config.json not found")
        sys.exit(1)

    with open(config_path, 'r') as f:
        config = json.load(f)

    actual_hidden = config.get("hidden_size", 0)
    actual_q_heads = config.get("num_attention_heads", 0)
    actual_kv_heads = config.get("num_key_value_heads", 0)

    print(f"Actual: Hidden={actual_hidden}, Q Heads={actual_q_heads}, KV Heads={actual_kv_heads}")

    if (actual_hidden == args.expected_hidden and
        actual_q_heads == args.expected_q_heads and
        actual_kv_heads == args.expected_kv_heads):
        print("✅ Custom shapes verified successfully")
        sys.exit(0)
    else:
        print("❌ Shape mismatch detected")
        sys.exit(1)

if __name__ == "__main__":
    main()