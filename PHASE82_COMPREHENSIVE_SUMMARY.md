# Phase 82: Svelte 5 Upgrade Brain — Comprehensive Summary

**Status:** Ready to integrate
**Scope:** Automated Svelte 3/4 → Svelte 5 runes migration
**Integration:** HTTP endpoint + CLI runner + MCP hooks

---

## 1. What Phase 82 Is

### The Problem
Your codebase has legacy Svelte patterns:
- `export let` (old props syntax)
- `$:` reactive labels
- `onMount`, `beforeUpdate`, `afterUpdate` lifecycle hooks
- `onDestroy` cleanup

Svelte 5 uses **runes** instead:
- `$props()` for reactive props
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects

### The Solution
Phase 82 = **Upgrade Brain**

It's an LLM-powered codemod that:
1. Scans your codebase for legacy patterns
2. Sends each file to an LLM (Gemma3 via Ollama)
3. Gets back Svelte 5 rune versions
4. Writes the upgraded files back to disk
5. Logs what changed (for audit trail)

**Key insight:** It's not a dumb regex replacer. It's a smart transformer that understands Svelte semantics.

---

## 2. The Architecture

### Three Pieces

#### A. LLM Transformer Endpoint
**File:** `src/routes/api/phase82/svelte-upgrade/+server.ts`

```
POST /api/phase82/svelte-upgrade
Body: { file_path: "src/routes/...", original: "..." }
Returns: { upgraded: "..." }
```

- Calls Ollama (gemma3-legal:latest by default)
- Sends a prompt with Svelte 5 rules
- Returns transformed code
- **Stateless** — each file is independent

#### B. CLI Codemod Runner
**File:** `scripts/phase82-svelte-runes-codemod.mjs`

```bash
node scripts/phase82-svelte-runes-codemod.mjs                # all files
node scripts/phase82-svelte-runes-codemod.mjs --route /cases # just /cases
```

- Uses ripgrep to find legacy patterns
- Calls the transformer endpoint for each file
- Writes upgraded code back to disk
- Logs results (success/failure)

#### C. Route-Level Upgrade Endpoint
**File:** `src/routes/api/phase82/upgrade-route/+server.ts` (NEW)

```
POST /api/phase82/upgrade-route
Body: { route: "/cases" }
Returns: { ok: boolean, duration_ms: number, stdout: string }
```

- Spawns the CLI runner with `--route` filter
- Runs in background (30s timeout)
- Returns logs + status
- **This is what the UI calls**

---

## 3. How It Fits With Phase 72 + MCP

### Phase 72 (Error Brain)
- **Watches:** Dev output, captures errors
- **Stores:** phase72_error table
- **Suggests:** Fix plans via LLM

### Phase 82 (Upgrade Brain)
- **Watches:** Codebase for legacy patterns
- **Transforms:** Old syntax → Svelte 5 runes
- **Writes:** Upgraded files back

### Together
```
Phase 72 detects error → suggests fix
  ↓
Fix might be "upgrade to Svelte 5"
  ↓
Phase 82 runs codemod
  ↓
Dev server rebuilds
  ↓
Phase 72 captures new errors (if any)
  ↓
Loop continues
```

### MCP Integration
Your MCP server exposes tools:

```json
{
  "tools": [
    {
      "name": "list_routes",
      "description": "Get all routes in the app"
    },
    {
      "name": "route_errors",
      "description": "Get Phase 72 errors for a route"
    },
    {
      "name": "svelte5_upgrade",
      "description": "Run Phase 82 codemod for a route"
    },
    {
      "name": "open_route",
      "description": "Visit route in Playwright, capture console"
    }
  ]
}
```

An LLM agent (Gemini, Claude) can then:
1. Call `list_routes` → get all routes
2. For each route:
   - Call `open_route` (Playwright) → check for errors
   - If errors: call `route_errors` → see Phase 72 data
   - If Svelte 3/4 syntax: call `svelte5_upgrade` → run codemod
