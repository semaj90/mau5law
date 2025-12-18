# Phase 7 Build Status & Next Steps

## Current Status (December 17, 2025)

### ✅ Completed
- **Phase 7 Tasks 15-18**: Diff/Patch substrate complete (PR-15 through PR-18)
  - DiffGenerator with SHA-256 verification
  - DiffApplier with automatic rollback
  - ValidationService with TSC + svelte-check
  - Database schema with Drizzle
  - All tests passing (18/18)

- **Dev Server**: Working on port 5176
- **Core Routes**: `(app)/` directory functional
- **Svelte 5 Migration**: Adapter-node + runes enabled

### ⚠️ Current Blockers

**Production Build Failing** due to corrupted/minified files from AST analysis:
1. ✅ `langextract-ollama-service.ts` - DISABLED
2. ✅ `evidence-upload.js` - DISABLED (`.ts` version exists)
3. ✅ `lucia.ts` - FIXED (added missing declare module)
4. ✅ `fileUploadSchema.ts` - FIXED (rewrote from minified)
5. ⚠️ `enhanced-embedding-schema.ts` - NEEDS FIX (heavily minified)

**Error Pattern**: Files have been minified into single lines with:
- Missing semicolons
- Comma/colon swaps (`foo, bar` instead of `foo: bar`)
- Tagged template issues (`gemma3-legal, latest` instead of `gemma3-legal:latest`)
- Structural corruption beyond regex repair

### 📊 Error Statistics
- **Starting**: 49,759 errors
- **After Phase 72 Tier 1**: 14,091 errors (72% reduction)
- **Current**: 13,801 errors (72.3% reduction)
- **Target**: 9,301 errors (81.3% reduction)

## Recommended Action Plan

### Option A: Git Restore (Fastest - Recommended)

Restore corrupted files from last known good commit (before Dec 15):

```powershell
# 1. Identify corrupted files
cd sveltekit-frontend
npm run check:typescript 2>&1 | Select-String "error TS" > ../reports/current-errors.txt

# 2. Extract top corrupted files from reports/errors.jsonl
node scripts/extract-top-files.mjs --limit 50 > ../reports/top-corrupted.txt

# 3. Git restore from before corruption
git log --since="2025-12-01" --until="2025-12-15" --oneline
# Find last good commit, then:
git checkout <good_commit> -- sveltekit-frontend/src/lib/services/langextract-ollama-service.ts
git checkout <good_commit> -- sveltekit-frontend/src/lib/server/db/enhanced-embedding-schema.ts
# ... repeat for top 50 files
```

### Option B: Quarantine Non-Core Files (Safe)

Move corrupted non-core files to `_disabled`:

```powershell
# Disable corrupted files
cd sveltekit-frontend/src/lib
Rename-Item "services/langextract-ollama-service.ts" "services/langextract-ollama-service.ts.disabled"
Rename-Item "server/db/enhanced-embedding-schema.ts" "server/db/enhanced-embedding-schema.ts.disabled"
```

### Option C: AST-Level Repair (Most Thorough)

Use `ts-morph` to fix structural issues:

```typescript
// Fix patterns:
// - message, string → message: string
// - function params: nodeId, string → nodeId: string
// - object literals: foo, bar → foo: bar
// - tagged strings: gemma3-legal, latest → gemma3-legal:latest
```

## Immediate Next Steps (Recommended)

### 1. Quick Win: Disable Remaining Corrupted Files (5 min)

```powershell
cd sveltekit-frontend/src/lib/server/db
Move-Item "enhanced-embedding-schema.ts" "enhanced-embedding-schema.ts.disabled"

# Try build again
cd ..
npm run build
```

### 2. Verify Core Build (2 min)

```powershell
npm run build 2>&1 | Select-Object -Last 100
```

### 3. If Build Passes: Continue Phase 7 (30 min)

- Wire DiffGenerator to error-handler proposer
- Implement apply-log JSON writer
- Add confidence threshold filtering
- Test batch apply with rollback

### 4. If Build Still Fails: Git Restore (15 min)

Extract and restore top 20 corrupted files from before Dec 15.

## Phase 72 Integration Plan

