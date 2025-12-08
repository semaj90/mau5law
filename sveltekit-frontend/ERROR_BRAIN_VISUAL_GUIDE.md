# Error Brain Modal - Visual & Interaction Guide

## 🎨 Modal Appearance

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  🧠 Error Brain Advisor                            [×]  │  ← Header with title & close button
├─────────────────────────────────────────────────────────┤
│  Route: /cases/[id]/overview                            │  ← Current route path
├─────────────────────────────────────────────────────────┤
│  Recent errors                                          │  ← Error events list (if any)
│  ┌─────────────────────────────────────────────────────┐│
│  │ TS1005 2025-12-07T18:11:59Z                         ││
│  │ ';' expected.                                        ││
│  │ src/routes/cases/[id]/overview/+page.svelte         ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  Suggestion summary                                     │  ← Patch explanation
│  Missing error boundary in form component. Add try-    │
│  catch handler around form submission.                 │
├─────────────────────────────────────────────────────────┤
│  Patch                                                  │  ← Code block
│  ┌─────────────────────────────────────────────────────┐│
│  │ const { form } = $props();                          ││
│  │ + const errors = form?.errors || [];                ││
│  │ + if (errors.length) console.error(errors);         ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  Risk: low    Source: pattern                          │  ← Badges
├─────────────────────────────────────────────────────────┤
│                                  [Close]  [Apply patch] │  ← Footer buttons
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 State Transitions

### User Interaction Flow

```
Route Card Visible
    ↓
[Shows error badge: ❌ or ⚠️]
    ↓
User clicks [🧠 Brain] button
    ↓ (XState OPEN event sent)
    ↓
Modal Opens (advisorModalOpen = true)
    ↓ (Machine: closed → loading)
    ↓
Spinner: "Analyzing Phase 78 error clusters…"
    ↓ (API call to /api/error-brain/recommend)
    ↓
User sees one of three states:
    ├─→ [SUCCESS] Modal shows suggestion
    │   ├─→ User clicks [Apply patch] → Phase 90 integration
    │   └─→ User clicks [Close] → Modal closes
    │
    ├─→ [ERROR] Error message with [Retry] button
    │   ├─→ User clicks [Retry] → Attempt again
    │   └─→ User clicks [Close] → Modal closes
    │
    └─→ [NO DATA] "No suggestion available"
        └─→ User clicks [Close] → Modal closes
```

---

## 🎯 Interactive Elements

### Brain Button Behavior

**Inactive (Healthy Routes)**
```
Status: ✅ healthy
Button: —  (muted dash, no click)
Color:  Gray text
Action: None
```

**Active (Broken/Flaky Routes)**
```
Status: ❌ broken OR ⚠️ flaky
Button: [🧠 Brain]  (clickable)
Color:  Blue border + light blue background
Action: Click → Open modal
```

### Modal Buttons

**Close Button (Always visible)**
```
┌──────────┐
│  Close   │
└──────────┘
Style: Gray border, white background
Action: Close modal, send CLOSE event to machine
```

**Apply Patch Button (Only if suggestion exists)**
```
┌─────────────────┐
│  Apply patch    │ (shows only when suggestion exists)
│  (shielded)     │
└─────────────────┘
Style: Blue border + blue background, white text
Action: Send APPLY_PATCH event, trigger Phase 90
Status: Disabled until Phase 90 integration complete
```

---

## 🔴 Error States

### Loading State
```
┌─────────────────────────────────────────────┐
│ 🧠 Error Brain Advisor                  [×] │
├─────────────────────────────────────────────┤
│ Route: /cases/[id]/overview                 │
├─────────────────────────────────────────────┤
│                                             │
│ Analyzing Phase 78 error clusters…        │  ← Spinner text
│ Connecting to LangExtract & DB…           │  ← Subtext
│                                             │
└─────────────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────────────┐
│ 🧠 Error Brain Advisor                  [×] │
├─────────────────────────────────────────────┤
│ Route: /cases/[id]/overview                 │
├─────────────────────────────────────────────┤
│                                             │
│ ⚠️ Error fetching suggestion               │  ← Error box
│ Failed to connect to database               │
│                                             │
│ [Retry]                                     │  ← Retry button
│                                             │
└─────────────────────────────────────────────┘
```

