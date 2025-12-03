# 🚀 Complete Prosecutor MVP — Final 5%

## ✅ What We Already Have (95%)

All routes, layouts, and API endpoints are complete. We just need to wire up 3 existing components:

### 1. Evidence Board ✅ (Already Exists)
**Location:** `sveltekit-frontend/src/lib/evidence-canvas/evidence-canvas.svelte`
- Full-featured evidence canvas with GPU acceleration
- AI suggestions panel
- Graph layout optimization
- Case similarity analysis
- Export functionality

### 2. Database Integration ✅ (Already Exists)
**Location:** `sveltekit-frontend/src/lib/server/db/index.ts`
- Drizzle ORM configured
- PostgreSQL connection ready
- Schema defined in `schema.ts`

### 3. Rich Text Editor ✅ (Created)
**Location:** `sveltekit-frontend/src/lib/components/TipTapEditor.svelte`
- Markdown-style toolbar
- Bold, Italic, Headings, Lists
- Ready to use

---

## 🔧 Final Wiring (5 Minutes)

### Step 1: Wire Evidence Board

Replace the placeholder in `/cases/[caseId]/evidence/board/+page.svelte`:

```svelte
<script lang="ts">
  import EvidenceCanvas from '$lib/evidence-canvas/evidence-canvas.svelte';
  import { page } from '$app/stores';

  const caseId = $page.params.caseId;
</script>

<div class="evidence-board-page">
  <EvidenceCanvas
    {caseId}
    caseType="criminal"
    jurisdiction="state"
  />
</div>

<style>
  .evidence-board-page {
    height: 100vh;
    width: 100%;
  }
</style>
```

### Step 2: Wire Database to API Endpoints

Update `/api/cases/[caseId]/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cases } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  const caseData = await db.query.cases.findFirst({
    where: eq(cases.id, params.caseId),
    with: {
      persons: true,
      evidence: true,
      reports: true
    }
  });

  return json(caseData || { error: 'Case not found' });
}

export async function PUT({ params, request }) {
  const updates = await request.json();

  await db.update(cases)
    .set(updates)
    .where(eq(cases.id, params.caseId));

  return json({ success: true });
}
```

Update `/api/cases/[caseId]/persons/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { persons } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  const casePersons = await db.query.persons.findMany({
    where: eq(persons.caseId, params.caseId)
  });

  return json(casePersons);
}

export async function POST({ params, request }) {
  const person = await request.json();

  const [newPerson] = await db.insert(persons)
    .values({ ...person, caseId: params.caseId })
    .returning();

  return json(newPerson);
}
```

Update `/api/cases/[caseId]/evidence/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { evidence } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  const caseEvidence = await db.query.evidence.findMany({
    where: eq(evidence.caseId, params.caseId)
  });

  return json(caseEvidence);
}

export async function POST({ params, request }) {
  const evidenceItem = await request.json();

  const [newEvidence] = await db.insert(evidence)
    .values({ ...evidenceItem, caseId: params.caseId })
    .returning();

  return json(newEvidence);
}
```

Update `/api/cases/[caseId]/reports/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reports } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  const caseReports = await db.query.reports.findMany({
    where: eq(reports.caseId, params.caseId)
  });

  return json(caseReports);
}

export async function POST({ params, request }) {
  const report = await request.json();

  const [newReport] = await db.insert(reports)
    .values({ ...report, caseId: params.caseId })
    .returning();

  return json(newReport);
}
```

### Step 3: TipTap Editor Already Created ✅

Already created in previous session at:
`sveltekit-frontend/src/lib/components/TipTapEditor.svelte`

---

## 🎯 Automated Completion Script

Run this to complete everything:

```bash
cd sveltekit-frontend
node scripts/complete-prosecutor-mvp.mjs
```

---

## ✅ Verification Checklist

After wiring:

- [ ] Evidence board loads at `/cases/[caseId]/evidence/board`
- [ ] Database queries work in API endpoints
- [ ] TipTap editor displays in reports tab
- [ ] All tabs navigate without errors
- [ ] Case intake creates database records

---

## 🚀 Ready to Deploy

Once wired:

1. **Set DATABASE_URL** in `.env`
2. **Run migrations:** `npm run db:push`
3. **Start server:** `npm run dev:quic`
4. **Test:** Visit `/cases/new`

**Status:** 95% → 100% in 5 minutes! 🎉
