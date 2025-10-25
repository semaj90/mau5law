/**
 * Enhanced Database Schema with Advanced pgvector Integration
 * Optimized for LangChain-Ollama workflows with nomic-embed-text
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  json,
  uuid,
  varchar,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
// Replace complex customType-based pgvector declaration with a simple placeholder.
// This avoids the TypeScript ') expected' / parse errors while preserving column
// names and signatures. Store vectors as text/JSON for now; swap to a proper
// pgvector customType when Drizzle typings are aligned in your environment.
const vector = (name: string, _opts?: { dimensions?: number }) /*: ReturnType<typeof text> */ => {
  // store vector as JSON/text placeholder; drivers can cast/transform on insert/select
  // cast to any to avoid tight typing issues with a temporary placeholder column
  return text(name) as any;
};
// Core tables (existing)
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const cases = pgTable('cases', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  caseNumber: varchar('case_number', { length: 100 }).unique(),
  createdBy: uuid('created_by').references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
// Enhanced Documents table with embeddinggemma (384 dimensions - memory efficient)
export const documents = pgTable(
  'documents',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: uuid('case_id').references(() => cases.id),
    title: varchar('title', { length: 255 }).notNull(),
    filename: varchar('filename', { length: 255 }),
    fileType: varchar('file_type', { length: 50 }),
    fileSize: integer('file_size'),
    content: text('content'),
    extractedText: text('extracted_text'),
    // Using 384 dimensions for embeddinggemma (memory efficient)
    embedding: vector('embedding', { dimensions: 384 }),
    metadata: json('metadata'),
    tags: json('tags').default(sql`'[]'::json`),
    isIndexed: boolean('is_indexed').default(false),
    source: varchar('source', { length: 100 }).default('upload'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // simplified indexes to avoid driver-specific/index-operator DSL in schema files
    embeddingIdx: index('documents_embedding_idx').on(table.embedding),
    caseIdx: index('documents_case_idx').on(table.caseId),
    contentIdx: index('documents_content_idx').on(table.content),
  })
);
// Document chunks for optimized retrieval
export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    documentId: uuid('document_id')
      .references(() => documents.id)
      .notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    // 768-dimensional embeddings for nomic-embed-text
    embedding: vector('embedding', { dimensions: 384 }).notNull(),
    startIndex: integer('start_index'),
    endIndex: integer('end_index'),
    tokenCount: integer('token_count'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    embeddingIdx: index('document_chunks_embedding_idx').on(table.embedding),
    documentIdx: index('document_chunks_document_idx').on(table.documentId),
    chunkIdx: index('document_chunks_chunk_idx').on(table.documentId, table.chunkIndex),
  })
);
// Enhanced evidence table
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: uuid('case_id').references(() => cases.id),
    documentId: uuid('document_id').references(() => documents.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    evidenceType: varchar('evidence_type', { length: 50 }),
    hash: varchar('hash', { length: 256 }),
    chainOfCustody: json('chain_of_custody').default(sql`'[]'::json`),
    isAdmissible: boolean('is_admissible'),
    admissibilityNotes: text('admissibility_notes'),
    tags: json('tags').default(sql`'[]'::json`),
    // Enhanced AI analysis with embedding support
    aiAnalysis: json('ai_analysis'),
    // Vector embedding for semantic search
    embedding: vector('embedding', { dimensions: 384 }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    embeddingIdx: index('evidence_embedding_idx').on(table.embedding),
    caseIdx: index('evidence_case_idx').on(table.caseId),
  })
);
// Enhanced search index with optimized vector operations
export const searchIndex = pgTable(
  'search_index',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    content: text('content').notNull(),
    // 768-dimensional embeddings for nomic-embed-text
    embedding: vector('embedding', { dimensions: 384 }).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    embeddingIdx: index('search_index_embedding_idx').on(table.embedding),
    entityIdx: index('search_index_entity_idx').on(table.entityType, table.entityId),
    contentIdx: index('search_index_content_idx').on(table.content),
  })
);
// AI chat interactions with conversation context
export const aiInteractions = pgTable(
  'ai_interactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id),
    caseId: uuid('case_id').references(() => cases.id),
    sessionId: varchar('session_id', { length: 255 }),
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),
    model: varchar('model', { length: 100 }),
    tokensUsed: integer('tokens_used'),
    responseTime: integer('response_time'),
    confidence: real('confidence'),
    // Context embedding for conversation understanding
    contextEmbedding: vector('context_embedding', { dimensions: 384 }),
    feedback: json('feedback'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    contextEmbeddingIdx: index('ai_interactions_context_embedding_idx').on(table.contextEmbedding),
    sessionIdx: index('ai_interactions_session_idx').on(table.sessionId),
    userIdx: index('ai_interactions_user_idx').on(table.userId),
  })
);
// Vector similarity cache for performance optimization
export const vectorSimilarityCache = pgTable(
  'vector_similarity_cache',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    queryHash: varchar('query_hash', { length: 64 }).notNull().unique(),
    queryEmbedding: vector('query_embedding', { dimensions: 384 }).notNull(),
    results: json('results').notNull(),
    hitCount: integer('hit_count').default(1),
    lastAccessed: timestamp('last_accessed').defaultNow(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    queryHashIdx: index('vector_similarity_cache_hash_idx').on(table.queryHash),
    expiresIdx: index('vector_similarity_cache_expires_idx').on(table.expiresAt),
  })
);
// Legal knowledge base with semantic embeddings
export const legalKnowledgeBase = pgTable(
  'legal_knowledge_base',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 100 }),
    subcategory: varchar('subcategory', { length: 100 }),
    jurisdiction: varchar('jurisdiction', { length: 100 }),
    source: varchar('source', { length: 255 }),
    sourceUrl: text('source_url'),
    citationFormat: text('citation_format'),
    // Semantic embedding for knowledge retrieval
    embedding: vector('embedding', { dimensions: 384 }),
    metadata: json('metadata'),
    isVerified: boolean('is_verified').default(false),
    verifiedBy: uuid('verified_by').references(() => users.id),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    embeddingIdx: index('legal_knowledge_base_embedding_idx').on(table.embedding),
    categoryIdx: index('legal_knowledge_base_category_idx').on(table.category, table.subcategory),
    jurisdictionIdx: index('legal_knowledge_base_jurisdiction_idx').on(table.jurisdiction),
  })
);
// Embedding processing jobs for background processing
export const embeddingJobs = pgTable(
  'embedding_jobs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    jobType: varchar('job_type', { length: 50 }).notNull(), // 'embedding', 'reembedding', 'similarity_update'
    status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
    progress: integer('progress').default(0), // 0-100
    model: varchar('model', { length: 100 }),
    batchSize: integer('batch_size'),
    priority: integer('priority').default(5), // 1-10, higher is more priority
    retryCount: integer('retry_count').default(0),
    maxRetries: integer('max_retries').default(3),
    error: text('error'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    statusIdx: index('embedding_jobs_status_idx').on(table.status),
    entityIdx: index('embedding_jobs_entity_idx').on(table.entityType, table.entityId),
    priorityIdx: index('embedding_jobs_priority_idx').on(table.priority, table.createdAt),
  })
);

