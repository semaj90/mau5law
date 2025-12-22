# 🚀 Quick Reference: Phase 76 VS Code Tasks

**8 new tasks for Svelte 5 migration with contextual prompting**

---

## 📚 Task 1: Download Svelte Docs
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `📚 Svelte 5: Download Docs`

```
Downloads/refreshes Svelte documentation cache
- svelte.dev/docs/svelte/llms.txt
- svelte.dev/docs/kit/llms.txt
- Saves to data/svelte-docs/
```

**Use when**: First run, or when Svelte releases new version

---

## 🔍 Task 2: Contextual Query
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🔍 Svelte 5: Contextual Query`

```
Query Gemma3 with Svelte docs context
- Auto-detects keywords from query
- Uses ripgrep for fast extraction
- Injects Svelte 5 enforcement rules
- Saves result to data/svelte-docs/
```

**Example Queries**:
- `How do I replace export let?`
- `What is $derived for?`
- `How do I migrate $: reactive statements?`

---

## 🔧 Task 3: Detect Migrations
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🔧 Svelte 5: Detect Migrations`

```
Detect legacy Svelte patterns in file
- export let → $props()
- $: reactive → $derived()
- $: effects → $effect()
- Mutated vars → $state()
- new Component() → mount()
```

**Input**: File path (e.g., `src/lib/MyComponent.svelte`)

**Output**: Structured migrations with line numbers and severity

---

## 🛡️ Task 4: Audit Standards
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🛡️ Svelte 5: Audit Standards`

```
Check for jQuery, eval(), and legacy libraries
- jQuery (CRITICAL)
- eval() (CRITICAL - security risk)
- .animate() (HIGH)
- Inline styles (MEDIUM if > 3)
```

**Input**: File path

**Output**: Violations with fix suggestions and code examples

---

## 🔒 Task 5: Check SSR Safety
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🔒 Svelte 5: Check SSR Safety`

```
Verify no browser globals in server-side code
- window, document, localStorage
- Detects .server. files (CRITICAL)
- Provides guard suggestions
```

**Input**: File path (especially `.server.ts` files)

**Output**: Issues with severity and fix recommendations

---

## 🚀 Task 6: Full Migration Pipeline
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🚀 Svelte 5: Full Migration Pipeline`

```
Run all 3 tools in sequence:
1. Detect Migrations
2. Audit Standards
3. Check SSR Safety
```

**Input**: File path

**Output**: Comprehensive report with all detections

---

## 🧠 Task 7: Phase 79 with Context
**Shortcut**: `Ctrl+Shift+P` → `Tasks: Run Task` → `🧠 Phase 79: With Contextual Prompting`

```
Run Phase 79 cognitive engine with Svelte docs context
- Reads error_cluster from PostgreSQL
- Uses contextual prompting for solutions
- Applies migration tools
- Generates Svelte 5-compliant patches
```

**Environment**:
- `CONTEXT_ENGINE=true`
- `SVELTE_DOCS_PATH=data/svelte-docs`

**Output**: Patches in `reports/latest/`

---

## 🎯 Common Workflows

### Workflow 1: Migrate Single Component
```
1. Run "Detect Migrations" on MyComponent.svelte
2. Review suggested migrations
3. Run "Audit Standards" to check for jQuery
4. Apply migrations manually or use CLI --apply flag
```

### Workflow 2: Query Svelte Docs
```
1. Run "Contextual Query"
2. Enter question: "How do I use $effect?"
3. Review response with Svelte 5 enforcement
4. Check saved result in data/svelte-docs/
```

### Workflow 3: Full Pipeline with Phase 79
```
1. Run "Phase 79: With Contextual Prompting"
2. System processes all errors from PostgreSQL
3. Generates patches with context
4. Review patches in reports/latest/
```

### Workflow 4: SSR Safety Audit
```
1. Run "Check SSR Safety" on .server.ts file
2. Review browser global detections
3. Apply guards: if (typeof window !== 'undefined')
```

---

## 🔧 CLI Equivalents

### Contextual Prompting
```powershell
# Download docs
node scripts/mcp/contextual-prompt-engineer.mjs --force-download

