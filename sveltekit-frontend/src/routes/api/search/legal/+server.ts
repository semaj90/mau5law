import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types.js';
import { URL } from "url";


// Enhanced RAG Service Configuration
const ENHANCED_RAG_URL = 'http://localhost:8094';
const UPLOAD_SERVICE_URL = 'http://localhost:8093';
const KRATOS_SERVICE_URL = 'http://localhost:50051';

// Service client for multi-protocol communication
class LegalAIServiceClient {
  private async fetchWithFallback(url: string, options: RequestInit, fallbackPorts: number[] = []): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error: any) {
      // Try fallback ports if primary fails
      for (const port of fallbackPorts) {
        try {
          const fallbackUrl = url.replace(/:\d+/, `:${port}`);
          const response = await fetch(fallbackUrl, options);
          if (response.ok) return response;
        } catch (fallbackError) {
          continue;
        }
      }
      throw error;
    }
  }

  async enhancedRAGSearch(query: string, context: any = {}): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context: {
          searchType: 'legal',
          includeVectorSearch: true,
          includeSemanticAnalysis: true,
          ...context
        }
      })
    }, [8095, 8096]).then(r => r.json());
  }

  async vectorSearch(query: string, categories: string[], limit: number = 20): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/vector/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        categories,
        limit,
        threshold: 0.7,
        includeMetadata: true
      })
    }, [8095, 8096]).then(r => r.json());
  }

  async documentSearch(query: string, filters: any = {}): Promise<any> {
    return this.fetchWithFallback(`${UPLOAD_SERVICE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        filters: {
          documentTypes: ['legal-brief', 'court-filing', 'contract', 'evidence'],
          ...filters
        }
      })
    }, [8092, 8091]).then(r => r.json());
  }

  async semanticAnalysis(text: string, analysisType: string = 'legal'): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        analysisType,
        includeEntities: true,
        includeSentiment: true,
        includeKeywords: true
      })
    }, [8095, 8096]).then(r => r.json());
  }
}

// Validation schema
const LegalSearchSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  limit: z.coerce.number().min(1).max(100).default(20),
  threshold: z.coerce.number().min(0).max(1).default(0.7),
  categories: z.string().transform(str => str.split(',')).default('cases,evidence'),
  vectorSearch: z.coerce.boolean().default(true),
  aiSuggestions: z.coerce.boolean().default(true),
  includeMetadata: z.coerce.boolean().default(true)
});

export interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'evidence' | 'criminal' | 'document';
  content: string;
  score: number;
  similarity?: number;
  metadata: {
    date?: string;
    jurisdiction?: string;
    status?: string;
    confidentiality?: string;
    caseId?: string;
    tags?: string[];
  };
  highlights?: string[];
  createdAt?: string;
}

// Initialize service client
const serviceClient = new LegalAIServiceClient();

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse and validate query parameters
    const params = Object.fromEntries(url.searchParams);
    const validatedParams = LegalSearchSchema.parse(params);
    
    const { q: query, limit, threshold, categories, vectorSearch, aiSuggestions, includeMetadata } = validatedParams;
    
    console.log(`🔍 Enhanced Legal AI Search: "${query}" | Categories: ${categories.join(', ')} | Vector: ${vectorSearch}`);
    
    const startTime = Date.now();
    
    // Enhanced parallel search execution
    const searchPromises = categories.map(async (category) => {
      try {
        switch (category.trim()) {
          case 'cases':
            return await searchCases(query, limit, threshold, vectorSearch);
          case 'evidence':
            return await searchEvidence(query, limit, threshold, vectorSearch);
          case 'criminals':
            return await searchCriminals(query, limit, threshold);
          case 'documents':
            return await searchDocuments(query, limit, threshold, vectorSearch);
          case 'precedents':
            return await searchPrecedents(query, limit);
          case 'statutes':
            return await searchStatutes(query, limit);
          default:
            return [];
        }
      } catch (error: any) {
        console.error(`Error searching ${category}:`, error);
        return []; // Return empty array on error to continue with other categories
      }
    });

    // Execute all searches in parallel
    const categoryResults = await Promise.allSettled(searchPromises);
    const allResults: SearchResult[] = categoryResults
      .filter((result): result is PromiseFulfilledResult<SearchResult[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);

    // Enhanced vector similarity scoring if enabled
    let processedResults = allResults;
    if (vectorSearch && allResults.length > 0) {
      try {
        const vectorResults = await serviceClient.vectorSearch(query, categories, limit * 2);
        processedResults = await mergeWithVectorResults(allResults, vectorResults);
      } catch (error: any) {
        console.warn('Vector search failed, using standard results:', error);
      }
    }

    // Sort by enhanced relevance scoring
    const sortedResults = processedResults
      .sort((a, b) => calculateEnhancedScore(b, query) - calculateEnhancedScore(a, query))
      .slice(0, limit);

    // AI-powered enhancement and analysis
    let enhancedResults = sortedResults;
    if (aiSuggestions && sortedResults.length > 0) {
      try {
        enhancedResults = await enhanceWithAI(sortedResults, query);
        
        // Add semantic analysis for top results
        const semanticPromises = enhancedResults.slice(0, 5).map(async (result) => {
          try {
            const analysis = await serviceClient.semanticAnalysis(
              `${result.title} ${result.content}`.substring(0, 1000),
              'legal'
            );
            return {
              ...result,
              semanticAnalysis: analysis,
              confidence: analysis.confidence || result.score
            };
          } catch (error: any) {
            return result;
          }
        });
        
        const semanticResults = await Promise.allSettled(semanticPromises);
        const enhancedTop5 = semanticResults
          .filter((result): result is PromiseFulfilledResult<SearchResult> => result.status === 'fulfilled')
          .map(result => result.value);
        
        enhancedResults = [...enhancedTop5, ...enhancedResults.slice(5)];
      } catch (error: any) {
        console.warn('AI enhancement failed, using standard results:', error);
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Enhanced response with legal AI platform optimization
    return json({
      success: true,
      results: enhancedResults,
      metadata: {
        query,
        categories,
        totalResults: enhancedResults.length,
        processingTime,
        vectorSearchUsed: vectorSearch,
        aiEnhanced: aiSuggestions,
        searchStrategy: vectorSearch ? 'hybrid_vector_semantic' : 'semantic_only',
        confidence: enhancedResults.length > 0 ? 
          enhancedResults.reduce((sum, r) => sum + (r.score || 0), 0) / enhancedResults.length : 0,
        servicesUsed: {
          enhancedRAG: true,
          uploadService: categories.includes('documents'),
          vectorDB: vectorSearch,
          semanticAnalysis: aiSuggestions
        }
      },
      // Legal AI platform specific enhancements
      legalContext: {
        jurisdiction: 'federal', // Could be dynamic based on user preferences
        practiceAreas: extractPracticeAreas(query),
        urgencyLevel: calculateUrgencyLevel(enhancedResults),
        recommendedActions: generateRecommendedActions(enhancedResults, query)
      }
    });
    
  } catch (error: any) {
    console.error('Enhanced Legal AI Search error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: 'Enhanced search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallbackAvailable: true
    }, { status: 500 });
  }
};

// Enhanced search functions using real API calls
async function searchCases(query: string, limit: number, threshold: number, vectorSearch: boolean): Promise<SearchResult[]> {
  try {
    // Enhanced RAG search for cases with legal context
    const ragResults = await serviceClient.enhancedRAGSearch(query, {
      entityType: 'cases',
      limit,
      threshold,
      includeRelatedEntities: true,
      legalContext: {
        jurisdiction: 'all',
        practiceAreas: ['criminal', 'civil', 'constitutional', 'commercial'],
        includePreservation: true
      }
    });

    // Vector search enhancement if enabled
    let vectorResults: any[] = [];
    if (vectorSearch) {
      try {
        const vectorResponse = await serviceClient.vectorSearch(query, ['cases'], limit);
        vectorResults = vectorResponse.results || [];
      } catch (error: any) {
        console.warn('Vector search for cases failed:', error);
      }
    }

    // Process and merge results
    const processedResults = await processRAGResults(ragResults, 'case');
    const mergedResults = vectorSearch ? 
      await mergeWithVectorResults(processedResults, vectorResults) : 
      processedResults;

    return mergedResults.slice(0, limit).map((result: any) => ({
      id: result.id || `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: result.title || result.caseName || `Case: ${query}`,
      type: 'case' as const,
      content: result.description || result.summary || result.content || '',
      score: result.similarity || result.score || calculateRelevanceScore(query, result.title + ' ' + (result.content || '')),
      similarity: result.similarity,
      metadata: {
        date: result.createdAt || result.filingDate || new Date().toISOString(),
        jurisdiction: result.jurisdiction || result.court || 'Federal',
        status: result.status || result.caseStatus || 'active',
        caseNumber: result.caseNumber,
        tags: result.tags || result.practiceAreas || [query.toLowerCase()],
        confidence: result.confidence || result.score
      },
      highlights: result.highlights || [],
      createdAt: result.createdAt || new Date().toISOString(),
      // Enhanced legal case fields
      caseNumber: result.caseNumber,
      court: result.court,
      practiceArea: result.practiceArea,
      attorneys: result.attorneys || []
    }));

  } catch (error: any) {
    console.error('Error in enhanced case search:', error);
    // Fallback to basic search if enhanced search fails
    return await fallbackCaseSearch(query, limit);
  }
}

