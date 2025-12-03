# Complete Development Guide — SvelteKit Frontend + Prosecutor MVP

**Status:** Ready to build
**Last Updated:** 2025-12-02
**Version:** 1.0.0

---

## 🎯 Overview

This guide combines:
1. **SvelteKit Frontend Architecture** — 1,300+ routes organized by feature
2. **Prosecutor MVP** — 7 core screens for case management
3. **Data-Driven Systems** — Testing, logging, and route organization

---

## 📋 Part 1: SvelteKit Architecture

### Tech Stack

**Core:**
- SvelteKit (full-stack framework)
- Svelte 5 (with runes: `$state`, `$derived`, `$effect`)
- TypeScript (type-safe)

**Styling:**
- UnoCSS (atomic CSS, primary)
- Bits-UI v2 (headless components, Svelte 5 compatible)
- NES.css (retro gaming UI for demos)

**Backend:**
- Drizzle ORM (database queries)
- Lucia Auth (authentication)
- PostgreSQL + pgvector (database)
- Redis (caching)
- MinIO (object storage)

### Route Organization

**Total Routes:** ~1,300
- Pages: ~255
- API Endpoints: ~1,028
- Layouts: ~17
- Demos: ~80+

**Categories:**

| Category | Routes | Purpose |
|----------|--------|---------|
| **Core App** | ~150 | Cases, evidence, legal, search, auth |
| **AI & ML** | ~141 | Chat, RAG, embeddings, vector search |
| **Legal** | ~72 | Legal analysis, citations, reports |
| **Evidence** | ~99 | Evidence management, boards, graphs |
| **Admin** | ~25 | User management, system config |
| **Demos** | ~80+ | Feature showcases, testing |
| **API** | ~1,029 | Backend endpoints |

### Key Routes

**Authentication:**
- `/login` — User login
- `/logout` — User logout
- `/register` — User registration
- `/profile` — User profile
- `/settings` — User settings

**Core Application:**
- `/dashboard` — Main dashboard
- `/cases` — Case management
- `/evidence` — Evidence library
- `/evidence-board` — Evidence visualization
- `/persons` — Persons of interest
- `/legal` — Legal tools
- `/search` — Global search

**AI & Intelligence:**
- `/ai` — AI dashboard
- `/chat` — Chat interface
- `/ai-rag` — RAG interface
- `/summarize` — Document summarization
- `/vector-search` — Vector search

**Admin & System:**
- `/admin/*` — Admin routes
- `/system-dashboard` — System overview
- `/monitor` — System monitor
- `/metrics` — Metrics dashboard

**Development:**
- `/all-routes` — Route explorer
- `/dev/*` — Development tools
- `/test/*` — Test pages
- `/demo/*` — Demo pages

### Layout Groups

SvelteKit uses `(group)` syntax for shared layouts without affecting URLs:

```
src/routes/
├── (auth)/
│   ├── login/+page.svelte
│   ├── register/+page.svelte
│   └── +layout.svelte
├── (admin)/
│   ├── users/+page.svelte
│   ├── settings/+page.svelte
│   └── +layout.svelte
├── (ai)/
│   ├── chat/+page.svelte
│   ├── rag/+page.svelte
│   └── +layout.svelte
├── (legal)/
│   ├── documents/+page.svelte
│   ├── analysis/+page.svelte
│   └── +layout.svelte
├── (evidence)/
│   ├── board/+page.svelte
│   ├── library/+page.svelte
│   └── +layout.svelte
├── api/
│   ├── auth/+server.ts
│   ├── cases/+server.ts
│   └── ...
└── +layout.svelte
```

---

## 🎨 Part 2: Svelte 5 & Styling

### Svelte 5 Runes

**State:**
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

**Props:**
```svelte
<script lang="ts">
  let { title, description = 'Default' } = $props();
</script>
```

**Events:**
```svelte
<!-- ✅ NEW (Svelte 5) -->
<button onclick={() => handleClick()}>Click</button>
<input onchange={(e) => handleChange(e)} />

<!-- ❌ OLD (Svelte 4) -->
<button on:click={handleClick}>Click</button>
<input on:change={handleChange} />
```

### UnoCSS Styling

```svelte
<!-- Atomic classes -->
<div class="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <h1 class="text-2xl font-bold text-gray-900">Title</h1>
  <button class="px-4 py-2 bg-blue-5 text-white rounded hover:bg-blue-6">
    Click Me
  </button>
</div>
```

### Bits-UI v2 Components

