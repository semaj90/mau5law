# Svelte 5 Implementation Strategy Guide
## Complete Migration & API Integration Roadmap

**Date:** December 24, 2025
**Status:** Phase 78/79 Ready - Autonomous AI-Driven Migration
**Database:** PostgreSQL (`legal_ai_db`) - NOT CouchDB
**Target:** Svelte 5 Runes + UnoCSS + Bits-UI + Lucia v3

---

## 🎯 Executive Summary

This guide provides a complete implementation strategy for migrating the Legal AI application to Svelte 5 with:
- **Svelte 5 Runes** (`$state`, `$props`, `$derived`, `$effect`)
- **Modular API SSR** with SvelteKit load functions
- **UnoCSS Grid Layouts** for responsive design
- **Bits-UI Components** for headless accessible UI
- **Lucia v3 Authentication** with session management
- **PostgreSQL + Drizzle ORM** for data persistence
- **Gemma3-Legal RAG/KAG** for AI-powered code assistance

---

## 📦 Current State Analysis

### ✅ Completed
1. **Automated Svelte 5 Migration** - `npx sv migrate svelte-5` executed
2. **Event Handler Conversion Scripts** - Created `fix-svelte5-events.ps1` and `.mjs`
3. **UI Component Library** - `src/lib/components/ui/` with Button, Card, Badge, Input
4. **Database Configuration** - PostgreSQL verified, Lucia v3 helpers working
5. **Phase 78/79 Scripts** - Ready for autonomous fixing

### ⏳ Remaining Work
1. **Manual Migration Tasks** - 40+ files with `@migration-task` comments
2. **API Endpoint Creation** - `/api/cases`, `/api/reports`, `/api/persons`
3. **Project Odin Dashboard** - Reference implementation needed
4. **LLMs.txt Context** - Svelte 5-aware documentation for Gemma3-Legal
5. **LSP Configuration** - Svelte Language Server v5 setup
6. **Final Error Resolution** - Reduce from ~77k to <1k errors

---

## 🏗️ Architecture Blueprint

### 1. **Project Odin Dashboard** (Reference Implementation)

**Location:** `src/routes/odin/+page.svelte` + `+page.server.ts`

#### Server Load Function (`+page.server.ts`)
```typescript
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cases, personsOfInterest, reports } from '$lib/server/db/schema-postgres';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // 1. Lucia v3 Session Validation
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // 2. Parallel Data Fetching
  const [userCases, recentActivity, threatMetrics] = await Promise.all([
    db.select()
      .from(cases)
      .where(eq(cases.assignedAttorney, locals.user.id))
      .orderBy(desc(cases.updatedAt))
      .limit(10),

    db.select()
      .from(reports)
      .where(eq(reports.createdBy, locals.user.id))
      .orderBy(desc(reports.createdAt))
      .limit(5),

    db.select()
      .from(personsOfInterest)
      .where(eq(personsOfInterest.threatLevel, 'critical'))
      .limit(5)
  ]);

  return {
    user: {
      id: locals.user.id,
      username: locals.user.username,
      role: locals.user.role || 'INVESTIGATOR'
    },
    caseId: 'ODIN-8842-XC',
    stats: {
      activeCases: userCases.length,
      criticalThreats: threatMetrics.length,
      recentReports: recentActivity.length
    },
    cases: userCases,
    threats: threatMetrics,
    activity: recentActivity
  };
};
```

