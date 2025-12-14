# Evidence Processing Pipeline - Task 1 Complete

## Summary

Successfully completed **Task 1: Document Classification & Validation** for the Evidence Processing Pipeline.

## What Was Created

### 1.1 Document Classifier
**File:** `evidence_pipeline/classifiers/document_classifier.py`

Features:
- ✅ Detects document type using magic bytes (MIME type detection)
- ✅ Supports: PDF, Image (JPEG/PNG), Scanned (TIFF), Mixed
- ✅ Fallback to file extension if MIME detection fails
- ✅ Returns processing pipeline (OCR or Parsing)
- ✅ Structured logging for debugging

Supported Types:
- **PDF**: `application/pdf` → Routed to Docling parser
- **Image**: `image/jpeg`, `image/png` → Routed to OCR
- **Scanned**: `image/tiff`, `image/x-tiff` → Routed to OCR
- **Unknown**: Returns UNKNOWN type

### 1.2 File Validator
**File:** `evidence_pipeline/validators/file_validator.py`

Validation Checks:
- ✅ File exists
- ✅ File size within limits (max 50MB configurable)
- ✅ MIME type is allowed
- ✅ File integrity via magic bytes verification
- ✅ Specific error types for different failures

Error Types:
- `FileSizeExceededError` - File too large
- `InvalidMimeTypeError` - Unsupported file type
- `CorruptedFileError` - File appears corrupted
- `ValidationError` - Generic validation failure

### 1.3 Error Handling
**File:** `evidence_pipeline/errors/handlers.py`

Features:
- ✅ Custom exception classes
- ✅ Structured error responses with error codes
- ✅ HTTP status code mapping
- ✅ User-friendly error messages
- ✅ Detailed error information

Error Codes:
- `FILE_SIZE_EXCEEDED` (413)
- `INVALID_MIME_TYPE` (400)
- `CORRUPTED_FILE` (400)
- `FILE_NOT_FOUND` (404)
- `UNKNOWN_DOCUMENT_TYPE` (400)
- `STORAGE_ERROR` (500)
- `UPLOAD_ERROR` (500)

### 1.4 Upload Endpoint
**File:** `evidence_pipeline/routes/upload.py`

Endpoint: `POST /api/evidence/upload`

Parameters:
- `file` (multipart/form-data) - Document file
- `case_id` (query) - Case ID

Process:
1. Save uploaded file to temp location
2. Validate file (size, MIME type, integrity)
3. Classify document type
4. Upload to MinIO storage
5. Create database record
6. Dispatch classification job to RabbitMQ
7. Clean up temp file
8. Return job ID and status

Response:
```json
{
  "job_id": "uuid",
  "document_id": "uuid",
  "filename": "document.pdf",
  "file_type": "pdf",
  "file_size_bytes": 1024000,
  "status": "queued"
}
```

## Files Created

1. `evidence_pipeline/classifiers/__init__.py`
2. `evidence_pipeline/classifiers/document_classifier.py`
3. `evidence_pipeline/validators/__init__.py`
4. `evidence_pipeline/validators/file_validator.py`
5. `evidence_pipeline/errors/__init__.py`
6. `evidence_pipeline/errors/handlers.py`
7. `evidence_pipeline/routes/upload.py` (updated)

**Total: 7 files (~800 lines of code)**

## Integration Points

### Database
- Creates `EvidenceDocument` record with:
  - case_id
  - filename
  - file_type
  - file_size_bytes
  - status (queued)

### Storage (MinIO)
- Uploads to `evidence-documents` bucket
- Path: `{case_id}/{job_id}/{filename}`

### Message Queue (RabbitMQ)
- Dispatches to `evidence-pipeline.classification` queue
- Job data includes: job_id, document_id, file_path

## Testing

### Test Upload
```bash
curl -X POST "http://localhost:8001/api/evidence/upload?case_id=case-123" \
  -F "file=@document.pdf"
```

### Expected Response
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "document_id": "660e8400-e29b-41d4-a716-446655440001",
  "filename": "document.pdf",
  "file_type": "pdf",
  "file_size_bytes": 1024000,
  "status": "queued"
}
```

### Error Responses

**File Too Large:**
```json
{
  "detail": {
    "error": {
      "code": "FILE_SIZE_EXCEEDED",
      "message": "File size exceeds maximum allowed size",
      "details": {
        "max_size_mb": 50
      }
    }
  }
}
```

**Invalid File Type:**
```json
{
  "detail": {
    "error": {
      "code": "INVALID_MIME_TYPE",
      "message": "File type is not supported",
      "details": {
        "allowed_types": ["PDF", "JPEG", "PNG", "TIFF"]
      }
    }
  }
}
```

## Features

✅ Magic byte detection for accurate file type identification
✅ Comprehensive file validation
✅ Structured error responses
✅ Async file handling
✅ Temp file cleanup
✅ Database integration
✅ MinIO storage integration
✅ RabbitMQ job dispatch
✅ Detailed logging
✅ User-friendly error messages

## Next Steps

Ready to proceed with:

- **Task 2**: OCR Pipeline (Tesseract)
  - Tesseract OCR wrapper
  - Image preprocessing
  - OCR job dispatch

- **Task 3**: Document Parsing (IBM Docling)
  - Docling parser wrapper
  - Structured extraction
  - Parsing job dispatch

## Status

✅ **COMPLETE** - Document classification and validation ready for OCR/Parsing pipelines
