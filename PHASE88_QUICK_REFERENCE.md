# Phase 88: Quick Reference Card

## One-Command Setup
```powershell
.\scripts\phase88-quick-start.ps1
```
**What it does**: Crawls web docs → Ingests repo docs → Verifies retrieval
**Time**: ~15-20 minutes (first run)

---

## Individual Commands

### 1. Web Docs Ingestion
```powershell
# Full ingestion (Svelte 5, SvelteKit 2, Bits-UI, UnoCSS, Drizzle, PG, pgvector, Docker)
.\scripts\phase88-ingest-web-docs.ps1

# Re-crawl only Svelte 5 after framework upgrade
.\scripts\phase88-ingest-web-docs.ps1 -Source svelte5

# Quick mode (depth 1 everywhere, for testing)
.\scripts\phase88-ingest-web-docs.ps1 -Quick
```

### 2. Repo Docs Ingestion
```powershell
# Ingest operator brain (NEXT_STEPS_LOG, MCP guides, ACE patterns)
.\scripts\phase88-ingest-repo-docs.ps1

# Custom tags
.\scripts\phase88-ingest-repo-docs.ps1 -Tags "ace,phase88,critical"
```

### 3. KB Verification
```powershell
# Quick test (3 queries)
.\scripts\phase88-verify-kb.ps1 -Quick

# Full test suite (20+ queries)
.\scripts\phase88-verify-kb.ps1 -Full
```

### 4. Error Fix Testing & Learning
```powershell
# Test KB with real TS/Svelte errors + update KB (recommended)
.\scripts\phase88-test-and-learn.ps1

# Individual steps
node scripts/phase88-test-error-fixes.mjs       # Test 8 error patterns
node scripts/phase88-update-kb-from-fixes.mjs   # Update Qdrant from results

# View learned patterns
Get-Content reports/kb-error-fixes.jsonl | ConvertFrom-Json | Format-Table test_id, validation_passed, error_code
```

---

## Testing knowledge_retrieve Tool

### Start FastMCP
```powershell
node scripts/fastmcp-server.mjs
```

### Test via curl
```powershell
# Svelte 5 runes query
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{"name": "knowledge_retrieve", "arguments": {"query": "Svelte 5 runes $state $derived"}}'

# SvelteKit 2 routing query
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{"name": "knowledge_retrieve", "arguments": {"query": "SvelteKit 2 load function"}}'
```

### Test via PowerShell
```powershell
$body = @{
    name = 'knowledge_retrieve'
    arguments = @{
        query = 'Svelte 5 runes $state $derived'
        limit = 5
        threshold = 0.6
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri 'http://localhost:3002/function-call' `
    -Method POST `
    -Body $body `
    -ContentType 'application/json'
```

---

## Autonomous Agent Usage

### Run Phase 86 Loop (with KB grounding)
```powershell
node scripts/phase86-autonomous-loop.mjs
```

**What happens**:
1. Agent encounters TypeScript error
2. Calls `knowledge_retrieve("Svelte 5 reactive state")`
3. Gets context from svelte.dev/docs with `$state()` example
4. Generates fix: `let count = $state(0)` ✅ (NOT `export let count = 0` ❌)
5. Applies patch, runs `tsc`, auto-reverts if error count worsens

---

## Troubleshooting

### "No results" in verification
```powershell
# Check Qdrant collection exists
curl http://localhost:6333/collections/phase76_knowledge_base

# Re-run ingestion
.\scripts\phase88-quick-start.ps1 -SkipRepo
```

### FastMCP "Knowledge Plane unavailable"
```powershell
# Normal - falls back to Qdrant-only search
# To enable hybrid retrieval, start Knowledge Plane:
cd go-services\knowledge-plane
.\run.ps1
```

### "Pass rate below 60%"
```powershell
# Run full ingestion
.\scripts\phase88-ingest-web-docs.ps1

# Wait 2-3 minutes for indexing
Start-Sleep -Seconds 180

