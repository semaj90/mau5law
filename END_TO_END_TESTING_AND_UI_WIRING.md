# End-to-End Testing & UI Wiring Guide

**Date**: December 8, 2025
**Status**: Backend complete, ready for testing and UI wiring
**Estimated Time**: 2-3 hours for full integration
**Difficulty**: Medium

---

## Overview

This guide walks you through:
1. **Backend Sanity Tests** (15 minutes) - Verify the API works
2. **Database Verification** (10 minutes) - Confirm persistence
3. **UI Wiring** (1-2 hours) - Render keywords/suggestions in chat
4. **End-to-End Test** (30 minutes) - Full flow verification

---

## Part 1: Backend Sanity Tests (15 minutes)

### Test 1.1: Direct API Call (No Upload)

**PowerShell**:
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

**Expected Response**:
```json
{
  "answer": "When CPS removes a child from the home, key legal issues include...",
  "keywords": ["CPS", "removal", "due process", "parental rights"],
  "keyPhrases": ["written consent", "30 days notice"],
  "suggestions": ["Show me more evidence about: CPS", "..."],
  "citations": [...],
  "latencyMs": 1234
}
```

**Verification Checklist**:
- [ ] Response status is 200
- [ ] `answer` is a non-empty string
- [ ] `keywords` is an array with 3+ items
- [ ] `keyPhrases` is an array
- [ ] `suggestions` is an array of strings
- [ ] `latencyMs` is a number

**If this fails**:
- Check server logs: `npm run dev` output
- Verify `/api/ai/yorha/context-chat` endpoint exists
- Check that Ollama is running: `curl http://localhost:11434/api/tags`

---

### Test 1.2: Docling Smoke Test via Test Route

**PowerShell**:
```powershell
# Create a test PDF (or use an existing one)
curl -X POST http://localhost:5173/api/dev/docling-test `
  -F "file=@C:\path\to\test.pdf"
```

**Expected Response**:
```json
{
  "success": true,
  "filename": "test.pdf",
  "analysis": {
    "fullText": "...",
    "blockCount": 42,
    "pageCount": 3,
    "processingTimeMs": 2500,
    "blocks": [...]
  },
  "keywords": {
    "keywords": ["contract", "liability"],
    "keyPhrases": ["written consent"],
    "entities": [...],
    "topics": ["contract"],
    "confidence": 0.85
  }
}
```

**Verification Checklist**:
- [ ] Response status is 200
- [ ] `success` is true
- [ ] `blockCount` > 0
- [ ] `pageCount` > 0
- [ ] `keywords` array is non-empty
- [ ] `processingTimeMs` is reasonable (< 10000)

**If this fails**:
- Check Python is installed: `python --version`
- Check Docling is installed: `python -c "from docling.document_converter import DocumentConverter"`
- Check YOLO model exists: `ls sveltekit-frontend/models/yolo-doc.onnx`

---

## Part 2: Database Verification (10 minutes)

### Test 2.1: Check Migration Applied

**PowerShell**:
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "\d chat_turns"
```

**Expected Output**:
```
                    Table "public.chat_turns"
        Column        |           Type           | Collation | Nullable | Default
---------------------+--------------------------+-----------+----------+---------
 id                  | uuid                     |           | not null |
 case_id             | text                     |           |          |
 user_message        | text                     |           |          |
 assistant_response  | text                     |           |          |
 image_urls          | text[]                   |           |          | '{}'::text[]
 extracted_keywords  | text[]                   |           |          | '{}'::text[]
 key_phrases         | text[]                   |           |          | '{}'::text[]
 suggestions         | text[]                   |           |          | '{}'::text[]
 created_at          | timestamp with time zone |           |          | now()
```

**Verification Checklist**:
- [ ] `image_urls` column exists (type: text[])
- [ ] `extracted_keywords` column exists (type: text[])
- [ ] `key_phrases` column exists (type: text[])
- [ ] `suggestions` column exists (type: text[])
- [ ] All have default value `'{}'::text[]`

**If columns are missing**:
```bash
# Apply migration manually
cd sveltekit-frontend
psql -U postgres -h localhost -d legal_ai_db -f drizzle/20251208_add_keywords_to_chat_turns.sql
```

---

### Test 2.2: Verify Data Persistence

**After running Test 1.1**, query the database:

```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "
  SELECT id, user_message, extracted_keywords, key_phrases, suggestions
  FROM chat_turns
  WHERE role = 'assistant'
  ORDER BY created_at DESC
  LIMIT 1;
"
```

