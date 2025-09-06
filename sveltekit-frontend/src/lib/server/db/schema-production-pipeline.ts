/**
 * Production Pipeline Database Schema
 * Optimized for crawl → OCR → embed → index → cache → serve workflow
 * PostgreSQL + pgvector + Drizzle ORM
 */

import { 
  pgTable, 
  text, 
  integer, 
  timestamp, 
  boolean, 
  jsonb, 
  uuid,
  varchar,
  bigint,
  real,
  index,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enable pgvector extension
export const enableVectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector`;

// ===== CRAWL & INGESTION TABLES =====

/**
 * Crawl Jobs - Tracks web crawling requests and status
 */
export const crawlJobs = pgTable('crawl_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  domain: varchar('domain', { length: 255 }),
  crawlType: varchar('crawl_type', { length: 50 }).notNull().default('web_page'), // web_page, pdf_document, legal_database
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, crawling, completed, failed, retrying
  priority: integer('priority').default(5), // 1-10, higher = more important
  maxDepth: integer('max_depth').default(1),
  allowedDomains: jsonb('allowed_domains'), // Array of domains to crawl
  blockedPaths: jsonb('blocked_paths'), // Array of path patterns to skip
  headers: jsonb('headers'), // Custom headers for crawling
  metadata: jsonb('metadata'), // Additional crawl configuration
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  lastError: text('last_error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  urlIdx: index('crawl_jobs_url_idx').on(table.url),
  statusIdx: index('crawl_jobs_status_idx').on(table.status),
  domainIdx: index('crawl_jobs_domain_idx').on(table.domain),
  priorityIdx: index('crawl_jobs_priority_idx').on(table.priority),
  createdAtIdx: index('crawl_jobs_created_at_idx').on(table.createdAt),
}));

/**
 * Crawled Pages - Stores raw crawled content before processing
 */
export const crawledPages = pgTable('crawled_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  crawlJobId: uuid('crawl_job_id').references(() => crawlJobs.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title'),
  contentType: varchar('content_type', { length: 100 }),
  statusCode: integer('status_code'),
  contentLength: bigint('content_length', { mode: 'number' }),
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256
  rawContent: text('raw_content'), // HTML/Text content
  blobPath: text('blob_path'), // MinIO path for large files
  headers: jsonb('headers'),
  links: jsonb('links'), // Extracted links
  images: jsonb('images'), // Extracted images
  metadata: jsonb('metadata'),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'), // pending, processing, completed, failed
  ocrRequired: boolean('ocr_required').default(false),
  embeddingRequired: boolean('embedding_required').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  urlIdx: uniqueIndex('crawled_pages_url_idx').on(table.url),
  crawlJobIdx: index('crawled_pages_crawl_job_idx').on(table.crawlJobId),
  statusIdx: index('crawled_pages_status_idx').on(table.processingStatus),
  hashIdx: index('crawled_pages_hash_idx').on(table.contentHash),
  ocrIdx: index('crawled_pages_ocr_idx').on(table.ocrRequired),
}));

// ===== DOCUMENT PROCESSING TABLES =====

/**
 * Documents - Processed and classified documents
 */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  crawledPageId: uuid('crawled_page_id').references(() => crawledPages.id),
  title: text('title').notNull(),
  content: text('content'), // Full text content
  contentType: varchar('content_type', { length: 100 }),
  language: varchar('language', { length: 10 }).default('en'),
  documentType: varchar('document_type', { length: 100 }), // contract, case_law, statute, regulation, brief
  jurisdiction: varchar('jurisdiction', { length: 100 }), // US-Federal, US-NY, UK, etc.
  practiceArea: varchar('practice_area', { length: 100 }), // corporate, litigation, IP, etc.
  confidentialityLevel: varchar('confidentiality_level', { length: 50 }).default('public'), // public, internal, confidential, restricted
  classification: jsonb('classification'), // AI-generated document classification
  entities: jsonb('entities'), // Extracted legal entities (parties, courts, etc.)
  topics: jsonb('topics'), // Topic modeling results
  summary: text('summary'), // AI-generated summary
  keyPhrases: jsonb('key_phrases'), // Extracted key legal phrases
  citedCases: jsonb('cited_cases'), // Referenced case law
  citedStatutes: jsonb('cited_statutes'), // Referenced statutes
  wordCount: integer('word_count'),
  pageCount: integer('page_count'),
  qualityScore: real('quality_score'), // 0.0-1.0, OCR/content quality
  processingTime: integer('processing_time'), // Processing time in ms
  sourceUrl: text('source_url'),
  sourceHash: varchar('source_hash', { length: 64 }),
  blobPath: text('blob_path'), // MinIO path for original file
  thumbnailPath: text('thumbnail_path'), // MinIO path for preview
  ocrStatus: varchar('ocr_status', { length: 50 }).default('not_required'), // not_required, pending, processing, completed, failed
  embeddingStatus: varchar('embedding_status', { length: 50 }).default('pending'), // pending, processing, completed, failed
  indexStatus: varchar('index_status', { length: 50 }).default('pending'), // pending, indexing, completed, failed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  titleIdx: index('documents_title_idx').on(table.title),
  typeIdx: index('documents_type_idx').on(table.documentType),
  jurisdictionIdx: index('documents_jurisdiction_idx').on(table.jurisdiction),
  practiceAreaIdx: index('documents_practice_area_idx').on(table.practiceArea),
  confidentialityIdx: index('documents_confidentiality_idx').on(table.confidentialityLevel),
  sourceHashIdx: uniqueIndex('documents_source_hash_idx').on(table.sourceHash),
  embeddingStatusIdx: index('documents_embedding_status_idx').on(table.embeddingStatus),
  createdAtIdx: index('documents_created_at_idx').on(table.createdAt),
  qualityScoreIdx: index('documents_quality_score_idx').on(table.qualityScore),
}));

/**
 * Document Chunks - Strategic chunking for optimal embeddings
 */
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  chunkType: varchar('chunk_type', { length: 50 }).notNull().default('paragraph'), // paragraph, section, page, sentence, heading
  content: text('content').notNull(),
  contentLength: integer('content_length'),
  startPosition: integer('start_position'), // Character position in original document
  endPosition: integer('end_position'),
  parentChunkId: uuid('parent_chunk_id'), // For hierarchical chunking
  siblingChunks: jsonb('sibling_chunks'), // Related chunk IDs
  contextWindow: text('context_window'), // Surrounding context for better embeddings
  headings: jsonb('headings'), // Document structure context
  importance: real('importance').default(0.5), // 0.0-1.0, chunk importance score
  embedding: sql`vector(384)`, // 384-dimensional embedding vector
  embeddingModel: varchar('embedding_model', { length: 100 }).default('nomic-embed-text'),
  embeddingVersion: varchar('embedding_version', { length: 50 }).default('1.0'),
  embeddingMetadata: jsonb('embedding_metadata'),
  searchKeywords: jsonb('search_keywords'), // Extracted keywords for hybrid search
  legalConcepts: jsonb('legal_concepts'), // Identified legal concepts
  entities: jsonb('entities'), // Entities mentioned in this chunk
  qualityScore: real('quality_score'), // Chunk-specific quality score
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  documentIdIdx: index('document_chunks_document_id_idx').on(table.documentId),
  chunkIndexIdx: index('document_chunks_chunk_index_idx').on(table.documentId, table.chunkIndex),
  typeIdx: index('document_chunks_type_idx').on(table.chunkType),
  importanceIdx: index('document_chunks_importance_idx').on(table.importance),
  qualityIdx: index('document_chunks_quality_idx').on(table.qualityScore),
  // pgvector indexes
  embeddingIdx: index('document_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  embeddingL2Idx: index('document_chunks_embedding_l2_idx').using('hnsw', table.embedding.op('vector_l2_ops')),
  embeddingIpIdx: index('document_chunks_embedding_ip_idx').using('hnsw', table.embedding.op('vector_ip_ops')),
}));

// ===== SEARCH & INDEXING TABLES =====

/**
 * Search Index - Full-text search with legal-specific ranking
 */
export const searchIndex = pgTable('search_index', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkId: uuid('chunk_id').references(() => documentChunks.id, { onDelete: 'cascade' }),
  indexType: varchar('index_type', { length: 50 }).notNull().default('full_text'), // full_text, semantic, hybrid
  searchVector: sql`tsvector`, // PostgreSQL full-text search vector
  searchContent: text('search_content'), // Processed content for search
  keywords: jsonb('keywords'),
  concepts: jsonb('concepts'),
  entities: jsonb('entities'),
  boost: real('boost').default(1.0), // Search ranking boost
  freshness: real('freshness').default(1.0), // Time-based relevance decay
  authority: real('authority').default(0.5), // Domain/source authority score
  popularity: real('popularity').default(0.0), // Click-through rate based score
  legalWeight: real('legal_weight').default(0.5), // Legal document importance
  lastAccessed: timestamp('last_accessed'),
  accessCount: integer('access_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  documentIdIdx: index('search_index_document_id_idx').on(table.documentId),
  chunkIdIdx: index('search_index_chunk_id_idx').on(table.chunkId),
  indexTypeIdx: index('search_index_type_idx').on(table.indexType),
  searchVectorIdx: index('search_index_vector_idx').using('gin', table.searchVector),
  boostIdx: index('search_index_boost_idx').on(table.boost),
  freshnessIdx: index('search_index_freshness_idx').on(table.freshness),
  popularityIdx: index('search_index_popularity_idx').on(table.popularity),
  legalWeightIdx: index('search_index_legal_weight_idx').on(table.legalWeight),
}));

/**
 * Cache Keys - Redis cache key management and invalidation
 */
export const cacheKeys = pgTable('cache_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  cacheKey: varchar('cache_key', { length: 255 }).notNull(),
  cacheType: varchar('cache_type', { length: 50 }).notNull(), // search_result, document_content, embedding_result, blob_metadata
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  chunkId: uuid('chunk_id').references(() => documentChunks.id, { onDelete: 'cascade' }),
  queryHash: varchar('query_hash', { length: 64 }), // Hash of search query for cache key
  ttl: integer('ttl').default(3600), // TTL in seconds
  hitCount: integer('hit_count').default(0),
  lastHit: timestamp('last_hit'),
  dataSize: integer('data_size'), // Cached data size in bytes
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  cacheKeyIdx: uniqueIndex('cache_keys_key_idx').on(table.cacheKey),
  typeIdx: index('cache_keys_type_idx').on(table.cacheType),
  documentIdIdx: index('cache_keys_document_id_idx').on(table.documentId),
  queryHashIdx: index('cache_keys_query_hash_idx').on(table.queryHash),
  expiresAtIdx: index('cache_keys_expires_at_idx').on(table.expiresAt),
  hitCountIdx: index('cache_keys_hit_count_idx').on(table.hitCount),
}));

// ===== PROCESSING & MONITORING TABLES =====

/**
 * Processing Jobs - Tracks async processing tasks
 */
export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobType: varchar('job_type', { length: 100 }).notNull(), // crawl, ocr, embed, index, cache_warm
  entityType: varchar('entity_type', { length: 50 }).notNull(), // document, chunk, page
  entityId: uuid('entity_id').notNull(),
  queueName: varchar('queue_name', { length: 100 }),
  status: varchar('status', { length: 50 }).default('pending'), // pending, processing, completed, failed, retrying
  priority: integer('priority').default(5),
  progress: integer('progress').default(0), // 0-100
  payload: jsonb('payload'),
  result: jsonb('result'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  processingTime: integer('processing_time'), // Time taken in ms
  workerId: varchar('worker_id', { length: 100 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  jobTypeIdx: index('processing_jobs_job_type_idx').on(table.jobType),
  statusIdx: index('processing_jobs_status_idx').on(table.status),
  entityIdx: index('processing_jobs_entity_idx').on(table.entityType, table.entityId),
  priorityIdx: index('processing_jobs_priority_idx').on(table.priority),
  queueIdx: index('processing_jobs_queue_idx').on(table.queueName),
  workerIdx: index('processing_jobs_worker_idx').on(table.workerId),
  createdAtIdx: index('processing_jobs_created_at_idx').on(table.createdAt),
}));

/**
 * System Metrics - Performance and health monitoring
 */
export const systemMetrics = pgTable('system_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // crawl_rate, ocr_throughput, embedding_latency, search_performance
  component: varchar('component', { length: 100 }), // crawler, ocr_worker, embedding_service, search_api
  value: real('value').notNull(),
  unit: varchar('unit', { length: 50 }), // pages/min, docs/min, ms, mb/s
  tags: jsonb('tags'),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  metricTypeIdx: index('system_metrics_type_idx').on(table.metricType),
  componentIdx: index('system_metrics_component_idx').on(table.component),
  timestampIdx: index('system_metrics_timestamp_idx').on(table.timestamp),
  typeTimestampIdx: index('system_metrics_type_timestamp_idx').on(table.metricType, table.timestamp),
}));

// ===== LEGAL-SPECIFIC TABLES =====

/**
 * Legal Authorities - Court decisions, statutes, regulations
 */
export const legalAuthorities = pgTable('legal_authorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorityType: varchar('authority_type', { length: 50 }).notNull(), // case_law, statute, regulation, rule
  jurisdiction: varchar('jurisdiction', { length: 100 }).notNull(),
  court: varchar('court', { length: 200 }),
  citation: varchar('citation', { length: 500 }),
  title: text('title'),
  date: timestamp('date'),
  authorityLevel: varchar('authority_level', { length: 50 }), // supreme, appellate, district, administrative
  bindingStatus: varchar('binding_status', { length: 50 }), // binding, persuasive, superseded
  keyholding: text('keyholding'),
  summary: text('summary'),
  topics: jsonb('topics'),
  citationCount: integer('citation_count').default(0),
  documentId: uuid('document_id').references(() => documents.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  authorityTypeIdx: index('legal_authorities_type_idx').on(table.authorityType),
  jurisdictionIdx: index('legal_authorities_jurisdiction_idx').on(table.jurisdiction),
  courtIdx: index('legal_authorities_court_idx').on(table.court),
  citationIdx: uniqueIndex('legal_authorities_citation_idx').on(table.citation),
  bindingIdx: index('legal_authorities_binding_idx').on(table.bindingStatus),
  citationCountIdx: index('legal_authorities_citation_count_idx').on(table.citationCount),
}));

// ===== UTILITY FUNCTIONS =====

/**
 * Vector similarity search function
 */
export const vectorSimilaritySearch = (queryEmbedding: string, limit: number = 10, threshold: number = 0.7) => sql`
  SELECT 
    dc.*,
    d.title,
    d.document_type,
    d.jurisdiction,
    (1 - (dc.embedding <=> ${queryEmbedding}::vector)) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE (1 - (dc.embedding <=> ${queryEmbedding}::vector)) > ${threshold}
  ORDER BY dc.embedding <=> ${queryEmbedding}::vector
  LIMIT ${limit}
`;

/**
 * Hybrid search combining full-text and vector search
 */
export const hybridSearch = (query: string, queryEmbedding: string, limit: number = 10) => sql`
  WITH text_search AS (
    SELECT 
      si.document_id,
      si.chunk_id,
      ts_rank_cd(si.search_vector, plainto_tsquery(${query})) as text_score
    FROM search_index si
    WHERE si.search_vector @@ plainto_tsquery(${query})
  ),
  vector_search AS (
    SELECT 
      dc.document_id,
      dc.id as chunk_id,
      (1 - (dc.embedding <=> ${queryEmbedding}::vector)) as vector_score
    FROM document_chunks dc
    WHERE (1 - (dc.embedding <=> ${queryEmbedding}::vector)) > 0.7
  )
  SELECT 
    COALESCE(ts.document_id, vs.document_id) as document_id,
    COALESCE(ts.chunk_id, vs.chunk_id) as chunk_id,
    COALESCE(ts.text_score, 0) * 0.3 + COALESCE(vs.vector_score, 0) * 0.7 as combined_score,
    ts.text_score,
    vs.vector_score
  FROM text_search ts
  FULL OUTER JOIN vector_search vs ON ts.chunk_id = vs.chunk_id
  ORDER BY combined_score DESC
  LIMIT ${limit}
`;

// Export table types for TypeScript
export type CrawlJob = typeof crawlJobs.$inferSelect;
export type NewCrawlJob = typeof crawlJobs.$inferInsert;
export type CrawledPage = typeof crawledPages.$inferSelect;
export type NewCrawledPage = typeof crawledPages.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type NewSearchIndex = typeof searchIndex.$inferInsert;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
export type LegalAuthority = typeof legalAuthorities.$inferSelect;
export type NewLegalAuthority = typeof legalAuthorities.$inferInsert;