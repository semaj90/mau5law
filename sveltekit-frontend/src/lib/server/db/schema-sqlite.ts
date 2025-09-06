// @ts-nocheck
// SQLite schema for development
import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// === AUTHENTICATION & USER MANAGEMENT ===

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: text("email_verified"), // ISO string
  hashedPassword: text("hashed_password"),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("prosecutor").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

// === CASE MANAGEMENT ===

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  title: text("title").notNull(),
  name: text("name"), // Alias for title
  description: text("description"),
  incidentDate: text("incident_date"), // ISO string
  location: text("location"),
  priority: text("priority").default("medium").notNull(),
  status: text("status").default("open").notNull(),
  category: text("category"),
  dangerScore: integer("danger_score").default(0).notNull(),
  estimatedValue: real("estimated_value"),
  jurisdiction: text("jurisdiction"),
  leadProsecutor: text("lead_prosecutor"),
  assignedTeam: text("assigned_team").default("[]").notNull(), // JSON string
  tags: text("tags").default("[]").notNull(), // JSON string
  aiSummary: text("ai_summary"),
  aiTags: text("ai_tags").default("[]").notNull(), // JSON string
  metadata: text("metadata").default("{}").notNull(), // JSON string
  createdBy: text("created_by"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
  closedAt: text("closed_at"),
});

// === CRIMINAL RECORDS ===

export const criminals = sqliteTable("criminals", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  aliases: text("aliases").default("[]").notNull(), // JSON string
  dateOfBirth: text("date_of_birth"),
  placeOfBirth: text("place_of_birth"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  socialSecurityNumber: text("ssn"),
  driversLicense: text("drivers_license"),
  height: integer("height"),
  weight: integer("weight"),
  eyeColor: text("eye_color"),
  hairColor: text("hair_color"),
  distinguishingMarks: text("distinguishing_marks"),
  photoUrl: text("photo_url"),
  fingerprints: text("fingerprints").default("{}").notNull(), // JSON string
  threatLevel: text("threat_level").default("low").notNull(),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
  aiSummary: text("ai_summary"),
  aiTags: text("ai_tags").default("[]").notNull(), // JSON string
  createdBy: text("created_by"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

// === EVIDENCE MANAGEMENT ===

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  caseId: text("case_id"),
  criminalId: text("criminal_id"),
  title: text("title").notNull(),
  description: text("description"),
  evidenceType: text("evidence_type").notNull(),
  fileType: text("file_type"), // Alias for evidenceType
  subType: text("sub_type"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  hash: text("hash"),
  tags: text("tags").default("[]").notNull(), // JSON string
  chainOfCustody: text("chain_of_custody").default("[]").notNull(), // JSON string
  collectedAt: text("collected_at"),
  collectedBy: text("collected_by"),
  location: text("location"),
  labAnalysis: text("lab_analysis").default("{}").notNull(), // JSON string
  aiAnalysis: text("ai_analysis").default("{}").notNull(), // JSON string
  aiTags: text("ai_tags").default("[]").notNull(), // JSON string
  aiSummary: text("ai_summary"),
  summary: text("summary"),
  isAdmissible: integer("is_admissible", { mode: "boolean" })
    .default(true)
    .notNull(),
  confidentialityLevel: text("confidentiality_level")
    .default("standard")
    .notNull(),
  canvasPosition: text("canvas_position").default("{}").notNull(), // JSON string
  uploadedBy: text("uploaded_by"),
  uploadedAt: text("uploaded_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

// === CASE ACTIVITIES & TIMELINE ===

export const caseActivities = sqliteTable("case_activities", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledFor: text("scheduled_for"),
  completedAt: text("completed_at"),
  status: text("status").default("pending").notNull(),
  priority: text("priority").default("medium").notNull(),
  assignedTo: text("assigned_to"),
  relatedEvidence: text("related_evidence").default("[]").notNull(), // JSON string
  relatedCriminals: text("related_criminals").default("[]").notNull(), // JSON string
  metadata: text("metadata").default("{}").notNull(), // JSON string
  createdBy: text("created_by"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

// === RELATIONSHIPS ===

export const usersRelations = relations(users, ({ many }) => ({
  casesAsLead: many(cases, { relationName: "leadProsecutor" }),
  casesCreated: many(cases, { relationName: "createdBy" }),
  evidenceUploaded: many(evidence),
  activitiesAssigned: many(caseActivities, { relationName: "assignedTo" }),
  activitiesCreated: many(caseActivities, { relationName: "createdBy" }),
  criminalsCreated: many(criminals),
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
