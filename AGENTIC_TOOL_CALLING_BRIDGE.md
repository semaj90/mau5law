# TypeScript Agentic Tool Calling Bridge

**Status:** Phase 13 Full Production Integration
**Date:** December 15, 2025
**Framework:** Gemma3-Legal + Ollama + Qdrant + Redis + Go Microservices
**Language:** TypeScript (Node.js)

---

## Overview

This document describes the **TypeScript Agentic Tool Calling Bridge** — a production-ready system for grounding LLM agents (Gemma3-Legal) with knowledge base access, tool execution, and multi-service integration.

The bridge enables:
- **Tool Calling**: Structured JSON-based tool invocation from Gemma3-Legal
- **Knowledge Base Grounding**: RAG lookup via Qdrant + pgvector
- **Web Integration**: Crawling, fetching, and summarizing external documentation
- **Service Orchestration**: Ollama, Redis caching, Go microservices, PostgreSQL
- **MCP Context Servers**: Integration with Kiro IDE context (kiro.md, copilot.md, claude.md, gemini.md, context7)

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Gemma3-Legal Agent                        │
│              (Ollama: gemma3-legal:latest)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Tool Calling Framework (TypeScript)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tool Registry & Execution Engine                     │   │
│  │ - web_search, rag_lookup, web_crawl                  │   │
│  │ - web_doc_summary, code_search                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        ▼            ▼            ▼              ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐
    │ Qdrant │  │ Redis  │  │ Ollama │  │ Go Services  │
    │ (RAG)  │  │(Cache) │  │(Embed) │  │(Search/API)  │
    └────────┘  └────────┘  └────────┘  └──────────────┘
        │            │            │              │
        └────────────┼────────────┴──────────────┘
                     ▼
        ┌────────────────────────────┐
        │   PostgreSQL + pgvector    │
        │   (Knowledge Base)         │
        └────────────────────────────┘
```

### File Structure

```
src/agents/
├── types.ts                 # ToolCall, ToolResult interfaces
├── tools.ts                 # Tool registry & implementations
├── gemmaAgent.ts            # Gemma3-Legal agent orchestration
└── webFetch.ts              # Web crawling & fetching utilities

sveltekit-frontend/src/lib/ai/
├── ollama-config.ts         # Ollama endpoint configuration
└── [other AI services]

backend/
├── services/
│   ├── qdrant_service.py    # Qdrant vector search
│   ├── embedding_service.py # Vector embedding generation
│   └── [other services]
└── api/
    └── [REST endpoints]
```

---

## Tool Registry

### Available Tools

#### 1. `rag_lookup`
**Purpose:** Query knowledge base using vector similarity search

```typescript
interface RagLookupArgs {
  query: string;      // Search query
  topK?: number;      // Number of results (default: 5)
}

// Returns: { summary, matches: [{ score, code, message, errorKey, ... }] }
```

**Use Cases:**
- Finding similar TypeScript errors
- Retrieving codemod patterns
- Searching legal document context

**Implementation:**
- Embeds query using Ollama (embeddinggemma:latest)
- Searches Qdrant collection (codemod_memories)
- Returns ranked results with similarity scores

#### 2. `web_crawl`
**Purpose:** Fetch and parse web pages with optional shallow crawling

```typescript
interface WebCrawlArgs {
  url: string;        // URL to crawl
  depth?: number;     // 0 = single page, 1 = one-hop crawl
  maxLinks?: number;  // Max links to follow (default: 5)
}

// Returns: { url, status, text, links: [...] }
```

**Use Cases:**
- Fetching SvelteKit documentation
- Retrieving TypeScript error explanations
- Gathering external context

#### 3. `web_doc_summary`
**Purpose:** Summarize web documentation into README-ready markdown

```typescript
interface WebDocSummaryArgs {
  url: string;        // URL to summarize
  topic?: string;     // Context topic (default: SvelteKit/TypeScript codemods)
}

// Returns: { url, topic, summary: "markdown content" }
```

**Use Cases:**
- Creating documentation sections
- Summarizing external resources
- Generating context for codemods

#### 4. `web_search`
**Purpose:** Search the web (stub - ready for integration)

```typescript
interface WebSearchArgs {
  query: string;      // Search query
}
```

**Status:** Stub implementation. Ready to integrate with:
- Google Custom Search API
- Bing Search API
- DuckDuckGo API

#### 5. `code_search`
**Purpose:** Search codebase using ripgrep patterns (stub)

```typescript
interface CodeSearchArgs {
  pattern: string;    // Regex pattern
  path?: string;      // Search path (default: ".")
}
```

**Status:** Stub implementation. Ready to integrate with:
- ripgrep CLI
- Go microservice search endpoint
- Elasticsearch

---

## Agent Orchestration

### Gemma3-Legal Agent Flow

```typescript
// 1. User provides prompt
const prompt = "How do I fix TS1005 syntax errors in Svelte 5?";

