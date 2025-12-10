# Phase 6.1 Integration Checklist

**Goal:** Wire Evidence Board "Ask AI" to contextual-chat endpoint with real RAG
**Time Estimate:** 1-2 hours
**Status:** Ready to implement

---

## 📋 Pre-Flight Checks (15 minutes)

### Database
- [ ] Verify `legal_ai_db` exists
  ```bash
  psql -U postgres -h localhost -l | grep legal_ai_db
  ```
- [ ] Verify tables exist
  ```bash
  psql -U legal_admin -h localhost legal_ai_db -c "\dt"
  ```
  Should show: `chat_turns`, `chat_turn_evidence`, `evidence`

### Ollama
- [ ] Ollama running on port 11434
  ```bash
  curl http://localhost:11434/api/tags
  ```
- [ ] Chat model available (e.g., `gemma3-legal:latest`)
- [ ] Embed model available (e.g., `embeddinggemma:latest`)

### Qdrant
- [ ] Qdrant running on port 6333
  ```bash
  curl http://localhost:6333/collections
  ```
- [ ] Collection `phase72_evidence_embeddings` exists
- [ ] Collection is 768-dimensional

### Environment
- [ ] `.env` has:
  ```
  DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
  OLLAMA_MODEL=gemma3-legal:latest
  OLLAMA_EMBED_MODEL=embeddinggemma:latest
  QDRANT_URL=http://localhost:6333
  OLLAMA_TIMEOUT_MS=45000
  ```

---

## 🔧 Implementation Steps (1-2 hours)

### Step 1: Copy RAG Implementation (5 minutes)
- [ ] Copy `rag-query-implementation.ts` to `sveltekit-frontend/src/lib/server/rag-query.ts`
- [ ] Install Qdrant client:
  ```bash
  cd sveltekit-frontend && npm install @qdrant/js-client-rest
  ```

### Step 2: Verify Plumbing (10 minutes)
- [ ] Check `embedding-service.ts` exports `generateEmbedding`
  ```bash
  grep "export.*generateEmbedding" sveltekit-frontend/src/lib/server/embedding-service.ts
  ```
- [ ] Check `ollama-service.ts` exports `callOllamaChat`
  ```bash
  grep "export.*callOllamaChat" sveltekit-frontend/src/lib/server/ollama-service.ts
  ```
- [ ] Check `contextual-chat.ts` imports both
  ```bash
  grep -E "import.*generateEmbedding|import.*callOllamaChat" sveltekit-frontend/src/lib/server/llm/contextual-chat.ts
  ```

### Step 3: Update Evidence Board Server (15 minutes)
- [ ] Open `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.server.ts`
- [ ] Update `askAI` action to:
  1. Call `/api/ai/yorha/context-chat` endpoint
  2. Link citations to chat_turn_evidence
  3. Return result with keywords, suggestions, latency
- [ ] Reference: See "Step 3" in `PHASE_6_1_WIRING_GUIDE.md`

### Step 4: Update Evidence Board UI (15 minutes)
- [ ] Open `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.svelte`
- [ ] Add result display section showing:
  - Answer text
  - Keywords as chips
  - Suggestions as buttons
  - Latency
- [ ] Reference: See "Step 4" in `PHASE_6_1_WIRING_GUIDE.md`

### Step 5: Test Endpoint (10 minutes)
- [ ] Start dev server:
  ```bash
  cd sveltekit-frontend && npm run dev
  ```
- [ ] Test endpoint:
  ```bash
  curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
    -H "Content-Type: application/json" \
    -d '{"message":"What are the key legal issues?","caseId":null}'
  ```
- [ ] Verify response has: `turnId`, `answer`, `keywords`, `suggestions`, `latencyMs`

### Step 6: Test End-to-End (20 minutes)
- [ ] Navigate to `/cases/[case-id]/evidence`
- [ ] Upload test evidence (or use existing)
- [ ] Select evidence card(s)
- [ ] Type question in "Ask AI" textarea
- [ ] Click "⚖️ Ask AI"
- [ ] Verify:
  - [ ] Answer displays
  - [ ] Keywords show as chips
  - [ ] Suggestions appear as buttons
  - [ ] Latency shows
  - [ ] No console errors

