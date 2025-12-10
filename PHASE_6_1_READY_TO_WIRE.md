# Phase 6.1 - Ready to Wire

**Status:** ✅ Design contracts finalized, implementation ready
**Time to Complete:** 1-2 hours
**Complexity:** Medium (straightforward wiring)

---

## 🎯 What This Accomplishes

Wires the Evidence Board "Ask AI" button to the contextual-chat endpoint with real Qdrant-backed RAG, so:

✅ Users can ask questions about evidence
✅ Answers are case-aware (filtered by caseId)
✅ Keywords and suggestions display in UI
✅ Evidence-chat linking persists in DB
✅ Full end-to-end integration works

---

## 📦 What You Get

### 3 Implementation Files

1. **`rag-query-implementation.ts`** (Ready to paste)
   - Queries Qdrant with case_id filter
   - Returns contextText + citations
   - Includes health checks and debug helpers

2. **`PHASE_6_1_WIRING_GUIDE.md`** (Step-by-step)
   - Plumbing verification checklist
   - 5 concrete implementation steps
   - Code snippets for each step
   - End-to-end testing guide

3. **`PHASE_6_1_INTEGRATION_CHECKLIST.md`** (Verification)
   - Pre-flight checks (15 min)
   - Implementation steps (1-2 hours)
   - 5 test scenarios
   - Troubleshooting guide

---

## 🚀 Quick Start (5 minutes)

### 1. Copy RAG Implementation
```bash
cp rag-query-implementation.ts sveltekit-frontend/src/lib/server/rag-query.ts
cd sveltekit-frontend && npm install @qdrant/js-client-rest
```

### 2. Update Evidence Board Server
In `+page.server.ts`, update `askAI` action to call `/api/ai/yorha/context-chat`
(See Step 3 in `PHASE_6_1_WIRING_GUIDE.md`)

### 3. Update Evidence Board UI
In `+page.svelte`, add result display for answer, keywords, suggestions
(See Step 4 in `PHASE_6_1_WIRING_GUIDE.md`)

### 4. Test
```bash
npm run dev
# Navigate to /cases/[case-id]/evidence
# Upload evidence, ask AI question, verify results
```

---

## 📋 What's Already Done (Design Level)

✅ **API Contract Locked**
- Request: `{ message, caseId?, sessionId?, userId? }`
- Response: `{ turnId, answer, keywords, keyPhrases, suggestions, latencyMs, citations }`

✅ **DB Schema Ready**
- `chat_turns` with `extracted_keywords`, `key_phrases`, `suggestions`
- `chat_turn_evidence` linking table
- `evidence` table with embeddings metadata

✅ **Ollama Contract**
- Chat model: `OLLAMA_MODEL` (e.g., `gemma3-legal:latest`)
- Embed model: `OLLAMA_EMBED_MODEL` (e.g., `embeddinggemma:latest`)

✅ **Qdrant Ready**
- Collection: `phase72_evidence_embeddings` (768-dim, Cosine)
- Supports case_id filtering

✅ **Endpoint Exists**
- `/api/ai/yorha/context-chat` fully implemented
- Validates JSON, handles errors, falls back gracefully

✅ **Contextual Chat Brain**
- `contextualChat()` function ready
- Calls RAG, LLM, keyword extraction, DB save
- Returns correct response shape

---

## 🔧 What You Need to Wire

### 1. RAG Query (rag-query.ts)
**Status:** Implementation provided, ready to paste
- Queries Qdrant with case_id filter
- Returns contextText + citations

### 2. Evidence Board Server (askAI action)
**Status:** Needs 10 lines of code
- Call `/api/ai/yorha/context-chat` endpoint
- Link citations to chat_turn_evidence
- Return result

### 3. Evidence Board UI
**Status:** Needs 20 lines of code
- Display answer, keywords, suggestions
- Make suggestions clickable
- Show latency

---

## 📊 Architecture

