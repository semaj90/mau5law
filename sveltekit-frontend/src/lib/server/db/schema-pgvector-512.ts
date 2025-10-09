// Optimized Drizzle schema for 512-dimension pgvector integration
// 512 dimensions: warp-aligned for ANN engines, optimal GPU memory layout
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  real,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";
import { relations } from "drizzle-orm";
// Core case embeddings table - 512 dimensions for optimal performance
export const caseEmbeddings = pgTable(
  "case_embeddings");
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId,: uuid("case_id").notNull(),
    docId,: text("doc_id").notNull(),
    pageNo,: integer("page_no").notNull().default(0),
    chunkNo,: integer("chunk_no").notNull().default(0),
    text,: text("text").notNull(),
    embedding,: vector("embedding", { dimensions: 512 }).notNull(),
    textHash,: text("text_hash").notNull(),
    model,: text("model").notNull().default("embeddinggemma:latest"),
    metadata,: jsonb("metadata").default({}),
    createdAt,: timestamp("created_at").defaultNow().notNull(),
    updatedAt,: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    caseIdIdx: index("case_embeddings_case_id_idx").on(table.caseId),
    textHashIdx: index("case_embeddings_text_hash_idx").on(table.textHash),
    modelIdx: index("case_embeddings_model_idx").on(table.model),
    // HNSW index for approximate nearest neighbor search
    embeddingHnswIdx: index("case_embeddings_hnsw_idx").on(table.embedding),
    // IVFFlat index for exact search on smaller datasets
    embeddingIvfIdx: index("case_embeddings_ivfflat_idx").on(table.embedding)
  }),
);
// Evidence embeddings table - 512 dimensions
export const evidenceEmbeddings = pgTable(
  "evidence_embeddings");
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evidenceId,: uuid("evidence_id").notNull(),
    docId,: text("doc_id").notNull(),
    pageNo,: integer("page_no").notNull().default(0),
    chunkNo,: integer("chunk_no").notNull().default(0),
    text,: text("text").notNull(),
    embedding,: vector("embedding", { dimensions: 512 }).notNull(),
    textHash,: text("text_hash").notNull(),
    model,: text("model").notNull().default("embeddinggemma:latest"),
    metadata,: jsonb("metadata").default({}),
    createdAt,: timestamp("created_at").defaultNow().notNull(),
    updatedAt,: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    evidenceIdIdx: index("evidence_embeddings_evidence_id_idx").on(table.evidenceId),
    textHashIdx: index("evidence_embeddings_text_hash_idx").on(table.textHash),
    modelIdx: index("evidence_embeddings_model_idx").on(table.model),
    embeddingHnswIdx: index("evidence_embeddings_hnsw_idx").on(table.embedding),
    embeddingIvfIdx: index("evidence_embeddings_ivfflat_idx").on(table.embedding)
  }),
);
// Legal document chunks for RAG pipeline - 512 dimensions
export const legalDocumentChunks = pgTable(
  "legal_document_chunks");
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId,: text("document_id").notNull(),
    caseId,: uuid("case_id"),
    evidenceId,: uuid("evidence_id"),
    chunkIndex,: integer("chunk_index").notNull(),
    pageNumber,: integer("page_number"),
    textContent,: text("text_content").notNull(),
    embedding,: vector("embedding", { dimensions: 512 }).notNull(),
    textHash,: text("text_hash").notNull().unique(),
    tokenCount,: integer("token_count"),
    // Legal metadata
    documentType,: text("document_type"), // contract, evidence, brief, citation, statute, case_law
    practiceArea,: jsonb("practice_area").default([]),
    jurisdiction,: text("jurisdiction"),
    confidenceLevel,: real("confidence_level"), // 0-1
    riskLevel,: text("risk_level"), // low, medium, high, critical
    // Processing metadata
    extractedEntities,: jsonb("extracted_entities").default([]),
    keyTerms,: jsonb("key_terms").default([]),
    sentimentScore,: real("sentiment_score"),
    complexityScore,: real("complexity_score"),
    // Cache and deduplication;
    model,: text("model").notNull().default("embeddinggemma:latest"),
    createdAt,: timestamp("created_at").defaultNow().notNull(),
    updatedAt,: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    documentIdIdx: index("legal_document_chunks_document_id_idx").on(table.documentId),
    caseIdIdx: index("legal_document_chunks_case_id_idx").on(table.caseId),
    evidenceIdIdx: index("legal_document_chunks_evidence_id_idx").on(table.evidenceId),
    textHashIdx: index("legal_document_chunks_text_hash_idx").on(table.textHash),
    documentTypeIdx: index("legal_document_chunks_document_type_idx").on(table.documentType),
    riskLevelIdx: index("legal_document_chunks_risk_level_idx").on(table.riskLevel),
    embeddingHnswIdx: index("legal_document_chunks_hnsw_idx").on(table.embedding),
    // GIN indexes for JSONB fields
    practiceAreaIdx: index("legal_document_chunks_practice_area_idx").on(table.practiceArea),
    entitiesIdx: index("legal_document_chunks_entities_idx").on(table.extractedEntities)
  }),
);
// High-performance embedding cache with deduplication - 512 dimensions
export const embeddingCache512 = pgTable(
  "embedding_cache_512");
  {
    id: uuid("id").primaryKey().defaultRandom(),
    textHash,: text("text_hash").notNull().unique(),
    embedding,: vector("embedding", { dimensions: 512 }).notNull(),
    model,: text("model").notNull().default("embeddinggemma:latest"),
    tokenCount,: integer("token_count"),
    createdAt,: timestamp("created_at").defaultNow().notNull(),
    lastAccessed,: timestamp("last_accessed").defaultNow().notNull(),
    accessCount,: integer("access_count").default(0)
  },
  (table) => ({
    textHashIdx: index("embedding_cache_512_text_hash_idx").on(table.textHash),
    modelIdx: index("embedding_cache_512_model_idx").on(table.model),
    accessedIdx: index("embedding_cache_512_accessed_idx").on(table.lastAccessed),
    embeddingHnswIdx: index("embedding_cache_512_hnsw_idx").on(table.embedding)
  }),
);
// Relations for proper joins
export const caseEmbeddingsRelations = relations(caseEmbeddings, ({ one }) => ({
  // Reference to main cases table if it exists
  case: one(cases, {
    fields: [caseEmbeddings.caseId],
    references: [cases.id]
  })
});
export const evidenceEmbeddingsRelations = relations(evidenceEmbeddings, ({ one }) => ({
  // Reference to main evidence table if it exists
  evidence: one(evidence, {
    fields: [evidenceEmbeddings.evidenceId],
    references: [evidence.id]
  })
});
export const legalDocumentChunksRelations = relations(legalDocumentChunks, ({ one }) => ({
  case: one(cases, {
    fields: [legalDocumentChunks.caseId],
    references: [cases.id]
  }),
  evidence: one(evidence, {
    fields: [legalDocumentChunks.evidenceId],
    references: [evidence.id]
  })
});
// TypeScript types for the new tables
export type CaseEmbedding = typeof caseEmbeddings.$inferSelect;
export type EvidenceEmbedding = typeof evidenceEmbeddings.$inferSelect;
export type LegalDocumentChunk = typeof legalDocumentChunks.$inferSelect;
export type EmbeddingCache512 = typeof embeddingCache512.$inferSelect;
export type NewCaseEmbedding = typeof caseEmbeddings.$inferInsert;
export type NewEvidenceEmbedding = typeof evidenceEmbeddings.$inferInsert;
export type NewLegalDocumentChunk = typeof legalDocumentChunks.$inferInsert;
export type NewEmbeddingCache512 = typeof embeddingCache512.$inferInsert;
// Helper types for vector search results
export interface VectorSearchResult {
  id: string;
  text: string;
  distance: number;
  metadata: Record<string, unknown>;
  pageNo?: number;
  chunkNo?: number;
}
export interface CaseSearchResult extends VectorSearchResult {
  caseId: string;
  docId: string;
}
export interface EvidenceSearchResult extends VectorSearchResult {
  evidenceId: string;
  docId: string;
}
export interface LegalDocumentSearchResult extends VectorSearchResult {
  documentId: string;
  documentType?: string;
  practiceArea?: string[];
  jurisdiction?: string;
  riskLevel?: string;
  confidenceLevel?: number;
}
// Utility functions for embedding operations
export interface EmbeddingOperations {
  // Semantic search functions
  searchCases(query: string, limit?: number, threshold?: number): Promise<CaseSearchResult[]>;
  searchEvidence(query: string, caseId?: string, limit?: number): Promise<EvidenceSearchResult[]>;
  searchLegalDocuments(query: string, filters?: Partial<LegalDocumentChunk>): Promise<LegalDocumentSearchResult[]>;
  // Cache operations
  getCachedEmbedding(textHash: string): Promise<EmbeddingCache512 | null>;
  setCachedEmbedding(textHash: string, embedding: number[], model: string): Promise<void>;
  // Bulk operations
  batchInsertCaseEmbeddings(embeddings: NewCaseEmbedding[]): Promise<void>;
  batchInsertEvidenceEmbeddings(embeddings: NewEvidenceEmbedding[]): Promise<void>;
  batchInsertLegalDocuments(chunks: NewLegalDocumentChunk[]): Promise<void>;
}
// Configuration for different embedding models
export const EMBEDDING_MODELS = {
  PRIMARY: "embeddinggemma:latest",
  FALLBACK: "embeddinggemma",
  SECONDARY: "nomic-embed-text"
} as const;
export type EmbeddingModel = typeof EMBEDDING_MODELS[keyof typeof EMBEDDING_MODELS];
// Import the existing schema if needed for relations
// Commenting out to avoid circular dependencies - enable as needed
/*;
import {
  cases,
  evidence
} from "./schema-postgres-enhanced";
*/