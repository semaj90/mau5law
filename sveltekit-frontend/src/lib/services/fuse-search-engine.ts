import Fuse from 'fuse.js';
import * as lokiStorage from './loki-client-storage.js';
import * as orchestrator from './unified-legal-orchestrator.js';

// Local lightweight Fuse result/options types to avoid depending on non-exported namespace members
type TFuseOptions<T> = Record<string, unknown>;
type TFuseResult<T> = {
		item: T;
		score?: number;
		matches?: unknown[];
		// some Fuse builds expose a refIndex-like field
		refIndex?: number;
	};

// Enhanced Fuse.js search engine for legal AI platform
// Provides instant client-side fuzzy search with intelligent ranking

export interface SearchableItem {
	id: string;
	title: string;
	content?: string;
	description?: string;
	metadata?: Record<string, unknown>;
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
	matches?: unknown[];
	highlights?: string[];
	_fuseIndex?: number;
	_collection?: string;
	_source?: 'fuzzy' | 'semantic' | 'hybrid';
}

// Add new helper interfaces to replace 'any' return types
export interface ExportedIndex {
	collection?: string;
	data: SearchableItem[];
	lastUpdate: number | null;
}
export interface SearchStats {
	indices_count: number;
	total_searchable_items: number;
	recent_searches: string[];
	last_index_updates: Record<string, number | undefined>;
}

// New: runtime options for the engine
export interface FuseSearchEngineOptions {
	collections?: string[];
	updateIntervalMs?: number;
	autoInit?: boolean; // whether to build indices on construction (defaults true)
	debug?: boolean;
}

// Lightweight semantic result type returned by orchestrator / vector service
interface SemanticSearchResult {
	id: string;
	similarity?: number; // similarity in [0..1], higher = more similar
	item?: SearchableItem;
	_id?: string;
	[item: string]: unknown;
}

// Enhanced search engine class
export class FuseSearchEngine {
	private fuseInstances = new Map<string, Fuse<SearchableItem>>();
	private searchableData = new Map<string, SearchableItem[]>();
	private lastIndexUpdate = new Map<string, number>();
	private searchHistory: string[] = [];
	private collections: string[];
	private updateThresholdMs: number;
	private debug: boolean;

	// Use a loose type for options to avoid incorrect namespace references
	private fuseOptions: TFuseOptions<SearchableItem> = {
		// Which fields to search
		keys: [
			{ name: 'title', weight: 0.4 },
			{ name: 'content', weight: 0.3 },
			{ name: 'description', weight: 0.2 },
			{ name: 'tags', weight: 0.1 },
		],
		// Search parameters
		threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything;
		distance: 100,
		minMatchCharLength: 2,
		includeScore: true,
		includeMatches: true,
		shouldSort: true,
		// Advanced options
		ignoreLocation: true,
		findAllMatches: true,
		useExtendedSearch: true,
	};
	constructor(opts: FuseSearchEngineOptions = {}) {
		this.collections = opts.collections ?? ['cases', 'documents', 'evidence', 'chat_messages'];
		this.updateThresholdMs = opts.updateIntervalMs ?? 5 * 60 * 1000; // 5 minutes default
		this.debug = !!opts.debug;

		// Start initialization in background unless explicitly disabled
		if (opts.autoInit !== false) {
			// background init - catch to avoid unhandled promise
			this.initializeSearchIndices().catch((err) => this.logger('error', 'initializeSearchIndices failed', err));
		}
	}

