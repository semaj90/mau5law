# Codebase Exploration Summary

## Overview
This document summarizes the existing infrastructure, components, and integration points discovered in the legal AI codebase.

**Date**: November 23, 2025
**Scope**: SvelteKit Frontend, Docker Infrastructure, RAG Components, Database Schema

---

## 1. Docker Infrastructure

### Location
- `sveltekit-frontend/docker-compose.full.yml` (Primary)
- Multiple variants: `docker-compose.ai-stack.yml`, `docker-compose.pgvector-gpu.yml`, etc.

### Services Running
```
PostgreSQL 17 + pgvector (Vector Database)
├─ Port: 5432
├─ Database: legal_ai_db
├─ User: legal_admin
└─ Features: Vector embeddings, JSONB storage

Redis 7 (Cache)
├─ Port: 6379
├─ Max Memory: 2GB
├─ Policy: allkeys-lru
└─ Auth: redis

MinIO (Object Storage)
├─ Port: 9000 (API), 9001 (Console)
├─ User: minioadmin
├─ Password: minioadmin123
└─ Features: S3-compatible storage

Qdrant (Vector Database Alternative)
├─ Port: 6333 (API), 6334 (gRPC)
└─ Features: Vector similarity search

Ollama (AI Service)
├─ Port: 11434
├─ GPU: NVIDIA GPU support
└─ Features: Model serving, embeddings

TensorRT-LLM (Optimized Inference)
├─ Port: 8000
├─ GPU: NVIDIA GPU support
└─ Features: Optimized model inference

FastAPI RAG Backend
├─ Port: 8005
├─ Framework: FastAPI
└─ Features: RAG orchestration

RabbitMQ (Message Queue)
├─ Port: 5672 (AMQP), 15672 (Management)
├─ User: admin
├─ Password: admin123
└─ Features: Job queue, async processing
```

### Environment Variables (FastAPI Service)
```
DATABASE_URL: postgresql://legal_admin:123456@postgres:5432/legal_ai_db
REDIS_URL: redis://:redis@redis:6379/0
MINIO_URL: http://minio:9000
MINIO_ACCESS_KEY: minioadmin
MINIO_SECRET_KEY: minioadmin123
QDRANT_URL: http://qdrant:6333
OLLAMA_URL: http://ollama:11434
OLLAMA_EMBED_ENDPOINT: http://ollama:11434/api/embed
TRT_LLM_ENDPOINT: http://tensorrt-llm:8000/api/infer
```

---

## 2. Existing RAG Components

### RAG Ranking System
**File**: `src/lib/services/rag-ranking-system.ts`

**Features**:
- Multi-factor ranking algorithm
- Legal domain hierarchy support
- Source authority scoring
- Recency-based scoring
- Content quality assessment
- User expertise alignment
- Search intent matching

**Ranking Components**:
- Cosine similarity (35%)
- Legal domain relevance (25%)
- Content quality (15%)
- Authority score (10%)
- Document recency (10%)
- Context match (5%)

**Key Methods**:
- `rankResults()` - Rank search results with comprehensive scoring
- `calculateRankingComponents()` - Individual component scoring
- `generateAnalytics()` - Ranking performance analytics
- `adaptWeights()` - Adaptive weight adjustment based on user feedback
- `healthCheck()` - Service health verification

### PostgreSQL Vector Storage
**File**: `src/lib/services/postgresql-vector-storage.ts`

**Features**:
- JSONB metadata storage with GIN indexing
- Vector similarity search with HNSW indexes
- Document chunk management
- Full-text search support
- QLoRA training data export
- Storage statistics and analytics

**Key Tables**:
- `legal_documents_jsonb` - Main document storage with embeddings
- `document_chunks` - Document chunks with embeddings
- `vector_embeddings` - Vector storage
- `evidence_vectors` - Evidence-specific vectors
- `case_embeddings_optimized` - Case-specific embeddings

**Key Methods**:
- `storeDocuments()` - Store vectorized documents
- `semanticSearch()` - Vector similarity search with filtering
- `searchChunks()` - Search document chunks
- `exportForQLoRATraining()` - Export training data
- `getStorageStatistics()` - Storage analytics
- `healthCheck()` - Service health verification

**Indexes Created**:
- JSONB GIN indexes for metadata queries
- HNSW vector indexes for similarity search
- Full-text search indexes
- Composite indexes for common patterns

---

## 3. Evidence & Document Components

### Evidence-Related Files Found
```
sveltekit-frontend/src_fixed/
├─ evidence-store.ts
├─ evidence-unified.ts
├─ evidence-unified-fixed.ts
├─ evidence-stream.ts
├─ ws-evidence-server.ts
├─ webgpu-evidence-graph.ts
└─ webasm-evidence-pipeline.ts

Database Migrations:
└─ drizzle/20251121_add_evidence_board_connections.sql
```

