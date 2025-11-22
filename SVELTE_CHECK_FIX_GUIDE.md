# Svelte-Check Error Resolution Guide

## Overview

This guide provides a systematic approach to resolving svelte-check errors in the deeds-web-app project. The errors are categorized by type and severity, with actionable solutions for each.

## Quick Start

### 1. Generate Error Report

```bash
# Log top 1,000 svelte-check errors
pwsh -ExecutionPolicy Bypass -File scripts/svelte-check-logger.ps1 -limit 1000
```

This creates:
- `logs/svelte-check/svelte-check-errors_[timestamp].txt` - Full error details
- `logs/svelte-check/svelte-check-summary_[timestamp].txt` - Error summary

### 2. Run Svelte-Check

```bash
cd sveltekit-frontend
npm run check:svelte
```

## Common Error Categories

### Category 1: Type Errors (TS5083, TS1131, TS1128)

**Symptoms:**
- Cannot read file errors
- Property or signature expected
- Declaration or statement expected

**Root Causes:**
- Missing `.svelte-kit` directory
- Corrupted TypeScript cache
- Invalid imports or exports

**Solutions:**

```bash
# Clear SvelteKit cache
rm -r sveltekit-frontend/.svelte-kit

# Regenerate types
cd sveltekit-frontend
npx svelte-kit sync

# Run type check
npm run check:typescript
```

### Category 2: Component Import Errors

**Symptoms:**
- Cannot find module
- Unexpected token
- Invalid import path

**Root Causes:**
- Circular dependencies
- Missing file extensions
- Incorrect relative paths

**Solutions:**

```bash
# Check for circular dependencies
npm run check:svelte -- --verbose

# Verify all imports have correct paths
# Look for patterns like:
# - import from './Component' (should be './Component.svelte')
# - import from '../' (should specify file)
```

### Category 3: Reactive Declaration Errors

**Symptoms:**
- Invalid reactive declaration
- Unexpected token in reactive block
- Invalid assignment target

**Root Causes:**
- Incorrect `$:` syntax
- Invalid variable assignments in reactive blocks
- Missing semicolons

**Solutions:**

```svelte
<!-- ❌ Wrong -->
<script>
  $: count = 0;
  $: if (count > 5) doSomething();
</script>

<!-- ✅ Correct -->
<script>
  let count = 0;
  $: if (count > 5) doSomething();
</script>
```

### Category 4: Slot and Props Errors

**Symptoms:**
- Unknown slot
- Invalid prop type
- Missing required prop

**Root Causes:**
- Typos in slot names
- Type mismatches
- Missing prop definitions

**Solutions:**

```svelte
<!-- Define props with types -->
<script lang="ts">
  export let title: string;
  export let count: number = 0;
</script>

<!-- Use named slots correctly -->
<slot name="header" />
<slot />
<slot name="footer" />
```

### Category 5: Event Handler Errors

**Symptoms:**
- Invalid event handler
- Unknown event
- Type mismatch in handler

**Root Causes:**
- Incorrect event names
- Missing event type annotations
- Invalid handler syntax

**Solutions:**

```svelte
<!-- ✅ Correct event handling -->
<script lang="ts">
  function handleClick(event: MouseEvent) {
    console.log(event);
  }
</script>

<button on:click={handleClick}>Click me</button>
```

## Error Resolution Workflow

### Step 1: Categorize Errors

```bash
# Review the summary file to understand error distribution
cat logs/svelte-check/svelte-check-summary_[timestamp].txt
```

### Step 2: Fix by Category

Start with the most common errors first:

1. **Type/Import Errors** (usually 40-50% of errors)
   - Fix missing imports
   - Correct file paths
   - Regenerate types

2. **Component Errors** (usually 20-30%)
   - Fix prop definitions
   - Correct slot usage
   - Update event handlers

3. **Syntax Errors** (usually 10-20%)
   - Fix reactive declarations
   - Correct template syntax
   - Update bindings

