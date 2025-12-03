# Final Wiring Guide — Complete the Last 5%

**Status:** All components exist, just need to wire them together
**Time:** 2-3 hours total
**Components Found:** ✅ Schema, ✅ ReportEditor, ✅ FabricCanvas

---

## What We Already Have

### 1. Database Schema ✅
**Location:** `sveltekit-frontend/src_fixed/cases-schema.ts`

**Tables:**
- `cases` — Complete case management
- `evidence` — Evidence with chain of custody
- `case_timeline` — Timeline events
- `citations` — Legal citations
- `case_notes` — Detective notes

**Status:** Schema is comprehensive and ready to use

### 2. Report Editor ✅
**Location:** `sveltekit-frontend/src/lib/components/ReportEditor.svelte`

**Features:**
- Title input
- Content textarea
- Save function
- Auto-save support

**Status:** Basic editor exists, needs enhancement

### 3. Evidence Canvas ✅
**Location:** `sveltekit-frontend/src/routes/evidence-canvas/+page.svelte`
**Component:** `sveltekit-frontend/src/lib/components/canvas/FabricCanvas.svelte`

**Features:**
- Interactive canvas with Fabric.js
- Evidence annotation
- AI-powered analysis

**Status:** Fully functional, just needs to be copied to case route

---

## Step 1: Wire Database (30 minutes)

### A. Move Schema to Proper Location

```bash
# Copy schema to lib/server/db
cp sveltekit-frontend/src_fixed/cases-schema.ts sveltekit-frontend/src/lib/server/db/schema.ts
```

### B. Create Database Connection

**File:** `sveltekit-frontend/src/lib/server/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/legal_ai';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### C. Update Intake Endpoint

**File:** `sveltekit-frontend/src/routes/api/intake/case/+server.ts`

Replace mock data with:

```typescript
import { db } from '$lib/server/db';
import { cases, personsOfInterest, casePersons, evidence } from '$lib/server/db/schema';

// In POST handler, replace mock with:
const caseRecord = await db.insert(cases).values({
  title: caseData.case_title,
  description: body.narrative,
  status: 'active',
  priority: caseData.severity,
  caseType: 'criminal',
  dateCreated: new Date(),
  dateModified: new Date()
}).returning();

const caseId = caseRecord[0].id;
```

### D. Update Case GET Endpoint

**File:** `sveltekit-frontend/src/routes/api/cases/[caseId]/+server.ts`

Replace mock with:

```typescript
import { db } from '$lib/server/db';
import { cases } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const caseData = await db.query.cases.findFirst({
    where: eq(cases.id, params.caseId),
    with: {
      evidence: true,
      timeline: true,
      citations: true,
      notes: true
    }
  });

  if (!caseData) {
    return json({ error: 'Case not found' }, { status: 404 });
  }

  return json(caseData);
};
```

---

## Step 2: Wire Evidence Board (30 minutes)

### A. Copy Evidence Canvas to Case Route

```bash
# Create evidence board route
mkdir -p sveltekit-frontend/src/routes/cases/[caseId]/evidence/board
cp sveltekit-frontend/src/routes/evidence-canvas/+page.svelte sveltekit-frontend/src/routes/cases/[caseId]/evidence/board/+page.svelte
```

### B. Update Evidence Board for Case Context

**File:** `sveltekit-frontend/src/routes/cases/[caseId]/evidence/board/+page.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import FabricCanvas from '$lib/components/canvas/FabricCanvas.svelte';

  let caseId = $derived($page.params.caseId);
  let evidence = $state<any[]>([]);

  async function loadEvidence() {
    const res = await fetch(`/api/cases/${caseId}/evidence`);
    if (res.ok) {
      evidence = await res.json();
    }
  }

  $effect(() => {
    if (caseId) {
      loadEvidence();
    }
  });
</script>

