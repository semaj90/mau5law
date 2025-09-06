import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { URL } from "url";


// Enhanced RAG Service Configuration
const ENHANCED_RAG_URL = 'http://localhost:8094';

// Enhanced service client for AI-powered suggestions
class SuggestionsService {
  private async fetchWithFallback(url: string, options: RequestInit, fallbackPorts: number[] = []): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error: any) {
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

  async generateContextualSuggestions(query: string, category: string, limit: number): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        category,
        limit,
        suggestionType: 'legal_search',
        includeSemanticExpansions: true,
        includeTrendingTerms: true,
        legalContext: {
          jurisdiction: 'federal',
          practiceAreas: 'all',
          includeRecentChanges: true
        }
      })
    }, [8095, 8096]).then(r => r.json());
  }

  async getTrendingSearches(timeWindow: string = '7d'): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/trending`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }, [8095, 8096]).then(r => r.json()).catch(() => ({ trending: [] }));
  }

  async getSmartCompletions(partialQuery: string, category: string, limit: number): Promise<any> {
    return this.fetchWithFallback(`${ENHANCED_RAG_URL}/api/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partial: partialQuery,
        category,
        limit,
        completionType: 'legal_smart',
        includeDefinitions: true,
        includePracticeAreas: true
      })
    }, [8095, 8096]).then(r => r.json());
  }
}

const suggestionsService = new SuggestionsService();

