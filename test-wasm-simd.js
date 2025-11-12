#!/usr/bin/env node
/**
 * Test WebAssembly SIMD Integration
 * Tests the compiled WebAssembly SIMD module directly
 */

async function testWebAssemblySIMD() {
  console.log('🧪 Testing WebAssembly SIMD Module');
  console.log('==================================');

  try {
    // Load WebAssembly module
    console.log('🚀 Loading WebAssembly SIMD module...');
    const wasmModule = await import('./src/wasm/simd_ops.js');
    const wasmInstance = await wasmModule.default();
    console.log('✅ WebAssembly SIMD module loaded successfully');

    // Test vector dot product
    console.log('\n🔢 Testing vector dot product...');
    const a = new Float32Array([1, 2, 3, 4]);
    const b = new Float32Array([5, 6, 7, 8]);

    // Allocate memory in WebAssembly
    const aPtr = wasmInstance._alloc_float_array(a.length);
    const bPtr = wasmInstance._alloc_float_array(b.length);

    // Copy data to WebAssembly memory using the correct heap access
    wasmInstance.HEAPF32.set(a, aPtr / 4);
    wasmInstance.HEAPF32.set(b, bPtr / 4);

    // Perform operation
    const dotProduct = wasmInstance._vector_dot_product(aPtr, bPtr, a.length);
    console.log(`Dot product of [${a}] · [${b}] = ${dotProduct}`);

    // Test cosine similarity
    console.log('\n📐 Testing cosine similarity...');
    const vec1 = new Float32Array([1, 0, 0]);
    const vec2 = new Float32Array([0, 1, 0]);

    const v1Ptr = wasmInstance._alloc_float_array(vec1.length);
    const v2Ptr = wasmInstance._alloc_float_array(vec2.length);

    wasmInstance.HEAPF32.set(vec1, v1Ptr / 4);
    wasmInstance.HEAPF32.set(vec2, v2Ptr / 4);

    const similarity = wasmInstance._cosine_similarity(v1Ptr, v2Ptr, vec1.length);
    console.log(`Cosine similarity (orthogonal): ${similarity.toFixed(4)}`);

    // Test similar vectors
    const vec3 = new Float32Array([1, 2, 3]);
    const vec4 = new Float32Array([1, 2, 3]); // identical

    const v3Ptr = wasmInstance._alloc_float_array(vec3.length);
    const v4Ptr = wasmInstance._alloc_float_array(vec4.length);

    wasmInstance.HEAPF32.set(vec3, v3Ptr / 4);
    wasmInstance.HEAPF32.set(vec4, v4Ptr / 4);

    const similarity2 = wasmInstance._cosine_similarity(v3Ptr, v4Ptr, vec3.length);
    console.log(`Cosine similarity (identical): ${similarity2.toFixed(4)}`);

    // Test batch cosine similarity
    console.log('\n📊 Testing batch cosine similarity...');
    const query = new Float32Array([1, 0, 0]);
    const docs = new Float32Array([
      1, 0, 0,  // identical to query
      0, 1, 0,  // orthogonal
      0.5, 0.5, 0.707  // normalized 45-degree vector
    ]);

    const queryPtr = wasmInstance._alloc_float_array(query.length);
    const docsPtr = wasmInstance._alloc_float_array(docs.length);
    const resultsPtr = wasmInstance._alloc_float_array(3); // 3 documents

    wasmInstance.HEAPF32.set(query, queryPtr / 4);
    wasmInstance.HEAPF32.set(docs, docsPtr / 4);

    wasmInstance._batch_cosine_similarity(queryPtr, docsPtr, resultsPtr, 3, 3);

    const results = new Float32Array(3);
    results.set(wasmInstance.HEAPF32.subarray(resultsPtr / 4, (resultsPtr / 4) + 3));

    console.log(`Batch similarities: [${results.map(x => x.toFixed(4)).join(', ')}]`);

    // Test vector normalization
    console.log('\n🔄 Testing vector normalization...');
    const unnormalized = new Float32Array([3, 4, 0]); // should normalize to [0.6, 0.8, 0]
    const normPtr = wasmInstance._alloc_float_array(unnormalized.length);
    wasmInstance.HEAPF32.set(unnormalized, normPtr / 4);

    wasmInstance._normalize_vector(normPtr, unnormalized.length);

    const normalized = new Float32Array(unnormalized.length);
    normalized.set(wasmInstance.HEAPF32.subarray(normPtr / 4, (normPtr / 4) + unnormalized.length));

    console.log(`Normalized [${unnormalized}] → [${normalized.map(x => x.toFixed(4)).join(', ')}]`);

    // Test Euclidean distance
    console.log('\n📏 Testing Euclidean distance...');
    const dist1 = new Float32Array([0, 0, 0]);
    const dist2 = new Float32Array([3, 4, 0]);

    const d1Ptr = wasmInstance._alloc_float_array(dist1.length);
    const d2Ptr = wasmInstance._alloc_float_array(dist2.length);

    wasmInstance.HEAPF32.set(dist1, d1Ptr / 4);
    wasmInstance.HEAPF32.set(dist2, d2Ptr / 4);

    const distance = wasmInstance._euclidean_distance(d1Ptr, d2Ptr, dist1.length);
    console.log(`Euclidean distance between [${dist1}] and [${dist2}] = ${distance.toFixed(4)}`);

    // Free all memory
    wasmInstance._free_array(aPtr);
    wasmInstance._free_array(bPtr);
    wasmInstance._free_array(v1Ptr);
    wasmInstance._free_array(v2Ptr);
    wasmInstance._free_array(v3Ptr);
    wasmInstance._free_array(v4Ptr);
    wasmInstance._free_array(queryPtr);
    wasmInstance._free_array(docsPtr);
    wasmInstance._free_array(resultsPtr);
    wasmInstance._free_array(normPtr);
    wasmInstance._free_array(d1Ptr);
    wasmInstance._free_array(d2Ptr);

    console.log('\n🎉 All WebAssembly SIMD tests passed!');

  } catch (error) {
    console.error('❌ WebAssembly SIMD test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWebAssemblySIMD().catch(console.error);