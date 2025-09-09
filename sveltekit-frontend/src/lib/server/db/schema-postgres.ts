// Updated PostgreSQL schema based on database introspection
// This schema matches the actual database structure (drizzle/schema.ts)
import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
  foreignKey,
  vector,
  numeric
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// === AUTHENTICATION & USER MANAGEMENT ===

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: varchar({ length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", { mode: 'string' }),
  hashedPassword: text("hashed_password"),
  name: text(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  role: varchar({ length: 50 }).default('prosecutor').notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("users_email_unique").on(table.email),
]);

// === LUCIA v3 AUTHENTICATION TABLES ===

export const sessions = pgTable("sessions", {
  id: text().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "sessions_user_id_users_id_fk"
  }).onDelete("cascade"),
]);

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: serial().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  email: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 8 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "email_verification_codes_user_id_users_id_fk"
  }).onDelete("cascade"),
  unique("email_verification_codes_user_id_unique").on(table.userId),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: varchar("token_hash", { length: 63 }).primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "password_reset_tokens_user_id_users_id_fk"
  }).onDelete("cascade"),
]);

// === CASE MANAGEMENT ===

export const cases = pgTable("cases", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseNumber: varchar("case_number", { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }),
  description: text(),
  incidentDate: timestamp("incident_date", { mode: 'string' }),
  location: text(),
  priority: varchar({ length: 20 }).default('medium').notNull(),
  status: varchar({ length: 20 }).default('open').notNull(),
  category: varchar({ length: 50 }),
  dangerScore: integer("danger_score").default(0).notNull(),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  jurisdiction: varchar({ length: 100 }),
  leadProsecutor: uuid("lead_prosecutor"),
  assignedTeam: jsonb("assigned_team").default([]).notNull(),
  tags: jsonb().default([]).notNull(),
  aiSummary: text("ai_summary"),
  aiTags: jsonb("ai_tags").default([]).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { mode: 'string' }),
}, (table) => [
  unique("cases_case_number_unique").on(table.caseNumber),
]);

// === CRIMINAL RECORDS ===

export const criminals = pgTable("criminals", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  aliases: jsonb().default([]).notNull(),
  dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
  placeOfBirth: varchar("place_of_birth", { length: 200 }),
  address: text(),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 255 }),
  ssn: varchar({ length: 11 }),
  driversLicense: varchar("drivers_license", { length: 50 }),
  height: integer(),
  weight: integer(),
  eyeColor: varchar("eye_color", { length: 20 }),
  hairColor: varchar("hair_color", { length: 20 }),
  distinguishingMarks: text("distinguishing_marks"),
  photoUrl: text("photo_url"),
  fingerprints: jsonb().default({}),
  threatLevel: varchar("threat_level", { length: 20 }).default('low').notNull(),
  status: varchar({ length: 20 }).default('active').notNull(),
  notes: text(),
  aiSummary: text("ai_summary"),
  aiTags: jsonb("ai_tags").default([]).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// === EVIDENCE MANAGEMENT ===

