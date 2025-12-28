# Phase 88: Agentic Error Analysis Map - Deliverables

## 🎯 Overview

Two major deliverables for autonomous error fixing with zero infrastructure risk:

1. **Hardened Dependency Startup Script** - Never rebuilds Docker containers, preserves data
2. **Agentic Error Analysis Map** - AST parsing → Knowledge graph → Vector similarity → Visual UI

**Critical Database Fix Applied:**
- ✅ Phase 87 portable stack uses: `postgresql://user:pass@127.0.0.1:5434/legal`
- ❌ NOT: `postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db` (Phase 76 app DB)
- 🔥 Avoids Windows Postgres collision on port 5432
- 🔥 Matches your Docker pgvector container with embeddings + HNSW indexes

---

## 📦 Deliverable 1: Hardened Dependency Startup

### File: `go-services/knowledge-plane/run-safe-hardened.ps1`

**Features:**
- ✅ **Never runs `docker compose up`** - Only uses `docker start` for existing containers
- ✅ **Volume safeguards** - Warns before creating containers if volumes exist
- ✅ **Named volumes** - Preserves data across restarts
- ✅ **Health checks** - Verifies each dependency is reachable
- ✅ **Dry-run mode** - Preview what will happen before executing
- ✅ **Hardcoded container names** - Uses your actual Phase 87 containers

**Container Mapping (from `docker ps -a`):**
```powershell
phase66-postgres    # Port 5434, DB: legal, User: user/pass
phase76-qdrant      # Port 6333, Vector store
phase66-redis       # Port 6379, Cache
ollama-gemma        # Port 11434, LLM models
```

**Usage:**
```powershell
cd go-services\knowledge-plane

# Preview what will happen (safe)
.\run-safe-hardened.ps1 -DryRun

# Actually start dependencies + Knowledge Plane
.\run-safe-hardened.ps1
```

**Environment Variables Set:**
```powershell
KP_DATABASE_URL=postgresql://user:pass@127.0.0.1:5434/legal
KP_QDRANT_URL=http://127.0.0.1:6333
KP_REDIS_URL=redis://127.0.0.1:6379
KP_OLLAMA_URL=http://127.0.0.1:11434
KP_EMBED_MODEL=embeddinggemma:latest
KP_CHAT_MODEL=gemma3-legal:latest
KP_PORT=8099
```

**Safety Guarantees:**
- 🔒 **Never creates duplicate containers** - Checks existence before creating
- 🔒 **Never deletes volumes** - Uses named volumes with explicit names
- 🔒 **Never runs compose** - Only `docker start` (unless `AllowCompose` flag)
- 🔒 **Warns loudly** - If creating missing container, shows what will be created

---

### Fix: Existing `run.ps1` Database URL

**File:** `go-services/knowledge-plane/run.ps1` (line 206)

**Changed:**
```diff
- $env:DATABASE_URL = "postgresql://legal_admin:123456@127.0.0.1:5434/legal_ai_db"
+ $env:DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"
```

**Why:** Phase 87 portable stack must use `5434/legal/user` to match Docker pgvector container with embeddings/HNSW indexes.

---

## 📊 Deliverable 2: Agentic Error Analysis Map

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Agentic Error Analysis Map                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. AST Parsing (ts-morph)                                  │
│     ├── Files → Imports/Exports/Symbols                     │
│     ├── Cache in Redis (ast:<hash> → {exports, imports})    │
│     └── Insert into file_index table                        │
│                                                             │
│  2. Knowledge Graph (PostgreSQL)                            │
│     ├── kg_nodes: files, symbols, errors, docs, patterns   │
│     ├── kg_edges: imports, exports, errors, proximity       │
│     ├── ERROR_IN_FILE: ts_errors → files                    │
│     ├── ERROR_NEAR_SYMBOL: errors → symbols (±10 lines)     │
│     └── FILE_IMPORTS_FILE / FILE_EXPORTS_SYMBOL             │
│                                                             │
│  3. Error Embeddings (Ollama + Redis)                       │
│     ├── Generate embeddings: embeddinggemma                 │
│     ├── Cache in Redis (emb:<sha256> → vector)              │
│     └── SIMILAR_TO edges: cosine similarity ≥ 0.7           │
│                                                             │
│  4. Visualization (SvelteKit)                               │
│     ├── /phase88/error-map route                            │
│     ├── Force-directed graph (D3/canvas)                    │
│     ├── File tree + error density heatmap                   │
│     └── Node inspector: docs/fixes/similar errors           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Component 1: PostgreSQL Schema

**File:** `scripts/phase88-create-schema.sql`

**Tables:**

1. **`kg_nodes`** - Graph nodes (files, symbols, errors, docs, patterns)
   ```sql
   id TEXT PRIMARY KEY           -- file:<path> | sym:<file>:<name> | err:<id>
   kind TEXT                     -- 'file' | 'symbol' | 'error' | 'doc' | 'pattern'
   label TEXT                    -- Display name
   meta JSONB                    -- {path, line, code, severity, exports, imports, ...}
   ```

2. **`kg_edges`** - Relationships
   ```sql
   from_id, to_id TEXT           -- Node IDs
   type TEXT                     -- 'FILE_IMPORTS_FILE' | 'ERROR_IN_FILE' | 'SIMILAR_TO' | ...
   weight REAL                   -- Similarity score, error count, etc.
   evidence JSONB                -- {line, snippet, fix_confidence, ...}
   ```

3. **`file_index`** - AST metadata cache
   ```sql
   file_path TEXT PRIMARY KEY
   file_hash TEXT                -- SHA-256 (for cache invalidation)
   exports, imports, symbols JSONB
   ```

4. **`error_clusters`** - Pattern classifications
   ```sql
   pattern_id TEXT               -- 'ts1005_missing_brace' | 'svelte5_rune_migration'
   heuristics JSONB              -- [{rule, regex, code}]
   fix_template TEXT             -- Auto-fix template
   kb_tags TEXT[]                -- ['typescript', 'syntax']
   ```

**Pre-seeded Patterns:**
- `ts1005_missing_brace` - Missing curly brace
- `ts1128_missing_declaration` - Missing declaration/statement
- `ts1109_missing_expression` - Expression expected
- `ts2305_missing_import` - Missing module import
- `ts2322_type_mismatch` - Type assignment mismatch
- `svelte_binding_invalid` - Invalid Svelte binding
- `svelte5_rune_migration` - Needs `$state()`, `$derived()`, `$effect()`

**Utility Functions:**
- `get_file_errors(file_path)` - Returns all errors for a file
- `get_error_density()` - Error count by directory
- `find_similar_errors(error_id, threshold, limit)` - Pattern matching

**Installation:**
```powershell
# Run once in phase66-postgres (5434/legal)
docker exec -i phase66-postgres psql -U user -d legal < scripts/phase88-create-schema.sql
```

---

### Component 2: AST Error Map Builder

**File:** `scripts/phase88-build-error-map.mjs`

**Pipeline (5 phases):**

1. **Phase 1: Build File Index**
   - Parse TypeScript/Svelte files with ts-morph
   - Extract: imports, exports, symbols (functions, classes, vars)
   - Cache AST in Redis: `ast:<filehash>` → `{exports, imports, symbols}`
   - Insert into `file_index` table

2. **Phase 2: Build Knowledge Graph**
   - Insert file nodes: `file:<path>`
   - Insert symbol nodes: `sym:<file>:<name>`
   - Create import edges: `FILE_IMPORTS_FILE`
   - Create export edges: `FILE_EXPORTS_SYMBOL`

3. **Phase 3: Link Errors**
   - Read `ts_errors` table (from phase6 check)
   - Create error nodes: `err:<id>`
   - Create `ERROR_IN_FILE` edges: error → file
   - Create `ERROR_NEAR_SYMBOL` edges: error → symbols within ±10 lines

4. **Phase 4: Find Similar Errors**
   - Generate embeddings: `embeddinggemma` model
   - Cache in Redis: `emb:<sha256(message)>` → vector (768 dims)
   - Compute cosine similarity between all error pairs
   - Create `SIMILAR_TO` edges (threshold ≥ 0.7)

5. **Phase 5: Export Visualization**
   - Serialize graph to JSON: `reports/phase88/error-map.json`
   - Includes: nodes, edges, metadata (counts, timestamp)

**Usage:**
```bash
# Incremental build (uses Redis cache)
node scripts/phase88-build-error-map.mjs

# Force rebuild from scratch
node scripts/phase88-build-error-map.mjs --rebuild

# Only build file/symbol graph (skip errors)
node scripts/phase88-build-error-map.mjs --skip-errors
```

**Configuration (edit script if needed):**
```javascript
srcDirs: ['src/routes', 'src/lib', 'src/params', 'src/hooks.*.ts', 'src/app.d.ts']
similarityThreshold: 0.7  // Min cosine similarity for SIMILAR_TO edges
maxSimilarErrors: 10      // Max similar errors per node
```

**Dependencies:**
```json
{
  "ts-morph": "^23.0.0",
  "postgres": "^3.4.5",
  "ioredis": "^5.4.1"
}
```

**Output:**
- PostgreSQL: `kg_nodes`, `kg_edges`, `file_index` tables populated
- Redis: AST cache (`ast:*`), embedding cache (`emb:*`)
- File: `reports/phase88/error-map.json` (for UI)

---

### Component 3: Knowledge Plane API Endpoints

**TODO:** Add these endpoints to `go-services/knowledge-plane/internal/api/routes.go`

#### 1. `GET /stats/errors`
Returns top broken files, error density by directory, error codes

**Response:**
```json
{
  "top_files": [
    {"file": "src/routes/+page.svelte", "errors": 12},
    {"file": "src/lib/store.svelte.ts", "errors": 8}
  ],
  "error_density": [
    {"directory": "routes", "files": 45, "errors": 127, "density": 2.82},
    {"directory": "lib", "files": 103, "errors": 83, "density": 0.81}
  ],
  "error_codes": [
    {"code": "TS2322", "count": 58},
    {"code": "TS1005", "count": 34}
  ]
}
```

#### 2. `POST /graph/build`
Triggers `phase88-build-error-map.mjs` to rebuild graph

**Request:**
```json
{
  "rebuild": true,
  "skip_errors": false
}
```

**Response:**
```json
{
  "status": "building",
  "job_id": "phase88-20250128-143022"
}
```

#### 3. `GET /graph/subgraph?focus=<type>&id=<id>&depth=2`
Returns subgraph around a node (for visualization)

**Example:** `GET /graph/subgraph?focus=file&id=src/lib/store.svelte.ts&depth=2`

**Response:**
```json
{
  "nodes": [
    {"id": "file:src/lib/store.svelte.ts", "kind": "file", "label": "...", "meta": {...}},
    {"id": "err:1234", "kind": "error", "label": "Type 'string' not assignable...", "meta": {...}},
    {"id": "sym:src/lib/store.svelte.ts:userStore", "kind": "symbol", "label": "userStore", "meta": {...}}
  ],
  "edges": [
    {"from": "err:1234", "to": "file:src/lib/store.svelte.ts", "type": "ERROR_IN_FILE", "weight": 1.0},
    {"from": "file:src/lib/store.svelte.ts", "to": "sym:...:userStore", "type": "FILE_EXPORTS_SYMBOL"}
  ]
}
```

#### 4. `POST /classify`
Classifies an error into a pattern using heuristics + embedding similarity

**Request:**
```json
{
  "error_id": "err:1234",
  "message": "'}' expected.",
  "code": "TS1005",
  "snippet": "function foo() {\n  return bar\n"
}
```

**Response:**
```json
{
  "pattern_id": "ts1005_missing_brace",
  "label": "Missing curly brace",
  "confidence": 0.95,
  "fix_template": "Add closing brace at line {line}",
  "kb_tags": ["typescript", "syntax"],
  "similar_errors": [
    {"error_id": "err:5678", "similarity": 0.89, "file": "src/lib/utils.ts"}
  ]
}
```

---

### Component 4: SvelteKit Visualization UI

**File:** `src/routes/(app)/phase88/error-map/+page.svelte`

**Layout (3 panels):**

```
┌────────────────────────────────────────────────────────────┐
│                     Phase 88: Error Map                    │
├──────────────┬────────────────────────┬────────────────────┤
│              │                        │                    │
│  Left Panel  │    Middle Panel        │   Right Panel      │
│              │                        │                    │
│  📁 File Tree│    🕸️ Force Graph      │  🔍 Node Inspector │
│              │                        │                    │
│  • src/      │    ⚫ Files (blue)      │  Selected Node:    │
│    • routes/ │    🔴 Errors (red)     │  file:src/lib/...  │
│      ⚠️  12  │    🟢 Symbols (green)  │                    │
│    • lib/    │    🟠 Docs (orange)    │  Meta:             │
│      ⚠️  8   │                        │  - Exports: 3      │
│              │    [Graph canvas]      │  - Imports: 5      │
│  Error       │                        │                    │
│  Density:    │    Zoom/Pan controls   │  Related Errors:   │
│  ▓▓▓▓▓▓ 2.8  │                        │  • err:1234 (0.89) │
│  ▓▓▓░░░ 0.8  │                        │  • err:5678 (0.76) │
│              │                        │                    │
│              │                        │  Retrieved Docs:   │
│              │                        │  • Svelte 5 state  │
│              │                        │  • TypeScript fix  │
│              │                        │                    │
│              │                        │  [Suggest Fix] btn │
└──────────────┴────────────────────────┴────────────────────┘
```

**Data Fetching:**
```typescript
// +page.ts
export async function load({ fetch }) {
  const graph = await fetch('http://localhost:8099/graph/subgraph?focus=all&depth=3');
  const stats = await fetch('http://localhost:8099/stats/errors');
  return { graph, stats };
}
```

**Graph Rendering:**
- Library: D3-force-graph or custom canvas force sim
- Node colors: Files=blue, Errors=red, Symbols=green, Docs=orange
- Edge colors: Import=gray, Error=red, Similar=yellow
- Interactions: Click node → show inspector, Hover → tooltip

**Right Panel Actions:**
- **Similar Errors:** Shows top 10 errors with cosine similarity ≥ 0.7
- **Retrieved Docs:** Calls Qdrant to find relevant KB docs (Svelte 5, TypeScript)
- **Suggest Fix:** Calls Knowledge Plane `/compose_prompt` with error + KB context

---

## 📚 Deliverable 3: KB Ingest (Svelte 5 / SvelteKit 2 / Bits-UI / UnoCSS / pgvector)

### Step 1: Create Knowledge Base Manifest

**File:** `data/knowledge/kb-manifest-frontend.txt`

```
data/knowledge/svelte/svelte5.txt
data/knowledge/svelte/sveltekit2.txt
data/knowledge/ui/bits-ui-svelte5.txt
data/knowledge/ui/unocss.txt
data/knowledge/db/pgvector.txt
data/knowledge/db/postgres17.txt
data/knowledge/dev/drizzle-0.44.txt
data/knowledge/dev/go-1.25.txt
```

**How to get these files:**
1. **Svelte 5 docs:** Download from https://svelte.dev/docs/svelte/overview
2. **SvelteKit 2:** Download from https://svelte.dev/docs/kit
3. **Bits-UI:** Download from https://bits-ui.com/docs (Svelte 5 compatible)
4. **UnoCSS:** Download from https://unocss.dev/guide
5. **pgvector:** Download from https://github.com/pgvector/pgvector README + examples
6. **Postgres 17:** Download from https://www.postgresql.org/docs/17/
7. **Drizzle 0.44:** Download from https://orm.drizzle.team/docs/overview
8. **Go 1.25:** Download from https://go.dev/doc (if needed)

**Save as `.txt` files in `data/knowledge/<category>/` directories.**

---

### Step 2: Create Ingest Script

**File:** `scripts/phase76-run-kb-ingest.ps1`

```powershell
param(
  [string]$Paths = "data/knowledge/kb-manifest-frontend.txt",
  [string]$Tags = "svelte5,sveltekit2,bits-ui,unocss,pgvector,postgres17,drizzle,go,docs",
  [string]$Kind = "kb_doc"
)

$ErrorActionPreference = "Stop"

Write-Host "📚 Phase 76: Knowledge Base Ingestion" -ForegroundColor Cyan
Write-Host ""

# Read manifest
$files = Get-Content $Paths | Where-Object { $_ -match '\S' }
Write-Host "Found $($files.Count) files to ingest" -ForegroundColor Green

# Call Knowledge Plane ingest endpoint
foreach ($file in $files) {
  Write-Host "  Ingesting: $file" -ForegroundColor Gray

  $content = Get-Content $file -Raw
  $body = @{
    content = $content
    source = $file
    tags = $Tags -split ','
    kind = $Kind
  } | ConvertTo-Json -Compress

  try {
    $res = Invoke-RestMethod -Uri "http://localhost:8099/kb/ingest" -Method POST -Body $body -ContentType "application/json"
    Write-Host "    ✅ Ingested: $($res.chunk_count) chunks, collection: $($res.collection)" -ForegroundColor Green
  } catch {
    Write-Host "    ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "✅ KB ingestion complete!" -ForegroundColor Green
Write-Host "   Check Qdrant collection: phase76_knowledge_base" -ForegroundColor Gray
```

---

### Step 3: Run Ingestion

```powershell
# 1. Download docs to data/knowledge/
# (manual step - download Svelte 5, SvelteKit 2, Bits-UI, UnoCSS, pgvector docs)

# 2. Create manifest
@"
data/knowledge/svelte/svelte5.txt
data/knowledge/svelte/sveltekit2.txt
data/knowledge/ui/bits-ui-svelte5.txt
data/knowledge/ui/unocss.txt
data/knowledge/db/pgvector.txt
data/knowledge/db/postgres17.txt
data/knowledge/dev/drizzle-0.44.txt
data/knowledge/dev/go-1.25.txt
"@ | Set-Content data/knowledge/kb-manifest-frontend.txt

# 3. Run ingest
.\scripts\phase76-run-kb-ingest.ps1 -Paths "data/knowledge/kb-manifest-frontend.txt" -Tags "svelte5,sveltekit2,bits-ui,unocss,pgvector,postgres17,drizzle,go,docs" -Kind "kb_doc"
```

**Expected Result:**
- Qdrant collection `phase76_knowledge_base` grows from 810 points to ~1200+ points
- Agents will now retrieve Svelte 5 runes, SvelteKit 2 routing, Bits-UI components, UnoCSS utilities when fixing errors

---

## 🚀 Quick Start Guide

### 1. Start Dependencies (Safe Mode)

```powershell
cd go-services\knowledge-plane

# Preview what will happen
.\run-safe-hardened.ps1 -DryRun

# Actually start (safe, no rebuilds)
.\run-safe-hardened.ps1
```

**Expected output:**
```
✅ phase66-postgres is already running
✅ phase76-qdrant started (existing container preserved)
✅ phase66-redis is already running
✅ ollama-gemma started (existing container preserved)
✅ Postgres healthy (5434/legal/user)
✅ Qdrant reachable (6333)
✅ Redis healthy (6379)
✅ Ollama reachable (11434)
🚀 Starting Knowledge Plane on port 8099...
```

---

### 2. Create PostgreSQL Schema

```powershell
cd sveltekit-frontend

# Run schema creation (only once)
docker exec -i phase66-postgres psql -U user -d legal < scripts/phase88-create-schema.sql
```

