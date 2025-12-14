# Phase 3: Start Here

**Status**: ✅ READY TO EXECUTE
**Date**: December 14, 2025
**Estimated Duration**: 1.5-2.5 hours
**Total Patterns to Convert**: 306 across 244 files

---

## What You Need to Know

### Current State
- ✅ Phases 1-2 complete (specifications, codemods, route conflicts resolved)
- ✅ Codebase audited (1,499 Svelte files scanned)
- ✅ File inventory created (244 files identified for Phase 3)
- ⏳ Phase 3 ready to execute (manual runes migration)

### What Phase 3 Does
Converts remaining Svelte 4 patterns to Svelte 5 runes:
- `export let` → `$props` (107 patterns in 57 files)
- `$: variable = ...` → `$derived` (7 patterns)
- `$: { ... }` → `$effect` (0 patterns - none found)
- `onMount` → `$effect` (162 patterns in 157 files)
- `onDestroy` → `$effect` cleanup (30 patterns in 30 files)

### Why This Matters
Svelte 5 runes are the new way to manage state and side effects. They're more explicit, more performant, and required for Svelte 5 compatibility.

---

## Quick Start (5 minutes)

### Step 1: Review the Execution Plan
Open and read these files in order:
1. `PHASE3_EXECUTION_GUIDE.md` - Detailed patterns and examples
2. `PHASE3_TASK_EXECUTION_PLAN.md` - File-by-file breakdown
3. `PHASE3_FILE_INVENTORY.json` - Complete file list

### Step 2: Understand the Pattern
Each task follows the same pattern:
1. **Search** for legacy patterns using ripgrep
2. **Convert** each pattern to the new rune syntax
3. **Verify** with `npm run svelte-check`

### Step 3: Start Task 9
Begin with Task 9 (export let → $props):
- 57 files to process
- 107 patterns to convert
- Estimated time: 30-45 minutes

---

## Task Breakdown

### Task 9: export let → $props (30-45 min)
**Pattern**:
```svelte
// Before
export let caseId: string;

// After
let { caseId } = $props<{ caseId: string }>();
```

**Files**: 57 (UI, dashboard, case, legal-ai, evidence components)
**Search**: `rg "export let" sveltekit-frontend/src --glob "*.svelte" -l`

### Task 10: $: variable = ... → $derived (20-30 min)
**Pattern**:
```svelte
// Before
$: doubled = count * 2;

// After
let doubled = $derived(count * 2);
```

**Files**: 0 (ripgrep escaping issue, but 7 patterns exist)
**Search**: Manual search needed

### Task 11: $: { ... } → $effect (20-30 min)
**Pattern**:
```svelte
// Before
$: { console.log(count); }

// After
$effect(() => { console.log(count); });
```

**Files**: 0 (no patterns found)
**Status**: ✅ Complete

### Task 12: onMount → $effect (15-20 min)
**Pattern**:
```svelte
// Before
import { onMount } from 'svelte';
onMount(() => { ... });

// After
$effect(() => { ... });
```

**Files**: 157 (core routes, components, demos)
**Search**: `rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" -l`

### Task 13: onDestroy → $effect (15-20 min)
**Pattern**:
```svelte
// Before
import { onDestroy } from 'svelte';
onDestroy(() => { ... });

// After
$effect(() => () => { ... });
```

**Files**: 30 (core routes, components)
**Search**: `rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" -l`

---

## Execution Checklist

### Before Starting
- [ ] Read `PHASE3_EXECUTION_GUIDE.md`
- [ ] Read `PHASE3_TASK_EXECUTION_PLAN.md`
- [ ] Review `PHASE3_FILE_INVENTORY.json`
- [ ] Ensure you have ripgrep installed (`rg --version`)

### Task 9 (export let → $props)
- [ ] Search for all files: `rg "export let" sveltekit-frontend/src --glob "*.svelte" -l`
- [ ] Start with UI components (11 files)
- [ ] Then dashboard components (4 files)
- [ ] Then case components (6 files)
- [ ] Then legal-ai components (12 files)
- [ ] Then evidence components (4 files)
- [ ] Then other components (20 files)
- [ ] Verify: `npm run svelte-check 2>&1 | head -50`

### Task 10 ($: variable = ... → $derived)
- [ ] Manual search for patterns
- [ ] Convert 7 patterns
- [ ] Verify: `npm run svelte-check 2>&1 | head -50`

### Task 11 ($: { ... } → $effect)
- [ ] Confirm no patterns found
- [ ] Mark as complete

