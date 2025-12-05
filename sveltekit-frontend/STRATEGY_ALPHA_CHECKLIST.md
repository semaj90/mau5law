# ✅ Strategy α Execution Checklist: Fix 10 Critical Machines (2-3 Hours)

## Pre-Flight (5 min)

- [ ] Create branch: `git checkout -b feature/core-routes-fix`
- [ ] Verify current error count: `npm run check:svelte 2>&1 | tail -1`
- [ ] Record baseline (should be ~71,401)

---

## Machines 1-10: Sequential Fix Order

### Machine 1: `legalFormMachine.ts` ✅

**Status:** Already fixed in previous step
**Location:** `src/lib/state/legalFormMachine.ts`
**Routes affected:** `/cases/new`
**Time:** 0 min (skip, already done)

**Validation:**
```bash
npx tsc --noEmit --skipLibCheck src/lib/state/legalFormMachine.ts
# Should show: (no output = success)
```

---

### Machine 2: `caseManagementMachine.ts` ⏳

**Location:** `src/lib/state/caseManagementMachine.ts`
**Routes affected:** `/cases`, `/cases/new` (case listing + creation)
**Time:** 20 min
**File size hint:** Should be ~400-600 lines

**Steps:**

1. **Check current status:**
   ```bash
   npx tsc --noEmit --skipLibCheck src/lib/state/caseManagementMachine.ts
   ```

2. **If error:** Open file and count braces
   ```bash
   echo "Open braces: $(grep -o '{' src/lib/state/caseManagementMachine.ts | wc -l)"
   echo "Close braces: $(grep -o '}' src/lib/state/caseManagementMachine.ts | wc -l)"
   echo "Open parens: $(grep -o '(' src/lib/state/caseManagementMachine.ts | wc -l)"
   echo "Close parens: $(grep -o ')' src/lib/state/caseManagementMachine.ts | wc -l)"
   ```

3. **Find the break point:**
   ```bash
   tail -30 src/lib/state/caseManagementMachine.ts
   ```
   Look for:
   - Missing `};` at end?
   - Incomplete `invoke` block?
   - Unmatched parentheses in function?

4. **Apply pattern from legalFormMachine.ts:**
   - Open file in VS Code
   - Use Bracket Pair Colorizer (Ctrl+Shift+\ to jump)
   - Identify innermost unclosed structure
   - Add closing symbols from inside-out
   - Validate with TypeScript

5. **Test:**
   ```bash
   npx tsc --noEmit --skipLibCheck src/lib/state/caseManagementMachine.ts
   ```

6. **Commit:**
   ```bash
   git add src/lib/state/caseManagementMachine.ts
   git commit -m "fix: complete caseManagementMachine syntax"
   ```

---

### Machine 3: `documentUploadMachine.ts` ⏳

**Location:** `src/lib/state/documentUploadMachine.ts`
**Routes affected:** `/cases/[id]/evidence` (upload UX)
**Time:** 20 min

**Steps:** (Same pattern as Machine 2)

1. Check status with `npx tsc`
2. Count braces/parens
3. Find break point (end of file, likely)
4. Apply closing symbols
5. Test & commit

---

### Machine 4: `legalDocumentProcessingMachine.ts` ⏳

**Location:** `src/lib/state/legalDocumentProcessingMachine.ts`
**Routes affected:** `/cases/[id]/evidence` (background processing)
**Time:** 20 min

**Steps:** (Same pattern)

---

### Machine 5: `evidenceProcessingMachine.ts` ⏳

**Location:** `src/lib/state/evidenceProcessingMachine.ts`
**Routes affected:** `/cases/[id]/evidence` (evidence pipeline)
**Time:** 20 min

**Steps:** (Same pattern)

---

### Machine 6: `embedding-worker.ts` ⏳

**Location:** `src/lib/workers/embedding-worker.ts`
**Routes affected:** (background embeddings for RAG)
**Time:** 30 min

**Note:** Worker files have slightly different structure (use `self.addEventListener`, not `setup().createMachine`)

**Steps:**

1. Check status
2. Count braces/parens
3. Look for:
   - Incomplete `self.addEventListener` callback?
   - Unfinished `.then()` chain?
   - Missing `});` at end?
4. Add closing symbols
5. Test & commit

---

### Machine 7: `utf8-fp32-converter.ts` ⏳

**Location:** `src/lib/services/utf8-fp32-converter.ts`
**Routes affected:** (data encoding support)
**Time:** 20 min

**Note:** Utility/converter file (pure functions, not state machines)

**Steps:**

1. Check status
2. This file likely has missing closing braces on utility functions
3. Count open/close braces for each function
4. Add closing braces as needed
5. Test & commit

---

### Machine 8: `app-machine.ts` ⏳

**Location:** `src/lib/state/app-machine.ts`
**Routes affected:** `/` (global app state)
**Time:** 30 min

**Steps:** (Same pattern as legalFormMachine)

---

### Machine 9: `recommendation-routing-machine.ts` ⏳

**Location:** `src/lib/state/recommendation-routing-machine.ts`
**Routes affected:** `/cases/[id]/analysis` (RAG routing)
**Time:** 30 min

**Steps:** (Same pattern)

---

### Machine 10: `crewAIOrchestrationMachine.ts` ⏳

**Location:** `src/lib/state/crewAIOrchestrationMachine.ts`
**Routes affected:** (background orchestration)
**Time:** 15 min

**Steps:** (Same pattern)

---

## Validation Checkpoints

### After Each Machine (Quick Check)
```bash
npx tsc --noEmit --skipLibCheck <file>
# Should show: (no output)
```

### After Every 3 Machines (Full Batch Check)
```bash
npm run check:svelte 2>&1 | tail -3
# Watch error count decline
```

