# Quick Reference: Svelte 5 + Bits-UI v2 Error Fixes

## What Was Fixed

### Core Issues Addressed
1. **Event Handler Deprecation** - All `on:*` directives replaced with `on*` attributes
2. **Accessibility Violations** - Interactive `<div>` elements converted to `<button>` with keyboard support
3. **Dialog API Migration** - Compound component API → slot-based implementation
4. **Field Component Update** - Children-based API → snippet-based `control` prop
5. **Icon Import Correction** - Added missing icons, corrected icon names
6. **Component Imports** - Fixed barrel export issues, individual file imports where needed
7. **Playwright Config** - Fixed port mismatch (5175 → 5173)

### Files Affected
- `src/routes/poi-manager/+page.svelte` - 100+ fixes applied
- `playwright.integration.config.ts` - Port configuration
- `src/lib/components/ui/index.ts` - Verified barrel exports

## Key Documentation Files

### 1. `COPILOT_ERROR_FIXING_GUIDE.md`
**Complete reference guide for fixing Svelte 5 + Bits-UI v2 errors**

Contains:
- Detailed error category explanations
- Before/after code examples
- Regex search/replace patterns
- Component-specific patterns
- Testing & validation steps

Use when:
- Encountering similar errors in other components
- Need to understand why a pattern changed
- Building new forms or dialogs
- Adding interactive elements

### 2. `ERROR_FIXES_SUMMARY.md`
**High-level summary of all changes made**

Contains:
- Overview of issues fixed
- File listing
- Key patterns documented
- Validation status
- Next steps

Use when:
- Need to understand what was changed
- Checking what issues were addressed
- Quick reference for completed work

## Common Fixes You Can Apply to Other Components

### Fix 1: Event Handlers
```svelte
// OLD (Svelte 4)
<button on:click={handleClick}>Click</button>

// NEW (Svelte 5)
<button onclick={handleClick}>Click</button>
```

### Fix 2: Accessibility
```svelte
// OLD (Fails a11y)
<div onclick={handleClick}>Click me</div>

// NEW (Proper a11y)
<button type="button" onclick={handleClick} onkeydown={(e) => e.key === 'Enter' && handleClick()}>
  Click me
</button>
```

### Fix 3: Field Components
```svelte
// OLD (Doesn't work in Svelte 5)
<Field label="Name">
  <Input bind:value={name} />
</Field>

// NEW (Svelte 5 snippet syntax)
<Field
  label="Name"
  control={({ id }) => <Input {id} bind:value={name} />}
/>
```

### Fix 4: Dialog Content
```svelte
// OLD (Bits-UI v1)
<Dialog bind:open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>

// NEW (Custom implementation)
<Dialog bind:open={isOpen}>
  <div slot="content">
    <div class="border-b pb-4">
      <h2>Title</h2>
    </div>
  </div>
</Dialog>
```

## Validation Commands

```bash
# Check TypeScript errors
npm run check

# Run Svelte compiler check
npx svelte-check --tsconfig tsconfig.check.json

# Start dev server
npm run dev

# Run integration tests (if dev server is running)
npm run test:integration:poi-manager
```

## Search Patterns for Bulk Fixes

Use these in VS Code Find & Replace (enable Regex mode):

### Replace all on:click with onclick
```
Find:    on:click={([^}]+)}
Replace: onclick={$1}
```

### Replace all on:change with onchange
```
Find:    on:change={([^}]+)}
Replace: onchange={$1}
```

### Replace all on:submit with onsubmit
```
Find:    on:submit={([^}]+)}
Replace: onsubmit={$1}
```

### Find all on:* event handlers
```
Find: on:(click|change|submit|blur|focus|input|keydown|keyup)
```

## Important Notes

1. **Dialog Components** - DialogContent, DialogHeader, DialogTitle are still exported but not recommended. Use manual markup instead with `slot="content"`.

2. **Field Component** - Must use snippet-based `control` prop. The component automatically generates and passes `id` to the control snippet.

3. **Button Accessibility** - Always include `onkeydown` handler for keyboard support on custom button-like elements.

4. **Playwright Tests** - Port is now 5173 (not 5175). Update any hardcoded URLs.

5. **Icon Imports** - Use exact icon names from lucide-svelte. Example: `filter` not `Funnel`.

## Next Steps for Other Components

When you encounter similar errors in other files:

1. Open `COPILOT_ERROR_FIXING_GUIDE.md` for detailed patterns
2. Use the search patterns section to find similar code
3. Apply the documented fixes using the before/after examples
4. Run `npm run check` to validate
5. Test locally with `npm run dev`

## Getting Help

- **For Svelte 5 syntax**: Check `COPILOT_ERROR_FIXING_GUIDE.md` "Error Categories" section
- **For specific components**: Look at working examples in `src/routes/poi-manager/+page.svelte`
- **For form patterns**: See "Complex Example" in the Field component section
- **For Dialog patterns**: See "Form Structure in Dialogs" section

---

**Last Updated**: December 15, 2025
**Status**: Complete
**Framework**: Svelte 5 (runes mode) + Bits-UI v2 + SvelteKit 2
