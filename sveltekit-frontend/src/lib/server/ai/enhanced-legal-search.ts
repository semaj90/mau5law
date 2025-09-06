
// Enhanced Legal AI Search Service with LangChain.js, Nomic Embed, and pgvector
// Implements RAG pattern with vector similarity search and semantic enhancement

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { DistanceStrategy } from "@langchain/community/vectorstores/pgvector";
import type { Document as LangChainDocumentType } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { OllamaEmbeddings } from "@langchain/ollama";
import { db, sql, eq, and, or, desc, asc } from '../db/index.js';

// Define legal document type
type LegalDocumentType = {
  id: string;
  title: string;
  description: string;
  content: string;
  jurisdiction: string;
  category: string;
  code?: string;
  sections?: string[];
  url?: string;
};

// Load legal documents dynamically to avoid top-level await issues
async function loadLegalDocuments(): Promise<LegalDocumentType[]> {
  try {
    const legalDocsModule = await import("../../data/legal-documents.js");
    return legalDocsModule.legalDocuments || [];
  } catch (error: any) {
    console.warn("Legal documents not available, using empty array:", error);
    return [];
  }
}

// Initialize legal documents
const initializeLegalDocuments = loadLegalDocuments();

// Embedding generation helper
async function generateEmbedding(text: string, options?: { model?: string }): Promise<number[]> {
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });
  
  try {
    const result = await embeddings.embedQuery(text);
    return result;
  } catch (error: any) {
    console.error('Embedding generation failed:', error);
    return new Array(768).fill(0); // Return zero vector as fallback
  }
}

// Custom embeddings class for Nomic Embed integration  
export class NomicEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await generateEmbedding(text, { model: "local" });
      embeddings.push(embedding || []);
    }
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const embedding = await generateEmbedding(text, { model: "local" });
    return embedding || [];
  }
}

// Enhanced Legal Search Configuration
export interface LegalSearchConfig {
  useVector: boolean;
  useFallback: boolean;
  maxResults: number;
  similarityThreshold: number;
  boostFactors: {
    title: number;
    exact_match: number;
    jurisdiction: number;
    category: number;
    recency: number;
  };
}

const defaultConfig: LegalSearchConfig = {
  useVector: true,
  useFallback: true,
  maxResults: 10,
  similarityThreshold: 0.7,
  boostFactors: {
    title: 2.0,
    exact_match: 3.0,
    jurisdiction: 1.5,
    category: 1.3,
    recency: 1.2
  }
};

// Enhanced Legal Search Result
export interface LegalSearchResult {
  id: string;
  title: string;
  content: string;
  description?: string;
  jurisdiction: string;
  category: string;
  code?: string;
  sections?: string[];
  url?: string;
  score: number;
  searchType: 'vector' | 'hybrid' | 'fallback';
  confidence: number;
  relevanceFactors: {
    semantic: number;
    exact_match: number;
    jurisdiction_match: number;
    category_match: number;
  };
  metadata?: Record<string, any>;
}

// Main Enhanced Legal Search Service
export class EnhancedLegalSearchService {
  private embeddings: NomicEmbeddings;
  private memoryVectorStore?: MemoryVectorStore;
  private pgVectorStore?: PGVectorStore;
  private config: LegalSearchConfig;

  constructor(config: Partial<LegalSearchConfig> = {}) {
    this.embeddings = new NomicEmbeddings();
    this.config = { ...defaultConfig, ...config };
    this.initializeVectorStores();
  }

  private async initializeVectorStores() {
    try {
      // Initialize memory vector store with legal documents
      await this.initializeMemoryVectorStore();
      
      // Attempt to initialize pgvector store
      await this.initializePgVectorStore();
    } catch (error: any) {
      console.warn("Vector store initialization warning:", error);
    }
  }

