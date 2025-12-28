# 🚀 Phase 88: KB-First Retrieval Launch Checklist

**Goal**: Make Gemma3 behave "Svelte 5/SvelteKit 2/Bits-UI v2-first" via agentic retrieval from knowledge base, not model retraining.

---

## ✅ Pre-Launch Verification

### 1. Infrastructure Services
Run these checks before starting KB ingestion:

```powershell
# Check Docker containers
docker ps | grep -E "postgres|redis|qdrant|minio|ollama"

# Expected output:
# postgres-legal (port 5434)
# redis-legal (port 6379)
# qdrant-legal (port 6333)
# minio-legal (ports 9000, 9001)
# ollama (port 11434)

# If any are stopped, start them (NEVER use docker compose up):
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run.ps1
```

### 2. Ollama Models
Verify embedding and generation models are available:

```powershell
curl http://localhost:11434/api/tags | ConvertFrom-Json | Select-Object -ExpandProperty models | Select-Object name

# Expected:
# - embeddinggemma:latest (for embeddings)
# - gemma3-legal:latest (for generation)
```

If missing:
```powershell
ollama pull embeddinggemma
ollama pull gemma:latest
ollama copy gemma:latest gemma3-legal:latest
```

### 3. Qdrant Collection
Check if KB collection exists:

```powershell
curl http://localhost:6333/collections/phase76_knowledge_base | ConvertFrom-Json

# Expected: points_count > 0 (if already ingested)
# If 404, collection will be created during ingestion
```

---

## 📚 Step 1: Ingest Documentation

### A. Web Documentation Crawl
This will take **10-30 minutes** depending on network speed.

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Run comprehensive docs ingestion
.\scripts\phase88-docs-ingestion.ps1
```

**What this does**:
- Crawls 7 web doc sites (Svelte 5, SvelteKit 2, Bits UI, UnoCSS, Drizzle, PG17, pgvector)
- Depth limits: 2 for docs sites, 1 for PG/pgvector (avoid explosion)
- Tags each source: `svelte5,docs,frontend`, `sveltekit2,docs,fullstack`, etc.
- Generates embeddings via Ollama `embeddinggemma:latest`
- Stores in Qdrant `phase76_knowledge_base` collection

**Expected output**:
```
✅ Svelte 5: 150 chunks ingested
✅ SvelteKit 2: 200 chunks ingested
✅ Bits UI: 80 chunks ingested
✅ UnoCSS: 60 chunks ingested
✅ Drizzle ORM: 120 chunks ingested
✅ PostgreSQL 17: 50 chunks ingested
✅ pgvector: 30 chunks ingested
```

### B. Local Operator Documentation
Ingests your project-specific guides:

**Auto-ingested from `kb-manifest-core.txt`**:
- `NEXT_STEPS_LOG.md` — project evolution log
- `MCP_ARCHITECTURE_GUIDE.md` — MCP tool architecture
- `ERROR_REDUCTION_SUMMARY.md` — error fixing patterns
- `SVELTE5_CODE_POLICY.md` — **NEW: Svelte 5 code generation rules**
- `data/knowledge/ace-agentic-patterns.md` — ACE agentic patterns

**Additional discovery**:
- Script searches for `llms.txt` files
- Runs `ripgrep` for READMEs and guides

---

## 🔧 Step 2: Start Knowledge Plane Service

The Go service provides unified RAG/KAG interface.

```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane

# Start service (uses docker start, NOT docker compose up)
.\run.ps1
```

**Verify startup**:
```powershell
# Check health endpoint
curl http://127.0.0.1:8099/health | ConvertFrom-Json

# Expected:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "checks": {
#     "postgres": "ok",
#     "qdrant": "ok",
#     "redis": "ok"
#   }
# }
```

**Available endpoints**:
- `POST /retrieve` — Hybrid RAG (pgvector + Qdrant + RRF merge)
- `POST /svelte/docs/search` — Svelte-specific ripgrep search
- `POST /expand` — Graph expansion queries
- `POST /compose_prompt` — Prompt composition with KB context
- `GET /health` — Service health check

---

## 🧪 Step 3: Test Svelte Docs Search

Verify Svelte 5 docs retrieval works:

```powershell
# Test direct search
.\test-svelte-docs.ps1

# Or manual test:
$body = @{
    query = "Svelte 5 runes state"
    topK = 5
} | ConvertTo-Json

curl http://127.0.0.1:8099/svelte/docs/search `
    -Method POST `
    -Body $body `
    -ContentType "application/json" | ConvertFrom-Json
```

**Expected result categories**:
- `runes` — $state, $derived, $effect, $props
- `stores` — writable, readable, derived (legacy)
- `reactivity` — reactive statements, reactive blocks
- `components` — component props, slots, context
- `routing` — SvelteKit routing, load functions, actions

---

## 🔌 Step 4: Restart FastMCP with KB Integration

FastMCP now has `knowledge_retrieve` as "front door" tool.

```powershell
# Kill existing FastMCP if running
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*fastmcp*"} | Stop-Process

