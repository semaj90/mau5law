# Prosecutor MVP — Implementation Guide

**Status:** Ready to build
**Scope:** 7 core screens, 3 API pipelines, 1 intake flow
**Timeline:** 2-3 weeks to MVP

---

## What's Ready

### 1. Specification
- **`PROSECUTOR_MVP_SPEC.md`** — Complete spec with screens, APIs, schema, examples

### 2. Intake Flow (Complete)
- **`/cases/new/+page.svelte`** — Intake form with narrative + guided prompts
- **`/api/intake/case/+server.ts`** — Backend that calls Gemma3 to extract case data

### 3. Data-Driven Testing & Logging
- **`route-data-driven-test.mjs`** — Test routes by priority, log results
- **`route-operation-logger.ts`** — Log Phase 72 + Phase 82 operations
- **`/api/route-operations/log/+server.ts`** — API to query operation logs

### 4. Route Organization System
- **`route-organization-report.json`** — Source of truth for all 477 routes
- **`/all-routes/+page.svelte`** — Interactive evidence board for routes
- **`ROUTE_ORGANIZATION_SYSTEM.md`** — Full integration guide

---

## How to Use the Data-Driven System

### Test Routes by Priority

```bash
# Test all high-priority routes
node scripts/route-data-driven-test.mjs --priority=high

# Test only Core category
node scripts/route-data-driven-test.mjs --category=Core

# Test only real routes (not lore)
node scripts/route-data-driven-test.mjs --real-only

# Test high-priority real routes
node scripts/route-data-driven-test.mjs --priority=high --real-only
```

**Output:**
- Console summary (pass rate, failures, by category/priority)
- JSON log file: `.route-test-logs/route-test-TIMESTAMP.json`

### Log Operations

**From your code:**
```typescript
import { routeLogger } from '$lib/utils/route-operation-logger';

// Log Phase 72 error analysis
routeLogger.logPhase72Error(
  '/cases/[id]',
  'Core',
  'high',
  { code: 'TS2345', message: 'Argument not assignable', count: 1 },
  'Add type annotation'
);

// Log Phase 82 Svelte 5 upgrade
routeLogger.logPhase82Upgrade(
  '/cases/[id]',
  'Core',
  'high',
  {
    filesUpgraded: 3,
    patternsFixed: ['export let → $props()', 'onMount → $effect'],
    errors: []
  },
  1234 // duration in ms
);

// Get report
const report = routeLogger.generateReport();
console.log(report);
```

**Via API:**
```bash
# Get all operations
curl http://127.0.0.1:5173/api/route-operations/log

# Log a new operation
curl -X POST http://127.0.0.1:5173/api/route-operations/log \
  -H "Content-Type: application/json" \
  -d '{
    "type": "phase82_upgrade",
    "route": "/cases/[id]",
    "category": "Core",
    "priority": "high",
    "data": {
      "result": {
        "filesUpgraded": 3,
        "patternsFixed": ["export let → $props()"],
        "errors": []
      },
      "duration": 1234
    }
  }'

# Export as CSV
curl http://127.0.0.1:5173/api/route-operations/log > operations.json
```

---

## Prosecutor MVP: Next Steps

### Phase 1: Intake Flow (Week 1)

**What's done:**
- ✅ `/cases/new` page (intake form)
- ✅ `POST /api/intake/case` endpoint
- ✅ Gemma3 prompt for extraction

**What's left:**
- [ ] Database schema (Drizzle)
- [ ] Create cases, persons, evidence records
- [ ] Test with real Gemma3 instance
- [ ] Error handling + validation

**To test:**
```bash
# Start dev server
npm run dev:quic

# Visit intake form
http://127.0.0.1:5173/cases/new

# Fill form and submit
# Should redirect to /cases/[caseId]/overview
```

### Phase 2: Case Overview (Week 2)

**What's needed:**
- [ ] `/cases/[id]/overview` page (tabs)
- [ ] `/cases/[id]/canvas` (evidence board)
- [ ] Evidence upload & OCR
- [ ] Vector search integration

