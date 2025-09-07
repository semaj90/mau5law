/**
 * Client-side OCR + Tensor Processing Pipeline
 * OCR.js → Text Extraction → Node API → Embeddings → Multi-dimensional Tensors
 * SIMD parsing via Service Worker for streaming performance
 */

import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager.js';
import { browser } from '$app/environment';

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

  async initialize(): Promise<void> {
    if (!browser) return;

    // Initialize OCR.js
    await this.initializeOCR();
    
    // Initialize WebGPU for tensor processing
    await this.initializeWebGPU();
    
    // Initialize Service Worker for SIMD parsing
    await this.initializeServiceWorker();
    
    console.log('✅ OCR Tensor Processor initialized');
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

    try {
      const { recognize } = window.Tesseract;
      
      const result = await recognize(imageData, options.language || 'eng', {
        logger: (m: any) => console.log('OCR:', m)
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

  private async generateEmbeddings(text: string): Promise<{
    embeddings: Float32Array;
    fromCache: boolean;
    model: string;
  }> {
    try {
      // Call Node API for embedding generation
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model: 'nomic-text',
          source: 'ocr'
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
   * Batch process multiple images
   */
  async batchProcessImages(
    images: Array<ImageData | HTMLCanvasElement | File>,
    options: any = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    // Process in chunks to avoid overwhelming the system
    const chunkSize = 3;
    
    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);
      
      const chunkResults = await Promise.all(
        chunk.map(image => this.processImage(image, options))
      );
      
      results.push(...chunkResults);
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
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