# Phase 78: Complete Strategy & Decision Framework

## TL;DR: Golden Rules

| Rule | Applies To | Action |
|------|-----------|--------|
| **Database is source of truth** | Always | Treat DB state as the real schema |
| **Say "No, abort" to data-loss warnings** | Drizzle migrations | Never auto-accept destructive diffs |
| **Additive migrations only** | Schema changes | Only CREATE, ADD, CREATE INDEX |
| **Keep legacy data** | Old tables/columns | Until you explicitly decide to delete |

---

## What Phase 78 Actually Is

**Phase 78 = Error Brain Infrastructure**

- ✅ 8 new tables for tracking, clustering, and fixing route errors
- ✅ Real database endpoints (GET read, POST write)
- ✅ UI components wired to endpoints
- ✅ Safe additive migrations (no data loss)
- ✅ Baseline snapshot for recovery

**Not Phase 78:**
- ❌ A database nuke (that's the "destructive bottom half" of Drizzle diffs)
- ❌ A hard reset of old data
- ❌ A rewrite of existing tables

---

## The Drizzle "Giant SQL Block" Explained

### What You See

```bash
$ npm run db:push
# or
$ drizzle-kit push
```

Drizzle generates a massive migration that includes both:

**Part A: Additive Changes** (Good ✅)
- `ALTER TABLE ... ADD COLUMN ...`
- `CREATE TABLE ...` for Phase 78 tables
- `CREATE INDEX ...` for new indexes
- `ALTER TABLE ... ADD CONSTRAINT ...` for FKs

**Part B: Destructive Changes** (Dangerous ☢️)
- `ALTER TABLE ... DROP COLUMN ...` (removes old fields)
- `TRUNCATE TABLE ...` (wipes data)
- `DROP TABLE ...` (deletes 15+ old tables)
- `DROP TYPE ...` (removes custom enums)

### Why Drizzle Does This

Drizzle sees:
1. Your current `schema.ts` defines certain tables/columns
2. Your actual database has different ones (legacy data + Phase 78)
3. Drizzle wants to **reconcile** them: "I'll make DB match schema"

So it proposes: Delete everything schema.ts doesn't list.

### Why We Say "No"

We're in "hybrid mode" where:
- Legacy tables from old work stay in the DB
- New Phase 78 tables are added
- Schema.ts doesn't list legacy tables (we didn't redefine them)
- Drizzle sees this and wants to DROP them
- We say: "No thanks, keep the data"

---

## The Five Scenarios

### Scenario 1: Drizzle Says "Found Data-Loss Statements"

```
THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED
Do you still want to push changes?
❌ No, abort
   Yes, I want to remove 15 tables, remove 24 columns, truncate 2 tables
```

**Answer: ❌ NO, ABORT**

This is a hard-reset proposal. We don't want it.

---

### Scenario 2: Clean Additive Migration

You added new tables to `schema.ts` and generated a migration:

```sql
CREATE TABLE IF NOT EXISTS "my_new_table" (
  id uuid PRIMARY KEY,
  ...
);
CREATE INDEX IF NOT EXISTS "idx_my_new_table" ON "my_new_table"(id);
ALTER TABLE "my_new_table"
  ADD CONSTRAINT "my_new_table_fk"
  FOREIGN KEY (...) REFERENCES ...;
```

**Answer: ✅ YES, APPLY**

This only adds stuff, doesn't remove anything.

```bash
npx drizzle-kit migrate
# or
psql -U postgres legal_ai_db -f drizzle/migrations/xxx.sql
```

---

### Scenario 3: Adding a New Feature

1. **Update schema:**
   ```typescript
   // src/lib/server/db/schema/index.ts
   export const myNewFeature = pgTable('my_new_feature', {
     id: uuid().primaryKey(),
     name: varchar(255),
     ...
   });
   ```

2. **Generate migration:**
   ```bash
   npx drizzle-kit generate --name my_new_feature
   ```

3. **Inspect the migration:**
   ```bash
   cat drizzle/migrations/yyyymmdd_hhmmss_my_new_feature.sql
   ```
   - Should only have `CREATE TABLE`, `CREATE INDEX`
   - Should **NOT** have `DROP`, `TRUNCATE`, etc.

4. **Apply it:**
   ```bash
   npx drizzle-kit migrate
   ```

---

### Scenario 4: You Removed a Model from schema.ts

