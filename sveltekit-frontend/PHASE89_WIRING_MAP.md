# 🔌 Phase 89: Complete Wiring Map & Verification Checklist

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 89 Data Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Error Parsing → PostgreSQL instances (non-destructive)      │
│  2. Embedding → Redis cache (7d TTL) → PostgreSQL embeddings    │
│  3. Indexing → Qdrant collections (HNSW + tags)                 │
│  4. CUDA Clustering → GPU → Recommendations                     │
│  5. Fix Application → Validation → Learning                     │
│  6. KB Updates → RAG (Qdrant) + KAG (PostgreSQL graph)          │
│  7. Cosine Ranking → Rerank candidates → Next steps             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ Storage Layer Mapping

### PostgreSQL (port 5434, database: legal_ai_db)
**Connection:** `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`

| Table | Purpose | Write Stage | Read Stage | Key Columns |
|-------|---------|-------------|------------|-------------|
| `phase89_error_instances` | Error history (never delete) | Error parsing | All stages | `instance_hash`, `status`, `last_seen` |
| `phase89_embeddings` | Deduplicated embeddings | Embedding | Retrieval, clustering | `model`, `text_hash`, `embedding` |
| `phase89_fix_attempts` | Fix history | Fix application | Learning, analysis | `success`, `target_instance_hashes` |
| `phase89_kb_cards` | Learned playbooks | Learning | Retrieval | `tags`, `source_fix_attempt_id` |
| `phase89_import_edges` | File dependency graph | AST parsing | Topology analysis | `from_file`, `to_file` |
| `kag_nodes` | Knowledge graph nodes | Fix success | Graph queries | `node_type`, `properties` |
| `kag_edges` | Knowledge graph edges | Fix success | Graph queries | `from_node`, `to_node`, `relation_type` |
| `error_cluster_recommendations` | CUDA clustering output | CUDA clustering | Retrieval | `cluster_id`, `priority_score` |

### Redis (port 6379, DB 0)
**Connection:** `redis://127.0.0.1:6379/0`

| Key Pattern | Purpose | TTL | Write Stage | Read Stage |
|-------------|---------|-----|-------------|------------|
| `emb:embeddinggemma:latest:{hash}` | Embedding cache | 7 days | Embedding | Embedding (cache hit) |
| `phase89:retrieval:{query_hash}` | Retrieval cache | 2 hours | Retrieval | Retrieval (cache hit) |
| `phase89:cluster:{file_hash}` | Cluster cache | 1 day | CUDA clustering | Topology analysis |
| `topk:{model}:{query_hash}` | Top-K cache | 2 hours | Cosine ranking | Retrieval |

### Qdrant (port 6333)
**Connection:** `http://127.0.0.1:6333`

| Collection | Vector Dim | Purpose | Write Stage | Read Stage | Tags |
|------------|-----------|---------|-------------|------------|------|
| `phase89_ast_embeddings` | 768/1024 | AST signatures | AST indexing | Topology retrieval | `file_path`, `language`, `ast_type` |
| `phase89_error_chunks` | 768/1024 | Error context code | Adaptive chunking | Retrieval | `error_code`, `file_path`, `density` |
| `phase89_error_clusters` | 768/1024 | Cluster centroids | CUDA clustering | Recommendation fetch | `cluster_id`, `priority`, `error_types` |
| `phase89_rag_patterns` | 768/1024 | Learned patterns | RAG update | Pattern retrieval | `root_cause`, `success_rate`, `error_code` |
| `phase89_kb_cards` | 768/1024 | KB playbooks | KB update | Contextual retrieval | `tags[]`, `source_fix_id` |
| `phase76_knowledge_base` | 768/1024 | Legacy KB | Migration | Fallback retrieval | Various |

### CouchDB (port 5984)
**Connection:** `http://127.0.0.1:5984`

| Database | Purpose | Write Stage | Read Stage | Views |
|----------|---------|-------------|------------|-------|
| `error_graph` | Analytics, trends | Fix completion | Dashboard | `by_root_cause`, `by_file`, `by_week` |
| `fix_history` | Historical analysis | Fix success | Reports | `success_rate`, `common_patterns` |

## 🔧 Tool Wiring (MCP + Agentic)

