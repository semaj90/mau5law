# Phase 88: Complete KB-First Retrieval Implementation

**Date**: January 2025
**Status**: ✅ Implementation Complete, Ready for Testing
**Goal**: Make Gemma3 behave "Svelte 5/SvelteKit 2/Bits-UI v2-first" via agentic KB retrieval

---

## 🎯 What Was Built

### 1. FastMCP KB Integration (`fastmcp-server.mjs`)
**New `knowledge_retrieve` tool** — Front door for all KB queries:

```javascript
async function knowledgeRetrieve(args) {
  const { query, k = 12, mode = 'hybrid', tags = [] } = args;

  // PRIORITY 1: Svelte docs search (if Svelte-related query)
  if (query.match(/svelte|sveltekit|bits.?ui|\$state|\$derived/i)) {
    const svelteRes = await fetch('http://127.0.0.1:8099/svelte/docs/search', {...});
    if (svelteRes.ok && results.length > 0) {
      return { source: 'svelte_docs', results, score: 0.95 };
    }
  }

  // PRIORITY 2: Knowledge Plane hybrid RAG
  const kpRes = await fetch('http://127.0.0.1:8099/retrieve', {...});
  if (kpRes.ok) {
    return { source: 'knowledge_plane', results, score: 0.85 };
  }

  // PRIORITY 3: Direct Qdrant fallback
  const qdrantRes = await qdrant.search('phase76_knowledge_base', {...});
  return { source: 'qdrant_fallback', results, score: 0.75 };
}
```

**Features**:
- Svelte-specific queries go to ripgrep search first (highest priority)
- Falls back to hybrid RAG (pgvector + Qdrant + RRF)
- Graceful degradation if Knowledge Plane unavailable
- Returns structured results with provenance (source, tags, category, scores)

### 2. Knowledge Plane Go Service (Port 8099)
**Existing service enhanced** with Svelte 5 documentation search.

**Endpoints**:
- `POST /retrieve` — Hybrid RAG (pgvector + Qdrant + RRF merge)
- `POST /svelte/docs/search` — Ripgrep search in `svelte.txt`, `sveltekit.txt`, codebase
- `POST /expand` — Graph expansion queries
- `POST /compose_prompt` — Prompt composition with KB context
- `GET /health` — Service health check

**Svelte Docs Search** (`internal/handlers/svelte_docs.go`):
- Ripgrep-powered search across Svelte 5 docs
- Categorizes results: `runes`, `stores`, `reactivity`, `components`, `routing`, `bits-ui`, `general`
- Returns file path, line range, category, content snippet
- Priority order: `svelte.txt` (docs) → codebase patterns

### 3. Documentation Ingestion Pipeline (`phase88-docs-ingestion.ps1`)
**250-line PowerShell script** for complete KB population.

**Web Crawl Targets** (7 sources):
1. **Svelte 5** — `https://svelte.dev/docs/svelte` (depth 2, tags: `svelte5,docs,frontend`)
2. **SvelteKit 2** — `https://kit.svelte.dev/docs` (depth 2, tags: `sveltekit2,docs,fullstack`)
3. **Bits UI** — `https://www.bits-ui.com/docs/introduction` (depth 2, tags: `bits-ui,docs,svelte5`)
4. **UnoCSS** — `https://unocss.dev/guide/` (depth 2, tags: `unocss,docs,styling`)
5. **Drizzle ORM** — `https://orm.drizzle.team/docs/overview` (depth 2, tags: `drizzle,docs,orm`)
6. **PostgreSQL 17** — `https://www.postgresql.org/docs/current/` (depth 1, tags: `postgres17,docs,db`)
7. **pgvector** — `https://github.com/pgvector/pgvector` (depth 1, tags: `pgvector,docs,db`)

**Local Operator Docs** (from `kb-manifest-core.txt`):
- `NEXT_STEPS_LOG.md` — project evolution log
- `MCP_ARCHITECTURE_GUIDE.md` — MCP tool architecture
- `ERROR_REDUCTION_SUMMARY.md` — error fixing patterns
- `SVELTE5_CODE_POLICY.md` — **Svelte 5 code generation rules**
- `data/knowledge/ace-agentic-patterns.md` — ACE agentic patterns

**Discovery**:
- Searches for `llms.txt` files (LLM-friendly docs)
- Ripgrep for additional READMEs, guides, summaries

