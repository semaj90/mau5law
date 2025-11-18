import { pgTable, uuid, text, integer, real, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';

// Define the custom vector type for pgvector
const vector = (name: string, { dimensions }: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>( {
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]) {
      // driver expects string representation like: '[0.1,0.2,...]'
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return value.slice(1, -1).split(',').map(parseFloat);
    },
  } )(name);

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey(),
  caseId: uuid('case_id').references(() => cases.id),
  filename: text('filename').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  prosecutionScore: real('prosecution_score').notNull(),
  metadata: jsonb('metadata').$type<any | null>(), // Store ProcessingMetadata here (nullable)
  createdAt: timestamp('created_at').defaultNow(),
});

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey(),
  documentId: uuid('document_id').references(() => documents.id),
  text: text('text').notNull(),
  legalRelevance: real('legal_relevance'),
  position: integer('position'),
  embedding: vector('embedding', { dimensions: 384 }), // Match embedding dimensions
  createdAt: timestamp('created_at').defaultNow(),
});
