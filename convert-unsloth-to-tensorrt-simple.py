#!/usr/bin/env python3
"""
Simple Unsloth to TensorRT Engine Converter
Converts model_unsloth_hf_f16 to optimized .plan engine for legal AI inference
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path

# Configuration
SOURCE_MODEL = "model_unsloth_hf_f16"
TARGET_ENGINE_DIR = "tensorrt_models/unsloth_legal_engine"
WORKSPACE = "tensorrt_workspace/unsloth_conversion"

def setup_conversion():
    """Setup directories and validate model"""
    print("Setting up Unsloth -> TensorRT conversion")
    print("=" * 50)

    # Create directories
    Path(TARGET_ENGINE_DIR).mkdir(parents=True, exist_ok=True)
    Path(WORKSPACE).mkdir(parents=True, exist_ok=True)

    # Validate source model
    source_path = Path(SOURCE_MODEL)
    if not source_path.exists():
        print(f"❌ Source model not found: {SOURCE_MODEL}")
        return False

    required_files = ["config.json", "tokenizer.json", "model.safetensors.index.json"]
    missing_files = [f for f in required_files if not (source_path / f).exists()]

    if missing_files:
        print(f"❌ Missing required files: {missing_files}")
        return False

    print(f"✅ Source model validated: {SOURCE_MODEL}")
    print(f"✅ Target directory: {TARGET_ENGINE_DIR}")

    return True

def check_model_architecture():
    """Check and report model architecture"""
    config_path = Path(SOURCE_MODEL) / "config.json"

    with open(config_path, 'r') as f:
        config = json.load(f)

    print(f"\n📋 Model Information:")
    print(f"   Architecture: {config.get('architectures', ['Unknown'])[0]}")
    print(f"   Model Type: {config.get('model_type', 'Unknown')}")
    print(f"   Hidden Size: {config.get('hidden_size', 'Unknown')}")
    print(f"   Layers: {config.get('num_hidden_layers', 'Unknown')}")
    print(f"   Heads: {config.get('num_attention_heads', 'Unknown')}")
    print(f"   Vocab Size: {config.get('vocab_size', 'Unknown')}")

    return config

def run_docker_conversion():
    """Run TensorRT conversion using Docker"""
    print("\n🐳 Running TensorRT conversion with Docker...")

    # Use NGC TensorRT-LLM container
    docker_cmd = [
        "docker", "run", "--rm", "--gpus", "all",
        "-v", f"{os.getcwd()}:/workspace",
        "-w", "/workspace",
        "nvcr.io/nvidia/tensorrt:24.02-py3",
        "bash", "-c", f"""
        # Install TensorRT-LLM dependencies
        pip install tensorrt-llm --extra-index-url https://pypi.nvidia.com

        # Convert checkpoint
        python -m tensorrt_llm.commands.convert_checkpoint \\
            --model_dir {SOURCE_MODEL} \\
            --output_dir {WORKSPACE}/checkpoint \\
            --dtype float16 \\
            --tp_size 1 \\
            --pp_size 1

        # Build engine
        python -m tensorrt_llm.commands.build \\
            --checkpoint_dir {WORKSPACE}/checkpoint \\
            --output_dir {TARGET_ENGINE_DIR} \\
            --gemm_plugin float16 \\
            --gpt_attention_plugin float16 \\
            --max_batch_size 2 \\
            --max_input_len 2048 \\
            --max_output_len 1024 \\
            --max_beam_width 1 \\
            --use_custom_all_reduce enable \\
            --strongly_typed
        """
    ]

    print("Docker command prepared...")
    return docker_cmd

def run_wsl_conversion():
    """Alternative: Run conversion in WSL2"""
    print("\n🐧 Attempting WSL2 conversion...")

    wsl_script = f"""
    cd /mnt/c/Users/james/Videos/deeds-web-app

    # Check if TensorRT-LLM is available
    if ! python3 -c "import tensorrt_llm" 2>/dev/null; then
        echo "Installing TensorRT-LLM in WSL2..."
        pip3 install tensorrt-llm --extra-index-url https://pypi.nvidia.com
    fi

    # Convert model
    python3 -m tensorrt_llm.commands.convert_checkpoint \\
        --model_dir {SOURCE_MODEL} \\
        --output_dir {WORKSPACE}/checkpoint \\
        --dtype float16 \\
        --tp_size 1

    python3 -m tensorrt_llm.commands.build \\
        --checkpoint_dir {WORKSPACE}/checkpoint \\
        --output_dir {TARGET_ENGINE_DIR} \\
        --gemm_plugin float16 \\
        --gpt_attention_plugin float16 \\
        --max_batch_size 2 \\
        --max_input_len 2048 \\
        --max_output_len 1024
    """

    try:
        result = subprocess.run(["wsl", "bash", "-c", wsl_script],
                              capture_output=True, text=True, timeout=1800)  # 30 min timeout

        if result.returncode == 0:
            print("✅ WSL2 conversion completed")
            return True
        else:
            print(f"❌ WSL2 conversion failed: {result.stderr}")
            return False

    except subprocess.TimeoutExpired:
        print("⏰ WSL2 conversion timed out")
        return False
    except Exception as e:
        print(f"❌ WSL2 error: {e}")
        return False

def copy_tokenizer_files():
    """Copy tokenizer and config files to engine directory"""
    print("\n📄 Copying tokenizer files...")

    tokenizer_files = [
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "tokenizer.model",
        "chat_template.json",
        "added_tokens.json",
        "config.json",
        "generation_config.json"
    ]

    source_dir = Path(SOURCE_MODEL)
    target_dir = Path(TARGET_ENGINE_DIR)

    copied_files = []
    for file_name in tokenizer_files:
        source_file = source_dir / file_name
        if source_file.exists():
            target_file = target_dir / file_name
            shutil.copy2(source_file, target_file)
            copied_files.append(file_name)

    print(f"✅ Copied: {', '.join(copied_files)}")

def create_inference_script():
    """Create inference script for the converted engine"""
    inference_script = f'''#!/usr/bin/env python3
"""
TensorRT-LLM Inference Script for Unsloth Legal Model
"""

import os
from pathlib import Path
from tensorrt_llm.runtime import ModelRunner, GenerationSession

class UnslothLegalInference:
    def __init__(self, engine_dir="{TARGET_ENGINE_DIR}"):
        self.engine_dir = Path(engine_dir)
        self.model_runner = None
        self.session = None

    def load_model(self):
        """Load TensorRT engine"""
        engine_path = self.engine_dir / "rank0.engine"
        if not engine_path.exists():
            raise FileNotFoundError(f"Engine not found: {{engine_path}}")

        self.model_runner = ModelRunner.from_dir(
            engine_dir=str(self.engine_dir),
            rank=0,
            debug_mode=False
        )

        self.session = GenerationSession(
            self.model_runner,
            max_batch_size=2,
            max_input_len=2048,
            max_output_len=1024
        )

        print("✅ TensorRT engine loaded successfully")

    def generate(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7):
        """Generate response using TensorRT engine"""
        if not self.session:
            self.load_model()

        outputs = self.session.generate(
            inputs=[prompt],
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=0.9,
            do_sample=True
        )

        return outputs[0]

# Example usage
if __name__ == "__main__":
    inference = UnslothLegalInference()
    inference.load_model()

    # Legal AI test
    prompt = "Analyze the following contract clause for potential legal risks:"
    response = inference.generate(prompt)
    print(f"Response: {{response}}")
'''

    script_path = Path(TARGET_ENGINE_DIR) / "inference.py"
    with open(script_path, 'w') as f:
        f.write(inference_script)

    print(f"✅ Inference script created: {script_path}")

def validate_conversion():
    """Validate the converted engine"""
    print("\n🔍 Validating conversion...")

    engine_dir = Path(TARGET_ENGINE_DIR)

    # Check for engine files
    engine_files = list(engine_dir.glob("*.plan")) + list(engine_dir.glob("*.engine"))
    if not engine_files:
        print("❌ No engine files found")
        return False

    for engine_file in engine_files:
        size_mb = engine_file.stat().st_size / (1024 * 1024)
        print(f"✅ Engine: {engine_file.name} ({size_mb:.1f} MB)")

    # Check for config files
    config_files = ["config.json", "tokenizer.json"]
    for config_file in config_files:
        if (engine_dir / config_file).exists():
            print(f"✅ Found: {config_file}")
        else:
            print(f"⚠️  Missing: {config_file}")

    return True

def main():
    """Main conversion process"""
    print("Converting Unsloth Model to TensorRT Engine")

    try:
        # Step 1: Setup
        if not setup_conversion():
            return False

        # Step 2: Check model
        config = check_model_architecture()

        # Step 3: Try conversion methods in order of preference
        print("\n🔧 Starting conversion process...")

        # Method 1: Try WSL2 first (fastest if available)
        if run_wsl_conversion():
            print("✅ WSL2 conversion successful")
        else:
            print("⚠️  WSL2 conversion failed, try Docker method manually:")
            docker_cmd = run_docker_conversion()
            print(" ".join(docker_cmd))
            print("\nOr run: docker-compose -f docker-compose.tensorrt.yml up")

        # Step 4: Copy supporting files
        copy_tokenizer_files()
        create_inference_script()

        # Step 5: Validate
        if validate_conversion():
            print("\n🎉 Conversion completed!")
            print(f"📂 Engine location: {TARGET_ENGINE_DIR}")
            print(f"🚀 Ready for legal AI inference")
            print(f"📝 Test with: python {TARGET_ENGINE_DIR}/inference.py")
        else:
            print("❌ Validation failed")

    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return False

    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)