### MCP Server Tools (phase89-fastmcp-tools.mjs)
| Tool Name | Purpose | Reads From | Writes To | CUDA? |
|-----------|---------|------------|-----------|-------|
| `phase89_embed_ast` | Generate AST embeddings | File system | Redis → PostgreSQL | ❌ |
| `phase89_cluster_errors` | GPU error clustering | PostgreSQL embeddings | Qdrant clusters + PostgreSQL recommendations | ✅ CUDA |
| `phase89_search_kb` | KB retrieval | Qdrant kb_cards | Redis cache | ❌ |
| `phase89_recommend_fixes` | Top-K recommendations | Qdrant clusters | Redis cache | ✅ GPU rerank |
| `phase89_apply_diff` | Apply patch | File system | File system + PostgreSQL fix_attempts | ❌ |
| `phase89_validate_fix` | Run svelte-check | File system | PostgreSQL fix_attempts | ❌ |
| `phase89_learn_pattern` | Extract learnings | PostgreSQL fix_attempts | Qdrant rag_patterns + kb_cards | ❌ |
| `phase89_cosine_rank` | GPU rerank | PostgreSQL embeddings | Redis topk | ✅ CUDA |

### Agentic Tools (phase89-agentic-tools.mjs)
| Method | Purpose | GPU Stage | Writes To |
|--------|---------|-----------|-----------|
| `cluster_errors()` | Spawn Python CUDA | ✅ PyTorch GPU | `reports/phase89-cuda-clustering-report.json` |
| `fetch_recommendations()` | Qdrant vector search | ❌ | In-memory |
| `apply_diff()` | Parse + apply patch | ❌ | File system |
| `validate_fix()` | Run svelte-check | ❌ | In-memory validation result |
| `update_rag()` | Upsert RAG patterns | ❌ | `phase89_rag_patterns` (Qdrant) |
| `update_kag()` | Insert KAG nodes/edges | ❌ | `kag_nodes`, `kag_edges` (PostgreSQL) |
| `cosine_rank()` | GPU similarity ranking | ✅ PyTorch GPU | In-memory ranked list |

## 🔍 Verification Checklist

### A) Runtime Health Check
```powershell
# 1. Check Redis keyspace
docker exec -it phase66-redis redis-cli INFO keyspace
# Expected: db0:keys=XXX (non-zero)

# 2. Check Redis Phase 89 keys
docker exec -it phase66-redis redis-cli --scan --pattern "phase89:*" | Measure-Object -Line
docker exec -it phase66-redis redis-cli --scan --pattern "emb:*" | Measure-Object -Line
# Expected: Lines > 0 after first embed run

# 3. Check Qdrant collections
curl http://127.0.0.1:6333/collections | jq '.result.collections[].name'
# Expected: phase89_ast_embeddings, phase89_error_chunks, phase89_error_clusters, phase89_rag_patterns, phase89_kb_cards

# 4. Check Qdrant point counts
curl http://127.0.0.1:6333/collections/phase89_error_chunks | jq '.result.points_count'
curl http://127.0.0.1:6333/collections/phase89_kb_cards | jq '.result.points_count'
# Expected: > 0 after indexing
```

### B) PostgreSQL Truth Source
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT
  (SELECT COUNT(*) FROM phase89_error_instances) as instances,
  (SELECT COUNT(*) FROM phase89_embeddings) as embeddings,
  (SELECT COUNT(*) FROM phase89_fix_attempts) as fixes,
  (SELECT COUNT(*) FROM phase89_kb_cards) as kb_cards;
"
```

**Expected Shape:**
- `instances` ≈ 72,664 (current errors)
- `embeddings` << instances (dedupe working, e.g., ~15,000)
- `fixes` starts at 0, increases after fix loop
- `kb_cards` starts at 0, increases after successful fixes

### C) Status Breakdown
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT status, COUNT(*)
FROM phase89_error_instances
GROUP BY status
ORDER BY COUNT(*) DESC;
"
```

**Expected:**
- `open`: Majority (unfixed errors)
- `resolved`: Increases after successful fixes
- `stale`: Old errors no longer seen (marked, not deleted)

