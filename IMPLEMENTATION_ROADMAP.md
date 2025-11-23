# Implementation Roadmap: Legal AI System

## Overview

This document outlines the complete implementation roadmap for the legal AI system, combining the Granite-Docling worker optimization with SvelteKit evidence upload integration.

**Date**: November 23, 2025
**Status**: Specs Complete, Ready for Implementation

---

## Phase Overview

### Phase 1: Legal Dashboard (✅ COMPLETE)
- Courthouse-themed UI with real-time progress monitoring
- SSE streaming for live updates
- Document thumbnail display
- Fallback alert handling
- **Status**: Implemented and tested

### Phase 2: Processing Pipeline (✅ COMPLETE)
- MinIO integration with parallel streaming
- Page classification (text, table, image, mixed)
- GPU/CPU hybrid pipeline (Granite-Docling + Tesseract)
- Redis caching with 7-day TTL
- **Status**: Implemented and tested

### Phase 3: RAG & Optimization (🔄 IN PROGRESS)
- LangExtract auto-chunking (256-512 tokens)
- RAG preparation (BM25 + semantic ranking)
- Status event emission (SSE streaming)
- TensorRT-LLM migration path
- Windows native build system
- Performance optimization
- **Status**: Specs complete, ready for implementation

### Phase 4: SvelteKit Integration (🔄 READY)
- Evidence upload UI on case pages
- MinIO presigned uploads
- RabbitMQ job dispatch
- Database schema updates (Drizzle ORM)
- Modal flows (case selection, creation, login)
- Real-time progress monitoring
- Search & retrieval integration
- **Status**: Specs complete, ready for implementation

---

## Detailed Implementation Plan

### Phase 3: Granite-Docling Worker (Tasks 8-13)

#### Task 8: LangExtract Auto-Chunker
**Objective**: Implement semantic text chunking at 1000+ chunks/second

**Subtasks**:
- 8.1 Create text chunking engine (256-512 tokens)
- 8.2 Implement parallel chunking (thread pool)
- 8.3 Add structure preservation (page numbers, sections)
- 8.4 Add table preservation (markdown format)
- 8.5 Implement fallback chunking (fixed-size)

**Estimated Time**: 3-4 days
**Dependencies**: Task 4 (Pipeline Manager)
**Output**: Chunks ready for embedding

#### Task 9: RAG Preparation Service
**Objective**: Build BM25 index and semantic embeddings

**Subtasks**:
- 9.1 Create BM25 indexer (1000+ chunks/second)
- 9.2 Create embedding generator (LegalBERT)
- 9.3 Implement R2 ranking (BM25, <100ms)
- 9.4 Implement R3 ranking (semantic)
- 9.5 Add ranking score combination (0.3*R2 + 0.7*R3)

**Estimated Time**: 4-5 days
**Dependencies**: Task 8 (Chunker)
**Output**: Indexed, ranked chunks for retrieval

#### Task 10: Status Event Emission
**Objective**: Stream real-time processing events to dashboard

**Subtasks**:
- 10.1 Create event emitter (ProcessingEvent)
- 10.2 Add metrics collection (GPU/CPU)
- 10.3 Implement dashboard integration (SSE)

**Estimated Time**: 2-3 days
**Dependencies**: All processing tasks
**Output**: Real-time progress visible in dashboard

#### Task 11: TensorRT-LLM Migration Path
**Objective**: Enable 2-5x speedup with graceful fallback

**Subtasks**:
- 11.1 Add model format support (ONNX, SafeTensors)
- 11.2 Add performance logging
- 11.3 Implement engine plan loader
- 11.4 Add engine plan routing

**Estimated Time**: 4-5 days
**Dependencies**: Task 6 (Granite-Docling)
**Output**: Optional TensorRT optimization

#### Task 12: Windows Native Build System
**Objective**: Support MSVC, MinGW, Docker, WSL2

**Subtasks**:
- 12.1 Create MSVC build configuration
- 12.2 Create MinGW build configuration
- 12.3 Add Docker Desktop support
- 12.4 Add WSL2 support (optional)
- 12.5 Add build error handling

