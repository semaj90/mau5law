// WASM + Web Worker embeddings preprocessing
// Uses WebAssembly for high-performance text preprocessing and embeddings generation
import type { EmbeddingRequest, EmbeddingResponse, BatchEmbeddingRequest } from '../types/embeddings';
// WASM module interface
interface WASMEmbeddings {
  memory: WebAssembly.Memory;
  preprocess_text: (textPtr: number, textLen: number) => number;
  generate_embeddings: (preprocessedPtr: number, modelPtr: number) => number;
  get_embedding_dim: () => number;
  cleanup: (ptr: number) => void;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
}
class EmbeddingsWorker {
  private wasmModule: WASMEmbeddings | null = null;
  private isInitialized = false;
  private embeddingDim = 768; // Default for most models
  async initialize() {
    try {
      // Load WASM module
      const wasmResponse = await fetch('/wasm/embeddings.wasm');
      const wasmBytes = await wasmResponse.arrayBuffer();
      const wasmModule = await WebAssembly.instantiate(wasmBytes, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
          __linear_memory_base: 0,
          __table_base: 0,
          abort: () => { throw new Error('WASM abort'); },
          _emscripten_memcpy_big: (dest: number, src: number, num: number) => {
            const memory = new Uint8Array(this.wasmModule!.memory.buffer);
            memory.copyWithin(dest, src, src + num);
          }
        }
      });
      this.wasmModule = wasmModule.instance.exports as WASMEmbeddings;
      this.embeddingDim = this.wasmModule.get_embedding_dim();
      this.isInitialized = true;
      console.log('✅ WASM Embeddings module initialized');
      console.log(`📏 Embedding dimension: ${this.embeddingDim}`);
    } catch (error) {
      console.error('❌ Failed to initialize WASM module:', error);
      throw error;
    }
  }
  private copyStringToWasm(text: string): { ptr: number; length: number } {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const ptr = this.wasmModule.malloc(bytes.length);
    const memory = new Uint8Array(this.wasmModule.memory.buffer);
    memory.set(bytes, ptr);
    return { ptr, length: bytes.length }
  }
  private readFloatArrayFromWasm(ptr: number, length: number): Float32Array {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    const memory = new Float32Array(this.wasmModule.memory.buffer);
    return memory.slice(ptr / 4, ptr / 4 + length);
  }
  async generateEmbedding(text: string): Promise<Float32Array> {
    if (!this.isInitialized || !this.wasmModule) {
      throw new Error('WASM module not initialized');
    }
    try {
      // Copy text to WASM memory
      const { ptr: textPtr, length: textLen } = this.copyStringToWasm(text);
      // Preprocess text
      const preprocessedPtr = this.wasmModule.preprocess_text(textPtr, textLen);
      if (preprocessedPtr === 0) {
        throw new Error('Text preprocessing failed');
      }
      // Generate embeddings
      const embeddingPtr = this.wasmModule.generate_embeddings(preprocessedPtr, 0);
      if (embeddingPtr === 0) {
        throw new Error('Embedding generation failed');
      }
      // Read embeddings from WASM memory
      const embeddings = this.readFloatArrayFromWasm(embeddingPtr, this.embeddingDim);
      const result = new Float32Array(embeddings);
      // Cleanup WASM memory
      this.wasmModule.free(textPtr);
      this.wasmModule.cleanup(preprocessedPtr);
      this.wasmModule.cleanup(embeddingPtr);
      return result;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }
  async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        results.push(embedding);
      } catch (error) {
        console.warn(`⚠️ Failed to generate embedding for text: ${text.substring(0, 50)}...`);
        // Return zero vector on failure
        results.push(new Float32Array(this.embeddingDim);
      }
    }
    return results;
  }
  async preprocessTextForVector(text: string): Promise<{,
    cleanText: string;
    tokens: string[];
    metadata: {
      originalLength: number;
      cleanedLength: number;
      tokenCount: number;
      hasSpecialChars: boolean;
    }
  }> {
    if (!this.isInitialized || !this.wasmModule) {
      throw new Error('WASM module not initialized');
    }
    try {
      const { ptr: textPtr, length: textLen } = this.copyStringToWasm(text);
      const preprocessedPtr = this.wasmModule.preprocess_text(textPtr, textLen);
      // Read preprocessed data (implementation would depend on WASM module)
      const memory = new Uint8Array(this.wasmModule.memory.buffer);
      const decoder = new TextDecoder();
      // This is a simplified version - actual implementation would read structured data
      const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = cleanText.split(' ').filter(token => token.length > 0);
      // Cleanup
      this.wasmModule.free(textPtr);
      this.wasmModule.cleanup(preprocessedPtr);
      return {
        cleanText,
        tokens,
        metadata: {
          originalLength: text.length,
          cleanedLength: cleanText.length,
          tokenCount: tokens.length,
          hasSpecialChars: /[^\w\s]/.test(text)
        }
      }
    } catch (error) {
      console.error('❌ Text preprocessing failed:', error);
      throw error;
    }
  }
}
// Worker instance
const embeddingsWorker = new EmbeddingsWorker();
// Message handler
self.addEventListener('message', async (event) => {
  const { type, id, data } = event.data;
  try {
    switch (type) {
      case 'initialize':
        await embeddingsWorker.initialize();
        self.postMessage({ type: 'initialized', id, success: true });
        break;
      case 'generate_embedding':
        const { text } = data as EmbeddingRequest;
        const embedding = await embeddingsWorker.generateEmbedding(text);
        const response: EmbeddingResponse = {
          embedding: Array.from(embedding),
          dimension: embedding.length,
          processingTime: performance.now() - (data.startTime || 0)
        }
        self.postMessage({ type: 'embedding_result', id, data: response });
        break;
      case 'generate_batch_embeddings':
        const { texts } = data as BatchEmbeddingRequest;
        const embeddings = await embeddingsWorker.generateBatchEmbeddings(texts);
        const batchResponse = {
          embeddings: embeddings.map(emb => Array.from(emb)),
          count: embeddings.length,
          dimension: embeddings[0]?.length || 0,
          processingTime: performance.now() - (data.startTime || 0)
        }
        self.postMessage({ type: 'batch_embedding_result', id, data: batchResponse });
        break;
      case 'preprocess_text':
        const preprocessResult = await embeddingsWorker.preprocessTextForVector(data.text);
        self.postMessage({ type: 'preprocess_result', id, data: preprocessResult });
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('❌ Worker error:', error);
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message: 'Unknown error'
    });
  }
});
// Health check
self.addEventListener('message', (event) => {
  if (event.data.type === 'ping') {
    self.postMessage({ type: 'pong', timestamp: Date.now() });
  }
});
export {}