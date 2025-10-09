
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
  customType,
  type PgColumn
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
// Custom vector type for pgvector
const vector = customType({
  dataType(config) {
    return `vector(${(config as any)?.dimensions ?? 1536})`;
  },
  toDriver(_value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(_value: string): number[] {
    return value.slice(1, -1).split(',').map(Number);
  }
});
// Core tables (existing)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  caseNumber: varchar('case_number', { length: 100 }).unique(),
  createdBy: uuid('created_by').references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
// Enhanced Documents table with embeddinggemma (384 dimensions - memory efficient)
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  // Optimized indexes for vector operations
  embeddingIdx: index('documents_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  caseIdx: index('documents_case_idx').on(table.caseId),
  contentIdx: index('documents_content_idx').using('gin', sql`to_tsvector('english', ${table.content})`)
});
// Document chunks for optimized retrieval
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').references(() => documents.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  // 768-dimensional embeddings for nomic-embed-text
  embedding: vector('embedding', { dimensions: 384 }).notNull(),
  startIndex: integer('start_index'),
  endIndex: integer('end_index'),
  tokenCount: integer('token_count'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table: any) => ({
  // Optimized vector search index
  embeddingIdx: index('document_chunks_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  documentIdx: index('document_chunks_document_idx').on(table.documentId),
  chunkIdx: index('document_chunks_chunk_idx').on(table.documentId, table.chunkIndex)
});
// Enhanced evidence table
export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({,
  embeddingIdx: index('evidence_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  caseIdx: index('evidence_case_idx').on(table.caseId)
});
// Enhanced search index with optimized vector operations
export const searchIndex = pgTable('search_index', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  content: text('content').notNull(),
  // 768-dimensional embeddings for nomic-embed-text
  embedding: vector('embedding', { dimensions: 384 }).notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  // High-performance vector index for similarity search
  embeddingIdx: index('search_index_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  entityIdx: index('search_index_entity_idx').on(table.entityType, table.entityId),
  contentIdx: index('search_index_content_idx').using('gin', sql`to_tsvector('english', ${table.content})`)
});
// AI chat interactions with conversation context
export const aiInteractions = pgTable('ai_interactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: timestamp('created_at').defaultNow()
}, (table: any) => ({,
  contextEmbeddingIdx: index('ai_interactions_context_embedding_idx').using('ivfflat', table.contextEmbedding.op('vector_cosine_ops')),
  sessionIdx: index('ai_interactions_session_idx').on(table.sessionId),
  userIdx: index('ai_interactions_user_idx').on(table.userId)
});
// Vector similarity cache for performance optimization
export const vectorSimilarityCache = pgTable('vector_similarity_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  queryHash: varchar('query_hash', { length: 64 }).notNull().unique(),
  queryEmbedding: vector('query_embedding', { dimensions: 384 }).notNull(),
  results: json('results').notNull(),
  hitCount: integer('hit_count').default(1),
  lastAccessed: timestamp('last_accessed').defaultNow(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table: any) => ({,
  queryHashIdx: index('vector_similarity_cache_hash_idx').on(table.queryHash),
  expiresIdx: index('vector_similarity_cache_expires_idx').on(table.expiresAt)
});
// Legal knowledge base with semantic embeddings
export const legalKnowledgeBase = pgTable('legal_knowledge_base', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({,
  embeddingIdx: index('legal_knowledge_base_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  categoryIdx: index('legal_knowledge_base_category_idx').on(table.category, table.subcategory),
  jurisdictionIdx: index('legal_knowledge_base_jurisdiction_idx').on(table.jurisdiction)
});
// Embedding processing jobs for background processing
export const embeddingJobs = pgTable('embedding_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({,
  statusIdx: index('embedding_jobs_status_idx').on(table.status),
  entityIdx: index('embedding_jobs_entity_idx').on(table.entityType, table.entityId),
  priorityIdx: index('embedding_jobs_priority_idx').on(table.priority, table.createdAt)
});
// Define relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id]
  }),
  creator: one(users, {
    fields: [documents.createdBy],
    references: [users.id]
  }),
  chunks: many(documentChunks),
  evidence: many(evidence)
});
export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id]
  })
});
export const evidenceRelations = relations(evidence, ({ one }) => ({
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id]
  }),
  document: one(documents, {
    fields: [evidence.documentId],
    references: [documents.id]
  }),
  creator: one(users, {
    fields: [evidence.createdBy],
    references: [users.id]
  })
});
export const casesRelations = relations(cases, ({ one, many }) => ({
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id]
  }),
  assignee: one(users, {
    fields: [cases.assignedTo],
    references: [users.id]
  }),
  documents: many(documents),
  evidence: many(evidence),
  aiInteractions: many(aiInteractions)
});
export const aiInteractionsRelations = relations(aiInteractions, ({ one }) => ({
  user: one(users, {
    fields: [aiInteractions.userId],
    references: [users.id]
  }),
  case: one(cases, {
    fields: [aiInteractions.caseId],
    references: [cases.id]
  })
});
export const legalKnowledgeBaseRelations = relations(legalKnowledgeBase, ({ one }) => ({
  verifier: one(users, {
    fields: [legalKnowledgeBase.verifiedBy],
    references: [users.id]
  })
});
// Type exports
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
// AI Processing Jobs table
export const aiProcessingJobs = pgTable('ai_processing_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  input: json('input'),
  output: json('output'),
  error: text('error'),
  progress: integer('progress').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at')
});
export type AIProcessingJob = typeof aiProcessingJobs.$inferSelect;
export type NewAIProcessingJob = typeof aiProcessingJobs.$inferInsert;

// Persons of Interest (POI) table
export const personsOfInterest = pgTable('persons_of_interest', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  aliases: json('aliases').default(sql`'[]'::json`),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 50 }).default('person_of_interest'), // person_of_interest, witness, suspect, victim, informant
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, critical
  threatLevel: varchar('threat_level', { length: 20 }).default('low'), // low, medium, high, extreme
  physicalDescription: json('physical_description'), // height, weight, hair, eyes, distinguishing marks
  profileData: json('profile_data'), // modus operandi, known habits, associates
  lastKnownLocation: text('last_known_location'),
  lastSeen: timestamp('last_seen'),
  dangerLevel: real('danger_level').default(0), // 0-10 scale
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  // Vector embedding for semantic search
  embedding: vector('embedding', { dimensions: 384 }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  embeddingIdx: index('poi_embedding_idx').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  statusIdx: index('poi_status_idx').on(table.status),
  priorityIdx: index('poi_priority_idx').on(table.priority),
  threatLevelIdx: index('poi_threat_level_idx').on(table.threatLevel)
}));

