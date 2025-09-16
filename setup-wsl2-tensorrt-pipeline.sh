#!/bin/bash
# WSL2 TensorRT-LLM Setup for Gemma3-Legal Q4_K_M Pipeline
# Run this in WSL2 Ubuntu

set -e

echo "🚀 Setting up TensorRT-LLM Pipeline in WSL2"
echo "=" * 50

# Check if we're in WSL2
if ! grep -qi microsoft /proc/version; then
    echo "❌ This script must be run in WSL2"
    exit 1
fi

echo "✅ Running in WSL2"

# Check CUDA in WSL2
echo "🔍 Checking CUDA availability..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi
    echo "✅ CUDA available in WSL2"
else
    echo "❌ CUDA not available. Please install NVIDIA drivers for WSL2"
    echo "See: https://docs.nvidia.com/cuda/wsl-user-guide/index.html"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    unzip

# Create Python virtual environment
echo "🐍 Creating Python virtual environment..."
python3 -m venv venv_tensorrt
source venv_tensorrt/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install PyTorch with CUDA support
echo "🔥 Installing PyTorch with CUDA support..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install TensorRT-LLM
echo "🚀 Installing TensorRT-LLM..."
pip install --extra-index-url https://pypi.nvidia.com tensorrt-llm

# Install additional dependencies
echo "📦 Installing additional dependencies..."
pip install \
    transformers>=4.40.0 \
    accelerate \
    huggingface-hub \
    datasets \
    evaluate \
    rouge-score \
    nltk \
    sentencepiece \
    protobuf

# Verify installations
echo "✅ Verifying installations..."
python3 -c "import torch; print(f'PyTorch: {torch.__version__}')"
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
python3 -c "import tensorrt_llm; print(f'TensorRT-LLM: {tensorrt_llm.__version__}')"

# Create TensorRT-LLM workspace
echo "📁 Creating workspace..."
mkdir -p tensorrt_workspace
cd tensorrt_workspace

