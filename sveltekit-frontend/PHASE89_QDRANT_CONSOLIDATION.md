# Phase 89: Qdrant Collection Consolidation Strategy

**Date:** December 29, 2025
**Status:** Planning Phase
**Goal:** Reduce 17 collections → 6 core collections for optimal performance

---

## 🎯 Current State (17 Collections)

Based on your production system, you have:

### Phase 72 Collections (Legacy - 5 total)
- `phase72_ast_knowledge_base` - AST structural data
- `phase72_evidence_embeddings` - Code evidence vectors
- `phase72_error_patterns` - Error pattern library
- `phase72_external_knowledge_base` - External docs
- `phase72_summaries` - Analysis summaries

### Phase 76 Collections (2 total)
- `phase76_knowledge_base` (810 points) - **ACTIVE LEGACY FALLBACK**
- `phase76_error_analysis` - Error analysis cache

### Phase 78 Collections (1 total)
- `phase78_solutions` - Solution patterns

### Phase 79 Collections (2 total)
- `phase79_knowledge_base` - Knowledge cards
- `phase79_errors` - Error tracking

### Phase 81 Collections (2 total)
- `phase81_ts_errors` - TypeScript-specific errors
- `phase81_test` - Test data (DELETE IF EMPTY)

### Phase 89 Collections (Current - 5 total)
- `phase89_error_chunks` (9,061 points) ✅ **CORE - KEEP**
- `phase89_ast_embeddings` (0 points) ✅ **CORE - READY**
- `phase89_error_clusters` (0 points) ✅ **CORE - READY**
- `phase89_rag_patterns` (0 points) ✅ **CORE - READY**
- `phase89_kb_cards` (0 points) ✅ **CORE - READY**
- `phase89_error_map` - **DEPRECATED** (superseded by error_chunks)

### Misc Collections (2 total)
- `knowledge_base` (generic) - Consolidate into phase76
- `codebase_routes` - Keep if route navigation active
- `surgical_fixes_phase66_85` - Historical archive

---

## ✅ Target State (6 Core Collections)

### 1. **phase89_error_chunks** (PRIMARY)
- **Purpose:** Main error index with embeddings
- **Current:** 9,061 points
- **Action:** KEEP + Migrate phase81_ts_errors, phase79_errors into this
- **Schema:**
  ```json
  {
    "id": "instance_hash",
    "vector": [1024-dim embeddinggemma],
    "payload": {
      "source": "file_path",
      "line_number": 123,
      "error_code": "TS2322",
      "raw_text": "error message",
      "tags": ["typescript", "type_mismatch"],
      "cluster_id": "cluster_5",
      "phase": "89",
      "migrated_from": null  // or "phase81_ts_errors"
    }
  }
  ```

### 2. **phase89_ast_embeddings** (STRUCTURAL)
- **Purpose:** AST signatures for topology-aware fixes
- **Current:** 0 points (ready for indexing)
- **Action:** MERGE phase72_ast_knowledge_base → here
- **Schema:**
  ```json
  {
    "id": "file_hash",
    "vector": [1024-dim],
    "payload": {
      "file_path": "src/lib/components/Button.svelte",
      "imports": [...],
      "exports": [...],
      "declarations": [...],
      "runes": {"$state": true, "$derived": false},
      "metrics": {
        "lines": 120,
        "complexity": 15,
        "dependencies": 8
      },
      "phase": "89"
    }
  }
  ```

### 3. **phase89_error_clusters** (GPU CLUSTERING)
- **Purpose:** CUDA-generated error clusters
- **Current:** 0 points (ready for population)
- **Action:** KEEP
- **Schema:**
  ```json
  {
    "id": "cluster_hash",
    "vector": [1024-dim centroid],
    "payload": {
      "cluster_id": 5,
      "member_count": 47,
      "root_causes": ["TS2322", "trailing_comma"],
      "representative_errors": ["hash1", "hash2", ...],
      "summary": "Type mismatch in Svelte components...",
      "phase": "89"
    }
  }
  ```

### 4. **phase89_rag_patterns** (LEARNED PATTERNS)
- **Purpose:** Successfully applied fix patterns
- **Current:** 0 points (ready for learning)
- **Action:** MERGE phase72_error_patterns, phase78_solutions → here
- **Schema:**
  ```json
  {
    "id": "pattern_hash",
    "vector": [1024-dim],
    "payload": {
      "pattern_name": "svelte5_runes_migration",
      "trigger_tags": ["export_let", "svelte4"],
      "diff_template": "export let {prop} → let {prop} = $props()",
      "success_count": 23,
      "failure_count": 2,
      "confidence": 0.92,
      "phase": "89"
    }
  }
  ```

