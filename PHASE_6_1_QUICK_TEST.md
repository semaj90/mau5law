# Phase 6.1 Quick Test Guide

**Goal:** Verify Evidence Board "Ask AI" works end-to-end
**Time:** 10-15 minutes
**Prerequisites:** Ollama, Qdrant, PostgreSQL running

---

## ✅ Pre-Flight Checks (2 minutes)

### 1. Verify Services Running
```bash
# Ollama
curl http://localhost:11434/api/tags

# Qdrant
curl http://localhost:6333/collections

# PostgreSQL
psql -U legal_admin -h localhost legal_ai_db -c "SELECT 1"
```

All should return 200 OK.

### 2. Verify Environment Variables
```bash
# Check .env has these set:
grep "OLLAMA_MODEL=" .env
grep "OLLAMA_EMBED_MODEL=" .env
grep "QDRANT_URL=" .env
grep "DATABASE_URL=" .env
```

Should show:
```
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest
QDRANT_URL=http://localhost:6333
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
```

---

## 🚀 Test 1: Endpoint Test (3 minutes)

### Start Dev Server
```bash
cd sveltekit-frontend
npm run dev
```

Wait for "Local: http://localhost:5173"

### Test Endpoint
```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the key legal issues?","caseId":null}'
```

### Expected Response
```json
{
  "turnId": "uuid-here",
  "answer": "Based on the context...",
  "keywords": ["legal", "issues"],
  "keyPhrases": ["key legal issues"],
  "suggestions": [
    {
      "query": "Explore: key legal issues",
      "reason": "Key phrase from analysis",
      "score": 0.8
    }
  ],
  "latencyMs": 1234
}
```

**Status:** ✅ If you get this response, endpoint is working

---

## 🎮 Test 2: Evidence Board UI (5 minutes)

### 1. Navigate to Evidence Board
```
http://localhost:5173/cases/test-case-123/evidence
```

### 2. Add Test Evidence (Optional)
If no evidence exists:
1. Scroll to "Add evidence" section at bottom
2. Fill in:
   - Title: "Test Evidence"
   - Type: "report"
   - Summary: "This is test evidence for the case"
3. Click "Save"

### 3. Ask AI Question
1. Type in "Ask AI about selected evidence" textarea:
   ```
   What are the main points in this evidence?
   ```
2. Click "⚖️ Ask AI"

### 4. Verify Results Display
You should see:
- ✅ Green box with "⚖️ AI Analysis" header
- ✅ Answer text displayed
- ✅ Keywords as chips (e.g., `#evidence`, `#points`)
- ✅ Follow-up suggestions as buttons
- ✅ Response time in milliseconds

**Status:** ✅ If all display, UI is working

---

## 🔗 Test 3: Suggestion Click (2 minutes)

### 1. Click a Suggestion
Click one of the suggestion buttons (e.g., "→ Explore: main points")

### 2. Verify Textarea Updated
The textarea should be populated with the suggestion text

### 3. Ask Follow-up
Click "⚖️ Ask AI" again

### 4. Verify New Answer
You should get a new answer based on the suggestion

**Status:** ✅ If suggestion populates and new answer appears, interaction is working

---

## 💾 Test 4: Database Persistence (2 minutes)

### 1. Query Chat Turns
```sql
SELECT id, case_id, message, answer, extracted_keywords, suggestions
FROM chat_turns
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Verify Results
You should see:
- ✅ `id` (UUID)
- ✅ `case_id` (matches your case)
- ✅ `message` (your question)
- ✅ `answer` (AI response)
- ✅ `extracted_keywords` (array of keywords)
- ✅ `suggestions` (JSON array)

### 3. Query Evidence Linking
```sql
SELECT * FROM chat_turn_evidence
WHERE chat_turn_id = '[turn-id-from-above]';
```

### 4. Verify Linking
You should see:
- ✅ Rows linking chat turn to evidence
- ✅ `role` = 'retrieved'
- ✅ `evidence_id` populated

**Status:** ✅ If data persists, database integration is working

---

## 🎯 Success Criteria

All tests pass if:

- [x] Endpoint returns 200 with correct response shape
- [x] Evidence Board displays result
- [x] Keywords show as chips
- [x] Suggestions display as buttons
- [x] Suggestion click populates textarea
- [x] Follow-up question works
- [x] Chat turns saved to database
- [x] Evidence linking created
- [x] No console errors
- [x] Latency < 5 seconds

---

## 🐛 Troubleshooting

### Endpoint returns 500
```bash
# Check server logs for:
# - OLLAMA_MODEL not set
# - Ollama connection failed
# - Database connection failed

# Verify Ollama
curl http://localhost:11434/api/tags

# Verify database
psql -U legal_admin -h localhost legal_ai_db -c "SELECT 1"
```

### No results display in UI
- Check browser console for errors (F12)
- Check server logs for API errors
- Verify endpoint test works first

### Keywords not showing
- Check server logs for extraction errors
- Verify OLLAMA_MODEL supports instruction following
- Try endpoint test to see if keywords are returned

### Suggestions not clickable
- Check browser console for JavaScript errors
- Verify EvidenceBoardPane.svelte compiled correctly
- Try refreshing page

### Database errors
- Verify legal_ai_db exists
- Check DATABASE_URL in .env
- Verify chat_turns table exists: `\dt chat_turns`

---

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Endpoint latency | < 5s | ⏳ |
| UI response time | < 1s | ⏳ |
| Database insert | < 100ms | ⏳ |
| Total end-to-end | < 6s | ⏳ |

---

## 📝 Test Log

Use this to track your testing:

```
Test 1: Endpoint
- [ ] Ollama running
- [ ] Qdrant running
- [ ] PostgreSQL running
- [ ] Endpoint returns 200
- [ ] Response has correct shape

Test 2: Evidence Board UI
- [ ] Page loads
- [ ] Evidence displays
- [ ] Ask AI button works
- [ ] Result displays
- [ ] Keywords show
- [ ] Suggestions show

Test 3: Suggestion Click
- [ ] Suggestion populates textarea
- [ ] Follow-up question works
- [ ] New answer displays

Test 4: Database
- [ ] Chat turn saved
- [ ] Keywords persisted
- [ ] Evidence linked
- [ ] Query returns data
```

---

## 🎉 Next Steps

Once all tests pass:

1. **Optional:** Run full test suite from `PHASE_6_1_INTEGRATION_CHECKLIST.md`
2. **Next:** Phase 6.2 - Add evidence upload to MinIO
3. **Then:** Phase 6.3 - Add evidence annotations

---

**Status: Ready to test** ✅

