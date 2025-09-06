
/**
 * SIMD-Optimized JSON Parser for Legal Documents
 * Uses typed arrays and vectorized operations for high-performance parsing
 */

export interface SIMDParseOptions {
  batchSize?: number;
  enableSIMD?: boolean;
  memoryLimit?: number;
  parallelChunks?: number;
  validateStructure?: boolean;
}

export interface ParsedLegalDocument {
  id: string;
  caseNumber?: string;
  documentType: string;
  content: string;
  metadata: Record<string, any>;
  embeddings?: Float32Array;
  chunks?: TextChunk[];
  parseTime: number;
  size: number;
}

export interface TextChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  embedding?: Float32Array;
  metadata?: Record<string, any>;
}

export class SIMDJSONParser {
  private batchSize: number;
  private enableSIMD: boolean;
  private memoryLimit: number;
  private parallelChunks: number;
  private validateStructure: boolean;

  // SIMD-style buffers using typed arrays
  private textBuffer: Uint8Array;
  private chunkIndices: Uint32Array;
  private embeddingBuffer: Float32Array;

  constructor(options: SIMDParseOptions = {}) {
    this.batchSize = options.batchSize || 1024;
    this.enableSIMD = options.enableSIMD ?? true;
    this.memoryLimit = options.memoryLimit || 512 * 1024 * 1024; // 512MB
    this.parallelChunks = options.parallelChunks || 4;
    this.validateStructure = options.validateStructure ?? true;

    // Initialize SIMD buffers
    this.initializeSIMDBuffers();
  }

  /**
   * Initialize typed array buffers for SIMD-style operations
   */
  private initializeSIMDBuffers(): void {
    // Allocate buffers based on memory limit
    const textBufferSize = Math.floor(this.memoryLimit * 0.6); // 60% for text
    const embeddingBufferSize = Math.floor((this.memoryLimit * 0.3) / 4); // 30% for embeddings (float32)
    const indexBufferSize = Math.floor((this.memoryLimit * 0.1) / 4); // 10% for indices

    this.textBuffer = new Uint8Array(textBufferSize);
    this.embeddingBuffer = new Float32Array(embeddingBufferSize);
    this.chunkIndices = new Uint32Array(indexBufferSize);

    console.log(
      `🧠 SIMD buffers initialized: ${textBufferSize} text, ${embeddingBufferSize * 4} embeddings, ${indexBufferSize * 4} indices`
    );
  }

