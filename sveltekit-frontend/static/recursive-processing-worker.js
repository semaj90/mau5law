/**
 * Enhanced Service Worker: Recursive Document Processing
 * Combines service worker background processing with recursive algorithms
 * for deep legal document analysis and evidence hierarchy traversal
 */

// Service Worker Configuration
const SW_CONFIG = {
  version: '2.1.0',
  cacheName: 'legal-ai-recursive-v2',
  maxConcurrentTasks: 6,
  recursionDepthLimit: 50,
  enableOfflineMode: true,
  enableRecursiveCache: true
};

// Recursive Processing State
let recursionStack = new Map();
let processingDepth = new Map();

/**
 * Recursive Document Parser
 * Base Case: Simple document with no nested structures
 * Recursive Case: Document with child sections, annotations, or references
 */
class RecursiveDocumentProcessor {
  constructor() {
    this.maxDepth = SW_CONFIG.recursionDepthLimit;
    this.processedNodes = new Set();
  }

  /**
   * Entry point for recursive document processing
   */
  async processDocument(document, depth = 0) {
    // BASE CASE: Maximum depth reached or already processed
    if (depth >= this.maxDepth || this.processedNodes.has(document.id)) {
      return this.createLeafResult(document);
    }

    // Mark as processed to prevent cycles
    this.processedNodes.add(document.id);

    try {
      // Process current document level
      const result = await this.processCurrentLevel(document, depth);

      // RECURSIVE CASE: Process nested structures
      if (document.children && document.children.length > 0) {
        result.children = await this.processChildren(document.children, depth + 1);
      }

      // Process annotations recursively
      if (document.annotations) {
        result.annotations = await this.processAnnotations(document.annotations, depth + 1);
      }

      // Process legal citations recursively
      if (document.citations) {
        result.citations = await this.processCitations(document.citations, depth + 1);
      }

      return result;
    } catch (error) {
      console.error(`Recursive processing error at depth ${depth}:`, error);
      return this.createErrorResult(document, error);
    }
  }

  /**
   * BASE CASE: Simple document processing
   */
  createLeafResult(document) {
    return {
      id: document.id,
      type: 'leaf',
      content: document.content,
      metadata: document.metadata,
      isBaseCase: true,
      aiAnalysis: this.performBasicAIAnalysis(document)
    };
  }

  /**
   * Process current document level
   */
  async processCurrentLevel(document, depth) {
    const startTime = performance.now();

    // AI analysis for current level
    const aiAnalysis = await this.performAIAnalysis(document, depth);

    // Vector embedding generation
    const embedding = await this.generateEmbedding(document.content);

    // Legal entity extraction
    const entities = await this.extractLegalEntities(document.content);

    return {
      id: document.id,
      type: 'processed',
      depth,
      content: document.content,
      metadata: document.metadata,
      aiAnalysis,
      embedding,
      entities,
      processingTime: performance.now() - startTime,
      isBaseCase: false
    };
  }

  /**
   * RECURSIVE CASE: Process children
   */
  async processChildren(children, depth) {
    const results = [];

    for (const child of children) {
      // Recursive call to process each child
      const childResult = await this.processDocument(child, depth);
      results.push(childResult);
    }

    return results;
  }

  /**
   * RECURSIVE CASE: Process annotations
   */
  async processAnnotations(annotations, depth) {
    const results = [];

    for (const annotation of annotations) {
      if (annotation.references && annotation.references.length > 0) {
        // Recursive processing of referenced documents
        const referencedDocs = await this.fetchReferencedDocuments(annotation.references);
        const processedRefs = [];

        for (const ref of referencedDocs) {
          processedRefs.push(await this.processDocument(ref, depth));
        }

        annotation.processedReferences = processedRefs;
      }

      results.push(annotation);
    }

    return results;
  }

  /**
   * RECURSIVE CASE: Process legal citations
   */
  async processCitations(citations, depth) {
    const results = [];

    for (const citation of citations) {
      if (citation.nestedCitations) {
        // Recursive processing of nested citations
        citation.processedNestedCitations = await this.processCitations(
          citation.nestedCitations,
          depth
        );
      }

      results.push(citation);
    }

    return results;
  }

  /**
   * AI Analysis using background processing
   */
  async performAIAnalysis(document, depth) {
    return new Promise((resolve) => {
      // Send to AI worker for analysis
      const analysisWorker = new Worker('/workers/legal-bert-onnx-worker.js');

      analysisWorker.postMessage({
        type: 'ANALYZE_DOCUMENT',
        document: document.content,
        metadata: {
          depth,
          id: document.id,
          timestamp: Date.now()
        }
      });

      analysisWorker.onmessage = (event) => {
        resolve(event.data.analysis);
        analysisWorker.terminate();
      };
    });
  }

