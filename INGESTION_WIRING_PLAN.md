# Complete Document Ingestion & Search Wiring Plan
**YoRHa Detective System - Phase 34-77 Integration**

## Stack Configuration

### Infrastructure Layer
- **PostgreSQL 17** with pgvector extension
- **Drizzle ORM 0.44** for type-safe database operations
- **MinIO** for S3-compatible object storage (buckets)
- **Redis** for caching and session management
- **Qdrant** for vector search (mirrored with pgvector)
- **Docker** containers for all services

### AI/ML Layer
- **Primary**: `gemma3-legal:latest` via Ollama (getOllamaEndpoint())
- **Future**: TensorRT-LLM (Triton) for production
- **OCR**: Tesseract.js + GPU acceleration
- **Embeddings**: `embeddinggemma:latest` (384 dims)

## Architecture Flow

```
Upload (Frontend)
  ↓
MinIO Bucket Storage
  ↓
OCR Worker (if PDF/image)
  ↓
Text Extraction + Chunking
  ↓
Embedding Generation (Ollama)
  ↓
Dual Storage:
  ├─→ PostgreSQL 17 + pgvector (primary)
  └─→ Qdrant (mirror for fast similarity search)
  ↓
Redis Cache Layer
  ↓
Search API (v1-v4 endpoints)
```

## Wiring Checklist

### [ ] Phase 1: Database Setup (Drizzle + pgvector)
1. Enable pgvector extension
2. Create enhanced schema with vector columns
3. Set up Drizzle migrations
4. Create indexes (HNSW for vectors)

### [ ] Phase 2: MinIO Integration
1. Configure bucket policies
2. Wire upload endpoints
3. Implement file streaming
4. Add presigned URL generation

### [ ] Phase 3: OCR Pipeline
1. PDF → image conversion
2. Tesseract OCR processing
3. Text extraction service
4. Queue management (RabbitMQ optional)

### [ ] Phase 4: Embedding Generation
1. Connect to Ollama (`getOllamaEndpoint()`)
2. Implement batch embedding
3. Add retry logic
4. Cache embeddings in Redis

### [ ] Phase 5: Vector Storage
1. pgvector insertion
2. Qdrant mirroring
3. Metadata enrichment
4. Deduplication (content hash)

### [ ] Phase 6: Search API Unification
1. Wire v1/evidence/search
2. Wire v2/vector-pipeline
3. Wire v3/chat with RAG
4. Wire v4/enhanced-rag
5. Phase 34-77 semantic search

### [ ] Phase 7: Frontend Integration
1. Update Evidence Board UI
2. Wire Command Center search
3. Add real-time status updates
4. Implement AI Legal Assistant chat

## File Map

### Backend Services
- `backend/services/document_ingestion_service.py`
- `backend/services/ocr_service.py`
- `backend/services/embedding_service.py`
- `backend/services/vector_search_service.py`

### SvelteKit API Routes
- `src/routes/api/v1/upload/+server.ts` (MinIO)
- `src/routes/api/v1/embeddings/+server.ts` (Ollama)
- `src/routes/api/v1/vector/search/+server.ts` (pgvector/Qdrant)
- `src/routes/api/v2/vector-pipeline/+server.ts` (unified)
- `src/routes/api/v3/chat/+server.ts` (RAG chat)
- `src/routes/api/yorha/legal-data/+server.ts` (YoRHa UI)

### Frontend Components
- `src/lib/components/upload/MinIOUpload.svelte`
- `src/routes/yorha/detective/+page.svelte` (Command Center)
- `src/routes/evidence-board/+page.svelte` (Evidence Board)

## Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://legal_admin:123456@postgres:5432/legal_ai_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5434

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_LEGAL_DOCS=legal-documents

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# OCR
TESSERACT_PATH=/usr/bin/tesseract
OCR_LANGUAGE=eng
OCR_DPI=300
```

## API Endpoints to Wire

### Upload & Ingestion
```
POST /api/v1/upload/presigned → Generate MinIO upload URL
POST /api/v1/upload → Direct upload to MinIO
POST /api/v1/documents/upload-embed → Upload + auto-embed
POST /api/v1/evidence/upload → Evidence-specific upload
POST /api/rag/documents/upload → RAG ingestion
```

### Embedding & Vector Operations
```
POST /api/v1/embeddings → Generate embeddings (Ollama)
POST /api/v1/vector/search → pgvector similarity search
POST /api/v2/vector-pipeline → Unified vector ops
GET  /api/v1/vector/health → Vector DB health
```

### Search (Phase 34-77)
```
POST /api/search-pgvector → PostgreSQL vector search
POST /api/semantic-search → Enhanced semantic search
POST /api/enhanced-search → Multi-modal search
POST /api/yorha/legal-data → YoRHa UI search
GET  /api/v1/evidence/search/[endpoint] → Evidence search
```

### Chat & RAG
```
POST /api/chat → Streaming chat with RAG
POST /api/v3/chat → Advanced chat with routing
POST /api/yorha/chat → YoRHa AI assistant
POST /api/ai/chat → AI chat handler
```

## Next Implementation Steps

1. **Start Services**:
   ```bash
   docker-compose up -d postgres redis qdrant minio
   npm run postgres:start
   npm run redis:start
   ```

2. **Run Migrations**:
   ```bash
   cd sveltekit-frontend
   npm run db:generate
   npm run db:migrate
   ```

3. **Test Ollama Connection**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

4. **Verify MinIO**:
   ```bash
   curl http://localhost:9000/minio/health/live
   ```

5. **Create Test Upload**:
   ```bash
   node tools/test-upload-pipeline.mjs
   ```

## Performance Targets

- **Upload**: < 2s for 10MB PDF
- **OCR**: < 5s per page
- **Embedding**: < 100ms per chunk
- **Vector Search**: < 50ms for top-10 results
- **End-to-End**: < 15s from upload to searchable

## Monitoring

- pgvector index stats
- MinIO bucket metrics
- Redis cache hit rate
- Ollama inference latency
- Qdrant collection size
