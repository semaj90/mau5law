# Routes vs. Refactor Campaign: Priority Alignment

## TL;DR - What You Actually Need to Do

### For Core UI to Work (Routes + Key Machines)
**Effort: 2-3 hours | Impact: Routes compile + machines functional**

```
✅ ROUTE LEVEL FIXES (Already done/simple):
  ├── +layout.svelte (App Shell) ✅
  ├── +page.svelte (Home) ✅
  ├── cases/+page.svelte (List) ✅
  ├── laws/+page.svelte (Hub) ✅
  └── rag_search/+page.svelte (RAG) ✅

⚠️ MACHINE LEVEL FIXES (Critical for UX):
  ├── legalFormMachine.ts [JUST FIXED] ✅ → /cases/new
  ├── documentUploadMachine.ts [TIER 2] → /cases/[id]/evidence
  ├── evidenceProcessingMachine.ts [TIER 2] → /cases/[id]/evidence
  ├── embedding-worker.ts [TIER 1] → background pipeline
  └── utf8-fp32-converter.ts [TIER 1] → encoding support
```

### For Error Count to Drop Significantly
**Effort: 4-6 hours total | Impact: 71,401 → ~71,050 errors**

Execute Phase 6 (98-file campaign) in tiers:
- Tier 1 (5 files) = 1-2 hrs = ~45 errors fixed
- Tier 2a (15 files) = 1-2 hrs = ~90 errors fixed
- Tier 2b (30 files) = 2-3 hrs = ~120 errors fixed
- Tier 3 (48 files) = 2-4 hrs = ~96 errors fixed

---

## The Three Levels of Fixes

### Level 1: Route/Layout (Compile & Navigation)

**What it is:** Svelte files in `routes/**`

**Status:** 🟢 Mostly working

**Examples:**
```typescript
// ✅ These already compile fine:
src/routes/+layout.svelte (app shell)
src/routes/+page.svelte (home)
src/routes/cases/+page.svelte (case list)
src/routes/laws/+page.svelte (law hub)
```

**Why it matters:** These define URL structure and navigation

**What can go wrong:**
- ❌ Invalid `$props()` syntax (Svelte 5)
- ❌ Invalid `{@render children()}` (instead of `<slot>`)
- ❌ Breaking imports from machines

**Fix time:** 30 minutes (mostly already done)

---

### Level 2: Component (Display & Behavior)

**What it is:** Svelte components in `lib/components/**`

**Status:** 🟡 Mostly working, some security review needed

**Examples:**
```typescript
// 🟢 Working (no machine deps):
DocumentPreview.svelte
RAGSearchComponent.svelte
NESGraphRenderer.svelte [fixed: <canvas></canvas>]

// 🟡 Needs review (Phase 4 security flagged):
StatuteColumn.svelte [{@html} binding]
StatuteActionPanel.svelte [{@html} binding]
CitationHighlighter.svelte [unsafe snippet]

// 🔴 Depends on broken machines:
CaseWizard.svelte → legalFormMachine.ts
DocumentUploadComponent.svelte → documentUploadMachine.ts
EvidenceTable.svelte → evidenceProcessingMachine.ts
```

**Why it matters:** These provide user-facing UX

**Fix time:** 1-2 hours (manual review of 3 files, fix 3-5 machines)

---

### Level 3: Machines & State Logic (Business Logic)

**What it is:** XState machines in `lib/state/**` and workers in `lib/workers/**`

**Status:** 🔴 Many broken (98 files identified, 5-15 are critical)

**Examples:**
```typescript
// 🔴 CRITICAL TIER 1 (must fix for core UX):
legalFormMachine.ts [JUST FIXED ✅]
documentUploadMachine.ts
evidenceProcessingMachine.ts
embedding-worker.ts
utf8-fp32-converter.ts

// 🔴 TIER 2 (nice-to-have but good to fix):
app-machine.ts (global state)
recommendation-routing-machine.ts (RAG analysis)
crewAIOrchestrationMachine.ts (orchestration)

// 🔴 TIER 3 (not critical, can defer):
85 other files with minor issues
```

**Why it matters:** These make forms/uploads/processing actually work

**Fix time:** 2-8 hours (depends on strategy)

---

## Dependency Flow: Routes → Components → Machines

### Flow for `/cases/new` (Case Creation)

