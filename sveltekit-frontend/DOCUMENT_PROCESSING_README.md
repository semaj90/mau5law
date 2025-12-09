# Multi-Engine Document Processing System

This system provides enterprise-grade document processing with multiple OCR engines, AI vision services, and ML models for comprehensive legal document analysis.

## 🚀 Available Engines

### 1. **Hybrid OCR** (`/api/ocr`)
- **Native Tesseract**: Fast, accurate OCR for images
- **tesseract.js**: WebAssembly fallback (no installation required)
- **Automatic fallback**: Always works, prioritizes speed/accuracy

### 2. **IBM Docling** (`/api/docling`)
- **Advanced PDF processing**: Tables, images, metadata extraction
- **Installation**: `pip install docling`
- **Features**: Document structure analysis, table extraction

### 3. **IBM Vision** (`/api/ibm-vision`)
- **AI-powered image analysis**: OCR, classification, facial recognition
- **Setup**: Requires IBM Cloud API key and service URL
- **Features**: Entity extraction, emotion detection, object classification

### 4. **YOLO Object Detection** (`/api/yolo`)
- **Document layout analysis**: Detect text regions, forms, signatures
- **Model**: Requires `yolo-doc.onnx` in `models/` directory
- **Features**: Document structure understanding, form analysis

### 5. **ONNX Runtime** (`/api/onnx`)
- **Custom ML models**: Run any ONNX model for document analysis
- **Flexible**: Support for custom preprocessing/postprocessing
- **Use cases**: Custom classifiers, specialized OCR models

### 6. **Multi-Engine Orchestrator** (`/api/document-processing`)
- **Combines all engines**: Intelligent result merging
- **Priority modes**: Speed, accuracy, or comprehensive analysis
- **Automatic engine selection**: Based on availability and file type

## 📋 Setup Instructions

### Environment Variables

```bash
# IBM Vision (optional)
IBM_VISION_API_KEY=your_api_key
IBM_VISION_SERVICE_URL=https://api.us-south.visual-recognition.watson.cloud.ibm.com

# ONNX Models (optional)
# Place .onnx files in models/ directory
```

### Python Dependencies (for Docling/YOLO)

```bash
pip install docling onnxruntime opencv-python numpy
```

### Models Directory

```
models/
├── yolo-doc.onnx          # YOLO model for document layout
├── custom-classifier.onnx  # Custom document classifiers
└── ...
```

## 🔧 API Usage

### Multi-Engine Processing

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('options', JSON.stringify({
  engines: ['hybrid', 'docling', 'ibm-vision', 'yolo'],
  prioritize: 'comprehensive',
  extractEntities: true,
  detectLayout: true,
  classifyContent: true
}));

const response = await fetch('/api/document-processing', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.result contains merged analysis from all engines
```

### Individual Engine APIs

```javascript
// OCR only
const ocrResult = await fetch('/api/ocr', {
  method: 'POST',
  body: formData
});

// IBM Vision only
const visionResult = await fetch('/api/ibm-vision', {
  method: 'POST',
  body: formData
});

// YOLO object detection
const yoloResult = await fetch('/api/yolo', {
  method: 'POST',
  body: formData
});
```

## 🎯 Integration with Legal AI Chat

The contextual chat system automatically uses multi-engine processing:

1. **File Upload**: Documents are processed with all available engines
2. **Text Extraction**: OCR, Docling, and vision APIs extract text
3. **Entity Recognition**: IBM Vision extracts persons, organizations, dates
4. **Layout Analysis**: YOLO detects document structure
5. **RAG Indexing**: All extracted content is embedded and indexed
6. **Contextual Responses**: AI uses comprehensive document understanding

### Chat Integration Example

```javascript
// Files uploaded in chat are automatically processed
const response = await fetch('/terminal?/chat', {
  method: 'POST',
  body: formData // includes files and message
});

// Response includes processing results
{
  success: true,
  chatTurnId: "...",
  llmReply: "...",
  uploadedCount: 2,    // Files uploaded to MinIO
  processedCount: 1    // Files processed with multi-engine
}
```

## 📊 Result Structure

```typescript
interface DocumentProcessingResult {
  text: string;                    // Extracted text
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    language?: string;
    confidence?: number;
    processingTime: number;
  };
  entities?: {                     // Named entities
    persons?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    legalCitations?: string[];
  };
  layout?: {                       // Document structure
    regions: Array<{
      type: string;               // 'text', 'image', 'table', etc.
      bbox: number[];             // Bounding box coordinates
      confidence: number;
      text?: string;
    }>;
  };
  objects?: Array<{               // Detected objects
    class: string;
    bbox: number[];
    confidence: number;
  }>;
  classifications?: Array<{       // Content classifications
    class: string;
    confidence: number;
  }>;
  faces?: Array<{                 // Facial recognition
    bbox: number[];
    age?: { min: number; max: number };
    gender?: string;
    emotions?: Record<string, number>;
  }>;
  tables?: Array<{                // Extracted tables
    content: string[][];
    bbox?: number[];
  }>;
  images?: Array<{                // Extracted images
    content: Buffer;
    bbox?: number[];
    caption?: string;
  }>;
  method: string;                 // Primary processing method
  engines: string[];              // Engines that contributed
}
```

## 🔄 Processing Pipeline

1. **File Type Detection**: Automatic MIME type analysis
2. **Engine Selection**: Based on availability and file type
3. **Parallel Processing**: Multiple engines run simultaneously
4. **Result Merging**: Intelligent combination of results
5. **Quality Scoring**: Confidence-based result ranking
6. **Fallback Handling**: Graceful degradation when engines fail

## 🚦 Health Checks

```javascript
// Check available engines
const status = {
  hybrid: true,                    // Always available
  docling: await isDoclingAvailable(),
  ibmVision: isIBMVisionConfigured(),
  yolo: yoloService?.isModelAvailable(),
  onnx: true                       // Runtime available
};
```

## 🛠️ Development

### Adding New Engines

1. Create engine service in `src/lib/server/`
2. Implement processing interface
3. Add to orchestrator in `document-processor.ts`
4. Create API endpoint
5. Update type definitions

### Custom ONNX Models

```javascript
const result = await fetch('/api/onnx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelPath: 'models/custom-ocr.onnx',
    inputs: { image: imageTensor },
    inputNames: ['image'],
    outputNames: ['text', 'confidence']
  })
});
```

## 📈 Performance Optimization

- **Caching**: Processed results cached in Redis
- **Parallel Processing**: Multiple engines run concurrently
- **Batch Processing**: Multiple files processed together
- **GPU Acceleration**: ONNX models can use GPU when available
- **Incremental Updates**: Only reprocess changed documents

## 🔒 Security Considerations

- File type validation prevents malicious uploads
- Processing timeouts prevent resource exhaustion
- Result sanitization removes potentially harmful content
- API rate limiting prevents abuse
- Audit logging for all processing operations

## 🎯 Use Cases

### Legal Document Analysis
- Contract review with clause extraction
- Evidence processing with OCR and entity recognition
- Case document classification and summarization

### Compliance & Due Diligence
- Form field detection and validation
- Signature verification
- Document authenticity analysis

### Research & Intelligence
- Facial recognition for suspect identification
- Document layout analysis for information extraction
- Multi-language OCR support

This system provides a comprehensive document processing pipeline that scales from simple OCR to advanced AI-powered analysis, ensuring your legal AI platform can handle any document processing requirement.