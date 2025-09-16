#!/usr/bin/env python3
"""
Windows TensorRT-LLM Setup for Gemma3-Legal Q4_K_M Pipeline
Uses existing Ollama models without downloading
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

        print(f"✅ Workspace created: {self.workspace_dir}")

    def check_ollama_availability(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            response = requests.get(f"http://{self.ollama_host}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]

                if self.model_name in model_names:
                    print(f"Ollama model {self.model_name} found")
                    return True
                else:
                    print(f"❌ Model {self.model_name} not found in Ollama")
                    print(f"Available models: {model_names}")
                    return False
            else:
                print(f"❌ Ollama API returned status: {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Ollama not available: {e}")
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
                print(f"❌ Failed to get model info: {response.status_code}")
                return False

            model_info = response.json()

            # Save model info for TensorRT conversion
            model_info_path = self.workspace_dir / "model_info.json"
            with open(model_info_path, 'w') as f:
                json.dump(model_info, f, indent=2)

            print(f"✅ Model info extracted: {model_info_path}")

            # Create basic tokenizer config for compatibility
            self.create_hf_tokenizer_config(model_info)

            return True

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to extract model: {e}")
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

        print(f"✅ HuggingFace config created: {hf_model_dir}")

    def create_tensorrt_server(self):
        """Create TensorRT-LLM server with fallback support"""
        logger.info("Creating TensorRT-LLM server...")

        server_code = '''#!/usr/bin/env python3
"""
Windows TensorRT-LLM Server with Ollama Fallback
Provides FastAPI server with multiple inference backends
"""

import asyncio
import json
import time
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
import uuid
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

# TensorRT-LLM imports with fallback
try:
    from tensorrt_llm.hlapi import LLM, SamplingParams
    TENSORRT_AVAILABLE = True
except ImportError:
    print("⚠️ TensorRT-LLM not available, using Ollama fallback")
    LLM = None
    SamplingParams = None
    TENSORRT_AVAILABLE = False

class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.1
    top_k: int = 40
    top_p: float = 0.9
    stream: bool = False
    session_id: str = None
    legal_domain: str = "general"

class CompletionResponse(BaseModel):
    text: str
    tokens: int
    latency_ms: float
    throughput_tps: float
    session_id: str = None
    backend: str = "unknown"
    metadata: Dict[str, Any] = None

class MetricsResponse(BaseModel):
    requests_processed: int
    avg_latency_ms: float
    total_tokens_generated: int
    avg_throughput_tps: float
    backend_status: str
    uptime_seconds: float

class TensorRTLegalServer:
    def __init__(self, engine_dir: str = None, tokenizer_dir: str = None):
        self.engine_dir = Path(engine_dir) if engine_dir else None
        self.tokenizer_dir = Path(tokenizer_dir) if tokenizer_dir else None
        self.ollama_host = "localhost:11434"
        self.model_name = "gemma3-legal:latest"

        # Performance tracking
        self.request_count = 0
        self.total_latency = 0.0
        self.total_tokens = 0
        self.start_time = time.time()

        # Try to initialize TensorRT, fallback to Ollama
        self.backend = self._initialize_backend()

        print(f"🚀 Legal AI Server initialized with backend: {self.backend}")

    def _initialize_backend(self) -> str:
        """Initialize the best available backend"""
        if TENSORRT_AVAILABLE and self.engine_dir and self.engine_dir.exists():
            try:
                self.llm = LLM(
                    model=str(self.engine_dir),
                    tokenizer=str(self.tokenizer_dir) if self.tokenizer_dir else None,
                    max_num_seqs=4,
                    max_model_len=2048
                )
                return "tensorrt-llm"
            except Exception as e:
                print(f"⚠️ TensorRT-LLM failed to load: {e}")

        # Check Ollama availability
        try:
            response = requests.get(f"http://{self.ollama_host}/api/tags", timeout=5)
            if response.status_code == 200:
                return "ollama"
        except:
            pass

        return "mock"

    async def process_completion(self, request: CompletionRequest) -> CompletionResponse:
        """Process completion request with backend fallback"""
        start_time = time.perf_counter()
        session_id = request.session_id or str(uuid.uuid4())

        try:
            if self.backend == "tensorrt-llm":
                result = await self._tensorrt_completion(request)
            elif self.backend == "ollama":
                result = await self._ollama_completion(request)
            else:
                result = await self._mock_completion(request)

            latency = (time.perf_counter() - start_time) * 1000
            throughput = result["tokens"] / (latency / 1000) if latency > 0 else 0

            # Update metrics
            self._update_metrics(latency, result["tokens"])

            return CompletionResponse(
                text=result["text"],
                tokens=result["tokens"],
                latency_ms=latency,
                throughput_tps=throughput,
                session_id=session_id,
                backend=self.backend,
                metadata={
                    "model": self.model_name,
                    "legal_domain": request.legal_domain,
                    "backend": self.backend
                }
            )

        except Exception as e:
            error_latency = (time.perf_counter() - start_time) * 1000
            self._update_metrics(error_latency, 0, error=True)
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    async def _tensorrt_completion(self, request: CompletionRequest) -> Dict[str, Any]:
        """TensorRT-LLM completion"""
        legal_prompt = self._create_legal_prompt(request.prompt, request.legal_domain)

        sampling_params = SamplingParams(
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_k=request.top_k,
            top_p=request.top_p,
            stop=["</response>", "\\n\\nUser:", "\\n\\nHuman:"]
        )

        outputs = self.llm.generate([legal_prompt], sampling_params)
        generated_text = outputs[0].outputs[0].text
        token_count = len(outputs[0].outputs[0].token_ids)

        return {"text": generated_text, "tokens": token_count}

    async def _ollama_completion(self, request: CompletionRequest) -> Dict[str, Any]:
        """Ollama completion fallback"""
        legal_prompt = self._create_legal_prompt(request.prompt, request.legal_domain)

        payload = {
            "model": self.model_name,
            "prompt": legal_prompt,
            "stream": False,
            "options": {
                "num_predict": request.max_tokens,
                "temperature": request.temperature,
                "top_k": request.top_k,
                "top_p": request.top_p,
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

        return {"text": generated_text, "tokens": token_count}

    async def _mock_completion(self, request: CompletionRequest) -> Dict[str, Any]:
        """Mock completion for testing"""
        mock_text = f"Mock legal analysis for: {request.prompt[:50]}... [This is a mock response for testing purposes]"
        await asyncio.sleep(0.1)  # Simulate processing time
        return {"text": mock_text, "tokens": len(mock_text.split())}

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
        if not error:
            self.total_tokens += tokens

    def get_metrics(self) -> MetricsResponse:
        """Get server performance metrics"""
        uptime = time.time() - self.start_time
        avg_latency = self.total_latency / self.request_count if self.request_count > 0 else 0
        avg_throughput = self.total_tokens / uptime if uptime > 0 else 0

        return MetricsResponse(
            requests_processed=self.request_count,
            avg_latency_ms=avg_latency,
            total_tokens_generated=self.total_tokens,
            avg_throughput_tps=avg_throughput,
            backend_status=self.backend,
            uptime_seconds=uptime
        )

# FastAPI application
app = FastAPI(
    title="Gemma3-Legal TensorRT-LLM API",
    description="High-performance legal AI with multi-backend support",
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
workspace_dir = Path.home() / "tensorrt_workspace"
server = TensorRTLegalServer(
    engine_dir=workspace_dir / "engines",
    tokenizer_dir=workspace_dir / "hf_model"
)

@app.post("/v1/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    """Process legal completion request"""
    return await server.process_completion(request)

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get server performance metrics"""
    return server.get_metrics()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    metrics = server.get_metrics()
    return {
        "status": "healthy",
        "backend": metrics.backend_status,
        "uptime_seconds": metrics.uptime_seconds,
        "requests_processed": metrics.requests_processed
    }

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8100, help="Port to bind to")
    parser.add_argument("--workers", type=int, default=1, help="Number of workers")

    args = parser.parse_args()

    print(f"🌐 Starting Legal AI Server on {args.host}:{args.port}")
    print(f"📁 Workspace: {workspace_dir}")
    print(f"🔧 Backend: {server.backend}")

    uvicorn.run(
        "tensorrt_server:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=False
    )
