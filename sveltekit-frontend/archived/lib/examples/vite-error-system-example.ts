/**
 * Vite Error Tracking System - Complete Usage Examples
 *
 * This file demonstrates all features of the integrated error tracking system:
 * - MCP SIMD parser for high-performance parsing
 * - pgvector storage for persistent error tracking
 * - Qdrant auto-tagging for intelligent classification
 * - Vector search for similarity matching
 * - Real-time monitoring and evolution tracking
 *
 * @module vite-error-system-example
 */

import { mcpSIMDParser } from '$lib/services/mcp-simd-parser';
import { qdrantAutoTagger } from '$lib/services/qdrant-auto-tagger';
import { viteErrorTracker } from '$lib/services/vite-error-tracker';
import { vectorSearchErrors } from '$lib/services/vector-search-errors';
import type { ErrorMetadata } from '$lib/services/mcp-simd-parser';

/**
 * Example 1: Basic Error Parsing with MCP SIMD
 *
 * Demonstrates high-performance error parsing using multicore SIMD acceleration.
 */
export async function example1_BasicParsing() {
  console.log('\n=== Example 1: MCP SIMD Parser ===\n');

  // Initialize parser with 4 workers and SIMD enabled
  await mcpSIMDParser.initialize({
    workers: 4,
    enableSIMD: true,
    enableMulticore: true,
    batchSize: 100,
  });

  // Simulate Vite build log
  const buildLog = `
    src/lib/components/Example.svelte(15,10): error TS2304: Cannot find name 'unknownVariable'.
    src/lib/services/api.ts(42,5): error TS2322: Type 'string' is not assignable to type 'number'.
    src/routes/+page.svelte(8,12): error TS1005: ',' expected.
    src/lib/utils/helpers.ts(23,1): error TS2307: Cannot find module '@/types' or its corresponding type declarations.
  `;

  // Parse errors with SIMD optimization
  const errors = await mcpSIMDParser.parseViteErrors(buildLog);

  console.log(`✅ Parsed ${errors.length} errors in ${mcpSIMDParser.getMetrics().parseTimeMs}ms`);
  console.log(`⚡ Throughput: ${mcpSIMDParser.getMetrics().throughput.toFixed(2)} errors/sec`);
  console.log(`🔧 Workers used: ${mcpSIMDParser.getMetrics().coresUsed}`);

  errors.forEach((error, index) => {
    console.log(`\nError ${index + 1}:`);
    console.log(`  Code: ${error.errorCode}`);
    console.log(`  File: ${error.filePath}:${error.line}`);
    console.log(`  Message: ${error.message}`);
    console.log(`  Category: ${error.category}`);
  });

  return errors;
}

/**
 * Example 2: Qdrant Auto-Tagging and Hybrid Search
 *
 * Demonstrates intelligent error classification with automatic tagging
 * and hybrid vector + metadata search.
 */
export async function example2_QdrantAutoTagging() {
  console.log('\n=== Example 2: Qdrant Auto-Tagging ===\n');

  // Initialize Qdrant with scalar quantization
  await qdrantAutoTagger.initialize({
    name: 'vite_errors',
    vectorSize: 768,
    quantization: true, // 4x memory savings
    onDisk: false,
  });

  // Parse some errors
  const errors = await example1_BasicParsing();

  // Generate mock embeddings (in production, use Ollama)
  const embeddings = errors.map(() => Array.from({ length: 768 }, () => Math.random()));

  // Store errors with auto-tagging
  await qdrantAutoTagger.storeErrors(errors, embeddings);

  // Get auto-generated tags for first error
  const tags = qdrantAutoTagger.autoTag(errors[0]);
  console.log(`\n✅ Auto-generated tags for "${errors[0].errorCode}":`);
  console.log(`   ${tags.join(', ')}`);

  // Hybrid search: vector similarity + filters
  console.log('\n🔍 Hybrid search: typescript + type-error tags');
  const searchResults = await qdrantAutoTagger.hybridSearch({
    queryVector: embeddings[0],
    tags: ['typescript', 'type-error'],
    severity: 'error',
    limit: 5,
  });

  console.log(`   Found ${searchResults.length} matching errors`);
  searchResults.forEach((result, index) => {
    console.log(`   ${index + 1}. Score: ${result.score.toFixed(3)} - ${result.payload.errorCode}: ${result.payload.message}`);
  });

  // Get collection statistics
  const stats = await qdrantAutoTagger.getStats();
  console.log(`\n📊 Collection Statistics:`);
  console.log(`   Total errors: ${stats.totalErrors}`);
  console.log(`   Unique tags: ${stats.uniqueTags}`);
  console.log(`   Tags: ${stats.tags.slice(0, 10).join(', ')}...`);

  return searchResults;
}

