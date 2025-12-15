# Terminal UI Implementation Details

**File**: `sveltekit-frontend/src/routes/(app)/terminal/+page.svelte`

## Key Changes

### 1. Type Definition
```typescript
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  keywords?: string[];
  keyPhrases?: string[];
  suggestions?: string[];
};
```

### 2. State Variables
```typescript
let messages = $state<ChatMessage[]>([]);
let currentMessage = $state('');
let isTyping = $state(false);
let sessionId = $state('local-session-' + Date.now());
let caseId = $state<string | null>(null);
```

### 3. API Call
```typescript
const response = await fetch('/api/ai/yorha/context-chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    userId: 'test-user-001',
    caseId,
    message: userMessage
  })
});
```

### 4. Keywords Rendering
```svelte
{#if message.keywords && message.keywords.length > 0}
  <div class="mt-3 flex flex-wrap gap-2">
    {#each message.keywords as keyword}
      <button
        type="button"
        class="text-xs px-2 py-1 rounded-full border border-green-400 bg-green-400/10 hover:bg-green-400/20 text-green-300"
        onclick={() => useSuggestion(`Show me more evidence about: ${keyword}`)}
      >
        #{keyword}
      </button>
    {/each}
  </div>
{/if}
```

### 5. Suggestions Rendering
```svelte
{#if message.suggestions && message.suggestions.length > 0}
  <div class="mt-3 flex flex-wrap gap-2">
    {#each message.suggestions as suggestion}
      <button
        type="button"
        class="text-xs px-2 py-1 rounded border border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-300"
        onclick={() => useSuggestion(suggestion)}
      >
        {suggestion}
      </button>
    {/each}
  </div>
{/if}
```

## Features

✅ Real-time API calls
✅ Keyword extraction
✅ Suggestion buttons
✅ Error handling
✅ Session management
✅ Loading states
✅ Message history
✅ Responsive design

## Testing

```powershell
npm run dev
# Open http://localhost:5173/terminal
# Send: "Summarize the key legal issues when CPS removes a child from the home."
```