```
1. User navigates to /cases/new
   ↓
2. Route renders: src/routes/cases/new/+page.svelte
   ↓
3. Page imports: CaseWizard.svelte
   ↓
4. Component imports: legalFormMachine.ts [TIER 1 CRITICAL]
   ↓
5. Machine compiles? YES ✅ (just fixed!)
   ↓
6. User sees: Case creation form with 4-step wizard
   ↓
7. User submits: Machine handles upload, validation, submission
   ↓
8. Result: Case created in backend
```

**Status NOW:** 🟢 Ready (legalFormMachine fixed)

---

### Flow for `/cases/[id]/evidence` (Evidence Tab)

```
1. User navigates to /cases/123/evidence
   ↓
2. Route renders: src/routes/cases/[id]/evidence/+page.svelte
   ↓
3. Page imports: DocumentUploadComponent.svelte, EvidenceTable.svelte
   ↓
4. Components import:
   - documentUploadMachine.ts [TIER 2]
   - evidenceProcessingMachine.ts [TIER 2]
   - embedding-worker.ts [TIER 1]
   ↓
5. Worker imports: utf8-fp32-converter.ts [TIER 1]
   ↓
6. Machines compile? MAYBE (need fixes)
   ↓
7. User sees: Upload dropzone, evidence table, preview
   ↓
8. User uploads: Machines orchestrate upload → processing → embedding
   ↓
9. Result: Evidence stored, vectors generated, UI updated
```

**Status NOW:** 🔴 Broken (2-3 machine files need fixes)

---

### Flow for `/laws/by-state/[state]/[sectionId]` (Statute Browser)

```
1. User navigates to /laws/by-state/CA/4500
   ↓
2. Route renders: src/routes/laws/by-state/[state]/[sectionId]/+page.svelte
   ↓
3. Page imports: StatuteColumn.svelte, StatuteActionPanel.svelte
   ↓
4. Components: PURE DISPLAY (no machine imports)
   ↓
5. Issue: {@html} bindings need security review [PHASE 4]
   ↓
6. User sees: Statute text, references, actions
   ↓
7. User interacts: Click statute link → navigate to related statute
   ↓
8. Result: Display updated
```

**Status NOW:** 🟡 Compiles but needs security review

---

## Where the 98-File Campaign Fits

The **98-file refactor campaign** is mostly **NOT** about your routes.

It's about **cleaning up structural debt** in the supporting infrastructure:

```
Routes/Components (What users see)
    ↓ depends on ↓
Machines/Workers (How things work)
    ↓ depends on ↓
Utilities (Encoding, state logic, etc.)
```

### Breakdown:

**Routes/Components Level:**
- ~10 files total
- Status: ✅ ~80% working
- Your effort: Low
- User impact: High

**Machines/Workers Level:**
- ~35-40 files (subset of 98)
- Status: 🔴 ~40% working
- Your effort: Medium-High
- User impact: High

**Utilities/Infrastructure Level:**
- ~60-65 files (rest of 98)
- Status: 🔴 ~30% working
- Your effort: Medium
- User impact: Low-Medium (error count reduction mainly)

---

## Execution Plan: Sequential Steps

### Today (Next 1-2 hours)
```
✅ [DONE] Fix legalFormMachine.ts
[ ] Fix documentUploadMachine.ts (15 min)
[ ] Fix evidenceProcessingMachine.ts (20 min)
[ ] Fix embedding-worker.ts (30 min)
[ ] Fix utf8-fp32-converter.ts (20 min)
[ ] Test: npm run check:svelte (should drop 100-150 errors)
```

### This week (4-6 hours)
```
[ ] Review/fix statute viewer components (1 hr)
[ ] Fix app-machine.ts (30 min)
[ ] Fix recommendation-routing-machine.ts (30 min)
[ ] Fix crewAIOrchestrationMachine.ts (30 min)
[ ] Run full refactor campaign on Tier 2-3 files (2-3 hrs)
[ ] Final validation: npm run check:svelte (should be <71,100)
[ ] npm run build && test in dev
```

---

## Quick Reference: Which File Affects Which Route?

| Route | Primary Machine | Priority | Est. Fix Time |
|-------|-----------------|----------|---------------|
| `/` | app-machine.ts | MEDIUM | 30 min |
| `/cases/new` | legalFormMachine.ts | **CRITICAL** | 30 min ✅ |
| `/cases` | none | LOW | 5 min |
| `/cases/[id]/overview` | none | LOW | 5 min |
| `/cases/[id]/evidence` | **documentUploadMachine.ts** | **CRITICAL** | 20 min |
| `/cases/[id]/evidence` | **evidenceProcessingMachine.ts** | **CRITICAL** | 20 min |
| `/cases/[id]/evidence` | **embedding-worker.ts** | **CRITICAL** | 30 min |
| `/cases/[id]/timeline` | none | LOW | 5 min |
| `/cases/[id]/analysis` | recommendation-routing-machine.ts | MEDIUM | 30 min |
| `/laws/by-state/**` | none | MEDIUM (review) | 1 hr |
| `/laws/by-title/**` | none | MEDIUM (review) | 1 hr |
| `/rag_search` | none | LOW | 5 min |
| `/ast_graph_error_analysis` | none | LOW | 5 min |