'''

        server_path = self.workspace_dir / "tensorrt_server.py"
        with open(server_path, 'w') as f:
            f.write(server_code)

        print(f"✅ TensorRT server created: {server_path}")

    def create_test_client(self):
        """Create test client for the server"""
        logger.info("Creating test client...")

        test_client_code = '''#!/usr/bin/env python3
"""
Test client for TensorRT-LLM Legal AI Server
"""

import asyncio
import aiohttp
import time
import json

async def test_legal_completion():
    """Test legal completion endpoint"""
    print("🧪 Testing Legal AI Completion...")

    test_cases = [
        {
            "prompt": "Analyze this employment contract for potential issues.",
            "legal_domain": "contract"
        },
        {
            "prompt": "Review this non-disclosure agreement for enforceability.",
            "legal_domain": "contract"
        },
        {
            "prompt": "Assess regulatory compliance risks for this merger.",
            "legal_domain": "compliance"
        }
    ]

    async with aiohttp.ClientSession() as session:
        for i, test_case in enumerate(test_cases, 1):
            print(f"\\n📋 Test Case {i}: {test_case['legal_domain'].title()} Analysis")

            start_time = time.perf_counter()

            async with session.post("http://localhost:8100/v1/completions", json={
                "prompt": test_case["prompt"],
                "max_tokens": 256,
                "temperature": 0.1,
                "legal_domain": test_case["legal_domain"]
            }) as response:
                if response.status == 200:
                    result = await response.json()

                    latency = (time.perf_counter() - start_time) * 1000

                    print(f"   ✅ Status: Success")
                    print(f"   ⏱️ Total Latency: {latency:.2f}ms")
                    print(f"   🔧 Backend: {result.get('backend', 'unknown')}")
                    print(f"   📊 Server Latency: {result.get('latency_ms', 0):.2f}ms")
                    print(f"   🎯 Tokens Generated: {result.get('tokens', 0)}")
                    print(f"   ⚡ Throughput: {result.get('throughput_tps', 0):.1f} tokens/s")
                    print(f"   📝 Response Preview: {result.get('text', '')[:100]}...")

                else:
                    print(f"   ❌ Error: {response.status}")
                    error_text = await response.text()
                    print(f"   📝 Details: {error_text}")

