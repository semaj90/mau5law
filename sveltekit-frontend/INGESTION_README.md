# YoRHa Detective System - Document Ingestion & Search Pipeline
**Complete Integration: SvelteKit + Drizzle ORM 0.44 + PostgreSQL 17 + pgvector + MinIO + Ollama**

## 🎯 What's Been Wired

### ✅ Backend Infrastructure
1. **PostgreSQL 17 + pgvector** - Vector database with HNSW indexes
2. **Drizzle ORM 0.44** - Type-safe database operations
3. **MinIO** - S3-compatible object storage for PDFs/documents
4. **Redis** - Caching layer for embeddings and sessions
5. **Qdrant** - Optional vector search mirror
6. **Ollama** - Local LLM inference (gemma3-legal:latest, embeddinggemma:latest)

### ✅ API Endpoints Created
```
POST /api/v1/ingest/unified      → Unified ingestion (new, recommended)
POST /api/v1/ingest              → Go service proxy (existing)
POST /api/rag/ingest             → Batch RAG ingestion (existing)
GET  /api/v1/ingest/unified      → Health check + statistics
POST /api/search-pgvector        → Vector similarity search
```

### ✅ Database Schema
- `ingested_documents` - Document metadata + MinIO references
- `document_chunks` - Semantic chunks with vector(384) embeddings
- `embedding_cache_enhanced` - Deduplication cache
- `ocr_processing_queue` - OCR job queue
- `vector_search_logs` - Search analytics
- `document_summaries` - AI-generated summaries

### ✅ Processing Pipeline
```
Upload → MinIO Storage → OCR (if needed) → Text Extraction
  ↓
Semantic Chunking (overlap: 200 chars)
  ↓
Embedding Generation (Ollama: embeddinggemma:latest, 384 dims)
  ↓
Dual Storage:
  ├─→ PostgreSQL + pgvector (HNSW index)
  └─→ Qdrant mirror (optional)
  ↓
Redis Cache Layer
```

## 🚀 Quick Start

### 1. Start Required Services

```bash
# PostgreSQL
npm run postgres:start

# Redis
npm run redis:start

# Ollama
ollama serve
ollama pull gemma3-legal:latest
ollama pull embeddinggemma:latest

# MinIO (via Docker)
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### 2. Run Database Migration

```bash
cd sveltekit-frontend

# Apply pgvector migration
psql -U legal_admin -d legal_ai_db -f drizzle/migrations/001_enable_pgvector_ingestion.sql

# Or use Drizzle directly
npm run db:migrate
```

### 3. Start the Application

```bash
cd sveltekit-frontend
npm run dev
```

### 4. Run End-to-End Test

```bash
cd sveltekit-frontend
node scripts/test-ingestion-pipeline.mjs
```

Expected output:
```
╔══════════════════════════════════════════════════════════╗
║  YoRHa Document Ingestion Pipeline - End-to-End Test   ║
╚══════════════════════════════════════════════════════════╝

=== Testing Ollama Connection ===
✅ Ollama connected
   Available models: 2
   ✅ embeddinggemma model found

=== Testing Health Check ===
✅ Health check passed
   Documents: 0
   Chunks: 0

=== Testing Document Ingestion ===
✅ Document ingested successfully
   Document ID: abc123...
   Chunks created: 12
   Embeddings generated: 12
   Processing time: 2847ms
   PostgreSQL: stored
   pgvector: indexed

═══════════════════════════════════════
TEST SUMMARY
═══════════════════════════════════════
✅ ollama         PASSED
✅ health         PASSED
✅ ingestion      PASSED
✅ duplicate      PASSED
✅ search         PASSED

Total: 5/5 tests passed
```

## 📝 Usage Examples

### Ingest a Document

```javascript
// JavaScript/TypeScript
const response = await fetch('http://localhost:5173/api/v1/ingest/unified', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "Your legal document text here...",
    filename: "motion-to-suppress.txt",
    mimeType: "text/plain",
    caseId: "uuid-here", // optional
    metadata: {
      documentType: "legal_brief",
      court: "Superior Court"
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   document: { id: "...", chunksCount: 12, ... },
//   processing: { processingTimeMs: 2847, ... },
//   storage: { postgres: "stored", pgvector: "indexed" }
// }
```

```bash
# curl
curl-X POST http://localhost:5173/api/v1/ingest/unified \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Legal document content...",
    "filename": "document.txt",
    "mimeType": "text/plain"
  }'
```

### Search Documents

```bash
curl -X POST http://localhost:5173/api/search-pgvector \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Fourth Amendment search warrant",
    "topK": 5,
    "threshold": 0.7
  }'