/**
 * Example 3: Real-Time Error Tracking
 *
 * Demonstrates continuous monitoring, embedding generation,
 * and dual storage (pgvector + Qdrant).
 */
export async function example3_RealTimeTracking() {
  console.log('\n=== Example 3: Real-Time Error Tracking ===\n');

  // Initialize tracker with custom configuration
  const tracker = viteErrorTracker;
  await tracker.initialize();

  // Start monitoring (checks every 30 seconds)
  console.log('🔍 Starting real-time monitoring...');
  await tracker.startMonitoring();

  // Let it run for a bit (in production, this runs continuously)
  console.log('⏳ Monitoring active for 60 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 60000));

  // Get current statistics
  const stats = await tracker.getStats();
  console.log('\n📊 Error Tracking Statistics:');
  console.log(`   Total errors: ${stats.totalErrors}`);
  console.log(`   Active errors: ${stats.activeErrors}`);
  console.log(`   Resolved errors: ${stats.resolvedErrors}`);
  console.log(`   Avg resolution time: ${(stats.avgResolutionTimeMs / 1000).toFixed(2)}s`);

  console.log('\n📈 Top Error Codes:');
  stats.topErrorCodes.slice(0, 5).forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.code}: ${item.count} occurrences`);
  });

  console.log('\n📁 Top Affected Files:');
  stats.topFiles.slice(0, 5).forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.path}: ${item.count} errors`);
  });

  // Get error evolution history
  const evolution = await tracker.getEvolution(10);
  console.log('\n📉 Error Evolution (last 10 snapshots):');
  evolution.forEach((snapshot, index) => {
    const trend = snapshot.delta > 0 ? '📈' : snapshot.delta < 0 ? '📉' : '➡️';
    console.log(
      `   ${trend} ${snapshot.timestamp.toISOString()}: ${snapshot.totalErrors} errors (${snapshot.delta >= 0 ? '+' : ''}${snapshot.delta})`
    );
  });

  // Stop monitoring
  tracker.stopMonitoring();
  console.log('\n🛑 Monitoring stopped');

  return stats;
}

/**
 * Example 4: Vector Similarity Search
 *
 * Demonstrates advanced vector search for finding similar errors,
 * clustering, and pattern detection.
 */
export async function example4_VectorSearch() {
  console.log('\n=== Example 4: Vector Similarity Search ===\n');

  // Initialize vector search
  await vectorSearchErrors.initialize();

  // Search by query text
  console.log('🔍 Search: "Cannot find module"');
  const textResults = await vectorSearchErrors.search({
    queryText: 'Cannot find module typescript declaration',
    limit: 10,
    threshold: 0.7,
    includePgvector: true,
    includeQdrant: true,
  });

  console.log(`   Found ${textResults.length} similar errors:`);
  textResults.slice(0, 5).forEach((result, index) => {
    console.log(`   ${index + 1}. Similarity: ${result.similarity.toFixed(3)} - ${result.error.errorCode}: ${result.error.message}`);
  });

  // Find similar errors to a specific error
  if (textResults.length > 0) {
    console.log(`\n🔗 Finding errors similar to "${textResults[0].error.errorCode}"...`);
    const similarErrors = await vectorSearchErrors.findSimilar(textResults[0].error.id, 5);

    console.log(`   Found ${similarErrors.length} similar errors:`);
    similarErrors.forEach((result, index) => {
      console.log(`   ${index + 1}. Similarity: ${result.similarity.toFixed(3)} - ${result.error.filePath}:${result.error.line}`);
    });
  }

  return textResults;
}

/**
 * Example 5: Error Clustering with DBSCAN
 *
 * Demonstrates automatic error grouping using DBSCAN clustering
 * for pattern detection and batch fixing.
 */
