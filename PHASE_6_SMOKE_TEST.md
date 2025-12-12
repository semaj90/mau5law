# Phase 6 Smoke Test - Fastest Path to Green

**Status**: Backend DSN patched, routers mounted, ready for verification
**Time**: 15 minutes
**Goal**: Verify all systems connected and working end-to-end

---

## ✅ Step 1: Verify Services Running (2 min)

```powershell
# Check PostgreSQL
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT COUNT(*) as evidence_count FROM evidence;"

# Expected: evidence_count = 4 (or more)
```

**Status**: ✅ PostgreSQL has 4 evidence records

---

## ✅ Step 2: Verify Qdrant Collection (2 min)

```powershell
# Check Qdrant health
$ProgressPreference = 'SilentlyContinue'
$response = Invoke-WebRequest -Uri "http://localhost:6333/collections" -TimeoutSec 5 -ErrorAction SilentlyContinue
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty collections | Select-Object name

# Expected: phase72_evidence_embeddings collection exists
```

**Status**: ⏳ Need to verify Qdrant is responding

---

## ✅ Step 3: Test Backend Search Endpoint (3 min)

```powershell
# Test agentic search
$body = @{
  query = "What are the key legal issues in child custody?"
  top_k = 5
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/search" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 30 -ErrorAction SilentlyContinue

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2

# Expected: results array with documents and scores
```

**Status**: ⏳ Need to test

---

## ✅ Step 4: Test SvelteKit Context-Chat Endpoint (3 min)

```powershell
# Test context-chat with case filtering
$body = @{
  sessionId = "test-session-001"
  userId = "test-user-001"
  caseId = $null
  message = "Summarize the key legal issues in child custody cases."
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5173/api/ai/yorha/context-chat" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 60 -ErrorAction SilentlyContinue

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3

# Expected: answer, keywords, suggestions, latencyMs
```

**Status**: ⏳ Need to test (Ollama timeout issue)

---

## ✅ Step 5: Test Evidence Board API (2 min)

```powershell
# Get evidence nodes
$response = Invoke-WebRequest -Uri "http://localhost:5173/api/yorha/evidence/nodes" `
  -Method GET `
  -TimeoutSec 10 -ErrorAction SilentlyContinue

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2

# Expected: array of evidence nodes with id, name, type, position
```

**Status**: ⏳ Need to test

---

## ✅ Step 6: Test Evidence-Chat Linking (2 min)

```powershell
# Create a chat turn with evidence
$body = @{
  sessionId = "test-session-001"
  userId = "test-user-001"
  caseId = "case-001"
  message = "What evidence supports this claim?"
  evidenceIds = @("evidence-001", "evidence-002")
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5173/api/ai/yorha/context-chat" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 60 -ErrorAction SilentlyContinue

# Verify chat_turn_evidence table has entries
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT COUNT(*) as links FROM chat_turn_evidence;"

# Expected: links > 0
```

**Status**: ⏳ Need to test

---

## 🔧 Troubleshooting

### Ollama Timeout (45s)
**Issue**: Context-chat endpoint times out
**Cause**: Ollama not responding or model not loaded
**Fix**:
```powershell
# Check Ollama
Get-Process ollama | Select-Object ProcessName, Id, CPU

# Restart Ollama if needed
Stop-Process -Name ollama -Force
Start-Process ollama

# Wait 30s for startup
Start-Sleep -Seconds 30

# Verify model loaded
$response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty models | Select-Object name
```

### Qdrant Not Responding
**Issue**: Qdrant health check fails
**Cause**: Qdrant service not running
**Fix**:
```powershell
# Check Qdrant
Get-Process qdrant -ErrorAction SilentlyContinue

# Or check via Docker
docker ps | grep qdrant

# Restart if needed
docker restart qdrant
```

### PostgreSQL Connection Error
**Issue**: "FATAL: password authentication failed"
**Cause**: Wrong password or user
**Fix**:
```powershell
# Verify credentials in .env
cat .env | grep -E "PG_|DATABASE_URL"

# Test connection
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT 1"
```

---

## 📊 Success Criteria

- [x] PostgreSQL has evidence records
- [ ] Qdrant collection exists with embeddings
- [ ] Backend /api/search endpoint works
- [ ] SvelteKit /api/ai/yorha/context-chat endpoint works
- [ ] Evidence Board API returns nodes
- [ ] Evidence-chat linking persists to database
- [ ] No console errors
- [ ] Latency < 60 seconds

---

## 🚀 Next Steps After Green

1. **Commit**: `git add . && git commit -m "Phase 6.1: DSN patching and router mounting"`
2. **Deploy**: Push to staging/production
3. **Monitor**: Check logs for errors
4. **Phase 6.2**: Add evidence upload to MinIO

---

## 📝 Files Modified

- ✅ `backend/chat_service.py` - Added DATABASE_URL config
- ✅ `backend/progress_tracker.py` - Added DATABASE_URL config
- ✅ `backend/services/legal_complaint_ingestion.py` - Added DATABASE_URL config
- ✅ `backend/api/main.py` - Routers already mounted

---

## 🎯 Current Status

**Backend**: ✅ DSN patched, routers mounted
**Frontend**: ✅ Context-chat endpoint ready
**Database**: ✅ PostgreSQL with 4 evidence records
**RAG**: ⏳ Qdrant collection needs verification
**Ollama**: ⏳ Model loading issue needs investigation

---

**Ready to test!**
