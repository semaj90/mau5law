# Phase 88: Knowledge Base Foundation
## "Gemma3 is Svelte 5 now" - via Retrieval, Not Retraining

### Executive Summary
Phase 88 establishes the authoritative knowledge base that makes autonomous agents (Phase 86+) behave with **framework-aware intelligence** without model fine-tuning. The strategy: **retrieval-augmented generation (RAG) with prompt packs** to enforce modern conventions.

---

## System Architecture

### 1. **Web Documentation Crawler** (`phase88-ingest-web-docs.ps1`)
Orchestrates crawling of authoritative framework docs into Qdrant:

- **Svelte 5**: Runes, snippets, reactivity (depth 2)
- **SvelteKit 2**: Routing, load functions, adapters (depth 2)
- **Bits UI**: Svelte 5-compatible headless components (depth 2)
- **UnoCSS**: Atomic utilities, presets (depth 2)
- **Drizzle ORM**: TypeScript-first SQL (depth 2)
- **PostgreSQL 17**: SQL reference, performance (depth 1, massive site)
- **pgvector**: Vector ops, HNSW indexes (depth 1)
- **Docker**: Containers, Compose (depth 1)

**Usage**:
```powershell
# Full ingestion (first run)
.\scripts\phase88-ingest-web-docs.ps1

# Re-crawl specific source after upgrade
.\scripts\phase88-ingest-web-docs.ps1 -Source svelte5

# Quick mode (depth 1 everywhere)
.\scripts\phase88-ingest-web-docs.ps1 -Quick
```

**Output**: Chunks land in `phase76_knowledge_base` Qdrant collection with tags like `svelte5,docs,runes`.

---

### 2. **Local Repository Docs Ingester** (`phase88-ingest-repo-docs.ps1`)
Loads "operator brain" docs (your internal guides, ACE patterns, summaries):

**Default manifest** (`data/knowledge/kb-manifest-core.txt`):
```
NEXT_STEPS_LOG.md
MCP_ARCHITECTURE_GUIDE.md
LLM_ROUTER_README.md
ERROR_REDUCTION_SUMMARY.md
data/knowledge/ace-agentic-patterns.md
PHASE87_FIXES_APPLIED.md
```

**Usage**:
```powershell
# Ingest all core docs
.\scripts\phase88-ingest-repo-docs.ps1

# Custom tags
.\scripts\phase88-ingest-repo-docs.ps1 -Tags "ace,phase88,critical"
```

**Output**: Same Qdrant collection, tagged with `operator-docs,ace,phase76`.

---

### 3. **Knowledge Retrieve Tool** (FastMCP)
New **front door** tool added to `fastmcp-server.mjs`:

```javascript
async function knowledgeRetrieve(args) {
  const { query, limit = 10, threshold = 0.5, filter_tags = null } = args;

  // 1. Try Knowledge Plane /rag/retrieve/hybrid (Qdrant + pgvector + RRF)
  // 2. Fallback to Qdrant-only if Knowledge Plane unavailable

  return {
    contexts: [...],  // Text + score
    provenance: {
      source: 'https://svelte.dev/docs/runes',
      tags: ['svelte5', 'docs', 'runes'],
      chunk_id: 'abc123',
      collection: 'phase76_knowledge_base'
    }
  };
}
```

**Agent workflow**:
1. **Call `knowledge_retrieve`** with query like "Svelte 5 $state $derived"
2. Get contexts with provenance (KB wins over generic LLM training data)
3. Use `read_file`, `write_file` for local changes
4. `run_command` to verify

**Registered tools** (11 total):
```
knowledge_retrieve  🌟 FRONT DOOR - Hybrid KB retrieval
qdrant_search       Fallback Qdrant-only search
postgres_query      SQL queries
minio_fetch         Object storage
redis_cache         Cache ops
read_file           Local file reading
ripgrep             Symbol/pattern search
search_codebase     Full-text search
web_search          External search (disabled)
write_file          File patching
run_command         Shell execution
```

