# Phase 72.5: Deployment Checklist

**Status:** ✅ Ready to Deploy
**Time:** ~15 minutes

---

## Pre-Deployment

- [ ] Read `PHASE72_TOPOLOGY.md`
- [ ] Read `PHASE_72_5_INTEGRATION_SUMMARY.md`
- [ ] Verify infrastructure is available (Redis, Postgres, Qdrant, Ollama)

---

## Step 1: Start Infrastructure (3 min)

```bash
# Terminal 1: Redis
redis-server --port 4005

# Terminal 2: Docker services
docker-compose up -d postgres qdrant ollama

# Verify
docker-compose ps
redis-cli -p 4005 ping  # Should return PONG
```

**Checklist:**
- [ ] Redis running on port 4005
- [ ] Postgres running
- [ ] Qdrant running
- [ ] Ollama running

---

## Step 2: Initialize Postgres (2 min)

```bash
psql -U legal_admin -d legal_ai_db -f backend/sql/phase72_topology_minimal.sql

# Verify tables created
psql -U legal_admin -d legal_ai_db -c "\dt phase72_*"
```

**Expected output:**
```
phase72_cluster
phase72_cluster_summary
phase72_error
phase72_error_vector
```

**Checklist:**
- [ ] Schema created successfully
- [ ] All 4 tables exist

---

## Step 3: Verify Ollama Models (2 min)

```bash
curl http://127.0.0.1:11434/api/tags

# Should show embeddinggemma:latest and gemma3-legal:latest
```

If missing:

```bash
ollama pull embeddinggemma:latest
ollama pull gemma3-legal:latest
```

**Checklist:**
- [ ] embeddinggemma:latest available
- [ ] gemma3-legal:latest available

---

## Step 4: Set Environment Variables (1 min)

Create `sveltekit-frontend/.env.local`:

```bash
REDIS_URL=redis://127.0.0.1:4005
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
QDRANT_URL=http://127.0.0.1:6333
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

**Checklist:**
- [ ] `.env.local` created
- [ ] All 4 variables set

---

## Step 5: Verify npm Scripts (1 min)

```bash
cd sveltekit-frontend

npm run phase72:cache-stats
# Should show: Phase 72 Topology Stats: { "redis": { "dbsize": 0 } }
```

**Checklist:**
- [ ] npm scripts work
- [ ] Redis connection successful

---

## Step 6: Run Phase 72 Fast Scan + Topology (5 min)

```bash
cd sveltekit-frontend

npm run phase72:fast-scan
```

**Expected output:**
```
[phase72-fast] starting fast scan…
[phase72-fast] ripgrep found 42 errors
[phase72-topology] Checking Redis cache for 42 errors...
[phase72-topology] Cache hits: 0/42
[phase72-topology] Embedding 42 new errors with embeddinggemma:latest...
[phase72-topology] Embedded 42 errors
[phase72-topology] Persisted 42 errors to Postgres
[phase72-topology] Upserted 42 errors to Qdrant
[phase72-topology] ✓ Topology store complete: 42 errors (0 cached, 42 new)
```

**Checklist:**
- [ ] Fast scan completes
- [ ] Errors found
- [ ] Topology store completes
- [ ] No errors in output

---

## Step 7: Verify Data Persistence (2 min)

### Check Postgres

```bash
psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM phase72_error;"
# Should show: 42 (or your error count)

psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM phase72_error_vector;"
# Should show: 42
```

### Check Redis

```bash
redis-cli -p 4005 KEYS "phase72:*" | wc -l
# Should show: 42 (or more)
```

### Check Qdrant

```bash
curl http://127.0.0.1:6333/collections/phase72_errors | jq '.result.points_count'
# Should show: 42
```

**Checklist:**
- [ ] Postgres has errors
- [ ] Postgres has vectors
- [ ] Redis has cache keys
- [ ] Qdrant has points

---

## Step 8: Test Queries (2 min)

### Query Postgres

```bash
psql -U legal_admin -d legal_ai_db -c "
SELECT file_path, line, code, message
FROM phase72_error
LIMIT 5;
"
```

### Query Qdrant

```bash
curl http://127.0.0.1:6333/collections/phase72_errors/points | jq '.result.points[0]'
```

**Checklist:**
- [ ] Postgres queries work
- [ ] Qdrant queries work
- [ ] Data looks correct

---

## Step 9: Run Second Cycle (to test cache) (3 min)

```bash
PHASE72_CYCLE=2 npm run phase72:fast-scan
```

**Expected output:**
```
[phase72-topology] Cache hits: 42/42  # All cached!
[phase72-topology] Embedding 0 new errors...
[phase72-topology] ✓ Topology store complete: 42 errors (42 cached, 0 new)
```

**Checklist:**
- [ ] Cache hits >0
- [ ] No new embeddings needed
- [ ] Faster than first run

---

## Step 10: Check Cache Statistics (1 min)

```bash
npm run phase72:cache-stats
```

**Expected output:**
```
Phase 72 Topology Stats:
{
  "redis": {
    "dbsize": 42,
    "info": "..."
  }
}
```

**Checklist:**
- [ ] Cache stats show correct count
- [ ] Redis is healthy

---

## Deployment Complete ✅

All steps passed? You're ready!

**Next steps:**
1. Integrate `storePhase72ErrorsTopology()` into your fast scanner
2. Run Phase 72 regularly to build topology
3. Move to Phase 73: Clustering & Summaries

---

## Troubleshooting

### "Redis connection refused"
```bash
redis-server --port 4005
```

### "Ollama embeddings error: 404"
```bash
ollama serve
ollama pull embeddinggemma:latest
```

### "Postgres connection error"
```bash
docker-compose up -d postgres
psql -U legal_admin -d legal_ai_db -f backend/sql/phase72_topology_minimal.sql
```

### "Qdrant connection error"
```bash
docker-compose up -d qdrant
```

### "No errors found"
- Check ripgrep is working
- Check your fast scanner is finding errors
- Check error format: `{ file, line, column, code, severity, message }`

---

## Performance Targets

After deployment, verify:

- [ ] First run: <5s for 10k errors
- [ ] Second run: <2s for 10k errors (cache hits)
- [ ] Cache hit rate: >80%
- [ ] Postgres queries: <100ms
- [ ] Qdrant queries: <100ms

---

## Files to Keep Handy

1. `PHASE72_TOPOLOGY.md` – Full documentation
2. `sveltekit-frontend/scripts/phase72-topology-store.mjs` – Main integration
3. `backend/sql/phase72_topology_minimal.sql` – Schema
4. `.env.local` – Environment variables

---

**Status:** ✅ Ready to Deploy
**Estimated Time:** 15 minutes
**Next:** Phase 73 Clustering & Summaries
