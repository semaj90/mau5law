// Utility functions for legal search components
import type { SearchResult, SearchFilter } from './types';

/**
 * Create search filters from user input
 */
export function createSearchFilters(filters: Record<string, any>): SearchFilter[] {
  return Object.entries(filters)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([field, value]) => ({
      field,
      operator: Array.isArray(value) ? 'in' : 'contains',
      value
    }));
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: any[]): SearchResult[] {
  return results.map(result => ({
    id: result.id,
    title: result.title || result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim(),
    type: result.type || inferType(result),
    content: result.content || result.description || result.summary || result.notes || '',
    score: result.score || result.similarity || calculateDefaultScore(result),
    metadata: {
      date: result.createdAt || result.date,
      jurisdiction: result.jurisdiction,
      status: result.status,
      confidentiality: result.confidentialityLevel,
      caseId: result.caseId,
      tags: Array.isArray(result.tags) ? result.tags : []
    },
    highlights: result.highlights,
    createdAt: result.createdAt
  }));
}

/**
 * Calculate relevance score for search results
 */
export function calculateRelevanceScore(query: string, text: string, options?: {
  exactMatchBonus?: number;
  wordMatchWeight?: number;
  positionWeight?: boolean;
}): number {
  if (!query || !text) return 0;

  const {
    exactMatchBonus = 0.3,
    wordMatchWeight = 0.8,
    positionWeight = true
  } = options || {};

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return Math.min(0.95, 0.6 + exactMatchBonus);
  }

  // Word-by-word matching with position weighting
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  const textWords = textLower.split(/\s+/);

  if (queryWords.length === 0) return 0;

  let totalScore = 0;
  let matches = 0;

  for (const queryWord of queryWords) {
    for (let i = 0; i < textWords.length; i++) {
      const textWord = textWords[i];

      if (textWord.includes(queryWord)) {
        matches++;
        let score = wordMatchWeight;

        // Position weighting - words earlier in text are more relevant
        if (positionWeight) {
          const positionBonus = Math.max(0, 1 - (i / textWords.length)) * 0.2;
          score += positionBonus;
        }

        // Exact word match bonus
        if (textWord === queryWord) {
          score += 0.1;
        }

        totalScore += score;
        break; // Only count first match per query word
      }
    }
  }

  // Normalize by number of query words
  const normalizedScore = totalScore / queryWords.length;

  // Apply match ratio penalty - partial matches get reduced score
  const matchRatio = matches / queryWords.length;
  const finalScore = normalizedScore * Math.pow(matchRatio, 0.5);

  return Math.min(0.95, Math.max(0, finalScore));
}

/**
 * Infer entity type from result data
 */
function inferType(result: any): SearchResult['type'] {
  if (result.caseNumber || result.case_id) return 'case';
  if (result.evidenceType || result.evidence_type) return 'evidence';
  if (result.firstName && result.lastName) return 'criminal';
  if (result.documentType || result.document_type) return 'document';
  if (result.citation || result.precedent) return 'precedent';
  if (result.statute || result.law) return 'statute';
  return 'document';
}

/**
 * Calculate default score when none provided
 */
function calculateDefaultScore(result: any): number {
  let score = 0.5; // Base score

  // Boost score for more complete records
  if (result.title) score += 0.1;
  if (result.description || result.content) score += 0.1;
  if (result.tags && result.tags.length > 0) score += 0.1;
  if (result.createdAt) score += 0.05;

  // Boost for legal-specific fields
  if (result.caseNumber) score += 0.1;
  if (result.evidenceType) score += 0.1;
  if (result.jurisdiction) score += 0.05;

  return Math.min(0.9, score);
}

/**
 * Highlight query terms in text
 */
export function highlightSearchTerms(text: string, query: string, options?: {
  maxLength?: number;
  contextBefore?: number;
  contextAfter?: number;
}): string {
  const {
    maxLength = 200,
    contextBefore = 30,
    contextAfter = 30
  } = options || {};

  if (!query || !text) return text;

  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  if (queryWords.length === 0) return text;

  // Find best match position
  let bestMatch = -1;
  let bestScore = 0;

  for (const word of queryWords) {
    const index = text.toLowerCase().indexOf(word);
    if (index !== -1 && index < bestMatch + 100) {
      bestMatch = index;
      bestScore++;
    }
  }

  if (bestMatch === -1) return text;

  // Extract context around match
  const start = Math.max(0, bestMatch - contextBefore);
  const end = Math.min(text.length, bestMatch + contextAfter);
  let excerpt = text.substring(start, end);

  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  // Truncate if too long
  if (excerpt.length > maxLength) {
    excerpt = excerpt.substring(0, maxLength - 3) + '...';
  }

  return excerpt;
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Get search category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    cases: 'Legal Cases',
    evidence: 'Evidence',
    precedents: 'Precedents',
    statutes: 'Statutes',
    criminals: 'Persons',
    documents: 'Documents'
  };

  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!query || query.trim().length === 0) {
    errors.push('Search query is required');
    return { isValid: false, errors, suggestions };
  }

  if (query.trim().length < 2) {
    errors.push('Search query must be at least 2 characters');
    suggestions.push('Try a longer search term');
  }

  if (query.length > 200) {
    errors.push('Search query is too long');
    suggestions.push('Try a shorter search term');
  }

  // Check for common legal search patterns
  const legalPatterns = /\b(case|evidence|statute|law|precedent|criminal|defendant|plaintiff|witness|testimony|court|judge|jury|verdict|sentence|appeal|motion|brief|filing|discovery|subpoena|warrant|indictment|conviction|acquittal|plea|bail|parole|probation|injunction|restraining|order|constitutional|amendment|rights|violation|liability|negligence|damages|contract|agreement|breach|tort|felony|misdemeanor|infraction)\b/i;

  if (!legalPatterns.test(query)) {
    suggestions.push('Consider adding legal terms like "case", "evidence", or "statute" for better results');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}