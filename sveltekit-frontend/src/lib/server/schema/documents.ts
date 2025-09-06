/**
 * Documents Schema with pgvector for Legal AI Platform
 * Supports vector embeddings for semantic search and RAG
 */

import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm-pgvector';
import { relations } from 'drizzle-orm';

// Main documents table with vector embeddings
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  
  // Vector embeddings for semantic search (384 dimensions for nomic-embed-text)
  embedding: vector('embedding', { dims: 384 }),
  title_embedding: vector('title_embedding', { dims: 384 }),
  summary_embedding: vector('summary_embedding', { dims: 384 }),
  
  // Legal AI specific fields
  document_type: varchar('document_type', { length: 100 }).notNull().default('general'),
  confidence_level: integer('confidence_level').default(0), // 0-100 scale
  risk_level: varchar('risk_level', { length: 20 }).default('low'), // low, medium, high, critical
  priority: integer('priority').default(100), // 0-255 scale
  
  // AI analysis results
  ai_summary: text('ai_summary'),
  ai_analysis: jsonb('ai_analysis'), // Store complex analysis results
  ai_tags: jsonb('ai_tags').$type<string[]>(), // Array of extracted tags
  key_entities: jsonb('key_entities'), // Named entities extracted
  
  // Metadata and tracking
  source_url: varchar('source_url', { length: 1000 }),
  file_path: varchar('file_path', { length: 1000 }),
  file_type: varchar('file_type', { length: 100 }),
  file_size: integer('file_size'),
  checksum: varchar('checksum', { length: 64 }),
  
  // Legal context
  case_id: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  jurisdiction: varchar('jurisdiction', { length: 200 }),
  practice_area: varchar('practice_area', { length: 200 }),
  
  // Processing status
  processing_status: varchar('processing_status', { length: 50 }).default('pending'),
  embedding_model: varchar('embedding_model', { length: 100 }).default('nomic-embed-text'),
  processed_at: timestamp('processed_at', { withTimezone: true }),
  
  // Audit fields
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Flags
  is_active: boolean('is_active').default(true).notNull(),
  is_public: boolean('is_public').default(false).notNull(),
  is_indexed: boolean('is_indexed').default(false).notNull(),
});

// Document chunks for large documents (enhanced RAG)
export const document_chunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  document_id: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  
  chunk_index: integer('chunk_index').notNull(), // Order within document
  chunk_text: text('chunk_text').notNull(),
  chunk_size: integer('chunk_size').notNull(),
  
  // Vector embedding for the chunk
  embedding: vector('embedding', { dims: 384 }).notNull(),
  
  // Chunk metadata
  start_position: integer('start_position'),
  end_position: integer('end_position'),
  page_number: integer('page_number'),
  section_title: varchar('section_title', { length: 500 }),
  
  // AI analysis for chunk
  importance_score: integer('importance_score').default(0), // 0-100
  chunk_summary: text('chunk_summary'),
  key_points: jsonb('key_points').$type<string[]>(),
  
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Cases table (legal case management)
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_number: varchar('case_number', { length: 100 }).unique(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  
  // Vector embedding for case similarity
  case_embedding: vector('case_embedding', { dims: 384 }),
  
  // Case details
  status: varchar('status', { length: 50 }).default('active'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  case_type: varchar('case_type', { length: 100 }),
  jurisdiction: varchar('jurisdiction', { length: 200 }),
  
  // Dates
  filed_date: timestamp('filed_date', { withTimezone: true }),
  closed_date: timestamp('closed_date', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Ownership
  created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  assigned_to: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
});

// Users table (for reference)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  
  // User preferences embedding for personalization
  profile_embedding: vector('profile_embedding', { dims: 384 }),
  
  role: varchar('role', { length: 50 }).default('user'),
  is_active: boolean('is_active').default(true).notNull(),
  
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Vector storage table for unified search across entities
export const vectors = pgTable('vectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity_type: varchar('entity_type', { length: 50 }).notNull(), // 'document', 'chunk', 'case', 'user'
  entity_id: uuid('entity_id').notNull(),
  vector_type: varchar('vector_type', { length: 50 }).notNull(), // 'content', 'title', 'summary'
  
  embedding: vector('embedding', { dims: 384 }).notNull(),
  
  // Metadata for vector
  model_name: varchar('model_name', { length: 100 }).default('nomic-embed-text'),
  model_version: varchar('model_version', { length: 50 }),
  
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations for joins
export const documentsRelations = relations(documents, ({ one, many }) => ({
  case: one(cases, {
    fields: [documents.case_id],
    references: [cases.id],
  }),
  creator: one(users, {
    fields: [documents.created_by],
    references: [users.id],
  }),
  chunks: many(document_chunks),
}));

export const documentChunksRelations = relations(document_chunks, ({ one }) => ({
  document: one(documents, {
    fields: [document_chunks.document_id],
    references: [documents.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  creator: one(users, {
    fields: [cases.created_by],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [cases.assigned_to],
    references: [users.id],
  }),
  documents: many(documents),
}));

export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  documents: many(documents),
}));

// Type exports for use in application
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof document_chunks.$inferSelect;
export type NewDocumentChunk = typeof document_chunks.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vector = typeof vectors.$inferSelect;
export type NewVector = typeof vectors.$inferInsert;