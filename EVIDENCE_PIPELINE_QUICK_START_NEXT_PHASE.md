# Evidence Processing Pipeline - Quick Start for Phase 2

## What's Been Done ✅

### Phase 1: Backend Core (100% Complete)
- ✅ OCR Module (Tesseract) - `backend/evidence-pipeline/evidence_pipeline/ocr/`
- ✅ Document Parsing (Docling) - `backend/evidence-pipeline/evidence_pipeline/parsing/`
- ✅ Semantic Chunking - `backend/evidence-pipeline/evidence_pipeline/chunking/`
- ✅ Semantic Analysis (Gemma3) - `backend/evidence-pipeline/evidence_pipeline/analysis/`
- ✅ Embedding Generation - `backend/evidence-pipeline/evidence_pipeline/embedding/`
- ✅ Progress Monitoring (SSE) - `backend/evidence-pipeline/evidence_pipeline/progress/`
- ✅ Error Handling & Recovery - `backend/evidence-pipeline/evidence_pipeline/error_handling/`

### Phase 3: API Endpoints (100% Complete)
- ✅ Upload endpoints (initiate, complete)
- ✅ Progress endpoints (get, stream SSE)
- ✅ Evidence endpoints (get, list, delete)
- ✅ Case endpoints (create, get)
- ✅ Recovery endpoints (retry)
- ✅ Health endpoints

### Phase 5: Database & Storage (100% Complete)
- ✅ PostgreSQL schema with pgvector
- ✅ MinIO bucket configuration
- ✅ Database migrations
- ✅ Bootstrap script

---

## What's Next: Phase 2 Frontend

### Phase 2 Tasks (2-3 days)

#### Task 8: SvelteKit Upload Components
**Location**: `sveltekit-frontend/src/lib/components/evidence/`

**Components to Create**:
1. **EvidenceUploadButton.svelte**
   - Display upload button on case pages
   - Handle click to open upload modal
   - Support both case-scoped and homepage uploads

2. **EvidenceUploadModal.svelte**
   - File selection (drag & drop + click)
   - Validate file type and size
   - Display upload progress
   - Handle upload cancellation

3. **UploadProgressCard.svelte**
   - Display processing stage
   - Show progress percentage
   - Display ETA countdown
   - Show metrics (GPU/CPU utilization)
   - Handle error display with retry option

4. **CaseSelectModal.svelte**
   - Display case search bar
   - Show recent cases list
   - Implement "Create New Case" button
   - Handle case selection and creation

#### Task 9: Upload Service Layer
**Location**: `sveltekit-frontend/src/lib/services/`

**Service to Create**: `uploadEvidenceService.ts`
```typescript
// Methods to implement:
export async function initiateUpload(
  caseId: string,
  filename: string,
  fileSize: number,
  contentType: string
): Promise<UploadInitiation>

export async function completeUpload(
  evidenceId: string,
  checksum?: string
): Promise<UploadCompletion>

export async function getUploadStatus(jobId: string): Promise<UploadStatus>

export async function streamProcessingEvents(
  jobId: string,
  onEvent: (event: ProcessingEvent) => void
): Promise<void>

export async function validateFile(
  file: File
): Promise<ValidationResult>
```

---

## API Reference for Frontend

### Upload Flow

