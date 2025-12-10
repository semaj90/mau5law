# Final Checklist - Phase 5 Complete

**Date**: December 8, 2025
**Status**: ✅ Ready for Testing

---

## Pre-Testing Checklist

### Environment Setup
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL running (`psql --version`)
- [ ] Ollama running (`curl http://localhost:11434/api/tags`)
- [ ] Python installed (`python --version`)
- [ ] Docling installed (`pip list | grep docling`)
- [ ] YOLO model exists (`ls models/yolo-doc.onnx`)

### Code Status
- [ ] All files compile (0 errors)
- [ ] All files have 0 warnings
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] Dependencies installed

### Documentation
- [ ] `START_HERE_NOW.md` created
- [ ] `QUICK_TEST_COMMANDS.md` created
- [ ] `PHASE5_EXECUTION_READY.md` created
- [ ] `PHASE5_COMPLETE_STATUS.md` created
- [ ] `VISUAL_REFERENCE.md` created
- [ ] `FINAL_CHECKLIST.md` created (this file)

---

## Step 1: Start Dev Server

### Before Starting
- [ ] Close any existing dev servers
- [ ] Kill process on port 5173 if needed
- [ ] Clear `.svelte-kit` cache if needed

### Start Command
```powershell
cd sveltekit-frontend
npm run dev
```

### Success Criteria
- [ ] Server starts without errors
- [ ] Output shows: `Local: http://localhost:5173/`
- [ ] No compilation errors in console
- [ ] No warnings in console

### Troubleshooting
- [ ] If port in use: `netstat -ano | findstr 5173` → `taskkill /PID <pid> /F`
- [ ] If cache issue: `rm -r .svelte-kit` → `npm run dev`
- [ ] If dependency issue: `npm install` → `npm run dev`

---

## Step 2: Test Backend API

### Before Testing
- [ ] Dev server is running
- [ ] Ollama is running
- [ ] Database is accessible

### Test Command
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

### Success Criteria
- [ ] Response status is 200
- [ ] Response has `turnId` (string)
- [ ] Response has `answer` (non-empty string)
- [ ] Response has `keywords` (array with 3+ items)
- [ ] Response has `keyPhrases` (array with 2+ items)
- [ ] Response has `suggestions` (array with 2-3 items)
- [ ] Response has `latencyMs` (number > 0)
- [ ] No errors in response

### Verify Response Structure
```json
{
  "turnId": "uuid",
  "answer": "...",
  "keywords": ["CPS", "removal", ...],
  "keyPhrases": ["child protective services", ...],
  "suggestions": [
    {
      "query": "...",
      "reason": "...",
      "score": 0.9
    }
  ],
  "citations": [],
  "latencyMs": 1234
}
```

### Troubleshooting
- [ ] If 500 error: Check console for errors
- [ ] If no keywords: Check Ollama is running
- [ ] If timeout: Check database connection
- [ ] If empty response: Check LLM model is loaded

---

## Step 3: Test UI - Basic Interaction

### Before Testing
- [ ] Dev server is running
- [ ] Backend API test passed

### Open Terminal UI
- [ ] Navigate to: `http://localhost:5173/terminal`
- [ ] Page loads without errors
- [ ] Terminal header visible
- [ ] Chat log visible
- [ ] Input form visible

### Send First Message
- [ ] Type: `"Summarize the key legal issues when CPS removes a child from the home."`
- [ ] Click: **TRANSMIT →** button
- [ ] Message appears in chat log
- [ ] Loading indicator appears (optional)
- [ ] Response appears below message

### Verify Response Display
- [ ] Response text is visible
- [ ] Response is from "9S" (assistant)
- [ ] Timestamp is shown
- [ ] Turn ID is shown

### Verify Keyword Chips
- [ ] Keyword chips appear below response
- [ ] Chips have cyan color
- [ ] Chips have `#` prefix
- [ ] Chips are clickable (cursor changes)
- [ ] At least 3 chips visible

### Verify Suggestion Buttons
- [ ] Suggestion buttons appear below keywords
- [ ] Buttons have green color
- [ ] Buttons are clickable (cursor changes)
- [ ] At least 2 buttons visible
- [ ] Button text is readable

### Troubleshooting
- [ ] If no response: Check console for errors
- [ ] If no keywords: Check API response has keywords
- [ ] If no suggestions: Check API response has suggestions
- [ ] If styling wrong: Check CSS is loaded

---

## Step 4: Test UI - Keyword Chip Interaction

### Click Keyword Chip
- [ ] Click on first keyword chip (e.g., `#CPS`)
- [ ] Input field populates with: `"Show me more evidence about: CPS"`
- [ ] Input field is focused
- [ ] Text is fully visible

### Send Follow-up Message
- [ ] Click: **TRANSMIT →** button
- [ ] New message appears in chat
- [ ] New response appears below
- [ ] New response has different keywords (optional)
- [ ] New response has different suggestions (optional)

### Verify Interaction Works
- [ ] [ ] Keyword chip click → input populated
- [ ] [ ] Input populated → message sent
- [ ] [ ] Message sent → new response received
- [ ] [ ] New response → new keywords/suggestions

### Troubleshooting
- [ ] If click doesn't work: Check event handler in +page.svelte
- [ ] If input doesn't populate: Check handleKeywordClick function
- [ ] If message doesn't send: Check sendMessage function
- [ ] If no new response: Check API endpoint

---

## Step 5: Test UI - Suggestion Button Interaction

### Click Suggestion Button
- [ ] Click on first suggestion button
- [ ] Input field populates with suggestion text
- [ ] Input field is focused
- [ ] Text is fully visible

