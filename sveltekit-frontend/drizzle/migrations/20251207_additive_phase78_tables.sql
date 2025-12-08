-- Phase 78 - Additive-Only Migration (No Data Loss)
-- Creates missing Error Brain tables without touching existing ones
-- Safe to run multiple times (idempotent)

-- 1. Ensure required enums exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patch_status') THEN
        CREATE TYPE "patch_status" AS ENUM ('suggested', 'applied', 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_health_state') THEN
        CREATE TYPE "route_health_state" AS ENUM ('healthy', 'flaky', 'broken');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'error_severity') THEN
        CREATE TYPE "error_severity" AS ENUM ('info', 'warn', 'error', 'fatal');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'error_kind') THEN
        CREATE TYPE "error_kind" AS ENUM ('typescript', 'svelte', 'lint', 'build', 'runtime', 'api', 'other');
    END IF;
END $$;

-- 2. Create error_clusters table (if not exists)
CREATE TABLE IF NOT EXISTS "error_clusters" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "kind" "error_kind" NOT NULL,
    "severity" "error_severity" NOT NULL DEFAULT 'warn',
    "pattern" text NOT NULL,
    "error_count" integer NOT NULL DEFAULT 1,
    "route_paths" text[],
    "radius" numeric,
    "last_updated" timestamp NOT NULL DEFAULT now(),
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- 3. Create route_error_patches table (if not exists)
CREATE TABLE IF NOT EXISTS "route_error_patches" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "route_path" varchar(255) NOT NULL,
    "route_file" varchar(500),
    "error_code" varchar(64) NOT NULL,
    "suggestion_title" varchar(255),
    "patch_text" text NOT NULL,
    "patch_explanation" text,
    "confidence" numeric NOT NULL DEFAULT 0.50,
    "hints" text[],
    "status" "patch_status" NOT NULL DEFAULT 'suggested',
    "source" varchar(64) NOT NULL DEFAULT 'phase78',
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_by" integer,
    "applied_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Add foreign key constraint only if users table exists and FK doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'route_error_patches_created_by_users_id_fk'
        ) THEN
            ALTER TABLE "route_error_patches"
            ADD CONSTRAINT "route_error_patches_created_by_users_id_fk"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 4. Create error_feedback table (if not exists)
CREATE TABLE IF NOT EXISTS "error_feedback" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "suggestion_id" uuid NOT NULL,
    "route_path" varchar(255) NOT NULL,
    "helpful" boolean,
    "accurate" boolean,
    "works_soon" boolean,
    "feedback" text,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Add foreign key constraint only if error_suggestions table exists and FK doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='error_suggestions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'error_feedback_suggestion_id_error_suggestions_id_fk'
        ) THEN
            ALTER TABLE "error_feedback"
            ADD CONSTRAINT "error_feedback_suggestion_id_error_suggestions_id_fk"
            FOREIGN KEY ("suggestion_id") REFERENCES "error_suggestions"("id") ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 5. Create error_timeline table (if not exists)
CREATE TABLE IF NOT EXISTS "error_timeline" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "route_path" varchar(255) NOT NULL,
    "event_type" varchar(50) NOT NULL,
    "description" text,
    "metadata" jsonb,
    "occurred_at" timestamp NOT NULL DEFAULT now(),
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- 6. Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_error_clusters_kind" ON "error_clusters"("kind");
CREATE INDEX IF NOT EXISTS "idx_error_clusters_severity" ON "error_clusters"("severity");

CREATE INDEX IF NOT EXISTS "idx_route_patches_route" ON "route_error_patches"("route_path");
CREATE INDEX IF NOT EXISTS "idx_route_patches_status" ON "route_error_patches"("status");
CREATE INDEX IF NOT EXISTS "idx_route_patches_error_code" ON "route_error_patches"("error_code");

CREATE INDEX IF NOT EXISTS "idx_error_feedback_suggestion" ON "error_feedback"("suggestion_id");
CREATE INDEX IF NOT EXISTS "idx_error_feedback_route" ON "error_feedback"("route_path");

CREATE INDEX IF NOT EXISTS "idx_error_timeline_route" ON "error_timeline"("route_path");
CREATE INDEX IF NOT EXISTS "idx_error_timeline_event" ON "error_timeline"("event_type");

-- 7. Add foreign key for error_events.cluster_id if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='error_events')
       AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='error_clusters') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'error_events_cluster_id_error_clusters_id_fk'
        ) THEN
            ALTER TABLE "error_events"
            ADD CONSTRAINT "error_events_cluster_id_error_clusters_id_fk"
            FOREIGN KEY ("cluster_id") REFERENCES "error_clusters"("id") ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 8. Add foreign key for error_suggestions.cluster_id if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='error_suggestions')
       AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='error_clusters') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'error_suggestions_cluster_id_error_clusters_id_fk'
        ) THEN
            -- Check if cluster_id column exists in error_suggestions
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public'
                  AND table_name='error_suggestions'
                  AND column_name='cluster_id'
            ) THEN
                ALTER TABLE "error_suggestions"
                ADD CONSTRAINT "error_suggestions_cluster_id_error_clusters_id_fk"
                FOREIGN KEY ("cluster_id") REFERENCES "error_clusters"("id") ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- 9. Verification: Show created tables
SELECT
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name=t.tablename) as column_count
FROM pg_tables t
WHERE schemaname='public'
  AND (tablename LIKE 'route_%' OR tablename LIKE 'error_%')
ORDER BY tablename;
