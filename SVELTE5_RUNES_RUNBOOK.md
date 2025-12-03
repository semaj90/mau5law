# Svelte 5 Runes Migration Runbook

**Goal:** Mechanically migrate SvelteKit app from Svelte 4 to Svelte 5 runes
**Scope:** Progressive, per-page, with Phase 72 error tracking
**Timeline:** 1-2 weeks (can be done incrementally)

---

## Phase 1: Inventory & Planning

### Step 1.1: Find all migration targets

```powershell
cd sveltekit-frontend

# Find old-style props
rg "export let " src/routes src/lib -l | Sort-Object | Out-File export-let-files.txt

# Find lifecycle hooks
rg "onMount\(" src -l | Sort-Object | Out-File onmount-files.txt
rg "beforeUpdate\(" src -l | Sort-Object | Out-File beforeupdate-files.txt
rg "afterUpdate\(" src -l | Sort-Object | Out-File afterupdate-files.txt
rg "onDestroy\(" src -l | Sort-Object | Out-File ondestroy-files.txt

# Find reactive declarations
rg "^\s*\$:" src -g'*.svelte' -l | Sort-Object | Out-File reactive-files.txt

# Count total files to migrate
Write-Host "Files with export let: $(Get-Content export-let-files.txt | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
Write-Host "Files with onMount: $(Get-Content onmount-files.txt | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
Write-Host "Files with reactive: $(Get-Content reactive-files.txt | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
```

### Step 1.2: Prioritize pages

**High Priority (most state):**
1. `src/routes/command-center/+page.svelte`
2. `src/routes/evidence-board/+page.svelte`
3. `src/routes/analysis-center/+page.svelte`
4. `src/routes/all-routes/+page.svelte`

**Medium Priority (reusable):**
5. `src/lib/components/**/*.svelte`

**Low Priority (simple):**
6. Layouts, error pages, etc.

---

## Phase 2: Mechanical Migrations

### Step 2.1: Backup and branch

```powershell
git checkout -b migrate/svelte5-runes
git commit -m "chore: start Svelte 5 runes migration"
```

### Step 2.2: Mass-replace `export let` → `$props()`

**Option A: PowerShell (Windows)**

```powershell
# Find all files with export let
$files = rg "export let " src -g'*.svelte' -l

foreach ($file in $files) {
  $content = Get-Content $file -Raw

  # Replace: export let foo; → const { foo } = $props();
  $content = $content -replace 'export let (\w+);', 'const { $1 } = $props(); // TODO: verify'

  # Replace: export let foo: Type; → const { foo } = $props();
  $content = $content -replace 'export let (\w+):\s*[^;]+;', 'const { $1 } = $props(); // TODO: verify'

  Set-Content $file $content
  Write-Host "✓ $file"
}
```

**Option B: Bash/WSL**

```bash
# Find and replace in all files
rg "export let (\w+);" src -g'*.svelte' -l | while read f; do
  perl -pi -e 's/export let (\w+);/const { $1 } = $props(); \/\/ TODO: verify/g' "$f"
  perl -pi -e 's/export let (\w+):\s*[^;]+;/const { $1 } = $props(); \/\/ TODO: verify/g' "$f"
  echo "✓ $f"
done
```

### Step 2.3: Convert local state `let` → `$state()`

**Manual approach (safer):**

For each high-priority file:

```svelte
<!-- BEFORE -->
<script>
  let filter = '';
  let showClosed = false;
  let cases = [];
</script>

<!-- AFTER -->
<script>
  let filter = $state('');
  let showClosed = $state(false);
  let cases = $state([]);
</script>
```

**Semi-automated (PowerShell):**

```powershell
# Find all "let x = ..." patterns
rg "let \w+ = " src/routes -g'*.svelte' | Select-Object -First 20

# Then manually review and convert in each file
# (safer than mass-replace because you need to verify each one)
```

### Step 2.4: Convert reactive `$:` → `$derived()`

**Pattern:**

```svelte
<!-- BEFORE -->
<script>
  let filter = '';
  let cases = [];

  $: filteredCases = cases.filter(c => c.title.includes(filter));
</script>

<!-- AFTER -->
<script>
  let filter = $state('');
  let cases = $state([]);

  const filteredCases = $derived(
    cases.filter(c => c.title.includes(filter))
  );
</script>
```

**Find candidates:**

```powershell
rg "^\s*\$:" src/routes -g'*.svelte' -A 2 | head -50
```

