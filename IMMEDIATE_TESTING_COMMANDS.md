# Immediate Testing Commands - Copy & Paste Ready

**Date**: December 14, 2025
**Time Estimate**: 30 minutes
**Status**: READY TO EXECUTE

---

## Prerequisites Check

Before starting, verify these services are running:

```powershell
# Check PostgreSQL
psql --version

# Check Ollama
curl http://localhost:11434/api/tags

# Check Node.js
node --version
npm --version
```

---

## STEP 1: Apply Database Migration (5 minutes)

### Command 1a: Set PostgreSQL Password
```powershell
$env:PGPASSWORD = "postgres"
```

### Command 1b: Apply Migration
```powershell
psql -U postgres -h 127.0.0.1 -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

**Expected Output**:
```
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
```

### Command 1c: Verify Migration Applied
```powershell
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='chat_turns' AND column_name IN ('extracted_keywords', 'key_phrases', 'suggestions', 'image_urls');"
```

**Expected Output** (4 rows):
```
 column_name
─────────────────────
 image_urls
 extracted_keywords
 key_phrases
 suggestions
(4 rows)
```

✅ **Step 1 Complete** when you see all 4 columns listed.

---

## STEP 2: Test Backend API (5 minutes)

### Command 2a: Test Context Chat Endpoint

**PowerShell**:
```powershell
$body = @{
    sessionId = "test-session-001"
    userId = "test-user-001"
    caseId = $null
    message = "Summarize the key legal issues when CPS removes a child from the home."
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5173/api/ai/yorha/context-chat" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json
```

**Or using curl** (simpler):
```powershell
curl -X POST http://localhost:5173/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d '{
    "sessionId": "test-session-001",
    "userId": "test-user-001",
    "caseId": null,
    "message": "Summarize the key legal issues when CPS removes a child from the home."
  }'
```

**Expected Response** (formatted):
```json
{
  "turnId": "550e8400-e29b-41d4-a716-446655440000",
  "answer": "When CPS removes a child from the home, several key legal issues arise...",
  "keywords": ["CPS", "removal", "child", "home", "legal"],
  "keyPhrases": ["child removal", "CPS intervention", "family law"],
  "suggestions": [
    {
      "query": "Explore: child removal",
      "reason": "Key phrase from analysis",
      "score": 0.8
    },
    {
      "query": "Explore: CPS intervention",
      "reason": "Key phrase from analysis",
      "score": 0.7
    },
    {
      "query": "Explore: family law",
      "reason": "Key phrase from analysis",
      "score": 0.6
    }
  ],
  "latencyMs": 2345,
  "citations": []
}
```

**Verification Checklist**:
- [ ] HTTP Status: 200
- [ ] `turnId` is present and is a UUID
- [ ] `answer` contains meaningful text (not empty)
- [ ] `keywords` array has 3+ items
- [ ] `keyPhrases` array has 3+ items
- [ ] `suggestions` array has 3+ items with `query`, `reason`, `score`
- [ ] `latencyMs` is a number > 0

✅ **Step 2 Complete** when all checks pass.

---

## STEP 3: Start Development Server (2 minutes)

### Command 3a: Start Dev Server
```powershell
npm run dev
```

**Expected Output**:
```
  VITE v6.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Keep this terminal open** - you'll need it for Step 4.

### Command 3b: In a NEW terminal, verify server is running
```powershell
curl http://localhost:5173/
```

Should return HTML (the SvelteKit app).

✅ **Step 3 Complete** when dev server is running and accessible.

---

## STEP 4: Test Frontend UI (15 minutes)

### Command 4a: Open Terminal Page
Open your browser and navigate to:
```
http://localhost:5173/terminal
```

### Visual Verification Checklist

**Page Load**:
- [ ] Page loads without errors
- [ ] No blank screen
- [ ] No console errors (check DevTools)

**Sidebar**:
- [ ] Left sidebar visible with dark background
- [ ] "YoRHa Terminal" title visible
- [ ] Navigation buttons visible (AI Assistant, Command Center, etc.)
- [ ] System Status section shows (AI Core: ONLINE, Database: CONNECTED, Memory: 87%)

**Chat Area**:
- [ ] Chat header shows "AI Legal Assistant"
- [ ] Subtitle shows "Contextual analysis and case assistance"
- [ ] Chat log area is empty with welcome message
- [ ] Welcome message shows bot icon and "Welcome to YoRHa Terminal"

**Input Area**:
- [ ] Textarea visible at bottom
- [ ] Placeholder text visible: "Ask about your legal cases..."
- [ ] Send button visible (green with arrow icon)
- [ ] Quick action buttons visible below input (Analyze Evidence, Legal Summary, Similar Cases, Risk Assessment)

### Command 4b: Send First Message

1. Click in the textarea
2. Type: `Summarize the key legal issues when CPS removes a child from the home.`
3. Click the Send button (or press Enter)

**Expected Behavior**:
- [ ] User message appears in chat (right-aligned, green background)
- [ ] Loading indicator appears (spinning icon with "Analyzing case data...")
- [ ] After 2-5 seconds, assistant response appears (left-aligned, dark background with green border)
- [ ] Response contains meaningful text about CPS removal

### Command 4c: Verify Keywords and Suggestions

After response appears:
- [ ] Green keyword chips appear below the response (e.g., `#CPS`, `#removal`, `#child`)
- [ ] Each chip is clickable
- [ ] Green suggestion buttons appear below keywords (e.g., "Explore: child removal")
- [ ] Each suggestion is clickable

### Command 4d: Test Keyword Chip Click

