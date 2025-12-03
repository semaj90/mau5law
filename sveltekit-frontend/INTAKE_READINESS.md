# Intake Flow Readiness Check - December 3, 2025

## ✅ Production Files Status

### 1. LLM Extraction Helper
- **File**: `src/lib/server/llm/gemmaIntake.ts`
- **Status**: ✅ CLEAN
- **Exports**: `extractCaseStructureWithGemma()` function
- **Integration**: Calls Gemma3-Legal at `http://127.0.0.1:11434/api/generate`
- **Returns**: `IntakeExtractionResult` with title, statute, severity, persons[]

### 2. Intake API Endpoint
- **File**: `src/routes/api/intake/case/+server.ts`
- **Status**: ✅ CLEAN
- **Handler**: POST `/api/intake/case`
- **Logic**:
  1. Validates JSON body (IntakeBody type)
  2. Calls `extractCaseStructureWithGemma()` with WHO/WHAT/WHEN/WHERE/WHY/HOW
  3. Creates `cases` row in PostgreSQL
  4. Creates `personsOfInterest` rows + `casePersons` joins
  5. Creates `evidence` rows for attachments
  6. Returns `{ caseId, caseTitle, createdPersons, createdEvidence }` (201)

### 3. Form Submission
- **File**: `src/routes/cases/new/+page.svelte`
- **Status**: ✅ CLEAN (Svelte 5 runes)
- **Flow**:
  1. Collects narrative + WHO/WHAT/WHEN/WHERE/WHY/HOW fields
  2. Uploads files → `/api/evidence/upload` → collects `fileKey` + metadata
  3. POSTs to `/api/intake/case` with full `IntakeBody`
  4. On success: redirects to `/cases/${caseId}/overview`

### 4. Phase 72 Error Capture
- **File**: `src/routes/api/phase72/errors/+server.ts`
- **Status**: ✅ EXISTS
- **Query**: GET `/api/phase72/errors?route=<path>`
- **Returns**: Error count + last error details for a route

### 5. Phase 72 AI Suggestions
- **File**: `src/routes/api/phase72/suggest-fix/+server.ts`
- **Status**: ✅ EXISTS
- **Handler**: POST `/api/phase72/suggest-fix`
- **Integration**: Calls Ollama Gemma3-Legal for fix suggestions
- **Fallback**: Generates basic suggestion if Ollama unavailable

### 6. Route Inspector Board
- **File**: `src/lib/components/RouteInspectorDetectiveBoard.svelte`
- **Status**: ✅ CORRECT (uses `$bindable()` for Svelte 5)
- **Features**:
  - Fetches Phase 72 errors for a route
  - Displays error count + last error
  - "Ask Error Brain" button → calls suggest-fix endpoint
  - "Run Svelte 5 Codemod" button → /api/phase82/upgrade-route

### 7. Route Conflict Resolution
- **Status**: ✅ FIXED
- **Action**: Deleted `src/routes/api/cases/[id]` folder
- **Canonical**: `src/routes/api/cases/[caseId]` is now the only variant

## 🔗 End-to-End Flow

```
1. User submits /cases/new form
   ↓
2. Files uploaded → /api/evidence/upload
   ↓
3. Form POSTs to /api/intake/case
   ↓
4. Intake endpoint calls extractCaseStructureWithGemma()
   ↓
5. Gemma3 extraction → returns title, persons, statute, severity
   ↓
6. Creates cases + personsOfInterest + casePersons + evidence rows
   ↓
7. Returns caseId (201)
   ↓
8. Frontend redirects to /cases/[caseId]/overview
   ↓
9. If user makes a typo/breaks something, Phase 72 captures it
   ↓
10. RouteInspectorDetectiveBoard shows error count
   ↓
11. User clicks "Ask Error Brain"
   ↓
12. Calls /api/phase72/suggest-fix → Gemma3 AI suggestion
```

## 📋 Prerequisites for Testing

1. **PostgreSQL 17** running locally (expected at port 5432)
   - Database: `legal_ai_db`
   - Tables: `cases`, `personsOfInterest`, `casePersons`, `evidence`

2. **Ollama Gemma3-Legal** running (expected at http://127.0.0.1:11434)
   - Model: `gemma3-legal` (or fallback to `gemma3`)

3. **SvelteKit dev server** running
   - `npm run dev:quic` (from sveltekit-frontend/)

4. **Drizzle schema files** properly resolved:
   - `src/lib/server/db/schema/cases.ts`
   - `src/lib/server/db/schema/persons.ts`
   - `src/lib/server/db/schema/evidence.ts`

## 🧪 Test Checklist

- [ ] Navigate to http://127.0.0.1:5173/cases/new
- [ ] Fill in WHO/WHAT/WHEN/WHERE/WHY/HOW fields
- [ ] Enter a narrative (e.g., "Suspect attempted theft of merchandise")
- [ ] Optionally upload an image or PDF
- [ ] Click Submit
- [ ] Verify: Redirect to /cases/[caseId]/overview (201 response)
- [ ] Verify: `cases` table has new row with caseTitle
- [ ] Verify: `personsOfInterest` table has persons extracted by Gemma3
- [ ] Verify: `casePersons` table has joins
- [ ] Verify: `evidence` table has attachment rows (if files uploaded)
- [ ] Navigate to /all-routes
- [ ] Click on a route to open Route Inspector
- [ ] Verify: "Phase 72 Error Count" section shows 0 (or errors if any)
- [ ] Intentionally introduce a bug (e.g., remove required field)
- [ ] Verify: Phase 72 captures it, Route Inspector shows error
- [ ] Click "Ask Error Brain"
- [ ] Verify: AI suggestion logged to console

## 📝 Notes

- Archive test files (`src/routes/archive/tests/api/*+server.ts`) have corruption but don't affect production
- Compilation will still show errors from archive files; these are safe to ignore
- Production intake flow is fully wired and ready to test
- Phase 72 → 78 → 82 chain is intact

---

**Status**: ✅ READY FOR TESTING
**Last Updated**: December 3, 2025
