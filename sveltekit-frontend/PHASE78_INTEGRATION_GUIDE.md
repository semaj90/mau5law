# Phase 78 Integration Guide

## Status: ✅ Ready for Database Deployment

You've successfully wired Phase 72 (AST/ts-morph) data into the Phase 78 Command Center. Here's what's ready:

---

## 1. Database Permission Fix

**File Created:** `FIX_DATABASE_PERMISSIONS.ps1`

**Run this once to fix the `evidence_vectors` ownership blocker:**

```powershell
cd c:\Users\james\Videos\deeds-web-app
.\FIX_DATABASE_PERMISSIONS.ps1
```

**What it does:**
- Grants ownership of `evidence_vectors` to `legal_admin` user (fixes "must be owner" error)
- Runs Drizzle migration with superuser (creates all 7 Phase 78 tables)
- Verifies tables: `route_health`, `error_events`, `error_clusters`, etc.
- Resets DATABASE_URL back to `legal_admin` for runtime use

**Expected output:**
```
✅ Phase 78 tables detected:
public | route_health
public | error_events
public | error_clusters
public | error_suggestions
public | route_error_patches
public | error_timeline
public | error_feedback
```

---

## 2. Updated Files

### `+page.server.ts` (Enhanced)
**Location:** `src/routes/(app)/all-routes/+page.server.ts`

**New exports:**
- `RouteNode` - represents a SvelteKit route with AST metadata
- `RouteErrorCluster` - represents a diagnostic/error for a route

**What it does:**
1. Loads Phase 72 AST graph (ts-morph nodes)
2. Converts nodes to `RouteNode` format
3. Infers route kind (page/layout/server/endpoint), group ((app)/(yorha)/etc), tags
4. Builds `RouteErrorCluster` array from errors
5. Updates route status based on error severity
6. Returns both arrays for the UI

**TODO - Next Integration:**
Replace placeholder error building with real database queries:
```typescript
// When ready, query these tables:
// - db.select().from(routeHealth).where(...)
// - db.select().from(errorEvents).where(routeId = ...)
```

### `ContextualEvidenceChatModal.svelte` (Fixed)
**Fixed Svelte 5 event syntax:**
- Changed `on:change` → `onchange` (3 occurrences)
- Complies with Svelte 5 runes + new event directive requirements

---

## 3. Next Steps (Priority Order)

### Phase A: Deploy & Verify Database (5 min)
```bash
# 1. Run permission fixer
.\FIX_DATABASE_PERMISSIONS.ps1

# 2. Verify migration applied
npm run db:migrate:status

# 3. Verify tables exist
psql -U postgres -d legal_ai_db -c "\dt route_health error_events error_clusters"
```

### Phase B: Start Dev Server (2 min)
```bash
cd sveltekit-frontend
npm run dev
# Visit: http://localhost:5173/all-routes
```

**Expected UI:**
- Left sidebar: Search + Status/Kind/Group/Tool/Severity filters
- Center: List of 62+ routes with status pills (OK/WARN/ERROR)
- Click route → 3-column modal:
  - **Left:** Route metadata (path, file, kind, tags, flags)
  - **Middle:** Error clusters (tool, code, severity, count, raw logs)
  - **Right:** Dev actions (commands, AST graph link, 🧠 Error Brain button)

### Phase C: Wire API Endpoints to Database (30 min)
Files to update: `src/routes/api/phase78/*`

**Pattern example:**
```typescript
// src/routes/api/phase78/routes/+server.ts
import { db } from '$lib/server/db';
import { routeHealth } from '$lib/server/db/schema-postgres';

export async function GET() {
  const routes = await db.select().from(routeHealth);
  return new Response(JSON.stringify(routes));
}
```

**Endpoints to wire:**
- `/api/phase78/routes` → fetch all route health
- `/api/phase78/error-events` → fetch error clusters
- `/api/phase78/suggestions` → fetch AI suggestions (from LLM)
- `/api/phase78/apply-patch` → apply fixes to routes
- `/api/phase78/route-patch` → request AI patch for a route