async def test_server_metrics():
    """Test server metrics endpoint"""
    print("\\n📊 Testing Server Metrics...")

    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8100/metrics") as response:
            if response.status == 200:
                metrics = await response.json()

                print(f"   ✅ Status: Healthy")
                print(f"   🔧 Backend: {metrics.get('backend_status', 'unknown')}")
                print(f"   📊 Requests Processed: {metrics.get('requests_processed', 0)}")
                print(f"   ⏱️ Average Latency: {metrics.get('avg_latency_ms', 0):.2f}ms")
                print(f"   🎯 Total Tokens: {metrics.get('total_tokens_generated', 0)}")
                print(f"   ⚡ Average Throughput: {metrics.get('avg_throughput_tps', 0):.1f} tokens/s")
                print(f"   ⏰ Uptime: {metrics.get('uptime_seconds', 0):.1f}s")

            else:
                print(f"   ❌ Error: {response.status}")

async def test_health_check():
    """Test health check endpoint"""
    print("\\n🔍 Testing Health Check...")

    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8100/health") as response:
            if response.status == 200:
                health = await response.json()

                print(f"   ✅ Status: {health.get('status', 'unknown')}")
                print(f"   🔧 Backend: {health.get('backend', 'unknown')}")
                print(f"   📊 Requests: {health.get('requests_processed', 0)}")
                print(f"   ⏰ Uptime: {health.get('uptime_seconds', 0):.1f}s")

            else:
                print(f"   ❌ Health check failed: {response.status}")

