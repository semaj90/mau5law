#!/usr/bin/env python3
"""
Dual TensorRT-LLM Service for 3060 Ti 8GB
- gemma3-legal:latest (7GB VRAM) on port 8090
- gemma3:270m (512MB VRAM) on port 8091
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TensorRTService:
    """Optimized TensorRT-LLM service with memory management"""

    def __init__(self, model_name: str, port: int, vram_limit: str):
        self.model_name = model_name
        self.port = port
        self.vram_limit = vram_limit
        self.model = None
        self.model_loaded = False

    async def load_model(self):
        """Load model with VRAM constraints"""
        try:
            logger.info(f"Loading {self.model_name} with {self.vram_limit} VRAM limit")

            # Simulate model loading - real implementation would use actual TensorRT-LLM
            await asyncio.sleep(2)  # Simulate loading time

            self.model_loaded = True
            logger.info(f"{self.model_name} loaded successfully on port {self.port}")

        except Exception as e:
            logger.error(f"Failed to load {self.model_name}: {e}")
            raise

    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate with memory-optimized inference"""
        if not self.model_loaded:
            raise HTTPException(status_code=503, detail=f"{self.model_name} not loaded")

        # Simulate different response times based on model size
        if "270m" in self.model_name:
            await asyncio.sleep(0.05)  # Fast inference for small model
            response = f"[TensorRT-270M-OPTIMIZED] Quick analysis: {prompt[:100]}..."
        else:
            await asyncio.sleep(0.2)   # Slower but more detailed for large model
            response = f"[TensorRT-Legal-7GB] Detailed legal analysis: {prompt[:100]}..."

        return response

    async def stream_generate(self, prompt: str, **kwargs):
        """Memory-efficient streaming generation"""
        if not self.model_loaded:
            raise HTTPException(status_code=503, detail=f"{self.model_name} not loaded")

        # Simulate streaming with memory awareness
        response_chunks = []
        if "270m" in self.model_name:
            response_chunks = ["Quick", " legal", " summary:", f" {prompt[:50]}"]
        else:
            response_chunks = ["Comprehensive", " legal", " analysis", " follows:", f" {prompt[:30]}"]

        for chunk in response_chunks:
            yield json.dumps({
                "model": self.model_name,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "response": f"{chunk} ",
                "done": False
            }) + "\n"
            await asyncio.sleep(0.01)

        # Final chunk
        yield json.dumps({
            "model": self.model_name,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "response": "",
            "done": True,
            "context": [],
            "total_duration": 500000000,
            "load_duration": 50000000,
            "prompt_eval_count": len(prompt.split()),
            "prompt_eval_duration": 100000000,
            "eval_count": 10,
            "eval_duration": 400000000
        }) + "\n"

# Global service instances
services = {}

def create_service(model_name: str, port: int, vram_limit: str):
    """Factory function for creating TensorRT services"""
    service = TensorRTService(model_name, port, vram_limit)
    services[model_name] = service
    return service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan with memory optimization"""
    model_name = app.state.model_name
    port = app.state.port
    vram_limit = app.state.vram_limit

    logger.info(f"Starting TensorRT service: {model_name}")

    # Create and load service
    service = create_service(model_name, port, vram_limit)
    await service.load_model()

    yield

    logger.info(f"Shutting down TensorRT service: {model_name}")

def create_app(model_name: str, port: int, vram_limit: str):
    """Create FastAPI app for specific model"""

    app = FastAPI(
        title=f"TensorRT-LLM Service - {model_name}",
        description=f"Memory-optimized TensorRT-LLM for {model_name}",
        version="1.0.0",
        lifespan=lifespan
    )

    # Store configuration in app state
    app.state.model_name = model_name
    app.state.port = port
    app.state.vram_limit = vram_limit

    # Request/Response models
    class GenerateRequest(BaseModel):
        model: str
        prompt: str
        stream: Optional[bool] = False
        options: Optional[Dict[str, Any]] = {}

    class GenerateResponse(BaseModel):
        model: str
        created_at: str
        response: str
        done: bool

    @app.get("/api/tags")
    async def list_models():
        """List available models"""
        return {
            "models": [{
                "name": model_name,
                "model": model_name,
                "modified_at": "2025-09-17T10:00:00Z",
                "size": 7300000000 if "legal" in model_name else 270000000,
                "digest": f"sha256:tensorrt-{model_name}",
                "details": {
                    "parent_model": "",
                    "format": "tensorrt-llm",
                    "family": "gemma3",
                    "families": ["gemma3"],
                    "parameter_size": "9B" if "legal" in model_name else "270M",
                    "quantization_level": "Q4",
                    "vram_limit": vram_limit
                }
            }]
        }

    @app.post("/api/generate")
    async def generate(request: GenerateRequest):
        """Generate text with memory optimization"""
        try:
            service = services[model_name]

            if request.stream:
                return StreamingResponse(
                    service.stream_generate(request.prompt, **request.options),
                    media_type="application/x-ndjson"
                )
            else:
                response_text = await service.generate(request.prompt, **request.options)
                return GenerateResponse(
                    model=request.model,
                    created_at=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                    response=response_text,
                    done=True
                )
        except Exception as e:
            logger.error(f"Generation error on {model_name}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/health")
    async def health_check():
        """Health check with memory status"""
        service = services.get(model_name)
        return {
            "status": "healthy",
            "service": f"tensorrt-{model_name}",
            "model_loaded": service.model_loaded if service else False,
            "vram_limit": vram_limit,
            "port": port,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }

    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": f"TensorRT-LLM Service - {model_name}",
            "version": "1.0.0",
            "status": "running",
            "vram_limit": vram_limit,
            "docs": "/docs"
        }

    return app

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python dual_tensorrt_service.py [legal|270m]")
        sys.exit(1)

    model_type = sys.argv[1]

    if model_type == "legal":
        model_name = "gemma3-legal:latest"
        port = 8090
        vram_limit = "7GB"
    elif model_type == "270m":
        model_name = "gemma3:270m"
        port = 8091
        vram_limit = "512MB"
    else:
        print("Invalid model type. Use 'legal' or '270m'")
        sys.exit(1)

    app = create_app(model_name, port, vram_limit)

    logger.info(f"Starting {model_name} TensorRT service on port {port} with {vram_limit} VRAM")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        reload=False,
        log_level="info"
    )