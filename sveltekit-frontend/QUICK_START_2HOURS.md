# 🎯 Quick Start: Next 2 Hours to Get Routes Working

## Status Right Now

✅ **legalFormMachine.ts** - FIXED (routes + forms work)
🔴 **5 other critical machines** - BROKEN (evidence upload, background processing)
🔴 **85+ files** - Broken but not critical for core UX

---

## What You Have vs. What You Need

### What's Ready ✅

Routes compile and render:
```
/                        ✅
/cases                   ✅
/laws/by-state/**        ✅
/laws/by-title/**        ✅
/rag_search              ✅
/ast_graph_error_analysis ✅
```

### What's Blocked 🔴

```
/cases/new               ⚠️ → legalFormMachine.ts [✅ JUST FIXED]
/cases/[id]/evidence     🔴 → 3 broken machines (fix next)
/cases/[id]/analysis     🔴 → recommendation-routing-machine.ts
Global state             🔴 → app-machine.ts
```

---

## The 5 Critical Fixes (Next 2 Hours)

### Machine 1: `legalFormMachine.ts` ✅ **DONE**

**Location:** `src/lib/state/legalFormMachine.ts`
**Time:** 30 min (already completed)
**Impact:** `/cases/new` route works

---

### Machine 2: `documentUploadMachine.ts` 🔴

**Location:** `src/lib/state/documentUploadMachine.ts`
**Time:** 20 min
**Impact:** Evidence upload form renders
**Status:** Need to check/repair

**Likely issues:**
- Malformed `invoke` blocks
- Missing commas between handlers
- Unmatched parentheses

**Quick check:**
```bash
npx tsc --noEmit src/lib/state/documentUploadMachine.ts
```

**If broken, follow template from legalFormMachine:**
- Clean up `invoke` blocks (ensure `onDone`, `onError` properly closed)
- Verify all assign functions have matching parens
- Close nested objects from innermost outward

---

### Machine 3: `evidenceProcessingMachine.ts` 🔴

**Location:** `src/lib/state/evidenceProcessingMachine.ts`
**Time:** 20 min
**Impact:** Evidence processing pipeline
**Status:** Need to check/repair

**Similar issues to Machine 2**

---

### Machine 4: `embedding-worker.ts` 🔴

**Location:** `src/lib/workers/embedding-worker.ts`
**Time:** 30 min
**Impact:** Background embedding generation
**Status:** Likely Tier 1 critical

**Likely issues:**
- Worker setup code incomplete
- Event listener handlers truncated
- Promise chains without `.then()` closure

**Quick check:**
```bash
npx tsc --noEmit src/lib/workers/embedding-worker.ts
```

---

### Machine 5: `utf8-fp32-converter.ts` 🔴

**Location:** `src/lib/services/utf8-fp32-converter.ts`
**Time:** 20 min
**Impact:** Data encoding support
**Status:** Likely Tier 1 critical

**Likely issues:**
- Utility functions incomplete
- Type definitions truncated
- Export statements broken

---

## Step-by-Step for Each Machine

### 1. Check Current Status

```bash
cd sveltekit-frontend
npx tsc --noEmit src/lib/state/documentUploadMachine.ts
```

**If no error:** ✅ Already working, skip
**If error:** 🔴 Continue to step 2

### 2. Read the File

```bash
# Check line count and last few lines
wc -l src/lib/state/documentUploadMachine.ts
tail -20 src/lib/state/documentUploadMachine.ts
```

**Look for:**
- Does it end with `export default`?
- Are there closing `}`, `]`, `)`?
- Is there a syntax error message?

### 3. Count Braces

```bash
# Open braces
grep -o '{' src/lib/state/documentUploadMachine.ts | wc -l

# Close braces
grep -o '}' src/lib/state/documentUploadMachine.ts | wc -l
```

**If open > close:** Missing `}` at end

### 4. Fix Pattern (Based on Type)

**If it's an XState machine:**
1. Open in VS Code
2. Go to end of file
3. Check bracket pair colorizer (extension)
4. Add missing `}`, `]`, `)` from innermost outward
5. Check with TypeScript

**If it's a worker:**
1. Check if `self.addEventListener` is complete
2. Check if `.then()` chains are closed
3. Verify final export

### 5. Validate

```bash
npx tsc --noEmit src/lib/state/[machine-file].ts
```

**Should see:** No output (success) or specific error

---

## Expected Results After Each Fix

