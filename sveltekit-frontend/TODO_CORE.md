# TODO_CORE - YoRHa Legal AI MVP Launch Checklist

**Date:** December 5, 2025 | **Last Updated:** December 7, 2025 ✅
**Goal:** Get core routes (`/cases/*`, `/evidence/*`, `/legal/*`) functional with auth, AI, and error-free machines.
**Status:** TypeScript error remediation complete (6/6 errors fixed). Ready for auth & route implementation.

---

## 0. Preflight / Environment ✅

- [x] `.env` file exists in `sveltekit-frontend/` with required vars
- [x] Dev server running on http://localhost:5173
- [ ] Run database migrations: `npx drizzle-kit push`
- [x] Verify PostgreSQL connection (port 5434, shared Docker Desktop)
- [x] Verify Redis connection (port 6379, shared Docker Desktop)

**Environment Variables Required (Shared Docker Desktop):**
```bash
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db
POSTGRES_PASSWORD=123456
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis
DEV_BYPASS_AUTH=true
OLLAMA_MODEL=gemma3-legal:latest
EMBEDDING_MODEL=embeddinggemma:latest
```

**Note:** All containers are shared via Docker Desktop - DO NOT DELETE!

---

## 1. Core Routes & Layouts (UX Skeleton)

### Root Layout
- [ ] `src/routes/+layout.svelte` uses Svelte 5 `$props()` pattern
- [ ] No conflicting old layouts

### Public Routes (No Auth)
- [ ] `/` - Homepage/Dashboard exists
- [ ] `/login/+page.svelte` - Login form
- [ ] `/register/+page.svelte` - Registration form

### Protected Routes (Behind Auth - `(app)` Group)
- [ ] `src/routes/(app)/+layout.svelte` - Auth wrapper layout
- [ ] `src/routes/(app)/+layout.server.ts` - Lucia guard redirects to `/login`

#### Cases Routes
- [ ] `/(app)/cases/+page.svelte` - Case list
- [ ] `/(app)/cases/new/+page.svelte` - Case intake form
- [ ] `/(app)/cases/[id]/+layout.svelte` - 5-tab layout (Overview, Persons, Evidence, AI, Reports)
- [ ] `/(app)/cases/[id]/overview/+page.svelte` - Case summary
- [ ] `/(app)/cases/[id]/persons/+page.svelte` - Persons of interest
- [ ] `/(app)/cases/[id]/evidence/+page.svelte` - Evidence list/upload
- [ ] `/(app)/cases/[id]/ai/+page.svelte` - AI assistant chat
- [ ] `/(app)/cases/[id]/reports/+page.svelte` - Report generation

#### Evidence Routes
- [ ] `/(app)/evidence/+page.svelte` - Evidence browser
- [ ] `/(app)/evidence/upload/+page.svelte` - Bulk upload
- [ ] `/(app)/evidence/analyze/+page.svelte` - Analysis dashboard

#### Legal Routes
- [ ] `/(app)/legal/documents/+page.svelte` - Legal document library
- [ ] `/(app)/legal-ai-suite/+page.svelte` - AI suite hub

#### Diagnostic Routes
- [ ] `/(app)/all-routes/+page.svelte` - Phase 72/82 inspector

### Cleanup
- [ ] Remove all `[caseId]` duplicate folders (should be `[id]` only)
- [ ] Verify no route conflicts in terminal output

---

## 2. Auth: Lucia Flow (Minimal but Real)

### Setup
- [ ] `src/lib/server/auth/lucia.ts` - Lucia instance configured
- [ ] `src/hooks.server.ts` - Populates `event.locals.user`
- [ ] `src/lib/server/db/schema-auth.ts` - User/session tables in Drizzle

### Login/Logout
- [ ] `/login/+page.server.ts` - Form action calls `lucia.createSession()`
- [ ] `/logout/+server.ts` - POST handler invalidates session + redirects
- [ ] `/register/+page.server.ts` - Creates user with hashed password

