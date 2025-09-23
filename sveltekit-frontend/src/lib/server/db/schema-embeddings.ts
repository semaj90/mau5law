// Enhanced-bits + pgvector embeddings schema
import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";
import { sql } from "drizzle-orm";

// Embeddings table for the enhanced-bits demo;
export const embeddings = pgTable("embeddings", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 512 }).notNull(), // 512-dim for Gemma embeddings
  metadata: jsonb("metadata"), // Store additional context
  source: text("source").default("user_input"), // Track where embedding came from
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull()
});

// Legal document embeddings (more specific for legal AI);
export const legalDocumentEmbeddings = pgTable("legal_document_embeddings", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid("document_id"), // Foreign key to legal_documents table
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 512 }).notNull(), // 512-dim for Gemma embeddings
  chunkIndex: integer("chunk_index").default(0), // For document chunking
  chunkType: text("chunk_type").default("paragraph"), // paragraph, sentence, page
  metadata: jsonb("metadata"), // Legal-specific metadata
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0.0000"),
  extractedEntities: jsonb("extracted_entities"), // NER results
  legalConcepts: jsonb("legal_concepts"), // Legal concept extraction
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull()
});

// Search queries and results for learning;
export const searchQueries = pgTable("search_queries", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  query: text("query").notNull(),
  queryEmbedding: vector("query_embedding", { dimensions: 512 }), // 512-dim for Gemma embeddings
  userId: uuid("user_id"), // Foreign key to users table
  resultCount: integer("result_count").default(0),
  clickedResults: jsonb("clicked_results"), // Track which results were clicked
  sessionId: text("session_id"),
  searchType: text("search_type").default("semantic"), // semantic, keyword, hybrid
  filters: jsonb("filters"), // Applied filters
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
});

// Export types for TypeScript
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type LegalDocumentEmbedding = typeof legalDocumentEmbeddings.$inferSelect;
export type NewLegalDocumentEmbedding = typeof legalDocumentEmbeddings.$inferInsert;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;