# Re-verify
.\scripts\phase88-verify-kb.ps1 -Full
```

---

## What Gets Ingested

### Web Docs (Qdrant tags)
| Framework | Tags | Depth | Chunk Count |
|-----------|------|-------|-------------|
| Svelte 5 | `svelte5,docs,frontend,runes` | 2 | ~500 |
| SvelteKit 2 | `sveltekit2,docs,fullstack,routing` | 2 | ~800 |
| Bits UI | `bits-ui,docs,svelte5,accessibility` | 2 | ~300 |
| UnoCSS | `unocss,docs,styling,atomic-css` | 2 | ~200 |
| Drizzle ORM | `drizzle,docs,orm,postgres` | 2 | ~400 |
| PostgreSQL 17 | `postgres17,docs,db,sql` | 1 | ~500 |
| pgvector | `pgvector,docs,vector-search,hnsw` | 1 | ~100 |
| Docker | `docker,docs,infra,containers` | 1 | ~200 |

**Total**: ~3000 chunks, ~15 MB vector storage

### Repo Docs (Qdrant tags)
| Document | Tags |
|----------|------|
| NEXT_STEPS_LOG.md | `ace,operator-docs,phase76,phase87,phase88` |
| MCP_ARCHITECTURE_GUIDE.md | `ace,operator-docs,phase76,phase87,phase88` |
| ERROR_REDUCTION_SUMMARY.md | `ace,operator-docs,phase76,phase87,phase88` |
| data/knowledge/ace-agentic-patterns.md | `ace,operator-docs,phase76,phase87,phase88` |

**Total**: ~50 chunks, ~500 KB

---

## FastMCP Tools (11 total)

| Tool | Purpose | Priority |
|------|---------|----------|
| `knowledge_retrieve` | 🌟 **FRONT DOOR** - Hybrid KB retrieval (Qdrant + pgvector + RRF) | **Always call first** |
| `qdrant_search` | Fallback Qdrant-only search | Use if Knowledge Plane unavailable |
| `read_file` | Read local files (supports line ranges) | After KB retrieval for local context |
| `write_file` | Patch files | Apply fixes after KB retrieval |
| `run_command` | Execute shell commands | Verify fixes (`tsc`, `npm test`, etc.) |
| `ripgrep` | Symbol/pattern search | Find definitions in codebase |
| `postgres_query` | SQL queries | Check DB schema, query data |
| `redis_cache` | Cache ops | Store/retrieve embeddings |
| `minio_fetch` | Object storage | Fetch document summaries |
| `search_codebase` | Full-text search | Broad codebase search |
| `web_search` | External search | Disabled by default |

---

## Svelte 5 Prompt Pack Rules

### ✅ Use These (Svelte 5 Runes)
```javascript
let count = $state(0);
let doubled = $derived(count * 2);
$effect(() => { console.log(count); });
let { name, age = 0 } = $props();
```

### ❌ Never Use (Legacy Svelte 3/4)
```javascript
export let count = 0;           // Use $props() instead
$: doubled = count * 2;         // Use $derived() instead
onMount(() => { ... });         // Use $effect() instead
```

### Routing (SvelteKit 2)
```
✅ +page.svelte, +page.server.ts, +layout.svelte
❌ index.svelte, __layout.svelte
```

### UI Components
```javascript
✅ import { Dialog } from 'bits-ui';  // Headless, accessible
❌ Custom dialog from scratch         // Reinventing the wheel
```

### Styling
```svelte
✅ class="flex items-center gap-2 p-4 bg-primary"  // UnoCSS atomic
❌ <style> /* global CSS */ </style>               // Avoid unless critical
```

### Database
```typescript
✅ db.select().from(users).where(eq(users.id, id))  // Drizzle ORM
❌ db.execute(sql`SELECT * FROM users WHERE id = ${id}`)  // Avoid raw SQL
```

### Vector Search
```typescript
✅ ORDER BY embedding <-> $1  // Cosine distance (pgvector)
✅ CREATE INDEX USING hnsw (embedding vector_cosine_ops)
❌ ORDER BY embedding <=> $1  // Wrong operator
```

---

## Expected Agent Behavior

### Before Phase 88 (no KB grounding)
```
Agent: "Add reactive counter"
  → Generates: export let count = 0  ❌ (Svelte 3/4 pattern)
  → User: "This is wrong, use Svelte 5 runes"
  → Agent: "Oh, let me fix that..."
```

### After Phase 88 (with KB grounding)
```
Agent: "Add reactive counter"
  → Calls: knowledge_retrieve("Svelte 5 reactive state")
  → Retrieves: chunk_abc123 (svelte5:docs) with $state() example
  → Generates: let count = $state(0)  ✅
  → Cites: // Source: chunk_abc123 (svelte5:docs)
```

---

## Storage Requirements

### Qdrant
- **Collection**: `phase76_knowledge_base`
- **Points**: ~3050 (web + repo docs)
- **Vector dim**: 384 (embeddinggemma) or 1536 (OpenAI)
- **Disk usage**: ~15-20 MB

### PostgreSQL (if using pgvector)
- **Table**: `kb_chunks`
- **Rows**: ~3050
- **Disk usage**: ~50 MB (with embeddings + text)

### Redis (embeddings cache)
- **Keys**: ~3050 (one per chunk)
- **TTL**: 7 days (default)
- **Memory**: ~100 MB

---

## Performance Benchmarks

### Ingestion (first run)
- Web docs: 10-15 minutes
- Repo docs: 30 seconds
- Total: ~15-20 minutes

### Re-ingestion (single source)
- Svelte 5 only: 2-3 minutes
- SvelteKit 2 only: 3-4 minutes

### Retrieval (per query)
- `knowledge_retrieve`: 100-300ms (hybrid)
- `qdrant_search`: 50-100ms (Qdrant-only)

### Verification
- Quick mode: 30 seconds
- Full mode: 2-3 minutes

---

## Maintenance Schedule

### Daily
```powershell
# Verify KB health
.\scripts\phase88-verify-kb.ps1 -Quick
```

### Weekly
```powershell
# Re-crawl repo docs (they change frequently)
.\scripts\phase88-ingest-repo-docs.ps1
```

### Monthly
```powershell
# Full re-ingestion (catch framework updates)
.\scripts\phase88-quick-start.ps1
```

### After Framework Upgrades
```powershell
# Re-crawl specific source
.\scripts\phase88-ingest-web-docs.ps1 -Source svelte5
.\scripts\phase88-ingest-web-docs.ps1 -Source sveltekit2
```

---

## Files Created

### Scripts
- `scripts/phase88-ingest-web-docs.ps1` - Web docs crawler
- `scripts/phase88-ingest-repo-docs.ps1` - Repo docs ingester
- `scripts/phase88-verify-kb.ps1` - KB verification tester
- `scripts/phase88-quick-start.ps1` - One-command orchestrator

### Code
- `scripts/fastmcp-server.mjs` - Added `knowledge_retrieve` tool
- `go-services/knowledge-plane/internal/prompts/svelte5_pack.js` - Prompt pack

### Docs
- `PHASE88_KB_FOUNDATION.md` - Complete architecture guide
- `PHASE88_QUICK_REFERENCE.md` - This cheat sheet

---

**Status**: ✅ Ready for production use. Run `.\scripts\phase88-quick-start.ps1` to begin.
