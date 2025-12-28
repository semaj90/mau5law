# Phase 89: Quick Command Reference
**Copy-paste commands for immediate testing**

---

## 🔥 CRITICAL: Database Configuration

**Phase 89 uses Phase 66/87 Docker PostgreSQL (port 5434/legal/user)**

```powershell
# Correct database (Phase 66/87 Docker - embeddings + HNSW)
$env:DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"

# Wrong database (Phase 76 app - NOT used by Phase 89)
# $env:DATABASE_URL = "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"  # ❌ DON'T USE
```

**Why 5434?**
- All embeddings (768-dim) generated with this DB
- All HNSW indexes built here
- Phase 86/87 autonomous loop uses this
- Phase 89 knowledge graph stored here

---

## 🚀 ONE-COMMAND FULL STACK

```powershell
# Phase 89 Quick Start (all-in-one)
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend; `
.\scripts\phase89-quick-start.ps1
```

**What it does**:
1. Starts Phase 66 dependencies (hardened - no compose)
2. Applies knowledge graph schema
3. Builds error graph (AST analysis)
4. Shows stats and next steps

**Time**: ~7 minutes (5 min AST + 2 min embeddings)

---

## 📋 STEP-BY-STEP COMMANDS

### 1. Start Dependencies Only
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run.ps1
```

### 2. Apply Schema Only
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
psql "postgresql://user:pass@127.0.0.1:5434/legal" -f migrations\phase89-error-graph-schema.sql
```

### 3. Build Graph Only
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts\phase89-build-error-graph.mjs
```

### 4. Start Dev Server
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run dev
```

### 5. View Visualization
```
http://localhost:5175/phase89/error-map
```

---

## 🧠 KB-GROUNDED FIX GENERATION

### Quick Fix (First Error)
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Get first error ID
$errorId = (psql "postgresql://user:pass@127.0.0.1:5434/legal" -t -c "SELECT id FROM ts_errors LIMIT 1;").Trim()

# Generate fix
.\scripts\phase89-kb-grounded-fix.ps1 -ErrorId $errorId
```

### Fix with Deep Graph Expansion
```powershell
.\scripts\phase89-kb-grounded-fix.ps1 -ErrorId $errorId -ExpandDepth 3 -TopK 10
```

### Dry Run (Preview Prompt)
```powershell
.\scripts\phase89-kb-grounded-fix.ps1 -ErrorId $errorId -DryRun
```

---

## 🔍 VERIFICATION COMMANDS

### Check Containers
```powershell
docker ps --filter "name=phase66-postgres" --filter "name=qdrant" --filter "name=redis" --filter "name=ollama"
```

### Check Database Connection
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "SELECT version();"
```

### Check Qdrant KB (810 Points)
```powershell
(Invoke-RestMethod -Uri "http://localhost:6333/collections/phase76_knowledge_base").result.points_count
```

### Check Ollama Models
```powershell
Invoke-RestMethod -Uri "http://localhost:11434/api/tags" | Select-Object -ExpandProperty models | Select-Object name
```

---

## 📊 GRAPH STATISTICS

### Quick Stats (API)
```powershell
Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/stats" | ConvertTo-Json
```

### Detailed Stats (SQL)
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT
  (SELECT COUNT(*) FROM kg_nodes WHERE kind='file') as files,
  (SELECT COUNT(*) FROM kg_nodes WHERE kind='error') as errors,
  (SELECT COUNT(*) FROM kg_nodes WHERE kind='symbol') as symbols,
  (SELECT COUNT(*) FROM kg_edges) as edges,
  (SELECT COUNT(*) FROM error_embeddings) as embeddings
"
```

### Top Error Files
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "SELECT * FROM top_error_files LIMIT 10;"
```

### Error Density by Directory
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "SELECT * FROM error_density_by_directory LIMIT 10;"
```

---

## 🔬 API TESTING

### Get Top Errors (REST)
```powershell
Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/graph/top-errors?limit=10"
```

### Expand Graph (KAG Traversal)
```powershell
$body = @{ seed_uris = @("file:src/lib/cache.ts"); depth = 2 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/graph/expand" `
  -Method POST -Body $body -ContentType "application/json"
