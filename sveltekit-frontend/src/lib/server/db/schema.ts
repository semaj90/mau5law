// Move/import Drizzle pg-core symbols near the top of the file
import {
  pgTable,
  timestamp,
  text,
  varchar,
  json,
  jsonb,
  real,
  integer,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    return `vector(${config?.length ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Re-export the PostgreSQL schema as the main schema
export * from './schema-postgres';
export * from './schema-gpu-cache';

// Exported table definition used by the advanced-analysis endpoint
export const analysisResults = pgTable('analysis_results', {
  analysisId: varchar('analysis_id', { length: 128 }).primaryKey(),
  evidenceId: varchar('evidence_id', { length: 128 }).notNull(),
  results: json('results').notNull(), // stores analyzer output as JSON
  analysisTypes: json('analysis_types').notNull(), // array or: string stored as JSON,
  confidence: real('confidence').default(0),
  processingTime: integer('processing_time').default(0), // ms or seconds per your convention
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

// Define the chat_messages table
export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 256 }).primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 256 }).notNull(),
  messageType: varchar('message_type', {
    length: 50,
    enum: ['user', 'assistant', 'system'],
  }).notNull(),
  metadata: jsonb('metadata').$type // TODO: Verify store subscription is correct for Svelte 5<{
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
      .references(() => chatMessages.id, { onDelete: 'cascade' })
      .primaryKey(), // Moved primaryKey here
    embedding: vector('embedding', { length: 768 }).notNull(), // Fixed: Use custom vector type
    // Store quantized embedding as bytea (binary data) or text (base64 encoded)
    // For Float32Array, bytea is more efficient.
    quantizedEmbedding: text('quantized_embedding').notNull(), // Storing as base64: string for simplicity in JS,
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    temporalContext: jsonb('temporal_context')
      .$type // TODO: Verify store subscription is correct for Svelte 5<{
        dayOfWeek: number;
        hourOfDay: number;
        monthOfYear: number;
        seasonality: 'spring' | 'summer' | 'fall' | 'winter';
        businessHours: boolean;
      }>()
      .notNull(),
    semanticHash: varchar('semantic_hash', { length: 256 }).notNull(),
  },
  // Removed the (self) => { ... } block for primaryKey and index
  // The index creation should ideally be handled in a migration file or a separate SQL execution.
  // For now, commenting it out to resolve the immediate TypeError.
  // (self) => {
  //   return [
  //     sql`CREATE INDEX ON ${sql.raw(self.name)} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`,
  //   ];
  // }
);

console.log('ðŸ“  Drizzle ORM schema defined');

// Placeholder schema types for Drizzle ORM
// Replace with your actual Drizzle schema definitions.

export interface Case {
  id: string;
  title: string;
  description: string;
  caseNumber: string;
  status: 'open' | 'closed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  aiSummary?: string | null;
}

export interface NewCase extends Omit<Case, 'id' | 'createdAt' | 'updatedAt'> {}

export interface Evidence {
  id: string;
  caseId: string;
  type: string; // e.g., 'document', 'testimony', 'photo'
  description: string;
  filePath: string;
  uploadedAt: Date;
  aiSummary?: string | null;
  embedding?: number[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface NewEvidence extends Omit<Evidence, 'id' | 'uploadedAt' | 'embedding'> {}

// Define the sessions table for Lucia
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // Lucia expects 'text' and manages the ID generation
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});
