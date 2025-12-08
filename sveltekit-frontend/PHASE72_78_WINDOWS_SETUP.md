# Phase 72–78 Cutlass: Windows Setup Guide

## 🎯 Overview

This guide walks through the complete Phase 72–78 Cutlass setup on Windows 10/11 with Node 22:

1. **Fix SvelteKit route conflicts** automatically (`npm run fix:routes`)
2. **Backend route patch logging** with Drizzle 0.44 KAG system
3. **XState + Bits-UI modal** on the Command Center

---

## ✅ Step 1: Install `tsx` (TypeScript Runner)

The script is written in TypeScript (`.mts`), so we need `tsx` to execute it on Windows with Node 22.

### From PowerShell:

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

# Install tsx as a dev dependency
npm install --save-dev tsx
```

✅ This installs `tsx` locally. You can now run `.mts` files with `npx tsx` or `npm scripts`.

---

## ✅ Step 2: Verify the Script Structure

The new script is at:

```
sveltekit-frontend/scripts/fix-sveltekit-routes.mts
```

It:
- Reads rules from `llm.txt` (canonical groups, disabled groups, param aliases)
- Walks `src/routes/**` recursively
- Finds routes that normalize to the same URL (conflicts)
- Applies `llm.txt` rules to decide what to disable
- Renames conflicting directories to `*_disabled`
- Runs `npx svelte-check --tsconfig tsconfig.check.json`

---

## ✅ Step 3: Update `llm.txt` (Optional)

Your current `llm.txt` is already well-configured:

```
CANONICAL_GROUP=(app)

DISABLE_GROUP=(yorha)
DISABLE_GROUP=(demo)
DISABLE_GROUP=(admin)
DISABLE_GROUP=(ai)
DISABLE_GROUP=(auth)
DISABLE_GROUP=(dev)
DISABLE_GROUP=(evidence)
DISABLE_GROUP=(legal)
DISABLE_GROUP=(public)
DISABLE_GROUP=(tools)

CANONICAL_PARAM=[id]

DISABLE_PARAM=[caseId]
DISABLE_PARAM=[slug]
DISABLE_PARAM=[uuid]
```

If you need to add or remove groups/params, just edit `llm.txt` and re-run the fixer.

---

## ✅ Step 4: Run the Fixer

### Option A: From npm script (easiest)

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

npm run fix:routes
```

### Option B: Direct with tsx

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

npx tsx scripts/fix-sveltekit-routes.mts
```

### Expected Output

```
🔍 Scanning SvelteKit routes under src/routes...

📖 Routing rules:
  • canonicalGroup = (app)
  • disabledGroups = (yorha), (demo), (admin), (ai), ...
  • canonicalParam = [id]
  • disabledParams = [caseId], [slug], [uuid]

📊 Found 1505 route files

✅ No normalized route conflicts found.
```

Or if conflicts found:

```
🔁 Conflict on /api/evidence:
   • [group=(app)] +server.ts :: src/routes/(app)/api/evidence/+server.ts
   • [group=(yorha)] +server.ts :: src/routes/(yorha)/api/evidence/+server.ts

⚙️  Applying route disables:

   ✔️  src/routes/(yorha)/api/evidence → src/routes/(yorha)_disabled/api/evidence

✅ Route dirs disabled. Running svelte-check...

✅ svelte-check passed!
```

---

## ✅ Step 5: Database Setup (Drizzle Route Patch Logging)

The route patch system logs all suggestions and applied fixes to the database.

### 5.1 Create Migration

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

# Drizzle generates the migration from schema-route-errors.ts
npx drizzle-kit generate
```

This creates a migration in `src/lib/server/db/migrations/` that creates the `route_error_patches` table.

### 5.2 Apply Migration

```powershell
npm run db:migrate
```

If you get a PostgreSQL permission error ("must be owner"), run:

```sql
-- In PostgreSQL (as super user or owner):
ALTER TABLE evidence_vectors OWNER TO postgres;

-- Or for all tables:
SELECT 'ALTER TABLE "' || tablename || '" OWNER TO postgres;'
FROM pg_tables
WHERE schemaname = 'public';
```

---

## ✅ Step 6: Start the Dev Server

```powershell
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

npm run dev
```

Visit **http://localhost:5173/all-routes** to see the Command Center with the Error Brain modal.

---

## 🔧 Backend Integration: The Route Patch API

The backend now has two endpoints:

### 1. GET Route Patch Suggestion

**Endpoint:** `POST /api/phase78/route-patch`

**Request Body:**
```json
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
    "message": "Route group (yorha) conflicts with (app)",
    "tool": "svelte-check",
    "lastSeen": "2024-12-07T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "title": "Resolve SvelteKit route conflict",
  "severity": "error",
  "patch": "# Rename the legacy route group directory to disable conflicting routes\n# Example (PowerShell):\n#   mv \"src/routes/(yorha)\" \"src/routes/(yorha)_disabled\"\n# Or more generally, apply the rules from scripts/fix-sveltekit-routes.mts\n",
  "explanation": "This route lives in the legacy (yorha) group. To resolve a conflict with the canonical (app) group, we disable this route folder.",
  "confidence": 0.7,
  "hints": [
    "Run npm run fix:routes after applying changes.",
    "Use the Command Center /all-routes to verify conflicts are gone.",
    "Keep (app) as canonical; park (yorha)/(demo) as *_disabled."
  ]
}
```

### 2. Mark Patch as Applied

**Endpoint:** `POST /api/phase78/apply-patch`

**Request Body:**
```json
{
  "route": {
    "id": "route:app:evidence:page",
    "path": "/evidence",
    "file": "src/routes/(app)/evidence/+page.svelte",
    "kind": "page"
  },
  "patch": "# ... patch content ..."
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Marked patch for route /evidence as applied."
}
```

---

## 🧠 Frontend: XState Machine + Bits-UI Modal

Your `routeErrorAssistantMachine` in `src/routes/(app)/all-routes/+page.svelte` now:

1. **ANALYZE** – Get route metadata and error cluster
2. **GET_SUGGESTION** – Call `/api/phase78/route-patch`
3. **SHOW_MODAL** – Display bits-ui Dialog with suggestion
4. **APPLY_PATCH** – Call `/api/phase78/apply-patch` (manual for now)
5. **VERIFY** – Re-run `npm run fix:routes` and check

---

## 📊 Knowledge & Guidance (KAG) System

The `route_error_patches` table stores:

| Column | Purpose |
|--------|---------|
| `id` | Unique patch ID (UUID) |
| `routeId` | Which route (e.g., `route:app:evidence:page`) |
| `errorCode` | Error signature (e.g., `SVELTE_ROUTE_CONFLICT`) |
| `patchTitle` | Human-readable title |
| `patchText` | The actual patch/suggestion |
| `patchExplanation` | Why this patch helps |
| `confidence` | 0.0–1.0 score |
| `hints` | Array of tips for the user |
| `applied` | Boolean: was this patch applied? |
| `appliedAt` | Timestamp when applied |
| `createdAt` | When suggestion was first created |

Future enhancements:
- **Gemma3 RAG** reads this table to improve suggestions
- **Feedback loop** – if user says "this didn't work," we log that
- **Pattern mining** – cluster similar route errors across codebase

---

## 🚀 Common Workflows

### Run the Fixer Every Time You Add Routes

```powershell
npm run fix:routes
```

### Check for Conflicts Without Fixing

```powershell
npx tsx scripts/fix-sveltekit-routes.mts
# (will print conflicts but not rename dirs in the future – TBD)
```

### Manually Revert a Disabled Route

If the fixer disabled the wrong folder:

```powershell
# PowerShell
mv src/routes\(group)_disabled src/routes\(group)

# Or use Git
git checkout src/routes/(group)
```

Then edit `llm.txt` and re-run.

### Monitor Patch History

```sql
-- PostgreSQL
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
```

---

## ✅ Verification Checklist

- [ ] `tsx` installed: `npm list tsx`
- [ ] Script exists: `ls scripts/fix-sveltekit-routes.mts`
- [ ] npm script added: `npm run fix:routes` (without error)
- [ ] Database migration created: `npx drizzle-kit generate`
- [ ] Migration applied: `npm run db:migrate`
- [ ] Dev server running: `npm run dev`
- [ ] Command Center loads: http://localhost:5173/all-routes
- [ ] Error Brain modal wired: Bits-UI Dialog visible

---

## 🆘 Troubleshooting

### Error: `Unknown file extension ".mts"`

**Cause:** `tsx` not installed or not found.

**Fix:**
```powershell
npm install --save-dev tsx
npx tsx scripts/fix-sveltekit-routes.mts
```

### Error: Database table doesn't exist

**Cause:** Migration not applied.

**Fix:**
```powershell
npx drizzle-kit generate
npm run db:migrate
```

### Error: "must be owner" on `evidence_vectors` table

**Cause:** PostgreSQL permission issue (unrelated to new route system).

**Fix:**
```sql
ALTER TABLE evidence_vectors OWNER TO postgres;
```

### Routes not being disabled

**Cause:** `llm.txt` rules don't match your route structure.

**Solution:**
1. Check `llm.txt` is in the right place: `sveltekit-frontend/llm.txt`
2. Verify group names match your actual route groups: `src/routes/(app)`, `src/routes/(yorha)`, etc.
3. Re-run fixer with verbose logging (TBD feature)

---

## 🎯 Next Steps

1. ✅ Run `npm run fix:routes` to scan and fix any conflicts
2. ✅ Verify dev server and Command Center
3. ✅ Test the Error Brain modal with a sample route error
4. 🔄 Later: Integrate Gemma3 RAG for smarter patch suggestions
5. 🔄 Later: Auto-apply patches with confirmation
6. 🔄 Later: Stream fix progress to frontend

---

**Built for Phase 72–78 Cutlass Legal AI Stack**
*"No more ghost pages. No more manual route fixes."* 🎯