### Send Follow-up Message
- [ ] Click: **TRANSMIT →** button
- [ ] New message appears in chat
- [ ] New response appears below

### Verify Interaction Works
- [ ] [ ] Suggestion button click → input populated
- [ ] [ ] Input populated → message sent
- [ ] [ ] Message sent → new response received

### Troubleshooting
- [ ] If click doesn't work: Check event handler
- [ ] If input doesn't populate: Check handleSuggestionClick function
- [ ] If message doesn't send: Check sendMessage function

---

## Step 6: Test File Upload (Optional)

### Prepare Test File
- [ ] Have a PDF or image ready
- [ ] File should be < 10MB
- [ ] File should be readable

### Upload File
- [ ] Click: **Attach Evidence** button
- [ ] Select file from dialog
- [ ] File appears in file list
- [ ] File preview shows (if image)
- [ ] File can be removed

### Send Message About File
- [ ] Type: `"Analyze the last document I uploaded. What are the main obligations?"`
- [ ] Click: **TRANSMIT →** button
- [ ] Message appears in chat
- [ ] Response appears below

### Verify Docling Processing
- [ ] Response mentions the document
- [ ] Keywords include terms from document
- [ ] No errors in console
- [ ] Processing time is reasonable (< 10s)

### Check DevTools
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Find request to `/api/ai/yorha/context-chat`
- [ ] Check Response tab
- [ ] Verify keywords from document

### Troubleshooting
- [ ] If file upload fails: Check file size
- [ ] If Docling fails: Check Python/docling installed
- [ ] If no keywords: Check Docling output
- [ ] If timeout: Check file size

---

## Step 7: Test Database Persistence

### Check Database
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
```

### Verify Data
- [ ] Count increased after each message
- [ ] New rows have correct data
- [ ] Keywords column populated
- [ ] Suggestions column populated

### Query Recent Turn
```powershell
psql -U postgres -h localhost -d legal_ai_db -c "SELECT id, extracted_keywords, suggestions FROM chat_turns ORDER BY created_at DESC LIMIT 1;"
```

### Verify Structure
- [ ] `extracted_keywords` is array
- [ ] `suggestions` is array
- [ ] Data is not null
- [ ] Data is properly formatted

### Troubleshooting
- [ ] If no rows: Check database connection
- [ ] If columns missing: Check migration applied
- [ ] If data null: Check API saving data
- [ ] If wrong format: Check data types

---

## Step 8: Build for Production

### Build Command
```powershell
npm run build
```

### Success Criteria
- [ ] Build completes without errors
- [ ] Build completes without warnings
- [ ] Output shows: `✓ built in X.XXs`
- [ ] `.svelte-kit/output` directory created

### Preview Build
```powershell
npm run preview
```

### Success Criteria
- [ ] Preview server starts
- [ ] Output shows: `Local: http://localhost:4173/`
- [ ] Terminal page loads at `http://localhost:4173/terminal`
- [ ] All functionality works same as dev

### Troubleshooting
- [ ] If build fails: Check console for errors
- [ ] If preview fails: Check port 4173 available
- [ ] If functionality broken: Check production config

---

## Final Verification

### All Tests Passed?
- [ ] Step 1: Dev server starts ✅
- [ ] Step 2: Backend API works ✅
- [ ] Step 3: UI displays correctly ✅
- [ ] Step 4: Keyword chips work ✅
- [ ] Step 5: Suggestion buttons work ✅
- [ ] Step 6: File upload works (optional) ✅
- [ ] Step 7: Database persists data ✅
- [ ] Step 8: Production build works ✅

### Code Quality
- [ ] 0 compilation errors
- [ ] 0 compilation warnings
- [ ] All files formatted
- [ ] All imports resolved
- [ ] All types correct

### Documentation
- [ ] All guides created
- [ ] All commands tested
- [ ] All troubleshooting steps documented
- [ ] All architecture diagrams complete

---

## Success Summary

If all checkboxes are checked:

✅ **Phase 5 is complete and production-ready**

### What Works
- ✅ Docling OCR + layout extraction
- ✅ Keyword extraction from documents
- ✅ Contextual chat with RAG
- ✅ API endpoint with enriched responses
- ✅ Database persistence
- ✅ UI with keyword chips and suggestions
- ✅ File upload with processing
- ✅ Production build

### Ready For
- ✅ Deployment to staging
- ✅ User testing
- ✅ Phase 6 development
- ✅ Production release

---

## Next Steps

1. **Commit Changes**
   ```powershell
   git add -A
   git commit -m "Phase 5 complete: Docling + Keywords + UI wiring"
   ```

2. **Deploy to Staging** (if applicable)
   ```powershell
   npm run build
   # Deploy .svelte-kit/output to staging server
   ```

3. **Plan Phase 6**
   - Evidence → Chat bridge
   - Omni document embeddings
   - VLM fine-tuning
   - Performance optimization

4. **Gather Feedback**
   - User testing
   - Performance monitoring
   - Error tracking
   - Usage analytics

---

## Support

**Questions?** Check:
- `START_HERE_NOW.md` - Quick start
- `QUICK_TEST_COMMANDS.md` - Commands
- `PHASE5_EXECUTION_READY.md` - Detailed guide
- `VISUAL_REFERENCE.md` - Diagrams
- `TROUBLESHOOTING_AND_EXECUTION.md` - Issues

---

## Sign-Off

- [ ] All tests passed
- [ ] All documentation complete
- [ ] Ready for deployment
- [ ] Ready for Phase 6

**Date**: _______________
**Tester**: _______________
**Status**: ✅ COMPLETE

---

**Phase 5 Testing Complete**