### D) End-to-End Learning Pipeline Test
```powershell
# Run one iteration
node scripts/phase89-enhanced-pipeline.mjs 1

# Verify KB card was created
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT id, title, tags
FROM phase89_kb_cards
ORDER BY created_at DESC
LIMIT 3;
"

# Search for new KB card in Qdrant
curl -X POST http://127.0.0.1:6333/collections/phase89_kb_cards/points/search \
  -H 'Content-Type: application/json' \
  -d '{
    "vector": [0.1, 0.2, ...],
    "limit": 3,
    "with_payload": true
  }' | jq '.result[].payload.title'
```

**Expected:** New KB card title appears in search results

## 🚀 GPU Acceleration Wiring

### Where CUDA Actually Accelerates
| Stage | Tool/File | GPU Operation | Performance Gain |
|-------|-----------|---------------|------------------|
| Clustering | `phase89-cuda-clustering.py` | PyTorch cosine similarity matrix | ~10x faster |
| Reranking | `phase89-agentic-tools.mjs` → `cosine_rank()` | Batch dot-product | ~6x faster |
| Embedding* | Ollama `embeddinggemma:latest` | Model inference on GPU | ~3x faster |

*Ollama automatically uses GPU if detected

### What Qdrant Does NOT GPU-Accelerate
- Qdrant itself = **CPU-only** HNSW (Rust)
- Tags = **CPU-only** filtering
- Search = **CPU-only** approximate nearest neighbor

### GPU Rerank Flow (The Secret Sauce)
```
1. Qdrant returns top 500 candidates (CPU, fast)
   ↓
2. Fetch embeddings from PostgreSQL (I/O)
   ↓
3. PyTorch CUDA rerank (GPU, very fast)
   ↓
4. Return top 50 after GPU rerank (precision++)
```

## 📈 Stage-by-Stage Data Flow

### Stage 1: Error Parsing & Non-Destructive Upsert
**Script:** `phase89-robust-reembed.mjs`

```
Parse errors → Generate instance_hash → PostgreSQL UPSERT
                                              ↓
                                   NO DELETES (only mark stale)
```

**Writes:**
- Table: `phase89_error_instances`
- Columns: `instance_hash`, `status='open'`, `last_seen=NOW()`

**Verification:**
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT COUNT(*) FROM phase89_error_instances WHERE status='open';
"
```

### Stage 2: Embedding with Redis Cache
**Script:** `phase89-incremental-embedder.mjs`

```
Normalize message → text_hash → CHECK Redis cache
                                        ↓
                              Cache HIT? Return cached
                                        ↓
                              Cache MISS? Generate embedding
                                        ↓
                              Store in Redis (7d TTL)
                                        ↓
                              PostgreSQL UPSERT (dedupe by text_hash)
```

**Writes:**
- Redis: `emb:embeddinggemma:latest:{text_hash}` = `[float32 array]`
- Table: `phase89_embeddings` (model, text_hash, embedding)

**Verification:**
```powershell
docker exec -it phase66-redis redis-cli --scan --pattern "emb:*" | Measure-Object -Line
```

### Stage 3: Adaptive Chunking & Qdrant Indexing
**Script:** `phase89-adaptive-chunker.mjs`

```
Read file → Extract AST signatures → Chunk by strategy
                                            ↓
                        ERROR_DENSE | SLIDING_WINDOW | AST_AWARE
                                            ↓
                        Generate chunk text → Embed → Qdrant upsert
```

**Writes:**
- Collection: `phase89_error_chunks`
- Payload: `file_path`, `start_line`, `end_line`, `tags[]`, `error_instance_hashes[]`

**Verification:**
```powershell
curl http://127.0.0.1:6333/collections/phase89_error_chunks | jq '.result.points_count'
```

### Stage 4: CUDA Clustering
**Script:** `phase89-cuda-clustering.py`

```
Fetch embeddings → PyTorch tensor (GPU) → Cosine similarity matrix
                                                ↓
                                    DBSCAN clustering (sklearn)
                                                ↓
                        Generate cluster summaries → Priority ranking
                                                ↓
                        Upsert centroids to Qdrant with tags
                                                ↓
                        Save recommendations to PostgreSQL
```

**Writes:**
- Collection: `phase89_error_clusters` (centroids + tags)
- Table: `error_cluster_recommendations` (cluster_id, priority_score, summary)
- File: `reports/phase89-cuda-clustering-report.json`

**Verification:**
```powershell
curl http://127.0.0.1:6333/collections/phase89_error_clusters | jq '.result.points_count'

docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT cluster_id, priority_score, LEFT(summary, 50)
FROM error_cluster_recommendations
ORDER BY priority_score DESC
LIMIT 5;
"
```

### Stage 5: Recommendation Fetch (Qdrant + GPU Rerank)
**Script:** `phase89-agentic-tools.mjs` → `fetch_recommendations()`

```
Query text → Embed → Qdrant search (top 500)
                            ↓
            Fetch full embeddings from PostgreSQL
                            ↓
            PyTorch GPU cosine rerank → Top 50
```

**Reads:**
- Collection: `phase89_error_clusters`
- Table: `phase89_embeddings`

**Writes:**
- Redis: `topk:embeddinggemma:latest:{query_hash}` (2h TTL)

### Stage 6: Fix Application & Validation
**Script:** `phase89-agentic-tools.mjs` → `apply_diff()` + `validate_fix()`

```
Parse git diff → Apply to file → Run svelte-check
                                        ↓
                        Compare errors before/after
                                        ↓
                        Record success/failure
```

**Writes:**
- Table: `phase89_fix_attempts` (target_instance_hashes, patch_diff, success, validation_before, validation_after)
- Files: Modified source files

### Stage 7: Learning & KB Update
**Script:** `phase89-agentic-tools.mjs` → `update_rag()` + `update_kag()`

```
IF success=true:
    Extract root_cause_tags → Generate KB card
                                    ↓
            Embed KB card → Upsert to Qdrant (phase89_kb_cards)
                                    ↓
            Insert KB card to PostgreSQL (phase89_kb_cards)
                                    ↓
            Insert KAG nodes (error, fix, file)
                                    ↓
            Insert KAG edges (FIX_RESOLVES_ERROR, FILE_HAS_ERROR)
                                    ↓
            Upsert RAG pattern (phase89_rag_patterns)
```

**Writes:**
- Collection: `phase89_kb_cards` (embedded playbook)
- Collection: `phase89_rag_patterns` (learned pattern embeddings)
- Table: `phase89_kb_cards` (title, body_md, tags, source_fix_attempt_id)
- Table: `kag_nodes` (node_id, node_type, properties)
- Table: `kag_edges` (from_node, to_node, relation_type)

**Verification:**
```powershell
# After successful fix
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT k.title, k.tags, f.success
FROM phase89_kb_cards k
JOIN phase89_fix_attempts f ON k.source_fix_attempt_id = f.id
ORDER BY k.created_at DESC
LIMIT 3;
"

curl http://127.0.0.1:6333/collections/phase89_kb_cards | jq '.result.points_count'
```

## 🧪 Complete Integration Test

### Run This Sequence to Verify Full Wiring

```powershell
# 1. Embed new errors (cache warm-up)
node scripts/phase89-incremental-embedder.mjs

# 2. Build adaptive chunks
node scripts/phase89-adaptive-chunker.mjs --build

# 3. Run CUDA clustering
C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe scripts/phase89-cuda-clustering.py

# 4. Run one pipeline iteration
node scripts/phase89-enhanced-pipeline.mjs 1

# 5. Verify all stages wrote data
.\scripts\phase89-verify-wiring.ps1
```

### Expected Output from Verification Script
```
✅ PostgreSQL:
   - phase89_error_instances: 72,664 rows
   - phase89_embeddings: 15,231 rows (dedupe ratio: 4.77x)
   - phase89_fix_attempts: 3 rows
   - phase89_kb_cards: 2 rows

✅ Redis:
   - Embedding cache keys: 15,231
   - Retrieval cache keys: 45
   - Cluster cache keys: 12

✅ Qdrant:
   - phase89_error_chunks: 8,432 points
   - phase89_error_clusters: 156 points
   - phase89_rag_patterns: 42 points
   - phase89_kb_cards: 2 points

✅ Learning Loop:
   - Last fix attempt: SUCCESS (TS1005 brace_drift)
   - KB card created: "Svelte 5 Brace Balance Fix"
   - KB card searchable: YES ✅
