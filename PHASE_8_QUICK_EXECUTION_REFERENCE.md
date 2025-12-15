# ⚡ PHASE 8: QUICK EXECUTION REFERENCE

**Status**: ✅ READY TO EXECUTE NOW
**Duration**: 1h 15m
**Target**: 15:45 UTC

---

## 🎯 6-PHASE EXECUTION PLAN

### PHASE 1: START SERVICES (14:30-14:45)

**Terminal 1: PostgreSQL**
```bash
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17
```

**Terminal 2: Ollama**
```bash
ollama serve
```

**Terminal 3: Qdrant**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

---

### PHASE 2: DATABASE MIGRATION (14:45-15:00)

**Terminal 4: Migration**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/legal_ai"
psql $DATABASE_URL < backend/migrations/001_create_poi_schema.sql
```

**Verify**:
```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'poi%';"
```

---

### PHASE 3: START BACKEND (15:00-15:15)

**Terminal 5: Backend**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify**:
```bash
curl http://localhost:8000/health
```

---

### PHASE 4: START FRONTEND (14:35-14:37)

**Terminal 6: Frontend**
```bash
cd sveltekit-frontend
npm run dev
```

---

### PHASE 5: RUN SMOKE TESTS (15:15-15:45)

**Terminal 7: Smoke Tests**
```bash
chmod +x backend/tests/test_poi_smoke.sh
./backend/tests/test_poi_smoke.sh
```

**Expected**: All 11 tests pass ✓

---

### PHASE 6: TEST FRONTEND (14:37-15:02)

**Browser Tests**:
1. http://localhost:5173/persons-of-interest (list)
2. http://localhost:5173/persons-of-interest/create (create)
3. http://localhost:5173/dashboard (command center)

---

## ✅ SUCCESS CRITERIA

- [ ] PostgreSQL running (:5432)
- [ ] Ollama running (:11434)
- [ ] Qdrant running (:6333)
- [ ] Database migrated (3 tables)
- [ ] Backend running (:8000)
- [ ] Frontend running (:5173)
- [ ] Smoke tests passing (11/11)
- [ ] Frontend pages loading
- [ ] No console errors

---

## 🔗 KEY ENDPOINTS

```
GET    http://localhost:8000/health
GET    http://localhost:8000/api/health
POST   http://localhost:8000/api/persons-of-interest
GET    http://localhost:8000/api/persons-of-interest
GET    http://localhost:5173/persons-of-interest
```

---

## 📁 KEY FILES

- `backend/api/main.py` - Backend app
- `backend/migrations/001_create_poi_schema.sql` - Database schema
- `backend/tests/test_poi_smoke.sh` - Smoke tests
- `sveltekit-frontend/vite.config.ts` - Proxy config
- `sveltekit-frontend/src/routes/(app)/persons-of-interest/` - Frontend pages

---

## 🐛 QUICK FIXES

**Port already in use?**
```bash
lsof -i :5432  # Check PostgreSQL
lsof -i :8000  # Check Backend
lsof -i :5173  # Check Frontend
```

**Database connection failed?**
```bash
psql -h localhost -U postgres -c "SELECT 1"
```

**Backend won't start?**
```bash
# Check database
psql $DATABASE_URL -c "SELECT 1"

# Check port
lsof -i :8000
```

**Frontend won't start?**
```bash
# Clear cache
rm -rf sveltekit-frontend/.svelte-kit

# Reinstall
cd sveltekit-frontend && npm install && npm run dev
```

---

## ⏱️ TIMELINE

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Services | 15 min | 14:30 | 14:45 |
| Migration | 15 min | 14:45 | 15:00 |
| Backend | 15 min | 15:00 | 15:15 |
| Frontend | 2 min | 14:35 | 14:37 |
| Tests | 30 min | 15:15 | 15:45 |
| **TOTAL** | **1h 15m** | **14:30** | **15:45** |

---

## 📊 CURRENT STATUS

✅ Backend: 100% Ready
✅ Frontend: 100% Ready
✅ Database: 100% Ready
✅ Tests: 100% Ready
✅ Documentation: 100% Ready

**OVERALL: 100% READY TO EXECUTE**

---

**Next Action**: Open 6 terminals and start Phase 1

