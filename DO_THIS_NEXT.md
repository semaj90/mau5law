# Phase 6.1 - Do This Next

**Status**: ✅ Infrastructure Complete - Ready for Testing
**Time**: 15-20 minutes to full green

---

## 🎯 Current State

✅ All services running (PostgreSQL, Ollama, Qdrant, Redis, MinIO, RabbitMQ)
✅ Backend API healthy (port 8000)
✅ SvelteKit running (port 5173)
✅ Code fixes applied (Svelte 5 layout, embedding timeout)
✅ Qdrant collection created (phase72_evidence_embeddings)
✅ Database verified (legal_ai_db, 4 evidence records)

⚠️ Embedding model needs warm-up (first call is slow)
⏳ Testing needed to verify end-to-end functionality

---

## 🚀 Action Plan (Copy & Paste These Commands)

### Step 1: Pre-warm Embedding Model (5 minutes)

```powershell
# This loads the embedding model into memory
# First call will take 30-60 seconds, then it's fast

Write-Host "`n=== Warming up embedding model ===" -ForegroundColor Cyan

$body = @{
  model = "embeddinggemma:latest"
  prompt = "This is a warmup query to load the embedding model into memory for faster subsequent requests"
} | ConvertTo-Json

Write-Host "Sending warmup request..." -ForegroundColor Yellow
$startTime = Get-Date

