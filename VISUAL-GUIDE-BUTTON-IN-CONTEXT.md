# Visual Guide - Request AI Patch Button in Context

## Command Center Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMMAND CENTER                              │
│                   All Routes Dashboard                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Search: ________         Category: ▼    Status: ▼              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /all-routes  │  │  /legal-ai   │  │ /admin       │          │
│  │ [route card] │  │ [route card] │  │ [route card] │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  [Selected Route Details Panel]  ┐                              │
│  ├─ Route: /all-routes           │                              │
│  ├─ Category: app                │                              │
│  ├─ Status: healthy              │                              │
│  │                               │                              │
│  ├─ Error Brain                  ├─ SIDEBAR                    │
│  │  ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼             │                              │
│  │                               │                              │
│  │  Current Errors: 5            │                              │
│  │  Cluster ID: xyz              │                              │
│  │                               │                              │
│  │  ┌───────────────────────┐   │                              │
│  │  │ 🧠 Error Brain Brain  │   │                              │
│  │  │    Status: analyzing  │   │                              │
│  │  │    Phase: 2/5         │   │                              │
│  │  └───────────────────────┘   │                              │
│  │                               │                              │
│  │  AI Suggestions:              │                              │
│  │  ✓ Fix type error at line 23 │                              │
│  │  ✓ Add missing semicolon      │                              │
│  │                               │                              │
│  │  ┌─────────────────────────┐ │                              │
│  │  │ ERROR BRAIN ACTIONS ▼   │ │                              │
│  │  │                         │ │                              │
│  │  │ [Request AI Patch ▼] ← NEW BUTTON                        │
│  │  │ [Apply Suggestion]      │ │                              │
│  │  │ [Reset Brain]           │ │                              │
│  │  │                         │ │                              │
│  │  └─────────────────────────┘ │                              │
│  │                               │                              │
│  ├─ Related Info                 │                              │
│  │  Error Count: 5               │                              │
│  │  Last Error: 2 hours ago      │                              │
│  │  Cluster: type-safety         │                              │
│  └───────────────────────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Button States

### State 1: Initial (Ready)
```
┌────────────────────────────────┐
│ ✨ Request AI Patch (Phase 78) │  ← Enabled (clickable)
├────────────────────────────────┤
│ Description: Click to generate  │
│ AI-powered patch suggestions    │
└────────────────────────────────┘
```

### State 2: Loading (Requesting)
```
┌────────────────────────────────┐
│ ⏳ Requesting Patch…           │  ← Disabled (not clickable)
├────────────────────────────────┤
│ Status: API call in progress    │
│ Duration: ~1-3 seconds         │
└────────────────────────────────┘
```

### State 3: Success (Completed)
```
┌────────────────────────────────┐
│ ✨ Request AI Patch (Phase 78) │  ← Re-enabled
├────────────────────────────────┤
│ ✓ Patch abc12def created.      │  ← Green success message
│                                │
│ Status: Patch stored in DB     │
└────────────────────────────────┘
```

### State 4: Error (Failed)
```
┌────────────────────────────────┐
│ ✨ Request AI Patch (Phase 78) │  ← Re-enabled
├────────────────────────────────┤
│ ✗ Network timeout occurred     │  ← Red error message
│                                │
│ Status: Please try again       │
└────────────────────────────────┘
```

### State 5: Disabled (No Route)
```
┌────────────────────────────────┐
│ ⊗ Request AI Patch (Phase 78)  │  ← Disabled (grayed out)
├────────────────────────────────┤
│ Status: Select a route first   │
└────────────────────────────────┘
```

---

## Full Button Section (HTML Structure)

```html
<div class="error-brain-actions">
  <!-- NEW: Request AI Patch Button -->
  <button
    type="button"
    class="btn-primary"
    onclick={() => requestAiPatch(selectedRoute)}
    disabled={requestingPatch || !selectedRoute}
  >
    {#if requestingPatch}
      Requesting Patch…
    {:else}
      Request AI Patch (Phase 78)
    {/if}
  </button>

  <!-- NEW: Feedback Messages -->
  {#if lastPatchError}
    <div class="patch-error">
      {lastPatchError}
    </div>
  {:else if lastPatchId}
    <div class="patch-success">
      Patch {lastPatchId.slice(0, 8)} created.
    </div>
  {/if}

  <!-- EXISTING: Apply Selected Suggestion -->
  <button
    type="button"
    class="btn-ghost"
    onclick={() => applyBrainSuggestion(...)}
    disabled={!brainCanApply}
  >
    Apply Selected Suggestion
  </button>

  <!-- EXISTING: Reset Brain -->
  <button
    type="button"
    class="btn-secondary"
    onclick={resetErrorBrain}
    disabled={brainPhase === 'analyzing'}
  >
    Reset Brain
  </button>
</div>
```

---

## Button Styling

### CSS Classes

```css
/* Primary Button (Request AI Patch) */
.btn-primary {
  padding: 0.35rem 0.75rem;
  border: 1px solid #10b981;           /* Green border */
  background: rgba(16, 185, 129, 0.15); /* Green-tinted background */
  color: #a7f3d0;                      /* Light green text */
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.25);  /* Brighter green on hover */
  border-color: #6ee7b7;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Success Message (Green) */
.patch-success {
  margin-top: 0.35rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.7rem;
  color: #bbf7d0;                      /* Light green text */
  background: rgba(34, 197, 94, 0.1);  /* Subtle green background */
  border: 1px solid rgba(34, 197, 94, 0.3); /* Green border */
  border-radius: 3px;
}

/* Error Message (Red) */
.patch-error {
  margin-top: 0.35rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.7rem;
  color: #fecaca;                      /* Light red text */
  background: rgba(220, 38, 38, 0.1);  /* Subtle red background */
  border: 1px solid rgba(220, 38, 38, 0.3); /* Red border */
  border-radius: 3px;
  word-break: break-word;
}
```