```

### Search Similar Errors (Vector)
```powershell
$body = @{ query = "expected ')' but found"; limit = 5 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/search" `
  -Method POST -Body $body -ContentType "application/json"
```

---

## 🧪 DEVELOPMENT TESTING

### Test Graph Traversal (SQL)
```sql
-- Expand from specific error (depth 2)
SELECT * FROM expand_graph(
  ARRAY['err:TS1005:src/lib/cache.ts:45:12']::TEXT[],
  2
);
```

### Test Vector Search (SQL)
```sql
-- Find similar errors via embeddings
SELECT
  te.code,
  te.message,
  te.path,
  te.line,
  ee.embedding <=> (SELECT embedding FROM error_embeddings WHERE error_id = 1 LIMIT 1) AS distance
FROM error_embeddings ee
JOIN ts_errors te ON te.id = ee.error_id
WHERE ee.error_id != 1
ORDER BY distance
LIMIT 5;
```

### Test KB Retrieval (FastMCP)
```powershell
# Start FastMCP (if not running)
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/fastmcp-server.mjs
```

Then query via REST:
```powershell
$body = @{
  function_name = "knowledge_retrieve"
  arguments = @{
    query = "Svelte 5 $props rune examples"
    top_k = 5
  }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://127.0.0.1:3002/function-call" `
  -Method POST -Body $body -ContentType "application/json"
```

---

## 🐛 TROUBLESHOOTING

### Container Not Running
```powershell
docker start phase66-postgres qdrant phase76-redis ollama-gemma
```

### Port Already in Use (Kill Process)
```powershell
# Example: Kill process on port 5434
$port = 5434
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcp) { Stop-Process -Id $tcp.OwningProcess -Force }
```

### Clear Redis Cache
```powershell
docker exec phase76-redis redis-cli FLUSHDB
```

### Reset Knowledge Graph (Dangerous!)
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
TRUNCATE kg_nodes CASCADE;
TRUNCATE kg_edges CASCADE;
TRUNCATE file_index CASCADE;
TRUNCATE error_embeddings CASCADE;
"
```

### Rebuild from Scratch
```powershell
# 1. Reset graph
psql "postgresql://user:pass@127.0.0.1:5434/legal" -f migrations\phase89-error-graph-schema.sql

# 2. Rebuild
node scripts\phase89-build-error-graph.mjs
```

---

## 📚 ALTERNATIVE AGENT PATHS

### Option 1: Phase 86 Autonomous Loop
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts\phase86-autonomous-loop.mjs
```

**Uses**: Phase 76 database (port 5432), batch error fixing

### Option 2: Phase 87 Autonomous Fixer
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts\phase87-autonomous-fixer.mjs
```

**Uses**: Qdrant vector search for similar errors

### Option 3: ACE Prompt Engineer
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts\phase76-ace-prompt-engineer.mjs --task "Generate Svelte 5 component" --iterations 2
```

**Uses**: 810-point KB context injection

### Option 4: Phase 88 KB Demo
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts\phase88-kb-demo.mjs
```

**Uses**: Simple KB query demo (no database)

---

## 🎯 RECOMMENDED WORKFLOW

### First Time Setup
```powershell
# 1. Start dependencies
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run.ps1

# 2. Apply schema
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
psql "postgresql://user:pass@127.0.0.1:5434/legal" -f migrations\phase89-error-graph-schema.sql

# 3. Build graph
node scripts\phase89-build-error-graph.mjs

# 4. Start dev server
npm run dev

# 5. Open browser
# http://localhost:5175/phase89/error-map
```

### Daily Development
```powershell
# 1. Ensure containers running
docker start phase66-postgres qdrant phase76-redis ollama-gemma

# 2. Start dev server
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run dev

# 3. Generate fixes as needed
.\scripts\phase89-kb-grounded-fix.ps1 -ErrorId {id}
```

### Before Commits
```powershell
# 1. Rebuild graph (detect new errors)
node scripts\phase89-build-error-graph.mjs

# 2. Check stats
Invoke-RestMethod -Uri "http://localhost:5175/api/phase89/stats"

# 3. Review top error files
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "SELECT * FROM top_error_files LIMIT 10;"
```

---

## 📖 DOCUMENTATION LINKS

- **PHASE89_DEPLOYMENT_GUIDE.md** - Full deployment walkthrough
- **PHASE89_VERIFICATION.md** - Container status checklist
- **PHASE89_README.md** - Architecture documentation
- **KB_PRODUCTION_READY.md** - 810-point KB guide

---

**Copy, paste, run!** ⚡
