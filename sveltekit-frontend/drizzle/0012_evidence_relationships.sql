-- Add new enums for typed relationships (check if they exist first)
DO $$ BEGIN
  CREATE TYPE "public"."evidence_relationship_type" AS ENUM('supports', 'contradicts', 'same_person', 'timeline', 'chain_of_custody');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."evidence_relationship_strength" AS ENUM('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Add caseId column if not exists
ALTER TABLE "evidence_relationships"
ADD COLUMN IF NOT EXISTS "case_id" uuid;--> statement-breakpoint

-- Add relationshipType column with default
ALTER TABLE "evidence_relationships"
ADD COLUMN IF NOT EXISTS "relationship_type" text DEFAULT 'supports';--> statement-breakpoint

-- Add case_id index
CREATE INDEX IF NOT EXISTS "evidence_relationships_case_id_idx" ON "evidence_relationships" ("case_id");--> statement-breakpoint

-- Update relationship_type for existing rows to support if null
UPDATE "evidence_relationships" SET "relationship_type" = 'supports' WHERE "relationship_type" IS NULL;--> statement-breakpoint

-- Add foreign key for case_id if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "evidence_relationships"
  ADD CONSTRAINT "evidence_relationships_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