# Start with new KB integration
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/fastmcp-server.mjs
```

**Startup log should show**:
```
🔌 FastMCP Server v1.0.0
✅ Postgres: Connected to 'legal' as 'user'
✅ Tools registered: 15
   - knowledge_retrieve (NEW: KB-first retrieval)
   - postgres_query
   - redis_get, redis_set
   - minio_list, minio_upload
   - ollama_generate
   - ...
```

---

## 🧠 Step 5: Test KB Grounding

Run comprehensive KB retrieval tests:

```powershell
.\scripts\test-kb-grounding.ps1
```

**What this tests**:
1. Service health (Knowledge Plane, Qdrant)
2. Svelte 5 docs search (3 queries: runes, load functions, Bits UI)
3. Hybrid RAG retrieval (pgvector + Qdrant + RRF)
4. Qdrant collection stats (points count, vectors)
5. Svelte 5 code policy file existence

**Expected output**:
```
✅ Knowledge Plane: healthy (v1.0.0)
✅ Svelte 5 docs search: 3/3 queries returned results
✅ Hybrid RAG: 3/3 queries returned results
✅ Qdrant collection: 690+ points
✅ Svelte 5 code policy: exists (5.2 KB)
```

---

## 🤖 Step 6: Run Autonomous Agent with KB

Now test the full agentic loop with KB grounding:

```powershell
# Option 1: Phase 87 autonomous loop (latest)
node scripts/phase87-autonomous-loop.mjs

# Option 2: Phase 86 autonomous loop (stable)
node scripts/phase86-autonomous-loop.mjs
```

**What to monitor**:

1. **KB Tool Calls**: Agent should call `knowledge_retrieve` before `write_file`:
   ```
   🔍 Calling tool: knowledge_retrieve
   Query: "Svelte 5 component props runes"
   Results: 5 chunks from svelte5 docs (score 0.95)
   ```

2. **Code Generation Patterns**: Agent should use Svelte 5 syntax:
   ```javascript
   // ✅ CORRECT (Svelte 5):
   let count = $state(0);
   let doubled = $derived(count * 2);
   $effect(() => { console.log('count changed'); });
   let { prop1, prop2 } = $props();

   // ❌ WRONG (Svelte 3/4):
   export let count = 0;
   $: doubled = count * 2;
   onMount(() => { ... });
   ```

3. **Doc Citations**: Agent should include chunk IDs:
   ```javascript
   // Source: chunk-svelte5-runes-abc123
   let isOpen = $state(false);
   ```

4. **Retrieval Fallbacks**: If Knowledge Plane is down, agent should fall back to Qdrant direct:
   ```
   ⚠️  Knowledge Plane unavailable, using Qdrant fallback
   ✅ Retrieved 3 chunks from Qdrant (score 0.82)
   ```

---

## 🎯 Success Criteria

After completing all steps, verify:

- [ ] **Qdrant Collection**: `phase76_knowledge_base` has 600+ points
- [ ] **Svelte Docs Search**: Returns categorized results for runes, routing, components
- [ ] **Knowledge Plane Health**: `/health` endpoint shows all checks OK
- [ ] **FastMCP `knowledge_retrieve`**: Tool calls hit Knowledge Plane, return Svelte docs
- [ ] **Agent Code Generation**: Uses `$state`, `$derived`, `$effect`, `$props` (not `export let`, `$:`)
- [ ] **Agent Citations**: Includes `// Source: chunk-xxx` in generated code
- [ ] **Policy Enforcement**: Agent retrieves `SVELTE5_CODE_POLICY.md` when generating Svelte components

---

## 🔧 Troubleshooting

### Issue: "Qdrant collection not found"
```powershell
# Create collection manually:
curl -X PUT http://localhost:6333/collections/phase76_knowledge_base `
    -H "Content-Type: application/json" `
    -d '{"vectors": {"size": 3584, "distance": "Cosine"}}'
```

### Issue: "Knowledge Plane health check failed"
```powershell
# Check Docker containers:
docker ps | grep -E "postgres|qdrant|redis"

# Restart if stopped:
cd go-services/knowledge-plane
.\run.ps1
```

### Issue: "Ollama models not found"
```powershell
# Pull required models:
ollama pull embeddinggemma
ollama pull gemma:latest
ollama copy gemma:latest gemma3-legal:latest

# Verify:
curl http://localhost:11434/api/tags
```

### Issue: "Agent still using Svelte 3/4 syntax"
- Check agent logs for `knowledge_retrieve` calls (should happen before `write_file`)
- Verify `SVELTE5_CODE_POLICY.md` is in Qdrant (search for "runes" in KB)
- Increase retrieval `k` parameter (try k=10 instead of k=5)
- Force explicit query: `"Svelte 5 runes NOT export let NOT reactive statement"`

---

## 📊 Next Steps After Launch

1. **Monitor Agent Runs**: Collect logs, check KB call frequency
2. **Tune Retrieval**: Adjust `k`, `mode` (hybrid/dense/sparse), tags
3. **Expand KB**: Add more project-specific docs, Svelte component examples
4. **Benchmark**: Compare agent code quality before/after KB (measure `export let` vs `$state` usage)
5. **Prompt Tuning**: Update `SVELTE5_CODE_POLICY.md` based on observed mistakes

---

**Status**: Ready to launch! 🚀

Execute steps 1-6 in order, then monitor autonomous agent for Svelte 5 compliance.
