// WebAssembly AI Adapter for AIAssistantManager
// Bridges XState-managed AI assistant with WebAssembly llama.cpp service
// Integrates WebGPU tensor acceleration and ONNX.js fallbacks

import { webLlamaService, type WebLlamaResponse, type WebLlamaConfig } from '../ai/webasm-llamacpp';
import { tensorAccelerator, acceleratedSimilarity } from '../webgpu/tensor-acceleration';
import { browser } from '$app/environment';
import type { ConversationEntry } from '../stores/aiAssistant.svelte';

export interface WebAssemblyAIConfig {
  // Primary server-side endpoints
  ollamaEndpoint: string;
  pythonMiddlewareEndpoint: string;
  
  // Client-side fallback options
  onnxModelPath: string;
  wasmPath: string;
  enableGPU: boolean;
  enableMultiCore: boolean;
  
  // Generation parameters
  maxTokens: number;
  temperature: number;
  contextSize: number;
  
  // Fallback strategy
  fallbackStrategy: 'ollama' | 'python' | 'onnx' | 'auto';
  gpuDetectionTimeout: number;
}

export interface WebAssemblyAIResponse {
  content: string;
  metadata: {
    tokensGenerated: number;
    processingTime: number;
    confidence: number;
    method: 'webassembly';
    modelUsed: string;
    fromCache: boolean;
  };
  conversationId?: string;
}

export class WebAssemblyAIAdapter {
  private initialized = false;
  private config: WebAssemblyAIConfig;
  private currentModel = 'gemma3:270m';
  private activeInferenceMethod: 'ollama' | 'python' | 'onnx' | 'unknown' = 'unknown';
  private onnxSession: any = null; // ONNX.js inference session
  private gpuAvailable = false;
  
  constructor(config: Partial<WebAssemblyAIConfig> = {}) {
    this.config = {
      // Server-side endpoints
      ollamaEndpoint: '/api/ai',
      pythonMiddlewareEndpoint: '/api/python-ai',
      
      // Client-side fallback
      onnxModelPath: '/models/gemma3-270m.onnx',
      wasmPath: '/wasm/vector-ops.wasm',
      enableGPU: true,
      enableMultiCore: true,
      
      // Parameters
      maxTokens: 2048,
      temperature: 0.7,
      contextSize: 8192,
      
      // Fallback strategy
      fallbackStrategy: 'auto',
      gpuDetectionTimeout: 5000,
      
      ...config
    };
  }

  /**
   * Initialize WebAssembly AI service with fallback detection
   */
  async initialize(): Promise<boolean> {
    if (!browser) {
      console.warn('[WebAssembly AI] Not running in browser environment');
      return false;
    }

    if (this.initialized) {
      return true;
    }

    try {
      console.log('[WebAssembly AI] Initializing AI adapter with fallback detection...');
      
      // Detect GPU availability
      this.gpuAvailable = await this.detectGPUAvailability();
      
      // Determine the best inference method
      this.activeInferenceMethod = await this.selectInferenceMethod();
      
      // Initialize the selected method
      switch (this.activeInferenceMethod) {
        case 'ollama':
          await this.initializeOllama();
          break;
        case 'python':
          await this.initializePythonMiddleware();
          break;
        case 'onnx':
          await this.initializeONNX();
          break;
        default:
          throw new Error('No viable inference method available');
      }

      this.initialized = true;
      console.log(`[WebAssembly AI] Adapter initialized with method: ${this.activeInferenceMethod}`);
      return true;

    } catch (error) {
      console.error('[WebAssembly AI] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect GPU availability and capabilities
   */
  private async detectGPUAvailability(): Promise<boolean> {
    try {
      // Check WebGPU support
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('[WebAssembly AI] WebGPU available');
          return true;
        }
      }
      
      // Check WebGL as fallback
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        console.log('[WebAssembly AI] WebGL available as GPU fallback');
        return true;
      }
      
      console.log('[WebAssembly AI] No GPU acceleration available');
      return false;
    } catch (error) {
      console.warn('[WebAssembly AI] GPU detection failed:', error);
      return false;
    }
  }

