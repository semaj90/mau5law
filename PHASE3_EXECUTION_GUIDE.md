# Phase 3 Execution Guide - Runes Migration

**Status**: Ready to Execute
**Date**: December 14, 2025
**Estimated Time**: 1.5-2.5 hours

---

## Current Codebase State

### Pattern Counts
- `export let` declarations: **107**
- `$: variable = ...` reactive labels: **7**
- `$: { ... }` reactive side effects: **0**
- `onMount` calls: **162**
- `onDestroy` calls: **30**

**Total Patterns to Convert**: 306

---

## Task 9: Fix export let → $props (30-45 min)

### Objective
Convert all `export let` declarations to Svelte 5 `$props` rune.

### Pattern

**Before**:
```svelte
<script lang="ts">
  export let caseId: string;
  export let user: User;
  export let open: boolean = false;
</script>
```

**After**:
```svelte
<script lang="ts">
  let { caseId, user, open = false } = $props<{
    caseId: string;
    user: User;
    open?: boolean;
  }>();
</script>
```

### Key Rules
1. Combine all `export let` into a single `$props` declaration
2. Extract types from each declaration
3. Move default values into the destructuring pattern
4. Use optional types (`?:`) for props with defaults
5. Ensure TypeScript types are preserved

### Search Command
```bash
rg "export let" sveltekit-frontend/src --glob "*.svelte" -B 2 -A 1
```

### Execution Steps

1. **Find all files with export let**
   ```bash
   rg "export let" sveltekit-frontend/src --glob "*.svelte" -l
   ```

2. **For each file, manually convert**:
   - Open the file
   - Identify all `export let` declarations
   - Create a single `$props` declaration
   - Remove the `export let` lines
   - Verify the component still compiles

3. **Verify after each file**:
   ```bash
   npm run svelte-check 2>&1 | grep -A 5 "filename"
   ```

### Example Conversions

**Simple prop**:
```svelte
// Before
export let color: string;

// After
let { color } = $props<{ color: string }>();
```

**Prop with default**:
```svelte
// Before
export let size: 'sm' | 'md' | 'lg' = 'md';

// After
let { size = 'md' } = $props<{ size?: 'sm' | 'md' | 'lg' }>();
```

**Multiple props**:
```svelte
// Before
export let title: string;
export let description: string;
export let open: boolean = false;

// After
let { title, description, open = false } = $props<{
  title: string;
  description: string;
  open?: boolean;
}>();
```

### Acceptance Criteria
- ✅ All `export let` declarations converted to `$props`
- ✅ TypeScript types preserved
- ✅ Default values moved to destructuring
- ✅ No `export let` patterns remain
- ✅ Components compile without errors

---

## Task 10: Fix $: Reactive Labels → $derived (20-30 min)

### Objective
Convert all `$: variable = ...` reactive labels to `$derived`.

### Pattern

**Before**:
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: quadrupled = doubled * 2;
</script>
```

**After**:
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  let quadrupled = $derived(doubled * 2);
</script>
```

### Key Rules
1. Replace `$: variable = expression` with `let variable = $derived(expression)`
2. Ensure dependencies are captured in the expression
3. Use `$state` for reactive variables if not already using it
4. Verify computed values update correctly

### Search Command
```bash
rg '\$: \w+ =' sveltekit-frontend/src --glob "*.svelte" -B 1 -A 1
```

### Execution Steps

1. **Find all files with reactive labels**
   ```bash
   rg '\$: \w+ =' sveltekit-frontend/src --glob "*.svelte" -l
   ```

2. **For each file, manually convert**:
   - Open the file
   - Identify all `$: variable = ...` patterns
   - Convert to `let variable = $derived(...)`
   - Ensure dependencies are captured
   - Verify computed values update

3. **Verify after each file**:
   ```bash
   npm run svelte-check 2>&1 | grep -A 5 "filename"
   ```

### Example Conversions

**Simple computed value**:
```svelte
// Before
$: doubled = count * 2;

// After
let doubled = $derived(count * 2);
```

