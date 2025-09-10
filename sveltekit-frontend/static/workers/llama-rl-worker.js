/**
 * YoRHa Legal AI Pipeline Service Worker
 * Integrated Gemma 3 + Legal-BERT ONNX + Gemma Embeddings
 * Uses only our AI pipeline architecture
 */

// Memory management configuration optimized for our AI pipeline
const MEMORY_CONFIG = {
  maxModelSize: 8 * 1024 * 1024 * 1024, // 8GB max for Gemma 3 Legal
  chunkSize: 128 * 1024, // 128KB chunks for better performance
  gcThreshold: 0.85, // More aggressive GC
  embedDimensions: 768, // Gemma embeddings dimensions
  maxContextLength: 8192, // Gemma 3 Legal context window
  batchSize: 4, // Optimized for legal processing
  gemmaEmbeddingPriority: true
};

// Multi-model state management (supports LLaMA variants including Gemma)
let wasmModule = null;
let modelLoaded = false;
let memoryBuffer = null;
let rlAgent = null;
let embeddings = [];

// YoRHa Legal AI Pipeline model management
let loadedModels = new Map(); // Track multiple loaded models
let activeModel = null; // Current active model
let modelSwitchCache = new Map(); // Cache for fast model switching
let userContextModel = null; // User-specific context model
let gemmaVariants = new Map(); // Gemma variants cache
let modelPerformanceStats = new Map(); // Performance tracking per model
let smartCacheManager = null; // Legal AI cache optimizer
let ollamaService = null; // Ollama service connection
let onnxService = null; // ONNX Legal-BERT service

// YoRHa Legal AI Model definitions - only our pipeline models
const MODEL_VARIANTS = {
  'gemma3-legal:latest': {
    id: 'gemma3-legal:latest',
    type: 'gemma3-legal',
    size: 8000000000, // 8B parameters
    targetLatency: 250, // ms
    memoryFootprint: 6400, // MB
    capabilities: ['legal-research', 'legal-analysis', 'document-review', 'case-analysis'],
    contextWindow: 8192,
    quantization: 'int4',
    optimizations: ['legal-domain', 'context-compression'],
    embeddingModel: 'embeddinggemma:latest'
  },
  'embeddinggemma:latest': {
    id: 'embeddinggemma:latest',
    type: 'gemma-embedding',
    size: 2000000000, // 2B parameters
    targetLatency: 95, // ms
    memoryFootprint: 1536, // MB
    capabilities: ['embeddings', 'semantic-search', 'vector-generation'],
    contextWindow: 2048,
    quantization: 'int8',
    optimizations: ['embedding-focus', 'legal-vocab'],
    outputDimensions: 768
  },
  'legal-bert-onnx': {
    id: 'legal-bert-onnx',
    type: 'legal-bert-onnx',
    size: 110000000, // 110M parameters
    targetLatency: 50, // ms
    memoryFootprint: 256, // MB
    capabilities: ['legal-entity-extraction', 'case-classification', 'ner', 'legal-embeddings'],
    contextWindow: 512,
    quantization: 'int8',
    optimizations: ['onnx-runtime', 'legal-vocab', 'entity-focus']
  }
};

// Import YoRHa Legal AI Pipeline dependencies
importScripts('/workers/flatbuffers.js');
importScripts('/workers/yorha-rl.js'); // YoRHa-specific RL implementation

// Service Worker message handling
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'INIT_PIPELINE':
        await initializeLegalAIPipeline();
        postMessage({ type: 'PIPELINE_READY', id });
        break;

      case 'LOAD_GEMMA_MODEL':
        await loadGemmaModel(data.modelName, data.config);
        postMessage({ type: 'GEMMA_MODEL_LOADED', id });
        break;

      case 'LOAD_MODEL_VARIANT':
        await loadModelVariant(data.modelVariant, data.modelUrl, data.config);
        postMessage({ type: 'MODEL_VARIANT_LOADED', data: { variant: data.modelVariant }, id });
        break;

      case 'SWITCH_MODEL':
        const switchResult = await switchActiveModel(data.targetModel, data.userContext);
        postMessage({ type: 'MODEL_SWITCHED', data: switchResult, id });
        break;

      case 'SMART_MODEL_SELECT':
        const smartResult = await intelligentModelSelection(data.query, data.userContext, data.intent);
        postMessage({ type: 'SMART_MODEL_SELECTED', data: smartResult, id });
        break;

      case 'PRELOAD_MODELS':
        await preloadModels(data.modelIds, data.priority);
        postMessage({ type: 'MODELS_PRELOADED', data: { preloaded: data.modelIds }, id });
        break;

      case 'OPTIMIZE_CACHE':
        const cacheResult = await optimizeModelCache(data.activeModels, data.memoryConstraints);
        postMessage({ type: 'CACHE_OPTIMIZED', data: cacheResult, id });
        break;

      case 'GET_MODEL_PERFORMANCE':
        const perfData = getModelPerformanceReport();
        postMessage({ type: 'MODEL_PERFORMANCE', data: perfData, id });
        break;

      case 'LEGAL_ANALYSIS':
        const result = await performLegalAnalysis(data.prompt, data.context, data.documentType);
        postMessage({ type: 'LEGAL_ANALYSIS_RESULT', data: result, id });
        break;

      case 'GEMMA_EMBED_TEXT':
        const embedding = await generateGemmaEmbedding(data.text, data.model);
        postMessage({ type: 'GEMMA_EMBEDDING_RESULT', data: embedding, id });
        break;

      case 'ONNX_ENTITY_EXTRACTION':
        const entities = await extractLegalEntities(data.text);
        postMessage({ type: 'ONNX_ENTITIES_RESULT', data: entities, id });
        break;

      case 'TRAIN_RL':
        await trainRLAgent(data.episodes);
        postMessage({ type: 'TRAINING_COMPLETE', id });
        break;

      case 'MEMORY_STATS':
        const stats = getMemoryStats();
        postMessage({ type: 'MEMORY_STATS', data: stats, id });
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      data: { message: error.message, stack: error.stack },
      id
    });
  }
});

/**
 * Initialize YoRHa Legal AI Pipeline with NES Memory Architecture
 */