# Query
node scripts/mcp/contextual-prompt-engineer.mjs "How do I replace export let?"

# Help
node scripts/mcp/contextual-prompt-engineer.mjs --help
```

### Migration Tools
```powershell
# Detect migrations
node scripts/mcp/svelte5-migration-tools.mjs --file src/lib/MyComponent.svelte

# Audit standards
node scripts/mcp/svelte5-migration-tools.mjs --audit src/routes/+page.svelte

# Check SSR safety
node scripts/mcp/svelte5-migration-tools.mjs --ssr-check src/routes/api/+server.js

# Apply migrations (creates .bak)
node scripts/mcp/svelte5-migration-tools.mjs --apply src/lib/MyComponent.svelte

# Help
node scripts/mcp/svelte5-migration-tools.mjs --help
```

---

## 📊 Output Examples

### Contextual Query Output
```
🔍 Query: How do I replace export let?

✅ Using cached docs (15 minutes old)
🔍 Searching docs for keywords: export let, props, $props
📏 Prompt length: 2847 chars
⏳ Querying Ollama...

✅ Response:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In Svelte 5, replace `export let name = 'value'` with:

let { name = 'value' } = $props();

This uses destructuring assignment to extract props. Multiple props:

let { name = 'World', count = 0 } = $props();
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Stats:
   Tokens: 1024
   Time: 54.23s
   Context included: 3 keyword patterns

💾 Saved to data/svelte-docs/query-result-1734895234567.md
```

### Detect Migrations Output
```
🔍 Analyzing: src/lib/MyComponent.svelte

📊 Summary:
   Total issues: 3
   Critical: 1
   High: 1
   Medium: 1

⚠️  Warnings:

   [CRITICAL] Found 2 'export let' declarations. Svelte 5 requires $props().
   Fix: Replace with destructured $props()

   [HIGH] Reactive labels ($:) are deprecated in Svelte 5.
   Fix: Use $derived() for computed values or $effect() for side effects

🔧 Migrations:

   Line 2 [export_let]:
   - export let name = 'World';
   + let { name = 'World' } = $props();

   Line 5 [reactive_label]:
   - $: doubled = count * 2;
   + let doubled = $derived(count * 2);
```

### Audit Standards Output
```
🛡️  Auditing Web Standards: src/routes/+page.svelte

📊 Summary:
   Total violations: 2

⚠️  Violations:

   [CRITICAL] jQuery detected. This is banned.
   Fix: Use native DOM queries or Svelte bind:this
   Example: Instead of $('#id'), use <div bind:this={el}>

   [HIGH] jQuery .animate() detected.
   Fix: Use Svelte transitions (transition:fade) or Web Animations API
```

### SSR Safety Output
```
🔒 Checking SSR Safety: src/routes/api/+server.js

📊 Summary:
   Total issues: 1

⚠️  SSR Safety Issues:

   [CRITICAL] 'window' found in server-side code
   Fix: Add guard: if (typeof window !== 'undefined') { ... }
```

---

## 🚨 Quick Troubleshooting

### Ripgrep not found
```powershell
# Install ripgrep (Windows)
choco install ripgrep

# Or download from: https://github.com/BurntSushi/ripgrep/releases
```

### Ollama not responding
```powershell
# Check Ollama status
curl http://localhost:11434/api/tags
```

### Tasks not appearing
```
1. Ctrl+Shift+P
2. Developer: Reload Window
```

---

## 📝 Integration Points

### Phase 66 → Phase 76
- Error collection feeds into contextual prompting

### Phase 72 → Phase 76
- AST knowledge base provides code structure

### Phase 76 → Phase 79
- Contextual prompting enriches solution generation
- Migration tools transform code

### Phase 79 Output
- Svelte 5-compliant patches
- Applied fixes with enhanced context

---

**Full Documentation**: `PHASE76_CONTEXTUAL_PROMPTING.md`
**Status**: ✅ Ready for testing
**Last Updated**: 2024-12-22
