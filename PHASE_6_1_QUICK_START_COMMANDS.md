# Phase 6.1 - Quick Start Commands

**Copy and paste these commands to get started immediately.**

---

## 🚀 Step 1: Install Dependencies (1 minute)

```bash
cd sveltekit-frontend
npm install @qdrant/js-client-rest
```

---

## 🚀 Step 2: Verify Services (2 minutes)

### Check Ollama
```bash
curl http://localhost:11434/api/tags
```

**Expected:** 200 OK with list of models

### Check Qdrant
```bash
curl http://localhost:6333/collections
```

**Expected:** 200 OK with collections list

### Check PostgreSQL
```bash
psql -U legal_admin -h localhost legal_ai_db -c "SELECT 1"
```

**Expected:** `1` returned

---

## 🚀 Step 3: Start Development Server (1 minute)

```bash
cd sveltekit-frontend
npm run dev
```

**Expected:** `Local: http://localhost:5173`

---

## 🧪 Step 4: Test Endpoint (2 minutes)

### In a new terminal:

```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the key legal issues?","caseId":null}'
```

**Expected Response:**
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

---

## 🎮 Step 5: Test Evidence Board UI (3 minutes)

### 1. Navigate to Evidence Board
```
http://localhost:5173/cases/test-case-123/evidence
```

### 2. Type Question
In the "Ask AI about selected evidence" textarea, type:
```
What are the main points in this evidence?
```

### 3. Click "⚖️ Ask AI"

### 4. Verify Results
- ✅ Green result box appears
- ✅ Answer displays
- ✅ Keywords show as chips (e.g., `#evidence`, `#points`)
- ✅ Suggestions show as buttons
- ✅ Latency shows (e.g., `Response time: 1234ms`)

---

## 🔗 Step 6: Test Suggestion Click (2 minutes)

### 1. Click a Suggestion Button
Click one of the suggestion buttons (e.g., "→ Explore: main points")

### 2. Verify Textarea Updated
The textarea should now contain the suggestion text

### 3. Click "Ask AI" Again
Click "⚖️ Ask AI" to ask the follow-up question

### 4. Verify New Answer
You should get a new answer based on the suggestion

---

## 💾 Step 7: Verify Database Persistence (2 minutes)

### Query Chat Turns
```bash
psql -U legal_admin -h localhost legal_ai_db -c \
  "SELECT id, case_id, message, answer, extracted_keywords FROM chat_turns ORDER BY created_at DESC LIMIT 1;"
```

**Expected:** Row with your question and answer

### Query Evidence Linking
```bash
psql -U legal_admin -h localhost legal_ai_db -c \
  "SELECT * FROM chat_turn_evidence LIMIT 5;"
```

**Expected:** Rows linking chat turns to evidence

---

## 🏗️ Step 8: Build for Deployment (5 minutes)

```bash
cd sveltekit-frontend
npm run build
```

**Expected:** Build completes successfully

---

## 🚀 Step 9: Deploy to Staging (10-20 minutes)

### Option A: Docker
```bash
docker compose -f docker-compose.dev.yml up --build -d
```

### Option B: Manual
```bash
# Copy built files to your server
# Restart your application
# Verify with curl tests
```

---

## ✅ Verification Checklist

- [ ] Ollama returns 200 OK
- [ ] Qdrant returns 200 OK
- [ ] PostgreSQL returns 1
- [ ] Dev server starts
- [ ] Endpoint test returns correct response
- [ ] Evidence Board page loads
- [ ] Ask AI button works
- [ ] Results display correctly
- [ ] Keywords show as chips
- [ ] Suggestions show as buttons
- [ ] Suggestion click works
- [ ] Database persistence verified
- [ ] Build completes successfully

---

## 🐛 Troubleshooting

### Ollama not responding
```bash
# Start Ollama
ollama serve

# Or check if it's already running
ps aux | grep ollama
```

### Qdrant not responding
```bash
# Check if Qdrant is running
curl http://localhost:6333/health

# Or start it
docker run -p 6333:6333 qdrant/qdrant
```

### PostgreSQL not responding
```bash
# Check if PostgreSQL is running
psql -U postgres -h localhost -c "SELECT 1"

# Or start it
sudo systemctl start postgresql
```

### Endpoint returns 500
```bash
# Check server logs for errors
# Verify OLLAMA_MODEL is set
echo $OLLAMA_MODEL

# Verify QDRANT_URL is set
echo $QDRANT_URL

# Verify DATABASE_URL is set
echo $DATABASE_URL
```

### UI doesn't display results
```bash
# Check browser console (F12)
# Look for JavaScript errors

# Check server logs
# Look for API errors

# Try endpoint test first
# Make sure endpoint works before testing UI
```

---

## 📊 Expected Timings

| Step | Time | Status |
|------|------|--------|
| Install dependencies | 1 min | ⏳ |
| Verify services | 2 min | ⏳ |
| Start dev server | 1 min | ⏳ |
| Test endpoint | 2 min | ⏳ |
| Test UI | 3 min | ⏳ |
| Test suggestion | 2 min | ⏳ |
| Verify database | 2 min | ⏳ |
| Build | 5 min | ⏳ |
| Deploy | 10-20 min | ⏳ |
| **Total** | **30-40 min** | ⏳ |

---

## 🎯 Success Indicators

✅ All curl commands return 200 OK
✅ Dev server starts without errors
✅ Evidence Board page loads
✅ Ask AI button works
✅ Results display with answer, keywords, suggestions
✅ Suggestion click populates textarea
✅ Database queries return data
✅ Build completes successfully

---

## 📞 Quick Reference

### Key URLs
- Dev server: `http://localhost:5173`
- Evidence Board: `http://localhost:5173/cases/test-case/evidence`
- Ollama: `http://localhost:11434`
- Qdrant: `http://localhost:6333`

### Key Endpoints
- Context Chat: `POST /api/ai/yorha/context-chat`
- Evidence Board: `GET /cases/[id]/evidence`

### Key Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `OLLAMA_MODEL` - Chat model
- `OLLAMA_EMBED_MODEL` - Embedding model
- `QDRANT_URL` - Qdrant connection

### Key Files
- `sveltekit-frontend/src/lib/server/rag-query.ts` - RAG implementation
- `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.server.ts` - Server logic
- `sveltekit-frontend/src/lib/features/evidence-command-center/EvidenceBoardPane.svelte` - UI

---

## 🎉 You're Ready!

Copy and paste the commands above to get started immediately.

**Total time to test: ~15 minutes**
**Total time to deploy: ~30-40 minutes**

---

**Status: 🟢 READY TO GO**

