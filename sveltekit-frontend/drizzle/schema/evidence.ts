/**
 * Evidence System Schema
 * Drizzle ORM schema for evidence files, chunks, and embeddings
 * Integrates with MinIO storage and RAG pipeline
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-vector";
import { relations } from "drizzle-orm";

// ============================================================================
// Evidence Files Table
// ============================================================================

export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    fileType: varchar("file_type", { length: 50 }).notNull(), // pdf, png, jpg, tiff, docx
    minioPath: varchar("minio_path", { length: 500 }).notNull(), // lawpdfs/cases/<caseId>/<filename>
    uploadedBy: uuid("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    processingStatus: varchar("processing_status", { length: 50 }).default("pending").notNull(), // pending, processing, completed, failed
    processingError: text("processing_error"),
    processingStartedAt: timestamp("processing_started_at"),
    processingCompletedAt: timestamp("processing_completed_at"),
    chunkCount: integer("chunk_count").default(0),
    metadata: jsonb("metadata").default({}), // Custom metadata, OCR confidence, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    caseIdIdx: index("idx_evidence_files_case_id").on(table.caseId),
    statusIdx: index("idx_evidence_files_status").on(table.processingStatus),
    uploadedByIdx: index("idx_evidence_files_uploaded_by").on(table.uploadedBy),
    caseStatusIdx: index("idx_evidence_files_case_status").on(
      table.caseId,
      table.processingStatus
    ),
    createdAtIdx: index("idx_evidence_files_created_at").on(table.createdAt),
  })
);

// ============================================================================
// Evidence Chunks Table
// ============================================================================

export const evidenceChunks = pgTable(
  "evidence_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidenceFiles.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    sectionTitle: varchar("section_title", { length: 255 }),
    metadata: jsonb("metadata").default({}), // chunk_type, legal_concepts, entities, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    evidenceIdIdx: index("idx_evidence_chunks_evidence_id").on(table.evidenceId),
    pageNumberIdx: index("idx_evidence_chunks_page_number").on(table.pageNumber),
    evidencePageIdx: index("idx_evidence_chunks_evidence_page").on(
      table.evidenceId,
      table.pageNumber
    ),
    fulltextIdx: index("idx_evidence_chunks_fulltext").on(table.content),
  })
);

// ============================================================================
// Evidence Embeddings Table
// ============================================================================

export const evidenceEmbeddings = pgTable(
  "evidence_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => evidenceChunks.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }).notNull(), // LegalBERT 768-dim
    embeddingModel: varchar("embedding_model", { length: 100 }).default(
      "legal-bert"
    ),
    metadata: jsonb("metadata").default({}), // source_info, generation_time, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chunkIdIdx: index("idx_evidence_embeddings_chunk_id").on(table.chunkId),
    embeddingHnswIdx: index("idx_evidence_embeddings_embedding_hnsw").on(
      table.embedding
    ),
  })
);

// ============================================================================
// Evidence Relations
// ============================================================================

export const evidenceFilesRelations = relations(evidenceFiles, ({ many }) => ({
  chunks: many(evidenceChunks),
}));

export const evidenceChunksRelations = relations(
  evidenceChunks,
  ({ one, many }) => ({
    evidence: one(evidenceFiles, {
      fields: [evidenceChunks.evidenceId],
      references: [evidenceFiles.id],
    }),
    embeddings: many(evidenceEmbeddings),
  })
);

export const evidenceEmbeddingsRelations = relations(
  evidenceEmbeddings,
  ({ one }) => ({
    chunk: one(evidenceChunks, {
      fields: [evidenceEmbeddings.chunkId],
      references: [evidenceChunks.id],
    }),
  })
);

// ============================================================================
// Citation Tags Table
// ============================================================================

export const citationTags = pgTable(
  "citation_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    jurisdiction: varchar("jurisdiction", { length: 50 }).notNull(), // CA, NY, TX, Fed-US, Other
    description: text("description"),
    usageCount: integer("usage_count").default(0).notNull(), // Incremented when summary saved
    baseWeight: integer("base_weight").default(1).notNull(), // Base weight for tag
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    jurisdictionIdx: index("idx_citation_tags_jurisdiction").on(table.jurisdiction),
    nameJurisdictionIdx: index("idx_citation_tags_name_jurisdiction").on(
      table.name,
      table.jurisdiction
    ),
  })
);

// ============================================================================
// Evidence Tags M2M Table
// ============================================================================

export const evidenceTags = pgTable(
  "evidence_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidenceFiles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => citationTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    evidenceIdIdx: index("idx_evidence_tags_evidence_id").on(table.evidenceId),
    tagIdIdx: index("idx_evidence_tags_tag_id").on(table.tagId),
    evidenceTagIdx: index("idx_evidence_tags_evidence_tag").on(
      table.evidenceId,
      table.tagId
    ),
  })
);

// ============================================================================
// RAG Index Metadata Table
// ============================================================================

export const ragIndexMetadata = pgTable(
  "rag_index_metadata",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => evidenceChunks.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidenceFiles.id, { onDelete: "cascade" }),
    tags: text("tags").array().default([]), // Array of tag names for weighting
    tagWeight: integer("tag_weight").default(1).notNull(), // 1.0 = no boost, 1.5 = 50% boost
    jurisdiction: varchar("jurisdiction", { length: 50 }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    chunkIdIdx: index("idx_rag_index_metadata_chunk_id").on(table.chunkId),
    evidenceIdIdx: index("idx_rag_index_metadata_evidence_id").on(table.evidenceId),
    jurisdictionIdx: index("idx_rag_index_metadata_jurisdiction").on(
      table.jurisdiction
    ),
    tagsIdx: index("idx_rag_index_metadata_tags").on(table.tags),
  })
);

// ============================================================================
// Audit Log Table (Immutable)
// ============================================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    resourceType: varchar("resource_type", { length: 100 }).notNull(), // Evidence, Tag, Embedding, etc.
    resourceId: uuid("resource_id").notNull(),
    operation: varchar("operation", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE
    oldValues: jsonb("old_values"), // For UPDATE/DELETE
    newValues: jsonb("new_values"), // For CREATE/UPDATE
    timestamp: timestamp("timestamp").defaultNow().notNull(), // Immutable
  },
  (table) => ({
    resourceTypeIdx: index("idx_audit_log_resource_type").on(table.resourceType),
    resourceIdIdx: index("idx_audit_log_resource_id").on(table.resourceId),
    userIdIdx: index("idx_audit_log_user_id").on(table.userId),
    timestampIdx: index("idx_audit_log_timestamp").on(table.timestamp),
    resourceTypeIdIdx: index("idx_audit_log_resource_type_id").on(
      table.resourceType,
      table.resourceId
    ),
  })
);

// ============================================================================
// Relations
// ============================================================================

export const citationTagsRelations = relations(citationTags, ({ many }) => ({
  evidenceTags: many(evidenceTags),
}));

export const evidenceTagsRelations = relations(
  evidenceTags,
  ({ one }) => ({
    evidence: one(evidenceFiles, {
      fields: [evidenceTags.evidenceId],
      references: [evidenceFiles.id],
    }),
    tag: one(citationTags, {
      fields: [evidenceTags.tagId],
      references: [citationTags.id],
    }),
  })
);

export const ragIndexMetadataRelations = relations(
  ragIndexMetadata,
  ({ one }) => ({
    chunk: one(evidenceChunks, {
      fields: [ragIndexMetadata.chunkId],
      references: [evidenceChunks.id],
    }),
    evidence: one(evidenceFiles, {
      fields: [ragIndexMetadata.evidenceId],
      references: [evidenceFiles.id],
    }),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type EvidenceFile = typeof evidenceFiles.$inferSelect;
export type EvidenceFileInsert = typeof evidenceFiles.$inferInsert;

export type EvidenceChunk = typeof evidenceChunks.$inferSelect;
export type EvidenceChunkInsert = typeof evidenceChunks.$inferInsert;

export type EvidenceEmbedding = typeof evidenceEmbeddings.$inferSelect;
export type EvidenceEmbeddingInsert = typeof evidenceEmbeddings.$inferInsert;

export type CitationTag = typeof citationTags.$inferSelect;
export type CitationTagInsert = typeof citationTags.$inferInsert;

export type EvidenceTag = typeof evidenceTags.$inferSelect;
export type EvidenceTagInsert = typeof evidenceTags.$inferInsert;

export type RAGIndexMetadata = typeof ragIndexMetadata.$inferSelect;
export type RAGIndexMetadataInsert = typeof ragIndexMetadata.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;
