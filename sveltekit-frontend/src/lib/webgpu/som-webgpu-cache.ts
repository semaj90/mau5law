// 🚀 WebGPU-Accelerated SOM Semantic Cache
// Real-time PageRank with loki.js-style IndexDB integration

import Loki from 'lokijs';
// LokiJS types may not be available; use loose typing for collections
type Collection<T> = any;

export interface NPMError {
  message: string;
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  type: string;
  timestamp: string;
  context?: string[];
  dependencies?: string[];
}

export interface IntelligentTodo {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  estimated_effort: number; // nanoseconds
  dependencies: string[];
  suggested_fixes: string[];
  related_errors: NPMError[];
  confidence: number;
  tags: string[];
  created_at: string;
  metadata: Record<string, any>;
}

// Respect environment flag to enable/disable WebGPU features in dev
const ENABLE_GPU = (() => {
  try {
    const v = process?.env?.ENABLE_GPU;
    if (typeof v === 'string') return v.toLowerCase() !== 'false' && v !== '0';
  } catch (e: any) { }
  return true;
})();

export class WebGPUSOMCache {
  private device: GPUDevice | null = null;
  private lokiDB: Loki;
  private indexDB: IDBDatabase | null = null;
  private todosCollection: Collection<any>;
  private errorsCollection: Collection<any>;
  private cacheCollection: Collection<any>;

  // Redis integration
  private redisClient: any = null;
  private redisConnected = false;
  private redisConfig = {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'som:cache:',
    syncInterval: 30000, // 30 seconds
  };
  private syncTimer: any = null;

  // WebGPU compute shaders for semantic operations
  private similarityShader = `
    @group(0) @binding(0) var<storage, read> query_vector: array<f32>;
    @group(0) @binding(1) var<storage, read> document_vectors: array<f32>;
    @group(0) @binding(2) var<storage, read_write> similarities: array<f32>;
    @group(0) @binding(3) var<uniform> metadata: array<u32, 4>; // [vector_dim, num_docs, 0, 0]

    @compute @workgroup_size(64)
    fn compute_similarity(@builtin(global_invocation_id) id: vec3<u32>) {
      let doc_id = id.x;
      let vector_dim = metadata[0];
      let num_docs = metadata[1];

      if (doc_id >= num_docs) { return; }

      var dot_product = 0.0;
      var query_norm = 0.0;
      var doc_norm = 0.0;

      for (var i = 0u; i < vector_dim; i++) {
        let q_val = query_vector[i];
        let d_val = document_vectors[doc_id * vector_dim + i];

        dot_product += q_val * d_val;
        query_norm += q_val * q_val;
        doc_norm += d_val * d_val;
      }

      let cosine_sim = dot_product / (sqrt(query_norm) * sqrt(doc_norm));
      similarities[doc_id] = cosine_sim;
    }
  `;

  private pageRankShader = `
    @group(0) @binding(0) var<storage, read> adjacency_matrix: array<f32>;
    @group(0) @binding(1) var<storage, read_write> pagerank_scores: array<f32>;
    @group(0) @binding(2) var<storage, read_write> new_scores: array<f32>;
    @group(0) @binding(3) var<uniform> params: array<f32, 4>; // [num_nodes, damping, 0, 0]

    @compute @workgroup_size(64)
    fn pagerank_iteration(@builtin(global_invocation_id) id: vec3<u32>) {
      let node_id = id.x;
      let num_nodes = u32(params[0]);
      let damping = params[1];

      if (node_id >= num_nodes) { return; }

      var rank_sum = 0.0;
      for (var i = 0u; i < num_nodes; i++) {
        let edge_weight = adjacency_matrix[i * num_nodes + node_id];
        if (edge_weight > 0.0) {
          // Calculate out-degree
          var out_degree = 0.0;
          for (var j = 0u; j < num_nodes; j++) {
            out_degree += adjacency_matrix[i * num_nodes + j];
          }
          if (out_degree > 0.0) {
            rank_sum += pagerank_scores[i] * edge_weight / out_degree;
          }
        }
      }

      new_scores[node_id] = (1.0 - damping) / f32(num_nodes) + damping * rank_sum;
    }
  `;

  private errorEmbeddingShader = `
    @group(0) @binding(0) var<storage, read> error_text: array<u32>; // Encoded text
    @group(0) @binding(1) var<storage, read_write> embeddings: array<f32>;
    @group(0) @binding(2) var<uniform> config: array<u32, 4>; // [text_length, embedding_dim, 0, 0]

    @compute @workgroup_size(32)
    fn compute_error_embedding(@builtin(global_invocation_id) id: vec3<u32>) {
      let embedding_id = id.x;
      let text_length = config[0];
      let embedding_dim = config[1];

      if (embedding_id >= embedding_dim) { return; }

      var value = 0.0;

      // Simple bag-of-words embedding with positional encoding
      for (var i = 0u; i < text_length; i++) {
        let char_code = error_text[i];
        let position_weight = 1.0 / (1.0 + f32(i) * 0.1);
        let char_contribution = f32(char_code) / 255.0 * position_weight;

        // Hash to embedding dimension
        let hash = (char_code * 17u + i * 31u) % embedding_dim;
        if (hash == embedding_id) {
          value += char_contribution;
        }
      }

      // Normalize
      embeddings[embedding_id] = tanh(value);
    }
  `;

  // Legal document processing shaders
  private legalDocumentEmbeddingShader = `
    @group(0) @binding(0) var<storage, read> document_text: array<u32>; // Encoded legal text
    @group(0) @binding(1) var<storage, read_write> embeddings: array<f32>;
    @group(0) @binding(2) var<uniform> config: array<u32, 8>; // [text_length, embedding_dim, legal_weights, case_weights, 0, 0, 0, 0]

    @compute @workgroup_size(64)
    fn compute_legal_embedding(@builtin(global_invocation_id) id: vec3<u32>) {
      let embedding_id = id.x;
      let text_length = config[0];
      let embedding_dim = config[1];
      let legal_weight = f32(config[2]) / 100.0; // Boost legal terms
      let case_weight = f32(config[3]) / 100.0;  // Boost case references

      if (embedding_id >= embedding_dim) { return; }

      var value = 0.0;
      var legal_term_bonus = 0.0;

      // Legal document embedding with domain-specific weighting
      for (var i = 0u; i < text_length; i++) {
        let char_code = document_text[i];
        let position_weight = 1.0 / (1.0 + f32(i) * 0.05); // Slower decay for legal docs
        var char_contribution = f32(char_code) / 255.0 * position_weight;

        // Legal term detection (simplified)
        if (char_code >= 65u && char_code <= 90u) { // Uppercase letters often indicate legal terms
          char_contribution *= legal_weight;
        }

        // Case reference detection (numbers)
        if (char_code >= 48u && char_code <= 57u) { // Numbers for case citations
          char_contribution *= case_weight;
        }

        // Advanced hash for legal document clustering
        let hash1 = (char_code * 23u + i * 47u) % embedding_dim;
        let hash2 = (char_code * 31u + i * 53u) % embedding_dim;
        
        if (hash1 == embedding_id || hash2 == embedding_id) {
          value += char_contribution;
        }
      }

      // Legal document normalization with tanh activation
      embeddings[embedding_id] = tanh(value * 0.7); // Slightly compressed for legal stability
    }
  `;

