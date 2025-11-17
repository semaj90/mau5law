// Updated PostgreSQL schema based on database introspection // This schema matches the actual database structure (drizzle/schema.ts)
import type { sql  } from 'drizzle-orm';
import type { relations  } from 'drizzle-orm/relations';
import type { bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
  foreignKey,
  numeric,
  pgEnum,
  index
 } from 'drizzle-orm/pg-core';

// Note: vector type is handled via sql`` template in table definitions

// === ENUMS FOR LEGAL AI APPLICATION ===
export const userRoleEnum = pgEnum("user_role", [
  "prosecutor",
  "detective",
  "admin",
  "analyst",
  "paralegal",
]);
export const caseStatusEnum = pgEnum("case_status", [
  "open",
  "in_progress",
  "pending_review",
  "closed",
  "archived",
]);
export const casePriorityEnum = pgEnum("case_priority", [
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
]);
export const evidenceTypeEnum = pgEnum("evidence_type", [
  "document",
  "photo",
  "video",
  "audio",
  "physical",
  "digital",
  "witness_statement",
  "forensic",
]);
export const threatLevelEnum = pgEnum("threat_level", ["low", "medium", "high", "critical"]);
export const documentTypeEnum = pgEnum("document_type", [
  "case_law",
  "statute",
  "regulation",
  "brief",
  "contract",
  "evidence",
  "report",
  "precedent",
]);
export const confidentialityEnum = pgEnum("confidentiality_level", [
  "public",
  "standard",
  "confidential",
  "restricted",
  "classified",
]);
export const activityStatusEnum = pgEnum("activity_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
  "needs_review",
]);
export const documentStatusEnum = pgEnum('document_status', ['queued', 'processing', 'processed', 'failed', 'pending_ocr', 'ocr_completed', 'pending_embedding', 'embedding_completed', 'pending_summary', 'summary_completed']);
export const summaryTypeEnum = pgEnum('summary_type', ['legal_analysis', 'executive_summary', 'key_facts']);
export const caseRiskLevelEnum = pgEnum("case_risk_level", [
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
]);

// === TABLES FOR LEGAL AI APPLICATION ===

export const users = pgTable("users", {
  id: integer("id")
    .primaryKey()
    .notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  role: userRoleEnum("role").notNull().default("prosecutor"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(), // Assuming session ID is UUID
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: "sessions_user_id_users_id_fk",
      }).onDelete("cascade"),
    ],
  })
);

export const emailVerificationCodes = pgTable(
  "email_verification_codes",
  {
    id: serial("id").primaryKey().notNull(), // Assuming serial ID
    userId: uuid("user_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 8 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: `email_verification_codes_user_id_users_id_fk`,
      }).onDelete("cascade"),
    ],
    uniqueConstraints: [unique("email_verification_codes_user_id_unique").on(table.userId)],
  })
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: varchar("token_hash", { length: 63 }).primaryKey().notNull(), // Assuming tokenHash is primary key
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: `password_reset_tokens_user_id_users_id_fk`,
      }).onDelete("cascade"),
    ],
  })
);

