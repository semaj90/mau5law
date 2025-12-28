# Phase 89: Knowledge Base - CUDA RAG Pipeline Integration

**Last Updated**: December 28, 2025
**Status**: ✅ Embeddings in progress (0.55%, 400/72,664 errors embedded)
**ETA**: ~9.5 hours for complete re-embedding

---

## 📊 Current System State

### Error Embedding Status

```
BEFORE CORRECTION:
├─ TSC:          38,930 errors ✅ (correct)
├─ svelte-check: 10,829 errors ❌ (incomplete - format parsing bug)
└─ TOTAL:        49,759 errors

AFTER CORRECTION (in progress):
├─ TSC:          38,930 errors ✅ (unchanged)
├─ svelte-check: 72,664 errors ⏳ (0.55% embedded, 400/72,664)
└─ TARGET:      111,594 errors (2.4x increase)
```

### Infrastructure

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| PostgreSQL (legal_ai_db) | `localhost:5434` | ✅ Running | Raw embeddings, Top-K index |
| PostgreSQL (legal_db) | `localhost:5432` | ✅ Running | App data |
| Redis | `phase66-redis:6379` | ✅ Running | Embedding cache, query cache |
| Qdrant | `localhost:6333` | ✅ Running | Semantic search (phase76_knowledge_base) |
| CouchDB | `phase66-couchdb:5984` | ✅ Running | Error graph storage |
| Ollama | `localhost:11434` | ✅ Running | embeddinggemma, gemma3-legal |

---

## 🔧 Key Scripts & Tools

### 1. **phase89-robust-reembed.mjs** (CRITICAL - Currently Running)

**Purpose**: Re-embed all 72,664 svelte-check errors with fault tolerance

**Features**:
- ✅ Redis cache: `emb:gemma:{sha256-hash}` (7-day TTL)
- ✅ Checkpoint every 1,000 errors → `reports/svelte-reembed-checkpoint.json`
- ✅ Auto-resume from checkpoint on crash
- ✅ Batch processing: 50 errors/batch
- ✅ Progress tracking with cache hit rate

**Current Progress**:
```
0.55% | 400 / 72,664 | 2.1/s | ETA: 34074s (~9.5 hours) | Cache: 0%
```

**Usage**:
```powershell
# Start/resume embedding
node scripts/phase89-robust-reembed.mjs --force

# Monitor progress
.\scripts\phase89-monitor-reembed.ps1
```

---

### 2. **phase89-similarity-ranker.mjs** (Query Interface)

**Purpose**: Fast semantic search with cascading cache layers

**Architecture**:
```
User Query
    ↓
Redis Query Cache (instant)
    ↓ (miss)
PostgreSQL Top-K Index (fast)
    ↓ (miss/insufficient)
Cosine Similarity Scan (slow)
    ↓
LLM Fix Generation
    ↓
Cache Results (7-day TTL)
```

**Usage**:
```powershell
# Search for similar errors
node scripts/phase89-similarity-ranker.mjs "error TS1005"

# Returns: Top 50 similar errors + LLM-generated fix
```

**Example Output**:
```
🎯 Top 10 Most Similar Errors:
1. Similarity: 74.9% | Source: tsc | ID: 6469
   src/lib/data/types.ts(103,15): error TS1005: ';' expected.

📋 Top Error Codes:
   TS1005: 50 occurrences

📋 Most Affected Files:
   src/lib/agents/error-handler.ts: 26 errors

🤖 LLM Fix: Disable semicolon enforcement in tsconfig.json
```

---

### 3. **phase89-build-topk-index.mjs** (Index Builder)

**Purpose**: Build top-K inverse index for fast retrieval

**Status**: ⏸️ **PAUSED** - waiting for re-embedding to complete

**Expected Performance**:
- **Errors**: 111,594 (currently 45,661 old data)
- **Relationships**: 2,231,880 (111,594 × 20)
- **Build time**: ~8-10 hours
- **Index size**: ~2.2M rows in `error_topk_index`

**Usage**:
```powershell
# Build top-20 index (run AFTER re-embedding completes)
node scripts/phase89-build-topk-index.mjs 20

# Monitor progress
.\scripts\phase89-monitor-topk.ps1
```

**Next Steps** (after re-embedding):
1. Clear old index: `docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "TRUNCATE error_topk_index"`
2. Rebuild on corrected data
3. Verify: `SELECT COUNT(DISTINCT error_id), COUNT(*) FROM error_topk_index`

