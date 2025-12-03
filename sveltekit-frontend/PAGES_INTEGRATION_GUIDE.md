# Cases Overview & Reports - Svelte 5 + UnoCSS Integration

## ✅ Pages Created

### 1. `/cases/[id]/overview`
**Purpose**: Main case dashboard with Phase 72/78 error diagnostics

**Features**:
- Case narrative (WHO/WHAT/WHEN/WHERE/WHY/HOW)
- Tabbed interface (overview, evidence, persons, ai, reports)
- **Phase 72 Integration**: Real-time error count badge
- **Phase 78 Integration**: Consolidation graph status with cluster count
- Error diagnostics refresh button

**Files**:
- `src/routes/cases/[id]/overview/+page.ts` - Loader fetching case data
- `src/routes/cases/[id]/overview/+page.svelte` - Svelte 5 component with Phase 72/78 badges

**Test URL**: `http://localhost:5173/cases/test-123/overview`

---

### 2. `/cases/[id]/reports`
**Purpose**: Generate and edit charging memos, discovery lists, reports

**Features**:
- "Generate charging memo" button → calls `/api/reports/generate`
- TipTap editor shell (placeholder for real TipTap integration)
- Side-by-side editor + HTML preview
- Save report functionality
- **Phase 72 Integration**: Error status for `/api/reports/generate` route

**Files**:
- `src/routes/cases/[id]/reports/+page.ts` - Loader fetching case + report data
- `src/routes/cases/[id]/reports/+page.svelte` - Svelte 5 component with Phase 72 monitoring

**Test URL**: `http://localhost:5173/cases/test-123/reports`

---

## 🔌 API Integration Points

### Phase 72 Error Diagnostics

Both pages call `/api/errors/summary` and `/api/consolidation/status`:

```typescript
// Overview page - top-right header badges
GET /api/errors/summary
  → { total: number, byRoute: Record<route, count>, ... }

GET /api/consolidation/status
  → { status: 'idle'|'running'|'complete'|'error', clusterCount?: number, ... }

// Reports page - monitors /api/reports/generate endpoint
GET /api/phase72/errors?route=%2Fapi%2Freports%2Fgenerate
  → { errorCount: number, lastError?: { message: string }, ... }
```

### Phase 78 AI Suggestions

Reports page can be extended to call:
```typescript
POST /api/phase72/suggest-fix
  { route: '/api/reports/generate', code: ..., message: ..., ... }
  → { plan: string, suggestions: [], related_routes: [] }
```

---

## 🎨 Styling & UX

### Neutral Color Scheme
```
Background:   bg-neutral-950
Borders:      border-neutral-800
Text:         text-neutral-50
Secondary:    text-neutral-400 / text-neutral-500
Accent:       emerald-400, emerald-500 (case overview)
              violet-500 (reports)
              amber-400 (errors), emerald-400 (healthy), rose-400 (failed)
```

### Component Patterns
- **Badges**: `px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-900/60`
- **Buttons**: `px-3 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors`
- **Cards**: `rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3`
- **Tabs**: `border-b-2` active state, transparent inactive

---

## 🚀 Testing the Pages

### Quick Start

1. **Start dev server** (if not running):
   ```bash
   cd sveltekit-frontend
   npm run dev
   ```

2. **Test Overview page**:
   ```bash
   curl http://localhost:5173/cases/test-123/overview
   ```
   Expected: Page renders with diagnostics panel

3. **Test Reports page**:
   ```bash
   curl http://localhost:5173/cases/test-123/reports
   ```
   Expected: Page renders with "Generate charging memo" button

4. **Check Phase 72 endpoints**:
   ```bash
   curl http://localhost:5173/api/errors/summary | jq
   curl http://localhost:5173/api/consolidation/status | jq
   ```

### Manual Browser Testing

1. Open: `http://localhost:5173/cases/test-123/overview`
   - Verify case header loads
   - Click tabs (overview, evidence, persons, ai, reports)
   - Click "Refresh" button in diagnostics panel
   - Verify badges update

