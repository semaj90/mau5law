# Phase 13: Agentic Tool Calling - Quick Start Guide

**Status:** ✅ COMPLETE & READY TO USE
**Date:** December 15, 2025

---

## 5-Minute Setup

### 1. Verify Services Running

```bash
# Check all Phase 66 containers
docker ps | grep -E "ollama|qdrant|redis|postgres"

# Quick health checks
curl http://localhost:11434/api/tags          # Ollama
curl http://localhost:6333/health             # Qdrant
docker exec redis redis-cli ping              # Redis
```

### 2. Test Agent Health

```bash
curl http://localhost:5173/api/agents/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "ollama": "connected",
    "qdrant": "connected",
    "redis": "connected",
    "postgres": "connected"
  },
  "timestamp": "2025-12-15T..."
}
```

### 3. Test Tool Execution

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "rag_lookup",
    "arguments": {"query": "TS1005 syntax error", "topK": 3}
  }'
```

### 4. Test Agent Chat

```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I fix TS1005 errors in Svelte 5?"
  }'
```

### 5. Use in Frontend

```svelte
<script>
  import AgentChat from '$lib/components/agentic/AgentChat.svelte';
</script>

<AgentChat />
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/agents/types.ts` | Type definitions |
| `src/lib/agents/tools.ts` | Tool registry & execution |
| `src/lib/agents/gemmaAgent.ts` | Agent orchestration |
| `src/lib/ai/ollama-config.ts` | Ollama configuration |
| `src/routes/api/agents/+server.ts` | API endpoints |
| `src/lib/components/agentic/AgentChat.svelte` | Chat component |

---

## API Endpoints

### POST `/api/agents/chat`
Execute agent with tool calling
```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "your question here"}'
```

### POST `/api/agents/execute-tool`
Execute a specific tool
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool": "rag_lookup", "arguments": {"query": "search term"}}'
```

### GET `/api/agents/health`
Check service health
```bash
curl http://localhost:5173/api/agents/health
```

---

## Available Tools

| Tool | Purpose | Parameters |
|------|---------|-----------|
| `rag_lookup` | Vector similarity search | `query: string, topK?: number` |
| `web_crawl` | Fetch web pages | `url: string, depth?: number, maxLinks?: number` |
| `web_doc_summary` | Summarize documentation | `url: string, topic?: string` |
| `web_search` | Search the web (stub) | `query: string` |
| `code_search` | Search codebase (stub) | `pattern: string, path?: string` |

---

## Environment Variables

```bash
# Required
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=codemod_memories

# Optional
OLLAMA_EMBED_MODEL=embeddinggemma:latest
OLLAMA_FALLBACK_EMBED_MODEL=nomic-embed-text:latest
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_ai_db
```

---

## Common Tasks

### Test RAG Lookup
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "rag_lookup",
    "arguments": {"query": "error handling", "topK": 5}
  }'
```

### Test Web Crawl
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_crawl",
    "arguments": {"url": "https://kit.svelte.dev"}
  }'
```

### Test Web Doc Summary
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_doc_summary",
    "arguments": {"url": "https://kit.svelte.dev", "topic": "SvelteKit"}
  }'
```

### Ask Agent Question
```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the best practices for error handling in TypeScript?"
  }'
```

---

## Troubleshooting

### Ollama Connection Failed
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull required models
docker exec ollama ollama pull gemma3-legal:latest
docker exec ollama ollama pull embeddinggemma:latest
```

### Qdrant Connection Failed
```bash
# Check Qdrant health
curl http://localhost:6333/health

# List collections
curl http://localhost:6333/collections
```

### Redis Connection Failed
```bash
# Check Redis
docker exec redis redis-cli ping

# Check keys
docker exec redis redis-cli KEYS "*"
```

### PostgreSQL Connection Failed
```bash
# Check PostgreSQL
docker exec postgres psql -U postgres -c "SELECT 1"

# Check pgvector extension
docker exec postgres psql -U postgres -d legal_ai_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## Performance Tips

1. **Cache Results** - RAG results are cached for 12 hours
2. **Batch Requests** - Send multiple queries together
3. **Use Specific Queries** - More specific queries = better results
4. **Monitor Health** - Check `/api/agents/health` regularly
5. **Optimize Models** - Use quantized models for faster inference

---

## Next Steps

1. ✅ Verify all services running
2. ✅ Test health endpoint
3. ✅ Test individual tools
4. ✅ Test agent chat
5. ⏭️ Integrate web_search with search API
6. ⏭️ Integrate code_search with Go service
7. ⏭️ Add authentication/authorization
8. ⏭️ Deploy to production

---

## Support

- **Documentation:** See `PHASE_13_IMPLEMENTATION_COMPLETE.md`
- **Architecture:** See `AGENTIC_TOOL_CALLING_BRIDGE.md`
- **Examples:** See `AGENTIC_TOOL_CALLING_README.md`

---

**Last Updated:** December 15, 2025
**Status:** ✅ READY TO USE
