# AST Error Fixing Guide - Svelte 5 Migration

## 🎯 Overview

The AST Graph Analyzer (`/dev/ast-graph`) uses **ts-morph** to analyze your SvelteKit routes and detect:
- ❌ Deprecated Svelte 4 patterns
- ❌ Deprecated UI libraries (shadcn-svelte, Melt-UI)
- ✅ Svelte 5 best practices
- 💡 Migration recommendations

---

## 🚀 Quick Start

### 1. Access the Tool
Visit: `http://localhost:5173/dev/ast-graph`

### 2. Analyze a Route
- Enter route path (e.g., `/evidence-board`, `/ai/chat`)
- Click "Analyze"
- View detected issues and recommendations

### 3. From Route Explorer
- Go to `/all-routes`
- Click any route card
- Click "View AST Graph" button

---

## 🔍 What It Detects

### Deprecated Packages
```typescript
// ❌ DEPRECATED
import { Button } from 'shadcn-svelte';
import { createDialog } from '@melt-ui/svelte';

// ✅ CORRECT
import { Button, Dialog } from 'bits-ui';
```

### Event Handlers
```svelte
<!-- ❌ OLD (Svelte 4) -->
<button on:click={handleClick}>Click</button>
<input on:change={handleChange} />

<!-- ✅ NEW (Svelte 5) -->
<button onclick={handleClick}>Click</button>
<input onchange={handleChange} />
```

### Reactive Statements
```svelte
<script>
  // ❌ OLD (Svelte 4)
  let count = 0;
  $: doubled = count * 2;
  $: {
    console.log('Count changed:', count);
  }

  // ✅ NEW (Svelte 5)
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

### Component Props
```svelte
<script lang="ts">
  // ❌ OLD (Svelte 4)
  export let title: string;
  export let description = 'Default';

  // ✅ NEW (Svelte 5)
  let { title, description = 'Default' }: {
    title: string;
    description?: string
  } = $props();
</script>
```

---

## 📊 Understanding the Output

### Node Types
- **import** - Import statements
- **function** - Function declarations
- **variable** - Variable declarations
- **component** - Svelte components
- **pattern** - Code patterns (event handlers, reactive statements)

### Color Coding
- 🟢 **Green** - No issues detected
- 🟡 **Yellow** - Uses deprecated APIs
- 🔴 **Red** - Has errors

### Error Severity
1. **Critical** - Breaks in Svelte 5 (must fix)
2. **Warning** - Deprecated but still works (should fix)
3. **Info** - Best practice suggestions (nice to fix)

---

## 🛠️ Common Fixes

### 1. Migrate Event Handlers

**Find & Replace:**
```
on:click=     → onclick=
on:change=    → onchange=
on:input=     → oninput=
on:submit=    → onsubmit=
on:keydown=   → onkeydown=
on:keyup=     → onkeyup=
on:focus=     → onfocus=
on:blur=      → onblur=
on:mouseenter= → onmouseenter=
on:mouseleave= → onmouseleave=
```

### 2. Migrate Reactive Statements

**Computed Values:**
```svelte
<!-- Before -->
<script>
  let firstName = 'John';
  let lastName = 'Doe';
  $: fullName = `${firstName} ${lastName}`;
</script>

<!-- After -->
<script>
  let firstName = $state('John');
  let lastName = $state('Doe');
  let fullName = $derived(`${firstName} ${lastName}`);
</script>
```

**Side Effects:**
```svelte
<!-- Before -->
<script>
  let count = 0;
  $: {
    console.log('Count:', count);
    document.title = `Count: ${count}`;
  }
</script>

<!-- After -->
<script>
  let count = $state(0);
  $effect(() => {
    console.log('Count:', count);
    document.title = `Count: ${count}`;
  });
</script>
```

### 3. Migrate Props

```svelte
<!-- Before -->
<script lang="ts">
  export let title: string;
  export let items: string[] = [];
  export let onSelect: (item: string) => void = () => {};
</script>

<!-- After -->
<script lang="ts">
  let {
    title,
    items = [],
    onSelect = () => {}
  }: {
    title: string;
    items?: string[];
    onSelect?: (item: string) => void;
  } = $props();
