/**
 * Evidence Processor Web Worker
 * CPU-based fallback for evidence processing when WebGPU/CUDA unavailable
 */

// Worker version
const WORKER_VERSION = 'v1.0.0';

console.log(`🔧 Evidence Processor Web Worker ${WORKER_VERSION} starting...`);

// Processing state
let isProcessing = false;

// Text extraction utilities
const textExtractors = {
  'text/plain': (blob) => blob.text(),
  'text/html': (blob) => blob.text(),
  'application/json': (blob) => blob.text(),
  
  // Simplified PDF extraction
  'application/pdf': async (blob) => {
    // In a real implementation, this would use PDF.js
    const buffer = await blob.arrayBuffer();
    return `PDF document (${buffer.byteLength} bytes) - text extraction would require PDF.js`;
  },
  
  // Default handler
  default: (blob, mimeType) => `Binary file: ${mimeType} (${blob.size} bytes)`
};

// Simple embedding generation
function generateSimpleEmbeddings(text, dimensions = 768) {
  const words = text.toLowerCase().split(/\s+/).slice(0, 100);
  const embeddings = new Float32Array(dimensions);
  
  // Use a simple hash-based approach for consistent embeddings
  for (let i = 0; i < dimensions; i++) {
    let hash = i; // Seed with dimension index
    
    for (const word of words) {
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
    }
    
    // Normalize to [-1, 1] range
    embeddings[i] = ((hash % 2000) - 1000) / 1000;
  }
  
  return embeddings;
}

// Main message handler
self.onmessage = async function(event) {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'PROCESS_EVIDENCE':
      await handleEvidenceProcessing(payload);
      break;
    default:
      self.postMessage({
        success: false,
        error: `Unknown message type: ${type}`
      });
  }
};

async function handleEvidenceProcessing(payload) {
  const { evidenceFile, jobId, minioEndpoint, bucketName } = payload;
  
  if (isProcessing) {
    self.postMessage({
      success: false,
      error: 'Worker is already processing another file'
    });
    return;
  }
  
  isProcessing = true;
  const startTime = Date.now();
  
  console.log(`🔄 Processing evidence in web worker: ${evidenceFile.name}`);
  
  try {
    // Download file from MinIO
    const downloadUrl = `/api/minio/download?bucket=${bucketName}&key=${encodeURIComponent(evidenceFile.minioKey)}`;
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const fileBlob = await response.blob();
    console.log(`📥 File downloaded: ${fileBlob.size} bytes`);
    
    // Extract text content
    const extractor = textExtractors[evidenceFile.type] || textExtractors.default;
    const extractedText = await extractor(fileBlob, evidenceFile.type);
    
    console.log(`📝 Text extracted: ${extractedText.length} characters`);
    
    // Generate embeddings
    const embeddings = generateSimpleEmbeddings(extractedText);
    console.log(`🧮 Embeddings generated: ${embeddings.length} dimensions`);
    
    // Generate thumbnail for images (simplified)
    let thumbnailKey = null;
    if (evidenceFile.type.startsWith('image/')) {
      thumbnailKey = `thumbnails/${evidenceFile.id}/thumb.jpg`;
      // In a real implementation, this would create an actual thumbnail
      console.log(`🖼️ Thumbnail key generated: ${thumbnailKey}`);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Send success response
    self.postMessage({
      success: true,
      result: {
        processingMethod: 'cpu',
        extractedText,
        embeddings: Array.from(embeddings), // Convert to regular array for transfer
        thumbnailKey,
        processingTime,
        quantizationApplied: {
          precision: 'fp32',
          compressionRatio: 1.0,
          memorySavedMB: 0
        },
        workerAccelerated: false,
        cpuFallback: true
      }
    });
    
    console.log(`✅ Evidence processing completed in ${processingTime}ms`);
    
  } catch (error) {
    console.error('❌ Evidence processing failed:', error);
    
    self.postMessage({
      success: false,
      error: error.message
    });
  } finally {
    isProcessing = false;
  }
}

// Error handler
self.onerror = function(error) {
  console.error('💥 Web worker error:', error);
  self.postMessage({
    success: false,
    error: `Worker error: ${error.message}`
  });
  isProcessing = false;
};

console.log(`🚀 Evidence Processor Web Worker ${WORKER_VERSION} ready`);