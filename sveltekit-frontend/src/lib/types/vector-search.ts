// Type definitions for Enhanced Vector Search Service
// Legal AI Platform - Vector Similarity Search Types

export interface EmbeddingVector {
  dimensions: number;
  values: number[];
  model: string;
  createdAt: Date;
}

export interface VectorSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  
  /** Similarity threshold (0-1, higher = more similar) */
  threshold?: number;
  
  /** Filter by specific case ID */
  caseId?: string;
  
  /** Include detailed metadata in results */
  includeMetadata?: boolean;
  
  /** Entity types to search across */
  entityTypes?: ('evidence' | 'case' | 'chunk')[];
  
  /** Exclude specific entity ID from results */
  excludeEntityId?: string;
  
  /** Weight different entity types in unified search */
  weightByType?: Record<string, number>;
  
  /** Use hybrid search combining vector and text search */
  useHybridSearch?: boolean;
  
  /** Boost recent documents in ranking */
  boostRecent?: boolean;
}

export interface VectorSearchResult {
  /** Unique identifier for the result */
  id: string;
  
  /** ID of the source entity (evidence, case, etc.) */
  entityId: string;
  
  /** Type of entity this result represents */
  entityType: 'evidence' | 'case' | 'chunk';
  
  /** Similarity score (0-1, higher = more similar) */
  similarity: number;
  
  /** Title or name of the entity */
  title: string;
  
  /** Description or summary */
  description: string;
  
  /** Additional metadata about the result */
  metadata: {
    /** File type for evidence results */
    fileType?: string;
    
    /** Case ID for evidence results */
    caseId?: string;
    
    /** Case number for case results */
    caseNumber?: string;
    
    /** Status for case results */
    status?: string;
    
    /** Raw L2 distance from query vector */
    distance?: number;
    
    /** Created timestamp */
    createdAt?: string;
    
    /** Updated timestamp */
    updatedAt?: string;
    
    /** File size in bytes */
    fileSize?: number;
    
    /** MIME type */
    mimeType?: string;
    
    /** Additional custom metadata */
    [key: string]: any;
  };
}

export interface BatchVectorSearchQuery {
  /** Unique identifier for this query */
  id: string;
  
  /** Embedding vector to search with */
  embedding: number[];
  
  /** Search options for this query */
  options?: VectorSearchOptions;
}

export interface BatchVectorSearchResult {
  /** Results organized by query ID */
  [queryId: string]: VectorSearchResult[];
}

export interface VectorSearchHealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Detailed health information */
  details: {
    /** Whether pgvector extension is installed */
    hasVector?: boolean;
    
    /** Number of vectors available for search */
    vectorCount?: number;
    
    /** Information about vector indexes */
    indexes?: Array<{
      name: string;
      table: string;
    }>;
    
    /** Performance metrics */
    performance?: {
      countQueryTime?: number;
      sampleQueryTime?: number;
    };
    
    /** Index performance rating */
    indexStatus?: 'optimal' | 'good' | 'slow' | 'poor';
    
    /** Error message if unhealthy */
    error?: string;
    
    /** Recommendation for fixing issues */
    recommendation?: string;
    
    /** Timestamp of health check */
    timestamp?: string;
  };
}

export interface VectorSearchStats {
  /** Count of vectors by entity type */
  vectorCounts: {
    evidence: number;
    cases: number;
    chunks?: number;
  };
  
  /** PostgreSQL index usage statistics */
  indexStats: {
    [indexName: string]: {
      table: string;
      scans: number;
      tuplesRead: number;
      tuplesFetched: number;
    };
  };
  
  /** Vector dimensions by entity type */
  dimensions: {
    evidence: number;
    cases?: number;
    chunks?: number;
  };
  
  /** Recent activity and status */
  recentActivity: {
    lastUpdated: string;
    healthStatus: string;
    error?: string;
    timestamp?: string;
  };
}

export interface VectorClusterResult {
  /** Unique cluster identifier */
  clusterId: string;
  
  /** Documents in this cluster */
  documents: VectorSearchResult[];
  