**Verification**:
- Test queries: "Svelte 5 runes", "SvelteKit 2 load function", "Bits UI Dialog"
- Checks Qdrant collection size (expected 600+ points)

### 4. Svelte 5 Code Policy (`SVELTE5_CODE_POLICY.md`)
**Comprehensive policy file** for agent code generation.

**Key Rules**:
- ✅ `let count = $state(0)` — reactive state
- ✅ `let doubled = $derived(count * 2)` — computed values
- ✅ `$effect(() => { ... })` — side effects
- ✅ `let { prop1, prop2 } = $props()` — component props
- ❌ NEVER `export let count = 0` — Svelte 3/4 syntax
- ❌ NEVER `$: doubled = count * 2` — reactive statement syntax
- ❌ NEVER `onMount(() => { ... })` unless truly necessary

**Prompt Template** (for agent):
```
SYSTEM POLICY:
- Assume Svelte 5 (runes). Use $state, $derived, $effect, $props.
- Assume SvelteKit 2 routing (+page.svelte, +page.server.ts, actions).
- For UI, prefer Bits-UI + UnoCSS.
- For DB, assume Postgres 17 + Drizzle 0.44 + pgvector HNSW.
- ALWAYS retrieve from knowledge base before generating code.
- If docs conflict with guess, cite docs chunk ID and prefer docs.
- NEVER use Svelte 3/4 patterns like `export let` or `$:`.
```

**Verification Workflow**:
1. Run `knowledge_retrieve` with Svelte query
2. Run `read_file` to check existing patterns
3. Run `ripgrep` to find similar examples
4. If mismatch, regenerate with correct pattern

### 5. Testing Infrastructure
**Two test scripts** for verification:

**`test-svelte-docs.ps1`** — Direct Svelte docs search test:
- Queries Knowledge Plane `/svelte/docs/search`
- Shows categorized results (runes, components, routing)
- Displays line ranges, file paths, content previews

**`test-kb-grounding.ps1`** — Comprehensive KB verification:
1. Service health checks (Knowledge Plane, Qdrant)
2. Svelte 5 docs search (3 queries)
3. Hybrid RAG retrieval (pgvector + Qdrant + RRF)
4. Qdrant collection stats (points count, vectors)
5. Policy file existence check

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Autonomous Agent (Gemma3)                    │
│  - Reads errors from codebase                                  │
│  - Calls MCP tools via FastMCP                                 │
│  - Generates fixes with KB grounding                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastMCP (Port 3002)                            │
│  Tools:                                                         │
│  1. knowledge_retrieve ◄── FRONT DOOR (KB-first)               │
│  2. postgres_query                                              │
│  3. redis_get, redis_set                                        │
│  4. minio_list, minio_upload                                    │
│  5. ollama_generate                                             │
│  6. write_file, read_file, ripgrep                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│   Svelte     │   │ Knowledge Plane  │   │   Qdrant     │
│ Docs Search  │   │  Hybrid RAG      │   │  Fallback    │
│ (ripgrep)    │   │ (pgvector+RRF)   │   │  (direct)    │
│ Score: 0.95  │   │ Score: 0.85      │   │ Score: 0.75  │
└──────────────┘   └──────────────────┘   └──────────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Knowledge Base (Qdrant Collection)                 │
│  - phase76_knowledge_base (600+ points)                         │
│  - Vector size: 3584 (embeddinggemma)                           │
│  - Distance: Cosine                                             │
│  - Tags: svelte5, sveltekit2, bits-ui, drizzle, postgres17     │
└─────────────────────────────────────────────────────────────────┘
```

**Retrieval Flow**:
1. Agent calls `knowledge_retrieve(query: "Svelte 5 runes state")`
2. FastMCP detects Svelte keyword, routes to Knowledge Plane `/svelte/docs/search`
3. Knowledge Plane runs ripgrep on `svelte.txt`, categorizes results
4. Returns high-score results (0.95) with file/line/category
5. If Svelte search empty, fallback to hybrid RAG (pgvector + Qdrant + RRF)
6. If Knowledge Plane down, fallback to direct Qdrant search
7. Agent receives structured results with provenance, generates code with citations

---

## 📦 Deliverables

### Code Files
1. **`sveltekit-frontend/scripts/fastmcp-server.mjs`**
   - Lines 440-510: `knowledgeRetrieve` function
   - Line 520: Tool registration
   - Env loading: `.env.phase87` with Postgres config

2. **`go-services/knowledge-plane/`**
   - `internal/handlers/svelte_docs.go` — Ripgrep search (306 lines)
   - `internal/handlers/retrieve.go` — Hybrid RAG
   - `run.ps1` — Docker-safe startup
   - `.env` — Service configuration
   - `bin/knowledge-plane.exe` — Compiled binary (Go 1.25)

3. **`sveltekit-frontend/scripts/phase88-docs-ingestion.ps1`**
   - 250 lines: web crawls + local docs + verification
   - Creates `kb-manifest-core.txt` if not exists
   - Discovery via `llms.txt` and ripgrep

4. **`sveltekit-frontend/data/knowledge/SVELTE5_CODE_POLICY.md`**
   - Code generation rules (Svelte 5 runes, SvelteKit 2 routing)
   - Anti-patterns to reject (export let, $:, onMount)
   - Example queries for agent
   - Prompt template for grounding

### Test Scripts
1. **`sveltekit-frontend/scripts/test-svelte-docs.ps1`**
   - Direct Svelte docs search test
   - Queries: "runes", "load function", "Bits UI"

2. **`sveltekit-frontend/scripts/test-kb-grounding.ps1`**
   - Comprehensive KB verification (5 tests)
   - Service health, docs search, hybrid RAG, Qdrant stats, policy check

### Documentation
1. **`PHASE88_LAUNCH_CHECKLIST.md`**
   - Step-by-step launch guide (6 steps)
   - Pre-launch verification (infrastructure, Ollama, Qdrant)
   - Troubleshooting section
   - Success criteria checklist

2. **`PHASE88_IMPLEMENTATION_SUMMARY.md`** (this file)
   - Architecture overview
   - Code summaries
   - Deliverables list

---

## 🚀 Launch Instructions

### Quick Start (5 commands)
```powershell
# 1. Ingest documentation (10-30 minutes)
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
.\scripts\phase88-docs-ingestion.ps1