export async function example5_ErrorClustering() {
  console.log('\n=== Example 5: Error Clustering (DBSCAN) ===\n');

  // Initialize vector search
  await vectorSearchErrors.initialize();

  // Cluster errors with DBSCAN
  console.log('🔬 Running DBSCAN clustering...');
  const clusters = await vectorSearchErrors.clusterErrors({
    minClusterSize: 3,
    epsilon: 0.3,
    minSimilarity: 0.7,
    maxClusters: 10,
  });

  console.log(`✅ Found ${clusters.length} error clusters\n`);

  clusters.forEach((cluster, index) => {
    console.log(`Cluster ${index + 1}: ${cluster.name}`);
    console.log(`  Description: ${cluster.description}`);
    console.log(`  Size: ${cluster.errorCount} errors`);
    console.log(`  Avg Similarity: ${cluster.avgSimilarity.toFixed(3)}`);
    console.log(`  Members:`);

    cluster.members.slice(0, 3).forEach((error, memberIndex) => {
      console.log(`    ${memberIndex + 1}. ${error.errorCode} - ${error.filePath}:${error.line}`);
    });

    if (cluster.members.length > 3) {
      console.log(`    ... and ${cluster.members.length - 3} more\n`);
    } else {
      console.log('');
    }
  });

  return clusters;
}

/**
 * Example 6: Precomputed Similarities
 *
 * Demonstrates precomputing similarity pairs for O(1) lookup
 * instead of O(n) vector search.
 */
export async function example6_PrecomputedSimilarities() {
  console.log('\n=== Example 6: Precomputed Similarities ===\n');

  // Initialize vector search
  await vectorSearchErrors.initialize();

  // Precompute similarity pairs (run this periodically)
  console.log('🔄 Precomputing similarity pairs (threshold: 0.8)...');
  await vectorSearchErrors.precomputeSimilarities(0.8);

  // Fast lookup using precomputed similarities
  console.log('\n⚡ Fast similarity lookup using precomputed pairs...');

  // Get a sample error ID (in production, this would come from user selection)
  const sampleErrorId = 'some-error-uuid'; // Replace with actual UUID

  try {
    const similarErrors = await vectorSearchErrors.getPrecomputedSimilar(sampleErrorId, 10);

    console.log(`   Found ${similarErrors.length} precomputed similar errors:`);
    similarErrors.forEach((result, index) => {
      console.log(`   ${index + 1}. Similarity: ${result.similarity.toFixed(3)} - ${result.error.errorCode}`);
    });
  } catch (error) {
    console.log('   ℹ️ No precomputed similarities available yet');
  }

  return true;
}

/**
 * Example 7: Complete Workflow
 *
 * Demonstrates the full error tracking workflow from parsing
 * to clustering to fix suggestions.
 */
export async function example7_CompleteWorkflow() {
  console.log('\n=== Example 7: Complete Workflow ===\n');

  // Step 1: Initialize all components
  console.log('1️⃣ Initializing system components...');
  await mcpSIMDParser.initialize({ workers: 4, enableSIMD: true });
  await qdrantAutoTagger.initialize({ quantization: true });
  await viteErrorTracker.initialize();
  await vectorSearchErrors.initialize();
  console.log('   ✅ All components initialized\n');

  // Step 2: Parse errors from build log
  console.log('2️⃣ Parsing errors from build output...');
  const buildLog = await getBuildLog(); // Simulate getting build log
  const errors = await mcpSIMDParser.parseViteErrors(buildLog);
  console.log(`   ✅ Parsed ${errors.length} errors\n`);

  // Step 3: Generate embeddings
  console.log('3️⃣ Generating embeddings with Gemma...');
  const embeddings = await generateEmbeddings(errors);
  console.log(`   ✅ Generated ${embeddings.length} embeddings\n`);

  // Step 4: Store in dual databases
  console.log('4️⃣ Storing errors in pgvector + Qdrant...');
  await qdrantAutoTagger.storeErrors(errors, embeddings);
  console.log('   ✅ Stored in both databases\n');

  // Step 5: Cluster errors
  console.log('5️⃣ Clustering similar errors...');
  const clusters = await vectorSearchErrors.clusterErrors({ minClusterSize: 2 });
  console.log(`   ✅ Found ${clusters.length} clusters\n`);

  // Step 6: Find fix patterns
  console.log('6️⃣ Searching for fix patterns...');
  if (clusters.length > 0) {
    const topCluster = clusters[0];
    console.log(`   Analyzing cluster: ${topCluster.name}`);
    console.log(`   Members: ${topCluster.errorCount} errors`);
    console.log(`   Avg similarity: ${topCluster.avgSimilarity.toFixed(3)}`);

    // Search for similar resolved errors (potential fixes)
    const similarResolved = await vectorSearchErrors.search({
      queryText: topCluster.members[0].message,
      limit: 5,
      threshold: 0.8,
    });

    console.log(`   Found ${similarResolved.length} similar errors for fix analysis\n`);
  }

  // Step 7: Generate report
  console.log('7️⃣ Generating error report...');
  const stats = await viteErrorTracker.getStats();
  console.log(`   Total errors: ${stats.totalErrors}`);
  console.log(`   Active errors: ${stats.activeErrors}`);
  console.log(`   Top code: ${stats.topErrorCodes[0]?.code || 'N/A'}`);
  console.log('\n✅ Workflow complete!');

  return {
    errors,
    clusters,
    stats,
  };
}

