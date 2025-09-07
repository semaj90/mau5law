/**
 * Intelligent Web Analyzer - Complete AI-Aware Pipeline
 * Full-page semantic understanding with minimal CPU/GPU usage
 * OCR → Chunking → Streaming → Embeddings → QLoRA Training → Caching
 * 
 * Flow: DOM Analysis → Text Extraction → Tensor Processing → User Context → Cache
 */

import { extractTextFromImage, type ImageSource, type OCRResult } from '$lib/ocr/ocr-client.js';
import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager.js';
import { getCachedEmbedding, cacheEmbedding } from '$lib/server/cache/redis.js';
import { browser } from '$app/environment';

export interface WebElement {
  id: string;
  tagName: string;
  textContent: string;
  innerHTML: string;
  boundingBox: DOMRect;
  attributes: Record<string, string>;
  metadata: {
    importance: 'high' | 'medium' | 'low';
    elementType: 'text' | 'image' | 'input' | 'button' | 'link' | 'container';
    interactionCount: number;
    lastInteraction?: number;
  };
}

export interface PageChunk {
  id: string;
  content: string;
  elements: WebElement[];
  position: { start: number; end: number };
  embeddings?: Float32Array;
  semantic_meaning?: string;
  confidence: number;
}

export interface UserAnalytics {
  userId: string;
  sessionId: string;
  typingPatterns: {
    avgSpeed: number; // WPM
    commonWords: string[];
    specialization: string[]; // legal, technical, etc.
  };
  interactionPatterns: {
    clickHeatmap: Array<{ x: number; y: number; count: number }>;
    scrollBehavior: { depth: number; speed: number };
    focusAreas: string[]; // element selectors
  };
  caseContext: {
    activeCases: string[];
    currentTask: string;
    relevantDocuments: string[];
  };
}

export interface QLoRATrainingData {
  user_id: string;
  chunks: Array<{
    input_text: string;
    embeddings: number[];
    context: UserAnalytics;
    importance_weight: number;
    created_at: number;
  }>;
  metadata: {
    page_url: string;
    session_data: UserAnalytics;
    distilled_size: number;
    training_ready: boolean;
  };
}

export class IntelligentWebAnalyzer {
  private worker?: Worker;
  private mutationObserver?: MutationObserver;
  private userAnalytics: UserAnalytics;
  private pageElements = new Map<string, WebElement>();
  private processingQueue: PageChunk[] = [];
  private isProcessing = false;
  
  constructor(initialAnalytics: Partial<UserAnalytics> = {}) {
    this.userAnalytics = {
      userId: initialAnalytics.userId || 'anonymous',
      sessionId: initialAnalytics.sessionId || crypto.randomUUID(),
      typingPatterns: {
        avgSpeed: 0,
        commonWords: [],
        specialization: [],
        ...initialAnalytics.typingPatterns
      },
      interactionPatterns: {
        clickHeatmap: [],
        scrollBehavior: { depth: 0, speed: 0 },
        focusAreas: [],
        ...initialAnalytics.interactionPatterns
      },
      caseContext: {
        activeCases: [],
        currentTask: '',
        relevantDocuments: [],
        ...initialAnalytics.caseContext
      }
    };
  }

  /**
   * Initialize the intelligent web analyzer
   */
  async initialize(): Promise<void> {
    if (!browser) return;

    try {
      // Initialize Service Worker for background processing
      await this.initializeWorker();
      
      // Set up DOM observation
      this.setupDOMObserver();
      
      // Set up user interaction tracking
      this.setupUserTracking();
      
      // Initial page analysis
      await this.analyzeCurrentPage();
      
      console.log('✅ Intelligent Web Analyzer initialized');
    } catch (error) {
      console.error('Failed to initialize web analyzer:', error);
    }
  }

  /**
   * Initialize Service Worker for background tensor processing
   */
  private async initializeWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(
        '/intelligent-web-worker.js',
        { scope: '/' }
      );
      