```svelte
<script lang="ts">
  import { Dialog, Button } from 'bits-ui';

  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger asChild let:builder>
    <Button builders={[builder]}>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Dialog Title</Dialog.Title>
      <Dialog.Description>Content here</Dialog.Description>
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## 🚀 Part 3: Prosecutor MVP

### 7 Core Screens

#### 1. **Case Intake** (`/cases/new`)
**What:** Prosecutor describes incident. System auto-structures it.

**Flow:**
1. Fill narrative textarea
2. Answer guided prompts (WHO, WHAT, WHEN, WHERE, WHY, HOW)
3. Drag-and-drop evidence files
4. Click "Create Case"
5. AI extracts: charges, persons, timeline
6. Redirect to case overview

**Implementation:**
- `/cases/new/+page.svelte` — Intake form
- `/api/intake/case/+server.ts` — Backend (calls Gemma3)

#### 2. **Case Overview** (`/cases/[id]/overview`)
**What:** Case dashboard with tabs.

**Tabs:**
- Overview (summary, timeline, charges)
- Evidence (board + library)
- Persons (POIs, defendants, witnesses)
- AI Analysis (chat + generated docs)
- Reports (charging memo, discovery list, etc.)

#### 3. **Evidence Board** (`/cases/[id]/canvas`)
**What:** Beige grid UI. Evidence items as nodes. Connections between items.

**Features:**
- Drag-and-drop evidence
- Draw connections
- Right-click actions (summarize, mark critical, link to charge)
- Export as image/PDF

#### 4. **Evidence Library** (`/evidence`)
**What:** Table/grid of all evidence.

**Columns:**
- Type (document, photo, video, audio)
- Title / Description
- Source (bodycam, surveillance, witness statement)
- Date uploaded
- Hash (chain of custody)
- Actions (view, analyze, link to case)

#### 5. **Persons of Interest** (`/persons`)
**What:** "Fugitivedex but legal." One page per person.

**Per-person view:**
- Demographics (name, aliases, DOB, gender, address)
- Risk flags (prior arrests, warrants, violence history)
- Prior cases (linked cases)
- Timeline (interactions with this case)
- Known associates (linked persons)
- Evidence (photos, statements)

#### 6. **Reports & Exports** (`/cases/[id]/reports`)
**What:** Generate and edit legal documents.

**Report types:**
- Intake Summary (auto-generated)
- Charging Memo (AI draft + prosecutor edits)
- Discovery Checklist (what must be disclosed)
- Timeline Report (events in order)
- Hearing Prep Notes (key points for court)

**Editor:**
- TipTap (rich text, default)
- Monaco (raw mode for power users)
- Export: PDF, DOCX, plain text

#### 7. **Command Center** (`/dashboard`)
**What:** Home page. Active cases, recent activity, system status.

**Layout:**
- Left nav: Cases, Evidence, POIs, Analysis, Settings
- Center: Case cards (status, defendant, charges, last activity)
- Right: AI chat window (always available)
- Top: Global search bar

### 3 API Pipelines

#### Pipeline A: Ingest & Structure Evidence
```
POST /api/intake/case
  Input: narrative, who, what, when, where, why, how, uploadedEvidenceIds
  Output: caseId, persons[], evidence[], offenses[]

POST /api/evidence/upload
  Input: file, caseId, type, source
  Output: evidenceId, hash, status

POST /api/ocr/extract
  Input: evidenceId (document/image)
  Output: text, confidence, pages

POST /api/evidence/hash
  Input: evidenceId
  Output: hash, timestamp, chain_of_custody_log
```

#### Pipeline B: Vector Search & Semantic Tools
```
POST /api/ai/embeddings
  Input: text or evidenceId
  Output: embedding[], metadata

POST /api/legal/vector-search
  Input: query, caseId, filters
  Output: evidence[], persons[], citations[]

GET /api/search/cases
  Input: query, filters
  Output: cases[]

GET /api/search/evidence
  Input: query, caseId, filters
  Output: evidence[]

GET /api/laws/search
  Input: query, jurisdiction
  Output: statutes[], prior_cases[]
```

#### Pipeline C: Legal Reasoning & Drafting
```
POST /api/legal/analyze
  Input: caseId, evidenceId, query
  Output: analysis, confidence, citations

POST /api/legal/chat
  Input: caseId, message, context
  Output: response, citations, suggestions

POST /api/reports/generate
  Input: caseId, reportType, template
  Output: reportId, content_json (TipTap format)

