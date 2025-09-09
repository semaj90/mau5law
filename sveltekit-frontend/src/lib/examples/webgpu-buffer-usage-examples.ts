/**
 * WebGPU Buffer System Usage Examples
 * 
 * Comprehensive examples showing how to use the buffer conversion,
 * quantization, and upload utilities together in real legal AI scenarios.
 */

import { 
  WebGPUBufferUtils,
  toFloat32Array,
  type BufferLike,
  BufferDebugUtils
} from '../utils/buffer-conversion.js';

import {
  quantizeForLegalAI,
  ensureF32,
  type LegalAIProfile,
  quantizeWithStats,
  LEGAL_AI_QUANTIZATION_PROFILES
} from '../utils/typed-array-quantization.js';

import {
  WebGPUBufferUploader,
  WebGPUBufferUtils_Extended
} from '../utils/webgpu-buffer-uploader.js';

/**
 * Example 1: Basic Legal Document Embedding Processing
 */
export async function basicLegalDocumentProcessing(device: GPUDevice) {
  // Simulate legal document embeddings (768-dimensional vectors)
  const documentEmbeddings = new Float32Array(1000 * 768); // 1000 documents
  documentEmbeddings.fill(0.1); // Fill with dummy data
  
  console.log('📄 Processing legal document embeddings...');
  
  // Method 1: Quick upload with automatic quantization
  const quickBuffer = await WebGPUBufferUtils_Extended.uploadForLegalAI(
    device,
    documentEmbeddings,
    'standard' // balanced precision/performance
  );
  
  console.log('✅ Quick upload complete');
  
  // Method 2: Advanced upload with custom options
  const uploader = new WebGPUBufferUploader(device);
  const advancedResult = await uploader.createLegalAnalysisBuffer(
    documentEmbeddings,
    'compressed' // high compression for large datasets
  );
  
  console.log('📊 Advanced upload stats:', advancedResult.uploadStats);
  
  // Cleanup
  quickBuffer.destroy();
  advancedResult.buffer.destroy();
  uploader.clearCache();
}

/**
 * Example 2: Multi-Resolution Legal Analysis Pipeline
 */
export async function multiResolutionLegalAnalysis(device: GPUDevice) {
  console.log('⚖️ Multi-resolution legal analysis...');
  
  // Different types of legal data requiring different precision levels
  const criticalContractData = new Float32Array(512).fill(0.9); // High-stakes contract
  const standardBriefData = new Float32Array(1024).fill(0.5);   // Standard legal brief
  const bulkCaseData = new Float32Array(10000).fill(0.2);       // Bulk case law

  const uploader = new WebGPUBufferUploader(device, true); // Enable caching
  
  // Upload with different legal AI profiles
  const [criticalBuffer, standardBuffer, bulkBuffer] = await Promise.all([
    uploader.createLegalAnalysisBuffer(criticalContractData, 'critical'),
    uploader.createLegalAnalysisBuffer(standardBriefData, 'standard'), 
    uploader.createLegalAnalysisBuffer(bulkCaseData, 'storage')
  ]);
  
  console.log('📈 Multi-resolution upload complete:');
  console.log('- Critical:', criticalBuffer.uploadStats);
  console.log('- Standard:', standardBuffer.uploadStats);
  console.log('- Bulk:', bulkBuffer.uploadStats);
  
  // Cache statistics
  console.log('🗄️ Cache stats:', uploader.getCacheStats());
  
  // Cleanup
  [criticalBuffer, standardBuffer, bulkBuffer].forEach(result => 
    result.buffer.destroy()
  );
}

/**
 * Example 3: Batch Legal Document Processing
 */
export async function batchLegalDocumentProcessing(device: GPUDevice) {
  console.log('📦 Batch legal document processing...');
  
  // Simulate multiple legal documents with varying sizes
  const legalDocuments = [
    new Float32Array(768).fill(0.8),   // Contract
    new Float32Array(1024).fill(0.6),  // Brief  
    new Float32Array(512).fill(0.9),   // Evidence
    new Float32Array(2048).fill(0.3),  // Case law
    new Float32Array(256).fill(0.95)   // Citation
  ];
  
  const uploader = new WebGPUBufferUploader(device);
  
  // Batch upload with legal standard profile
  const batchResults = await uploader.uploadBatch(legalDocuments, {
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    quantization: 'legal_standard',
    label: 'legal-document-batch',
    debugMode: true
  });
  
  console.log(`✅ Batch processed ${batchResults.length} legal documents`);
  
  // Process results
  batchResults.forEach((result, index) => {
    console.log(`📋 Document ${index + 1}:`, {
      compressionRatio: `${result.uploadStats.compressionRatio.toFixed(2)}x`,
      size: `${(result.uploadStats.uploadedSize / 1024).toFixed(2)} KB`
    });
  });
  
  // Cleanup
  batchResults.forEach(result => result.buffer.destroy());
}

