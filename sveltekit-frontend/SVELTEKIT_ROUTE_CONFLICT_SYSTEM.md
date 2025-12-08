# SvelteKit 2 Route Conflict Resolution System

## Overview

This document describes the **automated SvelteKit 2 route conflict detection and resolution system** that prevents ghost pages, duplicate routes, and confusing URL mappings.

## The Problem (P-387 Saga)

In SvelteKit 2, route groups like `(app)`, `(yorha)`, `(demo)` are **container names that don't affect URLs**:

```
src/routes/(app)/evidence/+page.svelte    → /evidence ✓
src/routes/(yorha)/evidence/+page.svelte  → /evidence ✗ CONFLICT!
```

Both normalize to the same URL, causing SvelteKit to error out. Additionally:

- Dynamic params like `[caseId]` vs `[id]` create subtle conflicts:
  ```
  src/routes/api/evidence/[id]/+server.ts     → /api/evidence/[id]
  src/routes/api/evidence/[caseId]/+server.ts → /api/evidence/[id] (after normalization)
  ```

- Legacy demo/experimental routes from previous phases (like `(yorha)`) pile up without a clean disabling mechanism

- Manual renaming gets tedious and error-prone

## The Solution

We've implemented a **3-part automated system**:

### 1. **llm.txt** – Routing Rules (Readable Config)

Create `llm.txt` in your `sveltekit-frontend` root:

```
# Which route group is canonical (wins conflicts)?
CANONICAL_GROUP=(app)

# Which group(s) should lose in a conflict? (legacy demos)
DISABLE_GROUP=(yorha)
DISABLE_GROUP=(demo)

# Which dynamic param is canonical?
CANONICAL_PARAM=[id]

# Which param names are legacy aliases?
DISABLE_PARAM=[caseId]
DISABLE_PARAM=[slug]
```

This is **human-readable** and **machine-parseable**. Add more lines as you introduce new legacy groups/params.

### 2. **scripts/fix-sveltekit-routes.mts** – The Fixer Script

TypeScript script (run via tsx) that:

1. **Walks** `src/routes/**` to find all route files
2. **Normalizes** URLs (treats `[id]`, `[caseId]`, `[slug]` as equivalent)
3. **Groups** by normalized URL to find conflicts
4. **Checks rules** to decide which directories to disable
5. **Renames** conflicting routes: `src/routes/(yorha)/evidence` → `src/routes/(yorha)_disabled/evidence`
6. **Runs** `npx svelte-check` to confirm SvelteKit is happy

**Output example:**

```
🔍 Scanning SvelteKit routes under src/routes...

📖 Routing rules:
  • canonicalGroup = (app)
  • disabledGroups = (yorha), (demo)
  • canonicalParam = [id]
  • disabledParams = [caseId], [slug], [uuid]

📊 Found 1505 route files

🔁 Conflict on /api/evidence:
   • [group=(app)] +server.ts :: src/routes/(app)/api/evidence/+server.ts
   • [group=(yorha)] +server.ts :: src/routes/(yorha)/api/evidence/+server.ts

⚙️  Applying route disables:
   ✔️  src/routes/(yorha)/api/evidence → src/routes/(yorha)_disabled/api/evidence

✅ Route dirs disabled. Running svelte-check...
✅ svelte-check passed!
```

### 3. **VS Code Task** – One-Click Execution

Added to `.vscode/tasks.json`:

```json
{
  "label": "🔧 Fix SvelteKit route conflicts",
  "type": "shell",
  "command": "npx",
  "args": ["tsx", "scripts/fix-sveltekit-routes.mts"],
  "options": {
    "cwd": "${workspaceFolder}/sveltekit-frontend"
  },
  "group": { "kind": "build", "isDefault": false },
  "detail": "Scan SvelteKit 2 routes, detect conflicts, disable legacy groups per llm.txt"
}
```

**Run with:**

```
Ctrl+Shift+P → "Fix SvelteKit route conflicts"
```

Or from terminal:

```bash
node scripts/fix-sveltekit-routes.mjs
```

## How It Works

### Route Normalization

```javascript
// Routes with different dynamic params normalize to the same shape
/cases/[id]      ← canonical
/cases/[caseId]  ← normalized to /cases/[id]
/cases/[uuid]    ← normalized to /cases/[id]
// → All three are treated as IDENTICAL for conflict detection
```

### Conflict Detection Algorithm

```
1. For each route file, extract:
   - Route group(s): (app), (yorha), etc.
   - Logical path: api/evidence/[id], etc.
   - URL: /api/evidence/[id]

2. Normalize URL: /api/evidence/[caseId] → /api/evidence/[id]

3. Group by normalized URL

4. For each group with multiple routes:
   - Check if any are in DISABLE_GROUP (from llm.txt)
   - Check if any use DISABLE_PARAM (from llm.txt)
   - Mark those for disabling

5. Rename marked directories: /path/to/route → /path/to/route_disabled
   (This removes them from SvelteKit's routing)

6. Run svelte-check to verify no errors
```

### Why "Disable" Instead of "Delete"?

We rename to `*_disabled` rather than deleting because:

- **Reversible:** Rename back if needed: `src/routes/(yorha)_disabled → src/routes/(yorha)`
- **Preserves code:** Useful for archiving, learning, or resurrecting old features
- **Clear intent:** `_disabled` signals "intentionally ignored by SvelteKit" to future devs
- **Audit trail:** Git will show the directory rename

## Use Cases

### Scenario 1: Multiple UI Skins (Old + New)

