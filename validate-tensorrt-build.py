#!/usr/bin/env python3
"""
TensorRT-LLM Build Validation & Status Check
Verifies TensorRT engine build and environment setup
Date: September 16, 2025
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Optional

def check_tensorrt_environment() -> Dict[str, any]:
    """Validate TensorRT-LLM environment setup"""
    status = {
        "python_version": sys.version,
        "python_executable": sys.executable,
        "tensorrt_llm_available": False,
        "tensorrt_available": False,
        "cuda_available": False,
        "gpu_info": None,
        "errors": []
    }

    # Check TensorRT-LLM
    try:
        import tensorrt_llm
        status["tensorrt_llm_available"] = True
        status["tensorrt_llm_version"] = tensorrt_llm.__version__
        print("✅ TensorRT-LLM:", tensorrt_llm.__version__)
    except ImportError as e:
        status["errors"].append(f"TensorRT-LLM: {e}")
        print("❌ TensorRT-LLM not available:", e)

    # Check TensorRT
    try:
        import tensorrt as trt
        status["tensorrt_available"] = True
        status["tensorrt_version"] = trt.__version__
        print("✅ TensorRT:", trt.__version__)
    except ImportError as e:
        status["errors"].append(f"TensorRT: {e}")
        print("❌ TensorRT not available:", e)

    # Check CUDA
    try:
        import torch
        status["cuda_available"] = torch.cuda.is_available()
        status["pytorch_version"] = torch.__version__
        if torch.cuda.is_available():
            status["gpu_info"] = {
                "count": torch.cuda.device_count(),
                "name": torch.cuda.get_device_name(0),
                "memory_gb": torch.cuda.get_device_properties(0).total_memory / 1e9
            }
            print("✅ PyTorch:", torch.__version__)
            print("✅ CUDA Available:", torch.cuda.is_available())
            print("✅ GPU:", torch.cuda.get_device_name(0))
            print("✅ GPU Memory:", f"{status['gpu_info']['memory_gb']:.1f}GB")
        else:
            print("❌ CUDA not available")
    except ImportError as e:
        status["errors"].append(f"PyTorch: {e}")
        print("❌ PyTorch not available:", e)

    return status

def check_engine_build_status() -> Dict[str, any]:
    """Check if TensorRT engines have been built"""
    engine_status = {
        "engines_found": [],
        "build_logs": [],
        "total_engines": 0,
        "ready_for_inference": False
    }

    # Check common engine directories
    engine_paths = [
        Path("./engines"),
        Path("./tensorrt_engines"),
        Path("./models/engines"),
        Path("/engines"),  # Docker path
        Path("C:/engines")  # Windows absolute path
    ]

    print("\n🔍 Checking for TensorRT engines...")

    for engine_dir in engine_paths:
        if engine_dir.exists():
            print(f"✅ Found engine directory: {engine_dir}")

            # Look for .engine files
            engine_files = list(engine_dir.glob("**/*.engine"))
            plan_files = list(engine_dir.glob("**/*.plan"))

            for engine_file in engine_files + plan_files:
                engine_info = {
                    "path": str(engine_file),
                    "size_mb": engine_file.stat().st_size / 1e6,
                    "modified": time.ctime(engine_file.stat().st_mtime)
                }
                engine_status["engines_found"].append(engine_info)
                print(f"  📦 Engine: {engine_file.name} ({engine_info['size_mb']:.1f}MB)")
        else:
            print(f"❌ Engine directory not found: {engine_dir}")

    engine_status["total_engines"] = len(engine_status["engines_found"])
    engine_status["ready_for_inference"] = engine_status["total_engines"] > 0

    return engine_status

def check_model_files() -> Dict[str, any]:
    """Check for model files and configurations"""
    model_status = {
        "model_dirs": [],
        "config_files": [],
        "weights_found": False
    }

    print("\n📁 Checking for model files...")

    model_paths = [
        Path("./models"),
        Path("./gemma3-legal-q4km"),
        Path("/models"),  # Docker path
        Path("C:/models")  # Windows absolute path
    ]

    for model_dir in model_paths:
        if model_dir.exists():
            print(f"✅ Found model directory: {model_dir}")

            # Look for configuration files
            config_files = (
                list(model_dir.glob("**/config.json")) +
                list(model_dir.glob("**/config.yaml")) +
                list(model_dir.glob("**/model.json"))
            )

            # Look for weight files
            weight_files = (
                list(model_dir.glob("**/*.safetensors")) +
                list(model_dir.glob("**/*.bin")) +
                list(model_dir.glob("**/*.gguf")) +
                list(model_dir.glob("**/*.pth"))
            )

            if config_files:
                model_status["config_files"].extend([str(f) for f in config_files])
                print(f"  📄 Config files: {len(config_files)}")

            if weight_files:
                model_status["weights_found"] = True
                total_size = sum(f.stat().st_size for f in weight_files) / 1e9
                print(f"  ⚖️  Weight files: {len(weight_files)} ({total_size:.1f}GB)")

    return model_status

def generate_next_steps(env_status: Dict, engine_status: Dict, model_status: Dict) -> List[str]:
    """Generate recommended next steps based on current status"""
    steps = []

    if not env_status["tensorrt_llm_available"]:
        steps.append("❗ Install TensorRT-LLM: pip install tensorrt_llm")

    if not env_status["cuda_available"]:
        steps.append("❗ Install PyTorch with CUDA: pip install torch --index-url https://download.pytorch.org/whl/cu118")

    if not model_status["weights_found"]:
        steps.append("❗ Download Gemma3 model weights")
        steps.append("❗ Convert to Q4_K_M format if needed")

    if not engine_status["ready_for_inference"]:
        steps.append("🔧 Build TensorRT engines: python build-production-tensorrt-llm.py")
        steps.append("🔧 Use build flags: --quantization q4_k_m --dtype float16 --use_cuda_graph")

    if engine_status["ready_for_inference"] and env_status["tensorrt_llm_available"]:
        steps.append("🚀 Ready to launch production server!")
        steps.append("🚀 Run: python tensorrt-llm-legal-production.py")

    return steps

def main():
    """Main validation routine"""
    print("="*60)
    print("TensorRT-LLM Legal AI Production Validation")
    print("="*60)
    print(f"📅 Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print(f"📂 Working Directory: {os.getcwd()}")
    print()

    # Check environment
    print("🔧 Environment Check:")
    env_status = check_tensorrt_environment()

    # Check engines
    engine_status = check_engine_build_status()

    # Check models
    model_status = check_model_files()

    # Generate recommendations
    print("\n🎯 Next Steps:")
    steps = generate_next_steps(env_status, engine_status, model_status)
    for i, step in enumerate(steps, 1):
        print(f"{i}. {step}")

    # Save status report
    report = {
        "timestamp": time.time(),
        "environment": env_status,
        "engines": engine_status,
        "models": model_status,
        "next_steps": steps
    }

    with open("tensorrt-llm-status-report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n📊 Status report saved to: tensorrt-llm-status-report.json")

    # Overall status
    if engine_status["ready_for_inference"] and env_status["tensorrt_llm_available"]:
        print("\n🎉 STATUS: READY FOR PRODUCTION!")
        return 0
    else:
        print("\n⚠️  STATUS: SETUP REQUIRED")
        return 1

if __name__ == "__main__":
    exit(main())