### Evidence Schema (Inferred)
- Evidence files with metadata
- Evidence board connections
- Evidence relationships
- Evidence streaming support
- WebGPU/WebAssembly pipeline support

---

## 4. Existing API Routes & Services

### Workflow Orchestration
**File**: `src/routes/api/workflow/orchestrate/+server.ts`

**Services Integrated**:
- Document Processor
- Gemma Embedding Service
- RAG Ranking System
- PostgreSQL Vector Storage

**Workflow Steps**:
1. Store Documents
2. Generate Statistics
3. Perform Vector Search
4. Rank Results
5. Check Ranking System
6. Check Vector Storage

### QLoRA Training Export
**File**: `src/routes/api/training/qlora/+server.ts`

**Features**:
- Export training data from storage
- Generate training examples
- Support filtering by document type, practice area, confidence
- Create instruction-input-output triplets

### Agent Tools
**File**: `src/agents/tools.ts`

**RAG Lookup Tool**:
- Query vector embeddings
- Recall previous fixes
- Support topK parameter
- Integration with agent system

---

## 5. Database Schema

### Key Tables (Inferred from Code)
```
legal_documents_jsonb
├─ id: UUID
├─ title: String
├─ content: Text
├─ metadata: JSONB (document_type, practice_area, jurisdiction, etc.)
├─ title_embedding: Vector
├─ content_embedding: Vector
├─ created_at: Timestamp
└─ updated_at: Timestamp

document_chunks
├─ id: UUID
├─ document_id: UUID (FK)
├─ chunk_index: Integer
├─ content: Text
├─ embedding: Vector
├─ metadata: JSONB (chunk_type, legal_concepts, entities, etc.)
└─ created_at: Timestamp

vector_embeddings
├─ id: UUID
├─ document_id: UUID
├─ embedding: Vector
└─ metadata: JSONB

evidence_vectors
├─ id: UUID
├─ evidence_id: UUID
├─ embedding: Vector
└─ metadata: JSONB

case_embeddings_optimized
├─ id: UUID
├─ case_id: UUID
├─ embedding: Vector
└─ metadata: JSONB
```

### Metadata Structure (JSONB)
```json
{
  "document_type": "case-law|contract|statute|regulation",
  "practice_area": "contract-law|tort-law|criminal-law|etc",
  "jurisdiction": "federal|state|international",
  "confidentiality_level": "public|confidential|restricted",
  "urgency": "normal|high|critical",
  "source": "supreme-court|federal-appellate|etc",
  "legal_area": "string",
  "date_extracted": "ISO8601",
  "word_count": "number",
  "confidence_score": "0.0-1.0",
  "processing_status": "pending|processing|completed|failed",
  "tags": ["string"],
  "ai_metadata": {
    "model_used": "string",
    "embedding_model": "string",
    "processing_time_ms": "number",
    "chunk_count": "number"
  }
}
```

---

## 6. Embedding & AI Services

### Gemma Embedding Service
**File**: `src/lib/services/gemma-embedding-service.ts`

**Features**:
- Generate semantic embeddings
- Support for legal domain models
- Batch embedding generation
- Embedding caching

### Ollama Integration
**Endpoint**: `http://ollama:11434`
**Embed Endpoint**: `http://ollama:11434/api/embed`

**Features**:
- Model serving
- Embedding generation
- GPU acceleration support

### TensorRT-LLM Integration
**Endpoint**: `http://tensorrt-llm:8000/api/infer`

**Features**:
- Optimized inference
- GPU acceleration
- Model optimization

---

## 7. MinIO Configuration

### Bucket Structure (Inferred)
```
MinIO (http://minio:9000)
├─ evidence/ (Evidence documents)
├─ cases/ (Case-related documents)
├─ documents/ (General documents)
└─ [custom buckets]
```

### Access Credentials
- Root User: minioadmin
- Root Password: minioadmin123
- Endpoint: http://minio:9000
- Console: http://minio:9001

---

## 8. Redis Configuration

### Connection
- Host: redis
- Port: 6379
- Password: redis
- Max Memory: 2GB
- Eviction Policy: allkeys-lru

### Usage Patterns
- Cache OCR results (7-day TTL)
- Session storage
- Rate limiting
- Job queue state

---

## 9. RabbitMQ Configuration

### Connection
- Host: rabbitmq
- Port: 5672 (AMQP)
- Management Port: 15672
- User: admin
- Password: admin123

### Usage Patterns
- Document processing jobs
- Async task queue
- Event streaming
- Worker coordination

---

## 10. Legal Dashboard Integration

### Location
`sveltekit-frontend/src/routes/dashboard/legal-progress/`

### Features
- Real-time progress monitoring
- SSE streaming support
- Courthouse-themed UI
- Document thumbnail display
- Fallback alert handling

