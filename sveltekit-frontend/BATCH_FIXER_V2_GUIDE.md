# Advanced Batch Fixer v2 – Complete Guide

## Overview

Implements three surgical code transformation features to clean up Svelte 5 + Bits-UI v2 issues:

1. **Idempotent Fixing** – only report changes when content actually modifies
2. **onMount(async) → IIFE Wrapping** – convert deprecated async callbacks to Svelte 5 pattern
3. **Barrel Export Auto-Generation** – safely add missing `$lib/components/ui` exports
4. **Surgical Bits-UI v2 Reporting** – exact line/column locations for manual fixes

---

## Status Summary (Dec 15, 2025)

### Completed ✅

- **onMount(async) fixes**: 41 files corrected
- **Pattern**: `onMount(async () => { await task() })` → `onMount(() => { (async () => { await task() })() })`
- **Idempotency**: 1,473 files analyzed; only changed files with actual modifications reported

### Next Steps

1. **Barrel exports** (10 missing)
2. **Bits-UI v2 verification** (74 issues found, mostly old patterns)
3. **TypeScript validation** (pre-existing API parse errors in minified stubs)

---

## Command Reference

### Analysis Mode (default)

```bash
node scripts/batch-merger-fixer-v2.mjs --analyze
```

Categorizes issues by priority:
- **HIGH**: onMount(async), barrel exports
- **MEDIUM**: Bits-UI v2 patterns

**Output**: Shows counts and top files for each category.

### Fix: onMount(async) Pattern

```bash
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async
```

**What it does**:
- Finds `onMount(async () => { ... })`
- Wraps body in IIFE: `onMount(() => { (async () => { ... })() })`
- Preserves indentation and formatting
- Only modifies files that actually change

**Result**: 41 files fixed

---

### Fix: Barrel Exports (2-step)

#### Step 1: Report Missing Exports

```bash
node scripts/batch-merger-fixer-v2.mjs --report-barrels
```

**Output**:
```
🔴 Found 10 missing exports:

  Tabs:
    - src\lib\components\poi\PersonOfInterestDetailView.svelte
  TabsContent:
    - src\lib\components\poi\PersonOfInterestDetailView.svelte
  Field:
    - src\routes\field-demo\+page.svelte
  DialogFooter:
    - src\routes\poi-manager\+page.svelte
  ...
```

#### Step 2: Auto-Add Exports

```bash
node scripts/batch-merger-fixer-v2.mjs --fix-barrels
```

**Safety Guards**:
- ✅ Only adds exports if component file exists (`.svelte`, `.ts`, `.tsx`)
- ✅ Never deletes or renames anything
- ✅ Uses simple filename patterns (Component.svelte, component.svelte)

**Result**: Updates `src/lib/components/ui/index.ts` with new exports

---

### Report: Bits-UI v2 Issues (Surgical)

```bash
node scripts/batch-merger-fixer-v2.mjs --report-bitsui
```

**Output** (with exact line numbers):
```
📄 src\lib\components\evidence\EvidenceAssistant.svelte:80
   Type: Dialog
   Missing: Dialog.Trigger, Dialog.Content, Dialog.Close
   Pattern: <Dialog bind:open>...

📄 src\lib\components\poi\PersonOfInterestDetailView.svelte:132
   Type: Dialog
   Missing: Dialog.Trigger, Dialog.Content, Dialog.Close
   Pattern: <Dialog bind:open={open} onOpenChange={onOpenChange}>...
```

**Why surgical**:
- Line number lets you jump directly in editor
- Pattern preview shows exact usage
- Missing components are listed (triggers manual fix)

**Manual fix example**:
```svelte
<!-- OLD (v1) -->
<Dialog bind:open>
  <DialogContent>Content</DialogContent>
  <DialogHeader>Title</DialogHeader>
</Dialog>

<!-- NEW (v2) -->
<Dialog.Root bind:open>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>Title</Dialog.Header>
    Content
  </Dialog.Content>
  <Dialog.Close />
</Dialog.Root>
```

---

## Recommended Workflow

Run in this order:

```bash
# 1. Analyze all issues
node scripts/batch-merger-fixer-v2.mjs --analyze

# 2. Fix onMount(async) pattern
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async

# 3. Report missing barrel exports
node scripts/batch-merger-fixer-v2.mjs --report-barrels

# 4. Auto-fix barrel exports (with safety checks)
node scripts/batch-merger-fixer-v2.mjs --fix-barrels

# 5. Report Bits-UI v2 issues for manual fixing
node scripts/batch-merger-fixer-v2.mjs --report-bitsui

# 6. Run TypeScript check
npm run check:ultra-fast

# 7. (Optional) Re-analyze to verify progress
node scripts/batch-merger-fixer-v2.mjs --analyze
```

---

## Dry-Run Mode

Test any fix without modifying files:

```bash
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async --dry-run
```

Prints `[DRY] Would fix: ...` for each file without writing.

---

## Idempotency Guarantee

The fixer only reports `✅ Fixed: ...` when:
1. File content actually changes
2. Transformation produces syntactically valid output
3. No previous fix has already been applied

**Example output**:
```
✨ Summary:
  ✅ Changed: 41
  ⏭️  No change (idempotent skip): 1,473
```

This means:
- 41 files were modified (and needed fixing)
- 1,473 files were analyzed but already correct or unchanged

---

## Known Limitations

### API Parse Errors

Many API files (`src/routes/api/**/*.ts`) contain parse errors due to:
- Minified backup copies (`.minified` suffix)
- Single-line formatting (hard to parse)
- Pre-existing corruption

These are **not** caused by the batch fixer. They're in excluded minified backups.

### Bits-UI v2 Manual Work

The report identifies 74 instances of old Bits-UI patterns. These require manual rewrites because:
- Component API changed significantly (v1 → v2)
- No 1:1 automated pattern replacement is safe
- Context-aware refactoring is needed

**Recommend**: Use the surgical report to prioritize high-impact files (field-demo, poi-manager, detective).

---

## Integration with CI/CD

Add to `package.json`:

```json
{
  "scripts": {
    "fix:svelte5": "node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async && node scripts/batch-merger-fixer-v2.mjs --fix-barrels",
    "check:cleanup": "npm run fix:svelte5 && npm run check:ultra-fast && npm run check:svelte:frontend"
  }
}
```

Then run:
```bash
npm run check:cleanup
```

---

## Technical Notes

### onMount(async) Transformation

Uses regex with lookbehind to match:
```javascript
/onMount\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([^]*?)\n\s*\}\s*\);/g
```

Captures the body and wraps it:
```javascript
onMount(() => {
  (async () => {
    // original body (re-indented)
  })();
});
```

**Preserves**:
- Original indentation
- Comments
- String literals
- Type annotations

### Barrel Export Safety

Before adding export, checks three places:
1. `src/lib/components/ui/{Component}.svelte`
2. `src/lib/components/ui/{component}.svelte` (lowercase)
3. `src/lib/components/ui/{Component}.ts` or `.tsx`

Only adds line if file is found.

---

## Support

For issues or questions:

1. Check the analysis output: `node scripts/batch-merger-fixer-v2.mjs --analyze`
2. Review surgical reports for specifics: `--report-barrels`, `--report-bitsui`
3. Use dry-run to preview changes: `--dry-run`

---

**Last Updated**: Dec 15, 2025
**Version**: 2.0 (Idempotent + Surgical)