	// Simple logger - controlled by debug flag (always logs warnings/errors)
	private logger(level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]) {
		if (level === 'debug' && !this.debug) return;
		// eslint-disable-next-line no-console
		(console as any)[level]?.('[FuseSearchEngine]', ...args);
	}

	// Initialize search indices for all collections
	async initializeSearchIndices(): Promise<void> {
		try {
			for (const collection of this.collections) {
				await this.buildSearchIndex(collection);
			}
			this.logger('info', '🔍 Fuse search indices initialized');
		} catch (error) {
			this.logger('error', 'Failed to initialize search indices:', error);
		}
	}

	// Add: refresh single collection index on demand
	async refreshIndex(collection: string): Promise<void> {
		try {
			await this.buildSearchIndex(collection);
			this.logger('info', `Refreshed search index for ${collection}`);
		} catch (err) {
			this.logger('warn', `Failed to refresh index ${collection}:`, err);
		}
	}

	// Build search index for a specific collection
	async buildSearchIndex(collection: string): Promise<void> {
		try {
			const data = await this.loadSearchableData(collection);
			if (!data || data.length === 0) {
				console.log(`No data found for collection: ${collection}`);
				return;
			}
			// Create Fuse instance for this collection
			const fuse = new Fuse(data, this.fuseOptions);
			this.fuseInstances.set(collection, fuse);
			this.searchableData.set(collection, data);
			this.lastIndexUpdate.set(collection, Date.now());
			console.log(`📚 Built search index for ${collection}: ${data.length} items`);
		} catch (error) {
			console.error(`Failed to build search index for ${collection}:`, error);
		}
	}
	// safe access helper: different loki wrappers may export different functions
	private safeGetCollection(name: string): unknown | null {
		if (typeof (lokiStorage as unknown as Record<string, unknown>).getCollection === 'function') {
			// @ts-ignore - dynamic runtime wrapper
			return (lokiStorage as any).getCollection(name);
		}
		if (typeof (lokiStorage as unknown as Record<string, unknown>).get === 'function') {
			// @ts-ignore - dynamic runtime wrapper
			return (lokiStorage as any).get(name);
		}
		// last resort: keyed export
		return (lokiStorage as unknown as Record<string, unknown>)[name] ?? null;
	}
	// Load searchable data from Loki storage
	private async loadSearchableData(collection: string): Promise<SearchableItem[]> {
		const lokiCollection = this.safeGetCollection(collection);
		// guard
		if (!lokiCollection || typeof (lokiCollection as any).find !== 'function') return [];
		// call find (Loki wrappers may return array)
		const rawData = (lokiCollection as any).find() as unknown[];
		return rawData.map((item: unknown) => {
			const rec = (item as Record<string, unknown> | null) ?? {};
			const id = String(rec['id'] ?? (rec['$loki'] ? String(rec['$loki']) : ''));
			const title = String(rec['title'] ?? rec['name'] ?? `${collection}-${id}`);
			return {
				id,
				title,
				content: String(rec['content'] ?? rec['message'] ?? rec['description'] ?? ''),
				description: String(rec['summary'] ?? rec['excerpt'] ?? ''),
				metadata: (rec['metadata'] as Record<string, unknown>) ?? {},
				type: this.inferItemType(collection, rec),
				tags: Array.isArray(rec['tags']) ? (rec['tags'] as unknown[]).map(String) : this.extractTags(rec),
				created_at: (rec['created_at'] ?? rec['_created']) as string | undefined,
				updated_at: (rec['updated_at'] ?? rec['_updated']) as string | undefined,
			} as SearchableItem;
		});
	}
	// Perform multi-collection search
	async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		const {
			collections = ['cases', 'documents', 'evidence'],
			// includeScore is available on options but not used internally; keep interface but don't destructure unused vars
			limit = 20,
			threshold = 0.3,
			sortBy = 'relevance',
			filters,
		} = options;

		if (!query || query.trim().length === 0) return [];

		// Track search query
		this.addToSearchHistory(query);

		// Check if indices need updating
		await this.updateIndicesIfNeeded(collections);

		// Search across all specified collections
		const allResults: SearchResult[] = [];

		for (const collection of collections) {
			const fuse = this.fuseInstances.get(collection);
			const dataForCollection = this.searchableData.get(collection) ?? [];
			if (!fuse && dataForCollection.length === 0) continue;

			// If requested threshold differs, create a temporary Fuse instance for this search.
			const baseThreshold = (this.fuseOptions['threshold'] as number) ?? 0.3;
			const fuseForSearch =
				threshold === baseThreshold
					? (fuse ?? new Fuse(dataForCollection, (this.fuseOptions as unknown) as TFuseOptions<SearchableItem>))
					: new Fuse(dataForCollection, { ...(this.fuseOptions as object), threshold } as TFuseOptions<SearchableItem>);

			// Perform search (single-argument API) and apply limit manually
			const rawResults = (fuseForSearch.search(query) as TFuseResult<SearchableItem>[]) ?? [];
			const limited = (options.limit ? rawResults.slice(0, options.limit) : rawResults).map(r => {
				const item = r.item as SearchableItem;
				const score = typeof r.score === 'number' ? r.score : 1;
				const matches = (r.matches as unknown[]) ?? [];
				const highlights = this.generateHighlights(matches);
				const refIndex = (r as unknown as Record<string, unknown>)['refIndex'] as number | undefined;
				return {
					item,
					score,
					matches,
					highlights,
					_fuseIndex: typeof refIndex === 'number' ? refIndex : undefined,
					_collection: collection,
					_source: 'fuzzy' as const,
				} as SearchResult;
			});
			allResults.push(...limited);
		}

		// Apply filters
		let filtered = this.applyFilters(allResults, filters);
		// Sort results
		filtered = this.sortResults(filtered, sortBy);
		// Limit results
		return filtered.slice(0, limit);
	}
	// Advanced search with extended syntax
	async advancedSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		// Parse advanced search syntax
		const parsed = this.parseAdvancedQuery(query);
		const mergedOptions: SearchOptions = {
			...options,
			filters: { ...(options.filters ?? {}), ...(parsed.filters ?? {}) },
		};
		// Perform search with parsed query
		return this.search(parsed.query, mergedOptions);
	}
	// Semantic search using embeddings (hybrid approach)
	async semanticSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		try {
			let vectorResults: SemanticSearchResult[] = [];
			// prefer orchestrator helper if present, typed defensively
			if (typeof (orchestrator as unknown as Record<string, unknown>)?.processRequest === 'function') {
				const resp = await (orchestrator as unknown as { processRequest: (arg: unknown) => Promise<unknown> }).processRequest({
					type: 'search',
					payload: { query, type: 'semantic', limit: options.limit ?? 20 },
				});
				vectorResults = (resp as Record<string, unknown>)?.['results'] as SemanticSearchResult[] ?? [];
			}
			// Get fuzzy search results from local data (half allocation to fuzzy)
			const fuseResults = await this.search(query, { ...options, limit: Math.ceil((options.limit ?? 20) / 2) });
			// Combine and rank results
			return this.combineSemanticAndFuzzyResults(vectorResults, fuseResults);
		} catch (err) {
			this.logger('warn', 'Semantic search failed, falling back to fuzzy search:', err);
			return this.search(query, options);
		}
	}
	// Get search suggestions based on input
	async getSearchSuggestions(input: string, limit = 5): Promise<string[]> {
		if (!input || input.length < 2) return [];
		const suggestions = new Set<string>();
		// Get suggestions from search history
		const historySuggestions = this.searchHistory
			.filter(h => h.toLowerCase().includes(input.toLowerCase()))
			.slice(0, 3);
		historySuggestions.forEach(s => suggestions.add(s));
		// Get suggestions from indexed content
		const contentSuggestions = await this.getContentBasedSuggestions(input, limit - suggestions.size);
		contentSuggestions.forEach(s => suggestions.add(s));
		return Array.from(suggestions).slice(0, limit);
	}
	// Get related search terms
	async getRelatedTerms(query: string, limit = 5): Promise<string[]> {
		const searchResults = await this.search(query, { limit: 10 });
		const terms = new Set<string>();
		// Extract terms from search results
		for (const res of searchResults) {
			const text = `${res.item.title} ${res.item.content ?? ''}`;
			const extracted = this.extractTermsFromContent(text);
			for (const t of extracted) {
				if (t.toLowerCase() !== query.toLowerCase() && t.length > 3) terms.add(t);
				if (terms.size >= limit) break;
			}
			if (terms.size >= limit) break;
		}
		return Array.from(terms).slice(0, limit);
	}
	// Real-time search with debouncing
	async realTimeSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		if (!query || query.length < 2) return [];
		return this.search(query, { ...options, limit: 8, threshold: 0.4 });
	}
	// Export search index for debugging
	exportSearchIndex(collection?: string): ExportedIndex | Record<string, ExportedIndex> {
		if (collection) {
			return {
				collection,
				data: this.searchableData.get(collection) ?? [],
				lastUpdate: this.lastIndexUpdate.get(collection) ?? null,
			};
		}
		const exports: Record<string, ExportedIndex> = {};
		for (const [coll, data] of this.searchableData) {
			exports[coll] = { data, lastUpdate: this.lastIndexUpdate.get(coll) ?? null };
		}
		return exports;
	}
	// Get search statistics
	getSearchStats(): SearchStats {
		const totalItems = Array.from(this.searchableData.values()).reduce((sum, d) => sum + (d?.length ?? 0), 0);
		return {
			indices_count: this.fuseInstances.size,
			total_searchable_items: totalItems,
			recent_searches: this.searchHistory.slice(-10),
			last_index_updates: Object.fromEntries(this.lastIndexUpdate) as Record<string, number | undefined>,
		};
	}
	// Helper methods
	private async updateIndicesIfNeeded(collections: string[]): Promise<void> {
		const now = Date.now();
		for (const collection of collections) {
			const last = this.lastIndexUpdate.get(collection) ?? 0;
			if (now - last > this.updateThresholdMs) {
				await this.buildSearchIndex(collection);
			}
		}
	}
	private inferItemType(collection: string, _item: unknown): SearchableItem['type'] {
		switch (collection) {
			case 'cases':
				return 'case';
			case 'documents':
				return 'document';
			case 'evidence':
				return 'evidence';
			case 'chat_messages':
				return 'chat';
			default:
				return 'document';
		}
	}
	private extractTags(item: unknown): string[] {
		const tags: string[] = [];
		if (!item || typeof item !== 'object') return tags;
		const rec = item as Record<string, unknown>;
		if (rec['category']) tags.push(String(rec['category']));
		if (rec['type']) tags.push(String(rec['type']));
		if (rec['priority']) tags.push(String(rec['priority']));
		if (rec['status']) tags.push(String(rec['status']));
		const rawTags = rec['tags'];
		if (Array.isArray(rawTags)) tags.push(...(rawTags as unknown[]).map(String));
		return Array.from(new Set(tags));
	}
	private addToSearchHistory(query: string): void {
		if (!query || query.length < 2) return;
		const idx = this.searchHistory.indexOf(query);
		if (idx > -1) this.searchHistory.splice(idx, 1);
		this.searchHistory.unshift(query);
		if (this.searchHistory.length > 50) this.searchHistory = this.searchHistory.slice(0, 50);
	}
	private generateHighlights(matches: unknown[] = []): string[] {
		const highlights: string[] = [];
		for (const match of matches) {
			const m = match as Record<string, unknown>;
			const value = (m['value'] as string) ?? (m['text'] as string) ?? '';
			const indices = m['indices'] as Array<[number, number]> | undefined;
			if (!indices || !Array.isArray(indices) || !value) continue;
			let highlighted = value;
			for (const [start, end] of [...indices].reverse()) {
				highlighted =
					highlighted.slice(0, start) +
					`<mark>${highlighted.slice(start, end + 1)}</mark>` +
					highlighted.slice(end + 1);
			}
			highlights.push(highlighted);
		}
		return highlights;
	}
	private applyFilters(results: SearchResult[], filters?: SearchOptions['filters']): SearchResult[] {
		if (!filters) return results;
		return results.filter(res => {
			if (!res?.item) return false;
			// Type filter
			if (filters.type && filters.type.length > 0 && !filters.type.includes(res.item.type)) return false;
			// Date range filter
			if (filters.dateRange && res.item.created_at) {
				const itemDate = new Date(res.item.created_at).getTime();
				const start = new Date(filters.dateRange.start).getTime();
				const end = new Date(filters.dateRange.end).getTime();
				if (itemDate < start || itemDate > end) return false;
			}
			// Tags filter
			if (filters.tags && filters.tags.length > 0) {
				const itemTags = (res.item.tags ?? []).map((t: string) => t.toLowerCase());
				const has = filters.tags.some(t => itemTags.includes(t.toLowerCase()));
				if (!has) return false;
			}
			// Case ID filter
			if (filters.caseId && res.item.metadata?.case_id && res.item.metadata.case_id !== filters.caseId) return false;
			return true;
		});
	}
	private sortResults(results: SearchResult[], sortBy: 'relevance' | 'date' | 'importance'): SearchResult[] {
		switch (sortBy) {
			case 'date':
				return results.sort((a, b) => {
					const dateA = new Date(a.item.updated_at ?? a.item.created_at ?? 0).getTime();
					const dateB = new Date(b.item.updated_at ?? b.item.created_at ?? 0).getTime();
					return dateB - dateA;
				});
			case 'importance':
				return results.sort((a, b) => this.calculateImportanceScore(b.item) - this.calculateImportanceScore(a.item));
			case 'relevance':
			default:
				return results.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
		}
	}
	private calculateImportanceScore(item: SearchableItem): number {
		let score = 0;
		const typeScores: Record<string, number> = { case: 10, evidence: 8, document: 6, chat: 4, precedent: 9 };
		score += typeScores[item.type] ?? 5;
		if (item.tags?.includes('important')) score += 5;
		if (item.metadata?.priority === 'high') score += 3;
		return score;
	}
	// Parse advanced search syntax (fielded search, operators)
	private parseAdvancedQuery(query: string): { query: string; filters?: Record<string, unknown> } {
		// trivial parser: split by spaces, colon for fielded search
		const tokens = query.split(/\s+/).filter(t => t.length > 0);
		const filters: Record<string, unknown> = {};
		let q = '';
		for (const token of tokens) {
			if (token.includes(':')) {
				const [key, value] = token.split(':', 2).map(t => t.trim());
				if (key && value) {
					filters[key] = value;
					continue;
				}
			}
			q += (q.length > 0 ? ' ' : '') + token;
		}
		return { query: q.trim(), filters: Object.keys(filters).length > 0 ? filters : undefined };
	}
	// Extract terms from content for related terms suggestion
	private extractTermsFromContent(content: string): string[] {
		if (!content) return [];
		// naive extraction: split by non-word chars, filter short/stop words
		const words = content.split(/\W+/).filter(w => w.length > 3 && !this.isStopWord(w));
		return Array.from(new Set(words.map(w => w.toLowerCase())));
	}
	// Replace original implementation with a safe, simple lookup against STOP_WORDS
	private isStopWord(word: string): boolean {
		if (!word) return false;
		return STOP_WORDS.has(String(word).toLowerCase());
	}
	private combineSemanticAndFuzzyResults(semanticResults: SemanticSearchResult[], fuzzyResults: SearchResult[]): SearchResult[] {
		const combined = new Map<string, SearchResult>();
		// add semantic results first
		for (const res of semanticResults) {
			const id = String(res.id ?? res._id ?? '');
			if (!id) continue;
			const score = typeof res.similarity === 'number' ? 1 - Number(res.similarity) : 1;
			combined.set(id, {
				item: (res.item as SearchableItem) ?? ({ id, title: String(res._id ?? id) } as SearchableItem),
				score,
				matches: [],
				highlights: [],
				_source: 'semantic',
			} as SearchResult);
		}
		// add fuzzy results and merge
		for (const fr of fuzzyResults) {
			const id = fr.item?.id;
			if (!id) continue;
			const existing = combined.get(id);
			if (existing) {
				// prefer the lower score (Fuse score: lower is better) and mark hybrid
				existing.score = Math.min(existing.score ?? 1, (fr.score ?? 1) * 0.7);
				existing._source = 'hybrid';
			} else {
				combined.set(id, { ...fr, _source: 'fuzzy' });
			}
		}
		// sort by score ascending (lower = better relevance in Fuse convention)
		return Array.from(combined.values()).sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
	}
}

