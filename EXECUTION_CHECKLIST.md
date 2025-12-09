# Execution Checklist: Get Phase 5 Testing Live

**Date**: December 8, 2025
**Status**: Ready to execute
**Time**: 30 minutes
**Difficulty**: Easy

---

## ✅ Pre-Flight Check

Before you start, verify:
- [ ] Node dev server can start: `npm run dev` works
- [ ] Ollama is running: `curl http://localhost:11434/api/tags` returns models
- [ ] Postgres is running: `psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1"`
- [ ] You have the password for postgres user

---

## 🔴 STEP 1: Fix Database Ownership (5 minutes)

### 1.1 Open PowerShell

```powershell
cd C:\Users\james\Videos\deeds-web-app
```

### 1.2 Set Postgres password

```powershell
$env:PGPASSWORD = "your_postgres_password_here"
```

### 1.3 Run migration as postgres user

```powershell
psql -U postgres -h localhost -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

### 1.4 Verify columns exist

```powershell
psql -U postgres -h localhost -d legal_ai_db -c "\d chat_turns"
```

**Expected output includes**:
```
 image_urls          | text[]
 extracted_keywords  | text[]
 key_phrases         | text[]
 suggestions         | text[]
```

✅ **Checkpoint**: If you see these columns, move to Step 2

---

## 🟢 STEP 2: Test Backend API (5 minutes)

### 2.1 Make sure dev server is running

```bash
cd sveltekit-frontend
npm run dev
```

Wait for: `Local: http://localhost:5173`

### 2.2 Open new PowerShell window

Keep the dev server running in the first window.

### 2.3 Test the API

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

### 2.4 Check response

**Expected**: JSON with these fields:
```json
{
  "answer": "...",
  "keywords": ["CPS", "removal", "due process", ...],
  "keyPhrases": ["..."],
  "suggestions": ["Show me more evidence about: CPS", ...],
  "citations": [],
  "latencyMs": 1234
}
```

✅ **Checkpoint**: If you see this JSON, move to Step 3

---

## 🎨 STEP 3: Wire Svelte UI (15 minutes)

### 3.1 Find your chat component

**File**: `sveltekit-frontend/src/routes/terminal/+page.svelte`

Open it in your editor.

### 3.2 Add message type to `<script>` block

Find the `<script lang="ts">` section and add this at the top:

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
```

### 3.3 Add send message function

Add this function to your `<script>` block:

```typescript
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
}
```

### 3.4 Replace message rendering

Find where you render messages in your template and replace it with:

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

### 3.5 Verify compilation

```bash
npm run build
```

**Expected**: No TypeScript errors

✅ **Checkpoint**: If build succeeds, move to Step 4

---

## 🧪 STEP 4: Test UI (5 minutes)

### 4.1 Dev server should still be running

If not, start it:
```bash
npm run dev
```

### 4.2 Open Terminal UI

Go to: `http://localhost:5173/terminal`

### 4.3 Send a test message

1. Type: `"Summarize the key legal issues when CPS removes a child from the home."`
2. Click **Send**

### 4.4 Verify response

**You should see**:
- [ ] Assistant message appears
- [ ] Green keyword chips appear below message (e.g., `#CPS`, `#removal`)
- [ ] Suggestion buttons appear (e.g., `"Show me more evidence about: CPS"`)

### 4.5 Test interaction

1. **Click a keyword chip**: Verify it populates the input with `"Show me more evidence about: [keyword]"`
2. **Click Send**: Verify new response appears
3. **Click a suggestion button**: Verify it populates the input
4. **Click Send**: Verify new response appears

✅ **Checkpoint**: If all interactions work, you're done!

---

## 📊 STEP 5: Verify Database Persistence (Optional)

### 5.1 Query the database

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

### 5.2 Verify data

**Expected output**:
```
    extracted_keywords    |       suggestions
--------------------------+------------------------
 {CPS,removal,due process} | {Show me more evidence...}
```

✅ **Checkpoint**: If keywords/suggestions are populated, database persistence is working!

---

## ✅ Final Checklist

- [ ] Database migration applied
- [ ] API returns enriched JSON
- [ ] UI renders keywords/suggestions
- [ ] Keyword chips are clickable
- [ ] Suggestion buttons are clickable
- [ ] Follow-up messages work
- [ ] Database persistence verified

---

## 🎉 Success!

If all checkpoints pass, you have:
- ✅ Phase 4 (Database) working
- ✅ Phase 5 (Docling + VLM) working
- ✅ Full chat flow with enriched responses
- ✅ Keywords/suggestions persisting in database

**You're ready for deployment!**

---

## 🚀 Next Steps

### Deploy to Staging
```bash
npm run build
npm run deploy
```

### Then Proceed to Phase 6-8
1. Phase 6: LangExtract + KAG Synthesis
2. Phase 7: Neo4j Integration
3. Phase 8: Performance Optimization

---

## 🔧 Troubleshooting

### Issue: Migration fails with ownership error
**Solution**: Make sure you're running as `postgres` user, not `legal_admin`

### Issue: API returns 404
**Solution**: Restart dev server: `npm run dev`

### Issue: Keywords/suggestions are empty
**Solution**: Check Ollama is running: `curl http://localhost:11434/api/tags`

### Issue: UI doesn't show keywords
**Solution**: Check browser console for errors, verify API response in DevTools

### Issue: Build fails with TypeScript errors
**Solution**: Check that `ChatMessage` type is defined and all variables are declared

---

**Status**: Ready to execute
**Time**: 30 minutes
**Difficulty**: Easy

Start with Step 1 and work through each checkpoint!

