# ⚡ RUN THESE TESTS NOW

Copy/paste into PowerShell:

```powershell
# Test 1: Warmup (30-60s)
$body = @{ model = "nomic-embed-text:latest"; prompt = "warmup" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/embeddings" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 180

# Test 2: Homepage (1s)
Invoke-WebRequest -Uri "http://localhost:5176/" -UseBasicParsing

# Test 3: Context-Chat (60-120s)
$body = @{ message = "Test PostgreSQL text[] array fix for suggestions"; sessionId = "test-session"; userId = "test-user" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5176/api/ai/yorha/context-chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 180
```

**Expected**: All 3 pass, no errors.

**If pass**: `git add . && git commit -m "Phase 6.1 complete"`

**If fail**: Check **PHASE_6_1_ISSUES_AND_FIXES.md**
