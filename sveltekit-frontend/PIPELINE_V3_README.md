# Legal AI Pipeline v3.0 - Progress + JSONL + Safety

Complete error detection → analysis → tier-based fixing with persistent memory.

## 🚀 Quick Start

```bash
# Run full pipeline with progress bars + heartbeat
pwsh scripts/advanced-check.ps1

# Then apply safe (Tier 1) fixes
node scripts/batch-merger-fixer.mjs --apply-safe --tier 1
```

## 📋 Pipeline Phases

### Phase 1: Compilation Check (advanced-check.ps1)

**Features:**
- ✅ Real progress bar (% complete based on time)
- ✅ Heartbeat display (last output line visible)
- ✅ Hard timeout (default 15 min) with cleanup
- ✅ Guaranteed log file (`reports/svelte_raw_<timestamp>.log`)
- ✅ No hangs even if terminal crashes

**Output:**
```
reports/
  ├── svelte_raw_2025-12-17_14-30-45.log      # Raw svelte-check output
  ├── error-events_2025-12-17_14-30-45.jsonl  # Structured JSONL events
  └── fix-plan_2025-12-17_14-30-45.json       # Tiered fix recommendations
```

### Phase 2: Analysis (analyze-errors-simd.mjs)

Converts raw compiler output → **JSONL** + **fix-plan.json**

**JSONL Format (streaming-ready):**
```jsonl
{"fingerprint":"a1b2c3d4e5f6g7","tool":"svelte-check","file":"src/routes/+page.svelte","line":21,"col":6,"code":"non_reactive_update","severity":"error","message":"...","category":"reactive-update","timestamp":"2025-12-17T14:30:45Z"}
```

**Categories:**
- `unused-variable` (Tier 1 - safe)
- `async-function`, `reactive-update` (Tier 2 - semi-safe)
- `import-type-misuse`, `type-mismatch`, `bits-ui-dialog` (Tier 3 - manual)

### Phase 3: Batch Fixer (batch-merger-fixer.mjs)

**Tier-Based Application:**

#### Tier 1: Safe Deterministic (100% confidence)
```bash
node scripts/batch-merger-fixer.mjs --apply-safe --tier 1
```
- ✅ Remove unused variables
- ✅ Delete unused imports
- ✅ Auto-applied, no review needed

#### Tier 2: Semi-Safe (95% confidence)
```bash
node scripts/batch-merger-fixer.mjs --apply-safe --tier 2
```
- ✅ Wrap onMount(async) → onMount(() => { (async () => {...})(); })
- ✅ Fix reactive updates
- ✅ Requires verification on success

#### Tier 3: Manual Review (requires human)
```bash
node scripts/batch-merger-fixer.mjs --generate-patches
```
- 📋 Generates patch files in `reports/patches-<timestamp>/`
- 🔍 Human review for complex changes
- ✏️ Selective application of proven fixes

### @KIRO_TODO Contracts

Safe stub generation from structured comments:

```typescript
/* @KIRO_TODO
id: phase13.detect.redis
requires: REDIS_URL
implements: function detectRedis(): Promise<ServiceStatus>
acceptance:
  - returns { ok: true } when PING succeeds
  - ok=false with reason on timeout
*/
```

**Parser scans for:**
- `id`: Unique identifier for stub
- `requires`: Environment variables needed
- `implements`: Function signature + types
- `acceptance`: Test acceptance criteria

**Output:** `reports/stubs-<timestamp>.json`

## 📊 API Endpoints (Phase 5)

### System Health

#### GET /api/system/phase13
```bash
curl http://localhost:5173/api/system/phase13
```
Response:
```json
{
  "timestamp": "2025-12-17T14:30:45.123Z",
  "services": {
    "redis": { "ok": true, "message": "PONG" },
    "postgres": { "ok": true, "version": "PostgreSQL 17...", "database": "legal_ai_db" },
    "qdrant": { "ok": true, "status": 200 },
    "ollama": { "ok": true, "modelCount": 2 }
  }
}
```

#### GET /api/system/services
Detailed service probe results.

#### GET /api/system/env
Sanitized environment flags (no secrets).

### Evidence Pipeline

#### POST /api/evidence/upload
```bash
curl -X POST \
  -F "file=@contract.pdf" \
  -F "caseId=case-123" \
  -F "artifactType=document" \
  http://localhost:5173/api/evidence/upload
```

**Status Workflow:**
1. `staged` - File uploaded to MinIO
2. `sanitizing` - Metadata stripped (ffmpeg/exiftool)
3. `embedding` - Text extracted → embedded via Ollama
4. `complete` - Stored in Postgres + Qdrant

#### POST /api/evidence/:id/sanitize
Strip metadata, compute hash, store artifact.

#### POST /api/evidence/:id/embed
Extract text/audio, embed via `embeddinggemma:latest`, store vectors.

#### POST /api/evidence/:id/timeline
Insert case timeline entry.

#### GET /api/evidence/:caseId/export.pdf
Generate case report (HTML → PDF via playwright).

## 🗄️ Database Schema

