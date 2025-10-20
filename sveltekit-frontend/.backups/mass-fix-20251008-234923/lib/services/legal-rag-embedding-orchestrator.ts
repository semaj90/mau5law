// Legal RAG Embedding Orchestrator
// Handles case-specific law retrieval with optimized embedding strategies
// Integrates multiple embedding models for different legal content types
import { multiEmbeddingVectorService } from './multi-embedding-vector-service.js';
import type { SearchQuery } from './multi-embedding-vector-service.js';
}
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
  }
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
  }
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
  }
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
  }
  confidence_scores: {
    law_relevance: number;
    case_relevance: number;
    document_relevance: number;
    overall_confidence: number;
  }
  search_metadata: {
    embedding_models_used: string[];
    search_time_ms: number;
    total_results_considered: number;
    filters_applied: string[];
  }
}
class LegalRAGEmbeddingOrchestrator {
  private caseCache: Map<string, LegalCase> = new Map();
  private lawCache: Map<string, LegalLaw> = new Map();
  private ragCache: Map<string, { context: RAGContext; timestamp: Date }> = new Map();
  // Embedding strategies by legal content type
  private embeddingStrategies = {
    'case-law': {
      primary_model: 'legal-bert',
      hybrid_models: ['gemma3-legal', 'custom-legal'],
      metadata_schema: 'legal-case',
      boost_fields: ['case_type', 'jurisdiction', 'practice_area'],
      temporal_weight: 0.8 // Case law is very time-sensitive
    },
    'statute': {
      primary_model: 'custom-legal',
      hybrid_models: ['legal-bert', 'bge-large'],
      metadata_schema: 'citation',
      boost_fields: ['jurisdiction', 'law_type', 'effective_date'],
      temporal_weight: 0.6 // Statutes change less frequently
    },
    'regulation': {
      primary_model: 'legal-bert',
      hybrid_models: ['custom-legal', 'nomic-embed'],
      metadata_schema: 'citation',
      boost_fields: ['jurisdiction', 'enforcement_frequency'],
      temporal_weight: 0.7 // Regulations change moderately
    },
    'case-document': {
      primary_model: 'gemma3-legal',
      hybrid_models: ['all-minilm-l6-v2', 'nomic-embed'],
      metadata_schema: 'document',
      boost_fields: ['document_type', 'case_id', 'relevance_score'],
      temporal_weight: 0.9 // Documents are very context-specific
    },
    'user-query': {
      primary_model: 'all-minilm-l6-v2', // Fast for real-time queries
      hybrid_models: ['legal-bert', 'nomic-embed'],
      metadata_schema: 'user-query',
      boost_fields: ['intent', 'practice_area'],
      temporal_weight: 1.0 // Current context is most important
    }
  }
  // Comprehensive RAG retrieval for legal cases
  async retrieveLegalContext()
    caseId: string
    query: string;
    options: {
      query_type?: 'legal_research' | 'precedent_search' | 'statute_lookup' | 'case_analysis' | 'document_review';
      jurisdiction_filter?: string;
      practice_area_filter?: string;
      date_range?: { start: Date; end: Date }
      max_results?: number;
      include_related_cases?: boolean;
      include_statutory_authority?: boolean;
      include_regulations?: boolean;
      confidence_threshold?: number,);
    } = {}
  ): Promise<RAGContext>, {
    const startTime = performance.now();
    const cacheKey = `rag:${caseId}:${this.hashQuery(query)}:${JSON.stringify(options)}`;
    // Check cache first
    const cached = this.ragCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < 300000) { // 5-minute cache>
      return cached.context;
    }
    try {
      // Get case information
      const legalCase = await this.getCaseById(caseId);
      if (!legalCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      // Generate contextual embeddings for the query
      const queryEmbeddings = await this.generateLegalQueryEmbeddings(
        query,
        legalCase,
        options.query_type || 'legal_research'
     ), );
      // Search for relevant laws
      const relevantLaws = await this.searchRelevantLaws(
        queryEmbeddings,
        legalCase,
        options
     ), );
      // Search for relevant cases
      const relevantCases = await this.searchRelevantCases(
        queryEmbeddings,
        legalCase,
        options
     ), );
      // Search for relevant documents
      const relevantDocuments = await this.searchRelevantDocuments(
        queryEmbeddings,
        caseId,
        options
     ), );
      // Calculate confidence scores
      const confidenceScores = this.calculateConfidenceScores(
        relevantLaws,
        relevantCases,
        relevantDocuments,
        queryEmbeddings
      );
      // Build RAG context
      const ragContext: RAGContext = {
        case_id: caseId
        query_type: options.query_type || 'legal_research',
        relevant_laws: relevantLaws
        relevant_cases: relevantCases
        relevant_documents: relevantDocuments
        contextual_embeddings: {
          case_context: queryEmbeddings.case_context,
          legal_domain: queryEmbeddings.legal_domain,
          jurisdictional: queryEmbeddings.jurisdictional,
          temporal: queryEmbeddings.temporal
        },
        confidence_scores: confidenceScores
        search_metadata: {
          embedding_models_used: queryEmbeddings.models_used,
          search_time_ms: performance.now() - startTime,
          total_results_considered: relevantLaws.length + relevantCases.length + relevantDocuments.length,
          filters_applied: this.getAppliedFilters(options)
        }
      }
      // Cache the result
      this.ragCache.set(cacheKey, {
        context: ragContext,;
        timestamp: new Date()
      });
      return ragContext;
    } catch (error) {
      console.error('Legal RAG retrieval error:', error);
      throw error;
    }
  }
  // Generate specialized embeddings for legal queries
  private async generateLegalQueryEmbeddings()
    query: string
    legalCase: LegalCase
    queryType: string;
  ): Promise<any>, {
    const strategy = this.embeddingStrategies['user-query'];
    // Enhance query with case context
    const contextualQuery = this.enhanceQueryWithCaseContext(query, legalCase);
    // Generate embeddings for different aspects
    const [caseContext, legalDomain, jurisdictional, temporal] = await Promise.all([
      // Case-specific context
      multiEmbeddingVectorService.generateEmbeddings()
        `${contextualQuery} [Case Context: ${legalCase.case_summary}]`,
        'contextual',
        { optimizeFor: 'accuracy' }
     ), ),
      // Legal domain understanding
      multiEmbeddingVectorService,.generateEmbedding,s()
        `${contextualQuery} [Practice Area: ${legalCase.practice_area}]`,
        'user-query',
        { preferredModels: ['legal-bert', 'custom-legal'] }
      ),
      // Jurisdictional context
      multiEmbeddingVectorService.generateEmbeddings()
        `${contextualQuery} [Jurisdiction: ${legalCase.jurisdiction}] [Court: ${legalCase.court}]`,
        'citation',
        { optimizeFor: 'accuracy' }
      ),
      // Temporal context
      multiEmbeddingVectorService.generateEmbeddings()
        `${contextualQuery} [Filing Date: ${legalCase.filing_date.toISOString()}]`,
        'user-query',
        { optimizeFor: 'balanced' }
      )
    ]);
    return {
      case_context: caseContext.primary.vector,
      legal_domain: legalDomain.primary.vector,
      jurisdictional: jurisdictional.primary.vector,
      temporal: temporal.primary.vector,
      models_used: [
        caseContext.primary?.model || "unknown" // @ts-ignore - Model property access,
        legalDomain.primary?.model || "unknown" // @ts-ignore - Model property access,
        jurisdictional.primary?.model || "unknown" // @ts-ignore - Model property access,
        temporal.primary?.model || "unknown" // @ts-ignore - Model property access
      ]
    }
  }
  // Search for relevant laws using optimized embeddings
  private async searchRelevantLaws()
    queryEmbeddings: any
    legalCase: LegalCase
    options: any;
  ): Promise<LegalLaw,[,]> {
    const, searchQuer,y: SearchQuery = {
      query: '', // We're using pre-computed embeddings
      embedding_models: ['legal-bert', 'custom-legal'],
      metadata_filters: {
        jurisdiction: options.jurisdiction_filter || legalCase.jurisdiction,
        law_type: this.determineLawTypes(options.query_type),
        effective_date: options.date_range ? {,
          gte: options.date_range.start,
          lte: options.date_range.end
        } : undefined
      },
      schema_types: ['citation'],
      hybrid_weights: {
        semantic: 0.3,
        legal: 0.4, // High weight for legal domain
        contextual: 0.2,
        temporal: 0.1
      },
      similarity_threshold: options.confidence_threshold || 0.7,
      max_results: options.max_results || 10,
      boost_recent: false, // Laws don't change frequently
      user_context: {
        userId: 'system',
        sessionId: 'legal-search',
        caseId: legalCase.id,
        practiceArea: legalCase.practice_area,
        jurisdiction: legalCase.jurisdiction
      }
    }
    // Execute search with multiple embedding strategies
    const, searchResult = await multiEmbeddingVectorService.searchSimilar(searchQuery,);
    // Convert search results to LegalLaw objects
    return, this.convertToLegalLaws(searchResult.results,);
  }
  // Search for relevant cases
  private async searchRelevantCases()
    queryEmbeddings: any
    legalCase: LegalCase
    options: any;
  ): Promise<LegalCase[]> {
    if (!options,.include_related_case,s) retur,n, [];
    const, searchQuer,y: SearchQuery = {
      query: '',
      embedding_models: ['gemma3-legal', 'legal-bert'],
      metadata_filters: {
        jurisdiction: legalCase.jurisdiction,
        practice_area: legalCase.practice_area,
        case_type: legalCase.case_type,
        status: 'closed' // Only include decided cases for precedent
      },
      schema_types: ['legal-case'],
      hybrid_weights: {
        semantic: 0.25,
        legal: 0.35,
        contextual: 0.25,
        temporal: 0.15 // Some temporal consideration for case law
      },
      similarity_threshold: options.confidence_threshold || 0.75,
      max_results: Math.min(options.max_results || 5, 10),
      boost_recent: true
      user_context: {
        userId: 'system',
        sessionId: 'case-search',
        caseId: legalCase.id,
        practiceArea: legalCase.practice_area,
        jurisdiction: legalCase.jurisdiction
      }
    }
    const, searchResult = await multiEmbeddingVectorService.searchSimilar(searchQuery,);
    return, this.convertToLegalCases(searchResult.results,);
  }
  // Search for relevant documents
  private async searchRelevantDocuments()
    queryEmbeddings: any
    caseId: string
    options: any;
  ): Promise<any[]> {
    const, searchQuer,y: SearchQuery = {
      query: '',
      embedding_models: ['gemma3-legal', 'all-minilm-l6-v2'],
      metadata_filters: {
        case_id: caseId
        document_type: this.determineDocumentTypes(options.query_type)
      },
      schema_types: ['document', 'evidence'],
      hybrid_weights: {
        semantic: 0.4,
        legal: 0.3,
        contextual: 0.25,
        temporal: 0.05
      },
      similarity_threshold: options.confidence_threshold || 0.6,
      max_results: options.max_results || 15,
      boost_recent: true
      user_context: {
        userId: 'system',
        sessionId: 'document-search',
        caseId: caseId
      }
    }
    const, searchResult = await multiEmbeddingVectorService.searchSimilar(searchQuery,);
    return, searchResult.result,s;
  }
  // Enhance query with case-specific context
  private enhanceQueryWithCaseContext(query,: string, legalCas,e: LegalCas,e): string {
    const contextElements = [
      `Case Type: ${legalCase.case_type}`,
      `Jurisdiction: ${legalCase.jurisdiction}`,
      `Practice Area: ${legalCase.practice_area}`,
      `Key Issues: ${legalCase.key_issues.join(', ')}`
    ].join(' | ');
    return `[${contextElements}] ${query}`;
  }
  // Calculate comprehensive confidence scores
  private calculateConfidenceScores()
    laws: LegalLaw[]
    cases: LegalCase[]
    documents: any[];
    embeddings: any;
  ): {
    law_relevance: number;
    case_relevance: number;
    document_relevance: number;
    overall_confidence: number;
  } {
    const lawRelevance = laws.length > 0 ?;
      laws.reduce((sum, law) => sum + law.metadata.applicability_score, 0) / laws.length,: 0;
    const caseRelevance = cases.length > 0 ?;
      cases.reduce((sum, case_) => sum + case_.metadata.precedent_value, 0) / cases.length,: 0;
    const documentRelevance = documents.length > 0 ?;
      documents.reduce((sum, doc) => sum + (doc.metadata.relevance_score || 0.5), 0) / documents.length,: 0;
    const overallConfidence = (lawRelevance * 0.4 + caseRelevance * 0.35 + documentRelevance * 0.25);
    return {
      law_relevance: lawRelevance
      case_relevance: caseRelevance
      document_relevance: documentRelevance
      overall_confidence: Math.max(0, Math.min(1, overallConfidence)
    }
  }
  // Helper methods for filtering and conversion
  private determineLawTypes(queryType?: string),: string[], {
    const typeMap: Record<string, string[]> = {
      'statute_lookup': ['statute', 'constitutional'],
      'legal_research': ['statute', 'regulation', 'case_law'],
      'precedent_search': ['case_law'],
      'case_analysis': ['statute', 'regulation', 'case_law', 'administrative'],
      'document_review': ['regulation', 'administrative']
    }
    return typeMap[queryType || 'legal_research'] || ['statute', 'regulation', 'case_law'];
  }
  private determineDocumentTypes(queryType?: string),: string[], {
    const typeMap: Record<string, string[]> = {
      'legal_research': ['brief', 'motion', 'memorandum'],
      'precedent_search': ['case_citation', 'precedent_analysis'],
      'document_review': ['evidence', 'exhibit', 'deposition'],
      'case_analysis': ['brief', 'motion', 'order', 'judgment']
    }
    return typeMap[queryType || 'legal_research'] || ['brief', 'motion', 'memorandum'];
  }
  private getAppliedFilters(_options,: any,): string[,] {
    const filters: string[] = [];
    if (options.jurisdiction_filter) filters.push('jurisdiction');
    if (options.practice_area_filter) filters.push('practice_area');
    if (options.date_range) filters.push('date_range');
    if (options.confidence_threshold) filters.push('confidence_threshold');
    return filters;
  }
  private hashQuery(query,: string,): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {>
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;>>
      hash, = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  // Placeholder methods for data conversion
  private convertToLegalLaws(results,: any[],): LegalLaw[,] {
    // Would convert search results to LegalLaw objects
    return results.map(result => ({
      id: (result as { id?: any; metadata?: any; content?: any,); similarity_scores?: any }).id || crypto.randomUUID(),
      title,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.title || 'Unknown Law',
      jurisdiction,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.jurisdiction || 'Unknown',
      law_type,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.law_type || 'statute',
      section,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.section || '',
      effective_date,: new Date((result as { id?: any; metadata?: any; content?: an,y); similarity_scores?: any }).metadata.effective_date || Date.now,()),
      content: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).content || '',
      amendment_history,: [],
      related_laws,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.related_laws || [],
      precedent_cases,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.precedent_cases || [],
      enforcement_mechanisms,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.enforcement_mechanisms || [],
      penalties,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.penalties || [],
      exceptions,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.exceptions || [],
      interpretations,: [],
      metadata,: {
        complexity_level: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.complexity_level || 'intermediate',
        applicability_score,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).similarity_scores?.overall || 0.5,
        controversy_level,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.controversy_level || 0,
        enforcement_frequency,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.enforcement_frequency || 0
      }
    })) as LegalLaw[];
  }
  private convertToLegalCases(results,: any[],): LegalCase[,] {
    // Would convert search results to LegalCase objects
    return results.map(result => ({
      id: (result as { id?: any; metadata?: any; content?: any,); similarity_scores?: any }).id || crypto.randomUUID(),
      title,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.title || 'Unknown Case',
      jurisdiction,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.jurisdiction || 'Unknown',
      practice_area,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.practice_area || 'General',
      case_type,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.case_type || 'civil',
      status,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.status || 'closed',
      filing_date,: new Date((result as { id?: any; metadata?: any; content?: an,y); similarity_scores?: any }).metadata.filing_date || Date.now,()),
      parties: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.parties || { plaintiff: [], defendant: [], counsel: [] },
      court,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.court || 'Unknown Court',
      judge,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.judge,
      docket_number,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.docket_number || '',
      related_laws,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.related_laws || [],
      key_issues,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.key_issues || [],
      case_summary,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).content || '',
      legal_precedents,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.legal_precedents || [],
      evidence_ids,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.evidence_ids || [],
      document_ids,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.document_ids || [],
      metadata,: {
        complexity_score: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.complexity_score || 0.5,
        precedent_value,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).similarity_scores?.overall || 0.5,
        settlement_probability,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.settlement_probability,
        estimated_duration,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.estimated_duration,
        budget_category,: (result as { id?: any; metadata?: any; content?: any; similarity_scores?: any }).metadata.budget_category
      }
    })) as LegalCase[];
  }
  // Database access methods (placeholders)
  private async getCaseById(caseId,: string,): Promise<LegalCase | null> {
    // Check cache first
    if (this,.caseCache.has(caseId,)) {
      return this.caseCache.get(caseId)!;
    }
    // Would fetch from actual database
    // For now, return a placeholder
    const placeholder: LegalCase = {
      id: caseId
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
    }
    this.caseCache.set(caseId, placeholder);
    return placeholder;
  }
  // Public API methods
  async getPerformanceMetrics(), {
    return {
      cacheStats: {
        cases: this.caseCache.size,
        laws: this.lawCache.size,
        ragContexts: this.ragCache.size
      },
      embeddingStrategies: Object.keys(this.embeddingStrategies),
      multiEmbeddingMetrics: await multiEmbeddingVectorService.getPerformanceMetrics()
    }
  }
  async clearCache(),: Promise<void> {
    this,.caseCache.clear(,);
    this,.lawCache.clear(,);
    this,.ragCache.clear(,);
  }
  getEmbeddingStrategies(), {
    return this.embeddingStrategies;
  }
}
// Export singleton instance
export const legalRAGOrchestrator = new LegalRAGEmbeddingOrchestrator();
export default legalRAGOrchestrator;