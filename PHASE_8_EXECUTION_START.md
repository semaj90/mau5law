# Phase 8: Execution Start - December 14, 2025

**Time**: 14:30 UTC
**Status**: ✅ Ready to Execute
**Mission**: Start backend smoke tests AND frontend integration in parallel

---

## 🎯 Parallel Execution Plan

### TERMINAL 1: PostgreSQL (14:30)
```bash
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17
```
**Expected**: `database system is ready to accept connections`
**Timestamp**: ___________

---

### TERMINAL 2: Ollama (14:30)
```bash
ollama serve
```
**Expected**: `Listening on 127.0.0.1:11434`
**Timestamp**: ___________

---

### TERMINAL 3: Qdrant (14:30)
```bash
docker run -p 6333:6333 qdrant/qdrant
```
**Expected**: `Qdrant is running`
**Timestamp**: ___________

---

### TERMINAL 4: Database Migration (14:45)
```bash
# Set DATABASE_URL first
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/legal_ai"

# Run migration
psql $DATABASE_URL < backend/migrations/001_create_poi_schema.sql
```
**Expected**: `CREATE TABLE` messages
**Timestamp**: ___________

---

### TERMINAL 5: Backend Startup (15:00)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```
**Expected**: `🎯 Legal AI Backend ready!`
**Timestamp**: ___________

---

### TERMINAL 6: Frontend Startup (14:35)
```bash
cd sveltekit-frontend
npm run dev
```
**Expected**: `➜  Local:   http://localhost:5173/`
**Timestamp**: ___________

---

## 📋 Execution Checklist

### Phase 1: Services Startup (14:30-14:45)
- [ ] PostgreSQL running
  - **Timestamp**: ___________
  - **Verify**: `psql -h localhost -U postgres -c "SELECT 1"`

- [ ] Ollama running
  - **Timestamp**: ___________
  - **Verify**: `curl http://localhost:11434/api/tags`

- [ ] Qdrant running
  - **Timestamp**: ___________
  - **Verify**: `curl http://localhost:6333/health`

### Phase 2: Database Setup (14:45-15:00)
- [ ] Migration completed
  - **Timestamp**: ___________
  - **Verify**: `psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'poi%'"`

### Phase 3: Backend Startup (15:00-15:15)
- [ ] Backend running
  - **Timestamp**: ___________
  - **Verify**: `curl http://localhost:8000/health`

### Phase 4: Frontend Startup (14:35-14:37)
- [ ] Frontend running
  - **Timestamp**: ___________
  - **Verify**: Open http://localhost:5173 in browser

### Phase 5: Smoke Tests (15:15-15:45)
- [ ] Health check
  - **Timestamp**: ___________
  - **Command**: `curl http://localhost:8000/health`

- [ ] Run smoke test script
  - **Timestamp**: ___________
  - **Command**: `./backend/tests/test_poi_smoke.sh`

### Phase 6: Frontend Testing (14:37-15:02)
- [ ] List page loads
  - **Timestamp**: ___________
  - **URL**: http://localhost:5173/persons-of-interest

- [ ] Create page loads
  - **Timestamp**: ___________
  - **URL**: http://localhost:5173/persons-of-interest/create

- [ ] Form submission works
  - **Timestamp**: ___________
  - **Action**: Create test POI

- [ ] Data persists
  - **Timestamp**: ___________
  - **Verify**: POI appears in list

---

## 🚀 Quick Commands

### Check Services
```bash
# PostgreSQL
psql -h localhost -U postgres -c "SELECT 1"

# Ollama
curl http://localhost:11434/api/tags

# Qdrant
curl http://localhost:6333/health

# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:5173
```

### Run Tests
```bash
# Smoke tests
./backend/tests/test_poi_smoke.sh

# Unit tests
pytest backend/tests/test_poi_unit.py -v

# Property tests
pytest backend/tests/test_poi_properties.py -v
```

---

## 📊 Success Criteria

✅ All services running
✅ Database migrated
✅ Backend responding
✅ Frontend loading
✅ All 9 API endpoints working
✅ Frontend pages loading
✅ Form submission working
✅ Data persisting

---

## ⏱️ Timeline

| Task | Duration | Start | End | Status |
|------|----------|-------|-----|--------|
| Services startup | 15 min | 14:30 | 14:45 | ⏳ |
| Database migration | 15 min | 14:45 | 15:00 | ⏳ |
| Backend startup | 15 min | 15:00 | 15:15 | ⏳ |
| Frontend startup | 2 min | 14:35 | 14:37 | ⏳ |
| Smoke tests | 30 min | 15:15 | 15:45 | ⏳ |
| Frontend testing | 25 min | 14:37 | 15:02 | ⏳ |
| **Total** | **1h 15m** | **14:30** | **15:45** | **⏳** |

---

## 📝 Notes

- All services should run in separate terminals
- Frontend and backend can start in parallel
- Database migration must complete before backend starts
- Smoke tests can run while frontend is being tested

---

**Created**: December 14, 2025 - 14:30 UTC
**Status**: ✅ Ready to Execute
**Next**: Start services in parallel terminals