**Computed value with multiple dependencies**:
```svelte
// Before
$: total = items.reduce((sum, item) => sum + item.price, 0);

// After
let total = $derived(items.reduce((sum, item) => sum + item.price, 0));
```

### Acceptance Criteria
- ✅ All `$: variable = ...` converted to `$derived`
- ✅ Dependencies captured correctly
- ✅ Computed values update properly
- ✅ No `$: variable = ...` patterns remain

---

## Task 11: Fix $: Side Effects → $effect (20-30 min)

### Objective
Convert all `$: { ... }` reactive side effects to `$effect`.

### Pattern

**Before**:
```svelte
<script>
  $: if (count > 10) {
    console.log('Count exceeded');
  }

  $: {
    console.log('Count changed:', count);
  }
</script>
```

**After**:
```svelte
<script>
  $effect(() => {
    if (count > 10) {
      console.log('Count exceeded');
    }
  });

  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

### Key Rules
1. Replace `$: { ... }` with `$effect(() => { ... })`
2. Ensure side effects trigger correctly
3. Handle cleanup functions with return
4. Avoid infinite loops

### Search Command
```bash
rg '\$: \{' sveltekit-frontend/src --glob "*.svelte" -B 1 -A 3
```

### Execution Steps

1. **Find all files with reactive side effects**
   ```bash
   rg '\$: \{' sveltekit-frontend/src --glob "*.svelte" -l
   ```

2. **For each file, manually convert**:
   - Open the file
   - Identify all `$: { ... }` patterns
   - Convert to `$effect(() => { ... })`
   - Verify side effects trigger correctly
   - Check for infinite loops

3. **Verify after each file**:
   ```bash
   npm run svelte-check 2>&1 | grep -A 5 "filename"
   ```

### Example Conversions

**Simple side effect**:
```svelte
// Before
$: console.log('Count:', count);

// After
$effect(() => {
  console.log('Count:', count);
});
```

**Conditional side effect**:
```svelte
// Before
$: if (count > 10) {
  alert('Count exceeded!');
}

// After
$effect(() => {
  if (count > 10) {
    alert('Count exceeded!');
  }
});
```

### Acceptance Criteria
- ✅ All `$: { ... }` converted to `$effect`
- ✅ Side effects trigger correctly
- ✅ No infinite loops
- ✅ No `$: { ... }` patterns remain

---

## Task 12: Fix onMount → $effect (15-20 min)

### Objective
Convert all `onMount` calls to `$effect`.

### Pattern

**Before**:
```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('Component mounted');
    fetchData();
  });
</script>
```

**After**:
```svelte
<script>
  $effect(() => {
    console.log('Component mounted');
    fetchData();
  });
</script>
```

### Key Rules
1. Remove `import { onMount } from 'svelte'`
2. Replace `onMount(() => { ... })` with `$effect(() => { ... })`
3. Handle cleanup with return function
4. Verify initialization logic works

### Search Command
```bash
rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" -B 2 -A 3
```

### Execution Steps

1. **Find all files with onMount**
   ```bash
   rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" -l
   ```

2. **For each file, manually convert**:
   - Open the file
   - Remove `import { onMount } from 'svelte'`
   - Replace `onMount(() => { ... })` with `$effect(() => { ... })`
   - Verify initialization logic works
   - Check for any cleanup functions

3. **Verify after each file**:
   ```bash
   npm run svelte-check 2>&1 | grep -A 5 "filename"
   ```

### Example Conversions

**Simple onMount**:
```svelte
// Before
import { onMount } from 'svelte';

onMount(() => {
  console.log('Mounted');
});

// After
$effect(() => {
  console.log('Mounted');
});
```

**onMount with cleanup**:
```svelte
// Before
import { onMount } from 'svelte';

onMount(() => {
  const timer = setInterval(() => {
    console.log('Tick');
  }, 1000);

  return () => clearInterval(timer);
});

