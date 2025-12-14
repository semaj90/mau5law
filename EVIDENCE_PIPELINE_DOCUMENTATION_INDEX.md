# Evidence Processing Pipeline - Documentation Index

## Quick Navigation

### 📋 Project Overview
- **[EVIDENCE_PIPELINE_IMPLEMENTATION_MASTER_SUMMARY.md](EVIDENCE_PIPELINE_IMPLEMENTATION_MASTER_SUMMARY.md)** - Master project summary (60% complete)
- **[SESSION_DECEMBER_13_2025_COMPLETION_SUMMARY.md](SESSION_DECEMBER_13_2025_COMPLETION_SUMMARY.md)** - Latest session work summary

### 🎯 Phase Documentation

#### Phase 1: Backend Core Pipeline ✅
- **[EVIDENCE_PIPELINE_PHASE1_FINAL_COMPLETE.md](EVIDENCE_PIPELINE_PHASE1_FINAL_COMPLETE.md)** - Complete Phase 1 documentation
  - Task 1: OCR Module (Tesseract)
  - Task 2: Document Parsing (Docling)
  - Task 3: Semantic Chunking
  - Task 4: Semantic Analysis (Gemma3)
  - Task 5: Embedding Generation
  - Task 6: Progress Monitoring (SSE)
  - Task 7: Error Handling & Recovery

#### Phase 3: API Endpoints ✅
- **[EVIDENCE_PIPELINE_PHASE3_API_COMPLETE.md](EVIDENCE_PIPELINE_PHASE3_API_COMPLETE.md)** - Complete API documentation
  - Upload endpoints
  - Progress endpoints
  - Evidence endpoints
  - Case endpoints
  - Recovery endpoints
  - Health endpoints

#### Phase 5: Database & Storage ✅
- **[EVIDENCE_PIPELINE_PHASE5_COMPLETE.md](EVIDENCE_PIPELINE_PHASE5_COMPLETE.md)** - Database setup documentation
  - PostgreSQL schema
  - MinIO configuration
  - Database migrations

### 🚀 Getting Started
- **[EVIDENCE_PIPELINE_QUICK_START_NEXT_PHASE.md](EVIDENCE_PIPELINE_QUICK_START_NEXT_PHASE.md)** - Quick start for Phase 2
  - What's been done
  - What's next
  - API reference
  - Development checklist

### 📚 Specification Documents
- **[.kiro/specs/evidence-processing-pipeline/requirements.md](.kiro/specs/evidence-processing-pipeline/requirements.md)** - Requirements specification
- **[.kiro/specs/evidence-processing-pipeline/design.md](.kiro/specs/evidence-processing-pipeline/design.md)** - Design document
- **[.kiro/specs/evidence-processing-pipeline/tasks.md](.kiro/specs/evidence-processing-pipeline/tasks.md)** - Task breakdown

---

## Project Structure

```
backend/evidence-pipeline/
├── evidence_pipeline/
│   ├── ocr/                          # Task 1 ✅
│   │   ├── preprocessing.py
│   │   └── tesseract_engine.py
│   ├── parsing/                      # Task 2 ✅
│   │   └── docling_engine.py
│   ├── chunking/                     # Task 3 ✅
│   │   └── semantic_chunker.py
│   ├── analysis/                     # Task 4 ✅
│   │   └── gemma3_analyzer.py
│   ├── embedding/                    # Task 5 ✅
│   │   └── embedding_generator.py
│   ├── progress/                     # Task 6 ✅
│   │   ├── event_manager.py
│   │   ├── metrics.py
│   │   └── rabbitmq_subscriber.py
│   ├── error_handling/               # Task 7 ✅
│   │   ├── recovery.py
│   │   └── middleware.py
│   ├── routes/                       # Phase 3 ✅
│   │   └── api.py
│   ├── storage/
│   ├── queue/
│   ├── vector/
│   ├── database/
│   ├── config.py
│   └── main.py
├── migrations/                       # Phase 5 ✅
└── docker-compose.yml
```

---

## Key Components

### Phase 1: Backend Core

