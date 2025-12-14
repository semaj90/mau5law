# Phase 3: Manual Fixes - Ready to Execute

**Status**: ✅ READY
**Date**: December 14, 2025

---

## What's Been Completed (Phases 1-2)

### ✅ Specification Documents
- `.kiro/specs/svelte5-bits-ui-migration/requirements.md` - 7 requirements
- `.kiro/specs/svelte5-bits-ui-migration/design.md` - Architecture & properties
- `.kiro/specs/svelte5-bits-ui-migration/tasks.md` - 30 implementation tasks

### ✅ Automated Codemods Executed
- Event handlers: 3 files updated (on: → event attributes)
- Dynamic components: 1 file updated
- Self-closing tags: 18 files updated
- Route conflicts: Resolved
- SVG errors: Fixed

### ✅ Codebase Audit
- 1,499 Svelte files scanned
- 1,100 API files audited
- 1,707 API endpoints inventoried
- 22 files updated by codemods

---

## Phase 3: Manual Fixes - Runes Migration

### Task 9: Fix export let → $props

**Objective**: Convert all `export let` declarations to Svelte 5 `$props`

**Pattern**:
```svelte
// Before
<script>
  export let caseId: string;
  export let user: User;
</script>

// After
<script lang="ts">
  let { caseId, user } = $props<{
    caseId: string;
    user: User;
  }>();
</script>
```

**Search Command**:
```bash
rg "export let" sveltekit-frontend/src --glob "*.svelte" -A 2
```

**Acceptance Criteria**:
- All `export let` declarations converted to `$props`
- TypeScript types added for all props
- Components still compile
- No type errors

---

### Task 10: Fix $: Reactive Labels → $derived

**Objective**: Convert all reactive labels to `$derived`

**Pattern**:
```svelte
// Before
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

// After
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**Search Command**:
```bash
rg "\$: \w+ =" sveltekit-frontend/src --glob "*.svelte" -A 1
```

**Acceptance Criteria**:
- All `$: variable = ...` converted to `$derived`
- Dependencies captured correctly
- Computed values update properly

---

### Task 11: Fix $: Side Effects → $effect

**Objective**: Convert all reactive side effects to `$effect`

**Pattern**:
```svelte
// Before
<script>
  $: if (count > 10) {
    console.log('Count exceeded');
  }
</script>

// After
<script>
  $effect(() => {
    if (count > 10) {
      console.log('Count exceeded');
    }
  });
</script>
```

**Search Command**:
```bash
rg "\$: \{" sveltekit-frontend/src --glob "*.svelte" -A 3
```

**Acceptance Criteria**:
- All `$: { ... }` converted to `$effect`
- Side effects trigger correctly
- No infinite loops

---

### Task 12: Fix onMount → $effect

**Objective**: Convert all `onMount` calls to `$effect`

**Pattern**:
```svelte
// Before
<script>
  import { onMount } from 'svelte';
  onMount(() => {
    console.log('Component mounted');
  });
</script>

// After
<script>
  $effect(() => {
    console.log('Component mounted');
  });
</script>
```

**Search Command**:
```bash
rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" -B 2 -A 3
```

**Acceptance Criteria**:
- All `onMount` calls converted to `$effect`
- Initialization logic works
- No import errors

---

### Task 13: Fix onDestroy → $effect Cleanup

**Objective**: Convert all `onDestroy` calls to `$effect` cleanup

**Pattern**:
```svelte
// Before
<script>
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    console.log('Component destroyed');
  });
</script>

// After
<script>
  $effect(() => {
    return () => {
      console.log('Component destroyed');
    };
  });
</script>
```

**Search Command**:
```bash
rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" -B 2 -A 3
```

**Acceptance Criteria**:
- All `onDestroy` calls converted to `$effect` cleanup
- Cleanup runs on component destroy
- No memory leaks

---

## How to Execute Phase 3

### Step 1: Search for Legacy Patterns
```bash
cd sveltekit-frontend

# Count export let patterns
rg "export let" src --glob "*.svelte" | wc -l

# Count reactive labels
rg "\$: \w+ =" src --glob "*.svelte" | wc -l

# Count reactive side effects
rg "\$: \{" src --glob "*.svelte" | wc -l

# Count onMount calls
rg "onMount\(" src --glob "*.svelte" | wc -l

# Count onDestroy calls
rg "onDestroy\(" src --glob "*.svelte" | wc -l
```

### Step 2: Execute Tasks Sequentially
1. Task 9: Fix export let → $props
2. Task 10: Fix $: reactive → $derived
3. Task 11: Fix $: side effects → $effect
4. Task 12: Fix onMount → $effect
5. Task 13: Fix onDestroy → $effect

### Step 3: Verify After Each Task
```bash
npm run svelte-check 2>&1 | head -50
```

### Step 4: Checkpoint
```bash
npm run build 2>&1 | tail -30
```

---

## Expected Outcomes

### After Task 9 (export let → $props)
- All component props use `$props`
- TypeScript types properly defined
- No "export let" patterns remain

### After Task 10 ($: → $derived)
- All computed values use `$derived`
- Reactive dependencies captured
- No `$: variable = ...` patterns remain

### After Task 11 ($: { } → $effect)
- All side effects use `$effect`
- Effects trigger correctly
- No `$: { ... }` patterns remain

### After Task 12 (onMount → $effect)
- All initialization uses `$effect`
- No `onMount` imports remain
- Initialization logic works

### After Task 13 (onDestroy → $effect)
- All cleanup uses `$effect` return
- No `onDestroy` imports remain
- Cleanup runs properly

---

## Success Criteria for Phase 3

- ✅ All `export let` converted to `$props`
- ✅ All `$: variable = ...` converted to `$derived`
- ✅ All `$: { ... }` converted to `$effect`
- ✅ All `onMount` converted to `$effect`
- ✅ All `onDestroy` converted to `$effect`
- ✅ No Svelte 4 legacy patterns remain
- ✅ Components compile without errors
- ✅ svelte-check passes

---

## Estimated Time

- Task 9: 30-45 minutes
- Task 10: 20-30 minutes
- Task 11: 20-30 minutes
- Task 12: 15-20 minutes
- Task 13: 15-20 minutes
- **Total**: 1.5-2.5 hours

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

1. **Phase 4**: Manual Fixes - Bits-UI v2 Migration
   - Update Dialog components
   - Update Button components
   - Update Card components
   - Update Tooltip components
   - Update Select components

2. **Phase 5**: Styling Standardization
   - Convert inline styles to UnoCSS
   - Verify Tailwind → UnoCSS compatibility
   - Standardize spacing and layout classes

3. **Phase 6**: Verification & Testing
   - Full build verification
   - Core routes testing
   - API endpoint verification
   - Performance benchmarks

---

## Ready to Begin?

Phase 3 is ready to execute. All specifications, codemods, and preparation work is complete.

**To start Phase 3**:
1. Open `.kiro/specs/svelte5-bits-ui-migration/tasks.md`
2. Click "Start task" next to Task 9
3. Follow the patterns and search commands above
4. Execute each task sequentially

---

**Status**: ✅ READY FOR PHASE 3
**Generated**: December 14, 2025