async function searchEvidence(query: string, limit: number, threshold: number, vectorSearch: boolean): Promise<SearchResult[]> {
  try {
    // Enhanced evidence search with forensic analysis
    const ragResults = await serviceClient.enhancedRAGSearch(query, {
      entityType: 'evidence',
      limit,
      threshold,
      forensicAnalysis: true,
      evidenceTypes: ['physical', 'digital', 'documentary', 'testimonial', 'forensic'],
      chainOfCustody: true
    });

    // Document search for evidence files
    let documentResults: any[] = [];
    try {
      const docResponse = await serviceClient.documentSearch(query, {
        documentTypes: ['evidence', 'forensic-report', 'lab-analysis'],
        confidentiality: ['public', 'restricted', 'confidential']
      });
      documentResults = docResponse.results || [];
    } catch (error: any) {
      console.warn('Document search for evidence failed:', error);
    }

    // Process RAG results for evidence
    const processedResults = await processRAGResults(ragResults, 'evidence');
    
    // Merge with document evidence
    const allEvidence = [...processedResults, ...documentResults.map((doc: any) => ({
      ...doc,
      type: 'evidence',
      evidenceSource: 'document',
      isAdmissible: doc.admissible !== false
    }))];

    // Vector search enhancement
    let vectorResults: any[] = [];
    if (vectorSearch) {
      try {
        const vectorResponse = await serviceClient.vectorSearch(query, ['evidence', 'forensics'], limit);
        vectorResults = vectorResponse.results || [];
      } catch (error: any) {
        console.warn('Vector search for evidence failed:', error);
      }
    }

    const finalResults = vectorSearch ? 
      await mergeWithVectorResults(allEvidence, vectorResults) : 
      allEvidence;

    return finalResults.slice(0, limit).map((result: any) => ({
      id: result.id || `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: result.title || result.evidenceName || `Evidence: ${query}`,
      type: 'evidence' as const,
      content: result.description || result.summary || result.content || '',
      score: result.similarity || result.score || calculateRelevanceScore(query, result.title + ' ' + (result.content || '')),
      similarity: result.similarity,
      metadata: {
        date: result.collectionDate || result.createdAt || new Date().toISOString(),
        confidentiality: result.confidentialityLevel || result.classification || 'restricted',
        caseId: result.caseId || result.associatedCase,
        status: result.isAdmissible !== false ? 'admissible' : 'under-review',
        evidenceType: result.evidenceType || result.type,
        tags: result.tags || [query.toLowerCase(), result.evidenceType || 'evidence'],
        chainOfCustody: result.chainOfCustody || [],
        confidence: result.confidence || result.score
      },
      highlights: result.highlights || [],
      createdAt: result.createdAt || new Date().toISOString(),
      // Enhanced evidence fields
      evidenceType: result.evidenceType || 'unknown',
      collectionDate: result.collectionDate,
      collectedBy: result.collectedBy,
      location: result.collectionLocation,
      labAnalysis: result.labAnalysis || {}
    }));

  } catch (error: any) {
    console.error('Error in enhanced evidence search:', error);
    return await fallbackEvidenceSearch(query, limit);
  }
}

async function searchCriminals(query: string, limit: number, threshold: number): Promise<SearchResult[]> {
  try {
    // Enhanced person/criminal search with legal context
    const ragResults = await serviceClient.enhancedRAGSearch(query, {
      entityType: 'persons',
      limit,
      threshold,
      includeAliases: true,
      includeCriminalHistory: true,
      riskAssessment: true,
      backgroundCheck: true
    });

    const processedResults = await processRAGResults(ragResults, 'criminal');

    return processedResults.slice(0, limit).map((result: any) => ({
      id: result.id || `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: result.fullName || `${result.firstName || ''} ${result.lastName || ''}`.trim() || `Person: ${query}`,
      type: 'criminal' as const,
      content: result.notes || result.description || result.summary || '',
      score: result.similarity || result.score || calculateRelevanceScore(query, result.fullName + ' ' + (result.notes || '')),
      similarity: result.similarity,
      metadata: {
        date: result.lastUpdated || result.createdAt || new Date().toISOString(),
        status: result.status || result.riskLevel || 'unknown',
        jurisdiction: result.jurisdiction,
        riskLevel: result.riskLevel,
        tags: result.aliases || result.tags || [query.toLowerCase()],
        confidence: result.confidence || result.score
      },
      highlights: result.highlights || [],
      createdAt: result.createdAt || new Date().toISOString(),
      // Enhanced person fields
      firstName: result.firstName,
      lastName: result.lastName,
      aliases: result.aliases || [],
      riskLevel: result.riskLevel || 'unknown',
      lastKnownAddress: result.lastKnownAddress,
      criminalHistory: result.criminalHistory || [],
      associatedCases: result.associatedCases || []
    }));

  } catch (error: any) {
    console.error('Error in enhanced person search:', error);
    return await fallbackPersonSearch(query, limit);
  }
}