3. Repeat until all routes are green

---

## 4. Caching & Embedding

### Caching
**Current:** None (every run transforms all files)

**Recommended:** Hash-based skip
```javascript
// Pseudo-code
const fileHash = sha256(source);
if (cache[filePath] === fileHash) {
  console.log('Skipping (already upgraded)');
  return;
}
// ... run codemod ...
cache[filePath] = newHash;
```

**Where to store cache:**
- Option A: `.phase82-cache.json` (simple, local)
- Option B: `phase82_upgrade` Postgres table (persistent, queryable)

### Embedding
**Current:** Not part of Phase 82

**Future (Phase 83):** Embed pre/post code
```
1. Read upgraded file
2. Compute embeddings with embeddinggemma
3. Store in Qdrant: "Svelte 5 migration patterns"
4. Enable search: "Show me all files that had export let converted"
```

---

## 5. The UI: Route Inspector Detective Board

### What It Does
Opens a modal when you click a route in `/all-routes`:

```
┌─────────────────────────────────────────────────────┐
│ 🎮 /CASES                                    [HEALTHY] │
├──────────────────────┬──────────────────────────────┤
│ ROUTE DOSSIER        │ DIAGNOSTICS & TOOLS          │
│                      │                              │
│ SUMMARY              │ PHASE 72 · ERROR BRAIN       │
│ Client-side page     │ ✅ No errors detected        │
│                      │                              │
│ METADATA             │ PHASE 82 · UPGRADE BRAIN     │
│ Category: Cases      │ ⭕ NOT STARTED               │
│ Version: v1          │ 1/1 files upgraded           │
│                      │ [🔄 Run Svelte 5 Codemod]   │
│ REQUIRED PACKAGES    │                              │
│ [svelte] [sveltekit] │                              │
│                      │                              │
│ RELATED ROUTES       │                              │
│ [/] [/cases/[id]]    │                              │
├──────────────────────┴──────────────────────────────┤
│ [→ Visit Page] [📊 View AST] [🏥 Health Check]     │
└──────────────────────────────────────────────────────┘
```

### Key Features
✅ **2-column layout** — dossier (left) + diagnostics (right)
✅ **Phase 72 integration** — shows error count, last error, "Ask Error Brain" button
✅ **Phase 82 integration** — shows upgrade status, "Run Svelte 5 Codemod" button
✅ **YoRHa aesthetic** — beige + crimson + neon green buttons
✅ **Action buttons** — Visit, AST Graph, Health Check, Error Brain, Codemod

---

## 6. Quick Start: Make It Real

### Step 1: Add --route filter to codemod script
✅ **DONE** — Updated `scripts/phase82-svelte-runes-codemod.mjs`

```bash
node scripts/phase82-svelte-runes-codemod.mjs --route /cases
```

### Step 2: Create route-level upgrade endpoint
✅ **DONE** — Created `src/routes/api/phase82/upgrade-route/+server.ts`

```
POST /api/phase82/upgrade-route
Body: { route: "/cases" }
```

### Step 3: Create enhanced Route Inspector Modal
✅ **DONE** — Created `src/lib/components/RouteInspectorDetectiveBoard.svelte`

- 2-column layout (dossier + diagnostics)
- Phase 72 + Phase 82 status cards
- Action buttons (Visit, AST, Health Check, Error Brain, Codemod)
- YoRHa theme (beige + crimson + neon)

### Step 4: Wire it into /all-routes
**TODO** — Update `/all-routes/+page.svelte` to use the new modal

```svelte
<script>
  import RouteInspectorDetectiveBoard from '$lib/components/RouteInspectorDetectiveBoard.svelte';
  let selectedRoute = $state(null);
  let modalOpen = $state(false);
</script>

<RouteInspectorDetectiveBoard bind:open={modalOpen} route={selectedRoute} />
```