// === CASE MANAGEMENT ===
export const cases = pgTable(
  "cases",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    caseNumber: varchar("case_number", { length: 100 }),
    priority: casePriorityEnum("priority").notNull(), // Using enum directly
    practiceArea: varchar("practice_area", { length: 100 }),
    jurisdiction: varchar("jurisdiction", { length: 100 }),
    court: varchar("court", { length: 200 }),
    clientName: varchar("client_name", { length: 200 }),
    opposingParty: varchar("opposing_party", { length: 200 }),
    assignedAttorney: integer("assigned_attorney"), // Foreign key to users.id
    filingDate: timestamp("filing_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    closedDate: timestamp("closed_date", { withTimezone: true }),
    qdrantId: uuid("qdrant_id"),
    qdrantCollection: varchar("qdrant_collection", { length: 100 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    status: caseStatusEnum("status").notNull(), // Using enum directly
  },
  (table) => ({
    indexes: [
      index("idx_cases_created_at").on(table.createdAt),
      index("idx_cases_status_priority").on(table.status, table.priority),
      index("idx_cases_status_priority_created").on(table.status, table.priority, table.createdAt),
    ],
    foreignKeys: [
      // Added foreign key for assignedAttorney
      foreignKey({
        columns: [table.assignedAttorney],
        foreignColumns: [users.id],
        name: "cases_assigned_attorney_users_id_fk",
      }).onDelete("set null"),
    ],
  })
);

// === CRIMINAL RECORDS ===
export const criminals = pgTable(
  "criminals",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    aliases: jsonb("aliases").default([]).notNull().$type <string[]>(),
    dateOfBirth: timestamp("date_of_birth", { mode: "string" }),
    placeOfBirth: varchar("place_of_birth", { length: 200 }),
    address: text("address"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    ssn: varchar("ssn", { length: 11 }),
    driversLicense: varchar("drivers_license", { length: 50 }),
    height: integer("height"),
    weight: integer("weight"),
    eyeColor: varchar("eye_color", { length: 20 }),
    hairColor: varchar("hair_color", { length: 20 }),
    distinguishingMarks: text("distinguishing_marks"),
    photoUrl: text("photo_url"),
    fingerprints: jsonb("fingerprints").default({}).notNull(),
    threatLevel: threatLevelEnum("threat_level").default("low").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    notes: text("notes"),
    aiSummary: text("ai_summary"),
    aiTags: jsonb("ai_tags").default([]).notNull().$type <string[]>(),
    createdBy: integer("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    indexes: [
      index("criminals_first_name_idx").on(table.firstName),
      index("criminals_last_name_idx").on(table.lastName),
      index("criminals_threat_level_idx").on(table.threatLevel),
      index("criminals_status_idx").on(table.status),
      index("criminals_created_by_idx").on(table.createdBy),
      index("criminals_ssn_idx").on(table.ssn),
    ],
    foreignKeys: [
      // Added foreign key for createdBy
      foreignKey({
        columns: [table.createdBy],
        foreignColumns: [users.id],
        name: "criminals_created_by_users_id_fk",
      }).onDelete("set null"),
    ],
  })
);

// === EVIDENCE MANAGEMENT ===
export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    criminalId: uuid("criminal_id"), // Foreign key to criminals.id
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    evidenceType: evidenceTypeEnum("evidence_type").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    subType: varchar("sub_type", { length: 50 }),
    fileUrl: text("file_url"),
    fileName: varchar("file_name", { length: 255 }),
    canvasPosition: jsonb("canvas_position").default({}).notNull(),
    uploadedBy: integer("uploaded_by"), // Foreign key to users.id
    uploadedAt: timestamp("uploaded_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    indexes: [
      index("evidence_case_id_idx").on(table.caseId),
      index("evidence_criminal_id_idx").on(table.criminalId),
      index("evidence_type_idx").on(table.evidenceType),
      index("evidence_uploaded_by_idx").on(table.uploadedBy),
      index("evidence_uploaded_at_idx").on(table.uploadedAt),
    ],
    foreignKeys: [
      foreignKey({
        columns: [table.caseId],
        foreignColumns: [cases.id],
        name: "evidence_case_id_cases_id_fk",
      }).onDelete("cascade"),
      foreignKey({
        columns: [table.criminalId],
        foreignColumns: [criminals.id],
        name: "evidence_criminal_id_criminals_id_fk",
      }).onDelete("set null"),
      foreignKey({
        columns: [table.uploadedBy],
        foreignColumns: [users.id],
        name: "evidence_uploaded_by_users_id_fk",
      }).onDelete("set null"),
    ],
  })
);