---

### 4. **phase89-cuda-rag-pipeline.mjs** (CUDA-Accelerated Retrieval)

**Purpose**: GPU-accelerated chunking + embedding + search

**Status**: ✅ Operational (degraded mode if CUDA unavailable)

**Features**:
- ✅ File chunking with overlap (500 chars, 50 overlap)
- ✅ CUDA metadata tagging for GPU-compatible errors
- ✅ Qdrant integration for semantic search
- ✅ SSE streaming for real-time results

**Usage**:
```powershell
# Build chunk index (one-time)
node scripts/phase89-cuda-rag-pipeline.mjs --build

# Query with streaming
node scripts/phase89-cuda-rag-pipeline.mjs --query "TS1005 semicolon expected" --top 5

# Stream results
node scripts/phase89-cuda-rag-pipeline.mjs --stream "Type errors in data/types.ts"
```

**Architecture**:
```
Source Files (4,674 .ts/.svelte files)
    ↓
Chunk into 500-char blocks (50 overlap)
    ↓
Embed with embeddinggemma (768-dim)
    ↓
Store in Qdrant (phase89_error_chunks collection)
    ↓
Tag with CUDA metadata (loop analysis, memory ops)
    ↓
Query → Reciprocal Rank Fusion → Rerank
```

---

### 5. **phase89-fastapi-server.py** (FastAPI CUDA Server)

**Purpose**: Production-grade FastAPI server with Redis caching + CUDA support

**Status**: ✅ Operational (degraded mode when Redis unavailable)

**Critical Fixes Applied**:
- ✅ **Redis non-fatal**: Runs in degraded mode (mem_cache fallback) if Redis down
- ✅ **Database URLs corrected**:
  - `DATABASE_URL_PHASE87 = postgresql://user:pass@127.0.0.1:5434/legal` ✅
  - `DATABASE_URL_APP = postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db` ✅
- ✅ **Docker networking**: Use `host.docker.internal` for containerized deployments
- ✅ **Exception handling**: Global handler prevents silent crashes
- ✅ **Fault handler**: `-X faulthandler` for crash debugging

**Endpoints**:
- `GET /health` - System status
- `POST /embed` - Cached embedding generation
- `POST /query/stream` - SSE streaming search

**Start Server**:
```powershell
# Set environment
$env:DATABASE_URL_PHASE87="postgresql://user:pass@127.0.0.1:5434/legal"
$env:REDIS_URL="redis://127.0.0.1:6379"
$env:QDRANT_URL="http://127.0.0.1:6333"

# Launch with fault handler
python -X faulthandler -m uvicorn scripts.phase89-fastapi-server:app --host 0.0.0.0 --port 8765 --log-level debug
```

**Health Check**:
```powershell
curl http://localhost:8765/health
```

**Expected Response**:
```json
{
  "ok": true,
  "redis": "ok",
  "phase87_db": "postgresql://user:pass@127.0.0.1:5434/legal",
  "app_db": "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db",
  "qdrant": "http://127.0.0.1:6333",
  "ollama": "http://127.0.0.1:11434",
  "models": {
    "embed": "embeddinggemma:latest",
    "chat": "gemma3-legal:latest"
  }
}
```

---

### 6. **phase89-fastmcp-tools.mjs** (MCP Server Integration)

**Purpose**: Expose Phase 89 tools to VS Code via FastMCP

**Status**: ✅ Ready

**Tools Exposed**:
1. `embed_text` - Generate cached embeddings
2. `search_errors` - Semantic error search
3. `cluster_errors` - Group similar errors
4. `generate_fix` - LLM-powered fix generation
5. `cuda_scan` - Identify CUDA-compatible code

**Usage**:
```powershell
# Start MCP server
node scripts/phase89-fastmcp-tools.mjs

# Connect VS Code to http://localhost:3003
```

---

## 🐛 Critical Issues Fixed

### Issue 1: Only 10,829 svelte errors embedded (should be 72,664)

**Root Cause**: Format parsing error
- **Expected**: JSON objects
- **Actual**: Space-delimited log format
  ```
  1766950123481 ERROR "src\\lib\\server\\db\\schema-postgres.ts" 1514:2 "Identifier expected."
  ```

**Solution**: ✅ Created correct parser in `phase89-robust-reembed.mjs`

---

### Issue 2: First re-embedder crashed at 14.4% (10,829 errors)