async def main():
    """Run all tests"""
    print("🚀 TensorRT-LLM Legal AI Server Test Suite")
    print("=" * 50)

    # Wait for server to be ready
    print("⏳ Waiting for server to be ready...")
    async with aiohttp.ClientSession() as session:
        for _ in range(30):
            try:
                async with session.get("http://localhost:8100/health") as response:
                    if response.status == 200:
                        print("✅ Server is ready")
                        break
            except:
                await asyncio.sleep(1)
        else:
            print("❌ Server not ready after 30 seconds")
            return

    # Run tests
    await test_health_check()
    await test_legal_completion()
    await test_server_metrics()

    print("\\n🎉 Test suite completed!")

if __name__ == "__main__":
    asyncio.run(main())
'''

        test_client_path = self.workspace_dir / "test_client.py"
        with open(test_client_path, 'w') as f:
            f.write(test_client_code)

        print(f"✅ Test client created: {test_client_path}")

    def create_startup_scripts(self):
        """Create startup scripts for the server"""
        logger.info("Creating startup scripts...")

        # Windows batch script
        start_bat = f'''@echo off
REM TensorRT-LLM Legal AI Server Startup Script

echo 🚀 Starting TensorRT-LLM Legal AI Server
echo ======================================

cd /d "{self.workspace_dir}"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found
    echo Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

echo ✅ Python detected

REM Install required packages
echo 📦 Installing required packages...
pip install fastapi uvicorn aiohttp pydantic requests

REM Start server
echo 🌐 Starting server on localhost:8100...
python tensorrt_server.py --host 0.0.0.0 --port 8100

pause
'''

        start_bat_path = self.workspace_dir / "start_server.bat"
        with open(start_bat_path, 'w') as f:
            f.write(start_bat)

        # PowerShell script
        start_ps1 = f'''# TensorRT-LLM Legal AI Server Startup Script

Write-Host "🚀 Starting TensorRT-LLM Legal AI Server" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

Set-Location "{self.workspace_dir}"

# Check Python
try {{
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python detected: $pythonVersion" -ForegroundColor Green
}} catch {{
    Write-Host "❌ Python not found" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ and add to PATH" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}}

# Install packages
Write-Host "📦 Installing required packages..." -ForegroundColor Yellow
pip install fastapi uvicorn aiohttp pydantic requests

# Start server
Write-Host "🌐 Starting server on localhost:8100..." -ForegroundColor Green
python tensorrt_server.py --host 0.0.0.0 --port 8100
'''

        start_ps1_path = self.workspace_dir / "start_server.ps1"
        with open(start_ps1_path, 'w') as f:
            f.write(start_ps1)

        print(f"✅ Startup scripts created:")
        print(f"   Windows: {start_bat_path}")
        print(f"   PowerShell: {start_ps1_path}")

    def run_setup(self):
        """Run the complete setup process"""
        try:
            self.create_workspace()

            if not self.check_ollama_availability():
                print("❌ Ollama setup incomplete")
                return False

            if not self.extract_model_from_ollama():
                print("❌ Model extraction failed")
                return False

            self.create_tensorrt_server()
            self.create_test_client()
            self.create_startup_scripts()

            print("\n🎉 Windows TensorRT-LLM setup complete!")
            print("\n📋 Next steps:")
            print(f"   1. Open command prompt: cd {self.workspace_dir}")
            print("   2. Start server: start_server.bat")
            print("   3. Run tests: python test_client.py")
            print("\n🌐 Server will be available at: http://localhost:8100")
            print("📊 Metrics: http://localhost:8100/metrics")
            print("🔍 Health: http://localhost:8100/health")

            return True

        except Exception as e:
            logger.error(f"Setup failed: {e}")
            return False

if __name__ == "__main__":
    setup = WindowsTensorRTSetup()
    setup.run_setup()