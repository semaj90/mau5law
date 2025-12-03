# Phase 82 Test Plan

**Status:** Ready to test
**Date:** December 2, 2025
**Goal:** Verify enhanced LLM transformer accuracy

---

## Pre-Test Checklist

- [ ] Ollama is running: `ollama serve`
- [ ] Gemma3 model is loaded: `ollama list | grep gemma3`
- [ ] Dev server can start: `npm run dev:quic`
- [ ] `/all-routes` endpoint works
- [ ] Phase 72 errors endpoint works

---

## Test Setup

### 1. Start Services

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Dev server
cd sveltekit-frontend
npm run dev:quic

# Terminal 3: Ready for testing
```

### 2. Verify Endpoints

```bash
# Check Ollama
curl http://127.0.0.1:11434/api/tags

# Check dev server
curl http://127.0.0.1:5173/api/all-routes

# Check Phase 72
curl http://127.0.0.1:5173/api/phase72/errors
```

---

## Test Cases

### Test 1: Basic State Transformation

**Input File:**
```svelte
<script>
  let count = 0;
  let todos = [];

  function increment() {
    count++;
  }
</script>

<button onclick={increment}>
  Count: {count}
</button>
```

**Expected Output:**
```svelte
<script>
  let count = $state(0);
  let todos = $state([]);

  function increment() {
    count++;
  }
</script>

<button onclick={increment}>
  Count: {count}
</button>
```

**Test Command:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  let count = 0;\n  let todos = [];\n  \n  function increment() {\n    count++;\n  }\n</script>\n\n<button onclick={increment}>\n  Count: {count}\n</button>"
  }'
```

**Success Criteria:**
- ✅ `let count = 0;` → `let count = $state(0);`
- ✅ `let todos = [];` → `let todos = $state([]);`
- ✅ Function logic unchanged
- ✅ HTML unchanged

---

### Test 2: Props Transformation

**Input File:**
```svelte
<script>
  export let name;
  export let age = 30;
  export let { x, y } = {};
</script>

<p>{name} is {age} years old</p>
<p>Position: {x}, {y}</p>
```

**Expected Output:**
```svelte
<script>
  let { name, age = 30, x, y } = $props();
</script>

<p>{name} is {age} years old</p>
<p>Position: {x}, {y}</p>
```

**Test Command:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  export let name;\n  export let age = 30;\n  export let { x, y } = {};\n</script>\n\n<p>{name} is {age} years old</p>\n<p>Position: {x}, {y}</p>"
  }'
```

**Success Criteria:**
- ✅ `export let` → `let { ... } = $props()`
- ✅ Fallback values preserved
- ✅ Destructuring preserved
- ✅ HTML unchanged

---

### Test 3: Reactive Labels Transformation

**Input File:**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: if (count > 10) {
    console.log('count is large');
  }
</script>

<p>{count} doubled is {doubled}</p>
```

**Expected Output:**
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

<p>{count} doubled is {doubled}</p>
```

**Test Command:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  let count = 0;\n  $: doubled = count * 2;\n  $: if (count > 10) {\n    console.log(\"count is large\");\n  }\n</script>\n\n<p>{count} doubled is {doubled}</p>"
  }'
```

**Success Criteria:**
- ✅ `let count = 0;` → `let count = $state(0);`
- ✅ `$: doubled = ...` → `let doubled = $derived(...)`
- ✅ `$: if (...)` → `$effect(() => { if (...) })`
- ✅ HTML unchanged

---

### Test 4: Lifecycle Hooks Transformation

**Input File:**
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';

  let canvas;

  onMount(() => {
    console.log('mounted');
    return () => {
      console.log('destroyed');
    };
  });

  onDestroy(() => {
    console.log('cleanup');
  });
</script>

<canvas bind:this={canvas}></canvas>
```

**Expected Output:**
```svelte
<script>
  let canvas;

  $effect(() => {
    console.log('mounted');
    return () => {
      console.log('destroyed');
    };
  });

  $effect(() => {
    return () => {
      console.log('cleanup');
    };
  });
</script>

<canvas bind:this={canvas}></canvas>
```

**Test Command:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  import { onMount, onDestroy } from \"svelte\";\n  \n  let canvas;\n  \n  onMount(() => {\n    console.log(\"mounted\");\n    return () => {\n      console.log(\"destroyed\");\n    };\n  });\n  \n  onDestroy(() => {\n    console.log(\"cleanup\");\n  });\n</script>\n\n<canvas bind:this={canvas}></canvas>"
  }'
```

**Success Criteria:**
- ✅ `import { onMount, onDestroy }` removed
- ✅ `onMount` → `$effect`
- ✅ `onDestroy` → `$effect` with return
- ✅ Cleanup functions preserved
- ✅ HTML unchanged

---

### Test 5: Complex Component Transformation

**Input File:**
```svelte
<script>
  import { onMount } from 'svelte';

  export let items = [];
  let filter = 'all';
  let selectedIndex = 0;

  $: filtered = items.filter(item => {
    if (filter === 'done') return item.done;
    if (filter === 'active') return !item.done;
    return true;
  });

  $: selected = filtered[selectedIndex];

  onMount(() => {
    console.log('Component mounted with', items.length, 'items');
  });

  function toggleItem(index) {
    items[index].done = !items[index].done;
  }
</script>

<div>
  <select bind:value={filter}>
    <option value="all">All</option>
    <option value="done">Done</option>
    <option value="active">Active</option>
  </select>

  {#each filtered as item, i}
    <div onclick={() => toggleItem(i)}>
      {item.text}
    </div>
  {/each}

  {#if selected}
    <p>Selected: {selected.text}</p>
  {/if}
</div>
```

