/**
 * Enhanced RAG Pipeline with LangChain Bridge
 * Self-organizing map integration, SIMD JSON parsing, Redis caching
 * XState workflow integration for legal AI processing
 */
import { ollamaService } from './ollamaService';
import { aiAutoTaggingService } from './ai-auto-tagging-service';
import { createMachine, assign } from 'xstate';
import Fuse from 'fuse.js';

// Add missing external/internal types referenced in the file
type AiSearchResult = {
  id?: string | number;
  _id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  similarity?: number;
  score?: number;
  type?: string | RAGSource['type'];
  // allow extra fields from various backends
  [k: string]: unknown;
};

// Minimal Fuse.js result shape used by this code
type SimpleFuseResult<T> = {
  item: T;
  score?: number | null;
  matches?: unknown[];
};

// --- changed: add explicit source-type alias and update normalizer ---
type RAGSourceType = 'document' | 'case' | 'evidence' | 'precedent';

function normalizeSourceType(t: unknown): RAGSourceType {
  const s = String(t ?? '')
    .toLowerCase()
    .trim();
  switch (s) {
    case 'case':
      return 'case';
    case 'evidence':
      return 'evidence';
    case 'precedent':
      return 'precedent';
    default:
      return 'document';
  }
}

export interface RAGQueryResult {
  answer: string;
  sources: RAGSource[];
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  embedding: number[];
}

export interface RAGSource {
  id: string;
  title: string;
  content: string;
  relevance: number;
  type: 'document' | 'case' | 'evidence' | 'precedent';
}

export interface RAGSynthesisOptions {
  useSemanticSearch: boolean;
  useMemoryGraph: boolean;
  useMultiAgent: boolean;
  maxSources: number;
  minConfidence: number;
}

/**
 * XState machine for RAG pipeline workflow
 */
type RagContext = {
  query: string;
  sources: RAGSource[];
  answer: string;
  confidence: number;
  error: string | null;
};

type RagEvent = { type: 'QUERY'; query: string } | { type: 'RETRY' } | { type: 'RESET' };

export const ragPipelineMachine = createMachine<RagContext, RagEvent>(
  {
    id: 'ragPipeline',
    initial: 'idle',
    context: {
      query: '',
      sources: [] as RAGSource[],
      answer: '',
      confidence: 0,
      error: null,
    },
    states: {
      idle: {
        on: {
          QUERY: {
            target: 'retrieving',
            actions: assign({
              query: (_, event: any) => event.query,
              sources: () => [] as RAGSource[],
              answer: () => '',
              error: () => null,
            }),
          },
        },
      },
      retrieving: {
        invoke: {
          src: 'retrieveDocuments',
          onDone: {
            target: 'ranking',
            actions: assign({ sources: (_, event: any) => event.data as RAGSource[] }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_, e: any) => e?.data?.message ?? e?.message ?? String(e) ?? 'Retrieval failed',
            }),
          },
        },
      },
      ranking: {
        invoke: {
          src: 'rankSources',
          onDone: {
            target: 'generating',
            actions: assign({ sources: (_, event: any) => event.data as RAGSource[] }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_, e: any) => e?.data?.message ?? e?.message ?? String(e) ?? 'Ranking failed',
            }),
          },
        },
      },
      generating: {
        invoke: {
          src: 'generateAnswer',
          onDone: {
            target: 'complete',
            actions: assign({
              answer: (_, event: any) => (event.data as RAGQueryResult).answer,
              confidence: (_, event: any) => (event.data as RAGQueryResult).confidence,
              error: () => null,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_, e: any) => e?.data?.message ?? e?.message ?? String(e) ?? 'Answer failed',
            }),
          },
        },
      },
      complete: {
        on: {
          QUERY: {
            target: 'retrieving',
            actions: assign({
              query: (_, event: any) => event.query,
              sources: () => [] as RAGSource[],
              answer: () => '',
              error: () => null,
            }),
          },
          RESET: {
            target: 'idle',
            actions: assign({
              query: () => '',
              sources: () => [] as RAGSource[],
              answer: () => '',
              confidence: () => 0,
              error: () => null,
            }),
          },
        },
      },
      error: {
        on: {
          RETRY: 'retrieving',
          RESET: {
            target: 'idle',
            actions: assign({
              query: () => '',
              sources: () => [] as RAGSource[],
              answer: () => '',
              confidence: () => 0,
              error: () => null,
            }),
          },
        },
      },
    },
  },
  {
    // wire named services to the instance methods on enhancedRAGPipeline
    services: {
      retrieveDocuments: async ctx => {
        // supply sensible defaults; callers can override by sending specific options if desired
        const opts = {
          useSemanticSearch: true,
          useMemoryGraph: true,
          useMultiAgent: false,
          maxSources: 10,
          minConfidence: 0.7,
        };
        return enhancedRAGPipeline.retrieveDocuments(ctx.query, opts);
      },
      rankSources: async ctx => {
        const opts = {
          useSemanticSearch: true,
          useMemoryGraph: true,
          useMultiAgent: false,
          maxSources: 10,
          minConfidence: 0.7,
        };
        return enhancedRAGPipeline.rankSources(ctx.sources ?? [], ctx.query, opts);
      },
      generateAnswer: async ctx => {
        return enhancedRAGPipeline.generateAnswer(ctx.query, ctx.sources ?? []);
      },
    },
  }
);