#### Svelte 5 Component (`+page.svelte`)
```svelte
<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { Separator } from 'bits-ui';
  import { Button, Card, Badge } from '$lib/components/ui';
  import type { PageData } from './$types';

  // Svelte 5 Props (replaces export let data)
  let { data }: { data: PageData } = $props();

  // Svelte 5 State
  let activeTab = $state<'overview' | 'evidence' | 'intercepts' | 'terminal'>('overview');
  let isScanning = $state(false);
  let selectedCase = $state<typeof data.cases[0] | null>(null);

  // Svelte 5 Derived State
  let userName = $derived(data.user.username.toUpperCase());
  let criticalCount = $derived(data.threats.filter(t => t.threatLevel === 'critical').length);

  // Svelte 5 Effects (replaces onMount)
  $effect(() => {
    console.log('Active tab changed:', activeTab);
  });

  // Event Handlers (Svelte 5 uses onclick not on:click)
  function runScan() {
    isScanning = true;
    fetch('/api/odin/scan', { method: 'POST' })
      .then(res => res.json())
      .finally(() => isScanning = false);
  }

  function selectCase(caseItem: typeof data.cases[0]) {
    selectedCase = caseItem;
  }
</script>

<!-- NES/Project Odin Theme Layout -->
<div class="min-h-screen bg-gray-900 text-gray-100">

  <!-- Header with UnoCSS -->
  <header class="border-b border-gray-800 bg-gray-950 px-6 py-4">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">PROJECT: ODIN</h1>
        <p class="text-sm text-gray-500">SUBJECT #8842-XC // {userName}</p>
      </div>

      <div class="flex items-center gap-4">
        <Badge variant="success">
          <span class="i-lucide-wifi w-4 h-4"></span>
          SYSTEM ONLINE
        </Badge>
        <Badge variant="info">SECURE CONNECTION</Badge>
      </div>
    </div>
  </header>

  <!-- Main Grid Layout (UnoCSS) -->
  <main class="grid grid-cols-12 gap-6 max-w-7xl mx-auto p-6">

    <!-- Left Sidebar (3 columns) -->
    <aside class="col-span-3 space-y-4">
      <Card variant="bordered">
        {#snippet header()}
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-gray-500">SUBJ_PROFILE</span>
            <span class="text-xs text-gray-600">V1.2</span>
          </div>
        {/snippet}

        <div class="flex flex-col items-center gap-4">
          <div class="w-32 h-32 rounded-full bg-gray-800 border-2 border-cyan-500/50 flex items-center justify-center">
            <span class="text-5xl">👤</span>
          </div>

          <div class="w-full space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">THREAT LVL</span>
              <span class="text-red-500 font-bold animate-pulse">CRITICAL</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">CLEARANCE</span>
              <span class="text-cyan-400">LEVEL 5</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">CASES</span>
              <span class="text-gray-100">{data.stats.activeCases}</span>
            </div>
          </div>
        </div>
      </Card>

      <Button
        onclick={runScan}
        disabled={isScanning}
        variant="primary"
        class="w-full"
      >
        {isScanning ? 'SCANNING...' : 'INITIATE DEEP SCAN'}
      </Button>
    </aside>

    <!-- Center Content (9 columns) -->
    <section class="col-span-9 space-y-4">

      <!-- Tab Navigation (UnoCSS Grid) -->
      <div class="grid grid-cols-4 gap-2">
        {#each ['overview', 'evidence', 'intercepts', 'terminal'] as tab}
          <Button
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onclick={() => activeTab = tab}
          >
            {tab.toUpperCase()}
          </Button>
        {/each}
      </div>

      <!-- Data Grid -->
      <Card variant="elevated" padding="none">
        {#snippet header()}
          <div class="grid grid-cols-4 gap-4 text-xs font-mono text-gray-500 uppercase">
            <span>Timestamp</span>
            <span>Case ID</span>
            <span>Status</span>
            <span>Priority</span>
          </div>
        {/snippet}

        <div class="divide-y divide-gray-800">
          {#each data.cases as caseItem}
            <button
              class="grid grid-cols-4 gap-4 p-4 hover:bg-gray-800/50 transition-colors text-left w-full"
              onclick={() => selectCase(caseItem)}
            >
              <span class="text-sm font-mono text-gray-500">
                {new Date(caseItem.createdAt).toLocaleDateString()}
              </span>
              <span class="text-sm text-cyan-400">{caseItem.title}</span>
              <Badge variant={caseItem.status === 'active' ? 'success' : 'warning'}>
                {caseItem.status}
              </Badge>
              <Badge variant={caseItem.priority === 'critical' ? 'danger' : 'default'}>
                {caseItem.priority}
              </Badge>
            </button>
          {/each}
        </div>
      </Card>
    </section>
  </main>
</div>

<!-- Selected Case Modal (using Bits-UI Dialog) -->
{#if selectedCase}
  <div
    class="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
    transition:fade
  >
    <Card variant="elevated" class="max-w-2xl w-full">
      {#snippet header()}
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">{selectedCase.title}</h2>
          <Button variant="ghost" onclick={() => selectedCase = null}>×</Button>
        </div>
      {/snippet}

      <div class="space-y-4">
        <p class="text-gray-400">{selectedCase.description}</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-sm text-gray-500">Status:</span>
            <Badge variant="success">{selectedCase.status}</Badge>
          </div>
          <div>
            <span class="text-sm text-gray-500">Priority:</span>
            <Badge variant="danger">{selectedCase.priority}</Badge>
          </div>
        </div>
      </div>
    </Card>
  </div>
{/if}
```