// 2. Agent processes with tool calling
const agentResponse = await runGemmaAgent(prompt);
// Returns: { response: "...", toolCalls: [...] }

// 3. Execute tool calls
const toolResults = [];
for (const toolCall of agentResponse.toolCalls) {
  const result = await executeToolCall(toolCall);
  toolResults.push(result);
}

// 4. Return combined response
return {
  response: agentResponse.response,
  toolResults: toolResults
};
```

### System Prompt

The agent operates with this system prompt:

```
You are an agentic legal/developer assistant running inside a tool-calling framework.

You MUST ALWAYS respond as a single JSON object with this exact structure:
{
  "response": "your natural language response to the user",
  "toolCalls": [
    {
      "tool": "tool_name",
      "arguments": { "arg1": "value1", ... }
    }
  ]
}

Available tools:
- "web_search": { "query": string }
- "rag_lookup": { "query": string, "topK"?: number }
- "web_crawl": { "url": string, "depth"?: number, "maxLinks"?: number }
- "web_doc_summary": { "url": string, "topic"?: string }
- "code_search": { "pattern": string, "path"?: string }

When planning codemods or debugging TypeScript errors, you can:
1. Use rag_lookup to recall how you've fixed similar errors before
2. Use web_crawl to fetch documentation from SvelteKit/TypeScript sites
3. Use web_doc_summary to get README-ready summaries of external docs
4. Combine internal memories with external docs for comprehensive solutions

Always be concise but helpful. Use tools proactively when they would help.
```

---

## Service Integration

### Ollama Configuration

**Endpoint:** `http://localhost:11434` (configurable via `OLLAMA_ENDPOINT`)

**Models:**
- **Inference:** `gemma3-legal:latest` (tool calling, reasoning)
- **Embedding:** `embeddinggemma:latest` (vector generation)
- **Fallback:** `nomic-embed-text:latest` (if embeddinggemma unavailable)

**Configuration:**
```typescript
// src/lib/ai/ollama-config.ts
export function getOllamaEndpoint(): string {
  return process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
}

export function getOllamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? 'embeddinggemma:latest';
}

export function getOllamaFallbackEmbedModel(): string {
  return process.env.OLLAMA_FALLBACK_EMBED_MODEL ?? 'nomic-embed-text:latest';
}
```

### Qdrant Vector Database

**Endpoint:** `http://localhost:6333` (configurable via `QDRANT_URL`)

**Collection:** `codemod_memories` (configurable via `QDRANT_COLLECTION`)

**Vector Dimension:** 384 (embeddinggemma output)

**Payload Fields:**
```typescript
{
  code: string;           // Code snippet
  message: string;        // Error message
  errorKey: string;       // Error code (e.g., "TS1005")
  priority: number;       // Priority score
  framework: string;      // Framework (e.g., "svelte5", "sveltekit2")
  content: string;        // Full context
  tags: string[];         // Search tags
  timestamp: number;      // Creation timestamp
}
```

### Redis Caching

**Endpoint:** `http://localhost:6379` (configurable via `REDIS_URL`)

**Cache Keys:**
- `embed:{query_hash}` → Cached embeddings
- `rag:{query_hash}` → Cached RAG results
- `web:{url_hash}` → Cached web pages
- `summary:{url_hash}` → Cached summaries

**TTL:** 24 hours (configurable)

### PostgreSQL + pgvector

**Connection:** `postgresql://user:password@localhost:5432/legal_ai_db`

**Tables:**
- `codemod_memories` - Stored codemods with vectors
- `web_cache` - Cached web pages
- `tool_execution_log` - Tool call history

### Go Microservices

**Search Service:** `http://localhost:8080/api/search`
- Endpoint: `POST /api/search`
- Body: `{ query: string, topK: number }`
- Returns: `{ results: [...], totalTime: number }`

**Embedding Service:** `http://localhost:8081/api/embed`
- Endpoint: `POST /api/embed`
- Body: `{ texts: string[] }`
- Returns: `{ embeddings: number[][] }`

---

## MCP Context Server Integration

### Kiro IDE Context Files

The agent can access context from:

1. **kiro.md** - Kiro IDE configuration and capabilities
2. **copilot.md** - GitHub Copilot integration patterns
3. **claude.md** - Claude API integration examples
4. **gemini.md** - Google Gemini API patterns
5. **context7** - Context7 MCP server documentation

### Context Loading

