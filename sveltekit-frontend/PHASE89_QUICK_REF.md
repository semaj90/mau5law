# Phase 89: Redis Cache + Top-K Index - Quick Reference

## 🚀 ONE-LINERS

```powershell
# Check status
.\scripts\RUN_PHASE89_COMPLETE.ps1 -Action stats

# Monitor index build (auto-refresh every 10s)
.\scripts\phase89-monitor-topk.ps1

# Query errors (with cache)
node scripts/phase89-enhanced-ranker.mjs "TS1005" --top 20

# Web search
node scripts/phase89-web-search.mjs "TS2304"

# Fix errors
node scripts/phase89-agentic-fixer.mjs --limit 100

# Full pipeline
.\scripts\RUN_PHASE89_COMPLETE.ps1 -Action full
```

---

## 📊 CURRENT STATUS (2025-01-13 13:05)

| Component | Status | Progress |
|-----------|--------|----------|
| **Embeddings** | ✅ Complete | 45,661 / 45,730 (99.8%) |
| **Top-K Index** | ⏳ Building | 5,520 / 45,661 (12.1%) |
| **Redis Cache** | ✅ Running | ~5,500 keys |
| **Web Search** | ✅ Ready | SO + GitHub APIs |
| **Enhanced Ranker** | ✅ Ready | Cache cascade |

**ETA for Index**: ~2.5 hours (250-280 errors/min)

---

## 🔍 KEY METRICS

### Database
- **Total errors**: 45,730
- **Embedded**: 45,661 (99.8%)
- **TSC**: 38,930 errors
- **Svelte-check**: 6,800 errors
- **DB size**: 369 MB

### Top-K Index (Current)
- **Indexed**: 5,520 errors (12.1%)
- **Relationships**: 110,215
- **Neighbors per error**: 20
- **Build rate**: 250-280/min

### Redis
- **Status**: Connected
- **Keys**: ~5,500
- **Memory**: ~5-10 MB
- **Expected final**: ~50K keys, 15 MB

---

## 🎯 DELIVERABLES

- [x] ✅ Redis caching layer
- [x] ✅ Language-specific cache TTLs
- [ ] ⏳ Top-K inverse index (12.1%)
- [x] ✅ Web search integration
- [x] ✅ Enhanced similarity ranker
- [ ] ⏳ Performance validation
- [ ] ⏳ Autonomous fixer testing

---

## 📂 NEW FILES

1. `scripts/phase89-build-topk-index.mjs` - Build inverse index
2. `scripts/phase89-monitor-topk.ps1` - Monitor build progress
3. `scripts/RUN_PHASE89_COMPLETE.ps1` - Full automation
4. `PHASE89_REDIS_TOPK_GUIDE.md` - Complete guide
5. `PHASE89_STATUS_REDIS_TOPK.md` - Detailed status

---

## ⚡ QUICK TESTS

### Test Cache
```powershell
# First query (miss → slow)
Measure-Command { node scripts/phase89-enhanced-ranker.mjs "TS1005" }

# Second query (hit → fast)
Measure-Command { node scripts/phase89-enhanced-ranker.mjs "TS1005" }
```

### Test Web Search
```powershell
node scripts/phase89-web-search.mjs "TS1005"
# Expected: Stack Overflow + GitHub results in ~500ms
```

### Test Index Progress
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT COUNT(DISTINCT error_id) FROM error_topk_index"
```

---

## 🐛 TROUBLESHOOTING

### Index Build Stopped?
```powershell
# Check if process running
Get-Process -Name node | Where-Object { $_.WorkingSet -gt 50MB }

# Restart if needed
node scripts/phase89-build-topk-index.mjs 20
```

### Redis Not Connected?
```powershell
# Check container
docker ps | grep redis

# Restart
docker restart phase66-redis
```

### Query Slow?
```powershell
# Clear cache
docker exec phase66-redis redis-cli FLUSHDB

# Rebuild index (if corrupted)
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
TRUNCATE error_topk_index"
node scripts/phase89-build-topk-index.mjs 20
```

---

## 📈 EXPECTED PERFORMANCE

| Metric | Target | Method |
|--------|--------|--------|
| Cache hit latency | <1ms | Redis |
| Index lookup | <5ms | Top-K |
| Vector search | ~10ms | pgvector |
| Web search | ~500ms | SO/GH APIs |

---

## 🎓 ARCHITECTURE SUMMARY

```
Query: "TS1005"
    ↓
Redis Cache (<1ms)
    ↓ miss
Top-K Index (<5ms)
    ↓ not in top-20
pgvector Search (~10ms)
    ↓ optional
Web Search (~500ms)
```

**Cache Keys**:
- `topk:<error_id>` - Top-5 neighbors
- `phase89:query:<hash>` - Query results
- `phase89:docsearch:so:<query>` - Stack Overflow
- `phase89:docsearch:gh:<query>` - GitHub

**Database Tables**:
- `raw_error_embeddings` - 45,730 errors with vectors
- `error_topk_index` - Pre-computed top-20 neighbors

---

## 🔗 RESOURCES

- **Full Guide**: `PHASE89_REDIS_TOPK_GUIDE.md`
- **Status**: `PHASE89_STATUS_REDIS_TOPK.md`
- **Original Guide**: `PHASE89_RAW_TEXT_GUIDE.md`

---

**Last Updated**: 2025-01-13 13:05 UTC
**Next Update**: After index build completes (~2.5 hours)
