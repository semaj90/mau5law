from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import numpy as np
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=4)

try:
    from sentence_transformers import SentenceTransformer
    # Load nomic-embed-text model
    embedding_model = SentenceTransformer('nomic-ai/nomic-embed-text-v1', trust_remote_code=True)
    logger.info("✅ Loaded nomic-embed-text-v1 model successfully")
    EMBEDDING_MODEL_AVAILABLE = True
except ImportError:
    logger.warning("⚠️ sentence-transformers not available, using fallback embedding")
    embedding_model = None
    EMBEDDING_MODEL_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Failed to load nomic-embed-text model: {e}")
    embedding_model = None
    EMBEDDING_MODEL_AVAILABLE = False

app = FastAPI(
    title="LegalAI FastAPI Workers with Nomic Embeddings",
    description="FastAPI service for OCR and nomic-embed-text embedding generation",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmbedRequest(BaseModel):
    text: str
    model: Optional[str] = "nomic-embed-text"
    tags: Optional[List[str]] = []
    task_type: Optional[str] = "search_document"  # nomic-embed-text supports different task types
    normalize: Optional[bool] = True

class EmbedResponse(BaseModel):
    embedding: List[float]
    model: str
    dimensions: int
    processing_time_ms: float
    cached: bool = False

@app.post('/ocr')
async def ocr_endpoint(image: UploadFile = File(...), lang: str = Form('eng')):
    """OCR endpoint with enhanced legal document processing"""
    try:
        data = await image.read()

        # Enhanced placeholder for legal document OCR
        # In production, this would use Tesseract with legal document training data
        mock_legal_text = generate_mock_legal_text(len(data), lang)

        return {
            "text": mock_legal_text,
            "confidence": 0.85,
            "language": lang,
            "image_size_bytes": len(data),
            "processing_time_ms": 150,  # Simulate processing time
            "detected_legal_elements": [
                "case_number", "plaintiff", "defendant", "court_name", "date"
            ]
        }
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        return {
            "text": f"[OCR ERROR {lang}] Failed to process image",
            "confidence": 0.0,
            "error": str(e)
        }

def generate_mock_legal_text(data_size: int, lang: str) -> str:
    """Generate realistic mock legal document text based on image size"""
    if data_size < 10000:  # Small image
        return f"Case No. 2024-CV-{data_size % 10000}\nPlaintiff vs. Defendant\nCourt Order dated {data_size % 28 + 1}/01/2024"
    elif data_size < 50000:  # Medium image
        return f"SUPERIOR COURT OF [JURISDICTION]\nCase No. 2024-CV-{data_size % 10000}\n\nIN THE MATTER OF: Legal Document Analysis\n\nThe Court hereby finds that the evidence presented demonstrates..."
    else:  # Large image
        return f"LEGAL BRIEF\nCase No. 2024-CV-{data_size % 10000}\n\nFACTUAL BACKGROUND:\nThe facts of this case involve multiple parties and complex legal issues regarding...\n\nLEGAL ANALYSIS:\nUnder applicable law, the Court must consider..."

@app.post('/embed', response_model=EmbedResponse)
async def embed_endpoint(req: EmbedRequest):
    """Generate embeddings using nomic-embed-text model"""
    import time
    start_time = time.time()

    try:
        if EMBEDDING_MODEL_AVAILABLE and embedding_model is not None:
            # Use real nomic-embed-text model
            embedding = await generate_nomic_embedding(req.text, req.task_type, req.normalize)
            dimensions = len(embedding)
            model_used = "nomic-embed-text-v1"
        else:
            # Fallback to deterministic embedding
            embedding = generate_fallback_embedding(req.text)
            dimensions = len(embedding)
            model_used = "fallback-deterministic"

        processing_time = (time.time() - start_time) * 1000

        return EmbedResponse(
            embedding=embedding,
            model=model_used,
            dimensions=dimensions,
            processing_time_ms=processing_time,
            cached=False
        )

    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        # Return fallback embedding on error
        embedding = generate_fallback_embedding(req.text)
        processing_time = (time.time() - start_time) * 1000

        return EmbedResponse(
            embedding=embedding,
            model="fallback-error",
            dimensions=len(embedding),
            processing_time_ms=processing_time,
            cached=False
        )

async def generate_nomic_embedding(text: str, task_type: str = "search_document", normalize: bool = True) -> List[float]:
    """Generate embedding using nomic-embed-text model"""
    def _generate():
        try:
            # Add task prefix for nomic-embed-text
            if task_type == "search_document":
                prefixed_text = f"search_document: {text}"
            elif task_type == "search_query":
                prefixed_text = f"search_query: {text}"
            elif task_type == "classification":
                prefixed_text = f"classification: {text}"
            else:
                prefixed_text = text

            # Generate embedding
            embedding = embedding_model.encode(
                prefixed_text,
                normalize_embeddings=normalize,
                convert_to_tensor=False
            )

            # Convert to list if numpy array
            if hasattr(embedding, 'tolist'):
                return embedding.tolist()
            else:
                return list(embedding)

        except Exception as e:
            logger.error(f"nomic-embed-text generation failed: {e}")
            raise

    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    embedding = await loop.run_in_executor(executor, _generate)
    return embedding

def generate_fallback_embedding(text: str, dimensions: int = 768) -> List[float]:
    """Generate deterministic fallback embedding (768-dim to match nomic-embed-text)"""
    import hashlib

    # Create multiple hashes to get enough bytes for 768 dimensions
    embeddings = []
    for i in range((dimensions // 32) + 1):
        h = hashlib.sha256(f"{text}_{i}".encode('utf-8')).digest()
        embeddings.extend([b / 255.0 * 2.0 - 1.0 for b in h])  # Normalize to [-1, 1]

    # Trim to exact dimensions
    embeddings = embeddings[:dimensions]

    # Normalize the vector
    norm = sum(x * x for x in embeddings) ** 0.5
    if norm > 0:
        embeddings = [x / norm for x in embeddings]

    return embeddings

@app.get('/health')
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "embedding_model_available": EMBEDDING_MODEL_AVAILABLE,
        "model": "nomic-embed-text-v1" if EMBEDDING_MODEL_AVAILABLE else "fallback-deterministic",
        "dimensions": 768,
        "supported_task_types": ["search_document", "search_query", "classification"]
    }

@app.post('/embed/batch')
async def embed_batch_endpoint(texts: List[str], task_type: str = "search_document", normalize: bool = True):
    """Batch embedding generation for multiple texts"""
    import time
    start_time = time.time()

    try:
        if EMBEDDING_MODEL_AVAILABLE and embedding_model is not None:
            embeddings = await generate_nomic_embeddings_batch(texts, task_type, normalize)
            model_used = "nomic-embed-text-v1"
        else:
            embeddings = [generate_fallback_embedding(text) for text in texts]
            model_used = "fallback-deterministic"

        processing_time = (time.time() - start_time) * 1000

        return {
            "embeddings": embeddings,
            "model": model_used,
            "dimensions": len(embeddings[0]) if embeddings else 0,
            "count": len(embeddings),
            "processing_time_ms": processing_time
        }

    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        return {
            "error": str(e),
            "embeddings": [],
            "model": "error",
            "dimensions": 0,
            "count": 0,
            "processing_time_ms": (time.time() - start_time) * 1000
        }

async def generate_nomic_embeddings_batch(texts: List[str], task_type: str = "search_document", normalize: bool = True) -> List[List[float]]:
    """Generate embeddings for multiple texts using nomic-embed-text model"""
    def _generate_batch():
        try:
            # Add task prefixes
            prefixed_texts = []
            for text in texts:
                if task_type == "search_document":
                    prefixed_texts.append(f"search_document: {text}")
                elif task_type == "search_query":
                    prefixed_texts.append(f"search_query: {text}")
                elif task_type == "classification":
                    prefixed_texts.append(f"classification: {text}")
                else:
                    prefixed_texts.append(text)

            # Generate embeddings
            embeddings = embedding_model.encode(
                prefixed_texts,
                normalize_embeddings=normalize,
                convert_to_tensor=False,
                show_progress_bar=len(texts) > 10
            )

            # Convert to list format
            if hasattr(embeddings, 'tolist'):
                return embeddings.tolist()
            else:
                return [list(emb) for emb in embeddings]

        except Exception as e:
            logger.error(f"Batch nomic-embed-text generation failed: {e}")
            raise

    # Run in thread pool
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(executor, _generate_batch)
    return embeddings

if __name__ == '__main__':
    logger.info(f"🚀 Starting LegalAI FastAPI Workers with nomic-embed-text support")
    logger.info(f"📊 Embedding model available: {EMBEDDING_MODEL_AVAILABLE}")
    uvicorn.run(app, host='0.0.0.0', port=8000)