**Expected output:**
```
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
...
NOTICE:  Schema verification:
NOTICE:    kg_nodes: 0 rows
NOTICE:    kg_edges: 0 rows
NOTICE:    file_index: 0 rows
NOTICE:    error_clusters: 7 patterns seeded
NOTICE:  Phase 88 schema ready!
```

---

### 3. Build Error Map

```powershell
# Install dependencies (if needed)
npm install ts-morph postgres ioredis

# Run builder (incremental)
node scripts/phase88-build-error-map.mjs
```

**Expected output:**
```
ℹ️  Phase 88: Agentic Error Analysis Map Builder
ℹ️  Mode: INCREMENTAL
🔧 Phase 1: Building file index with ts-morph...
ℹ️  Found 2,262 source files to index
ℹ️  Indexed 100/2262 files...
ℹ️  Indexed 200/2262 files...
...
✅ Indexed 2,262 files
ℹ️  Created 1,456 symbol nodes, 3,891 import edges, 1,456 export edges
🔧 Phase 2: Building knowledge graph in PostgreSQL...
✅ Knowledge graph built successfully
🔧 Phase 3: Linking errors to knowledge graph...
ℹ️  Found 210 TypeScript errors
✅ Linked 210 errors to files
✅ Created 387 ERROR_NEAR_SYMBOL edges
🔧 Phase 4: Generating embeddings and finding similar errors...
ℹ️  Generating embeddings for 210 errors...
ℹ️  Embedded 50/210 errors...
ℹ️  Embedded 100/210 errors...
✅ Generated 210 embeddings, created 54 SIMILAR_TO edges
🔧 Phase 5: Exporting graph for visualization...
✅ Graph exported to reports/phase88/error-map.json
ℹ️    3,928 nodes, 5,998 edges
ℹ️    210 errors, 2,262 files, 1,456 symbols
✅ Phase 88 pipeline complete!
```

---

### 4. View Error Map (TODO: UI implementation)

```powershell
# Start SvelteKit dev server
npm run dev

# Open in browser
start http://localhost:5175/phase88/error-map
```

**Note:** UI route needs to be implemented (see Component 4 above)

---

## 📊 Success Metrics

### Graph Statistics
```sql
-- Total nodes by type
SELECT kind, COUNT(*)
FROM kg_nodes
GROUP BY kind;
```

Expected:
```
kind     | count
---------+-------
file     | 2,262
symbol   | 1,456
error    |   210
doc      |     0  (populated after KB retrieval)
pattern  |     7  (pre-seeded)
```

### Edge Statistics
```sql
-- Total edges by type
SELECT type, COUNT(*)
FROM kg_edges
GROUP BY type;
```

Expected:
```
type                  | count
----------------------+-------
FILE_IMPORTS_FILE     | 3,891
FILE_EXPORTS_SYMBOL   | 1,456
ERROR_IN_FILE         |   210
ERROR_NEAR_SYMBOL     |   387
SIMILAR_TO            |    54
```

### Error Density by Directory
```sql
SELECT * FROM get_error_density();
```

Expected:
```
directory | file_count | error_count | density
----------+------------+-------------+---------
routes    |         45 |         127 |    2.82
lib       |        103 |          83 |    0.81
params    |          3 |           0 |    0.00
```

---

## 🔧 Troubleshooting

### Issue: "Database connection refused"
**Cause:** phase66-postgres not running or wrong credentials

**Fix:**
```powershell
# Check container status
docker ps -a | Select-String postgres

# If stopped, start it
docker start phase66-postgres

# Verify credentials
docker exec phase66-postgres psql -U user -d legal -c "SELECT 1;"
```

---

### Issue: "ts_errors table not found"
**Cause:** Haven't run TypeScript check yet

**Fix:**
```powershell
# Run phase6 check to populate ts_errors
npm run phase6:core

# Or manually:
npx tsc --noEmit --pretty false 2>&1 | node scripts/parse-ts-errors.mjs
```

---

### Issue: "Ollama embedding failed"
**Cause:** embeddinggemma model not pulled