### Step 7: Verify DB Persistence (10 minutes)
- [ ] Query chat_turns:
  ```sql
  SELECT id, case_id, message, answer, extracted_keywords, suggestions
  FROM chat_turns
  WHERE case_id = '[case-id]'
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] Query chat_turn_evidence:
  ```sql
  SELECT * FROM chat_turn_evidence
  WHERE chat_turn_id = '[turn-id]';
  ```
- [ ] Verify:
  - [ ] `extracted_keywords` is array
  - [ ] `suggestions` is JSON
  - [ ] Evidence IDs linked

---

## 🧪 Testing Scenarios

### Scenario 1: Case-Aware RAG
- [ ] Upload evidence to Case A
- [ ] Upload evidence to Case B
- [ ] Ask AI question in Case A
- [ ] Verify only Case A evidence in citations
- [ ] Ask AI question in Case B
- [ ] Verify only Case B evidence in citations

### Scenario 2: Keyword Extraction
- [ ] Ask AI: "What are the removal factors?"
- [ ] Verify keywords include: "removal", "factors", "evidence"
- [ ] Verify keyPhrases include legal terms

### Scenario 3: Suggestions
- [ ] Ask AI: "What evidence supports the case?"
- [ ] Verify suggestions are follow-up questions
- [ ] Click suggestion
- [ ] Verify textarea populated with suggestion
- [ ] Submit and verify new answer

### Scenario 4: Empty Results
- [ ] Create new case with no evidence
- [ ] Ask AI question
- [ ] Verify graceful fallback message
- [ ] No console errors

### Scenario 5: Latency
- [ ] Ask AI question
- [ ] Verify latencyMs < 5000ms
- [ ] Check server logs for timing

---

## 🐛 Troubleshooting

### Endpoint returns 500
```bash
# Check server logs for:
# - OLLAMA_MODEL not set
# - OLLAMA_EMBED_MODEL not set
# - Ollama connection failed
# - Database connection failed

# Verify Ollama running:
curl http://localhost:11434/api/tags

# Verify database:
psql -U legal_admin -h localhost legal_ai_db -c "SELECT 1"

# Verify Qdrant:
curl http://localhost:6333/collections
```

### RAG returns empty
```bash
# Check Qdrant has points:
curl http://localhost:6333/collections/phase72_evidence_embeddings/points \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'

# Check collection config:
curl http://localhost:6333/collections/phase72_evidence_embeddings

# Verify case_id in payload:
# (Points should have payload.case_id matching your test case)
```

### Keywords not extracted
```bash
# Check contextual-chat.ts calls extractKeywords
# Verify OLLAMA_MODEL supports instruction following
# Check server logs for extraction errors
```

### Suggestions not generated
```bash
# Check contextual-chat.ts calls generateSuggestions
# Verify suggestions array is populated
# Check server logs for generation errors
```

---

## ✅ Success Criteria

- [ ] Endpoint test passes (returns ContextChatResponse)
- [ ] Evidence Board "Ask AI" works
- [ ] Answers are case-aware
- [ ] Keywords display as chips
- [ ] Suggestions display as buttons
- [ ] Latency < 5 seconds
- [ ] DB persistence verified
- [ ] No console errors
- [ ] All 5 test scenarios pass

---

## 📊 Metrics to Track

| Metric | Target | Status |
|--------|--------|--------|
| Endpoint latency | < 5s | ⏳ |
| RAG recall | > 80% | ⏳ |
| Keyword accuracy | > 90% | ⏳ |
| Suggestion relevance | > 85% | ⏳ |
| DB persistence | 100% | ⏳ |
| Error rate | 0% | ⏳ |

---

## 📞 Quick Reference

**Files to modify:**
- `sveltekit-frontend/src/lib/server/rag-query.ts` (copy from implementation)
- `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.server.ts` (update askAI action)
- `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.svelte` (add result display)

**Files to verify:**
- `sveltekit-frontend/src/lib/server/embedding-service.ts`
- `sveltekit-frontend/src/lib/server/ollama-service.ts`
- `sveltekit-frontend/src/lib/server/llm/contextual-chat.ts`
- `sveltekit-frontend/src/routes/api/ai/yorha/context-chat/+server.ts`

**Environment variables:**
- `DATABASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EMBED_MODEL`
- `QDRANT_URL`
- `OLLAMA_TIMEOUT_MS`

---

## 🚀 Next Steps

1. **Now:** Run pre-flight checks
2. **Next:** Copy RAG implementation and install Qdrant client
3. **Then:** Update Evidence Board server and UI
4. **Finally:** Test end-to-end

**Estimated time to completion:** 1-2 hours

---

**Status: Ready to implement** ✅
