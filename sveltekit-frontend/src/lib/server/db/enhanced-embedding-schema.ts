// Enhanced Embedding Pipeline Schema for Production Legal AI
// Comprehensive schema supporting: document ingestion, chunking, embeddings, search, Neo4j sync
import {
  pgTable,
  index,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  real,
  boolean,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";
import { relations } from "drizzle-orm";

// Documents table - source documents from MinIO
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 512 }),
    filename: varchar("filename", { length: 255 }).notNull(),
    sourceUri: varchar("source_uri", { length: 1024 }).notNull(), // minio://bucket/key
    mimeType: varchar("mime_type", { length: 100 }),
    fileSize: bigint("file_size", { mode: "number" }),
    extractedText: text("extracted_text"), // OCR/PDF extraction result
    processingStatus: varchar("processing_status", { length: 50 })
      .notNull()
      .default("pending"), // pending, processing, completed, failed
    caseId: uuid("case_id"), // Optional association with legal case
    uploadedBy: uuid("uploaded_by").notNull(),
    metadata: jsonb("metadata")
      .$type<{
        pages?: number;
        language?: string;
        ocrConfidence?: number;
        documentType?: string;
        tags?: string[];
        classifications?: Record<string, number>;
        entities?: Array<{ type: string; text: string; confidence: number }>;
        [key: string]: any;
      }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    statusIdx: index("idx_documents_status").on(table.processingStatus),
    caseIdx: index("idx_documents_case").on(table.caseId),
    filenameIdx: index("idx_documents_filename").on(table.filename),
    createdAtIdx: index("idx_documents_created").on(table.createdAt),
  }),
);

// Document chunks for embedding - supports overlap and hierarchical chunking
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    parentChunkId: uuid("parent_chunk_id"), // For hierarchical chunking
    level: integer("level").notNull().default(0), // Chunk hierarchy level (0 = sentence, 1 = paragraph, 2 = section)
    text: text("text").notNull(),
    tokens: integer("tokens"),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    // pgvector embeddings - supports different model dimensions
    embedding: vector("embedding", { dimensions: 384 }), // nomic-embed-text default
    embeddingModel: varchar("embedding_model", { length: 100 }).default("nomic-embed-text"),
    confidence: real("confidence"), // Extraction/chunking confidence
    metadata: jsonb("metadata")
      .$type<{
        pageNumbers?: number[];
        section?: string;
        importance?: number;
        keyPhrases?: string[];
        sentiment?: number;
        topicLabels?: string[];
        [key: string]: any;
      }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // HNSW index for vector similarity search
    embeddingHnswIdx: index("idx_chunks_embedding_hnsw").on(table.embedding),
    documentIdx: index("idx_chunks_document").on(table.documentId, table.chunkIndex),
    hierarchyIdx: index("idx_chunks_hierarchy").on(table.parentChunkId, table.level),
    createdAtIdx: index("idx_chunks_created").on(table.createdAt),
  }),
);

// Search queries and embeddings cache
export const searchQueries = pgTable(
  "search_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sessionId: varchar("session_id", { length: 100 }), // For session grouping
    queryText: text("query_text").notNull(),
    queryEmbedding: vector("query_embedding", { dimensions: 384 }),
    searchType: varchar("search_type", { length: 50 })
      .notNull()
      .default("semantic"), // semantic, keyword, hybrid, rag
    filters: jsonb("filters")
      .$type<{
        caseIds?: string[];
        documentTypes?: string[];
        dateRange?: { start: string; end: string };
        confidence?: { min: number; max: number };
        tags?: string[];
        [key: string]: any;
      }>()
      .default({}),
    resultsCount: integer("results_count").default(0),
    searchTime: real("search_time"), // Search duration in ms
    results: jsonb("results")
      .$type<{
        chunks: Array<{
          id: string;
          documentId: string;
          similarity: number;
          snippet: string;
          metadata?: any;
        }>;
        documents: Array<{
          id: string;
          title: string;
          relevanceScore: number;
          matchingChunks: number;
        }>;
        totalFound: number;
        searchStrategy: string;
      }>()
      .default({ chunks: [], documents: [], totalFound: 0, searchStrategy: "semantic" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_search_user").on(table.userId, table.createdAt),
    sessionIdx: index("idx_search_session").on(table.sessionId),
    queryEmbeddingIdx: index("idx_search_embedding").on(table.queryEmbedding),
    createdAtIdx: index("idx_search_created").on(table.createdAt),
  }),
);

