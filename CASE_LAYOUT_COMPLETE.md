# Case Layout Complete ✅

**Status:** Case overview with tabs is ready to test
**Date:** 2025-12-02

---

## What's Built

### 1. Case Layout (`/cases/[caseId]/+layout.svelte`) ✅

**Features:**
- Dynamic case header with title, status, severity, charges
- Tab navigation: Overview, Persons, Evidence, AI Analysis, Reports
- Quick actions: "Ask AI", "Generate Report"
- Loading states and error handling
- Responsive design with YoRHa theme

**Tabs:**
- 📋 Overview — Case summary, timeline, quick stats
- 👥 Persons — POIs, defendants, witnesses (to be built)
- 📎 Evidence — Evidence board + library (to be built)
- 🤖 AI Analysis — Case-specific AI chat (to be built)
- 📄 Reports — Report generation + TipTap editor (to be built)

### 2. Overview Tab (`/cases/[caseId]/overview/+page.svelte`) ✅

**Features:**
- Case summary card (ID, title, status, severity, description)
- Timeline of events (incident, arrest, evidence, witness)
- Quick stats (persons, evidence, reports, charges)
- Clean, professional layout

### 3. API Endpoint (`/api/cases/[caseId]/+server.ts`) ✅

**Endpoints:**
- `GET /api/cases/[caseId]` — Get case details
- `PATCH /api/cases/[caseId]` — Update case
- `DELETE /api/cases/[caseId]` — Delete case (soft delete)

**Currently:** Returns mock data. Ready to wire to database.

---

## How to Test

### 1. Start dev server
```bash
npm run dev:quic
```

### 2. Create a case via intake
```
http://127.0.0.1:5173/cases/new
```

Fill the form and submit. You'll be redirected to:
```
http://127.0.0.1:5173/cases/[caseId]/overview
```

### 3. Or visit directly with mock data
```
http://127.0.0.1:5173/cases/test-case-123/overview
```

You should see:
- Case header with title, status, charges
- Tab navigation (Overview is active)
- Case summary card
- Timeline of events
- Quick stats

### 4. Click tabs
- Click "Persons" → `/cases/[caseId]/persons` (404 for now)
- Click "Evidence" → `/cases/[caseId]/evidence` (404 for now)
- Click "AI Analysis" → `/cases/[caseId]/ai` (404 for now)
- Click "Reports" → `/cases/[caseId]/reports` (404 for now)

---

## File Structure

```
sveltekit-frontend/src/routes/
├── cases/
│   ├── new/
│   │   └── +page.svelte                    ✅ Intake form
│   └── [caseId]/
│       ├── +layout.svelte                  ✅ Case layout with tabs
│       ├── overview/
│       │   └── +page.svelte                ✅ Overview tab
│       ├── persons/
│       │   └── +page.svelte                🔜 To be built
│       ├── evidence/
│       │   ├── +page.svelte                🔜 To be built
│       │   └── board/
│       │       └── +page.svelte            🔜 Evidence board
│       ├── ai/
│       │   └── +page.svelte                🔜 AI chat
│       └── reports/
│           └── +page.svelte                🔜 TipTap editor
└── api/
    ├── intake/
    │   └── case/
    │       └── +server.ts                  ✅ Intake endpoint
    └── cases/
        └── [caseId]/
            └── +server.ts                  ✅ Case CRUD endpoint
```

---

## Next Steps

### Immediate (Week 2)

1. **Build Persons Tab** (`/cases/[caseId]/persons/+page.svelte`)
   - List of POIs linked to case
   - Add person button
   - Person profile modal
   - Known associates graph

2. **Build Evidence Tab** (`/cases/[caseId]/evidence/+page.svelte`)
   - Evidence table with filters
   - Upload button
   - Link to evidence board

3. **Build Evidence Board** (`/cases/[caseId]/evidence/board/+page.svelte`)
   - Reuse existing beige grid component
   - Drag-and-drop evidence nodes
   - Draw connections
   - Export as image/PDF

4. **Build AI Tab** (`/cases/[caseId]/ai/+page.svelte`)
   - Case-specific AI chat
   - Quick actions: "Summarize", "Suggest charges", "Find weaknesses"
   - Chat history
   - Context: current case data

5. **Build Reports Tab** (`/cases/[caseId]/reports/+page.svelte`)
   - List of reports for this case
   - "Generate Report" button
   - TipTap editor
   - PDF export

