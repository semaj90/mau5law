// Updated PostgreSQL schema based on database introspection // This schema matches the actual database structure (drizzle/schema.ts)
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/relations";
import { boolean, integer, jsonb, pgTable, real, serial, text, timestamp, uuid, varchar, unique, foreignKey, numeric, pgEnum, index } from "drizzle-orm/pg-core";

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

// Assuming canvasAutosaves is another table, but it's imported and then not used in the provided snippet.
import { canvasAutosaves } from "./schema-canvas-autosaves"; // Keep this import if it's used elsewhere

// Define a basic users table as it's referenced by foreign keys
export const users = pgTable("users", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  // Add other common user fields if known, e.g.:
  // name: varchar('name', { length: 255 }),
  // email: varchar('email', { length: 255 }).unique().notNull(),
  // emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
  // image: text('image'),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// Reconstructing sessions table from the fragment
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
    assignedAttorney: uuid("assigned_attorney"), // Foreign key to users.id
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
    aliases: jsonb("aliases").default([]).notNull().$type<string[]>(),
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
    aiTags: jsonb("ai_tags").default([]).notNull().$type<string[]>(),
    createdBy: uuid("created_by"), // Foreign key to users.id
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
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    hash: varchar("hash", { length: 128 }),
    tags: jsonb("tags").default([]).notNull().$type<string[]>(),
    chainOfCustody: jsonb("chain_of_custody").default([]).notNull(), // This might need a specific type if it's an array of objects
    collectedAt: timestamp("collected_at", { mode: "string" }),
    collectedBy: varchar("collected_by", { length: 255 }),
    location: text("location"),
    labAnalysis: jsonb("lab_analysis").default({}).notNull(),
    aiAnalysis: jsonb("ai_analysis").default({}).notNull(),
    aiTags: jsonb("ai_tags").default([]).notNull().$type<string[]>(),
    aiSummary: text("ai_summary"),
    summary: text("summary"),
    isAdmissible: boolean("is_admissible").default(true).notNull(),
    confidentialityLevel: confidentialityEnum("confidentiality_level")
      .default("standard")
      .notNull(),
    canvasPosition: jsonb("canvas_position").default({}).notNull(),
    uploadedBy: uuid("uploaded_by"), // Foreign key to users.id
    uploadedAt: timestamp("uploaded_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    indexes: [
      index("evidence_case_id_idx").on(table.caseId),
      index("evidence_criminal_id_idx").on(table.criminalId),
      index("evidence_type_idx").on(table.evidenceType),
      index("evidence_confidentiality_idx").on(table.confidentialityLevel),
      index("evidence_uploaded_by_idx").on(table.uploadedBy),
      index("evidence_uploaded_at_idx").on(table.uploadedAt),
      index("evidence_hash_idx").on(table.hash),
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

// Define documents table as it's referenced by documentChunks
export const documents = pgTable("documents", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  // Add other relevant fields for a document table
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// === LEGAL DOCUMENT MANAGEMENT ===
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    jurisdiction: varchar("jurisdiction", { length: 100 }),
    court: varchar("court", { length: 200 }),
    citation: varchar("citation", { length: 300 }),
    fullCitation: text("full_citation"),
    docketNumber: varchar("docket_number", { length: 100 }),
    dateDecided: timestamp("date_decided", { mode: "string" }),
    datePublished: timestamp("date_published", { mode: "string" }),
    fullText: text("full_text"),
    content: text("content"),
    summary: text("summary"),
    headnotes: text("headnotes"),
    keywords: jsonb("keywords").default([]).$type<string[]>(),
    topics: jsonb("topics").default([]).$type<string[]>(),
    parties: jsonb("parties").default({}), // This might need a specific type if it's an object
    judges: jsonb("judges").default([]).$type<string[]>(),
    attorneys: jsonb("attorneys").default({}), // This might need a specific type if it's an object
    outcome: varchar("outcome", { length: 100 }),
    precedentialValue: varchar("precedential_value", { length: 50 }),
    url: text("url"),
    pdfUrl: text("pdf_url"),
    westlawId: varchar("westlaw_id", { length: 100 }),
    lexisId: varchar("lexis_id", { length: 100 }),
    caseId: uuid("case_id"), // Foreign key to cases.id
    evidenceId: uuid("evidence_id"), // Foreign key to evidence.id
    isActive: boolean("is_active").default(true),
    isDirty: boolean("is_dirty").default(false),
    lastSavedAt: timestamp("last_saved_at", { mode: "string" }),
    autoSaveData: jsonb("auto_save_data"),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    embedding: text("embedding"), // Vector stored as text, converted in service layer
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `legal_documents_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: `legal_documents_evidence_id_evidence_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `legal_documents_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === CASE ACTIVITIES & TIMELINE ===
export const caseActivities = pgTable(
  "case_activities",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id").notNull(), // Foreign key to cases.id
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    scheduledFor: timestamp("scheduled_for", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    status: activityStatusEnum("status").default("pending").notNull(),
    priority: casePriorityEnum("priority").default("medium").notNull(),
    assignedTo: uuid("assigned_to"), // Foreign key to users.id
    relatedEvidence: jsonb("related_evidence").default([]).notNull().$type<string[]>(),
    relatedCriminals: jsonb("related_criminals").default([]).notNull().$type<string[]>(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.caseId],
        foreignColumns: [cases.id],
        name: "case_activities_case_id_cases_id_fk",
      }).onDelete("cascade"),
      foreignKey({
        columns: [table.assignedTo],
        foreignColumns: [users.id],
        name: "case_activities_assigned_to_users_id_fk",
      }).onDelete("set null"),
      foreignKey({
        columns: [table.createdBy],
        foreignColumns: [users.id],
        name: "case_activities_created_by_users_id_fk",
      }).onDelete("set null"),
    ],
  })
);

// === ATTACHMENT VERIFICATIONS ===
export const attachmentVerifications = pgTable(
  "attachment_verifications",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    attachmentId: uuid("attachment_id").notNull(), // This might be a foreign key to evidence.id or legalDocuments.id
    verifiedBy: uuid("verified_by").notNull(), // Foreign key to users.id
    verificationStatus: verificationStatusEnum("verification_status").default("pending").notNull(),
    verificationNotes: text("verification_notes"),
    verifiedAt: timestamp("verified_at", { mode: "string" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.verifiedBy],
      foreignColumns: [users.id],
      name: `attachment_verifications_verified_by_users_id_fk`,
    }).onDelete("cascade"),
    // Potentially add foreign key for attachmentId if it refers to a specific table, e.g.:
    // foreignKey({ columns: [table.attachmentId], foreignColumns: [evidence.id], name: `attachment_verifications_attachment_id_evidence_id_fk` }).onDelete('cascade'),
  ]
);

// === CANVAS ANNOTATIONS ===
export const canvasAnnotations = pgTable(
  "canvas_annotations",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    evidenceId: uuid("evidence_id"), // Foreign key to evidence.id
    fabricData: jsonb("fabric_data").notNull(),
    annotationType: varchar("annotation_type", { length: 50 }),
    coordinates: jsonb("coordinates"),
    boundingBox: jsonb("bounding_box"),
    text: text("text"),
    color: varchar("color", { length: 20 }),
    layerOrder: integer("layer_order").default(0),
    isVisible: boolean("is_visible").default(true),
    metadata: jsonb("metadata").default({}).notNull(),
    version: integer("version").default(1),
    parentAnnotationId: uuid("parent_annotation_id"), // Self-referencing or to another annotation
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: `canvas_annotations_evidence_id_evidence_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `canvas_annotations_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === CANVAS STATES ===
export const canvasStates = pgTable(
  "canvas_states",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    name: varchar("name", { length: 255 }).notNull(),
    canvasData: jsonb("canvas_data").notNull(),
    version: integer("version").default(1),
    isDefault: boolean("is_default").default(false),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `canvas_states_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `canvas_states_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === AI REPORTS & ANALYSIS ===
export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    reportType: varchar("report_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    richTextContent: jsonb("rich_text_content"),
    metadata: jsonb("metadata").default({}).notNull(),
    canvasElements: jsonb("canvas_elements").default([]).notNull(), // Assuming array of objects
    generatedBy: varchar("generated_by", { length: 100 }).default("gemma3-legal"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.85"),
    isActive: boolean("is_active").default(true),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `ai_reports_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `ai_reports_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === CITATIONS ===
export const citations = pgTable(
  "citations",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    documentId: uuid("document_id"), // Foreign key to legalDocuments.id
    citationType: varchar("citation_type", { length: 50 }).notNull(),
    relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }),
    pageNumber: integer("page_number"),
    pinpointCitation: varchar("pinpoint_citation", { length: 100 }),
    quotedText: text("quoted_text"),
    contextBefore: text("context_before"),
    contextAfter: text("context_after"),
    annotation: text("annotation"),
    legalPrinciple: text("legal_principle"),
    citationFormat: varchar("citation_format", { length: 20 }).default("bluebook"),
    formattedCitation: text("formatted_citation"),
    shepardsTreatment: varchar("shepards_treatment", { length: 50 }),
    isKeyAuthority: boolean("is_key_authority").default(false),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `citations_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [legalDocuments.id],
      name: `citations_document_id_legal_documents_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `citations_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === REPORTS ===
export const reports = pgTable(
  "reports",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    reportType: documentTypeEnum("report_type").default("report"),
    status: reportStatusEnum("status").default("draft"),
    isPublic: boolean("is_public").default(false),
    tags: jsonb("tags").default([]).notNull().$type<string[]>(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `reports_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `reports_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === SAVED REPORTS ===
export const savedReports = pgTable(
  "saved_reports",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    reportType: varchar("report_type", { length: 50 }).notNull(),
    templateId: uuid("template_id"),
    content: jsonb("content").notNull(),
    htmlContent: text("html_content"),
    generatedBy: varchar("generated_by", { length: 50 }).default("manual"),
    aiModel: varchar("ai_model", { length: 50 }),
    aiPrompt: text("ai_prompt"),
    exportFormat: varchar("export_format", { length: 20 }).default("pdf"),
    status: reportStatusEnum("status").default("draft"),
    version: integer("version").default(1),
    wordCount: integer("word_count"),
    tags: jsonb("tags").default([]).$type<string[]>(),
    metadata: jsonb("metadata").default({}),
    sharedWith: jsonb("shared_with").default([]).$type<string[]>(), // Assuming array of user IDs or similar
    lastExported: timestamp("last_exported", { mode: "string" }),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `saved_reports_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `saved_reports_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === THEMES & UI CUSTOMIZATION ===
export const themes = pgTable(
  "themes",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    cssVariables: jsonb("css_variables").notNull(),
    colorPalette: jsonb("color_palette").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `themes_created_by_users_id_fk`,
    }).onDelete("cascade"),
  ]
);

// === PERSONS OF INTEREST ===
export const personsOfInterest = pgTable(
  "persons_of_interest",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    name: varchar("name", { length: 255 }).notNull(),
    aliases: jsonb("aliases").default([]).notNull().$type<string[]>(),
    relationship: varchar("relationship", { length: 100 }),
    threatLevel: threatLevelEnum("threat_level").default("low"),
    status: varchar("status", { length: 20 }).default("active"),
    profileData: jsonb("profile_data").default({}).notNull(),
    tags: jsonb("tags").default([]).notNull().$type<string[]>(),
    position: jsonb("position").default({}).notNull(), // Assuming coordinates or similar
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `persons_of_interest_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `persons_of_interest_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === HASH VERIFICATIONS ===
export const hashVerifications = pgTable(
  "hash_verifications",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    evidenceId: uuid("evidence_id"), // Foreign key to evidence.id
    verifiedHash: varchar("verified_hash", { length: 64 }).notNull(),
    storedHash: varchar("stored_hash", { length: 64 }),
    result: boolean("result").notNull(),
    verificationMethod: varchar("verification_method", { length: 50 }).default("manual"),
    verifiedBy: uuid("verified_by"), // Foreign key to users.id
    verifiedAt: timestamp("verified_at", { mode: "string" }).defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: `hash_verifications_evidence_id_evidence_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.verifiedBy],
      foreignColumns: [users.id],
      name: `hash_verifications_verified_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

// === VECTOR EMBEDDINGS FOR AI SEARCH ===
export const contentEmbeddings = pgTable("content_embeddings", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  contentId: uuid("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  textContent: text("text_content").notNull(),
  embedding: text("embedding"), // Vector stored as text, converted in service layer
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const userEmbeddings = pgTable(
  "user_embeddings",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    userId: uuid("user_id"), // Foreign key to users.id
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: `user_embeddings_user_id_users_id_fk`,
    }).onDelete("cascade"),
  ]
);

export const chatEmbeddings = pgTable("chat_embeddings", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  conversationId: uuid("conversation_id").notNull(),
  messageId: uuid("message_id").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const evidenceVectors = pgTable(
  "evidence_vectors",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    evidenceId: uuid("evidence_id"), // Foreign key to evidence.id
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: `evidence_vectors_evidence_id_evidence_id_fk`,
    }).onDelete("cascade"),
  ]
);

export const caseEmbeddings = pgTable(
  "case_embeddings",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `case_embeddings_case_id_cases_id_fk`,
    }).onDelete("cascade"),
  ]
);