</script>
```

### 4. Replace Deprecated UI Libraries

**shadcn-svelte → bits-ui:**
```svelte
<!-- Before -->
<script>
  import { Button } from 'shadcn-svelte';
  import { Dialog } from 'shadcn-svelte';
</script>

<Button variant="default">Click</Button>

<!-- After -->
<script>
  import { Button, Dialog } from 'bits-ui';
</script>

<Button.Root>Click</Button.Root>
```

**Melt-UI → bits-ui:**
```svelte
<!-- Before -->
<script>
  import { createDialog } from '@melt-ui/svelte';
  const { trigger, content, overlay } = createDialog();
</script>

<!-- After -->
<script>
  import { Dialog } from 'bits-ui';
  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <!-- content -->
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## 📋 Migration Checklist

### Phase 1: Critical Fixes
- [ ] Replace deprecated packages (shadcn-svelte, Melt-UI)
- [ ] Update event handlers (on: → onclick)
- [ ] Fix TypeScript errors

### Phase 2: Runes Migration
- [ ] Convert `export let` to `$props()`
- [ ] Convert `let` to `$state()` for reactive variables
- [ ] Convert `$:` computed to `$derived()`
- [ ] Convert `$:` side effects to `$effect()`

### Phase 3: Optimization
- [ ] Remove unused imports
- [ ] Simplify component logic
- [ ] Add proper TypeScript types
- [ ] Update to UnoCSS classes

---

## 🎨 Styling Migration

### Tailwind/Custom CSS → UnoCSS

```svelte
<!-- Before -->
<div class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Button
</div>

<!-- After (UnoCSS) -->
<div class="bg-blue-5 hover:bg-blue-7 text-white font-bold py-2 px-4 rounded">
  Button
</div>
```

**Key Differences:**
- `bg-blue-500` → `bg-blue-5` (divide by 100)
- `text-gray-900` → `text-gray-9`
- Same utility names, just shorter numbers

---

## 🔧 Advanced Usage

### Batch Analysis
Analyze multiple routes:
```bash
# Create a script to analyze all routes
for route in /evidence /legal /ai/chat; do
  curl "http://localhost:5173/api/ast/analyze?route=$route"
done
```

### CI/CD Integration
Add to your pipeline:
```yaml
# .github/workflows/ast-check.yml
- name: Check for deprecated patterns
  run: |
    npm run ast:check
    # Fails if deprecated patterns found
```

### Custom Rules
Extend the analyzer in `/api/ast/analyze/+server.ts`:
```typescript
// Add custom pattern detection
const CUSTOM_PATTERNS = {
  'console.log': 'Remove console.log in production',
  'debugger': 'Remove debugger statements'
};
```

---

## 📚 Resources

### Official Docs
- [Svelte 5 Migration Guide](https://svelte-5-preview.vercel.app/docs/migration)
- [Bits-UI Documentation](https://bits-ui.com/)
- [UnoCSS Documentation](https://unocss.dev/)
- [ts-morph Documentation](https://ts-morph.com/)

### Internal Docs
- `/ALL_ROUTES_README.md` - Complete route organization
- `/docs/ACE_SYSTEM_README.md` - ACE error fixing system

---

## 🐛 Troubleshooting

### "Failed to analyze route"
- Check that the route path exists
- Ensure files have proper syntax
- Check console for detailed errors

### "No nodes found"
- Route may not have a `<script>` tag
- Try analyzing the parent route
- Check if files exist in the route directory

### False Positives
- Some patterns may be flagged incorrectly
- Review each recommendation manually
- Report issues for improvement

---

## 💡 Tips & Best Practices

1. **Start with Demos** - Fix v1-v4 demos first as examples
2. **One Pattern at a Time** - Don't try to fix everything at once
3. **Test After Changes** - Verify functionality after each migration
4. **Use TypeScript** - Catch errors early with proper types
5. **Follow the Checklist** - Work through phases systematically

---

## 🎯 Success Metrics

Track your migration progress:
- ✅ 0 deprecated packages
- ✅ 0 `on:` event handlers
- ✅ 0 `$:` reactive statements
- ✅ 0 `export let` props
- ✅ All routes use Svelte 5 runes

---

**Last Updated:** 2025-11-30
**Tool Version:** 1.0.0
**Svelte Version:** 5.x
