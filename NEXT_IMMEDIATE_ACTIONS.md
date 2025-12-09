# Next Immediate Actions: Testing & UI Wiring

**Date**: December 8, 2025
**Status**: Backend complete, ready for testing
**Time to Complete**: 2-3 hours
**Difficulty**: Medium

---

## 🎯 What You Need to Do Right Now

### Phase 1: Backend Sanity Tests (15 minutes)

**Test 1: Direct API Call**
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

**Expected**: JSON with `answer`, `keywords`, `keyPhrases`, `suggestions`

**Test 2: Docling Test Route**
```powershell
curl -X POST http://localhost:5173/api/dev/docling-test `
  -F "file=@C:\path\to\test.pdf"
```

**Expected**: JSON with `success: true`, `keywords`, `analysis`

**Test 3: Database Check**
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "\d chat_turns"
```

**Expected**: Columns `image_urls`, `extracted_keywords`, `key_phrases`, `suggestions` exist

---

### Phase 2: UI Wiring (1-2 hours)

**File**: `src/routes/terminal/+page.svelte`

**What to add**:

1. **Message type** (in `<script>`):
```typescript
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keywords?: string[];
  keyPhrases?: string[];
  suggestions?: string[];
};
```

2. **Send message function**:
```typescript
async function sendMessage() {
  const msg = currentInput.trim();
  if (!msg) return;

  messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: msg }];
  currentInput = '';

  const res = await fetch('/api/ai/yorha/context-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, caseId, message: msg })
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
```

3. **Render keywords & suggestions** (in template):
```svelte
{#if msg.role === 'assistant' && msg.keywords}
  <div class="mt-2 flex flex-wrap gap-1">
    {#each msg.keywords as kw}
      <button
        class="text-[10px] px-2 py-1 rounded-full border border-emerald-400/60 bg-emerald-900/30"
        on:click={() => currentInput = `Show me more evidence about: ${kw}`}
      >
        #{kw}
      </button>
    {/each}
  </div>
{/if}

{#if msg.role === 'assistant' && msg.suggestions}
  <div class="mt-2 flex flex-wrap gap-2">
    {#each msg.suggestions as sug}
      <button
        class="text-[10px] px-2 py-1 rounded border border-lime-400/60 bg-lime-900/30"
        on:click={() => currentInput = sug}
      >
        💡 {sug}
      </button>
    {/each}
  </div>
{/if}
```

---

### Phase 3: End-to-End Test (30 minutes)

1. **Start dev server**: `npm run dev`
2. **Open Terminal UI**: `http://localhost:5173/terminal`
3. **Send a message**: `"What are the key legal issues in child removal cases?"`
4. **Verify**:
   - [ ] Response appears
   - [ ] Green keyword chips appear
   - [ ] Suggestion buttons appear
5. **Click a chip**: Verify it populates input
6. **Click a suggestion**: Verify it populates input
7. **Send follow-up**: Verify new response appears

---

## 📋 Checklist

### Backend Tests
- [ ] API returns enriched JSON
- [ ] Docling test route works
- [ ] Database columns exist
- [ ] Keywords/suggestions persist

### UI Wiring
- [ ] Message type extended
- [ ] Send function updated
- [ ] Keywords render as chips
- [ ] Suggestions render as buttons
- [ ] Clicks populate input
- [ ] No TypeScript errors

### End-to-End
- [ ] Chat flow works
- [ ] Keywords display correctly
- [ ] Suggestions are clickable
- [ ] Follow-ups work
- [ ] Database persistence verified

---

## 🚀 Deployment After Testing

### Step 1: Deploy Phase 4 (Database)
```bash
cd sveltekit-frontend
npx drizzle-kit migrate
```
**Time**: 10-25 minutes

### Step 2: Deploy Phase 5 (Docling)
```bash
npm run build
npm run deploy
```
**Time**: 5-10 minutes

### Total: 30-45 minutes, LOW risk

---

## 📚 Full Documentation

- **[END_TO_END_TESTING_AND_UI_WIRING.md](END_TO_END_TESTING_AND_UI_WIRING.md)** - Complete testing guide
- **[READY_FOR_TESTING_CHECKLIST.md](READY_FOR_TESTING_CHECKLIST.md)** - Testing checklist
- **[QUICK_START_PHASES_1_TO_5.md](QUICK_START_PHASES_1_TO_5.md)** - Quick deployment guide

---

## ✅ Success Criteria

**Backend**: API returns keywords/suggestions, database persists them
**UI**: Keywords/suggestions render and are clickable
**End-to-End**: Full chat flow works with enriched responses

---

**Status**: Ready for testing
**Next**: Run sanity tests, then wire UI
**Time**: 2-3 hours total

</content>