| Machine | Before | After |
|---------|--------|-------|
| legalFormMachine | 🔴 Broken | ✅ /cases/new works |
| documentUploadMachine | 🔴 Broken | ✅ Upload component renders |
| evidenceProcessingMachine | 🔴 Broken | ✅ Processing pipeline ready |
| embedding-worker | 🔴 Broken | ✅ Background jobs work |
| utf8-fp32-converter | 🔴 Broken | ✅ Data encoding works |

**Global impact:** Error count should drop ~100-150 errors (71,401 → ~71,250)

---

## How to Fix Each (Copy-Paste Patterns)

### Pattern 1: XState Machine Missing Closing Braces

**Symptom:**
```typescript
export const myMachine = setup({...}).createMachine({
  states: {
    idle: { ... },
    running: { ... }
    // Missing closing braces
```

**Fix (add to EOF):**
```typescript
    }
  }
});

export default myMachine;
```

---

### Pattern 2: Invoke Block Incomplete

**Symptom:**
```typescript
invoke: {
  id: 'someService',
  src: 'handler',
  onDone: { target: 'next' }  // ❌ No comma
  onError: { target: 'error' }
// ❌ Missing closing braces
```

**Fix:**
```typescript
invoke: {
  id: 'someService',
  src: 'handler',
  onDone: { target: 'next' },  // ✅ Add comma
  onError: { target: 'error' }
}  // ✅ Add close brace
```

---

### Pattern 3: Worker Event Listener Incomplete

**Symptom:**
```typescript
self.addEventListener('message', (event) => {
  const result = process(event.data);
  self.postMessage(result);
  // ❌ No closing brace/paren
```

**Fix:**
```typescript
self.addEventListener('message', (event) => {
  const result = process(event.data);
  self.postMessage(result);
});  // ✅ Add closing });
```

---

## Timeline

| Task | Time | Total |
|------|------|-------|
| Check + fix documentUploadMachine | 20 min | 20 min |
| Check + fix evidenceProcessingMachine | 20 min | 40 min |
| Check + fix embedding-worker | 30 min | 70 min |
| Check + fix utf8-fp32-converter | 20 min | 90 min |
| Run full check | 5 min | 95 min |
| **Total** | | **~1.5 hours** |

---

## Success Criteria

✅ **All 5 machines compile**
```bash
npx tsc --noEmit src/lib/state/*.ts src/lib/workers/*.ts src/lib/services/*.ts
```

✅ **Error count drops**
```bash
npm run check:svelte
# Should show: ~71,250-71,300 errors (down from 71,401)
```

✅ **Routes render**
```bash
npm run dev
# Visit /cases/new → Form appears
# Visit /cases/[id]/evidence → Upload component shows
```

---

## If You Get Stuck

**Common error: "Expected '}' but found 'EOF'"**
→ Missing closing brace at end of file
→ Solution: Add `}` or `});`

**Common error: "Expected ',' but found identifier"**
→ Missing comma between object properties
→ Solution: Add `,` before property name

**Common error: "Expected ')' but found 'EOF'"**
→ Unclosed function call or arrow function
→ Solution: Add `)` or `});`

**If stuck 5+ min on one file:**
→ Paste it in VS Code with bracket colorizer extension
→ Use Ctrl+Shift+\ to jump between pairs
→ Work from inside outward

---

## After Finishing All 5

Run full validation:
```bash
npm run check:svelte
npm run build
npm run dev
```

Visit these routes to verify:
- http://localhost:5173/cases/new → Form wizard
- http://localhost:5173/cases/1/evidence → Upload interface
- http://localhost:5173/ → Home page

If all work: ✅ **Core UX is ready**

---

## Next Phase (Optional)

After these 5 machines, if you want to continue:

**6 more machines to fix (1-2 hours):**
- app-machine.ts (global state)
- recommendation-routing-machine.ts (RAG routing)
- crewAIOrchestrationMachine.ts (orchestration)
- legalDocumentProcessingMachine.ts
- caseManagementMachine.ts
- phase13StateMachine.ts

**Then:** Full 98-file campaign (4-6 hours)

---

## Shortcuts

**Check all TS files at once:**
```bash
npm run check:svelte 2>&1 | grep -E "^src/lib/(state|workers|services)" | head -20
```

**Fix multiple files in batch (if brave):**
```bash
# Dry run (don't apply fixes)
node scripts/batch-fixer-approval.mjs --dry-run

# Apply fixes with approval
node scripts/batch-fixer-approval.mjs
```

---

## You're Ready 🚀

**legalFormMachine is fixed.**

**Pick the next machine from the 5, follow the pattern, and you're golden.**

**Questions?** Check REFACTORING_GUIDE.md (detailed patterns) or ROUTE_MAP.md (which machine affects which route)
