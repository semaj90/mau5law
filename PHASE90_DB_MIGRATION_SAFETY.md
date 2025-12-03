# Phase 90: Database Migration Safety & Protected Routes

**Date:** December 3, 2025
**Status:** ✅ **ACTIVE PROTECTION**
**Purpose:** Prevent accidental data loss during migrations and route cleanup

---

## 1. Overview

Phase 90 establishes **safety rails** around:
1. Database schema migrations (Drizzle)
2. Core application routes (Prosecutor MVP)
3. Phase 72–78 error brain integration
4. AST/graph analysis endpoints

**Rule:** No migration, cleanup script, or refactor may drop, truncate, or rename protected resources without explicit review and backup.

---

## 2. Protected Database Tables

### A. Prosecutor MVP Tables (NEW - Do Not Drop)

```sql
-- Core prosecutor tables
prosecutor_cases
prosecutor_persons
prosecutor_case_persons
prosecutor_evidence
prosecutor_reports
```

**Location:** `src/lib/server/db/schema-prosecutor.ts`

**Why Protected:**
- These are the NEW tables for the prosecutor vertical
- Separate from existing `legal_ai_db` schema
- No conflicts with existing tables
- Required for `/cases/*` routes to function

### B. Phase 72 Error Brain Tables (Do Not Drop)

```sql
-- Error capture & analysis
phase72_error
phase72_error_vector
phase72_cluster
phase72_cluster_summary

-- Views
phase72_error_stats
phase72_route_errors
phase72_cluster_quality
phase72_error_summary
```

**Why Protected:**
- Powers the error brain and AST/graph analysis
- Used by `/all-routes` Detective Board
- Required for Phase 78 AI-assisted fixes

### C. Existing Legal AI Tables (Preserve)

```sql
-- Core existing tables (do not modify without review)
cases
evidence
persons_of_interest
legal_documents
users
sessions
rag_sessions
rag_messages
```

**Why Protected:**
- Existing production data
- May have dependencies in other routes
- Prosecutor MVP uses separate tables to avoid conflicts

---

## 3. Migration Safety Rules

### Rule 1: Never Auto-Apply Destructive Migrations

When Drizzle shows:
```
Warning: Found data-loss statements:
· You're about to delete X table with Y items
· You're about to drop Z column with data
```

**STOP!** Do not proceed without:
1. Reviewing what will be deleted
2. Creating a backup
3. Confirming with team/user

### Rule 2: Use Separate Schemas for New Features

✅ **GOOD:**
```typescript
// New prosecutor tables with unique names
export const prosecutorCases = pgTable('prosecutor_cases', { ... });
export const prosecutorPersons = pgTable('prosecutor_persons', { ... });
```

❌ **BAD:**
```typescript
// Conflicts with existing 'cases' table
export const cases = pgTable('cases', { ... });
```

### Rule 3: Test Migrations in Development First

```bash
# 1. Backup production database
pg_dump legal_ai_db > backup_$(date +%Y%m%d).sql

# 2. Test migration in development
npm run db:push

# 3. Verify no data loss
psql -d legal_ai_db -c "SELECT count(*) FROM prosecutor_cases;"

# 4. Only then apply to production
```

---

## 4. Protected Routes & Layouts

### A. Core Prosecutor UI Routes (Do Not Remove)

| Route | File | Purpose | API Calls |
|-------|------|---------|-----------|
| `/dashboard` | `src/routes/dashboard/+page.svelte` | Command Center | Active cases, system status |
| `/cases/new` | `src/routes/cases/new/+page.svelte` | Intake form | `POST /api/intake/case` |
| `/cases/[id]/overview` | `src/routes/cases/[id]/overview/+page.svelte` | Case dashboard | `GET /api/cases/[id]` |
| `/cases/[id]/canvas` | `src/routes/cases/[id]/canvas/+page.svelte` | Evidence board | Graph visualization |
| `/evidence` | `src/routes/evidence/+page.svelte` | Evidence library | `GET /api/evidence` |
| `/persons` | `src/routes/persons/+page.svelte` | POI profiles | `GET /api/persons` |
| `/cases/[id]/reports` | `src/routes/cases/[id]/reports/+page.svelte` | Report editor | `POST /api/reports/generate` |

**Why Protected:**
- Required for end-to-end prosecutor workflow
- Intake → Analysis → Report generation
- Any deletion breaks the entire MVP

### B. Route Explorer & Detective Board (Phase 72–78 UI)

| Route | File | Purpose |
|-------|------|---------|
| `/all-routes` | `src/routes/all-routes/+page.svelte` | Route explorer UI |
| Detective Board | `src/lib/components/RouteInspectorDetectiveBoard.svelte` | Phase 72/82 inspector modal |

**API Endpoints:**
```
GET  /api/phase72/errors?route=...
GET  /api/phase82/status?route=...
POST /api/phase72/suggest-fix
POST /api/phase82/upgrade-route
```