**Expected Output:**
```svelte
<script>
  let { items = [] } = $props();
  let filter = $state('all');
  let selectedIndex = $state(0);

  let filtered = $derived(items.filter(item => {
    if (filter === 'done') return item.done;
    if (filter === 'active') return !item.done;
    return true;
  }));

  let selected = $derived(filtered[selectedIndex]);

  $effect(() => {
    console.log('Component mounted with', items.length, 'items');
  });

  function toggleItem(index) {
    items[index].done = !items[index].done;
  }
</script>

<div>
  <select bind:value={filter}>
    <option value="all">All</option>
    <option value="done">Done</option>
    <option value="active">Active</option>
  </select>

  {#each filtered as item, i}
    <div onclick={() => toggleItem(i)}>
      {item.text}
    </div>
  {/each}

  {#if selected}
    <p>Selected: {selected.text}</p>
  {/if}
</div>
```

**Success Criteria:**
- ✅ `export let` → `$props()`
- ✅ `let filter = 'all'` → `let filter = $state('all')`
- ✅ `$: filtered = ...` → `let filtered = $derived(...)`
- ✅ `$: selected = ...` → `let selected = $derived(...)`
- ✅ `onMount` → `$effect`
- ✅ Import removed
- ✅ All HTML/logic unchanged

---

## UI Test (Manual)

### Step 1: Visit /all-routes
```
http://127.0.0.1:5173/all-routes
```

### Step 2: Observe
- [ ] Route table loads
- [ ] Phase 72 status visible (green/yellow/red)
- [ ] Routes clickable

### Step 3: Click a route with legacy Svelte code
- [ ] Detective Board modal opens
- [ ] Route dossier visible (left)
- [ ] Diagnostics visible (right)
- [ ] Phase 72 status card visible
- [ ] Phase 82 status card visible

### Step 4: Click "Run Svelte 5 Codemod"
- [ ] Button shows "⏳ Running..."
- [ ] Dev terminal shows codemod logs
- [ ] After ~5-10 seconds: "✅ Upgrade complete"
- [ ] Modal closes or updates

### Step 5: Verify files changed
```bash
cd sveltekit-frontend
git diff src/routes/[your-route]/
```

- [ ] `export let` → `$props()`
- [ ] `let` → `$state()`
- [ ] `$:` → `$derived()` or `$effect()`
- [ ] Lifecycle hooks → `$effect()`
- [ ] Imports removed

---

## Success Criteria

### Endpoint Tests
- ✅ All 5 test cases pass
- ✅ Transformations are accurate
- ✅ No syntax errors in output
- ✅ Component behavior preserved
- ✅ HTML/CSS unchanged

### UI Tests
- ✅ Modal opens correctly
- ✅ Codemod runs without errors
- ✅ Files are actually transformed
- ✅ Dev server rebuilds successfully
- ✅ No console errors

### Overall
- ✅ Transformation accuracy: ~95%+
- ✅ Manual fixes needed: <5%
- ✅ Edge cases handled well
- ✅ Consistent results

---

## Troubleshooting

### Ollama not responding
```bash
# Check if running
curl http://127.0.0.1:11434/api/tags

# If not, start it
ollama serve

# If model not loaded
ollama pull gemma3-legal:latest
```

### Dev server won't start
```bash
# Check for port conflicts
lsof -i :5173

# Clear cache
rm -rf .svelte-kit
npm run dev:quic
```

### Codemod times out
- Increase timeout in `/api/phase82/upgrade-route/+server.ts`
- Check Ollama is responsive
- Try with smaller file first

### Transformations are wrong
- Check LLM prompt in `/api/phase82/svelte-upgrade/+server.ts`
- Verify Gemma3 model is loaded
- Try with simpler file first
- Check `SVELTE5_RUNES_QUICK_REFERENCE.md` for expected patterns

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Single file transform | <5s | ? |
| Route with 3 files | <15s | ? |
| LLM accuracy | >95% | ? |
| Manual fixes needed | <5% | ? |

---

## Test Results Template

```
Date: [DATE]
Tester: [NAME]
Environment: [OS/Node/Ollama versions]

Test 1: Basic State
- Status: [PASS/FAIL]
- Notes: [any issues]

Test 2: Props
- Status: [PASS/FAIL]
- Notes: [any issues]

Test 3: Reactive Labels
- Status: [PASS/FAIL]
- Notes: [any issues]

Test 4: Lifecycle Hooks
- Status: [PASS/FAIL]
- Notes: [any issues]

Test 5: Complex Component
- Status: [PASS/FAIL]
- Notes: [any issues]

UI Tests
- Status: [PASS/FAIL]
- Notes: [any issues]

Overall Assessment: [PASS/FAIL]
Accuracy: [%]
Issues Found: [list]
Recommendations: [list]
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Deploy to production
2. Monitor real-world usage
3. Collect edge cases
4. Plan Phase 83 (embedding)

### If Some Tests Fail ⚠️
1. Document failures
2. Update LLM prompt
3. Re-test
4. Iterate until passing

### If Major Issues 🔴
1. Revert changes
2. Debug root cause
3. Fix and re-test
4. Document lessons learned

---

**Ready to test!** Start with Test 1 and work through systematically.