#### OCR Module
- **File**: `backend/evidence-pipeline/evidence_pipeline/ocr/tesseract_engine.py`
- **Purpose**: Extract text from scanned documents and images
- **Features**: Image preprocessing, PDF conversion, confidence scoring, layout preservation

#### Document Parsing
- **File**: `backend/evidence-pipeline/evidence_pipeline/parsing/docling_engine.py`
- **Purpose**: Parse structured documents into semantic elements
- **Features**: Table extraction, metadata extraction, element type distribution

#### Semantic Chunking
- **File**: `backend/evidence-pipeline/evidence_pipeline/chunking/semantic_chunker.py`
- **Purpose**: Split documents into semantic units
- **Features**: Context preservation, small chunk merging, section-based organization

#### Semantic Analysis
- **File**: `backend/evidence-pipeline/evidence_pipeline/analysis/gemma3_analyzer.py`
- **Purpose**: Extract legal entities and concepts
- **Features**: Entity extraction, reference extraction, legal tagging

#### Embedding Generation
- **File**: `backend/evidence-pipeline/evidence_pipeline/embedding/embedding_generator.py`
- **Purpose**: Generate vector embeddings for semantic search
- **Features**: 768-dimensional embeddings, batch processing, retry logic

#### Progress Monitoring
- **Files**: `backend/evidence-pipeline/evidence_pipeline/progress/`
- **Purpose**: Real-time progress tracking via SSE
- **Features**: Event streaming, metrics collection, ETA calculation

#### Error Handling
- **Files**: `backend/evidence-pipeline/evidence_pipeline/error_handling/`
- **Purpose**: Comprehensive error handling and recovery
- **Features**: Retry logic, checkpoints, circuit breaker

### Phase 3: API Endpoints

#### Upload Endpoints
- **POST /api/evidence/upload/initiate** - Get presigned URL
- **POST /api/evidence/{id}/complete** - Complete upload and start processing

#### Progress Endpoints
- **GET /api/evidence/{job_id}/progress** - Get current progress
- **GET /api/evidence/{job_id}/stream** - Stream events via SSE

#### Evidence Endpoints
- **GET /api/evidence/{id}** - Get evidence details
- **GET /api/evidence/case/{case_id}/list** - List evidence
- **DELETE /api/evidence/{id}** - Delete evidence

#### Case Endpoints
- **POST /api/evidence/cases** - Create case
- **GET /api/evidence/cases/{id}** - Get case details

#### Recovery Endpoints
- **POST /api/evidence/{id}/retry** - Retry failed processing

---

## Development Workflow

### Phase 1: Backend Core (✅ Complete)
1. Implement OCR module
2. Implement document parsing
3. Implement semantic chunking
4. Implement semantic analysis
5. Implement embedding generation
6. Implement progress monitoring
7. Implement error handling

### Phase 3: API Endpoints (✅ Complete)
1. Implement upload endpoints
2. Implement progress endpoints
3. Implement evidence endpoints
4. Implement case endpoints
5. Implement recovery endpoints
6. Implement error handling middleware

### Phase 2: Frontend Components (⏳ Next)
1. Create upload components
2. Create service layer
3. Implement state management
4. Integrate with SSE streaming

### Phase 4: Go Services (⏳ Optional)
1. Implement document classifier
2. Implement vector clustering

### Phase 6: Integration & Testing (⏳ Pending)
1. End-to-end integration
2. Unit tests
3. Integration tests
4. Performance tests

---

## API Reference

### Upload Flow
```
1. POST /api/evidence/upload/initiate
   → Get presigned URL

2. PUT {presigned_url}
   → Upload file to MinIO

3. POST /api/evidence/{evidence_id}/complete
   → Complete upload and start processing

4. GET /api/evidence/{job_id}/stream
   → Stream progress events
```

### Event Stream Format
```json
{
  "event_id": "uuid",
  "job_id": "job-uuid",
  "event_type": "stage_progress",
  "stage": "ocr",
  "timestamp": "2025-12-13T10:30:00Z",
  "percentage": 50,
  "eta_seconds": 30,
  "details": "Processing page 5 of 10",
  "metrics": {
    "cpu_percent": 75.5,
    "memory_percent": 60.2,
    "gpu_percent": 85.0
  }
}
```

---

## Performance Targets