// Enhanced AI-powered search suggestions for legal platform
export const GET: RequestHandler = async ({ url }) => {
  try {
    const userQuery = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || 'general';
    const limit = parseInt(url.searchParams.get('limit') || '8');
    const includeDefinitions = url.searchParams.get('definitions') === 'true';
    const includeTrending = url.searchParams.get('trending') !== 'false';
    
    console.log(`🔍 Enhanced Legal AI Suggestions: "${userQuery}" | Category: ${category}`);
    
    const startTime = Date.now();
    
    // Enhanced parallel suggestion generation
    const suggestionPromises = [
      // AI-powered contextual suggestions
      suggestionsService.generateContextualSuggestions(userQuery, category, limit)
        .catch(error => {
          console.warn('Contextual suggestions failed:', error);
          return { suggestions: [] };
        }),
      
      // Trending searches (if enabled)
      includeTrending ? 
        suggestionsService.getTrendingSearches('7d')
          .catch(error => {
            console.warn('Trending searches failed:', error);
            return { trending: [] };
          }) : 
        Promise.resolve({ trending: [] }),
      
      // Smart completions if partial query
      userQuery.length >= 2 ? 
        suggestionsService.getSmartCompletions(userQuery, category, Math.floor(limit / 2))
          .catch(error => {
            console.warn('Smart completions failed:', error);
            return { completions: [] };
          }) : 
        Promise.resolve({ completions: [] })
    ];

    const [contextualResults, trendingResults, completionResults] = await Promise.all(suggestionPromises);

    // Process and merge results
    const suggestions = await processEnhancedSuggestions(
      contextualResults.suggestions || [],
      completionResults.completions || [],
      userQuery,
      category,
      includeDefinitions
    );

    // Get trending topics
    const trending = await processTrendingSuggestions(
      trendingResults.trending || [],
      category
    );

    const processingTime = Date.now() - startTime;

    // Enhanced response with legal AI platform optimization
    return json({
      success: true,
      suggestions: suggestions.slice(0, limit),
      trending: trending.slice(0, 5),
      metadata: {
        category,
        query: userQuery,
        totalSuggestions: suggestions.length,
        processingTime,
        aiEnhanced: true,
        includeDefinitions,
        timestamp: new Date().toISOString(),
        searchStrategy: userQuery ? 'contextual_completion' : 'discovery_trending',
        servicesUsed: {
          enhancedRAG: true,
          semanticExpansions: true,
          trendingAnalysis: includeTrending,
          smartCompletions: userQuery.length >= 2
        }
      },
      // Legal AI platform specific enhancements
      legalContext: {
        jurisdiction: 'federal',
        practiceAreas: extractPracticeAreas(userQuery || category),
        recommendedFilters: generateRecommendedFilters(suggestions, category),
        relatedConcepts: extractRelatedConcepts(suggestions)
      }
    });
    
  } catch (error: any) {
    console.error('Enhanced Legal AI Suggestions error:', error);
    
    // Fallback to basic suggestions if enhanced search fails
    const fallbackSuggestions = await getFallbackSuggestions(
      url.searchParams.get('q') || '',
      url.searchParams.get('category') || 'general',
      parseInt(url.searchParams.get('limit') || '8')
    );
    
    return json({
      success: true, // Still return success with fallback
      suggestions: fallbackSuggestions,
      trending: [],
      metadata: {
        category: url.searchParams.get('category') || 'general',
        query: url.searchParams.get('q') || '',
        timestamp: new Date().toISOString(),
        fallbackMode: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

// Enhanced utility functions for suggestion processing
async function processEnhancedSuggestions(
  contextualSuggestions: any[],
  completions: any[],
  query: string,
  category: string,
  includeDefinitions: boolean
): Promise<any[]> {
  try {
    const allSuggestions = [
      ...contextualSuggestions.map((s: any) => ({
        text: s.text || s.suggestion,
        category: s.category || category,
        score: s.relevanceScore || s.score || 0.8,
        trending: s.trending || false,
        description: s.description || s.explanation,
        definition: includeDefinitions ? s.definition : undefined,
        practiceArea: s.practiceArea,
        confidence: s.confidence || 0.7,
        source: 'contextual'
      })),
      ...completions.map((c: any) => ({
        text: c.completion || c.text,
        category: c.category || category,
        score: c.completionScore || c.score || 0.6,
        trending: false,
        description: c.description,
        definition: includeDefinitions ? c.definition : undefined,
        practiceArea: c.practiceArea,
        confidence: c.confidence || 0.6,
        source: 'completion'
      }))
    ];

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    );

    return uniqueSuggestions
      .sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence))
      .map(suggestion => ({
        ...suggestion,
        enhancedScore: calculateEnhancedRelevanceScore(query, suggestion.text, suggestion.score),
        relatedTerms: extractRelatedTerms(suggestion.text, category),
        jurisdiction: determineJurisdiction(suggestion.text),
        urgencyLevel: determineUrgencyLevel(suggestion.text)
      }));

  } catch (error: any) {
    console.warn('Error processing enhanced suggestions:', error);
    return [];
  }
}

async function processTrendingSuggestions(trendingData: any[], category: string): Promise<any[]> {
  try {
    return trendingData.map((trending: any) => ({
      text: trending.searchTerm || trending.text || trending,
      category: trending.category || category,
      score: trending.trendingScore || 0.9,
      trending: true,
      description: `Trending search in ${category} law`,
      searchCount: trending.searchCount || 0,
      trendingPeriod: trending.period || '7d',
      growthRate: trending.growthRate || 0
    }));
  } catch (error: any) {
    console.warn('Error processing trending suggestions:', error);
    return [];
  }
}

function calculateEnhancedRelevanceScore(query: string, suggestion: string, baseScore: number): number {
  if (!query || !suggestion) return baseScore;
  
  let enhancedScore = baseScore;
  const queryLower = query.toLowerCase();
  const suggestionLower = suggestion.toLowerCase();
  
  // Exact match bonus
  if (suggestionLower.includes(queryLower)) {
    enhancedScore += 0.3;
  }
  
  // Word match scoring
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  const matchingWords = queryWords.filter(word => suggestionLower.includes(word));
  if (queryWords.length > 0) {
    enhancedScore += (matchingWords.length / queryWords.length) * 0.2;
  }
  
  // Legal term bonus
  const legalTerms = ['amendment', 'statute', 'case', 'evidence', 'court', 'law', 'rights', 'legal', 'criminal'];
  const hasLegalTerms = legalTerms.some(term => suggestionLower.includes(term));
  if (hasLegalTerms) {
    enhancedScore += 0.1;
  }
  
  return Math.min(1.0, enhancedScore);
}

function extractPracticeAreas(input: string): string[] {
  const practiceAreaKeywords: Record<string, string[]> = {
    'criminal': ['criminal', 'felony', 'misdemeanor', 'arrest', 'prosecution', 'defendant', 'miranda'],
    'civil': ['civil', 'tort', 'negligence', 'contract', 'breach', 'damages', 'liability'],
    'constitutional': ['constitutional', 'amendment', 'rights', 'freedom', 'due process', 'equal protection'],
    'commercial': ['commercial', 'business', 'corporate', 'contract', 'securities', 'merger'],
    'family': ['family', 'divorce', 'custody', 'adoption', 'marriage', 'child support'],
    'intellectual property': ['patent', 'trademark', 'copyright', 'trade secret', 'IP'],
    'employment': ['employment', 'discrimination', 'harassment', 'wage', 'workplace'],
    'immigration': ['immigration', 'visa', 'asylum', 'deportation', 'citizenship'],
    'environmental': ['environmental', 'pollution', 'EPA', 'clean air', 'water rights'],
    'tax': ['tax', 'IRS', 'deduction', 'audit', 'revenue']
  };
  
  const inputLower = input.toLowerCase();
  const matchedAreas: string[] = [];
  
  for (const [area, keywords] of Object.entries(practiceAreaKeywords)) {
    if (keywords.some(keyword => inputLower.includes(keyword))) {
      matchedAreas.push(area);
    }
  }
  
  return matchedAreas.length > 0 ? matchedAreas : ['general'];
}

function generateRecommendedFilters(suggestions: any[], category: string): string[] {
  const filters: string[] = [];
  
  // Extract common themes from suggestions
  const commonTerms = extractCommonTerms(suggestions.map(s => s.text));
  
  if (commonTerms.includes('federal') || commonTerms.includes('constitutional')) {
    filters.push('federal_jurisdiction');
  }
  
  if (commonTerms.includes('evidence') || commonTerms.includes('forensic')) {
    filters.push('evidence_based');
  }
  
  if (commonTerms.includes('recent') || commonTerms.includes('2024') || commonTerms.includes('new')) {
    filters.push('recent_changes');
  }
  
  // Category-specific filters
  if (category === 'cases') {
    filters.push('case_status', 'jurisdiction', 'court_level');
  } else if (category === 'evidence') {
    filters.push('evidence_type', 'chain_of_custody', 'admissibility');
  }
  
  return filters.slice(0, 5);
}

function extractRelatedConcepts(suggestions: any[]): string[] {
  const concepts = new Set<string>();
  
  suggestions.forEach(suggestion => {
    const text = suggestion.text.toLowerCase();
    
    // Extract key legal concepts
    if (text.includes('constitutional')) concepts.add('Constitutional Law');
    if (text.includes('evidence')) concepts.add('Evidence Rules');
    if (text.includes('criminal')) concepts.add('Criminal Procedure');
    if (text.includes('civil')) concepts.add('Civil Procedure');
    if (text.includes('contract')) concepts.add('Contract Law');
    if (text.includes('tort')) concepts.add('Tort Law');
    if (text.includes('amendment')) concepts.add('Bill of Rights');
    if (text.includes('court')) concepts.add('Court Procedures');
  });
  
  return Array.from(concepts).slice(0, 8);
}

function extractRelatedTerms(text: string, category: string): string[] {
  const relatedTermsMap: Record<string, string[]> = {
    'criminal': ['prosecution', 'defense', 'plea bargain', 'sentencing', 'appeal'],
    'civil': ['litigation', 'settlement', 'damages', 'injunction', 'discovery'],
    'evidence': ['admissible', 'chain of custody', 'forensic', 'witness', 'authentication'],
    'constitutional': ['due process', 'equal protection', 'fundamental rights', 'strict scrutiny'],
    'cases': ['precedent', 'holding', 'dicta', 'jurisdiction', 'appeal'],
    'documents': ['filing', 'pleading', 'motion', 'brief', 'memorandum']
  };
  
  const terms = relatedTermsMap[category] || [];
  const textLower = text.toLowerCase();
  
  // Add context-specific terms
  if (textLower.includes('search')) {
    terms.push('warrant', 'probable cause', 'reasonable suspicion');
  }
  if (textLower.includes('rights')) {
    terms.push('miranda', 'counsel', 'self-incrimination');
  }
  
  return terms.slice(0, 5);
}

function determineJurisdiction(text: string): string {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('federal') || textLower.includes('supreme court') || textLower.includes('constitutional')) {
    return 'federal';
  }
  if (textLower.includes('state') || textLower.includes('local')) {
    return 'state';
  }
  
  return 'general';
}

function determineUrgencyLevel(text: string): 'low' | 'medium' | 'high' | 'critical' {
  const textLower = text.toLowerCase();
  
  const highUrgencyTerms = ['emergency', 'urgent', 'immediate', 'crisis', 'critical'];
  const mediumUrgencyTerms = ['deadline', 'hearing', 'court date', 'filing'];
  
  if (highUrgencyTerms.some(term => textLower.includes(term))) return 'critical';
  if (mediumUrgencyTerms.some(term => textLower.includes(term))) return 'high';
  if (textLower.includes('review') || textLower.includes('analysis')) return 'medium';
  
  return 'low';
}

function extractCommonTerms(suggestions: string[]): string[] {
  const wordCount: Record<string, number> = {};
  
  suggestions.forEach(suggestion => {
    const words = suggestion.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
  });
  
  return Object.entries(wordCount)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .map(([word, _]) => word)
    .slice(0, 10);
}

// Fallback suggestions when enhanced search fails
async function getFallbackSuggestions(query: string, category: string, limit: number): Promise<any[]> {
  const fallbackSuggestionsByCategory: Record<string, string[]> = {
    general: [
      'Constitutional rights violations',
      'Evidence chain of custody',
      'Criminal procedure rules',
      'Civil litigation process',
      'Legal precedent analysis',
      'Court filing requirements',
      'Miranda rights procedures',
      'Search warrant standards'
    ],
    cases: [
      'Recent court decisions',
      'Legal precedent cases',
      'Constitutional challenges',
      'Federal court rulings',
      'State supreme court cases',
      'Appellate court decisions'
    ],
    evidence: [
      'Digital forensics evidence',
      'Physical evidence collection',
      'Chain of custody procedures',
      'Evidence admissibility rules',
      'Expert witness testimony',
      'Forensic analysis reports'
    ],
    criminals: [
      'Criminal background checks',
      'Person of interest searches',
      'Defendant information',
      'Criminal history records',
      'Suspect identification',
      'Witness statements'
    ]
  };
  
  const suggestions = fallbackSuggestionsByCategory[category] || fallbackSuggestionsByCategory.general;
  
  return suggestions.slice(0, limit).map((suggestion, index) => ({
    text: suggestion,
    category,
    score: 0.5 - (index * 0.05),
    trending: false,
    description: `Fallback suggestion for ${category}`,
    source: 'fallback',
    confidence: 0.5
  }));
}