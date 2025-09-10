/**
 * Legal-BERT ONNX Service
 * Optimized ONNX wrapper for Legal-BERT model providing fast legal entity extraction,
 * case classification, and legal document embeddings
 */

import { EventEmitter } from "events";

interface ONNXModelConfig {
  modelPath: string;
  providerOptions: {
    name: string;
    deviceType?: 'CPU' | 'GPU';
    deviceId?: number;
  }[];
  sessionOptions: {
    graphOptimizationLevel: 'basic' | 'extended' | 'all';
    enableMemPattern: boolean;
    enableCpuMemArena: boolean;
    executionMode: 'sequential' | 'parallel';
    logSeverityLevel: number;
  };
  inputSpec: {
    inputIds: { name: string; type: string; shape: number[] };
    attentionMask: { name: string; type: string; shape: number[] };
    tokenTypeIds?: { name: string; type: string; shape: number[] };
  };
  outputSpec: {
    lastHiddenState: { name: string; type: string; shape: number[] };
    poolerOutput?: { name: string; type: string; shape: number[] };
    logits?: { name: string; type: string; shape: number[] };
  };
}

interface LegalEntityExtractionResult {
  entities: Array<{
    text: string;
    label: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  processingTime: number;
  modelUsed: string;
}

interface LegalClassificationResult {
  predictions: Array<{
    label: string;
    confidence: number;
  }>;
  topPrediction: {
    label: string;
    confidence: number;
  };
  processingTime: number;
  modelUsed: string;
}

interface LegalEmbeddingResult {
  embeddings: number[];
  dimensions: number;
  processingTime: number;
  modelUsed: string;
}

export class LegalBertONNXService extends EventEmitter {
  private modelConfig: ONNXModelConfig;
  private session: any = null; // ONNX InferenceSession
  private tokenizer: any = null;
  private isInitialized = false;
  private performanceMetrics = {
    totalInferences: 0,
    averageLatency: 0,
    successRate: 1.0,
    lastUsed: new Date(),
  };

  constructor() {
    super();
    this.modelConfig = this.getDefaultConfig();
  }

  /**
   * Get default ONNX configuration for Legal-BERT
   */
  private getDefaultConfig(): ONNXModelConfig {
    return {
      modelPath: './models/legal-bert-onnx/model.onnx',
      providerOptions: [
        {
          name: 'CPUExecutionProvider',
          deviceType: 'CPU',
        },
        // GPU provider as fallback if available
        {
          name: 'CUDAExecutionProvider',
          deviceType: 'GPU',
          deviceId: 0,
        },
      ],
      sessionOptions: {
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionMode: 'parallel',
        logSeverityLevel: 2, // Warning level
      },
      inputSpec: {
        inputIds: {
          name: 'input_ids',
          type: 'int64',
          shape: [-1, -1], // Dynamic batch and sequence length
        },
        attentionMask: {
          name: 'attention_mask',
          type: 'int64',
          shape: [-1, -1],
        },
        tokenTypeIds: {
          name: 'token_type_ids',
          type: 'int64',
          shape: [-1, -1],
        },
      },
      outputSpec: {
        lastHiddenState: {
          name: 'last_hidden_state',
          type: 'float32',
          shape: [-1, -1, 768], // [batch, sequence, hidden_size]
        },
        poolerOutput: {
          name: 'pooler_output',
          type: 'float32',
          shape: [-1, 768], // [batch, hidden_size]
        },
      },
    };
  }

  /**
   * Initialize ONNX session and tokenizer
   */
  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid loading ONNX in environments where it's not available
      const ort = await this.loadONNXRuntime();
      
      // Create inference session
      this.session = await ort.InferenceSession.create(
        this.modelConfig.modelPath,
        {
          executionProviders: this.modelConfig.providerOptions.map(p => p.name),
          ...this.modelConfig.sessionOptions,
        }
      );

      // Initialize tokenizer (mock implementation - replace with actual tokenizer)
      this.tokenizer = await this.initializeTokenizer();

      this.isInitialized = true;
      this.emit('initialized', { session: this.session, tokenizer: this.tokenizer });
      