```
Evidence Board UI
    ↓ (Ask AI button)
+page.server.ts (askAI action)
    ↓ (POST /api/ai/yorha/context-chat)
context-chat/+server.ts
    ↓ (calls contextualChat)
contextual-chat.ts
    ├─ getContextFromRag (NEW: rag-query.ts)
    │   ├─ generateEmbedding (existing)
    │   └─ Qdrant search with case_id filter
    ├─ callOllamaChat (existing)
    ├─ extractKeywords (existing)
    └─ generateSuggestions (existing)
    ↓ (saves to DB)
chat_turns + chat_turn_evidence
    ↓ (returns response)
+page.server.ts (returns to UI)
    ↓ (displays result)
Evidence Board UI (shows answer, keywords, suggestions)
```

---

## ✅ Success Criteria

- [ ] Endpoint test passes
- [ ] Evidence Board "Ask AI" works
- [ ] Answers are case-aware
- [ ] Keywords display
- [ ] Suggestions display
- [ ] DB persistence verified
- [ ] No console errors
- [ ] Latency < 5 seconds

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `PHASE_6_1_WIRING_GUIDE.md` | Step-by-step implementation |
| `PHASE_6_1_INTEGRATION_CHECKLIST.md` | Verification and testing |
| `rag-query-implementation.ts` | Ready-to-paste RAG code |
| This file | Overview and quick start |

---

## 🎓 Key Concepts

### Case-Aware RAG
The RAG query filters Qdrant by `case_id`, so answers only use evidence from the current case.

### Evidence-Chat Linking
After RAG returns citations, we insert rows into `chat_turn_evidence` to link evidence to the chat turn.

### Keyword Extraction
The contextual-chat brain extracts keywords from the answer using Ollama, so the UI can display them as chips.

### Suggestions
The brain generates follow-up suggestions based on keywords, so users can click to ask related questions.

---

## 🚀 Implementation Order

1. **Copy RAG implementation** (5 min)
2. **Verify plumbing** (10 min)
3. **Update Evidence Board server** (15 min)
4. **Update Evidence Board UI** (15 min)
5. **Test endpoint** (10 min)
6. **Test end-to-end** (20 min)

**Total: 1-2 hours**

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Endpoint returns 500 | Check Ollama running, verify OLLAMA_MODEL set |
| RAG returns empty | Verify Qdrant has points, check case_id in payload |
| Keywords not extracted | Verify OLLAMA_MODEL supports instructions |
| Suggestions not generated | Check generateSuggestions called in contextual-chat.ts |
| DB errors | Verify legal_ai_db exists, check DATABASE_URL |

---

## 📞 Need Help?

1. **Check plumbing:** Run pre-flight checks in `PHASE_6_1_INTEGRATION_CHECKLIST.md`
2. **Follow guide:** Step-by-step in `PHASE_6_1_WIRING_GUIDE.md`
3. **Test endpoint:** Use curl command to verify `/api/ai/yorha/context-chat`
4. **Check logs:** Server logs show RAG queries, Ollama calls, DB operations

---

## 🎉 What's Next After Phase 6.1

Once wiring is complete:

- **Phase 6.2:** Add evidence upload to MinIO + Docling parsing
- **Phase 6.3:** Add evidence annotations and relationships
- **Phase 7:** Add graph visualization of evidence relationships
- **Phase 8:** Add collaborative features (comments, tags, etc.)

---

## 📝 Summary

**Phase 6.1 wires the Evidence Board "Ask AI" button to contextual-chat with real RAG.**

Everything is designed and ready. You just need to:
1. Copy the RAG implementation
2. Update the Evidence Board server (10 lines)
3. Update the Evidence Board UI (20 lines)
4. Test

**Time: 1-2 hours**
**Complexity: Medium**
**Impact: High (Evidence Board becomes fully functional)**

---

**Status: 🟢 READY TO IMPLEMENT**

Start with `PHASE_6_1_INTEGRATION_CHECKLIST.md` → Pre-flight checks
Then follow `PHASE_6_1_WIRING_GUIDE.md` → Implementation steps
