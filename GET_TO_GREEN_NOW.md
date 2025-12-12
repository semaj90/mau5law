# GET TO GREEN NOW - 5 Minute Quick Start

**Goal**: Get Phase 6.1 to fully green status
**Time**: 5 minutes
**Status**: All backend work done, just need to start Qdrant and test

---

## 🚀 Step 1: Start Qdrant (1 minute)

```powershell
# Start Qdrant in Docker
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant:latest

# Wait for startup
Start-Sleep -Seconds 3

# Verify it's running
$response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/health" -TimeoutSec 5
Write-Host "✅ Qdrant Status: $($response.StatusCode)"
```

---

## 🚀 Step 2: Create Qdrant Collection (1 minute)

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

Write-Host "✅ Collection created: $($response.StatusCode)"
```

---

## 🚀 Step 3: Test Backend Search (1 minute)

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

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ Backend search works: $($json.results.Count) results"
```

---

## 🚀 Step 4: Test SvelteKit Context-Chat (1 minute)

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

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ Context-chat works:"
Write-Host "   Answer: $($json.answer.Substring(0, 50))..."
Write-Host "   Keywords: $($json.keywords -join ', ')"
Write-Host "   Latency: $($json.latencyMs)ms"
```

---

## 🚀 Step 5: Verify Database Persistence (1 minute)

```powershell
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT COUNT(*) as chat_turns FROM chat_turns;"

# Expected: chat_turns > 0
```

---

## ✅ Success Checklist

- [ ] Qdrant started (Status 200)
- [ ] Collection created (Status 200)
- [ ] Backend search works (results returned)
- [ ] Context-chat works (answer + keywords + latency)
- [ ] Database persistence verified (chat_turns > 0)

---

## 🎯 If All Green

```powershell
# Commit changes
git add .
git commit -m "Phase 6.1: Backend DSN patching and router mounting complete"

# Push to repo
git push origin main
```

---

## 🔧 If Something Fails

### Qdrant not starting
```powershell
# Check if port 6333 is in use
Get-NetTCPConnection -LocalPort 6333 -ErrorAction SilentlyContinue

# Kill existing process if needed
docker stop qdrant
docker rm qdrant

# Try again
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant:latest
```

### Backend search fails
```powershell
# Check if backend is running on port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# If not, start it:
# cd backend && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Context-chat times out
```powershell
# Check Ollama
Get-Process ollama

# Check if model is loaded
$response = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags"
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty models | Select-Object name
```

### Database connection fails
```powershell
# Test connection
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT 1"

# If fails, check .env for correct credentials
cat .env | grep -E "PG_|DATABASE_URL"
```

---

## 📊 Expected Output

### Step 3 (Backend Search)
```
✅ Backend search works: 5 results
```

### Step 4 (Context-Chat)
```
✅ Context-chat works:
   Answer: The key legal issues in child custody cases typically involve...
   Keywords: custody, parental rights, child welfare, legal standards
   Latency: 3245ms
```

### Step 5 (Database)
```
 chat_turns
------------
          1
(1 row)
```

---

## 🎉 You're Done!

All 5 steps complete = Phase 6.1 fully green ✅

---

**Time**: 5 minutes
**Status**: Ready to deploy
**Next**: Phase 6.2 (Evidence upload to MinIO)
