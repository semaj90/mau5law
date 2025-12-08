-- Add route metadata for clustering and ownership (Phase 80)
-- Additive-only: no breaking changes, safe to apply anytime

ALTER TABLE "route_health"
  ADD COLUMN IF NOT EXISTS "route_cluster" varchar(100),
  ADD COLUMN IF NOT EXISTS "route_owner"   varchar(100);

-- Create index for cluster filtering (optional but recommended for /all-routes UI)
CREATE INDEX IF NOT EXISTS "idx_route_health_cluster"
  ON "route_health" ("route_cluster");

-- Success message
-- SELECT 'Phase 80: Route metadata columns added successfully' as status;