POST /api/citations/normalize
  Input: caseId, citationsText
  Output: citations[], normalized

GET /api/reports/[id]/export/pdf
  Input: reportId, format
  Output: PDF file
```

### Database Schema

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
  gender: text('gender'),
  address: text('address'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});

// case_persons (join)
export const casePersons = pgTable('case_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  person_id: uuid('person_id').references(() => personsOfInterest.id),
  role: text('role').notNull(), // 'suspect' | 'victim' | 'witness'
  created_at: timestamp('created_at').defaultNow(),
});

// evidence
export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  type: text('type').notNull(), // 'document' | 'photo' | 'video' | 'audio'
  title: text('title').notNull(),
  source: text('source'), // 'bodycam' | 'surveillance' | 'witness_statement'
  file_path: text('file_path'),
  hash: text('hash'),
  ocr_text: text('ocr_text'),
  embedding: vector('embedding', 1536),
  created_at: timestamp('created_at').defaultNow(),
});

// reports
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  kind: text('kind').notNull(), // 'intake_summary' | 'charging_memo' | etc.
  title: text('title').notNull(),
  content_json: jsonb('content_json'), // TipTap format
  created_by: uuid('created_by'),
  created_at: timestamp('created_at').defaultNow(),
});
```

---

## 📊 Part 4: Data-Driven Systems

### Route Organization System

**Source of Truth:** `route-organization-report.json`

```json
{
  "metadata": {
    "totalRoutes": 477,
    "functionalRoutes": 132,
    "emptyStubs": 344,
    "emptyApiEndpoints": 333
  },
  "categories": {
    "AI": { "priority": "high", "routes": [...] },
    "Core": { "priority": "high", "routes": [...] },
    "Auth": { "priority": "high", "routes": [...] },
    "Utility": { "priority": "high", "routes": [...] },
    "Demo": { "priority": "medium", "routes": [...] },
    "Legacy": { "priority": "low", "routes": [...] }
  }
}
```

**Interactive UI:** `/all-routes`
- Filter by category, priority, real/lore
- Click route to inspect
- Detective Board modal shows metadata + Phase 72/82 status

### Data-Driven Testing

**Test routes by priority:**
```bash
# Test high-priority routes
node scripts/route-data-driven-test.mjs --priority=high

# Test only Core category
node scripts/route-data-driven-test.mjs --category=Core

# Test real routes only
node scripts/route-data-driven-test.mjs --real-only
```

**Output:**
- Console summary (pass rate, failures, by category/priority)
- JSON log: `.route-test-logs/route-test-TIMESTAMP.json`

### Operation Logging

**Log Phase 72 + Phase 82 operations:**

```typescript
import { routeLogger } from '$lib/utils/route-operation-logger';

// Log Phase 72 error analysis
routeLogger.logPhase72Error(
  '/cases/[id]',
  'Core',
  'high',
  { code: 'TS2345', message: 'Argument not assignable', count: 1 },
  'Add type annotation'
);

// Log Phase 82 Svelte 5 upgrade
routeLogger.logPhase82Upgrade(
  '/cases/[id]',
  'Core',
  'high',
  {
    filesUpgraded: 3,
    patternsFixed: ['export let → $props()', 'onMount → $effect'],
    errors: []
  },
  1234 // duration in ms
);

// Get report
const report = routeLogger.generateReport();
```

**Query via API:**
```bash
# Get all operations
curl http://127.0.0.1:5173/api/route-operations/log

# Log a new operation
curl -X POST http://127.0.0.1:5173/api/route-operations/log \
  -H "Content-Type: application/json" \
  -d '{
    "type": "phase82_upgrade",
    "route": "/cases/[id]",
    "category": "Core",
    "priority": "high",
    "data": { ... }
  }'
```

---

## 🔧 Part 5: Development Workflow

### 1. Start Development Server

```bash
npm run dev:quic
# Visit http://127.0.0.1:5173
```

### 2. Explore Routes

Visit `/all-routes` to see all available routes with:
- Category badges
- Priority indicators
- Type badges (Real vs. Lore)
- Filters and search

### 3. Test High-Priority Routes

```bash
node scripts/route-data-driven-test.mjs --priority=high --real-only
```

### 4. Build Features