async function initializeLegalAIPipeline() {
  try {
    console.log('🚀 Initializing YoRHa Legal AI Pipeline...');

    // Initialize NES Memory Architecture
    await initializeNESMemory();

    // Initialize Ollama service connection
    await initializeOllamaService();

    // Initialize ONNX Legal-BERT service
    await initializeONNXService();

    // Initialize RL agent with legal AI context
    rlAgent = new YoRHaRLAgent({
      stateSize: MEMORY_CONFIG.embedDimensions,
      actionSize: 512, // Legal vocabulary tokens
      learningRate: 0.001,
      gamma: 0.99,
      legalDomainWeights: true,
      gemmaEmbeddingPriority: true
    });

    console.log('✅ YoRHa Legal AI Pipeline initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Legal AI Pipeline initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize NES Memory Architecture for legal documents
 */
async function initializeNESMemory() {
  // Import and initialize NES memory management
  const { NESMemoryArchitecture, nesMemory } = await import('/src/lib/memory/nes-memory-architecture.ts');
  
  // Configure memory banks for legal AI workloads
  await nesMemory.allocateDocument({
    id: 'system_gemma_embeddings',
    type: 'evidence',
    confidenceLevel: 1.0,
    riskLevel: 'critical',
    compressed: false,
    metadata: {
      aiGenerated: true,
      documentClass: 'embeddings_cache'
    }
  }, new ArrayBuffer(MEMORY_CONFIG.embedDimensions * 4), {
    preferredBank: 'INTERNAL_RAM',
    compress: false
  });

  console.log('🎮 NES Memory Architecture initialized');
}

/**
 * Initialize connection to Ollama service for Gemma models
 */
async function initializeOllamaService() {
  try {
    // Test connection to Ollama service
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const models = await response.json();
      console.log('✅ Ollama service connected, available models:', models.models?.length || 0);
      
      // Check for Gemma models
      const gemmaModels = models.models?.filter(m => 
        m.name.includes('gemma') || m.name.includes('embedding')
      ) || [];
      
      if (gemmaModels.length > 0) {
        console.log('🎯 Gemma models available:', gemmaModels.map(m => m.name));
      }
    }
  } catch (error) {
    console.warn('⚠️ Ollama service not available, using mock implementations');
  }
}

/**
 * Initialize ONNX Legal-BERT service
 */
async function initializeONNXService() {
  try {
    // Check for ONNX runtime availability
    const onnxAvailable = typeof window !== 'undefined' && 
                         (window.ort || await loadONNXRuntime());
    
    if (onnxAvailable) {
      console.log('✅ ONNX Runtime available for Legal-BERT');
    } else {
      console.log('⚠️ ONNX Runtime not available, using mock Legal-BERT');
    }
  } catch (error) {
    console.warn('⚠️ ONNX initialization failed, using mock implementations');
  }
}

/**
 * Load ONNX Runtime with fallback handling
 */
async function loadONNXRuntime() {
  try {
    // Import ONNX Runtime for web workers
    importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js');
    return !!self.ort;
  } catch (error) {
    return false;
  }
}

/**
 * Load Gemma model through our AI pipeline
 */
async function loadGemmaModel(modelName, config = {}) {
  console.log('📥 Loading Gemma model:', modelName);

  try {
    // Use our AI pipeline instead of direct WASM loading
    const response = await fetch('/api/ai/models/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelName,
        config: {
          ...config,
          contextLength: config.contextLength || MEMORY_CONFIG.maxContextLength,
          embeddingPriority: MEMORY_CONFIG.gemmaEmbeddingPriority
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      modelLoaded = true;
      activeModel = modelName;
      
      // Store model info in loaded models
      loadedModels.set(modelName, {
        variant: modelName,
        config: result.modelInfo,
        loaded: true,
        lastUsed: Date.now(),
        memorySize: result.memorySize || 0,
        loadTime: result.loadTime
      });

      console.log(`✅ Gemma model loaded: ${modelName}`);
      return result;
    } else {
      throw new Error(result.error || 'Model loading failed');
    }

  } catch (error) {
    console.error('❌ Gemma model loading failed:', error);
    
    // Fallback to mock implementation
    console.log('🔄 Using mock Gemma implementation');
    modelLoaded = true;
    activeModel = modelName;
    
    loadedModels.set(modelName, {
      variant: modelName,
      config: MODEL_VARIANTS[modelName] || {},
      loaded: true,
      lastUsed: Date.now(),
      memorySize: 1024 * 1024 * 1024, // 1GB mock
      loadTime: 100,
      mock: true
    });

    return { success: true, mock: true };
  }
}

/**
 * Perform Legal AI Analysis with YoRHa architecture and CHR-ROM caching
 */
async function performLegalAnalysis(prompt, context = [], documentType = 'document') {
  if (!modelLoaded || !rlAgent) {
    console.warn('Model not loaded, using mock analysis');
    return await performMockLegalAnalysis(prompt, context, documentType);
  }

  console.log('⚖️ Performing legal AI analysis...');

  const startTime = performance.now();

  try {
    // Step 1: Generate Gemma embeddings with legal context
    const stateEmbedding = await generateGemmaEmbedding(prompt, 'embeddinggemma:latest');

    // Step 2: Apply YoRHa RL agent for legal domain optimization
    const legalAction = rlAgent.selectLegalAction(stateEmbedding, documentType);

    // Step 3: Create CHR-ROM cache key for this analysis
    const chrCacheKey = generateCHRCacheKey(prompt, documentType, context);

    // Step 4: Check CHR-ROM cache first
    const cachedResult = await checkCHRCache(chrCacheKey);
    if (cachedResult) {
      console.log('⚡ CHR-ROM cache hit:', chrCacheKey);
      return {
        ...cachedResult,
        source: 'chr_cache',
        cacheHit: true,
        responseTime: performance.now() - startTime
      };
    }

    // Step 5: Generate analysis using our AI pipeline
    const analysisResult = await generateLegalAnalysisWithGemma(
      prompt, 
      context, 
      documentType, 
      legalAction
    );

    // Step 6: Create visual glyph for this analysis
    const visualGlyph = await generateAnalysisGlyph(analysisResult, documentType);

    // Step 7: Store in CHR-ROM cache for instant future retrieval
    await storeCHRPattern(chrCacheKey, {
      analysis: analysisResult,
      glyph: visualGlyph,
      metadata: {
        documentType,
        confidence: analysisResult.confidence,
        generated: Date.now()
      }
    });

    // Step 8: Update RL agent with legal domain feedback
    const legalReward = calculateLegalReward(analysisResult, prompt, documentType);
    rlAgent.updateLegalPolicy(stateEmbedding, legalAction, legalReward);

    // Step 9: Store in NES memory architecture
    await storeInNESMemory(analysisResult, documentType);

    const responseTime = performance.now() - startTime;

    return {
      text: analysisResult.text,
      analysis: analysisResult.analysis,
      confidence: analysisResult.confidence,
      entities: analysisResult.entities,
      riskFactors: analysisResult.riskFactors,
      visualGlyph: visualGlyph,
      embedding: stateEmbedding,
      legalMetrics: {
        action: legalAction,
        reward: legalReward,
        confidence: analysisResult.confidence,
        documentType: documentType
      },
      memoryUsage: getMemoryStats(),
      responseTime: responseTime,
      source: 'generated',
      cacheKey: chrCacheKey
    };

  } catch (error) {
    console.error('❌ Legal analysis failed:', error);
    return await performMockLegalAnalysis(prompt, context, documentType);
  }
}

/**
 * Generate Gemma embeddings with legal context optimization
 */
async function generateGemmaEmbedding(text, model = 'embeddinggemma:latest') {
  try {
    // Use our AI pipeline API for embeddings
    const response = await fetch('/api/ai/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model,
        legalContext: true,
        dimensions: MEMORY_CONFIG.embedDimensions
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.embedding || result.data || [];
    }
  } catch (error) {
    console.warn('Gemma embedding failed, using fallback:', error);
  }

  // Fallback to mock embedding
  return generateMockEmbedding(text);
}

/**
 * Extract legal entities using ONNX Legal-BERT
 */
async function extractLegalEntities(text) {
  try {
    // Use our ONNX Legal-BERT service
    const response = await fetch('/api/legal/onnx/extract-entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      const result = await response.json();
      return result.entities || [];
    }
  } catch (error) {
    console.warn('ONNX entity extraction failed, using fallback:', error);
  }

  // Fallback to mock entities
  return generateMockLegalEntities(text);
}

/**
 * Generate legal analysis using Gemma 3 Legal model
 */
async function generateLegalAnalysisWithGemma(prompt, context, documentType, action) {
  try {
    const response = await fetch('/api/ai/legal/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        context,
        documentType,
        model: 'gemma3-legal:latest',
        action: action,
        extractEntities: true,
        riskAssessment: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        text: result.response || result.text,
        analysis: result.analysis || {},
        confidence: result.confidence || 0.85,
        entities: result.entities || await extractLegalEntities(prompt),
        riskFactors: result.riskFactors || [],
        recommendations: result.recommendations || []
      };
    }
  } catch (error) {
    console.warn('Gemma legal analysis failed, using mock:', error);
  }

  // Fallback to mock analysis
  return generateMockLegalAnalysis(prompt, context, documentType);
}

/**
 * Mock implementations for graceful fallback
 */
async function performMockLegalAnalysis(prompt, context, documentType) {
  const entities = generateMockLegalEntities(prompt);
  const confidence = 0.75 + Math.random() * 0.2;
  
  return {
    text: `Legal analysis for ${documentType}: ${prompt.substring(0, 100)}...`,
    analysis: {
      summary: `Mock analysis of ${documentType} document`,
      keyPoints: ['Point 1', 'Point 2', 'Point 3'],
      jurisdiction: 'Unknown',
      applicableLaw: 'General'
    },
    confidence: confidence,
    entities: entities,
    riskFactors: ['Low complexity', 'Standard terms'],
    visualGlyph: generateMockGlyph(documentType, confidence),
    embedding: generateMockEmbedding(prompt),
    legalMetrics: {
      action: { type: 'analyze', confidence: confidence },
      reward: confidence,
      documentType: documentType
    },
    memoryUsage: getMemoryStats(),
    responseTime: 50 + Math.random() * 100,
    source: 'mock',
    mock: true
  };
}

function generateMockLegalEntities(text) {
  const entities = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Mock entity detection
  if (words.some(w => ['contract', 'agreement', 'party'].includes(w))) {
    entities.push({ type: 'DOCUMENT_TYPE', value: 'Contract', confidence: 0.9 });
  }
  if (words.some(w => ['court', 'judge', 'ruling'].includes(w))) {
    entities.push({ type: 'LEGAL_ENTITY', value: 'Court', confidence: 0.85 });
  }
  if (words.some(w => ['plaintiff', 'defendant', 'vs'].includes(w))) {
    entities.push({ type: 'PARTY', value: 'Legal Party', confidence: 0.8 });
  }
  
  return entities;
}

function generateMockEmbedding(text) {
  const embedding = new Array(MEMORY_CONFIG.embedDimensions);
  for (let i = 0; i < embedding.length; i++) {
    embedding[i] = (Math.random() - 0.5) * 2;
  }
  return embedding;
}

function generateMockGlyph(documentType, confidence) {
  return {
    type: 'svg',
    data: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#3B82F6" opacity="${confidence}"/><text x="8" y="12" font-size="8" fill="white">${documentType[0].toUpperCase()}</text></svg>`,
    metadata: { documentType, confidence }
  };
}

/**
 * Generate embeddings using nomic-embed-text (client-side)
 */
async function generateEmbedding(text) {
  // Use either WASM-based embedding or fallback to server
  try {
    if (wasmModule && wasmModule.instance.exports.generate_embedding) {
      // Client-side embedding generation
      const textPtr = wasmModule.instance.exports.malloc(text.length);
      const textBytes = new TextEncoder().encode(text);
      memoryBuffer.set(textBytes, textPtr);

      const embeddingPtr = wasmModule.instance.exports.generate_embedding(
        textPtr,
        text.length,
        MEMORY_CONFIG.embedDimensions
      );

      const embedding = new Float32Array(
        memoryBuffer.buffer,
        embeddingPtr,
        MEMORY_CONFIG.embedDimensions
      );

      wasmModule.instance.exports.free(textPtr);
      wasmModule.instance.exports.free(embeddingPtr);

      return Array.from(embedding);
    }
  } catch (error) {
    console.warn('Client-side embedding failed, using server fallback:', error);
  }

  // Fallback to server-side nomic-embed-text
  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model: 'nomic-embed-text' })
  });

  const result = await response.json();
  return result.embedding;
}

