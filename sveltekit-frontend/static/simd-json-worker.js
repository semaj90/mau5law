/**
 * SIMD JSON Web Worker
 * Provides off-main-thread JSON parsing for large payloads
 * Prevents main thread blocking during heavy JSON processing
 */

// Worker state
let wasmModule = null;
let simdJsonReady = false;
let processingStats = {
  totalParsed: 0,
  totalTime: 0,
  avgTime: 0,
  errors: 0
};

// Load WebAssembly SIMD JSON module (future implementation)
async function loadSIMDJsonWasm() {
  try {
    // Future: Load compiled simdjson WASM module
    // const wasmResponse = await fetch('/wasm/simdjson.wasm');
    // const wasmBytes = await wasmResponse.arrayBuffer();
    // wasmModule = await WebAssembly.instantiate(wasmBytes);
    
    console.log('🚀 SIMD JSON Web Worker ready (fallback to native JSON)');
    simdJsonReady = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to load SIMD JSON WASM:', error);
    simdJsonReady = false;
    return false;
  }
}

// Parse JSON with SIMD acceleration or fallback
function parseJSONSIMD(jsonString) {
  const startTime = performance.now();
  
  try {
    let result;
    
    if (wasmModule && simdJsonReady) {
      // Future: Use WASM SIMD JSON parsing
      // result = wasmModule.instance.exports.parse_json(jsonString);
      result = JSON.parse(jsonString); // Fallback for now
    } else {
      // Standard JSON.parse fallback
      result = JSON.parse(jsonString);
    }
    
    const parseTime = performance.now() - startTime;
    updateStats(parseTime, false);
    
    return {
      success: true,
      data: result,
      parseTime,
      acceleration: wasmModule ? 'wasm_simd' : 'native'
    };
    
  } catch (error) {
    const parseTime = performance.now() - startTime;
    updateStats(parseTime, true);
    
    return {
      success: false,
      error: error.message,
      parseTime,
      acceleration: 'failed'
    };
  }
}

// Update processing statistics
function updateStats(parseTime, isError) {
  if (isError) {
    processingStats.errors++;
  } else {
    processingStats.totalParsed++;
    processingStats.totalTime += parseTime;
    processingStats.avgTime = processingStats.totalTime / processingStats.totalParsed;
  }
}

