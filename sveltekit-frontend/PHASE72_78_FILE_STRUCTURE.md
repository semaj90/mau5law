# Phase 72–78 Cutlass: File Structure & Implementation Map

## 📁 New/Modified Files Summary

```
sveltekit-frontend/
├── scripts/
│   ├── fix-sveltekit-routes.mts          ✅ NEW – TypeScript fixer
│   └── fix-sveltekit-routes.mjs          (old – keep for reference)
│
├── src/
│   ├── lib/
│   │   ├── phase78/
│   │   │   └── route-types.ts            ✅ NEW – Shared types
│   │   │
│   │   └── server/
│   │       └── db/
│   │           ├── schema-route-errors.ts ✅ NEW – Drizzle schema
│   │           ├── client.ts             (existing)
│   │           └── schema-postgres.ts    (existing)
│   │
│   └── routes/
│       └── api/
│           └── phase78/
│               ├── route-patch/
│               │   └── +server.ts        ✅ NEW – Get suggestions API
│               └── apply-patch/
│                   └── +server.ts        ✅ NEW – Mark applied API
│
├── llm.txt                              ✅ EXISTING – Routing config
├── package.json                         ✅ MODIFIED – Added "fix:routes"
│
├── PHASE72_78_IMPLEMENTATION_SUMMARY.md ✅ NEW – What was built
├── PHASE72_78_WINDOWS_SETUP.md          ✅ NEW – Setup guide
└── PHASE72_78_QUICK_REFERENCE.md        ✅ NEW – Quick ref card
```

---

## 🔗 File Dependencies & Data Flow

### Data Flow: Request → Processing → Response

```
Frontend (XState Machine)
  ↓
POST /api/phase78/route-patch {route, cluster}
  ↓
+server.ts (route-patch)
  ├─ Check db for cached suggestion
  ├─ If not cached: call generatePatchSuggestion()
  ├─ Insert into route_error_patches table
  └─ Return PatchSuggestion JSON
  ↓
Frontend (Bits-UI Modal)
  ├─ Display suggestion
  ├─ User clicks "Apply"
  └─ POST /api/phase78/apply-patch {route, patch}
  ↓
+server.ts (apply-patch)
  ├─ Update route_error_patches.applied = true
  ├─ Update route_error_patches.appliedAt
  └─ Return {ok: true}
  ↓
Frontend
  ├─ Close modal
  ├─ Invoke npm run fix:routes
  └─ Verify with svelte-check
```

---

## 📦 Type Dependencies

### Imports

```typescript
// Frontend (routeErrorAssistantMachine)
import type {
  RouteMeta,
  RouteErrorCluster,
  PatchSuggestion,
  ErrorAssistantState
} from '$lib/phase78/route-types';

// Backend (route-patch)
import type {
  RouteMeta,
  RouteErrorCluster,
  PatchSuggestion
} from '$lib/phase78/route-types';

import { routeErrorPatches } from '$lib/server/db/schema-route-errors';
```

---

## 🎯 Implementation Checklist

### Fixer Script (`fix-sveltekit-routes.mts`)

- ✅ Load rules from `llm.txt`
  - Reads `CANONICAL_GROUP`, `DISABLE_GROUP` lines
  - Reads `CANONICAL_PARAM`, `DISABLE_PARAM` lines
  - Defaults to `(app)` and `[id]`

- ✅ Walk routes directory
  - Recursively finds all `+page.svelte`, `+layout.svelte`, `+server.ts`
  - Extracts route group, path, kind
  - Normalizes dynamic params (`[caseId]` → `[id]`)

- ✅ Find conflicts
  - Groups routes by normalized URL
  - Detects when multiple groups map to same URL
  - Reports conflicts

- ✅ Apply rules
  - For each conflict, checks if any route is in `DISABLE_GROUP`
  - Checks if any route uses `DISABLE_PARAM`
  - Marks for disabling

- ✅ Rename directories
  - Renames `src/routes/(yorha)` → `src/routes/(yorha)_disabled`
  - Preserves code (not deleted, fully reversible)