      this.worker = registration.active || registration.installing || registration.waiting;
      console.log('🧠 Intelligent Web Worker initialized');
    } catch (error) {
      console.warn('Service Worker initialization failed:', error);
    }
  }

  /**
   * Set up DOM mutation observer for real-time page changes
   */
  private setupDOMObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasSignificantChanges = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasSignificantChanges = true;
        } else if (mutation.type === 'characterData') {
          hasSignificantChanges = true;
        }
      });
      
      if (hasSignificantChanges) {
        // Debounced page re-analysis
        this.debouncePageAnalysis();
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false // Skip attribute changes for performance
    });
  }

  /**
   * Set up user interaction tracking for context-aware AI
   */
  private setupUserTracking(): void {
    let typingBuffer: string[] = [];
    let lastKeyTime = 0;
    
    // Typing pattern analysis
    document.addEventListener('keydown', (e) => {
      const currentTime = performance.now();
      if (lastKeyTime > 0) {
        const timeDiff = currentTime - lastKeyTime;
        const wpm = 60000 / (timeDiff * 5); // Approximate WPM calculation
        this.userAnalytics.typingPatterns.avgSpeed = 
          (this.userAnalytics.typingPatterns.avgSpeed + wpm) / 2;
      }
      lastKeyTime = currentTime;
      
      if (e.key.length === 1) {
        typingBuffer.push(e.key);
        if (typingBuffer.length > 50) {
          this.analyzeTypingPatterns(typingBuffer.join(''));
          typingBuffer = [];
        }
      }
    });

    // Click heatmap tracking
    document.addEventListener('click', (e) => {
      this.userAnalytics.interactionPatterns.clickHeatmap.push({
        x: e.clientX,
        y: e.clientY,
        count: 1
      });
      
      // Update element interaction count
      const elementId = this.getElementId(e.target as Element);
      const element = this.pageElements.get(elementId);
      if (element) {
        element.metadata.interactionCount++;
        element.metadata.lastInteraction = Date.now();
        element.metadata.importance = element.metadata.interactionCount > 5 ? 'high' : 'medium';
      }
    });

    // Focus area tracking
    document.addEventListener('focusin', (e) => {
      const selector = this.getElementSelector(e.target as Element);
      if (!this.userAnalytics.interactionPatterns.focusAreas.includes(selector)) {
        this.userAnalytics.interactionPatterns.focusAreas.push(selector);
      }
    });

    // Scroll behavior tracking
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
      const currentTime = performance.now();
      const scrollDepth = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      
      if (lastScrollTime > 0) {
        const scrollSpeed = Math.abs(window.scrollY) / (currentTime - lastScrollTime);
        this.userAnalytics.interactionPatterns.scrollBehavior = {
          depth: Math.max(this.userAnalytics.interactionPatterns.scrollBehavior.depth, scrollDepth),
          speed: scrollSpeed
        };
      }
      lastScrollTime = currentTime;
    });
  }

  /**
   * Analyze current page content with chunking and streaming
   */
  async analyzeCurrentPage(): Promise<QLoRATrainingData> {
    console.log('🔍 Starting intelligent page analysis...');
    
    // 1. Extract all meaningful elements
    const elements = await this.extractPageElements();
    
    // 2. Process images with OCR
    await this.processImages(elements.filter(e => e.metadata.elementType === 'image'));
    
    // 3. Create semantic chunks (2-5k characters each)
    const chunks = this.createSemanticChunks(elements);
    
    // 4. Stream chunks for embedding generation
    const processedChunks = await this.streamChunksForProcessing(chunks);
    
    // 5. Generate QLoRA training data
    const qloraData = this.prepareQLoRATrainingData(processedChunks);
    
    // 6. Cache results for future use
    await this.cacheAnalysisResults(qloraData);
    
    console.log(`✅ Page analysis complete: ${chunks.length} chunks processed`);
    return qloraData;
  }

  /**
   * Extract all meaningful elements from the page
   */
  private async extractPageElements(): Promise<WebElement[]> {
    const elements: WebElement[] = [];
    
    // Select meaningful elements (avoid scripts, styles, etc.)
    const meaningfulElements = document.querySelectorAll(`
      p, h1, h2, h3, h4, h5, h6, span, div, article, section,
      input, textarea, button, a, img, video, canvas,
      td, th, li, label, legend, figcaption
    `);

    meaningfulElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      
      // Skip elements that are not visible or too small
      if (rect.width < 10 || rect.height < 10 || rect.top < 0) return;
      
      const elementId = this.getElementId(el);
      const textContent = el.textContent?.trim() || '';
      
      // Skip elements with no meaningful content
      if (textContent.length < 3 && el.tagName !== 'IMG') return;

      const webElement: WebElement = {
        id: elementId,
        tagName: el.tagName.toLowerCase(),
        textContent,
        innerHTML: el.innerHTML.slice(0, 1000), // Limit size
        boundingBox: rect,
        attributes: this.getElementAttributes(el),
        metadata: {
          importance: this.calculateImportance(el, textContent),
          elementType: this.getElementType(el),
          interactionCount: 0
        }
      };

      elements.push(webElement);
      this.pageElements.set(elementId, webElement);
    });

    return elements;
  }

  /**
   * Process images with OCR for text extraction
   */
  private async processImages(imageElements: WebElement[]): Promise<void> {
    const imagePromises = imageElements.map(async (element) => {
      try {
        const imgEl = document.getElementById(element.id) as HTMLImageElement;
        if (!imgEl || !imgEl.src) return;

        // Check cache first
        const cacheKey = `ocr:${imgEl.src}`;
        const cachedResult = await getCachedEmbedding(cacheKey, 'ocr');
        
        if (cachedResult) {
          element.textContent = `[Image: ${cachedResult}]`;
          return;
        }

        // Extract text using OCR
        const ocrResult: OCRResult = await extractTextFromImage(imgEl);
        if (ocrResult.text && ocrResult.text.length > 5) {
          element.textContent = `[Image: ${ocrResult.text}]`;
          
          // Cache OCR result
          await cacheEmbedding(cacheKey, [ocrResult.confidence || 0], 'ocr');
        }
      } catch (error) {
        console.warn('OCR processing failed for element:', element.id, error);
      }
    });

    await Promise.allSettled(imagePromises);
  }

  /**
   * Create semantic chunks from page elements
   */
  private createSemanticChunks(elements: WebElement[]): PageChunk[] {
    const chunks: PageChunk[] = [];
    const CHUNK_SIZE = 3000; // ~3k characters per chunk for optimal embedding
    
    let currentChunk = '';
    let currentElements: WebElement[] = [];
    let chunkStart = 0;

    elements.forEach((element, index) => {
      const content = `${element.tagName}: ${element.textContent}\n`;
      
      if (currentChunk.length + content.length > CHUNK_SIZE && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          id: `chunk_${chunks.length}`,
          content: currentChunk.trim(),
          elements: [...currentElements],
          position: { start: chunkStart, end: chunkStart + currentChunk.length },
          confidence: this.calculateChunkConfidence(currentElements)
        });
        
        // Reset for next chunk
        currentChunk = content;
        currentElements = [element];
        chunkStart += currentChunk.length;
      } else {
        currentChunk += content;
        currentElements.push(element);
      }
    });

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: `chunk_${chunks.length}`,
        content: currentChunk.trim(),
        elements: currentElements,
        position: { start: chunkStart, end: chunkStart + currentChunk.length },
        confidence: this.calculateChunkConfidence(currentElements)
      });
    }

    return chunks;
  }

  /**
   * Stream chunks for processing with minimal CPU/GPU usage
   */
  private async streamChunksForProcessing(chunks: PageChunk[]): Promise<PageChunk[]> {
    const BATCH_SIZE = 3; // Process 3 chunks at a time to avoid overwhelming
    const processedChunks: PageChunk[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (chunk) => {
        try {
          // Check embedding cache
          const cachedEmbedding = await getCachedEmbedding(chunk.content, 'web-analysis');
          
          if (cachedEmbedding) {
            chunk.embeddings = new Float32Array(cachedEmbedding);
          } else {
            // Generate new embedding via API
            const response = await fetch('/api/embeddings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: chunk.content,
                model: 'nomic-text',
                source: 'web-analysis'
              })
            });

            if (response.ok) {
              const data = await response.json();
              chunk.embeddings = new Float32Array(data.embedding);
              
              // Cache the embedding
              await cacheEmbedding(chunk.content, data.embedding, 'web-analysis');
            }
          }

          // Generate semantic meaning using LangExtract-style analysis
          chunk.semantic_meaning = this.extractSemanticMeaning(chunk);
          
          return chunk;
        } catch (error) {
          console.warn('Chunk processing failed:', chunk.id, error);
          return chunk;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          processedChunks.push(result.value);
        }
      });

      // Small delay between batches to prevent CPU/GPU spikes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return processedChunks;
  }

  /**
   * Prepare QLoRA training data with user context
   */
  private prepareQLoRATrainingData(chunks: PageChunk[]): QLoRATrainingData {
    const trainingChunks = chunks.map(chunk => ({
      input_text: chunk.content,
      embeddings: chunk.embeddings ? Array.from(chunk.embeddings) : [],
      context: this.userAnalytics,
      importance_weight: this.calculateImportanceWeight(chunk),
      created_at: Date.now()
    }));

    return {
      user_id: this.userAnalytics.userId,
      chunks: trainingChunks,
      metadata: {
        page_url: window.location.href,
        session_data: this.userAnalytics,
        distilled_size: trainingChunks.length,
        training_ready: true
      }
    };
  }

  /**
   * Cache analysis results for future use
   */
  private async cacheAnalysisResults(qloraData: QLoRATrainingData): Promise<void> {
    try {
      // Store in cache with 1 hour TTL
      const cacheKey = `web_analysis:${this.userAnalytics.userId}:${window.location.pathname}`;
      
      const response = await fetch('/api/tensor/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: qloraData.chunks.map((chunk, index) => ({
            text: chunk.input_text,
            embeddings: chunk.embeddings,
            dimensions: chunk.embeddings.length,
            confidence: 0.9,
            tensor_id: `web_${Date.now()}_${index}`,
            search_index: chunk.embeddings.slice(0, 100) // Reduced for indexing
          })),
          metadata: {
            processed_at: Date.now(),
            batch_size: qloraData.chunks.length,
            source: 'web_analysis',
            user_id: this.userAnalytics.userId,
            session_id: this.userAnalytics.sessionId
          }
        })
      });

      if (response.ok) {
        console.log('✅ Analysis results cached successfully');
      }
    } catch (error) {
      console.warn('Failed to cache analysis results:', error);
    }
  }

  // Utility methods
  
  private debouncePageAnalysis = this.debounce(() => {
    this.analyzeCurrentPage();
  }, 2000);

  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }

  private getElementId(element: Element): string {
    return element.id || `el_${Array.from(element.parentNode?.childNodes || []).indexOf(element)}`;
  }

  private getElementSelector(element: Element): string {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) selector += `#${current.id}`;
      if (current.className) selector += `.${current.className.split(' ').join('.')}`;
      path.unshift(selector);
      current = current.parentElement!;
    }
    
    return path.join(' > ');
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      attrs[attr.name] = attr.value;
    });
    return attrs;
  }

  private calculateImportance(element: Element, textContent: string): 'high' | 'medium' | 'low' {
    const tagName = element.tagName.toLowerCase();
    
    // High importance elements
    if (['h1', 'h2', 'title', 'button'].includes(tagName)) return 'high';
    if (textContent.length > 100) return 'high';
    
    // Medium importance
    if (['h3', 'h4', 'a', 'input', 'label'].includes(tagName)) return 'medium';
    if (textContent.length > 20) return 'medium';
    
    return 'low';
  }

  private getElementType(element: Element): WebElement['metadata']['elementType'] {
    const tagName = element.tagName.toLowerCase();
    
    if (['img', 'video', 'canvas'].includes(tagName)) return 'image';
    if (['input', 'textarea', 'select'].includes(tagName)) return 'input';
    if (['button', 'a'].includes(tagName)) return 'button';
    if (tagName === 'a') return 'link';
    if (['div', 'section', 'article'].includes(tagName)) return 'container';
    
    return 'text';
  }

  private calculateChunkConfidence(elements: WebElement[]): number {
    const highImportanceCount = elements.filter(e => e.metadata.importance === 'high').length;
    const totalElements = elements.length;
    
    return Math.min(0.9, 0.5 + (highImportanceCount / totalElements) * 0.4);
  }

  private calculateImportanceWeight(chunk: PageChunk): number {
    const interactionWeight = chunk.elements.reduce((sum, el) => sum + el.metadata.interactionCount, 0) / chunk.elements.length;
    const confidenceWeight = chunk.confidence;
    
    return Math.min(1.0, (interactionWeight * 0.4 + confidenceWeight * 0.6));
  }

  private extractSemanticMeaning(chunk: PageChunk): string {
    const content = chunk.content.toLowerCase();
    
    // Simple semantic analysis - replace with more sophisticated NLP
    if (content.includes('contract') || content.includes('agreement')) return 'legal_document';
    if (content.includes('case') || content.includes('court')) return 'legal_case';
    if (content.includes('evidence') || content.includes('exhibit')) return 'evidence';
    if (content.includes('form') || content.includes('input')) return 'data_entry';
    if (content.includes('button') || content.includes('click')) return 'user_action';
    
    return 'general_content';
  }

  private analyzeTypingPatterns(text: string): void {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const newWords = words.filter(w => !this.userAnalytics.typingPatterns.commonWords.includes(w));
    
    this.userAnalytics.typingPatterns.commonWords.push(...newWords.slice(0, 10));
    
    // Detect specialization based on vocabulary
    const legalTerms = ['contract', 'clause', 'plaintiff', 'defendant', 'court', 'legal'];
    const technicalTerms = ['api', 'database', 'function', 'variable', 'system'];
    
    const legalCount = words.filter(w => legalTerms.includes(w)).length;
    const technicalCount = words.filter(w => technicalTerms.includes(w)).length;
    
    if (legalCount > technicalCount && !this.userAnalytics.typingPatterns.specialization.includes('legal')) {
      this.userAnalytics.typingPatterns.specialization.push('legal');
    } else if (technicalCount > legalCount && !this.userAnalytics.typingPatterns.specialization.includes('technical')) {
      this.userAnalytics.typingPatterns.specialization.push('technical');
    }
  }

  /**
   * Update user context for better AI personalization
   */
  updateUserContext(context: Partial<UserAnalytics>): void {
    this.userAnalytics = {
      ...this.userAnalytics,
      ...context
    };
  }

  /**
   * Get current analysis state for debugging
   */
  getAnalysisState(): {
    elementsCount: number;
    chunksInQueue: number;
    userAnalytics: UserAnalytics;
    isProcessing: boolean;
  } {
    return {
      elementsCount: this.pageElements.size,
      chunksInQueue: this.processingQueue.length,
      userAnalytics: this.userAnalytics,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.mutationObserver?.disconnect();
    this.worker?.terminate();
    this.pageElements.clear();
    this.processingQueue = [];
  }
}

// Singleton instance for easy access
export const intelligentWebAnalyzer = new IntelligentWebAnalyzer();