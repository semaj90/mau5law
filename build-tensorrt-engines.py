#!/usr/bin/env python3
"""
Simple TensorRT-LLM Engine Builder for Gemma3-Legal
Windows-compatible version without fancy Unicode characters
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path

def main():
    print("TensorRT-LLM Gemma3-Legal Engine Builder")
    print("=" * 50)

    # Check prerequisites
    print("Checking prerequisites...")

    # Check CUDA
    try:
        result = subprocess.run(["nvcc", "--version"],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("CUDA toolkit: Available")
        else:
            print("CUDA toolkit: Not found")
    except FileNotFoundError:
        print("CUDA toolkit: Not found")

    # Check TensorRT-LLM
    try:
        import tensorrt_llm
        print(f"TensorRT-LLM: {tensorrt_llm.__version__}")
    except ImportError:
        print("TensorRT-LLM: Not installed")
        print("Installing TensorRT-LLM...")

        install_cmd = [
            sys.executable, "-m", "pip", "install",
            "--extra-index-url", "https://pypi.nvidia.com",
            "tensorrt-llm[torch]",
            "transformers>=4.40.0",
            "accelerate",
            "huggingface-hub"
        ]

        try:
            subprocess.run(install_cmd, check=True)
            print("TensorRT-LLM: Installed successfully")
        except subprocess.CalledProcessError:
            print("TensorRT-LLM: Installation failed")
            return False

    # Create directories
    output_dir = Path("./tensorrt_engines")
    hf_dir = output_dir / "gemma3_hf"
    trt_dir = output_dir / "gemma3_trt"
    engine_dir = output_dir / "gemma3_engine"

    for dir_path in [output_dir, hf_dir, trt_dir, engine_dir]:
        dir_path.mkdir(exist_ok=True)

    print(f"Output directory: {output_dir}")

    # Step 1: Download base Gemma model
    print("\nStep 1: Downloading base Gemma model...")

    try:
        from huggingface_hub import snapshot_download

        model_id = "google/gemma-2-2b"  # Use 2B model for speed

        model_path = snapshot_download(
            repo_id=model_id,
            local_dir=str(hf_dir),
            local_dir_use_symlinks=False,
            ignore_patterns=["*.safetensors.index.json"]
        )

        print(f"Model downloaded to: {hf_dir}")

    except Exception as e:
        print(f"Model download failed: {e}")
        return False

    # Step 2: Convert to TensorRT-LLM checkpoint
    print("\nStep 2: Converting to TensorRT-LLM checkpoint...")

    convert_cmd = [
        sys.executable, "-c", f"""
import sys
sys.path.append('.')
from tensorrt_llm.models.gemma.convert import convert_hf_gemma