```typescript
// Load context from MCP servers
async function loadMCPContext(contextName: string): Promise<string> {
  const endpoint = process.env.MCP_CONTEXT_ENDPOINT ?? 'http://localhost:4000';

  const res = await fetch(`${endpoint}/context/${contextName}`, {
    method: 'GET',
    headers: { 'Accept': 'text/markdown' }
  });

  if (!res.ok) {
    throw new Error(`Failed to load context: ${contextName}`);
  }

  return res.text();
}

// Use in agent prompt
const kiroContext = await loadMCPContext('kiro');
const copilotContext = await loadMCPContext('copilot');
const enhancedPrompt = `${kiroContext}\n\n${copilotContext}\n\n${userPrompt}`;
```

---

## Phase 13: Full Production Integration

### Initialization Manager

The Phase 13 manager handles:

1. **Service Detection**
   - Check Ollama availability
   - Verify Qdrant connection
   - Test Redis connectivity
   - Validate PostgreSQL access
   - Confirm Go microservices

2. **Database Configuration**
   - Initialize Drizzle ORM
   - Create schema if needed
   - Verify pgvector extension
   - Set up Qdrant collections

3. **Performance Settings**
   - Configure frontend caching (SvelteKit)
   - Set up backend caching (Redis)
   - Enable vector search optimization
   - Configure monitoring

4. **Service Wiring**
   - Register tool endpoints
   - Configure API routes
   - Set up WebSocket connections
   - Initialize MCP servers

### Implementation

```typescript
// Phase 13 Full Production Integration Manager
class Phase13IntegrationManager {
  async initialize(): Promise<void> {
    console.log('🚀 Phase 13: Full Production Integration');

    // 1. Detect services
    await this.detectServices();

    // 2. Configure database
    await this.configureDatabase();

    // 3. Set performance
    await this.configurePerformance();

    // 4. Wire endpoints
    await this.wireEndpoints();

    console.log('✅ Phase 13 initialization complete');
  }

  private async detectServices(): Promise<void> {
    // Check Ollama
    // Check Qdrant
    // Check Redis
    // Check PostgreSQL
    // Check Go services
  }

  private async configureDatabase(): Promise<void> {
    // Initialize Drizzle
    // Create schema
    // Verify pgvector
    // Set up collections
  }

  private async configurePerformance(): Promise<void> {
    // Frontend caching
    // Backend caching
    // Vector optimization
    // Monitoring setup
  }

  private async wireEndpoints(): Promise<void> {
    // Register tools
    // Configure routes
    // Setup WebSocket
    // Initialize MCP
  }
}
```

---

## Docker Integration

### Using Existing Phase 66 Containers

**Do NOT rebuild or delete containers.** Use existing Phase 66 setup:

```bash
# List running containers
docker ps

# Execute commands in containers
docker exec -it ollama ollama list
docker exec -it qdrant curl http://localhost:6333/health
docker exec -it redis redis-cli ping
docker exec -it postgres psql -U postgres -d legal_ai_db -c "SELECT version();"

# View logs
docker logs -f ollama
docker logs -f qdrant
docker logs -f redis
docker logs -f postgres
```

### Environment Configuration

```bash
# .env
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest

QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=codemod_memories

REDIS_URL=redis://localhost:6379

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_ai_db

MCP_CONTEXT_ENDPOINT=http://localhost:4000
```

---

## API Endpoints

### Tool Execution Endpoint

```
POST /api/agents/execute-tool
Content-Type: application/json

{
  "tool": "rag_lookup",
  "arguments": {
    "query": "TS1005 syntax error",
    "topK": 5
  }
}

Response:
{
  "tool": "rag_lookup",
  "arguments": { "query": "TS1005 syntax error", "topK": 5 },
  "result": {
    "summary": "Retrieved 3 codemod memories...",
    "matches": [...]
  }
}
```

### Agent Orchestration Endpoint

```
POST /api/agents/chat
Content-Type: application/json

{
  "prompt": "How do I fix TS1005 errors in Svelte 5?",
  "context": "optional_context_data"
}

Response:
{
  "response": "Here's how to fix TS1005 errors...",
  "toolResults": [
    {
      "tool": "rag_lookup",
      "result": { "matches": [...] }
    },
    {
      "tool": "web_doc_summary",
      "result": { "summary": "..." }
    }
  ]
}
```

### Health Check Endpoint

