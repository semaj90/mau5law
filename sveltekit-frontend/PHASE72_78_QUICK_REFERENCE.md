# Phase 72–78 Cutlass: Quick Reference Card

## 🚀 Run Route Fixer (Windows)

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

# Option 1: npm script (easiest)
npm run fix:routes

# Option 2: Direct tsx
npx tsx scripts/fix-sveltekit-routes.mts
```

**What it does:**
- ✅ Reads `llm.txt` rules (canonical groups, disabled groups, params)
- ✅ Scans `src/routes/**` (1507 route files found)
- ✅ Detects conflicts (62 conflicts found in current codebase)
- ✅ Applies rules to disable legacy routes
- ✅ Renames dirs to `*_disabled` (reversible)
- ✅ Runs `npx svelte-check` to verify

**If it fails:**
```powershell
# Close anything using routes
Stop-Process -Name node -Force
Stop-Process -Name code -Force

# Re-run
npm run fix:routes
```

---

## 🗄️ Database Setup (KAG/Knowledge System)

```powershell
# Generate migration from schema-route-errors.ts
npx drizzle-kit generate

# Apply migration to create route_error_patches table
npm run db:migrate
```

**What's stored:**
- Every route + error combination
- Suggested patches
- Whether patch was applied
- Confidence scores
- User hints

---

## 🔧 Backend Endpoints

### 1. GET Patch Suggestion
```bash
POST /api/phase78/route-patch

Request:
{
  "route": {
    "id": "route:app:evidence:page",
    "path": "/evidence",
    "file": "src/routes/(app)/evidence/+page.svelte",
    "kind": "page",
    "group": "(app)"
  },
  "cluster": {
    "routeId": "route:app:evidence:page",
    "errorCode": "SVELTE_ROUTE_CONFLICT",
    "message": "Conflict with (yorha) group",
    "tool": "svelte-check",
    "lastSeen": "2024-12-07T10:30:00Z"
  }
}

Response:
{
  "title": "Resolve SvelteKit route conflict",
  "severity": "error",
  "patch": "# Rename src/routes/(yorha) to src/routes/(yorha)_disabled",
  "explanation": "...",
  "confidence": 0.7,
  "hints": ["Run npm run fix:routes after...", ...]
}
```

### 2. Mark Patch Applied
```bash
POST /api/phase78/apply-patch

Request:
{
  "route": {...},
  "patch": "# patch content..."
}

Response:
{
  "ok": true,
  "message": "Marked patch applied"
}
```

---

## 📝 Configuration (llm.txt)

Current rules (edit as needed):

```
# Canonical group (wins conflicts)
CANONICAL_GROUP=(app)

# Legacy groups (lose conflicts, get *_disabled suffix)
DISABLE_GROUP=(yorha)
DISABLE_GROUP=(demo)
DISABLE_GROUP=(admin)
DISABLE_GROUP=(ai)
...

# Canonical param name
CANONICAL_PARAM=[id]

# Legacy param names
DISABLE_PARAM=[caseId]
DISABLE_PARAM=[slug]
DISABLE_PARAM=[uuid]
```

---

## 🎯 Workflow

### Add New Routes
```
1. Add routes under src/routes/(app)/myfeature/+page.svelte
2. Run: npm run fix:routes
3. Verify: npm run dev → http://localhost:5173
```

### Fix Conflicts Found by Fixer
```
1. Read the conflict report
2. Edit llm.txt if needed (change CANONICAL_GROUP, add DISABLE_GROUP)
3. Run: npm run fix:routes
4. Verify: npm run dev
```

### Revert a Disabled Route
```powershell
# If fixer disabled the wrong one:
mv src/routes\(group)_disabled src/routes\(group)

# Or with Git:
git checkout src/routes/(group)
```

---

## 📊 Shared Types

All in `src/lib/phase78/route-types.ts`:

```typescript
// Route identity
interface RouteMeta {
  id: string;         // e.g., "route:app:evidence:page"
  path: string;       // e.g., "/evidence"
  file: string;       // filesystem path
  kind: RouteKind;    // 'page' | 'layout' | 'server'
  group?: string;     // (app), (yorha), etc.
  hasLoad?: boolean;
  hasActions?: boolean;
  hasAiImports?: boolean;
  lastModified?: string;
}

// Error signature
interface RouteErrorCluster {
  routeId: string;
  errorCode: string;  // TS1005, SVELTE_CONFLICT, etc.
  message: string;
  stack?: string;
  tool: 'svelte-check' | 'vite' | 'tsc' | 'drizzle' | 'custom';
  lastSeen: string;
  rawLogSnippet?: string;
}

// Fix suggestion
interface PatchSuggestion {
  title: string;
  severity: 'info' | 'warning' | 'error';
  patch: string;              // actual patch content
  explanation: string;        // human-readable
  confidence: number;         // 0-1
  hints?: string[];          // tips for user
}
```

---

## 🔍 Verify Installation

```powershell
# 1. Check tsx
npx tsx --version
# Expected: tsx v4.20.6 (or similar)

# 2. Check script syntax
npx tsx scripts/fix-sveltekit-routes.mts
# Should output: 🔍 Scanning SvelteKit routes...

# 3. Check npm script
npm run fix:routes
# Same as above

# 4. Check database schema
ls src/lib/server/db/schema-route-errors.ts
# Should exist

# 5. Check API endpoints
ls src/routes/api/phase78/route-patch/+server.ts
ls src/routes/api/phase78/apply-patch/+server.ts
# Both should exist
```

---

## 📈 Monitor Results

```sql
-- PostgreSQL: See all route patches
SELECT
  route_path,
  error_tool,
  patch_title,
  confidence,
  applied,
  created_at
FROM route_error_patches
ORDER BY created_at DESC
LIMIT 20;

-- See applied patches only
SELECT * FROM route_error_patches
WHERE applied = true
ORDER BY applied_at DESC;

-- Count by error tool
SELECT error_tool, COUNT(*) as count
FROM route_error_patches
GROUP BY error_tool
ORDER BY count DESC;
```

---

## 🚨 Troubleshooting

| Error | Fix |
|-------|-----|
| `Unknown file extension ".mts"` | Install tsx: `npm install --save-dev tsx` |
| `EPERM: operation not permitted, rename` | Close dev server: `Stop-Process -Name node -Force` |
| `route_error_patches table doesn't exist` | Run: `npm run db:migrate` |
| `Must be owner of table` | Fix permission: `ALTER TABLE ... OWNER TO postgres;` |
| `Conflicts not disabled` | Check `llm.txt` is in root, edit, re-run |

---

## 📚 Documentation Files

- **PHASE72_78_IMPLEMENTATION_SUMMARY.md** – What was built & why
- **PHASE72_78_WINDOWS_SETUP.md** – Detailed step-by-step guide
- **PHASE72_78_QUICK_REFERENCE.md** – This file!
- **llm.txt** – Configuration (routing rules)
- **scripts/fix-sveltekit-routes.mts** – The fixer script

---

## 🎓 Architecture

```
OBSERVATION     MEMORY           CONTROL
────────────    ──────────       ────────
Phase 72 AST → route_error_  → routeError
              patches KAG     AssistantMachine
                           ↓
                      /all-routes
                     Command Center
                      bits-ui modal
```

---

## ⏭️ Next Phase

Phase 90 will use `route_error_patches` table to:
- Learn from past fixes
- Predict route issues before they happen
- Auto-optimize route structure
- Generate smart suggestions via Gemma3 RAG

---

**Quick start:** `npm run fix:routes` 🚀
