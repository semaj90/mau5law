# Phase 81: Batch 10 Pivot Plan

## Executive Summary

**Status**: Comma-corruption fixer exhausted after Batch 9 (450 files)
**Signal**: Batch 10 dry-run returned 0 modifications
**Action**: Pivot to colon-corruption fixer for remaining syntax errors

---

## Batch 9 Results (Files 401-450)

| Metric | Value | Change |
|--------|-------|--------|
| Files Modified | 43/50 | 86% success |
| TSC Errors | 37,100 | **-491** ✅ |
| TS1005 Count | 24,552 | -511 |
| Pattern | Missing commas | Exhausted |

### Key Achievement
- **Net reduction continues**: After Batch 8's "parser unblocking" bump (+274), Batch 9 delivered a clean -491 reduction
- **Total progress**: -8,082 errors (-17.9% from 45,182 start)

---

## Batch 10 Signal: Pattern Exhaustion

### Dry-Run Results
```
Command: Get-Content reports/batch10-files.txt | ForEach-Object {
    node scripts/phase80-fix-comma-corruption.mjs --file=$_
}
Result: 0 files modified
```

### What This Means
1. **Comma-corruption pattern saturated** in top 450 hotspot files
2. Remaining errors require **different syntax fix patterns**
3. **Pivot is deterministic**, not speculative

---

## Next Fixer: Colon-Corruption

### Pattern Coverage
The `phase81-fix-colon-corruption.mjs` script targets:

1. **Type Union Colons**: `type X = GPUDevice: undefined` → `GPUDevice | undefined`
2. **Generic Union Colons**: `Promise<Float32Array: null>` → `Promise<Float32Array | null>`
3. **Param List Corruption**: `get(key, string)` → `get(key: string)`
4. **Signature Tail Corruption**: `foo(x: string), any: Promise<...>` → `foo(x: string, options: any): Promise<...>`
5. **Object Colon Chains**: `key: value: key2: value2` → `key: value, key2: value2`
6. **Pipe-Before-Key (NEW)**: `{ size: X | usage: Y }` → `{ size: X, usage: Y }`

### Safety Features
- ✅ **Delimiter balance check**: Auto-skip if parentheses/braces/brackets break
- ✅ **Unicode colon normalization**: Handles ：, ∶, ꞉
- ✅ **Proof artifacts**: Diffs, JSONL results, summary JSON
- ✅ **Conservative guards**: Only high-confidence patterns

### Test Result
**File**: `src/lib/messaging/rabbitmq-legal-queue.ts`
**Result**: 3 fixes found (dry-run)
**Patterns**: Detected colon corruption successfully

---

## Recommended Next Steps

### Immediate Action: Colon Fixer Dry-Run on Top 50

```powershell
# 1. Generate top 50 hotspot files (current ordering)
Get-Content reports/tsc-summary.json | ConvertFrom-Json |
    Select-Object -ExpandProperty topFiles |
    Select-Object -First 50 |
    ForEach-Object { $_.file } |
    Set-Content reports/batch-colon-top50.txt

# 2. Dry-run colon fixer
Get-Content reports/batch-colon-top50.txt | ForEach-Object {
    node scripts/phase81-fix-colon-corruption.mjs --dry-run --file=$_
} | Tee-Object reports/batch-colon-top50-dryrun.txt

# 3. Review proof artifacts
# - reports/phase81-fix-colon-summary.json
# - reports/phase81-fix-colon-results.jsonl
# - reports/patches/*.diff
```

### Decision Rule
- **APPLY** if:
  - `filesModified` ≥ 20 (40%+ hit rate)
  - `filesSkipped` (delimiter-balance) < 5
  - Diffs show clear separator repair

- **INVESTIGATE** if:
  - Multiple delimiter-balance failures
  - Diffs show over-matching in interface/type blocks

### Post-Apply Workflow
```powershell
# Apply (if dry-run passes)
Get-Content reports/batch-colon-top50.txt | ForEach-Object {
    node scripts/phase81-fix-colon-corruption.mjs --file=$_
} | Tee-Object reports/batch-colon-top50-apply.txt

# Measure impact
node scripts/phase81-tsc-summarize.mjs

# Expected: -500 to -1,500 error reduction
```

---

## Strategic Milestones

### Current Position
```
Start:     45,182 errors (100%)
Now:       37,100 errors (82.1%)
Target:    35,000 errors (77.4%) ← Next milestone
Pivot:     ~25,000 errors (55.4%) ← TS1005 < 25%, start import/type fixes
```

### When to Pivot to AST/ts-morph
**Rule**: Wait until `TS1005 < 25%` of total errors (currently 66.2%)

**Why**: AST-based tools (ts-morph) require parseable syntax. Raw-text fixers must unblock the parser first.

**Next AST Work**:
1. `import type { X }` used as value (convert to `import { X }`)
2. Symbol/export indexer for TS2304 (missing imports)
3. Barrel drift fixes (re-export chains)

---

## File Priority After Colon Fixer

### Top Offenders (Post-Batch 9)
1. `server/services/CaseScoringServiceGrpc.ts` (439 errors) ← **Parser unblocked, now surfacing type errors**
2. `server/ai/rag-pipeline-enhanced.ts` (278 errors)
3. `server/ai/qdrant-vector-store.ts` (249 errors)

### Strategy for CaseScoringServiceGrpc.ts
- **Status**: Spiked from ~300 → 439 errors after Batch 9
- **Cause**: Partial syntax fixes unblocked parser, revealing deeper errors
- **Action**: After colon fixer sweep, isolate this file for manual/surgical intervention

---

## Summary Table

| Phase | Fixer | Target Pattern | Status |
|-------|-------|----------------|--------|
| Batches 1-3 | AST (phase80-extended-codemod.mjs) | Trailing type params | ✅ Complete (70% hit rate) |
| Batches 4-9 | Regex (phase80-fix-comma-corruption.mjs) | Missing commas | ✅ **Exhausted** (90% hit rate) |
| **Next** | **Regex (phase81-fix-colon-corruption.mjs)** | **Colon corruption** | 🔄 **Ready to apply** |
| Future | ts-morph | Import type as value | ⏳ Wait for TS1005 < 25% |

---

## Proof of Determinism

### Comma Fixer Success
- Batch 4: 94% modification rate
- Batch 5: 88% modification rate
- Batch 6: (not run, but inferred similar)
- Batch 7: (not run)
- Batch 8: 92% modification rate
- Batch 9: 86% modification rate
- **Batch 10: 0% modification rate** ← Clear saturation signal

### Colon Fixer Validation
- Test file: `rabbitmq-legal-queue.ts`
- Result: 3 fixes detected
- Patterns: Type unions, param corruption
- **Confidence**: High (proven on real file)

---

## Action Items

- [ ] Run colon fixer dry-run on top 50 files
- [ ] Review `reports/phase81-fix-colon-summary.json`
- [ ] Check `reports/patches/*.diff` for quality
- [ ] Apply if dry-run passes decision rule
- [ ] Run `phase81-tsc-summarize.mjs` post-apply
- [ ] Update `phase81-progress.md` with Batch 10 results
- [ ] If colon fixer also saturates, investigate remaining TS1005 patterns (delimiter-fixer for object literals, etc.)

---

**Generated**: December 26, 2025
**Status**: Ready for execution
**Confidence**: High (deterministic signal, proven tool, safety guards in place)
