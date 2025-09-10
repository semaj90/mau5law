/**
 * ONNX Integration Example for Legal-BERT
 * Shows how to use the Legal-BERT ONNX wrapper in production
 */

import { legalBertONNXService } from './legal-bert-onnx-service';
import { ollamaService } from './ollama-service';

/**
 * Example: Process a legal document with ONNX optimization
 */
export async function processLegalDocumentWithONNX(documentText: string) {
  try {
    console.log('🔬 Processing legal document with ONNX Legal-BERT...');
    
    // Step 1: Extract entities using ONNX (fast)
    const entities = await ollamaService.extractLegalEntities(documentText);
    console.log('📋 Entities extracted:', entities.entities.length, 'in', entities.processingTime, 'ms');
    
    // Step 2: Classify document type using ONNX (fast)
    const classification = await ollamaService.classifyLegalDocument(documentText);
    console.log('📊 Document classified as:', classification.topPrediction.label, 
                'with confidence:', Math.round(classification.topPrediction.confidence * 100) + '%');
    
    // Step 3: Generate embeddings using ONNX (fast)
    const embeddings = await ollamaService.generateLegalEmbeddings(documentText);
    console.log('🧮 Embeddings generated:', embeddings.length, 'dimensions');
    
    // Step 4: Full analysis using Gemma:legal for comprehensive understanding
    const fullAnalysis = await ollamaService.generate(
      `Provide a comprehensive legal analysis of this document:

Document Type: ${classification.topPrediction.label}
Key Entities: ${entities.entities.map(e => e.text).join(', ')}

Text: ${documentText}

Analysis:`, 
      {
        model: 'gemma:legal',
        options: { temperature: 0.3 }
      }
    );
    
    return {
      entities: entities.entities,
      classification: classification.topPrediction,
      embeddings,
      fullAnalysis: fullAnalysis.response,
      performance: {
        entityExtractionTime: entities.processingTime,
        classificationTime: classification.processingTime,
        totalProcessingTime: Date.now() - performance.now()
      }
    };
    
  } catch (error) {
    console.error('❌ Error processing document with ONNX:', error);
    throw error;
  }
}

/**
 * Example: Initialize ONNX services on startup
 */
export async function initializeONNXServices() {
  try {
    console.log('🚀 Initializing ONNX Legal-BERT service...');
    
    // Initialize ONNX Legal-BERT
    await legalBertONNXService.initialize();
    
    // Test basic functionality
    const testResult = await legalBertONNXService.extractLegalEntities(
      "This is a test contract between John Doe and ABC Corporation."
    );
    
    console.log('✅ ONNX Legal-BERT test successful:', testResult.entities.length, 'entities found');
    
    // Get performance metrics
    const metrics = legalBertONNXService.getPerformanceMetrics();
    console.log('📊 ONNX Performance metrics:', metrics);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize ONNX services:', error);
    return false;
  }
}

/**
 * Example: Batch process multiple legal documents efficiently
 */
export async function batchProcessLegalDocuments(documents: Array<{ id: string; text: string }>) {
  const results = [];
  const startTime = Date.now();
  
  console.log(`🔄 Batch processing ${documents.length} legal documents with ONNX...`);
  
  for (const doc of documents) {
    try {
      const result = await processLegalDocumentWithONNX(doc.text);
      results.push({
        documentId: doc.id,
        ...result,
        success: true
      });
    } catch (error) {
      console.error(`❌ Failed to process document ${doc.id}:`, error);
      results.push({
        documentId: doc.id,
        error: error.message,
        success: false
      });
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  
  console.log(`✅ Batch processing complete: ${successCount}/${documents.length} successful in ${totalTime}ms`);
  console.log(`⚡ Average time per document: ${Math.round(totalTime / documents.length)}ms`);
  
  return {
    results,
    summary: {
      totalDocuments: documents.length,
      successful: successCount,
      failed: documents.length - successCount,
      totalTime,
      averageTimePerDocument: Math.round(totalTime / documents.length)
    }
  };
}

/**
 * Example: Performance comparison between ONNX and Ollama
 */
export async function performanceComparison(testText: string) {
  console.log('⚡ Running performance comparison: ONNX vs Ollama...');
  
  const tests = {
    onnx: {
      entityExtraction: null,
      classification: null,
      embeddings: null
    },
    ollama: {
      entityExtraction: null,
      classification: null,
      embeddings: null
    }
  };
  
  try {
    // Test ONNX Legal-BERT
    console.log('🔬 Testing ONNX Legal-BERT...');
    const onnxStart = Date.now();
    
    const onnxEntities = await legalBertONNXService.extractLegalEntities(testText);
    tests.onnx.entityExtraction = onnxEntities.processingTime;
    
    const onnxClassification = await legalBertONNXService.classifyLegalDocument(testText);
    tests.onnx.classification = onnxClassification.processingTime;
    
    const onnxEmbeddings = await legalBertONNXService.generateEmbeddings(testText);
    tests.onnx.embeddings = onnxEmbeddings.processingTime;
    
    const onnxTotal = Date.now() - onnxStart;
    
    // Test Ollama Gemma:legal
    console.log('🦙 Testing Ollama Gemma:legal...');
    const ollamaStart = Date.now();
    
    const ollamaResponse = await ollamaService.generate(
      `Extract entities, classify document type, and provide analysis for: ${testText}`,
      { model: 'gemma:legal' }
    );
    
    const ollamaTotal = Date.now() - ollamaStart;
    
    const comparison = {
      onnx: {
        ...tests.onnx,
        total: onnxTotal,
        averageLatency: legalBertONNXService.getPerformanceMetrics().averageLatency
      },
      ollama: {
        total: ollamaTotal,
        responseLength: ollamaResponse.response?.length || 0
      },
      speedup: {
        entityExtraction: ollamaTotal / (tests.onnx.entityExtraction || 1),
        overall: ollamaTotal / onnxTotal
      }
    };
    
    console.log('📊 Performance Comparison Results:');
    console.log('ONNX Total Time:', onnxTotal, 'ms');
    console.log('Ollama Total Time:', ollamaTotal, 'ms');
    console.log('ONNX Speedup Factor:', Math.round(comparison.speedup.overall * 100) / 100 + 'x');
    
    return comparison;
    
  } catch (error) {
    console.error('❌ Performance comparison failed:', error);
    throw error;
  }
}