  /**
   * Parse multiple legal documents with SIMD optimization
   */
  async parseDocumentsBatch(
    jsonStrings: string[]
  ): Promise<ParsedLegalDocument[]> {
    const startTime = performance.now();

    if (!this.enableSIMD || jsonStrings.length < this.parallelChunks) {
      // Fallback to sequential parsing for small batches
      return Promise.all(jsonStrings.map((json) => this.parseDocument(json)));
    }

    // Split into chunks for parallel processing
    const chunks = this.createParallelChunks(jsonStrings);
    const results: ParsedLegalDocument[] = [];

    // Process chunks in parallel using Promise.all
    const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
      return this.processChunkSIMD(chunk, chunkIndex);
    });

    const chunkResults = await Promise.all(chunkPromises);

    // Flatten results
    for (const chunkResult of chunkResults) {
      results.push(...chunkResult);
    }

    const parseTime = performance.now() - startTime;
    console.log(
      `⚡ SIMD batch parsing completed: ${results.length} documents in ${parseTime.toFixed(2)}ms`
    );

    return results;
  }

  /**
   * Parse a single legal document with optimization
   */
  async parseDocument(jsonString: string): Promise<ParsedLegalDocument> {
    const startTime = performance.now();

    try {
      // Fast path: try native JSON.parse first
      const rawData = JSON.parse(jsonString);

      // Enhanced parsing with SIMD-style text processing
      const document = await this.enhancedDocumentParsing(rawData, jsonString);

      document.parseTime = performance.now() - startTime;
      document.size = jsonString.length;

      return document;
    } catch (error: any) {
      console.error("📄 JSON parsing failed:", error);

      // Fallback to tolerant parsing
      return this.tolerantParse(jsonString, startTime);
    }
  }

  /**
   * Enhanced document parsing with SIMD-style text processing
   */
  private async enhancedDocumentParsing(
    rawData: any,
    jsonString: string
  ): Promise<ParsedLegalDocument> {
    const document: ParsedLegalDocument = {
      id:
        rawData.id ||
        `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caseNumber: rawData.case_number || rawData.caseNumber,
      documentType: rawData.document_type || rawData.type || "legal_document",
      content: rawData.content || rawData.text || "",
      metadata: rawData.metadata || {},
      parseTime: 0,
      size: 0,
    };

    // SIMD-style text chunking using typed arrays
    if (document.content && this.enableSIMD) {
      document.chunks = await this.simdTextChunking(document.content);
    }

    // Process embeddings if present
    if (rawData.embeddings || rawData.embedding) {
      document.embeddings = this.processSIMDEmbeddings(
        rawData.embeddings || rawData.embedding
      );
    }

    return document;
  }

  /**
   * SIMD-style text chunking using typed arrays and vectorized operations
   */
  private async simdTextChunking(text: string): Promise<TextChunk[]> {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);

    // Copy to our SIMD buffer if it fits
    if (textBytes.length <= this.textBuffer.length) {
      this.textBuffer.set(textBytes);
      return this.vectorizedChunking(textBytes, text);
    } else {
      // Process in streaming chunks
      return this.streamingChunking(text);
    }
  }

  /**
   * Vectorized chunking using SIMD-style operations
   */
  private vectorizedChunking(
    textBytes: Uint8Array,
    originalText: string
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const chunkSize = 1000; // Characters per chunk
    const overlap = 200; // Overlap between chunks

    // Find sentence boundaries using vectorized search
    const sentenceBoundaries = this.findSentenceBoundariesSIMD(textBytes);

    let chunkStart = 0;
    let chunkIndex = 0;

    while (chunkStart < originalText.length) {
      const idealEnd = chunkStart + chunkSize;

      // Find the best sentence boundary near the ideal end
      let chunkEnd = Math.min(idealEnd, originalText.length);

      // Look for sentence boundary within reasonable range
      for (const boundary of sentenceBoundaries) {
        if (boundary >= idealEnd - 100 && boundary <= idealEnd + 100) {
          chunkEnd = boundary;
          break;
        }
      }

      const chunkText = originalText.substring(chunkStart, chunkEnd);

      if (chunkText.trim().length > 0) {
        chunks.push({
          id: `chunk_${chunkIndex}`,
          text: chunkText,
          startIndex: chunkStart,
          endIndex: chunkEnd,
          metadata: {
            index: chunkIndex,
            wordCount: chunkText.split(/\s+/).length,
            charCount: chunkText.length,
          },
        });
      }

      chunkStart = chunkEnd - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Find sentence boundaries using SIMD-style vectorized search
   */
  private findSentenceBoundariesSIMD(textBytes: Uint8Array): number[] {
    const boundaries: number[] = [];
    const sentenceEnders = [46, 33, 63]; // . ! ?
    const decoder = new TextDecoder();

    // Vectorized search for sentence endings
    for (let i = 0; i < textBytes.length - 1; i++) {
      const byte = textBytes[i];
      const nextByte = textBytes[i + 1];

      // Check if current byte is a sentence ender
      if (sentenceEnders.includes(byte)) {
        // Check if followed by space or newline
        if (nextByte === 32 || nextByte === 10) {
          // space or newline
          boundaries.push(i + 1);
        }
      }
    }

    return boundaries;
  }

  /**
   * Streaming chunking for large documents
   */
  private async streamingChunking(text: string): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    const chunkSize = 1000;
    const overlap = 200;

    let chunkIndex = 0;
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      const chunkText = text.substring(position, end);

      chunks.push({
        id: `stream_chunk_${chunkIndex}`,
        text: chunkText,
        startIndex: position,
        endIndex: end,
        metadata: {
          streamChunk: true,
          index: chunkIndex,
        },
      });

      position = end - overlap;
      chunkIndex++;

      // Yield control periodically for large documents
      if (chunkIndex % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return chunks;
  }

  /**
   * Process embeddings using SIMD-style operations
   */
  private processSIMDEmbeddings(embeddingData: any): Float32Array {
    if (Array.isArray(embeddingData)) {
      // Convert array to Float32Array for SIMD operations
      const embeddings = new Float32Array(embeddingData.length);

      // Vectorized copy (browser engines optimize this)
      for (let i = 0; i < embeddingData.length; i++) {
        embeddings[i] = Number(embeddingData[i]) || 0;
      }

      // Normalize using SIMD-style operations
      return this.normalizeEmbeddingSIMD(embeddings);
    }

    return new Float32Array(0);
  }

  /**
   * Normalize embedding vector using SIMD-style operations
   */
  private normalizeEmbeddingSIMD(embeddings: Float32Array): Float32Array {
    // Calculate magnitude using vectorized operations
    let magnitudeSquared = 0;

    // Unrolled loop for better vectorization
    let i = 0;
    const len = embeddings.length;

    for (; i < len - 3; i += 4) {
      const a = embeddings[i];
      const b = embeddings[i + 1];
      const c = embeddings[i + 2];
      const d = embeddings[i + 3];
      magnitudeSquared += a * a + b * b + c * c + d * d;
    }

    // Handle remaining elements
    for (; i < len; i++) {
      magnitudeSquared += embeddings[i] * embeddings[i];
    }

    const magnitude = Math.sqrt(magnitudeSquared);

    if (magnitude > 0) {
      // Vectorized normalization
      for (let i = 0; i < embeddings.length; i++) {
        embeddings[i] /= magnitude;
      }
    }

    return embeddings;
  }

  /**
   * Create parallel chunks for SIMD processing
   */
  private createParallelChunks(jsonStrings: string[]): string[][] {
    const chunkSize = Math.ceil(jsonStrings.length / this.parallelChunks);
    const chunks: string[][] = [];

    for (let i = 0; i < jsonStrings.length; i += chunkSize) {
      chunks.push(jsonStrings.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Process a chunk using SIMD optimizations
   */
  private async processChunkSIMD(
    chunk: string[],
    chunkIndex: number
  ): Promise<ParsedLegalDocument[]> {
    const results: ParsedLegalDocument[] = [];

    for (const jsonString of chunk) {
      const document = await this.parseDocument(jsonString);
      results.push(document);
    }

    return results;
  }

  /**
   * Tolerant parsing for malformed JSON
   */
  private tolerantParse(
    jsonString: string,
    startTime: number
  ): ParsedLegalDocument {
    console.warn("📝 Using tolerant parsing for malformed JSON");

    // Extract what we can using regex patterns
    const contentMatch = jsonString.match(/"content"\s*:\s*"([^"]+)"/);
    const typeMatch = jsonString.match(/"type"\s*:\s*"([^"]+)"/);
    const idMatch = jsonString.match(/"id"\s*:\s*"([^"]+)"/);

    return {
      id: idMatch?.[1] || `fallback_${Date.now()}`,
      documentType: typeMatch?.[1] || "unknown",
      content: contentMatch?.[1] || "",
      metadata: { parsedWithFallback: true },
      parseTime: performance.now() - startTime,
      size: jsonString.length,
    };
  }

  /**
   * Get parser statistics
   */
  getStats() {
    return {
      bufferSizes: {
        text: this.textBuffer.length,
        embeddings: this.embeddingBuffer.length,
        indices: this.chunkIndices.length,
      },
      configuration: {
        batchSize: this.batchSize,
        enableSIMD: this.enableSIMD,
        memoryLimit: this.memoryLimit,
        parallelChunks: this.parallelChunks,
      },
    };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Clear typed arrays (garbage collector will handle the rest)
    this.textBuffer.fill(0);
    this.embeddingBuffer.fill(0);
    this.chunkIndices.fill(0);
  }
}

// Export singleton instance for easy use
export const simdParser = new SIMDJSONParser({
  batchSize: 1024,
  enableSIMD: true,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  parallelChunks: 4,
  validateStructure: true,
});
