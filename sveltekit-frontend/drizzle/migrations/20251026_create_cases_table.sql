-- Create cases table for legal case management CREATE TABLE IF NOT EXISTS "cases" ( "id" uuid PRIMARY KEY DEFAULT
gen_random_uuid(), "title" varchar(255) NOT NULL, "description" text, "created_by" uuid NOT NULL, "created_at" timestamp
DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, "status" varchar(50) DEFAULT 'active', "metadata"
jsonb ); -- Create index on created_by for faster queries CREATE INDEX IF NOT EXISTS "cases_created_by_idx" ON "cases"
("created_by"); -- Create index on status for filtering CREATE INDEX IF NOT EXISTS "cases_status_idx" ON "cases"
("status"); -- Create index on created_at for sorting CREATE INDEX IF NOT EXISTS "cases_created_at_idx" ON "cases"
("created_at" DESC); -- Create GIN index on metadata for JSONB searches CREATE INDEX IF NOT EXISTS "cases_metadata_idx"
ON "cases" USING GIN ("metadata");