// Message handler for Web Worker communication
self.addEventListener('message', async (event) => {
  const { type, id, data } = event.data;
  
  try {
    switch (type) {
      case 'INIT':
        const initialized = await loadSIMDJsonWasm();
        self.postMessage({
          type: 'INIT_COMPLETE',
          id,
          success: initialized,
          ready: simdJsonReady
        });
        break;
        
      case 'PARSE_JSON':
        const { jsonString, options = {} } = data;
        
        if (!jsonString || typeof jsonString !== 'string') {
          self.postMessage({
            type: 'PARSE_ERROR',
            id,
            error: 'Invalid JSON string provided'
          });
          return;
        }
        
        // Parse JSON with SIMD acceleration
        const result = parseJSONSIMD(jsonString);
        
        if (result.success) {
          // Use structured clone to transfer data efficiently
          self.postMessage({
            type: 'PARSE_COMPLETE',
            id,
            data: result.data,
            metadata: {
              parseTime: result.parseTime,
              acceleration: result.acceleration,
              size: jsonString.length,
              structured_clone: true
            }
          });
        } else {
          self.postMessage({
            type: 'PARSE_ERROR',
            id,
            error: result.error,
            parseTime: result.parseTime
          });
        }
        break;
        
      case 'PARSE_BATCH':
        const { jsonStrings } = data;
        
        if (!Array.isArray(jsonStrings)) {
          self.postMessage({
            type: 'PARSE_ERROR',
            id,
            error: 'jsonStrings must be an array'
          });
          return;
        }
        
        const batchStart = performance.now();
        const results = [];
        let successCount = 0;
        
        for (let i = 0; i < jsonStrings.length; i++) {
          const result = parseJSONSIMD(jsonStrings[i]);
          results.push(result);
          if (result.success) successCount++;
        }
        
        const batchTime = performance.now() - batchStart;
        
        self.postMessage({
          type: 'BATCH_COMPLETE',
          id,
          results: results.map(r => r.success ? r.data : null),
          metadata: {
            totalTime: batchTime,
            successCount,
            totalCount: jsonStrings.length,
            avgTimePerParse: batchTime / jsonStrings.length
          }
        });
        break;
        
      case 'PARSE_VECTOR_DATA':
        const { vectorJson } = data;
        const vectorResult = parseJSONSIMD(vectorJson);
        
        if (vectorResult.success) {
          // Validate vector data structure
          const vectorData = vectorResult.data;
          const isValidVectorData = (
            vectorData &&
            (Array.isArray(vectorData.vectors) || 
             Array.isArray(vectorData.embeddings) ||
             Array.isArray(vectorData.similarities))
          );
          
          self.postMessage({
            type: 'VECTOR_PARSE_COMPLETE',
            id,
            data: vectorData,
            metadata: {
              parseTime: vectorResult.parseTime,
              isValidVectorData,
              hasVectors: Array.isArray(vectorData.vectors),
              hasEmbeddings: Array.isArray(vectorData.embeddings),
              hasSimilarities: Array.isArray(vectorData.similarities)
            }
          });
        } else {
          self.postMessage({
            type: 'PARSE_ERROR',
            id,
            error: vectorResult.error
          });
        }
        break;
        
      case 'GET_STATS':
        self.postMessage({
          type: 'STATS',
          id,
          data: {
            ...processingStats,
            simdReady: simdJsonReady,
            wasmLoaded: wasmModule !== null
          }
        });
        break;
        
      case 'RESET_STATS':
        processingStats = {
          totalParsed: 0,
          totalTime: 0,
          avgTime: 0,
          errors: 0
        };
        
        self.postMessage({
          type: 'STATS_RESET',
          id,
          success: true
        });
        break;
        
      case 'BENCHMARK':
        const { iterations = 1000, testSize = 'medium' } = data;
        
        // Generate test data
        const testSizes = {
          small: { vectors: 10, dimensions: 128 },
          medium: { vectors: 100, dimensions: 768 },
          large: { vectors: 1000, dimensions: 1536 }
        };
        
        const config = testSizes[testSize] || testSizes.medium;
        const testData = {
          vectors: Array.from({ length: config.vectors }, () =>
            Array.from({ length: config.dimensions }, () => Math.random())
          ),
          metadata: {
            generated: Date.now(),
            type: 'benchmark_data',
            size: testSize
          }
        };
        
        const testJson = JSON.stringify(testData);
        const benchmarkStart = performance.now();
        
        // Run benchmark
        for (let i = 0; i < iterations; i++) {
          parseJSONSIMD(testJson);
        }
        
        const benchmarkTime = performance.now() - benchmarkStart;
        
        self.postMessage({
          type: 'BENCHMARK_COMPLETE',
          id,
          data: {
            iterations,
            totalTime: benchmarkTime,
            avgTime: benchmarkTime / iterations,
            testSize,
            testDataSize: testJson.length,
            parsesPerSecond: (iterations / benchmarkTime) * 1000
          }
        });
        break;
        
      default:
        self.postMessage({
          type: 'ERROR',
          id,
          error: `Unknown message type: ${type}`
        });
    }
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id,
      error: error.message || 'Unknown worker error'
    });
  }
});

// Handle worker errors
self.addEventListener('error', (error) => {
  console.error('SIMD JSON Worker Error:', error);
  self.postMessage({
    type: 'WORKER_ERROR',
    error: error.message || 'Worker error occurred'
  });
});

// Initialize worker on startup
console.log('🚀 SIMD JSON Web Worker loaded and ready');
self.postMessage({
  type: 'WORKER_READY',
  timestamp: Date.now()
});