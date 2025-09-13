import { EventEmitter } from "events";
/**
 * Enhanced Ollama Service - Intelligent Multi-Model Coordination
 * Supports Gemma variants, and CUDA-optimized switching
 * Features: Auto-switching, predictive loading, self-prompting intelligence
 */

import { OLLAMA_CONFIG, getModelConfig, getOptimalModel, selectBestAvailableModel, isLegalTask } from './ollama-config';
import { getOptimalEmbeddingModel, getEmbeddingModelConfig } from '../../ai/embedding-config';
import type {
  OllamaGenerateRequest,
  OllamaResponse,
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
  DocumentChunk,
  LegalDocument,
  AnalysisResult,
  UserQuery
} from './types';

// Import the intelligent orchestrator
import type {
  IntelligentModelOrchestrator,
  UserIntent,
  ModelVariant,
  SelfPromptingSuggestion
} from '../../ai/intelligent-model-orchestrator';

interface ModelPerformanceMetrics {
  modelId: string;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  memoryUsage: number;
  lastUsed: Date;
  totalRequests: number;
}

interface SmartModelSelection {
  selectedModel: string;
  confidence: number;
  reasoning: string[];
  alternatives: string[];
  estimatedLatency: number;
  preloadRecommendations: string[];
}

interface UserContextData {
  sessionId: string;
  queryHistory: string[];
  preferredModels: Map<string, number>; // Model ID -> preference score
  expertiseLevel: 'novice' | 'intermediate' | 'expert';
  taskPatterns: Map<string, number>; // Task type -> frequency
  timePreferences: Map<number, string[]>; // Hour -> preferred models
  lastActivity: Date;
}

class EnhancedOllamaService extends EventEmitter {
  private baseUrl: string;
  private cache: Map<string, any> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private availableModels: string[] = [];
  private modelCheckInterval: NodeJS.Timeout | null = null;

  // Enhanced model management
  private modelPerformance: Map<string, ModelPerformanceMetrics> = new Map();
  private userContexts: Map<string, UserContextData> = new Map();
  private preloadedModels: Set<string> = new Set();
  private modelSwitchHistory: Array<{
    from: string;
    to: string;
    reason: string;
    timestamp: Date;
    latency: number;
    success: boolean;
  }> = [];

  // Intelligent model variants support
  private modelVariants: Map<string, ModelVariant> = new Map();
  private activeModelStack: string[] = []; // Stack of active models for quick switching
  private predictivePreloader: NodeJS.Timeout | null = null;
  private intelligentOrchestrator: IntelligentModelOrchestrator | null = null;

  constructor() {
    super();
    this.baseUrl = OLLAMA_CONFIG.baseUrl;
    this.startQueueProcessor();
    this.startModelMonitor();
    this.initializeIntelligentFeatures();
  }

  /**
   * Initialize intelligent features and model variants
   */
  private async initializeIntelligentFeatures() {
    try {
      // Initialize model variants registry
      await this.initializeModelVariants();

      // Start predictive preloading
      this.startPredictivePreloader();

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Try to connect to intelligent orchestrator if available
      if (typeof window !== 'undefined') {
        try {
          const { intelligentOrchestrator } = await import(
            '../../ai/intelligent-model-orchestrator'
          );
          this.intelligentOrchestrator = intelligentOrchestrator;
          console.log('✅ Connected to Intelligent Model Orchestrator');
        } catch (error) {
          console.log('ℹ️ Intelligent orchestrator not available in this environment');
        }
      }

      this.emit('intelligent-features-ready');
    } catch (error) {
      console.error('Failed to initialize intelligent features:', error);
    }
  }

  /**
   * Initialize model variants registry
   */
  private async initializeModelVariants() {
    // Define model variants with their capabilities
    const variants: Array<Omit<ModelVariant, 'isLoaded'>> = [
      {
        id: 'gemma-270m-fast',
        name: 'Gemma 270M Fast',
        type: 'gemma-270m',
        targetLatency: 150,
        memoryFootprint: 512,
        capabilities: ['chat', 'qa', 'clarification', 'simple-tasks'],
        contextWindow: 2048,
        warmupTime: 50,
      },
      {
        id: 'gemma-270m-context',
        name: 'Gemma 270M Context',
        type: 'gemma-270m',
        targetLatency: 200,
        memoryFootprint: 768,
        capabilities: ['context-analysis', 'user-intent', 'session-memory'],
        contextWindow: 4096,
        warmupTime: 75,
      },
      {
        id: 'gemma3:legal-latest',
        name: 'Gemma 3 Legal Optimized',
        type: 'gemma3-legal',
        targetLatency: 250,
        memoryFootprint: 640,
        capabilities: ['legal-research', 'legal-analysis', 'document-review'],
        contextWindow: 4096,
        warmupTime: 100,
      },
      {
        id: 'legal-bert-onnx',
        name: 'Legal-BERT ONNX Optimized',
        type: 'legal-bert',
        targetLatency: 50,
        memoryFootprint: 128,
        capabilities: [
          'legal-entity-extraction',
          'case-classification',
          'legal-search',
          'ner',
          'embeddings',
        ],
        contextWindow: 512,
        warmupTime: 15,
      },
    ];

    for (const variant of variants) {
      // Check if this model is actually available via Ollama
      const isAvailable = await this.checkModelAvailability(variant.id);

      this.modelVariants.set(variant.id, {
        ...variant,
        isLoaded: isAvailable,
      });

      // Initialize performance metrics
      if (!this.modelPerformance.has(variant.id)) {
        this.modelPerformance.set(variant.id, {
          modelId: variant.id,
          averageLatency: variant.targetLatency,
          successRate: 0.85, // Default
          errorRate: 0.05,
          memoryUsage: variant.memoryFootprint,
          lastUsed: new Date(),
          totalRequests: 0,
        });
      }
    }

    console.log(`✅ Initialized ${this.modelVariants.size} model variants`);
  }

