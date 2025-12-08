DO $$
BEGIN
    CREATE TYPE "patch_status" AS ENUM ('suggested', 'applied', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "route_error_patches"
    RENAME COLUMN IF EXISTS "patch_title" TO "suggestion_title";

ALTER TABLE "route_error_patches"
    ALTER COLUMN "error_code" TYPE varchar(64);

ALTER TABLE "route_error_patches"
    ALTER COLUMN "confidence" TYPE numeric(5,2),
    ALTER COLUMN "confidence" SET DEFAULT 0.50;

ALTER TABLE "route_error_patches"
    ADD COLUMN IF NOT EXISTS "route_file" varchar(500),
    ADD COLUMN IF NOT EXISTS "status" "patch_status" DEFAULT 'suggested',
    ADD COLUMN IF NOT EXISTS "source" varchar(64) DEFAULT 'phase78',
    ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "created_by" integer,
    ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();

ALTER TABLE "route_error_patches"
    ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "route_error_patches"
    ALTER COLUMN "status" SET NOT NULL,
    ALTER COLUMN "source" SET NOT NULL,
    ALTER COLUMN "metadata" SET NOT NULL;

ALTER TABLE "route_error_patches"
    DROP COLUMN IF EXISTS "applied";

ALTER TABLE "route_error_patches"
    ADD CONSTRAINT IF NOT EXISTS "route_error_patches_created_by_users_id_fk"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_route_patches_status" ON "route_error_patches" ("status");
CREATE INDEX IF NOT EXISTS "idx_route_patches_error_code" ON "route_error_patches" ("error_code");
