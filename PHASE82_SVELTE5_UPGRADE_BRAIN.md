# Phase 82: Svelte 5 Upgrade Brain

**Goal:** Autonomous Svelte 5 runes migration using LLM + ripgrep + Playwright
**Status:** Ready to implement
**Scope:** Codemod endpoint + Node runner + MCP integration

---

## Architecture

```
Phase 72 Error Brain (existing)
    ↓
Phase 82 Upgrade Brain (new)
    ├─ /api/phase82/svelte-upgrade (LLM codemod)
    ├─ scripts/phase82-svelte-runes-codemod.mjs (ripgrep + apply)
    └─ Playwright MCP tools (validation)
    ↓
/all-routes Dashboard (control panel)
    ├─ View errors (Phase 72)
    ├─ Suggest fix (Phase 78)
    ├─ Run codemod (Phase 82)
    └─ Validate (Playwright)
```

---

## Components

### 1. Codemod Endpoint: `/api/phase82/svelte-upgrade`

**File:** `src/routes/api/phase82/svelte-upgrade/+server.ts`

**Input:**
```json
{
  "file_path": "src/routes/cases/+page.svelte",
  "original": "<script>\n  export let caseId;\n  let filter = '';\n  $: filtered = cases.filter(...);\n</script>"
}
```

**Output:**
```json
{
  "upgraded": "<script>\n  const { caseId } = $props();\n  let filter = $state('');\n  const filtered = $derived(cases.filter(...));\n</script>"
}
```

**How it works:**
1. Takes original Svelte file content
2. Sends to Ollama (gemma3-legal) with codemod prompt
3. Returns upgraded Svelte 5 code
4. Strips markdown fences if model wrapped it

### 2. Codemod Runner: `scripts/phase82-svelte-runes-codemod.mjs`

**File:** `sveltekit-frontend/scripts/phase82-svelte-runes-codemod.mjs`

**Usage:**
```powershell
npm run phase82:svelte5-codemod
```

**How it works:**
1. Uses ripgrep to find files with legacy patterns:
   - `export let ` (old props)
   - `$:` (reactive labels)
   - `onMount(`, `beforeUpdate(`, `afterUpdate(`, `onDestroy(` (lifecycle)
2. For each file, calls `/api/phase82/svelte-upgrade`
3. Writes upgraded code back to disk
4. Reports: upgraded count + failed count

**Example output:**
```
[phase82-codemod] Scanning for legacy Svelte patterns...
[phase82-codemod] Found 12 candidate files.

[phase82-codemod] Upgrading src/routes/cases/+page.svelte...
[phase82-codemod] ✏️  Writing upgraded src/routes/cases/+page.svelte
[phase82-codemod] Upgrading src/lib/components/Card.svelte...
[phase82-codemod] ✏️  Writing upgraded src/lib/components/Card.svelte
...

[phase82-codemod] Done. Upgraded: 12, Failed: 0
```

### 3. Integration with Phase 72 Error Brain

After codemod runs, any HMR errors are still captured:

```
npm run dev:quic
    ↓
Codemod changes files
    ↓
Vite recompiles
    ↓
If error: phase72-dev-wrapper.mjs captures it
    ↓
/api/phase72/suggest-fix provides fix
    ↓
Error logged in phase72_error
```

This creates a feedback loop: codemod → error → suggestion → next iteration.

---

## Usage Scenarios

### Scenario 1: Batch Upgrade All Files

```powershell
cd sveltekit-frontend

# Run codemod
npm run phase82:svelte5-codemod

# Start dev server to see any errors
npm run dev:quic

# Errors are captured in Phase 72
# Visit /all-routes to see status
```

### Scenario 2: Upgrade Specific Route

```powershell
# Get the file content
$content = Get-Content src/routes/cases/+page.svelte -Raw

# Call upgrade endpoint
$body = @{
  file_path = "src/routes/cases/+page.svelte"
  original = $content
} | ConvertTo-Json

$upgraded = Invoke-RestMethod `
  -Uri "http://localhost:5173/api/phase82/svelte-upgrade" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

# Write back
$upgraded.upgraded | Set-Content src/routes/cases/+page.svelte
```

### Scenario 3: LLM-Driven (Gemini/Claude)

With Playwright MCP + /all-routes:

```
Gemini: "Upgrade all routes to Svelte 5 runes"
    ↓
MCP list_routes() → get all routes
    ↓
