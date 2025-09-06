import { pgTable, text, timestamp, uuid, jsonb, real } from "drizzle-orm/pg-core";


export const aiHistory = pgTable("ai_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  prompt: text("prompt"),
  response: text("response"),
  embedding: text("embedding"), // Vector embeddings stored as text
  createdAt: timestamp("created_at").defaultNow(),
});

export const errorLogs = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  embedding: real("embedding").array(), // pg_vector stores embeddings as real[]
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const indexedFiles = pgTable("indexed_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filePath: text("file_path").notNull().unique(), // Store the absolute file path
  content: text("content"), // Full content of the file
  embedding: real("embedding").array(), // Vector embedding of the file content
  summary: text("summary"), // AI-generated summary of the file
  metadata: jsonb("metadata"), // Additional metadata (e.g., size, modTime)
  indexedAt: timestamp("indexed_at").defaultNow(),
});