---

## 🔧 API Endpoint Implementation

### Cases API (`src/routes/api/cases/+server.ts`)
```typescript
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cases } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const limit = Number(url.searchParams.get('limit')) || 10;
  const offset = Number(url.searchParams.get('offset')) || 0;

  const userCases = await db.select()
    .from(cases)
    .where(eq(cases.assignedAttorney, locals.user.id))
    .limit(limit)
    .offset(offset);

  return json({
    success: true,
    data: userCases,
    count: userCases.length
  });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const newCase = await db.insert(cases).values({
    title: body.title,
    description: body.description,
    assignedAttorney: locals.user.id,
    status: 'pending',
    priority: body.priority || 'medium'
  }).returning();

  return json({ success: true, data: newCase[0] }, { status: 201 });
};
```

### Reports API (`src/routes/api/reports/+server.ts`)
```typescript
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reports } from '$lib/server/db/schema-postgres';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const caseId = url.searchParams.get('caseId');

  let query = db.select().from(reports);

  if (caseId) {
    query = query.where(eq(reports.caseId, Number(caseId)));
  } else {
    query = query.where(eq(reports.createdBy, locals.user.id));
  }

  const userReports = await query.orderBy(desc(reports.createdAt)).limit(20);

  return json({ success: true, data: userReports });
};
```