### Protected Layout
- [ ] `/(app)/+layout.server.ts` - Checks `locals.user`, redirects if null
- [ ] `/(app)/+layout.svelte` - Displays user info (name/email) in header

### Test Auth Flow
- [ ] Register new user via `/register`
- [ ] Login via `/login` - redirects to `/cases`
- [ ] Logout via `/logout` - redirects to `/`
- [ ] Try accessing `/cases` while logged out - redirects to `/login`

---

## 3. Core Machines & Workers (10 Files)

**All must parse without TypeScript errors. ✅ ALL VERIFIED CLEAN - 6 ERRORS RESOLVED**

### State Machines
- [x] `src/lib/state/legalFormMachine.ts` - Legal form state (verified clean)
- [x] `src/lib/state/caseManagementMachine.ts` - Case CRUD (verified clean)
- [x] `src/lib/state/documentUploadMachine.ts` - File upload workflow (verified clean)
- [x] `src/lib/state/legalDocumentProcessingMachine.ts` - Document ingestion (verified clean)
- [x] `src/lib/state/evidenceProcessingMachine.ts` - Evidence pipeline (verified clean)
- [x] `src/lib/state/appMachine.ts` - Global app state (verified clean)
- [x] `src/lib/state/async-rabbitmq-state-manager.ts` - Queue manager (verified clean)
- [x] `src/lib/state/crewAIOrchestrationMachine.ts` - Multi-agent AI (verified clean - CrewAI orchestration)

### Workers & Utilities
- [x] `src/lib/workers/embedding-worker.ts` - Web Worker manager (verified clean)
- [x] `src/lib/text/utf8-fp32-converter.ts` - Text encoder (verified clean)

### Pre-Existing TypeScript Errors (Fixed December 7, 2025)
- [x] `src/routes/yorha/detective/$types.d.ts` - **3 errors fixed** - Interface property type annotations corrected
- [x] `src/types/gpu.d.ts` - **1 error fixed** - GPU interface method signatures reformatted
- [x] `src/wasm/legal-parser.ts` - **2 errors fixed** - File reformatted from single-line to proper TypeScript

**Verification Status:** ✅ All 6 pre-existing errors resolved. All 10 core machines + utilities: **0 TypeScript errors**
**CrewAI Orchestration:** ✅ Completely isolated - 0 errors maintained

### Verification Commands
```bash
cd sveltekit-frontend

# Quick check all 10 files
npm run phase6:core

# Individual file check
npx tsc --noEmit --skipLibCheck src/lib/state/caseManagementMachine.ts
```

---

## 4. AI: Gemma + Gemini Integration

### 4.1 Core AI Endpoints (Gemma3-legal)

#### LLM Client
- [ ] `src/lib/server/llm/gemmaClient.ts` - Ollama API wrapper
- [ ] Test Ollama connection: `curl http://localhost:11434/api/tags`

#### API Routes
- [ ] `/api/reports/generate/+server.ts` - Generate charging memos/reports
- [ ] `/api/rag/search/+server.ts` - Semantic search over evidence
- [ ] `/api/cases/[id]/ai-summary/+server.ts` - Case summary generation
- [ ] `/api/chat/+server.ts` - Streaming chat endpoint

#### UI Integration
- [ ] `/cases/[id]/ai/+page.svelte` - Calls `/api/chat` for conversation
- [ ] `/cases/[id]/reports/+page.svelte` - Calls `/api/reports/generate`
- [ ] Loading states and error handling for all AI calls

### 4.2 Gemini for Design Support (Optional)

**No runtime dependency - just tooling:**
- [ ] Document prompts in `design-prompts.md`
- [ ] Use Gemini to generate test data (case narratives, evidence descriptions)
- [ ] Use Gemini to generate microcopy (tab labels, tooltips, help text)

---

## 5. Error Fixing: Phase 6 Core + Tools

