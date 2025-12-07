-- ============================================================
-- Phase 90 Migration: Add Lifecycle Tracking Columns
-- STRATEGY: Additive only - no DROP operations
-- SAFETY: All columns nullable or with defaults (no data loss)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Evidence Table: Add Phase 90 Lifecycle Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE "evidence"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_collection" text,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_sync_error" text;

-- Indexes for Phase 90 workers
CREATE INDEX IF NOT EXISTS "evidence_is_active_idx"
  ON "evidence" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "evidence_qdrant_pending_idx"
  ON "evidence" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

-- ────────────────────────────────────────────────────────────
-- Legal Documents: Add Phase 90 Lifecycle Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE "legal_documents"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_model" text,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_collection" text DEFAULT 'legal_documents',
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_sync_error" text;

-- Indexes
CREATE INDEX IF NOT EXISTS "legal_documents_is_active_idx"
  ON "legal_documents" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "legal_documents_qdrant_pending_idx"
  ON "legal_documents" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

-- ────────────────────────────────────────────────────────────
-- Document Chunks: Add Phase 90 Lifecycle Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE "document_chunks"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_model" text,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_collection" text DEFAULT 'legal_documents',
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_sync_error" text;

-- Indexes
CREATE INDEX IF NOT EXISTS "document_chunks_is_active_idx"
  ON "document_chunks" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "document_chunks_embedding_pending_idx"
  ON "document_chunks" ("embedding_updated_at")
  WHERE "is_active" = true AND "embedding" IS NULL;

CREATE INDEX IF NOT EXISTS "document_chunks_qdrant_pending_idx"
  ON "document_chunks" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

-- ────────────────────────────────────────────────────────────
-- Cases: Add Audit Trail Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "created_by" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "updated_by" integer REFERENCES "users"("id");

CREATE INDEX IF NOT EXISTS "cases_is_active_idx"
  ON "cases" ("is_active", "deleted_at");

-- ────────────────────────────────────────────────────────────
-- Users: Add Audit Trail Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "created_by" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "updated_by" integer REFERENCES "users"("id");

CREATE INDEX IF NOT EXISTS "users_is_active_idx"
  ON "users" ("is_active", "deleted_at");

-- ────────────────────────────────────────────────────────────
-- Phase 72 Error Vector: Add Lifecycle Columns (768d)
-- ────────────────────────────────────────────────────────────
ALTER TABLE "phase72_error_vector"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_model" text,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_collection" text DEFAULT 'phase72_errors',
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_sync_error" text;

-- Indexes
CREATE INDEX IF NOT EXISTS "phase72_error_vector_is_active_idx"
  ON "phase72_error_vector" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "phase72_error_vector_qdrant_pending_idx"
  ON "phase72_error_vector" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

-- ────────────────────────────────────────────────────────────
-- Migration Metadata
-- ────────────────────────────────────────────────────────────
-- Record this migration in your audit log
-- (If you have a migrations table, add a row here)

COMMENT ON COLUMN "evidence"."is_active" IS 'Phase 90: Soft delete flag (never hard delete)';
COMMENT ON COLUMN "evidence"."version" IS 'Phase 90: Content version (bump on change)';
COMMENT ON COLUMN "evidence"."content_hash" IS 'Phase 90: SHA256 hash of content (detect changes)';
COMMENT ON COLUMN "evidence"."deleted_at" IS 'Phase 90: Soft delete timestamp';
COMMENT ON COLUMN "evidence"."qdrant_synced_at" IS 'Phase 90: Last sync to Qdrant';

-- ============================================================
-- SAFETY VERIFICATION QUERIES
-- Run these AFTER migration to verify no data loss:
-- ============================================================

-- 1. Check all tables have same row counts (before vs after)
-- SELECT 'evidence' AS table_name, COUNT(*) FROM evidence
-- UNION ALL
-- SELECT 'legal_documents', COUNT(*) FROM legal_documents
-- UNION ALL
-- SELECT 'document_chunks', COUNT(*) FROM document_chunks;

-- 2. Verify all new columns are nullable or have defaults
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('evidence', 'legal_documents', 'document_chunks')
--   AND column_name IN ('is_active', 'version', 'content_hash', 'deleted_at');

-- 3. Check no rows were deleted (all should have is_active=true by default)
-- SELECT COUNT(*) AS should_be_zero FROM evidence WHERE is_active = false;
-- SELECT COUNT(*) AS should_be_zero FROM legal_documents WHERE is_active = false;
