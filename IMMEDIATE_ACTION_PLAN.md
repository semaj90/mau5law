# Immediate Action Plan: Get Testing Now

**Date**: December 8, 2025
**Status**: Backend ready, fix DB ownership, then test
**Time**: 30 minutes to full testing
**Difficulty**: Easy

---

## 🔴 Step 1: Fix Database Ownership (5 minutes)

### Problem
```
Migration error: must be owner of table chat_turns
```

The table is owned by `postgres`, but you're running migrations as `legal_admin`.

### Solution: Run as postgres (Easiest)

**PowerShell**:
```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

**Expected Output**:
```
ALTER TABLE
CREATE INDEX
CREATE INDEX
```

**Verify it worked**:
```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -c "\d chat_turns"
```

**Look for these columns**:
- `image_urls` (text[])
- `extracted_keywords` (text[])
- `key_phrases` (text[])
- `suggestions` (text[])

✅ If you see them, migration is done!

---

## 🟢 Step 2: Backend Sanity Test (5 minutes)

### Make sure Node dev server is running
```bash
cd sveltekit-frontend
npm run dev
```

### Test 1: Direct API Call

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
  "citations": [],
  "latencyMs": 1234
}
```

✅ If you see this, backend is working!

---

## 🎨 Step 3: Wire Svelte UI (20 minutes)

### Find your chat component

**File**: `src/routes/terminal/+page.svelte` (or wherever your chat UI is)

### Add this to your `<script>` block

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

  async function sendMessage() {
    const text = currentInput.trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text
    };
    messages = [...messages, userMsg];
    currentInput = '';

    // Call API
    const res = await fetch('/api/ai/yorha/context-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        caseId,
        message: text
      })
    });

    const data = await res.json();

    // Add assistant message with enriched data
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.answer,
      keywords: data.keywords ?? [],
      keyPhrases: data.keyPhrases ?? [],
      suggestions: data.suggestions ?? []
    };
    messages = [...messages, assistantMsg];
  }

  function useSuggestion(s: string) {
    currentInput = s;
    // Optional: auto-send
    // sendMessage();
  }
</script>
```

### Replace your message rendering with this

```svelte
<div class="flex flex-col h-full gap-2">
  <!-- Messages -->
  <div class="flex-1 overflow-auto space-y-3">
    {#each messages as msg (msg.id)}
      <div
        class={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          msg.role === 'user'
            ? 'ml-auto bg-slate-800 text-slate-50'
            : 'mr-auto bg-slate-900/70 border border-slate-700 text-slate-100'
        }`}
      >
        <div class="text-[10px] uppercase tracking-wide opacity-60 mb-1">
          {msg.role}
        </div>
        <div class="whitespace-pre-wrap leading-relaxed">
          {msg.content}
        </div>

        {#if msg.role === 'assistant'}
          <!-- Keywords -->
          {#if msg.keywords && msg.keywords.length}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each msg.keywords as kw}
                <button
                  type="button"
                  class="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/60 bg-sky-500/10 hover:bg-sky-500/20"
                  on:click={() => useSuggestion(`Show me more evidence about: ${kw}`)}
                >
                  #{kw}
                </button>
              {/each}
            </div>
          {/if}

          <!-- Suggestions -->
          {#if msg.suggestions && msg.suggestions.length}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each msg.suggestions as sug}
                <button
                  type="button"
                  class="text-[10px] px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20"
                  on:click={() => useSuggestion(sug)}
                >
                  {sug}
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Input -->
  <form class="mt-2 flex gap-2" on:submit|preventDefault={sendMessage}>
    <input
      class="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
      bind:value={currentInput}
      placeholder="Ask about evidence, CPS removal, statutes…"
    />
    <button
      type="submit"
      class="px-3 py-2 text-sm rounded bg-sky-600 hover:bg-sky-500 text-white"
    >
      Send
    </button>
  </form>
</div>
```

### Verify it compiles

```bash
npm run build
```

✅ If no errors, UI is wired!

---

## 🧪 Step 4: Full Stack Test (5 minutes)

### Scenario A: Pure Text Chat

1. **Open Terminal UI**: `http://localhost:5173/terminal`
2. **Type**: `"Summarize the key legal issues when CPS removes a child from the home."`
3. **Click Send**
4. **Verify**:
   - [ ] Assistant response appears
   - [ ] Green keyword chips appear below response
   - [ ] Suggestion buttons appear below keywords
5. **Click a keyword chip**: Verify it populates input with `"Show me more evidence about: [keyword]"`
6. **Click Send**: Verify new response appears

### Scenario B: Document Upload (Optional)

1. **In Terminal UI, upload a PDF or image**
2. **Type**: `"Analyze the document I just uploaded. What are the main obligations?"`
3. **Click Send**
4. **Verify**:
   - [ ] Answer references the document
   - [ ] Keywords are from the document
   - [ ] Suggestions are relevant

### Scenario C: Database Persistence

```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -c "
  SELECT extracted_keywords, suggestions
  FROM chat_turns
  WHERE role = 'assistant'
  ORDER BY created_at DESC
  LIMIT 1;
"
```

**Verify**:
- [ ] `extracted_keywords` is populated (not empty array)
- [ ] `suggestions` is populated

✅ If all three scenarios work, you're done!

---

## 📋 Quick Checklist

### Database
- [ ] Migration applied (columns exist)
- [ ] No ownership errors

### Backend
- [ ] API returns enriched JSON
- [ ] Keywords/suggestions are populated
- [ ] No 500 errors

### UI
- [ ] Keywords render as chips
- [ ] Suggestions render as buttons
- [ ] Clicks populate input
- [ ] No TypeScript errors

### End-to-End
- [ ] Chat flow works
- [ ] Keywords display correctly
- [ ] Suggestions are clickable
- [ ] Database persistence verified

---

## 🚀 If Everything Works

You're ready to deploy:

```bash
# Phase 4 is already migrated
# Phase 5 is already wired

# Just build and deploy
npm run build
npm run deploy
```

---

## 🔧 Troubleshooting

### Issue: API returns 404
- Check endpoint exists: `src/routes/api/ai/yorha/context-chat/+server.ts`
- Restart dev server: `npm run dev`

### Issue: Keywords/suggestions are empty
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check server logs for errors

### Issue: UI doesn't show keywords
- Check browser console for JavaScript errors
- Verify API response includes keywords (DevTools → Network)
- Check template syntax

### Issue: Database columns don't exist
```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

---

## ✅ Success Criteria

- [ ] Database migration applied
- [ ] API returns enriched JSON
- [ ] UI renders keywords/suggestions
- [ ] Clicks work correctly
- [ ] Database persistence verified

---

**Time to Complete**: 30 minutes
**Difficulty**: Easy
**Status**: Ready to test

</content>