### Task 12 (onMount → $effect)
- [ ] Search for all files: `rg "onMount\(" sveltekit-frontend/src --glob "*.svelte" -l`
- [ ] Start with core routes (8 files)
- [ ] Then evidence routes (5 files)
- [ ] Then components (50+ files)
- [ ] Then demos/tests (90+ files)
- [ ] Verify: `npm run svelte-check 2>&1 | head -50`

### Task 13 (onDestroy → $effect)
- [ ] Search for all files: `rg "onDestroy\(" sveltekit-frontend/src --glob "*.svelte" -l`
- [ ] Start with high priority (5 files)
- [ ] Then medium priority (5 files)
- [ ] Then lower priority (20 files)
- [ ] Verify: `npm run svelte-check 2>&1 | head -50`

### Final Verification
- [ ] Run full build: `npm run build 2>&1 | tail -30`
- [ ] Check for errors: `npm run svelte-check`
- [ ] Verify core routes render
- [ ] Document any remaining issues

---

## Key Resources

### Svelte 5 Runes Documentation
- `$props`: https://svelte.dev/docs/svelte/runes#$props
- `$state`: https://svelte.dev/docs/svelte/runes#$state
- `$derived`: https://svelte.dev/docs/svelte/runes#$derived
- `$effect`: https://svelte.dev/docs/svelte/runes#$effect

### Migration Guide
- Svelte 4 to 5: https://svelte.dev/docs/svelte/v5-migration-guide

### Local Documentation
- `PHASE3_EXECUTION_GUIDE.md` - Detailed patterns and examples
- `PHASE3_TASK_EXECUTION_PLAN.md` - File-by-file breakdown
- `PHASE3_FILE_INVENTORY.json` - Complete file list

---

## Tips for Success

### 1. Work Systematically
- Process files in groups (UI → Dashboard → Case → etc.)
- Verify after each group
- Don't try to do all 244 files at once

### 2. Use Search & Replace
- Use your editor's find/replace for bulk conversions
- Test on one file first
- Then apply to similar files

### 3. Verify Frequently
```bash
# After each group of files
npm run svelte-check 2>&1 | head -50

# After all tasks
npm run build 2>&1 | tail -30
```

### 4. Handle Edge Cases
- Some components may have complex prop patterns
- Some lifecycle hooks may have cleanup logic
- Document any unusual patterns you encounter

### 5. Commit Frequently
```bash
git add .
git commit -m "Phase 3: Task 9 - export let → $props (57 files)"
```

---

## Time Breakdown

| Task | Files | Patterns | Est. Time |
|------|-------|----------|-----------|
| 9 | 57 | 107 | 30-45 min |
| 10 | 0 | 7 | 20-30 min |
| 11 | 0 | 0 | 20-30 min |
| 12 | 157 | 162 | 15-20 min |
| 13 | 30 | 30 | 15-20 min |
| **TOTAL** | **244** | **306** | **1.5-2.5 hrs** |

---

## What Happens Next

After Phase 3 completes:
1. **Phase 4**: Bits-UI v2 Component Updates (1-2 hours)
   - Update Dialog, Button, Card, Tooltip, Select components

2. **Phase 5**: Styling Standardization (1-2 hours)
   - Convert inline styles to UnoCSS
   - Verify Tailwind → UnoCSS compatibility

3. **Phase 6**: Verification & Testing (1-2 hours)
   - Full build verification
   - Core routes testing
   - API endpoint verification

---

## Ready to Start?

### Option 1: Manual Execution
1. Open `PHASE3_EXECUTION_GUIDE.md`
2. Follow the patterns and search commands
3. Convert files manually using your editor
4. Verify with `npm run svelte-check`

### Option 2: Guided Execution
1. Open `.kiro/specs/svelte5-bits-ui-migration/tasks.md`
2. Click "Start task" next to Task 9
3. Follow the execution guide
4. Complete each task sequentially

---

## Questions?

Refer to:
- `PHASE3_EXECUTION_GUIDE.md` - Detailed patterns and examples
- `PHASE3_TASK_EXECUTION_PLAN.md` - File-by-file breakdown
- `PHASE3_FILE_INVENTORY.json` - Complete file list
- Svelte 5 docs: https://svelte.dev/docs/svelte/runes

---

**Status**: ✅ READY FOR PHASE 3 EXECUTION
**Generated**: December 14, 2025
**Next Action**: Read `PHASE3_EXECUTION_GUIDE.md` and start Task 9
