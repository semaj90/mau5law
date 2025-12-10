# Contextual Chat Keywords/Suggestions - Testing Guide

**Date**: December 9, 2025
**Status**: ✅ **READY FOR TESTING**
**Estimated Time**: 1-2 hours

---

## Quick Start

### 1. Restart Dev Server
```bash
cd sveltekit-frontend
npm run dev
```

### 2. Verify Compilation
```bash
# Should show 0 errors, 0 warnings
npm run check
```

### 3. Navigate to Terminal
```
http://localhost:5173/terminal
```

---

## Backend Testing

### Test 1: API Endpoint Direct Call

**Endpoint**: `POST /api/ai/yorha/context-chat`

**Request**:
```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key legal issues in this case?",
    "caseId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected Response**:
```json
{
  "turnId": "uuid",
  "answer": "The key legal issues include...",
  "keywords": ["liability", "damages", "negligence"],
  "keyPhrases": ["duty of care", "breach of contract"],
  "suggestions": [
    {
      "query": "What are the implications of \"liability\" in this case?",
      "reason": "Explore the key term \"liability\" further",
      "score": 0.9
    }
  ],
  "latencyMs": 1234
}
```

**Verification Checklist**:
- [ ] Response status: 200
- [ ] `turnId` is a valid UUID
- [ ] `answer` is non-empty string
- [ ] `keywords` is array of strings
- [ ] `keyPhrases` is array of strings
- [ ] `suggestions` is array with `query`, `reason`, `score`
- [ ] `latencyMs` is a number

### Test 2: Docling Processing

**Setup**: Upload a PDF or image file

**Request**:
```bash
# Via UI: Upload file in terminal page
# Or via curl with multipart form data
curl -X POST http://localhost:5173/terminal?/chat \
  -F "message=Analyze this document" \
  -F "files=@/path/to/document.pdf" \
  -F "caseId=550e8400-e29b-41d4-a716-446655440000"
```

**Expected Response**:
```json
{
  "success": true,
  "chatTurnId": "uuid",
  "llmReply": "Based on the document...",
  "keywords": ["extracted", "from", "document"],
  "keyPhrases": ["key phrase from doc"],
  "suggestions": [...],
  "uploadedCount": 1,
  "processedCount": 1
}
```

**Verification Checklist**:
- [ ] File uploaded successfully
- [ ] Docling processed file
- [ ] Keywords extracted from file content
- [ ] Response includes file keywords
- [ ] Database saved keywords

### Test 3: Database Persistence

**Check Keywords Saved**:
```sql
SELECT id, extracted_keywords, key_phrases, suggestions
FROM chat_turns
WHERE id = '[turnId from test 1]';
```

**Expected Result**:
```
id                   | extracted_keywords        | key_phrases              | suggestions
550e8400-e29b-41d4...| {liability,damages,...}   | {duty of care,...}       | [{"query":"..."}]
```

**Verification Checklist**:
- [ ] `extracted_keywords` is not null
- [ ] `key_phrases` is not null
- [ ] `suggestions` is not null
- [ ] All arrays contain expected values

### Test 4: Evidence Linking

**Check Evidence-Chat Linking**:
```sql
SELECT * FROM chat_turn_evidence
WHERE chat_turn_id = '[turnId from test 1]';
```

**Expected Result**:
```
id | chat_turn_id | evidence_id | role | created_at
...
```

**Verification Checklist**:
- [ ] Evidence linked to chat turn
- [ ] Role is 'uploaded' or 'retrieved'
- [ ] Timestamps are correct

---

## UI Testing

### Test 5: Keywords Render as Chips

**Steps**:
1. Navigate to `http://localhost:5173/terminal`
2. Enter message: "What are the key issues?"
3. Click "Send"
4. Wait for response

**Expected Result**:
- Keywords appear below assistant message
- Each keyword has `#` prefix
- Keywords are styled as chips/buttons
- Hover shows pointer cursor

**Verification Checklist**:
- [ ] Keywords visible
- [ ] Correct styling applied
- [ ] `#` prefix present
- [ ] Hover effects work