// === RAG (Retrieval Augmented Generation) SESSIONS ===
export const ragSessions = pgTable(
  "rag_sessions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    userId: uuid("user_id"), // Foreign key to users.id
    title: varchar("title", { length: 255 }),
    model: varchar("model", { length: 100 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: `rag_sessions_user_id_users_id_fk`,
    }).onDelete("cascade"),
    unique("rag_sessions_session_id_unique").on(table.sessionId),
  ]
);

export const ragMessages = pgTable(
  "rag_messages",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    sessionId: varchar("session_id", { length: 255 }).notNull(), // Foreign key to ragSessions.sessionId
    messageIndex: integer("message_index").notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    retrievedSources: jsonb("retrieved_sources").default([]).notNull().$type<string[]>(),
    sourceCount: integer("source_count").default(0).notNull(),
    retrievalScore: varchar("retrieval_score", { length: 10 }),
    processingTime: integer("processing_time"),
    model: varchar("model", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.sessionId],
        foreignColumns: [ragSessions.sessionId],
        name: "rag_messages_session_id_rag_sessions_session_id_fk",
      }).onDelete("cascade"),
    ],
  })
);

// === STATUTES ===
export const statutes = pgTable("statutes", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  isActive: boolean("is_active").default(true),
  penalties: jsonb("penalties").default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// === LEGAL PRECEDENTS ===
export const legalPrecedents = pgTable("legal_precedents", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  caseTitle: varchar("case_title", { length: 255 }).notNull(),
  citation: varchar("citation", { length: 255 }).notNull(),
  court: varchar("court", { length: 100 }),
  year: integer("year"),
  jurisdiction: varchar("jurisdiction", { length: 50 }),
  summary: text("summary"),
  fullText: text("full_text"),
  embedding: text("embedding"),
  relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }),
  legalPrinciples: jsonb("legal_principles").default([]).notNull().$type<string[]>(),
  linkedCases: jsonb("linked_cases").default([]).notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// === LEGAL ANALYSIS SESSIONS ===
