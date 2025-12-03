# Prosecutor Vertical — Route Manifest

**Purpose:** Carve out the prosecutor app from 1,300+ routes
**Scope:** 15 frontend routes, 20 API endpoints
**Editor:** TipTap for prosecutors, Monaco for dev tools

---

## Frontend Routes (15 total)

### Auth (3 routes)
```
✅ /login                    → Login page
✅ /logout                   → Logout handler
✅ /register                 → Registration (optional for MVP)
```

### Command Center (1 route)
```
✅ /command-center           → Prosecutor home
   - Active cases grid
   - Recent activity feed
   - Quick actions: "New Case", "Upload Evidence", "Ask AI"
   - System status indicators
```

### Cases (4 routes)
```
✅ /cases                    → Case list with filters
   - Status: open / charged / closed
   - Offense type
   - Date range
   - Assigned prosecutor

✅ /cases/new                → Intake wizard
   - Narrative textarea
   - WHO / WHAT / WHEN / WHERE / WHY / HOW prompts
   - Evidence file upload (drag-and-drop)
   - "Create Case" button → calls /api/intake/case

✅ /cases/[caseId]           → Case overview (tabs)
   - Overview: summary, timeline, charges
   - Persons: POIs, defendants, witnesses
   - Evidence: board + library
   - AI Analysis: chat + insights
   - Reports: drafts + exports

✅ /cases/[caseId]/[tab]     → Tab-specific views
   - /cases/[caseId]/persons
   - /cases/[caseId]/evidence
   - /cases/[caseId]/evidence/board
   - /cases/[caseId]/ai
   - /cases/[caseId]/reports
```

### Persons of Interest (1 route)
```
✅ /persons-of-interest      → Global POI list
   - Search by name
   - Filter by role (suspect / victim / witness)
   - Filter by case
   - Click person → profile modal or detail page
```

### Evidence (1 route)
```
✅ /evidence/upload          → Evidence upload entry point
   - Can also upload from /cases/[caseId]/evidence
```

### AI Assistant (1 route)
```
✅ /aichat                   → Global AI assistant
   - Context switcher: "Current case: [dropdown]"
   - Chat history
   - Quick actions: "Summarize", "Suggest charges", "Find precedents"
```

### Reports & Citations (2 routes)
```
✅ /reports                  → Global report browser (optional)
   - All reports across cases
   - Filter by type, case, date

✅ /saved-citations          → Citation library
   - Normalized statutes + case law
   - Search by jurisdiction, code, keyword
   - Click to insert into report
```

### Dev Tools (2 routes - hidden from prosecutors)
```
🔧 /all-routes               → Route inspector (Phase 72/82)
🔧 /dev/*                    → Developer playground
```

---

## API Endpoints (20 total)

### Cases (5 endpoints)
```
POST   /api/intake/case                    → Create case from narrative
GET    /api/cases                          → List cases (with filters)
GET    /api/cases/[caseId]                 → Get case details
PATCH  /api/cases/[caseId]                 → Update case
POST   /api/cases/[caseId]/analysis        → AI analysis of case
```

### Persons (4 endpoints)
```
GET    /api/persons                        → List all persons
GET    /api/persons/[personId]             → Get person details
POST   /api/persons                        → Create person
GET    /api/persons/[personId]/associates  → Get known associates
```

### Evidence (4 endpoints)
```
POST   /api/evidence/upload                → Upload evidence file
GET    /api/evidence/[evidenceId]          → Get evidence details
POST   /api/evidence/[evidenceId]/analyze  → AI content extraction
GET    /api/evidence/hash/[evidenceId]     → Chain of custody log
```

### Citations (2 endpoints)
```
POST   /api/citations/normalize            → Parse + normalize citations
GET    /api/citations                      → List saved citations
```

### Reports (3 endpoints)
```
POST   /api/reports/generate               → Generate report with AI
GET    /api/reports/[reportId]             → Get report (TipTap JSON)
GET    /api/reports/[reportId]/export/pdf  → Export as PDF
```

### AI & Search (2 endpoints)
```
POST   /api/legal/chat                     → Case-aware AI chat
POST   /api/legal/vector-search            → Semantic search (RAG)
```

---

## TipTap vs Monaco: Where Each Lives

### TipTap (Prosecutor-facing)

**Used in:**
- `/cases/[caseId]/reports` — Main report editor
- Report types:
  - Intake Summary
  - Charging Memo
  - Discovery Checklist
  - Timeline Report
  - Hearing Prep Notes

**Features:**
- Rich text: headings, bold, italic, lists, tables
- Custom nodes:
  - **Citation chip:** Links to statute/case in `/saved-citations`
  - **Evidence reference:** Links to evidence item
  - **Person mention:** Links to POI profile
