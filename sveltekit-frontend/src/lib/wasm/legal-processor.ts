/*
 * WebAssembly Legal Document Processor
 * High-performance client-side document analysis
 */

// WASM interface types
interface WasmModule {
  extract_pdf_text(buffer: Uint8Array): string;
  analyze_legal_document(text: string): string;
  calculate_text_similarity(text1: string, text2: string): number;
  generate_document_fingerprint(text: string): Uint8Array;
  detect_legal_entities(text: string): string;
  classify_document_type(text: string): string;
  extract_legal_citations(text: string): string;
  calculate_readability_score(text: string): number;
  detect_sensitive_information(text: string): string;
  compress_document_features(features: Uint8Array): Uint8Array;
  memory: WebAssembly.Memory;
}

interface ProcessingResult {
  text: string;
  documentType: string;
  legalEntities: LegalEntity[];
  citations: LegalCitation[];
  sensitiveInfo: SensitiveInfo[];
  fingerprint: string;
  similarity?: number;
  readabilityScore: number;
  processingTime: number;
}

interface LegalEntity {
  type: 'person' | 'organization' | 'location' | 'legal_concept';
  text: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
}

interface LegalCitation {
  type: 'case' | 'statute' | 'regulation' | 'rule';
  citation: string;
  jurisdiction: string;
  year?: number;
  relevance: number;
}

interface SensitiveInfo {
  type: 'ssn' | 'credit_card' | 'phone' | 'email' | 'address' | 'account_number';
  value: string;
  masked: string;
  confidence: number;
  location: { start: number; end: number };
}

// WebAssembly Legal Processor Class
export class WasmLegalProcessor {
  private wasmModule: WasmModule | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In production, load actual WASM module
      // For demo, we'll simulate the WASM interface
      this.wasmModule = await this.createMockWasmModule();
      this.isInitialized = true;
      console.log('✅ WebAssembly Legal Processor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WASM processor:', error);
      throw error;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  // Process document with full analysis pipeline
  async processDocument(file: File): Promise<ProcessingResult> {
    await this.ensureInitialized();

    const startTime = performance.now();

    try {
      // 1. Extract text content
      const buffer = new Uint8Array(await file.arrayBuffer());
      const extractedText = this.wasmModule!.extract_pdf_text(buffer);

      // 2. Classify document type
      const documentType = this.wasmModule!.classify_document_type(extractedText);

      // 3. Extract legal entities
      const entitiesJson = this.wasmModule!.detect_legal_entities(extractedText);
      const legalEntities = JSON.parse(entitiesJson) as LegalEntity[];

      // 4. Find legal citations
      const citationsJson = this.wasmModule!.extract_legal_citations(extractedText);
      const citations = JSON.parse(citationsJson) as LegalCitation[];

      // 5. Detect sensitive information
      const sensitiveJson = this.wasmModule!.detect_sensitive_information(extractedText);
      const sensitiveInfo = JSON.parse(sensitiveJson) as SensitiveInfo[];

      // 6. Generate document fingerprint
      const fingerprintBuffer = this.wasmModule!.generate_document_fingerprint(extractedText);
      const fingerprint = this.bufferToHex(fingerprintBuffer);

      // 7. Calculate readability score
      const readabilityScore = this.wasmModule!.calculate_readability_score(extractedText);

      const processingTime = performance.now() - startTime;

      return {
        text: extractedText,
        documentType,
        legalEntities,
        citations,
        sensitiveInfo,
        fingerprint,
        readabilityScore,
        processingTime
      };

    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error(`WASM processing failed: ${error}`);
    }
  }