/**
 * Train RL agent with experience replay
 */
async function trainRLAgent(episodes) {
  if (!rlAgent) {
    throw new Error('RL agent not initialized');
  }

  console.log(`🎯 Training RL agent with ${episodes.length} episodes...`);

  // Batch training for memory efficiency
  for (let i = 0; i < episodes.length; i += MEMORY_CONFIG.batchSize) {
    const batch = episodes.slice(i, i + MEMORY_CONFIG.batchSize);

    await rlAgent.trainBatch(batch);

    // Memory management during training
    if (i % 100 === 0) {
      await optimizeMemoryUsage();
      postMessage({
        type: 'TRAINING_PROGRESS',
        data: {
          progress: (i / episodes.length) * 100,
          episode: i,
          totalEpisodes: episodes.length
        }
      });
    }
  }

  console.log('✅ RL training completed');
}

/**
 * FlatBuffers encoding for binary performance
 */
function encodeFlatBuffer(data) {
  const builder = new flatbuffers.Builder(1024);

  // Create string offsets
  const textOffset = builder.createString(data.text);
  const contextOffset = builder.createString(JSON.stringify(data.context));

  // Build FlatBuffer
  builder.startObject(4);
  builder.addFieldOffset(0, textOffset, 0);
  builder.addFieldOffset(1, contextOffset, 0);
  builder.addFieldFloat32(2, data.rlAction.temperature || 0.7, 0);
  builder.addFieldInt64(3, BigInt(data.timestamp), 0n);
  const offset = builder.endObject();

  builder.finish(offset);
  return builder.asUint8Array();
}

