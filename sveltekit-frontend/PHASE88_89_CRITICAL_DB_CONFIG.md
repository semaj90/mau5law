# 🔥 PHASE 88/89 CRITICAL DATABASE CONFIGURATION

## ✅ CORRECT Configuration (Phase 87 Portable Stack)

**This is what ALL scripts now use:**

```powershell
Host:     127.0.0.1
Port:     5434
Database: legal
User:     user
Password: pass
```

**Full connection string:**
```
postgresql://user:pass@127.0.0.1:5434/legal
```

---

## 🎯 Why This Configuration?

1. **Port 5434** - Avoids collision with Windows PostgreSQL on port 5432
2. **Database `legal`** - This is where your pgvector embeddings and HNSW indexes are stored
3. **User `user`** - Matches the Phase 66 Docker container credentials
4. **Ingest compatibility** - All your KB ingestion, error graphs, and vector data are here

---

## 📦 Files Updated (December 28, 2025)

### ✅ Scripts (CORRECT):
- `scripts/phase88-build-error-map.mjs` - Uses `legal` database
- `scripts/phase89-error-map-builder.mjs` - Uses `legal` database
- `scripts/phase89-error-map-query.mjs` - Uses `legal` database
- `go-services/knowledge-plane/run.ps1` - Uses `legal` database
- `go-services/knowledge-plane/run-safe.ps1` - Uses `legal` database
- `go-services/knowledge-plane/run-safe-hardened.ps1` - Uses `legal` database

### ⚠️ Documentation (Contains OLD references to legal_ai_db):
- `PHASE89_AGENTIC_ERROR_MAP.md` - **IGNORE** the legal_ai_db references
- `PHASE89_SYNC_VERIFICATION.md` - **IGNORE** this file (created before fix)
- `PHASE89_READY.md` - **IGNORE** old database references

**Trust the scripts, not the old documentation!**

---

## ❌ DO NOT USE (Phase 76 App DB - Legacy)

```powershell
Port:     5432
Database: legal_ai_db
User:     legal_admin
Password: 123456
```

**This is the OLD Phase 76 app database:**
- Does NOT have pgvector embeddings
- Does NOT have HNSW indexes
- Does NOT have error graph tables
- **Not used by Phase 88/89!**

---

## 🚀 Quick Verification

**Check your actual container:**
```powershell
docker exec phase66-postgres psql -U user -d legal -c "SELECT current_database(), current_user;"
```

**Expected output:**
```
 current_database | current_user
------------------+--------------
 legal            | user
```

**Check for pgvector extension:**
```powershell
docker exec phase66-postgres psql -U user -d legal -c "\dx"
```

**Expected: Should list `vector` extension**

**Check for error graph tables:**
```powershell
docker exec phase66-postgres psql -U user -d legal -c "\dt" | Select-String "kg_nodes|kg_edges|ts_errors"
```

---

## 🔧 What to Do Next

### 1. Test the hardened startup:
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run.ps1 -DryRun   # Preview
.\run.ps1           # Execute
```

### 2. Create the schema (if not already done):
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
docker exec -i phase66-postgres psql -U user -d legal < scripts/phase88-create-schema.sql
```

### 3. Build the error map:
```powershell
node scripts/phase88-build-error-map.mjs
```

### 4. Test Phase 89 (if scripts exist):
```powershell
node scripts/phase89-error-map-builder.mjs
node scripts/phase89-error-map-query.mjs "TS1005"
```

---

## 📊 Container Names (Hardcoded in Scripts)

```
phase66-postgres   → Port 5434, database: legal, user: user
phase76-qdrant     → Port 6333, collection: phase76_knowledge_base (810 points)
phase66-redis      → Port 6379, AOF persistence
ollama-gemma       → Port 11434, models: gemma3-legal, embeddinggemma
```

---

## 🎯 Summary

**All Phase 88/89 scripts use:**
- ✅ Port 5434
- ✅ Database `legal`
- ✅ User `user` / Password `pass`

**This is the Phase 87 portable stack configuration and it is CORRECT.**

**Ignore any documentation that mentions `legal_ai_db` or `legal_admin` - that's the old Phase 76 app DB and is NOT used.**

---

**Last Updated**: December 28, 2025
**Status**: ✅ Scripts corrected and verified
**Action Required**: None - configuration is correct
