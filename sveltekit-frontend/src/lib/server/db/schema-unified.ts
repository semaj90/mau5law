/**
 * Unified Database Schema with PostgreSQL + pgvector Support
 * Production-ready schema for Legal AI Platform
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  serial,
  varchar,
  integer,
  boolean,
  jsonb,
  decimal,
  real,
  index
} from 'drizzle-orm/pg-core';

// Temporary pgvector support (custom implementation)
// import { vector } from 'drizzle-orm/pg-vector';
const vector = (name: string, config: { dimensions: number }) => 
  text(name); // Fallback to text for now, will be converted to vector in SQL
import { relations } from 'drizzle-orm/relations';

// === FOUNDATIONAL TABLES ===

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('hashed_password', { length: 255 }),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  department: varchar('department', { length: 100 }),
  jurisdiction: varchar('jurisdiction', { length: 100 }),
  permissions: jsonb('permissions').default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  practiceAreas: jsonb('practice_areas').default([]),
  barNumber: varchar('bar_number', { length: 50 }),
  firmName: varchar('firm_name', { length: 200 }),
  profileEmbedding: vector('profile_embedding', { dimensions: 384 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' })
}, (table) => ({
  // Indexes for performance
  emailIdx: index('users_email_idx').on(table.email),
  usernameIdx: index('users_username_idx').on(table.username),
  roleIdx: index('users_role_idx').on(table.role),
  activeIdx: index('users_active_idx').on(table.isActive),
  // Vector similarity indexes
  profileEmbeddingIdx: index('users_profile_embedding_hnsw_idx').using('hnsw', table.profileEmbedding.op('vector_cosine_ops'))
}));

// === LUCIA v3 AUTHENTICATION ===

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date"
  }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionContext: jsonb("session_context").default({}),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date"
  }).defaultNow().notNull()
});

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }).notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull()
});

// === CORE LEGAL TABLES ===

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("open").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  caseType: varchar("case_type", { length: 100 }),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

// === EVIDENCE TABLE WITH COMPLETE SCHEMA ===

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Keys
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Fixed: Added user_id column
  
  // Core Fields
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  evidenceType: varchar("evidence_type", { length: 50 }).notNull(),
  subType: varchar("sub_type", { length: 50 }),
  
  // File Information
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  hash: varchar("hash", { length: 128 }),
  
  // Collection Details
  collectedAt: timestamp("collected_at", { mode: "date" }),
  collectedBy: varchar("collected_by", { length: 255 }),
  location: varchar("location", { length: 255 }),
  chainOfCustody: jsonb("chain_of_custody").default([]).notNull(),
  
  // Classification
  tags: jsonb("tags").default([]).notNull(),
  isAdmissible: boolean("is_admissible").default(true),
  confidentialityLevel: varchar("confidentiality_level", { length: 50 }).default("internal"),
  
  // AI Analysis
  aiAnalysis: jsonb("ai_analysis").default({}),
  aiTags: jsonb("ai_tags").default([]),
  aiSummary: text("ai_summary"),
  summary: text("summary"),
  summaryType: varchar("summary_type", { length: 50 }),
  
  // Vector Embeddings (pgvector)
  titleEmbedding: vector("title_embedding", { dimensions: 384 }),
  contentEmbedding: vector("content_embedding", { dimensions: 384 }),
  
  // Board Position (for visual layout)
  boardPosition: jsonb("board_position").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  caseIdIdx: index("evidence_case_id_idx").on(table.caseId),
  userIdIdx: index("evidence_user_id_idx").on(table.userId),
  evidenceTypeIdx: index("evidence_type_idx").on(table.evidenceType),
  createdAtIdx: index("evidence_created_at_idx").on(table.createdAt),
  // Vector similarity indexes
  titleEmbeddingIdx: index("evidence_title_embedding_idx").using('hnsw', table.titleEmbedding.op('vector_cosine_ops')),
  contentEmbeddingIdx: index("evidence_content_embedding_idx").using('hnsw', table.contentEmbedding.op('vector_cosine_ops'))
}));

// === DOCUMENT METADATA TABLE (for Enhanced RAG Go service) ===

export const documentMetadata = pgTable("document_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 512 }).notNull(),
  summary: text("summary"),
  contentType: varchar("content_type", { length: 100 }),
  fileSize: integer("file_size"),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"),
  // Enhanced metadata for ingest service
  extractedText: text("extracted_text"), // Full text content
  documentType: varchar("document_type", { length: 100 }), // legal, evidence, case, etc.
  jurisdiction: varchar("jurisdiction", { length: 100 }), // US, State, Federal
  priority: integer("priority").default(1), // Processing priority
  ingestSource: varchar("ingest_source", { length: 100 }).default("manual"), // manual, api, batch
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  caseIdIdx: index("doc_metadata_case_id_idx").on(table.caseId),
  filenameIdx: index("doc_metadata_filename_idx").on(table.originalFilename),
  statusIdx: index("doc_metadata_status_idx").on(table.processingStatus),
  typeIdx: index("doc_metadata_type_idx").on(table.documentType),
  priorityIdx: index("doc_metadata_priority_idx").on(table.priority)
}));

// === VECTOR TABLES FOR ENHANCED SEARCH ===

export const documentEmbeddings = pgTable("document_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documentMetadata.id, { onDelete: "cascade" }),
  evidenceId: uuid("evidence_id").references(() => evidence.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Renamed from chunk_text for consistency
  embedding: vector("embedding", { dimensions: 384 }).notNull(),
  chunkIndex: integer("chunk_index").default(0),
  // Enhanced chunking metadata
  chunkText: text("chunk_text"), // Alias for compatibility
  chunkSize: integer("chunk_size").default(0),
  chunkOverlap: integer("chunk_overlap").default(0),
  parentChunkId: uuid("parent_chunk_id"), // For hierarchical chunking
  embeddingModel: varchar("embedding_model", { length: 100 }).default("nomic-embed-text"),
  similarity: real("similarity"), // Cached similarity scores
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  documentIdIdx: index("doc_embeddings_document_id_idx").on(table.documentId),
  evidenceIdIdx: index("doc_embeddings_evidence_id_idx").on(table.evidenceId),
  chunkIdxIdx: index("doc_embeddings_chunk_idx_idx").on(table.chunkIndex),
  modelIdx: index("doc_embeddings_model_idx").on(table.embeddingModel),
  similarityIdx: index("doc_embeddings_similarity_idx").on(table.similarity),
  embeddingIdx: index("doc_embeddings_embedding_idx").using('hnsw', table.embedding.op('vector_cosine_ops'))
}));

export const caseEmbeddings = pgTable("case_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 384 }).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  caseIdIdx: index("case_embeddings_case_id_idx").on(table.caseId),
  embeddingIdx: index("case_embeddings_embedding_idx").using('hnsw', table.embedding.op('vector_cosine_ops'))
}));

// === CASE ACTIVITIES ===

export const caseActivities = pgTable("case_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  caseIdIdx: index("case_activities_case_id_idx").on(table.caseId),
  userIdIdx: index("case_activities_user_id_idx").on(table.userId),
  createdAtIdx: index("case_activities_created_at_idx").on(table.createdAt)
}));

// === CHAT RECOMMENDATION TABLES ===

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  context: jsonb("context").default({}),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("chat_sessions_user_id_idx").on(table.userId)
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  sessionIdIdx: index("chat_messages_session_id_idx").on(table.sessionId),
  roleIdx: index("chat_messages_role_idx").on(table.role),
  embeddingIdx: index("chat_messages_embedding_idx").using('hnsw', table.embedding.op('vector_cosine_ops'))
}));

export const chatRecommendations = pgTable("chat_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => chatMessages.id, { onDelete: "cascade" }),
  recommendationType: varchar("recommendation_type", { length: 50 }).notNull(),
  content: text("content").notNull(),
  confidence: real("confidence").default(0.5),
  metadata: jsonb("metadata").default({}),
  feedback: varchar("feedback", { length: 20 }), // helpful, not_helpful, irrelevant
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("chat_recommendations_user_id_idx").on(table.userId),
  messageIdIdx: index("chat_recommendations_message_id_idx").on(table.messageId),
  confidenceIdx: index("chat_recommendations_confidence_idx").on(table.confidence)
}));

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  cases: many(cases),
  evidence: many(evidence),
  caseActivities: many(caseActivities),
  chatSessions: many(chatSessions),
  chatRecommendations: many(chatRecommendations)
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  user: one(users, {
    fields: [cases.userId],
    references: [users.id]
  }),
  evidence: many(evidence),
  activities: many(caseActivities),
  embeddings: many(caseEmbeddings)
}));

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id]
  }),
  user: one(users, {
    fields: [evidence.userId],
    references: [users.id]
  }),
  documentEmbeddings: many(documentEmbeddings)
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id]
  }),
  messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id]
  }),
  recommendations: many(chatRecommendations)
}));

export const chatRecommendationsRelations = relations(chatRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [chatRecommendations.userId],
    references: [users.id]
  }),
  message: one(chatMessages, {
    fields: [chatRecommendations.messageId],
    references: [chatMessages.id]
  })
}));

// Export all tables
export const schema = {
  users,
  sessions,
  emailVerificationCodes,
  cases,
  evidence,
  documentMetadata,
  documentEmbeddings,
  caseEmbeddings,
  caseActivities,
  chatSessions,
  chatMessages,
  chatRecommendations,
  
  // Relations
  usersRelations,
  casesRelations,
  evidenceRelations,
  chatSessionsRelations,
  chatMessagesRelations,
  chatRecommendationsRelations
};

export default schema;