// Define documents table
export const documents = pgTable('documents', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  title: text('title').notNull(),
  content: text('content'),
  s3Key: text('s3_key').notNull(), // Added
  s3Bucket: text('s3_bucket').notNull().default('legal-documents'), // Added
  originalName: text('original_name').notNull(), // Added
  mimeType: text('mime_type').notNull(), // Added
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0), // Added
  caseId: uuid('case_id'), // Added, assuming foreign key to cases table
  userId: uuid('user_id'), // Added, assuming foreign key to users table
  status: documentStatusEnum('status').notNull().default('queued'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define legalDocuments table (based on documents, with additional fields for Qdrant integration)
export const legalDocuments = pgTable('legal_documents', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  title: text('title').notNull(),
  content: text('content'),
  s3Key: text('s3_key').notNull(),
  s3Bucket: text('s3_bucket').notNull().default('legal-documents'),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
  caseId: uuid('case_id'), // Foreign key to cases table
  userId: integer('user_id'), // Foreign key to users table
  evidenceId: uuid('evidence_id'), // Added: Foreign key to evidence table
  createdBy: integer('created_by'), // Added: Foreign key to users table
  status: documentStatusEnum('status').notNull().default('queued'),
  documentType: documentTypeEnum('document_type'), // Specific legal document type
  practiceArea: varchar('practice_area', { length: 100 }),
  metadata: jsonb('metadata'), // General metadata
  contentEmbedding: text('content_embedding'), // pgvector column for embeddings
  qdrantId: uuid('qdrant_id'), // ID in Qdrant
  qdrantCollection: varchar('qdrant_collection', { length: 100 }), // Qdrant collection name
  lastSyncedToQdrant: timestamp('last_synced_to_qdrant', { withTimezone: true, mode: "string" }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: "string" }), // Soft delete
  createdAt: timestamp('created_at', { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => ({
  indexes: [
    index("idx_legal_documents_case_id").on(table.caseId),
    index("idx_legal_documents_user_id").on(table.userId),
    index("idx_legal_documents_status").on(table.status),
    index("idx_legal_documents_qdrant_id").on(table.qdrantId),
    // HNSW index for contentEmbedding for fast similarity search
    // Note: HNSW indexes must be created via raw SQL migration, not in schema
    index("idx_legal_documents_content_embedding_hnsw").on(table.contentEmbedding),
  ],
  foreignKeys: [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: "legal_documents_case_id_cases_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "legal_documents_user_id_users_id_fk",
    }).onDelete("set null"),
    foreignKey({ // Added foreign key for evidenceId
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: "legal_documents_evidence_id_evidence_id_fk",
    }).onDelete("set null"),
    foreignKey({ // Added foreign key for createdBy
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "legal_documents_created_by_users_id_fk",
    }).onDelete("set null"),
  ],
}));

// Define storageFiles table
export const storageFiles = pgTable('storage_files', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  key: text('key').notNull(),
  original_name: text('original_name'),
  bucket: text('bucket').notNull(),
  userId: integer('user_id'), // Changed to integer and named userId for consistency
  size: bigint('size', { mode: 'bigint' }).notNull(),
  mime: text('mime'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(), // Changed to uploadedAt for consistency
}, (table) => ({
  foreignKeys: [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "storage_files_user_id_users_id_fk",
    }).onDelete("set null"),
  ],
}));

// === VECTOR METADATA ===
export const vectorMetadata = pgTable(
  "vector_metadata",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    documentId: text("document_id").notNull(), // This might be a foreign key to documents.id or legalDocuments.id
    collectionName: varchar("collection_name", { length: 100 }).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [unique("vector_metadata_document_id_unique").on(table.documentId)]
);

