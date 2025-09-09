// Enhanced WASM loader for AssemblyScript build with --exportRuntime
// Optimized for legal document processing with fabric.js canvas integration

export async function loadSIMDParser(path = '/wasm/simd_parser.wasm') {
  if (window.__SIMD_WASM_LOADED__) return window.__SIMD_WASM_INSTANCE__;
  
  try {
    console.log('🔧 Loading SIMD WASM parser from', path);
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to fetch WASM: ${resp.status}`);
    
    const bytes = await resp.arrayBuffer();
    console.log('📦 WASM binary loaded:', bytes.byteLength, 'bytes');
    
    const { instance, module } = await WebAssembly.instantiate(bytes, {
      env: {
        memory: new WebAssembly.Memory({ 
          initial: 256, 
          maximum: 4096,
          shared: false 
        }),
        abort: (msg, file, line, col) => {
          console.error('WASM abort:', { msg, file, line, col });
          throw new Error('WASM execution aborted');
        }
      }
    });

    const exports = instance.exports;
    console.log('✅ WASM exports:', Object.keys(exports));
    
    // AssemblyScript runtime helpers (present if --exportRuntime used)
    const asAlloc = exports.__new || exports.allocate;
    const asAllocString = exports.__newString;
    const asGetString = exports.__getString || exports.getStringFromPtr;
    const asFree = exports.__release || exports.deallocate || (() => {});
    
    // Memory access helpers
    const memory = exports.memory;
    
    // Core parsing function
    function parseJSONBytes(uint8arr) {
      try {
        console.log('🔍 Parsing document with WASM, size:', uint8arr.length);
        
        // Allocate buffer in WASM memory and copy bytes
        const len = uint8arr.length;
        const ptr = exports.allocate ? exports.allocate(len) : exports.__new(len, 0);
        
        const memU8 = new Uint8Array(memory.buffer);
        memU8.set(uint8arr, ptr);
        
        // Call exported parsing function
        const resPtr = exports.parseDocumentBytes(ptr, len);
        
        // Extract result string
        let result;
        if (exports.getStringFromPtr) {
          // Calculate string length by finding null terminator
          let strLen = 0;
          while (memU8[resPtr + strLen] !== 0 && strLen < 10000) strLen++;
          result = exports.getStringFromPtr(resPtr, strLen);
        } else if (asGetString) {
          result = asGetString(resPtr);
        } else {
          // Fallback: read until null terminator
          const decoder = new TextDecoder();
          let endPtr = resPtr;
          while (memU8[endPtr] !== 0 && endPtr < resPtr + 100000) endPtr++;
          result = decoder.decode(memU8.slice(resPtr, endPtr));
        }
        
        // Free allocated memory
        if (exports.deallocate) {
          exports.deallocate(ptr);
          exports.deallocate(resPtr);
        } else if (asFree) {
          asFree(ptr);
          asFree(resPtr);
        }
        
        console.log('✅ WASM parsing completed, result length:', result.length);
        return result;
        
      } catch (error) {
        console.error('❌ WASM parsing failed:', error);
        throw error;
      }
    }
    
    // Vector operations for embeddings
    function normalizeVector(vector) {
      const len = vector.length;
      const ptr = exports.allocate ? exports.allocate(len * 4) : exports.__new(len * 4, 0);
      
      // Copy vector to WASM memory
      const memF32 = new Float32Array(memory.buffer, ptr, len);
      memF32.set(vector);
      
      // Call normalization function
      exports.normalizeVector(ptr, len);
      
      // Copy result back
      const normalized = new Float32Array(len);
      normalized.set(memF32);
      
      // Free memory
      if (exports.deallocate) exports.deallocate(ptr);
      else if (asFree) asFree(ptr);
      
      return normalized;
    }
    
    function cosineSimilarity(vec1, vec2) {
      const len = vec1.length;
      const ptr1 = exports.allocate ? exports.allocate(len * 4) : exports.__new(len * 4, 0);
      const ptr2 = exports.allocate ? exports.allocate(len * 4) : exports.__new(len * 4, 0);
      
      // Copy vectors to WASM memory
      const mem1 = new Float32Array(memory.buffer, ptr1, len);
      const mem2 = new Float32Array(memory.buffer, ptr2, len);
      mem1.set(vec1);
      mem2.set(vec2);
      
      // Calculate similarity
      const similarity = exports.cosineSimilarity(ptr1, ptr2, len);
      
      // Free memory
      if (exports.deallocate) {
        exports.deallocate(ptr1);
        exports.deallocate(ptr2);
      } else if (asFree) {
        asFree(ptr1);
        asFree(ptr2);
      }
      
      return similarity;
    }
    
    // Health check
    function healthCheck() {
      return exports.healthCheck ? exports.healthCheck() : 42;
    }
    
    // Enhanced document chunking for fabric.js canvas
    function parseForCanvas(uint8arr, options = {}) {
      const { 
        maxChunkSize = 3000,
        overlap = 200,
        enableEntityExtraction = true 
      } = options;
      
      const parsed = parseJSONBytes(uint8arr);
      let doc;
      
      try {
        doc = JSON.parse(parsed);
      } catch (err) {
        console.warn('Failed to parse WASM result as JSON, using raw text');
        doc = {
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          content: parsed,
          title: 'Text Document',
          chunks: []
        };
      }
      
      return {
        document: doc,
        chunks: doc.chunks || [],
        metadata: {
          totalChunks: doc.chunks ? doc.chunks.length : 0,
          entities: doc.entities || [],
          processedBy: 'wasm_simd_parser'
        }
      };
    }

    const instanceObj = { 
      exports, 
      parseJSONBytes, 
      parseForCanvas,
      normalizeVector,
      cosineSimilarity,
      healthCheck,
      asAllocString, 
      asGetString, 
      asFree,
      memory: memory.buffer
    };
    
    window.__SIMD_WASM_LOADED__ = true;
    window.__SIMD_WASM_INSTANCE__ = instanceObj;
    
    console.log('🚀 SIMD Parser loaded successfully');
    return instanceObj;
    
  } catch (error) {
    console.error('❌ Failed to load SIMD parser:', error);
    throw error;
  }
}

// Utility function to check WASM support
export function checkWASMSupport() {
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, reason: 'WebAssembly not supported' };
  }
  
  if (typeof WebAssembly.instantiate !== 'function') {
    return { supported: false, reason: 'WebAssembly.instantiate not available' };
  }
  
  // Check for SIMD support (optional)
  let simdSupported = false;
  try {
    // Simple SIMD detection
    simdSupported = typeof WebAssembly.SIMD !== 'undefined';
  } catch (e) {
    simdSupported = false;
  }
  
  return { 
    supported: true, 
    simd: simdSupported,
    version: typeof WebAssembly.version !== 'undefined' ? WebAssembly.version : 'unknown'
  };
}

// Integration helper for fabric.js canvas
export async function createCanvasWASMUploader(canvasInstance) {
  const wasmParser = await loadSIMDParser();
  
  return {
    async processFileForCanvas(file, position = { x: 0, y: 0 }) {
      console.log('📄 Processing file for canvas:', file.name);
      
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = wasmParser.parseForCanvas(bytes);
      
      // Create evidence item compatible with fabric.js canvas
      const evidenceItem = {
        id: result.document.id,
        filename: file.name,
        type: detectFileType(file.type),
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        size: file.size,
        mimeType: file.type,
        position: position,
        aiAnalysis: {
          summary: `Document parsed with ${result.metadata.totalChunks} chunks`,
          entities: result.metadata.entities,
          confidence: 0.95,
          processedBy: 'wasm_simd_parser'
        },
        chunks: result.chunks
      };
      
      console.log('✅ Canvas evidence item created:', evidenceItem.id);
      return evidenceItem;
    },
    
    healthCheck: () => wasmParser.healthCheck(),
    isLoaded: () => window.__SIMD_WASM_LOADED__
  };
}

function detectFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.startsWith('text/')) return 'document';
  if (mimeType.includes('json')) return 'document';
  return 'other';
}