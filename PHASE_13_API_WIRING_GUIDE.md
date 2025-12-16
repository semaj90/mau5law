# Phase 13: API Wiring Guide

**Status:** Implementation Ready
**Date:** December 15, 2025
**Objective:** Wire up agentic tool calling endpoints without rebuilding services

---

## Quick Start

### 1. Verify Services Running

```bash
# Check all Phase 66 containers
docker ps | grep -E "ollama|qdrant|redis|postgres"

# Expected output:
# - ollama (port 11434)
# - qdrant (port 6333)
# - redis (port 6379)
# - postgres (port 5432)
```

### 2. Create API Routes

Create these SvelteKit endpoints in `sveltekit-frontend/src/routes/api/agents/`:

#### `/api/agents/health` - Health Check

**File:** `sveltekit-frontend/src/routes/api/agents/health/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function checkService(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export const GET: RequestHandler = async () => {
  const services = {
    ollama: await checkService('http://localhost:11434/api/tags'),
    qdrant: await checkService('http://localhost:6333/health'),
    redis: await checkService('http://localhost:6379'),
    postgres: await checkService('http://localhost:5432'),
  };

  const allHealthy = Object.values(services).every(s => s);

  return json({
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  }, {
    status: allHealthy ? 200 : 503
  });
};
```

#### `/api/agents/execute-tool` - Tool Execution

**File:** `sveltekit-frontend/src/routes/api/agents/execute-tool/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { executeToolCall } from '../../../../agents/tools';
import type { ToolCall } from '../../../../agents/types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as ToolCall;

    if (!body.tool) {
      return json({ error: 'Missing tool name' }, { status: 400 });
    }

    const result = await executeToolCall(body);

    return json(result);
  } catch (error) {
    console.error('Tool execution error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
```

#### `/api/agents/chat` - Agent Orchestration

**File:** `sveltekit-frontend/src/routes/api/agents/chat/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { executeAgentWithTools } from '../../../../agents/gemmaAgent';

interface ChatRequest {
  prompt: string;
  context?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as ChatRequest;

    if (!body.prompt) {
      return json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Optionally prepend context
    const fullPrompt = body.context
      ? `${body.context}\n\n${body.prompt}`
      : body.prompt;

    const result = await executeAgentWithTools(fullPrompt);

    return json(result);
  } catch (error) {
    console.error('Agent execution error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
```

### 3. Create Frontend Integration

**File:** `sveltekit-frontend/src/lib/services/agentService.ts`

