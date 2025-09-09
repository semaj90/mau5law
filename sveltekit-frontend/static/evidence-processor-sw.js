/**
 * Evidence Processor Service Worker
 * Background processing for legal evidence files with CUDA fallback
 * Integrates with MinIO storage and WebGPU quantization system
 */

// Service worker version for cache busting
const SW_VERSION = 'v1.2.0';
const CACHE_NAME = `evidence-processor-${SW_VERSION}`;

// Processing capabilities
let processingCapabilities = {
  webgpu: false,
  cuda: false,
  simd: false,
  wasm: false
};

// Active processing jobs
const activeJobs = new Map();

// CUDA service endpoint
const CUDA_SERVICE_URL = 'http://localhost:8080/api/cuda';

self.addEventListener('install', (event) => {
  console.log('🔧 Evidence processor service worker installing...');
  
  event.waitUntil(
    (async () => {
      // Pre-cache essential assets
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([
        '/wasm/simd_parser.wasm',
        '/wasm/wasm-wrapper.js',
        '/js/webgpu-utils.js'
      ]);
      
      // Detect processing capabilities
      await detectCapabilities();
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('⚡ Evidence processor service worker activated');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('evidence-processor-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      
      // Claim all clients immediately
      self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const { type, messageId, payload } = event.data;
  
  switch (type) {
    case 'PROCESS_EVIDENCE':
      handleEvidenceProcessing(event, messageId, payload);
      break;
    case 'CANCEL_JOB':
      handleJobCancellation(event, messageId, payload);
      break;
    case 'GET_CAPABILITIES':
      event.ports[0]?.postMessage({ 
        messageId, 
        capabilities: processingCapabilities 
      });
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

async function detectCapabilities() {
  console.log('🔍 Detecting processing capabilities...');
  
  try {
    // Check WebGPU (limited in service worker)
    processingCapabilities.webgpu = false; // Not available in SW context
    
    // Check CUDA service availability
    try {
      const response = await fetch(`${CUDA_SERVICE_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      processingCapabilities.cuda = response.ok;
      console.log('🚀 CUDA service:', processingCapabilities.cuda ? 'Available' : 'Unavailable');
    } catch {
      processingCapabilities.cuda = false;
    }
    
    // Check WASM/SIMD support
    processingCapabilities.wasm = typeof WebAssembly !== 'undefined';
    processingCapabilities.simd = processingCapabilities.wasm && 
      typeof WebAssembly.SIMD !== 'undefined';
    
    console.log('📊 Capabilities detected:', processingCapabilities);
  } catch (error) {
    console.error('❌ Capability detection failed:', error);
  }
}

async function handleEvidenceProcessing(event, messageId, payload) {
  const { evidenceFile, jobId } = payload;
  const jobKey = jobId || messageId;
  
  console.log(`🔄 Processing evidence: ${evidenceFile.name}`);
  
  // Track job
  activeJobs.set(jobKey, {
    id: jobKey,
    status: 'processing',
    startTime: Date.now(),
    evidenceFile
  });
  
  try {
    // Send initial progress
    sendProgress(event.source, messageId, 10, 'Starting processing...');
    
    let result;
    
    // Try CUDA processing first if available
    if (processingCapabilities.cuda) {
      try {
        result = await processCUDA(evidenceFile, messageId, event.source);
        console.log('✅ CUDA processing completed');
      } catch (cudaError) {
        console.warn('⚠️ CUDA processing failed, falling back:', cudaError);
        result = await processWithWASM(evidenceFile, messageId, event.source);
      }
    } else {
      // Fallback to WASM processing
      result = await processWithWASM(evidenceFile, messageId, event.source);
    }
    
    // Send completion
    event.source.postMessage({
      type: 'PROCESSING_COMPLETE',
      messageId,
      jobId: jobKey,
      success: true,
      result
    });
    
    activeJobs.delete(jobKey);
    console.log(`✅ Evidence processing completed: ${evidenceFile.name}`);
    
  } catch (error) {
    console.error('❌ Evidence processing failed:', error);
    
    event.source.postMessage({
      type: 'PROCESSING_ERROR',
      messageId,
      jobId: jobKey,
      success: false,
      error: error.message
    });
    
    activeJobs.delete(jobKey);
  }
}

async function processCUDA(evidenceFile, messageId, source) {
  console.log('🚀 Processing with CUDA service:', evidenceFile.name);
  
  sendProgress(source, messageId, 20, 'Uploading to CUDA service...');
  
  // Download file from MinIO
  const fileResponse = await fetch(`/api/minio/download?bucket=legal-evidence&key=${encodeURIComponent(evidenceFile.minioKey)}`);
  if (!fileResponse.ok) {
    throw new Error('Failed to download file from MinIO');
  }
  
  const fileBlob = await fileResponse.blob();
  sendProgress(source, messageId, 40, 'File downloaded, processing...');
  
  // Send to CUDA service for processing
  const formData = new FormData();
  formData.append('file', fileBlob, evidenceFile.name);
  formData.append('type', evidenceFile.type);
  formData.append('options', JSON.stringify({
    quantization: 'legal_standard', // Use your quantization profiles
    extractText: true,
    generateEmbeddings: true,
    createThumbnail: evidenceFile.type.startsWith('image/')
  }));
  
  const cudaResponse = await fetch(`${CUDA_SERVICE_URL}/process-evidence`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!cudaResponse.ok) {
    throw new Error(`CUDA processing failed: ${cudaResponse.statusText}`);
  }
  
  sendProgress(source, messageId, 80, 'CUDA processing completed');
  
  const result = await cudaResponse.json();
  
  // Convert embeddings back to Float32Array if present
  if (result.embeddings && Array.isArray(result.embeddings)) {
    result.embeddings = new Float32Array(result.embeddings);
  }
  
  sendProgress(source, messageId, 100, 'Processing complete');
  
  return {
    processingMethod: 'cuda',
    extractedText: result.extractedText || '',
    embeddings: result.embeddings,
    thumbnailKey: result.thumbnailKey,
    processingTime: result.processingTime || 0,
    quantizationApplied: result.quantizationApplied,
    cudaAccelerated: true
  };
}

async function processWithWASM(evidenceFile, messageId, source) {
  console.log('🔧 Processing with WASM fallback:', evidenceFile.name);
  
  sendProgress(source, messageId, 20, 'Loading WASM modules...');
  
  // Load WASM modules from cache
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Load SIMD parser if available
    let wasmModule = null;
    if (processingCapabilities.simd) {
      const wasmResponse = await cache.match('/wasm/simd_parser.wasm');
      if (wasmResponse) {
        const wasmBuffer = await wasmResponse.arrayBuffer();
        wasmModule = await WebAssembly.instantiate(wasmBuffer);
        console.log('✅ WASM SIMD module loaded');
      }
    }
    
    sendProgress(source, messageId, 40, 'Downloading file...');
    
    // Download file from MinIO
    const fileResponse = await fetch(`/api/minio/download?bucket=legal-evidence&key=${encodeURIComponent(evidenceFile.minioKey)}`);
    if (!fileResponse.ok) {
      throw new Error('Failed to download file from MinIO');
    }
    
    const fileBlob = await fileResponse.blob();
    sendProgress(source, messageId, 60, 'Extracting text...');
    
    // Extract text content
    let extractedText = '';
    if (evidenceFile.type.startsWith('text/')) {
      extractedText = await fileBlob.text();
    } else if (evidenceFile.type === 'application/pdf') {
      // Simple PDF text extraction (would use PDF.js in real implementation)
      extractedText = `PDF document: ${evidenceFile.name} (${fileBlob.size} bytes)`;
    } else {
      extractedText = `Binary file: ${evidenceFile.type}`;
    }
    
    sendProgress(source, messageId, 80, 'Generating embeddings...');
    
    // Generate simple embeddings (would use proper model in real implementation)
    const words = extractedText.toLowerCase().split(/\s+/).slice(0, 100);
    const embeddings = new Float32Array(768);
    
    // Simple hash-based embedding generation
    for (let i = 0; i < embeddings.length; i++) {
      let hash = 0;
      const word = words[i % words.length] || 'default';
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      embeddings[i] = (hash / 0x7fffffff) * 2 - 1; // Normalize to [-1, 1]
    }
    
    sendProgress(source, messageId, 95, 'Finalizing...');
    
    // Generate thumbnail if image
    let thumbnailKey = null;
    if (evidenceFile.type.startsWith('image/')) {
      thumbnailKey = `thumbnails/${evidenceFile.id}/thumb.jpg`;
      // Thumbnail generation would happen here
    }
    
    sendProgress(source, messageId, 100, 'Processing complete');
    
    return {
      processingMethod: 'wasm',
      extractedText,
      embeddings,
      thumbnailKey,
      processingTime: Date.now() - (activeJobs.get(messageId)?.startTime || Date.now()),
      quantizationApplied: {
        precision: 'fp32', // No quantization in WASM fallback
        compressionRatio: 1.0,
        memorySavedMB: 0
      },
      wasmAccelerated: processingCapabilities.simd
    };
    
  } catch (error) {
    console.error('❌ WASM processing failed:', error);
    throw new Error(`WASM processing failed: ${error.message}`);
  }
}

function handleJobCancellation(event, messageId, payload) {
  const { jobId } = payload;
  
  if (activeJobs.has(jobId)) {
    activeJobs.delete(jobId);
    console.log(`🛑 Job cancelled: ${jobId}`);
    
    event.source.postMessage({
      type: 'JOB_CANCELLED',
      messageId,
      jobId,
      success: true
    });
  } else {
    event.source.postMessage({
      type: 'JOB_CANCELLED',
      messageId,
      jobId,
      success: false,
      error: 'Job not found'
    });
  }
}

function sendProgress(source, messageId, progress, status) {
  try {
    source.postMessage({
      type: 'PROGRESS_UPDATE',
      messageId,
      progress,
      status
    });
  } catch (error) {
    console.warn('Failed to send progress update:', error);
  }
}

// Periodic cleanup of old jobs
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of activeJobs.entries()) {
    if (now - job.startTime > 300000) { // 5 minutes timeout
      console.log(`🧹 Cleaning up stale job: ${jobId}`);
      activeJobs.delete(jobId);
    }
  }
}, 60000); // Check every minute

// Handle CUDA service health monitoring
setInterval(async () => {
  if (processingCapabilities.cuda) {
    try {
      const response = await fetch(`${CUDA_SERVICE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      
      if (!response.ok) {
        processingCapabilities.cuda = false;
        console.warn('⚠️ CUDA service became unavailable');
      }
    } catch {
      processingCapabilities.cuda = false;
      console.warn('⚠️ CUDA service health check failed');
    }
  } else {
    // Periodically try to reconnect to CUDA service
    try {
      const response = await fetch(`${CUDA_SERVICE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      
      if (response.ok) {
        processingCapabilities.cuda = true;
        console.log('✅ CUDA service reconnected');
      }
    } catch {
      // Still unavailable
    }
  }
}, 30000); // Check every 30 seconds

console.log(`🚀 Evidence Processor Service Worker ${SW_VERSION} ready`);