  // Calculate similarity between two documents
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    await this.ensureInitialized();
    return this.wasmModule!.calculate_text_similarity(text1, text2);
  }

  // Batch process multiple documents
  async batchProcess(files: File[]): Promise<ProcessingResult[]> {
    await this.ensureInitialized();

    const results: ProcessingResult[] = [];

    // Process documents in parallel with Web Workers simulation
    const promises = files.map(file => this.processDocument(file));
    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Failed to process ${files[index].name}:`, result.reason);
        // Add error result
        results.push({
          text: '',
          documentType: 'error',
          legalEntities: [],
          citations: [],
          sensitiveInfo: [],
          fingerprint: '',
          readabilityScore: 0,
          processingTime: 0
        });
      }
    });

    return results;
  }

  // Real-time text analysis as user types
  async analyzeTextRealtime(text: string): Promise<{
    entities: LegalEntity[];
    citations: LegalCitation[];
    documentType: string;
    readability: number;
  }> {
    await this.ensureInitialized();

    if (text.length < 50) {
      return {
        entities: [],
        citations: [],
        documentType: 'fragment',
        readability: 0
      };
    }

    const entitiesJson = this.wasmModule!.detect_legal_entities(text);
    const citationsJson = this.wasmModule!.extract_legal_citations(text);
    const documentType = this.wasmModule!.classify_document_type(text);
    const readability = this.wasmModule!.calculate_readability_score(text);

    return {
      entities: JSON.parse(entitiesJson),
      citations: JSON.parse(citationsJson),
      documentType,
      readability
    };
  }

  // Generate document comparison report
  async compareDocuments(doc1: ProcessingResult, doc2: ProcessingResult): Promise<{
    similarity: number;
    commonEntities: LegalEntity[];
    commonCitations: LegalCitation[];
    uniqueToDoc1: string[];
    uniqueToDoc2: string[];
    fingerprintMatch: boolean;
  }> {
    await this.ensureInitialized();

    const similarity = await this.calculateSimilarity(doc1.text, doc2.text);

    // Find common entities
    const commonEntities = doc1.legalEntities.filter(e1 =>
      doc2.legalEntities.some(e2 =>
        e1.text.toLowerCase() === e2.text.toLowerCase() && e1.type === e2.type
      )
    );

    // Find common citations
    const commonCitations = doc1.citations.filter(c1 =>
      doc2.citations.some(c2 => c1.citation === c2.citation)
    );

    // Find unique content
    const doc1Entities = new Set(doc1.legalEntities.map(e => e.text.toLowerCase()));
    const doc2Entities = new Set(doc2.legalEntities.map(e => e.text.toLowerCase()));

    const uniqueToDoc1 = [...doc1Entities].filter(e => !doc2Entities.has(e));
    const uniqueToDoc2 = [...doc2Entities].filter(e => !doc1Entities.has(e));

    const fingerprintMatch = doc1.fingerprint === doc2.fingerprint;

    return {
      similarity,
      commonEntities,
      commonCitations,
      uniqueToDoc1,
      uniqueToDoc2,
      fingerprintMatch
    };
  }

  // Privacy-safe processing (mask sensitive info)
  async processSafely(file: File): Promise<ProcessingResult> {
    const result = await this.processDocument(file);

    // Mask sensitive information in the text
    let maskedText = result.text;
    result.sensitiveInfo.forEach(info => {
      maskedText = maskedText.substring(0, info.location.start) +
                   info.masked +
                   maskedText.substring(info.location.end);
    });

    return {
      ...result,
      text: maskedText
    };
  }

  // Helper methods
  private bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Mock WASM module for demo (replace with actual WASM in production)
  private async createMockWasmModule(): Promise<WasmModule> {
    return {
      extract_pdf_text: (buffer: Uint8Array): string => {
        // Simulate PDF text extraction
        return `Extracted text from PDF document (${buffer.length} bytes). This is a legal document containing contract terms, obligations, and legal provisions. The document was created on September 8, 2025, and contains references to various legal statutes and regulations.`;
      },

      analyze_legal_document: (text: string): string => {
        const analysis = {
          complexity: this.calculateComplexity(text),
          legalTermDensity: this.calculateLegalTermDensity(text),
          structure: this.analyzeStructure(text),
          classification: this.classifyDocument(text)
        };
        return JSON.stringify(analysis);
      },

      calculate_text_similarity: (text1: string, text2: string): number => {
        return this.jaccardSimilarity(
          this.tokenize(text1.toLowerCase()),
          this.tokenize(text2.toLowerCase())
        );
      },

      generate_document_fingerprint: (text: string): Uint8Array => {
        // Simple hash-based fingerprint
        const hash = this.simpleHash(text);
        const buffer = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          buffer[i] = (hash + i) % 256;
        }
        return buffer;
      },

      detect_legal_entities: (text: string): string => {
        const entities: LegalEntity[] = [];

        // Person names (simplified pattern)
        const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
        let match;
        while ((match = nameRegex.exec(text)) !== null) {
          entities.push({
            type: 'person',
            text: match[0],
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
          });
        }

        // Organizations
        const orgRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Corp|Inc|LLC|Ltd|Company)\b/g;
        while ((match = orgRegex.exec(text)) !== null) {
          entities.push({
            type: 'organization',
            text: match[0],
            confidence: 0.9,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
          });
        }

        return JSON.stringify(entities);
      },

      classify_document_type: (text: string): string => {
        if (text.includes('contract') || text.includes('agreement')) return 'contract';
        if (text.includes('motion') || text.includes('court')) return 'legal_motion';
        if (text.includes('statute') || text.includes('regulation')) return 'legal_statute';
        if (text.includes('correspondence') || text.includes('email')) return 'correspondence';
        return 'legal_document';
      },

      extract_legal_citations: (text: string): string => {
        const citations: LegalCitation[] = [];

        // Case citations (simplified)
        const caseRegex = /\b\d+\s+[A-Z][a-z]+\.\s*\d+\b/g;
        let match;
        while ((match = caseRegex.exec(text)) !== null) {
          citations.push({
            type: 'case',
            citation: match[0],
            jurisdiction: 'Federal',
            relevance: 0.8
          });
        }

        // Statute citations
        const statuteRegex = /\b\d+\s+U\.S\.C\.\s*§\s*\d+/g;
        while ((match = statuteRegex.exec(text)) !== null) {
          citations.push({
            type: 'statute',
            citation: match[0],
            jurisdiction: 'Federal',
            relevance: 0.9
          });
        }

        return JSON.stringify(citations);
      },

      calculate_readability_score: (text: string): number => {
        // Simplified Flesch Reading Ease calculation
        const sentences = text.split(/[.!?]+/).length;
        const words = text.split(/\s+/).length;
        const syllables = this.countSyllables(text);

        if (sentences === 0 || words === 0) return 0;

        const avgWordsPerSentence = words / sentences;
        const avgSyllablesPerWord = syllables / words;

        const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        return Math.max(0, Math.min(100, score));
      },

      detect_sensitive_information: (text: string): string => {
        const sensitive: SensitiveInfo[] = [];

        // SSN pattern
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
        let match;
        while ((match = ssnRegex.exec(text)) !== null) {
          sensitive.push({
            type: 'ssn',
            value: match[0],
            masked: 'XXX-XX-' + match[0].slice(-4),
            confidence: 0.95,
            location: { start: match.index, end: match.index + match[0].length }
          });
        }

        // Email pattern
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        while ((match = emailRegex.exec(text)) !== null) {
          sensitive.push({
            type: 'email',
            value: match[0],
            masked: match[0].charAt(0) + '***@' + match[0].split('@')[1],
            confidence: 0.9,
            location: { start: match.index, end: match.index + match[0].length }
          });
        }

        return JSON.stringify(sensitive);
      },

      compress_document_features: (features: Uint8Array): Uint8Array => {
        // Simple compression simulation
        return new Uint8Array(features.buffer, 0, Math.floor(features.length * 0.7));
      },

      memory: new WebAssembly.Memory({ initial: 1 })
    };
  }

  // Utility functions for mock implementation
  private calculateComplexity(text: string): number {
    const avgWordsPerSentence = text.split(/\s+/).length / text.split(/[.!?]+/).length;
    return Math.min(1, avgWordsPerSentence / 20);
  }

  private calculateLegalTermDensity(text: string): number {
    const legalTerms = ['contract', 'liability', 'statute', 'regulation', 'jurisdiction', 'precedent'];
    const words = text.toLowerCase().split(/\s+/);
    const legalCount = words.filter(word => legalTerms.includes(word)).length;
    return legalCount / words.length;
  }

  private analyzeStructure(text: string): any {
    return {
      paragraphs: text.split(/\n\s*\n/).length,
      sections: (text.match(/^\d+\./gm) || []).length,
      headers: (text.match(/^[A-Z\s]+$/gm) || []).length
    };
  }

  private classifyDocument(text: string): string {
    if (text.includes('whereas')) return 'contract';
    if (text.includes('motion')) return 'legal_motion';
    return 'legal_document';
  }

  private jaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1);
    const s2 = new Set(set2);
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    return text.match(/\b\w+\b/g) || [];
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private countSyllables(text: string): number {
    // Simple syllable counting approximation
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.reduce((total, word) => {
      const syllables = word.match(/[aeiouy]+/g) || [];
      return total + Math.max(1, syllables.length);
    }, 0);
  }
}

// Singleton instance for global use
export const wasmLegalProcessor = new WasmLegalProcessor();

// Web Worker wrapper for heavy processing
export class WasmProcessingWorker {
  private worker: Worker | null = null;

  async initWorker(): Promise<void> {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, using main thread');
      return;
    }

    // In production, load actual worker script
    const workerScript = `
      importScripts('/wasm/legal-processor-worker.js');

      self.onmessage = async function(e) {
        const { id, method, args } = e.data;
        try {
          const result = await processor[method](...args);
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  async processInWorker(method: string, ...args: any[]): Promise<any> {
    if (!this.worker) {
      await this.initWorker();
    }

    if (!this.worker) {
      // Fallback to main thread
      return await (wasmLegalProcessor as any)[method](...args);
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.worker!.removeEventListener('message', handleMessage);
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data.result);
          }
        }
      };

      this.worker!.addEventListener('message', handleMessage);
      this.worker!.postMessage({ id, method, args });
    });
  }
}

export const wasmWorker = new WasmProcessingWorker();
