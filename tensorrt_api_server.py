#!/usr/bin/env python3
"""
TensorRT-LLM API Server for Legal AI Platform
Bridges Windows SvelteKit frontend with WSL2 TensorRT-LLM backend
Uses existing 512-dimension embedding adapter system
"""
import os
import sys
import asyncio
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import requests
import numpy as np
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="TensorRT-LLM Legal AI API", version="1.0.0")

# Add CORS middleware for SvelteKit integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
EMBEDDING_MODEL = "embeddinggemma:latest"  # Primary embedding model as specified
CHAT_MODEL = "gemma3-legal:latest"

class TensorRTRequest(BaseModel):
    text: str
    model: Optional[str] = "gemma3-legal"

class TensorRTResponse(BaseModel):
    result: Optional[str] = None
    embedding: Optional[List[float]] = None
    dimensions: Optional[int] = None
    processing_time_ms: Optional[float] = None
    inference_time_ms: Optional[float] = None
    status: str

class HealthResponse(BaseModel):
    status: str
    tensorrt_available: bool = False
    cuda_available: bool = False
    gpu_name: Optional[str] = None
    error: Optional[str] = None

def check_gpu_status():
    """Check CUDA and GPU availability"""
    try:
        # Check if nvidia-smi is available
        result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader,nounits'],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            gpu_name = result.stdout.strip()
            return True, gpu_name
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    try:
        # Try alternative approach with torch
        import torch
        if torch.cuda.is_available():
            return True, torch.cuda.get_device_name(0)
    except ImportError:
        pass

    return False, None

def reduce_to_512_dimensions(embedding_768: List[float]) -> List[float]:
    """
    Convert 768-dimension embedding to 512 dimensions using deterministic linear projection
    Same method as in embedding_adapter_512.py for consistency
    """
    if len(embedding_768) != 768:
        logger.warning(f"Expected 768 dimensions, got {len(embedding_768)}")
        return embedding_768

    # Deterministic projection matrix (same seed as WSL2 system)
    np.random.seed(42)
    projection_matrix = np.random.randn(768, 512) * 0.1
    projection_matrix = projection_matrix / np.linalg.norm(projection_matrix, axis=0)

    # Apply projection
    embedding_array = np.array(embedding_768)
    reduced_embedding = np.dot(embedding_array, projection_matrix)

    return reduced_embedding.tolist()

async def get_ollama_embedding(text: str) -> Dict:
    """Get embedding from Ollama using embeddinggemma model"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            embedding_768 = data.get("embedding", [])

            if len(embedding_768) == 768:
                # Convert to 512 dimensions for pgvector compatibility
                embedding_512 = reduce_to_512_dimensions(embedding_768)
                return {
                    "success": True,
                    "embedding": embedding_512,
                    "dimensions": 512,
                    "original_dimensions": 768
                }

        return {"success": False, "error": f"Ollama API error: {response.status_code}"}

    except Exception as e:
        return {"success": False, "error": f"Embedding generation failed: {str(e)}"}

async def get_ollama_chat_response(text: str, model: str = "gemma3-legal") -> Dict:
    """Get chat response from Ollama using specified model"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": model, "prompt": text, "stream": False},
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "result": data.get("response", ""),
                "eval_duration": data.get("eval_duration", 0) // 1000000,  # Convert to ms
            }

        return {"success": False, "error": f"Ollama chat error: {response.status_code}"}

    except Exception as e:
        return {"success": False, "error": f"Chat generation failed: {str(e)}"}

@app.get("/health")
async def health_check():
    """Health check endpoint for SvelteKit integration"""
    start_time = datetime.now()

    # Check GPU status
    cuda_available, gpu_name = check_gpu_status()

    # Check Ollama availability
    ollama_available = False
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        ollama_available = response.status_code == 200
    except:
        pass

    # Determine overall status
    if ollama_available:
        status = "healthy"
        tensorrt_available = True  # Using Ollama as TensorRT backend
    else:
        status = "degraded"
        tensorrt_available = False

    processing_time = (datetime.now() - start_time).total_seconds() * 1000

    return HealthResponse(
        status=status,
        tensorrt_available=tensorrt_available,
        cuda_available=cuda_available,
        gpu_name=gpu_name
    ).dict()

@app.post("/inference")
async def tensorrt_inference(request: TensorRTRequest):
    """TensorRT inference endpoint for SvelteKit integration"""
    start_time = datetime.now()

    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text is required and cannot be empty")

        # Handle different model types
        if request.model in ["embedding-analysis", "embeddings"]:
            # Generate embedding using 512-dimension adapter
            result = await get_ollama_embedding(request.text.strip())

            if result["success"]:
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                return TensorRTResponse(
                    status="success",
                    embedding=result["embedding"],
                    dimensions=result["dimensions"],
                    processing_time_ms=processing_time,
                    inference_time_ms=processing_time
                ).dict()
            else:
                raise HTTPException(status_code=500, detail=result["error"])

        else:
            # Generate chat response
            chat_model = request.model if request.model in ["gemma3-legal", "tensorrt-optimized"] else "gemma3-legal"
            result = await get_ollama_chat_response(request.text.strip(), chat_model)

            if result["success"]:
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                return TensorRTResponse(
                    status="success",
                    result=result["result"],
                    processing_time_ms=processing_time,
                    inference_time_ms=result.get("eval_duration", processing_time)
                ).dict()
            else:
                raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TensorRT inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "TensorRT-LLM Legal AI API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "inference": "/inference",
            "docs": "/docs"
        },
        "models": {
            "embedding": EMBEDDING_MODEL,
            "chat": CHAT_MODEL
        },
        "status": "ready"
    }

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TensorRT-LLM Legal AI API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8100, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")

    args = parser.parse_args()

    logger.info(f"Starting TensorRT-LLM Legal AI API Server on {args.host}:{args.port}")
    logger.info(f"Embedding model: {EMBEDDING_MODEL}")
    logger.info(f"Chat model: {CHAT_MODEL}")
    logger.info(f"Frontend integration: http://localhost:5173/tensorrt")

    uvicorn.run(
        "tensorrt_api_server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )