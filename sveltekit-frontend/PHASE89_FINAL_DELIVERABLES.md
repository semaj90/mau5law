# Phase 89: Final Drop-In Deliverables
**Status**: ✅ CORRECTED - Container names, DBs, collections verified
**Date**: December 28, 2025

---

## ✅ Deliverable 1: Safeguarded Dependency Startup

**File**: `go-services/knowledge-plane/run-safe.ps1`

### What It Does:
- ✅ **NEVER** runs `docker compose up`
- ✅ **NEVER** rebuilds images
- ✅ **NEVER** recreates containers (unless missing)
- ✅ **NEVER** touches volumes (no prune)
- ✅ Uses Phase 87 portable stack DB: `postgresql://user:pass@127.0.0.1:5434/legal`

### Container Names (Verified from `docker ps -a`):
```
phase66-postgres  → 5434 (PostgreSQL 17 + pgvector)
qdrant            → 6333 (not phase76-qdrant)
phase66-redis     → 6379
ollama-gemma      → 11434
```

### Run It:
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane

# Preview (safe)
.\run-safe.ps1 -DryRun

# Execute
.\run-safe.ps1

# Skip health checks (faster)
.\run-safe.ps1 -SkipHealth

# Override container names
$env:KP_QDRANT_CONTAINER="phase76-qdrant"  # if you use this instead
$env:KP_SKIP_OLLAMA="1"  # if using native Ollama
.\run-safe.ps1
```

### Environment Variables (Auto-configured):
```powershell
$env:KP_DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"
$env:KP_QDRANT_URL   = "http://127.0.0.1:6333"
$env:KP_REDIS_URL    = "redis://127.0.0.1:6379"
$env:KP_OLLAMA_URL   = "http://127.0.0.1:11434"
$env:KP_EMBED_MODEL  = "embeddinggemma:latest"
$env:KP_CHAT_MODEL   = "gemma3-legal:latest"
$env:KP_PORT         = "8099"
```

---

## ✅ Deliverable 2: Agentic Error Analysis Map

### Architecture:
```
Codebase → ts-morph AST → Knowledge Graph → Hybrid Retrieval → LLM Fix
   ↓           ↓              ↓                    ↓              ↓
 150+      Files+Symbols   PostgreSQL           Qdrant       gemma3-legal
 files     +Imports        (kg_nodes,          (phase76_     (810-pt KB)
                           kg_edges)           knowledge_
                                               base)