try {
  $result = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/embeddings" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -TimeoutSec 180

  $duration = (Get-Date) - $startTime
  Write-Host "✅ Model warmed up in $($duration.TotalSeconds) seconds!" -ForegroundColor Green
  Write-Host "Embedding dimensions: $($result.embeddings[0].Length)" -ForegroundColor Green
} catch {
  Write-Host "❌ Warmup failed: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

### Step 2: Test Homepage (1 minute)

```powershell
Write-Host "`n=== Testing homepage ===" -ForegroundColor Cyan

try {
  $response = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 10
  Write-Host "✅ Homepage Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "❌ Homepage Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

### Step 3: Test Context-Chat Endpoint (5 minutes)

```powershell
Write-Host "`n=== Testing context-chat endpoint ===" -ForegroundColor Cyan

$body = @{
  sessionId = "test-session-001"
  userId = "test-user"
  caseId = $null
  message = "What are the key legal issues in this case?"
} | ConvertTo-Json

Write-Host "Sending chat request..." -ForegroundColor Yellow
$startTime = Get-Date

try {
  $response = Invoke-RestMethod -Uri "http://localhost:5173/api/ai/yorha/context-chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -TimeoutSec 180

  $duration = (Get-Date) - $startTime
  Write-Host "✅ Response received in $($duration.TotalSeconds) seconds!" -ForegroundColor Green
  Write-Host "Turn ID: $($response.turnId)" -ForegroundColor Cyan
  Write-Host "Answer: $($response.answer.Substring(0, [Math]::Min(100, $response.answer.Length)))..." -ForegroundColor White
  Write-Host "Keywords: $($response.keywords -join ', ')" -ForegroundColor Yellow
  Write-Host "Suggestions: $($response.suggestions.Count) suggestions" -ForegroundColor Yellow
  Write-Host "Latency: $($response.latencyMs)ms" -ForegroundColor Cyan
} catch {
  Write-Host "❌ Chat Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Check server logs for details" -ForegroundColor Yellow
}
```

---

### Step 4: Verify Database Persistence (1 minute)

```powershell
Write-Host "`n=== Verifying database persistence ===" -ForegroundColor Cyan

$env:PGPASSWORD="123456"
$count = psql -U legal_admin -h localhost -d legal_ai_db -t -c "SELECT COUNT(*) FROM chat_turns;" 2>&1

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Chat turns in database: $($count.Trim())" -ForegroundColor Green
} else {
  Write-Host "❌ Database query failed" -ForegroundColor Red
}
```

---

### Step 5: Test UI (5 minutes - Manual)

1. Open browser: `http://localhost:5173/`
2. Verify homepage loads without errors
3. Navigate to evidence board (if available)
4. Test AI chat functionality
5. Verify results display correctly

---

## 📊 Expected Results

### Step 1: Embedding Warmup
- ✅ First call: 30-60 seconds
- ✅ Embedding dimensions: 768
- ✅ No errors

### Step 2: Homepage
- ✅ Status: 200 OK
- ✅ No layout errors

### Step 3: Context-Chat
- ✅ Response time: 60-120 seconds (first call)
- ✅ Turn ID: UUID
- ✅ Answer: Text response
- ✅ Keywords: Array of strings
- ✅ Suggestions: Array of follow-up questions
- ✅ Latency: < 120000ms

### Step 4: Database
- ✅ Chat turns count: > 0 (after Step 3)

### Step 5: UI
- ✅ Homepage renders
- ✅ No console errors
- ✅ AI chat works
- ✅ Results display

---

## 🐛 Troubleshooting

### If Embedding Warmup Fails
```powershell
# Check Ollama status
curl http://localhost:11434/api/tags

# Try alternative model (faster)
$body = @{ model = "nomic-embed-text:latest"; prompt = "warmup" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/embeddings" -Method Post -Body $body -ContentType "application/json"
```

### If Homepage Fails
```powershell
# Check SvelteKit logs
# Look for layout errors in the dev server output
# Restart if needed:
# Ctrl+C in the terminal running npm run dev
# Then: npm run dev
```

### If Context-Chat Fails
```powershell
# Check server logs for specific error
# Common issues:
# 1. Embedding timeout - increase OLLAMA_EMBED_TIMEOUT_MS
# 2. Chat timeout - increase OLLAMA_TIMEOUT_MS
# 3. Database connection - check DATABASE_URL
```

### If Database Query Fails
```powershell
# Verify PostgreSQL is running
docker ps | Select-String postgres

# Test connection
$env:PGPASSWORD="123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT 1;"
```

---

## 🎯 Success Criteria

After running all steps, you should have:

- [x] Embedding model warmed up (< 60s)
- [x] Homepage loading (200 OK)
- [x] Context-chat working (< 120s)
- [x] Database persisting (chat_turns > 0)
- [x] UI functional (manual verification)

---

## 📝 After Testing

### If All Tests Pass ✅
1. Commit changes:
   ```bash
   git add .
   git commit -m "Phase 6.1: Infrastructure complete, all tests passing"
   git push
   ```

2. Build application:
   ```bash
   cd sveltekit-frontend
   npm run build
   ```

3. Deploy to staging/production

### If Tests Fail ❌
1. Check error messages
2. Review server logs
3. Consult **PHASE_6_1_ISSUES_AND_FIXES.md**
4. Apply fixes and re-test

---

## 📚 Documentation

- **PHASE_6_1_FINAL_SUMMARY.md** - Complete summary
- **PHASE_6_1_ISSUES_AND_FIXES.md** - Known issues and solutions
- **PHASE_6_1_CURRENT_STATUS.md** - Current state verification
- **PHASE_6_MASTER_INDEX.md** - Master documentation index

---

## 🚀 Quick Start (All Steps Combined)

```powershell
# Run all tests in sequence
Write-Host "`n=== PHASE 6.1 TESTING SEQUENCE ===" -ForegroundColor Magenta

# Step 1: Warmup
Write-Host "`n[1/4] Warming up embedding model..." -ForegroundColor Cyan
$body = @{ model = "embeddinggemma:latest"; prompt = "warmup" } | ConvertTo-Json
try {
  $result = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/embeddings" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 180
  Write-Host "✅ Model warmed up! Dimensions: $($result.embeddings[0].Length)" -ForegroundColor Green
} catch {
  Write-Host "❌ Warmup failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Homepage
Write-Host "`n[2/4] Testing homepage..." -ForegroundColor Cyan
try {
  $response = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 10
  Write-Host "✅ Homepage: $($response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "❌ Homepage failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Context-Chat
Write-Host "`n[3/4] Testing context-chat..." -ForegroundColor Cyan
$body = @{ sessionId = "test"; userId = "test"; message = "Test query" } | ConvertTo-Json
try {
  $response = Invoke-RestMethod -Uri "http://localhost:5173/api/ai/yorha/context-chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 180
  Write-Host "✅ Chat works! Turn ID: $($response.turnId)" -ForegroundColor Green
} catch {
  Write-Host "❌ Chat failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Database
Write-Host "`n[4/4] Checking database..." -ForegroundColor Cyan
$env:PGPASSWORD="123456"
$count = psql -U legal_admin -h localhost -d legal_ai_db -t -c "SELECT COUNT(*) FROM chat_turns;" 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Database: $($count.Trim()) chat turns" -ForegroundColor Green
} else {
  Write-Host "❌ Database query failed" -ForegroundColor Red
}

Write-Host "`n=== TESTING COMPLETE ===" -ForegroundColor Magenta
```

---

**NEXT ACTION**: Copy and paste the commands above into PowerShell

---

**Last Updated**: December 11, 2025
**Time to Complete**: 15-20 minutes
