// Enhanced Drizzle ORM Schema with JSONB Support
// File: schema-jsonb.ts

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  varchar,
  customType,
  serial
} from 'drizzle-orm/pg-core';
import {
  sql
} from "drizzle-orm";
// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  }
});

// Enum definitions
export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'archived'
]);

export const documentTypeEnum = pgEnum('document_type', [
  'contract',
  'brief',
  'case_study',
  'memo',
  'agreement',
  'policy',
  'other'
]);

export const summaryStyleEnum = pgEnum('summary_style', [
  'executive',
  'technical',
  'judicial',
  'detailed',
  'brief'
]);

export const jobPriorityEnum = pgEnum('job_priority', [
  'low',
  'normal',
  'high',
  'urgent'
]);

// TypeScript interfaces for JSONB data
export interface SummaryData {
  executive_summary: string | null;
  key_findings: string[];
  legal_issues: LegalIssue[];
  recommendations: Recommendation[];
  risk_assessment: RiskAssessment;
  confidence_score: number;
  processing_metrics: ProcessingMetrics;
}

export interface LegalIssue {
  issue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  precedents?: string[];
}

export interface Recommendation {
  action: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  timeline?: string;
}

export interface RiskAssessment {
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: Array<{
    factor: string;
    impact: string;
    probability: number;
  }>;
  mitigation: string[];
}

export interface ProcessingMetrics {
  chunks_processed?: number;
  gpu_memory_used_mb?: number;
  model_temperature?: number;
  inference_time_ms?: number;
  queue_time_ms?: number;
}

export interface DocumentMetadata {
  source?: 'upload' | 'api' | 'email' | 'scan';
  file_size_bytes?: number;
  pages?: number;
  language?: string;
  ocr_applied?: boolean;
  original_format?: string;
  tags?: string[];
  client_matter?: string;
  jurisdiction?: string;
}

export interface JobConfig {
  style?: 'executive' | 'technical' | 'judicial' | 'detailed' | 'brief';
  max_length?: number;
  temperature?: number;
  include_citations?: boolean;
  focus_areas?: string[];
  language?: string;
  model_override?: string;
}

export interface UserPreferences {
  default_style: string;
  max_summary_length: number;
  include_citations: boolean;
  auto_summarize: boolean;
  notification_settings: {
    email: boolean;
    push: boolean;
    webhook_url?: string;
  };
  api_limits: {
    daily_quota: number;
    rate_limit_per_minute: number;
  };
}

// Main documents table
export const aiSummarizedDocuments = pgTable('ai_summarized_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  documentType: documentTypeEnum('document_type').default('other'),
  originalText: text('original_text'),
  filePath: varchar('file_path', { length: 500 }),
  fileHash: varchar('file_hash', { length: 64 }).generatedAlwaysAs(
    sql`encode(sha256(original_text::bytea), 'hex')`
  ),
  
  // JSONB columns
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`).notNull(),
  summary: jsonb('summary').default(sql`'{}'::jsonb`).notNull(),
  analysis: jsonb('analysis').default(sql`'{}'::jsonb`).notNull(),
  entities: jsonb('entities').default(sql`'[]'::jsonb`).notNull(),
  citations: jsonb('citations').default(sql`'[]'::jsonb`).notNull(),
  summaryData: jsonb('summary_data').default(sql`'{
    "executive_summary": null,
    "key_findings": [],
    "legal_issues": [],
    "recommendations": [],
    "risk_assessment": {
      "overall_risk": "LOW",
      "risk_factors": [],
      "mitigation": []
    },
    "confidence_score": 0,
    "processing_metrics": {}
  }'::jsonb`).notNull(),
  
  // Processing fields
  status: documentStatusEnum('status').default('pending'),
  processingTimeMs: integer('processing_time_ms'),
  tokensProcessed: integer('tokens_processed'),
  modelUsed: varchar('model_used', { length: 100 }),
  gpuUtilized: boolean('gpu_utilized').default(false),
  errorMessage: text('error_message'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  summarizedAt: timestamp('summarized_at', { withTimezone: true }),
  
  // User tracking
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  
  // Versioning
  version: integer('version').default(1),
  parentDocumentId: uuid('parent_document_id'),
  
  // Full-text search vector (generated column)
  searchVector: text('search_vector').generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(document_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(original_text, '')), 'D') ||
        setweight(to_tsvector('english', coalesce(summary->>'executive_summary', '')), 'B')`
  )
}, (table: any) => ({
  statusIdx: index('idx_documents_status').on(table.status),
  typeIdx: index('idx_documents_type').on(table.documentType),
  createdAtIdx: index('idx_documents_created_at').on(table.createdAt),
  metadataIdx: index('idx_documents_metadata').using('gin', table.metadata),
  summaryIdx: index('idx_documents_summary').using('gin', table.summary),
  entitiesIdx: index('idx_documents_entities').using('gin', table.entities),
  confidenceIdx: index('idx_summary_confidence').on(sql`(summary_data->>'confidence_score')`),
  findingsIdx: index('idx_summary_findings').using('gin', sql`(summary_data->'key_findings')`),
  issuesIdx: index('idx_summary_issues').using('gin', sql`(summary_data->'legal_issues')`)
}));

// Vector embeddings table
export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => aiSummarizedDocuments.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`).notNull(),
  modelName: varchar('model_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table: any) => ({
  documentIdx: index('idx_embeddings_document').on(table.documentId),
  uniqueChunk: uniqueIndex('unique_document_chunk').on(table.documentId, table.chunkIndex),
  // Note: IVFFlat index for vector similarity search would be added via migration
}));

// Summarization jobs queue
export const summarizationJobs = pgTable('summarization_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').references(() => aiSummarizedDocuments.id, { onDelete: 'cascade' }),
  
  config: jsonb('config').default(sql`'{
    "style": "executive",
    "max_length": 500,
    "temperature": 0.2,
    "include_citations": true,
    "focus_areas": [],
    "language": "en"
  }'::jsonb`).notNull(),
  
  status: documentStatusEnum('status').default('pending'),
  priority: jobPriorityEnum('priority').default('normal'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  result: jsonb('result'),
  error: jsonb('error'),
  
  lockedBy: varchar('locked_by', { length: 100 }),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table: any) => ({
  statusPriorityIdx: index('idx_jobs_status_priority').on(table.status, table.priority, table.scheduledAt),
  documentIdx: index('idx_jobs_document').on(table.documentId),
  lockedIdx: index('idx_jobs_locked').on(table.lockedBy, table.lockedAt)
}));

// User preferences
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey(),
  preferences: jsonb('preferences').default(sql`'{
    "default_style": "executive",
    "max_summary_length": 500,
    "include_citations": true,
    "auto_summarize": false,
    "notification_settings": {
      "email": true,
      "push": false,
      "webhook_url": null
    },
    "api_limits": {
      "daily_quota": 100,
      "rate_limit_per_minute": 10
    }
  }'::jsonb`).notNull(),
  statistics: jsonb('statistics').default(sql`'{
    "total_documents": 0,
    "total_tokens": 0,
    "average_processing_time": 0,
    "last_activity": null
  }'::jsonb`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Export all tables
export const schema = {
  aiSummarizedDocuments,
  documentEmbeddings,
  summarizationJobs,
  userPreferences
};

// Type exports for use in application
export type AISummarizedDocument = typeof aiSummarizedDocuments.$inferSelect;
export type NewAISummarizedDocument = typeof aiSummarizedDocuments.$inferInsert;
export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;
export type SummarizationJob = typeof summarizationJobs.$inferSelect;
export type NewSummarizationJob = typeof summarizationJobs.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