  /**
   * Select the best inference method based on availability and config
   */
  private async selectInferenceMethod(): Promise<'ollama' | 'python' | 'onnx'> {
    if (this.config.fallbackStrategy !== 'auto') {
      return this.config.fallbackStrategy;
    }

    // Try Ollama first (best performance)
    try {
      const ollamaCheck = await fetch(`${this.config.ollamaEndpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.gpuDetectionTimeout)
      });
      if (ollamaCheck.ok) {
        console.log('[WebAssembly AI] Ollama available');
        return 'ollama';
      }
    } catch (error) {
      console.warn('[WebAssembly AI] Ollama unavailable:', error);
    }

    // Try Python middleware second
    try {
      const pythonCheck = await fetch(`${this.config.pythonMiddlewareEndpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.gpuDetectionTimeout)
      });
      if (pythonCheck.ok) {
        console.log('[WebAssembly AI] Python middleware available');
        return 'python';
      }
    } catch (error) {
      console.warn('[WebAssembly AI] Python middleware unavailable:', error);
    }

    // Fallback to client-side ONNX
    console.log('[WebAssembly AI] Falling back to client-side ONNX');
    return 'onnx';
  }

  /**
   * Initialize Ollama connection
   */
  private async initializeOllama(): Promise<void> {
    const modelCheck = await fetch(`${this.config.ollamaEndpoint}/models`);
    const models = await modelCheck.json();
    
    if (!models.models || models.models.length === 0) {
      throw new Error('No models available in Ollama');
    }
    
    this.currentModel = models.models[0]?.name || 'gemma3:270m';
    console.log(`[WebAssembly AI] Ollama initialized with model: ${this.currentModel}`);
  }

  /**
   * Initialize Python middleware connection
   */
  private async initializePythonMiddleware(): Promise<void> {
    const statusCheck = await fetch(`${this.config.pythonMiddlewareEndpoint}/status`);
    const status = await statusCheck.json();
    
    this.currentModel = status.model || 'gemma3:270m';
    console.log(`[WebAssembly AI] Python middleware initialized with model: ${this.currentModel}`);
  }

  /**
   * Initialize client-side ONNX.js inference
   */
  private async initializeONNX(): Promise<void> {
    try {
      // Import ONNX.js dynamically
      const ort = await import('onnxruntime-web');
      
      // Configure ONNX.js
      if (this.gpuAvailable) {
        ort.env.wasm.wasmPaths = '/wasm/';
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
      }
      
      // Load the distilled model
      console.log(`[WebAssembly AI] Loading ONNX model from ${this.config.onnxModelPath}`);
      this.onnxSession = await ort.InferenceSession.create(this.config.onnxModelPath, {
        executionProviders: this.gpuAvailable ? ['webgl', 'wasm'] : ['wasm'],
        enableMemPattern: true,
        enableCpuMemArena: true,
      });
      
      this.currentModel = 'gemma3:270m';
      console.log('[WebAssembly AI] ONNX.js initialized successfully');
    } catch (error) {
      console.error('[WebAssembly AI] ONNX initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send message with hybrid inference pipeline (Ollama → Python → ONNX fallbacks)
   */
  async sendMessage(
    message: string,
    options: {
      conversationHistory?: ConversationEntry[];
      useContext?: boolean;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      useGPUAcceleration?: boolean;
    } = {}
  ): Promise<WebAssemblyAIResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('WebAssembly AI adapter not initialized');
    }

    try {
      const startTime = performance.now();
      
      // Build prompt with conversation context
      const prompt = this.buildPromptWithContext(message, options.conversationHistory || []);
      
      // Route to the appropriate inference method
      let response: WebAssemblyAIResponse;
      
      switch (this.activeInferenceMethod) {
        case 'ollama':
          response = await this.generateWithOllama(prompt, options);
          break;
        case 'python':
          response = await this.generateWithPython(prompt, options);
          break;
        case 'onnx':
          response = await this.generateWithONNX(prompt, options);
          break;
        default:
          throw new Error('No active inference method');
      }

      const totalTime = performance.now() - startTime;
      
      // Add WebGPU tensor acceleration for similarity search if requested
      if (options.useGPUAcceleration && options.conversationHistory?.length) {
        response = await this.enhanceWithTensorAcceleration(response, options.conversationHistory);
      }

      response.metadata.processingTime = totalTime;
      return response;

    } catch (error: any) {
      console.error(`[WebAssembly AI] Message processing failed with ${this.activeInferenceMethod}:`, error);
      
      // Try fallback method if primary fails
      try {
        return await this.fallbackInference(message, options);
      } catch (fallbackError: any) {
        throw new Error(`All inference methods failed. Last error: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Generate response using Ollama API
   */
  private async generateWithOllama(
    prompt: string, 
    options: any
  ): Promise<WebAssemblyAIResponse> {
    const response = await fetch(`${this.config.ollamaEndpoint}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.currentModel,
        prompt: prompt,
        options: {
          num_predict: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.response || '',
      metadata: {
        tokensGenerated: this.estimateTokenCount(data.response || ''),
        processingTime: 0,
        confidence: 0.9,
        method: 'ollama',
        modelUsed: this.currentModel,
        fromCache: false
      }
    };
  }

  /**
   * Generate response using Python middleware
   */
  private async generateWithPython(
    prompt: string, 
    options: any
  ): Promise<WebAssemblyAIResponse> {
    const response = await fetch(`${this.config.pythonMiddlewareEndpoint}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        model: this.currentModel
      }),
    });

    if (!response.ok) {
      throw new Error(`Python middleware error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.text || data.response || '',
      metadata: {
        tokensGenerated: data.tokens_generated || this.estimateTokenCount(data.text || ''),
        processingTime: data.processing_time || 0,
        confidence: data.confidence || 0.85,
        method: 'python',
        modelUsed: this.currentModel,
        fromCache: data.from_cache || false
      }
    };
  }

  /**
   * Generate response using client-side ONNX.js
   */
  private async generateWithONNX(
    prompt: string, 
    options: any
  ): Promise<WebAssemblyAIResponse> {
    if (!this.onnxSession) {
      throw new Error('ONNX session not initialized');
    }

    try {
      // Import ONNX.js runtime
      const ort = await import('onnxruntime-web');
      
      // Tokenize prompt (simplified - in production use proper tokenizer)
      const tokens = this.simpleTokenize(prompt);
      const maxTokens = Math.min(options.maxTokens || this.config.maxTokens, 512); // ONNX models are typically smaller
      
      // Create input tensor
      const inputTensor = new ort.Tensor('int64', BigInt64Array.from(tokens.map(t => BigInt(t))), [1, tokens.length]);
      
      // Run inference
      const feeds = { input_ids: inputTensor };
      const results = await this.onnxSession.run(feeds);
      
      // Decode output tokens (simplified)
      const outputTokens = Array.from(results.logits.data as Float32Array)
        .slice(0, maxTokens)
        .map((_, i) => i + tokens.length); // Simplified generation
      
      const generatedText = this.simpleDetokenize(outputTokens);
      
      return {
        content: generatedText,
        metadata: {
          tokensGenerated: outputTokens.length,
          processingTime: 0,
          confidence: 0.7, // ONNX models typically lower confidence
          method: 'onnx',
          modelUsed: 'gemma3:270m',
          fromCache: false
        }
      };
      
    } catch (error: any) {
      console.error('[WebAssembly AI] ONNX inference failed:', error);
      throw error;
    }
  }

  /**
   * Enhance response with WebGPU tensor acceleration for similarity search
   */
  private async enhanceWithTensorAcceleration(
    response: WebAssemblyAIResponse,
    conversationHistory: ConversationEntry[]
  ): Promise<WebAssemblyAIResponse> {
    try {
      // Generate high-quality embedding for the response using embedding service
      const responseEmbedding = await this.generateEmbedding(response.content);
      
      // Find most similar historical messages using GPU acceleration
      const similarities: number[] = [];
      const gpuTimings: number[] = [];
      
      for (const entry of conversationHistory.slice(-10)) { // Last 10 messages
        const historyEmbedding = await this.generateEmbedding(entry.content);
        
        const result = await acceleratedSimilarity(
          responseEmbedding, 
          historyEmbedding,
          { gpuTile: true, tileSize: 16, precision: 'fp32' }
        );
        
        similarities.push(result.similarity);
        gpuTimings.push(result.gpuMeta.computeTime);
      }
      
      // Find highest similarity for confidence adjustment
      const maxSimilarity = Math.max(...similarities);
      const avgGPUTime = gpuTimings.reduce((sum, time) => sum + time, 0) / gpuTimings.length;
      
      // Boost confidence if response is similar to successful past responses
      if (maxSimilarity > 0.8) {
        response.metadata.confidence = Math.min(0.95, response.metadata.confidence + 0.1);
      }
      
      // Add GPU metadata with detailed metrics
      response.metadata = {
        ...response.metadata,
        gpuAccelerated: true,
        maxSimilarity: maxSimilarity,
        avgGPUComputeTime: avgGPUTime,
        similarityScores: similarities,
        tensorAccelerationUsed: true
      };
      
      console.log(`[WebAssembly AI] GPU tensor acceleration enhanced response with max similarity: ${maxSimilarity.toFixed(3)}`);
      
      return response;
      
    } catch (error: any) {
      console.warn('[WebAssembly AI] GPU acceleration failed, continuing without:', error);
      response.metadata.gpuAccelerated = false;
      response.metadata.tensorAccelerationUsed = false;
      return response;
    }
  }

  /**
   * Fallback inference when primary method fails
   */
  private async fallbackInference(
    message: string,
    options: any
  ): Promise<WebAssemblyAIResponse> {
    const fallbackOrder = ['ollama', 'python', 'onnx'].filter(
      method => method !== this.activeInferenceMethod
    );
    
    for (const method of fallbackOrder) {
      try {
        console.log(`[WebAssembly AI] Trying fallback method: ${method}`);
        
        const prompt = this.buildPromptWithContext(message, options.conversationHistory || []);
        
        switch (method) {
          case 'ollama':
            if (await this.testOllamaConnection()) {
              return await this.generateWithOllama(prompt, options);
            }
            break;
          case 'python':
            if (await this.testPythonConnection()) {
              return await this.generateWithPython(prompt, options);
            }
            break;
          case 'onnx':
            if (this.onnxSession) {
              return await this.generateWithONNX(prompt, options);
            }
            break;
        }
      } catch (error) {
        console.warn(`[WebAssembly AI] Fallback method ${method} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All fallback methods exhausted');
  }

  /**
   * Test Ollama connection
   */
  private async testOllamaConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Test Python middleware connection
   */
  private async testPythonConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.pythonMiddlewareEndpoint}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze legal document using WebAssembly Gemma 3 Legal
   */
  async analyzeLegalDocument(
    title: string,
    content: string,
    analysisType: 'comprehensive' | 'quick' | 'risk-focused' = 'comprehensive'
  ): Promise<{
    summary: string;
    keyTerms: string[];
    entities: Array<{ type: string; value: string; confidence: number }>;
    risks: Array<{ type: string; severity: string; description: string }>;
    recommendations: string[];
    confidence: number;
    processingTime: number;
    method: string;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await webLlamaService.analyzeLegalDocument(title, content, analysisType);
      return result;
    } catch (error: any) {
      console.error('[WebAssembly AI] Legal analysis failed:', error);
      throw error;
    }
  }

  /**
   * Stream response (simulated chunked responses for WebAssembly)
   */
  async streamMessage(
    message: string,
    options: {
      conversationHistory?: ConversationEntry[];
      onChunk?: (chunk: string) => void;
      onComplete?: (response: WebAssemblyAIResponse) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    try {
      const response = await this.sendMessage(message, {
        conversationHistory: options.conversationHistory
      });

      // Simulate streaming by chunking the response
      const chunks = this.chunkResponse(response.content, 50);
      
      for (const chunk of chunks) {
        if (options.onChunk) {
          options.onChunk(chunk);
        }
        // Add small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (options.onComplete) {
        options.onComplete(response);
      }

    } catch (error: any) {
      console.error('[WebAssembly AI] Streaming failed:', error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'gemma3:270m',
      'gemma3:2b',
      'gemma3:9b'
    ];
  }

  /**
   * Set model configuration
   */
  setModel(model: string): void {
    if (!this.getAvailableModels().includes(model)) {
      throw new Error(`Unsupported model: ${model}`);
    }
    this.currentModel = model;
  }

  /**
   * Set temperature
   */
  setTemperature(temperature: number): void {
    if (temperature < 0 || temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }
    this.config.temperature = temperature;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    initialized: boolean;
    modelLoaded: boolean;
    webgpuAvailable: boolean;
    webgpuEnabled: boolean;
    workerEnabled: boolean;
    cacheSize: number;
    threadsCount: number;
    wasmSupported: boolean;
    currentModel: string;
  } {
    const wasmHealth = webLlamaService.getHealthStatus();
    
    return {
      initialized: this.initialized,
      currentModel: this.currentModel,
      ...wasmHealth
    };
  }

  /**
   * Check if WebAssembly is supported
   */
  isSupported(): boolean {
    return browser && 
           typeof WebAssembly !== 'undefined' &&
           typeof Worker !== 'undefined' &&
           typeof performance !== 'undefined';
  }

  // Private helper methods

  private buildPromptWithContext(message: string, history: ConversationEntry[]): string {
    let prompt = '<|system|>You are a specialized legal AI assistant. Provide accurate, helpful responses about legal matters. Be concise but thorough.<|end|>\n\n';
    
    // Add conversation history (last 5 exchanges)
    const recentHistory = history.slice(-10);
    for (const entry of recentHistory) {
      if (entry.type === 'user') {
        prompt += `<|user|>${entry.content}<|end|>\n`;
      } else if (entry.type === 'assistant') {
        prompt += `<|assistant|>${entry.content}<|end|>\n`;
      }
    }
    
    // Add current message
    prompt += `<|user|>${message}<|end|>\n<|assistant|>`;
    
    return prompt;
  }

  private chunkResponse(text: string, chunkSize: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk + ' ');
    }
    
    return chunks;
  }

  /**
   * Simple tokenization for ONNX inference (replace with proper tokenizer in production)
   */
  private simpleTokenize(text: string): number[] {
    // Very basic tokenization - in production, use transformers.js or similar
    const tokens: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      tokens.push(charCode > 127 ? 100 : charCode); // Simple handling of non-ASCII
    }
    return tokens.slice(0, 512); // Truncate to model's max length
  }

  /**
   * Simple detokenization for ONNX inference
   */
  private simpleDetokenize(tokens: number[]): string {
    return tokens
      .filter(token => token > 0 && token < 127)
      .map(token => String.fromCharCode(token))
      .join('');
  }

  /**
   * Generate embedding using the existing Ollama embedding API
   */
  private async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      // Call the existing embedding API that uses Ollama's nomic-embed-text
      const response = await fetch('/api/ai/embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.embedding;
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('No valid embedding returned from API');
      }

      // Convert to Float32Array for WebGPU compatibility
      return new Float32Array(embedding);

    } catch (error) {
      console.warn('[WebAssembly AI] Server embedding failed, using simple embedding:', error);
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Simple embedding fallback for WebGPU tensor operations when server is unavailable
   */
  private generateSimpleEmbedding(text: string): Float32Array {
    const dim = 256; // Fixed dimension for compatibility
    const embedding = new Float32Array(dim);
    
    // Simple hash-based embedding (fallback only)
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      
      const idx = Math.abs(hash) % dim;
      embedding[idx] += 1.0;
    }
    
    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        embedding[i] /= norm;
      }
    }
    
    return embedding;
  }

  /**
   * Estimate token count from text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation: ~4 characters per token
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (webLlamaService) {
      webLlamaService.dispose();
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const webAssemblyAIAdapter = new WebAssemblyAIAdapter();