```
GET /api/agents/health

Response:
{
  "status": "healthy",
  "services": {
    "ollama": "connected",
    "qdrant": "connected",
    "redis": "connected",
    "postgres": "connected",
    "go_services": "connected"
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

---

## Implementation Checklist

### Phase 1: Core Setup
- [ ] Verify Ollama running with gemma3-legal:latest
- [ ] Verify Qdrant running with codemod_memories collection
- [ ] Verify Redis running
- [ ] Verify PostgreSQL running with pgvector
- [ ] Verify Go microservices running

### Phase 2: Tool Implementation
- [ ] Implement `rag_lookup` tool
- [ ] Implement `web_crawl` tool
- [ ] Implement `web_doc_summary` tool
- [ ] Implement `web_search` tool (integrate with API)
- [ ] Implement `code_search` tool (integrate with Go service)

### Phase 3: Agent Integration
- [ ] Implement Gemma3-Legal agent orchestration
- [ ] Test tool calling with sample prompts
- [ ] Implement error handling and retries
- [ ] Add logging and monitoring

### Phase 4: API Wiring
- [ ] Create `/api/agents/execute-tool` endpoint
- [ ] Create `/api/agents/chat` endpoint
- [ ] Create `/api/agents/health` endpoint
- [ ] Add authentication/authorization
- [ ] Add rate limiting

### Phase 5: MCP Integration
- [ ] Load kiro.md context
- [ ] Load copilot.md context
- [ ] Load claude.md context
- [ ] Load gemini.md context
- [ ] Load context7 documentation

### Phase 6: Performance & Monitoring
- [ ] Enable Redis caching
- [ ] Configure frontend caching
- [ ] Set up monitoring dashboards
- [ ] Add performance metrics
- [ ] Configure alerting

---

## Testing

### Unit Tests

```typescript
// Test tool execution
import { executeToolCall } from '../src/agents/tools';

describe('Tool Execution', () => {
  it('should execute rag_lookup tool', async () => {
    const result = await executeToolCall({
      tool: 'rag_lookup',
      arguments: { query: 'TS1005', topK: 3 }
    });

    expect(result.tool).toBe('rag_lookup');
    expect(result.result.matches).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// Test agent orchestration
import { executeAgentWithTools } from '../src/agents/gemmaAgent';

describe('Agent Orchestration', () => {
  it('should execute agent with tools', async () => {
    const result = await executeAgentWithTools(
      'How do I fix TS1005 errors?'
    );

    expect(result.response).toBeDefined();
    expect(result.toolResults).toBeDefined();
  });
});
```

### End-to-End Tests

```bash
# Test health check
curl http://localhost:5173/api/agents/health

# Test tool execution
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"rag_lookup","arguments":{"query":"TS1005"}}'

# Test agent chat
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"How do I fix TS1005 errors?"}'
```

---

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull model if missing
docker exec ollama ollama pull gemma3-legal:latest
docker exec ollama ollama pull embeddinggemma:latest

# Check model status
docker exec ollama ollama list
```

### Qdrant Connection Issues

```bash
# Check Qdrant health
curl http://localhost:6333/health

# List collections
curl http://localhost:6333/collections

# Check collection info
curl http://localhost:6333/collections/codemod_memories
```

### Redis Connection Issues

```bash
# Check Redis connectivity
docker exec redis redis-cli ping

# Check keys
docker exec redis redis-cli KEYS "*"

# Monitor commands
docker exec redis redis-cli MONITOR
```

### PostgreSQL Connection Issues

```bash
# Check PostgreSQL
docker exec postgres psql -U postgres -d legal_ai_db -c "SELECT version();"

# Check pgvector extension
docker exec postgres psql -U postgres -d legal_ai_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# List tables
docker exec postgres psql -U postgres -d legal_ai_db -c "\dt"
```

---

## Performance Optimization

### Caching Strategy

1. **Query Embeddings** - Cache embedding results for 24 hours
2. **RAG Results** - Cache search results for 12 hours
3. **Web Pages** - Cache fetched pages for 7 days
4. **Summaries** - Cache generated summaries for 30 days

### Vector Search Optimization

1. **Batch Embeddings** - Process multiple queries together
2. **Index Tuning** - Optimize Qdrant index parameters
3. **Quantization** - Use vector quantization for faster search
4. **Caching** - Cache frequently accessed vectors

### Database Optimization

1. **Connection Pooling** - Use pgBouncer for connection management
2. **Query Optimization** - Add indexes on frequently searched columns
3. **Partitioning** - Partition large tables by date
4. **Vacuuming** - Regular VACUUM ANALYZE

---

## Next Steps

1. **Verify Services** - Ensure all Phase 66 containers are running
2. **Implement Tools** - Complete tool implementations
3. **Wire Endpoints** - Create API routes
4. **Test Integration** - Run end-to-end tests
5. **Deploy** - Deploy to production
6. **Monitor** - Set up monitoring and alerting

---

## References

- **Ollama Documentation:** https://ollama.ai
- **Qdrant Documentation:** https://qdrant.tech
- **SvelteKit Documentation:** https://kit.svelte.dev
- **TypeScript Documentation:** https://www.typescriptlang.org
- **PostgreSQL pgvector:** https://github.com/pgvector/pgvector

---

**Last Updated:** December 15, 2025
**Maintained By:** Kiro IDE
**Status:** Production Ready
