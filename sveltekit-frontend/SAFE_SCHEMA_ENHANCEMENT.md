# Phase 78 - Safe Schema Enhancement Strategy

## 🎯 Your Question: "How do we keep what we have and enhance current schema?"

### Current Situation
- ✅ **4 tables exist** with data: `route_health`, `error_events`, `error_suggestions`, `error_logs`
- ⚠️ **3 tables missing**: `error_clusters`, `route_error_patches`, `error_feedback`, `error_timeline`
- ❓ **You want to:** Add missing tables WITHOUT losing existing data

---

## ✅ Safe Migration Strategy (No Data Loss)

### Option 1: Additive-Only Migration (Recommended)

This approach **only creates new tables** and leaves existing ones untouched.

**Step 1: Create a custom migration SQL file**

```sql
-- File: drizzle/migrations/20251207_add_missing_phase78_tables.sql

-- Only create tables that don't exist yet
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
    "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "applied_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "error_feedback" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "suggestion_id" uuid NOT NULL REFERENCES "error_suggestions"("id"),
    "route_path" varchar(255) NOT NULL,
    "helpful" boolean,
    "accurate" boolean,
    "works_soon" boolean,
    "feedback" text,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "error_timeline" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "route_path" varchar(255) NOT NULL,
    "event_type" varchar(50) NOT NULL,
    "description" text,
    "metadata" jsonb,
    "occurred_at" timestamp NOT NULL DEFAULT now(),
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_error_clusters_kind" ON "error_clusters"("kind");
CREATE INDEX IF NOT EXISTS "idx_error_clusters_severity" ON "error_clusters"("severity");
CREATE INDEX IF NOT EXISTS "idx_route_patches_route" ON "route_error_patches"("route_path");
CREATE INDEX IF NOT EXISTS "idx_route_patches_status" ON "route_error_patches"("status");
CREATE INDEX IF NOT EXISTS "idx_route_patches_error_code" ON "route_error_patches"("error_code");
CREATE INDEX IF NOT EXISTS "idx_error_feedback_suggestion" ON "error_feedback"("suggestion_id");
CREATE INDEX IF NOT EXISTS "idx_error_feedback_route" ON "error_feedback"("route_path");
CREATE INDEX IF NOT EXISTS "idx_error_timeline_route" ON "error_timeline"("route_path");
CREATE INDEX IF NOT EXISTS "idx_error_timeline_event" ON "error_timeline"("event_type");
```

**Step 2: Run the migration manually**

```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -p 5432 -d legal_ai_db -f drizzle/migrations/20251207_add_missing_phase78_tables.sql
```

**Step 3: Verify all tables exist**

```powershell
psql -U postgres -h localhost -d legal_ai_db -c "
SELECT tablename,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name=t.tablename) as columns
FROM pg_tables t
WHERE schemaname='public'
  AND (tablename LIKE 'route_%' OR tablename LIKE 'error_%')
ORDER BY tablename;
"
```

---

### Option 2: Use Drizzle Push with Caution

If you use `drizzle-kit push`, it will:
- ✅ Create missing tables
- ⚠️ May try to alter existing tables (risky if schema drift exists)
- ❌ Could truncate data if it detects conflicts

**Safer Drizzle approach:**

```powershell
# 1. Backup your existing data first
pg_dump -U postgres -h localhost -d legal_ai_db -t route_health -t error_events -t error_suggestions -t error_logs > phase78_backup.sql

# 2. Run Drizzle push
$env:DATABASE_URL = "postgresql://postgres:123456@localhost:5432/legal_ai_db"
npx drizzle-kit push --config=drizzle.config.ts

# 3. If data loss occurs, restore:
psql -U postgres -h localhost -d legal_ai_db -f phase78_backup.sql
```

---

### Option 3: Schema Introspection + Merge (Most Conservative)

This approach pulls the current DB schema and merges it with your desired schema.

**Step 1: Introspect current database**

```powershell
npx drizzle-kit introspect --config=drizzle.config.ts
```

This creates a schema file based on your **actual database**, not your code.

**Step 2: Compare with your desired schema**

```powershell
# View differences
npx drizzle-kit studio --config=drizzle.config.ts
```

Opens a web UI at http://localhost:4983 to compare schemas visually.

**Step 3: Generate additive-only migration**

Manually create a migration that only adds missing pieces.

---

## 🔧 Required Enums (Create First)

Before creating tables, ensure these enums exist:

```sql
-- Check if enums exist
SELECT typname FROM pg_type WHERE typname IN ('error_kind', 'error_severity', 'patch_status', 'route_health_state');

-- Create missing enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patch_status') THEN
        CREATE TYPE "patch_status" AS ENUM ('suggested', 'applied', 'rejected');
    END IF;
END $$;
```

---

## 📊 Verify No Data Loss

After migration, check row counts:

```sql
SELECT
    'route_health' as table_name, COUNT(*) as rows FROM route_health
UNION ALL
SELECT 'error_events', COUNT(*) FROM error_events
UNION ALL
SELECT 'error_suggestions', COUNT(*) FROM error_suggestions
UNION ALL
SELECT 'error_logs', COUNT(*) FROM error_logs
UNION ALL
SELECT 'error_clusters', COUNT(*) FROM error_clusters
UNION ALL
SELECT 'route_error_patches', COUNT(*) FROM route_error_patches
UNION ALL
SELECT 'error_feedback', COUNT(*) FROM error_feedback
UNION ALL
SELECT 'error_timeline', COUNT(*) FROM error_timeline;
```

---

## ✅ Recommended Workflow (Zero Data Loss)

```powershell
# 1. Backup existing data
pg_dump -U postgres -h localhost -d legal_ai_db > phase78_full_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# 2. Create additive migration SQL file
# (Use the SQL from Option 1 above)

# 3. Run the additive migration
psql -U postgres -h localhost -d legal_ai_db -f drizzle/migrations/20251207_add_missing_phase78_tables.sql

# 4. Verify all 7 tables exist
psql -U postgres -h localhost -d legal_ai_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'route_%' OR tablename LIKE 'error_%') ORDER BY tablename;"

# 5. Check row counts (ensure no data lost)
psql -U postgres -h localhost -d legal_ai_db -c "SELECT 'route_health', COUNT(*) FROM route_health;"
```

---

## 🎯 Why This Works

- **CREATE TABLE IF NOT EXISTS**: Only creates missing tables
- **No ALTER TABLE**: Doesn't modify existing tables
- **No TRUNCATE**: Doesn't delete existing data
- **No DROP**: Doesn't remove existing columns/tables
- **Idempotent**: Safe to run multiple times

---

## 🚀 After Tables Are Created

Once all 7 tables exist:

1. **Update Drizzle schema** to match actual DB:
   ```powershell
   npx drizzle-kit introspect --config=drizzle.config.ts
   ```

2. **Start dev server**:
   ```powershell
   npm run dev
   ```

3. **Test Error Brain**:
   - Navigate to http://localhost:5173/all-routes
   - Click Error Brain button
   - Verify suggestions load
   - Apply a patch
   - Check `route_error_patches` table for saved data

---

*This strategy preserves all existing data while adding missing Phase 78 tables.*