// --- START: Added missing tables + corrected ordering ---
// Persons of Interest (POI) table
export const personsOfInterest = pgTable(
  'persons_of_interest',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    aliases: json('aliases').default(sql`'[]'::json`),
    description: text('description'),
    metadata: json('metadata'),
    tags: json('tags').default(sql`'[]'::json`),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    nameIdx: index('persons_of_interest_name_idx').on(table.name),
    activeIdx: index('persons_of_interest_active_idx').on(table.isActive),
  })
);

// Case-POI relationship table
export const casePoiRelations = pgTable(
  'case_poi_relations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: uuid('case_id').references(() => cases.id).notNull(),
    poiId: uuid('poi_id').references(() => personsOfInterest.id).notNull(),
    role: varchar('role', { length: 100 }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    casePoiIdx: index('case_poi_relations_case_poi_idx').on(table.caseId, table.poiId),
  })
);

// Evidence boards (canvas containers)
export const evidenceBoards = pgTable(
  'evidence_boards',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    caseId: uuid('case_id').references(() => cases.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    metadata: json('metadata'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    caseIdx: index('evidence_boards_case_idx').on(table.caseId),
    activeIdx: index('evidence_boards_active_idx').on(table.isActive),
  })
);

// Evidence Board items (for canvas elements)
export const evidenceBoardItems = pgTable(
  'evidence_board_items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    boardId: uuid('board_id')
      .references(() => evidenceBoards.id)
      .notNull(),
    evidenceId: uuid('evidence_id').references(() => evidence.id),
    poiId: uuid('poi_id').references(() => personsOfInterest.id),
    itemType: varchar('item_type', { length: 50 }).notNull(), // evidence, poi, note, connection, image
    position: json('position'), // x, y coordinates
    size: json('size'), // width, height
    content: text('content'), // text content for notes
    metadata: json('metadata'), // additional item-specific data
    isVisible: boolean('is_visible').default(true),
    zIndex: integer('z_index').default(0),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    boardIdx: index('evidence_board_items_board_idx').on(table.boardId),
    evidenceIdx: index('evidence_board_items_evidence_idx').on(table.evidenceId),
    poiIdx: index('evidence_board_items_poi_idx').on(table.poiId),
    typeIdx: index('evidence_board_items_type_idx').on(table.itemType),
  })
);