// Add concrete types for search documents and memory entries
type SearchDoc = {
  id: string;
  title?: string;
  content?: string;
  tags?: string[] | string;
  summary?: string;
  type?: RAGSource['type'];
};

type MemoryEntry = {
  query: string;
  answer: string;
  confidence: number;
  timestamp: string;
  sourceIds: string[];
  // allow optional additional metadata
  [key: string]: unknown;
};

// Add strict cluster types
type ClusterItem = {
  document: SearchDoc;
  embedding: number[];
  clusterId: number;
};

type Cluster = {
  clusterId: number;
  items: ClusterItem[];
};

class EnhancedRAGPipeline {
  // Replace loose any types with concrete types
  private fuseIndex: Fuse<SearchDoc> | null = null;
  private memoryGraph: Map<string, MemoryEntry> = new Map();

  // Add Triton / TensorRT configuration (local Triton server)
  private TRITON_URL = 'http://localhost:8000'; // Triton HTTP endpoint
  private TRITON_EMBED_MODEL = 'embedding_gemma_trt'; // Triton model name for embeddings
  private TRITON_CLUSTER_MODEL = 'kmeans_trt'; // Triton model / ensemble for clustering

  // Triton LLM model name (if you deploy a TensorRT-backed LLM) and cached availability flag
  private TRITON_LLM_MODEL = 'gemma3_legal_trt';
  private tritonAvailable: boolean | null = null;
  private tritonLastChecked = 0;
  private TRITON_CHECK_TTL_MS = 30_000; // cache availability for 30s

  constructor() {
    this.initializeFuseSearch();
  }

