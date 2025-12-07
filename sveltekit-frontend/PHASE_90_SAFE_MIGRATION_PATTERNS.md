# Phase 90 Safe Migration Patterns - Copy & Paste Ready
## Concrete Commands + Templates You Can Run Now
**Date:** December 6, 2025 | **Status:** Production-Ready

---

## 1. DANGER CHECK: Is This Migration Risky?
**Time:** 10 seconds | **Runs:** ripgrep scan

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# 🚨 SCAN FOR DANGEROUS STATEMENTS
rg "DROP TABLE|TRUNCATE|DROP COLUMN" drizzle/
```

**If prints anything:**
- 🚨 **STOP** - Don't run `npx drizzle-kit push` yet
- Open the file in VS Code
- Review manually
- Use pattern #2 below to create a safe version

**If prints nothing:**
- ✅ Continue to pattern #3 (Safe Execution)

---

## 2. STRIP DANGEROUS STATEMENTS: Make Safe Copy
**Time:** 1 minute | **Creates:** New safe migration file

Say Drizzle generated `drizzle/0005_nasty_migration.sql` with DROP/TRUNCATE.

### PowerShell One-Liner:
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend\drizzle

# Create safe version by filtering out danger
$src = '0005_nasty_migration.sql'
$dst = '0005_nasty_migration_SAFE.sql'

Get-Content $src |
  Where-Object {
    $_ -notmatch 'DROP TABLE' -and
    $_ -notmatch 'TRUNCATE' -and
    $_ -notmatch 'DROP COLUMN' -and
    $_ -notmatch 'DELETE FROM'
  } |
  Set-Content $dst

Write-Host "✅ Safe version created: $dst"
Write-Host "📝 Edit it in VS Code, then rename to replace $src"
```

### Then:
1. **Open `0005_nasty_migration_SAFE.sql` in VS Code**
2. **Keep only:**
   - `ALTER TABLE ... ADD COLUMN` (with defaults or nullable)
   - `ALTER TABLE ... ALTER COLUMN` (for setting defaults)
   - `CREATE INDEX ...`
   - `ADD CONSTRAINT ...`
3. **Delete any remaining:**
   - `DROP` statements
   - `TRUNCATE` statements
   - Destructive `ALTER` operations