1. Click on a keyword chip (e.g., `#CPS`)
2. Verify:
   - [ ] Textarea populates with: `Show me more evidence about: CPS`
   - [ ] Can click Send to send new message
   - [ ] New response appears

### Command 4e: Test Suggestion Button Click

1. Click on a suggestion button (e.g., "Explore: child removal")
2. Verify:
   - [ ] Textarea populates with: `Explore: child removal`
   - [ ] Can click Send to send new message
   - [ ] New response appears

### Command 4f: Test Quick Action Buttons

1. Click "Analyze Evidence" button
2. Verify:
   - [ ] Textarea populates with: `Analyze evidence for case #`
   - [ ] Can complete the message and send

### Command 4g: Test Error Handling

1. Click Send button without typing anything
2. Verify:
   - [ ] Send button is disabled (grayed out)
   - [ ] No request is sent
   - [ ] No error message appears

### Command 4h: Test Keyboard Shortcut

1. Type a message
2. Press Shift+Enter
3. Verify:
   - [ ] Newline is added to textarea (message is now 2 lines)
4. Press Enter (without Shift)
5. Verify:
   - [ ] Message is sent
   - [ ] Response appears

### Command 4i: Test Multiple Messages

1. Send 3-4 different messages
2. Verify:
   - [ ] All messages appear in chat history
   - [ ] Conversation flows naturally
   - [ ] Each response has keywords and suggestions
   - [ ] Scrollbar appears when chat gets long
   - [ ] Can scroll through history

### Command 4j: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Verify:
   - [ ] No red errors
   - [ ] No warnings about missing components
   - [ ] Network requests show 200 status codes

✅ **Step 4 Complete** when all visual checks pass and chat works end-to-end.

---

## STEP 5: Verify Database Persistence (2 minutes)

### Command 5a: Query Chat Turns Table

```powershell
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "SELECT id, user_message, assistant_response, extracted_keywords, key_phrases, suggestions FROM chat_turns ORDER BY created_at DESC LIMIT 1;"
```

**Expected Output**:
```
                  id                  |                user_message                 |           assistant_response            |  extracted_keywords  |      key_phrases      |        suggestions
──────────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────┼──────────────────────┼───────────────────────┼──────────────────────
 550e8400-e29b-41d4-a716-446655440000 | Summarize the key legal issues when CPS...  | When CPS removes a child from the home... | {CPS,removal,child}  | {child removal,CPS...} | {Explore: child...}
(1 row)
```

**Verification**:
- [ ] Chat turn ID matches the response from API
- [ ] User message is stored
- [ ] Assistant response is stored
- [ ] Keywords array is populated
- [ ] Key phrases array is populated
- [ ] Suggestions array is populated

✅ **Step 5 Complete** when data is persisted in database.

---

## Success Summary

If all steps complete successfully, you have:

✅ **Database**: Schema updated with keyword columns
✅ **Backend API**: Responding with correct format and data
✅ **Frontend UI**: Rendering chat interface correctly
✅ **Chat Flow**: End-to-end message sending and receiving
✅ **Keywords**: Extracted and displayed as clickable chips
✅ **Suggestions**: Generated and displayed as clickable buttons
✅ **Persistence**: Chat turns saved to database
✅ **Error Handling**: Graceful handling of edge cases
✅ **Performance**: Sub-5 second response times

---

## Troubleshooting

### Issue: Database Migration Fails
```
ERROR: relation "chat_turns" does not exist
```
**Solution**: Create the table first
```powershell
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "CREATE TABLE IF NOT EXISTS chat_turns (id UUID PRIMARY KEY, case_id UUID, user_message TEXT, assistant_response TEXT, created_at TIMESTAMP DEFAULT NOW());"
```

### Issue: API Returns 500 Error
**Check**:
1. Ollama running: `curl http://localhost:11434/api/tags`
2. Dev server logs for errors
3. Database connection: `psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "SELECT 1;"`

### Issue: Frontend Shows Blank Page
**Check**:
1. Browser console (F12) for errors
2. Network tab for failed requests
3. Dev server terminal for compilation errors
4. Try hard refresh: Ctrl+Shift+R

### Issue: Chat Response Takes Too Long
**Check**:
1. Ollama model loaded: `ollama list`
2. GPU available: `nvidia-smi`
3. Check dev server logs for performance issues

### Issue: Keywords Not Showing
**Check**:
1. API response includes keywords array
2. Frontend is rendering the chips (check HTML in DevTools)
3. CSS is not hiding them (check Styles tab)

---

## Next Steps After Testing

### If All Tests Pass ✅
```powershell
# 1. Commit changes
git add -A
git commit -m "feat: contextual chat with keywords and suggestions - all tests passing"

# 2. Build for production
npm run build

# 3. Run full test suite
npm run test:run

# 4. Deploy to staging
# (follow your deployment procedure)
```

### If Tests Fail ❌
```powershell
# 1. Check logs
npm run dev  # Watch for errors

# 2. Review troubleshooting section above

# 3. Fix identified issues

# 4. Re-run tests

# 5. Document findings in TESTING_RESULTS.md
```

---

## Estimated Timeline

| Step | Task | Duration | Status |
|------|------|----------|--------|
| 1 | Database Migration | 5 min | ⏳ Ready |
| 2 | Backend API Test | 5 min | ⏳ Ready |
| 3 | Dev Server Start | 2 min | ⏳ Ready |
| 4 | Frontend UI Test | 15 min | ⏳ Ready |
| 5 | Database Verification | 2 min | ⏳ Ready |
| **Total** | **Complete Testing** | **29 min** | **⏳ Ready** |

---

## Status

**Overall**: ✅ READY FOR EXECUTION

All components are implemented and ready. No code changes needed.

**Start with Step 1 now!**