  private vectorQuantizationShader = `
    @group(0) @binding(0) var<storage, read> input_vectors: array<f32>;
    @group(0) @binding(1) var<storage, read_write> quantized_vectors: array<i32>;
    @group(0) @binding(2) var<uniform> params: array<f32, 8>; // [vector_count, vector_dim, scale_factor, offset, 0, 0, 0, 0]

    @compute @workgroup_size(64)
    fn quantize_vectors(@builtin(global_invocation_id) id: vec3<u32>) {
      let vector_id = id.x;
      let vector_count = u32(params[0]);
      let vector_dim = u32(params[1]);
      let scale_factor = params[2];
      let offset = params[3];

      if (vector_id >= vector_count * vector_dim) { return; }

      let value = input_vectors[vector_id];
      
      // Quantize to 8-bit signed integer (-128 to 127)
      let scaled_value = (value + offset) * scale_factor;
      let quantized = i32(clamp(scaled_value, -128.0, 127.0));
      
      quantized_vectors[vector_id] = quantized;
    }
  `;

  private legalSimilarityShader = `
    @group(0) @binding(0) var<storage, read> query_vector: array<f32>;
    @group(0) @binding(1) var<storage, read> legal_documents: array<f32>;
    @group(0) @binding(2) var<storage, read> legal_metadata: array<u32>; // Document types, jurisdictions, etc.
    @group(0) @binding(3) var<storage, read_write> similarities: array<f32>;
    @group(0) @binding(4) var<uniform> config: array<u32, 8>; // [vector_dim, num_docs, jurisdiction_boost, doc_type_boost, 0, 0, 0, 0]

    @compute @workgroup_size(64)
    fn compute_legal_similarity(@builtin(global_invocation_id) id: vec3<u32>) {
      let doc_id = id.x;
      let vector_dim = config[0];
      let num_docs = config[1];
      let jurisdiction_boost = f32(config[2]) / 100.0;
      let doc_type_boost = f32(config[3]) / 100.0;

      if (doc_id >= num_docs) { return; }

      var dot_product = 0.0;
      var query_norm = 0.0;
      var doc_norm = 0.0;

      // Compute cosine similarity
      for (var i = 0u; i < vector_dim; i++) {
        let q_val = query_vector[i];
        let d_val = legal_documents[doc_id * vector_dim + i];

        dot_product += q_val * d_val;
        query_norm += q_val * q_val;
        doc_norm += d_val * d_val;
      }

      var cosine_sim = dot_product / (sqrt(query_norm) * sqrt(doc_norm));

      // Apply legal domain-specific boosts
      let doc_metadata = legal_metadata[doc_id];
      let doc_type = doc_metadata & 0xFFu; // Lower 8 bits for document type
      let jurisdiction = (doc_metadata >> 8u) & 0xFFu; // Next 8 bits for jurisdiction

      // Boost based on document type relevance
      if (doc_type == 1u) { // Contracts
        cosine_sim *= (1.0 + doc_type_boost);
      } else if (doc_type == 2u) { // Case law
        cosine_sim *= (1.0 + doc_type_boost * 0.8);
      }

      // Boost based on jurisdiction relevance
      if (jurisdiction == 1u) { // Federal
        cosine_sim *= (1.0 + jurisdiction_boost);
      }

      similarities[doc_id] = cosine_sim;
    }
  `;

  constructor() {
    this.lokiDB = new Loki('som-cache.db', {
      autoload: true,
      autoloadCallback: () => this.initializeCollections(),
      autosave: true,
      autosaveInterval: 4000,
    });
  }

  private initializeCollections() {
    this.todosCollection =
      this.lokiDB.getCollection('todos') ||
      this.lokiDB.addCollection('todos', {
        indices: ['priority', 'category', 'confidence'],
        unique: ['id'],
      });

    this.errorsCollection =
      this.lokiDB.getCollection('errors') ||
      this.lokiDB.addCollection('errors', {
        indices: ['severity', 'category', 'file'],
        unique: ['id'],
      });

    this.cacheCollection =
      this.lokiDB.getCollection('cache') ||
      this.lokiDB.addCollection('cache', {
        indices: ['key', 'timestamp'],
        ttl: 300000, // 5 minutes
      });
  }

  /**
   * Initialize the WebGPU SOM Cache system
   */
  async initialize(): Promise<boolean> {
    try {
      const gpuInitialized = await this.initializeWebGPU();
      const indexDBInitialized = await this.initializeIndexDB();

      return gpuInitialized && indexDBInitialized;
    } catch (error) {
      console.error('❌ [WebGPUSOMCache] Failed to initialize:', error);
      return false;
    }
  }

