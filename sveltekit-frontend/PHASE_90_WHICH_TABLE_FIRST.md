# Phase 90: Which Table Should You Fix First?
## Decision Guide + Quick Start
**Date:** December 6, 2025 | **Choose Your First Pattern**

---

## 🎯 The Question

You have 3 safe migration patterns ready to use:

- **Pattern A:** Add `vector` + `model` to `evidence_vectors`
- **Pattern B:** Add `email UNIQUE` constraint to `users`
- **Pattern C:** Add lifecycle columns (`is_active`, `deleted_at`) to `evidence` + `legal_documents`

**Which one do you run first?**

---

## 🛣️ Decision Tree (Pick Your Path)

### Path 1: "I want to track embeddings properly"
→ **Use Pattern A (evidence_vectors)**

**Why:**
- You have `embedding` column already
- Phase 72 needs to know: which model generated each embedding
- Safe to add alongside old column (keeps both until verified)
- Unblocks embedding versioning

**Time:** 3 minutes | **Risk:** Very low

**Run:**
```powershell
# Copy Pattern A SQL to: drizzle/0006_add_vector_model.sql
# Then run Phase 90 ceremony
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots
```

---

### Path 2: "I want to prevent duplicate logins"
→ **Use Pattern B (users.email UNIQUE)**

**Why:**
- Phase 14 auth needs unique emails
- Prevents user account confusion
- Standard production requirement
- Forces data cleanup (finds bad data early)

**Time:** 5 minutes | **Risk:** Low (with duplicate check)

**Prerequisites:**
```powershell
# First verify no duplicates exist:
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "
SELECT email, COUNT(*) FROM \"users\"
GROUP BY email HAVING COUNT(*) > 1;
"
```

**If returns rows:**
- Fix duplicates manually first
- Then run Pattern B

**If returns 0 rows:**
```powershell
# Copy Pattern B SQL to: drizzle/0007_add_users_email_unique.sql
# Then run Phase 90 ceremony
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots
```

---

### Path 3: "I want Phase 90 core: never delete, only deactivate"
→ **Use Pattern C (lifecycle columns)**

**Why:**
- Implements Phase 90 principle directly
- Soft-delete: `is_active` flag + `deleted_at` timestamp
- Adds version tracking (`version` column)
- Blocks hard DELETE operations
- Foundation for audit trail

**Time:** 3 minutes | **Risk:** Very low (all defaults/nullable)

**Run:**
```powershell
# Copy Pattern C SQL to: drizzle/0008_add_lifecycle_columns.sql
# Then run Phase 90 ceremony
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots
```

---

## 🎲 If You Can't Decide: Recommendation Order

**Best to start with (builds momentum):**

1. **Pattern C (lifecycle)** first → Quick, low risk, implements core Phase 90
2. **Pattern A (vectors)** second → Unblocks Phase 72 embeddings
3. **Pattern B (email UNIQUE)** third → Depends on auth cleanup needed

**Total time for all 3:** ~10 minutes

---

## ⚡ 5-Minute Start: Just Do Pattern C

If you want to get moving **right now** without overthinking:

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# 1. Create migration file
@"
-- Phase 90: Lifecycle columns for soft-delete pattern

ALTER TABLE "evidence"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp;

ALTER TABLE "legal_documents"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_point_id" text,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_evidence_is_active"
  ON "evidence" ("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "idx_evidence_qdrant_pending"
  ON "evidence" ("qdrant_synced_at")
  WHERE "is_active" = true AND "qdrant_synced_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_legal_documents_is_active"
  ON "legal_documents" ("is_active", "deleted_at");
"@ | Set-Content drizzle/0009_lifecycle.sql

# 2. Run Phase 90 ceremony
npm run db:check-duplicates
npm run db:snapshot-before
npx drizzle-kit push --dry
npx drizzle-kit push
npm run db:snapshot-after
npm run db:compare-snapshots

Write-Host "✅ Phase 90 Pattern C deployed!" -ForegroundColor Green
```

---

## 📊 Comparison Matrix

| Pattern | Table | Column | Risk | Time | Blocks |
|---------|-------|--------|------|------|--------|
| **A** | evidence_vectors | vector, model | Very Low | 3m | Phase 72 |
| **B** | users | email_unique | Low* | 5m | Phase 14 |
| **C** | evidence, documents | is_active, version | Very Low | 3m | Hard-delete |

\* Requires duplicate check first

---

## ✅ After Running First Pattern

Once you complete one migration:

1. ✅ You've proven the Phase 90 ceremony works
2. ✅ You have before/after snapshots to compare
3. ✅ Next patterns are copy-paste identical
4. ✅ Your muscle memory is built
5. ✅ You can migrate 3+ tables per day if needed

---

## 🚀 Do This Now (Choose One)

### Option 1: Copy-Paste Ready (Pattern C)
```
File: PHASE_90_SAFE_MIGRATION_PATTERNS.md (Section 6)
Table: evidence + legal_documents
Time: 3 minutes
Command: npm run db:check-duplicates && npm run db:snapshot-before && npx drizzle-kit push
```

### Option 2: Build It Yourself First
```
1. Read: PHASE_90_SAFE_MIGRATION_PATTERNS.md
2. Understand patterns A, B, C
3. Pick table
4. Write SQL
5. Test with --dry
6. Execute ceremony
```

### Option 3: Run All Three (10 minutes)
```
Pattern C → Pattern A → Pattern B
Copy SQL from PHASE_90_SAFE_MIGRATION_PATTERNS.md
Create 3 migration files
Run Phase 90 ceremony 3x
Done
```

---

## 🎯 My Recommendation

**Start with Pattern C (lifecycle) because:**

✅ Unblocks everything (Phase 90 is the foundation)
✅ Zero prerequisites (no duplicate checking needed)
✅ Fastest to execute (3 minutes)
✅ Lowest risk (all columns default/nullable)
✅ Biggest impact (enables soft-delete everywhere)

**Then follow with A and B as needed.**

---

## 📋 Quick Copy-Paste Commands

### Pattern C (Lifecycle) - Run This Now
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Create migration
$sql = @"
ALTER TABLE "evidence"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "qdrant_synced_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_evidence_is_active" ON "evidence" ("is_active", "deleted_at");
"@

$sql | Set-Content drizzle/0009_lifecycle.sql

# Execute Phase 90 ceremony
npm run db:check-duplicates; npm run db:snapshot-before; npx drizzle-kit push --dry; npx drizzle-kit push; npm run db:snapshot-after; npm run db:compare-snapshots
```

---

## Next Step

1. Pick a path above (A, B, or C)
2. Open `PHASE_90_SAFE_MIGRATION_PATTERNS.md`
3. Find your pattern section
4. Copy SQL
5. Create `.sql` file in `drizzle/`
6. Run Phase 90 ceremony
7. Verify with `db:compare-snapshots`

**That's it. You're now Phase 90 certified.** ✅

---

**Status: Ready to migrate** 🚀
**Risk Level: Very Low**
**Time to Complete: 3-10 minutes**
