# Phase 89: Quick Reference & Command Cheat Sheet

**Last Updated**: December 28, 2025
**Current Status**: Re-embedding 795/72,664 svelte errors (1.03%)

---

## 🚀 Quick Start

### Check System Status
```powershell
.\scripts\phase89-verify-system.ps1
```

### Monitor Re-embedding Progress
```powershell
.\scripts\phase89-monitor-reembed.ps1
```

### Query Similar Errors
```powershell
node scripts/phase89-similarity-ranker.mjs "error TS1005"
```

---

## 📊 CURRENT STATUS (December 28, 2025)

| Component | Status | Progress |
|-----------|--------|----------|
| **TSC Embeddings** | ✅ Complete | 38,906 / 38,930 (99.94%) |
| **Svelte Embeddings** | ⏳ Re-embedding | 795 / 72,664 (1.03%) |
| **Top-K Index** | ⏸️ Paused | 8,456 (old data) |
| **Redis Cache** | ✅ Running | ~800 keys |
| **Qdrant** | ✅ Running | 810 points |
| **CouchDB** | ⚠️ Empty | 0 documents |

**ETA for Re-embedding**: ~12 hours (at 1.6/s rate)
**Target**: 111,594 total errors (2.4x increase)

---

## 🔍 KEY METRICS

### Database (legal_ai_db @ 5434)
- **Total errors**: 39,725 (target: 111,594)
- **TSC**: 38,930 errors ✅
- **Svelte-check**: 795 / 72,664 (1.03%) ⏳
- **Cache hit rate**: 0.1% (improving)

### Infrastructure
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
