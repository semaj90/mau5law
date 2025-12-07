# Phase 90 Quick Reference

## 🚀 One-Command Migration

```bash
npm run phase90:full-migration
```

## 📋 Individual Steps

```bash
npm run preflight                    # Check all services
npm run db:check-duplicates          # Check for duplicate emails
npm run db:snapshot-before           # Take before snapshot
npx drizzle-kit push                 # Apply migration
npm run phase90:backfill             # Calculate content hashes
npm run db:snapshot-after            # Take after snapshot
npm run db:compare-snapshots         # Verify zero loss
```

## 🛡️ Core Principles

```typescript
// ❌ NEVER hard delete
await db.delete(chunks).where(eq(chunks.id, id));

// ✅ ALWAYS soft delete
await softDeleteChunk(db, id);

// ❌ NEVER overwrite content directly
await db.update(chunks).set({ content: newContent });

// ✅ ALWAYS version bump + clear embeddings
await upsertChunkContent(db, { id, content: newContent });
```

## 📊 Phase 90 Columns (All Tables)

```sql
is_active boolean DEFAULT true       -- Soft delete flag
version integer DEFAULT 1            -- Content version
content_hash text                    -- SHA256 hash
deleted_at timestamp NULL            -- Soft delete time
created_at timestamp DEFAULT now()   -- Audit
updated_at timestamp DEFAULT now()   -- Audit
created_by integer REFERENCES users  -- Who created
updated_by integer REFERENCES users  -- Who modified
```

## 📊 Phase 90 Columns (Vector Tables)

```sql
-- All base columns PLUS:
embedding vector(384)                -- or vector(768) for errors
embedding_model text                 -- 'embeddinggemma:latest'
embedding_updated_at timestamp       -- Last embed time
qdrant_point_id text                 -- Qdrant UUID
qdrant_collection text               -- 'legal_documents' or 'phase72_errors'
qdrant_synced_at timestamp           -- Last sync time
qdrant_sync_error text               -- Sync error (if any)
```

## 🎯 Dimension Rules

```
384d → legal_documents, legal_evidence, document_chunks
768d → phase72_errors, phase72_error_vector
```

## 🔄 Worker Pipeline

```
Stage 1: content → Ollama embeddinggemma → pgvector
Stage 2: pgvector → Qdrant upsert
```

## ✅ Success Criteria

```powershell
# After migration, all should return true:
npm run preflight                    # ✅ All services healthy
npm run db:compare-snapshots         # ✅ Zero data loss
npm run verify:qdrant                # ✅ Dimensions match
```

## 📁 Key Files

```
drizzle/migrations/0001_phase90_add_lifecycle_columns.sql
src/lib/server/db/phase90-helpers.ts
src/lib/server/workers/qdrant-sync-worker.ts
scripts/phase90-backfill-content-hash.ts
PHASE_90_MIGRATION_RUNBOOK.md
```

## 🚨 Emergency Rollback

```sql
-- Only if migration fails catastrophically
ALTER TABLE evidence DROP COLUMN is_active;
ALTER TABLE evidence DROP COLUMN version;
-- etc... (see runbook for full rollback SQL)
```

Better: Restore from snapshot taken during migration.

## 📞 Support

- Runbook: `PHASE_90_MIGRATION_RUNBOOK.md`
- Summary: `PHASE_90_IMPLEMENTATION_SUMMARY.md`
- Helpers reference: `src/lib/server/db/phase90-helpers.ts` (JSDoc)
