# DO THIS NOW: 30-Minute Testing Plan

**Status**: Backend complete, ready for testing
**Time**: 30 minutes
**Difficulty**: Easy

---

## 1️⃣ Fix Database (5 min)

```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

✅ Done when you see: `ALTER TABLE`, `CREATE INDEX`

---

## 2️⃣ Test Backend (5 min)

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

✅ Done when you see: `answer`, `keywords`, `suggestions` in JSON

---

## 3️⃣ Wire UI (15 min)

**File**: `src/routes/terminal/+page.svelte`

**Add to `<script>`**:
```typescript
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

  messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: text }];
  currentInput = '';

  const res = await fetch('/api/ai/yorha/context-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, caseId, message: text })
  });

  const data = await res.json();
  messages = [...messages, {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: data.answer,
    keywords: data.keywords ?? [],
    keyPhrases: data.keyPhrases ?? [],
    suggestions: data.suggestions ?? []
  }];
}

function useSuggestion(s: string) {
  currentInput = s;
}
```

**Replace message rendering with**:
```svelte
<div class="flex flex-col h-full gap-2">
  <div class="flex-1 overflow-auto space-y-3">
    {#each messages as msg (msg.id)}
      <div class={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'ml-auto bg-slate-800 text-slate-50' : 'mr-auto bg-slate-900/70 border border-slate-700 text-slate-100'}`}>
        <div class="text-[10px] uppercase tracking-wide opacity-60 mb-1">{msg.role}</div>
        <div class="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

        {#if msg.role === 'assistant'}
          {#if msg.keywords && msg.keywords.length}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each msg.keywords as kw}
                <button type="button" class="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/60 bg-sky-500/10 hover:bg-sky-500/20" on:click={() => useSuggestion(`Show me more evidence about: ${kw}`)}>#{kw}</button>
              {/each}
            </div>
          {/if}

          {#if msg.suggestions && msg.suggestions.length}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each msg.suggestions as sug}
                <button type="button" class="text-[10px] px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20" on:click={() => useSuggestion(sug)}>{sug}</button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  <form class="mt-2 flex gap-2" on:submit|preventDefault={sendMessage}>
    <input class="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" bind:value={currentInput} placeholder="Ask about evidence, CPS removal, statutes…" />
    <button type="submit" class="px-3 py-2 text-sm rounded bg-sky-600 hover:bg-sky-500 text-white">Send</button>
  </form>
</div>
```

✅ Done when: `npm run build` has no errors

---

## 4️⃣ Test UI (5 min)

1. **Start dev**: `npm run dev`
2. **Open**: `http://localhost:5173/terminal`
3. **Type**: `"Summarize the key legal issues when CPS removes a child from the home."`
4. **Click Send**
5. **Verify**:
   - [ ] Response appears
   - [ ] Green keyword chips appear
   - [ ] Suggestion buttons appear
6. **Click a chip**: Verify input populates
7. **Click Send**: Verify new response

✅ Done when: All steps work

---

## ✅ Success

If all 4 steps work, you have:
- ✅ Database persistence
- ✅ Backend API working
- ✅ UI showing keywords/suggestions
- ✅ Full chat flow working

**Total Time**: 30 minutes
**Status**: Ready for deployment

---

## 📚 Full Guides

- [IMMEDIATE_ACTION_PLAN.md](IMMEDIATE_ACTION_PLAN.md) - Detailed version
- [END_TO_END_TESTING_AND_UI_WIRING.md](END_TO_END_TESTING_AND_UI_WIRING.md) - Complete guide
- [NEXT_IMMEDIATE_ACTIONS.md](NEXT_IMMEDIATE_ACTIONS.md) - Quick reference

</content>
