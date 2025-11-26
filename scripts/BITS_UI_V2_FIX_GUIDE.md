# bits-ui v2 API Fix Guide

## Overview

This guide explains how to use the PowerShell script to audit and fix bits-ui v2 API compatibility issues across the SvelteKit frontend.

## Why This Matters

bits-ui v2 changed from named exports to default exports:

```typescript
// ❌ OLD (bits-ui v1)
import { Button, Dialog, Select } from 'bits-ui';

// ✅ NEW (bits-ui v2)
import Button from 'bits-ui/button';
import Dialog from 'bits-ui/dialog';
import Select from 'bits-ui/select';
```

## Script Location

```
scripts/fix-bits-ui-v2-api.ps1
```

## Usage

### 1. Audit Mode (Scan for Issues)

```powershell
.\scripts\fix-bits-ui-v2-api.ps1 -Audit
```

**Output:**
- Lists all files with bits-ui v2 API issues
- Shows issue severity (Error/Warning)
- Categorizes by issue type

**Example Output:**
```
============================================================
AUDITING bits-ui v2 API Usage
============================================================
Scanning 34131 files...
[Error] src/lib/components/ui/index.ts
  → Uses named exports from bits-ui (v2 uses default exports)
[Warning] src/lib/components/Button.svelte
  → Uses inline styles instead of Uno.css classes
```

### 2. Fix Mode (Audit + Auto-Fix)

```powershell
.\scripts\fix-bits-ui-v2-api.ps1 -Fix
```

**Actions:**
- Scans all files
- Automatically fixes compatible issues
- Generates report
- Updates files in-place

**Fixes Applied:**
- ✅ Converts `ui-store.svelte` imports to `ui-store`
- ✅ Converts inline padding styles to Uno.css classes
- ✅ Updates `export let` to Svelte 5 `$props()`
- ⚠️ Flags complex issues for manual review

### 3. Report Mode (Analysis Only)

```powershell
.\scripts\fix-bits-ui-v2-api.ps1 -Report
```

**Output:**
- Summary of issues by severity
- Top recurring issues
- Recommendations for fixes

**Example Output:**
```
============================================================
BITS-UI v2 API AUDIT REPORT
============================================================

Issues Found: 12

By Severity:
  Errors: 3
  Warnings: 9

Top Issues:
  [5x] Uses named exports from bits-ui (v2 uses default exports)
  [3x] Uses inline styles instead of Uno.css classes
  [2x] Uses export let instead of Svelte 5 $props()

Recommendations:
  1. Review all bits-ui imports - v2 uses default exports
  2. Update barrel exports in src/lib/components/ui/bits/index.ts
  3. Migrate remaining components to Svelte 5 $props() runes
  4. Replace inline styles with Uno.css utility classes
  5. Use new ui-store.ts for all UI state management
```

## Common Issues & Fixes

### Issue 1: Named Exports from bits-ui

**Problem:**
```typescript
import { Button, Dialog } from 'bits-ui';
```

**Solution:**
Use default exports or import from specific modules:
```typescript
import Button from 'bits-ui/button';
import Dialog from 'bits-ui/dialog';
```

**Or use barrel exports:**
```typescript
import { Button, Dialog } from '$lib/components/ui';
```

### Issue 2: Old Store Imports

**Problem:**
```typescript
import { getUIStore } from '$lib/stores/ui-store.svelte';
```

**Solution:**
```typescript
import { getUIStore } from '$lib/stores/ui-store';
```

### Issue 3: Inline Styles vs Uno.css

**Problem:**
```svelte
<div style="padding: 16px; margin: 8px;">
```

**Solution:**
```svelte
<div class="p-4 m-2">
```

**Uno.css Utilities:**
- `p-*` - Padding (p-1, p-2, p-4, p-8, etc.)
- `m-*` - Margin (m-1, m-2, m-4, m-8, etc.)
- `w-*` - Width (w-full, w-1/2, w-screen, etc.)
- `h-*` - Height (h-full, h-screen, etc.)
- `flex` - Flexbox
- `grid` - CSS Grid
- `text-*` - Font size (text-sm, text-base, text-lg, etc.)

### Issue 4: Svelte 5 Runes

**Problem:**
```svelte
<script lang="ts">
  export let title: string;
  export let count: number = 0;
</script>
```

**Solution:**
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }

  let { title, count = 0 }: Props = $props();
</script>
```

## Manual Fixes Required

Some issues require manual review:

1. **Complex bits-ui imports** - Review and update manually
2. **Svelte 5 migration** - May need context-specific changes
3. **Custom styling** - Verify Uno.css equivalents

## Best Practices

### 1. Use Barrel Exports

```typescript
// ✅ Good
import { Button, Dialog, Select } from '$lib/components/ui';

// ❌ Avoid
import Button from 'bits-ui/button';
import Dialog from 'bits-ui/dialog';
```

### 2. Use Uno.css Classes

```svelte
<!-- ✅ Good -->
<div class="p-4 m-2 flex gap-2">

<!-- ❌ Avoid -->
<div style="padding: 16px; margin: 8px; display: flex; gap: 8px;">
```

### 3. Use Svelte 5 Runes

```svelte
<!-- ✅ Good -->
<script lang="ts">
  let { title }: Props = $props();
  let count = $state(0);
</script>

<!-- ❌ Avoid -->
<script lang="ts">
  export let title: string;
  let count = 0;
</script>
```

### 4. Use New UI Store

```typescript
// ✅ Good
import { createUIStore, getUIStore } from '$lib/stores/ui-store';

// ❌ Avoid
import { uiStore } from '$lib/stores/old-ui-store';
```

## Troubleshooting

### Script Won't Run

**Error:** `cannot be loaded because running scripts is disabled`

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### No Changes Made

**Reason:** Script only fixes compatible issues. Complex changes need manual review.

**Solution:** Review the report and fix manually:
```powershell
.\scripts\fix-bits-ui-v2-api.ps1 -Report
```

### Files Not Updated

**Reason:** File permissions or encoding issues.

**Solution:** Check file permissions and encoding:
```powershell
Get-Item -Path "file.svelte" | Select-Object -Property FullName, Mode
```

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Audit bits-ui v2 API
  run: |
    pwsh -Command ".\scripts\fix-bits-ui-v2-api.ps1 -Report"
```

## Performance Impact

- **Audit Mode:** ~2-5 seconds (scans 34,000+ files)
- **Fix Mode:** ~5-10 seconds (includes fixes)
- **Report Mode:** ~2-5 seconds

## Support

For issues or questions:
1. Check the report output
2. Review the recommendations
3. Consult the "Common Issues & Fixes" section
4. Manual review may be needed for complex cases

## Version History

- **v1.0** - Initial release
  - Audit mode
  - Basic fixes
  - Report generation

## Next Steps

After running the script:

1. Review the report
2. Manually fix flagged issues
3. Test components in browser
4. Run tests to verify functionality
5. Commit changes

---

**Last Updated:** November 2025
**bits-ui Version:** v2.0.0
**Svelte Version:** 5.x