// Evidence Board connections (for linking items)
export const evidenceBoardConnections = pgTable(
  'evidence_board_connections',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    boardId: uuid('board_id')
      .references(() => evidenceBoards.id)
      .notNull(),
    fromItemId: uuid('from_item_id')
      .references(() => evidenceBoardItems.id)
      .notNull(),
    toItemId: uuid('to_item_id')
      .references(() => evidenceBoardItems.id)
      .notNull(),
    connectionType: varchar('connection_type', { length: 50 }).default('related'), // related, contradicts, supports, timeline
    label: varchar('label', { length: 255 }),
    notes: text('notes'),
    strength: real('strength').default(1.0), // 0-1 strength of connection
    isVisible: boolean('is_visible').default(true),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    boardIdx: index('evidence_board_connections_board_idx').on(table.boardId),
    fromItemIdx: index('evidence_board_connections_from_item_idx').on(table.fromItemId),
    toItemIdx: index('evidence_board_connections_to_item_idx').on(table.toItemId),
    typeIdx: index('evidence_board_connections_type_idx').on(table.connectionType),
  })
);

// --- Relations: single consolidated block placed after all table declarations ---
type RelationsContext = {
  one: <TTable = unknown>(table: TTable, opts?: { fields?: unknown[]; references?: unknown[] }) => unknown;
  many: <TTable = unknown>(table: TTable) => unknown;
};

export const documentsRelations = relations(documents, ({ one, many }: RelationsContext) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  creator: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  chunks: many(documentChunks),
  evidence: many(evidence),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }: RelationsContext) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const evidenceRelations = relations(evidence, ({ one }: RelationsContext) => ({
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id],
  }),
  document: one(documents, {
    fields: [evidence.documentId],
    references: [documents.id],
  }),
  creator: one(users, {
    fields: [evidence.createdBy],
    references: [users.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }: RelationsContext) => ({
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [cases.assignedTo],
    references: [users.id],
  }),
  documents: many(documents),
  evidence: many(evidence),
  aiInteractions: many(aiInteractions),
}));

export const aiInteractionsRelations = relations(aiInteractions, ({ one }: RelationsContext) => ({
  user: one(users, {
    fields: [aiInteractions.userId],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [aiInteractions.caseId],
    references: [cases.id],
  }),
}));

export const legalKnowledgeBaseRelations = relations(legalKnowledgeBase, ({ one }: RelationsContext) => ({
  verifier: one(users, {
    fields: [legalKnowledgeBase.verifiedBy],
    references: [users.id],
  }),
}));

export const personsOfInterestRelations = relations(personsOfInterest, ({ one, many }: RelationsContext) => ({
  creator: one(users, {
    fields: [personsOfInterest.createdBy],
    references: [users.id],
  }),
  caseRelations: many(casePoiRelations),
  evidenceBoardItems: many(evidenceBoardItems),
}));

export const casePoiRelationsRelations = relations(casePoiRelations, ({ one }: RelationsContext) => ({
  case: one(cases, {
    fields: [casePoiRelations.caseId],
    references: [cases.id],
  }),
  poi: one(personsOfInterest, {
    fields: [casePoiRelations.poiId],
    references: [personsOfInterest.id],
  }),
  creator: one(users, {
    fields: [casePoiRelations.createdBy],
    references: [users.id],
  }),
}));

export const evidenceBoardsRelations = relations(evidenceBoards, ({ one, many }: RelationsContext) => ({
  case: one(cases, {
    fields: [evidenceBoards.caseId],
    references: [cases.id],
  }),
  creator: one(users, {
    fields: [evidenceBoards.createdBy],
    references: [users.id],
  }),
  items: many(evidenceBoardItems),
  connections: many(evidenceBoardConnections),
}));

export const evidenceBoardItemsRelations = relations(evidenceBoardItems, ({ one }: RelationsContext) => ({
  board: one(evidenceBoards, {
    fields: [evidenceBoardItems.boardId],
    references: [evidenceBoards.id],
  }),
  evidence: one(evidence, {
    fields: [evidenceBoardItems.evidenceId],
    references: [evidence.id],
  }),
  poi: one(personsOfInterest, {
    fields: [evidenceBoardItems.poiId],
    references: [personsOfInterest.id],
  }),
  creator: one(users, {
    fields: [evidenceBoardItems.createdBy],
    references: [users.id],
  }),
}));