### Phase 6 Tooling
- [x] `scripts/core-focus.json` - Manifest with 10 routes + 10 machines
- [x] `scripts/phase6-core-focus.mjs` - Verification script
- [x] `package.json` - Added `"phase6:core"` script
- [x] `.vscode/tasks.json` - Added Phase 6 tasks

### CLI Helpers (Ripgrep/PowerShell)

**Find machine usages:**
```bash
rg "caseManagementMachine" sveltekit-frontend/src -n
```

**Check all core machines:**
```powershell
$machines = @(
  "legalFormMachine",
  "caseManagementMachine",
  "documentUploadMachine",
  "legalDocumentProcessingMachine",
  "evidenceProcessingMachine",
  "appMachine",
  "async-rabbitmq-state-manager",
  "crewAIOrchestrationMachine",
  "embedding-worker",
  "utf8-fp32-converter"
)

foreach ($m in $machines) {
  Write-Host "=== $m ===" -ForegroundColor Cyan
  rg $m sveltekit-frontend/src -n
}
```

### Known Issues Fixed
- [x] Unicode quote characters in `utf8-fp32-converter.ts` (replaced with `\u201C` etc.)
- [x] All 10 core machines use XState v5 `setup()` pattern
- [ ] Remove errors in `production-config.ts` and `cases.mcp.ts` (not blocking)

---

## 6. Design: Figma + Gemini

### Figma File Structure
- [ ] Create "YoRHa Legal AI" Figma file
- [ ] **Dashboard** page - Homepage/case metrics
- [ ] **Cases** page - Case list, detail view, 5 tabs
- [ ] **Evidence Board** page - Interactive canvas
- [ ] **Legal AI Suite** page - AI tools hub
- [ ] **Auth** page - Login/register screens

### Component Naming Convention
**Match Svelte components to Figma layers:**
- `CaseHeader` → Case header component
- `TabBar` → 5-tab navigation
- `EvidenceTable` → Evidence list table
- `AIChatPanel` → AI assistant chat UI
- `ReportEditor` → TipTap editor wrapper

### Gemini Support Tasks
- [ ] Generate 10 sample case narratives (robbery, assault, fraud, etc.)
- [ ] Generate 20 sample evidence items (photos, documents, videos)
- [ ] Generate microcopy for all tab labels and tooltips
- [ ] Save prompts to `design-prompts.md`

---

## 7. Manual Testing (Browser)

### Test 1: Homepage
- [ ] Visit http://localhost:5173/
- [ ] Page loads without errors
- [ ] Marketing/landing content displays

### Test 2: Auth Flow
- [ ] Visit `/register` - form displays
- [ ] Create account - redirects to `/cases`
- [ ] Visit `/logout` - redirects to `/`
- [ ] Try `/cases` while logged out - redirects to `/login`
- [ ] Login - redirects to `/cases`

### Test 3: Case Intake
- [ ] Visit `/cases/new`
- [ ] Fill WHO/WHAT/WHEN/WHERE/WHY/HOW fields
- [ ] Click "Create Case" - redirects to `/cases/[id]/overview`
- [ ] Case appears in `/cases` list

### Test 4: Case Tabs Navigation
- [ ] Visit `/cases/[id]/overview` - case summary displays
- [ ] Click "Persons" tab - `/cases/[id]/persons` loads
- [ ] Click "Evidence" tab - `/cases/[id]/evidence` loads
- [ ] Click "AI" tab - `/cases/[id]/ai` loads chat interface
- [ ] Click "Reports" tab - `/cases/[id]/reports` loads editor

### Test 5: Evidence Upload
- [ ] Visit `/cases/[id]/evidence`
- [ ] Click "Upload Evidence" button
- [ ] Select file (PDF/image) - upload starts
- [ ] Progress bar displays
- [ ] Evidence appears in list after processing

### Test 6: AI Assistant
- [ ] Visit `/cases/[id]/ai`
- [ ] Type message: "Summarize this case"
- [ ] AI responds with case summary
- [ ] Conversation history displays correctly

