# Phase 70 AI Stack Upgrade

## Overview

Phase 70 represents a comprehensive upgrade to the Legal AI platform with agentic function calling, local TensorRT engine building, and advanced RAG capabilities. This upgrade avoids heavy downloads by reusing cached NVIDIA container layers.

## Key Features

### 🚀 Agentic Function Calling
- **TensorRT-LLM Service**: GPU-accelerated inference with RTX 3060 Ti optimization
- **PyTorch Fallback**: 4-bit quantized fallback service for CPU/GPU flexibility
- **Automatic Fallback Logic**: TensorRT → PyTorch → Ollama progression

### 🔧 Local Engine Building
- **Engine Builder**: Build TensorRT engines locally without downloads
- **Model Converter**: Convert HuggingFace models to TensorRT format
- **QLoRA Training Pipeline**: Fine-tune models with 4-bit quantization

### 📚 Advanced RAG
- **OCR Service**: Multi-model document text extraction
- **Language Extraction**: Tree-sitter based code structure analysis
- **Web Crawl Service**: URL content extraction and processing
- **RAG Ingest Service**: Document chunking, embedding, and vector storage

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SvelteKit     │    │   FastAPI       │    │   Ollama        │
│   Frontend      │◄──►│   Services      │◄──►│   Fallback      │
│                 │    │   (Phase 70)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   ChromaDB      │
│   + pgvector    │    │   + RedisJSON   │    │   Vectors       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| tensorrt-llm-service | 8099 | GPU-accelerated inference with TensorRT |
| pytorch-fallback-service | 8100 | 4-bit quantized PyTorch fallback |
| ocr-service | 8101 | Tesseract-based OCR processing |
| lang-extract-service | 8102 | Tree-sitter code analysis |
| web-crawl-service | 8103 | Web content extraction |
| rag-ingest-service | 8104 | Document processing and embedding |

## Quick Start

### Prerequisites
- Docker with NVIDIA runtime
- NVIDIA GPU (RTX 3060 Ti recommended)
- 16GB+ RAM
- Cached NVIDIA containers (avoiding 80GB+ downloads)

### Deployment

1. **Build and Deploy Phase 70 Services**:
   ```bash
   .\deploy-phase70.ps1 -Action all
   ```

2. **Verify Services**:
   ```bash
   # Check all service health endpoints
   curl http://localhost:8099/health  # TensorRT-LLM
   curl http://localhost:8100/health  # PyTorch Fallback
   curl http://localhost:8101/health  # OCR
   curl http://localhost:8102/health  # Language Extract
   curl http://localhost:8103/health  # Web Crawl
   curl http://localhost:8104/health  # RAG Ingest
   ```

3. **Build TensorRT Engine** (Optional):
   ```bash
   docker exec legal-ai-tensorrt-llm-service python3 engine-builder/build_engine.py
   ```

4. **Generate Training Data**:
   ```bash
   docker exec legal-ai-tensorrt-llm-service python3 training/dataset_builder.py
   ```

5. **Train QLoRA Model**:
   ```bash
   docker exec legal-ai-tensorrt-llm-service python3 training/train_qlora.py
   ```

## API Usage

### TensorRT-LLM Service
```python
import requests

response = requests.post("http://localhost:8099/generate", json={
    "prompt": "Explain legal contract basics",
    "max_tokens": 512,
    "temperature": 0.7
})
print(response.json())
```

### RAG Ingest Service
```python
import requests

# Ingest document
response = requests.post("http://localhost:8104/ingest", json={
    "content": "Legal document text...",
    "metadata": {"source": "contract.pdf"},
    "chunk_size": 1000
})

# Search
response = requests.post("http://localhost:8104/search", json={
    "query": "breach of contract",
    "top_k": 5
})
```

### OCR Service
```python
import requests

with open("document.pdf", "rb") as f:
    response = requests.post("http://localhost:8101/extract", files={"file": f})
print(response.json()["text"])
```

## Configuration

### Environment Variables
```bash
# GPU Configuration
CUDA_VISIBLE_DEVICES=0
TORCH_CUDA_DEVICE=0

# Database
DATABASE_URL=postgresql://legal_admin:123456@postgres:5432/legal_ai_db
REDIS_URL=redis://:redis@redis:6379/0

# OCR
TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata/
```

### Model Configuration
- **Primary Model**: TensorRT-optimized Gemma 3
- **Fallback Model**: 4-bit quantized PyTorch
- **Embedding Model**: sentence-transformers
- **OCR Engine**: Tesseract with multiple languages

## Performance Optimization

### RTX 3060 Ti Specific
- **VRAM Usage**: 8GB max per service
- **Batch Size**: 2-4 tokens for inference
- **Precision**: FP16 for engines, 4-bit for training
- **Memory Management**: Automatic GPU memory cleanup

### Caching Strategy
- **Redis**: API responses and embeddings
- **ChromaDB**: Vector storage with HNSW indexing
- **PostgreSQL**: Structured data with pgvector
- **Local Volumes**: Engine and model persistence

## Troubleshooting

### Common Issues

1. **GPU Memory Errors**:
   ```bash
   # Reduce batch size in service configs
   export TENSORRT_MAX_BATCH=1
   ```

2. **Container Build Failures**:
   ```bash
   # Clear Docker cache
   docker system prune -a
   ```

3. **Service Health Checks Failing**:
   ```bash
   # Check logs
   docker-compose logs tensorrt-llm-service
   ```

### Logs and Monitoring
```bash
# View all service logs
docker-compose logs -f

# Monitor GPU usage
nvidia-smi -l 5

# Check service metrics
curl http://localhost:8099/metrics
```

## Development

### Adding New Services
1. Create service in `python-services/`
2. Add FastAPI endpoints with health checks
3. Update `Dockerfile.trtllm` dependencies
4. Add service to `docker-compose.yml`
5. Update deployment script

### Testing
```bash
# Run service tests
.\deploy-phase70.ps1 -Action test

# Integration testing
docker-compose up -d postgres redis
pytest tests/
```

## Migration from Previous Phases

### Phase 66 → Phase 70
- Services now use Python 3.12 from NVIDIA containers
- Added agentic fallback logic
- Local engine building capability
- Enhanced RAG with multiple data sources

### Data Migration
```bash
# Export existing data
pg_dump legal_ai_db > backup.sql

# Migrate vectors to ChromaDB
python3 scripts/migrate_vectors.py
```

## Security Considerations

- Services run in isolated containers
- GPU access restricted to authorized containers
- Database connections use secure credentials
- API endpoints include basic authentication
- Sensitive data encrypted at rest

## Future Enhancements

- **Phase 71**: Multi-GPU support
- **Phase 72**: Distributed inference
- **Phase 73**: Real-time model updates
- **Phase 74**: Advanced agent orchestration

## Support

For issues or questions:
1. Check service logs: `docker-compose logs <service-name>`
2. Verify GPU status: `nvidia-smi`
3. Test individual endpoints with curl
4. Review configuration files for typos

---

**Phase 70 Complete**: Agentic AI stack with local engine building and advanced RAG capabilities.