async function searchDocuments(query: string, limit: number, threshold: number, vectorSearch: boolean): Promise<SearchResult[]> {
  try {
    // Enhanced document search using Upload Service
    const documentResults = await serviceClient.documentSearch(query, {
      documentTypes: ['legal-brief', 'court-filing', 'contract', 'motion', 'pleading', 'memorandum'],
      confidentiality: ['public', 'confidential', 'attorney-client'],
      includeContent: true,
      includeMetadata: true
    });

    // Enhanced RAG search for document content
    const ragResults = await serviceClient.enhancedRAGSearch(query, {
      entityType: 'documents',
      limit,
      threshold,
      includeFullText: true,
      documentAnalysis: true,
      legalCitations: true
    });

    // Combine and process results
    const combinedResults = [
      ...await processRAGResults(ragResults, 'document'),
      ...documentResults.results?.map((doc: any) => ({
        ...doc,
        type: 'document',
        documentSource: 'upload_service'
      })) || []
    ];

    // Vector search enhancement
    let vectorResults: any[] = [];
    if (vectorSearch) {
      try {
        const vectorResponse = await serviceClient.vectorSearch(query, ['documents', 'legal-docs'], limit);
        vectorResults = vectorResponse.results || [];
      } catch (error: any) {
        console.warn('Vector search for documents failed:', error);
      }
    }

    const finalResults = vectorSearch ? 
      await mergeWithVectorResults(combinedResults, vectorResults) : 
      combinedResults;

    return finalResults.slice(0, limit).map((result: any) => ({
      id: result.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: result.title || result.documentName || `Document: ${query}`,
      type: 'document' as const,
      content: result.summary || result.content || result.extractedText || '',
      score: result.similarity || result.score || calculateRelevanceScore(query, result.title + ' ' + (result.content || '')),
      similarity: result.similarity,
      metadata: {
        date: result.createdAt || result.uploadDate || new Date().toISOString(),
        confidentiality: result.confidentialityLevel || result.classification || 'public',
        caseId: result.caseId || result.associatedCase,
        documentType: result.documentType || result.fileType,
        tags: result.tags || [query.toLowerCase(), result.documentType || 'document'],
        fileSize: result.fileSize,
        pageCount: result.pageCount,
        confidence: result.confidence || result.score
      },
      highlights: result.highlights || [],
      createdAt: result.createdAt || new Date().toISOString(),
      // Enhanced document fields
      documentType: result.documentType || 'unknown',
      fileExtension: result.fileExtension,
      uploadedBy: result.uploadedBy,
      lastModified: result.lastModified,
      citations: result.citations || [],
      legalConcepts: result.legalConcepts || []
    }));

  } catch (error: any) {
    console.error('Error in enhanced document search:', error);
    return await fallbackDocumentSearch(query, limit);
  }
}

