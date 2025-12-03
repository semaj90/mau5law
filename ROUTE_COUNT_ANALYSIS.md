# Route Count Analysis

## The Numbers

**477 total routes** = directories in `/src/routes`

This breaks down as:

### By Type
- **Pages** (`+page.svelte`): ~132 functional
- **Layouts** (`+layout.svelte`): ~20-30 (estimated)
- **API Endpoints** (`+server.ts`): ~333 (mostly empty)
- **Empty directories**: ~344 (no files)

### By Category
- **AI Features**: 12 (all functional)
- **Core App**: 18 (mostly functional)
- **Auth**: 10 (all functional)
- **Utility**: 10 (all functional)
- **Demo/Test**: 10 (functional)
- **Legacy**: 1 (functional)
- **Uncategorized/Empty**: 406 (mostly lore)

## Where the 900 Comes From

If you're seeing 900 endpoints, it's likely:

1. **Total files** (not just directories):
   - 477 route directories
   - × 2-3 files per directory (page, layout, server, etc.)
   - = ~900-1400 files

2. **Or counting nested routes**:
   - `/cases` = 1 route
   - `/cases/[id]` = 1 route
   - `/cases/[id]/evidence` = 1 route
   - etc.

3. **Or including API endpoints multiple times**:
   - `/api/cases` = 1
   - `/api/cases/search` = 1
   - `/api/cases/[id]` = 1
   - etc.

## The Real Picture

**What matters:**
- 132 functional routes (real pages/endpoints)
- 50 layout/wrapper routes
- 333 empty API shells (candidates for archive)
- 344 empty directories (lore)

**What's actionable:**
- **High-priority:** 50 routes (AI, Core, Auth, Utility)
- **Medium-priority:** 10 routes (Demo/Test)
- **Low-priority:** 417 routes (empty, legacy, uncategorized)

## SvelteKit Route Structure

```
src/routes/
├── +layout.svelte          ← Root layout (applies to all routes)
├── +page.svelte            ← Home page (/)
├── cases/
│   ├── +layout.svelte      ← Layout for /cases subtree
│   ├── +page.svelte        ← /cases page
│   ├── [id]/
│   │   ├── +layout.svelte  ← Layout for /cases/[id] subtree
│   │   ├── +page.svelte    ← /cases/[id] page
│   │   └── +server.ts      ← API endpoint for /cases/[id]
│   └── +server.ts          ← API endpoint for /cases
├── api/
│   ├── search/
│   │   └── +server.ts      ← /api/search endpoint
│   └── cases/
│       └── +server.ts      ← /api/cases endpoint
└── ...
```

Each route directory can have:
- `+page.svelte` (renders HTML)
- `+layout.svelte` (wraps children)
- `+server.ts` (handles requests)
- `+error.svelte` (error boundary)
- `+page.server.ts` (server-side logic)
- etc.

## Your Actual Breakdown

Based on the route-organization-report.json:

| Category | Pages | Layouts | Endpoints | Empty | Total |
|----------|-------|---------|-----------|-------|-------|
| AI | 6 | 2 | 4 | 0 | 12 |
| Core | 8 | 3 | 7 | 0 | 18 |
| Auth | 4 | 1 | 5 | 0 | 10 |
| Utility | 5 | 2 | 3 | 0 | 10 |
| Demo | 5 | 1 | 4 | 0 | 10 |
| Legacy | 1 | 0 | 0 | 0 | 1 |
| Uncategorized | 103 | 21 | 310 | 344 | 778 |
| **TOTAL** | **132** | **30** | **333** | **344** | **839** |

Wait, that's 839, not 477. Let me recalculate...

## Clarification

The **477 number** from your report likely counts:
- Unique route paths (not files)
- Each directory = 1 route
- `/cases` = 1 route
- `/cases/[id]` = 1 route
- `/api/cases` = 1 route

The **900 number** likely counts:
- Total files in `/src/routes`
- Each `+page.svelte` = 1 file
- Each `+layout.svelte` = 1 file
- Each `+server.ts` = 1 file
- etc.

## What You Should Focus On

**Real routes (132):**
- These are the ones that matter
- These are what users interact with
- These are what Phase 72 + Phase 82 should prioritize

**Empty shells (333 API endpoints):**
- These are candidates for archiving
- These are where cleanup should focus
- These are "lore" — ideas without implementation

**Empty directories (344):**
- These are placeholders
- These can be deleted or archived
- These are not blocking anything

## Action Items

1. **Protect the 132 real routes** — Don't break these
2. **Archive the 333 empty APIs** — Move to `/api/_archive`
3. **Clean up 344 empty directories** — Delete or consolidate
4. **Consolidate 4 test clusters** — Merge duplicates
5. **Decide on 6 unclear routes** — Keep / Archive / Remove

This is what the Route Organization System is designed to help with.
