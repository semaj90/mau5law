// Move/import Drizzle pg-core symbols near the top of the file
import { pgTable, text, uuid, timestamp, vector } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at', { mode: 'utc' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'utc' }).defaultNow(),
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
  tags: jsonb('tags').$type<string[]>(),
  chainOfCustody: jsonb('chain_of_custody'),
  uploadedBy: uuid('uploaded_by').notNull(),
  isAdmissible: boolean('is_admissible').default(true),
  confidentialityLevel: varchar('confidentiality_level', { length: 50 }),
  collectedAt: timestamp('collected_at'),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow(),
});