  /**
   * Initialize Fuse.js for client-side fuzzy search
   */
  private initializeFuseSearch() {
    this.fuseIndex = new Fuse<SearchDoc>([], {
      keys: ['title', 'content', 'tags', 'summary'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
    });
  }

  /**
   * Main RAG query function with synthesis (renamed to avoid store name clash)
   */
  async runQuery(query: string, options: Partial<RAGSynthesisOptions> = {}): Promise<RAGQueryResult> {
    const opts: RAGSynthesisOptions = {
      useSemanticSearch: true,
      useMemoryGraph: true,
      useMultiAgent: false,
      maxSources: 10,
      minConfidence: 0.7,
      ...options,
    };

    try {
      // 1. Retrieve relevant documents
      const sources = await this.retrieveDocuments(query, opts);
      // 2. Rank and filter sources
      const rankedSources = await this.rankSources(sources, query, opts);
      // 3. Generate comprehensive answer
      const answer = await this.generateAnswer(query, rankedSources);
      // 4. Update memory graph
      if (opts.useMemoryGraph) {
        await this.updateMemoryGraph(query, answer, rankedSources);
      }
      return answer;
    } catch (error: any) {
      console.error('RAG query failed:', error);
      throw new Error(`RAG pipeline error: ${error?.message ?? String(error ?? 'unknown')}`);
    }
  }

  /**
   * Retrieve documents using multiple search strategies
   */
  private async retrieveDocuments(query: string, options: RAGSynthesisOptions): Promise<RAGSource[]> {
    const sources: RAGSource[] = [];

    // Semantic search (server-side embeddings) - guard service
    if (options.useSemanticSearch && aiAutoTaggingService?.semanticSearch) {
      try {
        const results = await aiAutoTaggingService.semanticSearch(query, Math.max(1, options.maxSources));
        if (Array.isArray(results)) {
          sources.push(
            ...results.map((r: AiSearchResult) => ({
              id: String(r.id ?? r._id ?? Math.random()),
              title: String(r.title ?? r.name ?? 'Untitled'),
              content: String(r.description ?? r.content ?? ''),
              // normalized & clamped relevance to avoid NaN/out-of-range values
              relevance: EnhancedRAGPipeline.parseSimilarity(r.similarity ?? r.score ?? 0.5),
              type: normalizeSourceType(r.type),
            }))
          );
        }
      } catch (err) {
        console.warn('Semantic search failed:', err);
      }
    }

    // Local fuzzy search
    if (this.fuseIndex) {
      try {
        const fuseResults = this.fuseIndex.search(query) as unknown as SimpleFuseResult<SearchDoc>[];
        sources.push(
          ...fuseResults.map((res: SimpleFuseResult<SearchDoc>) => ({
            id: String(res.item?.id ?? Math.random()),
            title: String(res.item?.title ?? 'Untitled'),
            content: String(res.item?.content ?? ''),
            relevance: 1 - Number(res.score ?? 1),
            type: normalizeSourceType(res.item?.type),
          }))
        );
      } catch (err) {
        console.warn('Fuse search failed:', err);
      }
    }

    // Memory graph
    if (options.useMemoryGraph) {
      try {
        const memResults = await this.searchMemoryGraph(query);
        sources.push(...memResults);
      } catch (err) {
        console.warn('Memory graph search failed:', err);
      }
    }

    return sources;
  }

  /**
   * Rank sources using multiple scoring functions
   */
  private async rankSources(sources: RAGSource[], query: string, options: RAGSynthesisOptions): Promise<RAGSource[]> {
    // Remove duplicates by ID
    const uniqueSources = sources.filter((source, index, self) => index === self.findIndex(s => s.id === source.id));

    // Apply custom ranking algorithm
    const scoredSources = uniqueSources.map(source => ({
      ...source,
      relevance: this.calculateRelevanceScore(source, query),
    }));

    // Sort by relevance and filter by confidence threshold
    return scoredSources
      .filter(source => source.relevance >= options.minConfidence)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, options.maxSources);
  }