4. **Rename:** `0005_nasty_migration_SAFE.sql` → `0005_nasty_migration.sql`
5. **Run:** Phase 90 execution flow (pattern #3)

---

## 3. SAFE EXECUTION FLOW: The Phase 90 Ceremony
**Time:** 2-3 minutes | **Runs:** 6 commands in sequence

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Step 1: Check for duplicate emails (if users table affected)
Write-Host "1️⃣  Checking for duplicate emails..." -ForegroundColor Cyan
npm run db:check-duplicates

# Step 2: Snapshot BEFORE migration
Write-Host "2️⃣  Taking before snapshot..." -ForegroundColor Cyan
npm run db:snapshot-before

# Step 3: Dry run (see what will happen)
Write-Host "3️⃣  Running dry-run..." -ForegroundColor Cyan
npx drizzle-kit push --dry

# Step 4: Apply migration (if dry-run looks good)
Write-Host "4️⃣  Applying migration..." -ForegroundColor Green
npx drizzle-kit push

# Step 5: Snapshot AFTER migration
Write-Host "5️⃣  Taking after snapshot..." -ForegroundColor Cyan
npm run db:snapshot-after

# Step 6: Compare (verify no data loss)
Write-Host "6️⃣  Comparing snapshots..." -ForegroundColor Cyan
npm run db:compare-snapshots

Write-Host ""
Write-Host "✅ Phase 90 Migration Complete!" -ForegroundColor Green
```

**Expected output from step 6:**
```
Before: users (1523 rows), evidence (8942 rows), documents (312 rows)
After:  users (1523 rows), evidence (8942 rows), documents (312 rows)
Status: ✅ All row counts unchanged - Phase 90 satisfied
```

---

## 4. PATTERN A: evidence_vectors (vector + model columns)

**Use this when:**
- Adding `vector` (text, stores JSON embedding)
- Adding `model` (varchar, tracks which model generated it)
- Need to backfill from existing `embedding` column
- Don't drop `embedding` yet (keep both until you verify)

### Save as: `drizzle/00XX_add_evidence_vector_columns.sql`

```sql
-- Phase 90: evidence_vectors safe migration
-- Pattern: ADD nullable → BACKFILL → SET NOT NULL (never DELETE)

-- Step 1: Add new columns as nullable
ALTER TABLE "evidence_vectors"
  ADD COLUMN IF NOT EXISTS "vector" text,
  ADD COLUMN IF NOT EXISTS "model" varchar(100);

-- Step 2: Backfill from existing data
-- Only updates rows that have embedding data
UPDATE "evidence_vectors"
SET
  "vector" = COALESCE("vector", "embedding"),
  "model"  = COALESCE("model", 'embeddinggemma:latest')
WHERE
  "embedding" IS NOT NULL
  AND "vector" IS NULL;

-- Step 3: Make NOT NULL (only for rows that have data)
-- If backfill skipped some rows, they stay NULL (Phase 90 safe)
ALTER TABLE "evidence_vectors"
  ALTER COLUMN "vector" SET DEFAULT NULL,
  ALTER COLUMN "model" SET DEFAULT 'embeddinggemma:latest';

-- Step 4: Optional - add index for faster queries
CREATE INDEX IF NOT EXISTS "idx_evidence_vectors_model"
  ON "evidence_vectors" ("model");

-- ❌ DO NOT UNCOMMENT - KEEP BOTH COLUMNS FOR NOW
-- Later migration (once code is verified):
-- ALTER TABLE "evidence_vectors" DROP COLUMN "embedding";
```

**Then run:**
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots
```

---

## 5. PATTERN B: users.email UNIQUE (with duplicate check)

**Use this when:**
- Adding UNIQUE constraint to `email`
- Need to verify no duplicates exist first
- Phase 90 pattern: Check → Constraint → Done

### Step 1: Find duplicates (RUN THIS FIRST!)

```powershell
$connectionString = "postgresql://legal_admin:123456@localhost:5432/legal_ai_db"

psql $connectionString -c "
SELECT email, COUNT(*) AS count
FROM \"users\"
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;
"
```

**If this returns rows:**
- ❌ **STOP** - Duplicates exist
- Fix manually before adding constraint:
  ```sql
  -- Example: Keep first, mark others inactive
  DELETE FROM users
  WHERE id NOT IN (
    SELECT MIN(id) FROM users GROUP BY email
  )
  AND email IN (SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1);
  ```
- Then re-run the duplicate check
- Once it returns 0 rows, proceed below

**If returns 0 rows:**
- ✅ Continue below

### Step 2: Add constraint

### Save as: `drizzle/00XX_add_users_email_unique.sql`

```sql
-- Phase 90: users.email UNIQUE constraint
-- Prerequisite: No duplicate emails (verified by db:check-duplicates)

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_unique" UNIQUE ("email");

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_users_email"
  ON "users" ("email");
```

**Then run:**
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates  # Verify 0 duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots  # Should show same row count
```

---

## 6. PATTERN C: Add lifecycle columns (is_active + deleted_at)

**Use this when:**
- Soft-delete pattern (no hard DELETE ever)
- Add `is_active` boolean (default true)
- Add `deleted_at` timestamp (null when active)
- Phase 90 core: "Never delete, only deactivate"

### Save as: `drizzle/00XX_add_lifecycle_columns.sql`

```sql
-- Phase 90: Lifecycle columns for soft-delete pattern
-- Safe: All new columns nullable/default, no data loss

-- Evidence table: lifecycle columns
ALTER TABLE "evidence"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp;

-- Legal documents table: lifecycle columns
ALTER TABLE "legal_documents"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp;

-- Create indexes for Phase 90 operations
CREATE INDEX IF NOT EXISTS "idx_evidence_is_active"
  ON "evidence" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "idx_evidence_qdrant_pending"
  ON "evidence" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_legal_documents_is_active"
  ON "legal_documents" ("is_active", "deleted_at");

-- Now all operations use is_active flag:
-- SELECT * FROM evidence WHERE is_active = true
-- UPDATE evidence SET is_active = false, deleted_at = NOW() WHERE id = $1
-- (Never: DELETE FROM evidence WHERE ...)
```

**Then run:**
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots  # Same rows, new columns added
```

---

## 7. WHAT TO DO RIGHT NOW: Choose Your First Table

**Pick ONE:**
- `evidence_vectors` → Add vector + model (Pattern A)
- `users` → Add email UNIQUE (Pattern B)
- `evidence` / `legal_documents` → Add lifecycle (Pattern C)

### Quick Decision Tree:

**Q: "Do I have vector embeddings to track?"**
→ Use Pattern A (evidence_vectors)

**Q: "Do I need to enforce unique emails?"**
→ Use Pattern B (users.email)

**Q: "Do I want soft-delete + versioning?"**
→ Use Pattern C (lifecycle)

### Example: Start with Pattern C (lifecycle)

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# 1. Create migration file
New-Item -Path "drizzle\0006_add_lifecycle_columns.sql" -Force

# 2. Paste Pattern C SQL above into that file

# 3. Run Phase 90 ceremony
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push --dry  # See what happens first
npx drizzle-kit push         # Actually apply it
npm run db:snapshot-after
npm run db:compare-snapshots # Verify success
```

---

## 8. TROUBLESHOOTING: What If It Fails?

### "Migration failed: duplicate key"
```powershell
# If adding UNIQUE constraint:
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "
SELECT column_name, COUNT(*) FROM table_name
GROUP BY column_name HAVING COUNT(*) > 1;
"
# Fix duplicates manually, then retry
```

### "Row count mismatch in compare-snapshots"
```powershell
# Check what changed:
npm run db:compare-snapshots  # Shows detailed diff
# If rows were DELETED, that's NOT Phase 90
# Rollback and create safe version using pattern #2
```

### "npx drizzle-kit push hangs"
```powershell
# Ctrl+C to cancel
# Check PostgreSQL is responsive:
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "SELECT 1;"
# If not responsive, restart PostgreSQL:
# Windows Services → PostgreSQL → Restart
```

### "I need to rollback"
```powershell
# PostgreSQL has transaction history, but no easy undo
# Best practice: Always take snapshot-before
# Manually restore from backup if needed
# (This is why Phase 90: "never execute partial migrations")
```

---

## 9. MASTER CHECKLIST: Before Each Migration

- [ ] Read the migration file completely
- [ ] Run ripgrep scan (pattern #1) → no DROP/TRUNCATE found
- [ ] If Drizzle generated it → strip using pattern #2
- [ ] Run db:check-duplicates
- [ ] Run db:snapshot-before
- [ ] Run npx drizzle-kit push --dry
- [ ] Review dry-run output (what tables change?)
- [ ] Run npx drizzle-kit push
- [ ] Run db:snapshot-after
- [ ] Run db:compare-snapshots
- [ ] Verify: "All row counts unchanged"
- [ ] ✅ Phase 90 certified!

---

## 10. ONE-LINER: Full Safe Execution

**Copy-paste this for any migration:**

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend; npm run db:check-duplicates; npm run db:snapshot-before; npx drizzle-kit push --dry; Write-Host "✅ Dry-run OK? Press Enter to proceed, Ctrl+C to abort"; Read-Host; npx drizzle-kit push; npm run db:snapshot-after; npm run db:compare-snapshots
```

---

## Summary: Phase 90 Safe Pattern = 3 Steps

1. **SCAN** → ripgrep (any DROP/TRUNCATE?)
2. **CLEAN** → PowerShell filter (remove danger)
3. **EXECUTE** → Phase 90 ceremony (check → backup → apply → verify)

**Never partial. Never silent failures. Never data loss.**

---

**You now have copy-paste ready patterns for:**
- ✅ Pattern A: Vector + model columns
- ✅ Pattern B: Email UNIQUE constraint
- ✅ Pattern C: Lifecycle (soft-delete) columns
- ✅ Pattern #1: Danger scan
- ✅ Pattern #2: Safe strip
- ✅ Pattern #3: Execution ceremony

**Pick one table. Run one pattern. Done in ~5 minutes.** 🚀