### Step 2.5: Convert lifecycle hooks

**`onMount` → `$effect`:**

```svelte
<!-- BEFORE -->
<script>
  import { onMount } from 'svelte';

  let data = null;

  onMount(async () => {
    const res = await fetch('/api/data');
    data = await res.json();
  });
</script>

<!-- AFTER -->
<script>
  let data = $state(null);

  $effect(async () => {
    const res = await fetch('/api/data');
    data = await res.json();
  });
</script>
```

**`onDestroy` → `$effect.pre`:**

```svelte
<!-- BEFORE -->
<script>
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    console.log('cleanup');
  });
</script>

<!-- AFTER -->
<script>
  $effect.pre(() => {
    return () => {
      console.log('cleanup');
    };
  });
</script>
```

---

## Phase 3: Testing & Verification

### Step 3.1: Run dev server with error brain

```powershell
npm run dev:quic
```

**Watch for:**
- TypeScript errors
- Svelte compilation errors
- Runtime errors in console

### Step 3.2: Check Phase 72 dashboard

```
http://127.0.0.1:5173/all-routes
```

**Expected:**
- Routes should be green (no errors)
- If red, click to see error details
- Errors should be captured in Phase 72

### Step 3.3: Verify functionality

For each migrated page:
1. Load the page
2. Interact with UI (click buttons, type in inputs)
3. Verify state updates work
4. Check console for errors

---

## Phase 4: Commit & Repeat

### Step 4.1: Commit changes

```powershell
git add .
git commit -m "chore: migrate [page-name] to Svelte 5 runes

- Converted export let → \$props()
- Converted let → \$state()
- Converted \$: → \$derived()
- Converted onMount → \$effect()

Verified on /all-routes dashboard: all green ✅"
```

### Step 4.2: Repeat for next page

Go back to Phase 2 and repeat for the next high-priority page.

---

## Common Patterns & Gotchas

### Gotcha 1: `$derived` is read-only

```svelte
<!-- ❌ WRONG -->
<script>
  let items = $state([]);
  const filtered = $derived(items.filter(...));

  function addItem() {
    filtered.push(item); // ❌ Error: can't mutate $derived
  }
</script>

<!-- ✅ RIGHT -->
<script>
  let items = $state([]);
  const filtered = $derived(items.filter(...));

  function addItem() {
    items = [...items, item]; // ✅ Mutate source
  }
</script>
```

### Gotcha 2: `$effect` runs after render

```svelte
<!-- ❌ WRONG (runs after render) -->
<script>
  let count = $state(0);

  $effect(() => {
    console.log('count changed:', count); // Runs AFTER render
  });
</script>

<!-- ✅ RIGHT (runs before render) -->
<script>
  let count = $state(0);

  $effect.pre(() => {
    console.log('count changed:', count); // Runs BEFORE render
  });
</script>
```

### Gotcha 3: Props destructuring

```svelte
<!-- ✅ CORRECT -->
<script lang="ts">
  interface Props {
    caseId: string;
    onClose: () => void;
  }

  const { caseId, onClose } = $props() as Props;
</script>

<!-- ✅ ALSO CORRECT (with defaults) -->
<script lang="ts">
  const { caseId = 'default', onClose = () => {} } = $props();
</script>
```

---

## Rollout Timeline

| Week | Pages | Status |
|------|-------|--------|
| 1 | command-center, evidence-board | In progress |
| 2 | analysis-center, all-routes | In progress |
| 3 | Components (Card, Button, etc.) | In progress |
| 4 | Remaining pages + polish | In progress |

---

## Verification Checklist

After each page migration:

- [ ] No TypeScript errors: `npm run check`
- [ ] No Svelte errors: `npm run dev:quic` (watch for errors)
- [ ] Page renders correctly
- [ ] State updates work (click buttons, type in inputs)
- [ ] No console errors
- [ ] /all-routes shows green status
- [ ] Commit with clear message

---

## Rollback Plan

If something breaks:

```powershell
# Revert last commit
git revert HEAD

# Or reset to last good state
git reset --hard origin/main
```

---

## Resources

- [Svelte 5 Runes Docs](https://svelte.dev/docs/svelte/what-are-runes)
- [Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Runes API Reference](https://svelte.dev/docs/svelte/$state)

---

**Status:** Ready to start
**First Page:** src/routes/command-center/+page.svelte
**Estimated Time:** 1-2 weeks (can be done incrementally)