### ai_fix_runs
Tracks when analysis/fixing happened:
```sql
CREATE TABLE ai_fix_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMP,
  git_sha VARCHAR(40),
  command VARCHAR(255),        -- "analyze-errors", "batch-fixer --tier 1"
  status VARCHAR(20),          -- "running", "completed", "failed"
  summary JSONB                -- { totalErrors: 123, applied: 45 }
);
```

### ai_fix_events
Individual errors detected + metadata:
```sql
CREATE TABLE ai_fix_events (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES ai_fix_runs(id),
  tool VARCHAR(50),            -- "svelte-check", "tsc"
  file VARCHAR(512),
  line INT,
  code VARCHAR(100),           -- TS2828, non_reactive_update
  category VARCHAR(50),        -- import-type-misuse, async-function
  fingerprint VARCHAR(20) UNIQUE  -- dedup key
);
```

### ai_fix_patches
Specific fixes tried (what worked?):
```sql
CREATE TABLE ai_fix_patches (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES ai_fix_runs(id),
  file VARCHAR(512),
  diff TEXT,                   -- unified diff
  applied BOOLEAN,
  result VARCHAR(50),          -- "success", "failed"
  confidence FLOAT             -- 0.0-1.0
);
```

### evidence_ingest_jobs
Evidence pipeline metadata:
```sql
CREATE TABLE evidence_ingest_jobs (
  id VARCHAR(100) PRIMARY KEY,
  case_id VARCHAR(100),
  artifact_type VARCHAR(50),   -- "document", "image", "audio"
  status VARCHAR(50),          -- "staged", "sanitizing", "embedding"
  hash_blake3 VARCHAR(64),     -- content dedup
  minio_key VARCHAR(512),
  vector_id VARCHAR(100)       -- Qdrant collection ID
);
```

## 🔧 Implementation Checklist

- [x] `advanced-check.ps1` - Progress bars + heartbeat + streaming
- [x] `analyze-errors-simd.mjs` - JSONL output + fix-plan.json
- [x] `batch-merger-fixer.mjs` - @KIRO_TODO parsing + tier-based fixing
- [x] `GET /api/system/phase13` - Health check
- [x] `GET /api/system/services` - Service probes
- [x] `GET /api/system/env` - Sanitized env flags
- [x] `POST /api/evidence/upload` - MinIO + DB staging
- [x] `ai_fix_runs/events/patches` schema - Postgres persistence
- [ ] `POST /api/evidence/:id/sanitize` - Metadata stripping
- [ ] `POST /api/evidence/:id/embed` - Vector storage
- [ ] `POST /api/evidence/:id/timeline` - Timeline entries
- [ ] `GET /api/evidence/:caseId/export.pdf` - Report generation
- [ ] Redis cache for fix fingerprints (`fix:fingerprint:<hash>`)
- [ ] Migration runner (schema auto-apply)

## 📈 Performance Targets

| Phase | Target | Status |
|-------|--------|--------|
| Compilation | <15 min | ✅ (timeout + streaming) |
| Analysis | <30 sec | ✅ (JSONL streaming) |
| Tier 1 Apply | <2 min | ✅ (deterministic rewrites) |
| Tier 2 Apply | <5 min | ⏳ (needs code review) |
| Full Pipeline | <25 min | ✅ (parallel where possible) |

## 🚨 Safety Rules

1. **Only Tier 1 fixes are auto-applied** (`--apply-safe --tier 1`)
2. **Tier 2 requires explicit `--tier 2` flag** (shows warnings)
3. **Tier 3 always generates patches** (never auto-applies)
4. **Fingerprinting prevents duplicate fixes** (SHA256 of file+line+code)
5. **All changes logged to `ai_fix_patches`** (audit trail)

## 📝 Example Session

```bash
# Step 1: Run analysis with progress
pwsh scripts/advanced-check.ps1
# ✅ Generated: error-events.jsonl (245 events), fix-plan.json

# Step 2: Apply Tier 1 (safe)
node scripts/batch-merger-fixer.mjs --apply-safe --tier 1
# ✅ Applied: 32 unused variable removals
# ✅ Inserted: 32 rows into ai_fix_patches with result=success

# Step 3: Check Tier 2 plan
cat reports/fix-plan_*.json | jq '.tiers[1]'
# Shows: 18 onMount-async fixes, 5 reactive-update fixes

# Step 4: Apply Tier 2 with review
node scripts/batch-merger-fixer.mjs --apply-safe --tier 2
# ⚠️ 23 Tier 2 fixes ready for verification

# Step 5: Verify success
npm run check:svelte
# ✅ Error count dropped from 245 → 178

# Step 6: Tier 3 patches for manual review
node scripts/batch-merger-fixer.mjs --generate-patches --tier 3
# ✅ Saved: 52 patch files to reports/patches-*/
```

## 🔗 Integration with Legal AI

- **Ollama**: `embeddinggemma:latest` + `Gemma3-legal` for semantic search
- **Qdrant**: Vector storage for case law similarity
- **Postgres pgvector**: Store + query evidence embeddings
- **Redis**: Cache fix recommendations + session memory

---

**Last Updated:** 2025-12-17
**Version:** 3.0 (Progress + JSONL + Tiers)
