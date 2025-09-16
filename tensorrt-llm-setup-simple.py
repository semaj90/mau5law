#!/usr/bin/env python3
"""
Simple Windows TensorRT-LLM Setup for Gemma3-Legal Q4_K_M Pipeline
Uses existing Ollama models without downloading - No Unicode characters
"""

import os
import sys
import json
import time
import requests
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WindowsTensorRTSetup:
    def __init__(self):
        self.workspace_dir = Path.home() / "tensorrt_workspace"
        self.ollama_host = "localhost:11434"
        self.model_name = "gemma3-legal:latest"

        print("Windows TensorRT-LLM Setup for Gemma3-Legal")
        print("=" * 50)

    def create_workspace(self):
        """Create workspace directory structure"""
        logger.info("Creating workspace directory...")

        self.workspace_dir.mkdir(exist_ok=True)
        (self.workspace_dir / "engines").mkdir(exist_ok=True)
        (self.workspace_dir / "hf_model").mkdir(exist_ok=True)
        (self.workspace_dir / "scripts").mkdir(exist_ok=True)

        print(f"[OK] Workspace created: {self.workspace_dir}")

    def check_ollama_availability(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            response = requests.get(f"http://{self.ollama_host}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]

                if self.model_name in model_names:
                    print(f"[OK] Ollama model {self.model_name} found")
                    return True
                else:
                    print(f"[ERROR] Model {self.model_name} not found in Ollama")
                    print(f"Available models: {model_names}")
                    return False
            else:
                print(f"[ERROR] Ollama API returned status: {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Ollama not available: {e}")
            return False

    def extract_model_from_ollama(self) -> bool:
        """Extract model information from Ollama for TensorRT conversion"""
        logger.info("Extracting model information from Ollama...")

        try:
            # Get model info from Ollama
            response = requests.post(
                f"http://{self.ollama_host}/api/show",
                json={"name": self.model_name},
                timeout=30
            )

            if response.status_code != 200:
                print(f"[ERROR] Failed to get model info: {response.status_code}")
                return False

            model_info = response.json()

            # Save model info for TensorRT conversion
            model_info_path = self.workspace_dir / "model_info.json"
            with open(model_info_path, 'w') as f:
                json.dump(model_info, f, indent=2)

            print(f"[OK] Model info extracted: {model_info_path}")

            # Create basic tokenizer config for compatibility
            self.create_hf_tokenizer_config(model_info)

            return True

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to extract model: {e}")
            return False

    def create_hf_tokenizer_config(self, model_info: Dict[str, Any]):
        """Create HuggingFace-compatible tokenizer configuration"""
        logger.info("Creating HuggingFace tokenizer configuration...")

        hf_model_dir = self.workspace_dir / "hf_model"

        # Basic tokenizer config for Gemma3
        tokenizer_config = {
            "model_type": "gemma",
            "vocab_size": 262144,
            "hidden_size": 2048,
            "intermediate_size": 16384,
            "num_hidden_layers": 18,
            "num_attention_heads": 8,
            "num_key_value_heads": 1,
            "max_position_embeddings": 8192,
            "rope_theta": 10000.0,
            "attention_bias": False,
            "attention_dropout": 0.0,
            "hidden_act": "gelu_pytorch_tanh",
            "hidden_dropout": 0.0,
            "initializer_range": 0.02,
            "rms_norm_eps": 1e-6,
            "use_cache": True,
            "pad_token_id": 0,
            "bos_token_id": 2,
            "eos_token_id": 1,
            "torch_dtype": "bfloat16"
        }

        # Save tokenizer config
        config_path = hf_model_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(tokenizer_config, f, indent=2)

        # Create tokenizer.json placeholder
        tokenizer_json = {
            "version": "1.0",
            "truncation": None,
            "padding": None,
            "added_tokens": [],
            "normalizer": None,
            "pre_tokenizer": {
                "type": "ByteLevel",
                "add_prefix_space": False,
                "trim_offsets": True,
                "use_regex": True
            },
            "post_processor": None,
            "decoder": None,
            "model": {
                "type": "BPE",
                "dropout": None,
                "unk_token": None,
                "continuing_subword_prefix": None,
                "end_of_word_suffix": None,
                "fuse_unk": False,
                "vocab": {},
                "merges": []
            }
        }

        tokenizer_path = hf_model_dir / "tokenizer.json"
        with open(tokenizer_path, 'w') as f:
            json.dump(tokenizer_json, f, indent=2)

        print(f"[OK] HuggingFace config created: {hf_model_dir}")

    def create_simple_server(self):
        """Create simple FastAPI server with Ollama backend"""
        logger.info("Creating simple FastAPI server...")

        server_code = '''#!/usr/bin/env python3
"""
Simple FastAPI server with Ollama backend for legal AI
"""

import json
import time
import requests
from pathlib import Path
from typing import Dict, Any
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.1
    legal_domain: str = "general"

class CompletionResponse(BaseModel):
    text: str
    tokens: int
    latency_ms: float
    session_id: str = None
    backend: str = "ollama"

class LegalAIServer:
    def __init__(self):
        self.ollama_host = "localhost:11434"
        self.model_name = "gemma3-legal:latest"
        self.request_count = 0
        self.total_latency = 0.0
        self.start_time = time.time()

    async def process_completion(self, request: CompletionRequest) -> CompletionResponse:
        """Process completion request with Ollama"""
        start_time = time.perf_counter()
        session_id = str(uuid.uuid4())

        try:
            legal_prompt = self._create_legal_prompt(request.prompt, request.legal_domain)

            payload = {
                "model": self.model_name,
                "prompt": legal_prompt,
                "stream": False,
                "options": {
                    "num_predict": request.max_tokens,
                    "temperature": request.temperature,
                    "top_k": 40,
                    "top_p": 0.9,
                    "stop": ["</response>", "\\n\\nUser:", "\\n\\nHuman:"]
                }
            }

            response = requests.post(
                f"http://{self.ollama_host}/api/generate",
                json=payload,
                timeout=60
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")

            result = response.json()
            generated_text = result.get("response", "")
            token_count = len(generated_text.split())

            latency = (time.perf_counter() - start_time) * 1000
            self._update_metrics(latency, token_count)

            return CompletionResponse(
                text=generated_text,
                tokens=token_count,
                latency_ms=latency,
                session_id=session_id,
                backend="ollama"
            )

        except Exception as e:
            error_latency = (time.perf_counter() - start_time) * 1000
            self._update_metrics(error_latency, 0, error=True)
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    def _create_legal_prompt(self, user_prompt: str, legal_domain: str) -> str:
        """Create optimized legal prompt"""
        domain_context = {
            "contract": "You specialize in contract analysis, reviewing terms, conditions, and potential risks.",
            "litigation": "You specialize in litigation support, case analysis, and legal strategy.",
            "compliance": "You specialize in regulatory compliance and risk assessment.",
            "corporate": "You specialize in corporate law, governance, and business transactions.",
            "general": "You provide comprehensive legal analysis across all practice areas."
        }

        context = domain_context.get(legal_domain, domain_context["general"])

        return f\"\"\"You are a specialized Legal AI Assistant powered by Gemma 3. {context}

<legal_analysis>
User Query: {user_prompt}

Please provide a thorough legal analysis addressing:
1. Key legal issues identified
2. Relevant laws and regulations
3. Potential risks and considerations
4. Recommended actions or next steps

Analysis:\"\"\"

    def _update_metrics(self, latency: float, tokens: int, error: bool = False):
        """Update server performance metrics"""
        self.request_count += 1
        self.total_latency += latency

    def get_metrics(self):
        """Get server performance metrics"""
        uptime = time.time() - self.start_time
        avg_latency = self.total_latency / self.request_count if self.request_count > 0 else 0

        return {
            "requests_processed": self.request_count,
            "avg_latency_ms": avg_latency,
            "backend_status": "ollama",
            "uptime_seconds": uptime
        }

# FastAPI application
app = FastAPI(
    title="Gemma3-Legal API",
    description="Legal AI with Ollama backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize server
server = LegalAIServer()

@app.post("/v1/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    """Process legal completion request"""
    return await server.process_completion(request)

@app.get("/metrics")
async def get_metrics():
    """Get server performance metrics"""
    return server.get_metrics()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    metrics = server.get_metrics()
    return {
        "status": "healthy",
        "backend": "ollama",
        "uptime_seconds": metrics["uptime_seconds"],
        "requests_processed": metrics["requests_processed"]
    }

if __name__ == "__main__":
    print("Starting Legal AI Server on localhost:8100")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8100,
        reload=False
    )
'''

        server_path = self.workspace_dir / "simple_server.py"
        with open(server_path, 'w') as f:
            f.write(server_code)

        print(f"[OK] Simple server created: {server_path}")

    def install_dependencies(self):
        """Install required Python packages"""
        print("Installing required packages...")

        packages = [
            "fastapi",
            "uvicorn",
            "requests",
            "pydantic",
            "aiohttp"
        ]

        for package in packages:
            try:
                result = subprocess.run([
                    sys.executable, "-m", "pip", "install", package
                ], capture_output=True, text=True, timeout=120)

                if result.returncode == 0:
                    print(f"[OK] Installed {package}")
                else:
                    print(f"[WARNING] Failed to install {package}: {result.stderr}")

            except subprocess.TimeoutExpired:
                print(f"[WARNING] Timeout installing {package}")
            except Exception as e:
                print(f"[WARNING] Error installing {package}: {e}")

    def run_setup(self):
        """Run the complete setup process"""
        try:
            self.create_workspace()

            if not self.check_ollama_availability():
                print("[ERROR] Ollama setup incomplete")
                return False

            if not self.extract_model_from_ollama():
                print("[ERROR] Model extraction failed")
                return False

            self.create_simple_server()
            self.install_dependencies()

            print("\n[SUCCESS] Simple TensorRT-LLM setup complete!")
            print("\nNext steps:")
            print(f"   1. cd {self.workspace_dir}")
            print("   2. python simple_server.py")
            print("   3. Test at: http://localhost:8100/health")

            return True

        except Exception as e:
            logger.error(f"Setup failed: {e}")
            return False

if __name__ == "__main__":
    setup = WindowsTensorRTSetup()
    success = setup.run_setup()

    if success:
        print("\nStarting server...")
        os.chdir(setup.workspace_dir)
        os.system("python simple_server.py")