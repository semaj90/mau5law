# Phase 80: Top 1000 Error Fixing Plan

**Generated:** 2025-12-26
**Total Errors:** 28,524
**Target:** <15,000 (-47%)
**Strategy:** Surgical fixes, 10-50 files at a time

---

## 🔍 Error Pattern Analysis

### Critical Corruption Pattern: Colon-Comma Substitution
**Signature:** `: attributes, attributes:` instead of proper object syntax
**Impact:** ~5,000+ errors across 100+ files
**Example:** `src/lib/server/lucia.ts` lines 26, 59, 69, 83, etc.

```typescript
// CORRUPTED:
email: attributes.email: firstName: attributes, attributes: attributes.firstName,

// CORRECT:
email: attributes.email,
firstName: attributes.firstName,
```

**Files Affected (High Priority):**
1. `src/lib/server/lucia.ts` (16 errors) - Auth system
2. `src/lib/ClientEmbeddingGemma.ts` (8+ errors) - AI embeddings
3. `src/lib/ClientEmbeddingService.ts` (2+ errors)
4. `src/lib/server/db/schema-postgres.ts` (8+ errors) - Database schema

**Fix Strategy:**
- Manual review (corruption varies by context)
- Pattern: Find `: (\w+):` and `: (\w+),`
- Replace with proper property syntax
- Verify each fix with svelte-check

### Secondary Pattern: Syntax Errors from Previous Batch Fixes
**Signature:** `',' expected` from incomplete refactorings
**Impact:** ~1,500 errors
**Root Cause:** Phase 79 batch fixes may have introduced regressions

---

## 📊 Fixing Chunks (10-50 files each)

### ✅ Chunk 0: CRITICAL INFRASTRUCTURE (P0 - DO FIRST)
**Impact:** Fixes auth, database, AI core - highest leverage
**Files:** 10
**Estimated Errors Fixed:** ~200-300
**Time:** 1-2 hours

| Priority | File | Errors | Pattern | Fix Type |
|----------|------|--------|---------|----------|
| **P0.1** | `src/lib/server/lucia.ts` | 16 | Colon-comma corruption | Manual surgical fix |
| **P0.2** | `src/lib/server/db/schema-postgres.ts` | 8 | Invalid numeric config syntax | Fix `scale: 2` params |
| **P0.3** | `src/lib/ClientEmbeddingGemma.ts` | 10+ | SessionOptions + colon issues | Manual fix |
| **P0.4** | `src/lib/ClientEmbeddingService.ts` | 2 | Comma expected | Quick syntax fix |
| **P0.5** | `src/hooks.server.ts` | 1 | Argument count mismatch | Add missing parameter |
| **P0.6** | `src/lib/server/db/client.ts` | ? | Check dependencies | Verify imports |
| **P0.7** | `src/lib/auth/roles.ts` | 0? (93 in log) | Stale log or build error | Investigate |
| **P0.8** | `src/lib/api/services/auth-service.ts` | ? | Auth integration | Fix after lucia.ts |
| **P0.9** | `src/lib/middleware/authSeparation.ts` | ? | Middleware chain | Fix after auth system |
| **P0.10** | `src/context7-multicore-error-analysis.ts` | 2 | Missing import/type | Add category_analysis |

**Pre-Chunk Validation:**
```bash
# Before fixing - baseline
npx svelte-check --output machine 2>&1 | grep -c ERROR

# After each file fix
npx svelte-check --output machine --threshold warning | grep <filename>

# After chunk complete
npx svelte-check --output machine 2>&1 > logs/errors/phase80-post-chunk0.json
```

**Commit Strategy:**
- One commit per critical file (P0.1-P0.3)
- One commit for Chunk 0 completion
- Commit message format: `fix(phase80-chunk0): <file> - <pattern fixed> (<errors reduced>)`

---

### 🔧 Chunk 1: Cache Infrastructure
**Files:** 10 cache-related files
**Estimated Errors:** ~3,643 (from leaderboard)
**NOTE:** Leaderboard may be stale - verify with fresh svelte-check

**Files:**
1. loki-redis-integration-fixed.ts (762) - **VERIFY: May be 0 actual errors**
2. loki-redis-integration.ts (745)
3. headless-ui-cache.ts (563)
4. gpu-leftover-cache.ts (558)
5. chr-rom-pattern-cache.ts (523)
6. multi-layer-cache.ts (291)
7. semantic-cache.ts (201)
8. cognitive-cache-integration.ts (367)
9. (2 more cache files TBD)

**Action:** Run fresh error check on these files before starting fixes

---

### 🔐 Chunk 2: Auth System (After Chunk 0)
**Files:** 10 auth-related
**Dependencies:** Requires lucia.ts fixed first

