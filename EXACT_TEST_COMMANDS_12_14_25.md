# Exact Test Commands - Copy & Paste Ready
**Date**: December 14, 2025
**Status**: Ready to Execute
**Total Time**: ~60 minutes

---

## ⚡ Quick Start (5 minutes)

### 1. Verify Dev Server is Running
```powershell
# Check if dev server is running on port 5174
curl http://localhost:5174/api/health
```

**Expected Output**:
```json
{"status":"ok"}
```

### 2. Verify Database Connection
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "SELECT 1"
```

**Expected Output**:
```
 ?column?
----------
        1
```

---

## 🧪 Phase 1: Backend & Database Testing (15 minutes)

### Test 1.1: Database Schema Verification
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "\d chat_turns"
```

**Expected Output**:
```
Table "public.chat_turns"
       Column       |           Type           | Collation | Nullable |      Default
--------------------+--------------------------+-----------+----------+-------------------
 id                 | uuid                     |           | not null | gen_random_uuid()
 case_id            | uuid                     |           |          |
 user_message       | text                     |           | not null |
 assistant_response | text                     |           | not null |
 created_at         | timestamp with time zone |           |          | now()
 updated_at         | timestamp with time zone |           |          | now()
 image_urls         | text[]                   |           |          | '{}'::text[]
 extracted_keywords | text[]                   |           |          | '{}'::text[]
 key_phrases        | text[]                   |           |          | '{}'::text[]
 suggestions        | text[]                   |           |          | '{}'::text[]
```

**Verification**: ✅ All 4 new columns present

---

### Test 1.2: Health Check Endpoint
```powershell
curl http://localhost:5174/api/health
```

**Expected Output**:
```json
{"status":"ok"}
```

**Verification**: ✅ API responding

---

### Test 1.3: Database Health Check
```powershell
curl http://localhost:5174/api/health/db
```

**Expected Output**:
```json
{"status":"ok","database":"connected"}
```

**Verification**: ✅ Database connected

---

### Test 1.4: Cache Health Check
```powershell
curl http://localhost:5174/api/health/cache
```

**Expected Output**:
```json
{"status":"ok","cache":"connected"}
```

**Verification**: ✅ Cache connected

---

### Test 1.5: Context Chat API - Basic Test
```powershell
$body = @{
    sessionId = "test-session-001"
    userId = "test-user-001"
    caseId = $null
    message = "What are the key legal issues in child custody cases?"
} | ConvertTo-Json

curl -X POST http://localhost:5174/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

**Expected Output**:
```json
{
  "turnId": "uuid-string",
  "answer": "Child custody cases involve several key legal issues...",
  "keywords": ["custody", "child", "legal", ...],
  "keyPhrases": ["child custody", "legal issues", ...],
  "suggestions": [
    {"query": "Explore: child custody", "reason": "Key phrase from analysis", "score": 0.8},
    ...
  ],
  "latencyMs": 1234,
  "citations": []
}
```

**Verification Checklist**:
- [ ] Status: 200 OK
- [ ] `turnId` is a valid UUID
- [ ] `answer` contains meaningful text
- [ ] `keywords` array has 3+ items
- [ ] `keyPhrases` array has 3+ items
- [ ] `suggestions` array has 3+ items
- [ ] `latencyMs` is a number

---

### Test 1.6: Context Chat API - CPS Removal Test
```powershell
$body = @{
    sessionId = "test-session-002"
    userId = "test-user-001"
    caseId = $null
    message = "Summarize the key legal issues when CPS removes a child from the home."
} | ConvertTo-Json

curl -X POST http://localhost:5174/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

**Expected Output**: Similar to Test 1.5, with CPS-related keywords

**Verification**: ✅ API returns valid response with keywords

---

### Test 1.7: Error Handling - Missing Message
```powershell
$body = @{
    sessionId = "test-session-003"
    userId = "test-user-001"
    caseId = $null
} | ConvertTo-Json

curl -X POST http://localhost:5174/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

**Expected Output**:
```json
{"error":"Message is required"}
```

**Verification**: ✅ Returns 400 error for missing message

---

### Test 1.8: Error Handling - Invalid JSON
```powershell
curl -X POST http://localhost:5174/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d "invalid json"
```

**Expected Output**:
```json
{"error":"Invalid JSON body"}
```

**Verification**: ✅ Returns 400 error for invalid JSON

---

### Test 1.9: Database Persistence Check
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT
  id,
  user_message,
  extracted_keywords,
  key_phrases,
  suggestions,
  created_at
FROM chat_turns
ORDER BY created_at DESC
LIMIT 3;"
```

