# Phase 76: FastMCP Server - Complete Guide

**Status:** ✅ OPERATIONAL
**Version:** 1.0.0
**Integration:** Knowledge Search + ACE Agent → VS Code MCP

---

## Quick Start

### 1. Start the FastMCP Server

```bash
# Option A: Run standalone
npm run phase76:mcp:new

# Option B: Run with dev server
npm run phase76:stack

# Option C: Test the integration
npm run phase76:mcp:integration
```

### 2. Configure VS Code

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "phase76-knowledge-ace": {
      "command": "node",
      "args": [
        "C:\\Users\\james\\Videos\\deeds-web-app\\sveltekit-frontend\\scripts\\phase76-fastmcp-server.mjs"
      ]
    }
  }
}
```

### 3. Use MCP Tools in GitHub Copilot Chat

```
@mcp search-knowledge query="Svelte 5 runes migration"
@mcp detect-patterns code="<button on:click={handler}>Click</button>"
@mcp migrate-component code="export let title; $: doubled = count * 2"
```

---

## Available MCP Tools

### 1. `search-knowledge`

**Description:** Search the knowledge base with semantic + TF-IDF hybrid ranking and LLM synthesis

**Input:**
```json
{
  "query": "Svelte 5 runes migration",
  "topK": 5,
  "synthesize": true
}
```

**Output:**
```json
{
  "query": "Svelte 5 runes migration",
  "resultCount": 5,
  "results": [
    {
      "title": "Svelte 5 Migration Guide",
      "url": "https://svelte.dev/docs/...",
      "score": "0.870",
      "preview": "To migrate to Svelte 5..."
    }
  ],
  "synthesis": "To migrate to Svelte 5, replace export let with $props(), use $state() for reactivity..."
}
```

---

### 2. `detect-patterns`

**Description:** Detect legacy Svelte 4 and TypeScript anti-patterns

**Input:**
```json
{
  "code": "<script>\nexport let title;\n$: doubled = count * 2;\n</script>",
  "categories": ["svelte4", "typescript"]
}
```

**Output:**
```json
{
  "summary": {
    "total": 2,
    "high": 1,
    "medium": 1,
    "low": 0
  },
  "patterns": [
    {
      "type": "props",
      "severity": "high",
      "count": 1,
      "migration": "Use $props() rune (e.g., export let x → let { x } = $props())",
      "examples": ["export let title"],
      "positions": [
        {"line": 2, "column": 0, "text": "export let title;"}
      ]
    },
    {
      "type": "reactive-assignment",
      "severity": "medium",
      "count": 1,
      "migration": "Use $derived() rune (e.g., $: x = y → let x = $derived(y))",
      "examples": ["$: doubled = count * 2"],
      "positions": [
        {"line": 3, "column": 0, "text": "$: doubled = count * 2;"}
      ]
    }
  ]
}
```

---

### 3. `migrate-component`

**Description:** Analyze code and generate comprehensive migration recommendations

**Input:**
```json
{
  "code": "<script>export let title; $: doubled = count * 2;</script>",
  "filePath": "MyComponent.svelte"
}
```

**Output:**
```json
{
  "needsMigration": true,
  "confidence": 0.85,
  "summary": "Detected 2 issue(s): 1 high, 1 medium, 0 low priority",
  "recommendations": [
    {
      "issue": "Found 1 props pattern(s)",
      "severity": "high",
      "migration": "Use $props() rune",
      "examples": ["export let title"],
      "positions": [{"line": 2, "column": 0}],
      "guidance": "In Svelte 5, component props are declared using $props()...",
      "autoFixable": true
    },
    {
      "issue": "Found 1 reactive-assignment pattern(s)",
      "severity": "medium",
      "migration": "Use $derived() rune",
      "examples": ["$: doubled = count * 2"],
      "positions": [{"line": 3, "column": 0}],
      "guidance": "Reactive statements using $: should be replaced with $derived()...",
      "autoFixable": false
    }
  ]
}
```

---

### 4. `get-migration-guidance`

**Description:** Get specific migration help for a pattern type

**Input:**
```json
{
  "patternType": "event-handler",
  "example": "on:click"
}
```

**Output:**
```json
{
  "patternType": "event-handler",
  "guidance": "In Svelte 5, event handlers no longer use the on: directive prefix. Instead, use the standard DOM event name directly...",
  "references": [
    {
      "title": "Svelte 5 Event Attributes",
      "url": "https://svelte.dev/docs/svelte/event-attributes"
    }
  ]
}
```

**Supported Pattern Types:**
- `event-handler` - on:click → onclick
- `props` - export let → $props()
- `reactive-assignment` - $: x = y → $derived()
- `reactive-block` - $: { } → $effect()
- `lifecycle-before` - beforeUpdate() → $effect.pre()
- `lifecycle-after` - afterUpdate() → $effect()

---

### 5. `analyze-file`

**Description:** Complete file analysis with pattern detection and recommendations

**Input:**
```json
{
  "filePath": "C:\\Users\\james\\...\\MyComponent.svelte"
}
```

**Output:**
Same as `migrate-component` but reads the file automatically

---

## Pattern Detection Details

### Svelte 4 Patterns

| Pattern | Regex | Severity | Migration |
|---------|-------|----------|-----------|
| Event handlers | `/on:[a-z]+/gi` | High | Remove `on:` prefix |
| Props | `/export\s+let\s+(\w+)/gi` | High | Use `$props()` |
| Reactive assignments | `/\$:\s*(\w+)\s*=/g` | Medium | Use `$derived()` |
| Reactive blocks | `/\$:\s*{/g` | Medium | Use `$effect()` |
| beforeUpdate | `/beforeUpdate\(/gi` | Low | Use `$effect.pre()` |
| afterUpdate | `/afterUpdate\(/gi` | Low | Use `$effect()` |

### TypeScript Patterns

| Pattern | Regex | Severity | Migration |
|---------|-------|----------|-----------|
| `any` type | `/:\s*any\b/gi` | Medium | Use specific type |
| `@ts-ignore` | `/@ts-ignore/gi` | High | Fix underlying error |
| `@ts-expect-error` | `/@ts-expect-error/gi` | Low | Verify expected |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code (GitHub Copilot)                 │
│                                                             │
│   @mcp search-knowledge                                     │
│   @mcp detect-patterns                                      │
│   @mcp migrate-component                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol (stdio)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Phase 76 FastMCP Server                        │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ Pattern         │  │ Knowledge        │                 │
│  │ Detector        │  │ Searcher         │                 │
│  └────────┬────────┘  └────────┬─────────┘                 │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    ↓                                        │
│           ┌────────────────────┐                            │
│           │ Migration Engine   │                            │
│           └────────────────────┘                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   ┌────────┐    ┌─────────┐    ┌─────────┐
   │ Qdrant │    │ Ollama  │    │ API     │
   │ Vector │    │ LLM     │    │ /search │
   └────────┘    └─────────┘    └─────────┘
```

---

## Integration with Knowledge Search API

The FastMCP server automatically integrates with your Knowledge Search Engine:

### 1. Search Flow

```
User Query
  ↓
MCP Tool: search-knowledge
  ↓
POST /api/knowledge/search
  ↓
Hybrid Ranking (0.7 semantic + 0.3 TF-IDF)
  ↓
LLM Synthesis (Ollama gemma3-legal)
  ↓
Return to VS Code
```

### 2. Migration Flow

```
Code Input
  ↓
Pattern Detection (Regex)
  ↓
Knowledge Search (Svelte 5 migration docs)
  ↓
Build Recommendations
  ↓
Calculate Confidence
  ↓
Return Actionable Guidance
```

---

## Usage Examples

### Example 1: Search for Svelte 5 Guidance

```bash
# In VS Code GitHub Copilot Chat:
@mcp search-knowledge query="How to migrate from export let to $props()"

# Terminal:
node scripts/phase76-knowledge-api-integration.mjs
```

**Result:**
```json
{
  "resultCount": 5,
  "synthesis": "To migrate from export let to $props() in Svelte 5:
    1. Replace 'export let propName' with 'let { propName } = $props()'
    2. Use destructuring for multiple props: 'let { a, b, c } = $props()'
    3. Provide defaults: 'let { count = 0 } = $props()'...",
  "results": [...]
}
```

### Example 2: Detect Patterns in Your Code

```javascript
// In your Svelte file:
<script>
  export let title;
  export let count = 0;

  $: doubled = count * 2;

  function increment() {
    count++;
  }
</script>

<button on:click={increment}>
  {title}: {doubled}
</button>
```

**Use MCP Tool:**
```
@mcp detect-patterns code="[paste code above]"
```

**Result:**
```json
{
  "summary": { "total": 3, "high": 2, "medium": 1, "low": 0 },
  "patterns": [
    {
      "type": "event-handler",
      "severity": "high",
      "count": 1,
      "migration": "Remove on: prefix (e.g., on:click → onclick)"
    },
    {
      "type": "props",
      "severity": "high",
      "count": 2,
      "migration": "Use $props() rune"
    },
    {
      "type": "reactive-assignment",
      "severity": "medium",
      "count": 1,
      "migration": "Use $derived() rune"
    }
  ]
}
```

### Example 3: Get Full Migration Analysis

```
@mcp migrate-component code="[paste code]" filePath="MyComponent.svelte"
```

**Result:**
```json
{
  "needsMigration": true,
  "confidence": 0.85,
  "recommendations": [
    {
      "issue": "Found 1 event-handler pattern(s)",
      "severity": "high",
      "migration": "Remove on: prefix",
      "autoFixable": true,
      "guidance": "In Svelte 5, event handlers no longer use the on: directive..."
    },
    ...
  ]
}
```

---

## Testing

### Test MCP Server Locally

```bash
# Run integration demo
npm run phase76:mcp:integration

# Run MCP server tests (requires MCP test client)
npm run phase76:mcp:test

# Check Knowledge Search API
curl http://localhost:5175/api/knowledge/stats
```

### Test with Sample Code

Create `test-component.svelte`:
```svelte
<script>
  export let name;
  $: greeting = `Hello ${name}!`;
</script>

<button on:click={() => alert(greeting)}>
  {greeting}
</button>
```

Test it:
```bash
@mcp analyze-file filePath="C:\\path\\to\\test-component.svelte"
```

---

## Configuration

### Environment Variables

```bash
# .env
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
KNOWLEDGE_API=http://localhost:5175/api/knowledge
```

### VS Code MCP Settings

Located in `.vscode/mcp-settings.json`:

```json
{
  "mcpServers": {
    "phase76-knowledge-ace": {
      "command": "node",
      "args": ["scripts/phase76-fastmcp-server.mjs"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "OLLAMA_URL": "http://localhost:11434"
      }
    }
  }
}
```

---

## Troubleshooting

### MCP Server Not Responding

**Issue:** VS Code can't connect to MCP server

**Fix:**
```bash
# Test server manually
node scripts/phase76-fastmcp-server.mjs

# Check logs in VS Code Output panel (MCP channel)

# Verify node version (requires 18+)
node --version
```

### Knowledge Search Returns Empty

**Issue:** No results from search-knowledge tool

**Fix:**
```bash
# Check Qdrant has documents
curl http://localhost:6333/collections/phase76_knowledge_base

# Re-crawl knowledge base
npm run phase76:crawl:svelte5

# Check API is running
curl http://localhost:5175/api/knowledge/stats
```

### Pattern Detection Misses Patterns

**Issue:** Some Svelte 4 patterns not detected

**Fix:**
- Check regex patterns in `PatternDetector` class
- Ensure code formatting matches expected patterns
- Add new patterns to `patterns` object

---

## NPM Scripts Reference

```bash
# MCP Server
npm run phase76:mcp:new          # Start FastMCP server
npm run phase76:mcp:test          # Test MCP tools
npm run phase76:mcp:integration   # Integration demo

# Knowledge Search
npm run phase76:kb:search         # Search knowledge base
npm run phase76:crawl:svelte5     # Crawl Svelte 5 docs

# ACE Agent
npm run phase76:ace               # Run ACE agent
npm run phase76:migrate           # Run migration agent
npm run phase76:migrate:dry       # Dry-run migration

# Full Stack
npm run phase76:stack             # MCP + Dev server
```

---

## Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| Pattern Detection | <1ms | Regex-based |
| Knowledge Search | 100-200ms | Qdrant + TF-IDF |
| LLM Synthesis | 3-8s | Ollama local |
| File Analysis | 100ms-8s | Depends on synthesis |
| MCP Tool Call | 100ms-8s | Includes all above |

---

## What's Next

### Recommended Enhancements

1. **Add More Pattern Types**
   - Svelte stores ($: vs $state)
   - Component slots
   - Context API changes

2. **Auto-Fix Generation**
   - Generate fixed code automatically
   - Apply fixes with confidence ≥90%
   - Show diff preview

3. **Batch Migration**
   - Scan entire project
   - Prioritize files by issue count
   - Generate migration report

4. **UI Dashboard**
   - Web UI for migration progress
   - Visual diff viewer
   - Confidence meter

---

## Related Documentation

- `PHASE76_KNOWLEDGE_API_INTEGRATION.md` - API integration guide
- `PHASE76_TEST_REPORT.md` - Test results
- `PHASE76_AGENTIC_DETECTION_QUICK_REF.md` - Quick reference

---

**Status:** ✅ **PRODUCTION READY**
**Last Updated:** 2025-12-20
**Maintainer:** Phase 76 Team