4. **Advanced Errors** (usually 5-10%)
   - Fix store subscriptions
   - Correct animation syntax
   - Update transitions

### Step 3: Validate Fixes

```bash
# Run check after each batch of fixes
npm run check:svelte

# Run full type check
npm run check:typescript

# Run all checks
npm run check:all
```

## Automated Fix Strategies

### Strategy 1: Bulk Import Fixes

```bash
# Find all missing .svelte extensions
grep -r "from '[^']*'" sveltekit-frontend/src --include="*.svelte" | grep -v ".svelte'"

# Add .svelte extensions where needed
```

### Strategy 2: Type Generation

```bash
# Regenerate all types
cd sveltekit-frontend
npx svelte-kit sync
npm run check:typescript
```

### Strategy 3: Cache Clearing

```bash
# Clear all caches
rm -rf sveltekit-frontend/.svelte-kit
rm -rf sveltekit-frontend/node_modules/.vite
rm -rf sveltekit-frontend/tsconfig.tsbuildinfo

# Reinstall and regenerate
cd sveltekit-frontend
npm install
npx svelte-kit sync
```

## Monitoring Progress

### Track Error Reduction

```bash
# Generate reports at different times
pwsh -ExecutionPolicy Bypass -File scripts/svelte-check-logger.ps1 -limit 1000

# Compare error counts
# logs/svelte-check/svelte-check-summary_[time1].txt
# logs/svelte-check/svelte-check-summary_[time2].txt
```

### Create Baseline

```bash
# Save initial error count
npm run check:svelte 2>&1 | tee logs/svelte-check/baseline.txt

# Track improvements
# Target: Reduce errors by 50% per session
```

## Prevention Best Practices

### 1. Type Safety

```svelte
<!-- Always use TypeScript -->
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }

  export let { title, count = 0 }: Props;
</script>
```

### 2. Proper Imports

```svelte
<!-- Always include file extensions -->
<script>
  import Component from './Component.svelte';
  import { store } from '$lib/stores';
</script>
```

### 3. Reactive Declarations

```svelte
<!-- Use $: for reactive statements -->
<script>
  let count = 0;
  $: doubled = count * 2;
  $: if (count > 10) console.log('High!');
</script>
```

### 4. Event Handlers

```svelte
<!-- Type event handlers -->
<script lang="ts">
  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    console.log(target.value);
  }
</script>

<input on:change={handleChange} />
```

## Troubleshooting

### Issue: Errors Keep Reappearing

**Solution:**
```bash
# Clear everything and start fresh
rm -rf sveltekit-frontend/.svelte-kit sveltekit-frontend/node_modules/.vite
npx svelte-kit sync
npm run check:svelte
```

### Issue: Type Errors After Updates

**Solution:**
```bash
# Regenerate types after dependency updates
npm install
npx svelte-kit sync
npm run check:typescript
```

### Issue: Circular Dependency Errors

**Solution:**
- Review import chains
- Move shared code to `$lib`
- Use dynamic imports where needed

```svelte
<!-- Use dynamic imports to break cycles -->
<script>
  import { onMount } from 'svelte';

  let Component;
  onMount(async () => {
    Component = (await import('./Component.svelte')).default;
  });
</script>

{#if Component}
  <svelte:component this={Component} />
{/if}
```

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Next Steps

1. **Generate Error Report**
   ```bash
   pwsh -ExecutionPolicy Bypass -File scripts/svelte-check-logger.ps1 -limit 1000
   ```

2. **Review Summary**
   - Check error distribution
   - Identify top error types
   - Plan fix strategy

3. **Fix by Category**
   - Start with most common errors
   - Validate after each batch
   - Track progress

4. **Automate Prevention**
   - Add pre-commit hooks
   - Run checks in CI/CD
   - Monitor error trends

## Support

For detailed error analysis, check:
- `logs/svelte-check/svelte-check-errors_[timestamp].txt` - Full error details
- `logs/svelte-check/svelte-check-summary_[timestamp].txt` - Error summary
