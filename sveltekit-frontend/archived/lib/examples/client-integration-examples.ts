/**
 * Client-Side Integration Examples
 *
 * Real-world examples showing how to integrate the WebGPU buffer quantization system
 * with existing client-side legal AI components and workflows.
 */
import { legalAIBridge, LegalAIIntegration } from '$lib/integrations/legal-ai-webgpu-bridge.js';

// Add small typed shapes to avoid `any` usage
type CompressionStats = {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  spaceSavings?: string;
};

type ProcessingResult = {
  // allow either a browser ArrayBuffer or a WebGPU GPUBuffer (or null)
  buffer?: ArrayBuffer | GPUBuffer | null;
  compressionStats: CompressionStats;
  processingTime: number;
};

type PerformanceStatsShape = {
  cacheStats?: { entryCount?: number };
  isWebGPUAvailable?: boolean;
  [k: string]: unknown;
};

// --- changed: tighten document type to match LegalAIIntegration expectations ---
type LegalDocumentType = 'contract' | 'brief' | 'case-law' | 'evidence' | 'citation';

// --- new: broadened union for functions that may return GPUBuffer directly ---
type IntegrationResult = ProcessingResult | Float32Array | GPUBuffer | null;

/**
 * Example 1: Integrate with existing legal document chat interface
 */
export async function integrateLegalChatWithWebGPU() {
  console.log('💬 Integrating legal chat with WebGPU buffer system...');
  // Simulate existing legal chat system with document embeddings
  const legalDocuments = [
    {
      id: 'contract-001',
      title: 'Software License Agreement',
      embeddings: new Float32Array(768).fill(0.1),
      type: 'contract' as const,
    },
    {
      id: 'brief-002',
      title: 'Motion to Dismiss',
      embeddings: new Float32Array(768).fill(0.2),
      type: 'brief' as const,
    },
    {
      id: 'case-003',
      title: 'Smith vs. Jones Precedent',
      embeddings: new Float32Array(768).fill(0.3),
      type: 'case-law' as const,
    },
  ];
  try {
    // Initialize the legal AI bridge
    await legalAIBridge.initialize();
    // Process documents with appropriate legal AI profiles
    const processedDocuments = await Promise.all(
      legalDocuments.map(async doc => {
        const result = (await legalAIBridge.processLegalDocumentEmbeddings(doc.embeddings, {
          documentType: doc.type,
          enableCaching: true,
          debugMode: true,
        })) as unknown as IntegrationResult; // updated to accept GPUBuffer

        const defaultCompression: CompressionStats = {
          originalSize: 0,
          compressedSize: 0,
          compressionRatio: 1,
          spaceSavings: '0%',
        };

        return {
          ...doc,
          webgpuBuffer: result?.buffer ?? null,
          compressionStats: result?.compressionStats ?? defaultCompression,
          processingTime: result?.processingTime ?? 0,
        };
      })
    );
    console.log('✅ Legal chat WebGPU integration complete:', {
      documentsProcessed: processedDocuments.length,
      averageCompressionRatio:
        processedDocuments.reduce((sum: number, doc) => sum + (doc.compressionStats?.compressionRatio ?? 1), 0) /
        processedDocuments.length,
      totalMemorySaved: processedDocuments.reduce(
        (sum: number, doc) =>
          sum + ((doc.compressionStats?.originalSize ?? 0) - (doc.compressionStats?.compressedSize ?? 0)),
        0
      ),
    });
    return processedDocuments;
  } catch (error) {
    console.error('❌ Legal chat WebGPU integration failed:', error);
    // Fallback to CPU processing
    return legalDocuments.map(doc => ({
      ...doc,
      webgpuBuffer: null,
      processingTime: 0,
      compressionStats: { originalSize: 0, compressedSize: 0, compressionRatio: 1, spaceSavings: '0%' },
    }));
  }
}
/**
 * Example 2: Enhance existing legal document similarity search
 */
export async function enhanceLegalSimilaritySearchWithQuantization() {
  console.log('🔍 Enhancing legal similarity search with quantization...');
  // Simulate existing similarity search system
  const queryDocument = new Float32Array(768);
  for (let i = 0; i < queryDocument.length; i++) {
    queryDocument[i] = Math.random() * 0.5 + 0.25; // Legal document-like embeddings
  }
  const legalCorpus = [];
  for (let i = 0; i < 100; i++) {
    const doc = new Float32Array(768);
    for (let j = 0; j < doc.length; j++) {
      doc[j] = Math.random() * 0.3 + 0.1; // Similar legal documents
    }
    legalCorpus.push(doc);
  }
  try {
    const searchSetup = await LegalAIIntegration.setupLegalSimilaritySearch(queryDocument, legalCorpus);
    console.log('✅ Enhanced legal similarity search ready:', {
      queryBufferReady: !!searchSetup.queryBuffer,
      corpusBuffersCount: searchSetup.corpusBuffers.length,
      processingStats: searchSetup.processingStats,
    });
    // In a real application, you would now dispatch GPU compute shaders
    // to perform the actual similarity calculations
    console.log('🚀 Ready for GPU-accelerated similarity search!');
    return searchSetup;
  } catch (error) {
    console.error('❌ Enhanced similarity search setup failed:', error);
    return null;
  }
}
/**
 * Example 3: Integrate with legal document upload and processing workflow
 */