      console.log('✅ Legal-BERT ONNX service initialized successfully');
      console.log('📊 Available providers:', this.session.inputNames, this.session.outputNames);
      
    } catch (error) {
      console.error('❌ Failed to initialize Legal-BERT ONNX service:', error);
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Load ONNX Runtime with fallback handling
   */
  private async loadONNXRuntime(): Promise<any> {
    try {
      // Try to load ONNX Runtime
      return await import('onnxruntime-node');
    } catch (error) {
      try {
        // Fallback to web version if available
        return await import('onnxruntime-web');
      } catch (webError) {
        throw new Error('ONNX Runtime not available. Please install onnxruntime-node or onnxruntime-web');
      }
    }
  }

  /**
   * Initialize tokenizer (placeholder - integrate with actual BERT tokenizer)
   */
  private async initializeTokenizer(): Promise<any> {
    // This is a placeholder. In production, you would:
    // 1. Load the actual BERT tokenizer (e.g., from @xenova/transformers)
    // 2. Configure it with the Legal-BERT vocabulary
    // 3. Set appropriate special tokens
    
    return {
      encode: (text: string) => this.mockTokenize(text),
      decode: (tokens: number[]) => this.mockDetokenize(tokens),
      vocab_size: 30522, // Standard BERT vocab size
      max_length: 512,
    };
  }

  /**
   * Mock tokenization (replace with actual BERT tokenizer)
   */
  private mockTokenize(text: string): { input_ids: number[]; attention_mask: number[]; token_type_ids: number[] } {
    // This is a simplified mock. In production, use proper BERT tokenization
    const words = text.toLowerCase().split(/\s+/).slice(0, 510); // Leave room for special tokens
    const input_ids = [101, ...words.map(() => Math.floor(Math.random() * 30522)), 102]; // [CLS] + tokens + [SEP]
    const attention_mask = Array(input_ids.length).fill(1);
    const token_type_ids = Array(input_ids.length).fill(0);

    return { input_ids, attention_mask, token_type_ids };
  }

  /**
   * Mock detokenization
   */
  private mockDetokenize(tokens: number[]): string {
    return tokens.map(t => `token_${t}`).join(' ');
  }

  /**
   * Extract legal entities from text
   */
  async extractLegalEntities(text: string): Promise<LegalEntityExtractionResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Tokenize input
      const tokens = this.tokenizer.encode(text);
      
      // Prepare ONNX inputs
      const inputs = await this.prepareONNXInputs(tokens);
      
      // Run inference
      const outputs = await this.session.run(inputs);
      
      // Process outputs for NER
      const entities = this.processNEROutputs(outputs, text, tokens);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);
      
      const result: LegalEntityExtractionResult = {
        entities,
        processingTime,
        modelUsed: 'legal-bert-onnx',
      };
      
      this.emit('entity-extraction-complete', result);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, false);
      
      console.error('Legal entity extraction failed:', error);
      this.emit('error', { type: 'entity-extraction', error, text });
      throw error;
    }
  }

  /**
   * Classify legal document type
   */
  async classifyLegalDocument(text: string): Promise<LegalClassificationResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Tokenize input
      const tokens = this.tokenizer.encode(text.substring(0, 512)); // Truncate to max length
      
      // Prepare ONNX inputs
      const inputs = await this.prepareONNXInputs(tokens);
      
      // Run inference
      const outputs = await this.session.run(inputs);
      
      // Process outputs for classification
      const predictions = this.processClassificationOutputs(outputs);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);
      
      const result: LegalClassificationResult = {
        predictions,
        topPrediction: predictions[0],
        processingTime,
        modelUsed: 'legal-bert-onnx',
      };
      
      this.emit('classification-complete', result);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, false);
      
      console.error('Legal classification failed:', error);
      this.emit('error', { type: 'classification', error, text });
      throw error;
    }
  }

  /**
   * Generate embeddings for legal text
   */
  async generateEmbeddings(text: string): Promise<LegalEmbeddingResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Tokenize input
      const tokens = this.tokenizer.encode(text.substring(0, 512));
      
      // Prepare ONNX inputs
      const inputs = await this.prepareONNXInputs(tokens);
      
      // Run inference
      const outputs = await this.session.run(inputs);
      
      // Extract embeddings from pooler output or mean pooling
      const embeddings = this.extractEmbeddings(outputs);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);
      
      const result: LegalEmbeddingResult = {
        embeddings,
        dimensions: embeddings.length,
        processingTime,
        modelUsed: 'legal-bert-onnx',
      };
      
      this.emit('embedding-complete', result);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, false);
      
      console.error('Legal embedding generation failed:', error);
      this.emit('error', { type: 'embedding', error, text });
      throw error;
    }
  }

  /**
   * Prepare inputs for ONNX inference
   */
  private async prepareONNXInputs(tokens: any): Promise<Record<string, any>> {
    // Use the ONNX runtime that was loaded during initialization
    const ort = await this.loadONNXRuntime();
    
    const batchSize = 1;
    const seqLength = tokens.input_ids.length;
    
    // Pad or truncate to consistent length if needed
    const paddedLength = Math.min(seqLength, 512);
    const paddedInputIds = tokens.input_ids.slice(0, paddedLength);
    const paddedAttentionMask = tokens.attention_mask.slice(0, paddedLength);
    const paddedTokenTypeIds = tokens.token_type_ids.slice(0, paddedLength);
    
    // Pad if shorter than max length
    while (paddedInputIds.length < paddedLength) {
      paddedInputIds.push(0);
      paddedAttentionMask.push(0);
      paddedTokenTypeIds.push(0);
    }
    
    return {
      input_ids: new ort.Tensor('int64', new BigInt64Array(paddedInputIds.map(id => BigInt(id))), [batchSize, paddedLength]),
      attention_mask: new ort.Tensor('int64', new BigInt64Array(paddedAttentionMask.map(mask => BigInt(mask))), [batchSize, paddedLength]),
      token_type_ids: new ort.Tensor('int64', new BigInt64Array(paddedTokenTypeIds.map(type => BigInt(type))), [batchSize, paddedLength]),
    };
  }

  /**
   * Process NER outputs to extract entities
   */
  private processNEROutputs(outputs: any, originalText: string, tokens: any): Array<{ text: string; label: string; confidence: number; start: number; end: number }> {
    // This is a simplified implementation
    // In production, you would:
    // 1. Apply softmax to get probabilities
    // 2. Use BIO/BILOU tagging scheme
    // 3. Map token positions back to original text
    
    const mockEntities = [
      { text: 'Contract', label: 'LEGAL_DOCUMENT', confidence: 0.95, start: 0, end: 8 },
      { text: 'Supreme Court', label: 'COURT', confidence: 0.92, start: 50, end: 63 },
      { text: 'defendant', label: 'LEGAL_ROLE', confidence: 0.88, start: 100, end: 109 },
    ];
    
    return mockEntities.filter(entity => originalText.toLowerCase().includes(entity.text.toLowerCase()));
  }

  /**
   * Process classification outputs
   */
  private processClassificationOutputs(outputs: any): Array<{ label: string; confidence: number }> {
    // Mock classification results - replace with actual processing
    const legalDocTypes = [
      { label: 'contract', confidence: 0.85 },
      { label: 'court_decision', confidence: 0.12 },
      { label: 'legal_brief', confidence: 0.03 },
    ];
    
    return legalDocTypes.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract embeddings from model outputs
   */
  private extractEmbeddings(outputs: any): number[] {
    // Extract from pooler output or perform mean pooling
    // This is a mock implementation
    const embeddingSize = 768;
    return Array.from({ length: embeddingSize }, () => Math.random() * 2 - 1);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(latency: number, success: boolean): void {
    this.performanceMetrics.totalInferences++;
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency * (this.performanceMetrics.totalInferences - 1) + latency) / 
      this.performanceMetrics.totalInferences;
    
    if (success) {
      this.performanceMetrics.successRate = 
        (this.performanceMetrics.successRate * (this.performanceMetrics.totalInferences - 1) + 1) / 
        this.performanceMetrics.totalInferences;
    } else {
      this.performanceMetrics.successRate = 
        (this.performanceMetrics.successRate * (this.performanceMetrics.totalInferences - 1)) / 
        this.performanceMetrics.totalInferences;
    }
    
    this.performanceMetrics.lastUsed = new Date();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.session !== null;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    try {
      if (this.session) {
        await this.session.release();
        this.session = null;
      }
      this.isInitialized = false;
      this.emit('disposed');
    } catch (error) {
      console.error('Error disposing Legal-BERT ONNX service:', error);
    }
  }
}

// Export singleton instance
export const legalBertONNXService = new LegalBertONNXService();

// Export types
export type {
  LegalEntityExtractionResult,
  LegalClassificationResult,
  LegalEmbeddingResult,
  ONNXModelConfig,
};

// Export class for testing and extension
export default LegalBertONNXService;