**Expected Output**:
```
                  id                  |     user_message      |    extracted_keywords    |      key_phrases       |       suggestions
--------------------------------------+-----------------------+--------------------------+------------------------+------------------------
 12345678-1234-1234-1234-123456789012 | Summarize the key ... | {CPS,removal,due process} | {written consent,30 days} | {Show me more evidence...}
```

**Verification Checklist**:
- [ ] Row exists for your test message
- [ ] `extracted_keywords` is populated (not empty array)
- [ ] `key_phrases` is populated
- [ ] `suggestions` is populated

**If data is not persisted**:
- Check server logs for database errors
- Verify `DATABASE_URL` environment variable is set
- Check database connection: `psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1"`

---

## Part 3: UI Wiring (1-2 hours)

### Step 3.1: Extend Message Type

**File**: `src/routes/terminal/+page.svelte` (or your chat component)

**Add this to your `<script>` block**:

```typescript
<script lang="ts">
  type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    keywords?: string[];
    keyPhrases?: string[];
    suggestions?: string[];
  };

  let messages: ChatMessage[] = [];
  let currentInput = '';
  let sessionId = 'local-session-' + Date.now();
  let caseId: string | null = null;
  let isLoading = false;

  async function sendMessage() {
    const msg = currentInput.trim();
    if (!msg || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg
    };
    messages = [...messages, userMessage];
    currentInput = '';
    isLoading = true;

    try {
      const res = await fetch('/api/ai/yorha/context-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          caseId,
          message: msg
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      // Add assistant message with enriched data
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        keywords: data.keywords ?? [],
        keyPhrases: data.keyPhrases ?? [],
        suggestions: data.suggestions ?? []
      };
      messages = [...messages, assistantMessage];
    } catch (err) {
      console.error('Chat error:', err);
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
        }
      ];
    } finally {
      isLoading = false;
    }
  }

  function sendSuggestion(suggestion: string) {
    currentInput = suggestion;
    // Optional: auto-send
    // sendMessage();
  }
</script>
```

---

### Step 3.2: Render Messages with Keywords & Suggestions

**Replace your message rendering section with this**:

```svelte
<div class="chat-container h-full flex flex-col gap-4 p-4">
  <!-- Messages -->
  <div class="flex-1 overflow-y-auto space-y-3">
    {#each messages as msg (msg.id)}
      <div
        class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          class={`max-w-[70%] rounded-lg px-4 py-2 ${
            msg.role === 'user'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-100 border border-slate-700'
          }`}
        >
          <!-- Message content -->
          <div class="text-sm whitespace-pre-wrap leading-relaxed">
            {msg.content}
          </div>

          <!-- Keywords (assistant only) -->
          {#if msg.role === 'assistant' && msg.keywords && msg.keywords.length > 0}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each msg.keywords as keyword}
                <button
                  type="button"
                  class="text-[10px] px-2 py-1 rounded-full border border-emerald-400/60 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/40 transition-colors"
                  on:click={() => sendSuggestion(`Show me more evidence about: ${keyword}`)}
                  title="Click to search for more evidence"
                >
                  #{keyword}
                </button>
              {/each}
            </div>
          {/if}

          <!-- Suggestions (assistant only) -->
          {#if msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0}
            <div class="mt-2 flex flex-wrap gap-2">
              {#each msg.suggestions as suggestion}
                <button
                  type="button"
                  class="text-[10px] px-2 py-1 rounded border border-lime-400/60 bg-lime-900/30 text-lime-300 hover:bg-lime-800/40 transition-colors"
                  on:click={() => sendSuggestion(suggestion)}
                  title="Click to ask this follow-up"
                >
                  💡 {suggestion}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if isLoading}
      <div class="flex justify-start">
        <div class="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-4 py-2">
          <div class="text-sm text-slate-400">Thinking...</div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <form
    class="flex gap-2 border-t border-slate-700 pt-4"
    on:submit|preventDefault={sendMessage}
  >
    <input
      type="text"
      bind:value={currentInput}
      placeholder="Ask about the evidence, statutes, or CPS issues…"
      disabled={isLoading}
      class="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={isLoading || !currentInput.trim()}
      class="px-4 py-2 text-sm rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? 'Sending...' : 'Send'}
    </button>
  </form>
</div>

<style>
  .chat-container {
    font-family: 'Courier New', monospace;
  }
</style>
```

---

### Step 3.3: Verify Compilation

```bash
cd sveltekit-frontend
npm run build
```

**Expected**: No TypeScript errors

**If you get errors**:
- Check that `ChatMessage` type is defined
- Verify `sendMessage()` and `sendSuggestion()` functions exist
- Check that all template variables are defined

---

## Part 4: End-to-End Test (30 minutes)

