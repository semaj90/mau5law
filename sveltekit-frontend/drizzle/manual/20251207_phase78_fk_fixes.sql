-- ============================================================================
-- Phase 78 FK Fixes - Safe Foreign Key Constraint Repairs
-- ============================================================================
-- This script safely fixes two FK issues from the initial Phase 78 migration:
-- 1. route_error_patches.created_by type mismatch (integer → uuid)
-- 2. error_events.cluster_id missing (needs to be added)
--
-- These fixes are IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- Fix #1: Normalize route_error_patches.created_by to uuid
-- ============================================================================
-- Problem: created_by is integer but users.id is uuid
-- Solution: Convert created_by to uuid and null existing values
-- ============================================================================

DO $$
BEGIN
  -- Check if created_by is still integer type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'route_error_patches'
      AND column_name = 'created_by'
      AND data_type = 'integer'
  ) THEN
    -- Allow nulls before type change
    ALTER TABLE "route_error_patches"
      ALTER COLUMN "created_by" DROP NOT NULL;

    -- Drop old integer values and convert column to uuid
    ALTER TABLE "route_error_patches"
      ALTER COLUMN "created_by" TYPE uuid
      USING NULL;

    RAISE NOTICE 'route_error_patches.created_by converted to uuid';
  ELSE
    RAISE NOTICE 'route_error_patches.created_by already uuid or missing';
  END IF;
END $$;

-- Add FK from route_error_patches.created_by → users.id (idempotent)
DO $$
BEGIN
  ALTER TABLE "route_error_patches"
    ADD CONSTRAINT "route_error_patches_created_by_users_id_fk"
    FOREIGN KEY ("created_by")
    REFERENCES "users"("id")
    ON DELETE SET NULL;
  RAISE NOTICE 'FK constraint route_error_patches_created_by_users_id_fk created';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'FK constraint route_error_patches_created_by_users_id_fk already exists';
END $$;

-- ============================================================================
-- Fix #2: Add error_events.cluster_id column if missing
-- ============================================================================
-- Problem: error_events.cluster_id referenced in FK but column doesn't exist
-- Solution: Add column as nullable uuid, then add FK
-- ============================================================================

ALTER TABLE "error_events"
  ADD COLUMN IF NOT EXISTS "cluster_id" uuid;

-- Add FK from error_events.cluster_id → error_clusters.id (idempotent)
DO $$
BEGIN
  ALTER TABLE "error_events"
    ADD CONSTRAINT "error_events_cluster_id_error_clusters_id_fk"
    FOREIGN KEY ("cluster_id")
    REFERENCES "error_clusters"("id")
    ON DELETE SET NULL;
  RAISE NOTICE 'FK constraint error_events_cluster_id_error_clusters_id_fk created';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'FK constraint error_events_cluster_id_error_clusters_id_fk already exists';
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Show final state of constraints
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND (table_name = 'route_error_patches' OR table_name = 'error_events')
    AND constraint_type = 'FOREIGN KEY'
    AND (constraint_name LIKE '%created_by%' OR constraint_name LIKE '%cluster_id%');

  RAISE NOTICE 'Phase 78 FK fixes complete. % FK constraints verified.', fk_count;
END $$;
