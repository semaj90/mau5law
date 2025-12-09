# Quick Test Commands - Copy & Paste Ready

## 1. Start Dev Server

```powershell
cd sveltekit-frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

---

## 2. Test Backend API

**Option A: PowerShell (Recommended)**

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

**Option B: WSL Bash**

```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "content-type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "userId": "test-user-001",
    "caseId": null,
    "message": "Summarize the key legal issues when CPS removes a child from the home."
  }'
```

**Expected**: JSON response with `answer`, `keywords`, `keyPhrases`, `suggestions`

---

## 3. Test UI

1. Open browser: `http://localhost:5173/terminal`
2. Type message: `"Summarize the key legal issues when CPS removes a child from the home."`
3. Click: **TRANSMIT →**
4. Verify:
   - Response appears
   - Keyword chips appear (e.g., `#CPS`)
   - Suggestion buttons appear
5. Click a keyword chip
6. Verify input populates
7. Click **TRANSMIT →** again
8. Verify new response

---

## 4. Test Docling (Optional)

1. In Terminal UI, click **Attach Evidence**
2. Select a PDF or image
3. Type: `"Analyze the last document I uploaded. What are the main obligations and penalties?"`
4. Click **TRANSMIT →**
5. Open DevTools (F12) → Network tab
6. Find request to `/api/ai/yorha/context-chat`
7. Check Response tab for keywords from document

---

## Troubleshooting

### Port 5173 Already in Use

```powershell
netstat -ano | findstr 5173
taskkill /PID <pid> /F
npm run dev
```

### Check Ollama

```powershell
curl http://localhost:11434/api/tags
```

### Check Database

```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
```

### Check Python/Docling

```powershell
python --version
pip list | findstr docling
ls models/yolo-doc.onnx
```

---

## Success Checklist

- [ ] Dev server starts
- [ ] API returns keywords
- [ ] UI shows keyword chips
- [ ] UI shows suggestion buttons
- [ ] Clicking chips works
- [ ] Docling processes uploads (optional)

---

## Files to Monitor

**Terminal UI**: `sveltekit-frontend/src/routes/terminal/+page.svelte`
**API Endpoint**: `sveltekit-frontend/src/routes/api/ai/yorha/context-chat/+server.ts`
**Terminal Server**: `sveltekit-frontend/src/routes/terminal/+page.server.ts`

---

## Next: Build & Deploy

```powershell
npm run build
npm run preview
```

Then test at: `http://localhost:4173/terminal`