### Test 4.1: Simple Chat Flow

1. **Start dev server**:
   ```bash
   cd sveltekit-frontend
   npm run dev
   ```

2. **Open Terminal UI**: `http://localhost:5173/terminal`

3. **Send a message**:
   - Type: `"What are the key legal issues in child removal cases?"`
   - Click Send

4. **Verify response**:
   - [ ] Message appears in chat
   - [ ] Assistant response appears
   - [ ] Green keyword chips appear below response
   - [ ] Suggestion buttons appear below keywords

5. **Test interaction**:
   - Click a keyword chip
   - Verify it populates the input: `"Show me more evidence about: [keyword]"`
   - Click Send
   - Verify new response appears

6. **Test suggestion**:
   - Click a suggestion button
   - Verify it populates the input
   - Click Send
   - Verify new response appears

---

### Test 4.2: Document Upload Flow (Optional)

1. **In Terminal UI, upload a document**:
   - Click "Upload" button
   - Select a PDF or image
   - Wait for Docling analysis

2. **Ask about the document**:
   - Type: `"Analyze the document I just uploaded. What are the main obligations?"`
   - Click Send

3. **Verify response**:
   - [ ] Answer references the uploaded document
   - [ ] Keywords are extracted from the document
   - [ ] Suggestions are relevant to the document content

4. **Check database**:
   ```powershell
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "
     SELECT extracted_keywords, suggestions
     FROM chat_turns
     WHERE role = 'assistant'
     ORDER BY created_at DESC
     LIMIT 1;
   "
   ```
   - [ ] Keywords are populated
   - [ ] Suggestions are populated

---

## Troubleshooting

### Issue: API returns 404

**Solution**:
- Verify endpoint exists: `src/routes/api/ai/yorha/context-chat/+server.ts`
- Check server logs for routing errors
- Restart dev server: `npm run dev`

### Issue: Keywords/suggestions are empty arrays

**Solution**:
- Check that `contextualChat()` function returns these fields
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check server logs for keyword extraction errors

### Issue: Database columns don't exist

**Solution**:
```bash
cd sveltekit-frontend
psql -U postgres -h localhost -d legal_ai_db -f drizzle/20251208_add_keywords_to_chat_turns.sql
```

### Issue: UI doesn't show keywords/suggestions

**Solution**:
- Check browser console for JavaScript errors
- Verify `ChatMessage` type includes these fields
- Check that API response includes these fields (DevTools → Network)
- Verify template syntax is correct

### Issue: Docling test fails

**Solution**:
- Check Python is installed: `python --version`
- Check Docling is installed: `pip list | grep docling`
- Check YOLO model exists: `ls sveltekit-frontend/models/yolo-doc.onnx`
- Check server logs for Python errors

---

## Success Criteria

### Backend ✅
- [ ] API returns enriched JSON with keywords/suggestions
- [ ] Database stores keywords/suggestions
- [ ] Docling analysis works on PDFs/images

### UI ✅
- [ ] Keywords render as clickable chips
- [ ] Suggestions render as clickable buttons
- [ ] Clicking chips/buttons populates input
- [ ] Follow-up messages work correctly

### End-to-End ✅
- [ ] Full chat flow works
- [ ] Document upload → analysis → chat works
- [ ] Keywords/suggestions persist in database
- [ ] UI displays all enriched data

---

## Next Steps

### Immediate (After UI Wiring)
1. ✅ Deploy Phase 4 migration
2. ✅ Test Phase 5 integration
3. ✅ Wire frontend UI
4. ⏳ Deploy to staging

### Short Term (2-3 hours)
1. Wire "Ask AI" button into evidence cards
2. Add keyword analytics dashboard
3. Implement keyword search

### Medium Term (Phase 6-8)
1. Phase 6: LangExtract + KAG Synthesis
2. Phase 7: Neo4j Integration
3. Phase 8: Performance Optimization

---

## Quick Reference

### Key Files
- Backend: `src/routes/api/ai/yorha/context-chat/+server.ts`
- UI: `src/routes/terminal/+page.svelte`
- Database: `drizzle/20251208_add_keywords_to_chat_turns.sql`
- Docling: `src/lib/server/docling.ts`

### Key Endpoints
- Chat: `POST /api/ai/yorha/context-chat`
- Docling test: `POST /api/dev/docling-test`

### Key Commands
- Start dev: `npm run dev`
- Build: `npm run build`
- Database: `psql -U postgres -h localhost -d legal_ai_db`

---

**Status**: Ready for testing and UI wiring
**Estimated Time**: 2-3 hours
**Difficulty**: Medium

</content>