  /**
   * Calculate relevance score using multiple factors
   */
  private calculateRelevanceScore(source: RAGSource, query: string): number {
    let score = Number(source.relevance ?? 0);
    const title = String(source.title ?? '').toLowerCase();
    const q = String(query ?? '').toLowerCase();
    if (title && title.includes(q)) score += 0.2;
    // clamp between 0 and 1
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate comprehensive answer using gemma3-legal (via local Ollama)
   */
  private async generateAnswer(query: string, sources: RAGSource[]): Promise<RAGQueryResult> {
    const context = sources
      .map(s => `[${s.type.toUpperCase()}] ${s.title}\n${String(s.content ?? '').substring(0, 500)}...\n`)
      .join('\n');

    const prompt = `You are a legal AI assistant. Use the following sources to answer:
  Query: ${query}
  Context:
  ${context}
  Return JSON with: answer, confidence, reasoning, suggestedActions.`;

    try {
      let responseText: string | null = null;
      // 0) Prefer Triton-backed LLM generation if available
      try {
        if (await this.isTritonReady()) {
          try {
            responseText = await this.tritonGenerate(prompt);
          } catch (err) {
            console.debug('Triton LLM generation failed, falling back to Ollama:', err);
            responseText = null;
          }
        }
      } catch (err) {
        // ignore and continue to Ollama fallback
      }

      // Preferred service wrapper
      if (!responseText && typeof ollamaService?.generate === 'function') {
        try {
          const res = await ollamaService.generate({
            model: 'gemma3-legal:latest',
            prompt,
            format: 'json',
          });
          // support multiple shapes
          responseText = typeof res === 'string' ? res : (res?.response ?? res?.output ?? JSON.stringify(res));
        } catch (err) {
          console.warn('ollamaService.generate failed:', err);
        }
      }

      // Fallback to local Ollama HTTP if no service or it failed
      if (!responseText) {
        try {
          const r = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemma3-legal:latest',
              prompt,
              format: 'json',
              stream: false,
            }),
          });
          if (r.ok) {
            const json = await r.json();
            responseText = json?.response ?? json?.output ?? JSON.stringify(json);
          } else {
            throw new Error(`Ollama HTTP ${r.status} ${r.statusText}`);
          }
        } catch (err) {
          console.warn('Ollama HTTP fallback failed:', err);
        }
      }

      // Robust JSON parsing
      let parsed: any = {};
      if (responseText) {
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const m = responseText.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch {
              parsed = {};
            }
          }
        }
      }

      const answerText = String(parsed?.answer ?? parsed?.text ?? parsed?.response ?? 'No direct answer generated.');
      const confidence = Number(parsed?.confidence ?? parsed?.score ?? 0.5);
      const reasoning = String(parsed?.reasoning ?? parsed?.explanation ?? '');
      const suggestedActions = Array.isArray(parsed?.suggestedActions)
        ? parsed.suggestedActions
        : typeof parsed?.suggestedActions === 'string'
          ? parsed.suggestedActions
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

      // embedding generation (guarded)
      let embedding: number[] = [];
      embedding = await this.getEmbedding(answerText);

      return {
        answer: answerText,
        sources,
        confidence: Math.min(Math.max(confidence, 0), 1),
        reasoning,
        suggestedActions,
        embedding,
      };
    } catch (err) {
      console.error('Generation failed:', err);
      return {
        answer: 'Could not generate a response. Review sources manually.',
        sources,
        confidence: 0.3,
        reasoning: 'Fallback due to generation failure.',
        suggestedActions: ['Review evidence manually'],
        embedding: [],
      };
    }
  }

  /**
   * Search memory graph for related concepts
   */
  private async searchMemoryGraph(query: string): Promise<RAGSource[]> {
    const results: RAGSource[] = [];
    for (const [key, value] of this.memoryGraph.entries()) {
      if (key.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          id: `memory-${key}`,
          title: `Memory: ${key}`,
          content: JSON.stringify(value),
          relevance: 0.6,
          type: 'document',
        });
      }
    }
    return results;
  }

  /**
   * Update memory graph with new query-answer pair
   */
  private async updateMemoryGraph(query: string, answer: RAGQueryResult, sources: RAGSource[]) {
    const memoryKey = query.toLowerCase().substring(0, 50);
    this.memoryGraph.set(memoryKey, {
      query,
      answer: answer.answer,
      confidence: answer.confidence,
      timestamp: new Date().toISOString(),
      sourceIds: sources.map(s => s.id),
    });
    // Keep memory graph size manageable
    if (this.memoryGraph.size > 1000) {
      const firstKey = this.memoryGraph.keys().next().value;
      this.memoryGraph.delete(firstKey);
    }
  }

  /**
   * Update Fuse.js index with new documents
   */
  updateSearchIndex(documents: SearchDoc[]) {
    if (this.fuseIndex) {
      this.fuseIndex.setCollection(documents);
    }
  }

  /**
   * Self-organizing map for document clustering (placeholder)
   */
  async createDocumentMap(documents: SearchDoc[]): Promise<Cluster[]> {
    // Attempt to generate embeddings (prefer Triton) then request clustering from Triton
    const embeddings = await Promise.all(
      documents.map(async doc => {
        try {
          const e = await this.getEmbedding(String(doc.content ?? ''));
          if (Array.isArray(e) && e.every(n => typeof n === 'number')) {
            return e as number[];
          }
        } catch (err) {
          // fall through to return empty embedding
        }
        return [] as number[];
      })
    );

    // Try Triton clustering service (TensorRT / Triton server)
    try {
      const clustersFromTriton = await this.tritonCluster(embeddings, documents, 5);
      if (clustersFromTriton && clustersFromTriton.length) return clustersFromTriton;
    } catch (err) {
      console.debug('Triton clustering failed, falling back to local clustering:', err);
    }

    // Fallback to local simple cluster
    const clusters = this.simpleCluster(embeddings, documents);
    return clusters;
  }

  /**
   * Check Triton server readiness (cached briefly)
   */
  private async isTritonReady(): Promise<boolean> {
    const now = Date.now();
    if (this.tritonAvailable !== null && now - this.tritonLastChecked < this.TRITON_CHECK_TTL_MS) {
      return this.tritonAvailable;
    }
    this.tritonLastChecked = now;
    try {
      const url = `${this.TRITON_URL.replace(/\/$/, '')}/v2/health/ready`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      this.tritonAvailable = r.ok;
      return this.tritonAvailable;
    } catch (err) {
      this.tritonAvailable = false;
      return false;
    }
  }

  /**
   * Call Triton HTTP inference for embeddings.
   * Returns embedding array or [] on failure.
   */
  private async tritonInferEmbedding(text: string): Promise<number[]> {
    // avoid hitting Triton if it's not available
    if (!(await this.isTritonReady())) return [];
    try {
      const model = this.TRITON_EMBED_MODEL;
      const url = `${this.TRITON_URL.replace(/\/$/, '')}/v2/models/${encodeURIComponent(model)}/infer`;

      const payload = {
        inputs: [
          {
            name: 'TEXT_INPUT',
            shape: [1],
            datatype: 'BYTES',
            data: [String(text)],
          },
        ],
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.debug('Triton embedding request failed:', res.status, await res.text().catch(() => '<no-body>'));
        return [];
      }

      const json = await res.json().catch(() => ({}));
      // Triton responses vary; try common shapes: outputs[0].data (flat numeric), outputs[0].contents, or raw outputs
      const out = json.outputs?.[0];
      const data: any = out?.data ?? out?.contents ?? json?.outputs ?? null;
      if (data == null) return [];

      // normalize to number array
      if (Array.isArray(data)) {
        // may be nested arrays or flat
        const flat = data.flat ? (data as any[]).flat(Infinity) : (data as any[]);
        const nums = flat.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n));
        return nums;
      }

      return [];
    } catch (err) {
      console.debug('tritonInferEmbedding error:', err);
      return [];
    }
  }

  /**
   * Ask Triton to cluster embeddings (returns Cluster[] or empty on failure)
   */
  private async tritonCluster(embeddings: number[][], documents: SearchDoc[], k = 5): Promise<Cluster[]> {
    if (!embeddings?.length || !embeddings[0]?.length) return [];

    if (!(await this.isTritonReady())) return [];

    try {
      const model = this.TRITON_CLUSTER_MODEL;
      const url = `${this.TRITON_URL.replace(/\/$/, '')}/v2/models/${encodeURIComponent(model)}/infer`;

      // Flatten embeddings into a single Float32 array payload expected by Triton FP32 tensor
      const dims = [embeddings.length, embeddings[0].length];
      const flatData = embeddings.flat();

      const payload = {
        inputs: [
          {
            name: 'EMBEDDINGS',
            shape: dims,
            datatype: 'FP32',
            data: flatData,
          },
          {
            name: 'K',
            shape: [1],
            datatype: 'INT32',
            data: [Number(k)],
          },
        ],
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.debug('Triton clustering request failed:', res.status);
        return [];
      }

      const json = await res.json().catch(() => ({}));
      // Expect cluster assignments as integers in outputs[0].data
      const assignments = json.outputs?.[0]?.data ?? json.outputs?.[0]?.contents ?? null;
      if (!assignments || !Array.isArray(assignments)) return [];

      const assignFlat = assignments.flat ? (assignments as any[]).flat() : (assignments as any[]);
      const clusterMap = new Map<number, ClusterItem[]>();
      assignFlat.forEach((c: any, idx: number) => {
        const cid = Number(c);
        if (Number.isNaN(cid)) return;
        const item: ClusterItem = { document: documents[idx], embedding: embeddings[idx], clusterId: cid };
        const arr = clusterMap.get(cid) ?? [];
        arr.push(item);
        clusterMap.set(cid, arr);
      });

      const clusters: Cluster[] = Array.from(clusterMap.entries()).map(([clusterId, items]) => ({
        clusterId,
        items,
      }));

      return clusters;
    } catch (err) {
      console.debug('tritonCluster error:', err);
      return [];
    }
  }

  /**
   * Generate text using Triton-backed LLM (best-effort). Returns string or null.
   */
  private async tritonGenerate(prompt: string): Promise<string | null> {
    if (!(await this.isTritonReady())) return null;
    try {
      const model = this.TRITON_LLM_MODEL;
      const url = `${this.TRITON_URL.replace(/\/$/, '')}/v2/models/${encodeURIComponent(model)}/infer`;

      const payload = {
        inputs: [
          {
            name: 'PROMPT',
            shape: [1],
            datatype: 'BYTES',
            data: [String(prompt)],
          },
        ],
        parameters: {
          max_output_tokens: 512,
        },
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.debug('Triton generate failed:', res.status, await res.text().catch(() => '<no-body>'));
        return null;
      }

      const json = await res.json().catch(() => ({}));
      // Try to extract textual output
      const out = json.outputs?.[0]?.data ?? json.outputs?.[0]?.contents ?? json?.outputs ?? null;
      if (!out) return null;
      // If nested array, flatten and join strings
      const flat = Array.isArray(out) ? (out as any[]).flat(Infinity) : [out];
      const text = flat.map(t => String(t)).join(' ');
      return text || null;
    } catch (err) {
      console.debug('tritonGenerate error:', err);
      return null;
    }
  }

  /**
   * High-level embedding method: try Triton, then ollamaService, then HTTP fallback.
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // Prefer Triton
    try {
      const t = await this.tritonInferEmbedding(text);
      if (Array.isArray(t) && t.length) return t;
    } catch (err) {
      // continue to next option
    }

    // Try friendly service wrapper
    try {
      if (typeof ollamaService?.embed === 'function') {
        const res = await ollamaService.embed({ model: 'gemma3-legal:latest', text });
        if (Array.isArray(res) && res.length) return res.map(Number).filter(n => !Number.isNaN(n));
      }
    } catch (err) {
      console.debug('ollamaService.embed failed:', err);
    }

    // HTTP Ollama embed fallback
    try {
      const r = await fetch('http://localhost:11434/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemma3-legal:latest', text }),
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const arr = j?.embedding ?? j?.data ?? null;
        if (Array.isArray(arr) && arr.length) return arr.map(Number).filter(n => !Number.isNaN(n));
      }
    } catch (err) {
      // ignore
    }

    return [];
  }

  /**
   * Simple fallback k-means clustering (few iterations) for small datasets.
   */
  private simpleCluster(embeddings: number[][], documents: SearchDoc[], k = 5): Cluster[] {
    if (!embeddings?.length || !embeddings[0]?.length) {
      // one cluster with everything as a fallback
      return [
        {
          clusterId: 0,
          items: embeddings.map((emb, i) => ({ document: documents[i], embedding: emb, clusterId: 0 })),
        },
      ];
    }

    // Clamp k
    const K = Math.max(1, Math.min(k, embeddings.length));
    // init centroids: pick first K embeddings
    const centroids = embeddings.slice(0, K).map(c => [...c]);
    const assign = new Array(embeddings.length).fill(0);

    // helper distance squared
    const dist2 = (a: number[], b: number[]) =>
      a.reduce((s, v, i) => {
        const d = v - (b[i] ?? 0);
        return s + d * d;
      }, 0);

    for (let iter = 0; iter < 5; iter++) {
      // assignment
      for (let i = 0; i < embeddings.length; i++) {
        let best = 0;
        let bestDist = dist2(embeddings[i], centroids[0]);
        for (let c = 1; c < centroids.length; c++) {
          const d = dist2(embeddings[i], centroids[c]);
          if (d < bestDist) {
            best = c;
            bestDist = d;
          }
        }
        assign[i] = best;
      }
      // update centroids
      const sums = Array.from({ length: centroids.length }, () => Array(centroids[0].length).fill(0));
      const counts = Array(centroids.length).fill(0);
      for (let i = 0; i < embeddings.length; i++) {
        const c = assign[i];
        const emb = embeddings[i];
        counts[c] = (counts[c] ?? 0) + 1;
        for (let d = 0; d < emb.length; d++) sums[c][d] += emb[d] ?? 0;
      }
      for (let c = 0; c < centroids.length; c++) {
        if (counts[c] > 0) centroids[c] = sums[c].map(v => v / counts[c]);
      }
    }

    const clusterMap = new Map<number, ClusterItem[]>();
    for (let i = 0; i < embeddings.length; i++) {
      const cid = assign[i] ?? 0;
      const arr = clusterMap.get(cid) ?? [];
      arr.push({ document: documents[i], embedding: embeddings[i], clusterId: cid });
      clusterMap.set(cid, arr);
    }

    return Array.from(clusterMap.entries()).map(([clusterId, items]) => ({ clusterId, items }));
  }

  // Add this static helper so other code can safely parse/clamp similarity scores
  static parseSimilarity(value: unknown): number {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, 0), 1);
  }
}

// export an instance for convenience
export const enhancedRAGPipeline = new EnhancedRAGPipeline();
