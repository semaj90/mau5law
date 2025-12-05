# YoRHa Legal AI - Route Map & Dependency Tree

## Core Route Structure

```
src/routes/
├── +layout.svelte (App Shell - Global Chrome)
│   ├── classes: .app-shell, .terminal-glow, .cyber-grid
│   ├── sidebar navigation
│   ├── top bar (theme, commands)
│   └── children()
│
├── +page.svelte (Home / Command Center)
│   ├── Recent cases list
│   ├── Quick access cards (New Case, RAG Search, Error Brain)
│   └── Machine: none (UI only)
│
├── cases/
│   ├── +page.svelte (Case Index)
│   │   ├── Search, filters, "Create new case"
│   │   ├── API: GET /api/v1/cases
│   │   └── Machine: none (list UI only)
│   │
│   ├── new/
│   │   └── +page.svelte (New Case Wizard)
│   │       ├── Client, jurisdiction, charges, practice area
│   │       ├── Form validation
│   │       ├── API: POST /api/v1/cases
│   │       └── ⚠️ Machine: legalFormMachine.ts [TIER 1 CRITICAL]
│   │
│   └── [id]/
│       ├── +layout.svelte (Case Layout Shell)
│       │   ├── Title, status badge, tabs (Overview/Evidence/Timeline/Analysis)
│       │   ├── Case chrome/breadcrumbs
│       │   └── children() for tab content
│       │
│       ├── overview/
│       │   └── +page.svelte
│       │       ├── Timeline summary, key facts
│       │       ├── AI summary panel
│       │       └── Machine: none (display only)
│       │
│       ├── evidence/
│       │   └── +page.svelte (Evidence Tab)
│       │       ├── Evidence table (list view)
│       │       ├── Upload dropzone
│       │       ├── Preview slideout (DocumentPreview.svelte)
│       │       ├── Components: DocumentUploadComponent.svelte, EvidenceTable.svelte
│       │       └── ⚠️ Machines:
│       │           - documentUploadMachine.ts [TIER 2 HIGH]
│       │           - legalDocumentProcessingMachine.ts [TIER 2 HIGH]
│       │           - evidenceProcessingMachine.ts [TIER 2 HIGH]
│       │           - embedding-worker.ts [TIER 1 CRITICAL] (background)
│       │
│       ├── timeline/
│       │   └── +page.svelte
│       │       ├── Chronology of events, hearings, filings
│       │       ├── Date-sorted list/timeline view
│       │       └── Machine: none (display only)
│       │
│       └── analysis/ (or /ai)
│           └── +page.svelte
│               ├── Chat interface with evidence
│               ├── AI reasoning panel
│               ├── RAG search results
│               ├── Components: ChatPanel.svelte, RAGSearchComponent.svelte
│               └── ⚠️ Machine: recommendation-routing-machine.ts [TIER 2]
│
├── laws/
│   ├── +page.svelte (Law Hub - Entry Point)
│   │   ├── Jurisdiction selector
│   │   ├── Statute search
│   │   └── Machine: none (UI only)
│   │
│   ├── by-state/
│   │   └── [state]/
│   │       └── [sectionId]/
│   │           └── +page.svelte (Statute Viewer)
│   │               ├── Statute text + metadata
│   │               ├── Related statutes
│   │               ├── Citation highlighter
│   │               ├── Components:
│   │               │   - StatuteColumn.svelte [⚠️ {@html} review]
│   │               │   - StatuteActionPanel.svelte [⚠️ {@html} review]
│   │               │   - CitationHighlighter.svelte [⚠️ unsafe snippet review]
│   │               └── Machine: none (display only)
│   │
│   └── by-title/
│       └── [title]/
│           └── [section]/
│               └── +page.svelte (Same as by-state, different path)
│
├── rag_search/ (or /tools/rag/)
│   └── +page.svelte (RAG Search Playground)
│       ├── Search input + results
│       ├── Document preview
│       ├── Workspace management
│       ├── Components:
│       │   - RAGSearchComponent.svelte
│       │   - DocumentPreview.svelte
│       │   - SummaryEditor.svelte
│       │   - WorkspacePanel.svelte
│       │   - MarkdownSceneViewer.svelte
│       └── Machine: none (query UI only, backend handles RAG)
│
├── ast_graph_error_analysis/ (or /debug/ast/)
│   └── +page.svelte (AST Graph Error Brain)
│       ├── Canvas-based AST visualization
│       ├── Error cluster browser
│       ├── Components:
│       │   - NESGraphRenderer.svelte [Fixed: <canvas></canvas>]
│       │   - Phase72ErrorBrain.svelte
│       └── Machine: none (diagnostic only)
│
└── (optional) all-routes/ or /debug/routes/
    └── +page.svelte (Route Inspector)
        ├── List all routes/endpoints/layouts
        ├── API: GET /api/admin/routes (from routesIndex.ts)
        └── Machine: none (admin tool)
```