### Processing Speed
- OCR: <1s per page
- Docling Parsing: <2s per page
- Semantic Chunking: <100ms per 1000 words
- Gemma3 Analysis: ~1-2s per chunk
- Embedding Generation: ~500ms-1s per chunk

### API Performance
- Upload endpoints: <100ms
- Progress endpoints: <10ms
- Evidence endpoints: <50-100ms
- SSE streaming: <1ms per event

### Scalability
- Concurrent uploads: 5+ without degradation
- GPU utilization: 70%+
- CPU utilization: 60%+

---

## Error Handling

### Error Types
- **Validation Error**: File too large, invalid type
- **Storage Error**: MinIO connection, file not found
- **Processing Error**: OCR failed, parsing failed
- **Recovery Error**: Checkpoint not found, invalid state

### Recovery Strategies
- **Transient Errors**: Retry with exponential backoff
- **Permanent Errors**: Fail fast with clear message
- **Partial Failures**: Continue processing, mark failed items
- **Complete Failure**: Save checkpoint, allow manual retry

---

## Testing Strategy

### Unit Tests
- Component functionality
- Service methods
- Error handling
- State management

### Integration Tests
- Upload flow end-to-end
- Progress streaming
- Error recovery
- Case selection

### Performance Tests
- Large file uploads
- Concurrent uploads
- Progress streaming latency
- Memory usage

---

## Deployment

### Development
```bash
# Backend
cd backend/evidence-pipeline
python -m uvicorn evidence_pipeline.main:app --reload

# Frontend
cd sveltekit-frontend
npm run dev
```

### Production
```bash
# Docker
docker-compose up -d

# Or manual
python -m uvicorn evidence_pipeline.main:app --host 0.0.0.0 --port 8001
npm run build && npm run preview
```

---

## Resources

### Documentation
- [SvelteKit Docs](https://kit.svelte.dev/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
- [IBM Docling](https://github.com/IBM-Research/docling)
- [Qdrant](https://qdrant.tech/documentation/)
- [RabbitMQ](https://www.rabbitmq.com/documentation.html)
- [MinIO](https://min.io/docs/minio/linux/developers/python/)

### Related Specs
- [Evidence Processing Pipeline Spec](.kiro/specs/evidence-processing-pipeline/)
- [Phase 72 Performance Optimization](.kiro/specs/phase72-performance-optimization/)

---

## Status Summary

| Component | Status | Completion |
|-----------|--------|-----------|
| Phase 5: Database | ✅ Complete | 100% |
| Phase 1: Backend | ✅ Complete | 100% |
| Phase 3: API | ✅ Complete | 100% |
| Phase 2: Frontend | ⏳ Pending | 0% |
| Phase 4: Go Services | ⏳ Optional | 0% |
| Phase 6: Testing | ⏳ Pending | 0% |
| **Overall** | **60% Complete** | **60%** |

---

## Quick Links

### For Developers
- [Quick Start Guide](EVIDENCE_PIPELINE_QUICK_START_NEXT_PHASE.md)
- [API Documentation](EVIDENCE_PIPELINE_PHASE3_API_COMPLETE.md)
- [Backend Implementation](EVIDENCE_PIPELINE_PHASE1_FINAL_COMPLETE.md)

### For Project Managers
- [Master Summary](EVIDENCE_PIPELINE_IMPLEMENTATION_MASTER_SUMMARY.md)
- [Session Summary](SESSION_DECEMBER_13_2025_COMPLETION_SUMMARY.md)
- [Requirements](./kiro/specs/evidence-processing-pipeline/requirements.md)

### For Architects
- [Design Document](.kiro/specs/evidence-processing-pipeline/design.md)
- [Architecture Overview](EVIDENCE_PIPELINE_IMPLEMENTATION_MASTER_SUMMARY.md#architecture-overview)
- [Task Breakdown](.kiro/specs/evidence-processing-pipeline/tasks.md)

---

## Contact & Support

For questions or issues:
1. Check the relevant documentation
2. Review the quick start guide
3. Check the error handling guide
4. Review the API documentation

---

**Last Updated**: December 13, 2025
**Project Status**: 60% Complete
**Next Phase**: Phase 2 Frontend Implementation

