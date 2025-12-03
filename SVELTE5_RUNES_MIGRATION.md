# Svelte 5 Runes Migration Guide

**Goal:** Migrate from Svelte 4 reactive declarations to Svelte 5 runes
**Scope:** Mechanical, safe, progressive
**Timeline:** Can be done incrementally per-page

---

## 1. Find Migration Targets

### Old Patterns to Find
```powershell
cd sveltekit-frontend

# Find old props
rg "export let " src/routes src/lib

# Find lifecycle hooks (convert to $effect)
rg "onMount\(" src
rg "beforeUpdate\(" src
rg "afterUpdate\(" src

# Find reactive declarations (convert to $derived)
rg "^\s*\$:" src

# Find mutable state (convert to $state)
rg "let .*=" src/routes -g'*.svelte' | head -20
```

---

## 2. Mechanical Migrations

### Props: `export let` → `$props()`

**Before:**
```svelte
<script lang="ts">
  export let caseId: string;
  export let onClose: () => void;
</script>
```

**After:**
```svelte
<script lang="ts">
  const { caseId, onClose } = $props();
</script>
```

### State: `let` → `$state()`

**Before:**
```svelte
<script>
  let filter = '';
  let showClosed = false;
  let cases = [];
</script>
```

**After:**
```svelte
<script>
  let filter = $state('');
  let showClosed = $state(false);
  let cases = $state([]);
</script>
```

### Reactive: `$:` → `$derived()`

**Before:**
```svelte
<script>
  let filter = '';
  let cases = [];

  $: filteredCases = cases.filter(c =>
    c.title.includes(filter)
  );
</script>
```

**After:**
```svelte
<script>
  let filter = $state('');
  let cases = $state([]);

  const filteredCases = $derived(
    cases.filter(c => c.title.includes(filter))
  );
</script>
```

### Side Effects: `onMount` → `$effect`

**Before:**
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

**After:**
```svelte
<script>
  let data = $state(null);

  $effect(async () => {
    const res = await fetch('/api/data');
    data = await res.json();
  });
</script>
```

### Cleanup: `onDestroy` → `$effect.pre`

**Before:**
```svelte
<script>
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    console.log('cleanup');
  });
</script>
```

**After:**
```svelte
<script>
  $effect.pre(() => {
    return () => {
      console.log('cleanup');
    };
  });
</script>
```

---

## 3. Priority Pages to Migrate

Start with these (most state-heavy):

1. **src/routes/command-center/+page.svelte** - Cases, filters, sidebar
2. **src/routes/evidence-board/+page.svelte** - Evidence items, selection
3. **src/routes/analysis-center/+page.svelte** - Query, results, modes
4. **src/routes/all-routes/+page.svelte** - Route list, status
5. **src/lib/components/** - Reusable components

---

## 4. Safe Migration Pattern

For each file:

1. **Backup:** `git checkout -b migrate/svelte5-{page-name}`
2. **Convert props:** `export let` → `$props()`
3. **Convert state:** `let` → `$state()`
4. **Convert reactive:** `$:` → `$derived()`
5. **Convert effects:** `onMount` → `$effect`
6. **Test:** `npm run dev:quic:brain` and verify no errors
7. **Commit:** `git commit -m "chore: migrate {page} to Svelte 5 runes"`

---

## 5. Common Gotchas

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

### Gotcha 3: `$props()` is shallow
```svelte
<!-- destructure if you need reactivity -->
<script>
  const { user } = $props();

  // ✅ This works
  $effect(() => {
    console.log(user.name);
  });
</script>
```

---

## 6. Verification Checklist

After migrating a page:

- [ ] No TypeScript errors: `npm run check`
- [ ] No Svelte errors: `npm run dev:quic:brain` (watch for errors)
- [ ] Page renders correctly
- [ ] State updates work (click buttons, type in inputs)
- [ ] No console errors
- [ ] Commit and push

---

## 7. Rollout Plan

**Week 1:** Migrate 2-3 pages (command-center, evidence-board)
**Week 2:** Migrate 2-3 more (analysis-center, all-routes)
**Week 3:** Migrate components (Card, Button, etc.)
**Week 4:** Polish and test

---

## 8. Resources

- [Svelte 5 Runes Docs](https://svelte.dev/docs/svelte/what-are-runes)
- [Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Runes API](https://svelte.dev/docs/svelte/$state)

---

**Status:** Ready to start
**First Page:** src/routes/command-center/+page.svelte
