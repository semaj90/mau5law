// Legal RAG Embedding Orchestrator
// Handles case-specific law retrieval with optimized embedding strategies
// Integrates multiple embedding models for different legal content types
import { multiEmbeddingVectorService } from './multi-embedding-vector-service.js';
import type { SearchQuery } from './multi-embedding-vector-service.js';

export interface LegalCase {
  id: string;
  title: string;
  jurisdiction: string;
  practice_area: string;
  case_type: 'civil' | 'criminal' | 'appellate' | 'constitutional' | 'administrative';
  status: 'active' | 'closed' | 'pending' | 'appeal';
  filing_date: Date;
  parties: {
    plaintiff: string[];
    defendant: string[];
    counsel: string[];
  };
  court: string;
  judge?: string;
  docket_number: string;
  related_laws: string[];
  key_issues: string[];
  case_summary: string;
  legal_precedents: string[];
  evidence_ids: string[];
  document_ids: string[];
  metadata: {
    complexity_score: number;
    precedent_value: number;
    settlement_probability?: number;
    estimated_duration?: string;
    budget_category?: string;
  };
}

export interface LegalLaw {
  id: string;
  title: string;
  jurisdiction: string;
  law_type: 'statute' | 'regulation' | 'ordinance' | 'constitutional' | 'case_law' | 'administrative';
  section: string;
  subsection?: string;
  effective_date: Date;
  amendment_history: Array<any>;
  content: string;
  related_laws: string[];
  precedent_cases: string[];
  enforcement_mechanisms: string[];
  penalties: string[];
  exceptions: string[];
  interpretations: Array<any>;
  metadata: {
    complexity_level: 'basic' | 'intermediate' | 'advanced' | 'expert';
    applicability_score: number;
    controversy_level: number;
    enforcement_frequency: number;
  };
}

export interface RAGContext {
  case_id: string;
  query_type: 'legal_research' | 'precedent_search' | 'statute_lookup' | 'case_analysis' | 'document_review';
  relevant_laws: LegalLaw[];
  relevant_cases: LegalCase[];
  relevant_documents: any[];
  contextual_embeddings: {
    case_context: number[];
    legal_domain: number[];
    jurisdictional: number[];
    temporal: number[];
  };
  confidence_scores: {
    law_relevance: number;
    case_relevance: number;
    document_relevance: number;
    overall_confidence: number;
  };
  search_metadata: {
    embedding_models_used: string[];
    search_time_ms: number;
    total_results_considered: number;
    filters_applied: string[];
  };
}

class LegalRAGEmbeddingOrchestrator {
  private caseCache: Map<string, LegalCase> = new Map();
  private lawCache: Map<string, LegalLaw> = new Map();
  private ragCache: Map<string, { context: RAGContext; timestamp: Date }> = new Map();

  // Embedding strategies by legal content type
  private embeddingStrategies: Record<string, {
    primary_model: string;
    hybrid_models: string[];
    metadata_schema: string;
    boost_fields: string[];
    temporal_weight: number;
  }> = {
    'case-law': {
      primary_model: 'legal-bert',
      hybrid_models: ['gemma3-legal', 'custom-legal'],
      metadata_schema: 'legal-case',
      boost_fields: ['case_type', 'jurisdiction', 'practice_area'],
      temporal_weight: 0.8
    },
    'statute': {
      primary_model: 'custom-legal',
      hybrid_models: ['legal-bert', 'bge-large'],
      metadata_schema: 'citation',
      boost_fields: ['jurisdiction', 'law_type', 'effective_date'],
      temporal_weight: 0.6
    },
    'regulation': {
      primary_model: 'legal-bert',
      hybrid_models: ['custom-legal', 'nomic-embed'],
      metadata_schema: 'citation',
      boost_fields: ['jurisdiction', 'enforcement_frequency'],
      temporal_weight: 0.7
    },
    'case-document': {
      primary_model: 'gemma3-legal',
      hybrid_models: ['all-minilm-l6-v2', 'nomic-embed'],
      metadata_schema: 'document',
      boost_fields: ['document_type', 'case_id', 'relevance_score'],
      temporal_weight: 0.9
    },
    'user-query': {
      primary_model: 'all-minilm-l6-v2',
      hybrid_models: ['legal-bert', 'nomic-embed'],
      metadata_schema: 'user-query',
      boost_fields: ['intent', 'practice_area'],
      temporal_weight: 1.0
    }
  };

