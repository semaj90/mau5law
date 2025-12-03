# Phase 82 Test Execution Guide

**Status:** Ready to test
**Date:** December 2, 2025
**Goal:** Verify Phase 82 works end-to-end

---

## Pre-Test Verification

### Check All Files Exist

```bash
# Verify code files
test -f sveltekit-frontend/src/routes/api/phase82/upgrade-route/+server.ts && echo "✅ upgrade-route endpoint"
test -f sveltekit-frontend/src/lib/components/RouteInspectorDetectiveBoard.svelte && echo "✅ Detective Board modal"
test -f sveltekit-frontend/src/routes/all-routes/+page.svelte && echo "✅ /all-routes page"
test -f sveltekit-frontend/scripts/phase82-svelte-runes-codemod.mjs && echo "✅ codemod script"

# Verify documentation
test -f PHASE82_TEST_PLAN.md && echo "✅ Test plan"
test -f SVELTE5_RUNES_QUICK_REFERENCE.md && echo "✅ Svelte 5 reference"
test -f START_HERE_PHASE82.md && echo "✅ Quick start"
```

---

## Test Execution Steps

### Step 1: Start Ollama (Terminal 1)

```bash
ollama serve
```

**Expected output:**
```
Listening on 127.0.0.1:11434
```

**Verify model is loaded:**
```bash
curl http://127.0.0.1:11434/api/tags
```

**Expected response:**
```json
{
  "models": [
    {
      "name": "gemma3-legal:latest",
      "modified_at": "...",
      "size": ...
    }
  ]
}
```

If model not loaded:
```bash
ollama pull gemma3-legal:latest
```

---

### Step 2: Start Dev Server (Terminal 2)

```bash
cd sveltekit-frontend
npm run dev:quic
```

**Expected output:**
```
  ➜  Local:   http://127.0.0.1:5173/
  ➜  press h + enter to show help
```

**Verify endpoints work:**
```bash
# In Terminal 3
curl http://127.0.0.1:5173/api/all-routes
curl http://127.0.0.1:5173/api/phase72/errors
```

---

### Step 3: Test 1 - Basic State Transformation

**Test file:** `test-basic-state.svelte`

```bash
cat > /tmp/test-basic-state.svelte << 'EOF'
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
EOF
```

**Run test:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  let count = 0;\n  let todos = [];\n  \n  function increment() {\n    count++;\n  }\n</script>\n\n<button onclick={increment}>\n  Count: {count}\n</button>"
  }' | jq .
```

**Expected output:**
```json
{
  "upgraded": "<script>\n  let count = $state(0);\n  let todos = $state([]);\n  \n  function increment() {\n    count++;\n  }\n</script>\n\n<button onclick={increment}>\n  Count: {count}\n</button>"
}
```

**Verify:**
- ✅ `let count = 0;` → `let count = $state(0);`
- ✅ `let todos = [];` → `let todos = $state([]);`
- ✅ Function unchanged
- ✅ HTML unchanged

---

### Step 4: Test 2 - Props Transformation

**Run test:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  export let name;\n  export let age = 30;\n</script>\n\n<p>{name} is {age} years old</p>"
  }' | jq .
```

**Expected output:**
```json
{
  "upgraded": "<script>\n  let { name, age = 30 } = $props();\n</script>\n\n<p>{name} is {age} years old</p>"
}
```

**Verify:**
- ✅ `export let` → `$props()`
- ✅ Fallback values preserved
- ✅ HTML unchanged

---

### Step 5: Test 3 - Reactive Labels Transformation

**Run test:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  let count = 0;\n  $: doubled = count * 2;\n</script>\n\n<p>{count} doubled is {doubled}</p>"
  }' | jq .
```

**Expected output:**
```json
{
  "upgraded": "<script>\n  let count = $state(0);\n  let doubled = $derived(count * 2);\n</script>\n\n<p>{count} doubled is {doubled}</p>"
}
```

**Verify:**
- ✅ `let count = 0;` → `let count = $state(0);`
- ✅ `$: doubled = ...` → `let doubled = $derived(...)`
- ✅ HTML unchanged

---

### Step 6: Test 4 - Lifecycle Hooks Transformation

**Run test:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  import { onMount } from \"svelte\";\n  \n  onMount(() => {\n    console.log(\"mounted\");\n  });\n</script>\n\n<p>Hello</p>"
  }' | jq .
```