  /** Centroid vector for the cluster */
  centroid: number[];
  
  /** How coherent/tight the cluster is (0-1) */
  coherenceScore: number;
  
  /** Extracted topics for this cluster */
  topics: string[];
  
  /** Number of documents in cluster */
  size: number;
}

export interface VectorQueryExpansion {
  /** Original search term */
  originalTerm: string;
  
  /** Expanded/related terms */
  expandedTerms: string[];
  
  /** Synonyms found */
  synonyms: string[];
  
  /** Related legal concepts */
  relatedConcepts: string[];
  
  /** Confidence in expansion quality */
  confidence: number;
}

export interface SimilaritySearchParams {
  /** Query embedding vector */
  queryEmbedding: number[];
  
  /** Search options */
  options?: VectorSearchOptions;
  
  /** Whether to use approximate search for speed */
  useApproximate?: boolean;
  
  /** Custom distance function */
  distanceFunction?: 'l2' | 'cosine' | 'inner_product';
}

export interface VectorIndexInfo {
  /** Index name */
  name: string;
  
  /** Table the index is on */
  tableName: string;
  
  /** Column the index covers */
  columnName: string;
  
  /** Index type (ivfflat, hnsw, etc.) */
  indexType: string;
  
  /** Index parameters */
  parameters: {
    lists?: number;
    probes?: number;
    ef_construction?: number;
    ef_search?: number;
    m?: number;
  };
  
  /** Index size in bytes */
  sizeBytes?: number;
  
  /** Number of index scans */
  scans?: number;
  
  /** Index effectiveness metrics */
  effectiveness?: {
    tuplesRead: number;
    tuplesFetched: number;
    hitRatio: number;
  };
}

export interface VectorSearchPerformanceMetrics {
  /** Total search time in milliseconds */
  totalTime: number;
  
  /** Vector search component time */
  vectorSearchTime: number;
  
  /** Text search component time (if hybrid) */
  textSearchTime?: number;
  
  /** Result ranking and scoring time */
  rankingTime: number;
  
  /** Database query time */
  databaseTime: number;
  
  /** Number of vectors examined */
  vectorsExamined: number;
  
  /** Number of results returned */
  resultsReturned: number;
  
  /** Whether index was used effectively */
  indexUsed: boolean;
}

export interface VectorEmbeddingMetadata {
  /** Model used to generate embedding */
  model: string;
  
  /** Embedding dimensions */
  dimensions: number;
  
  /** When embedding was created */
  createdAt: Date;
  
  /** Source text that was embedded */
  sourceText?: string;
  
  /** Processing parameters used */
  parameters?: {
    chunkSize?: number;
    overlap?: number;
    normalization?: string;
  };
  
  /** Quality metrics */
  quality?: {
    confidence: number;
    completeness: number;
    relevance: number;
  };
}

// Utility types for type safety
export type VectorDimensions = 384 | 768 | 1536; // Common embedding dimensions
export type DistanceFunction = 'l2' | 'cosine' | 'inner_product';
export type EntityType = 'evidence' | 'case' | 'chunk';
export type SearchStrategy = 'vector_only' | 'hybrid' | 'text_only';

// Error types for better error handling
export class VectorSearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VectorSearchError';
  }
}

export class EmbeddingValidationError extends VectorSearchError {
  constructor(message: string, details?: any) {
    super(message, 'EMBEDDING_VALIDATION_ERROR', details);
  }
}

export class VectorIndexError extends VectorSearchError {
  constructor(message: string, details?: any) {
    super(message, 'VECTOR_INDEX_ERROR', details);
  }
}

// Type guards for runtime validation
export function isValidEmbedding(value: any): value is number[] {
  return Array.isArray(value) && 
         value.length > 0 && 
         value.every(v => typeof v === 'number' && !isNaN(v));
}

export function isValidVectorSearchResult(value: any): value is VectorSearchResult {
  return typeof value === 'object' &&
         typeof value.id === 'string' &&
         typeof value.entityId === 'string' &&
         typeof value.similarity === 'number' &&
         typeof value.title === 'string';
}