convert_hf_gemma(
    model_dir='{hf_dir}',
    output_dir='{trt_dir}',
    tp_size=1,
    pp_size=1,
    dtype='float16'
)
print('Conversion completed')
"""
    ]

    try:
        result = subprocess.run(convert_cmd,
                              capture_output=True,
                              text=True,
                              check=True)
        print("Checkpoint conversion: Success")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Checkpoint conversion failed: {e}")
        print(f"STDERR: {e.stderr}")

        # Try alternative approach
        print("Trying alternative conversion method...")

        alt_cmd = [
            "python", "-m", "tensorrt_llm.commands.build",
            "--checkpoint_dir", str(hf_dir),
            "--output_dir", str(engine_dir),
            "--gemma_version", "2",
            "--max_batch_size", "4",
            "--max_input_len", "2048",
            "--max_output_len", "1024",
            "--dtype", "float16"
        ]

        try:
            result = subprocess.run(alt_cmd, check=True, timeout=1800)
            print("Alternative build: Success")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print("Alternative build: Failed")
            return False

    # Step 3: Build TensorRT engine
    print("\nStep 3: Building TensorRT engine...")

    build_cmd = [
        "trtllm-build",
        "--checkpoint_dir", str(trt_dir),
        "--output_dir", str(engine_dir),
        "--gemma_version", "2",
        "--max_batch_size", "4",
        "--max_input_len", "2048",
        "--max_output_len", "1024",
        "--max_beam_width", "1",
        "--dtype", "float16",
        "--enable_xqa",
        "--use_fused_mlp",
        "--use_paged_kv_cache",
        "--gpt_attention_plugin", "float16",
        "--gemm_plugin", "float16",
        "--strongly_typed"
    ]

    try:
        print(f"Running: {' '.join(build_cmd)}")
        result = subprocess.run(build_cmd,
                              check=True,
                              timeout=1800,
                              capture_output=True,
                              text=True)

        print("Engine build: Success")
        print(result.stdout)

        # Check engine size
        engine_files = list(engine_dir.glob("*.engine"))
        if engine_files:
            total_size = sum(f.stat().st_size for f in engine_files) / (1024*1024)
            print(f"Engine size: {total_size:.1f} MB")

    except subprocess.CalledProcessError as e:
        print(f"Engine build failed: {e}")
        print(f"STDERR: {e.stderr}")
        return False
    except subprocess.TimeoutExpired:
        print("Engine build timed out (30 minutes)")
        return False

    # Step 4: Create serving script
    print("\nStep 4: Creating serving script...")

    serving_script = output_dir / "start_gemma3_server.py"

    script_content = f'''#!/usr/bin/env python3
"""
TensorRT-LLM Gemma3-Legal Server
"""

import subprocess
import sys
from pathlib import Path

def start_server():
    engine_dir = Path("{engine_dir}")
    tokenizer_dir = Path("{hf_dir}")

    if not engine_dir.exists():
        print("Engine directory not found:", engine_dir)
        return False

    cmd = [
        sys.executable, "-m", "tensorrt_llm.hlapi.llm_api",
        "--model_dir", str(engine_dir),
        "--tokenizer_dir", str(tokenizer_dir),
        "--host", "127.0.0.1",
        "--port", "8100"
    ]

    print("Starting TensorRT-LLM server...")
    print(f"Engine: {{engine_dir}}")
    print(f"URL: http://127.0.0.1:8100")
    print("Press Ctrl+C to stop")

    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\\nServer stopped")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Server failed: {{e}}")
        return False

if __name__ == "__main__":
    success = start_server()
    sys.exit(0 if success else 1)
'''

    with open(serving_script, 'w') as f:
        f.write(script_content)

    print(f"Serving script: {serving_script}")

    # Step 5: Create test script
    test_script = output_dir / "test_gemma3_server.py"

    test_content = '''#!/usr/bin/env python3
"""
Test TensorRT-LLM Gemma3-Legal Server
"""

import requests
import json
import time

def test_server():
    url = "http://127.0.0.1:8100/v1/completions"

    # Test legal prompts
    prompts = [
        "Analyze this contract clause for potential risks:",
        "What are the key legal considerations for:",
        "Review this legal document and identify:"
    ]

    print("Testing TensorRT-LLM Gemma3-Legal Server")
    print("=" * 40)

    for i, prompt in enumerate(prompts, 1):
        print(f"\\nTest {i}: {prompt}")

        payload = {
            "model": "gemma3-legal",
            "prompt": prompt,
            "max_tokens": 256,
            "temperature": 0.1,
            "top_k": 40,
            "top_p": 0.9,
            "stream": False
        }

        start_time = time.perf_counter()

        try:
            response = requests.post(url, json=payload, timeout=30)
            end_time = time.perf_counter()

            if response.status_code == 200:
                result = response.json()
                latency = (end_time - start_time) * 1000

                text = result.get("choices", [{}])[0].get("text", "")
                tokens = len(text.split())
                throughput = tokens / (latency / 1000) if latency > 0 else 0

                print(f"Status: Success")
                print(f"Latency: {latency:.2f}ms")
                print(f"Tokens: {tokens}")
                print(f"Throughput: {throughput:.1f} tokens/s")
                print(f"Response: {text[:100]}...")

            else:
                print(f"Status: Failed ({response.status_code})")
                print(f"Error: {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"Status: Connection failed")
            print(f"Error: {e}")

    print("\\nTesting complete!")

if __name__ == "__main__":
    test_server()
'''

    with open(test_script, 'w') as f:
        f.write(test_content)

    print(f"Test script: {test_script}")

    # Summary
    print("\n" + "=" * 50)
    print("TensorRT-LLM Engine Build Complete!")
    print("=" * 50)
    print(f"Engine directory: {engine_dir}")
    print(f"Start server: python {serving_script}")
    print(f"Test server: python {test_script}")
    print()
    print("Next steps:")
    print("1. Start server: python start_gemma3_server.py")
    print("2. Test in another terminal: python test_gemma3_server.py")
    print("3. Use HTTP API at http://127.0.0.1:8100")

    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)