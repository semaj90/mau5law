/**
 * Legal AI Database Schema with Drizzle ORM
 * Optimized for pgvector embeddings and gemma3-legal:latest integration
 * Production-ready schema for SvelteKit 2 + TensorRT-LLM stack
 */
import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  uuid,
  boolean,
  jsonb,
  numeric,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { vector } from 'pgvector/drizzle-orm';
import { relations } from 'drizzle-orm';
import { createSelectSchema, createUpdateSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Base Users table
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    username: text('username').unique().notNull(),
    password_hash: text('password_hash').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: text('role').default('user'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    emailIndex: index('users_email_idx').on(table.email),
    usernameIndex: index('users_username_idx').on(table.username),
  })
);

// Cases table
export const cases = pgTable(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('active'),
    caseNumber: text('case_number').unique(),
    jurisdiction: text('jurisdiction'),
    practiceArea: text('practice_area'),
    priority: text('priority').default('medium'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    metadata: jsonb('metadata').default('{}'),
  },
  table => ({
    userIdIndex: index('cases_user_id_idx').on(table.user_id),
    statusIndex: index('cases_status_idx').on(table.status),
    caseNumberIndex: index('cases_case_number_idx').on(table.caseNumber),
  })
);

// Documents table
export const documents = pgTable(
  'documents',
  {
    id: text('id')
      .primaryKey()
      .default('doc_' + new Date().getTime()),
    user_id: integer('user_id')
      .references(() => users.id)
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    content_text: text('content_text'),
    file_path: text('file_path'),
    file_type: text('file_type'),
    file_size: integer('file_size'),
    embedding: vector('embedding', { dimensions: 384 }), // nomic-embed-text
    tags: text('tags').array(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    metadata: jsonb('metadata').default('{}'),
  },
  table => ({
    userIdIndex: index('documents_user_id_idx').on(table.user_id),
    fileTypeIndex: index('documents_file_type_idx').on(table.file_type),
    embeddingIndex: index('documents_embedding_idx').using('ivfflat', table.embedding).with({ lists: 100 }),
  })
);

// Evidence table
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    case_id: uuid('case_id')
      .references(() => cases.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: integer('user_id')
      .references(() => users.id)
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    evidenceType: text('evidence_type'),
    source: text('source'),
    dateCollected: timestamp('date_collected'),
    relevanceScore: numeric('relevance_score', { precision: 3, scale: 2 }),
    confidentialityLevel: text('confidentiality_level').default('standard'),
    fileUrl: text('file_url'),
    embedding: vector('embedding', { dimensions: 384 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    metadata: jsonb('metadata').default('{}'),
  },
  table => ({
    caseIdIndex: index('evidence_case_id_idx').on(table.case_id),
    userIdIndex: index('evidence_user_id_idx').on(table.user_id),
    evidenceTypeIndex: index('evidence_type_idx').on(table.evidenceType),
    embeddingIndex: index('evidence_embedding_idx').using('ivfflat', table.embedding).with({ lists: 100 }),
  })
);

// Legal Documents with vector embeddings from gemma3-legal:latest
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    documentType: text('document_type').notNull(), // 'contract', 'brief', 'evidence', 'correspondence'
    // Vector embeddings from gemma3-legal:latest (512 dimensions)
    embedding: vector('embedding', { dimensions: 512 }).notNull(),
    // Legal metadata
    practiceArea: text('practice_area'), // 'corporate', 'litigation', 'ip', 'employment'
    jurisdiction: text('jurisdiction'),
    caseId: text('case_id'),
    clientId: text('client_id'),
    // Document classification
    confidentialityLevel: text('confidentiality_level').default('standard'), // 'public', 'standard', 'confidential', 'privileged'
    documentStatus: text('document_status').default('active'), // 'draft', 'active', 'archived', 'deleted'
    // Performance and versioning
    processingTimeMs: real('processing_time_ms'),
    modelVersion: text('model_version').default('gemma3-legal:latest'),
    documentHash: text('document_hash'), // SHA-256 for duplicate detection
    // File metadata
    originalFilename: text('original_filename'),
    fileSize: real('file_size'),
    mimeType: text('mime_type'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at'),
  },
  table => ({
    // Indexes for performance
    embeddingIndex: index('embedding_idx').on(table.embedding),
    documentTypeIndex: index('document_type_idx').on(table.documentType),
    practiceAreaIndex: index('practice_area_idx').on(table.practiceArea),
    caseIdIndex: index('case_id_idx').on(table.caseId),
    clientIdIndex: index('client_id_idx').on(table.clientId),
    createdAtIndex: index('created_at_idx').on(table.createdAt),
    documentHashIndex: index('document_hash_idx').on(table.documentHash),
  })
);
// Vector similarity queries for analytics
export const vectorSimilarityQueries = pgTable(
  'vector_similarity_queries',
  {
    id: serial('id').primaryKey(),
    queryText: text('query_text').notNull(),
    queryEmbedding: vector('query_embedding', { dimensions: 512 }).notNull(),
    // Query metadata
    userId: text('user_id'),
    sessionId: text('session_id'),
    practiceAreaFilter: text('practice_area_filter'),
    documentTypeFilter: text('document_type_filter'),
    // Performance metrics
    responseTimeMs: real('response_time_ms').notNull(),
    resultsCount: real('results_count').notNull(),
    similarityThreshold: real('similarity_threshold').default(0.7),
    // Results data
    topResults: jsonb('top_results'),
    // Analytics
    queryIntent: text('query_intent'), // 'research', 'analysis', 'template', 'precedent'
    userSatisfaction: real('user_satisfaction'), // 1-5 rating;
    timestamp: timestamp('timestamp').defaultNow(),
  },
  table => ({
    userIdIndex: index('user_id_idx').on(table.userId),
    sessionIdIndex: index('session_id_idx').on(table.sessionId),
    timestampIndex: index('timestamp_idx').on(table.timestamp),
    queryIntentIndex: index('query_intent_idx').on(table.queryIntent),
  })
);
// Legal analysis results cache
export const legalAnalysisCache = pgTable(
  'legal_analysis_cache',
  {
    id: serial('id').primaryKey(),
    // Input hash for cache key
    inputHash: text('input_hash').notNull().unique(),
    // Input data
    promptText: text('prompt_text').notNull(),
    contextDocuments: jsonb('context_documents'),
    analysisType: text('analysis_type').notNull(), // 'comprehensive', 'risk', 'compliance', 'template'
    // Generated analysis
    analysisContent: text('analysis_content').notNull(),
    analysisEmbedding: vector('analysis_embedding', { dimensions: 512 }),
    // Metadata
    modelVersion: text('model_version').default('gemma3-legal:latest'),
    processingTimeMs: real('processing_time_ms'),
    tokenCount: real('token_count'),
    // Cache management
    accessCount: real('access_count').default(1),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    inputHashIndex: index('input_hash_idx').on(table.inputHash),
    analysisTypeIndex: index('analysis_type_idx').on(table.analysisType),
    lastAccessedIndex: index('last_accessed_idx').on(table.lastAccessedAt),
    expiresAtIndex: index('expires_at_idx').on(table.expiresAt),
  })
);
// Document chunks for RAG (chunked documents with embeddings)
export const document_chunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  document_id: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  evidence_id: uuid('evidence_id').references(() => evidence.id, { onDelete: 'cascade' }),
  chunk_index: integer('chunk_index').notNull(),
  chunk_text: text('chunk_text').notNull(),
  embedding: vector('embedding', { dimensions: 384 }).notNull(), // nomic-embed-text
  token_count: integer('token_count'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').default('{}'),
});
// Citations table (fixed schema with proper foreign keys)
export const citations = pgTable('citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  document_id: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  citation_text: text('citation_text').notNull(),
  citation_type: text('citation_type'),
  source: text('source'),
  page_number: integer('page_number'),
  relevance_score: numeric('relevance_score', { precision: 3, scale: 2 }),
  context: text('context'),
  verified: boolean('verified').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata').default('{}'),
});
// Sessions table for authentication
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
// AI History table for agent interactions
export const aiHistory = pgTable('ai_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  agent_type: text('agent_type').notNull(),
  interaction_type: text('interaction_type').notNull(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  model_used: text('model_used'),
  tokens_used: integer('tokens_used'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').default('{}'),
});
// Relations for better query experience
export const usersRelations = relations(users, ({ many }: any) => ({
  documents: many(documents),
  cases: many(cases),
  evidence: many(evidence),
  sessions: many(sessions),
  aiHistory: many(aiHistory),
}));
export const documentsRelations = relations(documents, ({ one, many }: any) => ({
  user: one(users, {
    fields: [documents.user_id],
    references: [users.id],
  }),
  chunks: many(document_chunks),
  citations: many(citations),
}));
export const casesRelations = relations(cases, ({ one, many }: any) => ({
  user: one(users, {
    fields: [cases.user_id],
    references: [users.id],
  }),
  evidence: many(evidence),
  citations: many(citations),
}));
export const evidenceRelations = relations(evidence, ({ one, many }: any) => ({
  case: one(cases, {
    fields: [evidence.case_id],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [evidence.user_id],
    references: [users.id],
  }),
  chunks: many(document_chunks),
}));
export const documentChunksRelations = relations(document_chunks, ({ one }: any) => ({
  document: one(documents, {
    fields: [document_chunks.document_id],
    references: [documents.id],
  }),
  evidence: one(evidence, {
    fields: [document_chunks.evidence_id],
    references: [evidence.id],
  }),
}));
export const citationsRelations = relations(citations, ({ one }: any) => ({
  case: one(cases, {
    fields: [citations.case_id],
    references: [cases.id],
  }),
  document: one(documents, {
    fields: [citations.document_id],
    references: [documents.id],
  }),
}));
export const sessionsRelations = relations(sessions, ({ one }: any) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));
export const aiHistoryRelations = relations(aiHistory, ({ one }: any) => ({
  user: one(users, {
    fields: [aiHistory.user_id],
    references: [users.id],
  }),
}));
// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
export type DocumentChunk = typeof document_chunks.$inferSelect;
export type NewDocumentChunk = typeof document_chunks.$inferInsert;
export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AiHistory = typeof aiHistory.$inferSelect;
export type NewAiHistory = typeof aiHistory.$inferInsert;
// Profile table for user profiles
export const profileTable = pgTable('profile', {
  id: uuid('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
});
// Profile relations
export const profileRelations = relations(profileTable, ({ one }: any) => ({
  user: one(users, {
    fields: [profileTable.id],
    references: [users.id],
  }),
}));
// Profile types
export type Profile = typeof profileTable.$inferSelect;
export type NewProfile = typeof profileTable.$inferInsert;
// Drizzle-zod schemas for SuperForms compatibility
export const profileTableSelectSchema = createSelectSchema(profileTable);
export const profileTableUpdateSchema = createUpdateSchema(profileTable);
export const profileTableInsertSchema = createInsertSchema(profileTable);
// Additional schemas for other tables (optional - add as needed)
export const usersSelectSchema = createSelectSchema(users);
export const usersUpdateSchema = createUpdateSchema(users);
export const usersInsertSchema = createInsertSchema(users);
export const casesSelectSchema = createSelectSchema(cases);
export const casesUpdateSchema = createUpdateSchema(cases);
export const casesInsertSchema = createInsertSchema(cases);
// Helper function to extract Zod schema from drizzle-zod BuildSchema for SuperForms compatibility
export function extractZodSchema<T extends any>(drizzleZodSchema: T) {
  return drizzleZodSchema;
}
// Pre-extracted schemas for common use with SuperForms
export const profileUpdateZodSchema = extractZodSchema(profileTableUpdateSchema);
export const profileInsertZodSchema = extractZodSchema(profileTableInsertSchema);
export const profileSelectZodSchema = extractZodSchema(profileTableSelectSchema);
export const usersUpdateZodSchema = extractZodSchema(usersUpdateSchema);
export const usersInsertZodSchema = extractZodSchema(usersInsertSchema);
export const usersSelectZodSchema = extractZodSchema(usersSelectSchema);
export const casesUpdateZodSchema = extractZodSchema(casesUpdateSchema);
export const casesInsertZodSchema = extractZodSchema(casesInsertSchema);
export const casesSelectZodSchema = extractZodSchema(casesSelectSchema);

// RAG Documents table for uploaded documents
export const ragDocuments = pgTable(
  'rag_documents',
  {
    id: serial('id').primaryKey(),
    filename: text('filename').notNull(),
    contentHash: text('content_hash').unique().notNull(),
    fileType: text('file_type'),
    fileSize: integer('file_size'),
    content: text('content'),
    metadata: jsonb('metadata').default('{}'),
    embedding: vector('embedding', { dimensions: 768 }), // Gemma embeddings
    processedAt: timestamp('processed_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    embeddingIndex: index('rag_embedding_idx').using('ivfflat', table.embedding).with({ lists: 100 }),
    contentHashIndex: index('rag_content_hash_idx').on(table.contentHash),
  })
);

// Knowledge Base table (unified semantic chunks from various sources)
export const knowledgeBase = pgTable(
  'knowledge_base',
  {
    id: serial('id').primaryKey(),
    chunkId: text('chunk_id').unique().notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    metadata: jsonb('metadata').default('{}'),
    chunkType: text('chunk_type').notNull(), // 'rag_document', 'component_overview', 'api_endpoint', etc.
    sourceFile: text('source_file'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    embeddingIndex: index('kb_embedding_idx').using('ivfflat', table.embedding).with({ lists: 100 }),
    chunkTypeIndex: index('kb_chunk_type_idx').on(table.chunkType),
    sourceFileIndex: index('kb_source_file_idx').on(table.sourceFile),
  })
);

// Code Embeddings table for agentic programming
export const codeEmbeddings = pgTable(
  'code_embeddings',
  {
    id: serial('id').primaryKey(),
    path: text('path').unique().notNull(),
    contentHash: text('content_hash').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    metadata: jsonb('metadata').default('{}'),
    errorPatterns: text('error_patterns').array(),
    repairSuggestions: text('repair_suggestions').array(),
    confidenceScore: real('confidence_score'),
    lastUpdated: timestamp('last_updated').defaultNow(),
  },
  table => ({
    embeddingIndex: index('code_embedding_idx').using('ivfflat', table.embedding).with({ lists: 100 }),
    pathIndex: index('code_path_idx').on(table.path),
    contentHashIndex: index('code_content_hash_idx').on(table.contentHash),
  })
);

// RAG document relations
export const ragDocumentsRelations = relations(ragDocuments, ({ many }) => ({
  knowledgeChunks: many(knowledgeBase),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  ragDocument: one(ragDocuments, {
    fields: [knowledgeBase.sourceFile],
    references: [ragDocuments.filename],
  }),
}));

// Type exports for RAG tables
export type RagDocument = typeof ragDocuments.$inferSelect;
export type NewRagDocument = typeof ragDocuments.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type CodeEmbedding = typeof codeEmbeddings.$inferSelect;
export type NewCodeEmbedding = typeof codeEmbeddings.$inferInsert;

// Zod schemas for RAG tables
export const ragDocumentsSelectSchema = createSelectSchema(ragDocuments);
export const ragDocumentsInsertSchema = createInsertSchema(ragDocuments);
export const knowledgeBaseSelectSchema = createSelectSchema(knowledgeBase);
export const knowledgeBaseInsertSchema = createInsertSchema(knowledgeBase);
