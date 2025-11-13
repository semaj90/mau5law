#!/usr/bin/env python3
"""
Phase 70 TensorRT-LLM Service - Optimized for RTX 3060 Ti
Python 3.12 + TensorRT 0.20.0 + CUDA 12.9 + PyTorch 2.7 (NVIDIA fork)
Reuses cached NVIDIA container layers - no downloads
"""

import os
import sys
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# FastAPI and related
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# TensorRT-LLM
import tensorrt_llm
from tensorrt_llm.runtime import ModelRunner
from tensorrt_llm import SamplingConfig

# PyTorch and CUDA
import torch
from transformers import AutoTokenizer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Phase 70 TensorRT-LLM Service", version="1.0.0")

# Configuration
ENGINE_DIR = "/app/tensorrt_engines"
TOKENIZER_DIR = "/app/tokenizers"
MODEL_NAME = "gemma3-legal"

# Global variables for model and tokenizer
model_runner = None
tokenizer = None

class LLMRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    temperature: float = 0.1
    top_p: float = 0.95
    top_k: int = 40
    repetition_penalty: float = 1.1
    stop_words: List[str] = []

class LLMResponse(BaseModel):
    response: str
    tokens_generated: int
    processing_time: float
    model: str
    timestamp: str

def load_model():
    """Load TensorRT-LLM model and tokenizer"""
    global model_runner, tokenizer

    try:
        # Load tokenizer
        tokenizer_path = os.path.join(TOKENIZER_DIR, MODEL_NAME)
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
        logger.info(f"✅ Loaded tokenizer from {tokenizer_path}")

        # Load TensorRT engine
        engine_path = os.path.join(ENGINE_DIR, f"{MODEL_NAME}.plan")
        if not os.path.exists(engine_path):
            raise FileNotFoundError(f"Engine file not found: {engine_path}")

        # Initialize model runner
        model_runner = ModelRunner.from_dir(
            engine_dir=ENGINE_DIR,
            rank=0,  # Single GPU
            debug_mode=False
        )
        logger.info(f"✅ Loaded TensorRT engine from {engine_path}")

    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    logger.info("🚀 Initializing TensorRT-LLM model...")
    load_model()
    logger.info("✅ TensorRT-LLM service ready")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check CUDA availability
        cuda_available = torch.cuda.is_available()
        device_name = torch.cuda.get_device_name(0) if cuda_available else "N/A"
        memory_allocated = torch.cuda.memory_allocated(0) if cuda_available else 0
        memory_reserved = torch.cuda.memory_reserved(0) if cuda_available else 0

        return {
            "service": "Phase 66 TensorRT-LLM Service",
            "status": "healthy",
            "model": MODEL_NAME,
            "cuda_available": cuda_available,
            "device_name": device_name,
            "memory_allocated_mb": memory_allocated / 1024 / 1024,
            "memory_reserved_mb": memory_reserved / 1024 / 1024,
            "tensorrt_version": tensorrt_llm.__version__,
            "pytorch_version": torch.__version__,
            "python_version": sys.version,
            "cuda_version": torch.version.cuda,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {e}")

@app.post("/generate", response_model=LLMResponse)
async def generate_text(request: LLMRequest):
    """Generate text using TensorRT-LLM"""
    start_time = datetime.now()

    try:
        if model_runner is None or tokenizer is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Tokenize input
        input_ids = tokenizer.encode(request.prompt, return_tensors="pt")

        # Move to GPU
        input_ids = input_ids.cuda()

        # Configure sampling
        sampling_config = SamplingConfig(
            end_id=tokenizer.eos_token_id,
            pad_id=tokenizer.pad_token_id if tokenizer.pad_token_id else tokenizer.eos_token_id,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            top_k=request.top_k,
            repetition_penalty=request.repetition_penalty,
            stop_words_list=request.stop_words
        )

        # Generate
        with torch.no_grad():
            outputs = model_runner.generate(
                input_ids=input_ids,
                sampling_config=sampling_config,
                prompt_table=None,  # For single sequence
                prompt_table_len=0
            )

        # Decode output
        if isinstance(outputs, list) and len(outputs) > 0:
            output_ids = outputs[0]
        else:
            output_ids = outputs

        # Remove input tokens from output
        if output_ids.shape[1] > input_ids.shape[1]:
            generated_ids = output_ids[:, input_ids.shape[1]:]
        else:
            generated_ids = output_ids

        response_text = tokenizer.decode(generated_ids[0], skip_special_tokens=True)

        processing_time = (datetime.now() - start_time).total_seconds()

        return LLMResponse(
            response=response_text,
            tokens_generated=generated_ids.shape[1],
            processing_time=processing_time,
            model=MODEL_NAME,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

@app.post("/embed")
async def generate_embeddings(text: str):
    """Generate embeddings (if supported by the model)"""
    try:
        # Note: Not all models support embeddings
        # This would need to be implemented based on the specific model
        raise HTTPException(status_code=501, detail="Embeddings not implemented for this model")
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {e}")

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [MODEL_NAME],
        "current": MODEL_NAME,
        "type": "tensorrt-llm",
        "capabilities": ["text-generation"],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    try:
        return {
            "service": "Phase 66 TensorRT-LLM Service",
            "model": MODEL_NAME,
            "cuda_memory": {
                "allocated_mb": torch.cuda.memory_allocated(0) / 1024 / 1024,
                "reserved_mb": torch.cuda.memory_reserved(0) / 1024 / 1024,
                "max_allocated_mb": torch.cuda.max_memory_allocated(0) / 1024 / 1024,
                "max_reserved_mb": torch.cuda.max_memory_reserved(0) / 1024 / 1024
            },
            "uptime": "N/A",  # Would need to track this
            "requests_processed": "N/A",  # Would need to track this
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Stats retrieval failed: {e}")

if __name__ == "__main__":
    port = int(os.getenv("TENSORRT_PORT", "8099"))
    host = os.getenv("TENSORRT_HOST", "0.0.0.0")

    logger.info(f"🚀 Starting TensorRT-LLM service on {host}:{port}")
    uvicorn.run(
        "tensorrt_llm_service:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )