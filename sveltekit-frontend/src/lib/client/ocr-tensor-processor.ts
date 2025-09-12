/**
 * Client-side OCR + Tensor Processing Pipeline
 * OCR.js → Text Extraction → Node API → Embeddings → Multi-dimensional Tensors
 * SIMD parsing via Service Worker for streaming performance
 */

import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager.js';
import { browser } from '$app/environment';
import { PREDICTIVE_UI_ANALYTICS, ENHANCED_MEMORY_CACHING, GAMING_ERA_SPECS } from '$lib/components/ui/gaming/constants/gaming-constants.js';

// OCR.js types (install via: npm install ocr-js @types/ocr-js)
declare global {
  interface Window {
    Tesseract?: any;
  }
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
}

export interface TensorData {
  embeddings: Float32Array;
  dimensions: number;
  metadata: {
    source: 'ocr' | 'manual' | 'api';
    processed_at: number;
    tensor_id: string;
    confidence: number;
  };
}

export interface ProcessingResult {
  ocr: OCRResult;
  embeddings: TensorData;
  searchIndex: Float32Array;
  processingTime: number;
  cacheHit: boolean;
}

export class OCRTensorProcessor {
  private worker?: Worker;
  private ocrInitialized = false;
  private webgpuDevice?: GPUDevice;
  private currentLODLevel: 'high' | 'medium' | 'low' = 'medium';
  private memoryPressure = 0;
  private processingComplexity = 0;

  async initialize(): Promise<void> {
    if (!browser) return;

    // Initialize LOD optimization based on gaming memory architecture
    await this.initializeLODOptimization();

    // Initialize OCR.js
    await this.initializeOCR();
    
    // Initialize WebGPU for tensor processing
    await this.initializeWebGPU();
    
    // Initialize Service Worker for SIMD parsing
    await this.initializeServiceWorker();
    
    console.log('✅ OCR Tensor Processor initialized with Gemma 270MB + Gaming LOD');
  }

  private async initializeLODOptimization(): Promise<void> {
    // Monitor memory pressure using gaming era specs
    this.updateMemoryPressure();
    
    // Set initial LOD level based on device capabilities
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      const usedMemoryMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      const totalMemoryMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
      
      if (totalMemoryMB < GAMING_ERA_SPECS.n64.memoryMB) {
        this.currentLODLevel = 'low';  // Use 8-bit NES level optimization
      } else if (totalMemoryMB < 512) {
        this.currentLODLevel = 'medium'; // Use 16-bit SNES level optimization
      } else {
        this.currentLODLevel = 'high';   // Use N64 level optimization
      }
    }

    console.log(`🎮 LOD Level set to: ${this.currentLODLevel}`);
  }

  private updateMemoryPressure(): void {
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      this.memoryPressure = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
      
      // Adapt LOD based on memory pressure using gaming thresholds
      if (this.memoryPressure > ENHANCED_MEMORY_CACHING.performance.adaptiveTuning.thresholds.criticalMemory) {
        this.currentLODLevel = 'low';
      } else if (this.memoryPressure > ENHANCED_MEMORY_CACHING.performance.adaptiveTuning.thresholds.lowMemory) {
        this.currentLODLevel = 'medium';
      }
    }
  }

  private async initializeOCR(): Promise<void> {
    if (!browser || this.ocrInitialized) return;

    try {
      // Load Tesseract.js dynamically
      const tesseract = await import('tesseract.js');
      window.Tesseract = tesseract;
      this.ocrInitialized = true;
      console.log('✅ OCR.js loaded');
    } catch (error) {
      console.warn('Failed to load OCR.js, using fallback:', error);
    }
  }

  private async initializeWebGPU(): Promise<void> {
    if (!browser || !navigator.gpu) return;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter found');

      this.webgpuDevice = await adapter.requestDevice();
      await shaderCacheManager.initialize(this.webgpuDevice);
      console.log('✅ WebGPU initialized for tensor processing');
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    if (!browser || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(
        '/tensor-simd-worker.js',
        { scope: '/api/tensor/' }
      );
      
      this.worker = (registration.active || registration.installing || registration.waiting) as any;
      console.log('✅ SIMD Service Worker initialized');
    } catch (error) {
      console.warn('Service Worker initialization failed:', error);
    }
  }

  /**
   * Process image with OCR and convert to embeddings
   */
  async processImage(
    imageData: ImageData | HTMLCanvasElement | File,
    options: {
      language?: string;
      oem?: number;
      psm?: number;
      useCache?: boolean;
    } = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now();

    try {
      // 1. Extract text using OCR.js
      const ocrResult = await this.performOCR(imageData, options);
      
      // 2. Generate embeddings via Node API
      const embeddingResult = await this.generateEmbeddings(ocrResult.text);
      
      // 3. Process tensors with WebGPU SIMD
      const tensorData = await this.processTensors(embeddingResult.embeddings);
      
      // 4. Create search index
      const searchIndex = await this.createSearchIndex(tensorData);

      const totalTime = performance.now() - startTime;

      return {
        ocr: ocrResult,
        embeddings: tensorData,
        searchIndex,
        processingTime: totalTime,
        cacheHit: embeddingResult.fromCache
      };

    } catch (error) {
      console.error('OCR Tensor processing failed:', error);
      throw error;
    }
  }

  private async performOCR(
    imageData: ImageData | HTMLCanvasElement | File,
    options: any
  ): Promise<OCRResult> {
    if (!this.ocrInitialized || !window.Tesseract) {
      throw new Error('OCR.js not initialized');
    }

    // Update memory pressure before processing
    this.updateMemoryPressure();

    try {
      const { recognize } = window.Tesseract;
      
      // Apply LOD-based OCR optimization
      const ocrOptions = this.getOCROptionsForLOD();
      
      const result = await recognize(imageData, options.language || 'eng', {
        logger: (m: any) => console.log(`OCR [${this.currentLODLevel}]:`, m),
        ...ocrOptions
      });

      const ocrResult: OCRResult = {
        text: result.data.text,
        confidence: result.data.confidence,
        boundingBoxes: result.data.words.map((word: any) => ({
          text: word.text,
          bbox: word.bbox,
          confidence: word.confidence
        }))
      };

      console.log('📝 OCR completed:', {
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
        wordsFound: ocrResult.boundingBoxes.length
      });

      return ocrResult;

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }

  private getOCROptionsForLOD(): any {
    // Use gaming memory architecture to optimize OCR based on current LOD level
    switch (this.currentLODLevel) {
      case 'low':
        // 8-bit NES level optimization
        return {
          psm: GAMING_ERA_SPECS['8bit'].memoryArchitecture?.autoEncoderCache ? 3 : 8,
          oem: 1, // Original tesseract only
          tessjs_create_pdf: false,
          tessjs_create_hocr: false,
          tessjs_create_tsv: false
        };
        
      case 'medium':
        // 16-bit SNES level optimization  
        return {
          psm: GAMING_ERA_SPECS['16bit'].memoryArchitecture?.lodScalingBuffer ? 6 : 8,
          oem: 2, // LSTM + Original tesseract
          tessjs_create_pdf: false,
          tessjs_create_hocr: true,
          tessjs_create_tsv: false
        };
        
      case 'high':
        // N64 level optimization with DNN LOD system
        return {
          psm: GAMING_ERA_SPECS.n64.dnnLodSystem?.enabled ? 11 : 13,
          oem: 3, // Default tesseract (best quality)
          tessjs_create_pdf: true,
          tessjs_create_hocr: true,
          tessjs_create_tsv: true
        };
        
      default:
        return {};
    }
  }

  private async selectOptimalModel(): Promise<{
    model: string;
    fallback: string[];
    useCrewAI: boolean;
    parallelism: number;
    cacheSize: number;
  }> {
    try {
      // Check Ollama GPU memory availability and status
      const ollamaStatus = await fetch('/api/ai/status', { 
        signal: AbortSignal.timeout(3000) 
      });
      const statusData = await ollamaStatus.json();
      
      // Smart fallback to Gemma 270MB for OOM prevention and better UX
      const isGPUBusy = statusData.gpu_busy || statusData.models_loading > 0;
      const isGPURecognized = statusData.gpu_detected && statusData.gpu_memory_total > 0;
      const availableMemory = statusData.gpu_memory_available || 0;
      
      // Prioritize Gemma 270MB when GPU isn't recognized or is busy
      if (!isGPURecognized || isGPUBusy || availableMemory < 512) {
        console.log('🎮 GPU not recognized/busy, using Gemma 270MB for optimal UX');
        return {
          model: 'gemma:270m',                // Gemma 270MB fits in cache + parallelism
          fallback: ['nomic-embed-text', 'client-autogen'],
          useCrewAI: false,
          parallelism: 4,                     // 4 parallel requests to prevent OOM
          cacheSize: 128                      // 128MB cache for fast responses
        };
      }
      
      // Determine model based on available GPU memory
      if (availableMemory > 2048) { // 2GB+ GPU memory
        return {
          model: 'gemma3:legal-latest',       // Primary: Gemma 3 legal for best quality
          fallback: ['gemma:270m', 'nomic-embed-text'],
          useCrewAI: false,
          parallelism: 8,                     // High parallelism for powerful GPU
          cacheSize: 512                      // Large cache for complex models
        };
      } else if (availableMemory > 1024) { // 1GB+ GPU memory
        return {
          model: 'gemma:270m',                // Gemma 270MB optimal for this range
          fallback: ['nomic-embed-text'],
          useCrewAI: false,
          parallelism: 6,                     // Balanced parallelism
          cacheSize: 256                      // Medium cache size
        };
      } else if (availableMemory > 512) { // 512MB+ GPU memory
        return {
          model: 'gemma:270m',                // Still use 270MB - it fits with cache
          fallback: ['nomic-embed-text', 'client-autogen'],
          useCrewAI: false,
          parallelism: 3,                     // Conservative parallelism
          cacheSize: 128                      // Smaller cache to prevent OOM
        };
      } else {
        // Very low GPU memory - use lightweight model with CrewAI fallback
        return {
          model: 'nomic-embed-text',          // Lightweight model
          fallback: ['client-autogen'],
          useCrewAI: true,
          parallelism: 2,                     // Minimal parallelism
          cacheSize: 64                       // Small cache
        };
      }
    } catch (error) {
      console.warn('Failed to check Ollama status, using Gemma 270MB fallback:', error);
      // Always fallback to Gemma 270MB - reliable and fits in memory
      return {
        model: 'gemma:270m',                  // Safe default - fits in cache with parallelism
        fallback: ['nomic-embed-text', 'client-autogen'],
        useCrewAI: true,
        parallelism: 4,                       // Safe parallelism level
        cacheSize: 128                        // Safe cache size for 270MB model
      };
    }
  }

  private async generateEmbeddings(text: string): Promise<{
    embeddings: Float32Array;
    fromCache: boolean;
    model: string;
  }> {
    try {
      // Intelligent model selection based on Ollama GPU memory and system state
      const modelConfig = await this.selectOptimalModel();
      
      const response = await fetch('/api/ai/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model: modelConfig.model,
          source: 'ocr',
          save: false,
          fallback: modelConfig.fallback,
          crewai_enabled: modelConfig.useCrewAI,
          // OOM prevention and UX optimization
          parallelism: modelConfig.parallelism,
          cache_size_mb: modelConfig.cacheSize,
          prevent_oom: true,
          gpu_fallback_strategy: 'gemma270m'  // Always fallback to 270MB for stability
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        embeddings: new Float32Array(data.embedding),
        fromCache: data.fromCache || false,
        model: data.model
      };

    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  private async processTensors(embeddings: Float32Array): Promise<TensorData> {
    if (!this.webgpuDevice) {
      // Fallback to CPU processing
      return {
        embeddings,
        dimensions: embeddings.length,
        metadata: {
          source: 'ocr',
          processed_at: Date.now(),
          tensor_id: `tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          confidence: 0.8
        }
      };
    }

    try {
      // Get SIMD parsing shader
      const simdShader = await shaderCacheManager.createTensorShader('simd_parse', embeddings.length);
      
      // Create input buffer
      const inputBuffer = this.webgpuDevice.createBuffer({
        size: embeddings.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });

      this.webgpuDevice.queue.writeBuffer(inputBuffer, 0, embeddings.buffer);

      // Execute SIMD processing
      const outputBuffer = await shaderCacheManager.executeTensorOperation(
        simdShader,
        [inputBuffer],
        embeddings.byteLength
      );

      // Read results back
      const resultBuffer = this.webgpuDevice.createBuffer({
        size: embeddings.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      const commandEncoder = this.webgpuDevice.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(outputBuffer, 0, resultBuffer, 0, embeddings.byteLength);
      this.webgpuDevice.queue.submit([commandEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const processedData = new Float32Array(resultBuffer.getMappedRange());
      resultBuffer.unmap();

      return {
        embeddings: processedData.slice(),
        dimensions: processedData.length,
        metadata: {
          source: 'ocr',
          processed_at: Date.now(),
          tensor_id: `tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          confidence: 0.9
        }
      };

    } catch (error) {
      console.warn('WebGPU tensor processing failed, using CPU fallback:', error);
      
      return {
        embeddings,
        dimensions: embeddings.length,
        metadata: {
          source: 'ocr',
          processed_at: Date.now(),
          tensor_id: `tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          confidence: 0.8
        }
      };
    }
  }

  private async createSearchIndex(tensorData: TensorData): Promise<Float32Array> {
    // Create quantized search index for Fuse.js client-side search
    const quantized = new Float32Array(Math.ceil(tensorData.dimensions / 4));
    
    for (let i = 0; i < quantized.length; i++) {
      const baseIdx = i * 4;
      let sum = 0;
      
      for (let j = 0; j < 4 && baseIdx + j < tensorData.embeddings.length; j++) {
        sum += tensorData.embeddings[baseIdx + j];
      }
      
      quantized[i] = sum / 4; // Average pooling for dimension reduction
    }
    
    return quantized;
  }

  /**
   * Asynchronous batch processing with intelligent scheduling
   */
  async batchProcessImages(
    images: Array<ImageData | HTMLCanvasElement | File>,
    options: any = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    // Adaptive chunk size based on LOD level and memory pressure
    const chunkSize = this.getOptimalChunkSize();
    
    // Create processing queue with priority scheduling
    const processingQueue: Array<{
      image: ImageData | HTMLCanvasElement | File;
      priority: number;
      options: any;
    }> = images.map((image, index) => ({
      image,
      priority: this.calculateProcessingPriority(image, index),
      options
    }));

    // Sort by priority (higher priority first)
    processingQueue.sort((a, b) => b.priority - a.priority);

    // Process asynchronously with Web Workers when available
    for (let i = 0; i < processingQueue.length; i += chunkSize) {
      const chunk = processingQueue.slice(i, i + chunkSize);
      
      // Asynchronous processing with Promise.allSettled for error resilience
      const chunkPromises = chunk.map(async (item) => {
        try {
          return await this.processImageAsync(item.image, item.options);
        } catch (error) {
          console.warn(`Failed to process image ${i}:`, error);
          return null;
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Extract successful results
      const successfulResults = chunkResults
        .filter((result): result is PromiseFulfilledResult<ProcessingResult | null> => 
          result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value!);

      results.push(...successfulResults);
      
      // Adaptive delay based on memory pressure and system load
      const delay = this.calculateAdaptiveDelay();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Update memory pressure after each chunk
      this.updateMemoryPressure();
    }
    
    return results;
  }

  /**
   * Asynchronous single image processing with Web Workers
   */
  private async processImageAsync(
    imageData: ImageData | HTMLCanvasElement | File,
    options: any = {}
  ): Promise<ProcessingResult> {
    // Try Web Worker processing for better performance
    if (this.worker && 'transferControlToOffscreen' in HTMLCanvasElement.prototype) {
      try {
        return await this.processImageInWorker(imageData, options);
      } catch (error) {
        console.warn('Web Worker processing failed, falling back to main thread:', error);
      }
    }

    // Fallback to main thread processing
    return await this.processImage(imageData, options);
  }

  /**
   * Process image in Web Worker for non-blocking execution
   */
  private async processImageInWorker(
    imageData: ImageData | HTMLCanvasElement | File,
    options: any
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker not available'));
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'ocr-result') {
          this.worker!.removeEventListener('message', messageHandler);
          resolve(event.data.result);
        } else if (event.data.type === 'ocr-error') {
          this.worker!.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      // Send processing task to worker
      this.worker.postMessage({
        type: 'process-ocr',
        imageData,
        options,
        lodLevel: this.currentLODLevel,
        memoryPressure: this.memoryPressure
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.worker!.removeEventListener('message', messageHandler);
        reject(new Error('OCR processing timeout'));
      }, 30000);
    });
  }

  private getOptimalChunkSize(): number {
    // Adaptive chunk size based on gaming memory architecture
    switch (this.currentLODLevel) {
      case 'low':
        return GAMING_ERA_SPECS['8bit'].memoryArchitecture?.autoEncoderCache ? 1 : 2;
      case 'medium':
        return GAMING_ERA_SPECS['16bit'].memoryArchitecture?.lodScalingBuffer ? 3 : 4;
      case 'high':
        return GAMING_ERA_SPECS.n64.dnnLodSystem?.enabled ? 6 : 8;
      default:
        return 3;
    }
  }

  private calculateProcessingPriority(
    image: ImageData | HTMLCanvasElement | File,
    index: number
  ): number {
    let priority = 1.0;

    // Boost priority for legal documents (larger files typically)
    if (image instanceof File) {
      if (image.size > 1024 * 1024) priority += 0.5; // Large files (>1MB)
      if (image.type.includes('pdf')) priority += 0.3; // PDF documents
      if (image.name.toLowerCase().includes('legal')) priority += 0.4; // Legal documents
    }

    // Process smaller images first for better user experience
    if (image instanceof ImageData) {
      const pixels = image.width * image.height;
      if (pixels < 300000) priority += 0.2; // Small images (<300K pixels)
    }

    // Slight preference for earlier items in the queue
    priority += (1.0 / (index + 1)) * 0.1;

    return priority;
  }

  private calculateAdaptiveDelay(): number {
    // Calculate delay based on memory pressure and system load
    if (this.memoryPressure > ENHANCED_MEMORY_CACHING.performance.adaptiveTuning.thresholds.criticalMemory) {
      return 1000; // 1 second delay under critical memory pressure
    } else if (this.memoryPressure > ENHANCED_MEMORY_CACHING.performance.adaptiveTuning.thresholds.lowMemory) {
      return 500;  // 500ms delay under moderate memory pressure
    } else {
      return 100;  // 100ms delay under normal conditions
    }
  }

  /**
   * Store results in database via Node API
   */
  async storeResults(results: ProcessingResult[], metadata: any = {}): Promise<void> {
    try {
      const response = await fetch('/api/tensor/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: results.map(r => ({
            text: r.ocr.text,
            embeddings: Array.from(r.embeddings.embeddings),
            dimensions: r.embeddings.dimensions,
            confidence: r.ocr.confidence,
            tensor_id: r.embeddings.metadata.tensor_id,
            search_index: Array.from(r.searchIndex)
          })),
          metadata: {
            ...metadata,
            processed_at: Date.now(),
            batch_size: results.length
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Storage API failed: ${response.status}`);
      }

      console.log('✅ Results stored successfully');

    } catch (error) {
      console.error('Failed to store results:', error);
      throw error;
    }
  }

  dispose(): void {
    this.worker?.terminate();
    shaderCacheManager.dispose();
  }
}

// Singleton instance
export const ocrTensorProcessor = new OCRTensorProcessor();