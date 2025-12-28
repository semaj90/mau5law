# 🚀 Phase 88 Quick Reference

## Launch Commands (Copy-Paste Ready)

### 1️⃣ Ingest Documentation (10-30 min)
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
.\scripts\phase88-docs-ingestion.ps1
```

### 2️⃣ Start Knowledge Plane
```powershell
cd ..\go-services\knowledge-plane
.\run.ps1
```

### 3️⃣ Test Svelte Docs Search
```powershell
cd ..\..\sveltekit-frontend
.\scripts\test-svelte-docs.ps1
```

### 4️⃣ Test Full KB Grounding
```powershell
.\scripts\test-kb-grounding.ps1
```

### 5️⃣ Restart FastMCP
```powershell
# Kill existing:
Get-Process -Name node | Where-Object {$_.CommandLine -like "*fastmcp*"} | Stop-Process

# Start new:
node scripts\fastmcp-server.mjs
```

### 6️⃣ Run Autonomous Agent
```powershell
node scripts\phase87-autonomous-loop.mjs
```

---

## Health Checks (Quick Verify)

### Infrastructure
```powershell
docker ps | grep -E "postgres|redis|qdrant|ollama"
```

### Ollama Models
```powershell
curl http://localhost:11434/api/tags | ConvertFrom-Json | Select-Object -ExpandProperty models | Select-Object name
```

### Qdrant Collection
```powershell
curl http://localhost:6333/collections/phase76_knowledge_base | ConvertFrom-Json
```

### Knowledge Plane
```powershell
curl http://127.0.0.1:8099/health | ConvertFrom-Json
```

---

## Expected Results

### After Ingestion
```
✅ Svelte 5: 150 chunks
✅ SvelteKit 2: 200 chunks
✅ Bits UI: 80 chunks
✅ Total: 600+ points in Qdrant
```

### After KB Test
```
✅ Knowledge Plane: healthy
✅ Svelte docs search: 3/3 queries OK
✅ Hybrid RAG: 3/3 queries OK
✅ Policy file: exists (5.2 KB)
```

### Agent Logs (What to See)
```
🔍 Calling tool: knowledge_retrieve
✅ Retrieved from svelte_docs (score 0.95)
📝 Generating fix with KB context...
// Source: chunk-svelte5-runes-abc123
let count = $state(0);  ✅ CORRECT
```

---

## Troubleshooting One-Liners

### Qdrant Empty
```powershell
.\scripts\phase88-docs-ingestion.ps1
```

### Knowledge Plane Down
```powershell
cd ..\go-services\knowledge-plane; .\run.ps1
```

### Ollama Models Missing
```powershell
ollama pull embeddinggemma; ollama pull gemma:latest; ollama copy gemma:latest gemma3-legal:latest
```

### Agent Using export let
```powershell
# Check policy in KB:
curl http://127.0.0.1:8099/retrieve -Method POST -Body '{"query":"SVELTE5 CODE POLICY"}' -ContentType "application/json"

# If empty, re-ingest:
.\scripts\phase88-docs-ingestion.ps1
```

---

## Ports Reference

| Service         | Port  | URL                              |
|-----------------|-------|----------------------------------|
| FastMCP         | 3002  | MCP protocol (stdio)             |
| Knowledge Plane | 8099  | http://127.0.0.1:8099            |
| Postgres        | 5434  | postgresql://127.0.0.1:5434      |
| Redis           | 6379  | redis://127.0.0.1:6379           |
| Qdrant          | 6333  | http://127.0.0.1:6333            |
| MinIO           | 9000  | http://127.0.0.1:9000            |
| MinIO Console   | 9001  | http://127.0.0.1:9001            |
| Ollama          | 11434 | http://127.0.0.1:11434           |

---

## Key Files

| File                                    | Purpose                          |
|-----------------------------------------|----------------------------------|
| `scripts/fastmcp-server.mjs`            | MCP tool server (knowledge_retrieve) |
| `scripts/phase88-docs-ingestion.ps1`    | KB population script             |
| `scripts/test-kb-grounding.ps1`         | Comprehensive KB test            |
| `data/knowledge/SVELTE5_CODE_POLICY.md` | Agent code generation rules      |
| `PHASE88_LAUNCH_CHECKLIST.md`           | Step-by-step guide               |
| `PHASE88_IMPLEMENTATION_SUMMARY.md`     | Architecture overview            |
| `go-services/knowledge-plane/run.ps1`   | Start Knowledge Plane service    |

---

## Success Checklist

- [ ] Qdrant has 600+ points
- [ ] Knowledge Plane `/health` returns OK
- [ ] Svelte docs search returns categorized results
- [ ] FastMCP shows `knowledge_retrieve` in tools list
- [ ] Agent calls `knowledge_retrieve` before `write_file`
- [ ] Agent uses `$state`, `$derived`, `$effect` (NOT `export let`, `$:`)
- [ ] Generated code includes `// Source: chunk-xxx` citations

---

**Status**: ✅ Ready to Launch
**Next**: Run step 1️⃣ (ingestion) → 2️⃣ (start service) → 6️⃣ (test agent)