  async initializeWebGPU(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to CPU processing');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice({
        requiredFeatures: ['shader-f16'] as GPUFeatureName[],
        requiredLimits: {
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          maxComputeWorkgroupStorageSize: adapter.limits.maxComputeWorkgroupStorageSize,
        },
      });

      console.log('🚀 WebGPU initialized for SOM semantic caching');
      return true;
    } catch (error: any) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  async initializeIndexDB(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SOMSemanticCache', 1);

      request.onerror = () => {
        console.error('IndexDB initialization failed');
        resolve(false);
      };

      request.onsuccess = (event: any) => {
        this.indexDB = (event.target as IDBOpenDBRequest).result;
        console.log('📄 IndexDB initialized for persistent caching');
        resolve(true);
      };

      request.onupgradeneeded = (event: any) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create todos store
        if (!db.objectStoreNames.contains('todos')) {
          const todosStore = db.createObjectStore('todos', { keyPath: 'id' });
          todosStore.createIndex('priority', 'priority', { unique: false });
          todosStore.createIndex('category', 'category', { unique: false });
          todosStore.createIndex('timestamp', 'created_at', { unique: false });
        }

        // Create errors store
        if (!db.objectStoreNames.contains('errors')) {
          const errorsStore = db.createObjectStore('errors', { keyPath: 'id' });
          errorsStore.createIndex('severity', 'severity', { unique: false });
          errorsStore.createIndex('file', 'file', { unique: false });
        }

        // Create cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async processNPMCheckErrors(npmOutput: string): Promise<IntelligentTodo[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(npmOutput);
    const cached = this.getLocalCachedTodos(cacheKey);
    if (cached) {
      console.log('📋 Retrieved cached SOM analysis');
      return cached;
    }

    // Extract errors from npm output
    const errors = this.parseNPMErrors(npmOutput);

    // Generate embeddings using WebGPU if available
    const errorEmbeddings = this.device
      ? await this.computeErrorEmbeddingsGPU(errors)
      : this.computeErrorEmbeddingsCPU(errors);

    // Send to Go SOM analyzer (simulated - replace with actual HTTP call)
    const intelligentTodos = await this.callGoSOMAnalyzer(errors);

    // Apply WebGPU PageRank refinement
    const rankedTodos = this.device
      ? await this.refineRankingWithWebGPU(intelligentTodos)
      : intelligentTodos;

    // Cache results
    this.cacheResult(cacheKey, rankedTodos);

    // Store in IndexDB for persistence
    await this.persistTodos(rankedTodos);

    return rankedTodos;
  }

  private parseNPMErrors(npmOutput: string): NPMError[] {
    const errors: NPMError[] = [];
    const lines = npmOutput.split('\n');

    for (const line of lines) {
      if (line.includes('error') || line.includes('Error')) {
        // Parse TypeScript-style errors
        const match = line.match(/(.+\.ts)\((\d+),\d+\): (.+)/);
        if (match) {
          errors.push({
            message: match[3],
            file: match[1],
            line: parseInt(match[2]),
            severity: this.determineSeverity(match[3]),
            category: this.determineCategory(match[3]),
            type: 'error',
            timestamp: new Date().toISOString(),
            context: [line],
          });
        }
      }
    }

    return errors;
  }

  private determineSeverity(message: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) return 'critical';
    if (lowerMessage.includes('error') || lowerMessage.includes('cannot')) return 'high';
    if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) return 'medium';
    return 'low';
  }

  private determineCategory(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('type') || lowerMessage.includes('property')) return 'typescript';
    if (lowerMessage.includes('import') || lowerMessage.includes('module')) return 'import';
    if (lowerMessage.includes('syntax') || lowerMessage.includes('unexpected')) return 'syntax';
    if (lowerMessage.includes('service') || lowerMessage.includes('fetch')) return 'service';
    if (lowerMessage.includes('build') || lowerMessage.includes('compile')) return 'build';
    return 'general';
  }

  private async computeErrorEmbeddingsGPU(errors: NPMError[]): Promise<Float32Array[]> {
    if (!this.device) return [];

    const embeddings: Float32Array[] = [];
    const embeddingDim = 128;

    // Create compute pipeline
    const shaderModule = this.device.createShaderModule({
      code: this.errorEmbeddingShader,
    });

    const computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'compute_error_embedding',
      },
    });

    for (const error of errors) {
      const textData = new TextEncoder().encode(error.message);
      const paddedText = new Uint32Array(256); // Fixed size
      for (let i = 0; i < Math.min(textData.length, 256); i++) {
        paddedText[i] = textData[i];
      }

      // Create buffers
      const textBuffer = this.device.createBuffer({
        size: paddedText.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const embeddingBuffer = this.device.createBuffer({
        size: embeddingDim * 4, // 4 bytes per float32
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const configBuffer = this.device.createBuffer({
        size: 16, // 4 uint32s
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const resultBuffer = this.device.createBuffer({
        size: embeddingDim * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      // Write data to buffers
      this.device.queue.writeBuffer(textBuffer, 0, paddedText);
      this.device.queue.writeBuffer(
        configBuffer,
        0,
        new Uint32Array([textData.length, embeddingDim, 0, 0])
      );

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: textBuffer } },
          { binding: 1, resource: { buffer: embeddingBuffer } },
          { binding: 2, resource: { buffer: configBuffer } },
        ],
      });

      // Run compute
      const encoder = this.device.createCommandEncoder();
      const computePass = encoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(Math.ceil(embeddingDim / 32));
      computePass.end();

      encoder.copyBufferToBuffer(embeddingBuffer, 0, resultBuffer, 0, embeddingDim * 4);
      this.device.queue.submit([encoder.finish()]);

      // Read result
      await resultBuffer.mapAsync(GPUMapMode.READ);
      const embedding = new Float32Array(resultBuffer.getMappedRange());
      embeddings.push(embedding.slice());
      resultBuffer.unmap();

      // Cleanup
      textBuffer.destroy();
      embeddingBuffer.destroy();
      configBuffer.destroy();
      resultBuffer.destroy();
    }

    return embeddings;
  }

  private computeErrorEmbeddingsCPU(errors: NPMError[]): Float32Array[] {
    // Fallback CPU implementation
    return errors.map((error) => {
      const embedding = new Float32Array(128);
      const text = error.message.toLowerCase();

      for (let i = 0; i < text.length && i < 128; i++) {
        embedding[i] = text.charCodeAt(i) / 255.0;
      }

      return embedding;
    });
  }

  private async callGoSOMAnalyzer(errors: NPMError[]): Promise<IntelligentTodo[]> {
    // In a real implementation, this would call the Go SOM analyzer
    // For now, simulate the response structure
    try {
      const response = await fetch('http://localhost:8080/api/som/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        throw new Error(`SOM analyzer failed: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Go SOM analyzer unavailable, using mock data');
      return this.generateMockTodos(errors);
    }
  }

  private generateMockTodos(errors: NPMError[]): IntelligentTodo[] {
    // Generate mock intelligent todos based on the SOM analyzer output format
    const categories = new Map<string, NPMError[]>();

    errors.forEach((error) => {
      if (!categories.has(error.category)) {
        categories.set(error.category, []);
      }
      categories.get(error.category)!.push(error);
    });

    const todos: IntelligentTodo[] = [];
    let todoId = 0;

    categories.forEach((categoryErrors, category) => {
      const severity = categoryErrors.reduce(
        (max, error) =>
          this.getSeverityWeight(error.severity) > this.getSeverityWeight(max)
            ? error.severity
            : max,
        'low'
      );

      todos.push({
        id: `mock-todo-${todoId++}`,
        priority: this.getSeverityWeight(severity) + Math.random() * 0.1,
        category,
        title: `Fix ${categoryErrors.length} ${category} ${categoryErrors.length === 1 ? 'error' : 'errors'}`,
        description: `Address ${category} issues in ${new Set(categoryErrors.map((e: any) => e.file)).size} files`,
        estimated_effort: categoryErrors.length * 15 * 60 * 1000000000, // 15 minutes per error in nanoseconds
        dependencies: [],
        suggested_fixes: this.generateSuggestedFixes(category),
        related_errors: categoryErrors,
        confidence: 0.8 + Math.random() * 0.2,
        tags: [category, severity],
        created_at: new Date().toISOString(),
        metadata: {
          error_count: categoryErrors.length,
          files_affected: new Set(categoryErrors.map((e: any) => e.file)).size,
        },
      });
    });

    return todos.sort((a, b) => b.priority - a.priority);
  }

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };
    return weights[severity] ?? 0.2;
  }

  private generateSuggestedFixes(category: string): string[] {
    const fixes: Record<string, string[]> = {
      typescript: [
        'Add missing type declarations',
        'Fix import statements',
        'Update tsconfig.json',
      ],
      import: ['Check module paths', 'Install missing dependencies', 'Update import syntax'],
      syntax: ['Fix syntax errors', 'Check parentheses and brackets', 'Review code formatting'],
      service: ['Check service connectivity', 'Verify configuration', 'Restart services'],
      build: ['Clear build cache', 'Update dependencies', 'Check build configuration'],
      general: ['Review error messages', 'Check documentation', 'Apply standard fixes'],
    };
    return fixes[category] ?? fixes.general;
  }

  private async refineRankingWithWebGPU(todos: IntelligentTodo[]): Promise<IntelligentTodo[]> {
    if (!this.device || todos.length === 0) return todos;

    const numNodes = todos.length;
    const adjacencyMatrix = new Float32Array(numNodes * numNodes);

    // Build adjacency matrix based on todo relationships
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (i !== j) {
          const similarity = this.calculateTodoSimilarity(todos[i], todos[j]);
          adjacencyMatrix[i * numNodes + j] = similarity;
        }
      }
    }

    // Initial PageRank scores
    const pageRankScores = new Float32Array(numNodes);
    pageRankScores.fill(1.0 / numNodes);

    // Create WebGPU resources
    const shaderModule = this.device.createShaderModule({
      code: this.pageRankShader,
    });

    const computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'pagerank_iteration',
      },
    });

    // Create buffers
    const adjacencyBuffer = this.device.createBuffer({
      size: adjacencyMatrix.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const scoresBuffer = this.device.createBuffer({
      size: pageRankScores.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const newScoresBuffer = this.device.createBuffer({
      size: pageRankScores.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const paramsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const resultBuffer = this.device.createBuffer({
      size: pageRankScores.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write initial data
    this.device.queue.writeBuffer(adjacencyBuffer, 0, adjacencyMatrix);
    this.device.queue.writeBuffer(scoresBuffer, 0, pageRankScores);
    this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([numNodes, 0.85, 0, 0]));

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: adjacencyBuffer } },
        { binding: 1, resource: { buffer: scoresBuffer } },
        { binding: 2, resource: { buffer: newScoresBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } },
      ],
    });

    // Run PageRank iterations
    for (let iter = 0; iter < 20; iter++) {
      const encoder = this.device.createCommandEncoder();
      const computePass = encoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(Math.ceil(numNodes / 64));
      computePass.end();

      // Copy new scores back to current scores
      encoder.copyBufferToBuffer(newScoresBuffer, 0, scoresBuffer, 0, pageRankScores.byteLength);
      this.device.queue.submit([encoder.finish()]);

      await this.device.queue.onSubmittedWorkDone();
    }

    // Read final results
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(scoresBuffer, 0, resultBuffer, 0, pageRankScores.byteLength);
    this.device.queue.submit([encoder.finish()]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const finalScores = new Float32Array(resultBuffer.getMappedRange());

    // Apply refined scores to todos
    const refinedTodos = todos.map((todo, index) => ({
      ...todo,
      priority: finalScores[index] * 0.3 + todo.priority * 0.7, // Blend WebGPU ranking with original
    }));

    resultBuffer.unmap();

    // Cleanup
    adjacencyBuffer.destroy();
    scoresBuffer.destroy();
    newScoresBuffer.destroy();
    paramsBuffer.destroy();
    resultBuffer.destroy();

    return refinedTodos.sort((a, b) => b.priority - a.priority);
  }

  private calculateTodoSimilarity(todo1: IntelligentTodo, todo2: IntelligentTodo): number {
    let similarity = 0;

    // Category similarity
    if (todo1.category === todo2.category) similarity += 0.4;

    // Tag overlap
    const tags1 = new Set(todo1.tags);
    const tags2 = new Set(todo2.tags);
    const tagIntersection = new Set([...tags1].filter((x) => tags2.has(x)));
    const tagUnion = new Set([...tags1, ...tags2]);
    if (tagUnion.size > 0) {
      similarity += 0.3 * (tagIntersection.size / tagUnion.size);
    }

    // File overlap in related errors
    const files1 = new Set(todo1.related_errors.map((e: any) => e.file));
    const files2 = new Set(todo2.related_errors.map((e: any) => e.file));
    const fileIntersection = new Set([...files1].filter((x) => files2.has(x)));
    if (files1.size > 0 || files2.size > 0) {
      similarity += 0.3 * (fileIntersection.size / Math.max(files1.size, files2.size));
    }

    return Math.min(similarity, 1.0);
  }

  private generateCacheKey(input: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `som_analysis_${Math.abs(hash)}`;
  }

  private getLocalCachedTodos(key: string): IntelligentTodo[] | null {
    const cached = this.cacheCollection.findOne({ key });
    if (cached && Date.now() - cached.timestamp < 300000) {
      // 5 minutes
      return cached.result;
    }
    return null;
  }

  private cacheResult(key: string, result: IntelligentTodo[]): void {
    this.cacheCollection.removeWhere({ key });
    this.cacheCollection.insert({
      key,
      result,
      timestamp: Date.now(),
    });
  }

  private async persistTodos(todos: IntelligentTodo[]): Promise<void> {
    if (!this.indexDB) return;

    const transaction = this.indexDB.transaction(['todos'], 'readwrite');
    const store = transaction.objectStore('todos');

    for (const todo of todos) {
      await store.put(todo);
    }

    // Also update LokiJS
    todos.forEach((todo) => {
      this.todosCollection.removeWhere({ id: todo.id });
      this.todosCollection.insert(todo);
    });
  }

  async getTodosByPriority(minPriority = 0): Promise<IntelligentTodo[]> {
    return (
      this.todosCollection.find({ priority: { $gte: minPriority } }) as IntelligentTodo[]
    ).sort((todo: IntelligentTodo) => -todo.priority);
  }

  async getTodosByCategory(category: string): Promise<IntelligentTodo[]> {
    return (this.todosCollection.find({ category }) as IntelligentTodo[]).sort(
      (todo: IntelligentTodo) => -todo.priority
    );
  }

  async clearCache(): Promise<void> {
    this.cacheCollection.removeDataOnly();

    if (this.indexDB) {
      const transaction = this.indexDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.clear();
    }

    // Clear Redis cache keys if connected
    if (this.redisConnected && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${this.redisConfig.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.error('Failed to clear Redis cache:', error);
      }
    }
  }

  /**
   * Initialize Redis connection for distributed caching
   */
  async initializeRedis(config?: Partial<typeof this.redisConfig>): Promise<boolean> {
    try {
      if (config) {
        this.redisConfig = { ...this.redisConfig, ...config };
      }

      // Use Redis client via fetch API for browser compatibility
      const testConnection = await fetch('/api/cache/redis/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.redisConfig),
      });

      if (testConnection.ok) {
        this.redisConnected = true;
        this.startRedisSync();
        console.log('✅ Redis SOM cache connection established');
        return true;
      } else {
        console.warn('⚠️ Redis connection failed, continuing with local cache only');
        return false;
      }
    } catch (error) {
      console.error('❌ Redis initialization error:', error);
      this.redisConnected = false;
      return false;
    }
  }

  /**
   * Start Redis sync timer
   */
  private startRedisSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncWithRedis().catch((error) => console.error('Redis sync error:', error));
    }, this.redisConfig.syncInterval);
  }

  /**
   * Sync local SOM cache with Redis distributed cache
   */
  async syncWithRedis(): Promise<void> {
    if (!this.redisConnected) return;

    try {
      // Get local cache entries that need to be synced
      const localEntries = this.cacheCollection.find({
        timestamp: { $gte: Date.now() - this.redisConfig.syncInterval },
      });

      // Sync recent entries to Redis
      for (const entry of localEntries) {
        const redisKey = `${this.redisConfig.keyPrefix}${entry.key}`;

        await fetch('/api/cache/redis/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: redisKey,
            value: entry.value,
            ttl: 3600, // 1 hour
          }),
        });
      }

      // Get recent updates from Redis
      const redisUpdates = await fetch('/api/cache/redis/get-recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: this.redisConfig.keyPrefix,
          since: Date.now() - this.redisConfig.syncInterval,
        }),
      });

      if (redisUpdates.ok) {
        const updates = await redisUpdates.json();

        // Update local cache with Redis data
        for (const update of updates.entries) {
          const localKey = update.key.replace(this.redisConfig.keyPrefix, '');

          // Update local cache
          this.cacheCollection.removeWhere({ key: localKey });
          this.cacheCollection.insert({
            key: localKey,
            value: update.value,
            timestamp: Date.now(),
            source: 'redis',
          });
        }
      }
    } catch (error) {
      console.error('Redis sync failed:', error);
    }
  }

  /**
   * Store result with Redis distribution
   */
  async storeResult(
    key: string,
    data: any,
    options?: {
      ttl?: number;
      priority?: number;
      distributeToRedis?: boolean;
    }
  ): Promise<void> {
    const opts = { ttl: 3600, priority: 5, distributeToRedis: true, ...options };

    // Store locally
    this.cacheCollection.removeWhere({ key });
    this.cacheCollection.insert({
      key,
      value: data,
      timestamp: Date.now(),
      priority: opts.priority,
      ttl: opts.ttl,
      source: 'local',
    });

    // Distribute to Redis if connected and requested
    if (this.redisConnected && opts.distributeToRedis) {
      try {
        const redisKey = `${this.redisConfig.keyPrefix}${key}`;

        await fetch('/api/cache/redis/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: redisKey,
            value: data,
            ttl: opts.ttl,
          }),
        });
      } catch (error) {
        console.error('Failed to distribute to Redis:', error);
      }
    }
  }

  /**
   * Get cached result from local or Redis
   */
  async getCachedResult(key: string): Promise<any | null> {
    // Check local cache first
    const localResult = this.cacheCollection.findOne({ key });
    if (localResult && localResult.timestamp > Date.now() - localResult.ttl * 1000) {
      return localResult.value;
    }

    // Check Redis if connected
    if (this.redisConnected) {
      try {
        const redisKey = `${this.redisConfig.keyPrefix}${key}`;

        const response = await fetch('/api/cache/redis/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: redisKey }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.value) {
            // Store in local cache for faster future access
            this.cacheCollection.removeWhere({ key });
            this.cacheCollection.insert({
              key,
              value: result.value,
              timestamp: Date.now(),
              source: 'redis',
            });

            return result.value;
          }
        }
      } catch (error) {
        console.error('Redis get failed:', error);
      }
    }

    return null;
  }

  /**
   * Precompute embeddings for cache warming
   */
  async precomputeEmbeddings(payload: any): Promise<void> {
    try {
      const { errorMessages, batchSize = 10 } = payload;

      if (!errorMessages || !Array.isArray(errorMessages)) {
        return;
      }

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < errorMessages.length; i += batchSize) {
        const batch = errorMessages.slice(i, i + batchSize);

        for (const errorMessage of batch) {
          const embeddingKey = `embedding:${this.hashString(errorMessage)}`;

          // Check if already cached
          const cached = await this.getCachedResult(embeddingKey);
          if (!cached) {
            // Generate embedding using WebGPU if available
            const embeddings = await this.computeErrorEmbeddingsGPU([
              {
                message: errorMessage,
                file: '',
                line: 0,
                severity: 'medium' as const,
                category: 'cache',
                type: 'webgpu-cache-error',
                timestamp: new Date().toISOString()
              } satisfies NPMError,
            ]);
            const embedding = embeddings[0];
            await this.storeResult(embeddingKey, embedding, {
              ttl: 7200, // 2 hours
              priority: 3,
              distributeToRedis: true,
            });
          }
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Precompute embeddings failed:', error);
    }
  }

  /**
   * Train SOM in background
   */
  async trainInBackground(): Promise<void> {
    try {
      // Get recent error data for training
      const recentErrors = this.errorsCollection.find({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      });

      if (recentErrors.length < 10) {
        console.log('Insufficient data for SOM training');
        return;
      }

      // Extract features for SOM training
      const trainingData = recentErrors.map((error: any) => ({
        features: [
          error.severity === 'critical' ? 1.0 : error.severity === 'high' ? 0.7 : 0.3,
          error.message.length / 1000, // Normalized message length
          error.dependencies?.length || 0,
          this.hashString(error.category) / 1000000, // Normalized category hash
        ],
        metadata: { id: error.id, category: error.category },
      }));

      // Train SOM (simplified implementation)
      const somResult = await this.trainSOM(trainingData);

      // Store SOM model in cache
      await this.storeResult('som:model:latest', somResult, {
        ttl: 86400, // 24 hours
        priority: 10,
        distributeToRedis: true,
      });

      console.log('🧠 SOM background training completed');
    } catch (error) {
      console.error('SOM background training failed:', error);
    }
  }

  /**
   * Simplified SOM training implementation
   */
  private async trainSOM(trainingData: any[]): Promise<any> {
    // This is a simplified implementation
    // In a real system, you would use a proper SOM algorithm
    const clusters: Record<string, any[]> = {};

    for (const data of trainingData) {
      const key = data.features.map((f: number) => Math.round(f * 10)).join(',');
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push(data.metadata);
    }

    return {
      clusters,
      trainingCount: trainingData.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Find similar vectors in the SOM cache using cosine similarity
   */
  async findSimilar(queryVector: number[], threshold = 0.8): Promise<any[]> {
    try {
      // Get all vectors from cache
      const allVectors = this.cacheCollection.find({
        type: 'vector',
        timestamp: { $gte: Date.now() - 24 * 60 * 60 * 1000 }, // Last 24 hours
      });

      if (!allVectors || allVectors.length === 0) {
        return [];
      }

      // Use WebGPU for similarity computation if available
      if (this.device) {
        return await this.computeSimilarityGPU(queryVector, allVectors, threshold);
      } else {
        // Fallback to CPU computation
        return this.computeSimilarityCPU(queryVector, allVectors, threshold);
      }
    } catch (error) {
      console.error('Find similar failed:', error);
      return [];
    }
  }

  /**
   * Update SOM with weighted pattern learning
   */
  async updateWithWeight(
    id: string,
    vector: number[],
    metadata: any,
    weight: number = 1.0
  ): Promise<void> {
    try {
      const now = Date.now();
      const vectorData = {
        id,
        type: 'vector',
        vector,
        metadata,
        weight,
        timestamp: now,
        lastUpdated: now,
        updateCount: 1,
      };

      // Check if vector already exists
      const existing = this.cacheCollection.findOne({ id, type: 'vector' });
      if (existing) {
        // Update existing with weighted average
        const totalWeight = existing.weight + weight;
        const existingWeight = existing.weight / totalWeight;
        const newWeight = weight / totalWeight;

        // Weighted average of vectors
        vectorData.vector = existing.vector.map(
          (val: number, idx: number) => val * existingWeight + vector[idx] * newWeight
        );
        vectorData.weight = totalWeight;
        vectorData.updateCount = existing.updateCount + 1;

        this.cacheCollection.update({ ...existing, ...vectorData });
      } else {
        // Insert new vector
        this.cacheCollection.insert(vectorData);
      }

      // Store in Redis if connected
      if (this.redisConnected) {
        await this.storeResult(`vector:${id}`, vectorData, {
          ttl: 86400, // 24 hours
          distributeToRedis: true,
        });
      }
    } catch (error) {
      console.error('Update with weight failed:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): {
    totalVectors: number;
    totalQueries: number;
    cacheHitRate: number;
    avgSimilarity: number;
    memoryUsage: number;
    gpuEnabled: boolean;
    redisConnected: boolean;
  } {
    try {
      const vectors = this.cacheCollection.find({ type: 'vector' });
      const queries = this.cacheCollection.find({ type: 'query' });
      const cacheHits = queries.filter((q: any) => q.cacheHit).length;

      // Calculate average similarity from recent queries
      const similarities = queries
        .filter((q: any) => q.similarity !== undefined)
        .map((q: any) => q.similarity);
      const avgSimilarity =
        similarities.length > 0
          ? similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length
          : 0;

      // Estimate memory usage
      const memoryUsage = vectors.reduce((total: number, v: any) => {
        return total + (v.vector?.length || 0) * 8; // 8 bytes per float64
      }, 0);

      return {
        totalVectors: vectors.length,
        totalQueries: queries.length,
        cacheHitRate: queries.length > 0 ? cacheHits / queries.length : 0,
        avgSimilarity,
        memoryUsage,
        gpuEnabled: this.device !== null,
        redisConnected: this.redisConnected,
      };
    } catch (error) {
      console.error('Get stats failed:', error);
      return {
        totalVectors: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        avgSimilarity: 0,
        memoryUsage: 0,
        gpuEnabled: false,
        redisConnected: false,
      };
    }
  }

  /**
   * Store a vector with metadata in the cache
   */
  async storeVector(id: string, vector: number[], metadata: any): Promise<void> {
    try {
      const vectorData = {
        id,
        type: 'vector',
        vector,
        metadata,
        timestamp: Date.now(),
        weight: 1.0,
        updateCount: 1,
      };

      // Remove existing vector with same ID
      this.cacheCollection.removeWhere({ id, type: 'vector' });

      // Insert new vector
      this.cacheCollection.insert(vectorData);

      // Store in Redis if connected
      if (this.redisConnected) {
        await this.storeResult(`vector:${id}`, vectorData, {
          ttl: 86400, // 24 hours
          distributeToRedis: true,
        });
      }
    } catch (error) {
      console.error('Store vector failed:', error);
    }
  }

  /**
   * GPU-accelerated similarity computation using WebGPU
   */
  private async computeSimilarityGPU(
    queryVector: number[],
    allVectors: any[],
    threshold: number
  ): Promise<any[]> {
    try {
      if (!this.device) return [];

      const vectorDim = queryVector.length;
      const numVectors = allVectors.length;

      // Create buffers for GPU computation
      const queryBuffer = this.device.createBuffer({
        size: vectorDim * 4, // 4 bytes per float32
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const vectorsBuffer = this.device.createBuffer({
        size: numVectors * vectorDim * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const similaritiesBuffer = this.device.createBuffer({
        size: numVectors * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const metadataBuffer = this.device.createBuffer({
        size: 16, // 4 u32 values
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Write data to buffers
      this.device.queue.writeBuffer(queryBuffer, 0, new Float32Array(queryVector));

      const vectorsData = new Float32Array(numVectors * vectorDim);
      allVectors.forEach((v, i) => {
        const vector = v.vector || [];
        for (let j = 0; j < vectorDim; j++) {
          vectorsData[i * vectorDim + j] = vector[j] || 0;
        }
      });
      this.device.queue.writeBuffer(vectorsBuffer, 0, vectorsData);

      const metadataData = new Uint32Array([vectorDim, numVectors, 0, 0]);
      this.device.queue.writeBuffer(metadataBuffer, 0, metadataData);

      // Create compute pipeline and run
      const shaderModule = this.device.createShaderModule({ code: this.similarityShader });
      const computePipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'compute_similarity' },
      });

      const bindGroup = this.device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: queryBuffer } },
          { binding: 1, resource: { buffer: vectorsBuffer } },
          { binding: 2, resource: { buffer: similaritiesBuffer } },
          { binding: 3, resource: { buffer: metadataBuffer } },
        ],
      });

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(numVectors / 64));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      // Read results
      const resultBuffer = this.device.createBuffer({
        size: numVectors * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(similaritiesBuffer, 0, resultBuffer, 0, numVectors * 4);
      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const similarities = new Float32Array(resultBuffer.getMappedRange());

      // Filter by threshold and return results
      const results: any[] = [];
      for (let i = 0; i < numVectors; i++) {
        if (similarities[i] >= threshold) {
          results.push({
            ...allVectors[i],
            similarity: similarities[i],
          });
        }
      }

      // Clean up
      resultBuffer.unmap();
      queryBuffer.destroy();
      vectorsBuffer.destroy();
      similaritiesBuffer.destroy();
      metadataBuffer.destroy();
      resultBuffer.destroy();

      return results.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('GPU similarity computation failed:', error);
      return this.computeSimilarityCPU(queryVector, allVectors, threshold);
    }
  }

  /**
   * CPU fallback for similarity computation
   */
  private computeSimilarityCPU(queryVector: number[], allVectors: any[], threshold: number): any[] {
    const results: any[] = [];

    for (const vectorData of allVectors) {
      const vector = vectorData.vector;
      if (!vector || vector.length !== queryVector.length) continue;

      // Compute cosine similarity
      let dotProduct = 0;
      let queryNorm = 0;
      let vectorNorm = 0;

      for (let i = 0; i < queryVector.length; i++) {
        dotProduct += queryVector[i] * vector[i];
        queryNorm += queryVector[i] * queryVector[i];
        vectorNorm += vector[i] * vector[i];
      }

      const similarity = dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(vectorNorm));

      if (similarity >= threshold) {
        results.push({
          ...vectorData,
          similarity,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Legal document processing methods
   */
  async processLegalDocument(documentText: string, metadata: any): Promise<Float32Array> {
    try {
      if (!this.device) {
        return this.computeLegalEmbeddingCPU(documentText, metadata);
      }

      const textBuffer = new TextEncoder().encode(documentText);
      const embeddingDim = 768; // Standard legal embedding dimension

      // Create buffers
      const textDataBuffer = this.device.createBuffer({
        size: textBuffer.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const embeddingBuffer = this.device.createBuffer({
        size: embeddingDim * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const configBuffer = this.device.createBuffer({
        size: 32, // 8 u32 values
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Write data
      this.device.queue.writeBuffer(textDataBuffer, 0, textBuffer);
      
      const config = new Uint32Array([
        textBuffer.length, 
        embeddingDim, 
        metadata.legalWeight || 150, // Boost legal terms by 50%
        metadata.caseWeight || 120,  // Boost case refs by 20%
        0, 0, 0, 0
      ]);
      this.device.queue.writeBuffer(configBuffer, 0, config);

      // Create and run compute pipeline
      const shaderModule = this.device.createShaderModule({ 
        code: this.legalDocumentEmbeddingShader 
      });
      const pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'compute_legal_embedding' },
      });

      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: textDataBuffer } },
          { binding: 1, resource: { buffer: embeddingBuffer } },
          { binding: 2, resource: { buffer: configBuffer } },
        ],
      });

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(embeddingDim / 64));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      // Read results
      const resultBuffer = this.device.createBuffer({
        size: embeddingDim * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(embeddingBuffer, 0, resultBuffer, 0, embeddingDim * 4);
      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const embedding = new Float32Array(resultBuffer.getMappedRange());
      const result = new Float32Array(embedding);

      // Clean up
      resultBuffer.unmap();
      textDataBuffer.destroy();
      embeddingBuffer.destroy();
      configBuffer.destroy();
      resultBuffer.destroy();

      return result;
    } catch (error) {
      console.error('Legal document processing failed:', error);
      return this.computeLegalEmbeddingCPU(documentText, metadata);
    }
  }

  async searchLegalDocuments(
    queryEmbedding: Float32Array, 
    documentEmbeddings: Float32Array[], 
    metadata: any[]
  ): Promise<Array<{similarity: number, index: number, metadata: any}>> {
    try {
      if (!this.device || documentEmbeddings.length === 0) {
        return this.searchLegalDocumentsCPU(queryEmbedding, documentEmbeddings, metadata);
      }

      const vectorDim = queryEmbedding.length;
      const numDocs = documentEmbeddings.length;

      // Create buffers
      const queryBuffer = this.device.createBuffer({
        size: vectorDim * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const docsBuffer = this.device.createBuffer({
        size: numDocs * vectorDim * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const metadataBuffer = this.device.createBuffer({
        size: numDocs * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const similaritiesBuffer = this.device.createBuffer({
        size: numDocs * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const configBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Write data
      this.device.queue.writeBuffer(queryBuffer, 0, queryEmbedding);

      const docsData = new Float32Array(numDocs * vectorDim);
      documentEmbeddings.forEach((doc, i) => {
        for (let j = 0; j < vectorDim; j++) {
          docsData[i * vectorDim + j] = doc[j] || 0;
        }
      });
      this.device.queue.writeBuffer(docsBuffer, 0, docsData);

      const metadataArray = new Uint32Array(numDocs);
      metadata.forEach((meta, i) => {
        let encoded = 0;
        if (meta.docType === 'contract') encoded |= 1;
        else if (meta.docType === 'caselaw') encoded |= 2;
        if (meta.jurisdiction === 'federal') encoded |= (1 << 8);
        metadataArray[i] = encoded;
      });
      this.device.queue.writeBuffer(metadataBuffer, 0, metadataArray);

      const config = new Uint32Array([vectorDim, numDocs, 130, 120, 0, 0, 0, 0]); // Boost values
      this.device.queue.writeBuffer(configBuffer, 0, config);

      // Run compute
      const shaderModule = this.device.createShaderModule({ 
        code: this.legalSimilarityShader 
      });
      const pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'compute_legal_similarity' },
      });

      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: queryBuffer } },
          { binding: 1, resource: { buffer: docsBuffer } },
          { binding: 2, resource: { buffer: metadataBuffer } },
          { binding: 3, resource: { buffer: similaritiesBuffer } },
          { binding: 4, resource: { buffer: configBuffer } },
        ],
      });

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(numDocs / 64));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      // Read results
      const resultBuffer = this.device.createBuffer({
        size: numDocs * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(similaritiesBuffer, 0, resultBuffer, 0, numDocs * 4);
      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const similarities = new Float32Array(resultBuffer.getMappedRange());

      const results = Array.from(similarities)
        .map((similarity, index) => ({ similarity, index, metadata: metadata[index] }))
        .filter(result => result.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity);

      // Clean up
      resultBuffer.unmap();
      queryBuffer.destroy();
      docsBuffer.destroy();
      metadataBuffer.destroy();
      similaritiesBuffer.destroy();
      configBuffer.destroy();
      resultBuffer.destroy();

      return results;
    } catch (error) {
      console.error('Legal document search failed:', error);
      return this.searchLegalDocumentsCPU(queryEmbedding, documentEmbeddings, metadata);
    }
  }

  async quantizeVectors(vectors: Float32Array[]): Promise<Int8Array[]> {
    try {
      if (!this.device || vectors.length === 0) {
        return this.quantizeVectorsCPU(vectors);
      }

      const vectorCount = vectors.length;
      const vectorDim = vectors[0].length;
      const totalElements = vectorCount * vectorDim;

      // Create buffers
      const inputBuffer = this.device.createBuffer({
        size: totalElements * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const outputBuffer = this.device.createBuffer({
        size: totalElements * 4, // Use 4 bytes for i32 output
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const paramsBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Flatten input vectors and calculate scale/offset
      const inputData = new Float32Array(totalElements);
      let min = Infinity, max = -Infinity;
      
      vectors.forEach((vector, i) => {
        for (let j = 0; j < vectorDim; j++) {
          const val = vector[j];
          inputData[i * vectorDim + j] = val;
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
      });

      const scale = 255 / (max - min);
      const offset = -min;

      this.device.queue.writeBuffer(inputBuffer, 0, inputData);
      this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([
        vectorCount, vectorDim, scale, offset, 0, 0, 0, 0
      ]));

      // Run quantization
      const shaderModule = this.device.createShaderModule({ 
        code: this.vectorQuantizationShader 
      });
      const pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'quantize_vectors' },
      });

      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: inputBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
          { binding: 2, resource: { buffer: paramsBuffer } },
        ],
      });

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(totalElements / 64));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      // Read results
      const resultBuffer = this.device.createBuffer({
        size: totalElements * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(outputBuffer, 0, resultBuffer, 0, totalElements * 4);
      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const quantizedData = new Int32Array(resultBuffer.getMappedRange());

      // Convert to Int8Array per vector
      const results: Int8Array[] = [];
      for (let i = 0; i < vectorCount; i++) {
        const quantizedVector = new Int8Array(vectorDim);
        for (let j = 0; j < vectorDim; j++) {
          quantizedVector[j] = quantizedData[i * vectorDim + j];
        }
        results.push(quantizedVector);
      }

      // Clean up
      resultBuffer.unmap();
      inputBuffer.destroy();
      outputBuffer.destroy();
      paramsBuffer.destroy();
      resultBuffer.destroy();

      return results;
    } catch (error) {
      console.error('Vector quantization failed:', error);
      return this.quantizeVectorsCPU(vectors);
    }
  }

  // CPU fallback methods
  private computeLegalEmbeddingCPU(text: string, metadata: any): Float32Array {
    const embedding = new Float32Array(768);
    const textBytes = new TextEncoder().encode(text);
    
    for (let i = 0; i < 768; i++) {
      let value = 0;
      for (let j = 0; j < textBytes.length; j++) {
        const hash = (textBytes[j] * 23 + j * 47) % 768;
        if (hash === i) {
          value += textBytes[j] / 255.0;
        }
      }
      embedding[i] = Math.tanh(value * 0.7);
    }
    
    return embedding;
  }

  private searchLegalDocumentsCPU(
    query: Float32Array, 
    docs: Float32Array[], 
    metadata: any[]
  ): Array<{similarity: number, index: number, metadata: any}> {
    return docs.map((doc, index) => {
      let dotProduct = 0, queryNorm = 0, docNorm = 0;
      
      for (let i = 0; i < query.length; i++) {
        dotProduct += query[i] * doc[i];
        queryNorm += query[i] * query[i];
        docNorm += doc[i] * doc[i];
      }
      
      const similarity = dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(docNorm));
      return { similarity, index, metadata: metadata[index] };
    })
    .filter(result => result.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity);
  }

  private quantizeVectorsCPU(vectors: Float32Array[]): Int8Array[] {
    return vectors.map(vector => {
      const min = Math.min(...vector);
      const max = Math.max(...vector);
      const scale = 255 / (max - min);
      
      return new Int8Array(vector.map(val => 
        Math.round((val - min) * scale) - 128
      ));
    });
  }

  dispose(): void {
    this.lokiDB.close();
    if (this.indexDB) {
      this.indexDB.close();
    }

    // Clean up Redis sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.redisConnected = false;
    this.redisClient = null;
  }
}

// Usage example
export async function initializeSOMCache(): Promise<WebGPUSOMCache> {
  const cache = new WebGPUSOMCache();

  const webGPUEnabled = await cache.initializeWebGPU();
  const indexDBEnabled = await cache.initializeIndexDB();
  const redisEnabled = await cache.initializeRedis();

  console.log(`🧠 SOM Cache initialized - WebGPU: ${webGPUEnabled}, IndexDB: ${indexDBEnabled}, Redis: ${redisEnabled}`);

  return cache;
}

// Export singleton instance for service worker
export const somWebGPUCache = new WebGPUSOMCache();
