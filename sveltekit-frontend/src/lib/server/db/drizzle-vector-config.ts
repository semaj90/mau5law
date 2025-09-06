/**
 * Drizzle ORM Configuration with Vector Operations
 * Production-ready database schema with pgvector support
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  integer, 
  timestamp, 
  jsonb,
  boolean,
  index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm/relations';
import { customType } from 'drizzle-orm/pg-core';
import postgres from 'postgres';

// Custom vector type for pgvector
const vector = customType<{
  data: number[];
  notNull: boolean;
  default: boolean;
}>({
  dataType(config: { dimensions?: number } = {}) {
    return `vector(${config?.dimensions || 384})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // Parse vector string format "[1,2,3]" to number array
    return value.slice(1, -1).split(',').map(Number);
  }
});

// Database connection
const connectionString = import.meta.env.DATABASE_URL || 
  `postgresql://${import.meta.env.DB_USER || 'legal_admin'}:${import.meta.env.DB_PASSWORD || '123456'}@${import.meta.env.DB_HOST || 'localhost'}:${import.meta.env.DB_PORT || 5432}/${import.meta.env.DB_NAME || 'legal_ai_db'}`;

const sql_client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 60
});

export const db = drizzle(sql_client);
;
// Schema definitions
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 50 }).default('user'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  priority: varchar('priority', { length: 50 }).default('medium'),
  userId: integer('user_id').references(() => users.id),
  
  // Vector embeddings
  titleEmbedding: vector('title_embedding', { dimensions: 384 }),
  descriptionEmbedding: vector('description_embedding', { dimensions: 384 }),
  
  // Metadata
  metadata: jsonb('metadata'),
  tags: jsonb('tags'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Vector similarity indexes
  titleEmbeddingIdx: index('cases_title_embedding_idx')
    .on(table.titleEmbedding)
    .using('ivfflat'),
  descriptionEmbeddingIdx: index('cases_description_embedding_idx')
    .on(table.descriptionEmbedding)
    .using('ivfflat'),
  
  // Regular indexes
  userIdIdx: index('cases_user_id_idx').on(table.userId),
  statusIdx: index('cases_status_idx').on(table.status),
  createdAtIdx: index('cases_created_at_idx').on(table.createdAt)
}));

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => cases.id),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  filePath: varchar('file_path', { length: 1000 }),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 255 }),
  
  // Vector embeddings
  contentEmbedding: vector('content_embedding', { dimensions: 384 }),
  titleEmbedding: vector('title_embedding', { dimensions: 384 }),
  
  // Metadata and processing info
  metadata: jsonb('metadata'),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'),
  extractedText: text('extracted_text'),
  ocrConfidence: integer('ocr_confidence'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  contentEmbeddingIdx: index('documents_content_embedding_idx')
    .on(table.contentEmbedding)
    .using('ivfflat'),
  titleEmbeddingIdx: index('documents_title_embedding_idx')
    .on(table.titleEmbedding)
    .using('ivfflat'),
  caseIdIdx: index('documents_case_id_idx').on(table.caseId),
  processingStatusIdx: index('documents_processing_status_idx').on(table.processingStatus)
}));

export const evidence = pgTable('evidence', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => cases.id),
  documentId: integer('document_id').references(() => documents.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  evidenceType: varchar('evidence_type', { length: 100 }),
  content: text('content'),
  
  // Vector embeddings
  titleEmbedding: vector('title_embedding', { dimensions: 384 }),
  contentEmbedding: vector('content_embedding', { dimensions: 384 }),
  
  // Evidence-specific fields
  relevanceScore: integer('relevance_score'), // 0-100
  confidenceLevel: varchar('confidence_level', { length: 50 }),
  tags: jsonb('tags'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  titleEmbeddingIdx: index('evidence_title_embedding_idx')
    .on(table.titleEmbedding)
    .using('ivfflat'),
  contentEmbeddingIdx: index('evidence_content_embedding_idx')
    .on(table.contentEmbedding)
    .using('ivfflat'),
  caseIdIdx: index('evidence_case_id_idx').on(table.caseId),
  documentIdIdx: index('evidence_document_id_idx').on(table.documentId),
  evidenceTypeIdx: index('evidence_type_idx').on(table.evidenceType)
}));

export const vectorSearchLogs = pgTable('vector_search_logs', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 384 }),
  resultsCount: integer('results_count'),
  searchTimeMs: integer('search_time_ms'),
  userId: integer('user_id').references(() => users.id),
  searchType: varchar('search_type', { length: 50 }), // 'cases', 'documents', 'evidence', 'mixed'
  similarityThreshold: integer('similarity_threshold'), // Store as integer (0-100)
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  queryEmbeddingIdx: index('vector_search_logs_query_embedding_idx')
    .on(table.queryEmbedding)
    .using('ivfflat'),
  userIdIdx: index('vector_search_logs_user_id_idx').on(table.userId),
  createdAtIdx: index('vector_search_logs_created_at_idx').on(table.createdAt)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  vectorSearchLogs: many(vectorSearchLogs)
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  user: one(users, {
    fields: [cases.userId],
    references: [users.id]
}),
  documents: many(documents),
  evidence: many(evidence)
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id]
}),
  evidence: many(evidence)
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id]
}),
  document: one(documents, {
    fields: [evidence.documentId],
    references: [documents.id]
})
}));

export const vectorSearchLogsRelations = relations(vectorSearchLogs, ({ one }) => ({
  user: one(users, {
    fields: [vectorSearchLogs.userId],
    references: [users.id]
})
}));

// Vector search utility functions
export class VectorSearchService {
  
  /**
   * Perform similarity search across cases
   */
  static async searchCases(
    queryEmbedding: number[], 
    threshold: number = 0.7, 
    limit: number = 10
  ) {
    const results = await db.execute(sql`
      SELECT 
        id,
        title,
        description,
        status,
        priority,
        user_id,
        created_at,
        title_embedding <-> ${`[${queryEmbedding.join(',')}]`} as title_distance,
        description_embedding <-> ${`[${queryEmbedding.join(',')}]`} as description_distance,
        LEAST(
          title_embedding <-> ${`[${queryEmbedding.join(',')}]`},
          description_embedding <-> ${`[${queryEmbedding.join(',')}]`}
        ) as min_distance
      FROM cases 
      WHERE 
        title_embedding IS NOT NULL 
        OR description_embedding IS NOT NULL
      ORDER BY min_distance ASC
      LIMIT ${limit}
    `);
    
    return results;
  }

  /**
   * Perform similarity search across documents
   */
  static async searchDocuments(
    queryEmbedding: number[], 
    caseId?: number,
    threshold: number = 0.7, 
    limit: number = 10
  ) {
    const caseFilter = caseId ? sql`AND case_id = ${caseId}` : sql``;
    
    const results = await db.execute(sql`
      SELECT 
        id,
        case_id,
        title,
        file_type,
        file_size,
        processing_status,
        created_at,
        content_embedding <-> ${`[${queryEmbedding.join(',')}]`} as content_distance,
        title_embedding <-> ${`[${queryEmbedding.join(',')}]`} as title_distance,
        LEAST(
          content_embedding <-> ${`[${queryEmbedding.join(',')}]`},
          title_embedding <-> ${`[${queryEmbedding.join(',')}]`}
        ) as min_distance
      FROM documents 
      WHERE 
        (content_embedding IS NOT NULL OR title_embedding IS NOT NULL)
        ${caseFilter}
      ORDER BY min_distance ASC
      LIMIT ${limit}
    `);
    
    return results;
  }

  /**
   * Perform similarity search across evidence
   */
  static async searchEvidence(
    queryEmbedding: number[], 
    caseId?: number,
    evidenceType?: string,
    threshold: number = 0.7, 
    limit: number = 10
  ) {
    const caseFilter = caseId ? sql`AND case_id = ${caseId}` : sql``;
    const typeFilter = evidenceType ? sql`AND evidence_type = ${evidenceType}` : sql``;
    
    const results = await db.execute(sql`
      SELECT 
        id,
        case_id,
        document_id,
        title,
        evidence_type,
        relevance_score,
        confidence_level,
        created_at,
        title_embedding <-> ${`[${queryEmbedding.join(',')}]`} as title_distance,
        content_embedding <-> ${`[${queryEmbedding.join(',')}]`} as content_distance,
        LEAST(
          title_embedding <-> ${`[${queryEmbedding.join(',')}]`},
          content_embedding <-> ${`[${queryEmbedding.join(',')}]`}
        ) as min_distance
      FROM evidence 
      WHERE 
        (title_embedding IS NOT NULL OR content_embedding IS NOT NULL)
        ${caseFilter}
        ${typeFilter}
      ORDER BY min_distance ASC
      LIMIT ${limit}
    `);
    
    return results;
  }

  /**
   * Mixed search across all content types
   */
  static async searchAll(
    queryEmbedding: number[], 
    threshold: number = 0.7, 
    limit: number = 30
  ) {
    const [caseResults, documentResults, evidenceResults] = await Promise.all([
      this.searchCases(queryEmbedding, threshold, Math.floor(limit / 3)),
      this.searchDocuments(queryEmbedding, undefined, threshold, Math.floor(limit / 3)),
      this.searchEvidence(queryEmbedding, undefined, undefined, threshold, Math.floor(limit / 3))
    ]);

    return {
      cases: caseResults,
      documents: documentResults,
      evidence: evidenceResults,
      total: caseResults.length + documentResults.length + evidenceResults.length
    };
  }

  /**
   * Log search query for analytics
   */
  static async logSearch(
    query: string,
    queryEmbedding: number[],
    resultsCount: number,
    searchTimeMs: number,
    userId?: number,
    searchType: string = 'mixed',
    similarityThreshold: number = 0.7
  ) {
    await db.insert(vectorSearchLogs).values({
      query,
      queryEmbedding,
      resultsCount,
      searchTimeMs,
      userId,
      searchType,
      similarityThreshold: Math.round(similarityThreshold * 100),
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  }
}

// Export types
export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type VectorSearchLog = typeof vectorSearchLogs.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewCase = typeof cases.$inferInsert;
export type NewDocument = typeof documents.$inferInsert;
export type NewEvidence = typeof evidence.$inferInsert;

// Health check function
export async function healthCheck(): Promise<any> {
  try {
    const result = await db.execute(sql`SELECT 1 as health`);
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connection: 'active',
      result: result[0]
    };
  } catch (error: any) {
    return { 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}