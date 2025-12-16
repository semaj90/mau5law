# Phase 13: Quick Reference Card

**Status:** ✅ Ready for Implementation
**Time Estimate:** 4-6 hours
**Complexity:** Medium

---

## 30-Second Overview

TypeScript agentic tool calling bridge that:
- Runs Gemma3-Legal agent with structured tool calling
- Executes 5 tools: rag_lookup, web_crawl, web_doc_summary, web_search, code_search
- Integrates with Ollama, Qdrant, Redis, PostgreSQL, Go services
- Provides REST API endpoints for tool execution and agent chat
- Includes frontend UI component for interactive chat

---

## Key Files

### Existing (Don't Modify)
```
src/agents/types.ts          # ToolCall, ToolResult interfaces
src/agents/tools.ts          # Tool registry & implementations
src/agents/gemmaAgent.ts     # Gemma3-Legal orchestration
src/agents/webFetch.ts       # Web crawling utilities
```

### To Create
```
sveltekit-frontend/src/routes/api/agents/health/+server.ts
sveltekit-frontend/src/routes/api/agents/execute-tool/+server.ts
sveltekit-frontend/src/routes/api/agents/chat/+server.ts
sveltekit-frontend/src/lib/services/agentService.ts
sveltekit-frontend/src/lib/components/AgentChat.svelte
```

---

## 5 Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `rag_lookup` | Search knowledge base | query, topK | matches with scores |
| `web_crawl` | Fetch web pages | url, depth | page text + links |
| `web_doc_summary` | Summarize docs | url, topic | markdown summary |
| `web_search` | Search web (stub) | query | results |
| `code_search` | Search code (stub) | pattern, path | matches |

---

## 3 API Endpoints

### GET /api/agents/health
```bash
curl http://localhost:5173/api/agents/health
# Returns: { status, services: { ollama, qdrant, redis, postgres } }
```

### POST /api/agents/execute-tool
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"rag_lookup","arguments":{"query":"TS1005"}}'
# Returns: { tool, arguments, result }
```

### POST /api/agents/chat
```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"How do I fix TS1005?"}'
# Returns: { response, toolResults }
```

---

## Service Ports

| Service | Port | Check |
|---------|------|-------|
| Ollama | 11434 | `curl http://localhost:11434/api/tags` |
| Qdrant | 6333 | `curl http://localhost:6333/health` |
| Redis | 6379 | `docker exec redis redis-cli ping` |
| PostgreSQL | 5432 | `docker exec postgres psql -U postgres -c "SELECT 1;"` |

---

## Environment Variables

```env
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest
OLLAMA_EMBED_MODEL=embeddinggemma:latest
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=codemod_memories
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_ai_db
```

---

## Implementation Steps

### Step 1: Create API Routes (30 min)
```bash
# Create directories
mkdir -p sveltekit-frontend/src/routes/api/agents/{health,execute-tool,chat}

# Create +server.ts files in each directory
# See PHASE_13_API_WIRING_GUIDE.md for code
```

### Step 2: Create Frontend Service (20 min)
```bash
# Create agentService.ts
# Implement: executeToolCall, chatWithAgent, checkAgentHealth
```

### Step 3: Create UI Component (30 min)
```bash
# Create AgentChat.svelte
# Implement: textarea, button, response display
```

### Step 4: Integrate into Layout (10 min)
```bash
# Update +layout.svelte
# Add <AgentChat /> component
```

### Step 5: Test (30 min)
```bash
# Test health endpoint
curl http://localhost:5173/api/agents/health

# Test tool execution
curl -X POST http://localhost:5173/api/agents/execute-tool ...

# Test agent chat
curl -X POST http://localhost:5173/api/agents/chat ...
```

---

## Common Issues & Fixes

### "Ollama not found"
```bash
docker exec ollama ollama list
docker exec ollama ollama pull gemma3-legal:latest
```

### "Qdrant connection failed"
```bash
curl http://localhost:6333/health
docker logs qdrant
```

### "Redis connection failed"
```bash
docker exec redis redis-cli ping
docker logs redis
```

### "PostgreSQL connection failed"
```bash
docker exec postgres psql -U postgres -d legal_ai_db -c "SELECT 1;"
docker logs postgres
```

---

## Testing Commands

```bash
# Health check
curl http://localhost:5173/api/agents/health

# RAG lookup
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"rag_lookup","arguments":{"query":"TS1005","topK":3}}'

# Web crawl
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"web_crawl","arguments":{"url":"https://kit.svelte.dev"}}'

# Agent chat
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"How do I fix TS1005 errors?"}'
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [AGENTIC_TOOL_CALLING_BRIDGE.md](./AGENTIC_TOOL_CALLING_BRIDGE.md) | Complete architecture & reference |
| [PHASE_13_API_WIRING_GUIDE.md](./PHASE_13_API_WIRING_GUIDE.md) | Step-by-step implementation |
| [PHASE_13_IMPLEMENTATION_SUMMARY.md](./PHASE_13_IMPLEMENTATION_SUMMARY.md) | Overview & roadmap |
| [PHASE_13_QUICK_REFERENCE.md](./PHASE_13_QUICK_REFERENCE.md) | This card |

---

## Success Checklist

- [ ] All services running (Ollama, Qdrant, Redis, PostgreSQL)
- [ ] API routes created and responding
- [ ] Frontend service implemented
- [ ] AgentChat component working
- [ ] Health endpoint returns healthy
- [ ] Tool execution working
- [ ] Agent chat working
- [ ] Tests passing
- [ ] No TypeScript errors
- [ ] Documentation complete

---

## Next Phase

After Phase 13 is complete:
- Phase 14: Advanced Analytics
- Phase 15: Performance Dashboards
- Phase 16: Machine Learning Integration

---

**Last Updated:** December 15, 2025
**Status:** Ready to Implement
**Estimated Time:** 4-6 hours
