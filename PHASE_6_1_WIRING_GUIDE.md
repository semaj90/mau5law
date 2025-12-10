# Phase 6.1 - Wiring Guide: Evidence Board ↔ Contextual Chat

**Status:** Design contracts finalized, ready for implementation
**Target:** Wire Evidence Board "Ask AI" to contextual-chat endpoint with real RAG

---

## 🎯 What's Done (Design Level)

### ✅ API Contract Locked
```typescript
// Request
POST /api/ai/yorha/context-chat
{
  message: string;
  caseId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
}

// Response
{
  turnId: string;
  answer: string;
  keywords: string[];
  keyPhrases: string[];
  suggestions: { query: string; reason: string; score: number }[];
  latencyMs: number;
  citations?: { id: string; source: string; score: number }[];
}
```

### ✅ DB Schema Ready
- `chat_turns` with `extracted_keywords`, `key_phrases`, `suggestions`
- `chat_turn_evidence` linking table
- `evidence` table with embeddings metadata

### ✅ Ollama Contract
- Chat model: `OLLAMA_MODEL` (e.g., `gemma3-legal:latest`)
- Embed model: `OLLAMA_EMBED_MODEL` (e.g., `embeddinggemma:latest`)
- Qdrant collection: `phase72_evidence_embeddings` (768-dim, Cosine)

---

## 🔴 Critical Plumbing Checks (Do First)

### 1. Verify db.ts Uses legal_ai_db
```bash
grep -n "legal_ai_db" sveltekit-frontend/src/lib/server/db.ts
```

Should show:
```
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
```

**If not:** Update `.env` and all db.ts imports.

### 2. Verify embedding-service.ts Exports generateEmbedding
```bash
grep -n "export.*generateEmbedding" sveltekit-frontend/src/lib/server/embedding-service.ts
```

Should show:
```typescript
export async function generateEmbedding(text: string): Promise<number[]>
```

**If not:** Add this function:
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest',
      prompt: text,
    }),
  });
  const data = await response.json();
  return data.embedding;
}
```

### 3. Verify rag-query.ts Exists and Returns Correct Shape
```bash
ls -la sveltekit-frontend/src/lib/server/rag-query.ts
```

Should return:
```typescript
export async function getContextFromRag(opts: {
  query: string;
  caseId?: string | null;
}): Promise<{
  contextText: string;
  citations: { id: string; source: string; score: number }[];
}>
```

**If not:** Create it (see Step 2 below).

### 4. Verify ollama-service.ts Has callOllamaChat
```bash
grep -n "export.*callOllamaChat" sveltekit-frontend/src/lib/server/ollama-service.ts
```

Should show:
```typescript
export async function callOllamaChat(systemPrompt: string, message: string): Promise<string>
```

### 5. Verify contextual-chat.ts Matches Contract
```bash
grep -n "export.*contextualChat" sveltekit-frontend/src/lib/server/llm/contextual-chat.ts
```

Should return:
```typescript
export async function contextualChat(opts: {
  message: string;
  caseId?: string | null;
  userId?: string | null;
}): Promise<ContextChatResponse>
```

---

## 🟡 Step 1: Quick Endpoint Test

Once plumbing is verified, test the endpoint:

```bash
# Terminal 1: Start dev server
cd sveltekit-frontend && npm run dev

# Terminal 2: Test endpoint
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the key legal issues?","caseId":null}'
```

**Expected response:**
```json
{
  "turnId": "uuid-here",
  "answer": "Based on the context...",
  "keywords": ["removal", "evidence", "CPS"],
  "keyPhrases": ["child protective services", "legal defense"],
  "suggestions": [
    {
      "query": "What evidence supports removal?",
      "reason": "Follow-up on evidence analysis",
      "score": 0.85
    }
  ],
  "latencyMs": 1234
}
```

**If fails:** Check server logs for:
- `OLLAMA_MODEL` not set
- `OLLAMA_EMBED_MODEL` not set
- Ollama not running
- Database connection error

---

## 🟡 Step 2: Implement Real RAG (getContextFromRag)

Replace the stub in `rag-query.ts`:

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import { generateEmbedding } from './embedding-service';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

export async function getContextFromRag(opts: {
  query: string;
  caseId?: string | null;
}): Promise<{
  contextText: string;
  citations: { id: string; source: string; score: number }[];
}> {
  const { query, caseId } = opts;

  try {
    // 1. Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search Qdrant with case_id filter
    const searchResults = await qdrantClient.search('phase72_evidence_embeddings', {
      vector: queryEmbedding,
      limit: 10,
      score_threshold: 0.5,
      filter: caseId
        ? {
            must: [
              {
                field: 'payload.case_id',
                match: { value: caseId },
              },
            ],
          }
        : undefined,
    });

    // 3. Extract context and citations
    const citations: { id: string; source: string; score: number }[] = [];
    const contextChunks: string[] = [];

    for (const result of searchResults) {
      const payload = result.payload as any;
      const text = payload.text || payload.content || '';
      const evidenceId = payload.evidence_id || result.id;
      const score = result.score || 0;

      if (text) {
        contextChunks.push(text);
        citations.push({
          id: evidenceId,
          source: payload.file_name || `Evidence ${evidenceId}`,
          score,
        });
      }
    }

    const contextText = contextChunks.join('\n\n---\n\n');

    return {
      contextText: contextText || 'No relevant evidence found.',
      citations,
    };
  } catch (err) {
    console.error('RAG query failed:', err);
    return {
      contextText: 'Unable to retrieve evidence context.',
      citations: [],
    };
  }
}
```

**Install Qdrant client if needed:**
```bash
npm install @qdrant/js-client-rest
```

---

## 🟡 Step 3: Wire Evidence Board "Ask AI" Button

In `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.server.ts`, update the `askAI` action:

```typescript
export const actions: Actions = {
  // ... other actions ...

  askAI: async ({ request, params, locals }) => {
    const session = locals.session as any;
    const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';
    const caseId = params.id;

    if (!isDevBypass && !session?.user?.id) {
      return fail(401, { message: 'Unauthorized' });
    }

    const userId = isDevBypass ? 'dev-user-001' : session.user.id;
    const formData = await request.formData();
    const question = formData.get('question') as string;
    const evidenceIds = formData.getAll('evidenceIds') as string[];

    try {
      // Call the contextual-chat endpoint
      const response = await fetch('http://localhost:5173/api/ai/yorha/context-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question || 'Analyze the selected evidence',
          caseId,
          userId,
        }),
      });

      if (!response.ok) {
        return fail(500, { message: 'AI request failed' });
      }

      const result = await response.json();

      // Link evidence to chat turn
      if (result.turnId && result.citations?.length > 0) {
        for (const citation of result.citations) {
          await sql`
            INSERT INTO chat_turn_evidence (id, chat_turn_id, evidence_id, role, created_at)
            VALUES (${crypto.randomUUID()}, ${result.turnId}, ${citation.id}, 'retrieved', ${new Date()})
          `;
        }
      }

      return {
        success: true,
        chatResult: {
          answer: result.answer,
          keywords: result.keywords,
          keyPhrases: result.keyPhrases,
          suggestions: result.suggestions,
          latencyMs: result.latencyMs,
        },
      };
    } catch (err) {
      console.error('Ask AI failed:', err);
      return fail(500, { message: 'Ask AI failed' });
    }
  },
};
```

---

## 🟡 Step 4: Update Evidence Board UI to Show Results

In `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.svelte`, add result display:

```svelte
<script lang="ts">
  // ... existing imports ...
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData | null = null;

  let chatResult = $derived(form?.chatResult ?? null);
</script>

<!-- In the chat pane or after the form -->
{#if chatResult}
  <div class="mt-4 p-3 rounded border border-[#b5ff6b] bg-[#102415]">
    <div class="text-[10px] uppercase text-[#b5ff6b] mb-2">AI Answer</div>
    <p class="text-[11px] text-[#eee] mb-2">{chatResult.answer}</p>

    {#if chatResult.keywords?.length}
      <div class="flex flex-wrap gap-1 mb-2">
        {#each chatResult.keywords as kw}
          <span class="text-[9px] px-2 py-1 rounded bg-[#262636] text-[#b5ff6b]">
            #{kw}
          </span>
        {/each}
      </div>
    {/if}

    {#if chatResult.suggestions?.length}
      <div class="flex flex-col gap-1">
        <div class="text-[9px] text-[#aaa]">Follow-up suggestions:</div>
        {#each chatResult.suggestions as sugg}
          <button
            type="button"
            class="text-left text-[9px] px-2 py-1 rounded border border-[#f5f5f5] bg-[#15151f] hover:bg-[#262636]"
            onclick={() => {
              // Populate textarea with suggestion
              const textarea = document.querySelector('textarea[name="question"]');
              if (textarea) textarea.value = sugg.query;
            }}
          >
            {sugg.query}
          </button>
        {/each}
      </div>
    {/if}

    {#if chatResult.latencyMs}
      <div class="text-[8px] text-[#aaa] mt-2">
        Response time: {chatResult.latencyMs}ms
      </div>
    {/if}
  </div>
{/if}
```