- ✅ Verify
  - Runs `npx svelte-check --tsconfig tsconfig.check.json`
  - Reports success/failure

### Shared Types (`route-types.ts`)

- ✅ `RouteMeta` – Route identity & metadata
- ✅ `RouteErrorCluster` – Error signature
- ✅ `PatchSuggestion` – Fix recommendation
- ✅ `ErrorAssistantState` – XState machine state

### Database Schema (`schema-route-errors.ts`)

- ✅ `routeErrorPatches` table
  - Primary key: `id` (UUID)
  - Route identity: `routeId`, `routePath`, `routeFile`, `routeKind`, `routeGroup`
  - Error identity: `errorCode`, `errorTool`
  - Suggestion: `patchTitle`, `patchText`, `patchExplanation`
  - Metadata: `confidence`, `hints`, `applied`, `appliedAt`, `createdAt`

### API Endpoints

#### Route Patch (`route-patch/+server.ts`)

- ✅ POST handler
- ✅ Accept `{route, cluster}` payload
- ✅ Query existing patches from DB
- ✅ Generate new suggestion if not cached
- ✅ Insert to `route_error_patches`
- ✅ Return `PatchSuggestion` JSON
- ✅ Error handling (400 for missing payload, 500 for errors)

#### Apply Patch (`apply-patch/+server.ts`)

- ✅ POST handler
- ✅ Accept `{route, patch}` payload
- ✅ Update `route_error_patches.applied = true`
- ✅ Set `appliedAt` timestamp
- ✅ Return `{ok: true}` or error
- ✅ Placeholder for future: filesystem patching, svelte-check

### Configuration

#### `llm.txt`

- ✅ Current rules loaded
- ✅ Multiple `DISABLE_GROUP` entries
- ✅ Multiple `DISABLE_PARAM` entries
- ✅ Human-readable format

#### `package.json`

- ✅ Added script: `"fix:routes": "tsx scripts/fix-sveltekit-routes.mts"`

---

## 🔍 Key Integration Points

### 1. Frontend → Backend

Your `routeErrorAssistantMachine` will:

```typescript
// In ANALYZE state:
const route = extractRouteMetadata(error);

// In GET_SUGGESTION state:
const suggestion = await fetchSuggestion(route, cluster);

// In SHOW_MODAL state:
showBitsUIModal(suggestion);

// In APPLY_PATCH state:
await applySuggestion(route, suggestion);
```

### 2. Backend → Database

The `/api/phase78/route-patch` endpoint:

```typescript
// Check cache
const existing = db.select().from(routeErrorPatches)
  .where(eq(routeErrorPatches.routeId, route.id))
  .orderBy(desc(routeErrorPatches.createdAt))
  .limit(1);

// Insert new patch
db.insert(routeErrorPatches).values({...});

// Return to frontend
return json(suggestion);
```

### 3. Fixer → Routes

When user runs `npm run fix:routes`:

```bash
1. Load rules from llm.txt
2. Scan src/routes/** (1507 files found)
3. Detect conflicts (62 found)
4. Rename dirs (e.g., src/routes/(yorha) → *_disabled)
5. Run svelte-check to verify
```

---

## 📊 Database Schema Details

### `route_error_patches` Table

```sql
CREATE TABLE route_error_patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Route identity
  route_id text NOT NULL,
  route_path text NOT NULL,
  route_file text NOT NULL,
  route_kind text NOT NULL,        -- 'page' | 'layout' | 'server'
  route_group text,                -- '(app)' | '(yorha)' | etc.

  -- Error identity
  error_code text NOT NULL,        -- TS1005, SVELTE_CONFLICT, etc.
  error_tool text NOT NULL,        -- 'svelte-check', 'vite', 'tsc', etc.

  -- Suggestion
  patch_title text NOT NULL,
  patch_text text NOT NULL,
  patch_explanation text NOT NULL,

  -- Metadata
  confidence text DEFAULT '0.5' NOT NULL,  -- stored as text for portability
  hints jsonb DEFAULT '[]',                -- array of hint strings

  -- Application tracking
  applied boolean DEFAULT false NOT NULL,
  applied_at timestamp with time zone,

  -- Audit
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

---

## 🧪 Testing the System

### 1. Test Fixer

```powershell
cd sveltekit-frontend

