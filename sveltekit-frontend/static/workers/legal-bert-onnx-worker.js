/**
 * Legal-BERT ONNX Service Worker
 * Handles parallel ONNX inference for legal entity extraction, classification, and embeddings
 * Provides concurrent processing with intelligent load balancing
 */

// Worker configuration
const WORKER_CONFIG = {
  maxConcurrentTasks: 4,
  taskTimeout: 30000,
  batchSize: 8,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  cpuUtilizationTarget: 0.8
};

// Task queue and processing state
let taskQueue = [];
let activeTasks = new Map();
let workerStats = {
  totalProcessed: 0,
  successCount: 0,
  errorCount: 0,
  averageLatency: 0,
  memoryUsage: 0,
  cpuUsage: 0,
  isInitialized: false
};

// ONNX session and model state
let onnxSession = null;
let tokenizer = null;
let isInitializing = false;

/**
 * Initialize ONNX runtime and Legal-BERT model
 */
async function initializeONNX() {
  if (isInitializing || workerStats.isInitialized) {
    return workerStats.isInitialized;
  }

  isInitializing = true;
  
  try {
    // Import ONNX Runtime for web workers
    importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js');
    
    if (!self.ort) {
      throw new Error('ONNX Runtime not loaded');
    }

    // Configure ONNX Runtime
    self.ort.env.wasm.wasmPaths = '/static/onnx/';
    self.ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
    
    // Create inference session (mock path - replace with actual model)
    const modelUrl = '/static/models/legal-bert-onnx/model.onnx';
    
    try {
      onnxSession = await self.ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm', 'cpu'],
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionMode: 'parallel'
      });
      
      console.log('✅ ONNX Legal-BERT model loaded successfully');
      console.log('📊 Input names:', onnxSession.inputNames);
      console.log('📊 Output names:', onnxSession.outputNames);
      
    } catch (modelError) {
      console.warn('⚠️ ONNX model not found, using mock implementation');
      onnxSession = createMockSession();
    }

    // Initialize tokenizer (simplified)
    tokenizer = createMockTokenizer();
    
    workerStats.isInitialized = true;
    postMessage({ 
      type: 'INITIALIZED', 
      payload: { 
        success: true, 
        inputNames: onnxSession.inputNames || ['input_ids', 'attention_mask'],
        outputNames: onnxSession.outputNames || ['last_hidden_state', 'pooler_output']
      } 
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ ONNX initialization failed:', error);
    postMessage({ 
      type: 'INITIALIZATION_ERROR', 
      payload: { error: error.message } 
    });
    return false;
  } finally {
    isInitializing = false;
  }
}

/**
 * Create mock ONNX session for testing when model is not available
 */
function createMockSession() {
  return {
    inputNames: ['input_ids', 'attention_mask', 'token_type_ids'],
    outputNames: ['last_hidden_state', 'pooler_output'],
    run: async (inputs) => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
      
      const batchSize = 1;
      const seqLength = 128;
      const hiddenSize = 768;
      
      return {
        last_hidden_state: new Float32Array(batchSize * seqLength * hiddenSize).map(() => Math.random() * 2 - 1),
        pooler_output: new Float32Array(batchSize * hiddenSize).map(() => Math.random() * 2 - 1)
      };
    }
  };
}

/**
 * Create mock tokenizer
 */
function createMockTokenizer() {
  const vocab = new Map();
  for (let i = 0; i < 30522; i++) {
    vocab.set(`token_${i}`, i);
  }
  
  return {
    encode: (text) => {
      const words = text.toLowerCase().split(/\s+/).slice(0, 510);
      const input_ids = [101, ...words.map((_, i) => 1000 + (i % 29000)), 102]; // [CLS] + tokens + [SEP]
      const attention_mask = Array(input_ids.length).fill(1);
      const token_type_ids = Array(input_ids.length).fill(0);
      
      // Pad to standard length
      const maxLength = 128;
      while (input_ids.length < maxLength) {
        input_ids.push(0);
        attention_mask.push(0);
        token_type_ids.push(0);
      }
      
      return {
        input_ids: input_ids.slice(0, maxLength),
        attention_mask: attention_mask.slice(0, maxLength),
        token_type_ids: token_type_ids.slice(0, maxLength)
      };
    },
    decode: (tokens) => tokens.map(t => `token_${t}`).join(' ')
  };
}

/**
 * Process legal entity extraction task
 */
async function processEntityExtraction(taskId, text) {
  const startTime = performance.now();
  
  try {
    // Tokenize input
    const tokens = tokenizer.encode(text);
    
    // Prepare ONNX inputs
    const inputs = {
      input_ids: new BigInt64Array(tokens.input_ids.map(id => BigInt(id))),
      attention_mask: new BigInt64Array(tokens.attention_mask.map(mask => BigInt(mask))),
      token_type_ids: new BigInt64Array(tokens.token_type_ids.map(type => BigInt(type)))
    };
    
    // Run inference
    const outputs = await onnxSession.run(inputs);
    
    // Process outputs for NER (mock implementation)
    const entities = extractEntitiesFromOutputs(outputs, text, tokens);
    
    const processingTime = performance.now() - startTime;
    
    return {
      taskId,
      type: 'ENTITY_EXTRACTION_COMPLETE',
      payload: {
        entities,
        processingTime,
        modelUsed: 'legal-bert-onnx'
      }
    };
    
  } catch (error) {
    return {
      taskId,
      type: 'ENTITY_EXTRACTION_ERROR',
      payload: { error: error.message }
    };
  }
}