**Fix:**
```powershell
# Pull model
docker exec ollama-gemma ollama pull embeddinggemma:latest

# Verify
docker exec ollama-gemma ollama list
```

---

### Issue: "Redis connection refused"
**Cause:** phase66-redis not running

**Fix:**
```powershell
docker start phase66-redis
docker exec phase66-redis redis-cli ping  # Should return PONG
```

---

## 🎯 Next Steps

### Immediate (Day 1-2)
1. ✅ Run hardened startup script → verify all dependencies running
2. ✅ Create PostgreSQL schema → verify 7 patterns seeded
3. ✅ Run error map builder → verify graph populated
4. ⏳ Implement Knowledge Plane endpoints (`/stats/errors`, `/graph/subgraph`, `/classify`)
5. ⏳ Create SvelteKit error-map UI route

### Short-term (Week 1)
6. ⏳ Download Svelte 5 / SvelteKit 2 / Bits-UI / UnoCSS / pgvector docs
7. ⏳ Create KB manifest and run ingestion
8. ⏳ Test KB-grounded error fixing (query Qdrant → generate fix → apply)
9. ⏳ Implement auto-fix for top 3 error patterns

### Mid-term (Week 2-4)
10. ⏳ Add real-time error graph updates (watch mode)
11. ⏳ Implement pattern clustering UI (visualize SIMILAR_TO edges)
12. ⏳ Add "Suggest Fix" button with KB retrieval + LLM generation
13. ⏳ Integrate with phase87-autonomous-fixer.mjs (use graph for context)
14. ⏳ Performance optimization (batch inserts, parallel embeddings)

---

## 📝 File Manifest

### Deliverable 1: Hardened Startup
- `go-services/knowledge-plane/run-safe-hardened.ps1` (NEW, 240 lines)
- `go-services/knowledge-plane/run.ps1` (FIXED, line 206)

### Deliverable 2: Error Analysis Map
- `scripts/phase88-create-schema.sql` (NEW, 250 lines)
- `scripts/phase88-build-error-map.mjs` (NEW, 450 lines)
- `reports/phase88/error-map.json` (GENERATED)

### Deliverable 3: KB Ingest
- `data/knowledge/kb-manifest-frontend.txt` (TODO)
- `scripts/phase76-run-kb-ingest.ps1` (TODO)
- `data/knowledge/svelte/*.txt` (TODO: download docs)
- `data/knowledge/ui/*.txt` (TODO: download docs)
- `data/knowledge/db/*.txt` (TODO: download docs)

### Future Components
- `go-services/knowledge-plane/internal/api/graph.go` (TODO: endpoints)
- `src/routes/(app)/phase88/error-map/+page.svelte` (TODO: UI)
- `src/routes/(app)/phase88/error-map/+page.ts` (TODO: data loader)

---

## 🔥 Critical Database Configuration

**Phase 87 Portable Stack:**
```
Database: postgresql://user:pass@127.0.0.1:5434/legal
Qdrant:   http://127.0.0.1:6333
Redis:    redis://127.0.0.1:6379
Ollama:   http://127.0.0.1:11434
```

**NOT Phase 76 App DB:**
```
Database: postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db  ❌
```

**Why:**
- ✅ Port 5434 avoids Windows Postgres collision (5432)
- ✅ Matches Docker pgvector container with embeddings + HNSW indexes
- ✅ Uses `user:pass` credentials (Phase 87 standard)
- ✅ Database name `legal` (not `legal_ai_db`)

**If you need both databases:**
```powershell
# Phase 87 portable stack (autonomous fixing)
$env:DATABASE_URL_PHASE87 = "postgresql://user:pass@127.0.0.1:5434/legal"

# Phase 76 app DB (legacy)
$env:DATABASE_URL_APP = "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
```

Tools choose based on task.

---

**Status:** ✅ Deliverable 1 complete, Deliverable 2 core scripts complete (endpoints + UI TODO)
**Last Updated:** 2025-01-28
**Phase:** 88 (Agentic Error Analysis Map)