2. Open: `http://localhost:5173/cases/test-123/reports`
   - Verify Phase 72 badge shows
   - Click "Generate charging memo"
   - Verify error handling if endpoint returns error

---

## 📋 Data Flow

### Overview Page Load

```
Client Request: /cases/[id]/overview
  ↓
+page.ts loads parallelly:
  1. GET /api/cases/:id
  2. GET /api/cases/:id/evidence
  3. GET /api/cases/:id/persons
  ↓
$effect hook on client:
  1. GET /api/errors/summary
  2. GET /api/consolidation/status
  ↓
UI renders with:
  - Case data (title, narrative, who/what/when/where/why/how)
  - Evidence list
  - Persons grid
  - Phase 72 diagnostics (error count + consolidation status)
```

### Reports Page Generation

```
User clicks "Generate charging memo"
  ↓
POST /api/reports/generate { caseId: string }
  ↓
Backend:
  1. Load case from database
  2. Call Gemma3 legal model to generate memo
  3. Return { html: string, ... }
  ↓
Frontend:
  1. Display HTML in editor textarea
  2. Show preview in right panel
  3. Load Phase 72 status for this endpoint
  4. Display error count badge
```

---

## 🔄 Phase 72/78 Integration Points

### On Overview Page

**Error Diagnostics Panel** (top-right header):
- Shows real-time error count across all routes
- Shows consolidation graph status
- Displays cluster count when Phase 72 clustering is active
- Refresh button to reload diagnostics

**When error count > 0**:
- Green badge → No errors
- Amber badge → Errors detected
- Click to trigger Phase 78 AI analysis (future integration)

### On Reports Page

**Route-Specific Error Monitoring**:
- Monitors just `/api/reports/generate` endpoint
- Shows error count specific to report generation
- Last error message displayed in badge tooltip (future)
- Could be extended to show suggestions

---

## 🛠️ Future Enhancements

1. **TipTap Integration**: Replace `<textarea>` with actual TipTap editor
   - Bind to `reportHtml` state
   - Support formatting toolbar
   - Real-time preview

2. **Export PDF**: Add button to export report as PDF
   - Call `/api/reports/[id]/export/pdf`
   - Download as `.pdf` file

3. **Phase 78 "Ask Error Brain"**:
   - Add button on both pages
   - Call `/api/phase72/suggest-fix`
   - Display AI suggestions in modal

4. **Case Analytics**:
   - Add "AI analysis" tab on overview
   - Show Gemma3 risk scores
   - Display related cases / precedents

5. **Real-time Updates**:
   - Use Server-Sent Events (SSE) for live error tracking
   - Auto-refresh diagnostics every 30s instead of manual refresh

---

## ✅ Component Checklist

- [x] Overview page layout (header + tabs + content)
- [x] Reports page layout (header + editor + preview)
- [x] Phase 72 error summary endpoint (exists)
- [x] Phase 72 consolidation status endpoint (exists)
- [x] UnoCSS neutral color scheme applied
- [x] Svelte 5 runes ($state, $props, $effect)
- [x] Error handling with try/catch
- [x] Loading states (generating, saving, loadingDiagnostics)
- [x] Responsive grid layouts (md: breakpoint)
- [x] Tab navigation with active state
- [x] Diagnostics refresh button
- [ ] TipTap editor (shell in place, needs integration)
- [ ] PDF export (future)
- [ ] Phase 78 suggest-fix integration (future)

---

## 🎯 Success Criteria

- [x] Both pages render without TypeScript errors
- [x] Phase 72 endpoints return valid JSON
- [x] Forms submit without exceptions
- [x] Navigation between tabs works smoothly
- [x] Diagnostics panel loads and displays data
- [ ] Report generation calls backend successfully
- [ ] Phase 72 integration visible and working
- [ ] UX matches legal AI platform aesthetic

---

## 📝 Notes

- Pages assume data from `/api/cases/[id]` endpoint exists
- File upload and evidence storage assumed to be working
- Phase 72/78 backends expected to be running (or stubbed)
- TipTap editor is a placeholder (textarea fallback)
- All styling uses UnoCSS utility classes (no CSS files)
- Svelte 5 runes mode enabled (no component props reassignment)