### Test 7: Report Generation
- [ ] Visit `/cases/[id]/reports`
- [ ] Click "Generate Charging Memo"
- [ ] Loading spinner displays
- [ ] Generated report appears in TipTap editor
- [ ] Edit report content
- [ ] Click "Save" - report saves to database

### Test 8: All Routes Inspector
- [ ] Visit `/all-routes`
- [ ] Route table displays all routes
- [ ] Click any route - NES modal opens
- [ ] Phase 72 error count displays
- [ ] Phase 82 migration status displays

### Test 9: Evidence Board (GPU)
- [ ] Visit `/cases/[id]/evidence/board`
- [ ] Interactive canvas loads
- [ ] Evidence items display as nodes
- [ ] GPU acceleration status shows in console

### Test 10: API Endpoints
```bash
# Test report generation
curl -X POST http://localhost:5173/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"caseId": "test-123", "template": "charging_memo"}'

# Test RAG search
curl -X POST http://localhost:5173/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "evidence of robbery", "caseId": "test-123"}'
```

---

## 8. Database Migrations

### Initial Setup
```bash
cd sveltekit-frontend
npm run db:push
```

**Expected tables created:**
- `cases`
- `persons_of_interest`
- `case_persons`
- `evidence`
- `reports`
- `users` (Lucia auth)
- `sessions` (Lucia auth)

### Verify Schema
```bash
psql -U legal_admin -d legal_ai_db -c "\dt"
```

### Seed Test Data (Optional)
```bash
npm run db:seed
```

---

## 9. Performance Checks

### Dev Server Health
- [ ] No TypeScript errors in console
- [ ] No Svelte warnings in console
- [ ] HMR (hot module reload) working
- [ ] Page load time < 2 seconds

### Database Queries
- [ ] Case list query < 100ms
- [ ] Case detail query < 50ms
- [ ] Evidence list query < 100ms

### AI Response Times
- [ ] Report generation < 10 seconds
- [ ] RAG search < 2 seconds
- [ ] Chat response streaming starts < 1 second

---

## 10. Success Criteria (MVP Launch)

**All must pass:**
- [ ] All core routes load without errors
- [ ] Auth flow works (register/login/logout)
- [ ] Case creation saves to database
- [ ] 5 tabs navigate correctly
- [ ] Evidence upload processes files
- [ ] AI chat responds to queries
- [ ] Report generation creates documents
- [ ] No TypeScript errors in core machines
- [ ] Phase 6 verification passes
- [ ] `/all-routes` inspector displays route health

---

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run phase6:core           # Verify core machines
npm run db:push               # Run migrations
npm run db:seed               # Seed test data

# Testing
npm run test                  # Run unit tests
npm run test:e2e             # Run Playwright tests
npm run check                # TypeScript + Svelte check

# Building
npm run build                # Production build
npm run preview              # Preview production build

# Debugging
rg "KEYWORD" src -n          # Search codebase
npx tsc --noEmit FILE        # Check single file
```

---

## Notes

- **Port 5434:** PostgreSQL (not standard 5432)
- **Auth:** Lucia with session cookies
- **AI Model:** `gemma3-legal:latest` via Ollama
- **Embedding Model:** `embeddinggemma:latest`
- **Dev Auth Bypass:** Set `DEV_BYPASS_AUTH=true` to skip login

**Project Status Summary:**
- ✅ **Core Machines (Section 3):** 10/10 files verified clean, all XState v5 compliant
- ✅ **TypeScript Errors (Section 5):** 6/6 pre-existing errors fixed (Dec 7, 2025)
  - Fixed: `$types.d.ts` (3 errors - interface syntax)
  - Fixed: `gpu.d.ts` (1 error - interface methods)
  - Fixed: `legal-parser.ts` (2 errors - file formatting)
- ⏳ **Next Priority:** Sections 0-2 (Preflight, Routes, Auth)
- ⏳ **In Progress:** Section 7-10 (Testing, Database, Performance, Launch criteria)

**Last Updated:** December 7, 2025 - TypeScript remediation complete