### Week 3: TipTap Integration

1. **Install TipTap**
   ```bash
   npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-link
   ```

2. **Create TipTap component** (`$lib/components/TipTapEditor.svelte`)
   - Rich text editor
   - Custom nodes: Citation, Evidence Reference, Person Mention
   - Toolbar: headings, bold, italic, lists, etc.

3. **Wire to reports endpoint**
   - `POST /api/reports/generate` — Generate with AI
   - `GET /api/reports/[reportId]` — Get report (TipTap JSON)
   - `PATCH /api/reports/[reportId]` — Save edits
   - `GET /api/reports/[reportId]/export/pdf` — Export PDF

---

## Visual Design

### Case Header
```
┌─────────────────────────────────────────────────────────────┐
│ People v. John Doe - Armed Robbery                          │
│ [OPEN] [HIGH] Created: 2024-03-15                           │
│ Charges: PC 211, PC 25400                                   │
│                                    [🤖 Ask AI] [📄 Report]  │
└─────────────────────────────────────────────────────────────┘
```

### Tab Navigation
```
┌─────────────────────────────────────────────────────────────┐
│ [📋 Overview] [👥 Persons] [📎 Evidence] [🤖 AI] [📄 Reports]│
└─────────────────────────────────────────────────────────────┘
```

### Overview Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Case Summary                                                 │
│ ─────────────────────────────────────────────────────────── │
│ Case ID: test-case-123                                      │
│ Title: People v. John Doe - Armed Robbery                   │
│ Status: OPEN                                                 │
│ Severity: HIGH                                               │
│ Description: On March 15, 2024...                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Timeline                                                     │
│ ─────────────────────────────────────────────────────────── │
│ ● 2024-03-15 23:30 — Incident occurred at 7-Eleven          │
│ ● 2024-03-16 01:30 — Suspect arrested at residence          │
│ ● 2024-03-16 09:00 — Evidence collected and logged          │
│ ● 2024-03-16 14:00 — Witness statement recorded             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Quick Stats                                                  │
│ ─────────────────────────────────────────────────────────── │
│ [👥 0 Persons] [📎 0 Evidence] [📄 1 Reports] [⚖️ 2 Charges]│
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [x] Case layout loads with header and tabs
- [x] Overview tab displays case summary
- [x] Timeline shows events in order
- [x] Quick stats display counts
- [x] Tab navigation works (active state)
- [x] Quick actions buttons present
- [x] Loading states work
- [x] Error states work
- [x] Responsive design
- [x] YoRHa theme applied
- [ ] Persons tab built
- [ ] Evidence tab built
- [ ] Evidence board built
- [ ] AI tab built
- [ ] Reports tab built
- [ ] TipTap editor integrated

---

## Integration Points

### With Intake Flow
```
/cases/new → Submit form → /api/intake/case → Returns caseId → Redirect to /cases/[caseId]/overview
```

### With Database
```
/api/cases/[caseId] → Query cases table → Return case data → Display in layout
```

### With AI
```
"Ask AI" button → Navigate to /cases/[caseId]/ai → Chat with case context
```

### With Reports
```
"Generate Report" button → Navigate to /cases/[caseId]/reports → TipTap editor
```

---

## Testing Checklist

- [ ] Visit `/cases/test-case-123/overview`
- [ ] See case header with title, status, charges
- [ ] See tab navigation with Overview active
- [ ] See case summary card
- [ ] See timeline with 4 events
- [ ] See quick stats with counts
- [ ] Click "Persons" tab → URL changes to `/cases/test-case-123/persons`
- [ ] Click "Evidence" tab → URL changes to `/cases/test-case-123/evidence`
- [ ] Click "AI Analysis" tab → URL changes to `/cases/test-case-123/ai`
- [ ] Click "Reports" tab → URL changes to `/cases/test-case-123/reports`
- [ ] Click "Ask AI" button → Navigate to AI tab
- [ ] Click "Generate Report" button → Navigate to Reports tab

---

## Next Immediate Action

**Build the Persons tab** to show POIs linked to the case. This will demonstrate the full flow:

1. Intake form creates case + persons
2. Case overview shows summary
3. Persons tab shows list of POIs
4. Click person → Profile modal

Ready to build `/cases/[caseId]/persons/+page.svelte`? 🚀
