# Phase 3 Quick Start - Runes Migration

**Status**: Ready to Execute
**Estimated Time**: 1.5-2.5 hours
**Tasks**: 5 sequential tasks

---

## Quick Reference

### Task 9: export let → $props
```bash
# Search
rg "export let" sveltekit-frontend/src --glob "*.svelte" | wc -l

# Pattern
# Before: export let caseId: string;
# After: let { caseId } = $props<{ caseId: string }>();
```

### Task 10: $: variable = ... → $derived
```bash
# Search
rg "\$: \w+ =" sveltekit-frontend/src --glob "*.svelte" | wc -l

# Pattern
# Before: $: doubled = count * 2;
# After: let doubled = $derived(count * 2);
```

### Task 11: $: { ... } → $effect
```bash
# Search
rg "\$: \{" sveltekit-frontend/src --glob "*.svelte" | wc -l

# Pattern
# Before: $: { console.log(count); }
# After: $effect(() => { console.log(count); });
```

### Task 12: onMount → $effect
```bash
# Search
rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" | wc -l

# Pattern
# Before: onMount(() => { ... });
# After: $effect(() => { ... });
```

### Task 13: onDestroy → $effect
```bash
# Search
rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" | wc -l

# Pattern
# Before: onDestroy(() => { ... });
# After: $effect(() => () => { ... });
```

---

## Execution Steps

1. **Open Task List**
   - `.kiro/specs/svelte5-bits-ui-migration/tasks.md`

2. **Start Task 9**
   - Click "Start task"
   - Follow search command
   - Apply conversion pattern
   - Verify with `npm run svelte-check`

3. **Repeat for Tasks 10-13**
   - One task at a time
   - Verify after each
   - Document issues

4. **Checkpoint**
   - After all 5 tasks complete
   - Run full build verification
   - Proceed to Phase 4

---

## Verification Commands

```bash
# After each task
npm run svelte-check 2>&1 | head -50

# After all tasks
npm run build 2>&1 | tail -30
```

---

## Success Indicators

✅ No `export let` patterns remain
✅ No `$: variable = ...` patterns remain
✅ No `$: { ... }` patterns remain
✅ No `onMount` imports remain
✅ No `onDestroy` imports remain
✅ svelte-check passes
✅ Components compile

---

## Time Estimates

- Task 9: 30-45 min
- Task 10: 20-30 min
- Task 11: 20-30 min
- Task 12: 15-20 min
- Task 13: 15-20 min
- **Total**: 1.5-2.5 hours

---

## Resources

- Full Guide: `PHASE3_MANUAL_FIXES_READY.md`
- Svelte 5 Docs: https://svelte.dev/docs/svelte/runes
- Migration Guide: https://svelte.dev/docs/svelte/v5-migration-guide

---

**Ready to Start?** Open `.kiro/specs/svelte5-bits-ui-migration/tasks.md` and click "Start task" next to Task 9.