async function fallbackDocumentSearch(query: string, limit: number): Promise<SearchResult[]> {
  return [{
    id: `fallback-document-${Date.now()}`,
    title: `Document Search: ${query}`,
    type: 'document' as const,
    content: `Fallback search result for documents related to "${query}". Enhanced search services are currently unavailable.`,
    score: 0.5,
    metadata: {
      date: new Date().toISOString(),
      status: 'fallback',
      confidentiality: 'unknown',
      tags: [query.toLowerCase(), 'fallback']
    },
    createdAt: new Date().toISOString()
  }].slice(0, limit);
}

// Placeholder functions for legal-specific searches
async function searchPrecedents(query: string, limit: number): Promise<SearchResult[]> {
  // TODO: Integrate with legal precedent database or API
  return [
    {
      id: `precedent-${Date.now()}`,
      title: `Precedent case for "${query}"`,
      type: 'document' as const,
      content: 'Legal precedent analysis would go here...',
      score: 0.8,
      metadata: {
        date: new Date().toISOString(),
        jurisdiction: 'Federal',
        tags: ['precedent', 'case-law']
      }
    }
  ];
}

async function searchStatutes(query: string, limit: number): Promise<SearchResult[]> {
  // TODO: Integrate with statute database or API
  return [
    {
      id: `statute-${Date.now()}`,
      title: `Relevant statute for "${query}"`,
      type: 'document' as const,
      content: 'Statute text and analysis would go here...',
      score: 0.75,
      metadata: {
        date: new Date().toISOString(),
        jurisdiction: 'Federal',
        tags: ['statute', 'legislation']
      }
    }
  ];
}

