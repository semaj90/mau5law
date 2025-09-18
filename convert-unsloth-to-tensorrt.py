#!/usr/bin/env python3
"""
Convert Unsloth fine-tuned model to TensorRT-LLM engine format
Optimized for legal AI inference with RTX 3060 Ti
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
import torch
from transformers import AutoConfig, AutoTokenizer

# Configuration
UNSLOTH_MODEL_DIR = "model_unsloth_hf_f16"
OUTPUT_DIR = "tensorrt_models/legal_unsloth_engine"
TRT_LLM_ENV = "tensorrt_llm_ubuntu_env"
WORKSPACE_DIR = "tensorrt_workspace"

# TensorRT-LLM optimizations for RTX 3060 Ti
RTX_3060_CONFIG = {
    "max_batch_size": 2,
    "max_input_len": 2048,
    "max_output_len": 1024,
    "max_beam_width": 1,
    "dtype": "float16",
    "use_gpt_attention_plugin": True,
    "use_gemm_plugin": True,
    "use_layernorm_plugin": True,
    "enable_context_fmha": True,
    "enable_context_fmha_fp32_acc": False,
    "multi_block_mode": True,
    "use_custom_all_reduce": True,
}

def setup_directories():
    """Create necessary directories"""
    print("🏗️  Setting up directories...")

    dirs = [OUTPUT_DIR, WORKSPACE_DIR, f"{WORKSPACE_DIR}/hf_checkpoint", f"{WORKSPACE_DIR}/trt_checkpoint"]
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)

    print(f"✅ Created directories: {', '.join(dirs)}")

def validate_unsloth_model():
    """Validate the Unsloth model structure"""
    print("🔍 Validating Unsloth model...")

    model_path = Path(UNSLOTH_MODEL_DIR)
    if not model_path.exists():
        raise FileNotFoundError(f"Unsloth model directory not found: {UNSLOTH_MODEL_DIR}")

    required_files = [
        "config.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "model.safetensors.index.json"
    ]

    missing_files = [f for f in required_files if not (model_path / f).exists()]
    if missing_files:
        raise FileNotFoundError(f"Missing required files: {missing_files}")

    # Check model shards
    shard_files = list(model_path.glob("model-*-of-*-*.safetensors"))
    print(f"✅ Found {len(shard_files)} model shards")

    # Load and inspect config
    with open(model_path / "config.json", "r") as f:
        config = json.load(f)

    print(f"✅ Model architecture: {config.get('architectures', ['Unknown'])[0]}")
    print(f"✅ Hidden size: {config.get('hidden_size', 'Unknown')}")
    print(f"✅ Num layers: {config.get('num_hidden_layers', 'Unknown')}")
    print(f"✅ Vocab size: {config.get('vocab_size', 'Unknown')}")

    return config

def check_tensorrt_environment():
    """Check TensorRT-LLM environment"""
    print("🔧 Checking TensorRT-LLM environment...")

    env_path = Path(TRT_LLM_ENV)
    if not env_path.exists():
        print(f"❌ TensorRT-LLM environment not found: {TRT_LLM_ENV}")
        print("Run setup-tensorrt-llm-complete.py first")
        return False

    python_path = env_path / "bin" / "python"
    if not python_path.exists():
        python_path = env_path / "Scripts" / "python.exe"  # Windows fallback

    if not python_path.exists():
        print(f"❌ Python not found in environment")
        return False

    # Test TensorRT-LLM import
    try:
        result = subprocess.run([
            str(python_path), "-c",
            "import tensorrt_llm; print('TensorRT-LLM version:', tensorrt_llm.__version__)"
        ], capture_output=True, text=True, check=True)
        print(f"✅ {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ TensorRT-LLM import failed: {e.stderr}")
        return False

def convert_to_tensorrt_checkpoint():
    """Convert Unsloth model to TensorRT-LLM checkpoint format"""
    print("🔄 Converting to TensorRT-LLM checkpoint...")

    python_path = Path(TRT_LLM_ENV) / "bin" / "python"
    if not python_path.exists():
        python_path = Path(TRT_LLM_ENV) / "Scripts" / "python.exe"

    # TensorRT-LLM conversion command
    convert_cmd = [
        str(python_path), "-m", "tensorrt_llm.commands.convert_checkpoint",
        "--model_dir", UNSLOTH_MODEL_DIR,
        "--output_dir", f"{WORKSPACE_DIR}/trt_checkpoint",
        "--dtype", RTX_3060_CONFIG["dtype"],
        "--tp_size", "1",  # Single GPU
        "--pp_size", "1",  # Single GPU
    ]

    print(f"Running: {' '.join(convert_cmd)}")

    try:
        result = subprocess.run(convert_cmd, capture_output=True, text=True, check=True)
        print(f"✅ Checkpoint conversion completed")
        print(f"Output: {result.stdout[-500:]}")  # Last 500 chars
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Checkpoint conversion failed: {e.stderr}")
        return False

def build_tensorrt_engine():
    """Build TensorRT engine from checkpoint"""
    print("🏗️  Building TensorRT engine...")

    python_path = Path(TRT_LLM_ENV) / "bin" / "python"
    if not python_path.exists():
        python_path = Path(TRT_LLM_ENV) / "Scripts" / "python.exe"

    # Engine build command with RTX 3060 Ti optimizations
    build_cmd = [
        str(python_path), "-m", "tensorrt_llm.commands.build",
        "--checkpoint_dir", f"{WORKSPACE_DIR}/trt_checkpoint",
        "--output_dir", OUTPUT_DIR,
        "--gemm_plugin", RTX_3060_CONFIG["dtype"],
        "--gpt_attention_plugin", RTX_3060_CONFIG["dtype"],
        "--layernorm_plugin", RTX_3060_CONFIG["dtype"],
        "--max_batch_size", str(RTX_3060_CONFIG["max_batch_size"]),
        "--max_input_len", str(RTX_3060_CONFIG["max_input_len"]),
        "--max_output_len", str(RTX_3060_CONFIG["max_output_len"]),
        "--max_beam_width", str(RTX_3060_CONFIG["max_beam_width"]),
        "--use_custom_all_reduce", "enable",
        "--multi_block_mode", "enable",
        "--enable_context_fmha",
        "--strongly_typed",
    ]

    print(f"Running: {' '.join(build_cmd)}")

    try:
        result = subprocess.run(build_cmd, capture_output=True, text=True, check=True)
        print(f"✅ TensorRT engine build completed")
        print(f"Output: {result.stdout[-500:]}")  # Last 500 chars
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Engine build failed: {e.stderr}")
        return False

def create_engine_config():
    """Create configuration file for the engine"""
    print("📝 Creating engine configuration...")

    config = {
        "engine_dir": OUTPUT_DIR,
        "model_name": "legal-unsloth-gemma",
        "source_model": UNSLOTH_MODEL_DIR,
        "optimization": "RTX_3060_Ti",
        "created_date": str(Path().resolve()),
        "tensorrt_config": RTX_3060_CONFIG,
        "inference_config": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repetition_penalty": 1.1,
            "max_tokens": 1024,
        }
    }

    config_path = Path(OUTPUT_DIR) / "engine_config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"✅ Engine config saved to: {config_path}")

def copy_tokenizer():
    """Copy tokenizer files to engine directory"""
    print("📄 Copying tokenizer files...")

    tokenizer_files = [
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "tokenizer.model",
        "chat_template.json",
        "added_tokens.json"
    ]

    source_dir = Path(UNSLOTH_MODEL_DIR)
    target_dir = Path(OUTPUT_DIR)

    copied_files = []
    for file_name in tokenizer_files:
        source_file = source_dir / file_name
        if source_file.exists():
            target_file = target_dir / file_name
            shutil.copy2(source_file, target_file)
            copied_files.append(file_name)

    print(f"✅ Copied tokenizer files: {', '.join(copied_files)}")

def validate_engine():
    """Validate the generated TensorRT engine"""
    print("🔍 Validating TensorRT engine...")

    engine_dir = Path(OUTPUT_DIR)
    engine_files = list(engine_dir.glob("*.plan"))

    if not engine_files:
        print("❌ No .plan engine files found")
        return False

    for engine_file in engine_files:
        size_mb = engine_file.stat().st_size / (1024 * 1024)
        print(f"✅ Engine file: {engine_file.name} ({size_mb:.1f} MB)")

    # Check for required files
    required_files = ["config.json", "generation_config.json"]
    for req_file in required_files:
        if (engine_dir / req_file).exists():
            print(f"✅ Found: {req_file}")
        else:
            print(f"⚠️  Missing: {req_file}")

    return True

def main():
    """Main conversion process"""
    print("🚀 Converting Unsloth model to TensorRT-LLM engine")
    print("=" * 60)

    try:
        # Step 1: Setup
        setup_directories()

        # Step 2: Validate source model
        config = validate_unsloth_model()

        # Step 3: Check TensorRT environment
        if not check_tensorrt_environment():
            print("❌ TensorRT-LLM environment check failed")
            sys.exit(1)

        # Step 4: Convert to checkpoint
        if not convert_to_tensorrt_checkpoint():
            print("❌ Checkpoint conversion failed")
            sys.exit(1)

        # Step 5: Build engine
        if not build_tensorrt_engine():
            print("❌ Engine build failed")
            sys.exit(1)

        # Step 6: Copy tokenizer and create config
        copy_tokenizer()
        create_engine_config()

        # Step 7: Validate
        if validate_engine():
            print("\n🎉 TensorRT-LLM engine conversion completed successfully!")
            print(f"📂 Engine location: {OUTPUT_DIR}")
            print(f"🚀 Ready for legal AI inference with RTX 3060 Ti optimization")
        else:
            print("❌ Engine validation failed")
            sys.exit(1)

    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()