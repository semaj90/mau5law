/**
 * Legal RAG Database Schema
 * Drizzle ORM - PostgreSQL with pgvector
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  real,
  vector,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Cases table - full case metadata & authority rank
export const cases = pgTable('cases', {
  caseId: uuid('case_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  jurisdiction: text('jurisdiction').notNull(), // e.g. "S.D. Cal."
  courtLevel: text('court_level').notNull(), // District/Supreme/Appellate
  docketNumber: text('docket_number'),
  filingDate: timestamp('filing_date'),
  parties: jsonb('parties'), // {plaintiff, defendants}
  summary: text('summary'), // LLM summary extraction
  authorityScore: real('authority_score').default(0.0), // PageRank from KAG
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Legal documents - each uploaded PDF/complaint/opinion
export const legalDocuments = pgTable('legal_documents', {
  docId: uuid('doc_id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.caseId),
  fileName: text('file_name').notNull(),
  docType: text('doc_type'), // complaint, motion, opinion, statute challenge
  sourceBucket: text('source_bucket'), // MinIO path
  pages: integer('pages'),
  extractedText: text('extracted_text'),
  processed: integer('processed').default(0), // boolean as int
  createdAt: timestamp('created_at').defaultNow(),
});

// Chunks - 512-token legal chunks for embeddings
export const chunks = pgTable('chunks', {
  chunkId: uuid('chunk_id').primaryKey().defaultRandom(),
  docId: uuid('doc_id').references(() => legalDocuments.docId),
  caseId: uuid('case_id').references(() => cases.caseId),
  seq: integer('seq'),
  section: text('section'), // Facts, Jurisdiction, Claims, Prayer
  text: text('text').notNull(),
  tokenLength: integer('token_length'),
  embedding: vector('embedding', { dimensions: 768 }), // Gemma 768d
  latent128: vector('latent128', { dimensions: 128 }), // autoencoder compressed
  createdAt: timestamp('created_at').defaultNow(),
});

// Legal citations - statute and precedent references
export const legalCitations = pgTable('legal_citations', {
  citationId: uuid('citation_id').primaryKey().defaultRandom(),
  docId: uuid('doc_id').references(() => legalDocuments.docId),
  caseId: uuid('case_id').references(() => cases.caseId),
  chunkId: uuid('chunk_id').references(() => chunks.chunkId),
  type: text('type'), // statute, case, regulation
  citationText: text('citation_text'), // e.g. "U.S. Const. art. VI"
  citationNormalized: text('citation_normalized'), // normalized key for KAG
  page: integer('page'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Holdings - extracted legal reasoning
export const holdings = pgTable('holdings', {
  holdingId: uuid('holding_id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.caseId),
  chunkId: uuid('chunk_id').references(() => chunks.chunkId),
  issue: text('issue'), // "Is A.B. 32 preempted?"
  holding: text('holding').notNull(),
  reasoning: text('reasoning'),
  references: jsonb('references'), // statute/case IDs
  score: real('score'), // confidence from reranker
  createdAt: timestamp('created_at').defaultNow(),
});

// Citation graph - edge list for PageRank + Neo4j sync
export const citationGraph = pgTable('citation_graph', {
  id: serial('id').primaryKey(),
  fromCase: text('from_case').notNull(),
  toCitation: text('to_citation').notNull(),
  weight: real('weight').default(1.0),
});

// HMM Topic Labels - for taxonomy discovery
export const hmmTopics = pgTable('hmm_topics', {
  topicId: uuid('topic_id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id').references(() => chunks.chunkId),
  topicLabel: text('topic_label'), // facts, reasoning, holding, etc
  probability: real('probability'), // HMM confidence
  sequence: integer('sequence'), // position in document
  createdAt: timestamp('created_at').defaultNow(),
});

// Search cache - for Redis sync
export const searchCache = pgTable('search_cache', {
  cacheId: uuid('cache_id').primaryKey().defaultRandom(),
  queryHash: text('query_hash').notNull().unique(),
  results: jsonb('results'), // cached search results
  ttl: integer('ttl'), // seconds
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const casesRelations = relations(cases, ({ many }) => ({
  documents: many(legalDocuments),
  chunks: many(chunks),
  citations: many(legalCitations),
  holdings: many(holdings),
}));

export const documentsRelations = relations(legalDocuments, ({ one, many }) => ({
  case: one(cases, {
    fields: [legalDocuments.caseId],
    references: [cases.caseId],
  }),
  chunks: many(chunks),
  citations: many(legalCitations),
}));

export const chunksRelations = relations(chunks, ({ one, many }) => ({
  document: one(legalDocuments, {
    fields: [chunks.docId],
    references: [legalDocuments.docId],
  }),
  case: one(cases, {
    fields: [chunks.caseId],
    references: [cases.caseId],
  }),
  citations: many(legalCitations),
  holdings: many(holdings),
  topics: many(hmmTopics),
}));

export const citationsRelations = relations(legalCitations, ({ one }) => ({
  document: one(legalDocuments, {
    fields: [legalCitations.docId],
    references: [legalDocuments.docId],
  }),
  case: one(cases, {
    fields: [legalCitations.caseId],
    references: [cases.caseId],
  }),
  chunk: one(chunks, {
    fields: [legalCitations.chunkId],
    references: [chunks.chunkId],
  }),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  case: one(cases, {
    fields: [holdings.caseId],
    references: [cases.caseId],
  }),
  chunk: one(chunks, {
    fields: [holdings.chunkId],
    references: [chunks.chunkId],
  }),
}));

export const hmmTopicsRelations = relations(hmmTopics, ({ one }) => ({
  chunk: one(chunks, {
    fields: [hmmTopics.chunkId],
    references: [chunks.chunkId],
  }),
}));