### After All 10 Machines (Full Validation)

1. **TypeScript check:**
   ```bash
   npx tsc --noEmit --skipLibCheck src/lib/state/*.ts src/lib/workers/*.ts src/lib/services/*.ts
   ```

2. **Full svelte check:**
   ```bash
   npm run check:svelte
   # Should show: error count down to ~71,250
   ```

3. **Dev server:**
   ```bash
   npm run dev
   ```
   Visit:
   - http://localhost:5173/ (home)
   - http://localhost:5173/cases (case list)
   - http://localhost:5173/cases/new (new case form) ← Should render!
   - http://localhost:5173/cases/1/evidence (upload) ← Should render!

4. **Build test:**
   ```bash
   npm run build
   ```

---

## Git Workflow (Recommended)

### Option A: One Commit Per Machine (Cleanest)
```bash
# Machine 2
fix && git add caseManagementMachine.ts && git commit -m "fix: complete caseManagementMachine syntax"

# Machine 3
fix && git add documentUploadMachine.ts && git commit -m "fix: complete documentUploadMachine syntax"

# ... etc
```

**Result:** 10 focused commits, easy to review/revert

---

### Option B: One Commit Per Batch (Faster)
```bash
# Fix machines 2-5 (evidence upload flow)
fix all && git add src/lib/state/case*.ts src/lib/state/document*.ts src/lib/state/evidence*.ts
git commit -m "fix: complete evidence upload machine syntax (4 files)"

# Fix machines 6-7 (embeddings)
fix all && git add src/lib/workers/embedding-worker.ts src/lib/services/utf8-fp32-converter.ts
git commit -m "fix: complete embedding & encoding syntax (2 files)"

# Fix machines 8-10 (app + orchestration)
fix all && git add src/lib/state/app-machine.ts src/lib/state/recommendation-*.ts src/lib/state/crewAI*.ts
git commit -m "fix: complete app & orchestration machine syntax (3 files)"
```

**Result:** 3 logical commits, still easy to review

---

### Option C: Single Mega Commit (Fastest)
```bash
# Fix all 10, then:
git add src/lib/state/*.ts src/lib/workers/*.ts src/lib/services/*.ts
git commit -m "fix: repair all 10 critical route-dependent machines"
```

**Result:** 1 commit, harder to review but fastest

---

## Troubleshooting

### "Expected '}' found 'EOF'"
→ Missing closing brace at end of file
→ Add `}` and/or `});`

### "Expected ')' found 'EOF'"
→ Unclosed function or invoke block
→ Add `)` and/or `});`

### "Expected ',' but found identifier"
→ Missing comma between object properties
→ Add `,` before next property

### TypeScript still complains after fix
→ Check for secondary errors (cascade effects)
→ Run: `npx tsc --noEmit --pretty` for clearer output

### Dev server won't start
→ Run: `npm run build` to see full errors
→ Check error log: `cat .svelte-kit/build/index.html` or similar

---

## Expected Results

### Before Strategy α
```
Error count: 71,401
Routes that work: /, /cases, /laws/by-state, /rag_search, /ast_graph
Routes that break: /cases/new, /cases/[id]/evidence, /cases/[id]/analysis
```

### After Strategy α (Complete)
```
Error count: ~71,250 (151 errors fixed)
Routes that work: ALL CORE ROUTES
/cases/new → Form renders + can submit
/cases/[id]/evidence → Upload component renders + can process
/cases/[id]/analysis → RAG routing works
```

---

## Success Criteria ✅

- [ ] All 10 machines compile with `npx tsc`
- [ ] `npm run check:svelte` shows ~71,250 errors (down from 71,401)
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] Visit /cases/new → form renders
- [ ] Visit /cases/1/evidence → upload component renders
- [ ] Visit /cases/1/analysis → no compilation errors
- [ ] All 10 commits created (or consolidated as chosen)

---

## Time Estimate Breakdown

| Machine | Est. Time | Cumulative |
|---------|-----------|-----------|
| 1. legalFormMachine | 0 min | 0 min ✅ |
| 2. caseManagementMachine | 20 min | 20 min |
| 3. documentUploadMachine | 20 min | 40 min |
| 4. legalDocumentProcessingMachine | 20 min | 60 min |
| 5. evidenceProcessingMachine | 20 min | 80 min |
| 6. embedding-worker | 30 min | 110 min |
| 7. utf8-fp32-converter | 20 min | 130 min |
| 8. app-machine | 30 min | 160 min |
| 9. recommendation-routing-machine | 30 min | 190 min |
| 10. crewAIOrchestrationMachine | 15 min | 205 min |
| **Validation + Testing** | 15-20 min | **220-225 min** |
| **TOTAL** | | **~3.5-3.75 hours** |

(Tighter if you're efficient with patterns; could stretch to 4+ hours if stuck)

---

## When to Ask for Help

- If a machine takes >15 min longer than estimated
- If TypeScript error seems unrelated to braces
- If dev server crashes with cryptic error
- If 3+ machines have weird patterns (might indicate data corruption)

---

## After Strategy α Completes

**You will have:**
- ✅ Working routes for MVP demo
- ✅ 10 critical machines fixed
- ✅ ~150 errors reduced
- ✅ Foundation for Strategy β (week 2, optional)

**Decision point:**
- Deploy now (skip Strategy β), or
- Spend 2-3 more hours on Strategy β next week for quieter dev experience

---

## Ready?

Start with Machine 2: `caseManagementMachine.ts`

Follow the pattern:
1. Check status (`npx tsc`)
2. Count braces/parens
3. Find break point
4. Add closing symbols
5. Test & commit

**Go!** ⚡