Follow Svelte 5 patterns:
- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$effect()` for side effects
- Use `$props()` for component props
- Use UnoCSS for styling
- Use Bits-UI v2 for components

### 5. Log Operations

As you fix errors or upgrade code:
```typescript
routeLogger.logPhase82Upgrade(route, category, priority, result, duration);
```

### 6. Generate Reports

```bash
curl http://127.0.0.1:5173/api/route-operations/log | jq '.summary'
```

---

## 📝 Common Patterns

### Page Component

```svelte
<script lang="ts">
  import { page } from '$app/stores';

  interface Props {
    title: string;
    description?: string;
  }

  let { title, description = 'Default' } = $props();

  let data = $state<any[]>([]);
  let loading = $state(false);

  let computed = $derived(data.length > 0);

  $effect(() => {
    console.log('Page loaded:', title);
  });

  async function loadData() {
    loading = true;
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to load');
      data = await res.json();
    } finally {
      loading = false;
    }
  }
</script>

<div class="p-4">
  <h1 class="text-2xl font-bold">{title}</h1>
  {#if description}
    <p class="text-gray-600">{description}</p>
  {/if}

  {#if loading}
    <p>Loading...</p>
  {:else if data.length > 0}
    <ul>
      {#each data as item (item.id)}
        <li>{item.name}</li>
      {/each}
    </ul>
  {:else}
    <p>No data</p>
  {/if}

  <button onclick={loadData} class="px-4 py-2 bg-blue-5 text-white rounded">
    Load Data
  </button>
</div>
```

### API Endpoint

```typescript
// src/routes/api/data/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const data = await locals.db.query.data.findMany();
    return json(data);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = await locals.db.insert(data).values(body);
    return json(result);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    );
  }
};
```

### Modal Component

```svelte
<script lang="ts">
  import { Dialog, Button } from 'bits-ui';

  interface Props {
    open?: boolean;
    title: string;
    onclose?: () => void;
  }

  let { open = $bindable(false), title, onclose } = $props();
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && onclose?.()}>
  <Dialog.Trigger asChild let:builder>
    <Button builders={[builder]}>Open</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>{title}</Dialog.Title>
      <slot />
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## ✅ Checklist: Prosecutor MVP

### Phase 1: Intake Flow (Week 1)
- [ ] `/cases/new` page loads
- [ ] Intake form displays
- [ ] Prosecutor fills form
- [ ] AI extracts case data
- [ ] Case record created
- [ ] Redirect to overview works

### Phase 2: Case Overview (Week 2)
- [ ] `/cases/[id]/overview` page loads
- [ ] Tabs display (Overview, Evidence, Persons, AI, Reports)
- [ ] Evidence board renders
- [ ] Evidence library displays
- [ ] Persons list shows

### Phase 3: Reports & Editor (Week 3)
- [ ] TipTap editor loads
- [ ] AI generates charging memo
- [ ] Prosecutor can edit memo
- [ ] Export PDF works
- [ ] Report persists

### Phase 4: Polish (Week 4+)
- [ ] Global search works
- [ ] Citations normalize
- [ ] Hearing prep notes generate
- [ ] All data searchable
- [ ] Tests pass

---

## 🎯 Success Criteria

- [ ] Prosecutor can describe incident in plain English
- [ ] System auto-creates case with persons, evidence, charges
- [ ] Prosecutor can view case overview with all tabs
- [ ] Evidence board displays and allows connections
- [ ] AI generates charging memo draft
- [ ] Prosecutor can edit memo in TipTap
- [ ] Prosecutor can export PDF
- [ ] All data persists and is searchable
- [ ] High-priority routes tested and passing
- [ ] Operation logs accurate and complete

---

## 📚 Resources

- **Svelte 5 Docs:** https://svelte-5-preview.vercel.app/docs
- **SvelteKit Docs:** https://kit.svelte.dev/docs
- **UnoCSS Docs:** https://unocss.dev/
- **Bits-UI Docs:** https://bits-ui.com/
- **Drizzle ORM:** https://orm.drizzle.team/

---

## 🚀 Next Steps

1. **Test intake flow:**
   ```bash
   npm run dev:quic
   # Visit http://127.0.0.1:5173/cases/new
   ```

2. **Check Gemma3:**
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

3. **Run data-driven tests:**
   ```bash
   node scripts/route-data-driven-test.mjs --priority=high
   ```

4. **Build case overview page:**
   - Create `/cases/[id]/overview/+page.svelte`
   - Add tabs: Overview, Evidence, Persons, AI Analysis, Reports

5. **Build evidence board:**
   - Create `/cases/[id]/canvas/+page.svelte`
   - Implement beige grid with nodes + connections

---

**Let the data guide you. Build with confidence. Ship the prosecutor MVP.** 🚀