// Add a single, precomputed stop-words set to avoid parse errors from unescaped apostrophes
const STOP_WORDS = new Set<string>(
	[
		"a","about","above","after","again","against","all","am","an","and","any","are","aren't",
		"as","at","be","because","been","before","being","below","between","both","but","by",
		"can","can't","cannot","could","couldn't","did","didn't","do","does","doesn't","doing",
		"don't","down","during","each","few","for","from","further","had","hadn't","has","hasn't",
		"have","haven't","he","he'd","he's","her","here","here's","hers","herself","him","himself",
		"is","isn't","it","it's","its","itself","just","ll","m","ma","me","might","mightn't",
		"more","most","must","mustn't","my","myself","need","needn't","no","nor","not","now",
		"o","of","off","on","once","only","or","other","ought","our","ours","ourselves","out",
		"over","own","re","s","same","shan't","she","she'd","she's","should","should've","so",
		"t","than","that","that's","the","their","theirs","them","themselves","then","there",
		"there's","these","they","they'd","they're","they've","this","those","through","to","too",
		"under","until","up","ve","very","was","wasn't","we","we'd","we're","we've","were",
		"weren't","what","what's","when","where","where's","which","while","who","who's","whom",
		"why","will","with","won't","would","wouldn't","yet","you","you'd","you're","you've",
		"your","yours","yourself","yourselves"
	].map(s => s.toLowerCase())
);

// Singleton instance - production code can import this; set autoInit true for background build
export const fuseSearchEngine = new FuseSearchEngine({ autoInit: true, debug: false });