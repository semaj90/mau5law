// @ts-nocheck
// Additional schema for interactive canvas with reports and POIs
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  boolean,
  decimal,
  serial,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, cases } from "./schema-postgres";

// === REPORTS & DOCUMENTS ===
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 256 }).default("Untitled Report").notNull(),

  // Store the structured JSON from HugerTE/Slate.js rich text editor
  content: jsonb("content").default({}).notNull(),

  // Store the position and size of the node on the canvas
  posX: real("pos_x").default(50).notNull(),
  posY: real("pos_y").default(50).notNull(),
  width: real("width").default(650).notNull(),
  height: real("height").default(450).notNull(),

  // Report metadata
  reportType: varchar("report_type", { length: 50 })
    .default("investigation")
    .notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  tags: jsonb("tags").default([]).notNull(),
  aiSummary: text("ai_summary"),

  // Timestamps and ownership
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === PERSONS OF INTEREST (POIs) ===
export const personsOfInterest = pgTable("persons_of_interest", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),

  // Basic information
  name: varchar("name", { length: 256 }).notNull(),
  aliases: jsonb("aliases").default([]).notNull(),
  profileImageUrl: text("profile_image_url"),

  // The structured "Who, What, Why, How" profile data
  profileData: jsonb("profile_data")
    .default({
      who: "",
      what: "",
      why: "",
      how: "",
    })
    .notNull(),

  // Position on canvas
  posX: real("pos_x").default(100).notNull(),
  posY: real("pos_y").default(100).notNull(),

  // POI metadata
  relationship: varchar("relationship", { length: 100 }), // e.g., 'suspect', 'witness', 'victim', 'co-conspirator'
  threatLevel: varchar("threat_level", { length: 20 }).default("low").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  tags: jsonb("tags").default([]).notNull(),

  // Timestamps and ownership
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === CANVAS CONNECTIONS (for linking evidence, reports, POIs) ===
export const canvasConnections = pgTable("canvas_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),

  // Source and target nodes
  sourceId: uuid("source_id").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'report', 'evidence', 'poi'
  targetId: uuid("target_id").notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'report', 'evidence', 'poi'

  // Connection metadata
  connectionType: varchar("connection_type", { length: 50 })
    .default("related")
    .notNull(),
  description: text("description"),
  strength: varchar("strength", { length: 20 }).default("medium").notNull(), // 'weak', 'medium', 'strong'
  confidence: varchar("confidence", { length: 20 })
    .default("inferred")
    .notNull(), // 'confirmed', 'likely', 'inferred'

  // Visual properties for the connection line
  lineStyle: jsonb("line_style")
    .default({
      color: "#007bff",
      thickness: 2,
      style: "solid",
    })
    .notNull(),

  // Timestamps and ownership
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === CANVAS LAYOUTS (for saving different views of the same case) ===
export const canvasLayouts = pgTable("canvas_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),

  // Canvas view state
  viewport: jsonb("viewport")
    .default({
      x: 0,
      y: 0,
      zoom: 1,
    })
    .notNull(),

  // Layout settings
  layoutData: jsonb("layout_data").default({}).notNull(),

  // Timestamps and ownership
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === CANVAS ANNOTATIONS (for drawing/highlighting on the canvas itself) ===
export const canvasAnnotations = pgTable("canvas_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),

  // Fabric.js canvas state for drawings, highlights, etc.
  annotationData: jsonb("annotation_data").notNull(),
  annotationType: varchar("annotation_type", { length: 50 }).notNull(), // 'drawing', 'highlight', 'text'

  // Position and bounds
  bounds: jsonb("bounds").notNull(), // { x, y, width, height }

  // Annotation metadata
  title: varchar("title", { length: 255 }),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#ffff00").notNull(),

  // Timestamps and ownership
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// === AI SUMMARIES (for tracking AI-generated content) ===
export const aiSummaries = pgTable("ai_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),

  // What was summarized
  sourceId: uuid("source_id").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'report', 'evidence', 'poi', 'case'

  // AI summary data
  summary: text("summary").notNull(),
  model: varchar("model", { length: 100 }), // e.g., 'gemma3-legal'
  prompt: text("prompt"),

  // Summary metadata
  summaryType: varchar("summary_type", { length: 50 })
    .default("general")
    .notNull(),
  confidence: real("confidence"), // 0.0 to 1.0
  processingTime: integer("processing_time"), // milliseconds

  // Timestamps and ownership
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// === RELATIONS ===

export const reportsRelations = relations(reports, ({ one }) => ({
  case: one(cases, {
    fields: [reports.caseId],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [reports.createdBy],
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
  }),
);

export const canvasConnectionsRelations = relations(
  canvasConnections,
  ({ one }) => ({
    case: one(cases, {
      fields: [canvasConnections.caseId],
      references: [cases.id],
    }),
    createdBy: one(users, {
      fields: [canvasConnections.createdBy],
      references: [users.id],
    }),
  }),
);

export const canvasLayoutsRelations = relations(canvasLayouts, ({ one }) => ({
  case: one(cases, {
    fields: [canvasLayouts.caseId],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [canvasLayouts.createdBy],
    references: [users.id],
  }),
}));

export const canvasAnnotationsRelations = relations(
  canvasAnnotations,
  ({ one }) => ({
    case: one(cases, {
      fields: [canvasAnnotations.caseId],
      references: [cases.id],
    }),
    createdBy: one(users, {
      fields: [canvasAnnotations.createdBy],
      references: [users.id],
    }),
  }),
);

export const aiSummariesRelations = relations(aiSummaries, ({ one }) => ({
  requestedBy: one(users, {
    fields: [aiSummaries.requestedBy],
    references: [users.id],
  }),
}));