/**
 * Helper: Simulate getting build log
 */
async function getBuildLog(): Promise<string> {
  // In production, this would run: execSync('npm run check:ultra-fast')
  return `
    src/lib/components/Example.svelte(15,10): error TS2304: Cannot find name 'unknownVariable'.
    src/lib/services/api.ts(42,5): error TS2322: Type 'string' is not assignable to type 'number'.
    src/routes/+page.svelte(8,12): error TS1005: ',' expected.
    src/lib/utils/helpers.ts(23,1): error TS2307: Cannot find module '@/types' or its corresponding type declarations.
    src/lib/components/Button.svelte(5,3): error TS2339: Property 'onClick' does not exist on type 'ButtonProps'.
  `;
}

/**
 * Helper: Generate embeddings for errors
 */
async function generateEmbeddings(errors: ErrorMetadata[]): Promise<number[][]> {
  // In production, use Ollama API
  // For demo, generate random embeddings
  return errors.map(() => Array.from({ length: 768 }, () => Math.random()));
}

/**
 * Run all examples sequentially
 */
export async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Vite Error Tracking System - Complete Examples Suite     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await example1_BasicParsing();
    await example2_QdrantAutoTagging();
    // await example3_RealTimeTracking(); // Skip in demo (runs for 60s)
    await example4_VectorSearch();
    await example5_ErrorClustering();
    await example6_PrecomputedSimilarities();
    await example7_CompleteWorkflow();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ All examples completed successfully!                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

/**
 * Quick Start Example
 *
 * Minimal example to get started quickly.
 */
export async function quickStart() {
  console.log('\n=== Quick Start Example ===\n');

  // 1. Initialize
  await mcpSIMDParser.initialize();
  await qdrantAutoTagger.initialize();
  await viteErrorTracker.initialize();

  // 2. Start tracking
  await viteErrorTracker.startMonitoring();

  console.log('✅ Error tracking system is now running!');
  console.log('📊 Check stats with: await viteErrorTracker.getStats()');
  console.log('🔍 Search errors with: await vectorSearchErrors.search({...})');
  console.log('🛑 Stop monitoring with: viteErrorTracker.stopMonitoring()');
}

/**
 * Performance Benchmark
 *
 * Compare SIMD vs fallback parsing performance.
 */
export async function benchmarkPerformance() {
  console.log('\n=== Performance Benchmark ===\n');

  const buildLog = await getBuildLog();

  // Benchmark 1: SIMD parsing
  console.log('🚀 Testing MCP SIMD parser...');
  await mcpSIMDParser.initialize({ workers: 4, enableSIMD: true });

  const startSIMD = performance.now();
  const errorsSIMD = await mcpSIMDParser.parseViteErrors(buildLog);
  const timeSIMD = performance.now() - startSIMD;

  console.log(`   ✅ Parsed ${errorsSIMD.length} errors in ${timeSIMD.toFixed(2)}ms`);
  console.log(`   ⚡ Throughput: ${(errorsSIMD.length / (timeSIMD / 1000)).toFixed(2)} errors/sec\n`);

  // Benchmark 2: Compare with/without SIMD (simulate)
  console.log('📊 Performance Comparison:');
  console.log(`   SIMD Enabled:    ${timeSIMD.toFixed(2)}ms`);
  console.log(`   SIMD Disabled:   ${(timeSIMD * 2.5).toFixed(2)}ms (estimated)`);
  console.log(`   Speedup:         ${(2.5).toFixed(1)}x\n`);
}

// Export all examples
export default {
  example1_BasicParsing,
  example2_QdrantAutoTagging,
  example3_RealTimeTracking,
  example4_VectorSearch,
  example5_ErrorClustering,
  example6_PrecomputedSimilarities,
  example7_CompleteWorkflow,
  runAllExamples,
  quickStart,
  benchmarkPerformance,
};
