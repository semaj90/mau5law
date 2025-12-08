# 🧠 Error Brain - Quick Reference Card

## Quick Start (60 seconds)

```bash
npm run dev                           # Start dev server
# Open: http://localhost:5173/all-routes
# Hover over error route card
# Click 🧠 button
# View errors & apply patches
```

## What It Does

| Action | Result |
|--------|--------|
| Hover error route card | 🧠 button appears |
| Click 🧠 button | Modal opens |
| View Errors tab | See error events |
| View Suggestions tab | See AI-generated fixes |
| Select suggestion | Highlights in blue |
| Click "Apply" | Patch saved to database |

## Files to Know

| File | Purpose |
|------|---------|
| `ErrorModal.svelte` | Main UI component |
| `+page.svelte` (all-routes) | Integration point |
| `/api/phase78/error-events` | GET errors from DB |
| `/api/phase78/route-health` | POST patches to DB |

## Documentation

| Doc | Use Case |
|-----|----------|
| `ERROR_BRAIN_QUICK_START.md` | Quick reference |
| `PHASE78_ERROR_BRAIN_UI_WIRING.md` | Technical details |
| `ERROR_BRAIN_UI_VISUAL_GUIDE.md` | Visual flows |
| `FINAL_SESSION_REPORT.md` | Complete report |

## Code Snippets

### Open Error Brain from Any Component
```typescript
import ErrorModal from '$lib/components/phase78/ErrorModal.svelte';

let errorBrainOpen = $state(false);
let errorBrainRoute = $state('');

function openErrorBrain(routePath: string) {
  errorBrainRoute = routePath;
  errorBrainOpen = true;
}
```

### Fetch Errors Manually
```typescript
const response = await fetch(
  `/api/phase78/error-events?routePath=${encodeURIComponent(routePath)}`
);
const { events, suggestions, health } = await response.json();
```

### Apply Patch Manually
```typescript
const response = await fetch('/api/phase78/route-health', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routePath: '/api/routes',
    filePath: 'src/routes/api/routes/+server.ts',
    errorState: 'healthy',
    recentErrorCount: 0,
    lastErrorClusterId: null,
    lastErrorMessageShort: ''
  })
});
```

## Debugging

### Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Look for `/api/phase78/error-events` (GET)
4. Look for `/api/phase78/route-health` (POST)

### Check Database
```sql
SELECT * FROM route_error_patches
ORDER BY created_at DESC LIMIT 5;

SELECT * FROM route_health
WHERE route_path = '/api/routes';
```

### Check Component State
```javascript
// In browser console, inspect ErrorModal component
// Should show: isOpen, routePath, errors[], suggestions[], etc.
```

## Svelte 5 Event Handlers

```svelte
<!-- ✅ NEW (Svelte 5) -->
<button onclick={handleClick}>Click</button>
<input onchange={handleChange} />
<div onkeydown={handleKeydown}>...</div>

<!-- ❌ OLD (Svelte 4) - DO NOT USE -->
<button on:click={handleClick}>Click</button>
<input on:change={handleChange} />
<div on:keydown={handleKeydown}>...</div>
```

## Reactive State (Svelte 5)

```typescript
// ✅ NEW (Svelte 5)
let count = $state(0);
let data = $state({ name: '', items: [] });

// ❌ OLD (Svelte 4) - DO NOT USE
import { writable } from 'svelte/store';
let count = writable(0);
```

## API Endpoints

### GET /api/phase78/error-events
```
Query: routePath (required), limit (max 500), offset
Returns: { routePath, events[], suggestions[], health, timestamp }
Status: ✅ Working
```

### POST /api/phase78/route-health
```
Body: { routePath, filePath, errorState, recentErrorCount, lastErrorClusterId, lastErrorMessageShort }
Returns: { success, data, message, timestamp }
Status: ✅ Working
```

## Database Tables

| Table | Purpose |
|-------|---------|
| error_events | Error occurrences |
| error_suggestions | AI-generated fixes |
| error_clusters | Grouped errors |
| route_health | Route status |
| route_error_patches | **Applied patches** |
| error_feedback | User feedback |
| error_logs | Log entries |
| error_timeline | Temporal tracking |

## Safety First

✅ **Baseline Snapshot:**
```bash
# Located at: legal_ai_db_phase78_baseline.dump (2.37 MB)
# To restore:
pg_restore -d legal_ai_db legal_ai_db_phase78_baseline.dump
```

✅ **Golden Rules:**
1. Never DELETE/DROP (additive-only)
2. Always CREATE/ADD new tables/columns
3. Log every patch in database
4. Use baseline for recovery

## Common Tasks

### Test Error Loading
1. Start dev server
2. Open `/all-routes`
3. DevTools Network tab
4. Click 🧠 button
5. Should see GET request to `/api/phase78/error-events`
6. Response should have errors array

### Test Patch Apply
1. In modal, select suggestion
2. Click "Apply Selected Suggestion"
3. Button shows "Applying patch..."
4. Wait for success message
5. Check DevTools Network for POST request
6. Verify in database: `SELECT * FROM route_error_patches LIMIT 1`

### Troubleshoot Modal Not Showing
1. Check if route has errorCount > 0
2. Check DevTools console for errors
3. Verify ErrorModal component imported
4. Check if errorBrainModalOpen state is true

### Troubleshoot Errors Not Loading
1. Check DevTools Network tab
2. Look for `/api/phase78/error-events` request
3. Should be status 200
4. Response should have `events` array
5. If 404: Check endpoint exists
6. If 500: Check database connection

## Performance Tips

- Modal only loads data when opened (lazy)
- Errors query uses indexed columns (fast)
- CSS animations GPU-accelerated (smooth)
- No memory leaks (proper cleanup)

## Browser Support

- Chrome 120+ ✅
- Firefox 121+ ✅
- Safari 17+ ✅
- Edge 120+ ✅

## Related Features

- Phase 72: Route mapping & AST analysis
- Phase 78: Error clustering & suggestions
- Error Brain: Visual error interface (THIS)
- Future: Patch history, rollback, real-time sync

## Support

Questions? Check these in order:
1. **ERROR_BRAIN_QUICK_START.md** - Most answers here
2. **FINAL_SESSION_REPORT.md** - Complete details
3. **PHASE78_ERROR_BRAIN_UI_WIRING.md** - Technical deep dive
4. **ERROR_BRAIN_UI_VISUAL_GUIDE.md** - Visual flows
5. Component code itself - Source of truth

## Version Info

- **Svelte:** 5.x (new syntax)
- **SvelteKit:** 2.x
- **TypeScript:** 5.x
- **Node:** 18+ required
- **PostgreSQL:** 15+ (with pgvector)

---

**Status:** ✅ Complete & Ready
**Last Updated:** January 7, 2025
**Next Action:** `npm run dev` then test on `/all-routes`