For each route:
  - Call svelte5_upgrade() codemod
  - Call open_route() to validate
  - If error: capture to Phase 72
    ↓
Gemini reads Phase 72 suggestions
    ↓
Gemini decides: retry codemod or manual fix
```

---

## Package.json Script

Add to `sveltekit-frontend/package.json`:

```json
{
  "scripts": {
    "phase82:svelte5-codemod": "node scripts/phase82-svelte-runes-codemod.mjs"
  }
}
```

---

## Environment Variables

```powershell
# .env or .env.local
PHASE82_UPGRADE_URL=http://127.0.0.1:5173/api/phase82/svelte-upgrade
PHASE82_MODEL=gemma3-legal:latest
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

---

## Workflow: Full Upgrade Loop

### Step 1: Inventory
```powershell
.\scripts\find-migration-targets.ps1
```

### Step 2: Backup
```powershell
git checkout -b upgrade/svelte5-runes
```

### Step 3: Run Codemod
```powershell
npm run phase82:svelte5-codemod
```

### Step 4: Test
```powershell
npm run dev:quic
# Watch for errors in terminal
# Visit /all-routes to see status
```

### Step 5: Fix Remaining Issues
- If errors appear: Phase 72 suggests fixes
- Apply fixes manually or re-run codemod
- Commit when all green

### Step 6: Commit
```powershell
git add .
git commit -m "chore: upgrade to Svelte 5 runes via Phase 82

- Ran phase82:svelte5-codemod
- All routes verified on /all-routes
- No Phase 72 errors"
```

---

## Limitations & Gotchas

### Limitation 1: LLM Hallucination
The codemod endpoint relies on Ollama to generate correct code. It may:
- Add unnecessary imports
- Misunderstand complex reactive logic
- Generate invalid syntax

**Mitigation:** Always test with `npm run dev:quic` and check Phase 72 errors.

### Limitation 2: Context Size
Large files may exceed Ollama's context window. The endpoint will fail gracefully.

**Mitigation:** Split large files manually before running codemod.

### Limitation 3: Behavioral Changes
The codemod tries not to change behavior, but complex `$:` chains may not translate perfectly to `$derived`.

**Mitigation:** Review diffs carefully. Phase 72 will catch runtime errors.

---

## Integration with /all-routes Dashboard

Future enhancement: Add buttons to /all-routes:

```svelte
<button on:click={() => runCodemod(route)}>
  🔧 Upgrade to Svelte 5
</button>

<button on:click={() => validateRoute(route)}>
  ✅ Validate (Playwright)
</button>
```

This turns /all-routes into a control panel for autonomous upgrades.

---

## Testing the Codemod

### Test 1: Simple Props

**Input:**
```svelte
<script>
  export let caseId;
  export let onClose;
</script>
```

**Expected output:**
```svelte
<script>
  const { caseId, onClose } = $props();
</script>
```

### Test 2: State + Reactive

**Input:**
```svelte
<script>
  let filter = '';
  let cases = [];

  $: filtered = cases.filter(c => c.title.includes(filter));
</script>
```

**Expected output:**
```svelte
<script>
  let filter = $state('');
  let cases = $state([]);

  const filtered = $derived(cases.filter(c => c.title.includes(filter)));
</script>
```

### Test 3: Lifecycle

**Input:**
```svelte
<script>
  import { onMount } from 'svelte';

  let data = null;

  onMount(async () => {
    const res = await fetch('/api/data');
    data = await res.json();
  });
</script>
```

**Expected output:**
```svelte
<script>
  let data = $state(null);

  $effect(async () => {
    const res = await fetch('/api/data');
    data = await res.json();
  });
</script>
```

---

## Next Steps

1. **Test the endpoint:**
   ```powershell
   npm run dev
   # Call /api/phase82/svelte-upgrade with test file
   ```

2. **Test the runner:**
   ```powershell
   npm run phase82:svelte5-codemod
   # Watch output
   ```

3. **Integrate with /all-routes:**
   - Add "Upgrade" button
   - Call codemod endpoint
   - Show results

4. **Add Playwright MCP validation:**
   - After codemod, run Playwright checks
   - Capture errors to Phase 72
   - Report back to LLM

---

## Status

- [x] Codemod endpoint created
- [x] Node runner created
- [x] Integration with Phase 72 documented
- [ ] /all-routes UI buttons (future)
- [ ] Playwright MCP validation (future)

---

**Ready to test:** `npm run phase82:svelte5-codemod`
