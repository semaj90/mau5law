# Task 5: Embedding Generation (Gemma3) - Quick Start

## Overview

Task 5 implements embedding generation using Gemma3 to convert text chunks into 768-dimensional vectors for semantic search and RAG integration.

## What Needs to Be Built

### 1. Gemma3 Embedding Client (`embeddings/gemma3_client.py`)
- Connect to Ollama endpoint
- Generate embeddings for text
- Handle connection failures
- Implement retry logic

**Key Functions:**
- `embed_text(text: str) -> List[float]` - Single embedding
- `embed_batch(texts: List[str]) -> List[List[float]]` - Batch embeddings

### 2. Batch Embedder (`embeddings/batch_embedder.py`)
- Batch multiple texts for efficiency
- Implement retry logic
- Handle partial failures
- Track embedding statistics

**Key Functions:**
- `embed_batch(texts: List[str], batch_size: int = 32) -> List[List[float]]`
- `embed_with_retry(text: str, max_retries: int = 3) -> List[float]`

### 3. Embedding Job Dispatcher (`jobs/embedding_job.py`)
- Load chunks from PostgreSQL
- Generate embeddings in batches
- Store embeddings in PostgreSQL
- Dispatch to indexing queue
- Handle errors and recovery

**Key Functions:**
- `process_embedding_job(job_id, document_id, chunk_ids) -> bool`
- `_generate_embeddings_for_chunks(chunks) -> List[List[float]]`
- `_store_embeddings_in_database(chunk_ids, embeddings) -> bool`

## Input/Output

### Input
- PostgreSQL: `evidence_chunks` table
  - chunk_id, text, document_id, chunk_index
- Ollama endpoint: `http://localhost:11434`
- Model: `embeddinggemma:latest`

### Processing
- Batch chunks (32 at a time)
- Generate 768-dimensional embeddings
- Validate embedding dimensions
- Handle failures with retry

### Output
- PostgreSQL: `evidence_chunks.embedding` column
  - Store 768-dim float array
- MinIO: `embedded/{document_id}/{job_id}/result.json`
  - Save embedding metadata
- Database: `evidence_processing_jobs` (status updated)

## Configuration

```python
# Embedding parameters
EMBEDDING_MODEL = "embeddinggemma:latest"
EMBEDDING_DIMENSION = 768
BATCH_SIZE = 32
MAX_RETRIES = 3
RETRY_BACKOFF = 2  # exponential backoff

# Ollama endpoint
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_TIMEOUT = 60  # seconds
```

## Key Considerations

### Dimension Validation
- Gemma3 embeddings should be exactly 768-dimensional
- Validate each embedding before storing
- Log dimension mismatches

### Batch Processing
- Process chunks in batches of 32
- Reduces API calls and improves throughput
- Handle partial batch failures

### Error Handling
- Retry failed embeddings with exponential backoff
- Skip failed chunks and log errors
- Continue processing remaining chunks

### Performance
- Target: ~10 seconds for 100 chunks
- Batch size: 32 (configurable)
- Parallel processing: 4 workers

## Database Schema

### Update evidence_chunks
```sql
ALTER TABLE evidence_chunks
ADD COLUMN embedding FLOAT8[] NULL;

CREATE INDEX idx_evidence_chunks_embedding
ON evidence_chunks USING ivfflat (embedding vector_cosine_ops);
```

## API Integration

### Ollama Embedding Endpoint
```bash
curl -X POST http://localhost:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model": "embeddinggemma:latest",
    "input": "text to embed"
  }'

Response:
{
  "embedding": [0.1, 0.2, ..., 0.768]  // 768-dimensional
}
```

## Testing

### Manual Test
```bash
# Start Ollama
ollama serve

# In another terminal, pull model
ollama pull embeddinggemma:latest

# Test embedding
curl -X POST http://localhost:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model": "embeddinggemma:latest",
    "input": "This is a legal document"
  }'
```

### Integration Test
```bash
# Upload document (flows through Tasks 1-4)
curl -X POST "http://localhost:8001/api/evidence/upload?case_id=case-123" \
  -F "file=@document.pdf"

# Check chunks in database
psql -U legal_admin -d legal_ai_db -c \
  "SELECT id, chunk_index, text FROM evidence_chunks WHERE document_id = 'doc-uuid' LIMIT 5;"

# After Task 5 completes, check embeddings
psql -U legal_admin -d legal_ai_db -c \
  "SELECT id, chunk_index, array_length(embedding, 1) as embedding_dim FROM evidence_chunks WHERE document_id = 'doc-uuid' LIMIT 5;"
```

## Files to Create

1. `evidence_pipeline/embeddings/__init__.py`
2. `evidence_pipeline/embeddings/gemma3_client.py` (~150 lines)
3. `evidence_pipeline/embeddings/batch_embedder.py` (~150 lines)
4. `evidence_pipeline/jobs/embedding_job.py` (~300 lines)

**Total: 4 files, ~600 lines**

## Dependencies

No new dependencies needed (uses existing):
- aiohttp (for HTTP requests)
- structlog (logging)
- sqlalchemy (database)

## Next Steps After Task 5

1. **Task 6: Vector Indexing (Qdrant)**
   - Index embeddings in Qdrant
   - Store metadata with vectors
   - Enable semantic search

2. **Task 7: Real-Time Progress Monitoring (SSE)**
   - Stream progress events
   - Track processing stages
   - Display real-time updates

## Architecture Update

```
[Task 4] Text Chunking ✅
    ↓
[Task 5] Embedding Generation ⏳ (NEXT)
    ├→ Load chunks from PostgreSQL
    ├→ Generate embeddings (Gemma3)
    ├→ Validate dimensions (768-dim)
    ├→ Store in PostgreSQL
    ├→ Save metadata to MinIO
    └→ Dispatch to indexing queue
    ↓
[Task 6] Vector Indexing (Qdrant)
    ├→ Load embeddings
    ├→ Index in Qdrant
    ├→ Store metadata
    └→ Enable semantic search
```

## Success Criteria

✅ Embeddings are exactly 768-dimensional
✅ All chunks have embeddings stored
✅ Batch processing works efficiently
✅ Retry logic handles failures
✅ Performance target: <10s for 100 chunks
✅ Embeddings are normalized
✅ Error handling is robust

## References

- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
- Gemma3 Model: https://ollama.ai/library/gemma3
- Embedding Gemma: https://ollama.ai/library/embeddinggemma
- PostgreSQL Arrays: https://www.postgresql.org/docs/current/arrays.html