// Calculate simple relevance score based on text matching
function calculateRelevanceScore(query: string, text: string): number {
  if (!text) return 0;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return 0.9;
  }
  
  // Word-by-word matching
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  const textWords = textLower.split(/\s+/);
  
  let matches = 0;
  for (const queryWord of queryWords) {
    if (textWords.some(textWord => textWord.includes(queryWord))) {
      matches++;
    }
  }
  
  return queryWords.length > 0 ? (matches / queryWords.length) * 0.8 : 0;
}

// Enhanced AI-powered result enhancement
async function enhanceWithAI(results: SearchResult[], query: string): Promise<SearchResult[]> {
  try {
    // Enhanced RAG-powered result analysis
    const enhancementPromises = results.map(async (result) => {
      try {
        // Get AI analysis for each result
        const analysis = await serviceClient.semanticAnalysis(
          `Query: "${query}"\nTitle: ${result.title}\nContent: ${result.content.substring(0, 500)}`,
          'legal_relevance'
        );

        // Extract key insights from analysis
        const highlights = extractHighlights(result.content, query);
        const legalConcepts = analysis.entities?.filter((e: any) => e.type === 'LEGAL_CONCEPT') || [];
        const relevanceScore = analysis.relevanceScore || result.score;

        return {
          ...result,
          score: Math.max(result.score, relevanceScore),
          highlights: highlights,
          aiAnalysis: {
            legalConcepts,
            relevanceExplanation: analysis.explanation,
            confidenceScore: analysis.confidence,
            keyTerms: analysis.keyTerms || []
          },
          // Enhanced metadata with AI insights
          metadata: {
            ...result.metadata,
            aiEnhanced: true,
            relevanceFactors: analysis.relevanceFactors || [],
            practiceAreaMatch: analysis.practiceAreaMatch || 'general'
          }
        };
      } catch (error: any) {
        console.warn(`AI enhancement failed for result ${result.id}:`, error);
        return result;
      }
    });

    return await Promise.all(enhancementPromises);
  } catch (error: any) {
    console.error('Error in AI enhancement:', error);
    return results;
  }
}