---

## Machine Dependencies by Route

### Critical Path (Must Work for Core UX)

| Route | Primary Machine | File Path | Tier | Status |
|-------|-----------------|-----------|------|--------|
| `/cases/new` | **legalFormMachine** | `src/lib/machines/legalFormMachine.ts` | **TIER 1** | ❌ Δ-6 braces, Δ-49 parens |
| `/cases/[id]/evidence` | **documentUploadMachine** | `src/lib/machines/documentUploadMachine.ts` | **TIER 2** | ❌ Δ-1 brace |
| `/cases/[id]/evidence` | **legalDocumentProcessingMachine** | `src/lib/machines/legalDocumentProcessingMachine.ts` | **TIER 1?** | ⚠️ Check delta |
| `/cases/[id]/evidence` | **evidenceProcessingMachine** | `src/lib/machines/evidenceProcessingMachine.ts` | **TIER 2** | ❌ Δ-3 braces, Δ-68 parens |
| (background) | **embedding-worker** | `src/lib/workers/embedding-worker.ts` | **TIER 1** | ❌ Δ-10 braces |
| `/` | **app-machine** | `src/lib/machines/app-machine.ts` | **TIER 2** | ❌ Δ+7 braces, Δ-63 parens |

### Secondary Machines (Nice-to-Have)

| Route | Machine | File Path | Tier |
|-------|---------|-----------|------|
| `/cases/[id]/analysis` | recommendation-routing-machine | `src/lib/machines/recommendation-routing-machine.ts` | TIER 2 |
| (infrastructure) | crewAIOrchestrationMachine | `src/lib/machines/crewAIOrchestrationMachine.ts` | TIER 2 |
| (infrastructure) | async-rabbitmq-state-manager | `src/lib/services/async-rabbitmq-state-manager.ts` | TIER 2 |

### Supporting Files (No Direct Routes)

| File | Purpose | Tier |
|------|---------|------|
| `utf8-fp32-converter.ts` | Embedding preprocessing | **TIER 1** |
| `phase13StateMachine.ts` | Phase 13 state logic (?)  | **TIER 1** |

---

## Compile-Time Dependency Chains

### Route: `/cases/new` → Form Creation

```
src/routes/cases/new/+page.svelte
  ↓ imports
src/lib/components/CaseWizard.svelte
  ↓ imports
src/lib/machines/legalFormMachine.ts [BROKEN]
  ↓ depends on
xstate v5 + type-defs
  ↓ uses
src/lib/types/case.types.ts [FIXED]
```

**Fix Status:** 🔴 Broken at `legalFormMachine.ts`

---

### Route: `/cases/[id]/evidence` → Upload & Process

```
src/routes/cases/[id]/evidence/+page.svelte
  ↓ imports
src/lib/components/DocumentUploadComponent.svelte
src/lib/components/EvidenceTable.svelte
  ↓ import
src/lib/machines/documentUploadMachine.ts [BROKEN]
src/lib/machines/legalDocumentProcessingMachine.ts [BROKEN]
src/lib/machines/evidenceProcessingMachine.ts [BROKEN]
src/lib/workers/embedding-worker.ts [BROKEN - TIER 1]
  ↓ depends on
src/lib/services/utf8-fp32-converter.ts [BROKEN - TIER 1]
```

**Fix Status:** 🔴 Broken at 4 points (2 TIER 1 critical)

---

### Route: `/laws/by-state/[state]/[sectionId]` → Statute Viewer

```
src/routes/laws/by-state/[state]/[sectionId]/+page.svelte
  ↓ imports
src/lib/components/StatuteColumn.svelte [TIER 2 - {@html} review]
src/lib/components/StatuteActionPanel.svelte [TIER 2 - {@html} review]
src/lib/components/CitationHighlighter.svelte [TIER 2 - unsafe snippet]
  ↓ no machine dependencies
(Pure display components)
```

**Fix Status:** 🟡 Needs manual security review (Phase 4 finding)

---

### App-Level: `+layout.svelte` → Global State

```
src/routes/+layout.svelte (App Shell)
  ↓ imports (maybe)
src/lib/machines/app-machine.ts [BROKEN - TIER 2]
  ↓ used for
Theme management, navigation state, sidebar toggle, etc.
```

**Fix Status:** 🟡 May be optional for MVP

---

## Phased Approach to Compilation Success

### Phase 0: Route-Only (Minimum Viable)
**Goal:** Get route tree to compile with stubs

