/**
 * Knowledge Search Engine
 * Phase 76 - Knowledge Search with RAG+KAG Integration
 *
 * Provides semantic search over crawled documentation with AI-generated summaries,
 * TF-IDF ranking, HMM route inference, and ts-morph AST analysis.
 *
 * @module knowledge-search
 */

// Export all types
export * from './types';

// Export services
export { KnowledgeIndexer, getKnowledgeIndexer } from './KnowledgeIndexer';
export { TfIdfRanker, getTfIdfRanker } from './TfIdfRanker';
export { QdrantKnowledgeStore, getQdrantKnowledgeStore } from './QdrantKnowledgeStore';
export { PostgresKnowledgeStore, getPostgresKnowledgeStore } from './PostgresKnowledgeStore';
export { MinioKnowledgeStore, getMinioKnowledgeStore } from './MinioKnowledgeStore';
export { RedisCacheService, getRedisCacheService } from './RedisCacheService';
export { KnowledgeSearcher, getKnowledgeSearcher } from './KnowledgeSearcher';

// Services to be implemented:
// export { QdrantKnowledgeStore } from './QdrantKnowledgeStore';
// export { PostgresKnowledgeStore } from './PostgresKnowledgeStore';
// export { MinioKnowledgeStore } from './MinioKnowledgeStore';
// export { RedisCacheService } from './RedisCacheService';
// export { TagExtractor } from './TagExtractor';
// export { A2AProtocolHandler } from './A2AProtocolHandler';
// export { ACPToolRegistry } from './ACPToolRegistry';
// export { WebSearchAgent } from './WebSearchAgent';
// export { RouteInferenceEngine } from './RouteInferenceEngine';
// export { CodebaseIndexer } from './CodebaseIndexer';
// export { ErrorCodeCorrelator } from './ErrorCodeCorrelator';
// export { ContextualEngineeringService } from './ContextualEngineeringService';
// export { ProductionValidator } from './ProductionValidator';
