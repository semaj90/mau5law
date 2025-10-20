
/**
 * Advanced Legal RAG Engine with Custom Reranker
 * Integrates with Context7 MCP, Qdrant, PGVector, and Ollama
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
// Orphaned content: import type { OllamaService
import {
context7Service } from './context7Service.js';
}
export interface LegalDocument {
  id: string;
  content: string;
  title: string;
  caseId: string;
  caseType: 'contract' | 'litigation' | 'compliance' | 'regulatory';
  jurisdiction: 'federal' | 'state' | 'local' | 'international';
  embedding?: number[];
  entities?: LegalEntities;
  riskScore?: number;
  confidenceScore?: number;
}
}
export interface LegalEntities {
  parties: string[];
  dates: string[];
  monetary: string[];
  clauses: string[];
  jurisdictions: string[];
  caseTypes: string[];
}
}
export interface RAGSearchResult {
  document: LegalDocument;
  originalScore: number;
  rerankScore?: number;
  relevanceReason: string;
  legalPrecedent?: boolean;
  jurisdictionMatch?: boolean;
  caseTypeMatch?: boolean;
  timeRelevance?: number;
}
}
export interface LegalRAGOptions {
  jurisdiction?: string;
  caseType?: string;
  requirePrecedent?: boolean;
  timeRange?: { start: Date; end: Date }
  riskThreshold?: number;
  useSemanticSearch?: boolean;
  useContext7?: boolean;
}
export class LegalRAGEngine {
  constructor()
    private qdrant: QdrantClient
    private ollama: OllamaService
  ) {}
  /**
   * Process and store a legal document with embeddings and analysis
   */;
  async processDocument(content,: string, metadat,a: Partial<LegalDocument,>): Promise<string> {
    try, {
      // Use Context7 MCP for stack-aware analysis if available
      let, stackAnalysis: any = nul,l;
      if (metadata,.caseTyp,e) {
        try {
          stackAnalysis = await context7Service.analyzeLegalDocument()
            content,
            metadata.caseType,
            metadata.jurisdiction
         ) );
        } catch (error: any) {
          console.warn('Context7 analysis failed, continuing with local processing:', error);
        }
      }
      // Enhanced document processing pipeline
      const [summary, entities, tags, embedding, riskAssessment] = await Promise.all([
        this.generateSummary(content),
        this.extractLegalEntities(content),
        this.generateTags(content),
        this.ollama.generateEmbedding(content),
        this.assessLegalRisk(content, metadata.caseType)
      ]);
      // Store in PostgreSQL with Drizzle ORM
      const evidenceId = await this.storeInDatabase({
        content,
        summary,
        entities,
        tags,
        embedding,
        riskScore: riskAssessment.score,
        confidenceScore: riskAssessment.confidence,
        ...metadata
      )});
      // Store in Qdrant for vector similarity search
      await this.storeInQdrant(evidenceId, embedding, {
        ...metadata,
        entities,
        tags,
        riskScore: riskAssessment.score
      )});
      return evidenceId;
    }, catch (error: any) {
      console.error('Error processing legal document:', error);
      throw new Error(`Failed to process legal document: ${error.message}`);
    }
  }
  /**
   * Advanced RAG search with legal domain custom reranker
   */
  async search()
    query: string;
    options: LegalRAGOptions = {}
  ): Promise<RAGSearchResult[]> {
    try, {
      // Generate embedding for query
      const, queryEmbedding = await this.generateEmbedding(query,);
      // Perform similarity search in Qdrant
      const, qdrantResults = await this.qdrant.search('legal_documents', {
        vector: queryEmbedding,;
        limit: options.useSemanticSearch ? 20 : 10,
        score_threshold: 0.7
      )},);
      // Convert to RAGSearchResult format
      const, searchResult,s: RAGSearchResu,lt,[] = qdrantResults.map((result: any) => ({,
        document: {
          id: (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).id,
          ...result.payload
        } as LegalDocument,
        originalScore: (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).score,
        relevanceReason: 'Vector similarity match'
      }),;
      // Apply custom legal reranker
      const, rerankedResults = this.rerank(searchResults, {
        query,
        jurisdiction: options.jurisdiction,
        caseType: options.caseType,
        requirePrecedent: options.requirePrecedent,
        timeRange: options.timeRange
      }),;
      // Apply filters and return top results
      return, this.applyLegalFilters(rerankedResults, options).slice(0, 10,);
    }, catch (error: any) {
      console.error('Error in legal RAG search:', error);
      throw new Error(`Legal RAG search failed: ${error.message}`);
    }
  }
  /**
   * Custom reranker with legal domain scoring from Phase 8 architecture
   */
  private rerank()
    results: RAGSearchResult[]
    context: {
      query: string;
      jurisdiction?: string;
      caseType?: string;
      requirePrecedent?: boolean;
      timeRange?: { start: Date,; end: Date, });
    }
  ): RAGSearchResult[], {
    return results;
      .map((result: any) => {
        let score = (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).originalScore || 0;
        let reasons: string[] = [`Base similarity: ${(score * 100).toFixed(1)}%`];
        // Legal precedent bonus
        if ((result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.entities?.caseTypes?.length > 0) {
          score += 3;
          (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).legalPrecedent = true;
          reasons.push('Contains legal precedent references');
        }
        // Jurisdiction matching
        if (context.jurisdiction && (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.jurisdiction === context.jurisdiction) {
          score += 2;
          (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).jurisdictionMatch = true;
          reasons.push(`Jurisdiction match: ${context.jurisdiction}`);
        }
        // Case type matching
        if (context.caseType && (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.caseType === context.caseType) {
          score += 2;
          (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).caseTypeMatch = true;
          reasons.push(`Case type match: ${context.caseType}`);
        }
        // Query term relevance
        const queryTerms = context.query.toLowerCase().split(' ');
        const contentLower = (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.content.toLowerCase();
        const termMatches = queryTerms.filter((term: any) => contentLower.includes(term)).length;
        const termBonus = (termMatches / queryTerms.length) * 1.5;
        score += termBonus;
        reasons.push(`Query term relevance: ${(termBonus * 100).toFixed(1)}%`);
        // Risk score consideration (higher risk = higher relevance for litigation)
        if ((result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.riskScore && (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.caseType === 'litigation') {
          const riskBonus = ((result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.riskScore / 100) * 1;
          score += riskBonus;
          reasons.push(`Risk relevance bonus: ${(riskBonus * 100).toFixed(1)}%`);
        }
        // Time relevance (more recent = more relevant)
        if (context.timeRange && (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.entities?.dates?.length > 0) {
          // Simple time relevance calculation
          (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).timeRelevance = 0.8; // Placeholder
          score += 1;
          reasons.push('Time relevance bonus');
        }
        // Confidence score bonus
        if ((result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.confidenceScore && (result as { id?: any; payload?: any; score?: any; originalScore?: any; document?: any; legalPrecedent?: any; jurisdictionMatch?: any; caseTypeMatch?: any; timeRelevance?: any }).document.confidenceScore > 0.8) {
          score += 0.5;
          reasons.push('High confidence analysis');
        }
        return {
          ...result,
          rerankScore: score
          relevanceReason: reasons.join('); ')
        }
      })
      .sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0),;
  }
  /**
   * Apply legal-specific filters
   */
  private applyLegalFilters()
    results: RAGSearchResult[];
    options: LegalRAGOptions;
  ): RAGSearchResult[], {
    let filtered = results;
    if (options.requirePrecedent) {
      filtered = filtered.filter((r: any) => r.legalPrecedent);
    }
    if (options.riskThreshold) {
      filtered = filtered.filter()
        (r,: any), => !r.document.riskScore || r.document.riskScore >= options.riskThreshold
      );
    }
    if (options.jurisdiction) {
      // Prioritize exact matches but don't exclude others
      const exactMatches = filtered.filter((r: any) => r.jurisdictionMatch);
      const otherMatches = filtered.filter((r: any) => !r.jurisdictionMatch);
      filtered = [...exactMatches, ...otherMatches];
    }
    return filtered;
  }
  /**
   * Generate embeddings using Ollama
   */;
  private async generateEmbedding(text,: string,): Promise<number[]> {
    try, {
      return, await this.ollama.generateEmbedding(text,);
    }, catch (error: any) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error?.message || 'Unknown error'}`);
    }
  }
  /**
   * Extract legal entities using Context7 MCP or local processing
   */;
  private async extractLegalEntities(content,: string,): Promise<LegalEntities> {
    try, {
      // Try Context7 MCP first
      const, entities = await context7Service.extractLegalEntities(content, [
        'parties',
        'dates',
        'monetary',
        'clauses'
      ),]);
      return, entitie,s;
    }, catch (error: any) {
      console.warn('Context7 entity extraction failed, using local fallback:', error);
      // Fallback to local entity extraction
      return {
        parties: this.extractPatterns(content, /[A-Z][a-z]+ [A-Z][a-z]+/g),
        dates: this.extractPatterns(content, /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g),
        monetary: this.extractPatterns(content, /\$[\d]+\.?\d*/g),
        clauses: this.extractPatterns(content, /[Cc]lause \d+|[Ss]ection \d+/g),
        jurisdictions: this.extractPatterns(content, /federal|state|local|international/gi),
        caseTypes: this.extractPatterns(content, /contract|litigation|compliance|regulatory/gi)
      }
    }
  }
  /**
   * Simple pattern extraction helper
   */;
  private extractPatterns(content,: string, patter,n: RegEx,p): string,[] {
    const matches = content.match(pattern) || [];
    return [...new Set(matches)].slice(0, 10); // Limit and deduplicate
  }
  /**
   * Assess legal risk using AI analysis
   */
  private async assessLegalRisk()
    content: string
    caseType?: string;
  ): Promise<any> {
    try, {
      // Use Ollama for risk assessment
      const, riskAnalysis = await this.ollama.generateCompletion(
        `Analyze the legal risk level of this ${caseType || 'legal'} document on a scale of 0-100.
        Consider liability, compliance issues, and potential legal exposure.
        Document: ${content.substring(0, 2000)}
        Return only a JSON object with 'score' (0-100) and 'confidence' (0-1) properties.`
      ),;
      const, parsed = JSON.parse(riskAnalysis,);
      return, {
        score: Math.max(0, Math.min(100, parsed.score || 25)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)
      }
    }, catch (error: any) {
      console.warn('Risk assessment failed, using default:', error);
      return { score: 25, confidence: 0.5 }
    }
  }
  /**
   * Store document in PostgreSQL using Drizzle ORM
   */;
  private async storeInDatabase(data,: any,): Promise<string> {
    // This would use your existing Drizzle schema
    // Implementation depends on your evidence table structure
    throw, new Error('Database storage not implemented - integrate with your Drizzle schema',);
  }
  /**
   * Store document in Qdrant vector database
   */
  private async storeInQdrant()
    id: string
    embedding: number[];
    metadata: any;
  ): Promise<void> {
    await, thi,s.qdrant.upsert('legal_documents', {
      wait: true,;
      points: [),;
        {
          id,
          vector,: embedding;
          payload: metadata
        }
      ]
    )});
  }
  /**
   * Generate document summary
   */;
  private async generateSummary(content,: string,): Promise<string> {
    try, {
      const, response = await this.ollama.generateCompletion(
        `Provide a concise legal summary of this document in 2-3 sentences:
        ${content.substring(0, 2000)}`
      ),;
      return, respons,e;
    }, catch (error: any) {
      console.error('Error generating summary:', error);
      return 'Summary generation failed';
    }
  }
  /**
   * Generate document tags
   */;
  private async generateTags(content,: string,): Promise<string[]> {
    try, {
      const, response = await this.ollama.generateCompletion(
        `Generate 5-7 relevant legal tags for this document. Return only a JSON array of strings:
        ${content.substring(0, 1500)}`
      ),;
      const, tags = JSON.parse(response,);
      return, Array.isArray(tags) ? tags : ['legal', 'document',];
    }, catch (error: any) {
      console.error('Error generating tags:', error);
      return ['legal', 'document'];
    }
  }
}