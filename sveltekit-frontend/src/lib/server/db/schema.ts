// Move/import Drizzle pg-core symbols near the top of the file
import {
  pgTable,
  uuid,
  timestamp,
  text,
  boolean,
  varchar,
  json,
  jsonb,
  real,
  integer,
  vector,
} from 'drizzle-orm/pg-core';
// If you have a custom provider for pgvector, prefer the official drizzle/pg-core `vector` where possible.
import { users } from './schema-postgres';
import { sql } from 'drizzle-orm';

// Re-export the PostgreSQL schema as the main schema
export * from './schema-postgres';

// Exported table definition used by the advanced-analysis endpoint
export const analysisResults = pgTable('analysis_results', {
  analysisId: varchar('analysis_id', { length: 128 }).primaryKey(),
  evidenceId: varchar('evidence_id', { length: 128 }).notNull(),
  results: json('results').notNull(), // stores analyzer output as JSON
  analysisTypes: json('analysis_types').notNull(), // array or string stored as JSON
  confidence: real('confidence').default(0),
  processingTime: integer('processing_time').default(0), // ms or seconds per your convention
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  metadata: jsonb('metadata'),
});

export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id')
    .references(() => cases.id)
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  evidenceType: varchar('evidence_type', { length: 100 }).notNull(),
  subType: varchar('sub_type', { length: 100 }),
  summary: text('summary'),
  aiSummary: text('ai_summary'),
  aiAnalysis: jsonb('ai_analysis'),
  tags: jsonb('tags'),
  chainOfCustody: jsonb('chain_of_custody'),
  uploadedBy: uuid('uploaded_by').notNull(),
  isAdmissible: boolean('is_admissible').default(true),
  confidentialityLevel: varchar('confidential_level', { length: 50 }),
  collectedAt: timestamp('collected_at'),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  embedding: vector('embedding', { dimensions: 768 }), // ADDED: Embedding column for pgvector
  metadata: jsonb('metadata'), // ADDED: Metadata column for AI analysis results
});

export const documents = pgTable('documents', cols => ({
  id: cols.uuid('id').defaultRandom().primaryKey(),
  userId: cols.text('user_id').notNull(),
  content: cols.text('content'),
  // use the columnTypes callback's vector builder so typings align with Drizzle overloads
  embedding: cols.vector('embedding', { dimensions: 1536 }),
  createdAt: cols.timestamp('created_at').defaultNow(),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(), // Remove .default(sql`gen_random_uuid()`) or similar
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

// Define the chat_messages table
export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 256 }).primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 256 }).notNull(),
  messageType: varchar('message_type', { length: 50, enum: ['user', 'assistant', 'system'] }).notNull(),
  metadata: jsonb('metadata').$type<{
    intent?: string;
    confidence?: number;
    topics?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    legalContext?: {
      documentType?: 'contract' | 'evidence' | 'brief' | 'citation';
      practiceArea?: string[];
      jurisdiction?: string;
    };
  }>(),
});

// Define the chat_embeddings table
export const chatEmbeddings = pgTable(
  'chat_embeddings',
  {
    chatId: varchar('chat_id', { length: 256 })
      .notNull()
      .references(() => chatMessages.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: 768 }).notNull(), // Gemma embedding size
    // Store quantized embedding as bytea (binary data) or text (base64 encoded)
    // For Float32Array, bytea is more efficient.
    quantizedEmbedding: text('quantized_embedding').notNull(), // Storing as base64 string for simplicity in JS
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    temporalContext: jsonb('temporal_context')
      .$type<{
        dayOfWeek: number;
        hourOfDay: number;
        monthOfYear: number;
        seasonality: 'spring' | 'summer' | 'fall' | 'winter';
        businessHours: boolean;
      }>()
      .notNull(),
    semanticHash: varchar('semantic_hash', { length: 256 }).notNull(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.chatId] }),
      // Add an index for efficient vector search
      embeddingIndex: sql`CREATE INDEX ON ${table.embedding} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`,
    };
  }
);

console.log('📝 Drizzle ORM schema defined');