**Expected Output**:
```
                  id                  |                user_message                 | extracted_keywords |      key_phrases       |                suggestions                 |         created_at
--------------------------------------+---------------------------------------------+--------------------+------------------------+--------------------------------------------+----------------------------
 uuid-1                               | What are the key legal issues...            | {custody,child}    | {child custody}        | {Explore: child custody}                   | 2025-12-14 13:56:00+00
 uuid-2                               | Summarize the key legal issues...           | {CPS,removal}      | {child removal}        | {Explore: child removal}                   | 2025-12-14 13:57:00+00
```

**Verification**: ✅ Chat turns persisted with keywords and suggestions

---

## 🎨 Phase 2: Frontend UI Testing (30 minutes)

### Test 2.1: Terminal Page Load
```
1. Open browser: http://localhost:5174/terminal
2. Wait for page to load
3. Check browser console (F12) for errors
```

**Expected**:
- [ ] Page loads without errors
- [ ] No red errors in console
- [ ] Sidebar visible on left
- [ ] Chat area visible in center
- [ ] Input textarea at bottom
- [ ] Send button visible

---

### Test 2.2: Chat Message Send
```
1. Click in the input textarea
2. Type: "What are the main legal issues in child custody cases?"
3. Click Send button (or press Enter)
4. Wait for response
```

**Expected**:
- [ ] User message appears in chat
- [ ] Loading indicator shows
- [ ] Assistant response appears
- [ ] Response contains meaningful text
- [ ] No console errors

---

### Test 2.3: Keyword Chips Display
```
1. After response appears, look below the assistant message
2. Verify green keyword chips appear
3. Example: #custody, #child, #legal
```

**Expected**:
- [ ] 3+ keyword chips visible
- [ ] Chips are green colored
- [ ] Chips have # prefix
- [ ] Chips are clickable (cursor changes)

---

### Test 2.4: Keyword Chip Click
```
1. Click on a keyword chip (e.g., #custody)
2. Verify input field populates with suggestion
3. Click Send button
4. Verify new response appears
```

**Expected**:
- [ ] Input field populates with suggestion
- [ ] New message can be sent
- [ ] New response appears
- [ ] No console errors

---

### Test 2.5: Suggestion Button Click
```
1. Look for suggestion buttons below keywords
2. Click on a suggestion button
3. Verify input field populates
4. Click Send button
5. Verify new response appears
```

**Expected**:
- [ ] Input field populates with suggestion
- [ ] New message can be sent
- [ ] New response appears
- [ ] No console errors

---

### Test 2.6: Empty Message Handling
```
1. Click Send button without typing anything
2. Verify nothing happens
3. Type only spaces
4. Click Send button
5. Verify nothing happens
```

**Expected**:
- [ ] Send button disabled when empty
- [ ] No request sent
- [ ] No error message shown

---

### Test 2.7: Keyboard Shortcuts
```
1. Type a message
2. Press Shift+Enter
3. Verify newline added to message
4. Press Enter
5. Verify message sent
```

**Expected**:
- [ ] Shift+Enter adds newline
- [ ] Enter sends message
- [ ] Message appears in chat
- [ ] Response appears

---

### Test 2.8: Multiple Messages
```
1. Send 3-5 messages in sequence
2. Verify all messages appear in chat
3. Verify all responses appear
4. Verify chat scrolls properly
5. Verify no console errors
```

**Expected**:
- [ ] All messages visible
- [ ] Chat scrolls smoothly
- [ ] No duplicate messages
- [ ] No console errors

---

### Test 2.9: YoRHa Detective Page
```
1. Open: http://localhost:5174/yorha-detective
2. Wait for boot sequence
3. Verify boot screen displays
4. Verify progress bar animates
5. Verify boot messages appear
6. Wait for Detective Interface to load
```

**Expected**:
- [ ] Boot screen displays
- [ ] YoRHa logo visible with green glow
- [ ] Progress bar animates
- [ ] Boot messages appear sequentially
- [ ] After boot, Detective Interface loads
- [ ] No console errors

---

## 💾 Phase 3: Data Persistence Testing (15 minutes)

### Test 3.1: Verify Chat Turns Saved
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT COUNT(*) as total_chats FROM chat_turns;"
```

**Expected Output**:
```
 total_chats
-------------
           5
```

**Verification**: ✅ Chat turns persisted

---

### Test 3.2: Verify Keywords Extracted
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT
  extracted_keywords,
  key_phrases
FROM chat_turns
WHERE extracted_keywords IS NOT NULL
LIMIT 3;"
```

