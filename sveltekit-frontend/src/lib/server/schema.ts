// src/lib/server/schema.ts - Database schema definitions
import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  integer, 
  decimal, 
  jsonb, 
  vector,
  boolean,
  index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Evidence processing sessions
export const evidenceProcessTable = pgTable('evidence_process', {
  id: uuid('id').primaryKey(),
  evidence_id: text('evidence_id').notNull(),
  requested_by: text('requested_by').notNull(),
  steps: jsonb('steps').notNull(), // JSON array of processing steps
  status: text('status').notNull(), // 'queued', 'processing', 'completed', 'failed', 'cancelled'
  created_at: timestamp('created_at').notNull().defaultNow(),
  started_at: timestamp('started_at'),
  finished_at: timestamp('finished_at'),
  updated_at: timestamp('updated_at').defaultNow(),
  error: text('error')
}, (table: any) => ({
  evidenceIdIdx: index('evidence_process_evidence_id_idx').on(table.evidence_id),
  statusIdx: index('evidence_process_status_idx').on(table.status),
  requestedByIdx: index('evidence_process_requested_by_idx').on(table.requested_by),
  createdAtIdx: index('evidence_process_created_at_idx').on(table.created_at)
}));

// OCR results
export const evidenceOcrTable = pgTable('evidence_ocr', {
  id: uuid('id').primaryKey(),
  evidence_id: text('evidence_id').notNull(),
  text: text('text').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  metadata: jsonb('metadata'), // OCR method, page count, etc.
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table: any) => ({
  evidenceIdIdx: index('evidence_ocr_evidence_id_idx').on(table.evidence_id),
  createdAtIdx: index('evidence_ocr_created_at_idx').on(table.created_at)
}));

// Embedding metadata (actual vectors stored in pgvector table)
export const evidenceEmbeddingsTable = pgTable('evidence_embeddings', {
  id: uuid('id').primaryKey(),
  evidence_id: text('evidence_id').notNull(),
  model: text('model').notNull(),
  dim: integer('dim').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table: any) => ({
  evidenceIdIdx: index('evidence_embeddings_evidence_id_idx').on(table.evidence_id),
  modelIdx: index('evidence_embeddings_model_idx').on(table.model)
}));

// pgvector table for similarity search
export const evidenceVectorsTable = pgTable('evidence_vectors', {
  id: uuid('id').primaryKey(),
  evidence_id: text('evidence_id').notNull(),
  model: text('model').notNull(),
  dimensions: integer('dimensions').notNull(),
  // pgvector type - always present after ingest-service processes
  vector: vector('vector', { dimensions: 1536 }).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  evidenceIdModelIdx: index('evidence_vectors_evidence_id_model_idx').on(table.evidence_id, table.model),
  // IVFFlat index with L2 distance operator class for fast similarity search
  vectorIdx: index('evidence_vectors_vector_idx')
    .using('ivfflat', table.vector.op('vector_l2_ops'))
    .with({ lists: 100 })
}));

// RAG analysis results
export const evidenceAnalysisTable = pgTable('evidence_analysis', {
  id: uuid('id').primaryKey(),
  evidence_id: text('evidence_id').notNull(),
  summary: text('summary').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  snippets: jsonb('snippets'), // Key points array
  relevant_docs: jsonb('relevant_docs'), // Related evidence references
  entities: jsonb('entities'), // Extracted entities
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table: any) => ({
  evidenceIdIdx: index('evidence_analysis_evidence_id_idx').on(table.evidence_id),
  createdAtIdx: index('evidence_analysis_created_at_idx').on(table.created_at)
}));