  /**
   * Check if a specific model is available via Ollama
   */
  private async checkModelAvailability(modelId: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return (
        models.models?.some(
          (m: any) =>
            m.name === modelId ||
            m.name.toLowerCase().includes(modelId.toLowerCase()) ||
            this.matchModelName(m.name, modelId)
        ) || false
      );
    } catch {
      return false;
    }
  }

  /**
   * Match model names with various naming conventions
   */
  private matchModelName(availableName: string, targetId: string): boolean {
    const available = availableName.toLowerCase().replace(/[:-]/g, '');
    const target = targetId.toLowerCase().replace(/[:-]/g, '');

    // Check for partial matches
    return available.includes(target) || target.includes(available);
  }

  /**
   * Start predictive preloading based on user patterns
   */
  private startPredictivePreloader() {
    this.predictivePreloader = setInterval(async () => {
      try {
        await this.performPredictivePreloading();
      } catch (error) {
        console.error('Predictive preloading failed:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring() {
    // Monitor model performance and update metrics
    this.on('request-complete', (data) => {
      this.updatePerformanceMetrics(data);
    });

    this.on('model-switch', (data) => {
      this.recordModelSwitch(data);
    });

    this.on('error', (data) => {
      this.recordModelError(data);
    });
  }

  /**
   * Start monitoring available models
   */
  private startModelMonitor() {
    // Check models immediately
    this.updateAvailableModels();

    // Then check every 30 seconds
    this.modelCheckInterval = setInterval(() => {
      this.updateAvailableModels();
    }, 30000);
  }

  /**
   * Update list of available models
   */
  private async updateAvailableModels() {
    try {
      const models = await this.listModels();
      this.availableModels = models.models?.map((m: any) => m.name) || [];
      this.emit('models-updated', this.availableModels);
    } catch (error: any) {
      console.error('Failed to update model list:', error);
    }
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to list models');
      return await response.json();
    } catch (error: any) {
      console.error('Error listing models:', error);
      return { models: [] };
    }
  }

  /**
   * Check if gemma:legal (or any legacy alias) is available
   */
  async checkLegalModel(): Promise<boolean> {
    const { models } = await this.listModels();
    return models?.some(
      (m: any) =>
        m.name === 'gemma:legal' ||
        m.name === 'gemma3:legal-latest' ||
        m.name === 'gemma3:legal' ||
        m.name === 'gemma3-legal:latest' ||
        m.name === 'gemma3-legal' ||
        (m.name.includes('gemma') && m.name.includes('legal'))
    );
  }

  /**
   * Check if legal-bert-onnx is available
   */
  async checkLegalBert(): Promise<boolean> {
    const { models } = await this.listModels();
    return models?.some(
      (m: any) =>
        m.name === 'legal-bert-onnx' ||
        m.name === 'legal-bert' ||
        (m.name.includes('legal') && m.name.includes('bert'))
    );
  }

  /**
   * Select the best model for a task with intelligent fallback
   */
  private async selectModelForTask(
    task: 'generation' | 'legal-analysis' | 'embedding',
    prompt?: string
  ): Promise<string> {
    // Ensure we have current model list
    if (this.availableModels.length === 0) {
      await this.updateAvailableModels();
    }

    // Determine if this is a legal task
    const isLegal = prompt ? isLegalTask(prompt) : task === 'legal-analysis';

    // Get the appropriate fallback chain
    let preferredModels: string[];
    if (isLegal || task === 'legal-analysis') {
      preferredModels = getOptimalModel('legal-analysis');
    } else {
      preferredModels = getOptimalModel(task as any);
    }

    // Select the best available model
    const selectedModel = selectBestAvailableModel(preferredModels, this.availableModels);

    if (selectedModel) {
      this.emit('model-selected', { task, selected: selectedModel, isLegal });
      console.log(`Selected model: ${selectedModel} for ${task} (legal: ${isLegal})`);
      return selectedModel;
    }

    // If no models available, throw error
    throw new Error(
      `No suitable models available for ${task}. Preferred: ${preferredModels.join(', ')}`
    );
  }

  /**
   * Generate text with intelligent model selection
   */
  async generate(
    prompt: string,
    options: Partial<OllamaGenerateRequest> = {}
  ): Promise<OllamaResponse> {
    // Select the best model if not specified
    let modelName = options.model;
    if (!modelName) {
      try {
        modelName = await this.selectModelForTask('generation', prompt);
      } catch (error: any) {
        console.error('Model selection failed:', error);
        // Try with gemma:legal first (alias aware), then fallback to CPU-friendly gemma-270m-fast
        modelName = 'gemma:legal';
      }
    }

    const modelConfig = getModelConfig(modelName);

    // Check cache if enabled
    const cacheKey = this.getCacheKey('generate', prompt, { ...options, model: modelName });
    if (OLLAMA_CONFIG.performance.cacheEnabled && this.cache.has(cacheKey)) {
      this.emit('cache-hit', cacheKey);
      return this.cache.get(cacheKey);
    }

    const request: OllamaGenerateRequest = {
      model: modelName,
      prompt,
      system: options.system || modelConfig.systemPrompt,
      stream: options.stream ?? OLLAMA_CONFIG.streamEnabled,
      options: {
        ...modelConfig.options,
        ...options.options,
      },
    };

    // Queue the request if we're at capacity
    if (this.activeRequests >= OLLAMA_CONFIG.performance.parallelRequests) {
      return this.queueRequest(() => this.executeGenerate(request, cacheKey));
    }

    return this.executeGenerate(request, cacheKey);
  }

  /**
   * Execute generation request with fallback support
   */
  private async executeGenerate(
    request: OllamaGenerateRequest,
    cacheKey: string
  ): Promise<OllamaResponse> {
    this.activeRequests++;
    this.emit('request-start', { type: 'generate', model: request.model });

    // Try primary model first
    let lastError: Error | null = null;
    const fallbackChain = [request.model];

    // Add gemma:legal as primary fallback, include legacy alias after for compatibility
    if (request.model !== 'gemma:legal' && !fallbackChain.includes('gemma:legal')) {
      fallbackChain.push('gemma:legal');
    }
    if (!fallbackChain.includes('gemma3:legal-latest')) {
      fallbackChain.push('gemma3:legal-latest');
    }
    if (request.model !== 'gemma-270m-fast' && !fallbackChain.includes('gemma-270m-fast')) {
      fallbackChain.push('gemma-270m-fast'); // CPU fallback
    }
    if (request.model !== 'gemma-270m-context' && !fallbackChain.includes('gemma-270m-context')) {
      fallbackChain.push('gemma-270m-context'); // CPU fallback with context
    }
    if (request.model !== 'legal-bert-onnx' && !fallbackChain.includes('legal-bert-onnx')) {
      fallbackChain.push('legal-bert-onnx'); // ONNX-optimized Legal-BERT
    }

    for (const model of fallbackChain) {
      try {
        const modelConfig = getModelConfig(model);
        const fallbackRequest = {
          ...request,
          model,
          system: request.system || modelConfig.systemPrompt,
          options: {
            ...modelConfig.options,
            ...request.options,
          },
        };

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackRequest),
          signal: AbortSignal.timeout(OLLAMA_CONFIG.timeout),
        });

        if (!response.ok) {
          throw new Error(`Model ${model} failed: ${response.statusText}`);
        }

        let result: OllamaResponse;

        if (fallbackRequest.stream) {
          result = await this.handleStreamResponse(response);
        } else {
          result = await response.json();
        }

        // Add metadata about which model was used
        result.model = model;
        result.fallback_used = model !== request.model;
        result.models_tried = fallbackChain.slice(0, fallbackChain.indexOf(model) + 1);

        // Cache the result
        if (OLLAMA_CONFIG.performance.cacheEnabled) {
          this.cache.set(cacheKey, result);
          setTimeout(() => this.cache.delete(cacheKey), OLLAMA_CONFIG.performance.cacheTTL * 1000);
        }

        this.emit('request-complete', {
          type: 'generate',
          model,
          fallback: model !== request.model,
        });

        // Log if we used a fallback
        if (model !== request.model) {
          console.log(`Used fallback model: ${model} (original: ${request.model})`);
        }

        return result;
      } catch (error: any) {
        lastError = error as Error;
        console.error(`Model ${model} failed:`, error);

        // Continue to next model in fallback chain
        if (fallbackChain.indexOf(model) < fallbackChain.length - 1) {
          console.log(`Trying fallback model: ${fallbackChain[fallbackChain.indexOf(model) + 1]}`);
        }
      }
    }

    // All models failed
    this.emit('request-error', { type: 'generate', error: lastError });
    this.activeRequests--;
    throw new Error(`All models failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate embeddings with Gemma embeddings priority and fallback support
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    // Prioritize Gemma embeddings, fallback to configured models
    const embeddingModels = [
      'embeddinggemma:latest',
      'embeddinggemma',
      ...getOptimalModel('embedding'),
      'nomic-embed-text',
    ];

    // Remove duplicates while preserving order
    const uniqueModels = [...new Set(embeddingModels)];
    let lastError: Error | null = null;

    for (const model of uniqueModels) {
      // Check cache
      const cacheKey = this.getCacheKey('embedding', text, { model });
      if (OLLAMA_CONFIG.performance.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const request: OllamaEmbeddingRequest = {
        model,
        prompt: text,
      };

      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(OLLAMA_CONFIG.timeout),
        });

        if (!response.ok) {
          throw new Error(`Embedding generation failed with ${model}: ${response.statusText}`);
        }

        const result: OllamaEmbeddingResponse = await response.json();

        // Cache the embeddings
        if (OLLAMA_CONFIG.performance.cacheEnabled) {
          this.cache.set(cacheKey, result.embedding);
          setTimeout(() => this.cache.delete(cacheKey), OLLAMA_CONFIG.performance.cacheTTL * 1000);
        }

        return result.embedding;
      } catch (error: any) {
        lastError = error as Error;
        console.error(`Embedding model ${model} failed:`, error);
      }
    }

    throw new Error(`All embedding models failed. Last error: ${lastError?.message}`);
  }

  /**
   * Analyze legal document with intelligent model selection
   */
  async analyzeLegalDocument(document: LegalDocument): Promise<AnalysisResult> {
    // Always use legal-analysis task for documents
    const model = await this.selectModelForTask('legal-analysis', document.content);
    const prompt = this.buildLegalAnalysisPrompt(document);

    const response = await this.generate(prompt, {
      model,
      format: 'json',
      options: {
        temperature: 0.3, // Lower temperature for more consistent legal analysis
        top_p: 0.95,
        num_predict: 2048,
      },
    });

    try {
      const analysis = JSON.parse(response.response || '{}');
      return this.formatAnalysisResult(document.id, analysis, response.model);
    } catch (error: any) {
      console.error('Error parsing legal analysis:', error);

      // If parsing fails and we haven't tried legal-bert yet
      if (response.model !== 'legal-bert') {
        console.log('Retrying with legal-bert fallback...');
        const fallbackResponse = await this.generate(prompt, {
          model: 'legal-bert',
          format: 'json',
          options: { temperature: 0.3 },
        });

        const fallbackAnalysis = JSON.parse(fallbackResponse.response || '{}');
        return this.formatAnalysisResult(document.id, fallbackAnalysis, 'legal-bert');
      }

      throw new Error('Failed to parse legal analysis response');
    }
  }

  /**
   * Process user query with context-aware responses
   */
  async processQuery(query: UserQuery, relevantDocs: DocumentChunk[]): Promise<string> {
    const context = this.buildQueryContext(relevantDocs);
    const isLegal = isLegalTask(query.query);
    const model = await this.selectModelForTask(
      isLegal ? 'legal-analysis' : 'generation',
      query.query
    );

    const prompt = `
      Legal Query: ${query.query}

      Relevant Context:
      ${context}

      Please provide a comprehensive legal analysis addressing the query based on the provided context.
      Include relevant citations and legal precedents where applicable.
    `;

    const response = await this.generate(prompt, {
      model,
      options: {
        temperature: 0.5,
        num_predict: 1500,
      },
    });

    return response.response || 'Unable to generate response';
  }

  /**
   * Build legal analysis prompt
   */
  private buildLegalAnalysisPrompt(document: LegalDocument): string {
    return `
      Analyze the following legal document and provide a structured analysis in JSON format:

      Document Type: ${document.type}
      Title: ${document.title}
      Content: ${document.content.substring(0, 8000)} // Limit to context window

      Please provide:
      1. Executive summary (2-3 sentences)
      2. Key legal points (list of 3-5 main points)
      3. Identified entities (people, organizations, dates, locations, legal concepts)
      4. Overall sentiment assessment
      5. Risk factors if any
      6. Recommendations for action
      7. Relevant legal precedents or statutes (if applicable)

      Format the response as valid JSON.
    `;
  }

  /**
   * Build context from document chunks
   */
  private buildQueryContext(chunks: DocumentChunk[]): string {
    return chunks
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5) // Top 5 most relevant chunks
      .map(
        (chunk) => `
        Source: ${chunk.metadata.source}
        ${chunk.metadata.section ? `Section: ${chunk.metadata.section}` : ''}
        Content: ${chunk.content}
      `
      )
      .join('\n---\n');
  }

  /**
   * Format analysis result with model info
   */
  private formatAnalysisResult(
    documentId: string,
    analysis: any,
    modelUsed?: string
  ): AnalysisResult {
    return {
      documentId,
      summary: analysis.summary || '',
      keyPoints: analysis.keyPoints || [],
      entities: {
        people: analysis.entities?.people || [],
        organizations: analysis.entities?.organizations || [],
        dates: analysis.entities?.dates || [],
        locations: analysis.entities?.locations || [],
        legalConcepts: analysis.entities?.legalConcepts || [],
      },
      sentiment: analysis.sentiment || 'neutral',
      riskFactors: analysis.riskFactors || [],
      recommendations: analysis.recommendations || [],
      citations: analysis.citations || [],
      metadata: {
        modelUsed: modelUsed || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle streaming responses
   */
  private async handleStreamResponse(response: Response): Promise<OllamaResponse> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullResponse = '';
    let lastResponse: OllamaResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
            this.emit('stream-chunk', parsed.response);
          }
          lastResponse = parsed;
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    if (lastResponse) {
      lastResponse.response = fullResponse;
      return lastResponse;
    }

    throw new Error('No valid response received');
  }

  /**
   * Queue request for later execution
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error: any) {
          reject(error);
        }
      });
    });
  }

  /**
   * Process queued requests
   */
  private async startQueueProcessor() {
    setInterval(async () => {
      if (
        this.requestQueue.length > 0 &&
        this.activeRequests < OLLAMA_CONFIG.performance.parallelRequests
      ) {
        const request = this.requestQueue.shift();
        if (request) {
          request();
        }
      }
    }, 100);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, input: string, options: any): string {
    return `${type}:${Buffer.from(input).toString('base64').substring(0, 20)}:${JSON.stringify(options)}`;
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    const isAvailable = await this.isAvailable();
    const models = await this.listModels();
    const hasGemma = await this.checkLegalModel();
    const hasLegalBert = await this.checkLegalBert();

    return {
      ollamaAvailable: isAvailable,
      availableModels: this.availableModels,
      primaryModel: hasGemma ? 'gemma:legal' : 'not available',
      legalFallback: hasLegalBert ? 'legal-bert-onnx' : 'not available',
      cacheSize: this.cache.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      fallbackChain: {
        legal: getOptimalModel('legal-analysis'),
        general: getOptimalModel('generation'),
        embedding: getOptimalModel('embedding'),
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.modelCheckInterval) {
      clearInterval(this.modelCheckInterval);
    }
  }

  /**
   * Embed a document (wrapper for generateEmbedding with document)
   */
  async embedDocument(document: LegalDocument): Promise<number[]> {
    const embeddings = await this.generateEmbeddings(document.content);
    return Array.isArray(embeddings) ? embeddings : [];
  }

  /**
   * Analyze a document (alias for analyzeLegalDocument)
   */
  async analyzeDocument(document: LegalDocument): Promise<AnalysisResult> {
    return this.analyzeLegalDocument(document);
  }

  // =============================================================================
  // INTELLIGENT MODEL ORCHESTRATION METHODS
  // =============================================================================

  /**
   * Smart model selection with user context awareness
   */
  async smartModelSelection(
    query: string,
    userContext: Partial<UserContextData> = {},
    sessionId: string = 'default'
  ): Promise<SmartModelSelection> {
    const startTime = Date.now();

    try {
      // Analyze query characteristics
      const queryAnalysis = this.analyzeQueryCharacteristics(query);

      // Get or create user context
      const userCtx = this.getUserContext(sessionId, userContext);

      // Update user query history
      userCtx.queryHistory.push(query);
      if (userCtx.queryHistory.length > 50) {
        userCtx.queryHistory = userCtx.queryHistory.slice(-50); // Keep last 50 queries
      }
      userCtx.lastActivity = new Date();

      // Use intelligent orchestrator if available
      if (this.intelligentOrchestrator) {
        try {
          const orchestratorResult = await this.intelligentOrchestrator.processQuery(query, {
            sessionId,
            sessionLength: userCtx.queryHistory.length,
            totalSessions: this.userContexts.size,
            avgQueryComplexity: this.calculateAverageComplexity(userCtx),
          });

          return {
            selectedModel: orchestratorResult.selectedModel,
            confidence: 0.9,
            reasoning: ['Intelligent orchestrator selection'],
            alternatives: orchestratorResult.shouldPreload,
            estimatedLatency: orchestratorResult.estimatedLatency,
            preloadRecommendations: orchestratorResult.shouldPreload,
          };
        } catch (error) {
          console.warn('Orchestrator selection failed, falling back to local logic:', error);
        }
      }

      // Fallback to local intelligent selection
      const modelScores = new Map<string, number>();

      for (const [modelId, variant] of this.modelVariants.entries()) {
        if (!variant.isLoaded) continue;

        const score = this.calculateModelScore(variant, queryAnalysis, userCtx);
        modelScores.set(modelId, score);
      }

      // Sort by score
      const sortedModels = Array.from(modelScores.entries()).sort(([, a], [, b]) => b - a);

      if (sortedModels.length === 0) {
        throw new Error('No suitable models available');
      }

      const selectedModel = sortedModels[0][0];
      const alternatives = sortedModels.slice(1, 3).map(([id]) => id);

      // Generate preload recommendations
      const preloadRecommendations = this.generatePreloadRecommendations(
        queryAnalysis,
        userCtx,
        alternatives
      );

      // Update user preferences
      this.updateUserPreferences(userCtx, selectedModel, queryAnalysis);

      const result: SmartModelSelection = {
        selectedModel,
        confidence: sortedModels[0][1] / 100, // Normalize to 0-1
        reasoning: this.generateSelectionReasoning(selectedModel, queryAnalysis, userCtx),
        alternatives,
        estimatedLatency: this.estimateModelLatency(selectedModel, queryAnalysis),
        preloadRecommendations,
      };

      this.emit('smart-model-selected', {
        ...result,
        selectionTime: Date.now() - startTime,
        queryAnalysis,
        userContext: userCtx,
      });

      return result;
    } catch (error) {
      console.error('Smart model selection failed:', error);

      // Emergency fallback to fastest available model
      const fallbackModel = this.findFastestAvailableModel();

      return {
        selectedModel: fallbackModel,
        confidence: 0.3,
        reasoning: ['Emergency fallback due to selection error'],
        alternatives: [],
        estimatedLatency: 500,
        preloadRecommendations: [],
      };
    }
  }

  /**
   * Generate self-prompting suggestions
   */
  async generateSelfPromptingSuggestions(
    originalQuery: string,
    userContext: Partial<UserContextData> = {},
    sessionId: string = 'default'
  ): Promise<SelfPromptingSuggestion[]> {
    try {
      const userCtx = this.getUserContext(sessionId, userContext);
      const queryAnalysis = this.analyzeQueryCharacteristics(originalQuery);
      const suggestions: SelfPromptingSuggestion[] = [];

      // Clarification suggestions for ambiguous queries
      if (queryAnalysis.confidence < 0.6) {
        suggestions.push({
          id: `clarify-${Date.now()}`,
          suggestion: `Did you mean to ${this.generateClarificationSuggestion(originalQuery, queryAnalysis)}?`,
          confidence: 0.8,
          category: 'clarification',
          modelRecommendation: 'gemma-270m-fast',
          estimatedLatency: 150,
          contextRelevance: 0.9,
        });
      }

      // Expansion suggestions based on user history
      if (userCtx.queryHistory.length > 2) {
        const expansionSuggestion = this.generateExpansionSuggestion(
          originalQuery,
          userCtx.queryHistory.slice(-3),
          queryAnalysis
        );

        if (expansionSuggestion) {
          suggestions.push(expansionSuggestion);
        }
      }

      // Alternative approach suggestions
      const alternatives = this.generateAlternativeApproaches(originalQuery, queryAnalysis);
      suggestions.push(...alternatives);

      // Follow-up suggestions based on patterns
      const followUps = this.generateFollowUpSuggestions(userCtx, queryAnalysis);
      suggestions.push(...followUps);

      // Sort by confidence and relevance
      return suggestions
        .sort((a, b) => b.confidence * b.contextRelevance - a.confidence * a.contextRelevance)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to generate self-prompting suggestions:', error);
      return [];
    }
  }

  /**
   * Perform predictive preloading based on user patterns
   */
  private async performPredictivePreloading(): Promise<void> {
    try {
      const currentHour = new Date().getHours();
      const preloadCandidates: string[] = [];

      // Analyze user patterns by time of day
      for (const userCtx of this.userContexts.values()) {
        const hourlyPreferences = userCtx.timePreferences.get(currentHour) || [];
        preloadCandidates.push(...hourlyPreferences);
      }

      // Add models based on recent switch patterns
      const recentSwitches = this.modelSwitchHistory
        .filter((s) => Date.now() - s.timestamp.getTime() < 3600000) // Last hour
        .map((s) => s.to);

      preloadCandidates.push(...recentSwitches);

      // Remove duplicates and already loaded models
      const uniqueCandidates = [...new Set(preloadCandidates)].filter(
        (modelId) => !this.preloadedModels.has(modelId) && this.modelVariants.has(modelId)
      );

      // Preload top 2 candidates
      const toPreload = uniqueCandidates.slice(0, 2);

      for (const modelId of toPreload) {
        try {
          await this.preloadModel(modelId);
          this.preloadedModels.add(modelId);
          console.log(`📋 Predictively preloaded: ${modelId}`);
        } catch (error) {
          console.warn(`Failed to preload ${modelId}:`, error);
        }
      }
    } catch (error) {
      console.error('Predictive preloading failed:', error);
    }
  }

  /**
   * Update performance metrics based on request completion
   */
  private updatePerformanceMetrics(data: any): void {
    try {
      const { modelId, latency, success, error } = data;

      if (!this.modelPerformance.has(modelId)) {
        return;
      }

      const metrics = this.modelPerformance.get(modelId)!;

      // Update metrics with exponential moving average
      metrics.averageLatency = metrics.averageLatency * 0.9 + latency * 0.1;
      metrics.totalRequests++;
      metrics.lastUsed = new Date();

      if (success) {
        metrics.successRate = metrics.successRate * 0.95 + 1 * 0.05;
        metrics.errorRate = Math.max(0, metrics.errorRate * 0.95);
      } else {
        metrics.successRate = Math.max(0, metrics.successRate * 0.95);
        metrics.errorRate = metrics.errorRate * 0.95 + 1 * 0.05;
      }

      this.emit('performance-updated', { modelId, metrics });
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }

  /**
   * Record model switch for analysis
   */
  private recordModelSwitch(data: any): void {
    try {
      const switchRecord = {
        from: data.fromModel,
        to: data.toModel,
        reason: data.reason || 'unknown',
        timestamp: new Date(),
        latency: data.switchLatency || 0,
        success: data.success !== false,
      };

      this.modelSwitchHistory.push(switchRecord);

      // Keep only last 1000 switches
      if (this.modelSwitchHistory.length > 1000) {
        this.modelSwitchHistory = this.modelSwitchHistory.slice(-1000);
      }

      // Update active model stack
      if (switchRecord.success) {
        this.activeModelStack = this.activeModelStack.filter((id) => id !== data.toModel);
        this.activeModelStack.unshift(data.toModel);

        // Keep stack size manageable
        if (this.activeModelStack.length > 5) {
          this.activeModelStack = this.activeModelStack.slice(0, 5);
        }
      }
    } catch (error) {
      console.error('Failed to record model switch:', error);
    }
  }

  /**
   * Record model error for analysis
   */
  private recordModelError(data: any): void {
    try {
      const { modelId, error, context } = data;

      if (this.modelPerformance.has(modelId)) {
        const metrics = this.modelPerformance.get(modelId)!;
        metrics.errorRate = metrics.errorRate * 0.9 + 1 * 0.1;

        this.emit('model-error-recorded', { modelId, error, metrics });
      }
    } catch (error) {
      console.error('Failed to record model error:', error);
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private analyzeQueryCharacteristics(query: string) {
    const words = query.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Analyze complexity
    const complexityKeywords = /\b(analyze|compare|evaluate|synthesize|comprehensive|detailed)\b/gi;
    const legalKeywords = /\b(law|legal|contract|statute|case|court|attorney|jurisdiction)\b/gi;
    const urgentKeywords = /\b(urgent|asap|immediately|now|quick|fast|emergency)\b/gi;

    const complexityScore = Math.min(1, (query.match(complexityKeywords) || []).length / 3);
    const legalScore = Math.min(1, (query.match(legalKeywords) || []).length / 2);
    const urgencyScore = Math.min(1, (query.match(urgentKeywords) || []).length / 2);

    const confidence = Math.max(
      0.3,
      Math.min(1, (wordCount > 3 ? 0.7 : 0.3) + legalScore * 0.2 + complexityScore * 0.1)
    );

    return {
      wordCount,
      complexity: complexityScore,
      legalRelevance: legalScore,
      urgency: urgencyScore,
      confidence,
      estimatedTokens: Math.ceil(wordCount * 1.3),
      queryType: this.classifyQueryType(query, legalScore, complexityScore),
    };
  }

  private classifyQueryType(query: string, legalScore: number, complexityScore: number): string {
    if (legalScore > 0.5) return 'legal';
    if (complexityScore > 0.5) return 'complex-analysis';
    if (query.length < 20) return 'simple-chat';
    return 'general';
  }

  private getUserContext(
    sessionId: string,
    partialContext: Partial<UserContextData>
  ): UserContextData {
    if (!this.userContexts.has(sessionId)) {
      this.userContexts.set(sessionId, {
        sessionId,
        queryHistory: [],
        preferredModels: new Map(),
        expertiseLevel: 'intermediate',
        taskPatterns: new Map(),
        timePreferences: new Map(),
        lastActivity: new Date(),
        ...partialContext,
      });
    }

    const existing = this.userContexts.get(sessionId)!;
    return { ...existing, ...partialContext };
  }

  private calculateAverageComplexity(userCtx: UserContextData): number {
    if (userCtx.queryHistory.length === 0) return 0.5;

    const complexities = userCtx.queryHistory
      .slice(-10)
      .map((query) => this.analyzeQueryCharacteristics(query).complexity);

    return complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  }

  private calculateModelScore(
    variant: ModelVariant,
    queryAnalysis: any,
    userCtx: UserContextData
  ): number {
    let score = 50; // Base score

    // Capability matching (30 points)
    if (queryAnalysis.queryType === 'legal' && variant.capabilities.includes('legal-research')) {
      score += 30;
    } else if (queryAnalysis.queryType === 'simple-chat' && variant.capabilities.includes('chat')) {
      score += 25;
    } else if (
      variant.capabilities.includes('complex-reasoning') &&
      queryAnalysis.complexity > 0.7
    ) {
      score += 30;
    }

    // Performance considerations (20 points)
    if (queryAnalysis.urgency > 0.7) {
      // Prefer faster models for urgent queries
      score += Math.max(0, 20 - variant.targetLatency / 50);
    }

    // User preference bonus (15 points)
    const userPreference = userCtx.preferredModels.get(variant.id) || 0;
    score += userPreference * 15;

    // Recent performance (10 points)
    const metrics = this.modelPerformance.get(variant.id);
    if (metrics) {
      score += metrics.successRate * 10;
      score -= metrics.errorRate * 5;
    }

    // Context window adequacy (10 points)
    const requiredContext = queryAnalysis.estimatedTokens + userCtx.queryHistory.length * 50;
    if (variant.contextWindow >= requiredContext * 2) {
      score += 10;
    } else if (variant.contextWindow >= requiredContext) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generatePreloadRecommendations(
    queryAnalysis: any,
    userCtx: UserContextData,
    alternatives: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Always recommend fast model for quick responses
    if (!recommendations.includes('gemma-270m-fast')) {
      recommendations.push('gemma-270m-fast');
    }

    // Add legal model if legal context - prefer gemma:legal with alias fallback
    if (queryAnalysis.legalRelevance > 0.3) {
      if (!recommendations.includes('gemma:legal')) {
        recommendations.push('gemma:legal');
      }
      if (!recommendations.includes('gemma3:legal-latest')) {
        recommendations.push('gemma3:legal-latest'); // legacy alias
      }
    }

    // Add user's preferred models
    const topPreferred = Array.from(userCtx.preferredModels.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([id]) => id);

    recommendations.push(...topPreferred);

    // Add alternatives
    recommendations.push(...alternatives);

    // Remove duplicates and limit to 3
    return [...new Set(recommendations)].slice(0, 3);
  }

  private generateSelectionReasoning(
    selectedModel: string,
    queryAnalysis: any,
    userCtx: UserContextData
  ): string[] {
    const reasoning: string[] = [];

    const variant = this.modelVariants.get(selectedModel);
    if (!variant) return ['Model selection logic'];

    if (queryAnalysis.legalRelevance > 0.5 && variant.capabilities.includes('legal-research')) {
      reasoning.push('Strong legal context match');
    }

    if (queryAnalysis.urgency > 0.7 && variant.targetLatency < 300) {
      reasoning.push('Optimized for urgent response');
    }

    if (userCtx.preferredModels.get(selectedModel) || 0 > 0.5) {
      reasoning.push('User preference alignment');
    }

    const metrics = this.modelPerformance.get(selectedModel);
    if (metrics && metrics.successRate > 0.8) {
      reasoning.push('High historical performance');
    }

    if (reasoning.length === 0) {
      reasoning.push('Best available option');
    }

    return reasoning;
  }

  private updateUserPreferences(
    userCtx: UserContextData,
    selectedModel: string,
    queryAnalysis: any
  ): void {
    // Increase preference for selected model
    const currentPref = userCtx.preferredModels.get(selectedModel) || 0;
    userCtx.preferredModels.set(selectedModel, Math.min(1, currentPref + 0.1));

    // Update time preferences
    const hour = new Date().getHours();
    const hourlyModels = userCtx.timePreferences.get(hour) || [];
    if (!hourlyModels.includes(selectedModel)) {
      hourlyModels.push(selectedModel);
      userCtx.timePreferences.set(hour, hourlyModels.slice(-3)); // Keep last 3
    }

    // Update task patterns
    const taskType = queryAnalysis.queryType;
    const taskCount = userCtx.taskPatterns.get(taskType) || 0;
    userCtx.taskPatterns.set(taskType, taskCount + 1);
  }

  private estimateModelLatency(modelId: string, queryAnalysis: any): number {
    const variant = this.modelVariants.get(modelId);
    const metrics = this.modelPerformance.get(modelId);

    let baseLatency = variant?.targetLatency || 1000;
    if (metrics) {
      baseLatency = metrics.averageLatency;
    }

    // Adjust for query complexity
    const complexityMultiplier = 1 + queryAnalysis.complexity * 0.5;

    return Math.round(baseLatency * complexityMultiplier);
  }

  private findFastestAvailableModel(): string {
    let fastest = 'gemma-270m-fast';
    let fastestLatency = Infinity;

    for (const [modelId, variant] of this.modelVariants.entries()) {
      if (variant.isLoaded && variant.targetLatency < fastestLatency) {
        fastest = modelId;
        fastestLatency = variant.targetLatency;
      }
    }

    return fastest;
  }

  private generateClarificationSuggestion(query: string, analysis: any): string {
    if (analysis.legalRelevance > 0.3) {
      return 'analyze a specific legal document or research legal precedents';
    }
    if (analysis.complexity > 0.5) {
      return 'break down this complex question into specific parts';
    }
    return "provide more specific details about what you're looking for";
  }

  private generateExpansionSuggestion(
    query: string,
    recentQueries: string[],
    analysis: any
  ): SelfPromptingSuggestion | null {
    const isLegalSequence = recentQueries.every(
      (q) => this.analyzeQueryCharacteristics(q).legalRelevance > 0.3
    );

    if (isLegalSequence && analysis.complexity < 0.5) {
      return {
        id: `expand-legal-${Date.now()}`,
        suggestion:
          'Would you like me to also include related statutes and case precedents in your legal research?',
        confidence: 0.7,
        category: 'expansion',
        modelRecommendation: 'gemma:legal',
        estimatedLatency: 800,
        contextRelevance: 0.8,
      };
    }

    return null;
  }

  private generateAlternativeApproaches(query: string, analysis: any): SelfPromptingSuggestion[] {
    const alternatives: SelfPromptingSuggestion[] = [];

    if (analysis.complexity > 0.7 && analysis.queryType === 'general') {
      alternatives.push({
        id: `alt-approach-${Date.now()}`,
        suggestion:
          'Instead of a general analysis, would you prefer a step-by-step breakdown of this complex topic?',
        confidence: 0.6,
        category: 'alternative',
        modelRecommendation: 'gemma:legal',
        estimatedLatency: 1200,
        contextRelevance: 0.7,
      });
    }

    return alternatives;
  }

  private generateFollowUpSuggestions(
    userCtx: UserContextData,
    analysis: any
  ): SelfPromptingSuggestion[] {
    const suggestions: SelfPromptingSuggestion[] = [];

    // Analyze recent query patterns
    const recentLegalQueries = userCtx.queryHistory
      .slice(-5)
      .filter((q) => this.analyzeQueryCharacteristics(q).legalRelevance > 0.5);

    if (recentLegalQueries.length >= 3) {
      suggestions.push({
        id: `followup-legal-${Date.now()}`,
        suggestion:
          'Based on your recent legal research, would you like me to prepare a comprehensive legal brief or summary?',
        confidence: 0.75,
        category: 'follow-up',
        modelRecommendation: 'gemma:legal',
        estimatedLatency: 2000,
        contextRelevance: 0.85,
      });
    }

    return suggestions;
  }

  private async preloadModel(modelId: string): Promise<void> {
    // Simulate model preloading - in real implementation, this would
    // prepare the model in memory or ensure it's ready for quick access
    const variant = this.modelVariants.get(modelId);
    if (!variant) {
      throw new Error(`Unknown model variant: ${modelId}`);
    }

    // Simulate preload time
    await new Promise((resolve) => setTimeout(resolve, variant.warmupTime));

    variant.isLoaded = true;
    this.emit('model-preloaded', { modelId, variant });
  }

  /**
   * Get comprehensive system status including intelligent features
   */
  async getEnhancedSystemStatus() {
    const baseStatus = await this.getSystemStatus();

    return {
      ...baseStatus,
      intelligentFeatures: {
        modelVariants: Array.from(this.modelVariants.values()),
        activeModelStack: this.activeModelStack,
        userContexts: this.userContexts.size,
        preloadedModels: Array.from(this.preloadedModels),
        performanceMetrics: Array.from(this.modelPerformance.values()),
        recentSwitches: this.modelSwitchHistory.slice(-10),
        orchestratorConnected: this.intelligentOrchestrator !== null,
      },
    };
  }

  /**
   * Learn from user feedback to improve future suggestions
   */
  async learnFromUserFeedback(
    sessionId: string,
    suggestionId: string,
    accepted: boolean,
    actualQuery?: string
  ): Promise<void> {
    try {
      const userCtx = this.getUserContext(sessionId, {});

      if (accepted && actualQuery) {
        // Update query history with accepted suggestion
        userCtx.queryHistory.push(actualQuery);

        // If using intelligent orchestrator, pass feedback
        if (this.intelligentOrchestrator) {
          await this.intelligentOrchestrator.handleUserFeedback(
            suggestionId,
            accepted,
            actualQuery
          );
        }
      }

      this.emit('user-feedback', { sessionId, suggestionId, accepted, actualQuery });
    } catch (error) {
      console.error('Failed to learn from user feedback:', error);
    }
  }
}

// Export singleton instance
export const ollamaService = new EnhancedOllamaService();

// Export for testing and extension
export default EnhancedOllamaService;