export const evidence = pgTable("evidence", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  criminalId: uuid("criminal_id"),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  evidenceType: varchar("evidence_type", { length: 50 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  subType: varchar("sub_type", { length: 50 }),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  hash: varchar({ length: 128 }),
  tags: jsonb().default([]).notNull(),
  chainOfCustody: jsonb("chain_of_custody").default([]).notNull(),
  collectedAt: timestamp("collected_at", { mode: 'string' }),
  collectedBy: varchar("collected_by", { length: 255 }),
  location: text(),
  labAnalysis: jsonb("lab_analysis").default({}).notNull(),
  aiAnalysis: jsonb("ai_analysis").default({}).notNull(),
  aiTags: jsonb("ai_tags").default([]).notNull(),
  aiSummary: text("ai_summary"),
  summary: text(),
  isAdmissible: boolean("is_admissible").default(true).notNull(),
  confidentialityLevel: varchar("confidentiality_level", { length: 20 }).default('standard').notNull(),
  canvasPosition: jsonb("canvas_position").default({}).notNull(),
  uploadedBy: uuid("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// === LEGAL DOCUMENT MANAGEMENT ===

export const legalDocuments = pgTable("legal_documents", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: varchar({ length: 500 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  jurisdiction: varchar({ length: 100 }),
  court: varchar({ length: 200 }),
  citation: varchar({ length: 300 }),
  fullCitation: text("full_citation"),
  docketNumber: varchar("docket_number", { length: 100 }),
  dateDecided: timestamp("date_decided", { mode: 'string' }),
  datePublished: timestamp("date_published", { mode: 'string' }),
  fullText: text("full_text"),
  content: text(),
  summary: text(),
  headnotes: text(),
  keywords: jsonb().default([]),
  topics: jsonb().default([]),
  parties: jsonb().default({}),
  judges: jsonb().default([]),
  attorneys: jsonb().default({}),
  outcome: varchar({ length: 100 }),
  precedentialValue: varchar("precedential_value", { length: 50 }),
  url: text(),
  pdfUrl: text("pdf_url"),
  westlawId: varchar("westlaw_id", { length: 100 }),
  lexisId: varchar("lexis_id", { length: 100 }),
  caseId: uuid("case_id"),
  evidenceId: uuid("evidence_id"),
  isActive: boolean("is_active").default(true),
  isDirty: boolean("is_dirty").default(false),
  lastSavedAt: timestamp("last_saved_at", { mode: 'string' }),
  autoSaveData: jsonb("auto_save_data"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  embedding: vector({ dimensions: 768 }),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "legal_documents_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.evidenceId],
    foreignColumns: [evidence.id],
    name: "legal_documents_evidence_id_evidence_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "legal_documents_created_by_users_id_fk"
  }),
]);

// === CASE ACTIVITIES & TIMELINE ===

export const caseActivities = pgTable("case_activities", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id").notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  status: varchar({ length: 20 }).default('pending').notNull(),
  priority: varchar({ length: 20 }).default('medium').notNull(),
  assignedTo: uuid("assigned_to"),
  relatedEvidence: jsonb("related_evidence").default([]).notNull(),
  relatedCriminals: jsonb("related_criminals").default([]).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// === ATTACHMENT VERIFICATIONS ===

export const attachmentVerifications = pgTable("attachment_verifications", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  attachmentId: uuid("attachment_id").notNull(),
  verifiedBy: uuid("verified_by").notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }).default('pending').notNull(),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.verifiedBy],
    foreignColumns: [users.id],
    name: "attachment_verifications_verified_by_users_id_fk"
  }),
]);

// === CANVAS ANNOTATIONS ===

export const canvasAnnotations = pgTable("canvas_annotations", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  evidenceId: uuid("evidence_id"),
  fabricData: jsonb("fabric_data").notNull(),
  annotationType: varchar("annotation_type", { length: 50 }),
  coordinates: jsonb(),
  boundingBox: jsonb("bounding_box"),
  text: text(),
  color: varchar({ length: 20 }),
  layerOrder: integer("layer_order").default(0),
  isVisible: boolean("is_visible").default(true),
  metadata: jsonb().default({}),
  version: integer().default(1),
  parentAnnotationId: uuid("parent_annotation_id"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.evidenceId],
    foreignColumns: [evidence.id],
    name: "canvas_annotations_evidence_id_evidence_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "canvas_annotations_created_by_users_id_fk"
  }),
]);

// === CANVAS STATES ===

export const canvasStates = pgTable("canvas_states", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  name: varchar({ length: 255 }).notNull(),
  canvasData: jsonb("canvas_data").notNull(),
  version: integer().default(1),
  isDefault: boolean("is_default").default(false),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "canvas_states_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "canvas_states_created_by_users_id_fk"
  }),
]);

// === AI REPORTS & ANALYSIS ===