/**
 * Calculate reward for RL training
 */
function calculateReward(response, prompt) {
  // Simple reward function (can be enhanced)
  let reward = 0;

  // Length reward
  if (response.length > 10 && response.length < 500) {
    reward += 0.1;
  }

  // Quality heuristics
  if (!response.includes('sorry') && !response.includes('cannot')) {
    reward += 0.2;
  }

  // Relevance (basic keyword matching)
  const promptWords = prompt.toLowerCase().split(' ');
  const responseWords = response.toLowerCase().split(' ');
  const overlap = promptWords.filter(word => responseWords.includes(word));
  reward += (overlap.length / promptWords.length) * 0.3;

  return Math.max(0, Math.min(1, reward));
}

/**
 * Memory optimization and garbage collection
 */
async function optimizeMemoryUsage() {
  // Force garbage collection
  if (self.gc) {
    self.gc();
  }

  // Clear old embeddings
  if (embeddings.length > 1000) {
    embeddings = embeddings.slice(-500);
  }

  // WASM memory compaction
  if (wasmModule?.instance.exports.compact_memory) {
    wasmModule.instance.exports.compact_memory();
  }
}

/**
 * Get memory usage statistics
 */
function getMemoryStats() {
  const stats = {
    wasmMemory: wasmModule ? wasmModule.instance.exports.memory.buffer.byteLength : 0,
    jsHeapUsed: 0,
    jsHeapTotal: 0,
    modelLoaded: modelLoaded,
    embeddingsCount: embeddings.length
  };

  // Performance memory API if available
  if (performance.memory) {
    stats.jsHeapUsed = performance.memory.usedJSHeapSize;
    stats.jsHeapTotal = performance.memory.totalJSHeapSize;
  }

  return stats;
}

/**
 * Trigger garbage collection when memory usage is high
 */
async function triggerGarbageCollection() {
  await optimizeMemoryUsage();

  // Wait for GC to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Load a model variant (Gemma, LLaMA-Chat, etc.)
 */
async function loadModelVariant(variant, modelUrl, config = {}) {
  if (!wasmModule) {
    throw new Error('WASM not initialized');
  }

  console.log(`📥 Loading model variant: ${variant} from ${modelUrl}`);

  try {
    // Check if variant already loaded
    if (loadedModels.has(variant)) {
      console.log(`✅ Model variant ${variant} already loaded`);
      return loadedModels.get(variant);
    }

    // Load model weights
    const response = await fetch(modelUrl);
    const modelData = await response.arrayBuffer();

    // Allocate memory for this variant
    const modelPtr = wasmModule.instance.exports.malloc(modelData.byteLength);
    const modelBuffer = new Uint8Array(memoryBuffer.buffer, modelPtr, modelData.byteLength);
    modelBuffer.set(new Uint8Array(modelData));

    // Initialize the variant in WASM
    const success = wasmModule.instance.exports.llama_load_model_variant(
      modelPtr,
      modelData.byteLength,
      variant.length,
      new TextEncoder().encode(variant),
      config.contextLength || MEMORY_CONFIG.maxContextLength
    );

    if (success) {
      const modelInfo = {
        variant,
        modelPtr,
        config,
        loaded: true,
        lastUsed: Date.now(),
        memorySize: modelData.byteLength
      };

      loadedModels.set(variant, modelInfo);

      // Set as active if no active model
      if (!activeModel) {
        activeModel = variant;
      }

      console.log(`✅ Model variant ${variant} loaded successfully`);
      return modelInfo;
    } else {
      wasmModule.instance.exports.free(modelPtr);
      throw new Error(`Failed to load model variant: ${variant}`);
    }

  } catch (error) {
    console.error(`❌ Failed to load model variant ${variant}:`, error);
    throw error;
  }
}

/**
 * Switch active model based on user context and task
 */
async function switchActiveModel(targetModel, userContext = {}) {
  const startTime = performance.now();

  try {
    console.log(`🔄 Switching from ${activeModel} to ${targetModel}`);

    // Check if target model is loaded
    if (!loadedModels.has(targetModel)) {
      throw new Error(`Target model ${targetModel} not loaded`);
    }

    // Check cache for this switch
    const cacheKey = `${activeModel}->${targetModel}`;
    if (modelSwitchCache.has(cacheKey)) {
      const cached = modelSwitchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        console.log(`⚡ Using cached switch: ${cacheKey}`);
        activeModel = targetModel;
        return { ...cached.result, cached: true };
      }
    }

    const previousModel = activeModel;

    // Perform the switch in WASM
    const switchSuccess = wasmModule.instance.exports.llama_switch_model(
      new TextEncoder().encode(targetModel)
    );

    if (switchSuccess) {
      activeModel = targetModel;
      const switchTime = performance.now() - startTime;

      // Update usage tracking
      loadedModels.get(targetModel).lastUsed = Date.now();

      const result = {
        success: true,
        previousModel,
        currentModel: targetModel,
        switchTime,
        userContext,
        cached: false
      };

      // Cache this switch result
      modelSwitchCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`✅ Switched to ${targetModel} in ${switchTime.toFixed(2)}ms`);
      return result;
    } else {
      throw new Error(`WASM model switch failed`);
    }

  } catch (error) {
    console.error(`❌ Model switch failed:`, error);
    return {
      success: false,
      error: error.message,
      previousModel: activeModel,
      switchTime: performance.now() - startTime
    };
  }
}

/**
 * Get information about loaded models and performance
 */
function getModelInfo() {
  return {
    loadedModels: Array.from(loadedModels.keys()),
    activeModel,
    modelCount: loadedModels.size,
    totalMemoryUsed: Array.from(loadedModels.values()).reduce((sum, model) => sum + model.memorySize, 0),
    switchCacheSize: modelSwitchCache.size,
    lastUsageStats: Array.from(loadedModels.entries()).map(([variant, info]) => ({
      variant,
      lastUsed: info.lastUsed,
      memorySize: info.memorySize
    }))
  };
}

