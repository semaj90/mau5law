# Phase 86: Deterministic Autonomous Loop Setup

## ✅ What's Fixed

### 1. **FastMCP Server**
- ✅ Fixed function name mismatches (`webSearch`, `readFile`, `searchCodebase`)
- ✅ Removed duplicate `writeFileTool`
- ✅ Added proper error handling (never exits on tool errors)
- ✅ Supports multiple request schemas (`{name, arguments}` OpenAI-style)
- ✅ Web search returns clean "disabled" response (no crash)
- ✅ Health endpoint: `GET /health`
- ✅ Tools list endpoint: `GET /tools`

### 2. **Phase 86 Autonomous Loop**
- ✅ Environment variable support for DB config (always uses `$env:PGHOST`, `$env:PGPORT`)
- ✅ Default: `postgresql://user@127.0.0.1:5434/legal` (Docker pgvector container)
- ✅ Always reads target file FIRST (before deciding on fix strategy)
- ✅ Disabled web_search fallback cleanly (no ECONNREFUSED crashes)
- ✅ Auto-detects if MCP server is already running (no duplicate spawns)
- ✅ Proper error response handling (`{ok, result}` and direct formats)

### 3. **Port Allocation**
- ✅ Port 5433: **CLEAR** (no conflicts)
- ✅ Port 5434: **PostgreSQL pgvector container** (phase66-postgres)
- ✅ Port 3002: **FastMCP server** (9 tools: qdrant_search, postgres_query, minio_fetch, redis_cache, read_file, search_codebase, web_search, write_file, run_command)

## 🧠 Current Knowledge Base Status

### PostgreSQL (pgvector on port 5434)
```
✅ ts_errors: 100 rows
   - 87 × TS1005 (object literal syntax)
   - 7 × TS1128 (declaration expected)
   - 2 × TS1109 (expression expected)
   - 1 × TS1472 (module augmentation)
   - 1 × TS1135 (argument expression expected)

✅ error_embeddings: 100 vectors (768D, HNSW index)
✅ knowledge_graph: 10 error→pattern links
✅ HNSW Index: m=16, ef_construction=64, cosine similarity
```

### Qdrant (15 collections, 55,561 total vectors)
```
✅ phase72_error_patterns: 53,227 vectors (768D)
✅ knowledge_base: 1,093 vectors (768D)
✅ phase72_ast_knowledge_base: 14 surgical patterns
✅ surgical_fixes_phase66_85: 48 OpenAI patterns (1536D)
✅ phase81_ts_errors: 100 sample errors
✅ [10 more specialized collections]
```

### Ollama (port 11434)
```
✅ embeddinggemma:latest (768D embeddings)
✅ gemma3-legal:latest (LLM for fix generation)
```

## 🚀 How to Run (Deterministic)

### Terminal 1: Start FastMCP Server
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/fastmcp-server.mjs
```

**Expected Output:**
```
🚀 FastMCP Server Running
   Port: 3002
   URL: http://localhost:3002/function-call

📦 Available Tools:
   - qdrant_search: Search knowledge base
   - postgres_query: Query PostgreSQL
   - minio_fetch: Fetch from MinIO
   - redis_cache: Cache operations

✨ Ready for agentic tool calling!
```

### Terminal 2: Verify Server Health
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:3002/health" -Method Get
# Should return: { ok: true, status: "healthy", tools: 9 }

Invoke-RestMethod -Uri "http://127.0.0.1:3002/tools" -Method Get
# Should list all 9 tools
```

### Terminal 2: Run Autonomous Loop
```powershell
# Option A: Use helper script (recommended)
.\scripts\run-phase86-loop.ps1

# Option B: Manual with env vars
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5434"
$env:PGDATABASE = "legal"
$env:PGUSER = "user"
$env:PGPASSWORD = "pass"
node scripts/phase86-autonomous-loop.mjs
```

