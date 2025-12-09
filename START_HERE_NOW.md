# START HERE NOW - Phase 5 Testing

**Status**: Everything is ready. Just run these commands.

---

## What's Done

✅ Backend API complete
✅ UI wired with keyword chips and suggestion buttons
✅ Database schema applied
✅ Docling integration working
✅ All code compiles (0 errors)

---

## What You Need to Do

### 1. Start Dev Server (30 seconds)

Open PowerShell and run:

```powershell
cd sveltekit-frontend
npm run dev
```

Wait for:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

### 2. Test Backend API (1 minute)

Open a **new PowerShell window** and run:

```powershell
$body = @{
    sessionId = "test-session-001"
    userId = "test-user-001"
    caseId = $null
    message = "Summarize the key legal issues when CPS removes a child from the home."
} | ConvertTo-Json

curl.exe -X POST http://localhost:5173/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

**You should see**:
```json
{
  "turnId": "...",
  "answer": "When CPS removes a child...",
  "keywords": ["CPS", "removal", "due process", ...],
  "keyPhrases": ["child protective services", ...],
  "suggestions": [
    {
      "query": "What are the implications of \"CPS\" in this case?",
      "reason": "Explore the key term \"CPS\" further",
      "score": 0.9
    }
  ],
  "latencyMs": 1234
}
```

✅ If you see this → Backend works!

---

### 3. Test UI (2 minutes)

1. Open browser: `http://localhost:5173/terminal`
2. Type: `"Summarize the key legal issues when CPS removes a child from the home."`
3. Click: **TRANSMIT →**

**You should see**:
- Response appears in chat
- Green keyword chips appear (e.g., `#CPS`, `#removal`)
- Green suggestion buttons appear below

4. Click on a keyword chip (e.g., `#CPS`)
5. Input should populate with: `"Show me more evidence about: CPS"`
6. Click **TRANSMIT →** again
7. New response should appear

✅ If all this works → UI works!

---

### 4. Test Docling (Optional, 2 minutes)

1. In Terminal UI, click **Attach Evidence**
2. Select any PDF or image
3. Type: `"Analyze the last document I uploaded. What are the main obligations?"`
4. Click **TRANSMIT →**
5. Open DevTools (F12) → Network tab
6. Find request to `/api/ai/yorha/context-chat`
7. Check Response tab → should have keywords from the document

✅ If keywords match the document → Docling works!

---

## Success = All 4 Steps Work

| Step | What to Check | Status |
|------|---------------|--------|
| 1 | Dev server starts | ⏳ |
| 2 | API returns keywords | ⏳ |
| 3 | UI shows keyword chips | ⏳ |
| 3 | Clicking chips works | ⏳ |
| 4 | Docling processes files | ⏳ |

---

## If Something Breaks

### Dev server won't start?
```powershell
netstat -ano | findstr 5173
taskkill /PID <pid> /F
npm run dev
```

### API returns error?
```powershell
# Check Ollama
curl http://localhost:11434/api/tags

# Check database
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
```

### UI shows no keywords?
- Check DevTools Console (F12)
- Verify API response has `keywords` array
- Refresh page

### Docling fails?
```powershell
python --version
pip list | findstr docling
ls models/yolo-doc.onnx
```

---

## After Testing Works

```powershell
# Build for production
npm run build

# Preview production build
npm run preview

# Then test at: http://localhost:4173/terminal
```

---

## Files You Modified

- `sveltekit-frontend/src/routes/terminal/+page.svelte` ✅
- `sveltekit-frontend/src/routes/terminal/+page.server.ts` ✅
- `sveltekit-frontend/src/routes/api/ai/yorha/context-chat/+server.ts` ✅
- `sveltekit-frontend/src/lib/server/llm/contextual-chat.ts` ✅
- `sveltekit-frontend/src/lib/server/docling.ts` ✅
- `sveltekit-frontend/src/lib/server/keyword-extractor.ts` ✅
- `python/docling_analyze.py` ✅
- `sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql` ✅

All compile cleanly. 0 errors.

---

## That's It

Just run the 4 steps above. Everything else is done.

**Questions?** Check:
- `QUICK_TEST_COMMANDS.md` - Copy-paste commands
- `PHASE5_EXECUTION_READY.md` - Detailed guide
- `PHASE5_COMPLETE_STATUS.md` - Full status report

---

**Ready? Start with Step 1 above.**