// Case-POI relationships
export const casePoiRelations = pgTable('case_poi_relations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  caseId: uuid('case_id').references(() => cases.id).notNull(),
  poiId: uuid('poi_id').references(() => personsOfInterest.id).notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // suspect, witness, victim, informant, other
  role: varchar('role', { length: 100 }), // specific role in the case
  involvementLevel: varchar('involvement_level', { length: 20 }).default('unknown'), // primary, secondary, peripheral
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  casePoiIdx: index('case_poi_relations_case_poi_idx').on(table.caseId, table.poiId),
  relationshipIdx: index('case_poi_relations_relationship_idx').on(table.relationshipType)
}));

// Evidence Board configurations
export const evidenceBoards = pgTable('evidence_boards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  caseId: uuid('case_id').references(() => cases.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  layout: json('layout'), // Canvas layout data
  settings: json('settings'), // Board-specific settings
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  caseIdx: index('evidence_boards_case_idx').on(table.caseId),
  activeIdx: index('evidence_boards_active_idx').on(table.isActive)
}));

// Evidence Board items (for canvas elements)
export const evidenceBoardItems = pgTable('evidence_board_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  boardId: uuid('board_id').references(() => evidenceBoards.id).notNull(),
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
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  boardIdx: index('evidence_board_items_board_idx').on(table.boardId),
  evidenceIdx: index('evidence_board_items_evidence_idx').on(table.evidenceId),
  poiIdx: index('evidence_board_items_poi_idx').on(table.poiId),
  typeIdx: index('evidence_board_items_type_idx').on(table.itemType)
}));