**Expected Output**:
```
 extracted_keywords |      key_phrases
--------------------+------------------------
 {custody,child}    | {child custody}
 {CPS,removal}      | {child removal}
 {legal,issues}     | {legal issues}
```

**Verification**: ✅ Keywords extracted and stored

---

### Test 3.3: Verify Suggestions Generated
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT
  suggestions,
  created_at
FROM chat_turns
WHERE suggestions IS NOT NULL
LIMIT 3;"
```

**Expected Output**:
```
                suggestions                 |         created_at
--------------------------------------------+----------------------------
 {Explore: child custody}                   | 2025-12-14 13:56:00+00
 {Explore: child removal}                   | 2025-12-14 13:57:00+00
 {Explore: legal issues}                    | 2025-12-14 13:58:00+00
```

**Verification**: ✅ Suggestions generated and stored

---

### Test 3.4: Verify Timestamps
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT
  user_message,
  created_at,
  updated_at
FROM chat_turns
ORDER BY created_at DESC
LIMIT 3;"
```

**Expected Output**:
```
                user_message                 |         created_at         |         updated_at
---------------------------------------------+----------------------------+----------------------------
 Summarize the key legal issues...           | 2025-12-14 13:58:00+00     | 2025-12-14 13:58:00+00
 What are the main legal issues...           | 2025-12-14 13:57:00+00     | 2025-12-14 13:57:00+00
 What are the key legal issues...            | 2025-12-14 13:56:00+00     | 2025-12-14 13:56:00+00
```

**Verification**: ✅ Timestamps recorded correctly

---

### Test 3.5: Verify Case ID Association
```powershell
$env:PGPASSWORD = "postgres"
psql -U postgres -h 127.0.0.1 -d legal_ai_db -c "
SELECT
  id,
  case_id,
  user_message
FROM chat_turns
WHERE case_id IS NOT NULL
LIMIT 3;"
```

**Expected Output**:
```
                  id                  |                case_id                 |                user_message
--------------------------------------+----------------------------------------+---------------------------------------------
 uuid-1                               | case-uuid-1                            | What are the key legal issues...
 uuid-2                               | case-uuid-1                            | Summarize the key legal issues...
```

**Verification**: ✅ Case associations working

---

## 📊 Test Summary Template

```
TESTING SUMMARY - December 14, 2025
====================================

Phase 1: Backend & Database Testing
- Test 1.1 (Schema): ✅ PASS / ❌ FAIL
- Test 1.2 (Health): ✅ PASS / ❌ FAIL
- Test 1.3 (DB Health): ✅ PASS / ❌ FAIL
- Test 1.4 (Cache Health): ✅ PASS / ❌ FAIL
- Test 1.5 (API Basic): ✅ PASS / ❌ FAIL
- Test 1.6 (API CPS): ✅ PASS / ❌ FAIL
- Test 1.7 (Error Missing): ✅ PASS / ❌ FAIL
- Test 1.8 (Error Invalid): ✅ PASS / ❌ FAIL
- Test 1.9 (Persistence): ✅ PASS / ❌ FAIL

Phase 2: Frontend UI Testing
- Test 2.1 (Page Load): ✅ PASS / ❌ FAIL
- Test 2.2 (Message Send): ✅ PASS / ❌ FAIL
- Test 2.3 (Keywords): ✅ PASS / ❌ FAIL
- Test 2.4 (Keyword Click): ✅ PASS / ❌ FAIL
- Test 2.5 (Suggestion Click): ✅ PASS / ❌ FAIL
- Test 2.6 (Empty Message): ✅ PASS / ❌ FAIL
- Test 2.7 (Keyboard): ✅ PASS / ❌ FAIL
- Test 2.8 (Multiple): ✅ PASS / ❌ FAIL
- Test 2.9 (Detective): ✅ PASS / ❌ FAIL

Phase 3: Data Persistence Testing
- Test 3.1 (Chat Saved): ✅ PASS / ❌ FAIL
- Test 3.2 (Keywords): ✅ PASS / ❌ FAIL
- Test 3.3 (Suggestions): ✅ PASS / ❌ FAIL
- Test 3.4 (Timestamps): ✅ PASS / ❌ FAIL
- Test 3.5 (Case ID): ✅ PASS / ❌ FAIL

OVERALL RESULT: ✅ PASS / ❌ FAIL

Issues Found:
- [List any issues]

Next Steps:
- [List next steps]
```

---

## 🚀 Ready to Test!

All commands are ready to copy and paste. Start with Phase 1, then Phase 2, then Phase 3.

**Estimated Total Time**: 60 minutes

**Status**: ✅ **READY TO EXECUTE**

