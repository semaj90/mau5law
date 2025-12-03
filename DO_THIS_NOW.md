# DO THIS NOW: Concrete Action Plan

**Goal:** Prove Phase 72 works, wire /all-routes, start Svelte 5 migration, apply YoRHa theme globally
**Time:** 30 minutes
**No guessing, just steps.**

---

## Step 1: Prove Error Brain Works (5 min)

### 1.1 Start dev server
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run dev:quic
```

✅ **Green if:** Terminal shows Vite starting + `[phase72-dev-wrapper]` message

### 1.2 Trigger a test error
Open `src/routes/analysis-center/+page.svelte` and add:

```svelte
<script lang="ts">
  // INTENTIONAL TEST ERROR FOR PHASE 72
  const foo: NotARealType = 123;
</script>
```

Save the file.

### 1.3 Watch terminal
You should see:
1. Normal TS error: `src/routes/analysis-center/+page.svelte:X:X - error TS2304: Cannot find name 'NotARealType'.`
2. Followed by:
```
🧠 Phase 72 Error Brain ───────────────────────────

## Likely cause
...

## Fix plan
...

────────────────────────────────────────────────────
```

✅ **Green if:** You see both (1) and (2)
❌ **Red if:** Only (1) appears → wrapper not hooked up

### 1.4 Verify DB
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d legal_ai_db -c "
SELECT code, file_path, message FROM phase72_error
ORDER BY created_at DESC LIMIT 1;
"
```

✅ **Green if:** Returns row with code='TS2304'

### 1.5 Clean up
Remove the test error from +page.svelte.

---

## Step 2: Wire /all-routes for Playwright (5 min)

### 2.1 Check if /all-routes exists
```powershell
Test-Path sveltekit-frontend\src\routes\all-routes\+page.svelte
```

✅ **Green if:** Returns True

### 2.2 If it doesn't exist, create it
```powershell
# Create the file with basic structure
New-Item -Path sveltekit-frontend\src\routes\all-routes\+page.svelte -Force
```

### 2.3 Add machine-readable table
Replace the entire file with:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  interface RouteStatus {
    path: string;
    status: 'green' | 'yellow' | 'red';
    errorCount: number;
  }

  let routes: RouteStatus[] = [];

  onMount(async () => {
    try {
      const res = await fetch('/api/phase72/errors');
      if (res.ok) {
        const data = await res.json();
        const routeMap = new Map<string, RouteStatus>();

        for (const error of data.errors || []) {
          const route = error.route || '/';
          if (!routeMap.has(route)) {
            routeMap.set(route, { path: route, status: 'green', errorCount: 0 });
          }
          const r = routeMap.get(route)!;
          r.errorCount++;
          if (r.errorCount >= 5) r.status = 'red';
          else if (r.errorCount >= 2) r.status = 'yellow';
        }

        routes = Array.from(routeMap.values()).sort((a, b) =>
          a.path.localeCompare(b.path)
        );
      }
    } catch (err) {
      console.error('Failed to fetch route status:', err);
    }
  });
</script>

<main class="all-routes">
  <h1>/all-routes — Phase 72 Health</h1>

  <table data-phase72-routes>
    <thead>
      <tr>
        <th>Route</th>
        <th>Status</th>
        <th>Errors</th>
      </tr>
    </thead>
    <tbody>
      {#each routes as r (r.path)}
        <tr
          data-route={r.path}
          data-status={r.status}
          data-error-count={r.errorCount}
          class="status-{r.status}"
        >
          <td>{r.path}</td>
          <td>{r.status}</td>
          <td>{r.errorCount}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>

<style>
  .all-routes {
    background: var(--yorha-bg);
    color: var(--yorha-ink);
    font-family: var(--yorha-font);
    padding: 2rem;
    min-height: 100vh;
  }

  h1 {
    color: var(--yorha-crimson);
    margin-bottom: 2rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--yorha-paper);
    border: 2px solid var(--yorha-ink);
  }

  th {
    background: var(--yorha-bg-dark);
    color: var(--yorha-paper);
    padding: 1rem;
    text-align: left;
    border-bottom: 2px solid var(--yorha-ink);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #ddd;
  }

  tr.status-green {
    background-color: #e6ffe6;
  }

  tr.status-yellow {
    background-color: #fff9e6;
  }

  tr.status-red {
    background-color: #ffe6e6;
  }