// Base evidence table (if not already exists)
export const evidenceTable = pgTable('evidence', {
  id: uuid('id').primaryKey(),
  case_id: text('case_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  file_path: text('file_path'),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  hash: text('hash'),
  uploaded_by: text('uploaded_by').notNull(),
  uploaded_at: timestamp('uploaded_at').notNull().defaultNow(),
  chain_of_custody: jsonb('chain_of_custody'),
  metadata: jsonb('metadata'),
  // Always present tags array for auto-tagging worker
  tags: jsonb('tags').default(sql`'[]'::jsonb`).notNull(),
  is_active: boolean('is_active').default(true)
}, (table: any) => ({
  caseIdIdx: index('evidence_case_id_idx').on(table.case_id),
  uploadedByIdx: index('evidence_uploaded_by_idx').on(table.uploaded_by),
  hashIdx: index('evidence_hash_idx').on(table.hash),
  uploadedAtIdx: index('evidence_uploaded_at_idx').on(table.uploaded_at),
  tagsIdx: index('evidence_tags_idx').using('gin', table.tags)
}));

// Cases table (if not already exists)
export const casesTable = pgTable('cases', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  case_number: text('case_number').notNull(),
  status: text('status').notNull().default('active'),
  created_by: text('created_by').notNull(),
  assigned_to: text('assigned_to'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  closed_at: timestamp('closed_at'),
  metadata: jsonb('metadata')
}, (table: any) => ({
  caseNumberIdx: index('cases_case_number_idx').on(table.case_number),
  statusIdx: index('cases_status_idx').on(table.status),
  createdByIdx: index('cases_created_by_idx').on(table.created_by),
  assignedToIdx: index('cases_assigned_to_idx').on(table.assigned_to)
}));

// Reports table for detective/legal reports
export const reportsTable = pgTable('reports', {
  id: uuid('id').primaryKey(),
  case_id: text('case_id').notNull(),
  evidence_id: text('evidence_id'), // Optional - report can be linked to specific evidence
  title: text('title').notNull().default('Untitled Report'),
  doc: jsonb('doc').default({}).notNull(), // Rich text editor content
  // Always present summary for auto-summarization worker
  summary: text('summary').default('').notNull(),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata').default({}).notNull()
}, (table: any) => ({
  caseIdIdx: index('reports_case_id_idx').on(table.case_id),
  evidenceIdIdx: index('reports_evidence_id_idx').on(table.evidence_id),
  createdByIdx: index('reports_created_by_idx').on(table.created_by),
  createdAtIdx: index('reports_created_at_idx').on(table.created_at)
}));

// System health and monitoring
export const systemHealthTable = pgTable('system_health', {
  id: uuid('id').primaryKey(),
  service: text('service').notNull(), // 'worker', 'rabbitmq', 'qdrant', etc.
  status: text('status').notNull(), // 'healthy', 'degraded', 'down'
  metrics: jsonb('metrics'), // Performance metrics
  last_check: timestamp('last_check').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table: any) => ({
  serviceIdx: index('system_health_service_idx').on(table.service),
  lastCheckIdx: index('system_health_last_check_idx').on(table.last_check)
}));

// Queue monitoring
export const queueStatsTable = pgTable('queue_stats', {
  id: uuid('id').primaryKey(),
  queue_name: text('queue_name').notNull(),
  messages_pending: integer('messages_pending').default(0),
  messages_processing: integer('messages_processing').default(0),
  messages_completed: integer('messages_completed').default(0),
  messages_failed: integer('messages_failed').default(0),
  last_updated: timestamp('last_updated').notNull().defaultNow()
}, (table: any) => ({
  queueNameIdx: index('queue_stats_queue_name_idx').on(table.queue_name),
  lastUpdatedIdx: index('queue_stats_last_updated_idx').on(table.last_updated)
}));

// Chat embeddings for AI assistant semantic search
export const chatEmbeddings = pgTable('chat_embeddings', {
  id: uuid('id').primaryKey(),
  messageId: text('message_id').notNull().unique(),
  sessionId: text('session_id').notNull(),
  content: text('content').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  embedding: vector('embedding', { dimensions: 768 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata'), // Additional metadata from the chat message
  legalDomain: text('legal_domain') // Legal context category
}, (table: any) => ({
  messageIdIdx: index('chat_embeddings_message_id_idx').on(table.messageId),
  sessionIdIdx: index('chat_embeddings_session_id_idx').on(table.sessionId),
  timestampIdx: index('chat_embeddings_timestamp_idx').on(table.timestamp),
  legalDomainIdx: index('chat_embeddings_legal_domain_idx').on(table.legalDomain),
  // Vector similarity search index (HNSW) will be created manually in migration
  embeddingIdx: index('chat_embeddings_embedding_idx').on(table.embedding)
}));

// Export all table types
export type EvidenceProcess = typeof evidenceProcessTable.$inferSelect;
export type NewEvidenceProcess = typeof evidenceProcessTable.$inferInsert;

export type EvidenceOcr = typeof evidenceOcrTable.$inferSelect;
export type NewEvidenceOcr = typeof evidenceOcrTable.$inferInsert;

export type EvidenceEmbedding = typeof evidenceEmbeddingsTable.$inferSelect;
export type NewEvidenceEmbedding = typeof evidenceEmbeddingsTable.$inferInsert;

export type EvidenceVector = typeof evidenceVectorsTable.$inferSelect;
export type NewEvidenceVector = typeof evidenceVectorsTable.$inferInsert;

export type EvidenceAnalysis = typeof evidenceAnalysisTable.$inferSelect;
export type NewEvidenceAnalysis = typeof evidenceAnalysisTable.$inferInsert;

export type Evidence = typeof evidenceTable.$inferSelect;
export type NewEvidence = typeof evidenceTable.$inferInsert;

export type Case = typeof casesTable.$inferSelect;
export type NewCase = typeof casesTable.$inferInsert;

export type Report = typeof reportsTable.$inferSelect;
export type NewReport = typeof reportsTable.$inferInsert;

export type SystemHealth = typeof systemHealthTable.$inferSelect;
export type NewSystemHealth = typeof systemHealthTable.$inferInsert;

export type QueueStats = typeof queueStatsTable.$inferSelect;
export type NewQueueStats = typeof queueStatsTable.$inferInsert;

export type ChatEmbedding = typeof chatEmbeddings.$inferSelect;
export type NewChatEmbedding = typeof chatEmbeddings.$inferInsert;

// Aliases for compatibility with API routes
export const legalDocuments = evidenceTable;
export const contentEmbeddings = evidenceEmbeddingsTable;
;