// Utility functions for enhanced search processing
async function processRAGResults(ragResults: any, resultType: string): Promise<any[]> {
  try {
    if (!ragResults || !ragResults.results) return [];
    
    return ragResults.results.map((result: any) => ({
      ...result,
      type: resultType,
      ragEnhanced: true,
      confidence: result.confidence || result.score || 0.5,
      processingTimestamp: new Date().toISOString()
    }));
  } catch (error: any) {
    console.warn('Error processing RAG results:', error);
    return [];
  }
}

async function mergeWithVectorResults(primaryResults: any[], vectorResults: any[]): Promise<any[]> {
  try {
    const merged = [...primaryResults];
    
    // Add unique vector results not already in primary results
    vectorResults.forEach((vectorResult: any) => {
      const exists = primaryResults.some(pr => 
        pr.id === vectorResult.id || 
        (pr.title && vectorResult.title && pr.title.toLowerCase() === vectorResult.title.toLowerCase())
      );
      
      if (!exists) {
        merged.push({
          ...vectorResult,
          vectorEnhanced: true,
          score: vectorResult.similarity || vectorResult.score || 0.5
        });
      }
    });
    
    return merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch (error: any) {
    console.warn('Error merging vector results:', error);
    return primaryResults;
  }
}

function calculateEnhancedScore(result: SearchResult, query: string): number {
  let score = result.score || 0;
  
  // Boost for vector similarity
  if (result.similarity) {
    score = Math.max(score, result.similarity);
  }
  
  // Boost for AI confidence
  if ((result as any).confidence) {
    score = (score + (result as any).confidence) / 2;
  }
  
  // Boost for exact query matches in title
  if (result.title.toLowerCase().includes(query.toLowerCase())) {
    score += 0.2;
  }
  
  // Boost for recent content
  if (result.metadata.date) {
    const age = Date.now() - new Date(result.metadata.date).getTime();
    const daysSinceCreation = age / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) {
      score += 0.1 * (1 - daysSinceCreation / 30);
    }
  }
  
  return Math.min(1.0, Math.max(0, score));
}

function extractPracticeAreas(query: string): string[] {
  const practiceAreaMap: Record<string, string[]> = {
    'criminal': ['murder', 'theft', 'assault', 'drug', 'dui', 'felony', 'misdemeanor'],
    'civil': ['contract', 'tort', 'negligence', 'personal injury', 'property'],
    'constitutional': ['amendment', 'rights', 'freedom', 'due process', 'equal protection'],
    'commercial': ['business', 'corporate', 'securities', 'merger', 'acquisition'],
    'family': ['divorce', 'custody', 'adoption', 'marriage', 'child support'],
    'intellectual property': ['patent', 'trademark', 'copyright', 'trade secret'],
    'employment': ['discrimination', 'harassment', 'wrongful termination', 'wage'],
    'immigration': ['visa', 'asylum', 'deportation', 'citizenship', 'green card']
  };
  
  const queryLower = query.toLowerCase();
  const matchedAreas: string[] = [];
  
  for (const [area, keywords] of Object.entries(practiceAreaMap)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      matchedAreas.push(area);
    }
  }
  
  return matchedAreas.length > 0 ? matchedAreas : ['general'];
}