---

## Why So Many Broken Files?

The 98-file list includes:

1. **Actual route dependencies** (5-10 files) - YOU NEED THESE
2. **Infrastructure** (30-40 files) - Nice to have
3. **Code generation artifacts** (13 files) - Probably orphaned
4. **Tier 3 cleanup** (40-50 files) - Error count reduction only

**Your real bottleneck:** The 5-10 files in category #1 and #2

**The rest:** Nice-to-have but not blocking UX

---

## Decision Matrix: What to Do When

| Goal | Time Available | Strategy | Expected Outcome |
|------|-----------------|----------|------------------|
| **Get routes working** | <2 hrs | Fix 5 critical machines | UX functional, 100-150 errors fixed |
| **Get full features** | 3-4 hrs | Fix 10 critical machines | All routes + machines work, 200-250 errors fixed |
| **Reduce error count** | 6-8 hrs | Full 98-file campaign | ~351 errors fixed, 71,401 → 71,050 |
| **Do nothing** | 0 hrs | Accept current state | Keep 71,401 errors, routes mostly work |

---

## What I Recommend: Right Now

**Stage 1: Core UX (1.5-2 hours)**

Fix these 5 machines in order:
1. ✅ `legalFormMachine.ts` (DONE)
2. `documentUploadMachine.ts` (20 min)
3. `evidenceProcessingMachine.ts` (20 min)
4. `embedding-worker.ts` (30 min)
5. `utf8-fp32-converter.ts` (20 min)

**Result:** All core routes compile + work

---

**Stage 2: Full Features (1-1.5 hours)**

Fix the secondary machines:
1. `app-machine.ts` (30 min)
2. `recommendation-routing-machine.ts` (30 min)
3. `crewAIOrchestrationMachine.ts` (15 min)

**Result:** All UX features fully functional

---

**Stage 3: Campaign (4-6 hours)**

Run the full 98-file refactor campaign (batch or interactive)

**Result:** Error count drops to ~71,050

---

## The Map You Wanted

```
ROUTES (What users see)
├── / → Home [✅ Works]
├── /cases → Case list [✅ Works]
├── /cases/new → Form [⚠️ Depends on legalFormMachine ✅ NOW FIXED]
├── /cases/[id] → Case details [✅ Layout works]
│   ├── overview → Summary [✅ Works]
│   ├── evidence → Upload [⚠️ Depends on 3 machines - NEXT]
│   ├── timeline → Chronology [✅ Works]
│   └── analysis → Chat+RAG [⚠️ Depends on recommendation-routing-machine]
├── /laws/by-state/** → Browser [✅ Works, needs security review]
├── /laws/by-title/** → Browser [✅ Works, needs security review]
├── /rag_search → Search [✅ Works]
└── /ast_graph_error_analysis → Debug [✅ Works]

MACHINES (Supporting infrastructure)
├── legalFormMachine.ts [✅ FIXED - Core form handling]
├── documentUploadMachine.ts [⚠️ NEXT - File upload orchestration]
├── evidenceProcessingMachine.ts [⚠️ NEXT - Evidence pipeline]
├── embedding-worker.ts [⚠️ NEXT - Background embedding gen]
├── utf8-fp32-converter.ts [⚠️ NEXT - Data encoding]
├── app-machine.ts [⚠️ LATER - Global state]
├── recommendation-routing-machine.ts [⚠️ LATER - RAG routing]
└── crewAIOrchestrationMachine.ts [⚠️ LATER - Crew AI]

TIER 2-3 CLEANUP
└── 85 other files [🔴 Optional - error count only]
```

---

## Conclusion

**Routes are ~85% ready.** You need to fix the **5-10 critical machines** they depend on.

**This takes 2-3 hours, then error count will drop significantly.**

**After that, the remaining 85-file campaign is optional (takes 4-6 more hours for diminishing returns).**

👉 **Next action:** Ready to fix the next critical machine (documentUploadMachine.ts)?