</style>
```

### 2.4 Test it
```
http://127.0.0.1:5173/all-routes
```

✅ **Green if:** Page loads, shows table with data-* attributes

---

## Step 3: Start Svelte 5 Migration (10 min)

### 3.1 Find legacy patterns
```powershell
cd sveltekit-frontend

# Find files with export let
rg "export let " src -l | head -10

# Find files with onMount
rg "onMount\(" src -l | head -10

# Find reactive declarations
rg "^\s*\$:" src -g'*.svelte' -l | head -10
```

### 3.2 Pick one small file
Choose a simple component, e.g., `src/lib/components/Card.svelte` or similar.

### 3.3 Convert props
**Before:**
```svelte
<script>
  export let title;
  export let onClick;
</script>
```

**After:**
```svelte
<script>
  const { title, onClick } = $props();
</script>
```

### 3.4 Convert state
**Before:**
```svelte
<script>
  let isOpen = false;
  let count = 0;
</script>
```

**After:**
```svelte
<script>
  let isOpen = $state(false);
  let count = $state(0);
</script>
```

### 3.5 Test with Phase 72
```powershell
npm run dev:quic
```

✅ **Green if:** No errors in terminal

---

## Step 4: Apply YoRHa Theme Globally (5 min)

### 4.1 Check src/app.css
```powershell
Get-Content sveltekit-frontend\src\app.css | head -30
```

✅ **Green if:** Contains `--yorha-bg`, `--yorha-crimson`, etc.

### 4.2 If not, add theme variables
Add to top of `src/app.css`:

```css
:root {
  --yorha-bg: #d4c9a9;
  --yorha-bg-dark: #2a2016;
  --yorha-panel: #c4b99a;
  --yorha-paper: #f8f0d9;
  --yorha-ink: #0f0f0f;
  --yorha-crimson: #a51c30;
  --yorha-font: 'JetBrains Mono', 'Courier New', monospace;
}

body {
  margin: 0;
  background: var(--yorha-bg);
  color: var(--yorha-ink);
  font-family: var(--yorha-font);
}
```

### 4.3 Update Command Center page
In `src/routes/command-center/+page.svelte` (or wherever your main page is), replace hard-coded colors:

**Before:**
```svelte
<style>
  .command-center {
    background: #d4c9a9;
    color: #0f0f0f;
    font-family: 'JetBrains Mono', monospace;
  }

  .sidebar {
    background: #2a2016;
  }

  .header-btn:hover {
    background: #a51c30;
  }
</style>
```

**After:**
```svelte
<style>
  .command-center {
    background: var(--yorha-bg);
    color: var(--yorha-ink);
    font-family: var(--yorha-font);
  }

  .sidebar {
    background: var(--yorha-bg-dark);
  }

  .header-btn:hover {
    background: var(--yorha-crimson);
  }
</style>
```

### 4.4 Test
```
http://127.0.0.1:5173/command-center
```

✅ **Green if:** Page looks the same but uses theme variables

---

## Summary: What You Just Did

| Step | Action | Status |
|------|--------|--------|
| 1 | Proved Phase 72 error brain works | ✅ |
| 2 | Wired /all-routes for Playwright | ✅ |
| 3 | Started Svelte 5 migration | ✅ |
| 4 | Applied YoRHa theme globally | ✅ |

---

## Next: Automate the Rest

Once you've done these 4 steps manually:

### Batch migrate with PowerShell
```powershell
# Find all export let
rg "export let (\w+);" src -g'*.svelte' -l |
  ForEach-Object {
    (Get-Content $_) -replace 'export let (\w+);', 'const { $1 } = $props(); // TODO verify' |
      Set-Content $_
  }
```

### Run Phase 82 codemod (if you set it up)
```powershell
npm run phase82:svelte5-codemod
```

### Validate everything
```powershell
npm run dev:quic
# Watch for errors
# Visit /all-routes to see status
```

---

## If Something Breaks

### Error brain not firing
- Check: `npm run dev:quic` shows `[phase72-dev-wrapper]` message
- Check: Ollama running: `curl http://127.0.0.1:11434/api/tags`
- Check: Database: `psql ... -c "SELECT COUNT(*) FROM phase72_error;"`

### /all-routes shows no routes
- Check: `curl http://127.0.0.1:5173/api/phase72/errors`
- Check: Database has errors: `psql ... -c "SELECT COUNT(*) FROM phase72_error;"`

### Svelte 5 migration breaks something
- Phase 72 will catch it
- Read the 🧠 suggestion in terminal
- Revert the change: `git checkout -- file.svelte`

---

**You're done. Everything is wired. Go.**
