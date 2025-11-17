import {
  pgTable, uuid, text, jsonb, timestamp, vector, real
} from "drizzle-orm/pg-core";

export const persons = pgTable("persons", {
  id: uuid("id").defaultRandom().primaryKey(),

  caseId: uuid("case_id").notNull(),
  name: text("name").notNull(),
  alias: text("alias"),
  notes: text("notes"),

  threatLevel: text("threat_level").default("unknown"), // low / medium / high / critical

  photos: jsonb("photos").$type // TODO: Verify store subscription is correct for Svelte 5<Array<{
    url: string;
    thumbnailUrl: string;
    metadata: {
      exif?: Record<string, any>;
      gps?: { lat: number; lng: number } | null;
      timestamp?: string | null;
      device?: string | null;
    };
    ai?: {
      faceEmbedding?: number[];       // stored as vector too
      qualityScore?: number;
      tags?: string[];
    };
  }>>(),

  faceEmbedding: vector("face_embedding", { dimensions: 768 }),

  createdAt: timestamp("created_at").defaultNow(),
});

// Evidence board nodes
export const evidenceNodes = pgTable("evidence_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull(),
  type: text("type").notNull(), // poi, evidence, statement, theory
  title: text("title").notNull(),
  content: text("content"),
  position: jsonb("position").$type // TODO: Verify store subscription is correct for Svelte 5<{x: number, y: number}>(),
  connections: jsonb("connections").$type // TODO: Verify store subscription is correct for Svelte 5<Array<string>>(), // node IDs
  metadata: jsonb("metadata"),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Victim statements
export const victimStatements = pgTable("victim_statements", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull(),
  victimId: uuid("victim_id"),
  who: text("who"),
  what: text("what"),
  why: text("why"),
  how: text("how"),
  when: text("when"),
  where: text("where"),
  contradictions: jsonb("contradictions"),
  aiRefined: jsonb("ai_refined"),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Case theories
export const caseTheories = pgTable("case_theories", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull(),
  title: text("title").notNull(),
  hypothesis: text("hypothesis"),
  motive: text("motive"),
  means: text("means"),
  opportunity: text("opportunity"),
  contradictions: jsonb("contradictions"),
  missingEvidence: jsonb("missing_evidence"),
  aiRecommendations: jsonb("ai_recommendations"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video evidence
export const videoEvidence = pgTable("video_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull(),
  filename: text("filename").notNull(),
  minioKey: text("minio_key").notNull(),
  transcription: text("transcription"),
  segments: jsonb("segments").$type // TODO: Verify store subscription is correct for Svelte 5<Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
    critical?: boolean;
  }>>(),
  metadata: jsonb("metadata"),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at").defaultNow(),
});