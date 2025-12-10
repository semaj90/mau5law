# Immediate Action Checklist - Phase 4-5 Verification

**Time to Complete**: ~10 minutes
**Status**: Ready to execute

---

## ✅ Step 1: Verify Phase 4 FK Constraint (2 minutes)

### Run Migration
```powershell
cd sveltekit-frontend
node -r dotenv/config scripts/run-safe-phase4-legal-docs.mjs
```

**Expected Output**:
```
🚀 Starting Safe Phase 4 – legal_documents.created_by...
📡 Connecting to database...
⚡ Executing SQL file: drizzle/safe_phase4_legal_documents_created_by.sql
✅ legal_documents.created_by column + FK are in place
📋 To verify, run: psql -U postgres -h localhost -d legal_ai_db -c '\d "legal_documents"'
```

### Verify in Database
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c '\d "legal_documents"'
```

**Expected Output** (should include):
```
Column      | Type | Modifiers
created_by  | uuid |
...
Constraints:
    "legal_documents_created_by_users_id_fk" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
```

---

## ✅ Step 2: Start Dev Server (2 minutes)

### Start Server
```powershell
cd sveltekit-frontend
npm run dev
```

**Expected Output**:
```
VITE v6.4.1 ready in 7 seconds

➜  Local:   http://localhost:5173/
➜  press h to show help
```

**Keep this terminal open** - you'll need it for testing.

---

## ✅ Step 3: Test API Endpoint (3 minutes)

### Open New PowerShell Terminal

### Test Context Chat API
```powershell
$body = @{
    sessionId = "test-001"
    userId = "test-001"
    caseId = $null
    message = "Summarize CPS removal issues"
} | ConvertTo-Json

curl.exe -X POST http://localhost:5173/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

**Expected Response** (200 OK):
```json
{
  "turnId": "550e8400-e29b-41d4-a716-446655440000",
  "answer": "CPS removal cases involve...",
  "keywords": ["CPS", "removal", "custody", "child welfare", "legal proceedings"],
  "keyPhrases": ["child protective services", "removal proceedings", "parental rights"],
  "suggestions": [
    {
      "query": "What are the implications of \"CPS\" in this case?",
      "reason": "Explore the key term \"CPS\" further",
      "score": 0.9
    },
    {
      "query": "Can you elaborate on \"child protective services\"?",
      "reason": "Dive deeper into the key phrase",
      "score": 0.85
    },
    {
      "query": "How do CPS and removal interact in this context?",
      "reason": "Explore relationships between key terms",
      "score": 0.8
    }
  ],
  "latencyMs": 190000
}
```

**If you get 200 OK**: ✅ API is working!

**If you get an error**:
- Check dev server terminal for error messages
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Verify database connection: `psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"`

---

## ✅ Step 4: Open Terminal UI (2 minutes)

### Open Browser
```
http://localhost:5173/terminal
```

**Expected UI**:
- Chat message area (showing previous messages)
- Message input field at bottom
- Keyword chips (if any messages have been sent)
- Suggestion buttons (if any suggestions generated)

### Send Test Message
1. Type: "What are the key issues in this case?"
2. Click Send or press Enter
3. Wait for response (may take 30-60 seconds for LLM processing)

**Expected Result**:
- Message appears in chat
- Keywords extracted and shown as chips
- Suggestions appear as buttons
- Response from LLM appears below

---

## ✅ Step 5: Verify Database Persistence (1 minute)

### Check Chat Turn Was Saved
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT id, message, extracted_keywords FROM chat_turns ORDER BY created_at DESC LIMIT 1;"
```

**Expected Output**:
```
                  id                  |           message            |     extracted_keywords
--------------------------------------+------------------------------+---------------------------
 550e8400-e29b-41d4-a716-446655440000 | What are the key issues...   | ["issue", "key", "case"]
```

✅ If you see a row: Database persistence is working!

---

## Summary

| Step | Task | Status | Time |
|------|------|--------|------|
| 1 | Verify Phase 4 FK | ⏳ Ready | 2 min |
| 2 | Start Dev Server | ⏳ Ready | 2 min |
| 3 | Test API Endpoint | ⏳ Ready | 3 min |
| 4 | Open Terminal UI | ⏳ Ready | 2 min |
| 5 | Verify DB Persistence | ⏳ Ready | 1 min |
| **Total** | **All Verification** | **⏳ Ready** | **~10 min** |

---

## What's Next After Verification

Once all steps pass:

### Short Term (30 minutes)
- [ ] Manual UI testing (send multiple messages)
- [ ] Test Docling with file upload
- [ ] Verify keyword chips work
- [ ] Verify suggestion buttons work

### Medium Term (4-6 hours)
- [ ] Build evidence board page (`/evidence-board`)
- [ ] Create evidence card component
- [ ] Wire "Ask AI" button
- [ ] Add Superforms/Zod forms

### Long Term (Phase 7+)
- [ ] Performance optimization
- [ ] VLM fine-tuning
- [ ] Advanced search
- [ ] Analytics dashboard

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Database connection error | Check DATABASE_URL in `.env` |
| Ollama timeout | Verify Ollama running: `curl http://localhost:11434/api/tags` |
| Qdrant dimension mismatch | Verify EMBEDDING_MODEL=embeddinggemma:latest |
| Dev server won't start | Check port 5173 is free: `netstat -ano \| findstr :5173` |
| API returns 500 error | Check dev server terminal for error messages |

---

**Ready to execute?** Start with Step 1! 🚀

