# Phase 89 Enhanced - Quick Reference Card
**🎯 Complete System - Both Deliverables Ready**

---

## 🚀 One-Command Start

```powershell
cd C:\Users\james\Videos\deeds-web-app
.\start-phase89.ps1
```

---

## 📦 Configuration

**Database**: legal_ai_db @ 5434 (legal_admin/123456)
**Containers**: phase66-postgres, phase66-qdrant, phase66-redis, phase66-minio
**Collections**: phase89_error_map (Qdrant), phase76_knowledge_base (810 pts)

---

## 🔧 Essential Commands

### Start Dependencies
```powershell
cd go-services\knowledge-plane
.\run-safe-hardened.ps1
```

### Build Graph
```powershell
cd sveltekit-frontend
node scripts\phase89-error-map-builder.mjs
```

### Query Errors
```powershell
node scripts\phase89-error-map-query.mjs "TS1005"
```

### View UI
```powershell
npm run dev
# http://localhost:5175/phase89/error-map
```

### Run Tests
```powershell
.\test-phase89.ps1
```

---

## 🧪 Quick Verification

```powershell
# Check containers
docker ps --filter "name=phase66"

# Check database
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "\dt"

# Check Qdrant
Invoke-RestMethod http://127.0.0.1:6333/collections/phase89_error_map

# Check graph size
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM kg_nodes;"
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **PHASE89_EXECUTIVE_SUMMARY.md** | ⭐ Start here |
| **PHASE89_COMPLETE_SUMMARY.md** | Full details |
| **PHASE89_CONFIG_VERIFICATION.md** | Config audit |
| **test-phase89.ps1** | Automated tests |

---

## ✅ Success Checklist

- [ ] Containers running: `docker ps | Select-String phase66`
- [ ] Database connected: `psql -U legal_admin -d legal_ai_db`
- [ ] Schema applied: `\dt` shows kg_nodes, kg_edges
- [ ] Graph built: kg_nodes has 200+ rows
- [ ] Qdrant ready: phase89_error_map has vectors
- [ ] Tests pass: `.\test-phase89.ps1` shows 14/14
- [ ] UI loads: http://localhost:5175/phase89/error-map

---

## 🔥 Key Features

**Deliverable 1**: Safeguarded startup (no rebuilds, data preserved)
**Deliverable 2**: Agentic error map (RAG+KAG, 810-pt KB, LLM fixes)

**Storage**: Postgres (graph) + Qdrant (vectors) + Redis (cache)
**Retrieval**: Vector search → Graph expand → Pattern detect → Doc retrieve → Fix generate

---

**Status**: ✅ PRODUCTION READY
**Config**: ✅ FULLY SYNCHRONIZED
**Tests**: 14/14 PASSED