**Expected output:**
```json
{
  "upgraded": "<script>\n  $effect(() => {\n    console.log(\"mounted\");\n  });\n</script>\n\n<p>Hello</p>"
}
```

**Verify:**
- ✅ `import { onMount }` removed
- ✅ `onMount` → `$effect`
- ✅ HTML unchanged

---

### Step 7: Test 5 - Complex Component Transformation

**Run test:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/svelte-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "src/routes/test/+page.svelte",
    "original": "<script>\n  import { onMount } from \"svelte\";\n  \n  export let items = [];\n  let filter = \"all\";\n  \n  $: filtered = items.filter(item => {\n    if (filter === \"done\") return item.done;\n    if (filter === \"active\") return !item.done;\n    return true;\n  });\n  \n  onMount(() => {\n    console.log(\"Component mounted\");\n  });\n</script>\n\n<select bind:value={filter}>\n  <option value=\"all\">All</option>\n  <option value=\"done\">Done</option>\n</select>\n\n{#each filtered as item}\n  <div>{item.text}</div>\n{/each}"
  }' | jq .
```

**Expected output:**
```json
{
  "upgraded": "<script>\n  let { items = [] } = $props();\n  let filter = $state(\"all\");\n  \n  let filtered = $derived(items.filter(item => {\n    if (filter === \"done\") return item.done;\n    if (filter === \"active\") return !item.done;\n    return true;\n  }));\n  \n  $effect(() => {\n    console.log(\"Component mounted\");\n  });\n</script>\n\n<select bind:value={filter}>\n  <option value=\"all\">All</option>\n  <option value=\"done\">Done</option>\n</select>\n\n{#each filtered as item}\n  <div>{item.text}</div>\n{/each}"
}
```

**Verify:**
- ✅ `export let` → `$props()`
- ✅ `let filter = "all"` → `let filter = $state("all")`
- ✅ `$: filtered = ...` → `let filtered = $derived(...)`
- ✅ `onMount` → `$effect`
- ✅ Import removed
- ✅ All HTML/logic unchanged

---

### Step 8: UI Test - /all-routes

**Visit:**
```
http://127.0.0.1:5173/all-routes
```

**Verify:**
- [ ] Page loads
- [ ] Route table visible
- [ ] Phase 72 status visible (green/yellow/red)
- [ ] Routes are clickable

**Click a route:**
- [ ] Detective Board modal opens
- [ ] Route dossier visible (left)
- [ ] Diagnostics visible (right)
- [ ] Phase 72 status card visible
- [ ] Phase 82 status card visible

**Click "Run Svelte 5 Codemod":**
- [ ] Button shows "⏳ Running..."
- [ ] Dev terminal shows codemod logs
- [ ] After ~5-10 seconds: "✅ Upgrade complete"

---

### Step 9: Verify Real File Transformation

**Create a test route with legacy Svelte:**
```bash
mkdir -p sveltekit-frontend/src/routes/test-phase82
cat > sveltekit-frontend/src/routes/test-phase82/+page.svelte << 'EOF'
<script>
  import { onMount } from 'svelte';

  export let title = 'Test';
  let count = 0;
  let message = '';

  $: doubled = count * 2;

  onMount(() => {
    console.log('Component mounted');
  });

  function increment() {
    count++;
    message = `Count is now ${count}`;
  }
</script>

<h1>{title}</h1>
<p>{message}</p>
<p>Count: {count}, Doubled: {doubled}</p>
<button onclick={increment}>Increment</button>
EOF
```

**Run codemod on this route:**
```bash
cd sveltekit-frontend
node scripts/phase82-svelte-runes-codemod.mjs --route /test-phase82
```

**Expected output:**
```
[phase82-codemod] Scanning for legacy Svelte patterns in route: /test-phase82
[phase82-codemod] Found 1 candidate files.
[phase82-codemod] Upgrading src/routes/test-phase82/+page.svelte...
[phase82-codemod] ✏️  Writing upgraded src/routes/test-phase82/+page.svelte
[phase82-codemod] Done. Upgraded: 1, Failed: 0
```

**Verify the file changed:**
```bash
cat sveltekit-frontend/src/routes/test-phase82/+page.svelte
```

**Expected content:**
```svelte
<script>
  let { title = 'Test' } = $props();
  let count = $state(0);
  let message = $state('');

  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('Component mounted');
  });

  function increment() {
    count++;
    message = `Count is now ${count}`;
  }