---

### 4. **Svelte 5 Prompt Pack** (`internal/prompts/svelte5_pack.js`)
Enforces modern framework conventions via **policy injection**:

#### Core Policies
```javascript
// ALWAYS use runes
let count = $state(0);           // ✅ Svelte 5
export let count = 0;            // ❌ Legacy Svelte 3/4

// NEVER use reactive statements
let doubled = $derived(count * 2);  // ✅ Svelte 5
$: doubled = count * 2;            // ❌ Legacy

// Prefer Bits UI
import { Dialog } from 'bits-ui';  // ✅
// Custom dialog from scratch         ❌
```

#### Framework Assumptions (injected into every prompt)
- **Svelte 5**: Runes-first (`$state`, `$derived`, `$effect`, `$props`)
- **SvelteKit 2**: `+page.svelte`, `+page.server.ts`, `+layout.svelte` (NOT `index.svelte`)
- **Bits UI**: Headless components for Dialog, Dropdown, Popover, Accordion
- **UnoCSS**: Atomic utilities (`class="flex gap-2 p-4"` NOT global CSS)
- **Drizzle**: `db.select().from(table).where(eq(...))` (NOT raw SQL)
- **pgvector**: `<->` operator for cosine distance, HNSW indexes required

#### Citation Requirement
```javascript
// Source: chunk_abc123 (svelte5:docs)
let count = $state(0);
```
If KB conflicts with LLM training data, **KB WINS**.

---

### 5. **KB Verification Script** (`phase88-verify-kb.ps1`)
Tests retrieval quality with framework-specific queries:

**Quick mode** (3 queries):
```powershell
.\scripts\phase88-verify-kb.ps1 -Quick
```

**Full mode** (20+ queries across all frameworks):
```powershell
.\scripts\phase88-verify-kb.ps1 -Full
```

**Example queries**:
- "Svelte 5 runes $state $derived $effect"
- "SvelteKit 2 load function +page.server.ts actions"
- "Bits UI Dialog Svelte 5 headless components"
- "pgvector cosine distance HNSW index"

**Pass criteria**:
- 80%+ pass rate = ✅ Ready for agents
- 60-80% = ⚠️  Some docs missing, re-run specific ingestion
- <60% = ❌ Run full ingestion

**Output**:
```
📊 Verification Summary
Pass rate: 85% (17 / 20)
✅ KB is well-populated! Ready for autonomous agent usage.
```

---

## Complete Workflow

### First-Time Setup
```powershell
# 1. Crawl web docs (10-20 minutes)
.\scripts\phase88-ingest-web-docs.ps1

# 2. Ingest repo docs (30 seconds)
.\scripts\phase88-ingest-repo-docs.ps1

# 3. Verify retrieval
.\scripts\phase88-verify-kb.ps1 -Full
```

### After Framework Upgrades
```powershell
# Re-crawl only updated source
.\scripts\phase88-ingest-web-docs.ps1 -Source svelte5
.\scripts\phase88-ingest-web-docs.ps1 -Source sveltekit2
```

### Daily Agent Usage
```powershell
# Start FastMCP with knowledge_retrieve tool
node scripts/fastmcp-server.mjs

# Run autonomous error fixing
node scripts/phase86-autonomous-loop.mjs
```

**Agent behavior** (with KB):
```
Agent: "Need to add reactive counter"
  → Calls knowledge_retrieve("Svelte 5 reactive state")
  → Gets context with $state() example from svelte.dev/docs
  → Generates: let count = $state(0) ✅
  → NOT: export let count = 0 ❌
```

---

## Key Insights

### Why This Works (No Fine-Tuning Required)
1. **Retrieval beats memorization**: LLM gets fresh, accurate docs at inference time
2. **Prompt packs enforce conventions**: Policy injection prevents legacy patterns
3. **Provenance tracking**: Agent knows when KB contradicts training data
4. **Graceful degradation**: Falls back to Qdrant-only if Knowledge Plane unavailable