<div class="evidence-board">
  <header class="board-header">
    <h1>Evidence Board — Case #{caseId}</h1>
    <p>Drag evidence items onto the canvas to create connections</p>
  </header>

  <div class="board-layout">
    <aside class="evidence-sidebar">
      <h3>Evidence Items</h3>
      {#each evidence as item}
        <div class="evidence-item" draggable="true">
          {item.title}
        </div>
      {/each}
    </aside>

    <main class="canvas-area">
      <FabricCanvas />
    </main>
  </div>
</div>

<style>
  .evidence-board {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .board-header {
    padding: 1rem 2rem;
    background: var(--yorha-paper);
    border-bottom: 2px solid var(--yorha-ink);
  }

  .board-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .evidence-sidebar {
    width: 250px;
    background: var(--yorha-panel);
    border-right: 2px solid var(--yorha-ink);
    padding: 1rem;
    overflow-y: auto;
  }

  .evidence-item {
    padding: 0.75rem;
    background: var(--yorha-paper);
    border: 1px solid var(--yorha-ink);
    margin-bottom: 0.5rem;
    cursor: move;
  }

  .canvas-area {
    flex: 1;
  }
</style>
```

---

## Step 3: Enhance Report Editor with TipTap (1 hour)

### A. Install TipTap

```bash
cd sveltekit-frontend
npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder
```

### B. Create Enhanced Report Editor

**File:** `sveltekit-frontend/src/lib/components/TipTapEditor.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';

  let { content = $bindable(''), placeholder = 'Start writing...' } = $props();

  let editorElement: HTMLElement;
  let editor: Editor;

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        Link,
        Placeholder.configure({ placeholder })
      ],
      content,
      onUpdate: ({ editor }) => {
        content = editor.getHTML();
      }
    });

    return () => {
      editor?.destroy();
    };
  });

  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function toggleHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }
</script>

<div class="tiptap-editor">
  <div class="toolbar">
    <button onclick={toggleBold}>Bold</button>
    <button onclick={toggleItalic}>Italic</button>
    <button onclick={() => toggleHeading(1)}>H1</button>
    <button onclick={() => toggleHeading(2)}>H2</button>
    <button onclick={() => toggleHeading(3)}>H3</button>
  </div>

  <div bind:this={editorElement} class="editor-content"></div>
</div>

<style>
  .tiptap-editor {
    border: 2px solid var(--yorha-ink);
    border-radius: 4px;
    background: var(--yorha-paper);
  }

  .toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--yorha-ink);
    background: var(--yorha-panel);
  }

  .toolbar button {
    padding: 0.5rem 1rem;
    background: var(--yorha-paper);
    border: 1px solid var(--yorha-ink);
    border-radius: 3px;
    cursor: pointer;
  }

  .toolbar button:hover {
    background: var(--yorha-crimson);
    color: white;
  }

  .editor-content {
    padding: 1.5rem;
    min-height: 400px;
  }

  :global(.ProseMirror) {
    outline: none;
  }

  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #999;
    pointer-events: none;
    height: 0;
  }