// Embedding models configuration
export const embeddingModels = pgTable(
  "embedding_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    provider: varchar("provider", { length: 50 }).notNull(), // ollama, openai, huggingface, local
    modelId: varchar("model_id", { length: 200 }).notNull(), // Model identifier
    dimensions: integer("dimensions").notNull(), // Vector dimensions
    contextLength: integer("context_length"),
    tokenizer: varchar("tokenizer", { length: 100 }),
    config: jsonb("config")
      .$type<{
        baseUrl?: string;
        apiKey?: string;
        modelPath?: string; // For local models
        quantization?: string;
        gpuLayers?: number;
        batchSize?: number;
        [key: string]: any;
      }>()
      .default({}),
    performance: jsonb("performance")
      .$type<{
        tokensPerSecond?: number;
        averageLatency?: number;
        memoryUsage?: number;
        accuracy?: number;
        [key: string]: any;
      }>()
      .default({}),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_models_name").on(table.name),
    providerIdx: index("idx_models_provider").on(table.provider),
    activeIdx: index("idx_models_active").on(table.isActive, table.isDefault),
  }),
);

// Job queue for async processing
export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobType: varchar("job_type", { length: 50 }).notNull(), // ingest, chunk, embed, index, neo4j_sync
    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending"), // pending, processing, completed, failed, retrying
    priority: integer("priority").default(5), // 1-10, higher = more priority
    documentId: uuid("document_id"),
    chunkId: uuid("chunk_id"),
    payload: jsonb("payload")
      .$type<{
        sourceUri?: string;
        options?: Record<string, any>;
        retryCount?: number;
        error?: string;
        progress?: number;
        [key: string]: any;
      }>()
      .default({}),
    workerNode: varchar("worker_node", { length: 100 }), // Which worker is processing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    failedAt: timestamp("failed_at"),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusPriorityIdx: index("idx_jobs_status_priority").on(table.status, table.priority),
    typeStatusIdx: index("idx_jobs_type_status").on(table.jobType, table.status),
    documentIdx: index("idx_jobs_document").on(table.documentId),
    retryIdx: index("idx_jobs_retry").on(table.nextRetryAt),
    createdAtIdx: index("idx_jobs_created").on(table.createdAt),
  }),
);

// Entity extraction and Neo4j sync
export const entityNodes = pgTable(
  "entity_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    neo4jId: varchar("neo4j_id", { length: 50 }), // Neo4j node ID for sync
    entityType: varchar("entity_type", { length: 50 }).notNull(), // PERSON, ORG, LOCATION, etc.
    name: varchar("name", { length: 500 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 500 }), // For deduplication
    description: text("description"),
    confidence: real("confidence"),
    properties: jsonb("properties")
      .$type<{
        aliases?: string[];
        roles?: string[];
        dates?: string[];
        locations?: string[];
        [key: string]: any;
      }>()
      .default({}),
    embedding: vector("embedding", { dimensions: 384 }), // Entity embedding for similarity
    documentIds: jsonb("document_ids").$type<string[]>().default([]),
    chunkIds: jsonb("chunk_ids").$type<string[]>().default([]),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    typeNameIdx: index("idx_entities_type_name").on(table.entityType, table.normalizedName),
    neo4jIdx: index("idx_entities_neo4j").on(table.neo4jId),
    embeddingIdx: index("idx_entities_embedding").on(table.embedding),
    syncIdx: index("idx_entities_sync").on(table.lastSyncedAt),
  }),
);

// Relations
export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
  jobs: many(processingJobs),
}));

export const documentChunksRelations = relations(documentChunks, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
  parent: one(documentChunks, {
    fields: [documentChunks.parentChunkId],
    references: [documentChunks.id],
  }),
  children: many(documentChunks),
}));

export const processingJobsRelations = relations(processingJobs, ({ one }) => ({
  document: one(documents, {
    fields: [processingJobs.documentId],
    references: [documents.id],
  }),
  chunk: one(documentChunks, {
    fields: [processingJobs.chunkId],
    references: [documentChunks.id],
  }),
}));

// Export types
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;
export type EmbeddingModel = typeof embeddingModels.$inferSelect;
export type NewEmbeddingModel = typeof embeddingModels.$inferInsert;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
export type EntityNode = typeof entityNodes.$inferSelect;
export type NewEntityNode = typeof entityNodes.$inferInsert;

// Database migration SQL for pgvector
export const vectorExtensionSQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for vector similarity search (run after table creation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_embedding_hnsw 
ON search_queries USING hnsw (query_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_nodes_embedding_hnsw 
ON entity_nodes USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
`;

// Utility functions for vector operations
export const vectorOperations = {
  // Convert number array to pgvector format
  toVector: (arr: number[]): string => `[${arr.join(',')}]`,
  
  // Parse pgvector to number array
  fromVector: (vec: string): number[] => 
    JSON.parse(vec.replace(/[\[\]]/g, '').split(',').map(n => parseFloat(n))),
    
  // Calculate cosine similarity
  cosineSimilarity: (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  },
  
  // Normalize vector
  normalize: (vec: number[]): number[] => {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vec.map(val => val / magnitude) : vec;
  }
};