1. ✅ Create empty/stub machines
2. ✅ Ensure all `+page.svelte` and `+layout.svelte` have valid `$props()`
3. ✅ Import routes from `lib/components` (don't import broken machines yet)

**Result:** Routes compile, but machines do nothing

---

### Phase 1: Fix Critical Machines (Your Routes Work)
**Goal:** Make core UX functional

**Files to fix (in order):**
1. `legalFormMachine.ts` [TIER 1] → `/cases/new` works
2. `documentUploadMachine.ts` [TIER 2] → `/cases/[id]/evidence` upload works
3. `evidenceProcessingMachine.ts` [TIER 2] → evidence processing shows progress
4. `embedding-worker.ts` [TIER 1] → background embedding works
5. `utf8-fp32-converter.ts` [TIER 1] → encoding works

**Effort:** 2-3 hours (manual for TIER 1)
**Result:** Core UX + machines operational

---

### Phase 2: Secondary Machines & Components
**Goal:** Full feature parity

**Files to fix:**
- `app-machine.ts` (global state)
- `recommendation-routing-machine.ts` (RAG analysis)
- `crewAIOrchestrationMachine.ts` (background orchestration)
- Statue viewer components (manual security review)

**Effort:** 2-3 hours
**Result:** All routes + machines working

---

### Phase 3: Tier 2-3 Cleanup
**Goal:** Reduce global error count

**Files to fix:**
- Remaining 85 files from 98-file list

**Effort:** 2-4 hours (semi-automated)
**Result:** 71,401 → ~71,050 errors (-351)

---

## Component → Machine Mapping (Quick Reference)

| Component | Uses Machine | File | Status |
|-----------|--------------|------|--------|
| CaseWizard | legalFormMachine | `legalFormMachine.ts` | 🔴 TIER 1 |
| DocumentUploadComponent | documentUploadMachine | `documentUploadMachine.ts` | 🔴 TIER 2 |
| EvidenceTable | evidenceProcessingMachine | `evidenceProcessingMachine.ts` | 🔴 TIER 2 |
| RAGSearchComponent | (none - backend only) | - | ✅ OK |
| StatuteColumn | (none - display) | - | 🟡 Review {@html} |
| NESGraphRenderer | (none - display) | - | ✅ Fixed |
| ChatPanel | recommendation-routing-machine | `recommendation-routing-machine.ts` | 🔴 TIER 2 |

---

## Quick Action Plan

### If you want routes working TODAY:

1. **Fix legalFormMachine.ts** (1 hour)
   - `/cases/new` compiles + form works

2. **Stub out evidence machines** (15 min)
   - `/cases/[id]/evidence` renders (upload disabled until fixed)

3. **Run npm run check:svelte**
   - Should drop from 71,401 to ~71,350

---

### If you want to tackle the full campaign:

**Priority Order:**
1. legalFormMachine.ts (highest impact on UX)
2. documentUploadMachine.ts
3. evidenceProcessingMachine.ts
4. embedding-worker.ts
5. utf8-fp32-converter.ts
6. (Then do Tier 2-3 batch)

---

## File Import Tree (For Reference)

```
legalFormMachine.ts imports:
  ├── xstate v5
  ├── src/lib/types/case.types.ts ✅
  ├── src/lib/types/form.types.ts ✅
  └── Drizzle schema (via API)

documentUploadMachine.ts imports:
  ├── xstate v5
  ├── src/lib/types/document.types.ts ✅
  └── (maybe embedding-worker.ts) [DEPENDENCY]

embedding-worker.ts imports:
  ├── web-worker APIs
  ├── utf8-fp32-converter.ts [TIER 1 BLOCKER]
  └── sentence-transformers or similar

utf8-fp32-converter.ts imports:
  ├── (probably pure utility, no deps)
  └── Maybe Wasm or native module
```

---

## Summary: Routes vs. Machines

| Layer | Status | Impact | Effort |
|-------|--------|--------|--------|
| **Routes (UI structure)** | ✅ Mostly ready | Low (navigation works) | 1 hr |
| **Components (UI elements)** | 🟡 Some broken (@html) | Medium (display issues) | 2-3 hrs |
| **Critical Machines** | 🔴 BROKEN | High (forms/uploads don't work) | 2-3 hrs |
| **Secondary Machines** | 🔴 BROKEN | Medium (features incomplete) | 1-2 hrs |
| **Tier 2-3 Files** | 🔴 BROKEN | Low (error count only) | 2-4 hrs |

**Recommendation:** Fix routes + critical machines first (4-6 hrs), THEN tackle the 98-file campaign.

---

**Next:** Ready to start with **legalFormMachine.ts**? I can sketch a minimal valid XState v5 machine for case creation right now.
