# Troubleshooting & Execution Guide

**Date**: December 8, 2025
**Status**: Ready to execute locally
**Time**: 30 minutes
**Difficulty**: Easy

---

## 🔴 Issue 1: Port 5173 Already in Use

### Problem
```
Error: Port 5173 is already in use
```

### Solution

**Step 1: Find and kill the process**
```powershell
netstat -ano | findstr 5173
```

**Step 2: Kill the process**
```powershell
taskkill /PID <pid_number> /F
```

**Step 3: Restart dev server**
```powershell
cd sveltekit-frontend
npm run dev
```

Wait for: `Local: http://localhost:5173`

---

## 🟢 Issue 2: Ollama Not Found (404)

### Problem
```
Ollama chat failed: Not Found
```

### Solution

**Step 1: Verify Ollama is running**
```powershell
curl.exe http://localhost:11434/api/tags
```

**Expected**: JSON list of models

**Step 2: Verify model exists**
```powershell
ollama list
```

**Expected output**:
```
NAME                       ID              SIZE      MODIFIED
gemma3-legal:latest        4da83794b3c7    7.3 GB    4 weeks ago
embeddinggemma:latest      85462619ee72    621 MB    ...
```

**Step 3: If model is missing, pull it**
```powershell
ollama pull gemma3-legal:latest
ollama pull embeddinggemma:latest
```

**Step 4: Verify endpoint**
```powershell
curl.exe -X POST http://localhost:11434/api/generate `
  -H "content-type: application/json" `
  -d "{\"model\":\"gemma3-legal:latest\",\"prompt\":\"hello\"}"
```

**Expected**: JSON response with generated text

---

## 🟡 Issue 3: ECONNREFUSED / Embedding Service Error

### Problem
```
TypeError: fetch failed ... ECONNREFUSED
TypeError: (0, __vite_ssr_import_0__.getEmbedding) is not a function
```

### Solution

**Step 1: Check if embedding service is needed**

Open `src/lib/server/rag-query.ts` and look for:
```typescript
import { getEmbedding } from '$lib/server/embedding-service';
```

**Step 2: Fix import if needed**

If the module uses default export:
```typescript
// Change from:
import { getEmbedding } from '$lib/server/embedding-service';

// To:
import getEmbedding from '$lib/server/embedding-service';
```

**Step 3: Or skip the service if not needed**

If you're not using embeddings yet, comment out the call:
```typescript
// const embedding = await getEmbedding(message);
// For now, use null or empty array
const embedding = null;
```

---

## 🔵 Issue 4: JSON Parse Errors in curl

### Problem
```
Expected property name
SyntaxError: Unexpected token
```

### Solution

**Use this exact PowerShell command**:
```powershell
curl.exe ^
  -X POST ^
  http://localhost:5173/api/ai/yorha/context-chat ^
  -H "content-type: application/json" ^
  -d "{\"sessionId\":\"test-session-001\",\"userId\":\"test-user-001\",\"caseId\":null,\"message\":\"Summarize the key legal issues when CPS removes a child from the home.\"}"
```

**Key points**:
- Use `curl.exe` (not just `curl`)
- Use `^` for line continuation
- Use `\"` for escaped quotes
- Use double quotes for the entire JSON string

**Alternative: Use WSL bash**
```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "content-type: application/json" \
  -d '{"sessionId":"test-session-001","userId":"test-user-001","caseId":null,"message":"Summarize the key legal issues when CPS removes a child from the home."}'
```

---

## ✅ Step-by-Step Execution

### Step 1: Kill existing process (if needed)

```powershell
netstat -ano | findstr 5173
taskkill /PID <pid> /F
```

### Step 2: Start dev server

```powershell
cd sveltekit-frontend
npm run dev
```

**Wait for**: `Local: http://localhost:5173`

### Step 3: Test backend API

**Open new PowerShell window** and run:

```powershell
curl.exe ^
  -X POST ^
  http://localhost:5173/api/ai/yorha/context-chat ^
  -H "content-type: application/json" ^
  -d "{\"sessionId\":\"test-session-001\",\"userId\":\"test-user-001\",\"caseId\":null,\"message\":\"Summarize the key legal issues when CPS removes a child from the home.\"}"
```

**Expected response**:
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

✅ **If you see this, backend is working!**

### Step 4: Wire Svelte UI

**File**: `sveltekit-frontend/src/routes/terminal/+page.svelte`

**Find your `<script lang="ts">` block and add this at the top**:

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

  // Add user message
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text
  };
  messages = [...messages, userMsg];
  currentInput = '';

  try {
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

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

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
  }
}

function useSuggestion(s: string) {
  currentInput = s;
}
```

**Find your message rendering section and replace it with**:

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

**Verify compilation**:
```powershell
npm run build
```

✅ **If no errors, UI is wired!**

### Step 5: Test UI

1. **Open Terminal UI**: `http://localhost:5173/terminal`
2. **Type**: `"Summarize the key legal issues when CPS removes a child from the home."`
3. **Click Send**
4. **Verify**:
   - [ ] Response appears
   - [ ] Green keyword chips appear
   - [ ] Suggestion buttons appear
5. **Click a keyword chip**: Verify input populates
6. **Click Send**: Verify new response

✅ **If all work, you're done!**

---

## 📋 Quick Checklist

- [ ] Port 5173 is free
- [ ] Ollama is running with models
- [ ] Dev server starts: `npm run dev`
- [ ] API test returns enriched JSON
- [ ] UI code is added to `+page.svelte`
- [ ] Build succeeds: `npm run build`
- [ ] Terminal UI shows keywords/suggestions
- [ ] Clicks work correctly

---

## 🔧 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Port 5173 in use | Another dev server running | `taskkill /PID <pid> /F` |
| Ollama 404 | Model not pulled or wrong URL | `ollama pull gemma3-legal:latest` |
| ECONNREFUSED | Embedding service not running | Comment out embedding calls or start service |
| JSON parse error | Bad curl syntax | Use `curl.exe` with `^` line continuations |
| Keywords empty | Ollama not responding | Check `curl.exe http://localhost:11434/api/tags` |
| UI doesn't show keywords | API response not captured | Check browser console for errors |

---

## ✅ Success Criteria

- [ ] Database migration applied
- [ ] API returns enriched JSON
- [ ] UI renders keywords/suggestions
- [ ] Keyword chips are clickable
- [ ] Suggestion buttons are clickable
- [ ] Follow-up messages work
- [ ] No errors in browser console

---

**Status**: Ready to execute locally
**Time**: 30 minutes
**Next**: Follow steps 1-5 above

