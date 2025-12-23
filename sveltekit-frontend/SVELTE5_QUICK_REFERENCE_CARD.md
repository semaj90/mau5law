# Svelte 5 Migration - Quick Reference Card

**Phase 76** | **For Developers** | **Print & Keep Handy**

---

## 🚀 Most Common Migrations

### 1. Store → $state Class
```typescript
// ❌ BEFORE (Svelte 4)
import { writable } from 'svelte/store';
export const count = writable(0);

// ✅ AFTER (Svelte 5)
class CounterStore {
  value = $state(0);
}
export const count = new CounterStore();
```

---

### 2. Props: export let → $props()
```svelte
<!-- ❌ BEFORE -->
<script>
  export let name: string;
  export let age: number = 0;
</script>

<!-- ✅ AFTER -->
<script>
  let { name, age = 0 } = $props<{
    name: string;
    age?: number;
  }>();
</script>
```

---

### 3. Lifecycle: onMount → $effect
```svelte
<!-- ❌ BEFORE -->
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('Mounted');
  });
</script>

<!-- ✅ AFTER -->
<script>
  $effect(() => {
    console.log('Mounted');
  });
</script>
```

---

### 4. Cleanup: onDestroy → $effect return
```svelte
<!-- ❌ BEFORE -->
<script>
  import { onMount, onDestroy } from 'svelte';
  let interval;

  onMount(() => {
    interval = setInterval(() => {...}, 1000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<!-- ✅ AFTER -->
<script>
  $effect(() => {
    const interval = setInterval(() => {...}, 1000);
    return () => clearInterval(interval);
  });
</script>
```

---

### 5. Reactive: $: → $derived
```svelte
<!-- ❌ BEFORE -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<!-- ✅ AFTER -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

---

### 6. Events: createEventDispatcher → Callbacks
```svelte
<!-- ❌ BEFORE -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click', { data: 123 });
  }
</script>

<!-- ✅ AFTER -->
<script>
  let { onclick } = $props<{
    onclick?: (e: CustomEvent<{ data: number }>) => void;
  }>();

  function handleClick() {
    onclick?.(new CustomEvent('click', {
      detail: { data: 123 }
    }));
  }
</script>
```

---

## 🛠️ CLI Commands

```bash
# Audit all stores
node scripts/phase76-audit-stores.mjs

# Migrate specific store
node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts

# Find components using old import
rg "from '\$lib/stores/user'" src/

# Type check
npm run check

# Test migration
npm run phase76:test
```

---

## 🎯 Decision Tree

### "Should I use $state or $derived?"

**Use `$state`**:
- Value can change
- Need to mutate it
- Examples: form input, toggle, counter

**Use `$derived`**:
- Value computed from other state
- Read-only
- Examples: total price, filtered list, formatted date

---

### "When to use $effect?"

**Use `$effect`** for:
- Side effects (API calls, logging, analytics)
- DOM manipulation
- Third-party library setup
- Subscriptions

**Don't use `$effect`** for:
- Computed values → Use `$derived`
- Simple state → Use `$state`

---

## ⚠️ Common Pitfalls

### Pitfall 1: SSR Crashes
```typescript
// ❌ BAD
class Store {
  data = $state(localStorage.getItem('key'));
}

// ✅ GOOD
class Store {
  data = $state<string | null>(null);
  constructor() {
    if (typeof window !== 'undefined') {
      this.data = localStorage.getItem('key');
    }
  }
}
```

---

### Pitfall 2: Infinite Loop
```typescript
// ❌ BAD
$effect(() => {
  count = count + 1; // Infinite loop!
});

// ✅ GOOD
let doubled = $derived(count * 2);
```

---

### Pitfall 3: Forgotten Cleanup
```typescript
// ❌ BAD
$effect(() => {
  const timer = setInterval(() => {...}, 1000);
  // Memory leak!
});

// ✅ GOOD
$effect(() => {
  const timer = setInterval(() => {...}, 1000);
  return () => clearInterval(timer);
});
```

---

## 📋 Migration Checklist

**Before Committing**:
- [ ] `npm run check` passes (no TypeScript errors)
- [ ] `npm run phase76:test` passes
- [ ] Browser console clean (no errors)
- [ ] Imports updated (`.svelte.ts` extension)
- [ ] Backup created (`.svelte4.backup`)
- [ ] Migration report reviewed

---

## 🔍 Find & Replace Patterns

### Find Files Needing Migration
```bash
# Find writable stores
rg "writable<" src/lib/stores/ -l

# Find export let
rg "export let" src/lib/components/ -l

# Find onMount
rg "from 'svelte'" src/routes/ -l | xargs rg "onMount"

# Find createEventDispatcher
rg "createEventDispatcher" src/ -l
```

---

## 📊 File Naming Convention

| Type | Before | After |
|------|--------|-------|
| **Store** | `user.ts` | `user.svelte.ts` |
| **Component** | `MyComponent.svelte` | *(no change)* |
| **Backup** | - | `user.ts.svelte4.backup` |
| **Report** | - | `user.migration-report.md` |

---

## 🎨 Example Store (Full Template)

```typescript
// preferences.svelte.ts
class UserPreferences {
  // State
  theme = $state<'light' | 'dark'>('light');
  fontSize = $state(1.0);

  // Derived (computed)
  isDarkMode = $derived(this.theme === 'dark');
  scaledFontSize = $derived(this.fontSize * 16);

  // Methods
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }

  increaseFontSize() {
    this.fontSize = Math.min(1.5, this.fontSize + 0.1);
  }

  // SSR-safe initialization
  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.theme = prefs.theme;
        this.fontSize = prefs.fontSize;
      }
    }
  }
}

export const userPrefs = new UserPreferences();

// Auto-save to localStorage
if (typeof window !== 'undefined') {
  $effect(() => {
    localStorage.setItem('prefs', JSON.stringify({
      theme: userPrefs.theme,
      fontSize: userPrefs.fontSize
    }));
  });
}
```

---

## 🔗 Quick Links

- [Full Migration Guide](./PHASE76_SVELTE5_MIGRATION_OPPORTUNITIES.md)
- [Audit Tool](./scripts/phase76-audit-stores.mjs)
- [Migration Script](./scripts/phase76-migrate-store.mjs)
- [Roadmap](./SVELTE5_MIGRATION_ROADMAP.md)
- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/docs/runes)

---

**🎯 Remember**: When in doubt, check the existing migrated stores:
- `src/lib/stores/preferences.svelte.ts`
- `src/lib/stores/tokenUsage.svelte.ts`
- `src/lib/stores/localDocs.svelte.ts`

**💡 Tip**: Run `node scripts/phase76-audit-stores.mjs` to see your progress!
