# Error Brain "Request AI Patch" Button - Testing Guide

## Quick Test Checklist

### Pre-Test Setup
- [ ] Dev server running on `http://localhost:5173`
- [ ] Phase 78 database schema verified
- [ ] API endpoint `/api/phase78/route-patch` accessible
- [ ] All Svelte 5 syntax corrections applied

### Test Steps

1. **Navigate to Command Center**
   ```
   URL: http://localhost:5173/(app)/all-routes
   Expected: Page loads with route cards
   ```

2. **Select a Route**
   - Click any route card from the grid
   - Expected: Route details panel opens on right side

3. **Locate Error Brain Section**
   - Scroll down in the route details panel
   - Expected: See "Error Brain" section with buttons

4. **Click "Request AI Patch (Phase 78)"**
   - Click the button (green/primary color)
   - Expected: Button changes to "Requesting Patch…" and disables

5. **Monitor Response**
   - **Success Path:**
     - Green message: "Patch abc12def created."
     - Button re-enables
     - No console errors

   - **Error Path:**
     - Red message: Shows error text
     - Button re-enables
     - Console shows error stack

### Verification Points

#### Button State Machine
```
Initial:      "Request AI Patch (Phase 78)" [enabled]
Clicking:     "Requesting Patch…" [disabled]
Success:      "Request AI Patch (Phase 78)" [enabled] + green success box
Failure:      "Request AI Patch (Phase 78)" [enabled] + red error box
No Route:     "Request AI Patch (Phase 78)" [disabled always]
```

#### Console Output (F12 → Console Tab)
- Success: `Phase78 patch suggestion generated: {id, title, patch, ...}`
- Failure: `Request AI patch failed: <error message>`

#### API Call
- Method: `POST`
- URL: `http://localhost:5173/api/phase78/route-patch`
- Headers: `Content-Type: application/json`
- Body: `{route: {id, path, file, kind, group, label}}`
- Expected Response: `{id, title, patch, explanation, confidence, hints}`

#### Database Impact
After successful request, check:
```sql
-- PostgreSQL
SELECT * FROM route_error_patches
WHERE route_id = '<selected-route-href>'
ORDER BY created_at DESC
LIMIT 1;
```
Expected: New row created with patch details

### Common Issues & Fixes

#### Issue: Button shows error "Cannot POST /api/phase78/route-patch"
- **Cause:** Endpoint file missing or route not defined
- **Fix:** Verify `src/routes/api/phase78/route-patch/+server.ts` exists
- **Check:** `grep -r "route-patch" src/routes/api/`

#### Issue: Button disabled even with route selected
- **Cause:** `selectedRoute` not properly set or `requestingPatch` stuck true
- **Fix:** Open browser console, check:
  ```javascript
  // In console
  console.log(selectedRoute)
  console.log(requestingPatch)
  ```

#### Issue: Red error box shows "Network error"
- **Cause:** API endpoint crashed or not accessible
- **Fix:** Check server console for errors:
  ```bash
  # In another terminal
  npm run dev:debug
  ```

#### Issue: Success but patch ID not showing
- **Cause:** API response missing `id` field
- **Fix:** Check endpoint response in Network tab (F12)
  - Should see `{id: "xyz...", ...}`

### Performance Baseline

| Metric | Expected | Warning | Critical |
|--------|----------|---------|----------|
| Button Response | < 100ms | > 200ms | > 500ms |
| API Response | < 2s | > 5s | > 10s |
| DB Insert | < 500ms | > 1s | > 2s |
| Total Flow | < 3s | > 5s | > 10s |

### Success Indicators

✅ **All Green When:**
1. Button shows "Requesting Patch…" while loading
2. Success message appears after 1-3 seconds
3. Patch ID displays (e.g., "Patch abc12def created")
4. Button re-enables after response
5. No red error boxes appear
6. Console shows patch generation log
7. Database record created in `route_error_patches`

---

## Integration Points Summary

| Component | Location | Status | Role |
|-----------|----------|--------|------|
| Button | all-routes/+page.svelte:655 | ✅ Implemented | User interaction |
| Function | all-routes/+page.svelte:67 | ✅ Implemented | Handles click + API call |
| Endpoint | /api/phase78/route-patch | ✅ Verified | Generates patch suggestion |
| Schema | schema-phase78.ts | ✅ Verified | Stores patch records |
| UI Feedback | all-routes/+page.svelte:669 | ✅ Implemented | Shows success/error |
| CSS | all-routes/+page.svelte:1498 | ✅ Added | Styles patch messages |

---

## For LLM Integration (Future)

Replace this in `route-patch/+server.ts`:
```typescript
// Current (placeholder)
const suggestion = {
  title: "Fix TypeScript error",
  patch: "// TODO: Insert patch",
  // ...
};

// Future (with Gemma3)
const suggestion = await generatePatchWithLLM(route, errorEvents);
```