# Should detect 62 conflicts in current codebase
npm run fix:routes
```

Expected output:
```
🔍 Scanning SvelteKit routes under src/routes...
📊 Found 1507 route files
[WARN] Found 62 route conflict(s)
```

### 2. Test Database

```powershell
# Generate migration
npx drizzle-kit generate

# Apply it
npm run db:migrate

# Query from PostgreSQL
SELECT COUNT(*) FROM route_error_patches;
```

### 3. Test API

```powershell
# Start dev server
npm run dev

# In another terminal:
curl -X POST http://localhost:5173/api/phase78/route-patch \
  -H "Content-Type: application/json" \
  -d '{
    "route": {
      "id": "test:route:1",
      "path": "/test",
      "file": "src/routes/(app)/test/+page.svelte",
      "kind": "page",
      "group": "(app)"
    },
    "cluster": {
      "routeId": "test:route:1",
      "errorCode": "TEST_ERROR",
      "message": "Test error",
      "tool": "custom",
      "lastSeen": "2024-12-07T10:00:00Z"
    }
  }'

# Should return PatchSuggestion JSON
```

---

## 🚀 Deployment Steps

### Dev Environment (Windows)

1. ✅ **Install dependencies**
   ```powershell
   npm install --save-dev tsx
   ```

2. ✅ **Create files** (already done)
   - ✅ `fix-sveltekit-routes.mts`
   - ✅ `route-types.ts`
   - ✅ `schema-route-errors.ts`
   - ✅ API endpoints

3. ⏳ **Database migration** (when ready)
   ```powershell
   npx drizzle-kit generate
   npm run db:migrate
   ```

4. ⏳ **Test**
   ```powershell
   npm run fix:routes
   npm run dev
   ```

5. ⏳ **Wire up modal** (in your routeErrorAssistantMachine)
   - Call `/api/phase78/route-patch`
   - Display suggestion in bits-ui Dialog
   - Call `/api/phase78/apply-patch` when user confirms

---

## 📋 Maintenance Notes

### When Adding New Routes

```powershell
# After adding routes:
npm run fix:routes

# If conflicts detected:
# 1. Review llm.txt rules
# 2. Edit if needed
# 3. Re-run
# 4. Verify: npm run dev
```

### When Updating llm.txt

```powershell
# Edit llm.txt (add/remove DISABLE_GROUP or DISABLE_PARAM)
# Re-run fixer
npm run fix:routes

# Verify changes
npm run dev
```

### When Reverting Disabled Routes

```powershell
# If you want to re-enable a disabled route:
mv src/routes\(group)_disabled src/routes\(group)

# Or with Git:
git checkout src/routes/(group)

# Then adjust llm.txt and re-run
npm run fix:routes
```

---

## 🎯 Architecture Summary

```
┌─────────────────────────────────────────┐
│  FRONTEND (XState Machine)              │
│  • Detects error on route               │
│  • Fetches suggestion from /api/phase78 │
│  • Shows bits-ui modal                  │
│  • User applies patch                   │
└─────────────┬───────────────────────────┘
              │
              ↓
    ┌─────────────────────┐
    │ /api/phase78 Endpoints
    │ • route-patch (GET) │
    │ • apply-patch (POST)│
    └─────────┬───────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  BACKEND (Drizzle + PostgreSQL)         │
│  • route_error_patches table            │
│  • KAG (Knowledge And Guidance) system  │
│  • Future: Gemma3 RAG integration       │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  CLI (fix-sveltekit-routes.mts)         │
│  • Scans routes                         │
│  • Applies llm.txt rules                │
│  • Disables conflicting dirs            │
│  • Verifies with svelte-check           │
└─────────────────────────────────────────┘
```

---

**Ready to integrate! 🚀**