Example: You deleted the definition of `legacyKnowledgeBase` from your schema.

Now Drizzle wants to `DROP TABLE knowledge_base`.

**If you want to KEEP the data:**
- Re-add the model to schema.ts (minimal version is fine)
- Or say "No" to drizzle-kit push
- Or mark it as inactive/deprecated

**If you want to DELETE the data:**
- Make a backup first
- Test on backup
- Then say "Yes" to the migration

---

### Scenario 5: Hard Reset (Nuclear Option)

You've decided: "I want a clean database from scratch."

**DO NOT do this carelessly:**

1. **Backup current DB:**
   ```bash
   pg_dump -U postgres -h localhost -p 5432 legal_ai_db > backup_before_nuke.sql
   ```

2. **Create test database:**
   ```bash
   createdb legal_ai_db_test
   psql -U postgres -h localhost legal_ai_db_test < backup_before_nuke.sql
   ```

3. **Test on backup:**
   - Apply the destructive migration to `legal_ai_db_test`
   - Verify results
   - Make sure you're happy with the change

4. **Only then, on production:**
   - Backup again (redundancy!)
   - Apply migration to `legal_ai_db` (the real database)

---

## Current Database State

### Phase 78 Tables (Locked In ✅)

```
error_clusters         (9 columns)  ← error clustering & analysis
error_events           (8 columns)  ← individual error occurrences
error_feedback         (8 columns)  ← user feedback on errors
error_logs             (6 columns)  ← error logging history
error_suggestions      (7 columns)  ← AI-generated fixes
error_timeline         (7 columns)  ← temporal error tracking
route_error_patches    (16 columns) ← proposed/applied patches
route_health           (7 columns)  ← route health status
```

All 8 tables exist, all FKs are in place, all additive columns applied. ✅

### Legacy Tables (Preserved)

```
knowledge_graphs       (with existing data)
legal_entities         (with existing data)
vector_embeddings      (with existing data)
legal_topics           (with existing data)
chat_sessions          (with existing data)
... and 10+ more
```

All old tables and their data remain untouched. ✅

### Additive Columns Applied

```
saved_reports          + saved_at, notes
evidence               + criminal_id, evidence_type, file_type, sub_type, file_url, file_name, canvas_position, uploaded_by, uploaded_at
user_embeddings        + model
documents              + content, s3_key, s3_bucket, user_id, status
... and ~50 more columns across various tables
```

All additive columns exist. ✅

---

## Recovery Procedure (If Anything Goes Wrong)

```bash
# 1. Restore from baseline snapshot
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -p 5432 -d legal_ai_db \
  -f legal_ai_db_phase78_baseline.dump

# 2. Verify recovery (should have all 8 Phase 78 tables + legacy data)
psql -U postgres -h localhost -p 5432 -d legal_ai_db -c \
  "SELECT COUNT(*) FROM error_clusters;"

# 3. Re-apply any additional migrations you'd done since snapshot
psql -U postgres -h localhost -p 5432 -d legal_ai_db \
  -f drizzle/manual/20251207_phase78_fk_fixes.sql
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `legal_ai_db_phase78_baseline.dump` | Recovery snapshot (2.37 MB) |
| `drizzle/manual/20251207_additive_phase78_tables.sql` | Initial Phase 78 table creation |
| `drizzle/manual/20251207_phase78_fk_fixes.sql` | FK constraint repairs |
| `PHASE78_SAFE_MIGRATION_GUIDE.md` | Complete migration walkthrough |
| `PHASE78_SCHEMA_STRATEGY.md` | Mental model & decision framework |
| `PHASE78_DECISION_MATRIX.ps1` | Quick reference for what to do |

---

## Summary: "Keep & Enhance" Mode

```
Your Database Strategy (Right Now)
│
├─ KEEP: All existing tables and data
├─ ADD: Phase 78 tables and features
├─ ENHANCE: New columns on existing tables
└─ NEVER: Say "Yes" to destructive diffs

Decision Tree:
│
├─ "Found data-loss statements"? → ❌ NO, ABORT
├─ Only CREATE/ADD/INDEX? → ✅ YES, APPLY
├─ Adding new features? → ✅ DO: generate → review → apply
└─ Removing old data? → ⚠️ BACKUP FIRST, then decide
```

---

**Status: Phase 78 infrastructure is locked in. You can safely iterate on features without fear of accidental data loss. ✅**
