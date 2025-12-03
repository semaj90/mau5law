# Phase 72 Topology Brain – Quick Start

**Status:** ✅ Ready to Deploy
**Time to Deploy:** ~15 minutes

---

## 1. Start Infrastructure (5 min)

```bash
# From project root
docker-compose up -d postgres redis qdrant ollama

# Verify services
docker-compose ps
```

**Expected output:**
```
postgres-pgvector   Up
redis-legal-ai      Up
qdrant-gpu          Up
ollama-gemma        Up
```

---

## 2. Initialize Postgres (2 min)

```bash
# Create schema
psql -U legal_admin -d legal_ai_db -f backend/sql/phase72_topology_schema.sql

# Verify tables
psql -U legal_admin -d legal_ai_db -c "\dt phase72_*"
```

**Expected output:**
```
phase72_cluster
phase72_cluster_summary
phase72_error
phase72_error_vector
phase72_run
phase72_topology_stats
```

---

## 3. Start Go Ingest Service (2 min)

```bash
cd go-services/phase72-ingest
go run main.go

# In another terminal, test it
curl -X POST http://127.0.0.1:8089/phase72/parse
```

**Expected output:**
```json
{
  "errors": [...],
  "count": 42
}
```

---

## 4. Verify Ollama Models (2 min)

```bash
curl http://127.0.0.1:11434/api/tags

# Should show:
# - embeddinggemma:latest
# - gemma3-legal:latest
```

If missing, pull them:
```bash
ollama pull embeddinggemma:latest
ollama pull gemma3-legal:latest
```

---

## 5. Run Phase 72 Topology (4 min)

```bash
cd sveltekit-frontend

# Run pipeline
node scripts/phase72-topology-vectorize.mjs 1

# Expected output:
# [phase72-topology] Got 42 errors from ingest service
# [phase72-topology] Cache hits: 0/42 (0%)
# [phase72-topology] Embedding 42 new errors with embeddinggemma:latest...
# [phase72-topology] Embedded 42 errors
# [phase72-topology] Persisted 42 errors to Postgres
# [phase72-topology] Upserting to Qdrant...
# ✓ Phase 72 Topology complete in 2345ms
```

---

## 6. Verify Data (2 min)

### Check Postgres
```bash
psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM phase72_error;"
# Should show: 42

psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM phase72_error_vector;"
# Should show: 42
```

### Check Redis
```bash
redis-cli KEYS "phase72:*" | wc -l
# Should show: 42 (or more if cached)
```

### Check Qdrant
```bash
curl http://127.0.0.1:6333/collections/phase72_errors
# Should show: "points_count": 42
```

---

## 7. Query Examples

### Find similar errors
```bash
# Get a vector from Postgres
psql -U legal_admin -d legal_ai_db -c "SELECT embedding FROM phase72_error_vector LIMIT 1;"

# Use it to search Qdrant (via Node script)
node -e "
import { searchSimilarErrors } from './scripts/phase72-qdrant-topology.mjs'
const vec = [0.1, 0.2, ...]; // from above
const results = await searchSimilarErrors(vec, 5)
console.log(results)
"
```

### Find errors by code
```bash
psql -U legal_admin -d legal_ai_db -c "
SELECT file_path, line, column, message
FROM phase72_error
WHERE code = 'TS2304'
LIMIT 5;
"
```

### Cache statistics
```bash
npm run phase72:cache:stats
```

### Qdrant statistics
```bash
npm run phase72:qdrant:stats
```

---

## 8. Add npm Scripts

Update `sveltekit-frontend/package.json`:

```json
{
  "scripts": {
    "phase72:parse": "node scripts/phase72-svelte-check-parse.mjs",
    "phase72:topology": "node scripts/phase72-topology-vectorize.mjs",
    "phase72:cache:stats": "node scripts/phase72-redis-cache.mjs",
    "phase72:qdrant:stats": "node scripts/phase72-qdrant-topology.mjs"
  }
}
```

Then run:
```bash
npm run phase72:topology
```

---

## 9. Environment Variables

Create `.env.local` in `sveltekit-frontend/`:

```bash
# Go ingest service
GO_INGEST_URL=http://127.0.0.1:8089

# Ollama
OLLAMA_ENDPOINT=http://127.0.0.1:11434

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Qdrant
QDRANT_URL=http://127.0.0.1:6333

# Postgres
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
```

---

## 10. Troubleshooting

### "Go ingest service error: 404"
- Make sure Go service is running: `go run go-services/phase72-ingest/main.go`

### "Ollama embeddings error: 404"
- Make sure Ollama is running: `ollama serve`
- Make sure models are pulled: `ollama pull embeddinggemma:latest`

### "Postgres connection error"
- Check DATABASE_URL is correct
- Make sure postgres container is running: `docker-compose ps`

### "Qdrant connection error"
- Make sure qdrant container is running: `docker-compose ps`
- Check QDRANT_URL is correct

### "Redis connection error"
- Make sure redis container is running: `docker-compose ps`
- Check REDIS_URL is correct

---

## 11. Next Steps

1. **Run Phase 72 topology** (you just did this!)
2. **Verify data** in Postgres + Qdrant
3. **Layer Phase 73** structural fixes
4. **Generate summaries** with gemma3-legal:latest
5. **Build RAG** over error summaries

---

## Performance Checklist

- [ ] Go ingest: <100ms
- [ ] Redis cache: >80% hit rate
- [ ] Ollama embedding: ~1.5s for 10k errors
- [ ] Postgres insert: <500ms
- [ ] Qdrant upsert: <200ms
- [ ] Total pipeline: <5s

---

## Files to Know

| File | Purpose |
|------|---------|
| `go-services/phase72-ingest/main.go` | Go ingest service |
| `sveltekit-frontend/scripts/phase72-topology-vectorize.mjs` | Main pipeline |
| `sveltekit-frontend/scripts/phase72-redis-cache.mjs` | Redis cache |
| `sveltekit-frontend/scripts/phase72-qdrant-topology.mjs` | Qdrant integration |
| `backend/sql/phase72_topology_schema.sql` | Postgres schema |

---

**Status:** ✅ Ready to Deploy
**Estimated Time:** 15 minutes
**Next:** Phase 73 Structural Fixes
