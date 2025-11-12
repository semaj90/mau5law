/**
 * WebAssembly SIMD Performance Benchmark
 * Compares WebAssembly SIMD vs JavaScript CPU performance
 */

async function benchmarkWebAssemblySIMD() {
  console.log('🚀 WebAssembly SIMD Performance Benchmark');
  console.log('=========================================');

  try {
    // Load WebAssembly module
    const wasmModule = await import('./src/wasm/simd_ops.js');
    const wasmInstance = await wasmModule.default();

    // Generate test data (384d embeddings like legal documents)
    const VECTOR_DIM = 384;
    const NUM_VECTORS = 1000;
    const NUM_QUERIES = 10;

    console.log(`📊 Benchmarking with ${NUM_VECTORS} vectors of ${VECTOR_DIM} dimensions`);
    console.log(`🔍 Running ${NUM_QUERIES} similarity searches`);

    // Generate random normalized vectors
    const vectors = new Float32Array(NUM_VECTORS * VECTOR_DIM);
    const queries = new Float32Array(NUM_QUERIES * VECTOR_DIM);

    for (let i = 0; i < vectors.length; i++) {
      vectors[i] = Math.random() - 0.5;
    }
    for (let i = 0; i < queries.length; i++) {
      queries[i] = Math.random() - 0.5;
    }

    // Normalize vectors (L2 normalization)
    for (let i = 0; i < NUM_VECTORS; i++) {
      const start = i * VECTOR_DIM;
      const vec = vectors.subarray(start, start + VECTOR_DIM);
      let norm = 0;
      for (let j = 0; j < VECTOR_DIM; j++) {
        norm += vec[j] * vec[j];
      }
      norm = Math.sqrt(norm);
      for (let j = 0; j < VECTOR_DIM; j++) {
        vec[j] /= norm;
      }
    }

    for (let i = 0; i < NUM_QUERIES; i++) {
      const start = i * VECTOR_DIM;
      const vec = queries.subarray(start, start + VECTOR_DIM);
      let norm = 0;
      for (let j = 0; j < VECTOR_DIM; j++) {
        norm += vec[j] * vec[j];
      }
      norm = Math.sqrt(norm);
      for (let j = 0; j < VECTOR_DIM; j++) {
        vec[j] /= norm;
      }
    }

    // Allocate WebAssembly memory
    const vectorsPtr = wasmInstance._alloc_float_array(vectors.length);
    const resultsPtr = wasmInstance._alloc_float_array(NUM_VECTORS);

    wasmInstance.HEAPF32.set(vectors, vectorsPtr / 4);

    // Benchmark WebAssembly SIMD
    console.log('\n⚡ Testing WebAssembly SIMD Performance...');
    const wasmTimes = [];

    for (let q = 0; q < NUM_QUERIES; q++) {
      const query = queries.subarray(q * VECTOR_DIM, (q + 1) * VECTOR_DIM);
      const queryPtr = wasmInstance._alloc_float_array(VECTOR_DIM);
      wasmInstance.HEAPF32.set(query, queryPtr / 4);

      const start = performance.now();
      wasmInstance._batch_cosine_similarity(queryPtr, vectorsPtr, resultsPtr, NUM_VECTORS, VECTOR_DIM);
      const end = performance.now();

      wasmTimes.push(end - start);
      wasmInstance._free_array(queryPtr);
    }

    const avgWasmTime = wasmTimes.reduce((a, b) => a + b) / wasmTimes.length;
    console.log(`WebAssembly SIMD: ${avgWasmTime.toFixed(2)}ms per query`);

    // Benchmark JavaScript CPU
    console.log('\n🐌 Testing JavaScript CPU Performance...');
    const jsTimes = [];

    for (let q = 0; q < NUM_QUERIES; q++) {
      const query = queries.subarray(q * VECTOR_DIM, (q + 1) * VECTOR_DIM);
      const results = new Float32Array(NUM_VECTORS);

      const start = performance.now();
      for (let i = 0; i < NUM_VECTORS; i++) {
        const vec = vectors.subarray(i * VECTOR_DIM, (i + 1) * VECTOR_DIM);
        let dot = 0, normA = 0, normB = 0;
        for (let j = 0; j < VECTOR_DIM; j++) {
          dot += query[j] * vec[j];
          normA += query[j] * query[j];
          normB += vec[j] * vec[j];
        }
        results[i] = dot / (Math.sqrt(normA) * Math.sqrt(normB));
      }
      const end = performance.now();

      jsTimes.push(end - start);
    }

    const avgJsTime = jsTimes.reduce((a, b) => a + b) / jsTimes.length;
    console.log(`JavaScript CPU: ${avgJsTime.toFixed(2)}ms per query`);

    // Calculate speedup
    const speedup = avgJsTime / avgWasmTime;
    console.log(`\n🚀 WebAssembly SIMD is ${speedup.toFixed(2)}x faster than JavaScript CPU!`);

    // Test accuracy by comparing results
    console.log('\n🎯 Testing Accuracy...');
    const query = queries.subarray(0, VECTOR_DIM);
    const queryPtr = wasmInstance._alloc_float_array(VECTOR_DIM);
    wasmInstance.HEAPF32.set(query, queryPtr / 4);

    wasmInstance._batch_cosine_similarity(queryPtr, vectorsPtr, resultsPtr, NUM_VECTORS, VECTOR_DIM);

    const wasmResults = new Float32Array(NUM_VECTORS);
    wasmResults.set(wasmInstance.HEAPF32.subarray(resultsPtr / 4, (resultsPtr / 4) + NUM_VECTORS));

    // JavaScript calculation
    const jsResults = new Float32Array(NUM_VECTORS);
    for (let i = 0; i < NUM_VECTORS; i++) {
      const vec = vectors.subarray(i * VECTOR_DIM, (i + 1) * VECTOR_DIM);
      let dot = 0, normA = 0, normB = 0;
      for (let j = 0; j < VECTOR_DIM; j++) {
        dot += query[j] * vec[j];
        normA += query[j] * query[j];
        normB += vec[j] * vec[j];
      }
      jsResults[i] = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Check accuracy
    let maxDiff = 0;
    for (let i = 0; i < NUM_VECTORS; i++) {
      const diff = Math.abs(wasmResults[i] - jsResults[i]);
      maxDiff = Math.max(maxDiff, diff);
    }

    console.log(`Maximum difference between WebAssembly and JavaScript: ${maxDiff.toFixed(8)}`);
    console.log(`Accuracy: ${maxDiff < 1e-6 ? '✅ Excellent' : maxDiff < 1e-4 ? '✅ Good' : '⚠️ Acceptable'}`);

    // Free memory
    wasmInstance._free_array(vectorsPtr);
    wasmInstance._free_array(resultsPtr);
    wasmInstance._free_array(queryPtr);

    console.log('\n🎉 Benchmark completed successfully!');

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run the benchmark
benchmarkWebAssemblySIMD().catch(console.error);