export const aiReports = pgTable("ai_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  richTextContent: jsonb("rich_text_content"),
  metadata: jsonb().default({}).notNull(),
  canvasElements: jsonb("canvas_elements").default([]).notNull(),
  generatedBy: varchar("generated_by", { length: 100 }).default('gemma3-legal'),
  confidence: numeric({ precision: 3, scale: 2 }).default('0.85'),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "ai_reports_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "ai_reports_created_by_users_id_fk"
  }),
]);

// === CITATIONS ===

export const citations = pgTable("citations", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  documentId: uuid("document_id"),
  citationType: varchar("citation_type", { length: 50 }).notNull(),
  relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }),
  pageNumber: integer("page_number"),
  pinpointCitation: varchar("pinpoint_citation", { length: 100 }),
  quotedText: text("quoted_text"),
  contextBefore: text("context_before"),
  contextAfter: text("context_after"),
  annotation: text(),
  legalPrinciple: text("legal_principle"),
  citationFormat: varchar("citation_format", { length: 20 }).default('bluebook'),
  formattedCitation: text("formatted_citation"),
  shepardsTreatment: varchar("shepards_treatment", { length: 50 }),
  isKeyAuthority: boolean("is_key_authority").default(false),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "citations_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.documentId],
    foreignColumns: [legalDocuments.id],
    name: "citations_document_id_legal_documents_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "citations_created_by_users_id_fk"
  }),
]);

// === REPORTS ===

export const reports = pgTable("reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  title: varchar({ length: 255 }).notNull(),
  content: text(),
  reportType: varchar("report_type", { length: 50 }).default('case_summary'),
  status: varchar({ length: 20 }).default('draft'),
  isPublic: boolean("is_public").default(false),
  tags: jsonb().default([]).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "reports_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "reports_created_by_users_id_fk"
  }),
]);

// === SAVED REPORTS ===

export const savedReports = pgTable("saved_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: varchar({ length: 300 }).notNull(),
  caseId: uuid("case_id"),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  templateId: uuid("template_id"),
  content: jsonb().notNull(),
  htmlContent: text("html_content"),
  generatedBy: varchar("generated_by", { length: 50 }).default('manual'),
  aiModel: varchar("ai_model", { length: 50 }),
  aiPrompt: text("ai_prompt"),
  exportFormat: varchar("export_format", { length: 20 }).default('pdf'),
  status: varchar({ length: 20 }).default('draft'),
  version: integer().default(1),
  wordCount: integer("word_count"),
  tags: jsonb().default([]),
  metadata: jsonb().default({}),
  sharedWith: jsonb("shared_with").default([]),
  lastExported: timestamp("last_exported", { mode: 'string' }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "saved_reports_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "saved_reports_created_by_users_id_fk"
  }),
]);

// === THEMES & UI CUSTOMIZATION ===

export const themes = pgTable("themes", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  cssVariables: jsonb("css_variables").notNull(),
  colorPalette: jsonb("color_palette").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "themes_created_by_users_id_fk"
  }).onDelete("cascade"),
]);

// === PERSONS OF INTEREST ===

export const personsOfInterest = pgTable("persons_of_interest", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  name: varchar({ length: 255 }).notNull(),
  aliases: jsonb().default([]).notNull(),
  relationship: varchar({ length: 100 }),
  threatLevel: varchar("threat_level", { length: 20 }).default('low'),
  status: varchar({ length: 20 }).default('active'),
  profileData: jsonb("profile_data").default({}).notNull(),
  tags: jsonb().default([]).notNull(),
  position: jsonb().default({}).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "persons_of_interest_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "persons_of_interest_created_by_users_id_fk"
  }),
]);

// === HASH VERIFICATIONS ===

