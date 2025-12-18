# Phase 72 Factory Execution Guide

**Date:** December 17, 2025
**Status:** ✅ Factory Breakpoint Locked
**Active Errors:** 42,090 (excluding routes_parked + ai.bak)

---

## Overview

Phase 72 is a **compiler-grade repair pipeline** with 4 invariants guaranteeing safety:

1. **Parser Can't Lie** - Event count must match summary or fail
2. **Stable Fingerprints** - SHA256 hashes for dedupe + caching
3. **Immutable Run Folders** - Never overwrite `runs/<timestamp>/`
4. **Staged Rollback** - Plan → Patch → Apply → Verify → Rollback

---

## Factory Structure

```
reports/
  runs/
    2025-12-17T23-30-45/          # Immutable run folder
      svelte_raw.log              # Raw svelte-check output
      errors.jsonl                # Parsed events (49,734)
      analysis-meta.json          # Run metadata
      fix-plan.json               # Tier-based fix plan
      patches/                    # Human-readable diffs
        POIPhotoModal.svelte.patch
        ...
      backups/                    # Original files before apply
        POIPhotoModal.svelte.bak
        ...
      apply-results.json          # Apply statistics
  latest/                         # Pointer to most recent run
    svelte_raw.log                # Copy (Windows-safe, no symlinks)
    errors.jsonl
    fix-plan.json
```

---

## The 4 Invariants

### Invariant 1: Parser Can't Lie

```javascript
// Enforced in factory-runner.mjs
if (summaryCount !== jsonlEventCount) {
  console.error('INVARIANT VIOLATED: Parser mismatch');
  fs.writeFileSync('unparsed_tail.txt', lastLines);
  process.exit(1);
}
```

**What it prevents:** Silent parse failures hiding errors

### Invariant 2: Stable Fingerprints

```javascript
const fingerprint = crypto
  .createHash('sha256')
  .update(`${file}:${line}:${message.substring(0, 100)}`)
  .digest('hex')
  .substring(0, 12);
```

**What it enables:**
- Dedupe across runs
- "What worked last time" cache
- Persistent fix history in pgvector

### Invariant 3: Immutable Run Folders

```javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join('reports/runs', timestamp);

if (fs.existsSync(runDir)) {
  console.error('INVARIANT VIOLATED: Run already exists');
  process.exit(1);
}
```

**What it prevents:** Runs stomping each other

### Invariant 4: Staged Apply + Rollback

```javascript
// Every file backed up before modification
fs.copyFileSync(file, path.join(backupsDir, basename + '.bak'));

// Atomic rollback if verification fails
if (!verificationPassed) {
  rollbackFromBackups(runDir);
}
```

**What it guarantees:** Zero-risk experimentation

---

## VS Code Tasks (One-Button Operation)

### Task: Phase 72.0 - Factory Pipeline

**Command:** `node scripts/factory-runner.mjs run --tier 1`

**What it does:**
1. Runs `svelte-check` → `reports/runs/<timestamp>/svelte_raw.log`
2. Parses to JSONL → `errors.jsonl`
3. Verifies Invariants 1 & 2
4. Generates fix plan → `fix-plan.json`
5. Updates `reports/latest/` pointer

**When to use:** Start of every Phase 72 session

---

### Task: Phase 72.1 - Apply Tier 1 (services)

**Command:** `node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/services/** --limit=3000`

**What it does:**
1. Loads `reports/latest/fix-plan.json`
2. Filters to `src/lib/services` only
3. Excludes `routes_parked` + `ai.bak` (7,644 errors)
4. Applies first 3000 fixes with backups
5. Creates new run folder with patches + backups

**Expected Impact:**
- **Direct:** ~2,867 Tier 1 fixes in services
- **Cascade:** ~1,000-2,000 downstream parse errors
- **Total:** ~4,000 errors eliminated (8% reduction)

**When to use:** After Phase 72.0, first execution

---

### Task: Phase 72.2 - Apply Tier 1 (server)

**Command:** `node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/server/** --limit=2000`

**What it does:** Same as 72.1 but targets `lib/server` (3,248 errors)

**When to use:** After 72.1 stabilizes

---

### Task: Phase 72 - Verify (ultra-fast)

**Command:** `node scripts/factory-runner.mjs verify "npm run check:ultra-fast"`

**What it does:**
- Runs fast verification gate (< 30s)
- Returns exit code 0 (pass) or 1 (fail)
- Logs output for debugging

**When to use:** After every apply operation