```typescript
import type { ToolCall, ToolResult } from '../../agents/types';

export interface AgentChatResponse {
  response: string;
  toolResults: ToolResult[];
}

export async function executeToolCall(tool: ToolCall): Promise<ToolResult> {
  const res = await fetch('/api/agents/execute-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tool),
  });

  if (!res.ok) {
    throw new Error(`Tool execution failed: ${res.statusText}`);
  }

  return res.json();
}

export async function chatWithAgent(
  prompt: string,
  context?: string
): Promise<AgentChatResponse> {
  const res = await fetch('/api/agents/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  });

  if (!res.ok) {
    throw new Error(`Agent chat failed: ${res.statusText}`);
  }

  return res.json();
}

export async function checkAgentHealth(): Promise<{
  status: string;
  services: Record<string, boolean>;
}> {
  const res = await fetch('/api/agents/health');

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`);
  }

  return res.json();
}
```

### 4. Create UI Component

**File:** `sveltekit-frontend/src/lib/components/AgentChat.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { chatWithAgent, checkAgentHealth } from '../services/agentService';
  import type { AgentChatResponse } from '../services/agentService';

  let prompt = '';
  let response: AgentChatResponse | null = null;
  let loading = false;
  let error: string | null = null;
  let healthStatus = 'checking...';

  onMount(async () => {
    try {
      const health = await checkAgentHealth();
      healthStatus = health.status;
    } catch (e) {
      healthStatus = 'error';
      console.error('Health check failed:', e);
    }
  });

  async function handleSubmit() {
    if (!prompt.trim()) return;

    loading = true;
    error = null;
    response = null;

    try {
      response = await chatWithAgent(prompt);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="agent-chat">
  <div class="status">
    Status: <span class={healthStatus === 'healthy' ? 'healthy' : 'error'}>
      {healthStatus}
    </span>
  </div>

  <div class="input-area">
    <textarea
      bind:value={prompt}
      placeholder="Ask the agent anything..."
      disabled={loading}
    />
    <button on:click={handleSubmit} disabled={loading || !prompt.trim()}>
      {loading ? 'Processing...' : 'Send'}
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if response}
    <div class="response">
      <div class="agent-response">{response.response}</div>

      {#if response.toolResults.length > 0}
        <div class="tool-results">
          <h4>Tool Results:</h4>
          {#each response.toolResults as result}
            <div class="tool-result">
              <strong>{result.tool}</strong>
              <pre>{JSON.stringify(result.result, null, 2)}</pre>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .agent-chat {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #1a1a1a;
    border-radius: 8px;
    color: #fff;
  }

  .status {
    font-size: 0.875rem;
    color: #999;
  }

  .status .healthy {
    color: #4ade80;
  }

  .status .error {
    color: #f87171;
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
  }

  textarea {
    flex: 1;
    padding: 0.5rem;
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    font-family: monospace;
    min-height: 100px;
  }

  button {
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    padding: 0.5rem;
    background: #7f1d1d;
    color: #fca5a5;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .response {
    padding: 1rem;
    background: #2a2a2a;
    border-radius: 4px;
    border-left: 3px solid #dc2626;
  }

  .agent-response {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .tool-results {
    margin-top: 1rem;
    border-top: 1px solid #444;
    padding-top: 1rem;
  }

  .tool-result {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: #1a1a1a;
    border-radius: 4px;
  }

  .tool-result strong {
    color: #4ade80;
  }

  pre {
    margin-top: 0.25rem;
    padding: 0.5rem;
    background: #1a1a1a;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.75rem;
  }
</style>
```

### 5. Add to Layout

**File:** `sveltekit-frontend/src/routes/(app)/+layout.svelte`

```svelte
<script>
  import AgentChat from '$lib/components/AgentChat.svelte';
</script>

<div class="layout">
  <!-- Existing layout content -->

  <aside class="agent-sidebar">
    <AgentChat />
  </aside>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1rem;
  }

  .agent-sidebar {
    border-left: 1px solid #333;
    padding-left: 1rem;
  }
</style>
```

---

## Testing the Integration

### 1. Test Health Endpoint

```bash
curl http://localhost:5173/api/agents/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "ollama": true,
    "qdrant": true,
    "redis": true,
    "postgres": true
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

### 2. Test Tool Execution

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "rag_lookup",
    "arguments": {
      "query": "TS1005 syntax error",
      "topK": 3
    }
  }'
```

### 3. Test Agent Chat

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I fix TS1005 errors in Svelte 5?"
  }'
```

---

## Environment Setup

Create `.env.local` in `sveltekit-frontend/`:

```env
# Ollama
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=codemod_memories

# Redis
REDIS_URL=redis://localhost:6379

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_ai_db

# MCP Context
MCP_CONTEXT_ENDPOINT=http://localhost:4000
```

---

## Troubleshooting

### Endpoint Not Found

```bash
# Check if routes are created
ls -la sveltekit-frontend/src/routes/api/agents/

# Should show:
# health/+server.ts
# execute-tool/+server.ts
# chat/+server.ts
```

### Service Connection Errors

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test Qdrant
curl http://localhost:6333/health

# Test Redis
docker exec redis redis-cli ping

# Test PostgreSQL
docker exec postgres psql -U postgres -d legal_ai_db -c "SELECT 1;"
```

### Agent Not Responding

```bash
# Check Ollama logs
docker logs ollama | tail -20

# Check if model is loaded
docker exec ollama ollama list | grep gemma3-legal

# Pull model if missing
docker exec ollama ollama pull gemma3-legal:latest
```

---

## Next Steps

1. ✅ Create API routes
2. ✅ Create frontend service
3. ✅ Create UI component
4. ✅ Test endpoints
5. ⏳ Add authentication
6. ⏳ Add rate limiting
7. ⏳ Add monitoring
8. ⏳ Deploy to production

---

**Last Updated:** December 15, 2025
**Status:** Ready for Implementation
