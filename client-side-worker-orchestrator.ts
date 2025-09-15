// Client-Side Worker Orchestrator with Concurrency
// Features: Web Workers, SharedArrayBuffer, Task Queue, Local/Server coordination
// Prevents UI blocking during large legal document processing

interface WorkerTask {
  id: string;
  type: 'embedding' | 'summarization' | 'entity_extraction' | 'similarity_search';
  data: any;
  priority: number; // 1=urgent, 5=background
  timestamp: number;
  callback?: (result: any) => void;
}

interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  workerIndex: number;
}

interface EmbeddingCache {
  documentId: string;
  embeddings: Float32Array;
  timestamp: number;
  metadata: any;
}

interface ClientConfig {
  numWorkers: number;
  useSharedArrayBuffer: boolean;
  enableOfflineMode: boolean;
  serverEndpoint: string;
  localStorageLimit: number; // MB
  syncInterval: number; // minutes
}

class ClientSideWorkerOrchestrator {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTask: Map<number, WorkerTask> = new Map();
  private resultCallbacks: Map<string, (result: WorkerResult) => void> = new Map();
  private embeddingCache: Map<string, EmbeddingCache> = new Map();
  private sharedBuffer: SharedArrayBuffer | null = null;
  private config: ClientConfig;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: any[] = [];
  private taskIdCounter: number = 0;

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      numWorkers: navigator.hardwareConcurrency || 4,
      useSharedArrayBuffer: 'SharedArrayBuffer' in window,
      enableOfflineMode: true,
      serverEndpoint: '/api/legal-ai',
      localStorageLimit: 500, // 500MB limit
      syncInterval: 5, // Sync every 5 minutes
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🚀 Initializing Client-Side Worker Orchestrator...');

    // Check SharedArrayBuffer support
    if (this.config.useSharedArrayBuffer && !this.sharedBuffer) {
      try {
        // Allocate 100MB shared buffer for embeddings
        this.sharedBuffer = new SharedArrayBuffer(100 * 1024 * 1024);
        console.log('✅ SharedArrayBuffer allocated (100MB)');
      } catch (error) {
        console.warn('⚠️ SharedArrayBuffer not available:', error);
        this.config.useSharedArrayBuffer = false;
      }
    }

    // Initialize Web Workers
    await this.initializeWorkers();