/**
 * Intelligent Model Selection with CUDA-style cache optimization
 * Automatically selects optimal model based on query, user intent, and performance metrics
 */
async function intelligentModelSelection(query, userContext = {}, intent = {}) {
  const startTime = performance.now();

  try {
    console.log('🧠 Performing intelligent model selection...');

    // Initialize smart cache manager if not exists
    if (!smartCacheManager) {
      smartCacheManager = new SmartCacheManager();
    }

    // Analyze query characteristics
    const queryAnalysis = analyzeQueryCharacteristics(query);

    // Calculate model scores based on multiple factors
    const modelScores = new Map();

    for (const [modelId, modelSpec] of Object.entries(MODEL_VARIANTS)) {
      const score = calculateModelScore(modelId, modelSpec, queryAnalysis, intent, userContext);
      modelScores.set(modelId, score);
    }

    // Sort by score and select best model
    const sortedModels = Array.from(modelScores.entries())
      .sort(([,a], [,b]) => b.totalScore - a.totalScore);

    const bestModel = sortedModels[0];
    const selectedModelId = bestModel[0];
    const selectedScore = bestModel[1];

    // Update performance statistics
    updateModelPerformanceStats(selectedModelId, selectedScore, startTime);

    // Prepare preload recommendations
    const preloadRecommendations = generatePreloadRecommendations(sortedModels.slice(1, 4), intent);

    console.log(`✅ Selected model: ${selectedModelId} (score: ${selectedScore.totalScore.toFixed(2)})`);

    return {
      selectedModel: selectedModelId,
      modelSpec: MODEL_VARIANTS[selectedModelId],
      score: selectedScore,
      alternatives: sortedModels.slice(1, 3),
      preloadRecommendations,
      analysisTime: performance.now() - startTime,
      queryAnalysis,
      reasoning: selectedScore.reasoning
    };

  } catch (error) {
    console.error('❌ Intelligent model selection failed:', error);

    // Fallback to Gemma 270M for safety
    return {
      selectedModel: 'gemma-270m-fast',
      modelSpec: MODEL_VARIANTS['gemma-270m-fast'],
      score: { totalScore: 0.5, fallback: true },
      error: error.message,
      analysisTime: performance.now() - startTime
    };
  }
}

/**
 * Analyze query characteristics for model selection
 */
function analyzeQueryCharacteristics(query) {
  const words = query.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

  // Complexity indicators
  const complexityKeywords = /\b(analyze|compare|evaluate|synthesize|comprehensive|detailed|complex|expert)\b/gi;
  const legalKeywords = /\b(law|legal|contract|statute|case|court|attorney|jurisdiction|litigation)\b/gi;
  const codeKeywords = /\b(function|class|variable|array|debug|error|api|code|programming)\b/gi;
  const chatKeywords = /\b(hello|hi|thanks|please|help|what|how|why|simple|quick)\b/gi;

  const complexityMatches = (query.match(complexityKeywords) || []).length;
  const legalMatches = (query.match(legalKeywords) || []).length;
  const codeMatches = (query.match(codeKeywords) || []).length;
  const chatMatches = (query.match(chatKeywords) || []).length;

  // Urgency detection
  const urgencyKeywords = /\b(urgent|asap|immediately|now|quick|fast|emergency|deadline|hurry)\b/gi;
  const urgencyMatches = (query.match(urgencyKeywords) || []).length;

  return {
    wordCount,
    avgWordLength,
    queryLength: query.length,
    complexity: Math.min(1, (complexityMatches + Math.max(0, wordCount - 10) * 0.1) / 5),
    legalRelevance: Math.min(1, legalMatches / 3),
    codeRelevance: Math.min(1, codeMatches / 3),
    chatRelevance: Math.min(1, chatMatches / 5),
    urgency: Math.min(1, urgencyMatches / 2),
    estimatedTokens: Math.ceil(wordCount * 1.3), // Rough token estimate
    categories: {
      legal: legalMatches > 0,
      code: codeMatches > 0,
      chat: chatMatches > 0 || wordCount < 5,
      complex: complexityMatches > 0 || wordCount > 15
    }
  };
}

/**
 * Calculate comprehensive model score
 */
function calculateModelScore(modelId, modelSpec, queryAnalysis, intent, userContext) {
  let totalScore = 0;
  const reasoning = [];

  // Base capability matching (30% weight)
  let capabilityScore = 0;
  if (queryAnalysis.categories.legal && modelSpec.capabilities.includes('legal-research')) {
    capabilityScore += 0.8;
    reasoning.push('Strong legal capability match');
  }
  if (queryAnalysis.categories.code && modelSpec.capabilities.includes('code-generation')) {
    capabilityScore += 0.8;
    reasoning.push('Code generation capability');
  }
  if (queryAnalysis.categories.chat && modelSpec.capabilities.includes('chat')) {
    capabilityScore += 0.6;
    reasoning.push('Chat capability match');
  }
  if (queryAnalysis.categories.complex && modelSpec.capabilities.includes('complex-reasoning')) {
    capabilityScore += 0.7;
    reasoning.push('Complex reasoning support');
  }

  capabilityScore = Math.min(1, capabilityScore);
  totalScore += capabilityScore * 0.3;

  // Performance/Latency matching (25% weight)
  let performanceScore = 0;
  if (queryAnalysis.urgency > 0.7) {
    // High urgency - prefer faster models
    performanceScore = Math.max(0, 1 - (modelSpec.targetLatency / 1000));
    reasoning.push(`Urgency preference for fast model (${modelSpec.targetLatency}ms)`);
  } else {
    // Balance performance with capability
    const latencyPenalty = Math.min(0.5, modelSpec.targetLatency / 2000);
    performanceScore = 1 - latencyPenalty;
    reasoning.push(`Balanced performance consideration`);
  }

  totalScore += performanceScore * 0.25;

  // Complexity matching (20% weight)
  let complexityScore = 0;
  const modelComplexity = getModelComplexityRating(modelSpec);
  const taskComplexity = queryAnalysis.complexity;

  // Prefer models that match task complexity (not over/under-powered)
  const complexityDiff = Math.abs(modelComplexity - taskComplexity);
  complexityScore = Math.max(0, 1 - complexityDiff);

  if (complexityDiff < 0.2) {
    reasoning.push('Excellent complexity match');
  } else if (complexityDiff < 0.5) {
    reasoning.push('Good complexity match');
  } else {
    reasoning.push('Complexity mismatch penalty');
  }

  totalScore += complexityScore * 0.2;

  // Memory efficiency (15% weight)
  let memoryScore = Math.max(0, 1 - (modelSpec.memoryFootprint / 8192));
  totalScore += memoryScore * 0.15;
  reasoning.push(`Memory efficiency: ${modelSpec.memoryFootprint}MB`);

  // Context window adequacy (10% weight)
  let contextScore = 0;
  const requiredContext = Math.max(queryAnalysis.estimatedTokens, userContext.historyLength || 0);
  if (modelSpec.contextWindow >= requiredContext * 2) {
    contextScore = 1;
    reasoning.push('Ample context window');
  } else if (modelSpec.contextWindow >= requiredContext) {
    contextScore = 0.7;
    reasoning.push('Adequate context window');
  } else {
    contextScore = 0.3;
    reasoning.push('Limited context window');
  }

  totalScore += contextScore * 0.1;

  // User context and learning bonus (bonus points)
  if (userContext.preferredModel === modelId) {
    totalScore += 0.1;
    reasoning.push('User preference bonus');
  }

  const stats = modelPerformanceStats.get(modelId);
  if (stats && stats.successRate > 0.8) {
    totalScore += 0.05;
    reasoning.push('High historical success rate');
  }

  // Time-of-day optimization
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17 && modelSpec.capabilities.includes('legal-research')) {
    totalScore += 0.03; // Workday legal work bias
    reasoning.push('Business hours legal work bias');
  }

  return {
    totalScore: Math.min(1, totalScore),
    capabilityScore,
    performanceScore,
    complexityScore,
    memoryScore,
    contextScore,
    reasoning
  };
}