**Estimated Time**: 3-4 days
**Dependencies**: Task 1 (Project Setup)
**Output**: Native Windows executables

#### Task 13: Performance Optimization & Tuning
**Objective**: Meet performance targets

**Subtasks**:
- 13.1 Optimize for 50-100 page documents (4-10s)
- 13.2 Optimize for 1-5 page documents (<2s)
- 13.3 Optimize for typical 20-page documents (2-4s)
- 13.4 Optimize GPU utilization (80%+)
- 13.5 Optimize CPU utilization (70%+)

**Estimated Time**: 5-7 days
**Dependencies**: All previous tasks
**Output**: Optimized pipeline meeting targets

**Phase 3 Total**: 21-28 days

---

### Phase 4: SvelteKit Integration (Tasks 1-11)

#### Task 1: Database Schema Setup
**Objective**: Create Drizzle ORM schemas for evidence

**Subtasks**:
- 1.1 Create evidence_files schema
- 1.2 Create evidence_chunks schema
- 1.3 Create evidence_embeddings schema
- 1.4 Create and run migration

**Estimated Time**: 1-2 days
**Dependencies**: None
**Output**: PostgreSQL schema ready

#### Task 2: MinIO Service Layer
**Objective**: Implement S3-compatible storage operations

**Subtasks**:
- 2.1 Create MinIO client wrapper
- 2.2 Implement presigned URL generation
- 2.3 Implement file verification
- 2.4 Implement file operations

**Estimated Time**: 1-2 days
**Dependencies**: Task 1
**Output**: MinIO service ready

#### Task 3: RabbitMQ Service Layer
**Objective**: Implement async job queue operations

**Subtasks**:
- 3.1 Create RabbitMQ connection manager
- 3.2 Implement job dispatch
- 3.3 Implement event subscription
- 3.4 Implement retry logic

**Estimated Time**: 1-2 days
**Dependencies**: Task 1
**Output**: RabbitMQ service ready

#### Task 4: Upload API Endpoints
**Objective**: Create REST endpoints for upload workflow

**Subtasks**:
- 4.1 POST /api/cases/[id]/evidence/upload
- 4.2 POST /api/evidence/[id]/complete
- 4.3 GET /api/evidence/[id]/stream (SSE)
- 4.4 POST /api/cases (Create Case)
- 4.5 Error handling middleware

**Estimated Time**: 2-3 days
**Dependencies**: Tasks 2-3
**Output**: API endpoints ready

#### Task 5: Frontend Components
**Objective**: Create Svelte components for upload UI

**Subtasks**:
- 5.1 EvidenceUploadButton.svelte
- 5.2 CaseSelectModal.svelte
- 5.3 EvidenceUploadModal.svelte
- 5.4 UploadProgressCard.svelte
- 5.5 Authentication flow

**Estimated Time**: 2-3 days
**Dependencies**: Task 4
**Output**: Frontend components ready

#### Task 6: Upload Service Layer
**Objective**: Implement upload orchestration logic

**Subtasks**:
- 6.1 Create uploadEvidenceService.ts
- 6.2 Implement file validation
- 6.3 Implement upload state management
- 6.4 Implement error handling and retry

**Estimated Time**: 1-2 days
**Dependencies**: Tasks 2-4
**Output**: Upload service ready

#### Task 7: Processing Pipeline Integration
**Objective**: Integrate with Granite-Docling worker

**Subtasks**:
- 7.1 Create event listener for RabbitMQ
- 7.2 Implement chunk storage
- 7.3 Implement embedding storage
- 7.4 Implement error handling

**Estimated Time**: 2-3 days
**Dependencies**: Tasks 1, 3, 6
**Output**: Pipeline integration complete

#### Task 8: Search & Retrieval Integration
**Objective**: Enable semantic and keyword search

**Subtasks**:
- 8.1 Create BM25 indexing
- 8.2 Create semantic search
- 8.3 Implement combined ranking
- 8.4 Implement search filtering