### Performance Optimization
- **Depth limits**: PG/Docker at depth 1 (avoid crawling entire sites)
- **Tag filtering**: `filter_tags=svelte5,docs` for targeted retrieval
- **HNSW indexes**: Required for pgvector cosine search performance
- **Reciprocal rank fusion**: Combines Qdrant + pgvector results (when Knowledge Plane active)

### Integration Points
- **Phase 86 Loop**: Auto-calls `knowledge_retrieve` before generating fixes
- **Phase 87 Knowledge Plane**: Provides hybrid retrieval endpoint (`/rag/retrieve/hybrid`)
- **Phase 76 KB Builder**: Chunks web content, generates embeddings, stores in Qdrant
- **FastMCP**: Exposes 11 tools including new `knowledge_retrieve` front door

---

## Maintenance

### Nightly Automation (Future)
```powershell
# Create phase89-nightly-refresh.ps1
# Run quick crawl + verification
# Alert if pass rate drops below 70%
```

### Chunking Tuning
After first crawl, check chunk sizes:
```powershell
# View last 30 lines of crawl output
# Look for "Ingested X chunks from Y pages"
# If chunks too large (>2000 tokens): decrease chunk_size
# If chunks too small (<200 tokens): increase chunk_size
```

### Storage Estimates
- Svelte 5 docs: ~500 chunks (~2 MB)
- SvelteKit 2 docs: ~800 chunks (~3 MB)
- All 8 sources: ~3000 chunks (~15 MB in Qdrant)
- Repo docs: ~50 chunks (~500 KB)

**Total**: ~3050 chunks, ~15.5 MB vector storage

---

## Testing Checklist

- [ ] Run `phase88-ingest-web-docs.ps1` successfully
- [ ] Run `phase88-ingest-repo-docs.ps1` successfully
- [ ] Verify `phase88-verify-kb.ps1 -Full` passes at 80%+
- [ ] Check Qdrant collection has 3000+ points
- [ ] Test `knowledge_retrieve` tool via FastMCP `/function-call`
- [ ] Run Phase 86 loop, verify it calls `knowledge_retrieve` before fixes
- [ ] Confirm agent generates `let count = $state(0)` NOT `export let count = 0`

---

## Files Created

### Scripts
- `scripts/phase88-ingest-web-docs.ps1` (web crawler orchestrator)
- `scripts/phase88-ingest-repo-docs.ps1` (local docs ingester)
- `scripts/phase88-verify-kb.ps1` (retrieval quality tester)

### Code
- `scripts/fastmcp-server.mjs` (added `knowledge_retrieve` tool)
- `go-services/knowledge-plane/internal/prompts/svelte5_pack.js` (prompt pack)

### Docs
- `data/knowledge/kb-manifest-core.txt` (operator docs manifest)
- `PHASE88_KB_FOUNDATION.md` (this file)

---

## Next Steps

1. **Run initial ingestion**:
   ```powershell
   .\scripts\phase88-ingest-web-docs.ps1
   .\scripts\phase88-ingest-repo-docs.ps1
   .\scripts\phase88-verify-kb.ps1 -Full
   ```

2. **Wire Knowledge Plane** (Phase 87):
   - Implement `core/retrieve.go` (hybrid Qdrant + pgvector)
   - Implement `core/prompt.go` (inject Svelte 5 prompt pack)
   - Start Knowledge Plane on port 8099

3. **Test agent behavior**:
   ```powershell
   node scripts/phase86-autonomous-loop.mjs
   ```
   - Watch for `knowledge_retrieve` calls in logs
   - Verify generated code uses runes, not `export let`

4. **Schedule nightly refresh** (Phase 89):
   - Create `phase89-nightly-refresh.ps1`
   - Run at 2 AM, alert on failures
   - Track pass rate trends over time

---

**Status**: ✅ Phase 88 foundation complete. Ready for agent testing.
