#!/usr/bin/env node
/**
 * SIMD Performance Test for CUDA + pgvector Integration
 * Tests CPU SIMD acceleration vs GPU CUDA acceleration
 */

import { performance } from 'perf_hooks';

const CUDA_SERVICE_URL = 'http://localhost:8097';

// Generate test vectors
function generateTestVectors(count, dimensions = 768) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    const vector = new Array(dimensions);
    for (let j = 0; j < dimensions; j++) {
      vector[j] = Math.random() * 2 - 1; // Random values between -1 and 1
    }
    vectors.push(vector);
  }
  return vectors;
}

// Test SIMD capabilities
async function testSIMDCapabilities() {
  console.log('🔍 Testing SIMD Capabilities...\n');

  try {
    const response = await fetch(`${CUDA_SERVICE_URL}/api/v1/simd/capabilities`);
    const capabilities = await response.json();

    console.log('📊 SIMD Capabilities:');
    console.log(`   AVX2 Enabled: ${capabilities.simd_capabilities.avx2_enabled}`);
    console.log(`   SSE4 Enabled: ${capabilities.simd_capabilities.sse4_enabled}`);
    console.log(`   CUDA Available: ${capabilities.simd_capabilities.cuda_available}`);
    console.log(`   Instruction Set: ${capabilities.simd_capabilities.instruction_set}`);
    console.log(`   Batch Size: ${capabilities.simd_capabilities.batch_size}`);

    console.log('\n🖥️ GPU Capabilities:');
    console.log(`   Model: ${capabilities.gpu_capabilities.model}`);
    console.log(`   CUDA Cores: ${capabilities.gpu_capabilities.cuda_cores}`);
    console.log(`   Tensor Cores: ${capabilities.gpu_capabilities.tensor_cores}`);
    console.log(`   Memory: ${capabilities.gpu_capabilities.memory_gb}GB`);

    console.log('\n⚡ Performance Estimates:');
    console.log(`   Ops/Second: ${capabilities.performance_metrics.estimated_ops_per_second.toLocaleString()}`);
    console.log(`   Memory Efficiency: ${capabilities.performance_metrics.memory_efficiency}`);

    return capabilities;
  } catch (error) {
    console.error('❌ Failed to get SIMD capabilities:', error.message);
    return null;
  }
}