export const evidenceBoardConnectionsRelations = relations(evidenceBoardConnections, ({ one }: RelationsContext) => ({
  board: one(evidenceBoards, {
    fields: [evidenceBoardConnections.boardId],
    references: [evidenceBoards.id],
  }),
  fromItem: one(evidenceBoardItems, {
    fields: [evidenceBoardConnections.fromItemId],
    references: [evidenceBoardItems.id],
  }),
  toItem: one(evidenceBoardItems, {
    fields: [evidenceBoardConnections.toItemId],
    references: [evidenceBoardItems.id],
  }),
  creator: one(users, {
    fields: [evidenceBoardConnections.createdBy],
    references: [users.id],
  }),
}));

// CONSOLIDATED type exports (single block; placed after all table & relations declarations)
// Note: AIProcessingJob / NewAIProcessingJob were removed because `aiProcessingJobs` is not defined here.
// If you add an aiProcessingJobs table later, re-introduce those types.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;

export type SearchIndex = typeof searchIndex.$inferSelect;
export type NewSearchIndex = typeof searchIndex.$inferInsert;

export type AIInteraction = typeof aiInteractions.$inferSelect;
export type NewAIInteraction = typeof aiInteractions.$inferInsert;

export type VectorSimilarityCache = typeof vectorSimilarityCache.$inferSelect;
export type NewVectorSimilarityCache = typeof vectorSimilarityCache.$inferInsert;

export type LegalKnowledgeBase = typeof legalKnowledgeBase.$inferSelect;
export type NewLegalKnowledgeBase = typeof legalKnowledgeBase.$inferInsert;

export type EmbeddingJob = typeof embeddingJobs.$inferSelect;
export type NewEmbeddingJob = typeof embeddingJobs.$inferInsert;

export type PersonOfInterest = typeof personsOfInterest.$inferSelect;
export type NewPersonOfInterest = typeof personsOfInterest.$inferInsert;

export type CasePoiRelation = typeof casePoiRelations.$inferSelect;
export type NewCasePoiRelation = typeof casePoiRelations.$inferInsert;

export type EvidenceBoard = typeof evidenceBoards.$inferSelect;
export type NewEvidenceBoard = typeof evidenceBoards.$inferInsert;

export type EvidenceBoardItem = typeof evidenceBoardItems.$inferSelect;
export type NewEvidenceBoardItem = typeof evidenceBoardItems.$inferInsert;

export type EvidenceBoardConnection = typeof evidenceBoardConnections.$inferSelect;
export type NewEvidenceBoardConnection = typeof evidenceBoardConnections.$inferInsert;

// CONSOLIDATED type exports (single block; placed after all table declarations)
// Note: AIProcessingJob / NewAIProcessingJob were removed because `aiProcessingJobs` is not defined here.
// If you add an aiProcessingJobs table later, re-introduce those types.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;

export type SearchIndex = typeof searchIndex.$inferSelect;
export type NewSearchIndex = typeof searchIndex.$inferInsert;

export type AIInteraction = typeof aiInteractions.$inferSelect;
export type NewAIInteraction = typeof aiInteractions.$inferInsert;

export type VectorSimilarityCache = typeof vectorSimilarityCache.$inferSelect;
export type NewVectorSimilarityCache = typeof vectorSimilarityCache.$inferInsert;

export type LegalKnowledgeBase = typeof legalKnowledgeBase.$inferSelect;
export type NewLegalKnowledgeBase = typeof legalKnowledgeBase.$inferInsert;

export type EmbeddingJob = typeof embeddingJobs.$inferSelect;
export type NewEmbeddingJob = typeof embeddingJobs.$inferInsert;

export type PersonOfInterest = typeof personsOfInterest.$inferSelect;
export type NewPersonOfInterest = typeof personsOfInterest.$inferInsert;

export type CasePoiRelation = typeof casePoiRelations.$inferSelect;
export type NewCasePoiRelation = typeof casePoiRelations.$inferInsert;

export type EvidenceBoard = typeof evidenceBoards.$inferSelect;
export type NewEvidenceBoard = typeof evidenceBoards.$inferInsert;

export type EvidenceBoardItem = typeof evidenceBoardItems.$inferSelect;
export type NewEvidenceBoardItem = typeof evidenceBoardItems.$inferInsert;

export type EvidenceBoardConnection = typeof evidenceBoardConnections.$inferSelect;
export type NewEvidenceBoardConnection = typeof evidenceBoardConnections.$inferInsert;
export type NewEvidenceBoardConnection = typeof evidenceBoardConnections.$inferInsert;
