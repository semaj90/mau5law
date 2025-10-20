/**
 * InstantSearchEngine - Loki.js + Fuse.js + Redis Integration
 *
 * High-performance instant search combining:
 * - Loki.js: Fast in-memory document database
 * - Fuse.js: Fuzzy search with smart legal matching
 * - Redis: Distributed caching for search results
 * - Semantic Search API: AI-powered document retrieval
 *
 * Features:
 * - Sub-100ms search response times
 * - Smart legal context matching
 * - Real-time result highlighting
 * - Progressive result loading
 * - Search analytics and optimization
 *
 * @module InstantSearchEngine
 * @version 2.0.0
 */
import Fuse from 'fuse.js';
import { lokiRedisCache, type SearchResult, type CachedDocument } from '../cache/loki-redis-integration.js';
import { EventEmitter } from 'events';
}
export interface InstantSearchOptions {
  // Fuse.js configuration
  fuzzyThreshold: number;
  fuzzyDistance: number;
  includeScore: boolean;
  includeMatches: boolean;
  // Search behavior
  minQueryLength: number;
  maxResults: number;
  debounceMs: number;
  useSemanticSearch: boolean;
  // Caching
  cacheResults: boolean;
  cacheTtl: number;
  // Legal-specific
  enableLegalSmartSearch: boolean;
  prioritizeByRisk: boolean;
  contextualWeighting: boolean;
}
}
export interface SearchFilters {
  documentTypes?: string[];
  riskLevels?: ('low' | 'medium' | 'high' | 'critical')[];
  jurisdictions?: string[];
  dateRange?: {
    start: Date;
  end: Date;
  }
  confidenceMin?: number;
  priorityMin?: number;
}
export interface InstantSearchResult extends SearchResult {
  fuseScore?: number;
  semanticScore?: number;
  combinedScore: number;
  highlights: {
    title?: string;
    content?: string;
    metadata?: string[];
  }
  resultType: 'cache' | 'fuzzy' | 'semantic' | 'hybrid';
  responseTime: number;
}
export interface SearchStats {
  totalSearches: number;
  averageResponseTime: number;
  cacheHitRate: number;
  fuzzySearches: number;
  semanticSearches: number;
  popularQueries: Array<any>;
  performanceMetrics: {
    p50: number;
  p90: number;
  p95: number;
  p99: number;
  }
}
const DEFAULT_OPTIONS: InstantSearchOptions = {
  // Fuse.js settings optimized for legal documents
  fuzzyThreshold: 0.3,
  fuzzyDistance: 100,
  includeScore: true,
  includeMatches: true,
  // Search behavior
  minQueryLength: 2,
  maxResults: 20,
  debounceMs: 150,
  useSemanticSearch: true
  // Caching
  cacheResults: true,
  cacheTtl: 1800, // 30 minutes
  // Legal-specific optimizations
  enableLegalSmartSearch: true,
  prioritizeByRisk: true,
  contextualWeighting: true,
}
// Legal-specific search patterns and synonyms
const LEGAL_SEARCH_PATTERNS = {
  criminal: {
    patterns: ['murder', 'homicide', 'killing', 'assault', 'battery'],
    synonyms: ['homicide', 'manslaughter', 'killing', 'death', 'violence'],
    boost: 1.2
  },
  contract: {
    patterns: ['contract', 'agreement', 'deal', 'terms'],
    synonyms: ['agreement', 'covenant', 'arrangement', 'understanding'],
    boost: 1.1
  },
  constitutional: {
    patterns: ['search', 'warrant', 'seizure', 'fourth amendment'],
    synonyms: ['search and seizure', 'unreasonable search', 'probable cause'],
    boost: 1.3
  },
  tort: {
    patterns: ['negligence', 'liability', 'damages', 'injury'],
    synonyms: ['negligent', 'responsible', 'compensation', 'harm'],
    boost: 1.1
  },
  property: {
    patterns: ['ownership', 'title', 'deed', 'real estate'],
    synonyms: ['property rights', 'real property', 'land', 'premises'],
    boost: 1.0
  }
}
export class InstantSearchEngine extends EventEmitter {
  private fuse: Fuse<CachedDocument> | null = null;
  private options: InstantSearchOptions;
  private searchStats: SearchStats = {
    totalSearches: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    fuzzySearches: 0,
    semanticSearches: 0,
    popularQueries: [],
    performanceMetrics: { p50: 0, p90: 0, p95: 0, p99: 0 }
  }
  private responseTimeTracker: number[] = [];
  private queryTracker: Map<string, number> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  constructor(_options: Partial<InstantSearchOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }
  async initialize(): Promise<void> {
    try {
      // Initialize Loki + Redis cache
      await lokiRedisCache.initialize();
      // Set up cache event listeners
      lokiRedisCache.on('documentStored', () => this.refreshFuseIndex();
      lokiRedisCache.on('documentSynced', () => this.refreshFuseIndex();
      // Initialize search index
      await this.refreshFuseIndex();
      console.log('✅ InstantSearchEngine initialized successfully');
      this.emit('initialized');
    } catch (error: any) {
      console.error('❌ InstantSearchEngine initialization failed:', error);
      throw error;
    }
  }
  private async refreshFuseIndex(): Promise<void> {
    try {
      // Get all cached documents for indexing
      const documents = await this.getAllCachedDocuments();
      if (documents.length === 0) {
        console.log('📝 No documents to index');
        return;
      }
      // Configure Fuse.js for legal document search
      const fuseOptions = {
        keys: [
          { name: 'id', weight: 0.1 },
          { name: 'type', weight: 0.2 },
          { name: 'metadata.title', weight: 0.3 },
          { name: 'metadata.description', weight: 0.2 },
          { name: 'metadata.keywords', weight: 0.15 },
          { name: 'metadata.jurisdiction', weight: 0.05 }
        ],
        threshold: this.options.fuzzyThreshold,
        distance: this.options.fuzzyDistance,
        minMatchCharLength: this.options.minQueryLength,
        includeScore: this.options.includeScore,
        includeMatches: this.options.includeMatches,
        ignoreLocation: true,
        useExtendedSearch: true,
        // Legal-specific field weights
        fieldNormWeight: 0.5,
      }
      this.fuse = new Fuse(documents, fuseOptions);
      console.log(`🔍 Fuse.js index refreshed with ${documents.length} documents`);
      this.emit('indexRefreshed', { documentCount: documents.length });
    } catch (error: any) {
      console.error('❌ Failed to refresh Fuse index:', error);
    }
  }
  private async getAllCachedDocuments(): Promise<CachedDocument[]> {
    // This would need to be implemented in the LokiRedisCache class
    // For now, we'll use a placeholder that returns sample legal documents
    return [
      {
        id: 'doc1',
        type: 'contract',
        size: 1024,
        priority: 150,
        riskLevel: 'medium',
        confidenceLevel: 0.85,
        lastAccessed: Date.now(),
        compressed: false,
        metadata: {
          title: 'Employment Contract Template',
          description: 'Standard employment agreement with non-disclosure clauses',
          keywords: ['employment', 'contract', 'nda', 'terms'],
          jurisdiction: 'Federal'
        },
        cacheTimestamp: Date.now(),
        accessCount: 5,
        cacheLocation: 'loki',
        syncStatus: 'synced'
      } as CachedDocument,
      {
        id: 'doc2',
        type: 'evidence',
        size: 2048,
        priority: 200,
        riskLevel: 'high',
        confidenceLevel: 0.92,
        lastAccessed: Date.now() - 3600000, // 1 hour ago
        compressed: false,
        metadata: {
          title: 'Criminal Evidence Analysis',
          description: 'Forensic analysis of digital evidence in cybercrime case',
          keywords: ['evidence', 'forensic', 'digital', 'cybercrime'],
          jurisdiction: 'State'
        },
        cacheTimestamp: Date.now(),
        accessCount: 12,
        cacheLocation: 'loki',
        syncStatus: 'synced'
      } as CachedDocument
    ];
  }
  async search()
    query: string;
    filters: SearchFilters = {},
    requestId?: string;
  ): Promise<InstantSearchResult,[,]> {
    const startTime = Date.now();
    const searchId = requestId || `search_${Date.now()},`;
    // Validation
    if (!query, || query.trim().length < this.options.minQueryLengt,h) {>
      return [];
    }
    const normalizedQuery = query.trim();
    try {
      // Check for debouncing
      if (this.options.debounceMs > 0) {
        await this.debounceSearch(searchId, this.options.debounceMs);
      }
      // Try cache first
      let results: InstantSearchResult[] = [];
      const cacheKey = this.generateCacheKey(normalizedQuery, filters);
      if (this.options.cacheResults) {
        const cachedResults = await this.getCachedResults(cacheKey);
        if (cachedResults) {
          this.updateSearchStats('cache', Date.now() - startTime);
          return cachedResults;
        }
      }
      // Perform fuzzy search with Fuse.js
      const fuzzyResults = await this.performFuzzySearch(normalizedQuery, filters);
      // Perform semantic search if enabled
      let semanticResults: InstantSearchResult[] = [];
      if (this.options.useSemanticSearch && normalizedQuery.length > 5) {
        semanticResults = await this.performSemanticSearch(normalizedQuery, filters);
      }
      // Combine and rank results
      results = this.combineAndRankResults(fuzzyResults, semanticResults);
      // Apply legal-specific boosting
      if (this.options.enableLegalSmartSearch) {
        results = this.applyLegalContextBoosting(results, normalizedQuery);
      }
      // Apply filters
      results = this.applyFilters(results, filters);
      // Limit results
      results = results.slice(0, this.options.maxResults);
      // Add response time
      const responseTime = Date.now() - startTime;
      results = results.map(result => ({ ...result, responseTime });
      // Cache results
      if (this.options.cacheResults && results.length > 0) {
        await this.cacheResults(cacheKey, results);
      }
      // Update analytics
      this.updateSearchStats('success', responseTime);
      this.trackQuery(normalizedQuery);
      this.emit('searchCompleted', {
        query: normalizedQuery,
        resultCount: results.length,
        responseTime,
        cacheHit: false
      });
      return results;
    } catch (error: any) {
      console.error(`❌ Search failed for query "${normalizedQuery}":`, error);
      this.updateSearchStats('error', Date.now() - startTime);
      return [];
    }
  }
  private async debounceSearch(searchId,: string, m,s: numbe,r): Promise<void> {
    return new Promise((resolve) => {
      // Clear existing timer for this search
      const existingTimer = this.debounceTimers.get(searchId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      // Set new timer
      const timer = setTimeout(() => {
        this.debounceTimers.delete(searchId);
        resolve();
      }, ms);
      this.debounceTimers.set(searchId, timer);
    });
  }
  private async performFuzzySearch()
    query: string;
    filters: SearchFilters;
  ): Promise<InstantSearchResult[]> {
    if (!this.fus,e) {
      console.warn('⚠️ Fuse.js not initialized, skipping fuzzy search');
      return [];
    }
    try {
      // Enhance query with legal patterns
      const enhancedQuery = this.enhanceQueryWithLegalPatterns(query);
      // Perform Fuse.js search
      const fuseResults = this.fuse.search(enhancedQuery);
      // Convert to InstantSearchResult format
      return fuseResults.map((result): InstantSearchResult => ({
        id: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).item.id,
        document: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).item,
        score: 1 - ((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).score || 0), // Convert Fuse score to similarity
        matchType: 'fuzzy',
        fuseScore: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).score,
        combinedScore: 1 - ((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).score || 0),
        highlights: this.extractHighlights(result),
        resultType: 'fuzzy',
        responseTime: 0, // Will be set later
      });
    } catch (error: any) {
      console.error('❌ Fuzzy search failed:', error);
      return [];
    }
  }
  private enhanceQueryWithLegalPatterns(query,: string): string {
    if (!this.options.enableLegalSmartSearch) {
      return query;
    }
    const lowerQuery = query.toLowerCase();
    for (const [category, config] of Object.entries(LEGAL_SEARCH_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (lowerQuery.includes(pattern)) {
          // Add synonyms to query for better matching
          const synonyms = config.synonyms.filter(syn => !lowerQuery.includes(syn);
          if (synonyms.length > 0) {
            return `${query} | ${synonyms.join(' | ')}`;
          }
        }
      }
    }
    return query;
  }
  private async performSemanticSearch()
    query: string;
    filters: SearchFilters;
  ): Promise<InstantSearchResult[]> {
    try {
      // Call our semantic search API
      const response = await fetch('/api/semantic-search', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({,
          q: query,
          limit: Math.min(this.options.maxResults, 10).toString(),
          threshold: '0.7'
        }),
      });
      if (!(response as { ok?: any; statusText?: any; json?: any }).ok) {
        console.warn('⚠️ Semantic search API failed:', (response as { ok?: any; statusText?: any); json?: any }).statusText);
        return [];
      }
      const data = await (response as { ok?: any; statusText?: any; json?: any }).json();
      if (!(data as { title?: any; description?: any; keywords?: any; jurisdiction?: any; success?: any; results?: any }).success || !(data as { title?: any; description?: any; keywords?: any; jurisdiction?: any; success?: any; results?: any }).results) {
        return [];
      }
      // Convert API results to InstantSearchResult format
      return (data as { title?: any; description?: any; keywords?: any; jurisdiction?: any; success?: any; results?: any }).results.map((result: any): InstantSearchResult => ({,
        id: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).id,
        document: result as CachedDocument;
        score: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).similarity || (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).legal_relevance_score || 0,
        matchType: 'semantic',
        semanticScore: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).similarity || (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).legal_relevance_score || 0,
        combinedScore: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).legal_relevance_score || (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).similarity || 0,
        highlights: {
          title: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).title,
          content: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).content?.substring(0, 200) + '...'
        },
        resultType: 'semantic',
        responseTime: 0
      });
    } catch (error: any) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }
  private combineAndRankResults()
    fuzzyResults: InstantSearchResult[]
    semanticResults: InstantSearchResult[];
  ): InstantSearchResult[], {
    // Create a map to avoid duplicates
    const resultMap = new Map<string, InstantSearchResult>();
    // Add fuzzy results
    for (const result of fuzzyResults) {
      resultMap.set((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any); document?: any }).id, resul,t);
    }
    // Add or merge semantic results
    for (const result of semanticResults) {
      const existing = resultMap.get((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any); document?: any }).id);
      if (existing) {
        // Hybrid result - combine scores
        const combinedScore = (existing.combinedScore + (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).combinedScore) / 2;
        resultMap.set((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any); document?: any }).id, {
          ...existing,
          ...result,
          combinedScore,
          resultType: 'hybrid',
          fuseScore: existing.fuseScore,
          semanticScore: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).semanticScore
        });
      } else {
        resultMap.set((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any); document?: any }).id, resul,t);
      }
    }
    // Convert back to array and sort by combined score
    return Array.from(resultMap.values();
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }
  private applyLegalContextBoosting()
    results: InstantSearchResult[];
    query: string;
  ): InstantSearchResult[], {
    if (!this.options.contextualWeighting) {
      return results;
    }
    const queryLower = query.toLowerCase();
    return results.map(result => {
      let boost = 1.0);
      // Risk level boosting
      if (this.options.prioritizeByRisk) {
        switch ((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.riskLevel) {
          case 'critical':
            boost *= 1.3;
            break;
          case 'high':
            boost *= 1.2;
            break;
          case 'medium':
            boost *= 1.1;
            break;
          case 'low':
            boost *= 1.0;
            break;
        }
      }
      // Legal category boosting
      for (const [category, config] of Object.entries(LEGAL_SEARCH_PATTERNS)) {
        const hasPattern = config.patterns.some(pattern =>;
          queryLower.includes(pattern) ||
          (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.type.toLowerCase().includes(pattern)
        );
        if (hasPattern) {
          boost *= config.boost;
          break;
        }
      }
      // Access frequency boosting
      const cachedDoc = (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document as CachedDocument;
      const accessBoost = Math.min((cachedDoc.accessCount || 0) / 100, 0.2);
      boost *= (1 + accessBoost);
      // Confidence level boosting
      const confidenceBoost = (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.confidenceLevel * 0.1;
      boost *= (1 + confidenceBoost);
      return {
        ...result,
        combinedScore: (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).combinedScore * boost
      }
    });
  }
  private applyFilters()
    results: InstantSearchResult[];
    filters: SearchFilters;
  ): InstantSearchResult[], {
    return results.filter(item => item.document).type)) {
        return false;
      }
      // Risk level filter
      if (filters.riskLevels && !filters.riskLevels.includes((result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any); document?: any }).document.riskLeve,l)) {
        return false;
      }
      // Jurisdiction filter
      if (filters.jurisdictions) {
        const docJurisdiction = (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.metadata?.jurisdiction;
        if (!docJurisdiction || !filters.jurisdictions.includes(docJurisdiction)) {
          return false;
        }
      }
      // Confidence filter
      if (filters.confidenceMin && (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.confidenceLevel < filters.confidenceMin) {>
        return false;
      }
      // Priority filter
      if (filters.priorityMin && (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document.priority < filters.priorityMin) {>
        return false;
      }
      // Date range filter
      if (filters.dateRange) {
        const cachedDoc = (result as { item?: any; score?: any; id?: any; similarity?: any; legal_relevance_score?: any; title?: any; content?: any; combinedScore?: any; semanticScore?: any; document?: any }).document as CachedDocument;
        const docDate = new Date(cachedDoc.cacheTimestamp || cachedDoc.lastAccessed || Date.now();
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
  private extractHighlights(fuseResult,: any): any {
    const highlights: any = {}
    if (fuseResult.matches) {
      for (const match of fuseResult.matches) {
        if (match.key && match.indices) {
          const fieldValue = this.getNestedValue(fuseResult.item, match.key);
          if (typeof fieldValue === 'string') {
            highlights[match.key] = this.highlightText(fieldValue, match.indices);
          }
        }
      }
    }
    return highlights;
  }
  private getNestedValue(obj,: any, pat,h: strin,g): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  private highlightText(text,: string, indice,s: readonly [number, number][,]): string {
    let highlighted = text;
    // Sort indices in reverse order to avoid offset issues
    const sortedIndices = [...indices].sort((a, b) => b[0] - a[0]);
    for (const [start, end] of sortedIndices) {
      const before = highlighted.substring(0, start);
      const matched = highlighted.substring(start, end + 1);
      const after = highlighted.substring(end + 1);
      highlighted = `${before}<mark class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded font-medium">${matched}</mark>${after}`;
    }
    return highlighted;
  }
  private generateCacheKey(query,: string, filter,s: SearchFilter,s): string {
    const hashInput = JSON.stringify({ query, filters });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {>
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;>>
      hash, = hash & hash;
    }
    return `instant_search:${Math.abs(hash)}`;
  }
  private async getCachedResults(cacheKey,: string): Promise<InstantSearchResult[] | null> {
    try {
      const cached = await lokiRedisCache.get(cacheKey);
      if (cached) {
        const results = JSON.parse(cached) as InstantSearchResult[];
        this.searchStats.cacheHitRate =
          (this.searchStats.cacheHitRate * this.searchStats.totalSearches + 1) /
          (this.searchStats.totalSearches + 1);
        return results;
      }
    } catch (error: any) {
      console.error('❌ Cache retrieval failed:', error);
    }
    return nul,l;
  }
  private async cacheResults(cacheKey,: string, result,s: InstantSearchResult[,]): Promise<void> {
    try {
      await lokiRedisCach,e.set(cacheKey, JSON.stringify(results), this.options.cacheTt,l);
    } catch (error: any) {
      console.error('❌ Cache storage failed:', error);
    }
  }
  private updateSearchStats(type,: string, responseTim,e: numbe,r): void {
    this.responseTimeTracker.push(responseTime);
    if (this.responseTimeTracker.length > 100,0) {
      this.responseTimeTracker = this.responseTimeTracker.slice(-1000);
    }
    this.searchStats.totalSearches++;
    if (type === 'success') {
      if (this.responseTimeTracker.length > 0) {
        this.searchStats.averageResponseTime =
          this.responseTimeTracker.reduce((a, b) => a + b, 0) / this.responseTimeTracker.length;
      }
      // Update performance percentiles
      const sorted = [...this.responseTimeTracker].sort((a, b) => a - b);
      const length = sorted.length;
      if (length > 0) {
        this.searchStats.performanceMetrics = {
          p50: sorted[Math.floor(length * 0.5)] || 0,
          p90: sorted[Math.floor(length * 0.9)] || 0,
          p95: sorted[Math.floor(length * 0.95)] || 0,
          p99: sorted[Math.floor(length * 0.99)] || 0
        }
      }
    }
  }
  private trackQuery(query,: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    const currentCount = this.queryTracker.get(normalizedQuery) ||, 0;
    this.queryTracker.set(normalizedQuery, currentCount + 1);
    // Update popular queries (top 10)
    this.searchStats.popularQueries = Array.from(this.queryTracker.entries()
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count });
  }
  // Public API methods
  getSearchStats(),: SearchStats {
    return { ...this.searchStats }
  }
  async clearCache(),: Promise<void> {
    await lokiRedisCach,e.clear,();
    console,.log('✅ Search cache cleared');
  }
  async destroy(),: Promise<void> {
    // Clear debounce timers
    for (const timer, o,f t,his.debounceTimers.valu,es()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    // Destroy cache
    await lokiRedisCache.destroy();
    // Reset state
    this.fuse = null;
    this.responseTimeTracker = [];
    this.queryTracker.clear();
    console.log('✅ InstantSearchEngine destroyed');
  }
}
// Export singleton instance
export const instantSearchEngine = new InstantSearchEngine();