### Components
- ProgressCard.svelte
- DocumentThumbnailTray.svelte
- FallbackAlert.svelte

### Stores
- SSEStatusStore.ts
- DocumentProgressStore.ts
- GrpcStatusAdapter.ts

---

## 11. Existing Routes & Pages

### Case Management
- `/cases/[id]` - Case detail page
- `/cases` - Case list page

### Evidence Management
- `/evidence` - Evidence list
- `/evidence/upload` - Evidence upload (inferred)

### Dashboard
- `/dashboard/legal-progress` - Legal progress dashboard

### API Routes
- `/api/workflow/orchestrate` - Workflow orchestration
- `/api/training/qlora` - QLoRA training export
- `/api/cases` - Case CRUD operations (inferred)
- `/api/evidence` - Evidence operations (inferred)

---

## 12. Integration Points for Granite-Docling Worker

### Immediate Integration
1. **Document Upload** → MinIO
   - Bucket: `lawpdfs/cases/<caseId>/` or `documents/evidence/<uuid>/`
   - Trigger: RabbitMQ job queue

2. **Processing Pipeline** → Worker
   - Input: Document from MinIO
   - Processing: GPU/CPU pipeline
   - Output: OCR text + chunks

3. **RAG Preparation** → PostgreSQL
   - Store chunks in `document_chunks`
   - Generate embeddings
   - Index with pgvector

4. **Status Events** → Legal Dashboard
   - SSE streaming
   - Real-time progress updates
   - Metrics collection

### Future Integration
1. **Neo4j Citation Graph** - Cross-case linking
2. **Real-ESRGAN** - Image upscaling
3. **SAM** - ROI segmentation
4. **SOM** - Signature detection

---

## 13. Key Findings

### Strengths
✅ Comprehensive Docker infrastructure
✅ PostgreSQL pgvector for vector search
✅ Multi-factor RAG ranking system
✅ Redis caching layer
✅ RabbitMQ for async processing
✅ Ollama + TensorRT-LLM for AI
✅ Legal Dashboard for monitoring
✅ JSONB metadata for flexibility

### Gaps
❌ No document chunking service (LangExtract needed)
❌ No embedding generation pipeline
❌ No BM25 keyword indexing
❌ No status event streaming from workers
❌ No Windows native build system
❌ No TensorRT optimization path

### Integration Opportunities
🔗 Granite-Docling Worker → MinIO → RabbitMQ → PostgreSQL
🔗 Status Events → Legal Dashboard (SSE)
🔗 Embeddings → PostgreSQL pgvector
🔗 Ranking → RAG Ranking System
🔗 Caching → Redis

---

## 14. Recommended Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SvelteKit Frontend                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Evidence Upload UI (/cases/[id]/evidence/upload)   │   │
│  │  ├─ Case Selection Modal                            │   │
│  │  ├─ File Upload Component                           │   │
│  │  └─ Progress Tracking                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (SvelteKit)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/cases/[id]/evidence/upload               │   │
│  │  ├─ MinIO presigned upload                          │   │
│  │  ├─ RabbitMQ job dispatch                           │   │
│  │  └─ Database insert (evidence_files)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Storage & Queue                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MinIO: lawpdfs/cases/<caseId>/<filename>           │   │
│  │  RabbitMQ: document.process.queue                   │   │
│  │  PostgreSQL: evidence_files table                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Granite-Docling Worker (Python)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Fetch from MinIO                                │   │
│  │  2. Page Classification                             │   │
│  │  3. GPU/CPU Pipeline                                │   │
│  │  4. OCR + Structure Extraction                       │   │
│  │  5. Emit Status Events (SSE)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RAG Pipeline                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. LangExtract Chunking                             │   │
│  │  2. BM25 Indexing                                    │   │
│  │  3. Embedding Generation (LegalBERT)                │   │
│  │  4. PostgreSQL Storage (pgvector)                    │   │
│  │  5. RAG Ranking (R2 + R3)                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Legal Dashboard                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Real-time Progress Monitoring (SSE)                │   │
│  │  ├─ Processing Stage                                │   │
│  │  ├─ Progress Percentage                             │   │
│  │  ├─ GPU/CPU Metrics                                 │   │
│  │  └─ Document Thumbnails                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 15. Next Steps

### Phase 3 Implementation
1. Continue with Tasks 8-13 in granite-docling-worker
2. Implement LangExtract chunking
3. Build RAG preparation service
4. Add status event streaming

### SvelteKit Integration Phase
1. Create evidence upload UI
2. Implement MinIO presigned uploads
3. Add RabbitMQ job dispatch
4. Update Drizzle ORM schema
5. Implement modal flows

### Testing & Deployment
1. End-to-end testing
2. Performance benchmarking
3. Windows build system
4. Production deployment

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Next Review**: After Phase 3 Task 8 completion