# 2. Start Knowledge Plane service
cd ..\go-services\knowledge-plane
.\run.ps1

# 3. Test Svelte docs search
cd ..\..\sveltekit-frontend
.\scripts\test-svelte-docs.ps1

# 4. Test KB grounding
.\scripts\test-kb-grounding.ps1

# 5. Restart FastMCP (to load new knowledge_retrieve tool)
node scripts\fastmcp-server.mjs
```

### Run Autonomous Agent
```powershell
# With KB grounding (Svelte 5 enforced)
node scripts/phase87-autonomous-loop.mjs
```

**Monitor logs for**:
- `🔍 Calling tool: knowledge_retrieve` (before `write_file`)
- `✅ Retrieved from svelte_docs (score 0.95)` (high-confidence Svelte docs)
- `// Source: chunk-svelte5-runes-abc123` (citations in generated code)
- Use of `$state`, `$derived`, `$effect`, `$props` (NOT `export let`, `$:`)

---

## 📊 Success Metrics

After launch, verify these metrics:

### KB Population
- ✅ Qdrant `phase76_knowledge_base`: **600+ points**
- ✅ Web docs ingested: **7 sources** (Svelte 5, SvelteKit 2, Bits UI, UnoCSS, Drizzle, PG17, pgvector)
- ✅ Local docs ingested: **9+ files** (MCP guides, ACE patterns, code policy)
- ✅ Policy file in KB: `SVELTE5_CODE_POLICY.md` searchable

### Retrieval Quality
- ✅ Svelte docs search: **95%+ precision** for runes queries
- ✅ Hybrid RAG: **RRF scores 0.8+** for technical queries
- ✅ Fallback chain: **3-tier** (Svelte docs → Knowledge Plane → Qdrant)
- ✅ Response time: **< 500ms** for Svelte docs, **< 2s** for hybrid RAG

### Agent Code Quality
- ✅ Svelte 5 compliance: **100%** use of runes (not `export let`, `$:`)
- ✅ KB call frequency: **≥ 80%** of `write_file` preceded by `knowledge_retrieve`
- ✅ Code citations: **≥ 50%** of generated code includes `// Source: chunk-xxx`
- ✅ Anti-pattern reduction: **0 instances** of `export let`, `$:` in new code

---

## 🔧 Configuration