export async function integrateLegalDocumentUploadWorkflow() {
  console.log('📤 Integrating legal document upload workflow...');
  // Simulate document upload with different types and priorities
  const uploadedDocuments = [
    {
      filename: 'merger-agreement.pdf',
      type: 'contract' as const,
      priority: 'high' as const,
      embeddings: generateLegalEmbeddings(1024), // Large contract
    },
    {
      filename: 'discovery-motion.pdf',
      type: 'brief' as const,
      priority: 'medium' as const,
      embeddings: generateLegalEmbeddings(512), // Standard brief
    },
    {
      filename: 'evidence-photos.pdf',
      type: 'evidence' as const,
      priority: 'medium' as const,
      embeddings: generateLegalEmbeddings(256), // Evidence documentation
    },
    {
      filename: 'case-citations.pdf',
      type: 'citation' as const,
      priority: 'low' as const,
      embeddings: generateLegalEmbeddings(768), // Citation references
    },
  ];
  try {
    await legalAIBridge.initialize();
    // Batch process all uploaded documents
    const processingResults = (await legalAIBridge.batchProcessLegalDocuments(
      uploadedDocuments.map(doc => ({
        embeddings: doc.embeddings,
        type: doc.type,
        priority: doc.priority,
      })),
      {
        enableCaching: true,
        debugMode: true,
      }
    )) as unknown as ProcessingResult[];

    const enhancedDocuments = uploadedDocuments.map((doc, index) => ({
      ...doc,
      webgpuProcessing: processingResults[index],
      optimizationScore: calculateOptimizationScore(processingResults[index]),
    }));

    console.log('✅ Legal document upload workflow enhanced:', {
      documentsProcessed: enhancedDocuments.length,
      totalCompressionRatio:
        processingResults.reduce((sum: number, r) => sum + (r?.compressionStats?.compressionRatio ?? 1), 0) /
        Math.max(1, processingResults.length),
      totalSpaceSaved: processingResults.reduce(
        (sum: number, r) => sum + parseFloat(r?.compressionStats?.spaceSavings ?? '0'),
        0
      ),
      averageProcessingTime:
        processingResults.reduce((sum: number, r) => sum + (r?.processingTime ?? 0), 0) /
        Math.max(1, processingResults.length),
    });
    return enhancedDocuments;
  } catch (error) {
    console.error('❌ Legal document upload workflow integration failed:', error);
    return uploadedDocuments.map(doc => ({ ...doc, webgpuProcessing: null }));
  }
}
/**
 * Example 4: Real-time legal analysis with WebGPU acceleration
 */
export async function enableRealTimeLegalAnalysis() {
  console.log('⚡ Enabling real-time legal analysis...');
  // Simulate real-time legal text analysis pipeline
  const legalTextSamples = [
    'The party of the first part shall indemnify the party of the second part...',
    'Whereas the plaintiff alleges breach of contract...',
    'The court finds that the evidence supports...',
    'In accordance with Federal Rule of Civil Procedure...',
  ];
  try {
    await legalAIBridge.initialize();
    // Simulate text-to-embeddings conversion (normally done by your AI model)
    const embeddingPromises = legalTextSamples.map(async (_text, index) => {
      const embeddings = generateLegalEmbeddings(768, 0.1 + index * 0.2);
      return (await LegalAIIntegration.processEmbeddingsForLegalAI(
        embeddings,
        index < 2 ? 'contract' : 'brief'
      )) as unknown as IntegrationResult; // updated to include GPUBuffer
    });
    const processedEmbeddings = await Promise.all(embeddingPromises);
    console.log('✅ Real-time legal analysis enabled:', {
      textSamplesProcessed: legalTextSamples.length,
      webgpuBuffersCreated: processedEmbeddings.filter(item => !!(item && (item as ProcessingResult)?.buffer)).length,
      cpuFallbacks: processedEmbeddings.filter(item => item instanceof Float32Array).length,
      performanceMetrics: LegalAIIntegration.getLegalAIPerformanceMetrics(),
    });
    return {
      originalTexts: legalTextSamples,
      processedEmbeddings,
      isWebGPUAccelerated: processedEmbeddings.some(e => !(e instanceof Float32Array)),
    };
  } catch (error) {
    console.error('❌ Real-time legal analysis setup failed:', error);
    return null;
  }
}
/**
 * Example 5: Performance monitoring integration
 */