</script>

<h1>{title}</h1>
<p>{message}</p>
<p>Count: {count}, Doubled: {doubled}</p>
<button onclick={increment}>Increment</button>
```

**Verify:**
- ✅ `export let` → `$props()`
- ✅ `let count = 0` → `let count = $state(0)`
- ✅ `$: doubled = ...` → `let doubled = $derived(...)`
- ✅ `onMount` → `$effect`
- ✅ Import removed
- ✅ All logic unchanged

---

### Step 10: Test Route Endpoint

**Run codemod via HTTP endpoint:**
```bash
curl -X POST http://127.0.0.1:5173/api/phase82/upgrade-route \
  -H "Content-Type: application/json" \
  -d '{"route":"/test-phase82"}' | jq .
```

**Expected response:**
```json
{
  "ok": true,
  "route": "/test-phase82",
  "duration_ms": 2345,
  "stdout": "[phase82-codemod] Scanning...\n..."
}
```

**Verify:**
- ✅ `ok: true`
- ✅ `duration_ms` is reasonable (<10s)
- ✅ `stdout` contains codemod logs

---

## Test Results Template

```
═══════════════════════════════════════════════════════════════════════════
PHASE 82 TEST RESULTS
═══════════════════════════════════════════════════════════════════════════

Date: [DATE]
Tester: [NAME]
Environment: [OS/Node/Ollama versions]

PRE-TEST VERIFICATION
─────────────────────────────────────────────────────────────────────────
✅ All files exist
✅ Ollama running
✅ Dev server running
✅ Endpoints responding

ENDPOINT TESTS
─────────────────────────────────────────────────────────────────────────
Test 1: Basic State Transformation
  Status: [PASS/FAIL]
  Notes: [any issues]

Test 2: Props Transformation
  Status: [PASS/FAIL]
  Notes: [any issues]

Test 3: Reactive Labels Transformation
  Status: [PASS/FAIL]
  Notes: [any issues]

Test 4: Lifecycle Hooks Transformation
  Status: [PASS/FAIL]
  Notes: [any issues]

Test 5: Complex Component Transformation
  Status: [PASS/FAIL]
  Notes: [any issues]

UI TESTS
─────────────────────────────────────────────────────────────────────────
/all-routes Page Load
  Status: [PASS/FAIL]
  Notes: [any issues]

Detective Board Modal
  Status: [PASS/FAIL]
  Notes: [any issues]

Codemod Execution
  Status: [PASS/FAIL]
  Notes: [any issues]

REAL FILE TRANSFORMATION
─────────────────────────────────────────────────────────────────────────
Test Route Creation
  Status: [PASS/FAIL]
  Notes: [any issues]

CLI Codemod Execution
  Status: [PASS/FAIL]
  Notes: [any issues]

File Verification
  Status: [PASS/FAIL]
  Notes: [any issues]

HTTP Endpoint Test
  Status: [PASS/FAIL]
  Notes: [any issues]

SUMMARY
─────────────────────────────────────────────────────────────────────────
Total Tests: 10
Passed: [X]
Failed: [Y]
Success Rate: [X/10]

Transformation Accuracy: [%]
Manual Fixes Needed: [%]

Overall Assessment: [PASS/FAIL]

Issues Found:
  1. [issue]
  2. [issue]

Recommendations:
  1. [recommendation]
  2. [recommendation]

═══════════════════════════════════════════════════════════════════════════
```

---

## Success Criteria

### All Tests Pass ✅
- ✅ All 5 endpoint tests pass
- ✅ All UI tests pass
- ✅ Real file transformation works
- ✅ HTTP endpoint works
- ✅ Transformation accuracy: >90%
- ✅ Manual fixes needed: <10%

### Some Tests Fail ⚠️
- Document which tests failed
- Check error messages
- Update LLM prompt if needed
- Re-test

### Major Issues 🔴
- Revert changes
- Debug root cause
- Fix and re-test

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

## Next Steps After Testing

### If All Tests Pass ✅
1. Document results
2. Deploy to production
3. Monitor real-world usage
4. Collect edge cases
5. Plan Phase 83 (embedding)

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

**Ready to test! Start with Step 1 and work through systematically.**
