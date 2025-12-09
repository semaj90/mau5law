# Phase 2: Advanced Document Processing Integration

**Date**: December 8, 2025
**Status**: 📋 PLANNING
**Scope**: Docling, IBM Vision, YOLO, Hybrid OCR, RAG Integration

---

## Overview

This document outlines the integration of advanced document processing capabilities with Phase 2 Sprint S-A (Citation Management). The goal is to create a comprehensive document analysis pipeline that extracts citations, text, and visual content from legal documents.

---

## Current State

### ✅ What's Working
- Tesseract.js (JavaScript fallback OCR)
- Native Tesseract (installed via Chocolatey)
- Hybrid OCR approach (automatic fallback)
- Basic text extraction
- RAG pipeline integration

### ⏳ What's Needed
- Docling (IBM document understanding)
- IBM Vision API (image analysis)
- YOLO (object detection for legal documents)
- Contextual chat integration
- API endpoints for document processing
- ONNX model support (optional optimization)

---

## Architecture

### Document Processing Pipeline

```
User Upload
    ↓
File Type Detection
    ↓
┌─────────────────────────────────────┐
│  Docling (Primary)                  │
│  - Layout analysis                  │
│  - Table extraction                 │
│  - Citation detection               │
│  - Structured output                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  IBM Vision (Images)                │
│  - Image classification             │
│  - Text detection (OCR)             │
│  - Document type recognition        │
│  - Signature detection              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  YOLO (Object Detection)            │
│  - Stamp detection                  │
│  - Signature detection              │
│  - Form field detection             │
│  - Redaction detection              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Hybrid OCR (Fallback)              │
│  - Tesseract (native)               │
│  - Tesseract.js (JavaScript)        │
│  - Text extraction                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Citation Extraction                │
│  - Statute detection                │
│  - Case law detection               │
│  - Regulation detection             │
│  - Auto-save to database            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  RAG Indexing                       │
│  - Vector embeddings                │
│  - Full-text search                 │
│  - Knowledge graph                  │
└─────────────────────────────────────┘
    ↓
Contextual Chat Ready
```

---

## Component Breakdown

### 1. Docling Integration

**Purpose**: Advanced document understanding and layout analysis

**Features**:
- PDF/image document parsing
- Layout analysis and structure extraction
- Table detection and extraction
- Citation detection
- Structured JSON output

**Installation**:
```bash
pip install docling
pip install docling-core
```

**Usage**:
```python
from docling.document_converter import DocumentConverter

converter = DocumentConverter()
result = converter.convert("document.pdf")

# Extract structured content
for page in result.pages:
    for element in page.elements:
        if element.type == "table":
            # Process table
        elif element.type == "text":
            # Process text
```

**API Endpoint**:
```
POST /api/documents/process/docling
- Input: file upload
- Output: structured document data
```

### 2. IBM Vision API Integration

**Purpose**: Advanced image analysis and OCR

**Features**:
- Image classification
- Text detection (OCR)
- Document type recognition
- Signature detection
- Handwriting recognition

**Setup**:
```bash
pip install ibm-cloud-sdk-core
pip install ibm-watson
```

**Usage**:
```python
from ibm_watson import VisualRecognitionV4
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

authenticator = IAMAuthenticator(apikey='your-api-key')
visual_recognition = VisualRecognitionV4(
    version='2021-08-01',
    authenticator=authenticator,
    service_url='https://api.us-south.visual-recognition.watson.cloud.ibm.com'
)

# Analyze image
with open('image.jpg', 'rb') as image_file:
    results = visual_recognition.analyze(
        image_file=image_file,
        features=['objects', 'text']
    ).get_result()
```

**API Endpoint**:
```
POST /api/documents/process/vision
- Input: image file
- Output: image analysis results
```

### 3. YOLO Integration

**Purpose**: Object detection for legal documents

**Features**:
- Stamp detection
- Signature detection
- Form field detection
- Redaction detection
- Document type classification

**Installation**:
```bash
pip install ultralytics
pip install opencv-python
```

**Usage**:
```python
from ultralytics import YOLO

# Load model
model = YOLO('yolov8n.pt')  # nano model for speed

# Detect objects
results = model.predict(source='image.jpg', conf=0.5)

# Process results
for result in results:
    for box in result.boxes:
        class_name = result.names[int(box.cls)]
        confidence = box.conf
```