**Estimated Time**: 2-3 days
**Dependencies**: Task 7
**Output**: Search functionality ready

#### Task 9: Security & Access Control
**Objective**: Enforce authorization and data protection

**Subtasks**:
- 9.1 Create access control middleware
- 9.2 Implement presigned URL security
- 9.3 Implement data sanitization
- 9.4 Implement rate limiting

**Estimated Time**: 1-2 days
**Dependencies**: Task 4
**Output**: Security layer complete

#### Task 10: Performance Optimization
**Objective**: Optimize for speed and scalability

**Subtasks**:
- 10.1 Optimize database queries
- 10.2 Optimize API response times
- 10.3 Optimize frontend performance
- 10.4 Monitor performance metrics

**Estimated Time**: 1-2 days
**Dependencies**: Tasks 4-9
**Output**: Performance optimized

#### Task 11: Dashboard Integration
**Objective**: Connect to Legal Dashboard for monitoring

**Subtasks**:
- 11.1 Create SSE event streaming
- 11.2 Create metrics collection
- 11.3 Integrate with existing dashboard

**Estimated Time**: 1-2 days
**Dependencies**: Tasks 4, 7
**Output**: Dashboard integration complete

**Phase 4 Total**: 17-24 days

---

## Timeline

### Recommended Execution Order

```
Week 1-2: Phase 3 Tasks 8-9 (Chunking + RAG)
├─ Task 8: LangExtract Chunker (3-4 days)
└─ Task 9: RAG Preparation (4-5 days)

Week 2-3: Phase 3 Tasks 10-11 (Events + TensorRT)
├─ Task 10: Status Events (2-3 days)
└─ Task 11: TensorRT Migration (4-5 days)

Week 3-4: Phase 3 Tasks 12-13 (Build + Optimization)
├─ Task 12: Windows Build (3-4 days)
└─ Task 13: Performance Tuning (5-7 days)

Week 4-5: Phase 4 Tasks 1-6 (Database + API + Frontend)
├─ Task 1: Database Schema (1-2 days)
├─ Task 2: MinIO Service (1-2 days)
├─ Task 3: RabbitMQ Service (1-2 days)
├─ Task 4: API Endpoints (2-3 days)
├─ Task 5: Frontend Components (2-3 days)
└─ Task 6: Upload Service (1-2 days)

Week 5-6: Phase 4 Tasks 7-11 (Integration + Polish)
├─ Task 7: Pipeline Integration (2-3 days)
├─ Task 8: Search Integration (2-3 days)
├─ Task 9: Security (1-2 days)
├─ Task 10: Performance (1-2 days)
└─ Task 11: Dashboard Integration (1-2 days)

Week 6: Testing & Deployment
├─ End-to-end testing
├─ Performance benchmarking
├─ Documentation
└─ Production deployment
```

**Total Timeline**: 6-7 weeks

---

## Success Metrics

### Phase 3 Completion
- ✅ LangExtract chunking at 1000+ chunks/second
- ✅ RAG preparation with BM25 + semantic ranking
- ✅ Status events streaming to dashboard
- ✅ TensorRT migration path available
- ✅ Windows native builds working
- ✅ Performance targets met:
  - 1-5 page documents: <2 seconds
  - 20-page documents: 2-4 seconds
  - 50-100 page documents: 4-10 seconds
  - GPU utilization: 80%+
  - CPU utilization: 70%+

### Phase 4 Completion
- ✅ Evidence upload working end-to-end
- ✅ Real-time progress visible in dashboard
- ✅ Evidence searchable via semantic search
- ✅ Evidence searchable via keyword search
- ✅ All error cases handled gracefully
- ✅ Security and access control enforced
- ✅ Performance targets met:
  - API endpoints: <100ms response time
  - Concurrent uploads: 10+ without degradation
  - Large files: 100MB+ supported

---

## Key Integration Points