**Root Cause**: No error handling, no resume capability

**Solution**: ✅ Created `phase89-robust-reembed.mjs` with:
- Redis caching (avoid re-computing)
- Checkpoint every 1,000 errors
- Resume from checkpoint file
- Batch error handling

---

### Issue 3: FastAPI server exits on first request

**Root Cause**: Redis connection errors killing the process

**Solutions Applied**:
1. ✅ Wrapped Redis in try/catch with degraded mode fallback
2. ✅ Added lifespan manager with non-fatal Redis init
3. ✅ Global exception handler prevents silent crashes
4. ✅ Fixed Docker networking (use `host.docker.internal` in containers)

**Code Pattern** (applied to `phase89-fastapi-server.py`):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = None
    try:
        r = redis.from_url(REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        app.state.redis = r
        log.info("Redis connected OK")
    except Exception:
        log.exception("Redis unavailable. Running in DEGRADED mode.")
    yield
    if app.state.redis:
        await app.state.redis.close()
```

---

## 📈 Performance Metrics

### Current Embedding Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Rate | 2.1 errors/sec | Initial rate, will improve with cache |
| Cache Hit Rate | 0% | Will increase as duplicates found |
| Batch Size | 50 errors | Optimal for Ollama embeddinggemma |
| ETA | ~9.5 hours | For 72,664 errors |
| Checkpoint Interval | 1,000 errors | Resume capability |

### Expected Query Performance (after index rebuild)

| Query Type | Latency | Cache | Notes |
|------------|---------|-------|-------|
| Cached Query | <50ms | ✅ Redis | Instant response |
| Top-K Index | <500ms | ❌ | Pre-computed neighbors |
| Cosine Scan | 2-5s | ❌ | Full table scan (fallback) |
| LLM Generation | 3-10s | ✅ Prompt cache | Ollama gemma3-legal |

---

## 🔮 Next Steps

### Immediate (After Re-embedding Completes)

1. **Verify final counts** (HIGH PRIORITY)
   ```powershell
   docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
   SELECT source, COUNT(*) as total,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded
   FROM raw_error_embeddings
   GROUP BY source"
   ```
   Expected: `tsc: 38,930 | svelte-check: 72,664 | TOTAL: 111,594`

2. **Clear old Top-K index** (HIGH PRIORITY)
   ```powershell
   docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "TRUNCATE error_topk_index"
   ```

3. **Clear Redis query cache** (MEDIUM PRIORITY)
   ```powershell
   # Keep embedding cache (emb:gemma:* still valid)
   docker exec phase66-redis redis-cli --scan --pattern "query:*" | xargs docker exec -i phase66-redis redis-cli DEL
   ```

### Rebuild Phase (~8-10 hours)

4. **Rebuild Top-K index** (HIGH PRIORITY)
   ```powershell
   node scripts/phase89-build-topk-index.mjs 20
   # Monitor: .\scripts\phase89-monitor-topk.ps1
   ```
   Expected: 111,594 errors × 20 neighbors = 2,231,880 relationships

5. **Validate index integrity** (MEDIUM PRIORITY)
   ```sql
   SELECT
     COUNT(DISTINCT error_id) as errors_indexed,
     COUNT(*) as total_relationships,
     AVG(similarity) as avg_similarity
   FROM error_topk_index;
   ```
   Expected: `errors_indexed: 111,594 | relationships: 2.2M | avg_sim: ~0.93`

### Testing Phase

6. **Test query cascade** (HIGH PRIORITY)
   ```powershell
   node scripts/phase89-similarity-ranker.mjs "TS1005" --top 20
   ```
   Should return results from full 111,594 error dataset

7. **Run autonomous fixer** (MEDIUM PRIORITY)
   ```powershell
   node scripts/phase89-agentic-fixer.mjs --limit 100
   ```
   Validate fix success rate >80%

8. **Performance benchmarks** (LOW PRIORITY)
   - Cache hit rates
   - Query latencies
   - Fix success rates
   - Database size metrics

---

## 🗄️ Database Schema

### `raw_error_embeddings` (legal_ai_db)

```sql
CREATE TABLE raw_error_embeddings (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,              -- 'tsc' | 'svelte-check'
    line_number INTEGER,                      -- Error line number
    raw_text TEXT NOT NULL,                   -- Full error message
    embedding vector(768),                    -- embeddinggemma vector
    created_at TIMESTAMP DEFAULT NOW()
);

-- Current counts:
-- tsc: 38,930 rows ✅
-- svelte-check: 72,664 rows (in progress - 400/72,664)
-- TOTAL: 111,594 target
```

### `error_topk_index` (legal_ai_db)

```sql
CREATE TABLE error_topk_index (
    id SERIAL PRIMARY KEY,
    error_id INTEGER NOT NULL,                -- FK to raw_error_embeddings.id
    neighbor_id INTEGER NOT NULL,             -- FK to raw_error_embeddings.id
    similarity FLOAT NOT NULL,                -- Cosine similarity [0-1]
    rank INTEGER NOT NULL,                    -- 1-20 (top-K rank)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(error_id, neighbor_id)
);

-- Status: ⏸️ PAUSED
-- Old data: 8,456 errors indexed (incomplete)
-- Target: 111,594 errors × 20 = 2,231,880 rows
-- Action: TRUNCATE and rebuild after re-embedding
```

---

## 🧪 Validation Commands

### Check Re-embedding Progress
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT source,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
       ROUND(100.0 * COUNT(*) FILTER (WHERE embedding IS NOT NULL) / COUNT(*), 2) as pct_embedded
FROM raw_error_embeddings
GROUP BY source"
```

### Check Redis Cache
```powershell
docker exec phase66-redis redis-cli INFO stats | Select-String "keys"
docker exec phase66-redis redis-cli --scan --pattern "emb:gemma:*" | Measure-Object -Line
```

### Check Qdrant Collection
```powershell
curl http://localhost:6333/collections/phase76_knowledge_base | ConvertFrom-Json | Select-Object -ExpandProperty result | Format-List
```

### Check CouchDB
```powershell
curl -u admin:password http://localhost:5984/error_graph | ConvertFrom-Json | Format-List doc_count, disk_size
```

---

## 🚨 Troubleshooting

### Re-embedder Stuck/Crashed
```powershell
# Check checkpoint file
Get-Content reports/svelte-reembed-checkpoint.json | ConvertFrom-Json

# Resume from checkpoint
node scripts/phase89-robust-reembed.mjs --force
```

### Redis Connection Errors
```powershell
# Check Redis container
docker ps --filter name=redis

# Test connection
docker exec phase66-redis redis-cli ping

# Restart Redis
docker restart phase66-redis
```

### FastAPI Server Crashes
```powershell
# Check logs
python -X faulthandler -m uvicorn scripts.phase89-fastapi-server:app --log-level debug

# Verify environment
$env:DATABASE_URL_PHASE87
$env:REDIS_URL
$env:QDRANT_URL
```

### Query Returns No Results
```powershell
# Check embeddings exist
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL"

# Check query cache
docker exec phase66-redis redis-cli --scan --pattern "query:*"

# Clear stale cache
docker exec phase66-redis redis-cli FLUSHDB
```

---

## 📚 Related Documentation

- **PHASE89_CORRECTED_STATUS.md** - Detailed correction plan
- **PHASE89_REDIS_TOPK_GUIDE.md** - Architecture guide
- **PHASE89_QUICK_REF.md** - Quick reference
- **phase89-verify-system.ps1** - Comprehensive verification script

---

## ✅ Completion Checklist

### Phase 89 Deliverables

- [x] Raw text embedding architecture
- [x] Redis caching layer (embedding + query cache)
- [x] Language-specific caching
- [x] Web search integration (via LLM)
- [x] Enhanced similarity ranker
- [x] Format error diagnosis and correction
- [⏳] Re-embedding 72,664 svelte errors (0.55% complete)
- [ ] Top-K index rebuild (waiting for re-embedding)
- [ ] Autonomous fixer validation
- [ ] Performance benchmarks
- [ ] CouchDB graph integration
- [ ] Qdrant auto-tagging
- [ ] pgvector mirroring

### System Integration

- [x] PostgreSQL (legal_ai_db @ 5434)
- [x] Redis (phase66-redis @ 6379)
- [x] Ollama (embeddinggemma + gemma3-legal @ 11434)
- [⏳] Qdrant (phase76_knowledge_base @ 6333) - needs verification
- [⏳] CouchDB (error_graph @ 5984) - needs verification
- [ ] pgvector mirroring - pending

---

**Last Progress Update**: 400/72,664 errors embedded (0.55%), 2.1/s rate, ~9.5 hours remaining
