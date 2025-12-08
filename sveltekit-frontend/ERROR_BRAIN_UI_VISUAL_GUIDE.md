# 🧠 Error Brain UI - Visual Guide

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 🕹️ Route Command Center                                     │
│ Phase 72 AST · Phase 78 Error Brain · All Routes Consolidated │
└─────────────────────────────────────────────────────────────┘

[Search box]

┌──────────────────────────────────────────────────────────────────┐
│ ROUTE GRID                                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ Route Card          │  │ Route Card          │  ...          │
│  │ ───────────────     │  │ ───────────────     │               │
│  │ 🧠  (hover only)    │  │ 🧠  (hover only)    │               │
│  │ ─────────────────   │  │ ─────────────────   │               │
│  │ API                 │  │ Database            │               │
│  │ GET /api/routes     │  │ SELECT * FROM...    │               │
│  │                     │  │                     │               │
│  │ ❌ 5 errors         │  │ ✅ Healthy          │               │
│  └─────────────────────┘  └─────────────────────┘               │
│      ↑                          ↑                               │
│      │ HOVER               NO BUTTON                            │
│      │                      (no errors)                         │
│      └─ Shows 🧠 button                                        │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘

CLICK 🧠 BUTTON ↓

┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Error Brain - /api/routes                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                         Close ✕  │
│                                                                  │
│ /api/routes                                                     │
│ ⚠️ FLAKY (5 errors)                                             │
│                                                                  │
│ ┌─────────────────────┐  ┌──────────────────────┐              │
│ │ Errors (5)          │  │ Suggestions (3)      │  ← TABS     │
│ └─────────────────────┘  └──────────────────────┘              │
│                                                                  │
│ SUGGESTIONS TAB ACTIVE:                                        │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ✓ Fixed import type mismatch                             │   │
│ │   Import should be 'import type' not just 'import'      │   │
│ │   🟢 92% confidence                                      │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │   Missing onmount hook initialization                   │   │
│ │   Add: onMount(() => { ... })                           │   │
│ │   🟢 85% confidence                                      │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │   Convert reactive store to Svelte 5 $state             │   │
│ │   Old: let x = writable(0)                              │   │
│ │   New: let x = $state(0)                                │   │
│ │   🟢 78% confidence                                      │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ [Apply Selected Suggestion]                             │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│ Footer: [Close]  [Open Route]                                   │
└─────────────────────────────────────────────────────────────────┘

CLICK "APPLY SELECTED SUGGESTION" ↓

┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Error Brain - /api/routes                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ✓ SUGGESTION APPLIED!                                          │
│                                                                  │
│ Route health recorded in database:                             │
│ • route_health table updated                                   │
│ • route_error_patches record created                           │
│ • Patch status: applied                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Interactive States

### Route Card States

#### ❌ Route with Errors (5 errors)
```
┌────────────────────┐
│ 🧠    ← Button appears │ HOVER
│ ┌──────────────────┤ STATE
│ │ API              │
│ │ GET /api/routes  │
│ │ ❌ 5 errors      │
│ └──────────────────┘
```

#### ✅ Healthy Route (0 errors)
```
┌────────────────────┐
│        ← No button   │ HOVER
│ ┌──────────────────┤ STATE
│ │ Database         │
│ │ SELECT * FROM... │
│ │ ✅ Healthy       │
│ └──────────────────┘
```

### Modal States

#### Loading
```
┌─────────────────────────────────────┐
│ 🧠 /api/routes                      │
├─────────────────────────────────────┤
│ Errors | Suggestions (LOADING)      │
│                                     │
│ ⏳ Loading error data...            │
│                                     │
└─────────────────────────────────────┘
```

#### Error on Load
```
┌─────────────────────────────────────┐
│ 🧠 /api/routes                      │
├─────────────────────────────────────┤
│ Errors | Suggestions                │
│                                     │
│ ⚠️ Error: Failed to fetch errors     │
│                                     │
└─────────────────────────────────────┘
```

#### Suggestions Loaded
```
┌─────────────────────────────────────┐
│ 🧠 /api/routes                      │
├─────────────────────────────────────┤
│ Errors | Suggestions ✓              │
│                                     │
│ ☐ Suggestion 1 (92% confidence)    │
│ ☑ Suggestion 2 (85% confidence)    │ ← SELECTED (blue bg)
│ ☐ Suggestion 3 (78% confidence)    │
│                                     │
│ [Apply Selected Suggestion]         │
│                                     │
└─────────────────────────────────────┘
```

#### Applying Patch
```
┌─────────────────────────────────────┐
│ 🧠 /api/routes                      │
├─────────────────────────────────────┤
│ Errors | Suggestions                │
│                                     │
│ ✓ Applying patch...                │
│   (Button disabled)                 │
│                                     │
└─────────────────────────────────────┘
```