/**
 * Example 4: Legal AI Compute Pipeline with Quantization
 */
export async function legalAIComputePipeline(device: GPUDevice) {
  console.log('🧠 Legal AI compute pipeline...');
  
  // Large legal embedding matrix (simulating trained model weights)
  const legalModelWeights = new Float32Array(50000).fill(0.1);
  
  // Input legal document vector
  const inputDocument = new Float32Array(768).fill(0.5);
  
  // Quantize with statistics for analysis
  const weightsQuantized = quantizeWithStats(legalModelWeights, 'int8_symmetric');
  const inputQuantized = quantizeWithStats(inputDocument, 'fp16');
  
  console.log('📊 Quantization stats:');
  console.log('- Weights:', weightsQuantized.stats);
  console.log('- Input:', inputQuantized.stats);
  
  const uploader = new WebGPUBufferUploader(device);
  
  // Upload for compute shader
  const weightsBuffer = await uploader.uploadBuffer(weightsQuantized.data.data, {
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    quantization: weightsQuantized.data.originalType,
    label: 'legal-ai-weights'
  });
  
  const inputBuffer = await uploader.uploadBuffer(inputQuantized.data.data, {
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    quantization: inputQuantized.data.originalType,
    label: 'legal-ai-input'
  });
  
  // Create output buffer
  const outputBuffer = device.createBuffer({
    size: inputDocument.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    label: 'legal-ai-output'
  });
  
  console.log('✅ Legal AI compute buffers ready');
  
  // In a real scenario, you would dispatch compute shaders here
  // For demo, we'll just download the input back
  const downloadResult = await uploader.downloadBuffer(
    inputBuffer.buffer, 
    inputQuantized.data,
    true // debug mode
  );
  
  console.log('📥 Download result length:', downloadResult.data.length);
  console.log('📈 Download stats:', downloadResult.downloadStats);
  
  // Cleanup
  weightsBuffer.buffer.destroy();
  inputBuffer.buffer.destroy();
  outputBuffer.destroy();
}

/**
 * Example 5: Legal Document Similarity Search with Mixed Precision
 */
export async function legalDocumentSimilaritySearch(device: GPUDevice) {
  console.log('🔍 Legal document similarity search...');
  
  // Query document (high precision needed)
  const queryDocument = new Float32Array(768).fill(0.7);
  
  // Large corpus of legal documents (can use lower precision)
  const documentCorpus = [];
  for (let i = 0; i < 1000; i++) {
    documentCorpus.push(new Float32Array(768).fill(0.1 + Math.random() * 0.8));
  }
  
  const uploader = new WebGPUBufferUploader(device);
  
  // Upload query with high precision
  const queryBuffer = await uploader.uploadBuffer(queryDocument, {
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    quantization: 'legal_critical', // High precision for query
    label: 'similarity-query'
  });
  
  // Upload corpus with compression
  const corpusBuffers = await uploader.uploadBatch(documentCorpus.slice(0, 10), { // Just first 10 for demo
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    quantization: 'legal_compressed', // Compressed for bulk storage
    label: 'similarity-corpus',
    debugMode: false
  });
  
  console.log('📚 Similarity search setup complete:');
  console.log(`- Query: ${queryBuffer.uploadStats.compressionRatio.toFixed(2)}x compression`);
  console.log(`- Corpus: ${corpusBuffers.length} documents uploaded`);
  
  // Calculate compression savings
  const totalOriginalSize = corpusBuffers.reduce((sum, r) => sum + r.uploadStats.originalSize, 0);
  const totalCompressedSize = corpusBuffers.reduce((sum, r) => sum + r.uploadStats.uploadedSize, 0);
  
  console.log('💾 Storage savings:', {
    originalSize: `${(totalOriginalSize / 1024).toFixed(2)} KB`,
    compressedSize: `${(totalCompressedSize / 1024).toFixed(2)} KB`,
    savings: `${(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1)}%`
  });
  
  // Cleanup
  queryBuffer.buffer.destroy();
  corpusBuffers.forEach(result => result.buffer.destroy());
}

/**
 * Example 6: Debug and Analysis Tools
 */
export async function debugAndAnalysisExample(device: GPUDevice) {
  console.log('🔧 Debug and analysis tools...');
  
  // Mixed buffer types to demonstrate utilities
  const arrayBufferData = new ArrayBuffer(1024);
  const float32Data = new Float32Array(256).fill(0.5);
  const regularArray = [1, 2, 3, 4, 5];
  
  console.log('🔍 Buffer analysis:');
  
  // Debug different buffer types
  BufferDebugUtils.logBuffer(arrayBufferData, 'ArrayBuffer');
  BufferDebugUtils.logBuffer(float32Data, 'Float32Array');
  BufferDebugUtils.logBuffer(regularArray, 'Regular Array');
  
  // Convert everything to consistent format
  const normalizedData = [
    ensureF32(arrayBufferData),
    ensureF32(float32Data),
    ensureF32(regularArray)
  ];
  
  console.log('📊 Normalized data lengths:', normalizedData.map(d => d.length));
  
  // Test all quantization profiles
  console.log('🎯 Testing legal AI profiles:');
  const testData = new Float32Array(1000).fill(0.5);
  
  for (const [profileName, profile] of Object.entries(LEGAL_AI_QUANTIZATION_PROFILES)) {
    const quantized = quantizeForLegalAI(testData, profileName as LegalAIProfile);
    console.log(`- ${profileName}:`, {
      compressionRatio: `${quantized.compressionRatio.toFixed(2)}x`,
      size: `${(quantized.byteLength / 1024).toFixed(2)} KB`,
      mode: profile.mode
    });
  }
}