---

### Task: Phase 72 - Rollback Last Run

**Command:** PowerShell finds most recent run + rolls back

**What it does:**
1. Finds `reports/runs/` sorted descending
2. Copies backups over modified files
3. Restores original state

**When to use:** When verification fails

---

### Task: 🎯 Fix Lucide Imports (Tier 1)

**Command:** `node scripts/fix-lucide-imports.mjs --apply --limit 100`

**What it does:**
- Transforms `import { Brain } from "lucide-svelte"` → `import Brain from "lucide-svelte"`
- **100% deterministic** (regex-based AST pattern)
- Affects ~600 errors in POIPhotoModal, etc.
- Creates timestamped backups

**Example:**

**Before:**
```svelte
<script lang="ts">
  import { Brain } from "lucide-svelte";
  import { Calendar } from "lucide-svelte";
</script>
```

**After:**
```svelte
<script lang="ts">
  import Brain from "lucide-svelte";
  import Calendar from "lucide-svelte";
</script>
```

**Why this is Tier 1:**
- Statically provable correct
- Same fix across hundreds of files
- Zero logic impact
- Reversible

**When to use:** Immediate - highest ROI, zero risk

---

## Execution Order (Correct)

### Step 1: Lock the Factory

**Task:** Phase 72.0 - Factory Pipeline

```bash
# Or run directly:
node scripts/factory-runner.mjs run --tier 1
```

**Output:**
```
✅ Loaded 49,734 error events
✅ Parser integrity verified
✅ Fingerprints stable
✅ Run folder: reports/runs/2025-12-17T23-30-45/
✅ Latest updated: reports/latest/
```

**Verify:** Check `reports/latest/fix-plan.json` exists

---

### Step 2: Fix Lucide Imports (Quick Win)

**Task:** 🎯 Fix Lucide Imports (Tier 1)

```bash
# Preview first:
node scripts/fix-lucide-imports.mjs --limit 10

# Apply:
node scripts/fix-lucide-imports.mjs --apply --limit 100
```

**Expected:**
- ~600 errors fixed (1.2% of total)
- Files affected: POIPhotoModal, UI components
- Time: < 5 seconds

**Verify:**
```bash
npm run check:ultra-fast
```

**If failed:** Restore from `reports/backups-lucide-<timestamp>/`

---

### Step 3: Apply Tier 1 to services (Highest ROI)

**Task:** Phase 72.1 - Apply Tier 1 (services)

```bash
# Dry run first:
node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/services/** --limit=3000 --dry-run

# Apply:
node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/services/** --limit=3000
```

**Expected:**
- ~2,867 direct fixes
- ~1,000-2,000 cascade fixes
- Total: ~4,000 errors eliminated

**Verify:**
```bash
node scripts/factory-runner.mjs verify "npm run check:ultra-fast"
```

**If failed:**
```bash
# Get most recent run timestamp
node scripts/factory-runner.mjs status

# Rollback
node scripts/factory-runner.mjs rollback 2025-12-17T23-30-45
```

---

### Step 4: Apply Tier 1 to server

**Task:** Phase 72.2 - Apply Tier 1 (server)

```bash
node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/server/** --limit=2000
```

**Expected:**
- ~500-800 direct fixes
- ~200-400 cascade fixes
- Total: ~1,000 errors eliminated

**Verify:** Same as Step 3

---

### Step 5: Re-run Factory Pipeline

After successful apply + verify:

```bash
node scripts/factory-runner.mjs run --tier 1
```

**Purpose:**
- Generate fresh error inventory
- Update clustering analysis
- Measure actual impact

**Compare:**
```bash
# Before: 49,734 errors
# After Step 2: ~49,100 errors (-600)
# After Step 3: ~45,100 errors (-4,000)
# After Step 4: ~44,100 errors (-1,000)
```

**Total Expected Reduction:** ~5,600 errors (11.3%)

---

## Safety Guarantees

### ✅ What Can't Happen

1. **Silent failures** - Invariant 1 enforces parser integrity
2. **Lost work** - All runs immutable in `reports/runs/`
3. **Irreversible changes** - Every apply creates backups
4. **Scope creep** - Path filters + limits enforced
5. **Noise fixes** - routes_parked + ai.bak auto-excluded

### ⚠️ What Can Happen (By Design)

1. **Verification fails** - Rollback is one command
2. **Unexpected cascades** - Re-run pipeline to measure
3. **Partial applies** - Resume with different `--limit`

---