#### Success
```
┌─────────────────────────────────────┐
│ 🧠 /api/routes                      │
├─────────────────────────────────────┤
│ Errors | Suggestions                │
│                                     │
│ ✅ Patch applied successfully!      │
│                                     │
│ [Close]                             │
│                                     │
└─────────────────────────────────────┘
```

## Data Flow

```
USER ACTION              COMPONENT              API              DATABASE
───────────────────────────────────────────────────────────────────────────

1. Hover card
   ↓
   🧠 button appears (CSS opacity 0→1)

2. Click 🧠
   ↓
   ErrorModal.svelte opens
   ↓
   loadData() called
   ↓
   fetch GET /api/phase78/error-events?routePath=/api/routes
   ↓                                                    ↓
   ↓                              errorEventsTable
   ↓                              errorSuggestionsTable
   ↓                              routeHealthTable ← SQL SELECT
   ↓                                                    ↓
   ← JSON response with errors[], suggestions[], health
   ↓
   Update $state (errors, suggestions, health)
   ↓
   Render suggestion pills

3. Click suggestion pill
   ↓
   Update selectedSuggestionId = suggestion.id
   ↓
   Render selected suggestion details

4. Click "Apply Selected Suggestion"
   ↓
   isApplying = true (show loading state)
   ↓
   fetch POST /api/phase78/route-health with suggestion data
   ↓                                                    ↓
   ↓                              INSERT INTO route_health
   ↓                              INSERT INTO route_error_patches
   ↓                                                    ↓
   ← JSON response { success: true, ... }
   ↓
   Update UI with success message
   ↓
   Database now has patch record and updated health status
```

## Component Hierarchy

```
<AllRoutesPage>
  │
  ├─ <RouteGrid>
  │  │
  │  ├─ <RouteCard> (multiple)
  │  │  │
  │  │  └─ 🧠 Button (overlay)
  │  │     └─ onclick: openErrorBrainModal(route)
  │  │
  │  └─ [Modal Dialog - existing route detail]
  │
  └─ <ErrorModal> ← NEW COMPONENT (mounted conditionally)
     │
     ├─ Header (route path + health status)
     │
     ├─ Tabs
     │  ├─ Errors Tab → <ErrorEventsList>
     │  └─ Suggestions Tab → <SuggestionsList>
     │
     ├─ Content Area
     │  ├─ Loading state
     │  ├─ Error message
     │  └─ Suggestion selection & details
     │
     └─ Footer
        ├─ Close button
        └─ Apply button
```

## CSS Animation Timeline

```
HOVER STATE
───────────

Before hover: .card-overlay-btn { opacity: 0; pointer-events: none; }
              (button exists in DOM but invisible)

On hover:     transition opacity 0.15s ease
              opacity: 0 → 1
              pointer-events: none → auto

Button hover: transform scale(1, 1) → scale(1.1)
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0)
                       → 0 2px 8px rgba(59, 130, 246, 0.4)
```

## Testing Scenarios

### ✅ Happy Path
1. Route has 5 errors
2. Hover card → 🧠 appears
3. Click 🧠 → Modal opens
4. Errors load successfully
5. View suggestions tab
6. Select first suggestion
7. Click "Apply" → Success ✅

### ⚠️ Network Error
1. Click 🧠 → Modal opens
2. loadData() fails (404, 500, etc.)
3. Error message displayed
4. User can close modal and try again

### 🔄 Retry Scenario
1. Modal open, loading error shown
2. User manually retries (close and reopen)
3. Network succeeds on retry
4. Errors and suggestions load ✅

### 📝 No Suggestions
1. Modal loads successfully
2. Suggestions tab shows: "No suggestions available yet"
3. User still sees error events in Errors tab

## Browser DevTools Inspection

### Network Tab
```
GET /api/phase78/error-events?routePath=/api/routes&limit=500
  Status: 200
  Response: { routePath, events, suggestions, health, timestamp }

POST /api/phase78/route-health
  Status: 200
  Response: { success: true, data, message, timestamp }
```

### Console Output
```
✅ Error Brain: Loaded 5 error events for /api/routes
✅ Error Brain: Found 3 suggestions from clustering
✅ Error Brain: Applied patch to route_health table
```

### State Inspector (Vue DevTools style)
```
ErrorModal:
  - isOpen: true
  - routePath: "/api/routes"
  - tab: "suggestions"
  - isLoading: false
  - loadError: null
  - errors: Array(5)
  - suggestions: Array(3)
  - health: { errorState: "flaky", recentErrorCount: 5 }
  - selectedSuggestionId: "uuid-123-456"
  - isApplying: false
```

---

## Summary

The Error Brain UI provides an intuitive way to:
1. **Discover** errors in specific routes
2. **Understand** suggested fixes with confidence scores
3. **Apply** patches directly to the database
4. **Track** which patches have been applied

All backed by Phase 78 database with additive-only schema design and baseline snapshot protection.

**Ready to test!** 🚀
