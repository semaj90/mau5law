import { pgTable, serial, varchar, text, integer, timestamp, jsonb, vector, boolean, real } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Cases table for organizing documents
export const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Documents table with file information
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  caseId: integer('case_id').references(() => cases.id).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  minioPath: varchar('minio_path', { length: 500 }).notNull(),
  extractedText: text('extracted_text'),
  processingStatus: varchar('processing_status', { length: 50 }).notNull().default('pending'),
  processingError: text('processing_error'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Document chunks for RAG retrieval
export const documentChunks = pgTable('document_chunks', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  documentId: integer('document_id').references(() => documents.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  wordCount: integer('word_count').notNull(),
  embedding: vector('embedding', { dimensions: 384 }), // nomic-embed-text dimensions
  metadata: jsonb('metadata'), // Contains entities, concepts, etc.
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Processing jobs for Redis job queue tracking
export const processingJobs = pgTable('processing_jobs', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  documentId: integer('document_id').references(() => documents.id),
  jobType: varchar('job_type', { length: 50 }).notNull(), // 'ingest', 'reprocess', etc.
  status: varchar('status', { length: 50 }).notNull().default('queued'),
  currentStep: varchar('current_step', { length: 50 }),
  progress: integer('progress').notNull().default(0),
  result: jsonb('result'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Entity extraction results
export const extractedEntities = pgTable('extracted_entities', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id).notNull(),
  chunkId: integer('chunk_id').references(() => documentChunks.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // PERSON, ORG, DATE, etc.
  entityValue: text('entity_value').notNull(),
  confidence: real('confidence').notNull(),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  context: text('context'), // Surrounding text
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// RAG queries for analytics and improvement
export const ragQueries = pgTable('rag_queries', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  caseId: integer('case_id').references(() => cases.id),
  query: text('query').notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 384 }),
  response: text('response'),
  model: varchar('model', { length: 50 }).notNull(),
  tokensUsed: integer('tokens_used'),
  processingTimeMs: integer('processing_time_ms'),
  similarityThreshold: real('similarity_threshold').notNull().default(0.7),
  resultsCount: integer('results_count'),
  userFeedback: jsonb('user_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// RAG query results for source tracking
export const ragQueryResults = pgTable('rag_query_results', {
  id: serial('id').primaryKey(),
  queryId: integer('query_id').references(() => ragQueries.id).notNull(),
  chunkId: integer('chunk_id').references(() => documentChunks.id).notNull(),
  similarityScore: real('similarity_score').notNull(),
  rank: integer('rank').notNull(), // 1, 2, 3... order in results
  used: boolean('used').notNull().default(true), // Was this chunk actually used in response?
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Zod schemas for validation - Fixed compatibility issues
export const insertCaseSchema = createInsertSchema(cases) as any;

export const selectCaseSchema = createSelectSchema(cases) as any;

export const insertDocumentSchema = createInsertSchema(documents) as any;

export const selectDocumentSchema = createSelectSchema(documents) as any;

export const insertDocumentChunkSchema = createInsertSchema(documentChunks) as any;

export const selectDocumentChunkSchema = createSelectSchema(documentChunks) as any;

export const insertProcessingJobSchema = createInsertSchema(processingJobs) as any;

export const selectProcessingJobSchema = createSelectSchema(processingJobs) as any;

export const insertRAGQuerySchema = createInsertSchema(ragQueries) as any;

export const selectRAGQuerySchema = createSelectSchema(ragQueries) as any;

// Types for TypeScript
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;

export type ExtractedEntity = typeof extractedEntities.$inferSelect;
export type NewExtractedEntity = typeof extractedEntities.$inferInsert;

export type RAGQuery = typeof ragQueries.$inferSelect;
export type NewRAGQuery = typeof ragQueries.$inferInsert;

export type RAGQueryResult = typeof ragQueryResults.$inferSelect;
export type NewRAGQueryResult = typeof ragQueryResults.$inferInsert;

// Helper functions for common operations
export const getDocumentsByCase = (db: any, caseId: number) => {
  return db.select().from(documents).where(eq(documents.caseId, caseId));
};

export const getDocumentChunksWithSimilarity = (
  db: any,
  queryEmbedding: number[],
  threshold = 0.7,
  limit = 10
) => {
  // This would be a raw SQL query using pgvector's cosine similarity
  return db.execute(`
    SELECT dc.*, d.filename, d.original_name,
           1 - (dc.embedding <=> $1::vector) as similarity_score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 1 - (dc.embedding <=> $1::vector) > $2
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3
  `, [JSON.stringify(queryEmbedding), threshold, limit]);
};