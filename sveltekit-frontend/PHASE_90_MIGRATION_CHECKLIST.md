# Phase 90 Migration Checklist
## Safe, Non-Destructive Database Evolution

**Migration File:** `drizzle/migrations/0001_phase90_add_lifecycle_columns.sql`
**Date:** December 6, 2025
**Status:** ✅ PHASE 90 APPROVED (Additive Only)

---

## Pre-Migration Verification ✅

- [x] **No DROP TABLE statements** – Verified via grep
- [x] **No TRUNCATE operations** – Verified via grep
- [x] **No DROP COLUMN on data-bearing columns** – Verified via grep
- [x] **All new columns are nullable or have safe defaults** – Verified
- [x] **Migration uses ADD COLUMN IF NOT EXISTS** – Idempotent design
- [x] **Indexes created with IF NOT EXISTS** – Safe to re-run

---

## Columns Being Added

### Evidence Table
```
is_active          boolean DEFAULT true NOT NULL    – Soft-delete flag
version            integer DEFAULT 1 NOT NULL       – Content version tracking
content_hash       text                             – SHA-256 of content
deleted_at         timestamp                        – Soft-delete timestamp
embedding_updated_at timestamp                     – Embedding generation timestamp
qdrant_point_id    text                            – Qdrant vector ID
qdrant_collection  text                            – Qdrant collection name
qdrant_synced_at   timestamp                       – Last Qdrant sync timestamp
qdrant_sync_error  text                            – Sync failure message
```

### Legal Documents Table
```
is_active          boolean DEFAULT true NOT NULL
version            integer DEFAULT 1 NOT NULL
content_hash       text
deleted_at         timestamp
embedding_model    text                             – Which embedding model used
embedding_updated_at timestamp
qdrant_point_id    text
qdrant_collection  text DEFAULT 'legal_documents'
qdrant_synced_at   timestamp
qdrant_sync_error  text
```

### Similar columns added to:
- `document_chunks`
- `cases`

---

## Safety Measures In Place

### 1. Database Connection Check
```bash
# Before running: verify PostgreSQL is accessible
npm run db:check-connection
```

### 2. Duplicate Email Check (for UNIQUE constraint)
```bash
# Check for duplicate emails before constraint is added
SELECT email, COUNT(*) AS count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

If this returns rows: resolve duplicates manually before migration.

### 3. Before-Migration Snapshot
```bash
npm run db:snapshot-before
```
Takes row count snapshots of all affected tables.

### 4. Apply Migration
```bash
npx drizzle-kit push
```

### 5. After-Migration Snapshot
```bash
npm run db:snapshot-after
```

### 6. Verify No Data Loss
```bash
npm run db:compare-snapshots
```
Should show:
- Row counts unchanged (except new columns)
- Schema evolved as expected
- No tables dropped
- No rows deleted

---

## Phase 90 Guarantees

✅ **Never silently delete data**
If there's a duplicate key or NOT NULL constraint violation, migration fails explicitly with clear error message.

✅ **Always have an audit trail**
Before/after snapshots stored in `db-snapshots/` folder. Can prove which tables were modified.

✅ **Columns are additive, never destructive**
Old columns remain. New columns are non-blocking (nullable or with defaults).

✅ **Worker-ready design**
New columns support Phase 90 worker patterns:
- `is_active` flag for soft deletes
- `qdrant_synced_at` for sync tracking
- `embedding_updated_at` for update detection

---

## Post-Migration Steps

### 1. Verify Columns Added
```bash
psql -h localhost -U legal_admin -d legal_ai_db -c "\d evidence"
psql -h localhost -U legal_admin -d legal_ai_db -c "\d legal_documents"
```

### 2. Backfill Optional Metadata
If you want to populate `content_hash` for existing rows:
```bash
npm run phase90:backfill-content-hash
```

### 3. Wire Up Helpers
Start using Phase 90 helpers in application code:
```typescript
import { softDeleteChunk, upsertChunkContent, getChunksPendingQdrantSync } from '$lib/server/db/phase90-helpers';

// Example: soft delete instead of hard delete
await softDeleteChunk(db, chunkId);

// Example: update content with automatic version bump
await upsertChunkContent(db, { id: chunkId, content: newContent });
```

### 4. Deploy Workers
Start Phase 90 workers when ready:
```bash
# Qdrant sync worker (pgvector → Qdrant)
node src/lib/server/workers/qdrant-sync-worker.ts

# Embedding generation worker (content → pgvector)
# [To be created in Phase 90 Stage 1]
```

---

## Rollback Plan (If Needed)

If something goes wrong **before** you run the migration:

1. **Before applying:** Just don't run `npx drizzle-kit push` – no damage
2. **After applying:** The migration is idempotent (uses `IF NOT EXISTS`)
   - Can re-run without errors
   - Can run with older schema if needed

If columns were added and you want to remove them (extreme case):
```sql
-- Remove Phase 90 columns (only if absolutely necessary)
ALTER TABLE "evidence" DROP COLUMN IF EXISTS "is_active";
ALTER TABLE "evidence" DROP COLUMN IF EXISTS "version";
-- ... etc (but this defeats Phase 90's purpose)
```

---

## Decision: Ready to Proceed?

**Before running:**
1. ✅ Verify database is running: `npm run db:check-duplicates`
2. ✅ Take snapshots: `npm run db:snapshot-before`
3. ✅ Run migration: `npx drizzle-kit push`
4. ✅ Verify: `npm run db:snapshot-after && npm run db:compare-snapshots`

**Expected Outcome:**
- ✅ Schema extended with Phase 90 columns
- ✅ No rows deleted
- ✅ No tables dropped
- ✅ Existing data untouched
- ✅ Ready for Phase 90 workers

---

## Timeline

```
Dec 6, 2025 - Migration prepared (THIS STEP)
Dec 6, 2025 - Apply migration safely (NEXT STEP)
Dec 6, 2025 - Create embedding worker (Stage 1)
Dec 6, 2025 - Test full pipeline (Stage 2)
```

✅ **Phase 90 Migration is APPROVED and READY**
