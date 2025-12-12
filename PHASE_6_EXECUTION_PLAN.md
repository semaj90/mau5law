# Phase 6.1 Execution Plan - Fastest Path to Green

**Status**: Backend DSN patched ✅, Routers mounted ✅, Services verified ✅
**Date**: December 11, 2025
**Time**: 15 minutes to full green

---

## 🟢 Services Status

| Service | Status | Port | Notes |
|---------|--------|------|-------|
| PostgreSQL | ✅ Running | 5432 | legal_ai_db, 4 evidence records |
| Ollama | ✅ Running | 11434 | gemma3-legal, embeddinggemma loaded |
| Embeddings | ✅ Working | 11434 | 768-d vectors generated |
| SvelteKit | ✅ Running | 5173 | Dev server ready |
| Qdrant | ❌ Not running | 6333 | **NEEDS START** |
| Redis | ✅ Running | 6379 | (assumed) |
| Neo4j | ✅ Running | 7687 | (assumed) |

---

## 🚀 Immediate Actions (5 minutes)

### 1. Start Qdrant (if using Docker)

```powershell
# Option A: Docker Compose
docker-compose -f docker-compose.deeds.yml up -d qdrant

# Option B: Standalone Docker
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant:latest

# Option C: Windows native (if installed)
qdrant.exe
```

**Verify**:
```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/health" -TimeoutSec 5
Write-Host "Qdrant Status: $($response.StatusCode)"
```

### 2. Create Qdrant Collection (if needed)

```powershell
$body = @{
  name = "phase72_evidence_embeddings"
  vectors = @{
    size = 768
    distance = "Cosine"
  }
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/collections" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 10

Write-Host "Collection created: $($response.StatusCode)"
```

### 3. Seed Sample Evidence to Qdrant

```powershell
# Generate embedding for sample evidence
$body = @{
  model = "embeddinggemma:latest"
  prompt = "CPS removal case involving child custody and parental rights"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/embeddings" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 30

$embedding = ($response.Content | ConvertFrom-Json).embedding

# Insert into Qdrant
$point = @{
  id = 1
  vector = $embedding
  payload = @{
    case_id = "case-001"
    evidence_id = "evidence-001"
    text = "CPS removal case involving child custody and parental rights"
    source = "sample"
  }
} | ConvertTo-Json

$body = @{
  points = @($point)
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/collections/phase72_evidence_embeddings/points" `
  -Method PUT `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 10

Write-Host "Point inserted: $($response.StatusCode)"
```

---

## 🧪 Test Sequence (10 minutes)

### Test 1: Backend Search Endpoint

```powershell
$body = @{
  query = "What are the key legal issues in child custody?"
  top_k = 5
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/search" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 30

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2
```

**Expected**: `results` array with documents and scores

### Test 2: SvelteKit Context-Chat

```powershell
$body = @{
  sessionId = "test-session-001"
  userId = "test-user-001"
  caseId = $null
  message = "What are the key legal issues in child custody cases?"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:5173/api/ai/yorha/context-chat" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -TimeoutSec 60

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
```

**Expected**: `answer`, `keywords`, `suggestions`, `latencyMs`

### Test 3: Evidence Board API

```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:5173/api/yorha/evidence/nodes" `
  -Method GET `
  -TimeoutSec 10

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2
```

**Expected**: Array of evidence nodes

### Test 4: Database Persistence

```powershell
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT COUNT(*) as chat_turns FROM chat_turns;"
```

**Expected**: `chat_turns > 0`

---

## 📋 Checklist

- [ ] Qdrant started and healthy
- [ ] Qdrant collection created
- [ ] Sample evidence seeded to Qdrant
- [ ] Backend /api/search endpoint works
- [ ] SvelteKit /api/ai/yorha/context-chat endpoint works
- [ ] Evidence Board API returns nodes
- [ ] Database persistence verified
- [ ] No console errors
- [ ] All latencies < 60 seconds

---

## 🎯 Success Criteria

✅ **All tests pass** = Phase 6.1 complete and ready for deployment

---

## 📊 Architecture Verification

```
User Query
    ↓
SvelteKit /api/ai/yorha/context-chat
    ↓
contextualChat() function
    ├─ getContextFromRag()
    │   ├─ generateEmbedding() → Ollama embeddinggemma
    │   └─ Qdrant search (case_id filter)
    ├─ callOllamaChat() → Ollama gemma3-legal
    ├─ extractKeywords() → Ollama analysis
    └─ generateSuggestions() → Based on keywords
    ↓
Save to PostgreSQL (chat_turns, chat_turn_evidence)
    ↓
Return response to UI
    ↓
Display answer, keywords, suggestions
```

---

## 🔧 Troubleshooting

### Qdrant Connection Refused
```powershell
# Start Qdrant
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant:latest

# Wait for startup
Start-Sleep -Seconds 5

# Verify
Invoke-WebRequest -Uri "http://127.0.0.1:6333/health"
```

### Collection Not Found
```powershell
# List collections
$response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/collections"
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty result
```

### Embedding Generation Timeout
```powershell
# Check Ollama
Get-Process ollama

# Restart if needed
Stop-Process -Name ollama -Force
Start-Process ollama
Start-Sleep -Seconds 30
```

---

## 📝 Files Modified

✅ `backend/chat_service.py` - DATABASE_URL config
✅ `backend/progress_tracker.py` - DATABASE_URL config
✅ `backend/services/legal_complaint_ingestion.py` - DATABASE_URL config
✅ `backend/api/main.py` - Routers mounted

---

## 🚀 Next Phase

After Phase 6.1 is green:

1. **Phase 6.2**: Add evidence upload to MinIO
2. **Phase 6.3**: Add Docling PDF parsing
3. **Phase 7**: Neo4j knowledge graph integration

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `docker-compose -f docker-compose.deeds.yml up -d qdrant` | Start Qdrant |
| `Invoke-WebRequest -Uri "http://127.0.0.1:6333/health"` | Check Qdrant |
| `npm run dev` | Start SvelteKit |
| `psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT 1"` | Test PostgreSQL |

---

**Status**: Ready to execute. Start Qdrant and run tests!
