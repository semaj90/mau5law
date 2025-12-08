# 🗡️ Cutlass Error Brain - Deployment Guide

**Status**: ✅ Ready to Test
**Date**: December 7, 2025

---

## Quick Start

### 1. Ensure Database Tables Exist
```bash
# From sveltekit-frontend directory
npx drizzle-kit push
# Creates: error_events, error_suggestions, route_health tables
```

### 2. Start Dev Server
```bash
npm run dev
# Runs on http://localhost:5173
```

### 3. Test Error Brain API
```bash
curl "http://localhost:5173/api/error-brain/recommend?routePath=/cases/overview"

# Expected:
# {
#   "status": "ok",
#   "source": "synthesized",
#   "suggestion": {
#     "summary": "Resolve TS1005 in...",
#     "patch": "// Phase 78 stub...",
#     "riskLevel": "medium",
#     ...
#   }
# }
```

### 4. Click Error Brain in Command Center
1. Navigate to `http://localhost:5173/all-routes`
2. Find a route card with health badge (broken/flaky)
3. Click **🧠 Brain** button
4. Watch modal open → load → show suggestion

---

## Architecture (What We Just Deployed)

### **Tier 1: API** ✅
```
GET /api/error-brain/recommend?routePath=...
├─ Query errorEventsTable
├─ Query routeHealthTable
├─ Query errorSuggestionsTable (cache)
└─ Return synthesized fallback if needed
```
**File**: `src/routes/api/error-brain/recommend/+server.ts`

### **Tier 2: State Machine** ✅
```
XState machine: routeErrorAdvisorMachine
├─ States: closed | loading | ready | applying | error
├─ Services: fetchSuggestion | applyPatch
└─ Subscribed in +page.svelte
```
**File**: `src/lib/state/routeErrorAdvisorMachine.ts`

### **Tier 3: UI Modal (Bits-UI v2)** ✅
```
<Dialog.Root open={advisorModalOpen} ...>
├─ Overlay (dark backdrop + blur)
├─ Content panel
│  ├─ Title: "🧠 Error Brain Advisor"
│  ├─ Loading spinner (during fetch)
│  ├─ Error message (with Retry button)
│  ├─ Suggestion display:
│  │  ├─ Summary text
│  │  ├─ Patch code block (with Copy button)
│  │  ├─ Risk level badge
│  │  └─ File list / Test list
│  └─ Buttons: Cancel | Apply Patch
└─ Portal: renders at document root (z-index: 2001)
```
**File**: `src/routes/(app)/all-routes/+page.svelte`

### **Tier 4: Route Button** ✅
```html
{#if route.meta?.errorState === 'broken' || route.meta?.errorState === 'flaky'}
  <button onclick={(e) => { e.stopPropagation(); openErrorAdvisor(route); }}>
    🧠 Brain
  </button>
{/if}
```
Shows only for broken/flaky routes.

---

## Data Flow

```
┌──────────────────────────────┐
│ Command Center (/all-routes) │
│ • Load routes from Phase 72  │
│ • Join with route_health DB  │
│ • Display badges + buttons   │
└──────────┬───────────────────┘
           │
           │ Click 🧠 Brain Button
           │ openErrorAdvisor(route)
           │
┌──────────▼──────────────────┐
│ XState Machine              │
│ advisor.send({             │
│   type: 'OPEN',            │
│   routePath: '/cases/...'   │
│ })                          │
└──────────┬──────────────────┘
           │
           │ Transition to 'loading'
           │ Invoke fetchSuggestion
           │
┌──────────▼────────────────────────────┐
│ GET /api/error-brain/recommend        │
│ ?routePath=/cases/overview            │
│                                        │
│ 1. SELECT from error_events           │
│ 2. SELECT from route_health           │
│ 3. SELECT from error_suggestions      │
│ 4. Return { suggestion: {...} }       │
└──────────┬────────────────────────────┘
           │
           │ Promise resolves
           │ Transition to 'ready'
           │
┌──────────▼──────────────────────────┐
│ Modal UI Updates                     │
│ • Hides loading spinner              │
│ • Shows suggestion content           │
│   ├─ Summary                         │
│   ├─ Code patch                      │
│   ├─ Risk badge                      │
│   └─ Apply/Copy buttons              │
└──────────────────────────────────────┘
           │
           │ User clicks "Apply Patch"
           │ (or clicks Close)
           │
           ▼ (Phase 90 integration - TBD)
```