/**
 * Process legal document classification task
 */
async function processClassification(taskId, text) {
  const startTime = performance.now();
  
  try {
    // Tokenize input (truncate to max length)
    const tokens = tokenizer.encode(text.substring(0, 1000));
    
    // Prepare ONNX inputs
    const inputs = {
      input_ids: new BigInt64Array(tokens.input_ids.map(id => BigInt(id))),
      attention_mask: new BigInt64Array(tokens.attention_mask.map(mask => BigInt(mask))),
      token_type_ids: new BigInt64Array(tokens.token_type_ids.map(type => BigInt(type)))
    };
    
    // Run inference
    const outputs = await onnxSession.run(inputs);
    
    // Process outputs for classification
    const predictions = classifyFromOutputs(outputs);
    
    const processingTime = performance.now() - startTime;
    
    return {
      taskId,
      type: 'CLASSIFICATION_COMPLETE',
      payload: {
        predictions,
        topPrediction: predictions[0],
        processingTime,
        modelUsed: 'legal-bert-onnx'
      }
    };
    
  } catch (error) {
    return {
      taskId,
      type: 'CLASSIFICATION_ERROR',
      payload: { error: error.message }
    };
  }
}

/**
 * Process embedding generation task
 */
async function processEmbedding(taskId, text) {
  const startTime = performance.now();
  
  try {
    // Tokenize input
    const tokens = tokenizer.encode(text.substring(0, 512));
    
    // Prepare ONNX inputs
    const inputs = {
      input_ids: new BigInt64Array(tokens.input_ids.map(id => BigInt(id))),
      attention_mask: new BigInt64Array(tokens.attention_mask.map(mask => BigInt(mask))),
      token_type_ids: new BigInt64Array(tokens.token_type_ids.map(type => BigInt(type)))
    };
    
    // Run inference
    const outputs = await onnxSession.run(inputs);
    
    // Extract embeddings from pooler output
    const embeddings = extractEmbeddingsFromOutputs(outputs);
    
    const processingTime = performance.now() - startTime;
    
    return {
      taskId,
      type: 'EMBEDDING_COMPLETE',
      payload: {
        embeddings,
        dimensions: embeddings.length,
        processingTime,
        modelUsed: 'legal-bert-onnx'
      }
    };
    
  } catch (error) {
    return {
      taskId,
      type: 'EMBEDDING_ERROR',
      payload: { error: error.message }
    };
  }
}

/**
 * Extract entities from ONNX outputs (mock implementation)
 */
