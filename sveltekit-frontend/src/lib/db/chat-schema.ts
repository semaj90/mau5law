// Database schema for chat functionality with pgvector support
import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, decimal } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey(),
  model: text('model').notNull().default('gemma3-legal'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull()
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey(),
  sessionId: uuid('session_id').references(() => chatSessions.id).notNull(),
  content: text('content').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  embedding: text('embedding'), // JSON string of embedding vector for pgvector
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  model: text('model'),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Legal documents stored in MinIO with metadata in PostgreSQL
export const legalDocuments = pgTable('legal_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id'),
  documentType: text('document_type').notNull(),
  title: text('title').notNull(),
  fileName: text('file_name'),
  minioPath: text('minio_path'), // Path in MinIO bucket
  content: text('content'), // Full text content for search
  summary: text('summary'), // AI-generated summary
  embedding: text('embedding'), // JSON string of embedding vector
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Neo4j relationship tracking (metadata only - actual relationships in Neo4j)
export const documentRelationships = pgTable('document_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromDocumentId: uuid('from_document_id').references(() => legalDocuments.id).notNull(),
  toDocumentId: uuid('to_document_id').references(() => legalDocuments.id).notNull(),
  relationshipType: text('relationship_type').notNull(), // 'references', 'contradicts', 'supports', etc.
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  neo4jId: text('neo4j_id'), // Reference to Neo4j relationship ID
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Enhanced RAG queries and results
export const ragQueries = pgTable('rag_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => chatSessions.id),
  query: text('query').notNull(),
  queryEmbedding: text('query_embedding'), // JSON string of query embedding
  results: jsonb('results'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type NewLegalDocument = typeof legalDocuments.$inferInsert;
export type DocumentRelationship = typeof documentRelationships.$inferSelect;
export type RAGQuery = typeof ragQueries.$inferSelect;