- Footnotes / endnotes
- Callouts (for important points)
- Stores as ProseMirror JSON in `reports.content_json`

**Implementation:**
```svelte
<!-- /cases/[caseId]/reports/+page.svelte -->
<script>
  import TipTapEditor from '$lib/components/TipTapEditor.svelte';

  let content = $state(report.content_json);

  async function save() {
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content_json: content })
    });
  }

  async function exportPDF() {
    const res = await fetch(`/api/reports/${reportId}/export/pdf`);
    const blob = await res.blob();
    // Download PDF
  }
</script>

<TipTapEditor
  bind:content
  onInsertCitation={() => openCitationPicker()}
  onInsertEvidence={() => openEvidencePicker()}
/>

<button onclick={save}>Save Draft</button>
<button onclick={exportPDF}>Export PDF</button>
```

### Monaco/Monarch (Dev-facing)

**Used in:**
- `/dev/templates` — Edit report templates (Markdown/Handlebars)
- `/dev/prompts` — Edit AI prompts (YAML/JSON)
- `/dev/schemas` — Edit database schemas (SQL/TypeScript)
- `/all-routes` — View route metadata (JSON)

**Features:**
- Syntax highlighting (Markdown, JSON, YAML, SQL, TypeScript)
- Find & replace
- Multi-cursor editing
- Diff view (for comparing versions)

**Implementation:**
```svelte
<!-- /dev/templates/+page.svelte -->
<script>
  import Monaco from '$lib/components/Monaco.svelte';

  let templateContent = $state(template.markdown);
</script>

<Monaco
  language="markdown"
  bind:value={templateContent}
  theme="vs-dark"
/>
```

---

## Database Schema (Focused)

### Core Tables

```typescript
// cases
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  primary_offense_codes: text('primary_offense_codes').array(),
  status: text('status').notNull(), // 'open' | 'charged' | 'closed'
  severity: text('severity'), // 'high' | 'medium' | 'low'
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
});

// persons_of_interest
export const personsOfInterest = pgTable('persons_of_interest', {
  id: uuid('id').primaryKey().defaultRandom(),
  full_name: text('full_name').notNull(),
  aliases: text('aliases').array(),
  dob: date('dob'),
  role: text('role'), // 'suspect' | 'victim' | 'witness'
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});

// case_persons (join table)
export const casePersons = pgTable('case_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  person_id: uuid('person_id').references(() => personsOfInterest.id),
  role: text('role').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// evidence
export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  type: text('type').notNull(), // 'document' | 'photo' | 'video' | 'audio' | 'physical'
  title: text('title').notNull(),
  description: text('description'),
  source: text('source'),
  file_path: text('file_path'),
  hash: text('hash'), // SHA-256 for chain of custody
  ocr_text: text('ocr_text'),
  embedding: vector('embedding', 1536), // pgvector
  created_at: timestamp('created_at').defaultNow(),
});

// citations
export const citations = pgTable('citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  raw_text: text('raw_text'),
  normalized_cite: text('normalized_cite'),
  jurisdiction: text('jurisdiction'),
  type: text('type'), // 'statute' | 'case' | 'rule'
  url: text('url'),
  created_at: timestamp('created_at').defaultNow(),
});

// reports
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  kind: text('kind').notNull(), // 'intake_summary' | 'charging_memo' | etc.
  title: text('title').notNull(),
  content_json: jsonb('content_json'), // TipTap/ProseMirror JSON
  content_markdown: text('content_markdown'), // for export
  created_by: uuid('created_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

---

## Component Architecture

### Page Components (Svelte 5)

```
/cases/new/+page.svelte
  ├─ IntakeForm.svelte
  │  ├─ NarrativeTextarea.svelte
  │  ├─ GuidedPrompts.svelte
  │  └─ EvidenceUploader.svelte
  └─ calls /api/intake/case

/cases/[caseId]/+layout.svelte
  ├─ CaseHeader.svelte (title, defendant, charges)
  ├─ CaseTabs.svelte (Overview, Persons, Evidence, AI, Reports)
  └─ <slot /> for tab content

/cases/[caseId]/reports/+page.svelte
  ├─ ReportList.svelte (drafts)
  ├─ TipTapEditor.svelte (main editor)
  │  ├─ CitationNode.svelte (custom node)
  │  ├─ EvidenceReferenceNode.svelte (custom node)
  │  └─ PersonMentionNode.svelte (custom node)
  └─ ReportActions.svelte (save, export, share)

/persons-of-interest/+page.svelte
  ├─ PersonList.svelte (table/grid)
  ├─ PersonFilters.svelte (role, case, search)
  └─ PersonModal.svelte (detail view)

/aichat/+page.svelte
  ├─ ChatHistory.svelte (messages)
  ├─ ChatInput.svelte (textarea + send)
  ├─ CaseContextSwitcher.svelte (dropdown)
  └─ QuickActions.svelte (buttons)