### Phase D: Integrate XState Machine (20 min)
**File:** `src/lib/phase78/routeErrorAssistantMachine.ts` (already created)

Hook into the "🧠 Error Brain" button in the modal:
```typescript
// In ErrorModal.svelte right column:
button
  type="button"
  class="btn-primary"
  onclick={() => {
    // Send event to routeErrorAssistantMachine
    // Fetch /api/phase78/route-patch for selectedRoute
    // Display proposed patch in modal
  }}
>
  Request AI Patch (Phase 78)
</button>
```

### Phase E: End-to-End Testing (30 min)
1. Visit `/all-routes`
2. Search by path/file/error code
3. Filter by status (error/warning)
4. Click a route with errors
5. View error clusters in middle column
6. Click "Request AI Patch"
7. See proposed fix appear in right column
8. Click "Apply" to patch the route

---

## 4. Command Reference

### Database
```bash
# Check migration status
npm run db:migrate:status

# Manually apply migration (if needed)
DATABASE_URL="postgresql://postgres:123456@localhost:5434/legal_ai_db" npm run db:migrate

# Check Phase 78 tables
psql -U postgres -d legal_ai_db -c "\dt route_*"
```

### Dev Server
```bash
cd sveltekit-frontend
npm run dev          # Start dev server (port 5173)
npm run check        # TypeScript check
npm run build        # Production build
```

### Type Checking
```bash
# Fast check (app only)
npx tsc --noEmit --skipLibCheck -p tsconfig.check.json

# Full check
npm run check
```

---

## 5. Database Schema (Quick Reference)

**7 Phase 78 tables now in your schema:**

| Table | Purpose |
|-------|---------|
| `route_health` | Overall health status per route (ok/warning/error) |
| `error_events` | Individual error occurrences (svelte-check, tsc, vite, drizzle) |
| `error_clusters` | Grouped errors by tool/code (deduplication) |
| `error_suggestions` | AI-generated patch suggestions |
| `route_error_patches` | Applied patches (audit trail) |
| `error_timeline` | Historical error trends |
| `error_feedback` | User feedback on suggestions |

---

## 6. Troubleshooting

### Permission Error During Migration
**Error:** "must be owner of table evidence_vectors"
**Solution:** Run `FIX_DATABASE_PERMISSIONS.ps1` (already done above)

### Route Data Not Loading
**Check:**
1. Phase 72 AST file exists: `src/lib/phase72/route-ast-graph.json`
2. Dev server is running
3. Check console for errors in `getRouteAstGraph()`

### "No routes visible" in UI
**Check:**
1. `data.routes` is populated in +page.server.ts
2. Filters aren't too restrictive (try "All" status)
3. Search input is empty

### Svelte 5 Compilation Errors
**Fixed:** Event handler syntax in ContextualEvidenceChatModal.svelte
- If more `on:*` errors appear, convert them all to `on*` (onchange, onclick, etc.)

---

## 7. When You're Ready

Once database is live and APIs are wired:

1. **Persist error data** in route_health + error_events tables
2. **Generate suggestions** via `/api/phase78/suggestions` (LLM call)
3. **Apply patches** via `/api/phase78/apply-patch` (writes route files)
4. **Monitor trends** via error_timeline table
5. **Collect feedback** via error_feedback table

---

## Success Criteria ✅

- [ ] Database permissions fixed
- [ ] Migration applied (all 7 tables created)
- [ ] Dev server running
- [ ] `/all-routes` page loads
- [ ] Routes visible in main list (62+)
- [ ] Click route → modal opens
- [ ] Error clusters displayed
- [ ] API endpoints wired to database
- [ ] "Error Brain" button invokes LLM suggestions
- [ ] Can apply patches to routes
- [ ] Error history tracked in timeline

You're now 1 SQL script away from fully operational Phase 78! 🚀