```

## 🔧 Configuration

### Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5434

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_LEGAL_DOCS=legal-documents

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest

# Qdrant (optional)
QDRANT_URL=http://localhost:6333
```

### Drizzle Configuration

File: `sveltekit-frontend/drizzle.config.ts`
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema-ingestion.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## 🎨 Frontend Integration

### Evidence Board Upload
```svelte
<script>
import { MinIOUpload } from '$lib/components/upload';

async function handleUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify({
    caseId: currentCaseId,
    uploadedBy: userId
  }));

  const response = await fetch('/api/v1/ingest/unified', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (result.success) {
    toast.success(`Ingested ${result.document.chunksCount} chunks`);
  }
}
</script>

<MinIOUpload on:upload={handleUpload} />
```

### YoRHa Command Center Search
```svelte
<script>
let searchQuery = '';
let results = [];

async function handleSearch() {
  const response = await fetch('/api/search-pgvector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: searchQuery,
      topK: 10,
      threshold: 0.6
    })
  });

  const data = await response.json();
  results = data.results;
}
</script>

<input bind:value={searchQuery} on:keyup={(e) => e.key === 'Enter' && handleSearch()} />
{#each results as result}
  <div class="result">
    <h3>{result.title}</h3>
    <p>Similarity: {(result.similarity * 100).toFixed(1)}%</p>
    <p>{result.content.substring(0, 200)}...</p>
  </div>
{/each}
```

## 📊 Performance Metrics

### Target Performance
- **Upload**: < 2s for 10MB PDF
- **OCR**: < 5s per page
- **Embedding**: < 100ms per chunk
- **Vector Search**: < 50ms for top-10 results
- **End-to-End**: < 15s from upload to searchable

### Monitoring Queries
```sql
-- Document statistics
SELECT
  COUNT(*) as total_documents,
  SUM((metadata->>'chunks_count')::int) as total_chunks,
  AVG(text_length) as avg_text_length
FROM ingested_documents;

-- Embedding cache hit rate
SELECT
  SUM(hit_count) as total_hits,
  COUNT(*) as unique_embeddings,
  AVG(hit_count) as avg_hits_per_embedding
FROM embedding_cache_enhanced;

-- Search performance
SELECT
  AVG(search_duration_ms) as avg_search_ms,
  MAX(search_duration_ms) as max_search_ms,
  AVG(results_count) as avg_results
FROM vector_search_logs
WHERE created_at > NOW() - INTERVAL '1 day';
```

## 🐛 Troubleshooting

### pgvector Extension Not Found
```sql
-- Enable manually
CREATE EXTENSION vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Ollama Not Responding
```bash
# Check if running
curl http://localhost:11434/api/tags

# Pull models
ollama pull gemma3-legal:latest
ollama pull embeddinggemma:latest

# Verify models
ollama list
```

### MinIO Connection Issues
```bash
# Check MinIO health
curl http://localhost:9000/minio/health/live

# Access MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin
```

### Database Connection
```bash
# Test connection
psql -U legal_admin -h localhost -p 5434 -d legal_ai_db

# Check tables
\dt

# Check pgvector
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

## 📚 Next Steps

1. **Frontend Wiring** ✅ (Ready to implement)
   - Update Evidence Board to use new API
   - Wire Command Center search
   - Add real-time upload progress

2. **OCR Integration** (Phase 2)
   - PDF → image conversion
   - Tesseract OCR processing
   - Queue management

3. **Citations & Images** (Phase 3)
   - Google Custom Search API
   - Gemma3 VLM for image analysis
   - Citation extraction and verification

4. **Production Deployment** (Phase 4)
   - TensorRT-LLM integration
   - Load balancing
   - Monitoring & alerting

## 🔗 Related Files

- Schema: `src/lib/server/db/schema-ingestion.ts`
- API: `src/routes/api/v1/ingest/unified/+server.ts`
- Migration: `drizzle/migrations/001_enable_pgvector_ingestion.sql`
- Test: `scripts/test-ingestion-pipeline.mjs`
- Wiring Plan: `../INGESTION_WIRING_PLAN.md`
- Progress: `../ERROR_REDUCTION_PROGRESS.md`

---

**Status**: ✅ Core pipeline complete and ready for production testing
**Last Updated**: 2025-11-29
**Maintainer**: YoRHa Detective System Team