```typescript
// 1. Initiate upload
const initResponse = await fetch('/api/evidence/upload/initiate', {
  method: 'POST',
  params: {
    case_id: 'case-123',
    filename: 'document.pdf',
    file_size: 1024000,
    content_type: 'application/pdf'
  }
});

const { evidence_id, job_id, presigned_url } = await initResponse.json();

// 2. Upload file to MinIO
await fetch(presigned_url, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'application/pdf' }
});

// 3. Complete upload
const completeResponse = await fetch(`/api/evidence/${evidence_id}/complete`, {
  method: 'POST'
});

const { job_id } = await completeResponse.json();

// 4. Stream progress
const eventSource = new EventSource(`/api/evidence/${job_id}/stream`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.percentage}%`);
};
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/evidence/upload/initiate` | POST | Get presigned URL |
| `/api/evidence/{id}/complete` | POST | Complete upload |
| `/api/evidence/{job_id}/progress` | GET | Get current progress |
| `/api/evidence/{job_id}/stream` | GET | Stream events (SSE) |
| `/api/evidence/{id}` | GET | Get evidence details |
| `/api/evidence/case/{case_id}/list` | GET | List evidence |
| `/api/evidence/cases` | POST | Create case |
| `/api/evidence/{id}/retry` | POST | Retry failed processing |

---

## Event Stream Format

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

## File Validation Rules

- **Max Size**: 100MB
- **Allowed Types**: PDF, PNG, JPG, TIFF, DOCX
- **Validation**: Check extension and MIME type

---

## State Management

### Upload State
```typescript
interface UploadState {
  evidenceId: string;
  jobId: string;
  filename: string;
  fileSize: number;
  uploadProgress: number;
  processingStage: string;
  processingPercentage: number;
  eta: number | null;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error: string | null;
  metrics: {
    cpu: number;
    memory: number;
    gpu: number;
  };
}
```

### Case State
```typescript
interface CaseState {
  caseId: string;
  name: string;
  caseType: string;
  description?: string;
  createdAt: string;
  evidenceCount: number;
}
```

---

## Error Handling

### Error Types
- **Validation Error**: File too large, invalid type
- **Upload Error**: Network error, storage error
- **Processing Error**: OCR failed, parsing failed
- **Recovery Error**: Checkpoint not found

### Error Response
```json
{
  "error": "Error message",
  "stage": "upload",
  "recoverable": true,
  "details": {}
}
```

### Retry Logic
- Automatic retry for transient errors
- Manual retry button for permanent errors
- Show error message and recovery options

---

## Integration Points

### With Existing Components
- **EvidenceBoard.svelte**: Display uploaded evidence
- **TagSelector.svelte**: Tag evidence with legal metadata
- **Admin Audit Page**: View processing history

### With Existing Services
- **RAG Ranking System**: Search uploaded evidence
- **PostgreSQL Vector Storage**: Store embeddings
- **Legal Dashboard**: Display processing metrics

---

## Development Checklist

### Component Development
- [ ] Create EvidenceUploadButton.svelte
- [ ] Create EvidenceUploadModal.svelte
- [ ] Create UploadProgressCard.svelte
- [ ] Create CaseSelectModal.svelte
- [ ] Add components to case pages
- [ ] Add components to homepage

### Service Development
- [ ] Create uploadEvidenceService.ts
- [ ] Implement initiateUpload()
- [ ] Implement completeUpload()
- [ ] Implement getUploadStatus()
- [ ] Implement streamProcessingEvents()
- [ ] Implement validateFile()

### State Management
- [ ] Create upload store
- [ ] Create case store
- [ ] Implement state persistence
- [ ] Implement error handling

### Testing
- [ ] Unit tests for components
- [ ] Unit tests for service
- [ ] Integration tests for upload flow
- [ ] Error scenario testing
- [ ] Performance testing

### Documentation
- [ ] Component documentation
- [ ] Service documentation
- [ ] API integration guide
- [ ] User guide

---

## Performance Considerations

### Upload Optimization
- Use presigned URLs (direct to MinIO)
- Chunk large files for resumable uploads
- Show real-time progress
- Implement upload cancellation

### Progress Streaming
- Use SSE for real-time updates
- Implement heartbeat (30s timeout)
- Handle connection loss gracefully
- Reconnect automatically

### State Management
- Use reactive stores
- Minimize re-renders
- Cache API responses
- Implement debouncing

---

## Security Considerations

### File Upload
- Validate file type and size
- Check MIME type
- Scan for malware (optional)
- Encrypt in transit

### API Communication
- Use HTTPS in production
- Validate API responses
- Handle authentication
- Implement rate limiting

### Data Protection
- Don't expose sensitive paths
- Sanitize error messages
- Log securely
- Implement audit trail

---

## Testing Strategy

### Unit Tests
- Component rendering
- Service methods
- State management
- Error handling

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
npm run dev
# Frontend runs on http://localhost:5173
# Backend runs on http://localhost:8001
```

### Production
```bash
npm run build
npm run preview
# Or use Docker
docker build -t evidence-frontend .
docker run -p 3000:3000 evidence-frontend
```

---

## Useful Commands

### Backend
```bash
# Start backend
cd backend/evidence-pipeline
python -m uvicorn evidence_pipeline.main:app --reload

# Run migrations
python -m evidence_pipeline.run_migrations

# Setup MinIO
python -m evidence_pipeline.setup_minio_buckets
```

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

---

## Key Files to Review

### Backend
- `backend/evidence-pipeline/evidence_pipeline/main.py` - FastAPI app
- `backend/evidence-pipeline/evidence_pipeline/routes/api.py` - API endpoints
- `backend/evidence-pipeline/evidence_pipeline/progress/event_manager.py` - SSE streaming
- `backend/evidence-pipeline/evidence_pipeline/error_handling/recovery.py` - Error handling

### Frontend
- `sveltekit-frontend/src/lib/components/evidence/` - Evidence components
- `sveltekit-frontend/src/lib/services/` - Service layer
- `sveltekit-frontend/src/routes/` - Page routes

---

## Common Issues & Solutions

### Issue: Upload fails with 413 Payload Too Large
**Solution**: Increase FastAPI max upload size in config

### Issue: SSE connection drops
**Solution**: Implement reconnection logic with exponential backoff

### Issue: Progress not updating
**Solution**: Check RabbitMQ connection and event publishing

### Issue: File not found in MinIO
**Solution**: Verify presigned URL expiry and bucket permissions

---

## Next Steps After Phase 2

1. **Phase 4**: Go Services (optional)
   - Document classifier
   - Vector clustering

2. **Phase 6**: Integration & Testing
   - End-to-end tests
   - Performance benchmarks
   - Documentation

3. **Deployment**
   - Staging environment
   - Production deployment
   - User acceptance testing

---

## Resources

### Documentation
- [SvelteKit Docs](https://kit.svelte.dev/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

### Related Files
- `.kiro/specs/evidence-processing-pipeline/tasks.md` - Full task list
- `.kiro/specs/evidence-processing-pipeline/requirements.md` - Requirements
- `.kiro/specs/evidence-processing-pipeline/design.md` - Design document
- `EVIDENCE_PIPELINE_PHASE1_FINAL_COMPLETE.md` - Phase 1 summary
- `EVIDENCE_PIPELINE_PHASE3_API_COMPLETE.md` - Phase 3 summary

---

**Last Updated**: December 13, 2025
**Status**: Ready for Phase 2 Frontend Implementation

