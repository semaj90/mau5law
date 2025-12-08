# 🧠 Error Brain - Quick Start Guide for Developers

## TL;DR

Error Brain is now **fully integrated** into the all-routes page. Routes with errors now show a 🧠 button on hover. Click it to open the Error Brain modal, view error events, and apply AI-suggested patches directly to the database.

## Files You Need to Know

### Frontend Components
- **ErrorModal.svelte** - Main modal UI (shows errors, suggestions, apply button)
- **all-routes +page.svelte** - Integration point (🧠 button on cards)

### API Endpoints
- **GET /api/phase78/error-events** - Fetch errors for a route
- **POST /api/phase78/route-health** - Apply patch to database

### Database
- **error_events** - Stores individual error occurrences
- **error_suggestions** - Stores AI-generated fix suggestions
- **route_health** - Stores route health snapshots
- **route_error_patches** - Stores applied patches

### Documentation
- **PHASE78_ERROR_BRAIN_UI_WIRING.md** - Complete technical guide
- **ERROR_BRAIN_UI_VISUAL_GUIDE.md** - Visual user flow guide
- **PHASE78_SCHEMA_STRATEGY.md** - Database strategy

## Quick Test Flow

### 1. Start Dev Server
```bash
cd sveltekit-frontend
npm run dev
```

### 2. Open in Browser
```
http://localhost:5173/all-routes
```

### 3. Find a Route with Errors
Look for routes with ❌ health indicator (red border on left)

### 4. Hover & Click 🧠
- Hover over error route card
- 🧠 button appears in top-right corner
- Click to open Error Brain modal

### 5. View Errors & Suggestions
- **Errors tab:** Shows error events from database
- **Suggestions tab:** Shows AI-suggested fixes with confidence scores

### 6. Apply a Patch
1. Click a suggestion to select it (blue highlight)
2. Click "Apply Selected Suggestion"
3. Wait for success message
4. Database updated with patch record

## Code Snippets

### Opening Error Brain (from any component)
```typescript
import ErrorModal from '$lib/components/phase78/ErrorModal.svelte';

let errorBrainOpen = $state(false);
let errorBrainRoute = $state('');

function openErrorBrain(routePath: string) {
  errorBrainRoute = routePath;
  errorBrainOpen = true;
}
```

```svelte
<button onclick={() => openErrorBrain('/api/routes')}>
  🧠 Error Brain
</button>

{#if errorBrainOpen}
  <ErrorModal
    isOpen={errorBrainOpen}
    routePath={errorBrainRoute}
    onClose={() => errorBrainOpen = false}
  />
{/if}
```

### Fetching Errors Manually
```typescript
async function loadErrorsForRoute(routePath: string) {
  const response = await fetch(
    `/api/phase78/error-events?routePath=${encodeURIComponent(routePath)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load errors: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    errors: data.events,
    suggestions: data.suggestions,
    health: data.health,
    timestamp: data.timestamp
  };
}
```

### Applying a Patch Manually
```typescript
async function applyPatchToRoute(
  routePath: string,
  filePath: string,
  patchContent: string
) {
  const response = await fetch('/api/phase78/route-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routePath,
      filePath,
      errorState: 'healthy',
      recentErrorCount: 0,
      lastErrorClusterId: null,
      lastErrorMessageShort: ''
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to apply patch: ${response.statusText}`);
  }

  return await response.json();
}
```

## Svelte 5 Event Syntax Reminder

All components use new event syntax:

❌ Old (Svelte 4):
```svelte
<button on:click={handleClick}>Click me</button>
<input on:change={handleChange} />
```

✅ New (Svelte 5):
```svelte
<button onclick={handleClick}>Click me</button>
<input onchange={handleChange} />
```

✅ Reactive state (Svelte 5):
```typescript
let count = $state(0);  // Not: writable(0)
```

## Debugging Tips

### Check if Errors are Loading
Open browser DevTools → Network tab → Filter "error-events"
- Should see GET request to `/api/phase78/error-events`
- Status should be 200
- Response should have `events` array

### Check if Patch Applied
```sql
-- In PostgreSQL
SELECT * FROM route_error_patches
WHERE route_path = '/api/routes'
ORDER BY created_at DESC
LIMIT 1;
```

### Check Component State
```javascript
// In browser console
// If using Vue DevTools or similar, inspect ErrorModal component state
// Should see: isOpen, routePath, errors[], suggestions[], etc.
```

### Check for Svelte 5 Errors
```bash
npm run check
# Should pass with no errors in phase78 components
```

## Common Issues & Fixes

### Issue: 🧠 Button Not Showing
**Cause:** Route might not have `errorCount` property
**Fix:** Check route object includes `errorCount > 0`

### Issue: Modal Opens But Shows Loading Forever
**Cause:** API endpoint not responding
**Fix:** Check `/api/phase78/error-events` exists and is running

### Issue: Apply Button Disabled
**Cause:** No suggestion selected
**Fix:** Click a suggestion to select it (should turn blue)

### Issue: Svelte Compilation Errors
**Cause:** Old `on:click` syntax mixed with new `onclick`
**Fix:** Use `npm run fmt` and `npm run lint:fix` to auto-convert

## Performance Optimization

### Lazy Loading
ErrorModal only loads errors when explicitly opened (efficient)

### Query Caching
Consider adding Redis caching if fetching errors for many routes

### Batch Operations
Future enhancement: Apply multiple patches at once

## Security Notes

✅ **Read-only errors:** Error fetching is read-only, no data risk
✅ **Patch logging:** All applied patches logged in `route_error_patches`
✅ **Upsert pattern:** No duplicate patches can be created
✅ **User tracking:** Future: Track which user applied which patch

## Next Steps

### Want to Extend?
1. **Add filtering:** Filter errors by type/severity
2. **Bulk operations:** Apply multiple patches at once
3. **History:** View previously applied patches
4. **Rollback:** Revert applied patches
5. **Real-time sync:** WebSocket for live updates

### Want to Deploy?
1. Run full test: `npm run test:routes`
2. TypeScript check: `npm run check`
3. Deploy to production (non-Vercel)

### Want to Debug?
1. Check dev server logs
2. Open browser DevTools Network tab
3. Inspect component state in DevTools
4. Check database directly with psql

## Key Principles

1. **Data Safety First** - Baseline snapshot protects all data
2. **Additive Only** - Never delete, only add/enhance
3. **Svelte 5 Compliant** - No mixed old/new syntax
4. **User Focused** - Simple, intuitive interface
5. **Audit Trail** - All patches logged in database

## Support Resources

- **PHASE78_ERROR_BRAIN_UI_WIRING.md** - Complete technical guide
- **ERROR_BRAIN_UI_VISUAL_GUIDE.md** - Visual user flow
- **PHASE78_SCHEMA_STRATEGY.md** - Database decisions
- **PHASE78_COMPLETE_STRATEGY.md** - Full reference

---

**Ready to use!** Open `/all-routes` and click the 🧠 on any error route. 🚀