// === CASE SCORING SYSTEM ===
export const caseScores = pgTable(
  "case_scores",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    // Foreign key to users.id; who performed the calculation (nullable to allow on delete set null)
    calculatedBy: integer("calculated_by"),
    caseId: uuid("case_id").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    riskLevel: caseRiskLevelEnum("risk_level").notNull(),
    breakdown: jsonb("breakdown").default({}).notNull(),
    criteria: jsonb("criteria").default({}).notNull(),
    recommendations: jsonb("recommendations").default([]).notNull().$type <string[]>(),
    calculatedAt: timestamp("calculated_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `case_scores_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.calculatedBy],
      foreignColumns: [users.id],
      name: `case_scores_calculated_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === EMBEDDING CACHE ===
export const embeddingCache = pgTable(
  "embedding_cache",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    textHash: text("text_hash").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    embedding: text("embedding").notNull(), // Vector stored as text, converted in service layer
  },
  (table) => [unique("embedding_cache_text_hash_unique").on(table.textHash)]
);

// === USER AI QUERIES ===
export const userAiQueriesTable = pgTable(
  "user_ai_queries",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    caseId: uuid("case_id"),
    query: text("query").notNull(),
    response: text("response").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    queryType: varchar("query_type", { length: 50 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    processingTime: integer("processing_time"), // in ms
    contextUsed: jsonb("context_used").default([]).$type <string[]>(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: "user_ai_queries_user_id_users_id_fk",
      }).onDelete("cascade"),
      foreignKey({
        columns: [table.caseId],
        foreignColumns: [cases.id],
        name: "user_ai_queries_case_id_cases_id_fk",
      }).onDelete("set null"),
    ],
  })
);

// === AUTO TAGS ===
export const autoTagsTable = pgTable(
  "auto_tags",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    entityId: uuid("entity_id").notNull(), // Polymorphic
    entityType: varchar("entity_type", { length: 50 }).notNull(), // e.g., 'evidence', 'document'
    tag: varchar("tag", { length: 100 }).notNull(),
    confidence: real("confidence").notNull(),
    source: varchar("source", { length: 100 }).notNull(), // e.g., 'ai_analysis', 'user'
    model: varchar("model", { length: 100 }),
    isConfirmed: boolean("is_confirmed").default(false).notNull(),
    confirmedBy: integer("confirmed_by"), // FK to users.id
    confirmedAt: timestamp("confirmed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.confirmedBy],
        foreignColumns: [users.id],
        name: "auto_tags_confirmed_by_users_id_fk",
      }).onDelete("set null"),
    ],
    indexes: [index("idx_autotags_entity").on(table.entityId, table.entityType)],
  })
);

// === VECTOR OUTBOX ===
export const vectorOutbox = pgTable('vector_outbox', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  ownerType: varchar('owner_type', { length: 256 }).notNull(),
  ownerId: varchar('owner_id', { length: 256 }).notNull(),
  event: varchar('event', { length: 256 }).notNull(),
  vector: text('vector'), // Using sql`vector(384)` for pgvector type
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vectorJobs = pgTable('vector_jobs', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  status: varchar('status', { enum: ['pending', 'processing', 'success', 'failed'] }).notNull(),
  progress: integer('progress').default(0).notNull(),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// === ADDITIONAL TABLES ===
export const caseActivities = pgTable('case_activities', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'),
  assignedTo: integer('assigned_to'),
  createdBy: integer('created_by'),
  activityType: varchar('activity_type', { length: 100 }),
  description: text('description'),
  status: activityStatusEnum('status'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const attachmentVerifications = pgTable('attachment_verifications', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  attachmentId: uuid('attachment_id'), // FK to evidence.id or legalDocuments.id
  verifiedBy: integer('verified_by'), // FK to users.id
  status: verificationStatusEnum('status'),
  verificationDate: timestamp('verification_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

export const canvasStates = pgTable('canvas_states', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'), // FK to cases.id
  userId: integer('user_id'), // FK to users.id
  stateData: jsonb('state_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const canvasAnnotations = pgTable('canvas_annotations', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  canvasStateId: uuid('canvas_state_id'), // FK to canvasStates
  createdBy: integer('created_by'), // FK to users.id
  annotationData: jsonb('annotation_data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

export const canvasAutosaves = pgTable("canvas_autosaves", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  canvasStateId: uuid("canvas_state_id"), // FK to canvasStates
  createdAt: timestamp("created_at").defaultNow()
});

export const aiReports = pgTable('ai_reports', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }), // FK to cases.id
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }), // FK to users.id
  reportType: varchar('report_type', { length: 100 }).notNull(),
  summary: text('summary'),
  fullReport: text('full_report'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

export const citations = pgTable('citations', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid('document_id'), // FK to legalDocuments.id
  caseId: uuid('case_id'), // FK to cases.id
  citationText: text('citation_text').notNull(),
  sourceUrl: text('source_url'),
  pageNumber: integer('page_number'),
  confidence: real('confidence'),
  createdBy: integer('created_by'), // FK to users.id
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const reports = pgTable('reports', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'), // FK to cases.id
  createdBy: integer('created_by'), // FK to users.id
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  status: reportStatusEnum('status').default('draft').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const savedReports = pgTable('saved_reports', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: integer('user_id').notNull(), // FK to users.id
  reportId: uuid('report_id').notNull(), // FK to reports.id
  caseId: uuid('case_id'), // FK to cases.id
  savedAt: timestamp('saved_at').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const themes = pgTable('themes', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: integer('user_id').notNull(), // FK to users.id
  name: varchar('name', { length: 100 }).notNull(),
  config: jsonb('config').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const personsOfInterest = pgTable('persons', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'),
  createdBy: integer('created_by'),
  name: text('name').notNull(),
  aliases: jsonb('aliases').$type <string[]>().default([]),
  threatLevel: varchar('threat_level', { enum: ["low", "medium", "high", "critical"] })
    .default("low")
    .notNull(),
  status: varchar('status', { enum: ["surveillance", "wanted", "active", "cleared"] })
    .default("surveillance")
    .notNull(),
  description: text('description').default(""),
  lastSeen: varchar('last_seen'),
  lastLocation: text('last_location'),
  cases: jsonb('cases').$type <string[]>().default([]),
  // Multiple photos with forensic metadata
  photos: jsonb('photos').$type <{
    id: string;
    url: string;
    filename: string;
    uploadedAt: string;
    metadata: {
      exif?: Record<string, any>;
      gps?: { lat: number; lng: number };
      timestamp?: string;
      deviceModel?: string;
      resolution?: { width: number; height: number };
    };
    ai: {
      faceEmbedding?: number[]; // Face recognition vector
      quality: number; // Photo quality score
      landmarks?: number[][]; // Facial landmarks
    };
  }[]>().default([]),
  // Legacy single photo URL for backward compatibility
  photoUrl: text('photo_url'),
  ai: jsonb('ai').$type <{
    riskScore: number;
    patterns: string[];
    recommendations: string[];
    lastUpdated: string;
  }>().default(null),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// POI Photos table for better organization
export const poiPhotos = pgTable('poi_photos', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  poiId: uuid('poi_id').notNull(),
  minioKey: text('minio_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  aiCaption: text('ai_caption'),
  aiTags: jsonb('ai_tags').default([]).$type <string[]>(),
  exifData: jsonb('exif_data'),
  forensicData: jsonb('forensic_data'),
  faceEmbedding: text('face_embedding'), // Store vector as text for now
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => ({
  foreignKeys: [
    foreignKey({
      columns: [table.poiId],
      foreignColumns: [personsOfInterest.id],
      name: "poi_photos_poi_id_persons_id_fk",
    }).onDelete("cascade"),
  ],
  indexes: [
    index("idx_poi_photos_poi_id").on(table.poiId),
    index("idx_poi_photos_uploaded_at").on(table.uploadedAt),
  ],
}));

// === AI/VECTOR TABLES (Missing Definitions) ===

export const hashVerifications = pgTable('hash_verifications', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  evidenceId: uuid('evidence_id').notNull(),
  verifiedBy: integer('verified_by'),
  hashValue: text('hash_value').notNull(),
  algorithm: varchar('algorithm', { length: 50 }).notNull(),
  status: verificationStatusEnum('status').default('pending').notNull(),
  verificationDate: timestamp('verification_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contentEmbeddings = pgTable('content_embeddings', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid('document_id').notNull(),
  embedding: text('embedding').notNull(), // Store vector as text
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userEmbeddings = pgTable('user_embeddings', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: integer('user_id').notNull(),
  embedding: text('embedding').notNull(), // Store vector as text
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatEmbeddings = pgTable('chat_embeddings', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  ragMessageId: uuid('rag_message_id').notNull(),
  embedding: text('embedding').notNull(), // Store vector as text
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const evidenceVectors = pgTable('evidence_vectors', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  evidenceId: uuid('evidence_id').notNull(),
  vector: text('vector').notNull(), // Store vector as text
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const caseEmbeddings = pgTable('case_embeddings', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id').notNull(),
  embedding: text('embedding').notNull(), // Store vector as text
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ragSessions = pgTable('rag_sessions', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: integer('user_id').notNull(),
  caseId: uuid('case_id'),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ragMessages = pgTable('rag_messages', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  sessionId: uuid('session_id').notNull(),
  role: varchar('role', { length: 50 }).notNull(), // e.g., 'user', 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const statutes = pgTable('statutes', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  jurisdiction: varchar('jurisdiction', { length: 100 }),
  effectiveDate: timestamp('effective_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const legalPrecedents = pgTable('legal_precedents', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  citation: varchar('citation', { length: 255 }),
  court: varchar('court', { length: 200 }),
  decisionDate: timestamp('decision_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const legalAnalysisSessions = pgTable('legal_analysis_sessions', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: integer('user_id').notNull(),
  caseId: uuid('case_id'),
  analysisType: varchar('analysis_type', { length: 100 }).notNull(),
  inputData: jsonb('input_data'),
  outputSummary: text('output_summary'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const legalResearch = pgTable('legal_research', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  caseId: uuid('case_id'),
  createdBy: integer('created_by').notNull(),
  query: text('query').notNull(),
  results: jsonb('results'),
  status: varchar('status', { length: 50 }).default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentProcessing = pgTable('document_processing', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid('document_id').notNull(),
  status: documentStatusEnum('status').notNull().default('queued'),
  processor: varchar('processor', { length: 100 }),
  metadata: jsonb('metadata'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid('document_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: text('embedding'), // Store vector as text
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documentSummaries = pgTable('document_summaries', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  documentId: uuid('document_id').notNull(),
  summaryType: summaryTypeEnum('summary_type').notNull(),
  summaryText: text('summary_text').notNull(),
  model: varchar('model', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// === RELATIONS ===
// (All relations are now defined only once, with syntax fixed and duplicates removed)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  emailVerificationCodes: many(emailVerificationCodes),
  passwordResetTokens: many(passwordResetTokens),
  criminalsCreated: many(criminals),
  evidenceUploaded: many(evidence),
  legalDocumentsCreated: many(legalDocuments, { relationName: 'createdBy' }),
  legalDocumentsOwned: many(legalDocuments, { relationName: 'ownedDocuments' }),
  storageFiles: many(storageFiles), // Added storageFiles relation
  caseActivitiesAssigned: many(caseActivities, { relationName: `assignedTo` }),
  caseActivitiesCreated: many(caseActivities, { relationName: `createdBy` }),
  attachmentVerificationsPerformed: many(attachmentVerifications),
  canvasAnnotationsCreated: many(canvasAnnotations),
  canvasStatesCreated: many(canvasStates),
  aiReportsCreated: many(aiReports),
  citationsCreated: many(citations),
  reportsCreated: many(reports),
  savedReportsCreated: many(savedReports),
  themesCreated: many(themes),
  personsOfInterestCreated: many(personsOfInterest),
  hashVerificationsPerformed: many(hashVerifications),
  userEmbeddings: many(userEmbeddings),
  ragSessions: many(ragSessions),
  legalAnalysisSessions: many(legalAnalysisSessions),
  legalResearchCreated: many(legalResearch, { relationName: 'createdBy' }),
  caseScoresCalculated: many(caseScores, { relationName: 'calculatedBy' }),
  userAiQueries: many(userAiQueriesTable),
  autoTagsConfirmed: many(autoTagsTable, { relationName: 'confirmedBy' }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const emailVerificationCodesRelations = relations(emailVerificationCodes, ({ one }) => ({
  user: one(users, { fields: [emailVerificationCodes.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const casesRelations = relations(cases, ({ many, one }) => ({
  assignedAttorney: one(users, { fields: [cases.assignedAttorney], references: [users.id] }),
  evidence: many(evidence),
  activities: many(caseActivities),
  legalDocuments: many(legalDocuments),
  aiReports: many(aiReports),
  citations: many(citations),
  reports: many(reports),
  savedReports: many(savedReports),
  personsOfInterest: many(personsOfInterest),
  caseEmbeddings: many(caseEmbeddings),
  ragSessions: many(ragSessions),
  legalAnalysisSessions: many(legalAnalysisSessions),
  legalResearch: many(legalResearch),
  caseScores: many(caseScores),
  userAiQueries: many(userAiQueriesTable),
  canvasStates: many(canvasStates),
}));

export const criminalsRelations = relations(criminals, ({ many, one }) => ({
  createdBy: one(users, { fields: [criminals.createdBy], references: [users.id] }),
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  uploadedBy: one(users, { fields: [evidence.uploadedBy], references: [users.id] }),
  case: one(cases, { fields: [evidence.caseId], references: [cases.id] }),
  criminal: one(criminals, { fields: [evidence.criminalId], references: [criminals.id] }),
  legalDocuments: many(legalDocuments),
  canvasAnnotations: many(canvasAnnotations),
  evidenceVectors: many(evidenceVectors),
  hashVerifications: many(hashVerifications),
}));

export const documentsRelations = relations(documents, ({ many, one }) => ({
  case: one(cases, { fields: [documents.caseId], references: [cases.id] }),
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  documentProcessing: many(documentProcessing),
  documentChunks: many(documentChunks),
  documentSummaries: many(documentSummaries),
}));

export const legalDocumentsRelations = relations(legalDocuments, ({ one, many }) => ({
  case: one(cases, { fields: [legalDocuments.caseId], references: [cases.id] }),
  user: one(users, { fields: [legalDocuments.userId], references: [users.id], relationName: 'ownedDocuments' }),
  evidence: one(evidence, { fields: [legalDocuments.evidenceId], references: [evidence.id] }),
  createdBy: one(users, { fields: [legalDocuments.createdBy], references: [users.id], relationName: 'createdBy' }),
  citations: many(citations),
}));

export const storageFilesRelations = relations(storageFiles, ({ one }) => ({
  user: one(users, { fields: [storageFiles.userId], references: [users.id] }),
}));

export const caseActivitiesRelations = relations(caseActivities, ({ one }) => ({
  case: one(cases, { fields: [caseActivities.caseId], references: [cases.id] }),
  assignedTo: one(users, {
    fields: [caseActivities.assignedTo],
    references: [users.id],
    relationName: `assignedTo`,
  }),
  createdBy: one(users, {
    fields: [caseActivities.createdBy],
    references: [users.id],
    relationName: `createdBy`,
  }),
}));

export const attachmentVerificationsRelations = relations(attachmentVerifications, ({ one }) => ({
  verifiedBy: one(users, { fields: [attachmentVerifications.verifiedBy], references: [users.id] }),
  attachment: one(evidence, { fields: [attachmentVerifications.attachmentId], references: [evidence.id] }), // Assuming attachmentId refers to evidence
}));

export const canvasStatesRelations = relations(canvasStates, ({ one, many }) => ({
  case: one(cases, { fields: [canvasStates.caseId], references: [cases.id] }),
  user: one(users, { fields: [canvasStates.userId], references: [users.id] }),
  annotations: many(canvasAnnotations),
  autosaves: many(canvasAutosaves),
}));

export const canvasAnnotationsRelations = relations(canvasAnnotations, ({ one }) => ({
  canvasState: one(canvasStates, { fields: [canvasAnnotations.canvasStateId], references: [canvasStates.id] }),
  createdBy: one(users, { fields: [canvasAnnotations.createdBy], references: [users.id] }),
}));

export const canvasAutosavesRelations = relations(canvasAutosaves, ({ one }) => ({
  canvasState: one(canvasStates, { fields: [canvasAutosaves.canvasStateId], references: [canvasStates.id] }),
}));

export const aiReportsRelations = relations(aiReports, ({ one }) => ({
  case: one(cases, { fields: [aiReports.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [aiReports.createdBy], references: [users.id] }),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  document: one(legalDocuments, { fields: [citations.documentId], references: [legalDocuments.id] }),
  case: one(cases, { fields: [citations.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [citations.createdBy], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  case: one(cases, { fields: [reports.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [reports.createdBy], references: [users.id] }),
  savedReports: many(savedReports),
}));

export const savedReportsRelations = relations(savedReports, ({ one }) => ({
  user: one(users, { fields: [savedReports.userId], references: [users.id] }),
  report: one(reports, { fields: [savedReports.reportId], references: [reports.id] }),
  case: one(cases, { fields: [savedReports.caseId], references: [cases.id] }),
}));

export const themesRelations = relations(themes, ({ one }) => ({
  user: one(users, { fields: [themes.userId], references: [users.id] }),
}));

export const personsOfInterestRelations = relations(personsOfInterest, ({ one, many }) => ({
  case: one(cases, { fields: [personsOfInterest.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [personsOfInterest.createdBy], references: [users.id] }),
  photos: many(poiPhotos),
}));

export const poiPhotosRelations = relations(poiPhotos, ({ one }) => ({
  poi: one(personsOfInterest, { fields: [poiPhotos.poiId], references: [personsOfInterest.id] }),
}));

export const hashVerificationsRelations = relations(hashVerifications, ({ one }) => ({
  evidence: one(evidence, { fields: [hashVerifications.evidenceId], references: [evidence.id] }),
  verifiedBy: one(users, { fields: [hashVerifications.verifiedBy], references: [users.id] }),
}));

export const contentEmbeddingsRelations = relations(contentEmbeddings, ({ one }) => ({
  document: one(legalDocuments, { fields: [contentEmbeddings.documentId], references: [legalDocuments.id] }),
}));

export const userEmbeddingsRelations = relations(userEmbeddings, ({ one }) => ({
  user: one(users, { fields: [userEmbeddings.userId], references: [users.id] }),
}));

export const chatEmbeddingsRelations = relations(chatEmbeddings, ({ one }) => ({
  ragMessage: one(ragMessages, { fields: [chatEmbeddings.ragMessageId], references: [ragMessages.id] }),
}));

export const evidenceVectorsRelations = relations(evidenceVectors, ({ one }) => ({
  evidence: one(evidence, { fields: [evidenceVectors.evidenceId], references: [evidence.id] }),
}));

export const caseEmbeddingsRelations = relations(caseEmbeddings, ({ one }) => ({
  case: one(cases, { fields: [caseEmbeddings.caseId], references: [cases.id] }),
}));

export const ragSessionsRelations = relations(ragSessions, ({ one, many }) => ({
  user: one(users, { fields: [ragSessions.userId], references: [users.id] }),
  messages: many(ragMessages),
}));

export const ragMessagesRelations = relations(ragMessages, ({ one, many }) => ({
  session: one(ragSessions, { fields: [ragMessages.sessionId], references: [ragSessions.id] }),
  chatEmbeddings: many(chatEmbeddings),
}));

export const statutesRelations = relations(statutes, () => ({
  // No explicit relations defined in the provided context
}));

export const legalPrecedentsRelations = relations(legalPrecedents, ({ one }) => ({
  case: one(cases, { fields: [legalPrecedents.caseId], references: [cases.id] }),
}));

export const legalAnalysisSessionsRelations = relations(legalAnalysisSessions, ({ one }) => ({
  user: one(users, { fields: [legalAnalysisSessions.userId], references: [users.id] }),
  case: one(cases, { fields: [legalAnalysisSessions.caseId], references: [cases.id] }),
}));

export const legalResearchRelations = relations(legalResearch, ({ one }) => ({
  case: one(cases, { fields: [legalResearch.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [legalResearch.createdBy], references: [users.id] }),
}));

export const vectorMetadataRelations = relations(vectorMetadata, () => ({
  // documentId is text, not a direct Drizzle relation
}));

export const caseScoresRelations = relations(caseScores, ({ one }) => ({
  case: one(cases, { fields: [caseScores.caseId], references: [cases.id] }),
  calculatedBy: one(users, { fields: [caseScores.calculatedBy], references: [users.id] }),
}));

export const embeddingCacheRelations = relations(embeddingCache, () => ({
  // No explicit relations
}));

export const documentProcessingRelations = relations(documentProcessing, ({ one }) => ({
  document: one(documents, { fields: [documentProcessing.documentId], references: [documents.id] }),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, { fields: [documentChunks.documentId], references: [documents.id] }),
}));

export const documentSummariesRelations = relations(documentSummaries, ({ one }) => ({
  document: one(documents, { fields: [documentSummaries.documentId], references: [documents.id] }),
}));

export const userAiQueriesRelations = relations(userAiQueriesTable, ({ one }) => ({
  user: one(users, { fields: [userAiQueriesTable.userId], references: [users.id] }),
  case: one(cases, { fields: [userAiQueriesTable.caseId], references: [cases.id] }),
}));

export const autoTagsRelations = relations(autoTagsTable, ({ one }) => ({
  confirmedBy: one(users, { fields: [autoTagsTable.confirmedBy], references: [users.id] }),
}));

export const vectorOutboxRelations = relations(vectorOutbox, () => ({
  // No explicit relations
}));

export const vectorJobsRelations = relations(vectorJobs, () => ({
  // No explicit relations
}));

// === DATABASE CONNECTION & HELPERS ===
// Export commonly used query helpers for consistency
// Keep helpers minimal here to avoid importing unavailable symbols in this environment.
export const helpers = { sql };