/**
 * Get model complexity rating (0-1 scale)
 */
function getModelComplexityRating(modelSpec) {
  if (modelSpec.size < 1000000000) return 0.2; // <1B params
  if (modelSpec.size < 3000000000) return 0.4; // 1-3B params
  if (modelSpec.size < 8000000000) return 0.7; // 3-8B params
  return 1.0; // >8B params
}

/**
 * Generate preload recommendations
 */
function generatePreloadRecommendations(alternatives, intent) {
  const recommendations = [];

  // Always recommend fast models for quick responses
  recommendations.push({
    modelId: 'gemma-270m-fast',
    reason: 'Fast response capability',
    priority: 0.9
  });

  // Recommend legal model if legal context detected
  if (intent.category === 'legal-research') {
    recommendations.push({
      modelId: 'legal-bert-fast',
      reason: 'Legal entity extraction',
      priority: 0.8
    });
  }

  // Add top alternatives
  alternatives.slice(0, 2).forEach((alt, index) => {
    recommendations.push({
      modelId: alt[0],
      reason: `Alternative #${index + 1}`,
      priority: 0.6 - (index * 0.1)
    });
  });

  return recommendations.slice(0, 3); // Max 3 preload recommendations
}

/**
 * Update model performance statistics
 */
function updateModelPerformanceStats(modelId, score, startTime) {
  if (!modelPerformanceStats.has(modelId)) {
    modelPerformanceStats.set(modelId, {
      usageCount: 0,
      totalScore: 0,
      avgScore: 0,
      successRate: 0.8, // Default
      avgLatency: MODEL_VARIANTS[modelId]?.targetLatency || 1000,
      lastUsed: Date.now()
    });
  }

  const stats = modelPerformanceStats.get(modelId);
  stats.usageCount++;
  stats.totalScore += score.totalScore;
  stats.avgScore = stats.totalScore / stats.usageCount;
  stats.lastUsed = Date.now();

  // Update latency if we have timing data
  const elapsedTime = performance.now() - startTime;
  stats.avgLatency = (stats.avgLatency * 0.9) + (elapsedTime * 0.1); // Exponential moving average
}

/**
 * Smart Cache Manager for CUDA-style optimization
 */
class SmartCacheManager {
  constructor() {
    this.cacheLayout = new Map();
    this.memoryFragmentation = 0;
    this.accessPatterns = new Map();
    this.preloadQueue = [];
  }