/**
 * Example 7: Real-world Legal AI Pipeline Integration
 */
export async function realWorldLegalAIPipeline(device: GPUDevice) {
  console.log('🏛️ Real-world legal AI pipeline...');
  
  // Simulate real legal AI workflow
  const uploader = new WebGPUBufferUploader(device, true);
  
  // 1. Contract analysis (critical precision)
  const contractTerms = new Float32Array(512);
  for (let i = 0; i < contractTerms.length; i++) {
    contractTerms[i] = Math.random(); // Random contract features
  }
  
  // 2. Case law embeddings (standard precision)
  const caseLawEmbeddings = new Float32Array(10000);
  caseLawEmbeddings.fill(0.1 + Math.random() * 0.8);
  
  // 3. Citation network (compressed storage)
  const citationNetwork = new Float32Array(50000);
  citationNetwork.fill(Math.random() * 0.5);
  
  console.log('📝 Processing legal AI components...');
  
  // Process with appropriate precision levels
  const results = await Promise.all([
    uploader.createLegalAnalysisBuffer(contractTerms, 'critical'),
    uploader.createLegalAnalysisBuffer(caseLawEmbeddings, 'standard'),
    uploader.createLegalAnalysisBuffer(citationNetwork, 'storage')
  ]);
  
  const [contractResult, caseLawResult, citationResult] = results;
  
  // Analysis results
  console.log('⚖️ Legal AI pipeline results:');
  console.log('Contract Analysis:', {
    precision: 'Critical (FP32)',
    size: `${(contractResult.uploadStats.uploadedSize / 1024).toFixed(2)} KB`,
    compressionRatio: `${contractResult.uploadStats.compressionRatio.toFixed(2)}x`
  });
  
  console.log('Case Law Processing:', {
    precision: 'Standard (FP16)',
    size: `${(caseLawResult.uploadStats.uploadedSize / 1024).toFixed(2)} KB`,
    compressionRatio: `${caseLawResult.uploadStats.compressionRatio.toFixed(2)}x`
  });
  
  console.log('Citation Network:', {
    precision: 'Storage (INT8)',
    size: `${(citationResult.uploadStats.uploadedSize / 1024).toFixed(2)} KB`,
    compressionRatio: `${citationResult.uploadStats.compressionRatio.toFixed(2)}x`
  });
  
  // Total pipeline efficiency
  const totalOriginalSize = results.reduce((sum, r) => sum + r.uploadStats.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.uploadStats.uploadedSize, 0);
  
  console.log('🎯 Overall Pipeline Efficiency:', {
    totalOriginalSize: `${(totalOriginalSize / 1024).toFixed(2)} KB`,
    totalCompressedSize: `${(totalCompressedSize / 1024).toFixed(2)} KB`,
    overallCompressionRatio: `${(totalOriginalSize / totalCompressedSize).toFixed(2)}x`,
    spaceSavings: `${(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1)}%`
  });
  
  // Cleanup
  results.forEach(result => result.buffer.destroy());
  uploader.clearCache();
  
  console.log('✅ Legal AI pipeline complete');
}

/**
 * Run all examples
 */
export async function runAllExamples(device: GPUDevice) {
  console.log('🚀 Running WebGPU Legal AI Buffer System Examples...\n');
  
  try {
    await basicLegalDocumentProcessing(device);
    console.log('\n---\n');
    
    await multiResolutionLegalAnalysis(device);
    console.log('\n---\n');
    
    await batchLegalDocumentProcessing(device);
    console.log('\n---\n');
    
    await legalAIComputePipeline(device);
    console.log('\n---\n');
    
    await legalDocumentSimilaritySearch(device);
    console.log('\n---\n');
    
    await debugAndAnalysisExample(device);
    console.log('\n---\n');
    
    await realWorldLegalAIPipeline(device);
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  }
}

// Export example runner for easy integration
export default {
  basicLegalDocumentProcessing,
  multiResolutionLegalAnalysis,
  batchLegalDocumentProcessing,
  legalAIComputePipeline,
  legalDocumentSimilaritySearch,
  debugAndAnalysisExample,
  realWorldLegalAIPipeline,
  runAllExamples
};