export async function setupLegalAIPerformanceMonitoring() {
  console.log('📊 Setting up legal AI performance monitoring...');
  try {
    await legalAIBridge.initialize();
    // Simulate some processing activity
    const legalDocTypes = ['contract', 'brief', 'evidence', 'case-law', 'citation'] as const;
    const legalPriorities = ['high', 'medium', 'low'] as const;
    const testDocuments = Array.from({ length: 10 }, (_, i) => ({
      embeddings: generateLegalEmbeddings(384 + i * 64), // Varying sizes
      type: legalDocTypes[i % legalDocTypes.length],
      priority: legalPriorities[i % legalPriorities.length],
    }));
    await legalAIBridge.batchProcessLegalDocuments(testDocuments);
    // Get comprehensive performance metrics
    const performanceStats = legalAIBridge.getPerformanceStats();
    console.log('✅ Legal AI performance monitoring active:', performanceStats);
    // Set up periodic monitoring (in a real app, you'd use setInterval)
    const monitoringData = {
      timestamp: new Date().toISOString(),
      stats: performanceStats,
      recommendations: generatePerformanceRecommendations(performanceStats),
    };
    return monitoringData;
  } catch (error) {
    console.error('❌ Performance monitoring setup failed:', error);
    return null;
  }
}
/**
 * Example 6: Progressive enhancement for existing legal AI components
 */
export class ProgressiveLegalAIEnhancement {
  private webgpuAvailable = false;
  private fallbackMode = false;
  async initialize() {
    console.log('🔄 Initializing progressive legal AI enhancement...');
    try {
      this.webgpuAvailable = await legalAIBridge.initialize();
      this.fallbackMode = !this.webgpuAvailable;
      console.log(this.webgpuAvailable ? '✅ WebGPU enhancement active' : '⚠️ Fallback mode - using CPU processing');
      return this.webgpuAvailable;
    } catch (error) {
      console.error('Enhancement initialization failed:', error);
      this.fallbackMode = true;
      return false;
    }
  }

  // Use the typed document kind and a concrete return type instead of implicit any
  // --- changed signature: include GPUBuffer in return union ---
  async processLegalDocument(embeddings: Float32Array, documentType: LegalDocumentType): Promise<IntegrationResult> {
    if (this.webgpuAvailable && !this.fallbackMode) {
      try {
        // now returns IntegrationResult (could be GPUBuffer, ProcessingResult, Float32Array, or null)
        return (await LegalAIIntegration.processEmbeddingsForLegalAI(embeddings, documentType)) as IntegrationResult;
      } catch (error) {
        console.warn('WebGPU processing failed, falling back to CPU:', error);
        this.fallbackMode = true;
      }
    }
    return embeddings; // CPU fallback (Float32Array)
  }

  getStatus() {
    return {
      webgpuAvailable: this.webgpuAvailable,
      fallbackMode: this.fallbackMode,
      enhancementActive: this.webgpuAvailable && !this.fallbackMode,
    };
  }
}
// Helper functions
function generateLegalEmbeddings(dimensions: number, baseValue = 0.1): Float32Array {
  const embeddings = new Float32Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    // Generate embeddings with legal document-like characteristics
    embeddings[i] = baseValue + (Math.random() - 0.5) * 0.4;
  }
  return embeddings;
}

function calculateOptimizationScore(result: ProcessingResult | null | undefined): number {
  const ratio = result?.compressionStats?.compressionRatio ?? 1;
  const time = result?.processingTime ?? 0;
  const compressionScore = Math.min(ratio / 4, 1) * 50;
  const speedScore = Math.max(0, 50 - time / 10);
  return Math.round(compressionScore + speedScore);
}

function generatePerformanceRecommendations(stats: PerformanceStatsShape): string[] {
  const recs: string[] = [];
  if (stats?.cacheStats?.entryCount && stats.cacheStats.entryCount > 50) {
    recs.push('Consider clearing cache to free memory');
  }
  if (stats?.isWebGPUAvailable) {
    recs.push('WebGPU acceleration is active');
  } else {
    recs.push('Consider upgrading browser/hardware for WebGPU');
  }
  return recs;
}

// Export all examples for easy access
export const clientIntegrationExamples = {
  integrateLegalChatWithWebGPU,
  enhanceLegalSimilaritySearchWithQuantization,
  integrateLegalDocumentUploadWorkflow,
  enableRealTimeLegalAnalysis,
  setupLegalAIPerformanceMonitoring,
  ProgressiveLegalAIEnhancement
}
export default clientIntegrationExamples;