### Persons of Interest API (`src/routes/api/persons/+server.ts`)
```typescript
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { personsOfInterest } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const caseId = url.searchParams.get('caseId');

  if (!caseId) {
    throw error(400, 'caseId required');
  }

  const persons = await db.select()
    .from(personsOfInterest)
    .where(eq(personsOfInterest.caseId, Number(caseId)));

  return json({ success: true, data: persons });
};

### Ingestion API (`src/routes/api/ingest/+server.ts`)
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  // Handles Docling-258m, LangExtract, and Qdrant indexing
  // ...
};
```
```

---

## 🤖 Phase 78/79 Autonomous Fix Pipeline

### Step 1: Generate AI Patches
```bash
npm run phase79:engine
```
This runs `scripts/phase79-cognitive-engine.mjs` which:
- Analyzes TypeScript/Svelte errors
- Loads Svelte 5 context from `llms.txt`
- Generates AST-based fixes using Gemma3-Legal
- Outputs patches to `reports/cognitive-patches/`

### Step 2: Apply Patches Autonomously
```bash
npm run phase79:ultimate
```
This runs `scripts/phase79-cognitive-ultimate.mts` which:
- Validates patches with safety gates
- Applies fixes in batches
- Runs `npm run check:ultra-fast` after each batch
- Rolls back if errors increase

### Step 3: Manual Review
```bash
npm run check:ultra-fast
git diff
```

---

## 📚 LLMs.txt Context File

**Purpose:** Provide Gemma3-Legal with comprehensive Svelte 5 patterns for RAG/KAG-powered code generation.

**Location:** `llms.txt` (root directory)

**Contents:**
- Svelte 5 Runes syntax (`$state`, `$props`, `$derived`, `$effect`)
- Event handler migration (`on:click` → `onclick`)
- Component prop patterns (`export let` → `let { prop } = $props()`)
- UnoCSS utility classes for NES/Odin theme
- Bits-UI component usage
- Lucia v3 session patterns
- Drizzle ORM query examples
- API endpoint structures

---

## 🎓 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `llms.txt` with Svelte 5 context
- [ ] Implement Project Odin dashboard (`src/routes/odin/`)
- [ ] Create API endpoints (`/api/cases`, `/api/reports`, `/api/persons`)
- [ ] Configure Svelte Language Server for v5
- [ ] Run `npm install --force` for Svelte 5 dependencies

### Phase 2: Migration (Week 2)
- [ ] Review all `@migration-task` comments (40+ files)
- [ ] Fix manual migration tasks in `src.backup/routes/`
- [ ] Convert remaining `export let` to `$props()`
- [ ] Update all event handlers to Svelte 5 syntax
- [ ] Run Phase 79 autonomous pipeline

### Phase 3: Validation (Week 3)
- [ ] Reduce TypeScript errors from 77k to <5k
- [ ] Run full test suite (`npm run test`)
- [ ] Validate authentication flows
- [ ] Test API endpoints with Postman/Thunder Client
- [ ] Performance profiling

### Phase 4: Production (Week 4)
- [ ] Final error resolution (<100 errors)
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitor error rates

---

## 🔍 LSP Configuration (Svelte Language Server v5)

### VSCode Settings (`.vscode/settings.json`)
```json
{
  "svelte.enable-ts-plugin": true,
  "svelte.plugin.svelte.compilerWarnings": {
    "a11y-click-events-have-key-events": "ignore"
  },
  "svelte.plugin.svelte.defaultScriptLanguage": "ts",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### TypeScript Config (`tsconfig.json`)
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"],
  "exclude": ["node_modules", ".svelte-kit", "quarantined-routes", "sveltekit-evidence"]
}
```

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install --force

# 2. Run Svelte 5 migration (already done)
# npx sv migrate svelte-5

# 3. Generate AI patches
npm run phase79:engine

# 4. Apply patches autonomously
npm run phase79:ultimate

# 5. Validate changes
npm run check:ultra-fast

# 6. Run development server
npm run dev

# 7. Run tests
npm run test
```

---

## 📊 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| TypeScript Errors | ~77,000 | <100 | 🟡 In Progress |
| Svelte 5 Runes Usage | 20% | 95% | 🟡 In Progress |
| API Endpoints | 0/3 | 3/3 | 🔴 Not Started |
| Test Coverage | Unknown | >80% | 🔴 Not Started |
| Build Time | Unknown | <30s | ⚪ Pending |
| Page Load (Odin) | N/A | <500ms | ⚪ Pending |

---

## 🆘 Troubleshooting

### Issue: "Cannot find module '$lib/components/ui'"
**Solution:** Run `npm run check:ultra-fast` to regenerate `.svelte-kit/` types

### Issue: "Unexpected token 'export let'"
**Solution:** Convert to Svelte 5 `$props()`: `let { prop } = $props()`

### Issue: "on:click is not valid"
**Solution:** Change to `onclick` (no colon)

### Issue: Phase 79 fails with "ENOENT llms.txt"
**Solution:** Create `llms.txt` using the template in this guide

---

## 📝 Notes

- **Database:** PostgreSQL at `localhost:5432/legal_ai_db` (NOT CouchDB)
- **CouchDB References:** Found in `.env.phase76` are outdated/unused
- **Quarantined Folders:** Exclude from tsconfig if not needed
- **Phase 78 vs 79:** Phase 78 = suggestion engine, Phase 79 = autonomous application

---

**Last Updated:** 2025-12-24
**Maintained By:** AI Migration Team
**Next Review:** After Phase 79 completion
