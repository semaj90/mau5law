# 🧠 Phase 79 Strategy Guide Enchanced: Svelte 5 & "Project Odin" Architecture

This guide outlines the strategy for modernizing the application to Svelte 5 (Runes), implementing the "Project Odin" UI system, and wiring up robust API endpoints secured by Lucia v3.

## 🎯 Objectives
1.  **Svelte 5 Runes**: Transition all components to use `$state`, `$derived`, `$props` for reactivity.
2.  **Project Odin UI**: Implement the retro-futuristic "NES Command Center" aesthetic using **UnoCSS Grid** and **Bits-UI**.
3.  **Lucia v3 Auth**: Secure all API routes and Server Actions with session-based authentication.
4.  **Agentic RAG+KAG**: Usage of `llms.txt` as a Knowledge Graph for `gemma3-legal:latest`.

## 🏗️ Architecture

### 1. Frontend: Svelte 5 + Project Odin
- **State Management**: Use `$state` for local UI state (tabs, loading, inputs).
- **Data Flow**: Server Load (`+page.server.ts`) -> Props (`let { data } = $props()`).
- **Styling**: `screen-nes`, `nes-panel`, `nes-btn` (defined in `uno.config.ts`).
- **Components**: Bits-UI for accessible, headless interactives (Select, Dialog, Separator).

### 2. Backend: SvelteKit API + Lucia
- **Session Validation**: Middleware in `src/hooks.server.ts` populates `locals.user`.
- **SSR**: `+page.server.ts` handles initial data fetch (SEO friendly, secure).
- **Actions**: `+page.server.ts` (actions) handles mutations (POST/PUT).
- **Database**: Drizzle ORM for type-safe SQL queries.

### 3. Agentic Layer (RAG/KAG)
- **Knowledge Source**: `llms.txt` contains the "Style Guide" & "Architecture Rules".
- **Tool Calling**: Agents read `llms.txt` before generating code to ensure compliance.
- **Model**: `gemma3-legal:latest` (Ollama) or Gemini 2.0 Flash.

## 📝 Implementation Pattern (Example: Project Odin Dashboard)

### Server (`src/routes/odin/+page.server.ts`)
```typescript
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { errorCluster } from '$lib/server/db/schema';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  // Direct DB access (no API fetch needed on server-side)
  const stats = await db.select().from(errorCluster).limit(5);
  return { user: locals.user, stats };
};
```

### UI (`src/routes/odin/+page.svelte`)
```svelte
<script>
  let { data } = $props(); // Svelte 5 Props
  let activeTab = $state('overview'); // Svelte 5 State
  import { Separator } from 'bits-ui';
</script>

<div class="screen-nes">
  <!-- UnoCSS Grid Layout -->
  <main class="grid grid-cols-12 gap-4">
    <aside class="col-span-3 nes-panel">...</aside>
    <section class="col-span-9 nes-panel">...</section>
  </main>
</div>
```

## 4. 🔌 API Wiring (Svelte 5 Patterns)

### Fetching Data (Client-Side)
Use `$effect` for client-side data fetching when SSR isn't enough.

```svelte
<script>
  let { data } = $props();
  let liveStatus = $state('CONNECTING');
  let analysis = $state(null);

  $effect(() => {
    const stream = new EventSource('/api/odin/events');
    stream.onmessage = (e) => {
      liveStatus = JSON.parse(e.data).status;
    };
    return () => stream.close();
  });

  async function analyzeError(errorCode) {
    const res = await fetch('/api/odin/analyze', {
      method: 'POST',
      body: JSON.stringify({ errorCode })
    });
    analysis = await res.json();
  }
</script>
```

### Form Actions (Progressive Enhancement)
Use standard SvelteKit `enhance` but with Svelte 5 state for UI feedback.

```svelte
<script>
  import { enhance } from '$app/forms';
  let isSubmitting = $state(false);
</script>

<form
  method="POST"
  action="?/updateProfile"
  use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      await update();
      isSubmitting = false;
    };
  }}
>
  <button disabled={isSubmitting}>
    {isSubmitting ? 'SAVING...' : 'SAVE'}
  </button>
</form>
```

## 🤖 Agentic Tool Calling (Gemma 3)

### Protocol
Agents (like `phase79-cognitive-engine`) must follow this protocol when modifying the codebase:

1.  **Read Context**: Always read `llms.txt` first to understand the "Project Odin" style guide.
2.  **Check Safety**: Run `phase79-safety-gate` on generated code.
3.  **Use RAG**: Query Qdrant for similar patterns (`findSimilarPatches`).

### Tool Definition (JSON)
For external agents (OmniParser, AutoGen):

```json
{
  "name": "odin_dashboard_update",
  "description": "Updates the Odin Dashboard UI components",
  "parameters": {
    "type": "object",
    "properties": {
      "component": { "type": "string", "enum": ["Sidebar", "Grid", "Terminal"] },
      "svelte_5_code": { "type": "string", "description": "Must use Runes ($state)" }
    }
  }
}
```

## 🛠️ Execution Plan

1.  **Generate Knowledge Graph**: Ensure `llms.txt` is up-to-date (Done).
2.  **Run Patches**:
    ```bash
    npm run phase79:engine   # Generate patches (Svelte 5 aware)
    npm run phase79:ultimate # Apply patches
    ```
3.  **Manual Implementation**: Build `src/routes/odin` as the "Gold Standard" implementation.

## 🤖 AI Assistance
- **Context**: When asking AI to fix files, always ensure it reads `llms.txt` first.
- **Safety**: The Safety Gate in Phase 79 now checks for valid Svelte 5 syntax.
