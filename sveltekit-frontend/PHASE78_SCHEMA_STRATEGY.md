# Phase 78 Schema Strategy: "Keep & Enhance" Mode

## The Mental Model

Your database is now the **source of truth**. It contains:

- ✅ **Legacy tables** (knowledge_base, legal_topics, evidence_relationships, etc.)
- ✅ **New Phase 78 tables** (error_clusters, error_events, error_feedback, error_logs, error_suggestions, error_timeline, route_error_patches, route_health)
- ✅ **Additive columns** on existing tables (saved_reports.saved_at, evidence.evidence_type, user_embeddings.model, etc.)
- ✅ **New foreign keys** linking Phase 78 tables together
- ✅ **All existing data** from previous work sessions

## What the Drizzle SQL Block Actually Is

The massive migration that Drizzle generates mixes two things:

### A. Additive / Safe Changes (✅ Already Applied)

```sql
-- Relaxing constraints
ALTER TABLE "reports" ALTER COLUMN "created_at" DROP NOT NULL;
ALTER TABLE "themes" ALTER COLUMN "updated_at" DROP NOT NULL;

-- Adding new columns
ALTER TABLE "saved_reports" ADD COLUMN "saved_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "evidence" ADD COLUMN "evidence_type" "evidence_type" NOT NULL;
ALTER TABLE "user_embeddings" ADD COLUMN "model" varchar(100) NOT NULL;

-- Adding Phase 78 foreign keys and indexes
ALTER TABLE "error_suggestions" ADD CONSTRAINT "error_suggestions_cluster_id_error_clusters_id_fk" ...
CREATE INDEX "idx_error_events_cluster" ON "error_events" USING btree ("cluster_id");
```

✅ These were already applied via:
- `drizzle/manual/20251207_additive_phase78_tables.sql`
- `drizzle/manual/20251207_phase78_fk_fixes.sql`

### B. Destructive / Hard-Reset Changes (☢️ DO NOT RUN)

```sql
-- Truncates (wipes data)
truncate table "evidence" cascade;
truncate table "users" cascade;

-- Drops columns (removes old schema)
ALTER TABLE "documents" DROP COLUMN "uuid";
ALTER TABLE "documents" DROP COLUMN "filename";
ALTER TABLE "evidence" DROP COLUMN "evidence_number";
ALTER TABLE "users" DROP COLUMN "username";
...

-- Drops enum types
DROP TYPE "public"."evidence_status";
DROP TYPE "public"."node_type";
...

-- Drops 15 entire tables
DROP TABLE "knowledge_graphs";
DROP TABLE "legal_entities";
DROP TABLE "vector_embeddings";
...
```

⚠️ This is what Drizzle warns about:

```
THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED
Do you still want to push changes?
❌ No, abort  ← **Always pick this**
   Yes, I want to remove 15 tables, remove 24 columns, truncate 2 tables
```

---

## What You Should Do Going Forward

### ✅ DO: Say "No, abort" to Any Large Drizzle Diff

Every time `npm run db:push` or `drizzle-kit push` shows that warning, **choose "No, abort"**.

This prevents accidental data loss and keeps your hybrid schema intact.

### ✅ DO: Use Additive Migrations When Adding New Features

When you want to add a new table or column:

```bash
# 1. Add to your schema.ts
export const myNewTable = pgTable('my_new_table', {
  id: uuid().primaryKey(),
  ...
});

# 2. Generate the migration
npx drizzle-kit generate --name my_new_feature

# 3. Review the generated SQL in drizzle/migrations/
# Should only contain CREATE TABLE, ADD COLUMN, CREATE INDEX, etc.

# 4. Apply it safely
npx drizzle-kit migrate
```

### ❌ DON'T: Remove Models from schema.ts to "Clean Up"

If you remove a table definition from schema.ts, Drizzle will want to `DROP TABLE`.

Instead, either:

**Option 1: Keep "legacy_*" models** (lighter weight)
```typescript
export const legacyKnowledgeBase = pgTable('knowledge_base', {
  // minimal schema, just to prevent drops
  id: uuid().primaryKey(),
  ...
});
```

**Option 2: Leave it in schema.ts** but mark as inactive/archived.

**Option 3: When you're truly ready**, do a one-time hard reset on a backup database.

---

## Current State Summary

### Phase 78 Status: ✅ LOCKED IN

| Item | Status | Details |
|------|--------|---------|
| **8 Phase 78 Tables** | ✅ Exist in DB | error_*, route_* |
| **All FK Constraints** | ✅ Applied | Created + fixed type mismatches |
| **All Additive Columns** | ✅ Applied | saved_reports.saved_at, evidence.evidence_type, etc. |
| **Baseline Snapshot** | ✅ Locked | legal_ai_db_phase78_baseline.dump (2.37 MB) |
| **API Endpoints** | ✅ Wired | GET /api/phase78/error-events, POST /api/phase78/route-health |
| **Error Modal Component** | ✅ Wired | Correct endpoint paths configured |

### Legacy Data: ✅ PRESERVED

All existing tables and data from previous sessions remain intact:
- knowledge_graphs, legal_entities, vector_embeddings
- legal_topics, chat_sessions, qdrant_collections
- evidence_relationships, timeline_events, file_summaries
- etc.

---

## Recovery Plan (If Needed)

If you accidentally run a destructive migration:

```bash
# Restore from baseline snapshot
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -p 5432 -d legal_ai_db \
  -f legal_ai_db_phase78_baseline.dump

# Verify recovery
psql -U postgres -h localhost -p 5432 -d legal_ai_db \
  -c "SELECT COUNT(*) as evidence_count FROM evidence;"
```

---

## Decision Tree: "Should I Run This Migration?"

```
Does the Drizzle warning say "Found data-loss statements"?
│
├─ YES → ❌ Answer "No, abort"
│        The migration contains TRUNCATE, DROP TABLE, or DROP COLUMN
│        This is a hard-reset proposal, not what you want
│
└─ NO → ✅ Review the SQL
         If it only has CREATE TABLE, ADD COLUMN, CREATE INDEX → safe to apply
         Apply via: npx drizzle-kit migrate (or manually via psql)
```

---

## Next Steps

1. **Local Testing** (No Vercel yet)
   - Open http://localhost:5173/all-routes
   - Test Error Brain feature
   - Verify data flows from endpoints

2. **Future Schema Changes**
   - Always use additive migrations
   - Always say "No" to destructive diffs
   - Document new tables in this file

3. **When Ready to Hard-Reset** (far future)
   - Create backup of current DB
   - Test hard-reset on backup
   - Migrate production when confident

---

## Files to Reference

- `drizzle/manual/20251207_additive_phase78_tables.sql` — Additive-only Phase 78 setup
- `drizzle/manual/20251207_phase78_fk_fixes.sql` — FK constraint repairs
- `PHASE78_SAFE_MIGRATION_GUIDE.md` — Complete migration walkthrough
- `legal_ai_db_phase78_baseline.dump` — Recovery snapshot

---

**Golden Rule: Database is source of truth. Keep enhancing. Say "No" to nukes. 🔒**
