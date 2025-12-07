# Phase 90 Migration Runbook

## 🎯 Strategy

**Incremental, Additive, Audited**

- ✅ Add columns (never drop)
- ✅ Rename to `*_legacy` (never truncate)
- ✅ Archive data before destructive changes
- ✅ Snapshots before/after every migration
- ✅ Verify zero data loss

## 📋 Pre-Migration Checklist

```powershell
# 1. Check for duplicate emails (UNIQUE constraint requirement)
npm run db:check-duplicates

# 2. Verify all services healthy
npm run preflight

# 3. Take snapshot BEFORE migration
npm run db:snapshot-before
```

## 🚀 Migration Steps

### Step 1: Apply Phase 90 Schema (Additive Only)

```powershell
# This adds lifecycle columns to existing tables
# NO DROP operations - safe by design
npx drizzle-kit push
```

**What this adds:**
- `is_active` (boolean, default true) - soft delete flag
- `version` (integer, default 1) - content version tracking
- `content_hash` (text, nullable) - SHA256 of content
- `deleted_at` (timestamp, nullable) - soft delete timestamp
- `embedding_updated_at` (timestamp, nullable) - last embedding generation
- `qdrant_point_id` (text, nullable) - Qdrant sync tracking
- `qdrant_synced_at` (timestamp, nullable) - last Qdrant sync
- `qdrant_sync_error` (text, nullable) - sync error messages

**Tables affected:**
- `evidence`
- `legal_documents`
- `document_chunks`
- `cases`
- `users`
- `phase72_error_vector`

### Step 2: Backfill Content Hashes

```powershell
# Calculate SHA256 hashes for existing data
npm run phase90:backfill-content-hash
```

**What this does:**
- Calculates `content_hash` for all existing rows
- Sets `version = 1` for all rows
- Sets default `embedding_model = 'embeddinggemma:latest'`
- Sets default `qdrant_collection` per table

### Step 3: Verify Migration Safety

```powershell
# Take snapshot AFTER migration
npm run db:snapshot-after

# Compare before/after (should show zero data loss)
npm run db:compare-snapshots
```

**Expected output:**
```
✅ evidence: 7 rows → 7 rows (0 lost)
✅ legal_documents: 5 rows → 5 rows (0 lost)
✅ document_chunks: 12 rows → 12 rows (0 lost)
✅ users: 1 rows → 1 rows (0 lost)
```

## 🔍 Post-Migration Verification

### SQL Checks (run in psql)

```sql
-- 1. Verify new columns exist with correct defaults
SELECT
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'evidence'
  AND column_name IN ('is_active', 'version', 'content_hash', 'deleted_at');

-- 2. Verify all rows are active (no accidental soft deletes)
SELECT COUNT(*) AS active_count
FROM evidence
WHERE is_active = true;

-- Should match total row count:
SELECT COUNT(*) AS total_count
FROM evidence;

-- 3. Verify content hashes were backfilled
SELECT COUNT(*) AS rows_with_hash
FROM evidence
WHERE content_hash IS NOT NULL;

-- 4. Check Phase 72 errors (768d) vs legal docs (384d) separation
SELECT
  'phase72_errors' AS collection,
  COUNT(*) AS count,
  '768d' AS dimension
FROM phase72_error_vector
WHERE qdrant_collection = 'phase72_errors'

UNION ALL

SELECT
  'legal_documents' AS collection,
  COUNT(*) AS count,
  '384d' AS dimension
FROM legal_documents
WHERE qdrant_collection = 'legal_documents';
```

### PowerShell Verification

```powershell
# Scan codebase for dimension consistency
.\scripts\Scan-Dimensions.ps1 -Mode grouped

# Expected output:
# 384d: 169 occurrences (legal documents)
# 768d: 120 occurrences (Phase 72 errors)
```

## 🔄 Rollback Plan (Emergency Only)

If something goes wrong:

```sql
-- Rollback: Remove Phase 90 columns (only if needed)
ALTER TABLE evidence
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS content_hash,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS embedding_updated_at,
  DROP COLUMN IF EXISTS qdrant_point_id,
  DROP COLUMN IF EXISTS qdrant_synced_at,
  DROP COLUMN IF EXISTS qdrant_sync_error;

-- Repeat for other tables...
```

**Better approach:** Restore from snapshot taken in Step 3.

## 📊 Phase 90 Worker Pipeline

After migration completes, start Phase 90 workers:

```powershell
# Stage 1: Embedding generation (content → pgvector)
npm run worker:embedding-generator

# Stage 2: Qdrant sync (pgvector → Qdrant)
npm run worker:qdrant-sync

# Monitor sync status
npm run phase90:sync-status
```

## 🛡️ Phase 90 Principles (Enforced)

1. **Never hard delete** - use `is_active = false` + `deleted_at`
2. **Never overwrite content** - bump `version` + clear embeddings
3. **Postgres = truth** - pgvector in Postgres, Qdrant is rebuildable index
4. **Track sync state** - `qdrant_synced_at` timestamps
5. **Archive before destroy** - rename to `*_legacy` before DROP

## 📝 NPM Scripts Reference

```json
{
  "db:check-duplicates": "powershell -File scripts/check-duplicates.ps1",
  "db:snapshot-before": "powershell -File scripts/snapshot-before.ps1",
  "db:snapshot-after": "powershell -File scripts/snapshot-after.ps1",
  "db:compare-snapshots": "powershell -File scripts/compare-snapshots.ps1",
  "db:migrate-safe": "npm run db:check-duplicates && npm run db:snapshot-before && npx drizzle-kit push && npm run db:snapshot-after",
  "phase90:backfill-content-hash": "tsx scripts/phase90-backfill-content-hash.ts",
  "phase90:sync-status": "tsx scripts/phase90-sync-status.ts",
  "worker:embedding-generator": "tsx src/lib/server/workers/embedding-generator.ts",
  "worker:qdrant-sync": "tsx src/lib/server/workers/qdrant-sync-worker.ts"
}
```

## ✅ Success Criteria

Migration is successful when:

- ✅ All tables have Phase 90 columns
- ✅ Row counts unchanged (no data loss)
- ✅ All `is_active = true` by default
- ✅ Content hashes backfilled
- ✅ Dimension scan shows 384d/768d consistency
- ✅ Workers can query `getChunksPendingEmbedding()`
- ✅ Qdrant sync worker can process batches

## 🎯 Next Steps

After successful migration:

1. Test soft delete: `softDeleteChunk(db, chunkId)`
2. Test version bump: `upsertChunkContent(db, { id, content })`
3. Test embedding pipeline: content → embed → pgvector
4. Test Qdrant sync: pgvector → Qdrant with retry
5. Verify browser UI shows Phase 90 metadata