**API Endpoint**:
```
POST /api/documents/process/yolo
- Input: image file
- Output: detected objects with bounding boxes
```

### 4. Hybrid OCR (Already Working)

**Current Implementation**:
- Tesseract (native) - primary
- Tesseract.js (JavaScript) - fallback
- Automatic fallback on error

**API Endpoint**:
```
POST /api/documents/process/ocr
- Input: image file
- Output: extracted text
```

### 5. Citation Extraction

**Purpose**: Automatically extract and save citations

**Features**:
- Statute detection (e.g., "42 U.S.C. § 1983")
- Case law detection (e.g., "Smith v. Jones, 123 F.3d 456")
- Regulation detection
- Auto-save to database
- Link to source document

**Implementation**:
```typescript
// Extract citations from text
function extractCitations(text: string): Citation[] {
  const citations: Citation[] = [];

  // Statute pattern: XX U.S.C. § XXXX
  const statutePattern = /(\d+)\s+U\.S\.C\.\s+§\s+(\d+)/g;
  let match;

  while ((match = statutePattern.exec(text)) !== null) {
    citations.push({
      type: 'statute',
      code: `${match[1]}-${match[2]}`,
      text: match[0],
      context: text.substring(
        Math.max(0, match.index - 100),
        Math.min(text.length, match.index + match[0].length + 100)
      )
    });
  }

  return citations;
}
```

**API Endpoint**:
```
POST /api/documents/process/citations
- Input: text content
- Output: extracted citations
```

---

## API Endpoints

### Document Processing Endpoints

#### 1. Process Document (Multi-Method)
```
POST /api/documents/process
Content-Type: multipart/form-data

{
  "file": <file>,
  "methods": ["docling", "vision", "yolo", "ocr"],
  "extractCitations": true,
  "indexForRAG": true
}

Response:
{
  "documentId": "uuid",
  "docling": { ... },
  "vision": { ... },
  "yolo": { ... },
  "ocr": { ... },
  "citations": [ ... ],
  "status": "processed"
}
```

#### 2. Process with Docling
```
POST /api/documents/process/docling
Content-Type: multipart/form-data

{
  "file": <file>
}

Response:
{
  "pages": [ ... ],
  "tables": [ ... ],
  "text": "...",
  "citations": [ ... ]
}
```

#### 3. Process with Vision
```
POST /api/documents/process/vision
Content-Type: multipart/form-data

{
  "file": <image>
}

Response:
{
  "objects": [ ... ],
  "text": "...",
  "documentType": "contract",
  "confidence": 0.95
}
```

#### 4. Process with YOLO
```
POST /api/documents/process/yolo
Content-Type: multipart/form-data

{
  "file": <image>
}

Response:
{
  "detections": [
    {
      "class": "signature",
      "confidence": 0.92,
      "bbox": [x, y, w, h]
    }
  ]
}
```

#### 5. Process with OCR
```
POST /api/documents/process/ocr
Content-Type: multipart/form-data

{
  "file": <image>,
  "language": "eng"
}

Response:
{
  "text": "...",
  "confidence": 0.88,
  "method": "tesseract"
}
```

#### 6. Extract Citations
```
POST /api/documents/process/citations
Content-Type: application/json

{
  "text": "...",
  "documentId": "uuid",
  "autoSave": true
}

Response:
{
  "citations": [
    {
      "type": "statute",
      "code": "42-1983",
      "text": "42 U.S.C. § 1983",
      "context": "..."
    }
  ],
  "saved": 5
}
```

---

## Implementation Plan

### Phase 2-A.5: Document Processing (Week 2.5)

**Tasks**:
1. Set up Docling integration
2. Set up IBM Vision integration
3. Set up YOLO integration
4. Create API endpoints
5. Integrate with citation extraction
6. Test end-to-end pipeline

**Deliverables**:
- 5 API endpoints
- Document processing service
- Citation extraction service
- Integration tests
- Documentation

### Phase 2-B: Statute Search (Week 3-4)

**Integration Points**:
- Use Docling for document analysis
- Extract citations automatically
- Index in RAG system
- Link to statute search

