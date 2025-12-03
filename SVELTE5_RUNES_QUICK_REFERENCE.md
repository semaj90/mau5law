# Svelte 5 Runes Quick Reference

**For Phase 82 Codemod Accuracy**

This is a condensed reference extracted from `svelte-complete.txt` for the Phase 82 LLM transformer to use when converting legacy Svelte 3/4 code to Svelte 5 runes.

---

## Core Runes

### `$state` — Reactive State

**Legacy (Svelte 3/4):**
```svelte
<script>
  let count = 0;
  let todos = [];
  let person = { name: 'John', age: 30 };
</script>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0);
  let todos = $state([]);
  let person = $state({ name: 'John', age: 30 });
</script>
```

**Key Points:**
- Wraps initial value in `$state()`
- Arrays and objects become deeply reactive proxies
- Mutations trigger granular updates
- Can be used in class fields
- Use `$state.raw` for non-reactive objects/arrays
- Use `$state.snapshot()` to get static snapshot

---

### `$derived` — Computed Values

**Legacy (Svelte 3/4):**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: {
    console.log('count changed');
  }
</script>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);

  // For complex derivations:
  let total = $derived.by(() => {
    let sum = 0;
    for (const n of numbers) {
      sum += n;
    }
    return sum;
  });
</script>
```

**Key Points:**
- Replaces `$:` reactive labels
- Expression must be side-effect free
- Automatically tracks dependencies
- Can be temporarily overridden (for optimistic UI)
- Use `$derived.by()` for complex logic
- Destructuring creates reactive variables

---

### `$effect` — Side Effects

**Legacy (Svelte 3/4):**
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';

  let canvas;

  onMount(() => {
    const context = canvas.getContext('2d');
    context.fillStyle = 'red';
    context.fillRect(0, 0, 100, 100);
  });

  onDestroy(() => {
    // cleanup
  });
</script>
```

**Svelte 5:**
```svelte
<script>
  let canvas;
  let color = $state('red');

  $effect(() => {
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 100, 100);

    // Optional: return cleanup function
    return () => {
      // cleanup runs before re-run or on destroy
    };
  });

  // For pre-DOM-update effects:
  $effect.pre(() => {
    // runs before DOM updates
  });
</script>
```

**Key Points:**
- Replaces `onMount`, `beforeUpdate`, `afterUpdate`, `onDestroy`
- Automatically tracks dependencies
- Runs after DOM updates (use `$effect.pre` for before)
- Can return teardown function
- Only runs in browser (not SSR)
- Batches multiple state changes

---

### `$props` — Component Inputs

**Legacy (Svelte 3/4):**
```svelte
<script>
  export let name;
  export let age = 30;
  export let { x, y } = {};
</script>
```

**Svelte 5:**
```svelte
<script>
  let { name, age = 30, x, y } = $props();

  // Or with rest:
  let { a, b, ...others } = $props();

  // Or rename:
  let { super: trouper = 'lights' } = $props();
</script>
```

**Key Points:**
- Use `$props()` to receive all props
- Destructure to get individual props
- Fallback values work as normal
- Can rename props (useful for keywords)
- Rest properties capture remaining props
- Props can be temporarily overridden in child

---

## Lifecycle Hooks → Effects

### `onMount` → `$effect`

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('component mounted');
    return () => {
      console.log('component destroyed');
    };
  });
</script>
```

**After:**
```svelte
<script>
  $effect(() => {
    console.log('component mounted');
    return () => {
      console.log('component destroyed');
    };
  });
</script>
```

---

### `beforeUpdate` → `$effect.pre`

**Before:**
```svelte
<script>
  import { beforeUpdate } from 'svelte';

  beforeUpdate(() => {
    console.log('before DOM update');
  });
</script>
```

**After:**
```svelte
<script>
  $effect.pre(() => {
    console.log('before DOM update');
  });
</script>
```

---

### `afterUpdate` → `$effect`

**Before:**
```svelte
<script>
  import { afterUpdate } from 'svelte';

  afterUpdate(() => {
    console.log('after DOM update');
  });
</script>
```

**After:**
```svelte
<script>
  $effect(() => {
    console.log('after DOM update');
  });
</script>
```

---

### `onDestroy` → `$effect` return

**Before:**
```svelte
<script>
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    console.log('component destroyed');
  });
</script>
```

**After:**
```svelte
<script>
  $effect(() => {
    return () => {
      console.log('component destroyed');
    };
  });
</script>
```

---

## Common Patterns

### Reactive Declarations

**Before:**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: if (count > 10) {
    console.log('count is large');
  }
</script>
```

**After:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    if (count > 10) {
      console.log('count is large');
    }
  });
</script>
```

---

### Two-Way Binding

**Before:**
```svelte
<script>
  let value = '';
</script>

<input bind:value />
```

**After:**
```svelte
<script>
  let value = $state('');
</script>

<input bind:value />
```

---

### Class-Based State

**Before:**
```svelte
<script>
  class Counter {
    constructor() {
      this.count = 0;
    }

    increment() {
      this.count++;
    }
  }

  const counter = new Counter();
