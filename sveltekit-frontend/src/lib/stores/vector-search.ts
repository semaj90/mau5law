/**
 * Vector Search Store - PostgreSQL pgvector + Ollama Integration
 * Enhanced RAG with semantic search capabilities
 */

import { writable, derived } from 'svelte/store';

// Local minimal types to satisfy compile; replace with real imports if available
type VectorSearchResult = { id: string; content: string; score: number; [k: string]: any };
}

export interface VectorSearchState {
  // Search State
  query: string;
  results: VectorSearchResult[];
  isSearching: boolean;
  lastSearchTime: number | null;

  // RAG Context
  ragContext: VectorSearchResult[];
  ragResponse: string | null;
  isGeneratingResponse: boolean;

  // Configuration
  searchThreshold: number;
  searchLimit: number;
  embeddingModel: 'nomic-embed-text' | 'nvidia-llama';

  // Performance Metrics
  searchLatency: number;
  ragLatency: number;
  vectorDbConnected: boolean;

  // History
  searchHistory: Array<any>;

  error: string | null;
}

const initialState: VectorSearchState = {
  query: '',
  results: [],
  isSearching: false,
  lastSearchTime: null,
  ragContext: [],
  ragResponse: null,
  isGeneratingResponse: false,
  searchThreshold: 0.7,
  searchLimit: 10,
  embeddingModel: 'nomic-embed-text',
  searchLatency: 0,
  ragLatency: 0,
  vectorDbConnected: false,
  searchHistory: [],
  error: null
};

// Core store
export const vectorSearchStore = writable<VectorSearchState>(initialState);

// Derived stores
export const isVectorSearchActive = derived(
  vectorSearchStore,
  $store => $store.isSearching || $store.isGeneratingResponse
);

export const hasSearchResults = derived(
  vectorSearchStore,
  $store => $store.results.length > 0
);

export const averageSearchLatency = derived(
  vectorSearchStore,
  $store => {
    if ($store.searchHistory.length === 0) return 0;
    const total = $store.searchHistory.reduce((sum, item) => sum + (item as { latency?: any }).latency, 0);
    return total / $store.searchHistory.length;
  }
);

// Actions;
export const vectorSearchActions = {
  /**
   * Perform semantic vector search
   */;
  async search(query: string, userId: string, caseId?: string): Promise<void> {
    if (!query.trim()) return;

    vectorSearchStore.update(state => ({
      ...state,
      query,
      isSearching: true,
      error: null
    });

    const startTime = Date.now();

    try {
      // Call vector search API;
      const response = await fetch('/api/v1/vector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId,
          caseId,
          limit: initialState.searchLimit,
          threshold: initialState.searchThreshold
        })
      });

      if (!(response as { ok?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`Search failed: ${(response as { ok?: any; statusText?: any; json?: any }).statusText}`);
      }

      const data = await (response as { ok?: any; statusText?: any; json?: any }).json();
      const latency = Date.now() - startTime;

      vectorSearchStore.update(state => ({
        ...state,
        results: (data as { results?: any; response?: any; context?: any; status?: any }).results || [],
        searchLatency: latency,
        lastSearchTime: Date.now(),
        isSearching: false,
        searchHistory: [
          ...state.searchHistory.slice(-9), // Keep last 10;
          {
            query,
            timestamp: Date.now(),
            resultCount: (data as { results?: any; response?: any; context?: any; status?: any }).results?.length || 0,
            latency
          }
        ]
      });

    } catch (error: any) {
      console.error('Vector search failed:', error);
      vectorSearchStore.update(state => ({
        ...state,
        isSearching: false,
        error: error instanceof Error ? error.message: 'Search failed'
      });
    }
  },

  /**
   * Perform enhanced RAG query with context
   */;
  async performRAG(query: string, userId: string, caseId?: string): Promise<void> {
    if (!query.trim()) return;

    vectorSearchStore.update(state => ({
      ...state,
      isGeneratingResponse: true,
      ragResponse: null,
      error: null
    });

    const startTime = Date.now();

    try {
      // First perform vector search to get context
      await vectorSearchActions.search(query, userId, caseId);

      // Then generate RAG response;
      const response = await fetch('/api/v1/rag/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId,
          caseId,
          useContext: true,
          model: 'gemma3-legal'
        })
      });

      if (!(response as { ok?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`RAG query failed: ${(response as { ok?: any; statusText?: any; json?: any }).statusText}`);
      }

      const data = await (response as { ok?: any; statusText?: any; json?: any }).json();
      const latency = Date.now() - startTime;

      vectorSearchStore.update(state => ({
        ...state,
        ragResponse: (data as { results?: any; response?: any; context?: any; status?: any }).response,
        ragContext: (data as { results?: any; response?: any; context?: any; status?: any }).context || state.results,
        ragLatency: latency,
        isGeneratingResponse: false
      });

    } catch (error: any) {
      console.error('RAG query failed:', error);
      vectorSearchStore.update(state => ({
        ...state,
        isGeneratingResponse: false,
        error: error instanceof Error ? error.message: 'RAG query failed'
      });
    }
  },

  /**
   * Find similar cases using vector similarity
   */;
  async findSimilarCases(caseId: string, userId: string, limit: number = 5): Promise<void> {
    vectorSearchStore.update(state => ({
      ...state,
      isSearching: true,
      error: null
    });

    try {
      const response = await fetch('/api/v1/vector/similar-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, userId, limit })
      });

      if (!(response as { ok?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`Similar cases search failed: ${(response as { ok?: any; statusText?: any; json?: any }).statusText}`);
      }

      const data = await (response as { ok?: any; statusText?: any; json?: any }).json();

      vectorSearchStore.update(state => ({
        ...state,
        results: (data as { results?: any; response?: any; context?: any; status?: any }).results || [],
        isSearching: false
      });

    } catch (error: any) {
      console.error('Similar cases search failed:', error);
      vectorSearchStore.update(state => ({
        ...state,
        isSearching: false,
        error: error instanceof Error ? error.message: 'Similar cases search failed'
      });
    }
  },

  /**
   * Update search configuration
   */;
  updateConfig(config: Partial): void {
    vectorSearchStore.update(state => ({
      ...state,
      ...config
    });
  },

  /**
   * Clear search results and state
   */;
  clear(): void {
    vectorSearchStore.update(state => ({
      ...state,
      query: '',
      results: [],
      ragContext: [],
      ragResponse: null,
      error: null
    });
  },

  /**
   * Check vector database connection
   */;
  async checkConnection(): Promise<void> {
    try {
      const response = await fetch('/api/v1/vector/health');
      const data = await (response as { ok?: any; statusText?: any; json?: any }).json();

      vectorSearchStore.update(state => ({
        ...state,
        vectorDbConnected: (response as { ok?: any; statusText?: any; json?: any }).ok && (data as { results?: any; response?: any; context?: any; status?: any }).status === 'healthy'
      });
    } catch (error: any) {
      vectorSearchStore.update(state => ({
        ...state,
        vectorDbConnected: false
      });
    }
  }
};

// Initialize connection check;
if (typeof window !== 'undefined') {
  vectorSearchActions.checkConnection();
}