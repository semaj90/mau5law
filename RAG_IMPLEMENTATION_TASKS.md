# RAG Service Implementation Tasks

**Date:** November 23, 2025
**Status:** Ready for Implementation
**Total Subtasks:** 24
**Estimated Time:** 12 hours

---

## Phase 1: Document Upload & Storage (2 hours)

### 1.1 SvelteKit Upload Component
- [ ] Create `/src/routes/cases/[id]/evidence/upload/+page.svelte`
- [ ] Implement drag-and-drop file input
- [ ] Add file type validation (PDF, PNG, JPG, TIFF, SCAN)
- [ ] Add file size validation (max 50MB)
- [ ] Show upload progress bar
- [ ] Display upload status messages
- [ ] Store upload metadata in component state
- [ ] Redirect to case view on success

**Files to Create:**
- `sveltekit-frontend/src/routes/cases/[id]/evidence/upload/+page.svelte`
- `sveltekit-frontend/src/routes/cases/[id]/evidence/upload/+page.server.ts`

### 1.2 MinIO Integration
- [ ] Create MinIO bucket structure
  - [ ] `evidence/` - General evidence
  - [ ] `lawpdfs/` - Legal documents
  - [ ] `cases/{id}/` - Case-specific
- [ ] Implement MinIO client in Go
- [ ] Create upload endpoint
- [ ] Generate presigned URLs
- [ ] Store minio_path in PostgreSQL
- [ ] Implement bucket lifecycle policies

**Files to Create:**
- `go-microservice/pkg/minio/client.go`
- `go-microservice/pkg/minio/upload.go`

### 1.3 RabbitMQ Message Queue
- [ ] Create RabbitMQ connection pool
- [ ] Define `process_document` queue
- [ ] Implement message publisher
- [ ] Add retry logic (3 retries)
- [ ] Add dead-letter queue
- [ ] Implement message consumer
- [ ] Add error handling

**Files to Create:**
- `go-microservice/pkg/rabbitmq/publisher.go`
- `go-microservice/pkg/rabbitmq/consumer.go`

---

## Phase 2: Document Processing Pipeline (3 hours)

### 2.1 ImageMagick Preprocessing
- [ ] Install ImageMagick in Docker
- [ ] Create preprocessing service
- [ ] Implement resize to 768px (long dimension)
- [ ] Implement PDF splitting
- [ ] Handle format conversion
- [ ] Cache intermediate files
- [ ] Add error handling

**Files to Create:**
- `go-microservice/pkg/imagemagick/processor.go`
- `go-microservice/cmd/document-processor/imagemagick.go`

### 2.2 Real-ESRGAN Enhancement
- [ ] Load Real-ESRGAN XS model
- [ ] Detect low-confidence ROI
- [ ] Implement upscaling
- [ ] Compare original vs upscaled
- [ ] Store upscaled versions
- [ ] Add GPU memory management

**Files to Create:**
- `go-microservice/cmd/document-processor/esrgan.go`
- `python_codebase/document_processing/esrgan_upscaler.py`

### 2.3 SAM Segmentation
- [ ] Load SAM model
- [ ] Implement ROI detection
- [ ] Segment: signatures, seals, text blocks, tables
- [ ] Generate ROI masks
- [ ] Store coordinates in metadata
- [ ] Cache segmentation results

**Files to Create:**
- `python_codebase/document_processing/sam_segmentation.py`
- `go-microservice/cmd/document-processor/sam.go`

### 2.4 Granite-Docling Parser (Primary)
- [ ] Load Granite-Docling model (258M)
- [ ] Implement GPU availability check
- [ ] Parse document with DocTags output
- [ ] Extract: text, tables, layout, structure
- [ ] Handle multi-page documents
- [ ] Implement error handling
- [ ] Add performance monitoring

**Files to Create:**
- `python_codebase/document_processing/granite_docling_parser.py`
- `go-microservice/cmd/document-processor/granite.go`

### 2.5 Tesseract Fallback (CPU)
- [ ] Install Tesseract in Docker
- [ ] Implement Tesseract wrapper
- [ ] Detect GPU unavailability
- [ ] Fall back gracefully
- [ ] Mark chunk with `fallback = true`
- [ ] Schedule retry when GPU available
- [ ] Ensure no user blocking

**Files to Create:**
- `go-microservice/cmd/document-processor/tesseract.go`
- `python_codebase/document_processing/tesseract_fallback.py`

---

## Phase 3: Content Processing (2 hours)

### 3.1 LangExtract Integration
- [ ] Implement text chunking
- [ ] Extract entities: persons, statutes, agencies
- [ ] Clean and normalize text
- [ ] Preserve DocTags metadata
- [ ] Handle special characters
- [ ] Implement chunk overlap