### Environment Variables
**`.env.phase87`** (FastMCP):
```bash
DATABASE_URL=postgresql://user:password@127.0.0.1:5434/legal
REDIS_URL=redis://127.0.0.1:6379
OLLAMA_URL=http://127.0.0.1:11434
QDRANT_URL=http://127.0.0.1:6333
KNOWLEDGE_PLANE_URL=http://127.0.0.1:8099
```

**`go-services/knowledge-plane/.env`**:
```bash
PORT=8099
DATABASE_URL=postgresql://user:password@127.0.0.1:5434/legal
REDIS_URL=redis://127.0.0.1:6379
QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION=phase76_knowledge_base
OLLAMA_URL=http://127.0.0.1:11434
EMBEDDING_MODEL=embeddinggemma:latest
LLM_MODEL=gemma3-legal:latest
SVELTE_DOCS_PATH=data/svelte-docs/svelte.txt,data/svelte-docs/sveltekit.txt
```

### Qdrant Collection
```bash
# Collection: phase76_knowledge_base
# Vector size: 3584 (embeddinggemma)
# Distance: Cosine
# Indexed: HNSW (m=16, ef_construct=100)
```

---

## 🐛 Troubleshooting

### Issue: "Qdrant collection empty"
**Cause**: Ingestion not run or failed
**Fix**:
```powershell
.\scripts\phase88-docs-ingestion.ps1
# Check logs for errors
curl http://localhost:6333/collections/phase76_knowledge_base
```

### Issue: "Knowledge Plane health check failed"
**Cause**: Docker containers stopped or service not started
**Fix**:
```powershell
cd go-services/knowledge-plane
.\run.ps1
# Check logs: docker logs knowledge-plane-service
```

### Issue: "Agent still using export let"
**Cause**: KB not retrieved or policy not in KB
**Fix**:
1. Verify policy file in KB: `curl http://127.0.0.1:8099/retrieve -d '{"query":"SVELTE5 CODE POLICY"}'`
2. Check agent logs for `knowledge_retrieve` calls
3. Increase retrieval `k` parameter (try k=10)
4. Add explicit anti-pattern rejection in prompt

### Issue: "Svelte docs search returns no results"
**Cause**: `svelte.txt`, `sveltekit.txt` not in `data/svelte-docs/`
**Fix**:
```powershell
# Re-run ingestion (will re-download docs)
.\scripts\phase88-docs-ingestion.ps1

# Or manually download:
Invoke-WebRequest -Uri "https://svelte.dev/docs/svelte" -OutFile "data/svelte-docs/svelte.txt"
```

---

## 📈 Next Steps

1. **Monitor Agent Runs**: Collect logs, analyze KB call patterns
2. **Tune Retrieval**: Adjust `k`, `mode` (hybrid/dense/sparse), tags
3. **Expand KB**: Add project-specific Svelte components, common patterns
4. **Benchmark**: Compare code quality before/after KB (measure Svelte 5 compliance)
5. **Prompt Evolution**: Update `SVELTE5_CODE_POLICY.md` based on agent mistakes
6. **Graph Expansion**: Use `/expand` endpoint for related concept discovery
7. **Prompt Composition**: Use `/compose_prompt` for context-aware fix generation

---

## 🎓 Knowledge Transfer

**For future developers**:
- **KB-First Philosophy**: Agent must retrieve before generating (avoid LLM guessing)
- **Svelte 5 Enforcement**: Use runes (`$state`, `$derived`), not legacy patterns (`export let`, `$:`)
- **Provenance Tracking**: Always cite chunk IDs in generated code (`// Source: chunk-xxx`)
- **Graceful Degradation**: 3-tier fallback (Svelte docs → Knowledge Plane → Qdrant)
- **Policy Updates**: Edit `SVELTE5_CODE_POLICY.md`, re-ingest to update agent behavior

**Key Files to Understand**:
1. `fastmcp-server.mjs` — MCP tool server (knowledge_retrieve implementation)
2. `go-services/knowledge-plane/internal/handlers/svelte_docs.go` — Ripgrep search logic
3. `SVELTE5_CODE_POLICY.md` — Code generation rules
4. `phase88-docs-ingestion.ps1` — KB population script

---

**Status**: ✅ **Ready for Production Testing**
**Last Updated**: January 2025
**Maintainer**: Phase 88 Implementation Team

Run `.\scripts\test-kb-grounding.ps1` to verify all systems operational before production use.