```

## 🔧 Environment Variables Reference

### Required for All Scripts
```bash
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379/0
OLLAMA_URL=http://127.0.0.1:11434
```

### Collection Names (Standardized)
```bash
QDRANT_AST_COLLECTION=phase89_ast_embeddings
QDRANT_ERROR_CHUNKS_COLLECTION=phase89_error_chunks
QDRANT_CLUSTERS_COLLECTION=phase89_error_clusters
QDRANT_RAG_COLLECTION=phase89_rag_patterns
QDRANT_KB_COLLECTION=phase89_kb_cards
```

### Redis Key Prefixes
```bash
REDIS_EMBED_PREFIX=emb:
REDIS_PHASE89_PREFIX=phase89:
REDIS_TOPK_PREFIX=topk:
```

### Model Names
```bash
OLLAMA_EMBED_MODEL=embeddinggemma:latest
OLLAMA_LLM_MODEL=gemma3-legal:latest
```

## 🚨 Common Wiring Issues & Fixes

### Issue 1: Qdrant shows 0 points after indexing
**Diagnosis:**
```powershell
curl http://127.0.0.1:6333/collections/phase89_error_chunks
```

**Fix:**
- Check collection name in script vs. query (typo?)
- Verify indexing script completed without errors
- Check Qdrant logs: `docker logs qdrant-db`

### Issue 2: Redis cache always misses (0% hit rate)
**Diagnosis:**
```powershell
docker exec -it phase66-redis redis-cli INFO stats | Select-String "keyspace_hits"
```

**Fix:**
- Check Redis DB number (scripts use `/0`, verify)
- Check key prefix (case-sensitive: `emb:` vs `EMB:`)
- Verify TTL not expired: `docker exec -it phase66-redis redis-cli TTL "emb:embeddinggemma:latest:somehash"`

### Issue 3: KB cards created but not searchable
**Diagnosis:**
```powershell
# Check PostgreSQL
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM phase89_kb_cards;"

# Check Qdrant
curl http://127.0.0.1:6333/collections/phase89_kb_cards | jq '.result.points_count'
```

**Fix:**
- If PostgreSQL has rows but Qdrant is empty: embedding step failed
- Check `update_kag()` logs for errors
- Manually re-embed: `node scripts/phase89-knowledge-consolidator.mjs --sync-kb`

### Issue 4: CUDA clustering fails with dimension mismatch
**Diagnosis:**
```powershell
C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe scripts/phase89-cuda-clustering.py 2>&1 | Select-String "dimension"
```

**Fix:**
- Check embedding model consistency (embeddinggemma:latest = 1024 dims)
- Clean up old embeddings with wrong dimensions:
  ```sql
  DELETE FROM phase89_embeddings WHERE model != 'embeddinggemma:latest';
  ```

## 🎯 Success Criteria Checklist

- [ ] PostgreSQL `phase89_error_instances` count matches parsed errors (~72k)
- [ ] PostgreSQL `phase89_embeddings` count is ~20-30% of instances (dedupe working)
- [ ] Redis embedding cache hit rate > 60%
- [ ] Qdrant `phase89_error_chunks` points > 5,000
- [ ] Qdrant `phase89_error_clusters` points > 100
- [ ] CUDA clustering completes in < 2 minutes for 40k embeddings
- [ ] After fix loop: `phase89_fix_attempts` count increases
- [ ] After successful fix: `phase89_kb_cards` count increases
- [ ] KB card appears in Qdrant search results immediately
- [ ] Visual topology graph shows nodes changing color (red → yellow → green)
- [ ] SSE events stream to browser without errors
- [ ] Browser activity feed updates in real-time

## 📚 Next Steps After Verification Passes

1. **Import Graph Indexing** (topology-aware fixes)
   ```powershell
   node scripts/phase89-import-graph-builder.mjs
   ```

2. **Enable GPU Rerank Endpoint**
   ```powershell
   node scripts/phase89-fastmcp-tools.mjs --enable-gpu-rerank
   ```

3. **Schedule Nightly Clustering**
   ```powershell
   # Add to Windows Task Scheduler
   schtasks /create /tn "Phase89 CUDA Clustering" /tr "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe scripts/phase89-cuda-clustering.py" /sc daily /st 02:00
   ```

4. **Monitor CouchDB Analytics**
   ```powershell
   curl http://127.0.0.1:5984/error_graph/_design/analytics/_view/top_root_causes?group=true
   ```

---

**Last Updated:** Dec 28, 2025
**Phase:** 89 - CUDA-Accelerated Agentic Error Fixing with KB Learning
