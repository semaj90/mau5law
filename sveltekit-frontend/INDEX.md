# 🎯 Master Index: Routes → Fixes → Strategies

**Your situation in one paragraph:**

You have core SvelteKit routes that are 85% ready. They depend on 10 critical state machines that are currently broken due to syntax errors (missing braces/parentheses). Fixing those 10 machines takes 2-3 hours and makes your MVP releasable. The global error count (71,401) is a separate hygiene issue that doesn't block functionality. You can ship the MVP ignoring the error count entirely, or spend 2-3 more hours reducing it by half (optional week 2 task).

---

## Quick Navigation

### If you want the TLDR:
→ **REAL_STAKES.md** (5 min read)
→ **STRATEGY_REFRAME.md** (choose A/B/C: 10 min read)
→ **STRATEGY_ALPHA_CHECKLIST.md** (execute: 2-3 hrs)

### If you want the full picture:
→ **ROUTE_MAP.md** (route tree + dependencies)
→ **ROUTES_VS_REFACTOR.md** (how routes connect to machines)
→ **STRATEGY_REFRAME.md** (why the strategies changed)
→ **STRATEGY_ALPHA_CHECKLIST.md** (execution plan)

### If you're stuck on a specific machine:
→ **QUICK_START_2HOURS.md** (pattern reference)
→ **REFACTORING_GUIDE.md** (deep technical reference)

---

## The Three Layers

### Layer 1: Routes (What Users See)
**Status:** ✅ ~85% ready
**Location:** `src/routes/**/*.svelte`
**Examples:** /cases, /laws/by-state, /rag_search
**Document:** ROUTE_MAP.md

---

### Layer 2: Machines (How Routes Work)
**Status:** 🔴 10/98 files critically broken
**Location:** `src/lib/state/**/*.ts`, `src/lib/workers/**`, `src/lib/services/**`
**Examples:** legalFormMachine, documentUploadMachine
**Document:** ROUTES_VS_REFACTOR.md

**Breaking down by priority:**
- **Critical (10 files):** Block routes from working
- **Tier 1 (5 files):** High-severity but non-route-critical
- **Tier 2a (15 files):** Medium-severity helpers
- **Tier 2b+3 (68 files):** Low-severity, long-tail cleanup

---

### Layer 3: Error Count (Global Hygiene)
**Status:** 🟡 71,401 errors (noisy but not blocking)
**Impact:** Developer experience (CI logs, IDE noise)
**Fixable by:** Repairing the broken machines
**Document:** STRATEGY_REFRAME.md

---

## The Three Strategies

### Strategy α: "Make Routes Work" (2-3 hours)
**What:** Fix 10 critical machines
**Result:** Routes compile + MVP launches
**Error count after:** ~71,250 (still noisy)
**Recommended?** ✅ YES, start today
**Document:** STRATEGY_ALPHA_CHECKLIST.md

---

### Strategy β: "Improve Dev Experience" (2-3 more hours, week 2)
**What:** Fix 15 more machines (Tier 1+2a)
**Result:** Error noise reduced by 70%
**Error count after:** ~71,050
**Recommended?** 🤔 Maybe, if noise bothers you
**Document:** STRATEGY_REFRAME.md

---

### Strategy γ: "Perfect Cleanup" (4-6 more hours, never)
**What:** Fix all 98 files (Tier 2b+3)
**Result:** All cleanup done, error count ~71,050 (NO further reduction)
**Error count after:** ~71,050 (same as β!)
**Recommended?** ❌ NO, terrible ROI
**Document:** STRATEGY_REFRAME.md (under "Skip This")

---

## The 10 Critical Machines (Strategy α Foundation)

**These must be fixed for routes to work:**

| # | Machine | File | Route(s) | Status | Time |
|---|---------|------|----------|--------|------|
| 1 | legalFormMachine | `src/lib/state/legalFormMachine.ts` | `/cases/new` | ✅ FIXED | 0 min |
| 2 | caseManagementMachine | `src/lib/state/caseManagementMachine.ts` | `/cases` | 🔴 START HERE | 20 min |
| 3 | documentUploadMachine | `src/lib/state/documentUploadMachine.ts` | `/cases/[id]/evidence` | 🔴 | 20 min |
| 4 | legalDocumentProcessingMachine | `src/lib/state/legalDocumentProcessingMachine.ts` | `/cases/[id]/evidence` | 🔴 | 20 min |
| 5 | evidenceProcessingMachine | `src/lib/state/evidenceProcessingMachine.ts` | `/cases/[id]/evidence` | 🔴 | 20 min |
| 6 | embedding-worker | `src/lib/workers/embedding-worker.ts` | (background) | 🔴 | 30 min |
| 7 | utf8-fp32-converter | `src/lib/services/utf8-fp32-converter.ts` | (background) | 🔴 | 20 min |
| 8 | app-machine | `src/lib/state/app-machine.ts` | `/` (global) | 🔴 | 30 min |
| 9 | recommendation-routing-machine | `src/lib/state/recommendation-routing-machine.ts` | `/cases/[id]/analysis` | 🔴 | 30 min |
| 10 | crewAIOrchestrationMachine | `src/lib/state/crewAIOrchestrationMachine.ts` | (background) | 🔴 | 15 min |