**Routes to create:**
```
/cases                    → List all cases
/cases/[id]/overview      → Case dashboard (tabs)
/cases/[id]/canvas        → Evidence board
/cases/[id]/evidence      → Evidence library
/cases/[id]/persons       → POIs for this case
/cases/[id]/reports       → Reports & exports
```

### Phase 3: Reports & Editor (Week 3)

**What's needed:**
- [ ] TipTap editor component
- [ ] `POST /api/reports/generate` endpoint
- [ ] Report templates (charging memo, discovery list, etc.)
- [ ] PDF export

**Key endpoints:**
```
POST /api/reports/generate
  Input: caseId, reportType, template
  Output: reportId, content_json (TipTap format)

GET /api/reports/[id]/export/pdf
  Input: reportId, format
  Output: PDF file
```

### Phase 4: Polish + Persons + Search (Week 4+)

**What's needed:**
- [ ] `/persons` page (POI profiles)
- [ ] Global search bar
- [ ] Citations normalization
- [ ] Hearing prep notes

---

## Data-Driven Development Workflow

### 1. Use Route Organization Report to Prioritize

```bash
# See which routes matter most
cat sveltekit-frontend/src/lib/data/route-organization-report.json | jq '.categories.Core'

# Output:
# {
#   "priority": "high",
#   "routes": [
#     { "path": "/cases", "functional": true },
#     { "path": "/cases/[id]", "functional": true },
#     ...
#   ]
# }
```

### 2. Test High-Priority Routes First

```bash
# Test only Core category (high priority)
node scripts/route-data-driven-test.mjs --category=Core --priority=high

# Output:
# ROUTE DATA-DRIVEN TEST SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Total Routes Tested: 18
# ✅ Passed: 16
# ❌ Failed: 2
# Pass Rate: 88.9%
#
# --- By Category ---
# Core: 16/18 (88.9%)
#
# --- Failed Routes ---
# /cases/[id] [high]
#   - Uses legacy export let (Svelte 5 incompatible)
#   - Uses onMount (should use $effect)
```

### 3. Log Operations as You Fix

```typescript
// In your Phase 82 codemod
routeLogger.logPhase82Upgrade(
  '/cases/[id]',
  'Core',
  'high',
  {
    filesUpgraded: 1,
    patternsFixed: ['export let → $props()', 'onMount → $effect'],
    errors: []
  },
  1234
);
```

### 4. Generate Reports

```bash
# Get operation summary
curl http://127.0.0.1:5173/api/route-operations/log | jq '.summary'

# Output:
# {
#   "total": 42,
#   "byPhase": { "72": 15, "82": 27 },
#   "byStatus": { "success": 40, "warning": 2, "error": 0 },
#   "byCategory": { "Core": 18, "AI": 12, "Auth": 10, "Utility": 2 },
#   "byPriority": { "high": 30, "medium": 10, "low": 2 }
# }
```

---

## Intake Flow: Step-by-Step

### 1. Prosecutor visits `/cases/new`

Sees:
- Big textarea for narrative
- Guided prompts (WHO, WHAT, WHEN, WHERE, WHY, HOW)
- File upload zone (drag-and-drop)
- "Create Case" button

### 2. Prosecutor fills form

```
Narrative: "On March 15, 2024, Officer Smith responded to a robbery..."
WHO: "Suspect: John Doe. Victim: Jane Smith."
WHAT: "Armed robbery"
WHEN: "March 15, 2024, 11:30 PM"
WHERE: "7-Eleven, 456 Main St"
WHY: "Suspect needed money"
HOW: "Displayed firearm, demanded cash"
```

### 3. Prosecutor clicks "Create Case"

Frontend:
1. Uploads evidence files (if any)
2. Calls `POST /api/intake/case` with form data

Backend:
1. Builds prompt for Gemma3
2. Calls Gemma3 to extract structured data
3. Creates case, persons, evidence records
4. Creates intake summary report
5. Returns caseId

