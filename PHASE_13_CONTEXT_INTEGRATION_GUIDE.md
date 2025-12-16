# Phase 13: Agentic Tool Calling - Context Integration Guide

**Status:** Ready for Integration
**Date:** December 15, 2025
**Framework:** Gemma3-Legal + Ollama + Qdrant + Redis + PostgreSQL + Go Microservices

---

## Overview

This guide explains how to integrate Phase 13 Agentic Tool Calling with context files (kiro.md, copilot.md, claude.md, gemini.md, context7) to provide grounded knowledge base access for the agent.

---

## Context Files Integration

### 1. kiro.md Integration

**Purpose:** Kiro IDE configuration and best practices

**Integration Points:**

```typescript
// src/lib/agents/tools.ts - Enhanced rag_lookup

export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  rag_lookup: async (args: { query: string; topK?: number; context?: string }) => {
    const { query, topK = 5, context = 'general' } = args;

    // If context is 'kiro', search Kiro-specific knowledge base
    if (context === 'kiro') {
      // Query Qdrant collection: kiro_knowledge
      const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
      const collection = 'kiro_knowledge';

      const embedding = await generateEmbedding(query);
      const response = await fetch(
        `${qdrantUrl}/collections/${collection}/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: embedding,
            limit: topK,
            with_payload: true,
            filter: {
              must: [
                {
                  key: 'source',
                  match: { value: 'kiro.md' }
                }
              ]
            }
          })
        }
      );

      const data = await response.json();
      return {
        summary: `Retrieved ${data.result?.length ?? 0} Kiro IDE tips for: "${query}"`,
        matches: data.result?.map((item: any) => ({
          score: item.score,
          source: 'kiro.md',
          ...item.payload
        })) ?? []
      };
    }

    // Default behavior for general queries
    // ... existing code ...
  }
};
```

**Usage Example:**

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I use Kiro for TypeScript development?",
    "context": {
      "source": "kiro",
      "topic": "IDE configuration"
    }
  }'
```

**kiro.md Content to Index:**
- IDE features and capabilities
- Keyboard shortcuts
- Configuration options
- Best practices
- Troubleshooting tips

---

### 2. copilot.md Integration

**Purpose:** GitHub Copilot patterns and best practices

**Integration Points:**

```typescript
// src/lib/agents/gemmaAgent.ts - Enhanced system prompt

const SYSTEM_PROMPT_WITH_COPILOT = `You are an agentic legal/developer assistant running inside a tool-calling framework.

You have access to GitHub Copilot best practices and patterns. When helping with code generation:
1. Use rag_lookup with context="copilot" to find relevant patterns
2. Suggest Copilot-friendly code structures
3. Provide examples of effective prompts for Copilot
4. Explain how to use Copilot for specific tasks

Available tools:
- "rag_lookup": { "query": string, "topK"?: number, "context"?: "copilot" | "general" }
- "web_search": { "query": string }
- "web_crawl": { "url": string, "depth"?: number, "maxLinks"?: number }
- "web_doc_summary": { "url": string, "topic"?: string }
- "code_search": { "pattern": string, "path"?: string }

When the user asks about code generation or Copilot usage, proactively use rag_lookup with context="copilot".
`;
```

**Usage Example:**

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I use GitHub Copilot to generate TypeScript types?"
  }'
```

**copilot.md Content to Index:**
- Copilot prompting techniques
- Code generation patterns
- Best practices for AI-assisted coding
- Common use cases
- Limitations and workarounds

---

### 3. claude.md Integration

**Purpose:** Claude API patterns and integration examples

**Integration Points:**

```typescript
// src/lib/agents/tools.ts - New claude_api_lookup tool