export const hashVerifications = pgTable("hash_verifications", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  evidenceId: uuid("evidence_id"),
  verifiedHash: varchar("verified_hash", { length: 64 }).notNull(),
  storedHash: varchar("stored_hash", { length: 64 }),
  result: boolean().notNull(),
  verificationMethod: varchar("verification_method", { length: 50 }).default('manual'),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }).defaultNow(),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.evidenceId],
    foreignColumns: [evidence.id],
    name: "hash_verifications_evidence_id_evidence_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.verifiedBy],
    foreignColumns: [users.id],
    name: "hash_verifications_verified_by_users_id_fk"
  }),
]);

// === VECTOR EMBEDDINGS FOR AI SEARCH ===

export const contentEmbeddings = pgTable("content_embeddings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  contentId: uuid("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  textContent: text("text_content").notNull(),
  embedding: text(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userEmbeddings = pgTable("user_embeddings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id"),
  content: text().notNull(),
  embedding: text().notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_embeddings_user_id_users_id_fk"
  }).onDelete("cascade"),
]);

export const chatEmbeddings = pgTable("chat_embeddings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  conversationId: uuid("conversation_id").notNull(),
  messageId: uuid("message_id").notNull(),
  content: text().notNull(),
  embedding: text().notNull(),
  role: varchar({ length: 20 }).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const evidenceVectors = pgTable("evidence_vectors", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  evidenceId: uuid("evidence_id"),
  content: text().notNull(),
  embedding: text().notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.evidenceId],
    foreignColumns: [evidence.id],
    name: "evidence_vectors_evidence_id_evidence_id_fk"
  }).onDelete("cascade"),
]);

export const caseEmbeddings = pgTable("case_embeddings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  content: text().notNull(),
  embedding: text().notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "case_embeddings_case_id_cases_id_fk"
  }).onDelete("cascade"),
]);

// === RAG (Retrieval Augmented Generation) SESSIONS ===

export const ragSessions = pgTable("rag_sessions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  userId: uuid("user_id"),
  title: varchar({ length: 255 }),
  model: varchar({ length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "rag_sessions_user_id_users_id_fk"
  }).onDelete("cascade"),
  unique("rag_sessions_session_id_unique").on(table.sessionId),
]);

export const ragMessages = pgTable("rag_messages", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  messageIndex: integer("message_index").notNull(),
  role: varchar({ length: 20 }).notNull(),
  content: text().notNull(),
  retrievedSources: jsonb("retrieved_sources").default([]).notNull(),
  sourceCount: integer("source_count").default(0).notNull(),
  retrievalScore: varchar("retrieval_score", { length: 10 }),
  processingTime: integer("processing_time"),
  model: varchar({ length: 100 }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// === STATUTES ===

export const statutes = pgTable("statutes", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 100 }).notNull(),
  description: text(),
  category: varchar({ length: 100 }),
  jurisdiction: varchar({ length: 100 }),
  isActive: boolean("is_active").default(true),
  penalties: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// === LEGAL PRECEDENTS ===

export const legalPrecedents = pgTable("legal_precedents", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseTitle: varchar("case_title", { length: 255 }).notNull(),
  citation: varchar({ length: 255 }).notNull(),
  court: varchar({ length: 100 }),
  year: integer(),
  jurisdiction: varchar({ length: 50 }),
  summary: text(),
  fullText: text("full_text"),
  embedding: text(),
  relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }),
  legalPrinciples: jsonb("legal_principles").default([]).notNull(),
  linkedCases: jsonb("linked_cases").default([]).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// === LEGAL ANALYSIS SESSIONS ===

export const legalAnalysisSessions = pgTable("legal_analysis_sessions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  userId: uuid("user_id"),
  sessionType: varchar("session_type", { length: 50 }).default('case_analysis'),
  analysisPrompt: text("analysis_prompt"),
  analysisResult: text("analysis_result"),
  confidenceLevel: numeric("confidence_level", { precision: 3, scale: 2 }),
  sourcesUsed: jsonb("sources_used").default([]).notNull(),
  model: varchar({ length: 100 }).default('gemma3-legal'),
  processingTime: integer("processing_time"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "legal_analysis_sessions_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "legal_analysis_sessions_user_id_users_id_fk"
  }).onDelete("cascade"),
]);