### Current Phase 72 Assets
- ✅ `patch-safety-gate.mjs` - Validates patches before writing
- ✅ `hardening-utf8.ps1` - PowerShell UTF-8 setup
- ✅ `verify-phase72-safety.mjs` - Test suite (18/18 passing)
- ✅ `factory-fixer-v2.mjs` - Batch fixer with safety gate
- ✅ Error buckets identified (905 errors, 25-30% of remaining)

### Integration with Phase 7 Error Brain

```typescript
// Phase 7 Error Brain + Phase 72 Automation
import { DiffGenerator } from '$lib/services/error-analysis/diffs/DiffGenerator';
import { DiffApplier } from '$lib/services/error-analysis/diffs/DiffApplier';
import { patchSafetyGate } from '../../../scripts/patch-safety-gate.mjs';

// 1. Error Brain generates patches
const diff = await diffGenerator.generateDiff(filePath, originalContent, fixedContent);

// 2. Phase 72 safety gate validates
const validation = await patchSafetyGate.validatePatch(diff.patch);
if (!validation.isValid) {
  console.error('Patch rejected:', validation.reason);
  return;
}

// 3. Apply with automatic rollback
const result = await diffApplier.applyDiff(diff);
```

## GPU/CUDA Integration (Future)

### What GPU Helps With
- ✅ Embeddings / similarity search over past fixes
- ✅ Summarizing error clusters
- ✅ Generating candidate patches (LLM)
- ✅ Reranking patches (cross-encoder)

### What GPU Doesn't Help With
- ❌ `svelte-check`, `tsc`, module resolution (CPU-bound)
- ❌ AST transforms (CPU-bound)

### Recommended Stack
- **Node worker_threads**: Parallel ts-morph transforms
- **Go SIMD**: Fast JSONL parsing
- **Redis**: Caching & routing
- **Postgres**: Durability
- **GPU**: AI assistance (embeddings, LLM, reranking)

## Redis + KAG Integration

### Error Event Storage
```typescript
// Store error events in Redis streams
await redis.xadd('phase72:errors', '*', {
  file: filePath,
  message: errorMessage,
  signature: errorHash,
  timestamp: Date.now()
});

// Query top errors
const topErrors = await redis.zrevrange('phase72:top_messages', 0, 49, 'WITHSCORES');
```

### Patch Knowledge Graph
```typescript
// Store successful patches
await redis.hset(`phase72:sig:${errorHash}`, {
  patch_id: patchId,
  confidence: 0.95,
  applied_count: 42,
  success_rate: 0.98
});

// Query similar errors
const similarPatches = await redis.smembers(`phase72:sig:${errorHash}:patches`);
```

## Success Criteria

### Phase 7 Complete When:
- ✅ Diff/Patch substrate working (DONE)
- ⏳ Production build passes
- ⏳ Error Brain wired to proposer
- ⏳ Batch apply with confidence filtering
- ⏳ Rollback-all command working

### Phase 72 Tier 2 Complete When:
- ⏳ 905 errors fixed (Buckets A-E)
- ⏳ Error count: 13,801 → 9,301 (32.7% reduction)
- ⏳ Overall: 49,759 → 9,301 (81.3% reduction)

## Timeline Estimate

| Task | Time | Status |
|------|------|--------|
| Disable corrupted files | 5 min | ⏳ Next |
| Verify build passes | 2 min | ⏳ |
| Wire Error Brain to proposer | 30 min | ⏳ |
| Test batch apply | 15 min | ⏳ |
| Phase 72 Tier 2 execution | 37 min | ⏳ |
| **Total** | **89 min** | |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| More corrupted files | High | Medium | Quarantine strategy |
| Build still fails | Medium | High | Git restore plan |
| Patch safety issues | Low | High | Safety gate active (18/18 tests) |
| Data loss | Zero | Critical | All backups durable |

## Decision Point

**Recommended**: Proceed with **Option B (Quarantine)** for immediate progress:
1. Disable `enhanced-embedding-schema.ts` (5 min)
2. Verify build passes (2 min)
3. Continue Phase 7 wiring (30 min)
4. Run Phase 72 Tier 2 (37 min)

**Alternative**: If you want maximum code recovery, do **Option A (Git Restore)** first, then proceed with Phase 7.

---

**Status**: 🟡 Build blocked by corrupted files | Dev server working | Phase 7 substrate complete
**Next Action**: Disable `enhanced-embedding-schema.ts` and retry build
**Timeline**: 89 minutes to Phase 7 + Phase 72 Tier 2 complete