**Files to Create:**
- `go-microservice/pkg/langextract/chunker.go`
- `go-microservice/pkg/langextract/entity_extractor.go`

### 3.2 Gemma-3 Vision 12B Embeddings
- [ ] Load Gemma-3 Vision 12B model
- [ ] Implement embedding generation
- [ ] Generate 512-dimensional embeddings
- [ ] Include legal context
- [ ] Batch processing for efficiency
- [ ] Cache embeddings
- [ ] Add GPU memory management

**Files to Create:**
- `python_codebase/embeddings/gemma3_vision_embedder.py`
- `go-microservice/cmd/document-processor/embeddings.go`

### 3.3 Neo4j Graph Building
- [ ] Create Document node
- [ ] Create Chunk nodes
- [ ] Extract and create Entity nodes
- [ ] Build relationships
- [ ] Index for fast traversal
- [ ] Implement batch operations
- [ ] Add error handling

**Files to Create:**
- `go-microservice/pkg/neo4j/graph_builder.go`
- `go-microservice/pkg/neo4j/entity_extractor.go`

### 3.4 Storage & Indexing
- [ ] Store chunks in PostgreSQL + pgvector
- [ ] Create pgvector indexes
- [ ] Cache vectors in Redis
- [ ] Index in Qdrant (vision embeddings)
- [ ] Archive WebP in MinIO
- [ ] Implement batch inserts
- [ ] Add transaction handling

**Files to Create:**
- `go-microservice/pkg/storage/postgres_store.go`
- `go-microservice/pkg/storage/redis_cache.go`
- `go-microservice/pkg/storage/qdrant_store.go`

---

## Phase 4: RAG Search API (2 hours)

### 4.1 Case-Scoped Search
- [ ] Create gRPC service definition
- [ ] Implement pgvector search with case_id filter
- [ ] Retrieve related entities from Neo4j
- [ ] Rank by relevance
- [ ] Format results
- [ ] Add pagination
- [ ] Implement caching

**Files to Create:**
- `proto/rag-search-service.proto`
- `go-microservice/cmd/rag-search-service/case_search.go`

### 4.2 Global Playground Search
- [ ] Implement global search without case filter
- [ ] Apply privacy filters
- [ ] Redact private content
- [ ] Return public chunks only
- [ ] Add scope filtering
- [ ] Implement result ranking
- [ ] Add caching

**Files to Create:**
- `go-microservice/cmd/rag-search-service/global_search.go`

### 4.3 Multi-Source Search
- [ ] Query pgvector (text)
- [ ] Query Qdrant (vision)
- [ ] Query Neo4j (graph)
- [ ] Combine results
- [ ] Re-rank by relevance
- [ ] Deduplicate results
- [ ] Format combined response

**Files to Create:**
- `go-microservice/cmd/rag-search-service/multi_search.go`

### 4.4 Search Optimization
- [ ] Implement Redis caching
- [ ] Add query result caching
- [ ] Optimize Neo4j queries
- [ ] Add pagination
- [ ] Implement result limiting
- [ ] Add performance monitoring
- [ ] Implement query logging

**Files to Create:**
- `go-microservice/pkg/search/optimizer.go`
- `go-microservice/pkg/search/cache_manager.go`

---

## Phase 5: Evidence Analysis (2 hours)

### 5.1 Signature/Seal Recognition
- [ ] Use SOM C++ for clustering
- [ ] Match signatures across documents
- [ ] Identify seal patterns
- [ ] Flag anomalies
- [ ] Store signature metadata
- [ ] Implement comparison scoring
- [ ] Add visualization support

**Files to Create:**
- `go-microservice/cmd/evidence-analyzer/signature_matcher.go`
- `cpp-legal-autoencoder/signature_clustering.cpp`

### 5.2 Table Extraction & Analysis
- [ ] Extract table structure (TEDS 0.82 → 0.97)
- [ ] Parse table content
- [ ] Store in structured format
- [ ] Enable table-specific search
- [ ] Implement table visualization
- [ ] Add table comparison
- [ ] Store table metadata

**Files to Create:**
- `go-microservice/cmd/evidence-analyzer/table_extractor.go`
- `python_codebase/evidence_analysis/table_parser.py`

### 5.3 Entity Relationship Analysis
- [ ] Extract persons, agencies, statutes
- [ ] Build relationship graph
- [ ] Identify key actors
- [ ] Track case references
- [ ] Implement entity linking
- [ ] Add entity disambiguation
- [ ] Store entity relationships

**Files to Create:**
- `go-microservice/cmd/evidence-analyzer/entity_analyzer.go`
- `go-microservice/pkg/neo4j/relationship_builder.go`

### 5.4 Legal Context Understanding
- [ ] Identify applicable statutes
- [ ] Link to case law
- [ ] Extract legal principles
- [ ] Provide semantic context
- [ ] Implement legal reasoning
- [ ] Add precedent linking
- [ ] Store legal context