# Create the optimized pipeline script
cat > gemma3_tensorrt_pipeline.py << 'EOF'
#!/usr/bin/env python3
"""
WSL2 TensorRT-LLM Pipeline for Gemma3-Legal
Full Q4_K_M optimization with CUDA graphs, FlashAttention, and streaming
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig
from huggingface_hub import snapshot_download

# TensorRT-LLM imports
import tensorrt_llm
from tensorrt_llm.models.gemma.convert import convert_hf_gemma
from tensorrt_llm.hlapi import LLM, SamplingParams


class WSL2TensorRTPipeline:
    """WSL2-optimized TensorRT-LLM pipeline"""

    def __init__(self,
                 model_name: str = "google/gemma-2-2b",
                 workspace_dir: str = "./workspace",
                 max_batch_size: int = 8,
                 max_input_len: int = 2048,
                 max_output_len: int = 1024):

        self.model_name = model_name
        self.workspace = Path(workspace_dir)
        self.max_batch_size = max_batch_size
        self.max_input_len = max_input_len
        self.max_output_len = max_output_len

        # Create workspace
        self.workspace.mkdir(exist_ok=True)
        self.hf_model_dir = self.workspace / "hf_model"
        self.trt_checkpoint_dir = self.workspace / "trt_checkpoint"
        self.engine_dir = self.workspace / "engine"

        for dir_path in [self.hf_model_dir, self.trt_checkpoint_dir, self.engine_dir]:
            dir_path.mkdir(exist_ok=True)

    def download_model(self):
        """Download HuggingFace model"""
        print(f"📥 Downloading {self.model_name}...")

        snapshot_download(
            repo_id=self.model_name,
            local_dir=str(self.hf_model_dir),
            local_dir_use_symlinks=False,
            ignore_patterns=["*.bin"]  # Use safetensors
        )

        # Customize for legal AI
        config_path = self.hf_model_dir / "config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Add legal AI configuration
        config['legal_ai_config'] = {
            'system_prompt': """You are a specialized Legal AI Assistant powered by Gemma 3. You excel at contract analysis, legal research, and providing professional legal guidance.""",
            'temperature': 0.1,
            'max_tokens': 2048
        }

        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"✅ Model downloaded to {self.hf_model_dir}")

    def convert_to_tensorrt(self):
        """Convert HF model to TensorRT-LLM checkpoint"""
        print("🔄 Converting to TensorRT-LLM checkpoint...")

        convert_hf_gemma(
            model_dir=str(self.hf_model_dir),
            output_dir=str(self.trt_checkpoint_dir),
            tp_size=1,  # Single GPU
            pp_size=1,  # Single pipeline
            dtype="float16"
        )

        print(f"✅ Checkpoint created at {self.trt_checkpoint_dir}")

    def build_engine(self):
        """Build optimized TensorRT engine"""
        print("🏗️ Building TensorRT engine with optimizations...")

        build_cmd = [
            "trtllm-build",
            "--checkpoint_dir", str(self.trt_checkpoint_dir),
            "--output_dir", str(self.engine_dir),
            "--gemma_version", "2",
            "--max_batch_size", str(self.max_batch_size),
            "--max_input_len", str(self.max_input_len),
            "--max_output_len", str(self.max_output_len),
            "--max_beam_width", "4",
            "--dtype", "float16",

            # Optimizations
            "--enable_xqa",  # FlashAttention equivalent
            "--use_fused_mlp",
            "--use_paged_kv_cache",
            "--use_cuda_graph",
            "--multiple_profiles",

            # Plugins
            "--gpt_attention_plugin", "float16",
            "--gemm_plugin", "float16",
            "--lookup_plugin", "float16",
            "--strongly_typed",

            # Performance tuning
            "--builder_opt", "4",  # Higher optimization level
            "--max_num_tokens", str(self.max_input_len + self.max_output_len)
        ]

        print(f"Running: {' '.join(build_cmd)}")

        try:
            result = subprocess.run(
                build_cmd,
                check=True,
                capture_output=True,
                text=True,
                timeout=1800  # 30 minutes
            )

            print("✅ Engine built successfully!")
            print(result.stdout)

            # Check engine size
            engine_files = list(self.engine_dir.glob("*.engine"))
            if engine_files:
                total_size = sum(f.stat().st_size for f in engine_files) / (1024*1024)
                print(f"📊 Engine size: {total_size:.1f} MB")

        except subprocess.CalledProcessError as e:
            print(f"❌ Engine build failed: {e}")
            print(f"STDOUT: {e.stdout}")
            print(f"STDERR: {e.stderr}")
            raise
        except subprocess.TimeoutExpired:
            print("❌ Engine build timed out")
            raise

    def setup_serving(self):
        """Set up high-performance serving"""
        print("🌐 Setting up TensorRT-LLM serving...")

        # Create serving script
        serving_script = self.workspace / "start_server.py"

        script_content = f'''#!/usr/bin/env python3
"""
High-performance TensorRT-LLM server for Gemma3-Legal
Includes CUDA graphs and optimized attention
"""

import asyncio
import json
from pathlib import Path
from tensorrt_llm.hlapi import LLM, SamplingParams
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Initialize TensorRT-LLM model
engine_dir = Path("{self.engine_dir}")
tokenizer_dir = Path("{self.hf_model_dir}")

print(f"Loading TensorRT-LLM engine from {{engine_dir}}")

llm = LLM(
    model=str(engine_dir),
    tokenizer=str(tokenizer_dir),
    max_num_seqs={self.max_batch_size}
)

print("✅ TensorRT-LLM model loaded successfully")

# FastAPI app
app = FastAPI(title="Gemma3-Legal TensorRT-LLM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.1
    top_k: int = 40
    top_p: float = 0.9
    stream: bool = False

class CompletionResponse(BaseModel):
    text: str
    tokens: int
    latency_ms: float
    throughput_tps: float

@app.post("/v1/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    import time

    start_time = time.perf_counter()

    # Create sampling parameters
    sampling_params = SamplingParams(
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        top_k=request.top_k,
        top_p=request.top_p
    )

    # Add legal system prompt
    legal_prompt = """You are a specialized Legal AI Assistant powered by Gemma 3. You excel at contract analysis, legal research, and providing professional legal guidance.

User: """ + request.prompt + """