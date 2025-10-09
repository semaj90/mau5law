// Move/import Drizzle pg-core symbols near the top of the file
import { pgTable, varchar, text, timestamp, json, integer, real } from 'drizzle-orm/pg-core';

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