</style>
```

### C. Update Reports Tab to Use TipTap

**File:** `sveltekit-frontend/src/routes/cases/[caseId]/reports/+page.svelte`

Add import and replace textarea:

```svelte
<script lang="ts">
  import TipTapEditor from '$lib/components/TipTapEditor.svelte';

  let reportContent = $state('');
  let editingReport = $state<any>(null);

  function editReport(report: any) {
    editingReport = report;
    reportContent = report.content_html || '';
  }

  async function saveReport() {
    await fetch(`/api/reports/${editingReport.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_html: reportContent
      })
    });
  }
</script>

{#if editingReport}
  <div class="report-editor-modal">
    <div class="modal-header">
      <h2>{editingReport.title}</h2>
      <button onclick={() => editingReport = null}>✕</button>
    </div>

    <TipTapEditor bind:content={reportContent} />

    <div class="modal-actions">
      <button onclick={saveReport}>Save</button>
      <button onclick={() => editingReport = null}>Cancel</button>
    </div>
  </div>
{/if}
```

---

## Step 4: Create Missing API Endpoints (30 minutes)

### A. Case Persons Endpoint

**File:** `sveltekit-frontend/src/routes/api/cases/[caseId]/persons/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { personsOfInterest, casePersons } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const persons = await db.query.casePersons.findMany({
    where: eq(casePersons.caseId, params.caseId),
    with: {
      person: true
    }
  });

  return json(persons);
};
```

### B. Case Evidence Endpoint

**File:** `sveltekit-frontend/src/routes/api/cases/[caseId]/evidence/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { evidence } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const evidenceItems = await db.query.evidence.findMany({
    where: eq(evidence.caseId, params.caseId)
  });

  return json(evidenceItems);
};
```

### C. Case Reports Endpoint

**File:** `sveltekit-frontend/src/routes/api/cases/[caseId]/reports/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { caseNotes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const reports = await db.query.caseNotes.findMany({
    where: eq(caseNotes.caseId, params.caseId)
  });

  return json(reports);
};
```

---

## Step 5: Run Database Migrations (15 minutes)

### A. Create Drizzle Config

**File:** `sveltekit-frontend/drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/legal_ai'
  }
} satisfies Config;
```

### B. Generate and Run Migrations

```bash
# Generate migration
npx drizzle-kit generate:pg

# Run migration
npx drizzle-kit push:pg
```

---

## Quick Copy-Paste Commands

```bash
# 1. Copy schema
cp sveltekit-frontend/src_fixed/cases-schema.ts sveltekit-frontend/src/lib/server/db/schema.ts

# 2. Copy evidence board
mkdir -p sveltekit-frontend/src/routes/cases/[caseId]/evidence/board
cp sveltekit-frontend/src/routes/evidence-canvas/+page.svelte sveltekit-frontend/src/routes/cases/[caseId]/evidence/board/+page.svelte

# 3. Install TipTap
cd sveltekit-frontend
npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder

# 4. Run migrations
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# 5. Test
npm run dev:quic
```

---

## Testing Checklist

- [ ] Database connection works
- [ ] Case intake creates real database records
- [ ] Case overview loads from database
- [ ] Persons tab shows linked persons
- [ ] Evidence tab shows linked evidence
- [ ] Evidence board opens and displays canvas
- [ ] Reports tab shows case notes
- [ ] TipTap editor loads and saves
- [ ] PDF export works

---

## Success Criteria

When complete, you should be able to:

1. ✅ Fill intake form → Creates case in database
2. ✅ View case overview → Loads from database
3. ✅ Click Persons tab → Shows linked persons
4. ✅ Click Evidence tab → Shows evidence items
5. ✅ Click "Evidence Board" → Opens interactive canvas
6. ✅ Click Reports tab → Shows reports
7. ✅ Click "Generate Report" → Opens TipTap editor
8. ✅ Edit report → Saves to database
9. ✅ Export PDF → Downloads PDF file

---

## Files to Create/Update

### Create:
- [ ] `src/lib/server/db/index.ts`
- [ ] `src/lib/server/db/schema.ts` (copy from src_fixed)
- [ ] `src/lib/components/TipTapEditor.svelte`
- [ ] `src/routes/cases/[caseId]/evidence/board/+page.svelte`
- [ ] `src/routes/api/cases/[caseId]/persons/+server.ts`
- [ ] `src/routes/api/cases/[caseId]/evidence/+server.ts`
- [ ] `src/routes/api/cases/[caseId]/reports/+server.ts`
- [ ] `drizzle.config.ts`

### Update:
- [ ] `src/routes/api/intake/case/+server.ts` (add DB calls)
- [ ] `src/routes/api/cases/[caseId]/+server.ts` (add DB calls)
- [ ] `src/routes/cases/[caseId]/reports/+page.svelte` (add TipTap)

---

## Estimated Time

- Database wiring: 30 min
- Evidence board: 30 min
- TipTap integration: 1 hour
- API endpoints: 30 min
- Testing: 30 min

**Total: 3 hours**

---

**Status:** 🚀 **ALL COMPONENTS EXIST — JUST WIRE THEM TOGETHER** 🚀
