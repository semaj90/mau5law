// @ts-nocheck
/**
 * Enhanced Legal Schema for Hybrid Vector Storage (Qdrant + PGVector)
 * Implements Phase 8 architecture with legal-specific AI enhancements
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";

// === ENHANCED LEGAL EVIDENCE WITH HYBRID VECTOR STORAGE ===

export const enhancedEvidence = pgTable("enhanced_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // AI-generated summary
  
  // Legal-specific fields
  caseType: varchar("case_type", { length: 50 }).notNull(), // contract, litigation, compliance, regulatory
  jurisdiction: varchar("jurisdiction", { length: 50 }).default("federal"),
  
  // AI Analysis Results
  entities: jsonb("entities").$type<{
    parties: string[];
    dates: string[];
    monetary: string[];
    clauses: string[];
    jurisdictions: string[];
    caseTypes: string[];
  }>().default(sql`'{"parties":[],"dates":[],"monetary":[],"clauses":[],"jurisdictions":[],"caseTypes":[]}'::jsonb`),
  
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  riskScore: integer("risk_score").default(0), // 0-100
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).default("0.75"),
  
  // Hybrid Vector Storage
  embedding: vector("embedding", { dimensions: 384 }), // PGVector storage (nomic-embed-text)
  qdrantId: varchar("qdrant_id", { length: 100 }), // Reference to Qdrant collection
  qdrantCollection: varchar("qdrant_collection", { length: 100 }).default("legal_documents"),
  
  // Processing Status
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"), // pending, processing, completed, error
  aiModelVersion: varchar("ai_model_version", { length: 100 }), // Track model for reproducibility
  
  // Legal Metadata
  legalPrecedent: boolean("legal_precedent").default(false),
  precedentialValue: varchar("precedential_value", { length: 50 }), // binding, persuasive, non_precedential
  citationFormat: varchar("citation_format", { length: 50 }), // bluebook, apa, chicago
  
  // Audit Trail
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { mode: "date" }),
});

// === LEGAL RAG SEARCH SESSIONS ===

export const legalRAGSessions = pgTable("legal_rag_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: uuid("user_id").notNull(),
  caseId: uuid("case_id"),
  
  // Search Parameters
  query: text("query").notNull(),
  searchType: varchar("search_type", { length: 50 }).default("semantic"), // semantic, hybrid, legal_precedent
  jurisdiction: varchar("jurisdiction", { length: 50 }),
  caseType: varchar("case_type", { length: 50 }),
  
  // Results and Scoring
  resultsCount: integer("results_count").default(0),
  searchResults: jsonb("search_results").default(sql`'[]'::jsonb`),
  rerankingApplied: boolean("reranking_applied").default(false),
  
  // Performance Metrics
  searchDuration: integer("search_duration"), // milliseconds
  qdrantLatency: integer("qdrant_latency"), // milliseconds
  pgvectorLatency: integer("pgvector_latency"), // milliseconds
  
  // AI Context
  contextUsed: jsonb("context_used").default(sql`'[]'::jsonb`),
  aiRecommendations: jsonb("ai_recommendations").default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// === LEGAL DOCUMENT RERANKING METRICS ===

export const legalRerankingMetrics = pgTable("legal_reranking_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  documentId: uuid("document_id").notNull(),
  
  // Scoring Breakdown
  originalScore: decimal("original_score", { precision: 5, scale: 4 }).notNull(),
  rerankScore: decimal("rerank_score", { precision: 5, scale: 4 }),
  
  // Legal-Specific Scoring Components
  legalPrecedentBonus: decimal("legal_precedent_bonus", { precision: 3, scale: 2 }).default("0.00"),
  jurisdictionMatch: boolean("jurisdiction_match").default(false),
  caseTypeMatch: boolean("case_type_match").default(false),
  timeRelevance: decimal("time_relevance", { precision: 3, scale: 2 }),
  confidenceBonus: decimal("confidence_bonus", { precision: 3, scale: 2 }).default("0.00"),
  
  // Relevance Reasoning
  relevanceReason: text("relevance_reason"),
  scoringFactors: jsonb("scoring_factors").default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// === QDRANT VECTOR METADATA ===

export const qdrantVectorMetadata = pgTable("qdrant_vector_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  qdrantId: varchar("qdrant_id", { length: 100 }).notNull().unique(),
  collectionName: varchar("collection_name", { length: 100 }).notNull(),
  
  // Reference to PostgreSQL record
  evidenceId: uuid("evidence_id"),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  
  // Vector Metadata
  vectorDimensions: integer("vector_dimensions").default(384),
  vectorModel: varchar("vector_model", { length: 100 }).default("nomic-embed-text"),
  
  // Legal Metadata for Qdrant Payload
  legalMetadata: jsonb("legal_metadata").$type<{
    caseType: string;
    jurisdiction: string;
    riskScore: number;
    entities: any;
    tags: string[];
    legalPrecedent: boolean;
  }>().default(sql`'{"caseType":"","jurisdiction":"","riskScore":0,"entities":{},"tags":[],"legalPrecedent":false}'::jsonb`),
  
  // Sync Status
  syncStatus: varchar("sync_status", { length: 50 }).default("synced"), // synced, pending, error
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }).defaultNow(),
  syncError: text("sync_error"),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === LEGAL AI PROCESSING QUEUE ===

export const legalProcessingQueue = pgTable("legal_processing_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  evidenceId: uuid("evidence_id").notNull(),
  
  // Processing Pipeline
  stage: varchar("stage", { length: 50 }).default("queued"), // queued, extracting, analyzing, embedding, storing, completed
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  
  // Processing Options
  processingOptions: jsonb("processing_options").$type<{
    extractEntities: boolean;
    generateSummary: boolean;
    assessRisk: boolean;
    generateEmbedding: boolean;
    storeInQdrant: boolean;
    useContext7: boolean;
  }>().default(sql`'{"extractEntities":true,"generateSummary":true,"assessRisk":true,"generateEmbedding":true,"storeInQdrant":true,"useContext7":false}'::jsonb`),
  
  // Progress Tracking
  progress: integer("progress").default(0), // 0-100
  currentTask: varchar("current_task", { length: 100 }),
  
  // Error Handling
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  lastError: text("last_error"),
  
  // Timing
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  processingDuration: integer("processing_duration"), // milliseconds
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === VECTOR SIMILARITY CACHE ===

export const vectorSimilarityCache = pgTable("vector_similarity_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  queryHash: varchar("query_hash", { length: 64 }).notNull().unique(), // SHA256 of query + params
  
  // Query Parameters
  queryText: text("query_text").notNull(),
  searchParams: jsonb("search_params").$type<{
    jurisdiction?: string;
    caseType?: string;
    riskThreshold?: number;
    requirePrecedent?: boolean;
  }>().default({}),
  
  // Cached Results
  results: jsonb("results").notNull(),
  resultsCount: integer("results_count").notNull(),
  
  // Cache Metadata
  searchDuration: integer("search_duration"),
  cacheHit: boolean("cache_hit").default(false),
  ttl: integer("ttl").default(300), // seconds (5 minutes)
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

// === CONTEXT7 MCP INTEGRATION LOGS ===

export const context7MCPLogs = pgTable("context7_mcp_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }),
  userId: uuid("user_id"),
  
  // MCP Tool Information
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  toolArgs: jsonb("tool_args").default({}),
  
  // Request/Response
  request: jsonb("request").notNull(),
  response: jsonb("response"),
  
  // Performance
  duration: integer("duration"), // milliseconds
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  
  // Legal Context
  legalContext: jsonb("legal_context").$type<{
    caseId?: string;
    evidenceId?: string;
    jurisdiction?: string;
    caseType?: string;
  }>().default({}),
  
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// === PERFORMANCE MONITORING ===

export const legalSystemMetrics = pgTable("legal_system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  metricType: varchar("metric_type", { length: 50 }).notNull(), // search_performance, processing_time, cache_hit_rate
  
  // Metric Values
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // ms, percentage, count
  
  // Context
  context: jsonb("context").default(sql`'{}'::jsonb`),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  
  // Aggregation Support
  timeWindow: varchar("time_window", { length: 20 }).default("1min"), // 1min, 5min, 1hour, 1day
  aggregationType: varchar("aggregation_type", { length: 20 }).default("avg"), // avg, sum, count, max, min
  
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
});

// === TYPE EXPORTS ===

export type EnhancedEvidence = typeof enhancedEvidence.$inferSelect;
export type NewEnhancedEvidence = typeof enhancedEvidence.$inferInsert;

export type LegalRAGSession = typeof legalRAGSessions.$inferSelect;
export type NewLegalRAGSession = typeof legalRAGSessions.$inferInsert;

export type LegalRerankingMetrics = typeof legalRerankingMetrics.$inferSelect;
export type NewLegalRerankingMetrics = typeof legalRerankingMetrics.$inferInsert;

export type QdrantVectorMetadata = typeof qdrantVectorMetadata.$inferSelect;
export type NewQdrantVectorMetadata = typeof qdrantVectorMetadata.$inferInsert;

export type LegalProcessingQueue = typeof legalProcessingQueue.$inferSelect;
export type NewLegalProcessingQueue = typeof legalProcessingQueue.$inferInsert;

export type VectorSimilarityCache = typeof vectorSimilarityCache.$inferSelect;
export type NewVectorSimilarityCache = typeof vectorSimilarityCache.$inferInsert;

export type Context7MCPLog = typeof context7MCPLogs.$inferSelect;
export type NewContext7MCPLog = typeof context7MCPLogs.$inferInsert;

export type LegalSystemMetric = typeof legalSystemMetrics.$inferSelect;
export type NewLegalSystemMetric = typeof legalSystemMetrics.$inferInsert;

// === RELATIONS ===

export const enhancedEvidenceRelations = relations(enhancedEvidence, ({ one, many }) => ({
  qdrantMetadata: one(qdrantVectorMetadata, {
    fields: [enhancedEvidence.qdrantId],
    references: [qdrantVectorMetadata.qdrantId],
  }),
  processingQueue: many(legalProcessingQueue),
  ragSessions: many(legalRAGSessions),
}));

export const legalRAGSessionsRelations = relations(legalRAGSessions, ({ one, many }) => ({
  evidence: one(enhancedEvidence, {
    fields: [legalRAGSessions.caseId],
    references: [enhancedEvidence.caseId],
  }),
  rerankingMetrics: many(legalRerankingMetrics),
}));

export const qdrantVectorMetadataRelations = relations(qdrantVectorMetadata, ({ one }) => ({
  evidence: one(enhancedEvidence, {
    fields: [qdrantVectorMetadata.evidenceId],
    references: [enhancedEvidence.id],
  }),
}));

export const legalProcessingQueueRelations = relations(legalProcessingQueue, ({ one }) => ({
  evidence: one(enhancedEvidence, {
    fields: [legalProcessingQueue.evidenceId],
    references: [enhancedEvidence.id],
  }),
}));

// === INDEXES FOR PERFORMANCE ===

// Note: These would be created via Drizzle migrations
// CREATE INDEX CONCURRENTLY idx_enhanced_evidence_case_type ON enhanced_evidence(case_type);
// CREATE INDEX CONCURRENTLY idx_enhanced_evidence_jurisdiction ON enhanced_evidence(jurisdiction);
// CREATE INDEX CONCURRENTLY idx_enhanced_evidence_risk_score ON enhanced_evidence(risk_score);
// CREATE INDEX CONCURRENTLY idx_enhanced_evidence_embedding_cosine ON enhanced_evidence USING ivfflat (embedding vector_cosine_ops);
// CREATE INDEX CONCURRENTLY idx_qdrant_metadata_collection ON qdrant_vector_metadata(collection_name);
// CREATE INDEX CONCURRENTLY idx_processing_queue_stage ON legal_processing_queue(stage);
// CREATE INDEX CONCURRENTLY idx_similarity_cache_hash ON vector_similarity_cache(query_hash);
// CREATE INDEX CONCURRENTLY idx_system_metrics_type_time ON legal_system_metrics(metric_type, timestamp);