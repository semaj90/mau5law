# Phase 73 Quick Start Checklist

**Copy-paste commands to get running in 10 minutes**

---

## ✅ Checklist

### 1. Build Go Services (3 min)

```powershell
cd c:\Users\james\Videos\deeds-web-app\go-microservice
.\BUILD-PHASE73-CMAKE.bat
```

**Expected:** ✅ Build Complete! (4 binaries in `build/bin/`)

---

### 2. Start Services (1 min)

```powershell
.\start-phase73-services.bat
```

**Expected:** 3 new terminal windows open:
- ✅ Redis Server (Port 6379)
- ✅ SIMD JSON Parser (Port 8096)
- ✅ MinIO SIMD Service (Port 8095)

---

### 3. Verify Infrastructure (30 sec)

```powershell
cd ..\sveltekit-frontend
node scripts/redis-cache-helper.mjs stats
```

**Expected output:**
```json
{
  "totalFixesStored": 0,
  "totalSignatures": 0
}
```

---

### 4. Test Fixer Agent - Dry Run (5 min)

```powershell
node --expose-gc --max-old-space-size=8192 scripts/fixer-agent-phase73.mjs --dry-run
```

**Expected:**
```
📊 Processing 500 errors (batch size: 50)
🧪 DRY RUN MODE - No files will be modified

[1/500] (0.2%) Processing TS1128:
   📄 src/global.d.ts:13:57
   💬 Declaration or statement expected...
   🔍 Found 5 similar errors (best: 72.9%)
   ✅ Fixed TS1128 at src/global.d.ts:13

...

═══════════════════════════════════════════════════
  Phase 73 Complete
═══════════════════════════════════════════════════

📊 Statistics:
   Total Processed:    500
   Successfully Fixed: 180 (36.0%)
   Cache Hits:         0
   Failed Fixes:       120
   No Similar:         200
   Errors:             0
   Total Time:         125.45s
   Avg Time/Error:     250.90ms
```

---

### 5. Apply Real Fixes (15 min) - **Optional**

Remove `--dry-run` flag:

```powershell
node --expose-gc --max-old-space-size=8192 scripts/fixer-agent-phase73.mjs
```

**Caution:** This will modify source files! Commit changes first:
```powershell
git add .
git commit -m "Pre-Phase73 checkpoint"
```

---

### 6. Check Results

```powershell
# Redis cache stats
node scripts/redis-cache-helper.mjs stats

# TypeScript check
npm run check:ultra-fast
```

**Expected:**
- ✅ Cache populated with fix patterns
- ✅ Error count reduced (16,436 → ~16,200)

---

## 🎯 Success Indicators

| Check | Expected |
|-------|----------|
| CMake build | ✅ 4 binaries created |
| Redis running | ✅ Port 6379 open |
| SIMD parser | ✅ Port 8096 responding |
| MinIO service | ✅ Port 8095 responding |
| Qdrant | ✅ 16,436 vectors ready |
| Ollama | ✅ embeddinggemma:latest |
| Dry run | ✅ 30-40% fix rate |

---

## 🐛 If Something Goes Wrong

### CMake not found
```powershell
# Download: https://cmake.org/download/
# Add to PATH: C:\Program Files\CMake\bin
```

### Redis connection failed
```powershell
cd ..\redis-latest
redis-server.exe --port 6379
```

### SIMD parser offline
```bash
curl http://localhost:8096/health
# If fails, restart: start-phase73-services.bat
```

### Qdrant collection missing
```powershell
# Re-run Phase 72 embeddings
node scripts/embed-errors-phase73.mjs --limit 20000 --batch 2000
```

---

## 📊 VS Code Tasks (Faster Method)

Press `Ctrl+Shift+P` → `Tasks: Run Task` → Choose:

1. **🔧 Phase 73: Build Go Services (CMake)**
2. **🚀 Phase 73: Start All Services**
3. **🧪 Phase 73: Health Check All Services**
4. **🤖 Phase 73: Run Fixer (Dry Run)**

---

## 📈 Performance Stats (Reference)

### Phase 72 Baseline
- Errors generated: 16,436
- Embedding time: 21 min
- Success rate: 100%

### Phase 73 Targets
- Fix rate: 30-40% (first run)
- Cache hit rate: 0% (first run), 30-40% (subsequent)
- Avg time/fix: ~250ms
- Total time (500 fixes): ~15 min

---

## 📝 Log Locations

```
phase73_logs/
├── session_<timestamp>/
│   ├── fixer.log              ← Detailed execution log
│   ├── fix-report.json        ← Statistics (JSON)
│   └── failed-fixes.json      ← Errors that couldn't be fixed

go-microservice/build/
└── bin/
    ├── simd-json-parser.exe
    ├── minio-simd-service.exe
    ├── phase73-fixer-orchestrator.exe
    └── redis-kag-manager.exe
```

---

## 🔐 Configuration File

`.env.phase72` (already exists):
```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=embeddinggemma:latest
QDRANT_URL=http://localhost:6333
REDIS_HOST=localhost
REDIS_PORT=6379
KAG_PREFIX=phase72:kag
MINIO_ENDPOINT=localhost:4002
```

---

## ✅ You're Ready!

All components are built and documented. Execute the 6 steps above to:
1. Build Go services (CMake)
2. Start infrastructure (Redis + SIMD + MinIO)
3. Verify health
4. Test with dry run
5. Apply fixes (optional)
6. Verify results

**Total time:** ~10 minutes (without production fixes)

---

**Questions?** See:
- `PHASE73_README.md` - Complete documentation
- `PHASE73_SETUP_COMPLETE.md` - This session's deliverables
- `copilot-phase73-summary.md` - Quick reference for copilot