export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  // ... existing tools ...

  claude_api_lookup: async (args: { query: string; topK?: number }) => {
    const { query, topK = 5 } = args;

    try {
      const embedding = await generateEmbedding(query);
      const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

      const response = await fetch(
        `${qdrantUrl}/collections/claude_patterns/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: embedding,
            limit: topK,
            with_payload: true,
            filter: {
              must: [
                {
                  key: 'source',
                  match: { value: 'claude.md' }
                }
              ]
            }
          })
        }
      );

      const data = await response.json();
      return {
        summary: `Retrieved ${data.result?.length ?? 0} Claude API patterns for: "${query}"`,
        matches: data.result?.map((item: any) => ({
          score: item.score,
          source: 'claude.md',
          ...item.payload
        })) ?? []
      };
    } catch (error) {
      return {
        summary: `Error looking up Claude patterns: ${error instanceof Error ? error.message : String(error)}`,
        matches: []
      };
    }
  }
};
```

**Usage Example:**

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "claude_api_lookup",
    "arguments": {"query": "How do I use Claude for code analysis?"}
  }'
```

**claude.md Content to Index:**
- Claude API endpoints
- Authentication patterns
- Request/response formats
- Error handling
- Rate limiting strategies
- Best practices

---

### 4. gemini.md Integration

**Purpose:** Google Gemini API patterns and integration examples

**Integration Points:**

```typescript
// src/lib/agents/tools.ts - New gemini_api_lookup tool

export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  // ... existing tools ...

  gemini_api_lookup: async (args: { query: string; topK?: number }) => {
    const { query, topK = 5 } = args;

    try {
      const embedding = await generateEmbedding(query);
      const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

      const response = await fetch(
        `${qdrantUrl}/collections/gemini_patterns/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: embedding,
            limit: topK,
            with_payload: true,
            filter: {
              must: [
                {
                  key: 'source',
                  match: { value: 'gemini.md' }
                }
              ]
            }
          })
        }
      );

      const data = await response.json();
      return {
        summary: `Retrieved ${data.result?.length ?? 0} Gemini API patterns for: "${query}"`,
        matches: data.result?.map((item: any) => ({
          score: item.score,
          source: 'gemini.md',
          ...item.payload
        })) ?? []
      };
    } catch (error) {
      return {
        summary: `Error looking up Gemini patterns: ${error instanceof Error ? error.message : String(error)}`,
        matches: []
      };
    }
  }
};
```

**Usage Example:**

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "gemini_api_lookup",
    "arguments": {"query": "How do I use Gemini for multimodal analysis?"}
  }'
```

**gemini.md Content to Index:**
- Gemini API endpoints
- Authentication patterns
- Multimodal capabilities
- Vision processing
- Text generation
- Best practices

---

### 5. context7 Integration

**Purpose:** Context7 documentation and knowledge base

**Integration Points:**

```typescript
// src/lib/agents/tools.ts - New context7_lookup tool

export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  // ... existing tools ...

  context7_lookup: async (args: { query: string; topK?: number; category?: string }) => {
    const { query, topK = 5, category = 'general' } = args;

    try {
      const embedding = await generateEmbedding(query);
      const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

      const filter: any = {
        must: [
          {
            key: 'source',
            match: { value: 'context7' }
          }
        ]
      };

      if (category !== 'general') {
        filter.must.push({
          key: 'category',
          match: { value: category }
        });
      }

      const response = await fetch(
        `${qdrantUrl}/collections/context7_knowledge/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: embedding,
            limit: topK,
            with_payload: true,
            filter
          })
        }
      );

      const data = await response.json();
      return {
        summary: `Retrieved ${data.result?.length ?? 0} Context7 resources for: "${query}"`,
        matches: data.result?.map((item: any) => ({
          score: item.score,
          source: 'context7',
          category: item.payload.category,
          ...item.payload
        })) ?? []
      };
    } catch (error) {
      return {
        summary: `Error looking up Context7 resources: ${error instanceof Error ? error.message : String(error)}`,
        matches: []
      };
    }
  }
};
```

**Usage Example:**

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "context7_lookup",
    "arguments": {
      "query": "How do I set up Context7 for my project?",
      "category": "setup"
    }
  }'
```

**context7 Content to Index:**
- Setup and configuration
- API documentation
- Integration guides
- Examples and tutorials
- Troubleshooting
- Performance optimization

---

## Knowledge Base Indexing

### Step 1: Extract Content from Context Files

```typescript
// scripts/index-context-files.ts

import fs from 'fs';
import path from 'path';
import { generateEmbedding } from '../src/lib/ai/ollama-config';

interface ContextFile {
  name: string;
  path: string;
  collection: string;
}

const contextFiles: ContextFile[] = [
  { name: 'kiro.md', path: './kiro.md', collection: 'kiro_knowledge' },
  { name: 'copilot.md', path: './copilot.md', collection: 'copilot_patterns' },
  { name: 'claude.md', path: './claude.md', collection: 'claude_patterns' },
  { name: 'gemini.md', path: './gemini.md', collection: 'gemini_patterns' },
  { name: 'context7', path: './context7', collection: 'context7_knowledge' }
];

async function indexContextFiles() {
  for (const file of contextFiles) {
    console.log(`Indexing ${file.name}...`);

    // Read file content
    let content: string;
    if (fs.statSync(file.path).isDirectory()) {
      // For directories, read all markdown files
      const files = fs.readdirSync(file.path).filter((f) => f.endsWith('.md'));
      content = files
        .map((f) => fs.readFileSync(path.join(file.path, f), 'utf-8'))
        .join('\n\n');
    } else {
      content = fs.readFileSync(file.path, 'utf-8');
    }

    // Split into chunks
    const chunks = splitIntoChunks(content, 500);

    // Generate embeddings and index
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      // Index in Qdrant
      await indexInQdrant(file.collection, {
        id: `${file.name}-${i}`,
        vector: embedding,
        payload: {
          source: file.name,
          content: chunk,
          chunkIndex: i,
          timestamp: Date.now()
        }
      });

      console.log(`  Indexed chunk ${i + 1}/${chunks.length}`);
    }

    console.log(`Completed indexing ${file.name}`);
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

async function indexInQdrant(collection: string, point: any) {
  const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

  await fetch(`${qdrantUrl}/collections/${collection}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: [point]
    })
  });
}

indexContextFiles().catch(console.error);
```

### Step 2: Create Qdrant Collections

```bash
# Create kiro_knowledge collection
curl -X PUT http://localhost:6333/collections/kiro_knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Create copilot_patterns collection
curl -X PUT http://localhost:6333/collections/copilot_patterns \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Create claude_patterns collection
curl -X PUT http://localhost:6333/collections/claude_patterns \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Create gemini_patterns collection
curl -X PUT http://localhost:6333/collections/gemini_patterns \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Create context7_knowledge collection
curl -X PUT http://localhost:6333/collections/context7_knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

### Step 3: Run Indexing Script

```bash
# Compile TypeScript
npx tsc scripts/index-context-files.ts

# Run indexing
node scripts/index-context-files.js
```

---

## Agent Usage with Context Files

### Example 1: Kiro IDE Help

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I debug TypeScript errors in Kiro?",
    "context": {
      "source": "kiro",
      "topic": "debugging"
    }
  }'
```

**Expected Response:**
```json
{
  "response": "Based on Kiro IDE best practices, here are the steps to debug TypeScript errors...",
  "toolResults": [
    {
      "tool": "rag_lookup",
      "status": "success",
      "result": {
        "summary": "Retrieved 5 Kiro IDE debugging tips",
        "matches": [...]
      }
    }
  ]
}
```

### Example 2: GitHub Copilot Assistance

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I write effective prompts for GitHub Copilot?"
  }'
```

**Expected Response:**
```json
{
  "response": "Here are the best practices for writing effective GitHub Copilot prompts...",
  "toolResults": [
    {
      "tool": "rag_lookup",
      "status": "success",
      "result": {
        "summary": "Retrieved 5 Copilot prompting patterns",
        "matches": [...]
      }
    }
  ]
}
```

### Example 3: Claude API Integration

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I integrate Claude API into my TypeScript project?"
  }'
```

**Expected Response:**
```json
{
  "response": "Here's how to integrate Claude API into your TypeScript project...",
  "toolResults": [
    {
      "tool": "claude_api_lookup",
      "status": "success",
      "result": {
        "summary": "Retrieved 5 Claude API integration patterns",
        "matches": [...]
      }
    }
  ]
}
```

---

## Frontend Integration

### Using Context in AgentChat Component

```svelte
<script lang="ts">
  import AgentChat from '$lib/components/agentic/AgentChat.svelte';

  let selectedContext = 'general';
  const contexts = ['general', 'kiro', 'copilot', 'claude', 'gemini', 'context7'];
</script>

<div class="agent-container">
  <div class="context-selector">
    <label for="context">Knowledge Base:</label>
    <select bind:value={selectedContext} id="context">
      {#each contexts as ctx}
        <option value={ctx}>{ctx}</option>
      {/each}
    </select>
  </div>

  <AgentChat context={selectedContext} />
</div>

<style>
  .agent-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .context-selector {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  select {
    padding: 0.5rem;
    border: 1px solid #333;
    border-radius: 4px;
    background: #1a1a1a;
    color: #e0e0e0;
  }
</style>
```

---

## Maintenance

### Update Context Files

When context files are updated:

1. Update the source file (e.g., kiro.md)
2. Re-run the indexing script
3. Verify new content is searchable

```bash
# Re-index specific context file
npm run index:context -- --file kiro.md
```

### Monitor Knowledge Base

```bash
# Check collection statistics
curl http://localhost:6333/collections/kiro_knowledge

# Expected response:
# {
#   "result": {
#     "points_count": 1234,
#     "vectors_count": 1234,
#     "indexed_vectors_count": 1234,
#     "segment_count": 1
#   }
# }
```

### Optimize Collections

```bash
# Optimize collection for search
curl -X POST http://localhost:6333/collections/kiro_knowledge/optimize
```

---

## Summary

Phase 13 Agentic Tool Calling now supports integration with context files:

✅ **kiro.md** - Kiro IDE configuration and best practices
✅ **copilot.md** - GitHub Copilot patterns and techniques
✅ **claude.md** - Claude API integration examples
✅ **gemini.md** - Google Gemini API patterns
✅ **context7** - Context7 documentation and knowledge base

Each context file is indexed in a separate Qdrant collection for efficient retrieval and can be queried independently or combined for comprehensive answers.

---

**Last Updated:** December 15, 2025
**Status:** Ready for Integration
**Maintained By:** Kiro IDE