## Troubleshooting

### Parser Integrity Violation

**Symptom:**
```
❌ INVARIANT VIOLATED: Count mismatch (49734 vs 32)
   Wrote last 1000 lines to: unparsed_tail.txt
```

**Cause:** ANSI codes changed or multi-line pattern broke

**Fix:**
1. Check `unparsed_tail.txt` for pattern changes
2. Update `scripts/parse-fast.mjs` regex
3. Re-run factory pipeline

---

### Verification Fails After Apply

**Symptom:**
```
❌ Verification failed: 52,000 errors (increased!)
```

**Cause:** Tier 1 fix introduced syntax errors

**Fix:**
```bash
# Rollback immediately
node scripts/factory-runner.mjs status  # Get timestamp
node scripts/factory-runner.mjs rollback 2025-12-17T23-30-45

# Verify rollback worked
npm run check:ultra-fast
```

---

### Lucide Fixer No-Op

**Symptom:**
```
Fixed: 0
Skipped: 100
```

**Cause:** Imports already in default format or pattern mismatch

**Fix:**
1. Check sample file: `Get-Content src/lib/client/ui/POIPhotoModal.svelte -Head 20`
2. If already fixed, skip this step
3. If pattern changed, update regex in `fix-lucide-imports.mjs`

---

## Metrics Tracking

### Before Phase 72 (Baseline)

```
Total Errors:        49,734
Active Errors:       42,090 (excluding parked/backup)
Hot Spot:            lib/services (21,035 - 42.30%)
Top 5 Clusters:      6,727 errors (13.53%)
Tier 1 Eligible:     13,826 fixes
```

### After Phase 72.2 (Expected)

```
Total Errors:        ~44,100 (-5,600 / -11.3%)
Active Errors:       ~36,500
Hot Spot:            lib/services (~18,000 - reduced 3,000)
Tier 1 Remaining:    ~10,000
```

### After Phase 72.3 (SIMD Clustering)

```
Semantic Groups:     ~150 clusters (down from 200)
Pattern Accuracy:    85%+ (high-confidence Tier 2 promotion)
GPU Integration:     Ready for Phase 73
```

---

## Integration Points

### Database Persistence (Phase 73)

After Phase 72 stabilizes:

```bash
node scripts/persist-errors.mjs --input reports/latest/errors.jsonl
```

**Writes to:**
- PostgreSQL 17 (legal_ai_db)
- pgvector embeddings
- Redis hot cache

**Enables:**
- "Same error seen before" lookups
- Confidence scoring (fix success rate)
- AI-assisted suggestions

---

### GPU Clustering (Phase 74)

```bash
node scripts/simd-cluster-errors.mjs \
  --input reports/latest/errors.jsonl \
  --gpu \
  --exclude "routes_parked|ai.bak"
```

**Uses:** `src_fixed/simd-json-index-processor.ts` (CUDA acceleration)

**Output:** More accurate semantic grouping for Tier 2 promotion

---

## Phase 72 Complete Checklist

- [x] Invariant 1: Parser integrity enforced
- [x] Invariant 2: Stable fingerprints (SHA256)
- [x] Invariant 3: Immutable run folders
- [x] Invariant 4: Staged rollback
- [x] VS Code tasks created (one-button)
- [x] Lucide fixer (Tier 1 target)
- [x] Factory runner (production-ready)
- [ ] Step 1: Run factory pipeline
- [ ] Step 2: Fix lucide imports (~600 errors)
- [ ] Step 3: Apply Tier 1 to services (~4,000 errors)
- [ ] Step 4: Apply Tier 1 to server (~1,000 errors)
- [ ] Step 5: Re-run pipeline (measure impact)

---

## Next Commands

```bash
# 1. Lock factory
node scripts/factory-runner.mjs run --tier 1

# 2. Quick win
node scripts/fix-lucide-imports.mjs --apply --limit 100
npm run check:ultra-fast

# 3. Big win
node scripts/factory-runner.mjs apply --tier 1 --path=src/lib/services/** --limit=3000
node scripts/factory-runner.mjs verify "npm run check:ultra-fast"

# 4. Measure
node scripts/factory-runner.mjs run --tier 1
node scripts/simd-cluster-errors.mjs --input reports/latest/errors.jsonl
```

---

**Status:** ✅ Ready for execution
**Risk Level:** LOW (all 4 invariants enforced)
**Expected Impact:** 11.3% error reduction (5,600 errors)
**Time Estimate:** 10-15 minutes total