### Phase 2-C: Case Linking (Week 5-6)

**Integration Points**:
- Link extracted citations to cases
- Create Neo4j relationships
- Track document sources

### Phase 2-D: Citation Library (Week 7-8)

**Integration Points**:
- Export documents with citations
- Share document analysis
- Analytics on document types

---

## Technology Stack

### Python Services
```
docling==1.0.0
docling-core==1.0.0
ibm-cloud-sdk-core==3.20.0
ibm-watson==8.0.0
ultralytics==8.0.0
opencv-python==4.8.0
pytesseract==0.3.10
```

### Node.js Services
```
tesseract.js==5.0.0
sharp==0.32.0
multer==1.4.5
```

### Optional (ONNX Optimization)
```
onnx==1.14.0
onnxruntime==1.16.0
```

---

## Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| PDF processing | <5s | Docling |
| Image analysis | <2s | Vision |
| Object detection | <1s | YOLO |
| OCR | <3s | Tesseract |
| Citation extraction | <500ms | Regex |
| Full pipeline | <15s | Combined |

---

## Security Considerations

### File Upload Security
- [ ] File type validation
- [ ] File size limits (max 50MB)
- [ ] Virus scanning
- [ ] Malware detection

### API Security
- [ ] Authentication required
- [ ] Rate limiting
- [ ] Input validation
- [ ] Output sanitization

### Data Privacy
- [ ] Encrypt files at rest
- [ ] Encrypt files in transit
- [ ] Secure deletion after processing
- [ ] Audit logging

---

## Error Handling

### Fallback Strategy
```
Try Docling
  ↓ (if fails)
Try Vision
  ↓ (if fails)
Try YOLO
  ↓ (if fails)
Try OCR (Tesseract)
  ↓ (if fails)
Try OCR (Tesseract.js)
  ↓ (if fails)
Return error
```

### Error Responses
```json
{
  "error": "Document processing failed",
  "code": "PROCESSING_ERROR",
  "details": "Docling failed: timeout",
  "fallback": "Attempted OCR",
  "status": 500
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Docling integration
- [ ] Vision integration
- [ ] YOLO integration
- [ ] OCR integration
- [ ] Citation extraction

### Integration Tests
- [ ] End-to-end pipeline
- [ ] Fallback mechanisms
- [ ] Error handling
- [ ] Performance

### Performance Tests
- [ ] Large file handling
- [ ] Concurrent processing
- [ ] Memory usage
- [ ] Response times

---

## Deployment Considerations

### Infrastructure
- Python service for document processing
- GPU support for YOLO (optional)
- Sufficient disk space for temporary files
- Redis for job queue

### Configuration
```env
# Docling
DOCLING_ENABLED=true

# IBM Vision
IBM_VISION_API_KEY=xxx
IBM_VISION_URL=https://api.us-south.visual-recognition.watson.cloud.ibm.com

# YOLO
YOLO_MODEL=yolov8n.pt
YOLO_CONFIDENCE=0.5

# OCR
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=eng

# Processing
MAX_FILE_SIZE=52428800  # 50MB
PROCESSING_TIMEOUT=30000  # 30s
```

---

## Next Steps

### Immediate (This Week)
1. ✅ Phase 2 Sprint S-A complete
2. ⏳ Plan document processing integration
3. ⏳ Set up Python service
4. ⏳ Implement Docling integration

### Short Term (Next 2 Weeks)
1. ⏳ Implement Vision integration
2. ⏳ Implement YOLO integration
3. ⏳ Create API endpoints
4. ⏳ Test end-to-end pipeline

### Medium Term (Next 4 Weeks)
1. ⏳ Deploy to staging
2. ⏳ Performance optimization
3. ⏳ Deploy to production
4. ⏳ Begin Sprint S-B

---

## Conclusion

Advanced document processing will significantly enhance the Legal AI platform by:
- Automatically extracting citations from documents
- Analyzing document structure and content
- Detecting important elements (signatures, stamps, etc.)
- Providing rich context for legal analysis
- Enabling intelligent document classification

**Status**: 📋 PLANNING
**Next**: Implement document processing service
**Timeline**: 2-4 weeks for full integration

---

**Generated**: December 8, 2025
**Version**: 1.0
**Status**: 📋 PLANNING