**Why Protected:**
- Main human interface to Phase 72/78 error brain
- Shows AST/graph analysis results
- Required for AI-assisted fixes

### C. Phase 72: Error Capture & Analysis

**Backend Endpoints:**
```
GET  /api/phase72/errors          → Error details for route
GET  /api/errors/summary           → High-level error summary
GET  /api/consolidation/status     → Cluster/AST-graph status
```

**Files:**
```
src/routes/api/phase72/errors/+server.ts
src/routes/api/errors/summary/+server.ts
src/routes/api/consolidation/status/+server.ts
```

**Why Protected:**
- Powers error capture and AST/graph analysis
- Used by Detective Board and dashboards
- Required for Phase 78 AI fixes

### D. Phase 78: AI-Assisted Fixes & Codemods

**Backend Endpoints:**
```
POST /api/phase72/suggest-fix      → LLM-based fix suggestions
POST /api/phase82/upgrade-route    → Run codemods/Svelte 5 upgrade
GET  /api/phase82/status           → Phase 82 status per route
POST /api/route-operations/log     → Operation logging
```

**Files:**
```
src/routes/api/phase72/suggest-fix/+server.ts
src/routes/api/phase82/upgrade-route/+server.ts
src/routes/api/phase82/status/+server.ts
src/routes/api/route-operations/log/+server.ts
src/lib/utils/route-operation-logger.ts
src/lib/data/route-organization-report.json
```

**Why Protected:**
- AST graph–assisted analysis
- AI-powered fix suggestions
- Operation logging for Phase 72/82

### E. Layout Groups (Handle with Care)

```
(auth)          → Wraps /login, /register
(legal)         → Wraps /cases/*, /evidence
(evidence)      → Evidence-specific routes
(ai)            → AI analysis routes
(admin)         → Admin tools
(tools)/(dev)   → /all-routes and diagnostics
```

**Why Protected:**
- Frame core routes
- Provide shared navigation chrome
- Renaming breaks navigation and Phase 72/78 tooling

---

## 5. Route Conflict Resolution

### Problem: `[caseId]` vs `[id]` Conflict

SvelteKit sees these as identical:
```
/api/cases/[caseId]/evidence
/api/cases/[id]/evidence
```

### Solution: Standardize on `[id]`

✅ **Keep:**
```
src/routes/cases/[id]/overview/+page.svelte
src/routes/cases/[id]/reports/+page.svelte
src/routes/api/cases/[id]/+server.ts
```

❌ **Remove:**
```
src/routes/cases/[caseId]/*
src/routes/api/cases/[caseId]/*
```

**Script to fix:**
```bash
# Remove all [caseId] folders
Remove-Item -Path "src/routes/cases/[caseId]" -Recurse -Force
Remove-Item -Path "src/routes/api/cases/[caseId]" -Recurse -Force
```

---

## 6. Testing Checklist

Before deploying any migration or route cleanup:

### Database Migrations
- [ ] Reviewed Drizzle migration output
- [ ] No unexpected table drops
- [ ] No data-loss warnings (or explicitly approved)
- [ ] Backup created
- [ ] Tested in development first

### Route Changes
- [ ] No protected routes deleted
- [ ] No route conflicts (check Vite output)
- [ ] Phase 72/78 endpoints still accessible
- [ ] `/all-routes` still loads
- [ ] Detective Board modal still opens

### Integration Tests
- [ ] Case intake works (`/cases/new`)
- [ ] Case overview loads (`/cases/[id]/overview`)
- [ ] Report generation works (`POST /api/reports/generate`)
- [ ] Error summary accessible (`GET /api/errors/summary`)
- [ ] Route operations log (`GET /api/route-operations/log`)

---

## 7. Emergency Rollback

If a migration causes data loss:

### Database Rollback
```bash
# 1. Stop application
npm run stop

# 2. Restore from backup
psql -d legal_ai_db < backup_YYYYMMDD.sql

# 3. Verify data
psql -d legal_ai_db -c "SELECT count(*) FROM prosecutor_cases;"

# 4. Restart application
npm run dev:quic
```

### Route Rollback
```bash
# 1. Revert Git changes
git checkout HEAD~1 src/routes/

# 2. Restart dev server
npm run dev:quic

# 3. Verify routes load
curl http://localhost:5173/all-routes
```

---

## 8. Protected Routes & Phase 72–78 Integration

In addition to protecting the database schema, PHASE90 must preserve the **core application routes and analysis endpoints** that power:

- The Prosecutor MVP UI
- Phase 72 error capture & AST/graph analysis
- Phase 78 AI-assisted fixes

### 8.1 Core Prosecutor UI Routes (Do Not Remove)

These pages are required for the end-to-end intake → analysis → report flow:

- `/dashboard`
  - Command Center (active cases, activity, system status)
  - File: `src/routes/dashboard/+page.svelte`

