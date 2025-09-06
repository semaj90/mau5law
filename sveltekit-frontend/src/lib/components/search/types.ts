// Types for legal search components

export interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'evidence' | 'precedent' | 'statute' | 'criminal' | 'document';
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

export interface SearchOptions {
  categories: Array<'cases' | 'evidence' | 'precedents' | 'statutes' | 'criminals' | 'documents'>;
  enableVectorSearch: boolean;
  aiSuggestions: boolean;
  maxResults: number;
  similarityThreshold: number;
  includeMetadata: boolean;
}

export interface SearchMetadata {
  query: string;
  categories: string[];
  totalResults: number;
  processingTime: number;
  vectorSearchUsed: boolean;
  aiEnhanced: boolean;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'in';
  value: string | number | string[];
}

export interface SearchSuggestion {
  text: string;
  category: string;
  score: number;
  trending?: boolean;
}