### Test 6: Suggestions Render as Buttons

**Steps**:
1. Same as Test 5
2. Look for suggestions below keywords

**Expected Result**:
- Suggestions appear as buttons
- Each suggestion is clickable
- Suggestions have descriptive text
- Hover shows pointer cursor

**Verification Checklist**:
- [ ] Suggestions visible
- [ ] Correct styling applied
- [ ] Buttons are clickable
- [ ] Hover effects work

### Test 7: Keyword Click Populates Input

**Steps**:
1. Complete Test 5
2. Click on a keyword chip
3. Observe input field

**Expected Result**:
- Input field populated with search query
- Input field focused (cursor visible)
- Message ready to send

**Verification Checklist**:
- [ ] Input populated
- [ ] Input focused
- [ ] Can submit immediately

### Test 8: Suggestion Click Populates Input

**Steps**:
1. Complete Test 6
2. Click on a suggestion button
3. Observe input field

**Expected Result**:
- Input field populated with suggestion
- Input field focused
- Message ready to send

**Verification Checklist**:
- [ ] Input populated
- [ ] Input focused
- [ ] Can submit immediately

### Test 9: No TypeScript Errors

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red errors

**Expected Result**:
- No TypeScript errors
- No compilation errors
- Only info/warning messages

**Verification Checklist**:
- [ ] No red errors in console
- [ ] No TypeScript errors
- [ ] Page functions normally

---

## End-to-End Testing

### Test 10: Full Chat Flow

**Steps**:
1. Navigate to terminal
2. Enter case ID (optional)
3. Type message: "Summarize the key issues"
4. Click "Send"
5. Wait for response
6. Observe keywords and suggestions
7. Click a keyword
8. Submit follow-up
9. Observe new keywords/suggestions

**Expected Result**:
- Message sent successfully
- Response appears in chat
- Keywords render
- Suggestions render
- Keyword click works
- Follow-up generates new keywords
- Chat history builds

**Verification Checklist**:
- [ ] Message sent
- [ ] Response received
- [ ] Keywords visible
- [ ] Suggestions visible
- [ ] Keyword click works
- [ ] Follow-up works
- [ ] Chat history correct

### Test 11: File Upload with Keywords

**Steps**:
1. Navigate to terminal
2. Select a PDF or image file
3. Enter message: "Analyze this document"
4. Click "Send"
5. Wait for Docling processing
6. Observe keywords from file

**Expected Result**:
- File uploaded
- Docling processes file
- Keywords extracted from file
- Response includes file keywords
- Keywords render in UI

**Verification Checklist**:
- [ ] File uploaded
- [ ] Docling processed
- [ ] Keywords extracted
- [ ] Keywords in response
- [ ] Keywords render

### Test 12: Chat History Loads

**Steps**:
1. Navigate to terminal
2. Enter case ID
3. Wait for history to load
4. Observe previous messages

**Expected Result**:
- Previous messages load
- Keywords/suggestions from history visible
- Chat history builds correctly

**Verification Checklist**:
- [ ] History loads
- [ ] Previous messages visible
- [ ] Keywords visible
- [ ] Suggestions visible

---

## Performance Testing

### Test 13: Response Time

**Measure**:
- Time from send to response
- Expected: < 60 seconds

**Steps**:
1. Open DevTools Network tab
2. Send message
3. Observe response time

**Expected Result**:
- Response time < 60 seconds
- Latency displayed in response

**Verification Checklist**:
- [ ] Response time acceptable
- [ ] No timeouts
- [ ] Latency reasonable

### Test 14: Memory Usage

**Measure**:
- Memory usage during chat
- Expected: No memory leaks

**Steps**:
1. Open DevTools Memory tab
2. Take heap snapshot
3. Send 10 messages
4. Take another heap snapshot
5. Compare

**Expected Result**:
- No significant memory increase
- No memory leaks
- Garbage collection working

**Verification Checklist**:
- [ ] Memory stable
- [ ] No leaks detected
- [ ] GC working

---

## Error Handling Testing

### Test 15: Invalid Input

**Steps**:
1. Send empty message
2. Send very long message (> 10000 chars)
3. Send special characters