- `/cases/new`
  - Intake form (narrative, WHO/WHAT/WHEN/WHERE/WHY/HOW, file upload)
  - File: `src/routes/cases/new/+page.svelte`
  - Calls: `POST /api/intake/case`

- `/cases/[id]/overview`
  - Case dashboard (tabs: Overview, Evidence, Persons, AI, Reports)
  - File: `src/routes/cases/[id]/overview/+page.svelte`
  - Calls: `GET /api/cases/[id]`, `GET /api/evidence`, `GET /api/persons`

- `/cases/[id]/canvas`
  - Evidence board (beige grid, nodes, connections)
  - File: `src/routes/cases/[id]/canvas/+page.svelte`
  - Future: surface Phase 72 error clusters / AST graph overlays here

- `/evidence`
  - Evidence library (table/grid)
  - File: `src/routes/evidence/+page.svelte`
  - Calls: `GET /api/evidence`, `GET /api/search/evidence`

- `/persons`
  - Persons of Interest (POI profiles: demographics, risk flags, timeline, associates)
  - File: `src/routes/persons/+page.svelte`
  - Calls: `GET /api/persons`, `GET /api/known-associates`

- `/cases/[id]/reports`
  - Report editor (TipTap)
  - File: `src/routes/cases/[id]/reports/+page.svelte`
  - Calls: `POST /api/reports/generate`, `GET /api/reports/[id]/export/pdf`

Any route cleanup or refactor must **not delete or repurpose** these paths without updating the entire Prosecutor MVP flow.

### 8.2 Route Explorer & Detective Board (Phase 72–78 UI)

- `/all-routes`
  - Route explorer UI, backed by `route-organization-report.json`
  - File: `src/routes/all-routes/+page.svelte`
  - Can filter by category, priority, and "real/lore"

- `RouteInspectorDetectiveBoard.svelte`
  - Detective Board modal used by `/all-routes`
  - Loads Phase 72 / Phase 82 status for a given route
  - Calls:
    - `GET /api/phase72/errors?route=...`
    - `GET /api/phase82/status?route=...`
    - `POST /api/phase72/suggest-fix`
    - `POST /api/phase82/upgrade-route`

This combo is the main **human interface to the Phase 72/78 "error brain"** and must remain intact.

### 8.3 Phase 72: Error Capture & AST/Graph Analysis

Phase 72 uses Postgres tables + views to store error logs, vectors, and clustered/AST-based analysis:

- Tables:
  - `phase72_error`
  - `phase72_error_vector`

- Views:
  - `phase72_error_stats`
  - `phase72_route_errors`
  - `phase72_cluster_quality`
  - `phase72_error_summary`

Backed by SvelteKit endpoints:

- `/api/phase72/errors`
  - Returns error details for a specific route

- `/api/errors/summary`
  - High-level error summary for dashboards

- `/api/consolidation/status` (optional)
  - Status of Phase 72 clustering / AST graph consolidation

**PHASE90 Rule:**
No migration may drop, truncate, or silently alter these Phase 72 structures without an explicit, reviewed migration plan and a backup.

### 8.4 Phase 78: AI-Assisted Fixes & Codemods

Phase 78 builds on Phase 72 error data (including vector/AST features) to suggest and apply fixes:

- `/api/phase72/suggest-fix`
  - Uses the error vectors / AST graph to get LLM suggestions for a route

- `/api/phase82/upgrade-route`
  - Runs codemods / Svelte 5 upgrades on the target route

- `/api/phase82/status`
  - Returns Phase 82 status for a given route

Operation logging:

- `/api/route-operations/log`
  - Read/write API for Phase 72/82 operations

- `route-operation-logger.ts`
  - Writes operation entries (phase, status, category, decision, etc.)

- `route-organization-report.json`
  - Route metadata (category, priority, phase72/82 status) used by `/all-routes`

These endpoints and files are required for **AST graph–assisted analysis** and must not be removed by route consolidation or refactor scripts.

### 8.5 Layout Groups

The following layout groups should remain in place (or be updated carefully) because they frame the core routes:

- `(auth)` — wraps `/login`, `/register`, etc.
- `(legal)` / `(evidence)` / `(ai)` — wrap core case/evidence/AI pages.
- `(admin)` — wraps `/admin/*`.
- `(tools)` / `(dev)` — where `/all-routes` and other diagnostic tools live.

Renaming or deleting these layout groups can break navigation and Phase 72/78 tooling. Any layout change must be done with full awareness of the routes listed above.

---

## 9. Summary

**Phase 90 Protection Active:**
- ✅ Prosecutor MVP tables protected (separate schema)
- ✅ Phase 72/78 error brain tables protected
- ✅ Core routes documented and protected
- ✅ Migration safety rules established
- ✅ Rollback procedures documented

**Next Steps:**
1. Test prosecutor MVP routes
2. Verify Phase 72/78 endpoints
3. Run integration tests
4. Deploy with confidence

**Status:** 🛡️ **PROTECTED** 🛡️
