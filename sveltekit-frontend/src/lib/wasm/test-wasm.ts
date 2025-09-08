/**
 * Simple test for the compiled WASM vector operations module
 */

import { vectorWasm } from './vector-wasm-wrapper.js';

export async function testWasmModule(): Promise<boolean> {
  try {
    console.log('[WASM Test] Starting WebAssembly module tests...');

    // Initialize the module
    const initialized = await vectorWasm.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize WASM module');
    }

    console.log('[WASM Test] Module initialized successfully');

    // Test 1: Cosine similarity
    const vectorA = new Float32Array([1.0, 2.0, 3.0, 4.0]);
    const vectorB = new Float32Array([2.0, 4.0, 6.0, 8.0]);
    
    const similarity = await vectorWasm.computeCosineSimilarity(vectorA, vectorB);
    console.log(`[WASM Test] Cosine similarity: ${similarity}`);
    
    // Should be 1.0 since vectorB = 2 * vectorA
    if (Math.abs(similarity - 1.0) > 0.001) {
      throw new Error(`Expected similarity ~1.0, got ${similarity}`);
    }

    // Test 2: Hash embedding
    const text = "Hello, world!";
    const embedding = await vectorWasm.generateHashEmbedding(text, 64);
    console.log(`[WASM Test] Generated embedding of dimension ${embedding.length}`);
    
    if (embedding.length !== 64) {
      throw new Error(`Expected embedding dimension 64, got ${embedding.length}`);
    }

    // Check that embedding is normalized (magnitude should be ~1)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`[WASM Test] Embedding magnitude: ${magnitude}`);
    
    if (Math.abs(magnitude - 1.0) > 0.001) {
      throw new Error(`Expected normalized embedding (magnitude ~1.0), got ${magnitude}`);
    }

    // Test 3: Batch similarity computation
    const query = new Float32Array([1.0, 0.0, 0.0]);
    const vectors = [
      new Float32Array([1.0, 0.0, 0.0]), // Same as query, similarity = 1
      new Float32Array([0.0, 1.0, 0.0]), // Orthogonal, similarity = 0
      new Float32Array([0.5, 0.5, 0.0]), // 45 degrees
    ];

    const similarities = await vectorWasm.computeBatchSimilarities(query, vectors, 'cosine');
    console.log(`[WASM Test] Batch similarities: [${similarities.join(', ')}]`);

    // Check expected values
    if (Math.abs(similarities[0] - 1.0) > 0.001) {
      throw new Error(`Expected first similarity ~1.0, got ${similarities[0]}`);
    }
    if (Math.abs(similarities[1] - 0.0) > 0.001) {
      throw new Error(`Expected second similarity ~0.0, got ${similarities[1]}`);
    }

    // Test 4: Vector normalization
    const unnormalized = new Float32Array([3.0, 4.0, 0.0]); // Magnitude = 5
    const normalized = await vectorWasm.normalizeVector(unnormalized);
    const normalizedMagnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
    
    console.log(`[WASM Test] Normalized vector magnitude: ${normalizedMagnitude}`);
    if (Math.abs(normalizedMagnitude - 1.0) > 0.001) {
      throw new Error(`Expected normalized magnitude ~1.0, got ${normalizedMagnitude}`);
    }

    // Test 5: Memory statistics
    const memStats = vectorWasm.getMemoryStats();
    if (memStats) {
      console.log(`[WASM Test] Memory usage: ${memStats.bytes} bytes (${memStats.pages} pages)`);
    }

    console.log('[WASM Test] ✅ All tests passed!');
    return true;

  } catch (error: any) {
    console.error('[WASM Test] ❌ Test failed:', error);
    return false;
  }
}

// Run test if called directly
if (typeof window !== 'undefined' && window.location?.href.includes('wasm-test')) {
  testWasmModule().then(success => {
    if (success) {
      console.log('WebAssembly module is working correctly!');
    } else {
      console.error('WebAssembly module tests failed!');
    }
  });
}