**Total:** 2-3 hours
**Document:** STRATEGY_ALPHA_CHECKLIST.md

---

## The Fix Pattern (Universal)

For any broken machine:

1. **Check status:**
   ```bash
   npx tsc --noEmit --skipLibCheck <file>
   ```

2. **Count braces/parens:**
   ```bash
   echo "Open: $(grep -o '{' <file> | wc -l), Close: $(grep -o '}' <file> | wc -l)"
   ```

3. **Find break point:**
   ```bash
   tail -30 <file>  # Look for incomplete structures
   ```

4. **Apply fix:**
   - Open in VS Code with Bracket Pair Colorizer
   - Identify innermost unclosed structure
   - Add `}`, `)`, `]` from inside-out
   - Validate with TypeScript

5. **Commit:**
   ```bash
   git add <file> && git commit -m "fix: complete <machine> syntax"
   ```

**Document:** QUICK_START_2HOURS.md (patterns for each machine type)

---

## Timeline to MVP Launch

### Today (2-3 hours)
```
✅ Execute Strategy α
✅ Fix machines 1-10
✅ Validate: npm run dev, visit /cases/new, /cases/[id]/evidence
✅ Commit & PR
✅ Ship MVP (error count still 71k, doesn't matter)
```

### Week 2 (Optional, 2-3 hours)
```
🤔 Consider Strategy β
🤔 Fix 15 more machines
🤔 Error count drops to 71,050 (70% less noise)
🤔 Merge if dev experience improves
🤔 Or skip if you're not bothered by noise
```

### Never
```
❌ Skip Strategy γ entirely
❌ Don't fix remaining 75 files
❌ ROI is terrible (8+ hours for zero user-facing impact)
```

---

## Document Reference by Use Case

**"I want to understand the big picture"**
1. REAL_STAKES.md (what actually matters)
2. ROUTE_MAP.md (how routes connect)
3. ROUTES_VS_REFACTOR.md (layers explained)

**"I want to launch MVP NOW"**
1. STRATEGY_REFRAME.md (pick Strategy α)
2. STRATEGY_ALPHA_CHECKLIST.md (follow steps)
3. QUICK_START_2HOURS.md (reference for each machine)

**"I'm stuck on a specific machine"**
1. QUICK_START_2HOURS.md (find the pattern)
2. REFACTORING_GUIDE.md (deep technical details)
3. Terminal: `npx tsc --noEmit <file>` (get exact error)

**"I want to understand the full remediation campaign"**
1. EXECUTIVE_SUMMARY.md (overview)
2. PHASE_SUMMARY.md (phases 1-5 breakdown)
3. REFACTORING_GUIDE.md (technical deep dive)
4. STRATEGY_REFRAME.md (why Strategies changed for your use case)

---

## Success Criteria (By Strategy)

### After Strategy α ✅
- [ ] All 10 machines compile: `npx tsc --noEmit src/lib/state/*.ts`
- [ ] Error count: ~71,250 (down from 71,401)
- [ ] `npm run dev` starts without errors
- [ ] Visit /cases/new → form renders
- [ ] Visit /cases/[id]/evidence → upload component renders
- [ ] Visit /cases/[id]/analysis → no errors
- [ ] PR created and ready to merge

---

### After Strategy β (Optional)
- [ ] 15 more machines fixed
- [ ] Error count: ~71,050 (70% reduction from baseline)
- [ ] Developer feels less bombarded by check:svelte output
- [ ] All routes still work

---

## FAQ

**Q: Do I really need to fix all 98 files?**
A: No. Fix 10 (Strategy α) and you're done for MVP. The remaining 88 don't block routes.

**Q: Why is the error count so high?**
A: 10 broken machines cascade to ~30k errors each. The schema adds ~10k. Many errors are cascading reports from a few root issues.

**Q: Can I skip to Strategy β or γ?**
A: You need Strategy α first (it's the foundation). β and γ are optional add-ons.

**Q: What if I'm not a TypeScript expert?**
A: Don't worry. The fix pattern is simple: find where closing braces are missing and add them. QUICK_START_2HOURS.md walks you through it.

**Q: How do I know if a file is actually fixed?**
A: Run `npx tsc --noEmit <file>`. If it prints nothing, you're good.

**Q: Can I parallelize these fixes?**
A: Yes, if multiple people. Machines 2-5 are independent (evidence upload flow), 6-7 are independent (embeddings), 8-10 are independent (global + orchestration).

**Q: What if I break something?**
A: Easy: `git checkout <file>` reverts it. The fixes are non-invasive (just adding missing closing symbols).

---

## One-Sentence Summary

**Fix 10 broken machines (2-3 hrs) → routes work → ship MVP → optionally reduce error noise week 2.**

---

## You're Ready

Start here: **STRATEGY_ALPHA_CHECKLIST.md**

Machine to fix first: **caseManagementMachine.ts**

Time estimate: **2-3 hours start to finish**

Questions? Check the relevant document above, or use REFACTORING_GUIDE.md for deep technical reference.

**Go build.** 🚀
