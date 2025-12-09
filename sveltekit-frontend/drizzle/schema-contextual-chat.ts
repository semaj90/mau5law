import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, cases, evidence } from './schema';

/**
 * Chat Turns Table
 * Stores each conversation turn with full context
 */
export const chatTurns = pgTable(
  'chat_turns',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text().notNull(),
    llmOutput: jsonb('llm_output').notNull(),
    ragContext: jsonb('rag_context'),
    kagContext: jsonb('kag_context'),
    didYouMean: jsonb('did_you_mean'),
    // Phase 4: Keyword persistence
    imageUrls: text('image_urls').array().default(sql`'{}'`),
    extractedKeywords: text('extracted_keywords').array().default(sql`'{}'`),
    keyPhrases: text('key_phrases').array().default(sql`'{}'`),
    suggestions: text('suggestions').array().default(sql`'{}'`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_chat_turns_case_id').on(table.caseId),
    index('idx_chat_turns_user_id').on(table.userId),
    index('idx_chat_turns_created_at').on(table.createdAt),
    index('idx_chat_turns_llm_output').using('gin', table.llmOutput),
    index('idx_chat_turns_rag_context').using('gin', table.ragContext),
    index('idx_chat_turns_kag_context').using('gin', table.kagContext),
    index('idx_chat_turns_did_you_mean').using('gin', table.didYouMean),
    // Phase 4: Keyword search indices
    index('idx_chat_turns_keywords').using('gin', table.extractedKeywords),
    index('idx_chat_turns_key_phrases').using('gin', table.keyPhrases),
    index('idx_chat_turns_case_created').on(table.caseId, table.createdAt),
  ]
);

/**
 * Chat Turn Evidence Table
 * Links uploaded/retrieved evidence to chat turns
 */
export const chatTurnEvidence = pgTable(
  'chat_turn_evidence',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatTurnId: uuid('chat_turn_id')
      .notNull()
      .references(() => chatTurns.id, { onDelete: 'cascade' }),
    evidenceId: uuid('evidence_id')
      .notNull()
      .references(() => evidence.id, { onDelete: 'cascade' }),
    objectUri: text('object_uri'),
    role: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_chat_turn_evidence_chat_turn_id').on(table.chatTurnId),
    index('idx_chat_turn_evidence_evidence_id').on(table.evidenceId),
    check('role_check', sql`role IN ('uploaded', 'retrieved')`),
  ]
);

/**
 * Chat Analytics Table
 * Tracks user behavior, query patterns, and performance metrics
 */
export const chatAnalytics = pgTable(
  'chat_analytics',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatTurnId: uuid('chat_turn_id')
      .notNull()
      .references(() => chatTurns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    queryEmbeddingSource: text('query_embedding_source').default('embeddinggemma:latest'),
    responseLatencyMs: integer('response_latency_ms'),
    ragResultsCount: integer('rag_results_count'),
    kagFactsCount: integer('kag_facts_count'),
    suggestionsCount: integer('suggestions_count'),
    userFeedback: text('user_feedback'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_chat_analytics_user_id').on(table.userId),
    index('idx_chat_analytics_case_id').on(table.caseId),
    index('idx_chat_analytics_created_at').on(table.createdAt),
  ]
);

/**
 * Type definitions for JSONB structures
 */
export interface LLMOutput {
  model: string;
  answer: string;
  citations: Array<{
    evidence_id: string;
    chunk_id: string;
  }>;
  tools_used: string[];
  latency_ms: number;
}

export interface RAGContext {
  collection: string;
  top_k: number;
  results: Array<{
    evidence_id: string;
    chunk_id: string;
    score: number;
    text: string;
  }>;
}

export interface KAGContext {
  facts: Array<{
    node_id: string;
    label: string;
    relation: string;
    target_id: string;
  }>;
}

export interface DidYouMean {
  query_embedding_source: string;
  suggestions: Array<{
    query: string;
    reason: string;
    score: number;
  }>;
}

/**
 * Chat Uploads Table
 * Stores uploaded documents processed with Docling for contextual chat
 */
export const chatUploads = pgTable(
  'chat_uploads',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    filename: text().notNull(),
    mimeType: text('mime_type').notNull(),
    minioUrl: text('minio_url').notNull(),
    doclingResult: jsonb('docling_result'),
    extractedKeywords: text('extracted_keywords').array().default(sql`'{}'`),
    keyPhrases: text('key_phrases').array().default(sql`'{}'`),
    suggestions: text('suggestions').array().default(sql`'{}'`),
    fileSizeBytes: integer('file_size_bytes'),
    processingTimeMs: integer('processing_time_ms'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_chat_uploads_user_id').on(table.userId),
    index('idx_chat_uploads_case_id').on(table.caseId),
    index('idx_chat_uploads_created_at').on(table.createdAt),
    index('idx_chat_uploads_keywords').using('gin', table.extractedKeywords),
    index('idx_chat_uploads_key_phrases').using('gin', table.keyPhrases),
  ]
);