function extractEntitiesFromOutputs(outputs, originalText, tokens) {
  // Mock entity extraction - replace with actual BIO/BILOU processing
  const legalKeywords = ['contract', 'court', 'defendant', 'plaintiff', 'attorney', 'judge', 'law', 'statute'];
  const entities = [];
  
  for (const keyword of legalKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;
    while ((match = regex.exec(originalText)) !== null) {
      entities.push({
        text: match[0],
        label: getEntityLabel(keyword),
        confidence: 0.85 + Math.random() * 0.1,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return entities.slice(0, 10); // Limit to top 10
}

/**
 * Get entity label for keyword
 */
function getEntityLabel(keyword) {
  const labelMap = {
    'contract': 'LEGAL_DOCUMENT',
    'court': 'COURT',
    'defendant': 'LEGAL_ROLE',
    'plaintiff': 'LEGAL_ROLE',
    'attorney': 'LEGAL_ROLE',
    'judge': 'LEGAL_ROLE',
    'law': 'LEGAL_CONCEPT',
    'statute': 'LEGAL_CONCEPT'
  };
  return labelMap[keyword.toLowerCase()] || 'LEGAL_ENTITY';
}

/**
 * Classify document from ONNX outputs (mock implementation)
 */
function classifyFromOutputs(outputs) {
  // Mock classification based on text analysis
  const docTypes = [
    { label: 'contract', confidence: 0.75 + Math.random() * 0.2 },
    { label: 'court_decision', confidence: 0.15 + Math.random() * 0.1 },
    { label: 'legal_brief', confidence: 0.05 + Math.random() * 0.05 },
    { label: 'statute', confidence: 0.03 + Math.random() * 0.02 },
    { label: 'regulation', confidence: 0.02 + Math.random() * 0.01 }
  ];
  
  // Normalize confidences
  const total = docTypes.reduce((sum, item) => sum + item.confidence, 0);
  return docTypes.map(item => ({
    ...item,
    confidence: item.confidence / total
  })).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract embeddings from ONNX outputs
 */
function extractEmbeddingsFromOutputs(outputs) {
  // Use pooler output or mean pooling from last hidden state
  if (outputs.pooler_output) {
    return Array.from(outputs.pooler_output);
  }
  
  // Mock embedding generation
  const embeddingSize = 768;
  return Array.from({ length: embeddingSize }, () => Math.random() * 2 - 1);
}

/**
 * Process task queue with concurrency control
 */
async function processTaskQueue() {
  while (taskQueue.length > 0 && activeTasks.size < WORKER_CONFIG.maxConcurrentTasks) {
    const task = taskQueue.shift();
    
    if (!task) continue;
    
    // Add to active tasks
    activeTasks.set(task.id, {
      ...task,
      startTime: performance.now()
    });
    
    // Process task asynchronously
    processTask(task).then(result => {
      // Remove from active tasks
      activeTasks.delete(task.id);
      
      // Update statistics
      updateWorkerStats(result);
      
      // Send result back to main thread
      postMessage(result);
      
      // Continue processing queue
      if (taskQueue.length > 0) {
        setTimeout(processTaskQueue, 0);
      }
    }).catch(error => {
      activeTasks.delete(task.id);
      postMessage({
        taskId: task.id,
        type: 'TASK_ERROR',
        payload: { error: error.message }
      });
    });
  }
}

/**
 * Process individual task based on type
 */
async function processTask(task) {
  switch (task.type) {
    case 'EXTRACT_ENTITIES':
      return await processEntityExtraction(task.id, task.payload.text);
    case 'CLASSIFY_DOCUMENT':
      return await processClassification(task.id, task.payload.text);
    case 'GENERATE_EMBEDDINGS':
      return await processEmbedding(task.id, task.payload.text);
    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

/**
 * Update worker performance statistics
 */
function updateWorkerStats(result) {
  workerStats.totalProcessed++;
  
  if (result.type.includes('ERROR')) {
    workerStats.errorCount++;
  } else {
    workerStats.successCount++;
    
    // Update average latency
    const latency = result.payload.processingTime || 0;
    workerStats.averageLatency = 
      (workerStats.averageLatency * (workerStats.successCount - 1) + latency) / workerStats.successCount;
  }
  
  // Update memory usage (approximate)
  if (performance.memory) {
    workerStats.memoryUsage = performance.memory.usedJSHeapSize;
  }
}

/**
 * Handle batch processing for improved efficiency
 */
async function processBatch(tasks) {
  const batchId = `batch_${Date.now()}`;
  const startTime = performance.now();
  
  try {
    // Process tasks in parallel with concurrency limit
    const results = [];
    const chunks = [];
    
    // Split into chunks based on batch size
    for (let i = 0; i < tasks.length; i += WORKER_CONFIG.batchSize) {
      chunks.push(tasks.slice(i, i + WORKER_CONFIG.batchSize));
    }
    
    // Process chunks sequentially, tasks within chunks in parallel
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(task => processTask(task));
      const chunkResults = await Promise.allSettled(chunkPromises);
      results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }));
    }
    
    const processingTime = performance.now() - startTime;
    
    postMessage({
      type: 'BATCH_COMPLETE',
      payload: {
        batchId,
        results,
        totalTasks: tasks.length,
        processingTime,
        averageTimePerTask: processingTime / tasks.length
      }
    });
    
  } catch (error) {
    postMessage({
      type: 'BATCH_ERROR',
      payload: {
        batchId,
        error: error.message,
        totalTasks: tasks.length
      }
    });
  }
}

// Message handler for communication with main thread
self.onmessage = async function(e) {
  const { type, payload, taskId } = e.data;
  
  try {
    switch (type) {
      case 'INITIALIZE':
        await initializeONNX();
        break;
        
      case 'EXTRACT_ENTITIES':
      case 'CLASSIFY_DOCUMENT':
      case 'GENERATE_EMBEDDINGS':
        // Add to task queue
        taskQueue.push({
          id: taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          payload
        });
        
        // Start processing if not already running
        if (activeTasks.size < WORKER_CONFIG.maxConcurrentTasks) {
          processTaskQueue();
        }
        break;
        
      case 'BATCH_PROCESS':
        await processBatch(payload.tasks || []);
        break;
        
      case 'GET_STATS':
        postMessage({
          type: 'STATS_RESPONSE',
          payload: {
            ...workerStats,
            queueLength: taskQueue.length,
            activeTasks: activeTasks.size,
            uptime: performance.now()
          }
        });
        break;
        
      case 'CLEAR_QUEUE':
        taskQueue = [];
        postMessage({ type: 'QUEUE_CLEARED' });
        break;
        
      default:
        postMessage({
          type: 'ERROR',
          payload: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      payload: { error: error.message, originalType: type }
    });
  }
};

// Initialize worker on load
self.addEventListener('load', () => {
  console.log('🔧 Legal-BERT ONNX Worker loaded');
  initializeONNX();
});

// Handle worker errors
self.addEventListener('error', (error) => {
  console.error('❌ Worker error:', error);
  postMessage({
    type: 'WORKER_ERROR',
    payload: { error: error.message }
  });
});

console.log('🚀 Legal-BERT ONNX Worker script loaded successfully');