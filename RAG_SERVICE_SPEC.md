# Legal-AI RAG Service Specification

**Date:** November 23, 2025
**Status:** Architecture & Implementation Plan
**Vision Model:** Gemma-3 Vision 12B (gemma3-legal:latest)
**Document Parser:** Granite-Docling (258M parameters)
**Fallback OCR:** Tesseract CPU

---

## Executive Summary

Build a production-grade RAG (Retrieval-Augmented Generation) service that:
- Parses legal documents with Granite-Docling (primary) + Tesseract fallback
- Extracts structure, tables, signatures, seals, and entities
- Searches across MinIO buckets, PostgreSQL, and Neo4j
- Supports case-scoped and global playground modes
- Integrates with Gemma-3 Vision 12B for semantic understanding

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ SvelteKit Frontend (Evidence Upload)                        │
│ ├─ /cases/:id/evidence/upload                              │
│ └─ /rag/playground (global search)                          │
└────────────────┬────────────────────────────────────────────┘
                 │ File Upload
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ MinIO Object Storage                                        │
│ ├─ evidence/ (case evidence)                                │
│ ├─ lawpdfs/ (legal documents)                               │
│ └─ cases/{id}/ (case-specific)                              │
└────────────────┬────────────────────────────────────────────┘
                 │ RabbitMQ Message
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Document Processing Pipeline                               │
│ ├─ ImageMagick (resize/split)                              │
│ ├─ Real-ESRGAN XS (upscale low-confidence)                 │
│ ├─ SAM (ROI segmentation)                                  │
│ ├─ Granite-Docling (primary parser)                        │
│ └─ Tesseract (CPU fallback)                                │
└────────────────┬────────────────────────────────────────────┘
                 │ Parsed Content
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Content Processing                                          │
│ ├─ LangExtract (chunking + entity extraction)              │
│ ├─ Gemma-3 Vision 12B (semantic embeddings)                │
│ └─ Neo4j (entity/citation graph)                           │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┼────────┬────────┐
        ▼        ▼        ▼        ▼
    ┌────────┐┌────────┐┌────────┐┌────────┐
    │pgvector││Redis   ││Qdrant  ││Neo4j
    │(text)  ││(cache) ││(vision)││(graph)
    └────────┘└────────┘└────────┘└────────┘
        │        │        │        │
        └────────┼────────┼────────┘
                 ▼
        ┌─────────────────┐
        │ RAG Search API  │
        │ (gRPC + HTTP)   │
        └─────────────────┘
```

---

## Document Processing Pipeline

### Stage 1: Input Preparation
- **ImageMagick:** Resize long dimension to ~768px (Granite-Docling recommendation)
- **Split:** Multi-page documents into manageable chunks
- **Validation:** Check file type, size, corruption

### Stage 2: Enhancement (Conditional)
- **Real-ESRGAN XS:** Upscale only low-confidence ROI (evidence stamps, seals)
- **SAM:** Segment regions of interest (signatures, seals, text blocks)
- **SOM C++:** Static clustering for matching seals/signatures

### Stage 3: Primary Parsing
- **Granite-Docling (GPU):**
  - OCR + layout preservation
  - Table structure recognition (TEDS 0.82 → 0.97)
  - Math and code handling
  - DocTags format output
  - Fallback to Tesseract if GPU busy

### Stage 4: Content Extraction
- **LangExtract:** Chunking, cleaning, entity extraction
- **Gemma-3 Vision 12B:** Semantic embeddings + legal context
- **Neo4j:** Build entity/citation graph

### Stage 5: Storage & Indexing
- **PostgreSQL + pgvector:** Text chunks + embeddings
- **Redis:** Vector cache for fast retrieval
- **Qdrant:** Vision embeddings + auto-tagging
- **MinIO:** WebP evidence archive

---

## Database Schema

### PostgreSQL Tables

#### rag_documents
```sql
CREATE TABLE rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    user_id UUID NOT NULL,
    minio_path VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255),
    document_type VARCHAR(50), -- pdf, image, scan
    file_size_bytes BIGINT,
    page_count INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id)
);
```

#### rag_chunks
```sql
CREATE TABLE rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    case_id UUID,
    chunk_index INT,
    text TEXT NOT NULL,
    embedding vector(512),
    metadata JSONB, -- DocTags, coordinates, page_num
    fallback BOOLEAN DEFAULT false, -- Tesseract used
    privacy ENUM('public', 'private') DEFAULT 'private',
    scope VARCHAR(50), -- 'global' or 'case:id'
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (document_id) REFERENCES rag_documents(id),
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id)
);

CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_rag_chunks_case_id ON rag_chunks(case_id);
CREATE INDEX idx_rag_chunks_scope ON rag_chunks(scope);
```

#### rag_entities
```sql
CREATE TABLE rag_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL,
    entity_type VARCHAR(50), -- person, statute, agency, case_ref
    entity_text VARCHAR(255),
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id)
);
```

#### rag_processing_jobs
```sql
CREATE TABLE rag_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    status VARCHAR(50), -- pending, processing, completed, failed
    parser_used VARCHAR(50), -- granite-docling, tesseract
    error_message TEXT,
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES rag_documents(id)
);
```

### Neo4j Graph Schema

#### Nodes
- **Document** - Parsed document
- **Chunk** - Text chunk
- **Entity** - Person, statute, agency, case reference
- **Statute** - Legal statute/law
- **Case** - Legal case reference
- **Agency** - Government/legal agency
- **Concept** - Legal concept/principle

#### Relationships
- `DOCUMENT_HAS_CHUNK` - Document contains chunk
- `CHUNK_MENTIONS_ENTITY` - Chunk mentions entity
- `ENTITY_CITES_STATUTE` - Entity cites statute
- `ENTITY_REFERENCES_CASE` - Entity references case
- `STATUTE_APPLIES_TO_CASE` - Statute applies to case
- `CASE_REFERENCES_CASE` - Case references another case
- `ENTITY_WORKS_FOR_AGENCY` - Entity works for agency

---

## RAG Search Modes

### Mode 1: Case-Scoped Search
```
GET /api/rag/cases/:caseId/search?q=query
- Searches only within case_id
- Full access to all chunks
- Returns: chunks + entities + related cases
```

### Mode 2: Global Playground
```
GET /api/rag/search?q=query&scope=global
- Searches across all documents
- Respects privacy settings
- Redacts private case content
- Returns: public chunks + entities
```

### Mode 3: Multi-Source Search
```
GET /api/rag/search/multi?q=query&sources=pgvector,qdrant,neo4j
- Searches pgvector (text)
- Searches Qdrant (vision)
- Searches Neo4j (graph)
- Combines and re-ranks results
```

---

## Implementation Subtasks

### Phase 1: Document Upload & Storage (2 hours)

#### 1.1 SvelteKit Upload Component
- [ ] Create `/cases/:id/evidence/upload` page
- [ ] Implement file drag-and-drop
- [ ] Show upload progress
- [ ] Validate file type/size
- [ ] Store metadata in PostgreSQL

#### 1.2 MinIO Integration
- [ ] Create bucket structure: `evidence/`, `lawpdfs/`, `cases/{id}/`
- [ ] Implement upload to MinIO
- [ ] Generate presigned URLs
- [ ] Store minio_path in rag_documents

#### 1.3 RabbitMQ Message Queue
- [ ] Create `process_document` queue
- [ ] Publish message on upload
- [ ] Include document_id, minio_path, case_id
- [ ] Add retry logic

### Phase 2: Document Processing Pipeline (3 hours)

#### 2.1 ImageMagick Preprocessing
- [ ] Resize long dimension to 768px
- [ ] Split multi-page PDFs
- [ ] Convert to standard format
- [ ] Store intermediate files

#### 2.2 Real-ESRGAN Enhancement
- [ ] Detect low-confidence ROI
- [ ] Upscale with Real-ESRGAN XS
- [ ] Preserve original for comparison
- [ ] Cache upscaled versions

#### 2.3 SAM Segmentation
- [ ] Segment regions of interest
- [ ] Identify: signatures, seals, text blocks, tables
- [ ] Generate ROI masks
- [ ] Store coordinates in metadata

#### 2.4 Granite-Docling Parser (Primary)
- [ ] Load Granite-Docling model (258M)
- [ ] Check GPU availability
- [ ] Parse document with DocTags output
- [ ] Extract: text, tables, layout, structure
- [ ] Handle parsing errors gracefully

#### 2.5 Tesseract Fallback (CPU)
- [ ] Detect GPU unavailability
- [ ] Fall back to Tesseract
- [ ] Mark chunk with `fallback = true`
- [ ] Schedule retry when GPU available
- [ ] Ensure no user blocking

### Phase 3: Content Processing (2 hours)

#### 3.1 LangExtract Integration
- [ ] Chunk text intelligently
- [ ] Extract entities: persons, statutes, agencies
- [ ] Clean and normalize text
- [ ] Preserve DocTags metadata

#### 3.2 Gemma-3 Vision 12B Embeddings
- [ ] Load Gemma-3 Vision 12B model
- [ ] Generate semantic embeddings (512-dim)
- [ ] Include legal context
- [ ] Cache embeddings

#### 3.3 Neo4j Graph Building
- [ ] Create Document node
- [ ] Create Chunk nodes
- [ ] Extract and create Entity nodes
- [ ] Build relationships
- [ ] Index for fast traversal

#### 3.4 Storage & Indexing
- [ ] Store chunks in PostgreSQL + pgvector
- [ ] Cache vectors in Redis
- [ ] Index in Qdrant (vision embeddings)
- [ ] Archive WebP in MinIO

### Phase 4: RAG Search API (2 hours)

#### 4.1 Case-Scoped Search
- [ ] Query pgvector with case_id filter
- [ ] Retrieve related entities from Neo4j
- [ ] Rank by relevance
- [ ] Return formatted results

#### 4.2 Global Playground Search
- [ ] Query pgvector without case filter
- [ ] Apply privacy filters
- [ ] Redact private content
- [ ] Return public chunks only

#### 4.3 Multi-Source Search
- [ ] Query pgvector (text)
- [ ] Query Qdrant (vision)
- [ ] Query Neo4j (graph)
- [ ] Combine results
- [ ] Re-rank by relevance

#### 4.4 Search Optimization
- [ ] Implement Redis caching
- [ ] Add query result caching
- [ ] Optimize Neo4j queries
- [ ] Add pagination

### Phase 5: Evidence Analysis (2 hours)

#### 5.1 Signature/Seal Recognition
- [ ] Use SOM C++ for clustering
- [ ] Match signatures across documents
- [ ] Identify seal patterns
- [ ] Flag anomalies

#### 5.2 Table Extraction & Analysis
- [ ] Extract table structure (TEDS 0.82 → 0.97)
- [ ] Parse table content
- [ ] Store in structured format
- [ ] Enable table-specific search

#### 5.3 Entity Relationship Analysis
- [ ] Extract persons, agencies, statutes
- [ ] Build relationship graph
- [ ] Identify key actors
- [ ] Track case references

#### 5.4 Legal Context Understanding
- [ ] Identify applicable statutes
- [ ] Link to case law
- [ ] Extract legal principles
- [ ] Provide semantic context

### Phase 6: Integration & Testing (1 hour)

#### 6.1 End-to-End Testing
- [ ] Test upload flow
- [ ] Test document processing
- [ ] Test search functionality
- [ ] Test fallback scenarios

#### 6.2 Performance Testing
- [ ] Benchmark Granite-Docling
- [ ] Benchmark Tesseract fallback
- [ ] Measure embedding generation
- [ ] Measure search latency

#### 6.3 Error Handling
- [ ] Handle corrupted files
- [ ] Handle GPU unavailability
- [ ] Handle parsing failures
- [ ] Implement retry logic

#### 6.4 Documentation
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

---

## Configuration

### Granite-Docling Settings
```yaml
model: granite-docling-258m
input_size: 768px (long dimension)
output_format: DocTags
table_recognition: TEDS 0.82 → 0.97
fallback_engine: tesseract
gpu_required: true
```

### Gemma-3 Vision Settings
```yaml
model: gemma3-legal:12b
embedding_dimension: 512
context_window: 4096
quantization: fp16
gpu_required: true
```

### Storage Settings
```yaml
pgvector_dimension: 512
redis_cache_ttl: 3600
qdrant_collection: legal_evidence
minio_bucket_prefix: evidence/
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Document Upload | <5s | MinIO storage |
| Granite-Docling Parse | 30-60s | Per document |
| Tesseract Fallback | 10-20s | CPU only |
| Embedding Generation | 5-10s | Per document |
| Search Query | <100ms | pgvector + cache |
| Graph Query | <200ms | Neo4j |
| Multi-source Search | <500ms | Combined |

---

## Success Criteria

- [x] Architecture designed
- [x] Database schema defined
- [x] Search modes specified
- [ ] Document upload implemented
- [ ] Processing pipeline built
- [ ] Search API created
- [ ] Evidence analysis working
- [ ] Performance targets met
- [ ] End-to-end testing passed
- [ ] Documentation complete

---

## Vision Model Confirmation

**Selected:** Gemma-3 Vision 12B (gemma3-legal:latest)

**Rationale:**
- Best trade-off between cost & forensic accuracy
- Understands tables, stamps, signatures, layout
- Works with TRT-LLM optimized build
- Supports RAG + semantic reasoning
- Multimodal re-ranking capable

---

**Status:** Ready for Implementation
**Estimated Time:** 12 hours total
**Complexity:** High (multi-component system)