// After
$effect(() => {
  const timer = setInterval(() => {
    console.log('Tick');
  }, 1000);

  return () => clearInterval(timer);
});
```

### Acceptance Criteria
- ✅ All `onMount` calls converted to `$effect`
- ✅ No `onMount` imports remain
- ✅ Initialization logic works
- ✅ Cleanup functions preserved

---

## Task 13: Fix onDestroy → $effect Cleanup (15-20 min)

### Objective
Convert all `onDestroy` calls to `$effect` cleanup.

### Pattern

**Before**:
```svelte
<script>
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    console.log('Component destroyed');
    cleanup();
  });
</script>
```

**After**:
```svelte
<script>
  $effect(() => {
    return () => {
      console.log('Component destroyed');
      cleanup();
    };
  });
</script>
```

### Key Rules
1. Remove `import { onDestroy } from 'svelte'`
2. Replace `onDestroy(() => { ... })` with `$effect(() => () => { ... })`
3. Verify cleanup runs on component destroy
4. Avoid memory leaks

### Search Command
```bash
rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" -B 2 -A 3
```

### Execution Steps

1. **Find all files with onDestroy**
   ```bash
   rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" -l
   ```

2. **For each file, manually convert**:
   - Open the file
   - Remove `import { onDestroy } from 'svelte'`
   - Replace `onDestroy(() => { ... })` with `$effect(() => () => { ... })`
   - Verify cleanup runs on destroy
   - Check for memory leaks

3. **Verify after each file**:
   ```bash
   npm run svelte-check 2>&1 | grep -A 5 "filename"
   ```

### Example Conversions

**Simple onDestroy**:
```svelte
// Before
import { onDestroy } from 'svelte';

onDestroy(() => {
  console.log('Destroyed');
});

// After
$effect(() => {
  return () => {
    console.log('Destroyed');
  };
});
```

**onDestroy with cleanup**:
```svelte
// Before
import { onDestroy } from 'svelte';

let subscription;

onMount(() => {
  subscription = store.subscribe(value => {
    console.log(value);
  });
});

onDestroy(() => {
  subscription?.unsubscribe();
});

// After
let subscription;

$effect(() => {
  subscription = store.subscribe(value => {
    console.log(value);
  });

  return () => {
    subscription?.unsubscribe();
  };
});
```

### Acceptance Criteria
- ✅ All `onDestroy` calls converted to `$effect` cleanup
- ✅ No `onDestroy` imports remain
- ✅ Cleanup runs on component destroy
- ✅ No memory leaks

---

## Verification Strategy

### After Each Task
```bash
npm run svelte-check 2>&1 | head -50
```

### After All Tasks
```bash
npm run build 2>&1 | tail -30
```

### Success Indicators
- ✅ No `export let` patterns remain
- ✅ No `$: variable = ...` patterns remain
- ✅ No `$: { ... }` patterns remain
- ✅ No `onMount` imports remain
- ✅ No `onDestroy` imports remain
- ✅ svelte-check passes
- ✅ Components compile

---

## Time Breakdown

| Task | Patterns | Est. Time |
|------|----------|-----------|
| 9 | 107 export let | 30-45 min |
| 10 | 7 reactive labels | 20-30 min |
| 11 | 0 side effects | 20-30 min |
| 12 | 162 onMount | 15-20 min |
| 13 | 30 onDestroy | 15-20 min |
| **Total** | **306** | **1.5-2.5 hrs** |

---

## Resources

### Svelte 5 Runes Documentation
- `$props`: https://svelte.dev/docs/svelte/runes#$props
- `$state`: https://svelte.dev/docs/svelte/runes#$state
- `$derived`: https://svelte.dev/docs/svelte/runes#$derived
- `$effect`: https://svelte.dev/docs/svelte/runes#$effect

### Migration Guide
- Svelte 4 to 5: https://svelte.dev/docs/svelte/v5-migration-guide

---

## Next Steps After Phase 3

1. **Phase 4**: Bits-UI v2 Component Updates
2. **Phase 5**: Styling Standardization (UnoCSS)
3. **Phase 6**: Verification & Testing

---

**Status**: ✅ READY FOR PHASE 3 EXECUTION
**Generated**: December 14, 2025