**Files to Create:**
- `go-microservice/cmd/evidence-analyzer/legal_context.go`
- `python_codebase/evidence_analysis/legal_reasoner.py`

---

## Phase 6: Integration & Testing (1 hour)

### 6.1 End-to-End Testing
- [ ] Test upload flow
- [ ] Test document processing
- [ ] Test search functionality
- [ ] Test fallback scenarios
- [ ] Test error handling
- [ ] Test concurrent uploads
- [ ] Test large files

**Files to Create:**
- `go-microservice/cmd/rag-service/tests/e2e_test.go`

### 6.2 Performance Testing
- [ ] Benchmark Granite-Docling
- [ ] Benchmark Tesseract fallback
- [ ] Measure embedding generation
- [ ] Measure search latency
- [ ] Load test search API
- [ ] Memory profiling
- [ ] GPU utilization monitoring

**Files to Create:**
- `go-microservice/cmd/rag-service/tests/benchmark_test.go`

### 6.3 Error Handling
- [ ] Handle corrupted files
- [ ] Handle GPU unavailability
- [ ] Handle parsing failures
- [ ] Implement retry logic
- [ ] Add circuit breakers
- [ ] Implement graceful degradation
- [ ] Add error logging

**Files to Create:**
- `go-microservice/pkg/errors/rag_errors.go`

### 6.4 Documentation
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Performance tuning guide
- [ ] Configuration guide
- [ ] Example queries
- [ ] Architecture diagrams

**Files to Create:**
- `docs/RAG_API.md`
- `docs/RAG_DEPLOYMENT.md`
- `docs/RAG_TROUBLESHOOTING.md`

---

## Database Schema Implementation

### Create PostgreSQL Tables
```sql
-- Run init-rag.sql
CREATE TABLE rag_documents (...)
CREATE TABLE rag_chunks (...)
CREATE TABLE rag_entities (...)
CREATE TABLE rag_processing_jobs (...)
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops);
```

### Create Neo4j Indexes
```cypher
CREATE INDEX document_id FOR (d:Document) ON (d.id);
CREATE INDEX chunk_id FOR (c:Chunk) ON (c.id);
CREATE INDEX entity_type FOR (e:Entity) ON (e.type);
```

### Create Qdrant Collection
```bash
# Create collection for vision embeddings
curl -X PUT http://localhost:6333/collections/legal_evidence \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 512,
      "distance": "Cosine"
    }
  }'
```

---

## Docker Configuration

### Add to docker-compose.grpc.yml
```yaml
services:
  # Document Processor
  document-processor:
    build:
      context: ./go-microservice
      dockerfile: Dockerfile.document-processor
    environment:
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
      MINIO_ENDPOINT: minio:9000
      DATABASE_URL: postgres://...
    depends_on:
      - rabbitmq
      - minio
      - postgres

  # RAG Search Service
  rag-search-service:
    build:
      context: ./go-microservice
      dockerfile: Dockerfile.rag-search
    ports:
      - "50054:50054"
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://redis:6379
      NEO4J_URL: bolt://neo4j:7687
      QDRANT_URL: http://qdrant:6333
    depends_on:
      - postgres
      - redis
      - neo4j
      - qdrant

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"

  # Qdrant
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
```

---

## Implementation Checklist

### Phase 1: Upload & Storage
- [ ] SvelteKit upload component
- [ ] MinIO integration
- [ ] RabbitMQ setup

### Phase 2: Processing Pipeline
- [ ] ImageMagick preprocessing
- [ ] Real-ESRGAN enhancement
- [ ] SAM segmentation
- [ ] Granite-Docling parser
- [ ] Tesseract fallback

### Phase 3: Content Processing
- [ ] LangExtract integration
- [ ] Gemma-3 Vision embeddings
- [ ] Neo4j graph building
- [ ] Storage & indexing

### Phase 4: Search API
- [ ] Case-scoped search
- [ ] Global playground search
- [ ] Multi-source search
- [ ] Search optimization

### Phase 5: Evidence Analysis
- [ ] Signature/seal recognition
- [ ] Table extraction
- [ ] Entity analysis
- [ ] Legal context

### Phase 6: Testing & Docs
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Error handling
- [ ] Documentation

---

## Success Criteria

- [x] Architecture designed
- [x] Database schema defined
- [x] Search modes specified
- [ ] All 24 subtasks completed
- [ ] Performance targets met
- [ ] End-to-end testing passed
- [ ] Documentation complete
- [ ] Production ready

---

**Status:** Ready for Implementation
**Total Subtasks:** 24
**Estimated Time:** 12 hours
**Complexity:** High

---

**Created By:** Kiro AI Assistant
**Date:** November 23, 2025