  private async initializeMemoryVectorStore() {
    try {
      const legalDocuments = await initializeLegalDocuments;
      const documents = legalDocuments.map(doc => ({
        pageContent: `${doc.title}\n\n${doc.description}\n\n${doc.content}`,
        metadata: {
          id: doc.id,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
          category: doc.category,
          code: doc.code,
          sections: doc.sections || [],
          url: doc.url
        }
      }));

      this.memoryVectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        this.embeddings
      );

      console.log(`✅ Memory vector store initialized with ${documents.length} documents`);
    } catch (error: any) {
      console.error("Memory vector store initialization failed:", error);
    }
  }

  private async initializePgVectorStore() {
    try {
      // Only attempt if database is available
      if (import.meta.env.DATABASE_URL) {
        const pgConfig = {
          postgresConnectionOptions: {
            connectionString: import.meta.env.DATABASE_URL,
          },
          tableName: "search_index",
          columns: {
            idColumnName: "id",
            vectorColumnName: "embedding",
            contentColumnName: "content", 
            metadataColumnName: "metadata",
          },
          distanceStrategy: "cosine" as any,
        };

        // Initialize PGVector store
        this.pgVectorStore = new (PGVectorStore as any)(this.embeddings, pgConfig);

        console.log("✅ PGVector store initialized");
      }
    } catch (error: any) {
      console.warn("PGVector store initialization failed (fallback to memory):", error);
    }
  }

  // Main search method with multiple strategies
  async search(
    query: string,
    options: {
      jurisdiction?: string;
      category?: string;
      maxResults?: number;
      useAI?: boolean;
    } = {}
  ): Promise<LegalSearchResult[]> {
    const results: LegalSearchResult[] = [];

    try {
      // 1. Vector similarity search
      if (this.config.useVector) {
        const vectorResults = await this.performVectorSearch(query, options);
        results.push(...vectorResults);
      }

      // 2. Hybrid search (combining vector + traditional)
      const hybridResults = await this.performHybridSearch(query, options);
      results.push(...hybridResults);

      // 3. Fallback search if needed
      if (results.length === 0 && this.config.useFallback) {
        const fallbackResults = await this.performFallbackSearch(query, options);
        results.push(...fallbackResults);
      }

      // 4. Deduplicate, score, and rank results
      const finalResults = this.deduplicateAndRankResults(results, query, options);

      return finalResults.slice(0, options.maxResults || this.config.maxResults);

    } catch (error: any) {
      console.error("Enhanced legal search failed:", error);
      return await this.performFallbackSearch(query, options);
    }
  }

  // Vector similarity search using LangChain.js
  private async performVectorSearch(
    query: string,
    options: any
  ): Promise<LegalSearchResult[]> {
    const results: LegalSearchResult[] = [];

    try {
      // Use PGVector if available, otherwise use memory store
      const vectorStore = this.pgVectorStore || this.memoryVectorStore;
      
      if (!vectorStore) {
        throw new Error("No vector store available");
      }

      // Perform similarity search
      const metadataFilter = this.buildMetadataFilter(options);
      const searchResults = metadataFilter
        ? await vectorStore.similaritySearch(query, options.maxResults || 20)
        : await vectorStore.similaritySearch(query, options.maxResults || 20);

      for (const doc of searchResults) {
        const score = 0.8; // Default score since we don't have scores from similaritySearch
        if (score >= this.config.similarityThreshold) {
          results.push({
            id: doc.metadata?.id || `vec_${Date.now()}_${Math.random()}`,
            title: doc.metadata?.title || "Legal Document",
            content: doc.pageContent,
            description: doc.metadata?.description,
            jurisdiction: doc.metadata?.jurisdiction || "unknown",
            category: doc.metadata?.category || "general",
            code: doc.metadata?.code,
            sections: doc.metadata?.sections || [],
            url: doc.metadata?.url,
            score: this.normalizeScore(score),
            searchType: 'vector',
            confidence: this.calculateConfidence(score, 'vector'),
            relevanceFactors: {
              semantic: score,
              exact_match: this.calculateExactMatch(query, doc.pageContent),
              jurisdiction_match: this.calculateJurisdictionMatch(options.jurisdiction, doc.metadata?.jurisdiction),
              category_match: this.calculateCategoryMatch(options.category, doc.metadata?.category)
            },
            metadata: doc.metadata || {}
          });
        }
      }

      console.log(`🔍 Vector search found ${results.length} results`);
    } catch (error: any) {
      console.warn("Vector search failed:", error);
    }

    return results;
  }

  // Hybrid search combining multiple approaches
  private async performHybridSearch(
    query: string,
    options: any
  ): Promise<LegalSearchResult[]> {
    const results: LegalSearchResult[] = [];

    try {
      // Database search with text matching
      const dbResults = await this.performDatabaseTextSearch(query, options);
      results.push(...dbResults);

      // Fuzzy matching on static legal documents
      const fuzzyResults = await this.performFuzzySearch(query, options);
      results.push(...fuzzyResults);

    } catch (error: any) {
      console.warn("Hybrid search failed:", error);
    }

    return results;
  }

  // Database text search (disabled - no db connection)
  private async performDatabaseTextSearch(
    query: string,
    options: any
  ): Promise<LegalSearchResult[]> {
    // Database search disabled for now - returning empty results
    console.log("Database search disabled - using static data only");
    return [];
  }

  // Fuzzy search on static documents
  private async performFuzzySearch(
    query: string,
    options: any
  ): Promise<LegalSearchResult[]> {
    const results: LegalSearchResult[] = [];

    try {
      const legalDocuments = await initializeLegalDocuments;
      const queryLower = query.toLowerCase();
      
      for (const doc of legalDocuments) {
        const score = this.calculateFuzzyScore(queryLower, doc);
        
        if (score > 0.3) {
          results.push({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            description: doc.description,
            jurisdiction: doc.jurisdiction,
            category: doc.category,
            code: doc.code,
            sections: doc.sections,
            url: doc.url,
            score: score,
            searchType: 'hybrid',
            confidence: this.calculateConfidence(score, 'fuzzy'),
            relevanceFactors: {
              semantic: score * 0.7,
              exact_match: this.calculateExactMatch(query, doc.content),
              jurisdiction_match: this.calculateJurisdictionMatch(options.jurisdiction, doc.jurisdiction),
              category_match: this.calculateCategoryMatch(options.category, doc.category)
            }
          });
        }
      }

    } catch (error: any) {
      console.warn("Fuzzy search failed:", error);
    }

    return results;
  }

  // Fallback search for when other methods fail
  private async performFallbackSearch(
    query: string,
    options: any
  ): Promise<LegalSearchResult[]> {
    console.log("🔄 Using fallback search");
    
    const legalDocuments = await initializeLegalDocuments;
    const queryLower = query.toLowerCase();
    const results: LegalSearchResult[] = [];

    // Simple keyword matching on legal documents
    for (const doc of legalDocuments) {
      const titleMatch = doc.title.toLowerCase().includes(queryLower);
      const contentMatch = doc.content.toLowerCase().includes(queryLower);
      const descMatch = doc.description.toLowerCase().includes(queryLower);

      if (titleMatch || contentMatch || descMatch) {
        let score = 0.5;
        if (titleMatch) score += 0.3;
        if (contentMatch) score += 0.2;
        if (descMatch) score += 0.1;

        results.push({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          description: doc.description,
          jurisdiction: doc.jurisdiction,
          category: doc.category,
          code: doc.code,
          sections: doc.sections,
          url: doc.url,
          score: Math.min(score, 1.0),
          searchType: 'fallback',
          confidence: 0.6,
          relevanceFactors: {
            semantic: 0.5,
            exact_match: titleMatch ? 1.0 : 0.0,
            jurisdiction_match: this.calculateJurisdictionMatch(options.jurisdiction, doc.jurisdiction),
            category_match: this.calculateCategoryMatch(options.category, doc.category)
          }
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // Utility methods
  private buildMetadataFilter(options: any): Record<string, any> | undefined {
    const filter: Record<string, any> = {};
    
    if (options.jurisdiction && options.jurisdiction !== 'all') {
      filter.jurisdiction = options.jurisdiction;
    }
    
    if (options.category && options.category !== 'all') {
      filter.category = options.category;
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private calculateFuzzyScore(query: string, doc: any): number {
    let score = 0;
    const queryTerms = query.split(' ').filter(term => term.length > 2);
    
    for (const term of queryTerms) {
      if (doc.title.toLowerCase().includes(term)) score += 0.4;
      if (doc.description.toLowerCase().includes(term)) score += 0.3;
      if (doc.content.toLowerCase().includes(term)) score += 0.2;
      if (doc.code?.toLowerCase().includes(term)) score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculateExactMatch(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower.includes(queryLower)) {
      return queryLower.length / textLower.length;
    }
    return 0;
  }

  private calculateJurisdictionMatch(queryJurisdiction?: string, docJurisdiction?: string): number {
    if (!queryJurisdiction || queryJurisdiction === 'all') return 0.5;
    return queryJurisdiction === docJurisdiction ? 1.0 : 0.3;
  }

  private calculateCategoryMatch(queryCategory?: string, docCategory?: string): number {
    if (!queryCategory || queryCategory === 'all') return 0.5;
    return queryCategory === docCategory ? 1.0 : 0.3;
  }

  private calculateConfidence(score: number, searchType: string): number {
    const baseConfidence = {
      vector: 0.9,
      hybrid: 0.8,
      fuzzy: 0.7,
      fallback: 0.6
    };

    return Math.min(baseConfidence[searchType] * score, 1.0);
  }

  private normalizeScore(score: number): number {
    // Normalize different scoring systems to 0-1 range
    return Math.max(0, Math.min(1, 1 - score)); // For similarity distance scores
  }

  private deduplicateAndRankResults(
    results: LegalSearchResult[],
    query: string,
    options: any
  ): LegalSearchResult[] {
    // Remove duplicates by ID
    const uniqueResults = new Map<string, LegalSearchResult>();
    
    for (const result of results) {
      const existing = uniqueResults.get(result.id);
      if (!existing || result.score > existing.score) {
        uniqueResults.set(result.id, result);
      }
    }

    // Apply boosting factors and re-rank
    const boostedResults = Array.from(uniqueResults.values()).map(result => {
      let boostedScore = result.score;
      
      // Apply boosts
      if (result.relevanceFactors.exact_match > 0.8) {
        boostedScore *= this.config.boostFactors.exact_match;
      }
      
      if (result.title.toLowerCase().includes(query.toLowerCase())) {
        boostedScore *= this.config.boostFactors.title;
      }

      if (options.jurisdiction === result.jurisdiction) {
        boostedScore *= this.config.boostFactors.jurisdiction;
      }

      if (options.category === result.category) {
        boostedScore *= this.config.boostFactors.category;
      }

      return {
        ...result,
        score: Math.min(boostedScore, 1.0)
      };
    });

    // Final ranking
    return boostedResults.sort((a, b) => {
      // Primary sort by score
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score;
      }
      
      // Secondary sort by search type preference
      const typeOrder = { vector: 3, hybrid: 2, fallback: 1 };
      return typeOrder[b.searchType] - typeOrder[a.searchType];
    });
  }
}

// Export singleton instance
export const enhancedLegalSearch = new EnhancedLegalSearchService();
;