Frontend:
1. Redirects to `/cases/[caseId]/overview`

### 4. Prosecutor sees case overview

Tabs:
- **Overview:** Case summary, timeline, key dates
- **Evidence:** Evidence board (beige grid)
- **Persons:** POIs, defendants, witnesses
- **AI Analysis:** Chat + generated documents
- **Reports:** Charging memo, discovery list, etc.

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `PROSECUTOR_MVP_SPEC.md` | Complete specification |
| `PROSECUTOR_MVP_IMPLEMENTATION.md` | This file |
| `/cases/new/+page.svelte` | Intake form |
| `/api/intake/case/+server.ts` | Intake backend |
| `route-data-driven-test.mjs` | Test runner |
| `route-operation-logger.ts` | Operation logging |
| `/api/route-operations/log/+server.ts` | Log API |
| `route-organization-report.json` | Route metadata |
| `/all-routes/+page.svelte` | Route evidence board |

---

## Success Criteria

- [ ] Prosecutor can fill intake form
- [ ] AI extracts case data (charges, persons, timeline)
- [ ] Case record created with all data
- [ ] Redirect to case overview works
- [ ] Case overview displays all tabs
- [ ] Evidence board renders
- [ ] AI generates charging memo draft
- [ ] Prosecutor can edit memo in TipTap
- [ ] Prosecutor can export PDF
- [ ] All data persists and is searchable
- [ ] Test suite passes (high-priority routes)
- [ ] Operation logs are accurate

---

## Testing Strategy

### Unit Tests
- Gemma3 prompt extraction
- Evidence type inference
- Citation normalization

### Integration Tests
- Intake form → case creation
- Case creation → overview redirect
- Evidence upload → OCR → embedding

### E2E Tests (Playwright)
- Prosecutor flow: intake → case → reports
- Evidence board interactions
- Report generation & export

### Data-Driven Tests
```bash
# Run before each commit
node scripts/route-data-driven-test.mjs --priority=high --real-only

# Should see:
# ✅ Passed: 50+
# ❌ Failed: 0
```

---

## Deployment Checklist

- [ ] Database schema created (Drizzle migrations)
- [ ] Gemma3 instance running (Ollama)
- [ ] All high-priority routes tested
- [ ] Operation logs clean
- [ ] Intake form tested with real data
- [ ] Case overview displays correctly
- [ ] Evidence board renders
- [ ] Reports generate without errors
- [ ] PDF export works
- [ ] Search indexes built
- [ ] Auth working (login/logout)
- [ ] Error handling in place

---

## What NOT to Ship (Yet)

- Org / roles / multi-user (solo prosecutor first)
- Advanced analytics / dashboards
- Integration with court systems
- Mobile app
- All 333 API endpoints (just the 15 core ones)
- All demo routes (keep as internal tools)
- Svelte 5 migration for non-core routes
- All 344 empty directories (archive later)

---

## Next Immediate Steps

1. **Test the intake flow:**
   ```bash
   npm run dev:quic
   # Visit http://127.0.0.1:5173/cases/new
   # Fill form and submit
   ```

2. **Check Gemma3 integration:**
   ```bash
   # Make sure Ollama is running
   curl http://127.0.0.1:11434/api/tags
   ```

3. **Run data-driven tests:**
   ```bash
   node scripts/route-data-driven-test.mjs --priority=high
   ```

4. **Review operation logs:**
   ```bash
   curl http://127.0.0.1:5173/api/route-operations/log | jq '.summary'
   ```

5. **Build case overview page:**
   - Create `/cases/[id]/overview/+page.svelte`
   - Add tabs: Overview, Evidence, Persons, AI Analysis, Reports

---

**You now have:**
- ✅ Intake form (ready to test)
- ✅ Intake backend (ready to test)
- ✅ Data-driven testing system (ready to use)
- ✅ Operation logging system (ready to use)
- ✅ Route organization system (ready to use)

**Next:** Build case overview page and evidence board. Let the data guide you. 🚀