export const legalAnalysisSessions = pgTable(
  "legal_analysis_sessions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    userId: uuid("user_id"), // Foreign key to users.id
    sessionType: varchar("session_type", { length: 50 }).default("case_analysis"),
    analysisPrompt: text("analysis_prompt"),
    analysisResult: text("analysis_result"),
    confidenceLevel: numeric("confidence_level", { precision: 3, scale: 2 }),
    sourcesUsed: jsonb("sources_used").default([]).notNull().$type<string[]>(),
    model: varchar("model", { length: 100 }).default("gemma3-legal"),
    processingTime: integer("processing_time"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `legal_analysis_sessions_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: `legal_analysis_sessions_user_id_users_id_fk`,
    }).onDelete("cascade"),
  ]
);

// === LEGAL RESEARCH ===
export const legalResearch = pgTable(
  "legal_research",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    caseId: uuid("case_id"), // Foreign key to cases.id
    query: text("query").notNull(),
    searchTerms: jsonb("search_terms").default([]).$type<string[]>(),
    jurisdiction: varchar("jurisdiction", { length: 100 }),
    dateRange: jsonb("date_range"),
    courtLevel: varchar("court_level", { length: 50 }),
    practiceArea: varchar("practice_area", { length: 100 }),
    resultsCount: integer("results_count").default(0),
    searchResults: jsonb("search_results").default([]), // Array of objects
    aiSummary: text("ai_summary"),
    keyFindings: jsonb("key_findings").default([]).$type<string[]>(),
    recommendedCitations: jsonb("recommended_citations").default([]).$type<string[]>(),
    searchDuration: integer("search_duration"),
    dataSource: varchar("data_source", { length: 50 }),
    isBookmarked: boolean("is_bookmarked").default(false),
    createdBy: uuid("created_by"), // Foreign key to users.id
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: `legal_research_case_id_cases_id_fk`,
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: `legal_research_created_by_users_id_fk`,
    }).onDelete("set null"),
  ]
);

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
export const caseRiskLevelEnum = pgEnum("case_risk_level", [
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
]);

export const caseScores = pgTable(
  "case_scores",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    // Foreign key to users.id; who performed the calculation (nullable to allow on delete set null)
    calculatedBy: uuid("calculated_by"),
    caseId: uuid("case_id").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    riskLevel: caseRiskLevelEnum("risk_level").notNull(),
    breakdown: jsonb("breakdown").default({}).notNull(),
    criteria: jsonb("criteria").default({}).notNull(),
    recommendations: jsonb("recommendations").default([]).notNull().$type<string[]>(),
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

// caseId is optional: set to a valid case UUID when the AI query is associated with a specific case,
// or leave as null for general queries not tied to any case.

// Polymorphic association: entityId can reference multiple tables.
// Supported entityType values and corresponding tables:
// autoTags confirmation workflow:
// - isConfirmed: boolean, true if the tag has been manually confirmed by a user.
// - confirmedBy: UUID of the user who confirmed the tag (nullable, foreign key to users).
// - confirmedAt: timestamp when the tag was confirmed (nullable).
// When isConfirmed is true, confirmedBy and confirmedAt should be set to indicate who confirmed and when.

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
    userId: uuid("user_id").notNull(),
    caseId: uuid("case_id"),
    query: text("query").notNull(),
    response: text("response").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    queryType: varchar("query_type", { length: 50 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    processingTime: integer("processing_time"), // in ms
    contextUsed: jsonb("context_used").default([]).$type<string[]>(),
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
    confirmedBy: uuid("confirmed_by"), // FK to users.id
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

// === DOCUMENT CHUNKS ===
export const documentChunksTable = pgTable(
  "document_chunks",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    documentId: uuid("document_id").notNull(),
    documentType: varchar("document_type", { length: 50 }).notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: text("embedding"), // Vector stored as text
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    foreignKeys: [
      foreignKey({
        columns: [table.documentId],
        foreignColumns: [documents.id],
        name: "document_chunks_document_id_documents_id_fk",
      }).onDelete("cascade"),
    ],
    indexes: [index("idx_docchunks_document_id").on(table.documentId)],
  })
);

// === VECTOR OUTBOX ===
export const vectorOutbox = pgTable('vector_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerType: varchar('owner_type', { length: 256 }).notNull(),
  ownerId: varchar('owner_id', { length: 256 }).notNull(),
  event: varchar('event', { length: 256 }).notNull(),
  vector: text('vector'), // Storing vector as text, consider pgvector type if available
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vectorJobs = pgTable('vector_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { enum: ['pending', 'processing', 'success', 'failed'] }).notNull(),
  progress: integer('progress').default(0).notNull(),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Corrected schema export to include all defined tables
export const schema = {
  users,
  sessions,
  emailVerificationCodes,
  passwordResetTokens,
  cases,
  criminals,
  evidence,
  legalDocuments,
  caseActivities,
  attachmentVerifications,
  canvasAnnotations,
  canvasStates,
  aiReports,
  citations,
  reports,
  savedReports,
  themes,
  personsOfInterest,
  hashVerifications,
  contentEmbeddings,
  userEmbeddings,
  chatEmbeddings,
  evidenceVectors,
  caseEmbeddings,
  ragSessions,
  ragMessages,
  statutes,
  legalPrecedents,
  legalAnalysisSessions,
  legalResearch,
  vectorMetadata,
  caseScores,
  embeddingCache,
  documents,
  documentChunks: documentChunksTable,
  userAiQueries: userAiQueriesTable,
  autoTags: autoTagsTable,
  canvasAutosaves,
};

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  // casesAsLead: many(cases, { relationName: 'leadProsecutor' }), // 'leadProsecutor' column does not exist in cases
  // casesCreated: many(cases, { relationName: 'createdBy' }), // 'createdBy' column does not exist in cases
  sessions: many(sessions),
  emailVerificationCodes: many(emailVerificationCodes),
  passwordResetTokens: many(passwordResetTokens),
  criminalsCreated: many(criminals),
  evidenceUploaded: many(evidence),
  legalDocumentsCreated: many(legalDocuments),
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
  legalResearchCreated: many(legalResearch),
  caseScoresCalculated: many(caseScores),
  userAiQueries: many(userAiQueriesTable),
  autoTagsConfirmed: many(autoTagsTable),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
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

export const legalDocumentsRelations = relations(legalDocuments, ({ one, many }) => ({
  case: one(cases, { fields: [legalDocuments.caseId], references: [cases.id] }),
  evidence: one(evidence, { fields: [legalDocuments.evidenceId], references: [evidence.id] }),
  createdBy: one(users, { fields: [legalDocuments.createdBy], references: [users.id] }),
  citations: many(citations),
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

export const aiReportsRelations = relations(aiReports, ({ one }) => ({
  case: one(cases, { fields: [aiReports.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [aiReports.createdBy], references: [users.id] }),
}));

export const personsOfInterestRelations = relations(personsOfInterest, ({ one }) => ({
  case: one(cases, { fields: [personsOfInterest.caseId], references: [cases.id] }),
  createdBy: one(users, { fields: [personsOfInterest.createdBy], references: [users.id] }),
}));

export const ragSessionsRelations = relations(ragSessions, ({ one, many }) => ({
  user: one(users, { fields: [ragSessions.userId], references: [users.id] }),
  messages: many(ragMessages),
}));

export const userAiQueriesRelations = relations(userAiQueriesTable, ({ one }) => ({
  user: one(users, { fields: [userAiQueriesTable.userId], references: [users.id] }),
  case: one(cases, { fields: [userAiQueriesTable.caseId], references: [cases.id] }),
}));

export const documentChunksRelations = relations(documentChunksTable, ({ one }) => ({
  document: one(documents, { fields: [documentChunksTable.documentId], references: [documents.id] }),
}));

// === DATABASE CONNECTION & HELPERS ===
// Export commonly used query helpers for consistency
// Keep helpers minimal here to avoid importing unavailable symbols in this environment.
export const helpers = { sql };