**Files:**
1. ✅ lucia.ts (fixed in Chunk 0)
2. auth/roles.ts
3. api/services/auth-service.ts
4. server/auth.ts
5. middleware/authSeparation.ts
6. auth-store.ts
7. server/auth-guard.ts
8. machines/auth-machine.ts
9. hooks.server.ts (auth logic)
10. (1 more auth file TBD)

---

### 🎨 Chunk 3: UI Components - YoRHa 3D
**Files:** 10 3D component files
**Pattern:** Likely Svelte 5 runes + WebGPU type issues

### 🗄️ Chunk 4: Database & Schema (After Chunk 0)
**Files:** 10 database files
**Dependencies:** schema-postgres.ts fixed first

### 🤖 Chunk 5: State Machines (XState v5)
**Files:** 10 machine files
**Pattern:** XState v4 → v5 migration issues

### 📦 Chunk 6: Stores & State Management
**Files:** 10 store files
**Pattern:** Svelte 5 runes migration

### 🛠️ Chunk 7: Utils & Helpers
**Files:** 10 utility files
**Pattern:** Type guard improvements, buffer handling

---

## 🚨 Special Cases

### node_modules/vite/esbuild/lib/main.js (1094 errors)
**Status:** SKIP (dependency file)
**Action:**
1. Check package versions:
   ```bash
   npm list esbuild vite
   ```
2. If corrupted: `npm ci` or `rm -rf node_modules && npm install`
3. If version mismatch: Update package.json
4. **Do NOT manually edit node_modules**

### Stale Error Log Detection
**Issue:** phase80-current.jsonl from Dec 25, some files show 0 errors now
**Solution:** Run fresh svelte-check before each chunk:
```bash
npm run phase80:fresh-errors
# → Generates logs/errors/phase80-fresh-$(date).jsonl
```

---

## 📈 Progress Tracking

### Baseline (2025-12-26 Pre-Chunk0)
- Total Errors: 28,524
- Affected Files: 1,641
- Target: <15,000

### After Chunk 0 (CRITICAL)
- [ ] Expected: ~28,224 (-300 errors)
- [ ] Files fixed: 10
- [ ] Build passing: Yes/No
- [ ] Commit: `feat(phase80-chunk0): Critical infrastructure fixes`

### After Chunk 1-7
- [ ] Expected: ~15,000 (-13,524 errors, -47%)
- [ ] Files fixed: ~70
- [ ] Commits: 8-15 (1-2 per chunk)

---

## 🎯 Success Criteria

1. **Error Reduction:** 28,524 → <15,000 (-47%)
2. **Build Health:** `npm run build` succeeds
3. **Type Safety:** No `any` types introduced
4. **Test Coverage:** Critical paths (auth, DB) tested
5. **Documentation:** Each chunk documented in commit messages
6. **No Regressions:** Verify no new errors introduced per chunk

---

## 🔄 Workflow Per File

1. **Read:** `cat <file> | head -50` to understand context
2. **Check Errors:** `npx svelte-check | grep <file>`
3. **Fix:** Surgical edits using replace_string_in_file
4. **Verify:** `npx svelte-check | grep <file>` (expect 0 errors)
5. **Test:** Run relevant tests if available
6. **Commit:** `git add <file> && git commit -m "fix(phase80): ..."`
7. **Next:** Move to next file in chunk

---

## 📝 Next Immediate Actions

1. ✅ Generate top 1000 error leaderboard (DONE)
2. 🔄 Run fresh svelte-check (IN PROGRESS)
3. ⏸️ Fix lucia.ts (P0.1 - CRITICAL)
4. ⏸️ Fix schema-postgres.ts (P0.2)
5. ⏸️ Fix ClientEmbeddingGemma.ts (P0.3)
6. ⏸️ Complete Chunk 0 (10 files)
7. ⏸️ Commit Chunk 0
8. ⏸️ Run fresh error count
9. ⏸️ Start Chunk 1

---

## 🧠 Pattern Recognition for Future Codemods

After manual fixes in Chunk 0-2, extract patterns for ts-morph automation:

**Pattern 1: Colon-Comma Corruption**
```typescript
// Regex: /(\w+):\s*attributes\.(\w+):\s*(\w+):/g
// Replace: $1: attributes.$2,
```

**Pattern 2: Duplicate Property Assignments**
```typescript
// Regex: /,\s*attributes:\s*attributes\.(\w+)/g
// Replace: (empty - remove duplicates)
```

**Pattern 3: Invalid Object Syntax**
```typescript
// Regex: /{\s*(\w+):\s*(\w+),\s*\2:/g
// Replace: { $1: $2,
```

These patterns can be codified into AST transforms once validated manually.

---

**Last Updated:** 2025-12-26T17:45:00Z
**Status:** Ready to execute Chunk 0