function calculateUrgencyLevel(results: SearchResult[]): 'low' | 'medium' | 'high' | 'critical' {
  if (results.length === 0) return 'low';
  
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const hasHighPriorityTerms = results.some(r => 
    r.content.toLowerCase().includes('urgent') || 
    r.content.toLowerCase().includes('emergency') ||
    r.metadata.status === 'critical'
  );
  
  if (hasHighPriorityTerms || avgScore > 0.9) return 'critical';
  if (avgScore > 0.7) return 'high';
  if (avgScore > 0.5) return 'medium';
  return 'low';
}

function generateRecommendedActions(results: SearchResult[], query: string): string[] {
  const actions: string[] = [];
  
  if (results.length === 0) {
    actions.push('Broaden search terms', 'Check spelling', 'Try synonyms');
    return actions;
  }
  
  if (results.some(r => r.type === 'case')) {
    actions.push('Review case precedents', 'Analyze similar cases');
  }
  
  if (results.some(r => r.type === 'evidence')) {
    actions.push('Verify chain of custody', 'Schedule forensic analysis');
  }
  
  if (results.some(r => r.metadata.status === 'pending')) {
    actions.push('Follow up on pending items', 'Set calendar reminders');
  }
  
  const practiceAreas = extractPracticeAreas(query);
  if (practiceAreas.includes('criminal')) {
    actions.push('Check statute of limitations', 'Review Miranda rights');
  }
  
  return actions.slice(0, 5); // Limit to top 5 recommendations
}

function extractHighlights(content: string, query: string): string[] {
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
  const highlights: string[] = [];
  const contentLower = content.toLowerCase();
  
  for (const word of queryWords) {
    const regex = new RegExp(`(.{0,30}\\b${word}\\b.{0,30})`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      highlights.push(...matches.slice(0, 2));
    }
  }
  
  return Array.from(new Set(highlights)).slice(0, 3); // Remove duplicates and limit
}

// Fallback search functions for when enhanced search fails
async function fallbackCaseSearch(query: string, limit: number): Promise<SearchResult[]> {
  return [{
    id: `fallback-case-${Date.now()}`,
    title: `Legal Case Search: ${query}`,
    type: 'case' as const,
    content: `Fallback search result for legal cases related to "${query}". Enhanced search services are currently unavailable.`,
    score: 0.5,
    metadata: {
      date: new Date().toISOString(),
      status: 'fallback',
      tags: [query.toLowerCase(), 'fallback']
    },
    createdAt: new Date().toISOString()
  }].slice(0, limit);
}

async function fallbackEvidenceSearch(query: string, limit: number): Promise<SearchResult[]> {
  return [{
    id: `fallback-evidence-${Date.now()}`,
    title: `Evidence Search: ${query}`,
    type: 'evidence' as const,
    content: `Fallback search result for evidence related to "${query}". Enhanced search services are currently unavailable.`,
    score: 0.5,
    metadata: {
      date: new Date().toISOString(),
      status: 'fallback',
      confidentiality: 'unknown',
      tags: [query.toLowerCase(), 'fallback']
    },
    createdAt: new Date().toISOString()
  }].slice(0, limit);
}

async function fallbackPersonSearch(query: string, limit: number): Promise<SearchResult[]> {
  return [{
    id: `fallback-person-${Date.now()}`,
    title: `Person Search: ${query}`,
    type: 'criminal' as const,
    content: `Fallback search result for persons related to "${query}". Enhanced search services are currently unavailable.`,
    score: 0.5,
    metadata: {
      date: new Date().toISOString(),
      status: 'fallback',
      tags: [query.toLowerCase(), 'fallback']
    },
    createdAt: new Date().toISOString()
  }].slice(0, limit);
}

// Suggestions endpoint for AI-powered search suggestions
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action } = await request.json();
    
    if (action === 'suggestions') {
      // TODO: Integrate with AI service for smart suggestions
      const suggestions = [
        'Constitutional rights violation',
        'Evidence chain of custody',
        'Miranda rights procedure',
        'Search warrant requirements',
        'Probable cause determination',
        'Criminal liability assessment',
        'Witness testimony credibility',
        'DNA evidence analysis'
      ];
      
      return json({
        success: true,
        suggestions: suggestions.slice(0, 5)
      });
    }
    
    return json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error: any) {
    return json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
};