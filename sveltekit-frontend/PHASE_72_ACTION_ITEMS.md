# 🎯 Next 3 Action Items - Phase 72/73/78 Integration

## Item 1: Create Phase 72 Database Tables ⏳

**Status:** Ready to execute
**Time:** ~2 minutes

```powershell
# Connect to PostgreSQL
$connString = "postgresql://legal_admin:123456@localhost:5432/legal_ai_db"
psql $connString
```

Then run this SQL:

```sql
-- Phase 72 Error Tracking Table
CREATE TABLE IF NOT EXISTS phase72_error (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  column INTEGER,
  code TEXT NOT NULL,
  severity TEXT, -- 'error', 'warning', 'info'
  message TEXT NOT NULL,
  cycle INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_phase72_error_file ON phase72_error(file_path);
CREATE INDEX IF NOT EXISTS idx_phase72_error_code ON phase72_error(code);
CREATE INDEX IF NOT EXISTS idx_phase72_error_created ON phase72_error(created_at DESC);

-- Vector embeddings (768-dim for Phase 72 topology)
CREATE TABLE IF NOT EXISTS phase72_error_vector (
  id UUID PRIMARY KEY REFERENCES phase72_error(id) ON DELETE CASCADE,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phase72_error_vector
  ON phase72_error_vector USING ivfflat (embedding vector_cosine_ops);
```

---

## Item 2: Verify Infrastructure Green ✅

**Status:** Ready to verify
**Time:** ~1 minute

Run these checks in separate terminals:

```powershell
# Check Go Ingest Service
Write-Host "Testing Go Ingest..." -ForegroundColor Cyan
curl -s http://127.0.0.1:8089/health | jq .

# Check Redis (if needed)
Write-Host "Testing Redis..." -ForegroundColor Cyan
docker exec phase66-redis redis-cli PING

# Check Qdrant
Write-Host "Testing Qdrant..." -ForegroundColor Cyan
curl -s http://localhost:6333/health | jq .

# Check PostgreSQL
Write-Host "Testing PostgreSQL..." -ForegroundColor Cyan
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "SELECT 1"

# Check Ollama
Write-Host "Testing Ollama..." -ForegroundColor Cyan
curl -s http://localhost:11434/api/tags | jq '.models | length'
```

**Expected Results:**
- ✅ Go Ingest: `{ "status": "ok", "ready": true }`
- ✅ Redis: `PONG`
- ✅ Qdrant: `{ "title": "qdrant" ... }`
- ✅ PostgreSQL: `1`
- ✅ Ollama: Shows number of models (e.g., `2`)

---

## Item 3: Run Phase 72 Topology Ingest ⏳

**Status:** Ready to execute (after DB tables created)
**Time:** ~5-10 minutes

From SvelteKit frontend directory:

```bash
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Run one Phase 72 topology pass (parses svelte-check, generates embeddings)
npm run phase72:topology

# Or manually:
npx tsx scripts/phase72-topology-vectorize.mjs
```

This will:
1. ✅ Run `svelte-check --output machine` via Go service
2. ✅ Parse errors into phase72_error table
3. ✅ Generate 768-dim embeddings for each error
4. ✅ Store vectors in Qdrant (phase72_errors collection)
5. ✅ Populate phase72_error_vector table

**Output:** Should show progress like:
```
Phase72 Topology Ingest Starting...
  ✅ Parsed 42 errors from svelte-check
  ✅ Generated embeddings: 42/42 (100%)
  ✅ Synced to Qdrant: 42/42 (100%)
  ✅ Phase 72 pass complete - cycle 1
```

---

## Optional: Run Phase 78 Brain Test

After Phase 72 topology is ingested:

```bash
npm run phase78:test-brain
```

This tests:
- ✅ Similarity search (find similar errors)
- ✅ AI fix suggestions (generate plans)
- ✅ Related route detection (find affected pages)

---

## Once Complete: Access Command Center

1. **Start SvelteKit dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:5173/all-routes
   ```

3. **Interact with NES Command Center:**
   - Click on any route row
   - Modal opens showing errors + stats
   - Click "Suggest Fix with AI" for plan
   - See related routes with one click

---

## Files to Reference

- **Environment:** `sveltekit-frontend/.env` (GO_INGEST_URL configured)
- **API Routes:** `sveltekit-frontend/src/routes/api/phase72/{errors,suggest-fix}/+server.ts`
- **Setup Doc:** `PHASE_72_SETUP_COMPLETE.md`
- **Go Service:** Running at `http://127.0.0.1:8089`

---

## 🚀 TL;DR

```powershell
# 1. Create tables
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" < phase72-schema.sql

# 2. Verify services
curl http://127.0.0.1:8089/health

# 3. Run topology
cd sveltekit-frontend
npm run phase72:topology

# 4. Start dev + browse to /all-routes
npm run dev
```

Done! You'll have a real-time NES Command Center showing all route errors + AI-powered fix suggestions. 🎯
