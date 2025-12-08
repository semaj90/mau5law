-- Phase 78 Safe Upgrade Migration
-- Date: 2025-12-07
-- Purpose: Add Phase 78 Error Brain tables and enhance existing schema
--          WITHOUT truncating or dropping existing data
--
-- Safety: This migration is additive-only. New columns are nullable by default.
-- If you want to tighten constraints later (NOT NULL, UNIQUE), use a separate migration.

-- ============================================================================
-- 1. Create Phase 78 Error Tracking Tables (if not exists)
-- ============================================================================

-- error_clusters: Groups similar errors from CUDA clustering
CREATE TABLE IF NOT EXISTS "error_clusters" (
  "id" text PRIMARY KEY,
  "error_pattern" text NOT NULL,
  "description" text,
  "severity" text NOT NULL DEFAULT 'medium',
  "member_count" integer NOT NULL DEFAULT 1,
  "centroid_vector" text,
  "silhouette_score" text,
  "suggested_category" text,
  "suggested_fix_approach" text,
  "last_seen_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "error_clusters_severity_idx" ON "error_clusters" USING btree ("severity");
CREATE INDEX IF NOT EXISTS "error_clusters_category_idx" ON "error_clusters" USING btree ("suggested_category");
CREATE INDEX IF NOT EXISTS "error_clusters_created_at_idx" ON "error_clusters" USING btree ("created_at");

-- route_error_patches: Proposed or applied patches for route errors
CREATE TABLE IF NOT EXISTS "route_error_patches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "route_path" text NOT NULL,
  "file_path" text NOT NULL,
  "cluster_id" text,
  "patch_content" text NOT NULL,
  "description" text,
  "risk_level" text NOT NULL DEFAULT 'medium',
  "affected_component_count" text,
  "status" text NOT NULL DEFAULT 'proposed',
  "applied_at" timestamp with time zone,
  "applied_by_user_id" text,
  "created_by_user_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "route_error_patches_route_path_idx" ON "route_error_patches" USING btree ("route_path");
CREATE INDEX IF NOT EXISTS "route_error_patches_cluster_id_idx" ON "route_error_patches" USING btree ("cluster_id");
CREATE INDEX IF NOT EXISTS "route_error_patches_status_idx" ON "route_error_patches" USING btree ("status");
CREATE INDEX IF NOT EXISTS "route_error_patches_created_at_idx" ON "route_error_patches" USING btree ("created_at");

-- error_feedback: User feedback on error classifications and suggestions
CREATE TABLE IF NOT EXISTS "error_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "error_event_id" uuid,
  "cluster_id" text,
  "patch_id" uuid,
  "feedback_type" text NOT NULL,
  "feedback_text" text,
  "rating" text,
  "user_id" text,
  "user_role" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "error_feedback_error_event_id_idx" ON "error_feedback" USING btree ("error_event_id");
CREATE INDEX IF NOT EXISTS "error_feedback_cluster_id_idx" ON "error_feedback" USING btree ("cluster_id");
CREATE INDEX IF NOT EXISTS "error_feedback_patch_id_idx" ON "error_feedback" USING btree ("patch_id");
CREATE INDEX IF NOT EXISTS "error_feedback_user_id_idx" ON "error_feedback" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "error_feedback_type_idx" ON "error_feedback" USING btree ("feedback_type");
CREATE INDEX IF NOT EXISTS "error_feedback_created_at_idx" ON "error_feedback" USING btree ("created_at");

-- error_timeline: Temporal tracking of error patterns
CREATE TABLE IF NOT EXISTS "error_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "route_path" text NOT NULL,
  "cluster_id" text NOT NULL,
  "time_window" text NOT NULL,
  "window_duration" text NOT NULL DEFAULT 'PT1H',
  "error_count" text NOT NULL DEFAULT '0',
  "unique_error_types" text NOT NULL DEFAULT '0',
  "avg_severity" text,
  "previous_health_state" text,
  "current_health_state" text,
  "state_changed" text DEFAULT 'false',
  "trend_direction" text,
  "trend_score" text,
  "data_collected_at" timestamp with time zone NOT NULL DEFAULT now(),
  "notes" text
);

CREATE INDEX IF NOT EXISTS "error_timeline_route_path_idx" ON "error_timeline" USING btree ("route_path");
CREATE INDEX IF NOT EXISTS "error_timeline_cluster_id_idx" ON "error_timeline" USING btree ("cluster_id");
CREATE INDEX IF NOT EXISTS "error_timeline_time_window_idx" ON "error_timeline" USING btree ("time_window");
CREATE INDEX IF NOT EXISTS "error_timeline_health_state_idx" ON "error_timeline" USING btree ("current_health_state");
CREATE INDEX IF NOT EXISTS "error_timeline_data_collected_at_idx" ON "error_timeline" USING btree ("data_collected_at");

-- ============================================================================
-- 2. Add Phase 78 columns to existing tables (if not exists)
-- ============================================================================

-- Enhance error_events with clustering references
ALTER TABLE IF EXISTS "error_events"
  ADD COLUMN IF NOT EXISTS "cluster_pattern" text;

ALTER TABLE IF EXISTS "error_events"
  ADD COLUMN IF NOT EXISTS "embedding_confidence" numeric;

-- Enhance route_health with Phase 78 tracking
ALTER TABLE IF EXISTS "route_health"
  ADD COLUMN IF NOT EXISTS "error_cluster_history" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS "route_health"
  ADD COLUMN IF NOT EXISTS "last_patch_applied_at" timestamp with time zone;

-- Enhance error_suggestions for better tracking
ALTER TABLE IF EXISTS "error_suggestions"
  ADD COLUMN IF NOT EXISTS "cluster_id" text;

ALTER TABLE IF EXISTS "error_suggestions"
  ADD COLUMN IF NOT EXISTS "llm_model" varchar(100);

ALTER TABLE IF EXISTS "error_suggestions"
  ADD COLUMN IF NOT EXISTS "confidence_score" numeric;

-- ============================================================================
-- 3. Add safe foreign key constraints (wrapped to prevent duplicates)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE "error_feedback"
    ADD CONSTRAINT "error_feedback_event_id_error_events_id_fk"
    FOREIGN KEY ("error_event_id")
    REFERENCES "public"."error_events"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "route_error_patches"
    ADD CONSTRAINT "route_error_patches_cluster_id_error_clusters_id_fk"
    FOREIGN KEY ("cluster_id")
    REFERENCES "public"."error_clusters"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "error_timeline"
    ADD CONSTRAINT "error_timeline_cluster_id_error_clusters_id_fk"
    FOREIGN KEY ("cluster_id")
    REFERENCES "public"."error_clusters"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "error_suggestions"
    ADD CONSTRAINT "error_suggestions_cluster_id_error_clusters_id_fk"
    FOREIGN KEY ("cluster_id")
    REFERENCES "public"."error_clusters"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. Safe unique constraints (wrapped to prevent duplicates)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE "route_health"
    ADD CONSTRAINT "route_health_route_path_unique"
    UNIQUE ("route_path");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. Backfill Phase 78 columns with sensible defaults (optional)
-- ============================================================================

-- If you want to set defaults for existing error_events rows:
-- UPDATE "error_events"
-- SET "cluster_pattern" = 'uncategorized'
-- WHERE "cluster_pattern" IS NULL;

-- UPDATE "error_events"
-- SET "embedding_confidence" = 0.5
-- WHERE "embedding_confidence" IS NULL;

-- ============================================================================
-- DONE: All tables, indexes, and constraints are now in place.
-- Your existing data is preserved. Phase 78 Error Brain tables are ready.
-- ============================================================================