    // Setup offline/online detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithServer();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Switched to offline mode');
    });

    // Load cached data from IndexedDB
    await this.loadCachedData();

    // Start periodic sync
    if (this.config.syncInterval > 0) {
      setInterval(() => this.syncWithServer(), this.config.syncInterval * 60 * 1000);
    }

    console.log('✅ Worker Orchestrator initialized');
  }

  private async initializeWorkers(): Promise<void> {
    const workerScript = this.createWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    for (let i = 0; i < this.config.numWorkers; i++) {
      const worker = new Worker(workerUrl);

      worker.onmessage = (event) => this.handleWorkerMessage(i, event);
      worker.onerror = (error) => this.handleWorkerError(i, error);

      // Initialize worker with shared buffer if available
      worker.postMessage({
        type: 'init',
        config: {
          workerIndex: i,
          sharedBuffer: this.sharedBuffer,
          gemmaConfig: {
            modelPath: '/models/gemma3-270m.wasm',
            tokenizerPath: '/models/gemma3-tokenizer.json',
            useWebGPU: true
          }
        }
      });

      this.workers.push(worker);
    }

    // Wait for all workers to be ready
    await this.waitForWorkersReady();
  }

  private createWorkerScript(): string {
    return `
// Web Worker Script for Legal AI Processing
importScripts('/js/gemma3-worker.js', '/js/langchain-worker.js');

let workerIndex = 0;
let sharedBuffer = null;
let sharedView = null;
let gemmaInstance = null;
let isReady = false;

self.onmessage = async (event) => {
  const { type, data, taskId } = event.data;

  try {
    switch (type) {
      case 'init':
        workerIndex = data.config.workerIndex;
        sharedBuffer = data.config.sharedBuffer;

        if (sharedBuffer) {
          sharedView = new Float32Array(sharedBuffer);
          console.log(\`Worker \${workerIndex}: SharedArrayBuffer connected\`);
        }

        // Initialize Gemma3 in worker
        gemmaInstance = new ClientSideGemma(data.config.gemmaConfig);
        await gemmaInstance.initialize();
        isReady = true;

        self.postMessage({
          type: 'ready',
          workerIndex,
          message: 'Worker initialized successfully'
        });
        break;

      case 'embedding':
        if (!isReady) throw new Error('Worker not ready');
        const embedding = await generateEmbedding(data);

        // Store in shared buffer if available
        if (sharedView && data.sharedOffset) {
          sharedView.set(embedding, data.sharedOffset);
        }

        self.postMessage({
          type: 'result',
          taskId,
          success: true,
          data: { embedding, sharedOffset: data.sharedOffset },
          processingTime: performance.now() - data.startTime
        });
        break;

      case 'summarization':
        if (!gemmaInstance) throw new Error('Gemma not initialized');
        const summary = await gemmaInstance.generateText({
          prompt: \`Summarize this legal document: \${data.text}\`,
          maxTokens: data.maxTokens || 256,
          temperature: 0.3
        });

        self.postMessage({
          type: 'result',
          taskId,
          success: true,
          data: summary,
          processingTime: performance.now() - data.startTime
        });
        break;

      case 'entity_extraction':
        const entities = await extractLegalEntities(data.text);
        self.postMessage({
          type: 'result',
          taskId,
          success: true,
          data: { entities },
          processingTime: performance.now() - data.startTime
        });
        break;

      case 'similarity_search':
        const similarities = await performSimilaritySearch(data);
        self.postMessage({
          type: 'result',
          taskId,
          success: true,
          data: { similarities },
          processingTime: performance.now() - data.startTime
        });
        break;

      default:
        throw new Error(\`Unknown task type: \${type}\`);
    }

  } catch (error) {
    self.postMessage({
      type: 'result',
      taskId,
      success: false,
      error: error.message,
      processingTime: performance.now() - (data?.startTime || 0)
    });
  }
};

async function generateEmbedding(data) {
  // Use Gemma3 to generate embeddings
  if (gemmaInstance) {
    const response = await gemmaInstance.generateText({
      prompt: \`Generate embedding for: \${data.text}\`,
      maxTokens: 1
    });

    // Convert to embedding vector (simplified)
    const embedding = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      embedding[i] = Math.random() * 0.1 - 0.05; // Demo: would use actual embeddings
    }
    return embedding;
  }

  throw new Error('Gemma instance not available');
}

async function extractLegalEntities(text) {
  // Simple entity extraction (production would use NER models)
  const patterns = {
    COURT: /\\b(?:Supreme Court|District Court|Court of Appeals)\\b/gi,
    STATUTE: /\\b\\d+\\s+U\\.S\\.C\\.\\s*§\\s*\\d+/gi,
    CASE: /\\b\\w+\\s+v\\.\\s+\\w+/gi,
    DATE: /\\b\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\b|\\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4}\\b/gi
  };

  const entities = [];
  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      entities.push({
        type,
        text: match,
        confidence: 0.85 + Math.random() * 0.1
      });
    });
  }

  return entities;
}

async function performSimilaritySearch(data) {
  const { queryEmbedding, candidateEmbeddings, topK = 5 } = data;

  const similarities = candidateEmbeddings.map((candidate, index) => {
    // Cosine similarity
    let dotProduct = 0;
    let queryNorm = 0;
    let candidateNorm = 0;

    for (let i = 0; i < Math.min(queryEmbedding.length, candidate.embedding.length); i++) {
      dotProduct += queryEmbedding[i] * candidate.embedding[i];
      queryNorm += queryEmbedding[i] * queryEmbedding[i];
      candidateNorm += candidate.embedding[i] * candidate.embedding[i];
    }

    const similarity = dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(candidateNorm));

    return {
      index,
      documentId: candidate.documentId,
      similarity,
      metadata: candidate.metadata
    };
  });

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
    `;
  }

  private async waitForWorkersReady(): Promise<void> {
    return new Promise((resolve) => {
      let readyCount = 0;
      const checkReady = () => {
        if (readyCount >= this.config.numWorkers) {
          console.log(`✅ All ${this.config.numWorkers} workers ready`);
          resolve();
        }
      };

      this.workers.forEach((worker, index) => {
        const originalOnMessage = worker.onmessage;
        worker.onmessage = (event) => {
          if (event.data.type === 'ready') {
            readyCount++;
            checkReady();
          }
          if (originalOnMessage) originalOnMessage(event);
        };
      });
    });
  }

  private handleWorkerMessage(workerIndex: number, event: MessageEvent): void {
    const { type, taskId, success, data, error, processingTime } = event.data;

    switch (type) {
      case 'ready':
        console.log(`Worker ${workerIndex} ready`);
        break;

      case 'result':
        const task = this.activeTask.get(workerIndex);
        if (task && task.id === taskId) {
          this.activeTask.delete(workerIndex);

          const result: WorkerResult = {
            taskId,
            success,
            data,
            error,
            processingTime,
            workerIndex
          };

          // Call callback if provided
          const callback = this.resultCallbacks.get(taskId);
          if (callback) {
            callback(result);
            this.resultCallbacks.delete(taskId);
          }

          // Process next task in queue
          this.processNextTask();
        }
        break;

      default:
        console.log(`Worker ${workerIndex} message:`, event.data);
    }
  }

  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`Worker ${workerIndex} error:`, error);

    // Handle task failure
    const task = this.activeTask.get(workerIndex);
    if (task) {
      this.activeTask.delete(workerIndex);

      const callback = this.resultCallbacks.get(task.id);
      if (callback) {
        callback({
          taskId: task.id,
          success: false,
          error: error.message,
          processingTime: 0,
          workerIndex
        });
        this.resultCallbacks.delete(task.id);
      }
    }
  }

  // Public API Methods

  async processDocument(
    documentText: string,
    options: {
      generateEmbedding?: boolean;
      extractEntities?: boolean;
      generateSummary?: boolean;
      priority?: number;
    } = {}
  ): Promise<any> {
    const {
      generateEmbedding = true,
      extractEntities = true,
      generateSummary = true,
      priority = 3
    } = options;

    const results: any = {
      documentId: `doc_${Date.now()}`,
      processedAt: new Date().toISOString(),
      text: documentText
    };

    const tasks: Promise<any>[] = [];

    // Generate embedding
    if (generateEmbedding) {
      tasks.push(
        this.queueTask({
          type: 'embedding',
          data: { text: documentText, startTime: performance.now() },
          priority
        }).then(result => {
          results.embedding = result.data.embedding;

          // Cache embedding locally
          this.cacheEmbedding(results.documentId, result.data.embedding, {
            text: documentText.substring(0, 200) + '...',
            timestamp: Date.now()
          });
        })
      );
    }

    // Extract entities
    if (extractEntities) {
      tasks.push(
        this.queueTask({
          type: 'entity_extraction',
          data: { text: documentText, startTime: performance.now() },
          priority
        }).then(result => {
          results.entities = result.data.entities;
        })
      );
    }

    // Generate summary
    if (generateSummary) {
      tasks.push(
        this.queueTask({
          type: 'summarization',
          data: {
            text: documentText,
            maxTokens: 256,
            startTime: performance.now()
          },
          priority
        }).then(result => {
          results.summary = result.data.text;
        })
      );
    }

    // Wait for all tasks to complete
    await Promise.all(tasks);

    // Add to sync queue if online
    if (this.isOnline) {
      this.addToSyncQueue(results);
    } else {
      // Store locally for later sync
      await this.storeLocalData(results);
    }

    return results;
  }

  async searchSimilarDocuments(
    queryText: string,
    topK: number = 5
  ): Promise<any[]> {
    // First generate embedding for query
    const queryResult = await this.queueTask({
      type: 'embedding',
      data: { text: queryText, startTime: performance.now() },
      priority: 1 // High priority for search
    });

    const queryEmbedding = queryResult.data.embedding;

    // Get cached embeddings
    const candidateEmbeddings = Array.from(this.embeddingCache.values()).map(cache => ({
      documentId: cache.documentId,
      embedding: cache.embeddings,
      metadata: cache.metadata
    }));

    if (candidateEmbeddings.length === 0) {
      return [];
    }

    // Perform similarity search
    const searchResult = await this.queueTask({
      type: 'similarity_search',
      data: {
        queryEmbedding,
        candidateEmbeddings,
        topK,
        startTime: performance.now()
      },
      priority: 1
    });

    return searchResult.data.similarities;
  }

  private async queueTask(taskData: Omit<WorkerTask, 'id' | 'timestamp'>): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        ...taskData,
        id: `task_${++this.taskIdCounter}_${Date.now()}`,
        timestamp: Date.now()
      };

      this.resultCallbacks.set(task.id, (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error));
        }
      });

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  private processNextTask(): void {
    // Find available worker
    const availableWorkerIndex = this.workers.findIndex((_, index) => !this.activeTask.has(index));

    if (availableWorkerIndex === -1 || this.taskQueue.length === 0) {
      return; // No available workers or no tasks
    }

    // Sort queue by priority (1 = highest priority)
    this.taskQueue.sort((a, b) => a.priority - b.priority);

    const task = this.taskQueue.shift()!;
    const worker = this.workers[availableWorkerIndex];

    this.activeTask.set(availableWorkerIndex, task);

    // Assign shared buffer offset if using SharedArrayBuffer
    if (this.sharedBuffer && task.type === 'embedding') {
      task.data.sharedOffset = availableWorkerIndex * 512; // 512 floats per worker
    }

    worker.postMessage({
      type: task.type,
      data: task.data,
      taskId: task.id
    });
  }

  private cacheEmbedding(documentId: string, embedding: Float32Array, metadata: any): void {
    this.embeddingCache.set(documentId, {
      documentId,
      embeddings: embedding,
      timestamp: Date.now(),
      metadata
    });

    // Persist to IndexedDB
    this.storeEmbeddingInDB(documentId, embedding, metadata);
  }

  private async storeEmbeddingInDB(documentId: string, embedding: Float32Array, metadata: any): Promise<void> {
    try {
      const request = indexedDB.open('LegalAICache', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'documentId' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['embeddings'], 'readwrite');
        const store = transaction.objectStore('embeddings');

        store.put({
          documentId,
          embedding: Array.from(embedding),
          metadata,
          timestamp: Date.now()
        });
      };
    } catch (error) {
      console.error('Failed to store embedding in IndexedDB:', error);
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      const request = indexedDB.open('LegalAICache', 1);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (db.objectStoreNames.contains('embeddings')) {
          const transaction = db.transaction(['embeddings'], 'readonly');
          const store = transaction.objectStore('embeddings');
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            const cachedEmbeddings = getAllRequest.result;

            for (const cached of cachedEmbeddings) {
              this.embeddingCache.set(cached.documentId, {
                documentId: cached.documentId,
                embeddings: new Float32Array(cached.embedding),
                timestamp: cached.timestamp,
                metadata: cached.metadata
              });
            }

            console.log(`📚 Loaded ${cachedEmbeddings.length} cached embeddings`);
          };
        }
      };
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  }

  private async storeLocalData(data: any): Promise<void> {
    // Store in IndexedDB for offline access
    try {
      const request = indexedDB.open('LegalAICache', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'documentId' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');

        store.put({
          ...data,
          storedAt: Date.now(),
          synced: false
        });
      };
    } catch (error) {
      console.error('Failed to store local data:', error);
    }
  }

  private addToSyncQueue(data: any): void {
    this.syncQueue.push(data);

    // Immediate sync for small queue
    if (this.syncQueue.length < 10) {
      this.syncWithServer();
    }
  }

  private async syncWithServer(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    try {
      const response = await fetch(`${this.config.serverEndpoint}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: this.syncQueue,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        console.log(`✅ Synced ${this.syncQueue.length} items to server`);
        this.syncQueue = [];
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Utility methods
  getStatus(): any {
    return {
      numWorkers: this.config.numWorkers,
      activeTask: this.activeTask.size,
      queuedTasks: this.taskQueue.length,
      cachedEmbeddings: this.embeddingCache.size,
      isOnline: this.isOnline,
      sharedBufferEnabled: !!this.sharedBuffer,
      pendingSync: this.syncQueue.length
    };
  }

  destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeTask.clear();
    this.resultCallbacks.clear();
  }
}

export default ClientSideWorkerOrchestrator;
export type { WorkerTask, WorkerResult, ClientConfig };