You have NES-style and beige-style command centers:

```
src/routes/(nes-old)/all-routes/+page.svelte
src/routes/(app)/all-routes/+page.svelte  ← canonical
```

**Solution:**

```
CANONICAL_GROUP=(app)
DISABLE_GROUP=(nes-old)
```

```bash
npm run fix:routes
# → src/routes/(nes-old)/all-routes becomes src/routes/(nes-old)_disabled/all-routes
```

### Scenario 2: Legacy Parameter Names

Old routes used `[caseId]`, new ones use `[id]`:

```
src/routes/api/cases/[caseId]/+server.ts  ← old
src/routes/api/cases/[id]/+server.ts      ← new
```

**Solution:**

```
CANONICAL_PARAM=[id]
DISABLE_PARAM=[caseId]
```

```bash
npm run fix:routes
# → src/routes/api/cases/[caseId] becomes src/routes/api/cases/[caseId]_disabled
```

### Scenario 3: Stacked Route Groups (No Conflict)

```
src/routes/(app)/+layout.svelte         ← OK, (app) group
src/routes/(ai)/assistant/+page.svelte  ← OK, different URL
src/routes/(auth)/login/+page.svelte    ← OK, different URL
```

**Result:** No conflicts detected. Script reports "✅ No conflicts found."

## Integration with Phase 78 + Phase 90

### Phase 78 (Error Brain Modal)

Routes like:

```
src/routes/(app)/phase78/monitor/+page.svelte
src/routes/(app)/phase78/routes/[routePath]/+page.svelte
```

Are in the canonical `(app)` group, so they **win** any conflicts with demo versions.

### Phase 90 (Shielded Autonomy)

The route fixer lets you safely park experimental routes:

```
src/routes/(experimental)/autonomous/+page.svelte
→ disabled if DISABLE_GROUP=(experimental)
→ Can re-enable by renaming back when ready
```

## Quick Start

### Step 1: Run the Fixer

```bash
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

# Using npm script (easiest)
npm run fix:routes

# Or via tsx directly
npx tsx scripts/fix-sveltekit-routes.mts
```

View conflict report and automatic resolution.

### Step 2: (Optional) Customize Rules

Edit `llm.txt` if you need different canonical groups or param names:

```
CANONICAL_GROUP=(app)
DISABLE_GROUP=(yorha)
DISABLE_GROUP=(experimental)
DISABLE_PARAM=[caseId]
DISABLE_PARAM=[deprecated_id]
```

### Step 3: Apply Fixes

```bash
# Via CLI
node scripts/fix-sveltekit-routes.mjs

# Via VS Code
Ctrl+Shift+P → "Fix SvelteKit route conflicts"
```

### Step 4: Verify

```bash
npm run dev
# Dev server should start without route conflicts
# Visit http://localhost:5173/all-routes
# Click routes to verify they load
```

## Reverting Changes

If the fixer disabled the wrong routes, you can revert:

```bash
# Git undo (recommended)
git checkout src/routes

# Or manually rename back
mv src/routes/(yorha)_disabled src/routes/(yorha)

# Then adjust llm.txt and run again
```

## Advanced: Manual Conflict Resolution

If the script misses something:

1. **Identify** the conflicting URLs:
   ```bash
   npx svelte-check --tsconfig tsconfig.check.json 2>&1 | grep "conflict"
   ```

2. **Locate** the conflicting files:
   ```bash
   find src/routes -name "+page.svelte" | xargs grep -l "relevant-keyword"
   ```

3. **Decide** which should be canonical (keep) vs disabled

4. **Update** `llm.txt` with the correct rules

5. **Re-run** the fixer:
   ```bash
   node scripts/fix-sveltekit-routes.mjs
   ```

## Files Involved

| File | Purpose |
|------|---------|
| `llm.txt` | Routing rules (canonical vs disabled groups/params) |
| `scripts/fix-sveltekit-routes.mjs` | The fixer script |
| `.vscode/tasks.json` | VS Code task for one-click execution |
| `src/routes/` | Your app's routes (gets scanned and auto-fixed) |

## Monitoring

The script outputs:

- **Count of route files** found
- **Conflicts detected** with before/after comparison
- **Directories disabled** with relative paths
- **svelte-check result** to confirm SvelteKit is happy

Successful run ends with: **✅ svelte-check passed!**

## FAQ

**Q: Will this delete my code?**
A: No. It renames directories to `*_disabled`, preserving all code. Easily reversible.

**Q: What if I need to re-enable a disabled route?**
A: Rename it back: `mv src/routes/(group)_disabled src/routes/(group)`

**Q: Can I have multiple DISABLE_GROUP entries?**
A: Yes, as many as you need:
```
DISABLE_GROUP=(yorha)
DISABLE_GROUP=(demo)
DISABLE_GROUP=(experimental)
```

**Q: What about nested conflicts?**
A: The script handles them by checking parent directory group names and logical paths.

**Q: Does this work on Windows?**
A: Yes! Uses Node.js built-ins (`fs.renameSync`, `path`), fully cross-platform.

## Next Steps

1. ✅ Review `llm.txt` rules (are they correct for your setup?)
2. ✅ Run the script to see conflict report
3. ✅ If issues found, update `llm.txt` and re-run
4. ✅ Verify dev server: `npm run dev`
5. ✅ Test routes in browser to confirm they load

---

**Built for Phase 78 + Phase 90 Legal AI Stack**
*"No more ghost pages, no more route conflicts."* 🎯
