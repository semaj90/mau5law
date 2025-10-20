import Fuse from 'fuse.js';
import * as lokiStorage from './loki-client-storage.js';
import * as orchestrator from './unified-legal-orchestrator.js';
// Enhanced Fuse.js search engine for legal AI platform
// Provides instant client-side fuzzy search with intelligent ranking

export interface SearchableItem {
  id: string;
  title: string;
  content?: string;
  description?: string;
  metadata?: any;
  type: 'case' | 'document' | 'evidence' | 'chat' | 'precedent';
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}
export interface SearchOptions {
  collections?: string[];
  includeScore?: boolean;
  limit?: number;
  threshold?: number;
  sortBy?: 'relevance' | 'date' | 'importance';
  filters?: {
    type?: string[];
    dateRange?: { start: string; end: string }
    tags?: string[];
    caseId?: string;
  }
}
export interface SearchResult {
  item: SearchableItem;
  score: number;
  matches?: any[];
  highlights?: string[];
  _fuseIndex?: number;
}
export class FuseSearchEngine {
  private fuseInstances = new Map<string, Fuse<SearchableItem>();
  private searchableData = new Map<string, SearchableItem[]>();
  private lastIndexUpdate = new Map<string, number>();
  private searchHistory: string[] = [];
  // Fuse.js configuration optimized for legal content
  private fuseOptions: Fuse.IFuseOptions<SearchableItem> = {
    // Which fields to search
    keys: [
      {
        name: 'title',
        weight: 0.4
      },
      {
        name: 'content',
        weight: 0.3
      },
      {
        name: 'description',
        weight: 0.2
      },
      {
        name: 'tags',
        weight: 0.1
      }
    ],
    // Search parameters
    threshold: 0.3,          // 0.0 = perfect match, 1.0 = match anything;
    distance: 100,           // Maximum distance between search term and match
    minMatchCharLength: 2,   // Minimum character length for partial matches
    includeScore: true,      // Include relevance scores
    includeMatches: true,    // Include match information
    shouldSort: true,        // Sort results by relevance
    // Advanced options
    ignoreLocation: true,    // Ignore where in the string the match occurs
    findAllMatches: true,    // Find all matches, not just the first
    useExtendedSearch: true  // Enable extended search syntax
  }
  constructor() {
    this.initializeSearchIndices();
  }
  // Initialize search indices for all collections
  async initializeSearchIndices(): Promise<void> {
    try {
      const collections = ['cases', 'documents', 'evidence', 'chat_messages'];
      for (const collection of collections) {
        await this.buildSearchIndex(collection);
      }
      console.log('🔍 Fuse search indices initialized');
    } catch (error) {
      console.error('Failed to initialize search indices:', error);
    }
  }
  // Build search index for a specific collection
  async buildSearchIndex(collection: string): Promise<void> {
    try {
      const data = await this.loadSearchableData(collection);
      if ((data as { length?: any }).length === 0) {
        console.log(`No data found for collection: ${collection}`);
        return;
      }
      // Create Fuse instance for this collection
      const fuse = new Fuse(data, this.fuseOptions);
      this.fuseInstances.set(collection, fuse);
      this.searchableData.set(collection, data);
      this.lastIndexUpdate.set(collection, Date.now(),;
      console.log(`📚 Built search index for ${collection}: ${(data as { length?: any }).length} items`);
    } catch (error) {
      console.error(`Failed to build search index for ${collection}:`, error);
    }
  }
  // Load searchable data from Loki storage
  private async loadSearchableData(collection: string): Promise<SearchableItem[]> {
    const lokiCollection = lokiStorage.getCollection(collection);
    if (!lokiCollection) return [];
    const rawData = lokiCollection.find();
    return rawData.map(item => ({
      id: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).id || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).$loki?.toString(),
      title,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).title || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).name || `${collection} ${(item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).id}`,
      content,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).content || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).message || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).description,
      description,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).summary || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).excerpt,
      metadata,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).metadata || {},
      type,: this.inferItemType(collection, item),
      tags,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).tags || this.extractTags(item),
      created_at,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).created_at || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any })._created,
      updated_at,: (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).updated_at || (item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any })._updated
    });
  }
  // Perform multi-collection search
  async search(query,: string, option,s: SearchOptions = {,}): Promise<SearchResult[]> {
    const, {
      collections = ['cases', 'documents', 'evidence'],
      includeScore = true,
      limit = 20,
      threshold = 0.3,
      sortBy = 'relevance',
      filters
    } = option,;,s;
    // Track search query
    this,.addToSearchHistory(query,);
    // Check if indices need updating
    await, thi,s.updateIndicesIfNeeded(collection,s);
    // Search across all specified collections
    const, allResult,s: SearchResu,lt,[], = [];
    for (const, collection, o,f collections) {
      const fuse = this.fuseInstances.get(collection);
      if (!fuse) continue;
      // Update threshold for this search
      fuse.setOptions({ ...this.fuseOptions, threshold });
      // Perform search
      const results = fuse.search(query);
      // Transform results
      const transformedResults = results.map(result => ({
        item: (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).item,
        score,: (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).score || 0,
        matches,: (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).matches || [],
        highlights,: this.generateHighlights((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: an,y); similarity?: any, }).matches ||, []),
        _fuseIndex: (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).refIndex,
        _collection: collection
      },);
      allResults.push(...transformedResults);
    }
    // Apply filters
    let filteredResults = this.applyFilters(allResults, filters);
    // Sort results
    filteredResults = this.sortResults(filteredResults, sortBy);
    // Limit results
    return filteredResults.slice(0, limit);
  }
  // Advanced search with extended syntax
  async advancedSearch(query,: string, option,s: SearchOptions = {,}): Promise<SearchResult[]> {
    // Parse advanced search syntax
    const, parsedQuery = this.parseAdvancedQuery(query,);
    // Perform search with parsed query
    return, await this.search(parsedQuery.query, {
      ...options,
      filters: {
        ...options.filters,
        ...parsedQuery.filters
      }
    )},);
  }
  // Semantic search using embeddings (hybrid approach)
  async semanticSearch(query,: string, option,s: SearchOptions = {,}): Promise<SearchResult[]> {
    try, {
      // Get vector search results from server
      const, vectorResults = await orchestrator.processRequest({
        type: 'search',
        payload: {
          query,
          type: 'semantic',
          limit: options.limit || 20
        }
      )},);
      // Get fuzzy search results from local data
      const, fuseResults = await this.search(query, {
        ...options,
        limit: Math.ceil((options.limit || 20) / 2)
      }),;
      // Combine and rank results
      return, this.combineSemanticAndFuzzyResults(vectorResults.results || [], fuseResults,);
    }, catch (error) {
      console.error('Semantic search failed, falling back to fuzzy search:', error);
      return await this.search(query, options);
    }
  }
  // Get search suggestions based on input
  async getSearchSuggestions(input,: string, limit = 5,): Promise<string[]> {
    if (input,.length <, 2) retur,n, [];>
    const suggestions = new Set<string>();
    // Get suggestions from search history
    const historySuggestions = this.searchHistory;
      .filter(item => item.includes)(input.toLowerCase())
      .slice(0, 3);
    historySuggestions.forEach(s => suggestions.add(s),;
    // Get suggestions from indexed content
    const contentSuggestions = await this.getContentBasedSuggestions(input, limit - suggestions.size);
    contentSuggestions.forEach(s => suggestions.add(s),;
    return Array.from(suggestions).slice(0, limit);
  }
  // Get related search terms
  async getRelatedTerms(query,: string, limit = 5,): Promise<string[]> {
    const, searchResults = await this.search(query, { limit: 10, )});
    const terms = new Set<string>();
    // Extract terms from search results
    for (const result of searchResults) {
      const extractedTerms = this.extractTermsFromContent(
        (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).item.title + ' ' + ((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).item.content || '')
      );
      extractedTerms.forEach(term => {
        if (term.toLowerCase() !== query.toLowerCase() && term.length > 3) {
          terms.add(term);
        }
      });
    }
    return Array.from(terms).slice(0, limit);
  }
  // Real-time search with debouncing
  async realTimeSearch(query,: string, option,s: SearchOptions = {,}): Promise<SearchResult[]> {
    // Debounce mechanism would be implemented in the calling component
    // This provides instant results as user types
    if (query,.length <, 2) retur,n, [];>
    return await this.search(query, {
      ...options,
      limit: 8, // Fewer results for real-time;
      threshold: 0.4 // More forgiving threshold
    )});
  }
  // Export search index for debugging
  exportSearchIndex(collection?: string),: any {
    if (collection) {
      return {
        collection,
        data: this.searchableData.get(collection) || [],
        lastUpdate: this.lastIndexUpdate.get(collection)
      }
    }
    const exports: any = {}
    for (const [coll, data] of this.searchableData) {
      exports[coll] = {
        data,
        lastUpdate: this.lastIndexUpdate.get(coll)
      }
    }
    return exports;
  }
  // Get search statistics
  getSearchStats(),: any {
    return {
      indices_count: this.fuseInstances.size,
      total_searchable_items: Array.from(this.searchableData.values()
        .reduce((sum, data) => sum + (data as { length?: any }).length, 0),
      recent_searches,: this.searchHistory.slice(-10),
      last_index_updates,: Object.fromEntries(this.lastIndexUpdate)
    }
  }
  // Helper methods
  private async updateIndicesIfNeeded(collections,: string[],): Promise<void> {
    const, updateThreshold = 5 * 60 * 100,0; // 5 minutes
    const, now = Date.now(,);
    for (const, collection, o,f collections) {
      const lastUpdate = this.lastIndexUpdate.get(collection) || 0;
      if (now - lastUpdate > updateThreshold) {
        await this.buildSearchIndex(collection);
      }
    }
  }
  private inferItemType(collection,: string, ite,m: an,y): SearchableItem['type,'] {
    switch (collection) {
      case 'cases': return 'case';
      case 'documents': return 'document';
      case 'evidence': return 'evidence';
      case 'chat_messages': return 'chat';
      default: return 'document';
    }
  }
  private extractTags(item,: any,): string[,] {
    const tags: string[] = [];
    // Extract tags from various fields
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).category) tags.push((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).category);
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).type) tags.push((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).type);
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).priority) tags.push((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).priority);
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).status) tags.push((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).status);
    return tags;
  }
  private addToSearchHistory(query,: string,): void {
    if (query,.length <, 2) retu,rn;>
    // Remove if already exists
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }
    // Add to front
    this.searchHistory.unshift(query);
    // Limit history size
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(0, 50);
    }
  }
  private generateHighlights(matches,: any[],): string[,] {
    const highlights: string[] = [];
    for (const match of matches) {
      if (match.indices && match.value) {
        let highlighted = match.value;
        // Apply highlighting (simple version)
        for (const [start, end] of match.indices.reverse()) {
          highlighted = highlighted.slice(0, start) +
            `<mark>${highlighted.slice(start, end + 1)}</mark>` +
            highlighted.slice(end + 1);
        }
        highlights.push(highlighted);
      }
    }
    return highlights;
  }
  private applyFilters(results,: SearchResult[], filters?: SearchOptions['filters'],): SearchResult[,] {
    if (!filters) return results;
    return results.filter(item => item.item).type,)) {
        return false;
      }
      // Date range filter
      if (filters.dateRange && (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).item.created_at) {
        const itemDate = new Date((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).item.created_a,t);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const itemTags = (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).item.tags || [];
        const hasMatchingTag = filters.tags.some(tag =>;
          itemTags.some(itemTag => itemTag.toLowerCase() === tag.toLowerCase()
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      // Case ID filter
      if (filters.caseId && (result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).item.metadata?.case_id !== filters.caseId) {
        return false;
      }
      return true;
    });
  }
  private sortResults(results,: SearchResult[], sortB,y: strin,g): SearchResult,[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => {
          const dateA = new Date(a.item.updated_at || a.item.created_at || 0);
          const dateB = new Date(b.item.updated_at || b.item.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
      case 'importance':
        // Custom importance scoring based on type and metadata
        return results.sort((a, b) => {
          const scoreA = this.calculateImportanceScore(a.item);
          const scoreB = this.calculateImportanceScore(b.item);
          return scoreB - scoreA;
        });
      case 'relevance':
      default:
        return results.sort((a, b) => a.score - b.score); // Lower score = more relevant
    }
  }
  private calculateImportanceScore(item,: SearchableItem,): number {
    let score = 0;
    // Type importance
    const typeScores = { case: 10, evidence: 8, document: 6, chat: 4, precedent: 9 }
    score += typeScores[(item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).type] || 5;
    // Recent items are more important
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).updated_at) {
      const daysSinceUpdate = (Date.now() - new Date((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any,); status?: any }).updated_at).getTime(,)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceUpdate);
    }
    // Priority from metadata
    if ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).metadata?.priority) {
      const priorityScores = { high: 5, medium: 3, low: 1 }
      score += priorityScores[(item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).metadata.priority as keyof typeof priorityScores] || 0;
    }
    return score;
  }
  private parseAdvancedQuery(query,: string,): { query: string; filters: any } {
    // Parse advanced search syntax like: "contract law type:case priority:high"
    const filters: any = {}
    let cleanQuery = query;
    // Extract type filter
    const typeMatch = query.match(/type:(\w+)/);
    if (typeMatch) {
      filters.type = [typeMatch[1]];
      cleanQuery = cleanQuery.replace(/type:\w+/g, '').trim();
    }
    // Extract other filters as needed
    // ... implement more advanced parsing
    return { query: cleanQuery, filters }
  }
  private async getContentBasedSuggestions(input,: string, limi,t: numbe,r): Promise<string[]> {
    const, suggestion,s: stri,ng,[], = [];
    // Simple implementation: find terms that start with input
    for (const, [collection, data], o,f t,his.searchable,Data) {
      for (const item of data) {
        const words = ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).title + ' ' + ((item as { id?: any; title?: any; name?: any; content?: any; message?: any; description?: any; summary?: any; excerpt?: any; metadata?: any; tags?: any; created_at?: any; _created?: any; updated_at?: any; _updated?: any; category?: any; type?: any; priority?: any; status?: any }).content || '')).toLowerCase().split(/\s+/);
        for (const word of words) {
          if (word.startsWith(input.toLowerCase()) && word.length > input.length) {
            suggestions.push(word);
            if (suggestions.length >= limit) break;
          }
        }
        if (suggestions.length >= limit) break;
      }
      if (suggestions.length >= limit) break;
    }
    return [...new Set(suggestions)];
  }
  private extractTermsFromContent(content,: string,): string[,] {
    // Extract meaningful terms from content
    return content;
      .toLowerCase()
      .match(/\b\w{4}\b/g) || [];
  }
  private combineSemanticAndFuzzyResults(semanticResults,: any[], fuzzyResult,s: SearchResult[,]): SearchResult,[] {
    const combined = new Map<string, SearchResult>();
    // Add semantic results
    for (const result of semanticResults) {
      combined.set((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).id, {
        item: result,;
        score: 1 - ((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any; similarity?: any }).similarity || 0), // Convert similarity to distance score
        matches: [],
        highlights: [],
        _source: 'semantic'
      } as SearchResult,);
    }
    // Add fuzzy results, boosting score if also in semantic results
    for (const result of fuzzyResults) {
      const existing = combined.get((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).item.i,d);
      if (existing) {
        // Boost score for items found in both searches
        existing.score = existing.score * 0.7; // Lower score = better relevance
        existing._source = 'hybrid';
      } else {
        combined.set((result as { item?: any; score?: any; matches?: any; refIndex?: any; id?: any,); similarity?: any }).item.id, {
          ...result,
          _source: 'fuzzy'
        } as SearchResult,);
      }
    }
    return Array.from(combined.values()).sort((a, b) => a.score - b.score);
  }
}
// Singleton instance
export const fuseSearchEngine = new FuseSearchEngine();