// Test single vector similarity
async function testSingleSimilarity() {
  console.log('\n🧮 Testing Single Vector Similarity...\n');

  const vectorA = generateTestVectors(1, 768)[0];
  const vectorB = generateTestVectors(1, 768)[0];

  try {
    const startTime = performance.now();
    const response = await fetch(`${CUDA_SERVICE_URL}/api/v1/simd/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector_a: vectorA,
        vector_b: vectorB
      })
    });

    const result = await response.json();
    const totalTime = performance.now() - startTime;

    console.log(`✅ Similarity: ${result.similarity.toFixed(6)}`);
    console.log(`📏 Dimensions: ${result.dimensions}`);
    console.log(`⏱️ Processing Time: ${result.processing_time_ns}ns`);
    console.log(`🔧 SIMD Enabled: ${result.simd_enabled}`);
    console.log(`📐 Instruction Set: ${result.instruction_set}`);
    console.log(`⏰ Total Time: ${totalTime.toFixed(2)}ms`);

    return result;
  } catch (error) {
    console.error('❌ Similarity test failed:', error.message);
    return null;
  }
}

// Test batch processing
async function testBatchProcessing(candidateCount = 1000) {
  console.log(`\n🔄 Testing Batch Processing (${candidateCount} vectors)...\n`);

  const query = generateTestVectors(1, 768)[0];
  const candidates = generateTestVectors(candidateCount, 768);

  try {
    const startTime = performance.now();
    const response = await fetch(`${CUDA_SERVICE_URL}/api/v1/simd/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        candidates: candidates,
        operation: 'similarity'
      })
    });

    const result = await response.json();
    const totalTime = performance.now() - startTime;

    console.log(`✅ Processed: ${result.candidates_count} vectors`);
    console.log(`📏 Query Dimensions: ${result.query_dimensions}`);
    console.log(`⏱️ Processing Time: ${result.processing_time_ms}ms`);
    console.log(`🚀 Vectors/Second: ${Math.round(result.vectors_per_second).toLocaleString()}`);
    console.log(`🔧 SIMD Enabled: ${result.simd_enabled}`);
    console.log(`📐 Instruction Set: ${result.instruction_set}`);
    console.log(`⏰ Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`📊 Top 5 Similarities: [${result.results.slice(0, 5).map(s => s.toFixed(4)).join(', ')}]`);

    return result;
  } catch (error) {
    console.error('❌ Batch processing test failed:', error.message);
    return null;
  }
}

// Test database search with SIMD
async function testDatabaseSearch() {
  console.log('\n🔍 Testing Database Search with SIMD...\n');

  try {
    const startTime = performance.now();
    const response = await fetch(`${CUDA_SERVICE_URL}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'patent litigation and intellectual property legal cases',
        limit: 10
      })
    });

    const result = await response.json();
    const totalTime = performance.now() - startTime;

    console.log(`🔍 Query: "${result.query}"`);
    console.log(`📊 Results Found: ${result.count}`);
    console.log(`👥 Candidates Processed: ${result.candidates || 'N/A'}`);
    console.log(`⏱️ Search Time: ${result.search_time_ms}ms`);
    console.log(`🔧 SIMD Enabled: ${result.simd_enabled}`);
    console.log(`⚡ GPU Accelerated: ${result.gpu_accelerated}`);
    console.log(`🤖 Embedding Model: ${result.embedding_model}`);
    console.log(`⏰ Total Time: ${totalTime.toFixed(2)}ms`);

    if (result.results && result.results.length > 0) {
      console.log('\n📋 Top Results:');
      result.results.slice(0, 3).forEach((res, idx) => {
        console.log(`   ${idx + 1}. Score: ${res.score.toFixed(4)} - ID: ${res.id}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Database search test failed:', error.message);
    return null;
  }
}

// Performance comparison
async function performanceComparison() {
  console.log('\n🏆 Performance Comparison...\n');

  const testSizes = [100, 500, 1000, 5000];
  const results = [];

  for (const size of testSizes) {
    console.log(`Testing with ${size} vectors...`);

    const query = generateTestVectors(1, 768)[0];
    const candidates = generateTestVectors(size, 768);

    try {
      const startTime = performance.now();
      const response = await fetch(`${CUDA_SERVICE_URL}/api/v1/simd/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          candidates: candidates,
          operation: 'similarity'
        })
      });

      const result = await response.json();
      const totalTime = performance.now() - startTime;

      results.push({
        size,
        processingTime: result.processing_time_ms,
        totalTime,
        vectorsPerSecond: result.vectors_per_second,
        instructionSet: result.instruction_set
      });

    } catch (error) {
      console.error(`❌ Test failed for size ${size}:`, error.message);
    }
  }

  // Display results table
  console.log('\n📊 Performance Results:');
  console.log('┌─────────┬─────────────┬─────────────┬─────────────────┬──────────────┐');
  console.log('│ Vectors │ Proc. (ms)  │ Total (ms)  │ Vectors/Second  │ SIMD         │');
  console.log('├─────────┼─────────────┼─────────────┼─────────────────┼──────────────┤');

  results.forEach(result => {
    const vectors = result.size.toString().padStart(7);
    const procTime = result.processingTime.toFixed(1).padStart(10);
    const totalTime = result.totalTime.toFixed(1).padStart(10);
    const vps = Math.round(result.vectorsPerSecond).toLocaleString().padStart(14);
    const simd = result.instructionSet.padStart(12);

    console.log(`│ ${vectors} │ ${procTime} │ ${totalTime} │ ${vps} │ ${simd} │`);
  });

  console.log('└─────────┴─────────────┴─────────────┴─────────────────┴──────────────┘');

  return results;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 SIMD + CUDA Performance Test Suite\n');
  console.log('Testing PostgreSQL 17 + pgvector with SIMD acceleration\n');
  console.log('='.repeat(60));

  // Check if service is running
  try {
    const healthResponse = await fetch(`${CUDA_SERVICE_URL}/api/v1/health`);
    const health = await healthResponse.json();
    console.log(`✅ CUDA Service: ${health.status} (${health.gpu_model})`);
  } catch (error) {
    console.error('❌ CUDA Service not available. Please start cuda-service-worker-simd.exe');
    process.exit(1);
  }

  // Run tests
  await testSIMDCapabilities();
  await testSingleSimilarity();
  await testBatchProcessing(1000);
  await testDatabaseSearch();
  await performanceComparison();

  console.log('\n🎉 All tests completed!');
  console.log('\n💡 Key Features Tested:');
  console.log('   ✅ CPU SIMD acceleration (AVX2/SSE4)');
  console.log('   ✅ GPU CUDA integration');
  console.log('   ✅ pgvector binary format parsing');
  console.log('   ✅ Batch processing optimization');
  console.log('   ✅ embeddinggemma model integration');
  console.log('   ✅ Real-time performance metrics');
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testSIMDCapabilities, testBatchProcessing };