---

## 🟢 Step 5: Test End-to-End

### 5a. Verify Qdrant has evidence
```bash
curl http://localhost:6333/collections/phase72_evidence_embeddings/points \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'
```

Should show points with `case_id` in payload.

### 5b. Upload test evidence
1. Navigate to `/cases/[case-id]/evidence`
2. Fill "Add evidence" form
3. Click Save
4. Verify evidence appears in grid

### 5c. Ask AI
1. Select evidence card(s)
2. Type question in "Ask AI" textarea
3. Click "⚖️ Ask AI"
4. Verify:
   - Answer displays
   - Keywords show as chips
   - Suggestions appear as buttons
   - Latency shows

### 5d. Verify DB persistence
```sql
SELECT * FROM chat_turns WHERE case_id = '[case-id]' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM chat_turn_evidence WHERE chat_turn_id = '[turn-id]';
```

Should show:
- `extracted_keywords` array
- `key_phrases` array
- `suggestions` JSON
- Linked evidence IDs

---

## 📋 Checklist: Phase 6.1 Wiring

- [ ] **Plumbing verified:**
  - [ ] db.ts uses legal_ai_db
  - [ ] embedding-service.ts exports generateEmbedding
  - [ ] rag-query.ts exists and returns correct shape
  - [ ] ollama-service.ts has callOllamaChat
  - [ ] contextual-chat.ts matches contract

- [ ] **Endpoint test passes:**
  - [ ] POST /api/ai/yorha/context-chat returns ContextChatResponse
  - [ ] No Ollama errors
  - [ ] No database errors

- [ ] **RAG implemented:**
  - [ ] getContextFromRag queries Qdrant with case_id filter
  - [ ] Returns contextText + citations
  - [ ] Handles empty results gracefully

- [ ] **Evidence Board wired:**
  - [ ] "Ask AI" button calls /api/ai/yorha/context-chat
  - [ ] Result displays in UI
  - [ ] Keywords render as chips
  - [ ] Suggestions render as buttons
  - [ ] Latency displays

- [ ] **DB linking:**
  - [ ] chat_turn_evidence rows created for citations
  - [ ] Query returns linked evidence

- [ ] **End-to-end test:**
  - [ ] Upload evidence
  - [ ] Ask AI question
  - [ ] Verify answer, keywords, suggestions
  - [ ] Check DB persistence

---

## 🚀 Success Criteria

✅ Evidence Board "Ask AI" works
✅ Answers are case-aware (filtered by caseId)
✅ Keywords and suggestions display
✅ Evidence-chat linking persists
✅ No console errors
✅ Latency < 5 seconds

---

## 📞 If Stuck

**Endpoint returns 500:**
- Check server logs for Ollama errors
- Verify OLLAMA_MODEL and OLLAMA_EMBED_MODEL set
- Verify Ollama running on port 11434

**RAG returns empty:**
- Verify Qdrant running on port 6333
- Check collection exists: `curl http://localhost:6333/collections`
- Verify evidence has embeddings in Qdrant

**DB errors:**
- Verify legal_ai_db exists
- Check DATABASE_URL in .env
- Run migrations if needed

---

## 📚 Reference

- **Testing Guide:** `CONTEXTUAL_CHAT_TESTING_GUIDE.md` (Tests 1–20)
- **API Contract:** `/api/ai/yorha/context-chat` response shape
- **DB Schema:** `chat_turns`, `chat_turn_evidence`, `evidence`
- **Qdrant Collection:** `phase72_evidence_embeddings` (768-dim, Cosine)

---

**Next:** Follow the checklist above. Once all boxes are checked, Phase 6.1 is complete and Evidence Board is fully wired to contextual chat with real RAG.
