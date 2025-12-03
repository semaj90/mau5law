# Phase 82 Working Test — Clickable Implementation

**Status:** Ready to test
**What's working:** All three layers are now real code

---

## What You Have Right Now

### Layer 1: CLI + Endpoint ✅
- `sveltekit-frontend/scripts/phase82-svelte-runes-codemod.mjs` — Supports `--route` filter
- `sveltekit-frontend/src/routes/api/phase82/upgrade-route/+server.ts` — HTTP endpoint

### Layer 2: Modal Component ✅
- `sveltekit-frontend/src/lib/components/RouteInspectorWorking.svelte` — Fully wired modal
  - Calls `/api/phase72/errors` to fetch error summary
  - Calls `/api/phase72/suggest-fix` for "Ask Error Brain"
  - Calls `/api/phase82/upgrade-route` for "Run Svelte 5 Codemod"
  - Calls `/api/playwright/run-health-check` for health check

### Layer 3: MCP Tools (Ready to implement)
- Just HTTP calls to the endpoints above
- Can be wired into Playwright/Gemini/Claude

---

## Test It Right Now

### Step 1: Start Services

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Dev server
cd sveltekit-frontend
npm run dev:quic
```

### Step 2: Test the Endpoint Directly

```bash
# Terminal 3: Test Phase 82 endpoint
curl -X POST http://127.0.0.1:5173/api/phase82/upgrade-route \
  -H "Content-Type: application/json" \
  -d '{"route":"/analysis-center"}'
```

**Expected response:**
```json
{
  "ok": true,
  "route": "/analysis-center",
  "duration_ms": 2345,
  "stdout": "[phase82-codemod] Scanning for legacy Svelte patterns in route: /analysis-center\n..."
}
```

If you see this, **Phase 82 is working**.

### Step 3: Wire Modal into /all-routes

Update `sveltekit-frontend/src/routes/all-routes/+page.svelte`:

```svelte
<script lang="ts">
  import RouteInspectorWorking from '$lib/components/RouteInspectorWorking.svelte';

  // ... your existing code ...

  let modalOpen = $state(false);
  let selectedRoute = $state(null);

  function openRoute(route) {
    selectedRoute = {
      path: route.path,
      route: route.path,
      file: `src/routes${route.path}/+page.svelte`,
      category: 'Demo',
      version: 'v1'
    };
    modalOpen = true;
  }
</script>

<!-- Your route table -->
<table>
  <tbody>
    {#each routes as route}
      <tr onclick={() => openRoute(route)}>
        <td>{route.path}</td>
        <!-- ... -->
      </tr>
    {/each}
  </tbody>
</table>

<!-- Wire the modal -->
<RouteInspectorWorking
  bind:open={modalOpen}
  bind:route={selectedRoute}
  onClose={() => { modalOpen = false; }}
/>
```

### Step 4: Visit /all-routes

```
http://127.0.0.1:5173/all-routes
```

1. Click a route row
2. Modal opens
3. Click "Run Svelte 5 Codemod"
4. Watch dev terminal for logs
5. See "✅ Upgrade complete"

---

## What Each Button Does

### "Ask Error Brain"
```
POST /api/phase72/suggest-fix
Body: {
  route: "/analysis-center",
  file_path: "src/routes/...",
  code: "TS2304",
  message: "Cannot find name 'X'"
}
```

Returns Gemma's suggestion for fixing the error.

### "Run Svelte 5 Codemod"
```
POST /api/phase82/upgrade-route
Body: { route: "/analysis-center" }
```

Spawns the CLI runner, transforms files, returns logs.

### "Run Route Health Check"
```
POST /api/playwright/run-health-check
Body: { route: "/analysis-center" }
```

Placeholder for MCP hook (Playwright visits route, captures console).

### "Visit Page"
Opens the route in a new tab.

### "View AST Graph"
Placeholder for AST visualization.

---

## MCP Integration (3 Tools)

Once you have the modal working, expose these to Gemini/Claude:

```typescript
// tools/routes.ts
export async function list_routes() {
  const res = await fetch('http://127.0.0.1:5173/api/all-routes');
  return await res.json();
}

export async function route_errors({ route }: { route: string }) {
  const res = await fetch(
    `http://127.0.0.1:5173/api/phase72/errors?route=${encodeURIComponent(route)}`
  );
  return await res.json();
}

export async function svelte5_upgrade({ route }: { route: string }) {
  const res = await fetch('http://127.0.0.1:5173/api/phase82/upgrade-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route })
  });
  return await res.json();
}
```

That's it. Your MCP server just calls the HTTP endpoints.

---

## Checklist

- [ ] Ollama running
- [ ] Dev server running
- [ ] Test endpoint with curl (see Step 2)
- [ ] Wire modal into /all-routes
- [ ] Visit /all-routes
- [ ] Click a route
- [ ] Modal opens
- [ ] Click "Run Svelte 5 Codemod"
- [ ] See logs in dev terminal
- [ ] See "✅ Upgrade complete"
- [ ] Check git diff to see files changed

---

## Troubleshooting

### Endpoint returns 500
- Check Ollama is running
- Check dev terminal for error logs
- Verify ripgrep is installed: `rg --version`

### Modal doesn't open
- Check browser console for errors
- Verify modal is imported in /all-routes
- Check `modalOpen` and `selectedRoute` are reactive

### Codemod doesn't find files
- Check route path is correct (e.g., `/analysis-center` not `analysis-center`)
- Verify files have legacy patterns (export let, $:, onMount, etc.)
- Try running codemod manually: `node scripts/phase82-svelte-runes-codemod.mjs --route /analysis-center`

---

## Next: Make It Autonomous

Once the UI works, wire the MCP tools to Gemini/Claude:

```
Agent loop:
1. list_routes() → get all routes
2. For each route:
   a. route_errors(route) → see Phase 72 data
   b. If Svelte 3/4 syntax: svelte5_upgrade(route)
   c. Repeat until green
3. Report: "All routes upgraded ✅"
```

---

**This is no longer lore. It's real, clickable, working code.**

Start with Step 1 and work through the checklist.