**Expected Result**:
- Empty message rejected
- Long message handled
- Special characters escaped

**Verification Checklist**:
- [ ] Empty message rejected
- [ ] Long message handled
- [ ] Special characters safe

### Test 16: Network Error

**Steps**:
1. Stop Ollama service
2. Try to send message
3. Observe error handling

**Expected Result**:
- Error message displayed
- Graceful fallback
- No crash

**Verification Checklist**:
- [ ] Error displayed
- [ ] Graceful fallback
- [ ] No crash

### Test 17: Database Error

**Steps**:
1. Stop PostgreSQL
2. Try to send message
3. Observe error handling

**Expected Result**:
- Error message displayed
- Chat still works (in-memory)
- No crash

**Verification Checklist**:
- [ ] Error displayed
- [ ] Graceful fallback
- [ ] No crash

---

## Responsive Design Testing

### Test 18: Desktop Layout

**Steps**:
1. Open terminal on desktop (1920x1080)
2. Send message
3. Observe layout

**Expected Result**:
- Chat log visible
- Keywords render properly
- Suggestions render properly
- Input field visible
- All buttons clickable

**Verification Checklist**:
- [ ] Layout correct
- [ ] All elements visible
- [ ] Buttons clickable

### Test 19: Tablet Layout

**Steps**:
1. Open DevTools
2. Set viewport to tablet (768x1024)
3. Send message
4. Observe layout

**Expected Result**:
- Chat log visible
- Keywords render properly
- Suggestions render properly
- Input field visible
- All buttons clickable

**Verification Checklist**:
- [ ] Layout correct
- [ ] All elements visible
- [ ] Buttons clickable

### Test 20: Mobile Layout

**Steps**:
1. Open DevTools
2. Set viewport to mobile (375x667)
3. Send message
4. Observe layout

**Expected Result**:
- Chat log visible
- Keywords render properly
- Suggestions render properly
- Input field visible
- All buttons clickable

**Verification Checklist**:
- [ ] Layout correct
- [ ] All elements visible
- [ ] Buttons clickable

---

## Success Criteria

### All Tests Pass ✅
- [ ] Test 1: API returns keywords/suggestions
- [ ] Test 2: Docling processes files
- [ ] Test 3: Database persists keywords
- [ ] Test 4: Evidence linking works
- [ ] Test 5: Keywords render
- [ ] Test 6: Suggestions render
- [ ] Test 7: Keyword click works
- [ ] Test 8: Suggestion click works
- [ ] Test 9: No TypeScript errors
- [ ] Test 10: Full chat flow works
- [ ] Test 11: File upload works
- [ ] Test 12: Chat history loads
- [ ] Test 13: Response time acceptable
- [ ] Test 14: No memory leaks
- [ ] Test 15: Invalid input handled
- [ ] Test 16: Network error handled
- [ ] Test 17: Database error handled
- [ ] Test 18: Desktop layout correct
- [ ] Test 19: Tablet layout correct
- [ ] Test 20: Mobile layout correct

---

## Troubleshooting

### Issue: Keywords not appearing

**Cause**: Keyword extraction failed

**Fix**:
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Check logs for errors
3. Verify keyword extractor timeout

### Issue: Suggestions not appearing

**Cause**: Suggestion generation failed

**Fix**:
1. Check API response includes suggestions
2. Check UI is rendering suggestions
3. Verify suggestion generation logic

### Issue: Database not saving keywords

**Cause**: Database connection issue

**Fix**:
1. Check PostgreSQL is running
2. Check database connection string
3. Verify table columns exist

### Issue: File upload fails

**Cause**: Docling processing failed

**Fix**:
1. Check file format is supported
2. Check file size is reasonable
3. Check Docling is installed

---

## Summary

**20 comprehensive tests** covering:
- Backend API functionality
- Database persistence
- UI rendering
- User interactions
- End-to-end flows
- Performance
- Error handling
- Responsive design

**Estimated Time**: 1-2 hours

**Status**: 🟢 **READY FOR TESTING**

---

**Next Step**: Run tests and document results