### Granite-Docling Worker → SvelteKit
```
1. User uploads evidence from case page
2. SvelteKit generates presigned MinIO URL
3. Frontend uploads directly to MinIO
4. SvelteKit dispatches RabbitMQ job
5. Worker processes document
6. Worker emits status events (SSE)
7. Dashboard shows real-time progress
8. Worker stores chunks + embeddings
9. Evidence becomes searchable
```

### Existing Infrastructure Leverage
- PostgreSQL pgvector for semantic search
- Redis for caching and session management
- RabbitMQ for async job processing
- MinIO for document storage
- Ollama + TensorRT-LLM for AI services
- Legal Dashboard for monitoring

---

## Risk Mitigation

### Technical Risks
1. **Large file uploads**: Implement chunked uploads, resumable transfers
2. **Processing failures**: Retry logic, fallback mechanisms, error logging
3. **Database performance**: Connection pooling, query optimization, indexing
4. **Real-time streaming**: SSE fallback, polling alternative, connection recovery

### Operational Risks
1. **Service dependencies**: Health checks, graceful degradation, fallback services
2. **Data loss**: Backup strategy, transaction management, audit logging
3. **Security breaches**: Access control, rate limiting, input validation
4. **Performance degradation**: Monitoring, alerting, auto-scaling

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete Phase 3 TODO documentation
2. ✅ Complete codebase exploration
3. ✅ Create SvelteKit Integration spec
4. 🔄 Begin Phase 3 Task 8 (LangExtract Chunker)

### Short Term (Next 2 Weeks)
1. Complete Phase 3 Tasks 8-9 (Chunking + RAG)
2. Begin Phase 3 Tasks 10-11 (Events + TensorRT)
3. Start Phase 4 Task 1 (Database Schema)

### Medium Term (Weeks 3-4)
1. Complete Phase 3 Tasks 10-13
2. Complete Phase 4 Tasks 1-6
3. Begin Phase 4 Tasks 7-11

### Long Term (Weeks 5-6)
1. Complete Phase 4 Tasks 7-11
2. End-to-end testing
3. Performance benchmarking
4. Production deployment

---

## Documentation

### Completed Specs
- ✅ `.kiro/specs/granite-docling-worker-optimized/requirements.md`
- ✅ `.kiro/specs/granite-docling-worker-optimized/design.md`
- ✅ `.kiro/specs/granite-docling-worker-optimized/tasks.md`
- ✅ `.kiro/specs/legal-dashboard-progress-ui/requirements.md`
- ✅ `.kiro/specs/legal-dashboard-progress-ui/design.md`
- ✅ `.kiro/specs/legal-dashboard-progress-ui/tasks.md`
- ✅ `.kiro/specs/sveltekit-evidence-upload-integration/requirements.md`
- ✅ `.kiro/specs/sveltekit-evidence-upload-integration/design.md`
- ✅ `.kiro/specs/sveltekit-evidence-upload-integration/tasks.md`

### Supporting Documentation
- ✅ `PHASE_3_TODO.md` - Phase 3 implementation guide
- ✅ `CODEBASE_EXPLORATION_SUMMARY.md` - Existing infrastructure analysis
- ✅ `IMPLEMENTATION_ROADMAP.md` - This document

---

## Resources

### Documentation Links
- Granite-Docling: https://github.com/ibm-granite/granite-docling
- LangExtract: https://github.com/langextract/langextract
- LegalBERT: https://huggingface.co/nlpaueb/legal-bert-base-uncased
- TensorRT-LLM: https://github.com/NVIDIA/TensorRT-LLM
- PostgreSQL pgvector: https://github.com/pgvector/pgvector
- SvelteKit: https://kit.svelte.dev/
- Drizzle ORM: https://orm.drizzle.team/

### Existing Codebase
- Legal Dashboard: `sveltekit-frontend/src/routes/dashboard/legal-progress/`
- RAG Ranking System: `src/lib/services/rag-ranking-system.ts`
- PostgreSQL Vector Storage: `src/lib/services/postgresql-vector-storage.ts`
- Docker Compose: `sveltekit-frontend/docker-compose.full.yml`

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Ready for Implementation