  // add robust timer helper
  private nowMs(): number {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  // Safe id generator - avoid `any`
  private safeRandomId(): string {
    try {
      const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
      const rnd = g?.crypto?.randomUUID?.();
      if (typeof rnd === 'string' && rnd.length > 0) return rnd;
    } catch {
      /* ignore */
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // Comprehensive RAG retrieval for legal cases
  async retrieveLegalContext(
    caseId: string,
    query: string,
    options: {
      query_type?: 'legal_research' | 'precedent_search' | 'statute_lookup' | 'case_analysis' | 'document_review';
      jurisdiction_filter?: string;
      practice_area_filter?: string;
      date_range?: { start: Date; end: Date };
      max_results?: number;
      include_related_cases?: boolean;
      include_statutory_authority?: boolean;
      include_regulations?: boolean;
      confidence_threshold?: number;
    } = {}
  ): Promise<RAGContext> {
    const startTime = this.nowMs();
    const cacheKey = `rag:${caseId}:${this.hashQuery(query)}:${JSON.stringify(options)}`;

    const cached = this.ragCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < 300000) {
      return cached.context;
    }

    try {
      const legalCase = await this.getCaseById(caseId);
      if (!legalCase) throw new Error(`Case not found: ${caseId}`);

      const queryEmbeddings = await this.generateLegalQueryEmbeddings(
        query,
        legalCase,
        options.query_type || 'legal_research'
      );

      const relevantLaws = await this.searchRelevantLaws(queryEmbeddings, legalCase, options);
      const relevantCases = await this.searchRelevantCases(queryEmbeddings, legalCase, options);
      const relevantDocuments = await this.searchRelevantDocuments(queryEmbeddings, caseId, options);

      const confidenceScores = this.calculateConfidenceScores(
        relevantLaws,
        relevantCases,
        relevantDocuments,
        queryEmbeddings
      );

      const ragContext: RAGContext = {
        case_id: caseId,
        query_type: options.query_type || 'legal_research',
        relevant_laws: relevantLaws,
        relevant_cases: relevantCases,
        relevant_documents: relevantDocuments,
        contextual_embeddings: {
          case_context: queryEmbeddings.case_context,
          legal_domain: queryEmbeddings.legal_domain,
          jurisdictional: queryEmbeddings.jurisdictional,
          temporal: queryEmbeddings.temporal
        },
        confidence_scores: confidenceScores,
        search_metadata: {
          embedding_models_used: queryEmbeddings.models_used || [],
          search_time_ms: this.nowMs() - startTime,
          total_results_considered: relevantLaws.length + relevantCases.length + relevantDocuments.length,
          filters_applied: this.getAppliedFilters(options)
        }
      };

      this.ragCache.set(cacheKey, { context: ragContext, timestamp: new Date() });
      return ragContext;
    } catch (error) {
      console.error('Legal RAG retrieval error:', error);
      throw error;
    }
  }

  // Generate specialized embeddings for legal queries - return typed bundle instead of `any`
  private async generateLegalQueryEmbeddings(
    query: string,
    legalCase: LegalCase,
    queryType: string,
  ): Promise<EmbeddingsBundle> {
    const strategy = this.embeddingStrategies[queryType] ?? this.embeddingStrategies['user-query'];
    const contextualQuery = this.enhanceQueryWithCaseContext(query, legalCase);

    // Keep svc as unknown and guard calls
    const svc = multiEmbeddingVectorService as unknown;

    const inputs = [
      { text: `${contextualQuery} [Case Context: ${legalCase.case_summary}]`, type: 'contextual', opts: { optimizeFor: 'accuracy' } },
      { text: `${contextualQuery} [Practice Area: ${legalCase.practice_area}]`, type: 'user-query', opts: { preferredModels: ['legal-bert', 'custom-legal'] } },
      { text: `${contextualQuery} [Jurisdiction: ${legalCase.jurisdiction}] [Court: ${legalCase.court}]`, type: 'citation', opts: { optimizeFor: 'accuracy' } },
      { text: `${contextualQuery} [Filing Date: ${legalCase.filing_date.toISOString()}]`, type: 'user-query', opts: { optimizeFor: 'balanced' } }
    ];

    const promises = inputs.map(i => {
      try {
        const svcAny = svc as any;
        if (typeof svcAny.generateEmbeddings === 'function') {
          return svcAny.generateEmbeddings(i.text, i.type, i.opts);
        }
      } catch (err) {
        // log and continue
        // eslint-disable-next-line no-console
        console.debug('generateEmbeddings call failed for input', i.type, err);
      }
      return Promise.resolve(null);
    });

    const [caseContext, legalDomain, jurisdictional, temporal] = await Promise.all(promises);

    return {
      case_context: caseContext?.primary?.vector || [],
      legal_domain: legalDomain?.primary?.vector || [],
      jurisdictional: jurisdictional?.primary?.vector || [],
      temporal: temporal?.primary?.vector || [],
      models_used: [
        caseContext?.primary?.model || (strategy?.primary_model ?? 'unknown'),
        legalDomain?.primary?.model || (strategy?.hybrid_models?.[0] ?? 'unknown'),
        jurisdictional?.primary?.model || 'unknown',
        temporal?.primary?.model || 'unknown'
      ]
    };
  }

  // Helper: merge multiple embedding vectors into a single averaged embedding
  private mergeEmbeddings(vectors: Array<number[] | undefined | null>): number[] {
    const valid = vectors.filter(Boolean) as number[][];
    if (valid.length === 0) return [];
    const dim = Math.max(...valid.map(v => v.length));
    const sum = new Array<number>(dim).fill(0);
    valid.forEach(v => {
      for (let i = 0; i < dim; i++) {
        sum[i] += (v[i] ?? 0);
      }
    });
    const count = valid.length;
    return sum.map(s => s / count);
  }

  // Helper: runtime-safe vector search adapter - explicit return type
  private async callVectorSearch(searchQuery: SearchQuery): Promise<VectorSearchResult> {
    const svcAny = multiEmbeddingVectorService as unknown as Record<string, unknown>;
    const candidates = ['searchSimilar', 'search', 'query', 'findSimilar', 'searchVectors', 'searchEmbeddings'];
    for (const name of candidates) {
      const fn = svcAny[name] as unknown;
      if (typeof fn === 'function') {
        try {
          // @ts-ignore dynamic invocation
          return await (fn as Function)(searchQuery) as VectorSearchResult;
        } catch (err) {
          // log and try next candidate
          // eslint-disable-next-line no-console
          console.debug(`Vector search candidate "${name}" failed`, err);
        }
      }
    }

    // last-resort: attempt generic execute or return empty results
    const execute = svcAny.execute as unknown;
    if (typeof execute === 'function') {
      try {
        // @ts-ignore
        return await (execute as Function)(searchQuery) as VectorSearchResult;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug('multiEmbeddingVectorService.execute failed', err);
      }
    }

    return { results: [] };
  }

  // Search for relevant laws using optimized embeddings
  private async searchRelevantLaws(queryEmbeddings: EmbeddingsBundle, legalCase: LegalCase, options: SearchOptions): Promise<LegalLaw[]> {
    const searchQuery: SearchQuery = {
      query: '',
      embedding_models: ['legal-bert', 'custom-legal'],
      metadata_filters: {
        jurisdiction: options.jurisdiction_filter || legalCase.jurisdiction,
        law_type: this.determineLawTypes(options.query_type as string),
        effective_date: options.date_range ? { gte: options.date_range.start, lte: options.date_range.end } : undefined
      },
      schema_types: ['citation'],
      hybrid_weights: { semantic: 0.3, legal: 0.4, contextual: 0.2, temporal: 0.1 },
      similarity_threshold: options.confidence_threshold ?? 0.7,
      max_results: options.max_results ?? 10,
      boost_recent: false,
      user_context: { userId: 'system', sessionId: 'legal-search', caseId: legalCase.id, practiceArea: legalCase.practice_area, jurisdiction: legalCase.jurisdiction }
    };

    (searchQuery as unknown as Record<string, unknown>).query_embedding = this.mergeEmbeddings([
      queryEmbeddings.case_context, queryEmbeddings.legal_domain, queryEmbeddings.jurisdictional, queryEmbeddings.temporal
    ]);

    const searchResult = await this.callVectorSearch(searchQuery);
    return this.convertToLegalLaws(searchResult?.results || []);
  }

  // Search for relevant cases
  private async searchRelevantCases(queryEmbeddings: EmbeddingsBundle, legalCase: LegalCase, options: SearchOptions): Promise<LegalCase[]> {
    if (!options?.include_related_cases) return [];
    const searchQuery: SearchQuery = {
      query: '',
      embedding_models: ['gemma3-legal', 'legal-bert'],
      metadata_filters: { jurisdiction: legalCase.jurisdiction, practice_area: legalCase.practice_area, case_type: legalCase.case_type, status: 'closed' },
      schema_types: ['legal-case'],
      hybrid_weights: { semantic: 0.25, legal: 0.35, contextual: 0.25, temporal: 0.15 },
      similarity_threshold: options.confidence_threshold ?? 0.75,
      max_results: Math.min(options.max_results ?? 5, 10),
      boost_recent: true,
      user_context: { userId: 'system', sessionId: 'case-search', caseId: legalCase.id, practiceArea: legalCase.practice_area, jurisdiction: legalCase.jurisdiction }
    };

    (searchQuery as unknown as Record<string, unknown>).query_embedding = this.mergeEmbeddings([
      queryEmbeddings.case_context, queryEmbeddings.legal_domain, queryEmbeddings.jurisdictional
    ]);

    const searchResult = await this.callVectorSearch(searchQuery);
    return this.convertToLegalCases(searchResult?.results || []);
  }

  // Search for relevant documents
  private async searchRelevantDocuments(queryEmbeddings: EmbeddingsBundle, caseId: string, options: SearchOptions): Promise<unknown[]> {
    const searchQuery: SearchQuery = {
      query: '',
      embedding_models: ['gemma3-legal', 'all-minilm-l6-v2'],
      metadata_filters: { case_id: caseId, document_type: this.determineDocumentTypes(options?.query_type as string) },
      schema_types: ['document', 'evidence'],
      hybrid_weights: { semantic: 0.4, legal: 0.3, contextual: 0.25, temporal: 0.05 },
      similarity_threshold: options?.confidence_threshold ?? 0.6,
      max_results: options?.max_results ?? 15,
      boost_recent: true,
      user_context: { userId: 'system', sessionId: 'document-search', caseId }
    };

    (searchQuery as unknown as Record<string, unknown>).query_embedding = this.mergeEmbeddings([
      queryEmbeddings.case_context, queryEmbeddings.legal_domain, queryEmbeddings.temporal
    ]);

    const searchResult = await this.callVectorSearch(searchQuery);
    return searchResult?.results || [];
  }

  // Enhance query with case-specific context
  private enhanceQueryWithCaseContext(query: string, legalCase: LegalCase): string {
    const contextElements = [
      `Case Type: ${legalCase.case_type}`,
      `Jurisdiction: ${legalCase.jurisdiction}`,
      `Practice Area: ${legalCase.practice_area}`,
      `Key Issues: ${Array.isArray(legalCase.key_issues) ? legalCase.key_issues.join(', ') : ''}`
    ].join(' | ');
    return `[${contextElements}] ${query}`;
  }

  // Calculate comprehensive confidence scores
  private calculateConfidenceScores(
    laws: LegalLaw[],
    cases: LegalCase[],
    documents: any[],
    embeddings: any
  ): {
    law_relevance: number;
    case_relevance: number;
    document_relevance: number;
    overall_confidence: number;
  } {
    const lawRelevance = laws.length > 0
      ? laws.reduce((sum, law) => sum + (law.metadata?.applicability_score || 0), 0) / laws.length
      : 0;
    const caseRelevance = cases.length > 0
      ? cases.reduce((sum, c) => sum + (c.metadata?.precedent_value || 0), 0) / cases.length
      : 0;
    const documentRelevance = documents.length > 0
      ? documents.reduce((sum, doc) => sum + (doc?.metadata?.relevance_score || 0.5), 0) / documents.length
      : 0;

    const overallConfidence = lawRelevance * 0.4 + caseRelevance * 0.35 + documentRelevance * 0.25;
    return {
      law_relevance: lawRelevance,
      case_relevance: caseRelevance,
      document_relevance: documentRelevance,
      overall_confidence: Math.max(0, Math.min(1, overallConfidence)),
    };
  }

  // Helper methods for filtering and conversion
  private determineLawTypes(queryType?: string): string[] {
    const typeMap: Record<string, string[]> = {
      'statute_lookup': ['statute', 'constitutional'],
      'legal_research': ['statute', 'regulation', 'case_law'],
      'precedent_search': ['case_law'],
      'case_analysis': ['statute', 'regulation', 'case_law', 'administrative'],
      'document_review': ['regulation', 'administrative']
    };
    return typeMap[queryType || 'legal_research'] || ['statute', 'regulation', 'case_law'];
  }

  private determineDocumentTypes(queryType?: string): string[] {
    const typeMap: Record<string, string[]> = {
      'legal_research': ['brief', 'motion', 'memorandum'],
      'precedent_search': ['case_citation', 'precedent_analysis'],
      'document_review': ['evidence', 'exhibit', 'deposition'],
      'case_analysis': ['brief', 'motion', 'order', 'judgment']
    };
    return typeMap[queryType || 'legal_research'] || ['brief', 'motion', 'memorandum'];
  }

  private getAppliedFilters(options: any): string[] {
    const filters: string[] = [];
    if (options?.jurisdiction_filter) filters.push('jurisdiction');
    if (options?.practice_area_filter) filters.push('practice_area');
    if (options?.date_range) filters.push('date_range');
    if (options?.confidence_threshold) filters.push('confidence_threshold');
    return filters;
  }

  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Placeholder methods for data conversion
  private convertToLegalLaws(results: unknown[]): LegalLaw[] {
    return results.map((result) => {
      const r = (result as Record<string, unknown>) || {};
      const meta = (r.metadata as Record<string, unknown>) || {};
      const sim = (r.similarity_scores as Record<string, unknown>) || {};

      const metadata: LegalLaw['metadata'] = {
        complexity_level: (meta.complexity_level as any) || 'intermediate',
        applicability_score: (sim?.overall as number) ?? 0.5,
        controversy_level: (meta.controversy_level as number) ?? 0,
        enforcement_frequency: (meta.enforcement_frequency as number) ?? 0
      };

      const law: LegalLaw = {
        id: (r.id as string) || this.safeRandomId(),
        title: (meta.title as string) || 'Unknown Law',
        jurisdiction: (meta.jurisdiction as string) || 'Unknown',
        law_type: ((meta.law_type as any) || 'statute'),
        section: (meta.section as string) || '',
        subsection: (meta.subsection as string) || undefined,
        effective_date: meta.effective_date ? new Date(meta.effective_date as string) : new Date(),
        amendment_history: (meta.amendment_history as unknown[] ) || [],
        content: (r.content as string) || '',
        related_laws: (meta.related_laws as string[]) || [],
        precedent_cases: (meta.precedent_cases as string[]) || [],
        enforcement_mechanisms: (meta.enforcement_mechanisms as string[]) || [],
        penalties: (meta.penalties as string[]) || [],
        exceptions: (meta.exceptions as string[]) || [],
        interpretations: (meta.interpretations as unknown[]) || [],
        metadata
      };
      return law;
    });
  }

  private convertToLegalCases(results: unknown[]): LegalCase[] {
    return results.map((result) => {
      const r = (result as Record<string, unknown>) || {};
      const meta = (r.metadata as Record<string, unknown>) || {};
      const sim = (r.similarity_scores as Record<string, unknown>) || {};

      const metadata: LegalCase['metadata'] = {
        complexity_score: (meta.complexity_score as number) ?? 0.5,
        precedent_value: (sim?.overall as number) ?? 0.5,
        settlement_probability: meta.settlement_probability as number | undefined,
        estimated_duration: meta.estimated_duration as string | undefined,
        budget_category: meta.budget_category as string | undefined
      };

      const legalCase: LegalCase = {
        id: (r.id as string) || this.safeRandomId(),
        title: (meta.title as string) || 'Unknown Case',
        jurisdiction: (meta.jurisdiction as string) || 'Unknown',
        practice_area: (meta.practice_area as string) || 'General',
        case_type: ((meta.case_type as any) || 'civil'),
        status: ((meta.status as any) || 'closed'),
        filing_date: meta.filing_date ? new Date(meta.filing_date as string) : new Date(),
        parties: (meta.parties as any) || { plaintiff: [], defendant: [], counsel: [] },
        court: (meta.court as string) || 'Unknown Court',
        judge: (meta.judge as string) || undefined,
        docket_number: (meta.docket_number as string) || '',
        related_laws: (meta.related_laws as string[]) || [],
        key_issues: (meta.key_issues as string[]) || [],
        case_summary: (r.content as string) || '',
        legal_precedents: (meta.legal_precedents as string[]) || [],
        evidence_ids: (meta.evidence_ids as string[]) || [],
        document_ids: (meta.document_ids as string[]) || [],
        metadata
      };

      return legalCase;
    });
  }

  // Database access methods (placeholders)
  private async getCaseById(caseId: string): Promise<LegalCase | null> {
    if (this.caseCache.has(caseId)) return this.caseCache.get(caseId)!;

    const placeholder: LegalCase = {
      id: caseId,
      title: 'Sample Legal Case',
      jurisdiction: 'Federal',
      practice_area: 'Civil Rights',
      case_type: 'civil',
      status: 'active',
      filing_date: new Date(),
      parties: {
        plaintiff: ['John Doe'],
        defendant: ['Acme Corp'],
        counsel: ['Jane Attorney']
      },
      court: 'U.S. District Court',
      judge: undefined,
      docket_number: '2024-CV-123',
      related_laws: [],
      key_issues: ['Constitutional Law', 'Due Process'],
      case_summary: 'A civil rights case involving due process claims.',
      legal_precedents: [],
      evidence_ids: [],
      document_ids: [],
      metadata: {
        complexity_score: 0.7,
        precedent_value: 0.6
      }
    };

    this.caseCache.set(caseId, placeholder);
    return placeholder;
  }

  // Public API methods
  async getPerformanceMetrics() {
    const perf = {
      cacheStats: { cases: this.caseCache.size, laws: this.lawCache.size, ragContexts: this.ragCache.size },
      embeddingStrategies: Object.keys(this.embeddingStrategies),
      multiEmbeddingMetrics: null as unknown
    };

    const svcAny = multiEmbeddingVectorService as unknown as Record<string, unknown>;
    if (typeof svcAny.getPerformanceMetrics === 'function') {
      try {
        // @ts-ignore dynamic call
        perf.multiEmbeddingMetrics = await (svcAny.getPerformanceMetrics as Function)();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug('multiEmbeddingVectorService.getPerformanceMetrics failed', err);
      }
    }

    return perf;
  }

  async clearCache(): Promise<void> {
    this.caseCache.clear();
    this.lawCache.clear();
    this.ragCache.clear();
  }

  getEmbeddingStrategies() {
    return this.embeddingStrategies;
  }
}

// Export singleton instance
export const legalRAGOrchestrator = new LegalRAGEmbeddingOrchestrator();
export default legalRAGOrchestrator;