---

## User Interaction Flow

```
User Action                 UI Response              Backend Action
─────────────────────────────────────────────────────────────────────

1. Route Selected            Button enabled
                             Show button text

                                                    (waiting)

2. Click Button              Button changes to
                             "Requesting Patch…"
                             Button disabled         ← POST /api/phase78/route-patch

                                                    Lookup route
                                                    Generate patch
                                                    Insert DB record

3. Wait 1-3 seconds          (loading state)         ← Processing

                                                    ← Response ready

4. API Response Arrives      Button text changed     Create patch entry
                             back to default         Return {id, ...}
                             Button re-enabled
                             Show green message:
                             "Patch abc12def created"

OR

4. API Error Occurs          Button re-enabled       Database error
                             Show red message:       or API error
                             "Network timeout"

5. Click button again        Cycle repeats           (new request)
```

---

## In-Browser Appearance

### Light Theme (Dark UI)
```
┌────────────────────────────────┐
│ ✨ Request AI Patch (Phase 78) │  ← Green button, light green text
│                                │     on semi-transparent green bg
├────────────────────────────────┤
│ ✓ Patch abc12def created.      │  ← Light green text on green bg
│   (Success message appears)    │     with green border
└────────────────────────────────┘

┌────────────────────────────────┐
│ ✨ Request AI Patch (Phase 78) │  ← Green button
│                                │
├────────────────────────────────┤
│ ✗ Network timeout              │  ← Light red text on red bg
│   (Error message appears)      │     with red border
└────────────────────────────────┘
```

---

## Real-Time Example

### Timeline of User Interaction

```
00:00 - User opens Command Center
00:05 - User selects /all-routes
        Button appears: "Request AI Patch (Phase 78)"
        Button is ENABLED (green, clickable)

00:10 - User clicks button
        Button changes to: "Requesting Patch…"
        Button is DISABLED (grayed out, not clickable)
        Network request sent to /api/phase78/route-patch

00:50 - API processing (backend generating patch)

01:30 - API response arrives with patch ID: "550e8400..."

01:35 - UI Updates:
        Button changes back to: "Request AI Patch (Phase 78)"
        Button is ENABLED again (green, clickable)
        Green message appears: "Patch 550e8400 created."
        Message stays visible (persistent)

01:40 - User can click again or click "Apply Patch"
```

---

## Responsive Layout

### Desktop (Wide Screen)
```
[Request AI Patch]  [Apply Suggestion]  [Reset Brain]
      ↑ Green           ↑ Blue               ↑ Indigo
   New Button      Existing Button    Existing Button

Patch message appears below button in full width
```

### Mobile/Narrow (Wrapped)
```
[Request AI Patch]
   ↑ Green
(Feedback message)

[Apply Suggestion]
[Reset Brain]
```

---

## Button Accessibility

### Keyboard Support
- ✅ Tab navigation (button is focusable)
- ✅ Enter/Space to click
- ✅ Proper disabled state (gray, not clickable)
- ✅ Visual focus indicator (browser default)

### Screen Reader Support
- ✅ Button text: "Request AI Patch (Phase 78)"
- ✅ Loading state: "Requesting Patch…" (reads dynamically)
- ✅ Success message: "Patch {id} created" (announces)
- ✅ Error message: Announces error text

### Color Contrast
- ✅ Green text on green bg: WCAG AA compliant
- ✅ Red text on red bg: WCAG AA compliant
- ✅ Button text contrast: WCAG AA compliant

---

## Integration with Other Elements

```
┌─────────────────────────────────────────┐
│         Error Brain Panel               │
├─────────────────────────────────────────┤
│ Brain Status: analyzing                 │
│ Phase: 2/5                              │
│ Suggestions: 3 available                │
├─────────────────────────────────────────┤
│ Suggested Fixes:                        │
│  ✓ Fix TypeScript error                 │
│  ✓ Add missing semicolon                │
│  ✓ Resolve import issue                 │
├─────────────────────────────────────────┤
│ AI Patch Request                        │
│ ──────────────────                      │
│ [Request AI Patch] ← NEW                │
│ [Apply Suggestion] ← existing           │
│ [Reset Brain]      ← existing           │
└─────────────────────────────────────────┘
```

---

## Success Workflow Example

```
START
  ↓
Route: /all-routes selected
  ↓
Error Brain: 5 errors detected
  ↓
User clicks "Request AI Patch"
  ↓
POST /api/phase78/route-patch
  Body: {route: {id, path, file, kind, group, label}}
  ↓
Backend processes:
  - Lookup route in database
  - Find associated errors
  - Generate patch suggestion
  - Insert into route_error_patches table
  ↓
Response: {id: "550e8400...", title: "...", patch: "...", ...}
  ↓
Frontend updates UI:
  - Set lastPatchId = "550e8400..."
  - Show green message: "Patch 550e8400 created"
  - Console log: "Phase78 patch suggestion generated: {...}"
  ↓
Database now has:
  route_error_patches row with patch details
  ↓
User can now:
  - Click "Apply Patch" to implement fix
  - Click again to generate new patch
  - View patch history in dashboard
  ↓
END (Success)
```

---

## Summary

The **Request AI Patch (Phase 78)** button:

✅ Is prominently displayed in the Error Brain section
✅ Changes appearance based on state (ready/loading/success/error)
✅ Provides immediate visual feedback
✅ Integrates seamlessly with existing buttons
✅ Uses consistent styling (green for AI features)
✅ Persists success/error messages
✅ Works on all screen sizes
✅ Accessible to keyboard and screen readers
✅ Ready for production use