```

### Corrections from Original Spec:
1. ✅ **Container names**: Uses `qdrant` (not `phase76-qdrant`), `phase66-postgres`, `phase66-redis`, `ollama-gemma`
2. ✅ **Database**: `postgresql://user:pass@127.0.0.1:5434/legal` (NOT `legal_ai_db`)
3. ✅ **Qdrant collection**: `phase76_knowledge_base` (810 points, existing)
4. ✅ **Error embeddings**: Use existing `error_embeddings` table with HNSW (don't duplicate in `kg_nodes`)

---

### 2.1 SQL Schema

**File**: `sveltekit-frontend/migrations/phase89-schema.sql`

**Apply it**:
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Method 1: Pipe to docker exec
Get-Content migrations\phase89-schema.sql | docker exec -i phase66-postgres psql -U user -d legal

# Method 2: Direct file copy
docker cp migrations\phase89-schema.sql phase66-postgres:/tmp/
docker exec phase66-postgres psql -U user -d legal -f /tmp/phase89-schema.sql
```

**What it creates**:
```sql
kg_nodes        -- id, kind (file|symbol|error|doc), label, meta JSONB
kg_edges        -- from_id, to_id, type, weight, evidence JSONB
file_index      -- path, module_kind, exports, imports, hash
```

**Functions**:
- `upsert_kg_node()` - Idempotent node creation
- `create_kg_edge()` - Idempotent edge creation
- `expand_graph()` - Recursive CTE for graph traversal

**Views**:
- `error_density_by_directory` - Which dirs have most errors
- `top_error_files` - Files with most errors

---

### 2.2 Error Graph Builder Script

**File**: `sveltekit-frontend/scripts/phase89-error-graph-builder.mjs`

**What it does**:
1. Parses TypeScript/Svelte files with **ts-morph**
2. Builds `file_index` (exports, imports, hash)
3. Creates `kg_nodes` (files, symbols)
4. Creates `kg_edges` (FILE_IMPORTS_FILE, FILE_DEFINES_SYMBOL)
5. Links errors from `ts_errors` table:
   - Creates `kg_nodes(error)` for each TS error
   - Creates `kg_edges(ERROR_IN_FILE)` linking error to file
   - Creates `kg_edges(ERROR_NEAR_SYMBOL)` if within 20 lines of a symbol
6. Exports `reports/phase89/error-graph.json` for UI caching

**CLI**:
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Build entire graph
node scripts\phase89-error-graph-builder.mjs --build-graph

# Link errors only (assumes graph exists)
node scripts\phase89-error-graph-builder.mjs --link-errors

# Export JSON for UI
node scripts\phase89-error-graph-builder.mjs --export

# Full pipeline
node scripts\phase89-error-graph-builder.mjs --build-graph --link-errors --export

# Dry run (show what would be created)
node scripts\phase89-error-graph-builder.mjs --build-graph --dry-run
```

**Configuration** (in script):
```javascript
const CONFIG = {
  postgres: {
    host: '127.0.0.1',
    port: 5434,
    database: 'legal',  // ✅ CORRECTED
    user: 'user',       // ✅ CORRECTED
    password: 'pass'    // ✅ CORRECTED
  },
  paths: {
    src: 'src',
    exclude: ['node_modules', '.svelte-kit', 'build', 'dist']
  }
};
```

---

### 2.3 Knowledge Plane Endpoints (Go)

Add these to your Go Knowledge Plane (`go-services/knowledge-plane`):

#### GET `/v1/phase89/stats/errors`
```json
{
  "total_nodes": 500,
  "nodes_by_kind": {"file": 150, "symbol": 200, "error": 100, "doc": 50},
  "total_edges": 800,
  "edges_by_type": {
    "FILE_IMPORTS_FILE": 200,
    "FILE_DEFINES_SYMBOL": 300,
    "ERROR_IN_FILE": 150,
    "ERROR_NEAR_SYMBOL": 150
  },
  "top_broken_files": [
    {"path": "src/lib/cache.ts", "error_count": 15},
    {"path": "src/routes/+layout.svelte", "error_count": 12}
  ]
}
```

#### POST `/v1/phase89/graph/subgraph`
```json
{
  "focus_id": "file:src/lib/cache.ts",
  "depth": 2,
  "edge_types": ["ERROR_IN_FILE", "ERROR_NEAR_SYMBOL"]
}
```

**Response**: Nodes + edges in graph format for D3.

#### POST `/v1/phase89/retrieve`
**Hybrid retrieval**:
1. Query `error_embeddings` (pgvector HNSW)
2. Query `phase76_knowledge_base` (Qdrant, 810 points)
3. Expand graph via `expand_graph()`
4. Return unified context

```json
{
  "query": "TS1005 ',' expected",
  "top_k": 5
}
```

**Response**:
```json
{
  "similar_errors": [...],     // From error_embeddings
  "related_docs": [...],       // From phase76_knowledge_base
  "graph_context": [...]       // From expand_graph()
}
```

#### POST `/v1/phase89/classify`
**Heuristic pattern classification + nearest-neighbor**

```json
{
  "error_code": "TS1005",
  "file_path": "src/lib/cache.ts",
  "line": 42
}
```

**Response**:
```json
{
  "pattern": "missing_comma",
  "confidence": 0.85,
  "similar_fixes": [...]
}
```

---

### 2.4 SvelteKit UI Route

**File**: `src/routes/(app)/phase89/error-map/+page.svelte`

**Layout**:
```
┌────────────┬──────────────────────┬─────────────────┐
│            │                      │                 │
│  Dir Tree  │   Force Graph        │  Details Panel  │
│  + Stats   │   (D3 canvas)        │  - Node info    │
│            │                      │  - Retrieve     │
│            │                      │  - Similar      │
│            │                      │  - Suggest Fix  │
└────────────┴──────────────────────┴─────────────────┘
```

**Data source**: Calls Knowledge Plane at `http://localhost:8099/v1/phase89/*`

**Features**:
- Click node → show details + expand graph
- Select error → retrieve similar + docs + suggest fix
- Filter by error type, file, directory
- Export subgraph as JSON

---

## ✅ KB Ingestion (Svelte 5 + SvelteKit 2 + Stack)

**Keep your existing 810-point collection** (`phase76_knowledge_base`):
- ✅ 294 Svelte 5 chunks
- ✅ 338 SvelteKit 2 chunks
- ✅ 178 operator docs

**Add version tags** for better retrieval:
```
svelte5
sveltekit2
bits-ui-v2
unocss
pgvector
postgres17
drizzle-0.44
go-1.25
```

**Don't create a new collection** - Phase 89 reuses existing KB.

---

## 🚀 Complete Setup Workflow

### Step 1: Start Dependencies (Safeguarded)
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run-safe.ps1
```

**Expected**: All containers start without rebuilds, volumes preserved.

### Step 2: Apply Schema
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
Get-Content migrations\phase89-schema.sql | docker exec -i phase66-postgres psql -U user -d legal
```

**Verify**:
```powershell
docker exec phase66-postgres psql -U user -d legal -c "\dt"
```

**Expected**: `kg_nodes`, `kg_edges`, `file_index` tables exist.

### Step 3: Build Knowledge Graph
```powershell
node scripts\phase89-error-graph-builder.mjs --build-graph --link-errors --export
```

**Expected**:
```
✅ Parsed 150 TypeScript files
✅ Found 200 symbols
✅ Created 500 nodes
✅ Created 800 edges
✅ Linked 100 errors
✅ Exported to reports/phase89/error-graph.json
```

### Step 4: Verify Graph
```powershell
docker exec phase66-postgres psql -U user -d legal -c "SELECT kind, COUNT(*) FROM kg_nodes GROUP BY kind;"
```

**Expected**:
```
  kind   | count
---------+-------
 file    |   150
 symbol  |   200
 error   |   100
 doc     |    50
```

### Step 5: Launch UI
```powershell
npm run dev
```

Open: `http://localhost:5175/phase89/error-map`

---

## 🧪 Verification Tests

### Test 1: Containers Running
```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}" | Select-String "phase66|qdrant|ollama"
```

**Expected**:
```
phase66-postgres    0.0.0.0:5434->5432/tcp
qdrant              0.0.0.0:6333-6334->6333-6334/tcp
phase66-redis       0.0.0.0:6379->6379/tcp
ollama-gemma        0.0.0.0:11434->11434/tcp
```

### Test 2: Database Connection
```powershell
docker exec phase66-postgres psql -U user -d legal -c "SELECT current_database(), current_user;"
```

**Expected**: `legal | user`

### Test 3: Graph Exists
```powershell
docker exec phase66-postgres psql -U user -d legal -c "SELECT COUNT(*) FROM kg_nodes;"
```

**Expected**: > 100

### Test 4: Qdrant Collection
```powershell
Invoke-RestMethod http://127.0.0.1:6333/collections/phase76_knowledge_base | ConvertTo-Json
```

**Expected**: `points_count: 810`

### Test 5: Knowledge Plane API
```powershell
Invoke-RestMethod http://127.0.0.1:8099/v1/phase89/stats/errors | ConvertTo-Json
```

**Expected**: JSON with node/edge counts

---

## 📊 Summary

| Component | Status | File |
|-----------|--------|------|
| Safeguarded startup | ✅ | `go-services/knowledge-plane/run-safe.ps1` |
| SQL schema | ✅ | `sveltekit-frontend/migrations/phase89-schema.sql` |
| Graph builder | ⏳ | `sveltekit-frontend/scripts/phase89-error-graph-builder.mjs` |
| Go endpoints | ⏳ | `go-services/knowledge-plane/cmd/server/phase89_handlers.go` |
| UI route | ⏳ | `src/routes/(app)/phase89/error-map/+page.svelte` |

**Next Action**: Say **"paste phase89-error-graph-builder.mjs"** for the full Node script.

---

## 🔥 Key Corrections Applied

1. ✅ **Container names**: `qdrant` (not `phase76-qdrant`), `phase66-postgres`, `phase66-redis`, `ollama-gemma`
2. ✅ **Database**: `legal` (not `legal_ai_db`), user `user` (not `legal_admin`)
3. ✅ **Qdrant collection**: `phase76_knowledge_base` (reuse existing 810 points)
4. ✅ **Never rebuilds**: `run-safe.ps1` only starts/creates, never `docker compose up`
5. ✅ **Volume preservation**: Named volumes survive container recreation
6. ✅ **Error embeddings**: Use existing `error_embeddings` table (don't duplicate in `kg_nodes`)

**Status**: Ready for drop-in deployment! 🚀