### Success State
```
┌─────────────────────────────────────────────┐
│ 🧠 Error Brain Advisor                  [×] │
├─────────────────────────────────────────────┤
│ Route: /cases/[id]/overview                 │
├─────────────────────────────────────────────┤
│ Recent errors                               │
│ ✗ TS1005 - missing semicolon                │
│ ✗ TS2322 - type mismatch                    │
├─────────────────────────────────────────────┤
│ Suggestion summary                          │
│ Add error boundary to form component        │
├─────────────────────────────────────────────┤
│ Patch                                       │
│ ┌────────────────────────────────────────┐ │
│ │ const errors = form?.errors || [];     │ │
│ │ + if (errors) { ... }                  │ │
│ └────────────────────────────────────────┘ │
│                                             │
│ Risk: low    Source: pattern                │
├─────────────────────────────────────────────┤
│                      [Close]  [Apply patch] │
└─────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Status Indicators
```
✅ Healthy routes    → Green emoji, no brain button
⚠️ Flaky routes      → Yellow emoji, brain button visible
❌ Broken routes     → Red emoji, brain button visible
```

### Badge Colors

| Badge | Background | Text | When |
|-------|-----------|------|------|
| Risk: low | Yellow (#fef3c7) | Dark brown | Low-risk patch |
| Risk: medium | Orange | Dark orange | Moderate risk |
| Risk: high | Red (#fef2f2) | Dark red | High-risk patch |
| Source: pattern | Light blue (#dbeafe) | Blue | Pattern-matched |
| Source: AI | Light blue (#dbeafe) | Blue | AI-generated |
| Source: manual | Gray (#f3f4f6) | Gray | Manual fix |

### Modal Colors
```
Header:        #1d4ed8 (blue) text on white
Overlay:       rgba(0,0,0,0.7) with blur
Background:    #fff (white)
Border:        #111 (dark)
Error box:     #fef2f2 (light red) with #fecaca border
Success text:  #333 (dark gray)
Code block:    #111827 (dark gray bg) with #e5e7eb (light gray text)
```

---

## 📱 Responsive Behavior

### Desktop (1200px+)
```
Modal width: 600px
Position: Centered
Max height: 90vh (scrollable)
Buttons: Side by side
```

### Tablet (768px - 1199px)
```
Modal width: 95vw (almost full width)
Position: Centered
Max height: 90vh
Buttons: Stack if needed
```

### Mobile (< 768px)
```
Modal width: 95vw (full screen minus padding)
Position: Centered, but lower on screen
Max height: 80vh
Buttons: Full width, stacked
Code blocks: Scrollable horizontally
```

---

## 🔊 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Esc` | Close modal (if supported) |
| `Tab` | Focus next button |
| `Shift+Tab` | Focus previous button |
| `Enter` | Activate focused button |
| `Space` | Activate focused button (if button) |

---

## ♿ Accessibility Features

- ARIA labels on buttons
- Semantic HTML structure
- High contrast text/background
- Keyboard navigable
- Screen reader friendly
- Focus visible on interactive elements

---

## 🧪 Testing Checklist

### Visual Test
- [ ] Modal appears centered on screen
- [ ] All text is readable (no overflow)
- [ ] Colors match spec
- [ ] Badges display with correct styling
- [ ] Code block has proper monospace font

### Interaction Test
- [ ] Brain button click opens modal
- [ ] Modal closes when clicking [Close]
- [ ] Modal closes when clicking X
- [ ] Modal closes when clicking outside (if configured)
- [ ] Error state shows retry button
- [ ] Success state shows patch code
- [ ] Loading spinner visible during fetch

### Data Display Test
- [ ] Route path displays correctly
- [ ] Error events list shows all events
- [ ] Suggestion text readable
- [ ] Patch code formatted properly
- [ ] Risk level badge accurate
- [ ] Source badge accurate

### Mobile Test
- [ ] Modal fits on mobile screen
- [ ] Text wraps properly
- [ ] Buttons are touch-friendly (>44px)
- [ ] Scrolling works for long content
- [ ] Code blocks scroll horizontally

---

## 🐛 Debug Tips

### Console Debugging
```javascript
// Check machine state
console.log(advisorState.value);      // 'closed', 'loading', 'ready', 'error'
console.log(advisorState.context);    // { suggestion, events, errorMessage }

// Send events manually
advisor.send({ type: 'OPEN', routePath: '/cases/[id]/overview' });
advisor.send({ type: 'CLOSE' });
advisor.send({ type: 'RETRY' });
```

### Visual Debugging
```css
/* Add borders to debug modal layout */
.eb-content { border: 2px solid red !important; }
.eb-section { border: 1px solid blue !important; }
.card-main { border: 1px dashed green !important; }
```

### Network Debugging
```javascript
// Check API response
// Open DevTools → Network tab
// Click Brain button
// Look for request to /api/error-brain/recommend
// Check response for suggestion + events
```

---

## 📊 Expected Data Format

### Suggestion Object
```typescript
{
  summary: "Missing error boundary in form component",
  patch: "const { form } = $props();\n+ const errors = form?.errors || [];",
  riskLevel: "low",
  source: "pattern"
}
```

### Event Object
```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  tsCode: "TS1005",
  message: "';' expected.",
  filePath: "src/routes/cases/[id]/overview/+page.svelte",
  createdAt: "2025-12-07T18:11:59Z"
}
```

---

## 🎯 Success Indicators

✅ Modal appears when clicking brain button
✅ Loading state shows briefly (1-2 seconds)
✅ Suggestion displays with all fields
✅ Error events list populated (if data exists)
✅ Patch code is readable and formatted
✅ Badges show correct risk/source
✅ Modal closes cleanly
✅ No console errors
✅ Works on mobile
✅ Keyboard navigable

---

*Last Updated: 2025-12-07*
*Related Files: all-routes/+page.svelte, routeErrorAdvisorMachine.ts*