// === LEGAL RESEARCH ===

export const legalResearch = pgTable("legal_research", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  query: text().notNull(),
  searchTerms: jsonb("search_terms").default([]),
  jurisdiction: varchar({ length: 100 }),
  dateRange: jsonb("date_range"),
  courtLevel: varchar("court_level", { length: 50 }),
  practiceArea: varchar("practice_area", { length: 100 }),
  resultsCount: integer("results_count").default(0),
  searchResults: jsonb("search_results").default([]),
  aiSummary: text("ai_summary"),
  keyFindings: jsonb("key_findings").default([]),
  recommendedCitations: jsonb("recommended_citations").default([]),
  searchDuration: integer("search_duration"),
  dataSource: varchar("data_source", { length: 50 }),
  isBookmarked: boolean("is_bookmarked").default(false),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "legal_research_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "legal_research_created_by_users_id_fk"
  }),
]);

// === VECTOR METADATA ===

export const vectorMetadata = pgTable("vector_metadata", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  documentId: text("document_id").notNull(),
  collectionName: varchar("collection_name", { length: 100 }).notNull(),
  metadata: jsonb().default({}).notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  unique("vector_metadata_document_id_unique").on(table.documentId),
]);

// === CASE SCORING SYSTEM ===

export const caseScores = pgTable("case_scores", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id").notNull(),
  score: numeric({ precision: 5, scale: 2 }).notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  breakdown: jsonb().default({}).notNull(),
  criteria: jsonb().default({}).notNull(),
  recommendations: jsonb().default([]).notNull(),
  calculatedBy: uuid("calculated_by"),
  calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "case_scores_case_id_cases_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.calculatedBy],
    foreignColumns: [users.id],
    name: "case_scores_calculated_by_users_id_fk"
  }),
]);

// === AI QUERY LOGGING SYSTEM ===

export const userAiQueries = pgTable("user_ai_queries", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  caseId: uuid("case_id"),
  query: text().notNull(),
  response: text().notNull(),
  model: varchar({ length: 100 }).default('gemma3-legal').notNull(),
  queryType: varchar("query_type", { length: 50 }).default('general'),
  confidence: numeric({ precision: 3, scale: 2 }),
  tokensUsed: integer("tokens_used"),
  processingTime: integer("processing_time"),
  contextUsed: jsonb("context_used").default([]).notNull(),
  embedding: vector({ dimensions: 768 }),
  metadata: jsonb().default({}).notNull(),
  isSuccessful: boolean("is_successful").default(true).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_ai_queries_user_id_users_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [cases.id],
    name: "user_ai_queries_case_id_cases_id_fk"
  }).onDelete("cascade"),
]);

// === AUTO-TAGGING SYSTEM ===

export const autoTags = pgTable("auto_tags", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  entityId: uuid("entity_id").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  tag: varchar({ length: 100 }).notNull(),
  confidence: numeric({ precision: 3, scale: 2 }).notNull(),
  source: varchar({ length: 50 }).default('ai_analysis').notNull(),
  model: varchar({ length: 100 }),
  extractedAt: timestamp("extracted_at", { mode: 'string' }).defaultNow().notNull(),
  isConfirmed: boolean("is_confirmed").default(false).notNull(),
  confirmedBy: uuid("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.confirmedBy],
    foreignColumns: [users.id],
    name: "auto_tags_confirmed_by_users_id_fk"
  }),
]);

// === EMBEDDING CACHE ===

export const embeddingCache = pgTable("embedding_cache", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  textHash: text("text_hash").notNull(),
  model: varchar({ length: 100 }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  embedding: vector({ dimensions: 768 }).notNull(),
}, (table) => [
  unique("embedding_cache_text_hash_unique").on(table.textHash),
]);

// === DOCUMENT CHUNKS ===