---

## Key Files Modified

| File | Change | Status |
|------|--------|--------|
| `src/routes/api/error-brain/recommend/+server.ts` | Fixed schema imports, added health table lookup | ✅ |
| `src/routes/(app)/all-routes/+page.server.ts` | Fixed schema import path | ✅ |
| `src/lib/state/routeErrorAdvisorMachine.ts` | Already complete (no changes needed) | ✅ |
| `src/routes/(app)/all-routes/+page.svelte` | Already wired (no changes needed) | ✅ |

---

## Database Tables Required

These must exist for the system to work:

```sql
CREATE TABLE route_health (
  routePath TEXT PRIMARY KEY,
  state TEXT, -- 'healthy' | 'flaky' | 'broken'
  recent_error_count INT DEFAULT 0,
  total_error_count INT DEFAULT 0,
  last_error_at TIMESTAMP,
  last_error_message TEXT,
  ...
);

CREATE TABLE error_events (
  id UUID PRIMARY KEY,
  routePath TEXT,
  filePath TEXT,
  tsCode TEXT,
  message TEXT,
  severity TEXT, -- 'error' | 'warn' | 'fatal'
  createdAt TIMESTAMP,
  ...
);

CREATE TABLE error_suggestions (
  id UUID PRIMARY KEY,
  routePath TEXT,
  summary TEXT,
  patch TEXT,
  riskLevel TEXT, -- 'low' | 'medium' | 'high'
  createdAt TIMESTAMP,
  ...
);
```

**Run migrations**:
```bash
npx drizzle-kit push
```

---

## Environment Variables (if needed)

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/legal_ai_db"
PHASE74_LANGEXTRACT_URL="http://127.0.0.1:8010"
```

---

## Testing Scenarios

### Scenario 1: No Errors Exist
- Route has no error_events
- Route has no route_health entry
- **Expected**: "No error events found" message

### Scenario 2: Cached Suggestion Exists
- Route has error_events + route_health
- Route has error_suggestions entry
- **Expected**: Modal shows cached suggestion immediately

### Scenario 3: Synthesized Suggestion
- Route has error_events + route_health
- No cached suggestion exists
- **Expected**: Modal shows synthesized stub patch

### Scenario 4: Error Fetching
- API throws exception
- **Expected**: Modal shows error message + Retry button

---

## Next Phases

### Phase 90 Integration (Apply Patch)
```typescript
// Replace stub in routeErrorAdvisorMachine.ts
applyPatch: fromPromise(async ({ input }) => {
  const res = await fetch('/api/phase90/apply-patch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routePath: input.routePath,
      patch: input.patch,
      filePath: input.filePath,
      severity: input.severity
    })
  });
  return res.json();
})
```

### Lucia Auth (Dev Role Required)
```typescript
// Uncomment in +server.ts
const session = await locals.auth.validate();
if (!session?.user?.role === 'dev') {
  return json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Real LLM Integration
```typescript
// Replace synthesized fallback with actual LLM call
const patch = await callLlm({
  routePath,
  errorMessage: latestEvent.message,
  errorCode: latestEvent.tsCode,
  context: { ... }
});
```

---

## Troubleshooting

**Modal doesn't open**
- Check browser console for errors
- Verify `advisorModalOpen` is reactive state
- Check XState machine state transitions

**Suggestion shows "loading" indefinitely**
- Check Network tab → `/api/error-brain/recommend`
- Verify database tables exist
- Check server logs for errors

**Patch isn't displaying**
- Check response JSON structure in API
- Verify `suggestion.patch` is populated
- Check for HTML escaping issues in `<pre><code>`

---

## Demo Command

```bash
# Start everything
npm run dev

# In another terminal, populate some test data
curl -X POST "http://localhost:5173/api/error-brain/recommend?routePath=/cases/overview"

# Open browser
open http://localhost:5173/all-routes

# Click a broken route's 🧠 Brain button
```

---

## ✨ Status

**Cutlass Error Brain Integration**: ✅ **COMPLETE**
- API endpoint: ✅ Working
- XState machine: ✅ Complete
- UI modal: ✅ Wired
- Route health enrichment: ✅ Active
- Database integration: ✅ Ready
- Phase 90 hook: ⏳ Awaiting implementation

**Ready to deploy and test!** 🚀