**Expected Output (First Iteration):**
```
✅ FastMCP server already running
♾️  Phase 86 Autonomous Loop Started
📊 Config: postgresql://user@127.0.0.1:5434/legal
🔌 Connecting to pool...
✅ Pool connected successfully
🔌 DB Connected: PostgreSQL 17.6 (Debian 17.6-1.pgdg12+1) on x86_64-pc-linux-gnu... (IP: 172.17.0.2)

🎯 TARGET: [TS1005] in src/routes/proxy/+page.server.ts
   Msg: ',' expected.

📄 Reading target file: src/routes/proxy/+page.server.ts...
✅ Read 15847 chars from src/routes/proxy/+page.server.ts

💡 KNOWN PATTERN FOUND: Object Spread Comma Fix (Score: 0.9234)
🚀 AGENT COMMAND: Apply Strategy -> Replace colon after spread operator with comma

🤖 Generating fix using gemma3-legal:latest...
📝 Applying fix...
✅ Fix Result: Successfully wrote to src/routes/proxy/+page.server.ts
```

## 🔧 Troubleshooting

### Issue: "ECONNREFUSED 127.0.0.1:3002"
**Cause:** FastMCP server not running
**Fix:**
```powershell
node scripts/fastmcp-server.mjs  # In separate terminal
```

### Issue: "role user does not exist"
**Cause:** Connecting to Windows local PostgreSQL instead of Docker
**Fix:** Ensure env vars are set:
```powershell
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5434"
```

### Issue: "Tool not found: web_search"
**Cause:** Old FastMCP server running
**Fix:**
```powershell
Get-Process node | Stop-Process -Force  # Kill all node processes
node scripts/fastmcp-server.mjs        # Restart server
```

### Issue: "listen EADDRINUSE: address already in use :::3002"
**Cause:** Multiple servers trying to bind to port 3002
**Fix:**
```powershell
$port = 3002
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcp) {
    Stop-Process -Id $tcp.OwningProcess -Force
}
```

## 📊 Verification Commands

### Check Database Connection
```powershell
docker exec -i phase66-postgres psql -U user -d legal -c "SELECT version();"
docker exec -i phase66-postgres psql -U user -d legal -c "SELECT COUNT(*) FROM ts_errors;"
```

### Check Qdrant Collections
```powershell
Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method Get
```

### Check Ollama Models
```powershell
ollama list
```

### Test FastMCP Tool Call
```powershell
$body = @{
    name = "read_file"
    arguments = @{ filepath = "./package.json" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:3002/function-call" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

## 🎯 Current Loop Behavior

1. **Query PostgreSQL**: Fetch highest-impact open error (ORDER BY impact_score DESC)
2. **Generate Embedding**: Use embeddinggemma:latest (768D)
3. **Search Qdrant**: phase72_ast_knowledge_base (14 surgical patterns)
4. **Read File**: Always read target file via MCP `read_file` tool
5. **Decision**:
   - If confidence ≥0.85: Apply fix automatically (using gemma3-legal:latest)
   - If confidence <0.85: Log for manual review, mark `status = 'needs_review'`
6. **Write Fix**: Apply via MCP `write_file` tool
7. **Mark Fixed**: Update `ts_errors` table

## 🧬 Next Phase: Phase 87 Full Pipeline

Once Phase 86 loop is stable:

```powershell
# Scale to full corpus (33,599 errors)
node scripts/phase87-ingest-error-corpus.mjs  # ~2 hours for full ingestion

# Sync all knowledge bases
node scripts/phase87-knowledge-sync.mjs

# Run autonomous fixer
node scripts/phase87-autonomous-fixer.mjs

# Or run complete pipeline
node scripts/phase87-pipeline.mjs
```

## 📚 Reference Files

- `scripts/phase86-autonomous-loop.mjs` - Main loop (environment variable support)
- `scripts/fastmcp-server.mjs` - Tool server (9 tools, never exits on error)
- `scripts/run-phase86-loop.ps1` - Helper script (sets env vars + runs loop)
- `PHASE87_COMPLETE.md` - Phase 87 architecture (pgvector + Qdrant + autonomous fixing)

---

**Last Updated:** December 27, 2025
**Status:** ✅ DETERMINISTIC (no more port conflicts, DB confusion, or tool errors)
**Next:** Run autonomous loop → Fix TS1005 errors → Validate → Scale to Phase 87