export const documentChunks = pgTable("document_chunks", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  documentId: uuid("document_id").notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text().notNull(),
  embedding: vector({ dimensions: 768 }).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// === TYPE EXPORTS ===

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type Criminal = typeof criminals.$inferSelect;
export type NewCriminal = typeof criminals.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RagSession = typeof ragSessions.$inferSelect;
export type NewRagSession = typeof ragSessions.$inferInsert;

export type RagMessage = typeof ragMessages.$inferSelect;
export type NewRagMessage = typeof ragMessages.$inferInsert;

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type NewLegalDocument = typeof legalDocuments.$inferInsert;

export type CaseActivity = typeof caseActivities.$inferSelect;
export type NewCaseActivity = typeof caseActivities.$inferInsert;

export type CanvasAnnotation = typeof canvasAnnotations.$inferSelect;
export type NewCanvasAnnotation = typeof canvasAnnotations.$inferInsert;

export type PersonOfInterest = typeof personsOfInterest.$inferSelect;
export type NewPersonOfInterest = typeof personsOfInterest.$inferInsert;

export type UserAiQuery = typeof userAiQueries.$inferSelect;
export type NewUserAiQuery = typeof userAiQueries.$inferInsert;

export type AutoTag = typeof autoTags.$inferSelect;
export type NewAutoTag = typeof autoTags.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  casesAsLead: many(cases, { relationName: "leadProsecutor" }),
  casesCreated: many(cases, { relationName: "createdBy" }),
  evidenceUploaded: many(evidence),
  activitiesAssigned: many(caseActivities, { relationName: "assignedTo" }),
  activitiesCreated: many(caseActivities, { relationName: "createdBy" }),
  criminalsCreated: many(criminals),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  leadProsecutor: one(users, {
    fields: [cases.leadProsecutor],
    references: [users.id],
    relationName: "leadProsecutor",
  }),
  createdBy: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  evidence: many(evidence),
  activities: many(caseActivities),
}));

export const criminalsRelations = relations(criminals, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [criminals.createdBy],
    references: [users.id],
  }),
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [evidence.uploadedBy],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id],
  }),
}));

export const caseActivitiesRelations = relations(caseActivities, ({ one }) => ({
  case: one(cases, {
    fields: [caseActivities.caseId],
    references: [cases.id],
  }),
  assignedTo: one(users, {
    fields: [caseActivities.assignedTo],
    references: [users.id],
    relationName: "assignedTo",
  }),
  createdBy: one(users, {
    fields: [caseActivities.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
}));

export const aiReportsRelations = relations(aiReports, ({ one }) => ({
  case: one(cases, {
    fields: [aiReports.caseId],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [aiReports.createdBy],
    references: [users.id],
  }),
}));

export const personsOfInterestRelations = relations(
  personsOfInterest,
  ({ one }) => ({
    case: one(cases, {
      fields: [personsOfInterest.caseId],
      references: [cases.id],
    }),
    createdBy: one(users, {
      fields: [personsOfInterest.createdBy],
      references: [users.id],
    }),
  })
);

export const legalDocumentsRelations = relations(legalDocuments, ({ one }) => ({
  case: one(cases, {
    fields: [legalDocuments.caseId],
    references: [cases.id],
  }),
  evidence: one(evidence, {
    fields: [legalDocuments.evidenceId],
    references: [evidence.id],
  }),
}));

export const ragSessionsRelations = relations(ragSessions, ({ one }) => ({
  user: one(users, {
    fields: [ragSessions.userId],
    references: [users.id],
  }),
}));

export const userAiQueriesRelations = relations(userAiQueries, ({ one }) => ({
  user: one(users, {
    fields: [userAiQueries.userId],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [userAiQueries.caseId],
    references: [cases.id],
  }),
}));

export const autoTagsRelations = relations(autoTags, ({ one }) => ({
  confirmedBy: one(users, {
    fields: [autoTags.confirmedBy],
    references: [users.id],
  }),
}));