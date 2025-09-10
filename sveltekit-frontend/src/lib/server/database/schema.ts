import { 
  pgTable, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  jsonb, 
  uuid, 
  varchar,
  serial,
  real
} from 'drizzle-orm/pg-core';
import { vector } from 'pgvector/drizzle-orm';

// Enhanced Legal AI Database Schema with pgvector support

export const casesTable = pgTable('legal_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('open'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  metadata: jsonb('metadata').$type<{
    jurisdiction?: string;
    court_level?: string;
    practice_area?: string[];
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
  }>(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const documentsTable = pgTable('legal_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => casesTable.id),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  document_type: varchar('document_type', { length: 100 }),
  file_path: text('file_path'),
  file_size: integer('file_size'),
  
  // Vector embeddings for semantic search
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI embedding dimensions
  summary_embedding: vector('summary_embedding', { dimensions: 768 }), // Sentence transformer
  
  // JSONB for complex metadata
  metadata: jsonb('metadata').$type<{
    extracted_entities?: string[];
    key_terms?: string[];
    sentiment_score?: number;
    complexity_score?: number;
    confidence_level?: number;
    processing_status?: 'pending' | 'processed' | 'error';
    citations?: Array<{
      text: string;
      page?: number;
      confidence: number;
    }>;
  }>(),
  
  // Full-text search
  search_vector: text('search_vector'), // tsvector equivalent
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  processed_at: timestamp('processed_at')
});

export const evidenceTable = pgTable('evidence_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => casesTable.id),
  document_id: uuid('document_id').references(() => documentsTable.id),
  
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }), // 'witness', 'document', 'physical', etc.
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 50 }).default('active'),
  
  // Location in document
  page_number: integer('page_number'),
  paragraph_index: integer('paragraph_index'),
  character_offset: integer('character_offset'),
  
  // Vector similarity for related evidence
  embedding: vector('embedding', { dimensions: 1536 }),
  
  // Evidence-specific metadata
  metadata: jsonb('metadata').$type<{
    relevance_score?: number;
    reliability_score?: number;
    source?: string;
    tags?: string[];
    relationships?: Array<{
      related_evidence_id: string;
      relationship_type: string;
      strength: number;
    }>;
  }>(),
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const timelineEventsTable = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => casesTable.id),
  
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  event_date: timestamp('event_date').notNull(),
  event_type: varchar('event_type', { length: 100 }),
  is_milestone: boolean('is_milestone').default(false),
  
  // Related entities
  related_documents: jsonb('related_documents').$type<string[]>(),
  related_evidence: jsonb('related_evidence').$type<string[]>(),
  
  metadata: jsonb('metadata').$type<{
    source?: string;
    confidence?: number;
    impact_level?: 'low' | 'medium' | 'high';
    category?: string;
  }>(),
  
  created_at: timestamp('created_at').defaultNow()
});

// Vector similarity search materialized view for performance
export const vectorSimilarityView = pgTable('vector_similarity_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  source_id: uuid('source_id').notNull(),
  target_id: uuid('target_id').notNull(),
  similarity_score: real('similarity_score').notNull(),
  similarity_type: varchar('similarity_type', { length: 50 }), // 'document', 'evidence', 'case'
  
  created_at: timestamp('created_at').defaultNow(),
  expires_at: timestamp('expires_at')
});

// Cache table for frequently accessed queries
export const queryCache = pgTable('query_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  cache_key: varchar('cache_key', { length: 255 }).unique().notNull(),
  query_type: varchar('query_type', { length: 100 }), // 'semantic_search', 'case_analysis', etc.
  
  // Cached result data
  result_data: jsonb('result_data'),
  result_metadata: jsonb('result_metadata').$type<{
    query_time_ms?: number;
    result_count?: number;
    confidence_score?: number;
  }>(),
  
  // Cache management
  access_count: integer('access_count').default(0),
  last_accessed: timestamp('last_accessed').defaultNow(),
  
  created_at: timestamp('created_at').defaultNow(),
  expires_at: timestamp('expires_at').notNull()
});

// Analytics and metrics
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  event_type: varchar('event_type', { length: 100 }).notNull(),
  user_id: uuid('user_id'),
  session_id: varchar('session_id', { length: 255 }),
  
  // Event data
  event_data: jsonb('event_data'),
  
  // Performance metrics
  response_time_ms: integer('response_time_ms'),
  cache_hit: boolean('cache_hit'),
  cache_layer: varchar('cache_layer', { length: 50 }),
  
  created_at: timestamp('created_at').defaultNow()
});

// Full-text search configuration
export const searchConfigTable = pgTable('search_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  config_name: varchar('config_name', { length: 100 }).unique().notNull(),
  
  // Search weights and boosts
  field_weights: jsonb('field_weights').$type<{
    title?: number;
    content?: number;
    metadata?: number;
    tags?: number;
  }>(),
  
  // Vector search parameters
  vector_params: jsonb('vector_params').$type<{
    similarity_threshold?: number;
    max_results?: number;
    embedding_model?: string;
  }>(),
  
  // Fuse.js configuration
  fuzzy_config: jsonb('fuzzy_config').$type<{
    threshold?: number;
    distance?: number;
    keys?: string[];
  }>(),
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Types for enhanced type safety
export type Case = typeof casesTable.$inferSelect;
export type NewCase = typeof casesTable.$inferInsert;

export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

export type Evidence = typeof evidenceTable.$inferSelect;
export type NewEvidence = typeof evidenceTable.$inferInsert;

export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
export type NewTimelineEvent = typeof timelineEventsTable.$inferInsert;

export type VectorSimilarity = typeof vectorSimilarityView.$inferSelect;
export type QueryCacheEntry = typeof queryCache.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type SearchConfig = typeof searchConfigTable.$inferSelect;