</script>
```

**After:**
```svelte
<script>
  class Counter {
    count = $state(0);

    increment = () => {
      this.count++;
    };
  }

  const counter = new Counter();
</script>
```

---

### Async/Await

**Before:**
```svelte
<script>
  let promise = fetch('/api/data').then(r => r.json());
</script>

{#await promise}
  Loading...
{:then data}
  {data}
{:catch error}
  Error: {error}
{/await}
```

**After:**
```svelte
<script>
  let data = $state(null);
  let error = $state(null);
  let loading = $state(true);

  $effect(async () => {
    try {
      const response = await fetch('/api/data');
      data = await response.json();
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  Loading...
{:else if error}
  Error: {error}
{:else}
  {data}
{/if}
```

---

## Transformation Rules for Phase 82

### Rule 1: `export let` → `$props()`
```
export let name;
export let age = 30;
↓
let { name, age = 30 } = $props();
```

### Rule 2: Top-level `let` → `$state()`
```
let count = 0;
let todos = [];
↓
let count = $state(0);
let todos = $state([]);
```

### Rule 3: `$:` reactive labels → `$derived()` or `$effect()`
```
$: doubled = count * 2;
↓
let doubled = $derived(count * 2);

$: if (count > 10) { ... }
↓
$effect(() => {
  if (count > 10) { ... }
});
```

### Rule 4: Lifecycle hooks → `$effect()`
```
onMount(() => { ... })
beforeUpdate(() => { ... })
afterUpdate(() => { ... })
onDestroy(() => { ... })
↓
$effect(() => { ... })
$effect.pre(() => { ... })
$effect(() => { ... })
$effect(() => { return () => { ... } })
```

### Rule 5: Imports removal
```
import { onMount, onDestroy } from 'svelte';
↓
(remove - not needed)
```

---

## Edge Cases

### Destructuring State
```svelte
<script>
  let todos = $state([...]);
  let { done, text } = todos[0];
  // ⚠️ done and text are NOT reactive
  // Use $derived instead:
  let { done, text } = $derived(todos[0]);
</script>
```

### Passing State to Functions
```svelte
<script>
  let count = $state(0);

  function increment(c) {
    return c + 1;
  }

  // ⚠️ This won't work as expected
  // count = increment(count); // loses reactivity

  // ✅ Do this instead:
  count = increment(count);
</script>
```

### Conditional Dependencies
```svelte
<script>
  let condition = $state(true);
  let color = $state('red');

  $effect(() => {
    if (condition) {
      // color is a dependency here
      console.log(color);
    }
    // If condition is false, color is NOT a dependency
  });
</script>
```

---

## Svelte 5 Features Not in Svelte 3/4

### `.svelte.js` and `.svelte.ts` Files
```js
// state.svelte.js
export const counter = $state({ count: 0 });

export function increment() {
  counter.count++;
}
```

### `$effect.tracking()`
```svelte
<script>
  console.log($effect.tracking()); // false in setup

  $effect(() => {
    console.log($effect.tracking()); // true in effect
  });
</script>
```

### `$effect.pending()`
```svelte
<script>
  let pending = $state(0);

  $effect(() => {
    pending = $effect.pending();
  });
</script>

{#if pending > 0}
  {pending} promises pending...
{/if}
```

### `$effect.root()`
```svelte
<script>
  const destroy = $effect.root(() => {
    $effect(() => {
      // setup
    });
    return () => {
      // cleanup
    };
  });

  // later...
  destroy();
</script>
```

---

## Common Mistakes to Avoid

❌ **Don't update state in effects:**
```svelte
$effect(() => {
  count++; // ❌ Can cause infinite loops
});
```

✅ **Use derived instead:**
```svelte
let doubled = $derived(count * 2);
```

---

❌ **Don't use effects for state synchronization:**
```svelte
$effect(() => {
  left = total - spent; // ❌ Convoluted
});
```

✅ **Use derived:**
```svelte
let left = $derived(total - spent);
```

---

❌ **Don't destructure reactive values:**
```svelte
let { x, y } = $state({ x: 0, y: 0 }); // ❌ x, y not reactive
```

✅ **Keep as object or use derived:**
```svelte
let pos = $state({ x: 0, y: 0 });
let x = $derived(pos.x);
let y = $derived(pos.y);
```

---

## Summary Table

| Svelte 3/4 | Svelte 5 | Purpose |
|-----------|---------|---------|
| `let x = 0` | `let x = $state(0)` | Reactive state |
| `export let x` | `let { x } = $props()` | Component props |
| `$: y = x * 2` | `let y = $derived(x * 2)` | Computed values |
| `$: { ... }` | `$effect(() => { ... })` | Side effects |
| `onMount` | `$effect` | After mount |
| `beforeUpdate` | `$effect.pre` | Before DOM update |
| `afterUpdate` | `$effect` | After DOM update |
| `onDestroy` | `$effect` return | Cleanup |
| `import { ... }` | (remove) | Lifecycle imports |

---

**Use this reference when improving Phase 82's LLM prompts for higher accuracy transformations.**