```

### Shared Components

```
$lib/components/
  ├─ TipTapEditor.svelte          → Main report editor
  ├─ Monaco.svelte                → Dev tool editor
  ├─ EvidenceBoard.svelte         → Beige grid canvas
  ├─ PersonCard.svelte            → POI profile card
  ├─ CitationPicker.svelte        → Modal to select citation
  ├─ EvidencePicker.svelte        → Modal to select evidence
  └─ AIChat.svelte                → Reusable chat component
```

---

## TipTap Custom Nodes

### Citation Node

```typescript
// CitationNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const CitationNode = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      citationId: { default: null },
      text: { default: '' },
      url: { default: null }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-citation': node.attrs.citationId,
        class: 'citation-chip'
      }),
      node.attrs.text
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'citation-chip';
      dom.textContent = node.attrs.text;
      dom.onclick = () => {
        // Open citation detail modal
        window.dispatchEvent(new CustomEvent('open-citation', {
          detail: { citationId: node.attrs.citationId }
        }));
      };
      return { dom };
    };
  }
});
```

### Evidence Reference Node

```typescript
// EvidenceReferenceNode.ts
export const EvidenceReferenceNode = Node.create({
  name: 'evidenceReference',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      evidenceId: { default: null },
      title: { default: '' },
      type: { default: 'document' }
    };
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-evidence': node.attrs.evidenceId,
        class: `evidence-ref evidence-ref-${node.attrs.type}`
      },
      `📎 ${node.attrs.title}`
    ];
  }
});
```

---

## Implementation Checklist

### Week 1: Core Routes + Intake
- [ ] `/command-center` page (case grid + quick actions)
- [ ] `/cases` page (list with filters)
- [ ] `/cases/new` page (intake form) ✅ DONE
- [ ] `/api/intake/case` endpoint ✅ DONE
- [ ] Database schema (Drizzle migrations)
- [ ] Test intake flow end-to-end

### Week 2: Case Detail + Evidence
- [ ] `/cases/[caseId]` layout (tabs)
- [ ] `/cases/[caseId]/overview` tab
- [ ] `/cases/[caseId]/persons` tab
- [ ] `/cases/[caseId]/evidence` tab
- [ ] `/cases/[caseId]/evidence/board` (beige grid)
- [ ] Evidence upload + OCR pipeline

### Week 3: Reports + TipTap
- [ ] TipTap editor component
- [ ] Citation node + picker
- [ ] Evidence reference node + picker
- [ ] `/cases/[caseId]/reports` page
- [ ] `/api/reports/generate` endpoint
- [ ] PDF export

### Week 4: AI + Polish
- [ ] `/aichat` page (global assistant)
- [ ] `/cases/[caseId]/ai` tab (case-specific)
- [ ] `/persons-of-interest` page
- [ ] `/saved-citations` page
- [ ] Vector search integration
- [ ] Polish + bug fixes

---

## What NOT to Build (Yet)

### Routes to Keep as Dev Tools
- `/all-routes` (Phase 72/82 inspector)
- `/dev/*` (developer playground)
- `/demo/*` (AI demos)
- `/test/*` (test routes)

### Routes to Archive
- Duplicate evidence routes (keep only `/cases/[caseId]/evidence`)
- Duplicate POI routes (keep only `/persons-of-interest`)
- Extra AI demos (keep only `/aichat` + case AI tab)
- Gaming demos, GPU demos, etc.

### APIs to Keep Internal
- `/api/phase72/*` (error brain)
- `/api/phase82/*` (Svelte 5 upgrade)
- `/api/route-operations/*` (operation logging)
- `/api/test/*` (test endpoints)
- `/api/demo/*` (demo endpoints)

---

## Success Criteria

- [ ] Prosecutor can log in
- [ ] Prosecutor sees command center with active cases
- [ ] Prosecutor can create new case via intake form
- [ ] AI extracts case data (charges, persons, timeline)
- [ ] Case overview displays with all tabs
- [ ] Evidence board renders and allows connections
- [ ] POI profiles display with associates
- [ ] AI chat works (global + case-specific)
- [ ] Reports generate with TipTap editor
- [ ] Citations can be inserted into reports
- [ ] Evidence can be referenced in reports
- [ ] PDF export works
- [ ] All data persists and is searchable

---

## Next Steps

1. **Test intake flow** (already built)
2. **Build case overview layout** with tabs
3. **Integrate TipTap** for reports
4. **Build evidence board** (reuse existing beige grid)
5. **Wire AI chat** to case context

**You now have a clear vertical slice: 15 routes, 20 APIs, TipTap for prosecutors, Monaco for dev tools.** 🚀