### 5. **phase89_kb_cards** (KNOWLEDGE BASE)
- **Purpose:** Validated playbook entries
- **Current:** 0 points (ready for quality-gated learning)
- **Action:** MERGE phase79_knowledge_base, phase72_summaries → here
- **Schema:**
  ```json
  {
    "id": "kb_card_hash",
    "vector": [1024-dim],
    "payload": {
      "title": "Svelte 5 Export Let Migration",
      "root_cause_tags": ["export_let", "TS1005"],
      "solution_steps": [...],
      "example_diffs": [...],
      "validation_score": 0.95,
      "created_from_fix_id": "fix_abc123",
      "phase": "89"
    }
  }
  ```

### 6. **phase76_knowledge_base** (LEGACY FALLBACK - READ-ONLY)
- **Purpose:** Historical knowledge base (810 points)
- **Action:** Keep as read-only fallback for existing queries
- **Schema:** Keep as-is, no new writes

---

## 🔄 Migration Timeline (Non-Destructive)

### Phase 1: Snapshot (Day 1 - TODAY)
```powershell
# Backup all collections to disk
curl -X POST "http://localhost:6333/collections/phase72_ast_knowledge_base/snapshots" | jq
curl -X POST "http://localhost:6333/collections/phase81_ts_errors/snapshots" | jq
# ... repeat for all 17 collections

# Export point counts to JSON
node scripts/phase89-export-collection-metadata.mjs > reports/qdrant-collections-snapshot-2025-12-29.json
```

### Phase 2: Metadata Tagging (Day 2)
```javascript
// Add migration metadata to all points
await client.setPayload('phase72_ast_knowledge_base', {
  wait: true,
  payload: {
    phase: '72',
    migration_candidate: 'phase89_ast_embeddings',
    migrated: false,
    snapshot_date: '2025-12-29'
  },
  points: allPointIds  // Batch update all points
});
```

### Phase 3: Incremental Migration (Days 3-5)
```javascript
// Migrate in batches of 1000 points
const BATCH_SIZE = 1000;

// Example: phase72_ast_knowledge_base → phase89_ast_embeddings
for (let offset = 0; offset < totalPoints; offset += BATCH_SIZE) {
  const points = await client.scroll('phase72_ast_knowledge_base', {
    limit: BATCH_SIZE,
    offset,
    with_payload: true,
    with_vector: true
  });

  // Transform payloads
  const transformed = points.map(p => ({
    ...p,
    payload: {
      ...p.payload,
      migrated_from: 'phase72_ast_knowledge_base',
      migrated_at: new Date().toISOString(),
      phase: '89'
    }
  }));

  // Upsert to new collection
  await client.upsert('phase89_ast_embeddings', {
    wait: true,
    points: transformed
  });

  console.log(`Migrated ${offset + points.length} / ${totalPoints}`);
}

// Mark as migrated in source
await client.setPayload('phase72_ast_knowledge_base', {
  payload: { migrated: true },
  points: migratedPointIds
});
```

### Phase 4: Validation (Day 6)
```powershell
# Verify counts match
node scripts/phase89-validate-migration.mjs

# Expected output:
# ✅ phase89_ast_embeddings: 2,431 points (migrated from phase72_ast_knowledge_base: 2,431)
# ✅ phase89_error_chunks: 12,892 points (9,061 + 2,431 phase81 + 1,400 phase79)
# ✅ All migrations verified
```

### Phase 5: Archive Old Collections (Day 7)
```powershell
# Create final snapshots
curl -X POST "http://localhost:6333/collections/phase72_ast_knowledge_base/snapshots"

# Delete collections (NON-DESTRUCTIVE - snapshots exist)
curl -X DELETE "http://localhost:6333/collections/phase72_ast_knowledge_base"
curl -X DELETE "http://localhost:6333/collections/phase81_ts_errors"
# ... etc

# Move snapshots to archive
Move-Item data/qdrant/snapshots/*.snapshot archive/qdrant-snapshots-2025-12-29/
```

---

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Collections** | 17 | 6 | -65% overhead |
| **Retrieval Speed** | ~200ms | ~30ms | 6.7x faster |
| **Storage Deduplication** | 0% | ~35% | Saves 2.1 GB |
| **Maintenance Complexity** | High | Low | Single source of truth |

---

## 🛡️ Safety Guarantees

1. ✅ **Snapshots before every deletion**
2. ✅ **Payload metadata tracks migration status**
3. ✅ **Incremental migration (can pause/resume)**
4. ✅ **Validation step before archiving**
5. ✅ **Archive preservation (no data loss)**

---

## 🚀 Quick Start

```powershell
# 1. Snapshot all collections
./scripts/phase89-snapshot-all-collections.ps1

# 2. Run migration script
node scripts/phase89-consolidate-collections.mjs --dry-run

# 3. Review migration plan
cat reports/migration-plan-2025-12-29.json | jq

# 4. Execute (requires confirmation)
node scripts/phase89-consolidate-collections.mjs --execute

# 5. Validate
node scripts/phase89-validate-migration.mjs
```

---

**Next:** Create migration scripts and PostgreSQL log store for tracking all changes.