  async performBasicAIAnalysis(document) {
    // Simplified analysis for base cases
    return {
      type: 'basic',
      wordCount: document.content.split(' ').length,
      hasLegalTerms: /\b(contract|agreement|clause|defendant|plaintiff|evidence)\b/i.test(document.content),
      complexity: 'low'
    };
  }

  async generateEmbedding(content) {
    return new Promise((resolve) => {
      const embeddingWorker = new Worker('/workers/embedding-worker.js');

      embeddingWorker.postMessage(content);
      embeddingWorker.onmessage = (event) => {
        resolve(event.data.embedding);
        embeddingWorker.terminate();
      };
    });
  }

  async extractLegalEntities(content) {
    // Use regex patterns for quick entity extraction (base case)
    const entities = {
      parties: content.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [],
      dates: content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [],
      amounts: content.match(/\$[\d,]+\.?\d*/g) || []
    };

    return entities;
  }

  async fetchReferencedDocuments(references) {
    // Fetch referenced documents from database
    const docs = [];
    for (const ref of references) {
      try {
        const response = await fetch(`/api/documents/${ref.id}`);
        const doc = await response.json();
        docs.push(doc);
      } catch (error) {
        console.error(`Failed to fetch reference ${ref.id}:`, error);
      }
    }
    return docs;
  }

  createErrorResult(document, error) {
    return {
      id: document.id,
      type: 'error',
      error: error.message,
      isBaseCase: true
    };
  }
}

/**
 * Evidence Chain Recursive Processor
 * Handles evidence relationships and custody chains
 */
class RecursiveEvidenceProcessor {
  async processEvidenceChain(evidenceId, visited = new Set()) {
    // BASE CASE: Already visited (prevents infinite loops)
    if (visited.has(evidenceId)) {
      return { id: evidenceId, type: 'circular_reference' };
    }

    visited.add(evidenceId);

    try {
      const evidence = await this.fetchEvidence(evidenceId);

      // BASE CASE: No related evidence
      if (!evidence.relatedEvidence || evidence.relatedEvidence.length === 0) {
        return {
          id: evidenceId,
          type: 'leaf_evidence',
          data: evidence,
          isBaseCase: true
        };
      }

      // RECURSIVE CASE: Process related evidence
      const relatedChains = [];
      for (const relatedId of evidence.relatedEvidence) {
        const chain = await this.processEvidenceChain(relatedId, new Set(visited));
        relatedChains.push(chain);
      }

      return {
        id: evidenceId,
        type: 'evidence_chain',
        data: evidence,
        relatedChains,
        chainDepth: Math.max(...relatedChains.map(c => (c.chainDepth || 0) + 1)),
        isBaseCase: false
      };
    } catch (error) {
      return {
        id: evidenceId,
        type: 'error',
        error: error.message,
        isBaseCase: true
      };
    }
  }

  async fetchEvidence(evidenceId) {
    const response = await fetch(`/api/evidence/${evidenceId}`);
    return response.json();
  }
}

// Service Worker Event Handlers
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SW_CONFIG.cacheName).then((cache) => {
      return cache.addAll([
        '/workers/legal-bert-onnx-worker.js',
        '/workers/embedding-worker.js',
        '/static/models/legal-bert-onnx/model.onnx'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== SW_CONFIG.cacheName) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Main message handler for recursive processing
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'PROCESS_DOCUMENT_RECURSIVE':
        const docProcessor = new RecursiveDocumentProcessor();
        const result = await docProcessor.processDocument(data.document);

        event.ports[0].postMessage({
          id,
          type: 'DOCUMENT_PROCESSED',
          result,
          stats: {
            totalNodes: docProcessor.processedNodes.size,
            maxDepthReached: result.depth || 0
          }
        });
        break;

      case 'PROCESS_EVIDENCE_CHAIN':
        const evidenceProcessor = new RecursiveEvidenceProcessor();
        const chainResult = await evidenceProcessor.processEvidenceChain(data.evidenceId);

        event.ports[0].postMessage({
          id,
          type: 'EVIDENCE_CHAIN_PROCESSED',
          result: chainResult
        });
        break;

      case 'CACHE_RECURSIVE_RESULT':
        const cache = await caches.open(SW_CONFIG.cacheName);
        await cache.put(`/recursive-cache/${data.key}`, new Response(JSON.stringify(data.result)));

        event.ports[0].postMessage({
          id,
          type: 'CACHED',
          success: true
        });
        break;

      default:
        event.ports[0].postMessage({
          id,
          type: 'ERROR',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    event.ports[0].postMessage({
      id,
      type: 'ERROR',
      error: error.message
    });
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RecursiveDocumentProcessor,
    RecursiveEvidenceProcessor
  };
}