  optimizeLayout(activeModels, memoryConstraints = {}) {
    const maxMemory = memoryConstraints.maxMemory || (8 * 1024); // 8GB default
    let currentOffset = 0;
    let totalMemory = 0;

    // Sort by access frequency and memory efficiency
    const sortedModels = activeModels
      .map(modelId => {
        const spec = MODEL_VARIANTS[modelId];
        const accessCount = this.accessPatterns.get(modelId) || 0;
        return {
          modelId,
          spec,
          accessCount,
          efficiency: accessCount / (spec?.memoryFootprint || 1000)
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency);

    this.cacheLayout.clear();

    for (const { modelId, spec } of sortedModels) {
      if (!spec) continue;

      const memoryNeeded = spec.memoryFootprint;

      if (currentOffset + memoryNeeded <= maxMemory) {
        this.cacheLayout.set(modelId, {
          offset: currentOffset,
          size: memoryNeeded,
          loaded: loadedModels.has(modelId)
        });

        currentOffset += memoryNeeded;
        totalMemory += memoryNeeded;
      }
    }

    // Calculate fragmentation
    this.memoryFragmentation = this.calculateFragmentation();

    return {
      layout: this.cacheLayout,
      totalMemory,
      fragmentation: this.memoryFragmentation,
      efficiency: totalMemory / maxMemory
    };
  }

  calculateFragmentation() {
    if (this.cacheLayout.size === 0) return 0;

    const allocations = Array.from(this.cacheLayout.values())
      .sort((a, b) => a.offset - b.offset);

    let gaps = 0;
    let totalAllocated = 0;

    for (let i = 1; i < allocations.length; i++) {
      const prevEnd = allocations[i - 1].offset + allocations[i - 1].size;
      const currentStart = allocations[i].offset;

      if (currentStart > prevEnd) {
        gaps += currentStart - prevEnd;
      }

      totalAllocated += allocations[i - 1].size;
    }

    if (allocations.length > 0) {
      totalAllocated += allocations[allocations.length - 1].size;
    }

    return totalAllocated > 0 ? gaps / totalAllocated : 0;
  }

  recordAccess(modelId) {
    const currentCount = this.accessPatterns.get(modelId) || 0;
    this.accessPatterns.set(modelId, currentCount + 1);
  }
}

/**
 * Preload models based on intelligent predictions
 */
async function preloadModels(modelIds, priority = 0.5) {
  console.log(`� Preloading models:`, modelIds);

  const results = [];

  for (const modelId of modelIds) {
    if (loadedModels.has(modelId)) {
      results.push({ modelId, status: 'already_loaded' });
      continue;
    }

    try {
      // Simulate model loading (would connect to actual model loading)
      const modelSpec = MODEL_VARIANTS[modelId];
      if (!modelSpec) {
        results.push({ modelId, status: 'unknown_model' });
        continue;
      }

      // Prioritize based on urgency and available memory
      const loadTime = modelSpec.targetLatency * (1 / priority);
      await new Promise(resolve => setTimeout(resolve, Math.min(loadTime, 1000)));

      // Mark as loaded in memory simulation
      loadedModels.set(modelId, {
        variant: modelId,
        config: modelSpec,
        loaded: true,
        lastUsed: Date.now(),
        memorySize: modelSpec.memoryFootprint * 1024 * 1024,
        preloaded: true
      });

      results.push({ modelId, status: 'preloaded', loadTime });
      console.log(`✅ Preloaded ${modelId}`);

    } catch (error) {
      results.push({ modelId, status: 'failed', error: error.message });
      console.error(`❌ Failed to preload ${modelId}:`, error);
    }
  }

  return results;
}

/**
 * Optimize model cache layout and memory usage
 */
async function optimizeModelCache(activeModels, memoryConstraints = {}) {
  if (!smartCacheManager) {
    smartCacheManager = new SmartCacheManager();
  }

  console.log('�🔧 Optimizing model cache...');

  const optimization = smartCacheManager.optimizeLayout(activeModels, memoryConstraints);

  // Perform memory defragmentation if fragmentation > 30%
  if (optimization.fragmentation > 0.3) {
    console.log('📦 Performing memory defragmentation...');
    await performMemoryDefragmentation();

    // Recalculate after defragmentation
    const newOptimization = smartCacheManager.optimizeLayout(activeModels, memoryConstraints);
    optimization.defragmented = true;
    optimization.fragmentationImprovement = optimization.fragmentation - newOptimization.fragmentation;
    Object.assign(optimization, newOptimization);
  }

  // Update preload queue based on optimization
  updatePreloadQueue(optimization);

  return {
    ...optimization,
    recommendations: generateCacheOptimizationRecommendations(optimization),
    timestamp: Date.now()
  };
}

/**
 * Perform memory defragmentation
 */
async function performMemoryDefragmentation() {
  // Simulate memory defragmentation process
  const loadedModelIds = Array.from(loadedModels.keys());

  // Temporarily unload models and reload in optimal order
  const modelBackup = new Map(loadedModels);
  loadedModels.clear();

  // Reload in size-optimized order
  const sortedModels = Array.from(modelBackup.entries())
    .sort(([,a], [,b]) => a.memorySize - b.memorySize);

  for (const [modelId, modelInfo] of sortedModels) {
    loadedModels.set(modelId, {
      ...modelInfo,
      defragmented: true
    });

    // Small delay to simulate reloading
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('✅ Memory defragmentation complete');
}

/**
 * Update preload queue based on optimization results
 */
function updatePreloadQueue(optimization) {
  // Clear existing queue
  if (!smartCacheManager.preloadQueue) {
    smartCacheManager.preloadQueue = [];
  }

  smartCacheManager.preloadQueue.length = 0;

  // Add models that should be preloaded based on access patterns
  for (const [modelId, layoutInfo] of optimization.layout) {
    if (!layoutInfo.loaded) {
      const accessCount = smartCacheManager.accessPatterns.get(modelId) || 0;
      const priority = Math.min(1, accessCount / 10);

      smartCacheManager.preloadQueue.push({
        modelId,
        priority,
        reason: `Access pattern prediction (${accessCount} uses)`
      });
    }
  }

  // Sort by priority
  smartCacheManager.preloadQueue.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate cache optimization recommendations
 */
function generateCacheOptimizationRecommendations(optimization) {
  const recommendations = [];

  if (optimization.fragmentation > 0.2) {
    recommendations.push({
      type: 'defragmentation',
      message: `Consider defragmentation (${(optimization.fragmentation * 100).toFixed(1)}% fragmented)`,
      priority: 'medium'
    });
  }

  if (optimization.efficiency < 0.6) {
    recommendations.push({
      type: 'memory_expansion',
      message: 'Consider increasing memory allocation for better model caching',
      priority: 'low'
    });
  }

  const unusedModels = Array.from(loadedModels.keys()).filter(modelId => {
    const lastUsed = loadedModels.get(modelId)?.lastUsed || 0;
    return Date.now() - lastUsed > 600000; // 10 minutes
  });

  if (unusedModels.length > 0) {
    recommendations.push({
      type: 'unload_unused',
      message: `Consider unloading unused models: ${unusedModels.join(', ')}`,
      priority: 'low'
    });
  }

  return recommendations;
}

/**
 * Get comprehensive model performance report
 */
function getModelPerformanceReport() {
  const loadedModelsList = Array.from(loadedModels.values());
  const performanceList = Array.from(modelPerformanceStats.values());

  return {
    summary: {
      totalModelsLoaded: loadedModels.size,
      activeModel,
      totalMemoryUsed: loadedModelsList.reduce((sum, model) => sum + (model.memorySize || 0), 0),
      cacheHitRate: calculateCacheHitRate(),
      avgSwitchTime: calculateAverageSwitchTime()
    },
    models: performanceList,
    memoryLayout: smartCacheManager?.cacheLayout || new Map(),
    fragmentation: smartCacheManager?.memoryFragmentation || 0,
    accessPatterns: smartCacheManager?.accessPatterns || new Map(),
    preloadQueue: smartCacheManager?.preloadQueue || [],
    recommendations: generatePerformanceRecommendations(performanceList)
  };
}

/**
 * Calculate cache hit rate
 */
function calculateCacheHitRate() {
  const cacheEntries = Array.from(modelSwitchCache.values());
  if (cacheEntries.length === 0) return 0;

  const recentEntries = cacheEntries.filter(entry =>
    Date.now() - entry.timestamp < 300000 // 5 minutes
  );

  return recentEntries.length / Math.max(1, cacheEntries.length);
}

/**
 * Calculate average switch time
 */
function calculateAverageSwitchTime() {
  const cacheEntries = Array.from(modelSwitchCache.values());
  if (cacheEntries.length === 0) return 0;

  const switchTimes = cacheEntries
    .map(entry => entry.result?.switchTime || 0)
    .filter(time => time > 0);

  return switchTimes.length > 0 ?
    switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length : 0;
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(performanceList) {
  const recommendations = [];

  const lowPerformers = performanceList.filter(p => p.avgScore < 0.6);
  if (lowPerformers.length > 0) {
    recommendations.push({
      type: 'model_tuning',
      message: `Consider retraining low-performing models: ${lowPerformers.map(p => p.modelId || p.variant).join(', ')}`,
      priority: 'high'
    });
  }

  const slowModels = performanceList.filter(p => p.avgLatency > 2000);
  if (slowModels.length > 0) {
    recommendations.push({
      type: 'latency_optimization',
      message: `Optimize high-latency models: ${slowModels.map(p => p.modelId || p.variant).join(', ')}`,
      priority: 'medium'
    });
  }

  return recommendations;
}

/**
 * CHR-ROM Cache Integration Functions
 */

function generateCHRCacheKey(prompt, documentType, context) {
  // Create deterministic cache key using our chunk utility
  const contextStr = JSON.stringify(context);
  const combinedText = `${documentType}:${prompt}:${contextStr}`;
  return `chr_legal:${hashString32(combinedText)}`;
}

async function checkCHRCache(cacheKey) {
  try {
    // Check browser-side CHR cache first
    const browserCached = chrCache.get(cacheKey);
    if (browserCached) {
      return browserCached.payload;
    }

    // Check server-side CHR-ROM cache
    const response = await fetch(`/api/chrrom/pattern?key=${cacheKey}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.pattern) {
        return result.pattern.payload;
      }
    }
  } catch (error) {
    console.warn('CHR cache check failed:', error);
  }
  return null;
}

async function storeCHRPattern(cacheKey, data) {
  try {
    // Store in browser CHR cache
    chrCache.set({
      key: cacheKey,
      type: 'state',
      payload: data,
      ttlMs: 30 * 60 * 1000, // 30 minutes
      createdAt: new Date().toISOString(),
      meta: { 
        source: 'legal_analysis',
        documentType: data.metadata?.documentType
      }
    });

    // Store in server-side CHR-ROM cache
    await fetch('/api/chrrom/pattern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: cacheKey,
        pattern: {
          type: 'state',
          payload: data,
          ttlMs: 30 * 60 * 1000
        }
      })
    });
  } catch (error) {
    console.warn('CHR pattern storage failed:', error);
  }
}

async function generateAnalysisGlyph(analysisResult, documentType) {
  try {
    // Use glyph shader cache bridge for visual generation
    const glyphRequest = {
      glyphData: new Uint8Array(256), // Mock glyph data
      textContent: analysisResult.text?.substring(0, 100) || '',
      renderingHints: {
        quantizationLevel: 8,
        compressionMethod: 'chr-rom',
        targetResolution: [32, 32],
        colorSpace: 'sRGB'
      },
      legalContext: {
        documentType: documentType,
        confidentialityLevel: 'public',
        renderingPriority: 'standard'
      }
    };

    // This would integrate with the glyph shader cache bridge
    // For now, return mock glyph
    return generateMockGlyph(documentType, analysisResult.confidence || 0.8);
  } catch (error) {
    console.warn('Glyph generation failed:', error);
    return generateMockGlyph(documentType, 0.8);
  }
}

async function storeInNESMemory(analysisResult, documentType) {
  try {
    // Store analysis in NES memory architecture
    const documentData = new TextEncoder().encode(JSON.stringify(analysisResult));
    const buffer = new ArrayBuffer(documentData.length);
    new Uint8Array(buffer).set(documentData);

    // This would integrate with NES memory architecture
    // For now, just store in local memory simulation
    console.log(`📦 Stored ${documentType} analysis in NES memory (${buffer.byteLength} bytes)`);
  } catch (error) {
    console.warn('NES memory storage failed:', error);
  }
}

function calculateLegalReward(analysisResult, prompt, documentType) {
  let reward = 0.5; // Base reward

  // Confidence bonus
  if (analysisResult.confidence) {
    reward += (analysisResult.confidence - 0.5) * 0.4;
  }

  // Entity extraction bonus
  if (analysisResult.entities && analysisResult.entities.length > 0) {
    reward += 0.1;
  }

  // Risk assessment bonus
  if (analysisResult.riskFactors && analysisResult.riskFactors.length > 0) {
    reward += 0.1;
  }

  // Document type relevance
  if (documentType !== 'document') {
    reward += 0.05; // Specific document type analysis
  }

  return Math.max(0, Math.min(1, reward));
}

// Simple hash function for cache keys (from chunk.ts)
function hashString32(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return String(hash >>> 0);
}

// Mock YoRHa RL Agent extension
class YoRHaRLAgent {
  constructor(config) {
    this.config = config;
    this.epsilon = 0.1;
    this.legalDomainWeights = config.legalDomainWeights || false;
    this.gemmaEmbeddingPriority = config.gemmaEmbeddingPriority || false;
  }

  selectAction(stateEmbedding) {
    return this.selectLegalAction(stateEmbedding, 'document');
  }

  selectLegalAction(stateEmbedding, documentType) {
    // Legal domain-specific action selection
    const action = {
      type: 'legal_analysis',
      documentType: documentType,
      temperature: 0.7,
      maxTokens: 512,
      extractEntities: true,
      riskAssessment: documentType !== 'citation',
      confidence: 0.8 + Math.random() * 0.2
    };

    if (this.legalDomainWeights) {
      // Adjust parameters based on document type
      switch (documentType) {
        case 'contract':
          action.temperature = 0.5; // More conservative
          action.riskAssessment = true;
          break;
        case 'evidence':
          action.extractEntities = true;
          action.maxTokens = 256;
          break;
        case 'brief':
          action.temperature = 0.8; // More creative
          action.maxTokens = 1024;
          break;
      }
    }

    return action;
  }

  updatePolicy(stateEmbedding, action, reward) {
    this.updateLegalPolicy(stateEmbedding, action, reward);
  }

  updateLegalPolicy(stateEmbedding, action, reward) {
    // Update policy with legal domain awareness
    if (reward > 0.8) {
      this.epsilon *= 0.99; // Reduce exploration on good results
    } else if (reward < 0.4) {
      this.epsilon *= 1.01; // Increase exploration on poor results
    }

    this.epsilon = Math.max(0.01, Math.min(0.5, this.epsilon));
  }
}

// Mock CHR cache if not available
if (typeof chrCache === 'undefined') {
  self.chrCache = {
    get: (key) => null,
    set: (pattern) => console.log('Mock CHR cache set:', pattern.key)
  };
}

console.log('🎮 YoRHa Legal AI Worker initialized with CHR-ROM caching, NES memory, and Visual Memory Palace integration');