### Step 5: Test it
```bash
cd sveltekit-frontend
npm run dev:quic
# Visit http://127.0.0.1:5173/all-routes
# Click a route card
# Click "Run Svelte 5 Codemod"
# Watch the magic happen
```

---

## 7. MCP Integration (For Agents)

### Expose These Tools

```python
# Pseudo-code for your MCP server

@tool
def list_routes():
    """Get all routes in the app"""
    res = requests.get('http://127.0.0.1:5173/api/all-routes')
    return res.json()

@tool
def route_errors(route: str):
    """Get Phase 72 errors for a route"""
    res = requests.get(f'http://127.0.0.1:5173/api/phase72/errors?route={route}')
    return res.json()

@tool
def svelte5_upgrade(route: str):
    """Run Phase 82 codemod for a route"""
    res = requests.post(
        'http://127.0.0.1:5173/api/phase82/upgrade-route',
        json={'route': route}
    )
    return res.json()

@tool
def open_route(route: str):
    """Visit route in Playwright, capture console"""
    # Use Playwright MCP to visit http://127.0.0.1:5173{route}
    # Capture console logs, screenshot
    # Return { console_logs, screenshot, errors }
```

### Agentic Loop

```
Agent (Gemini/Claude):
  1. list_routes() → get all routes
  2. For each route:
     a. open_route(route) → visit in Playwright
     b. If console errors:
        - route_errors(route) → see Phase 72 data
        - If Svelte 3/4 syntax: svelte5_upgrade(route)
     c. Wait for rebuild
     d. Repeat
  3. Report: "All routes green ✅"
```

---

## 8. File Structure

```
sveltekit-frontend/
├── scripts/
│   └── phase82-svelte-runes-codemod.mjs          ✅ Updated (--route filter)
├── src/
│   ├── lib/
│   │   └── components/
│   │       └── RouteInspectorDetectiveBoard.svelte  ✅ NEW
│   └── routes/
│       ├── all-routes/
│       │   └── +page.svelte                      ⏳ TODO: wire modal
│       └── api/
│           └── phase82/
│               ├── svelte-upgrade/
│               │   └── +server.ts                ✅ Existing
│               └── upgrade-route/
│                   └── +server.ts                ✅ NEW
```

---

## 9. Next Steps

### Immediate (30 min)
1. Update `/all-routes/+page.svelte` to import + use `RouteInspectorDetectiveBoard`
2. Test manually:
   - Visit `/all-routes`
   - Click a route card
   - Modal opens
   - Click "Run Svelte 5 Codemod"
   - Watch logs in dev terminal

### Short-term (1-2 hours)
1. Add hash-based caching to avoid re-running codemod on same files
2. Create `phase82_upgrade` Postgres table to log each run
3. Add "View diff" button to show what changed

### Medium-term (Phase 83)
1. Embed upgraded code with embeddinggemma
2. Enable semantic search: "Show me all Svelte 5 migrations"
3. Add rollback capability (restore from `.bak` files)

### Long-term (MCP Integration)
1. Expose tools to Gemini/Claude
2. Let agents autonomously upgrade routes
3. Combine with Phase 72 for full error → fix → verify loop

---

## 10. Key Takeaways

| Aspect | Details |
|--------|---------|
| **What** | LLM-powered Svelte 3/4 → 5 runes migration |
| **How** | CLI runner + HTTP endpoint + UI modal |
| **Where** | `scripts/phase82-*.mjs` + `/api/phase82/*` + Detective Board modal |
| **Why** | Automate tedious refactoring, enable agent-driven upgrades |
| **When** | Run manually via UI, or triggered by Phase 72 suggestions |
| **Who** | Humans (via /all-routes UI) or MCP agents (via tools) |
| **Cache** | Optional (hash-based skip recommended) |
| **Embed** | Future (Phase 83) |

---

**Status:** Ready to integrate
**Time to wire up:** 30 minutes
**Result:** Production-ready Svelte 5 upgrade system with human + agent control