// Evidence Board connections (for linking items)
export const evidenceBoardConnections = pgTable('evidence_board_connections', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  boardId: uuid('board_id').references(() => evidenceBoards.id).notNull(),
  fromItemId: uuid('from_item_id').references(() => evidenceBoardItems.id).notNull(),
  toItemId: uuid('to_item_id').references(() => evidenceBoardItems.id).notNull(),
  connectionType: varchar('connection_type', { length: 50 }).default('related'), // related, contradicts, supports, timeline
  label: varchar('label', { length: 255 }),
  notes: text('notes'),
  strength: real('strength').default(1.0), // 0-1 strength of connection
  isVisible: boolean('is_visible').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table: any) => ({
  boardIdx: index('evidence_board_connections_board_idx').on(table.boardId),
  fromItemIdx: index('evidence_board_connections_from_item_idx').on(table.fromItemId),
  toItemIdx: index('evidence_board_connections_to_item_idx').on(table.toItemId),
  typeIdx: index('evidence_board_connections_type_idx').on(table.connectionType)
}));

// Define relations for new tables
export const personsOfInterestRelations = relations(personsOfInterest, ({ one, many }) => ({
  creator: one(users, {
    fields: [personsOfInterest.createdBy],
    references: [users.id]
  }),
  caseRelations: many(casePoiRelations),
  evidenceBoardItems: many(evidenceBoardItems)
}));

export const casePoiRelationsRelations = relations(casePoiRelations, ({ one }) => ({
  case: one(cases, {
    fields: [casePoiRelations.caseId],
    references: [cases.id]
  }),
  poi: one(personsOfInterest, {
    fields: [casePoiRelations.poiId],
    references: [personsOfInterest.id]
  }),
  creator: one(users, {
    fields: [casePoiRelations.createdBy],
    references: [users.id]
  })
}));

export const evidenceBoardsRelations = relations(evidenceBoards, ({ one, many }) => ({
  case: one(cases, {
    fields: [evidenceBoards.caseId],
    references: [cases.id]
  }),
  creator: one(users, {
    fields: [evidenceBoards.createdBy],
    references: [users.id]
  }),
  items: many(evidenceBoardItems),
  connections: many(evidenceBoardConnections)
}));

export const evidenceBoardItemsRelations = relations(evidenceBoardItems, ({ one }) => ({
  board: one(evidenceBoards, {
    fields: [evidenceBoardItems.boardId],
    references: [evidenceBoards.id]
  }),
  evidence: one(evidence, {
    fields: [evidenceBoardItems.evidenceId],
    references: [evidence.id]
  }),
  poi: one(personsOfInterest, {
    fields: [evidenceBoardItems.poiId],
    references: [personsOfInterest.id]
  }),
  creator: one(users, {
    fields: [evidenceBoardItems.createdBy],
    references: [users.id]
  })
}));

export const evidenceBoardConnectionsRelations = relations(evidenceBoardConnections, ({ one }) => ({
  board: one(evidenceBoards, {
    fields: [evidenceBoardConnections.boardId],
    references: [evidenceBoards.id]
  }),
  fromItem: one(evidenceBoardItems, {
    fields: [evidenceBoardConnections.fromItemId],
    references: [evidenceBoardItems.id]
  }),
  toItem: one(evidenceBoardItems, {
    fields: [evidenceBoardConnections.toItemId],
    references: [evidenceBoardItems.id]
  }),
  creator: one(users, {
    fields: [evidenceBoardConnections.createdBy],
    references: [users.id]
  })
}));

// Type exports for new tables
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