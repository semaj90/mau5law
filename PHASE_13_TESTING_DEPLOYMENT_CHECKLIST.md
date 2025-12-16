# Phase 13: Agentic Tool Calling - Testing & Deployment Checklist

**Status:** Ready for Testing & Deployment
**Date:** December 15, 2025
**Framework:** Gemma3-Legal + Ollama + Qdrant + Redis + PostgreSQL + Go Microservices

---

## Pre-Deployment Verification

### ✅ Code Quality Checks

- [x] All TypeScript files pass diagnostics (0 errors)
- [x] All Svelte components pass validation
- [x] No console errors or warnings
- [x] All imports are correctly resolved
- [x] Type safety enabled throughout
- [x] Error handling implemented
- [x] Logging configured

### ✅ File Integrity

- [x] `src/lib/agents/types.ts` - 110 lines, complete
- [x] `src/lib/agents/tools.ts` - 220 lines, complete
- [x] `src/lib/agents/gemmaAgent.ts` - 240 lines, complete
- [x] `src/lib/ai/ollama-config.ts` - 280 lines, complete
- [x] `src/routes/api/agents/+server.ts` - 150 lines, complete
- [x] `src/lib/components/agentic/AgentChat.svelte` - 200 lines, complete

### ✅ Documentation

- [x] `PHASE_13_IMPLEMENTATION_COMPLETE.md` - Comprehensive guide
- [x] `PHASE_13_QUICK_START.md` - Quick reference
- [x] `AGENTIC_TOOL_CALLING_README.md` - Implementation guide
- [x] `AGENTIC_TOOL_CALLING_BRIDGE.md` - Architecture details
- [x] `PHASE_13_SESSION_SUMMARY.md` - Session overview

---

## Service Verification Checklist

### Ollama Service

```bash
# Check if running
curl http://localhost:11434/api/tags

# Expected response:
# {
#   "models": [
#     { "name": "gemma3-legal:latest", ... },
#     { "name": "embeddinggemma:latest", ... }
#   ]
# }

# Pull required models if missing
docker exec ollama ollama pull gemma3-legal:latest
docker exec ollama ollama pull embeddinggemma:latest

# Verify models are available
docker exec ollama ollama list
```

**Checklist:**
- [ ] Ollama container is running
- [ ] Port 11434 is accessible
- [ ] `gemma3-legal:latest` model is available
- [ ] `embeddinggemma:latest` model is available
- [ ] Health check returns 200 OK

### Qdrant Service

```bash
# Check health
curl http://localhost:6333/health

# Expected response:
# {
#   "title": "qdrant",
#   "version": "..."
# }

# List collections
curl http://localhost:6333/collections

# Create collection if needed
curl -X PUT http://localhost:6333/collections/codemod_memories \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

**Checklist:**
- [ ] Qdrant container is running
- [ ] Port 6333 is accessible
- [ ] Health check returns 200 OK
- [ ] `codemod_memories` collection exists
- [ ] Collection has correct vector size (384)

### Redis Service

```bash
# Check connectivity
docker exec redis redis-cli ping

# Expected response: PONG

# Check memory usage
docker exec redis redis-cli INFO memory

# Check keys
docker exec redis redis-cli KEYS "*"

# Monitor commands
docker exec redis redis-cli MONITOR
```

**Checklist:**
- [ ] Redis container is running
- [ ] Port 6379 is accessible
- [ ] PING returns PONG
- [ ] Memory usage is reasonable
- [ ] No critical errors in logs

### PostgreSQL Service

```bash
# Check version
docker exec postgres psql -U postgres -c "SELECT version();"

# Check pgvector extension
docker exec postgres psql -U postgres -d legal_ai_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# List tables
docker exec postgres psql -U postgres -d legal_ai_db -c "\dt"

# Check database size
docker exec postgres psql -U postgres -d legal_ai_db -c "SELECT pg_size_pretty(pg_database_size('legal_ai_db'));"
```

**Checklist:**
- [ ] PostgreSQL container is running
- [ ] Port 5432 is accessible
- [ ] Database `legal_ai_db` exists
- [ ] pgvector extension is installed
- [ ] Required tables exist

### Go Microservices

```bash
# Check search service
curl http://localhost:8080/health

# Check embedding service
curl http://localhost:8081/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "..."
# }
```

**Checklist:**
- [ ] Search service container is running
- [ ] Port 8080 is accessible
- [ ] Embedding service container is running
- [ ] Port 8081 is accessible
- [ ] Both services return healthy status

---

## API Endpoint Testing

### Health Check Endpoint

```bash
# Test health endpoint
curl http://localhost:5173/api/agents/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "ollama": "connected",
#     "qdrant": "connected",
#     "redis": "connected",
#     "postgres": "connected"
#   },
#   "timestamp": "2025-12-15T..."
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] Status is "healthy" or "degraded"
- [ ] All services are listed
- [ ] Timestamp is current

### Tool Execution Endpoint

```bash
# Test RAG lookup tool
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "rag_lookup",
    "arguments": {"query": "TS1005 syntax error", "topK": 3}
  }'

# Expected response:
# {
#   "tool": "rag_lookup",
#   "arguments": {"query": "TS1005 syntax error", "topK": 3},
#   "result": {
#     "summary": "Retrieved 3 similar memories...",
#     "matches": [...]
#   },
#   "status": "success"
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] Tool name is echoed back
- [ ] Arguments are echoed back
- [ ] Result contains expected data
- [ ] Status is "success" or "error"

### Web Crawl Tool

```bash
# Test web crawl tool
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_crawl",
    "arguments": {"url": "https://kit.svelte.dev"}
  }'

# Expected response:
# {
#   "tool": "web_crawl",
#   "arguments": {"url": "https://kit.svelte.dev"},
#   "result": {
#     "url": "https://kit.svelte.dev",
#     "status": 200,
#     "text": "...",
#     "links": [...]
#   },
#   "status": "success"
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] URL is fetched successfully
- [ ] HTTP status is 200
- [ ] Content is returned
- [ ] Links are extracted

### Web Doc Summary Tool

```bash
# Test web doc summary tool
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_doc_summary",
    "arguments": {"url": "https://kit.svelte.dev", "topic": "SvelteKit"}
  }'

# Expected response:
# {
#   "tool": "web_doc_summary",
#   "arguments": {"url": "https://kit.svelte.dev", "topic": "SvelteKit"},
#   "result": {
#     "url": "https://kit.svelte.dev",
#     "topic": "SvelteKit",
#     "summary": "..."
#   },
#   "status": "success"
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] URL is fetched successfully
- [ ] Summary is generated
- [ ] Summary is in markdown format
- [ ] Topic is included in response

### Agent Chat Endpoint

```bash
# Test agent chat
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I fix TS1005 errors in Svelte 5?"
  }'

# Expected response:
# {
#   "response": "...",
#   "toolResults": [
#     {
#       "tool": "rag_lookup",
#       "arguments": {...},
#       "result": {...},
#       "status": "success"
#     }
#   ]
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] Response contains natural language text
- [ ] Tool results are included
- [ ] Each tool result has status
- [ ] Response is coherent and helpful

### Agent Chat with Context

```bash
# Test agent chat with context
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I fix this error?",
    "context": {
      "errorCode": "TS1005",
      "errorMessage": "';' expected",
      "file": "src/routes/+page.svelte"
    }
  }'

# Expected response:
# {
#   "response": "...",
#   "toolResults": [...]
# }
```

**Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] Context is passed to agent
- [ ] Response uses context information
- [ ] Tool results are relevant to context

---

## Frontend Component Testing

### Component Rendering

```svelte
<script>
  import AgentChat from '$lib/components/agentic/AgentChat.svelte';
</script>

<AgentChat />
```

**Checklist:**
- [ ] Component renders without errors
- [ ] Messages container is visible
- [ ] Input textarea is visible
- [ ] Send button is visible
- [ ] Dark theme is applied

### User Interaction

**Checklist:**
- [ ] User can type in textarea
- [ ] Send button is clickable
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] Loading indicator appears while processing
- [ ] Messages are displayed with timestamps
- [ ] Tool results are shown
- [ ] Errors are displayed in error banner

### Message Display

**Checklist:**
- [ ] User messages have correct styling
- [ ] Assistant messages have correct styling
- [ ] System messages have correct styling
- [ ] Error messages have correct styling
- [ ] Timestamps are formatted correctly
- [ ] Messages auto-scroll to bottom
- [ ] Long messages wrap correctly

---

## Performance Testing

### Response Time

```bash
# Measure health check response time
time curl http://localhost:5173/api/agents/health

# Expected: < 100ms

# Measure tool execution response time
time curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"rag_lookup","arguments":{"query":"test"}}'

# Expected: < 2 seconds

# Measure agent chat response time
time curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'

# Expected: < 5 seconds
```

**Checklist:**
- [ ] Health check: < 100ms
- [ ] Tool execution: < 2 seconds
- [ ] Agent chat: < 5 seconds
- [ ] No timeout errors
- [ ] No memory leaks

### Concurrent Requests

```bash
# Test with 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:5173/api/agents/chat \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}' &
done
wait

# Expected: All requests complete successfully
```

**Checklist:**
- [ ] All requests complete successfully
- [ ] No connection errors
- [ ] No timeout errors
- [ ] Response times are consistent
- [ ] No resource exhaustion

### Load Testing

```bash
# Install Apache Bench if not available
# apt-get install apache2-utils

# Run load test
ab -n 100 -c 10 http://localhost:5173/api/agents/health

# Expected: 100% success rate
```

**Checklist:**
- [ ] 100% success rate
- [ ] Average response time < 500ms
- [ ] No failed requests
- [ ] No connection errors

---

## Error Handling Testing

### Invalid Tool Name

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "invalid_tool",
    "arguments": {}
  }'

# Expected: 500 error with message
```

**Checklist:**
- [ ] Returns error status
- [ ] Error message is descriptive
- [ ] No server crash

### Missing Required Arguments

```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "rag_lookup",
    "arguments": {}
  }'

# Expected: Tool handles gracefully
```

**Checklist:**
- [ ] Tool handles missing arguments
- [ ] Error message is descriptive
- [ ] No server crash

### Service Unavailable

```bash
# Stop Ollama service
docker stop ollama

# Test health check
curl http://localhost:5173/api/agents/health

# Expected: Status is "degraded"

# Restart Ollama
docker start ollama
```

**Checklist:**
- [ ] Health check detects service down
- [ ] Status changes to "degraded"
- [ ] Service recovers when restarted
- [ ] No cascading failures

### Network Timeout

```bash
# Test with very long timeout
curl --max-time 1 -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'

# Expected: Timeout error
```

**Checklist:**
- [ ] Timeout is handled gracefully
- [ ] Error message is displayed
- [ ] No server crash

---

## Security Testing

### Input Validation

```bash
# Test with malicious input
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<script>alert(\"xss\")</script>"
  }'

# Expected: Input is sanitized
```

**Checklist:**
- [ ] Malicious input is sanitized
- [ ] No XSS vulnerabilities
- [ ] No SQL injection vulnerabilities

### Rate Limiting

```bash
# Send many requests rapidly
for i in {1..100}; do
  curl http://localhost:5173/api/agents/health &
done
wait

# Expected: No rate limiting errors (for now)
```

**Checklist:**
- [ ] No rate limiting errors
- [ ] All requests are processed
- [ ] No DoS vulnerabilities

### CORS Headers

```bash
# Test CORS headers
curl -i -X OPTIONS http://localhost:5173/api/agents/health

# Expected: Appropriate CORS headers
```

**Checklist:**
- [ ] CORS headers are present
- [ ] Headers are correct
- [ ] No security issues

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass
- [ ] All services are running
- [ ] All endpoints are responding
- [ ] Performance targets are met
- [ ] No security issues found
- [ ] Documentation is complete
- [ ] Environment variables are configured

### Deployment Steps

1. [ ] Build SvelteKit application
   ```bash
   npm run build
   ```

2. [ ] Verify build output
   ```bash
   ls -la build/
   ```

3. [ ] Start production server
   ```bash
   npm run preview
   ```

4. [ ] Test production endpoints
   ```bash
   curl http://localhost:4173/api/agents/health
   ```

5. [ ] Deploy to production environment
   ```bash
   # Your deployment command here
   ```

6. [ ] Verify production deployment
   ```bash
   curl https://your-domain.com/api/agents/health
   ```

### Post-Deployment

- [ ] All endpoints are accessible
- [ ] All services are connected
- [ ] Monitoring is active
- [ ] Logging is working
- [ ] Alerts are configured
- [ ] Backup is running
- [ ] Documentation is updated

---

## Monitoring & Maintenance

### Health Monitoring

```bash
# Set up continuous health monitoring
watch -n 5 'curl -s http://localhost:5173/api/agents/health | jq .'
```

**Checklist:**
- [ ] Health check runs every 5 seconds
- [ ] Status is always "healthy"
- [ ] All services are connected
- [ ] No errors in logs

### Log Monitoring

```bash
# View application logs
docker logs -f sveltekit-frontend

# View service logs
docker logs -f ollama
docker logs -f qdrant
docker logs -f redis
docker logs -f postgres
```

**Checklist:**
- [ ] No error messages
- [ ] No warning messages
- [ ] Performance is good
- [ ] No resource issues

### Performance Monitoring

```bash
# Monitor CPU usage
docker stats sveltekit-frontend

# Monitor memory usage
docker stats --no-stream

# Monitor disk usage
df -h
```

**Checklist:**
- [ ] CPU usage is reasonable
- [ ] Memory usage is stable
- [ ] Disk usage is acceptable
- [ ] No resource exhaustion

---

## Rollback Plan

If deployment fails:

1. [ ] Stop production server
   ```bash
   npm run stop
   ```

2. [ ] Restore previous version
   ```bash
   git checkout previous-version
   npm install
   npm run build
   ```

3. [ ] Restart services
   ```bash
   npm run dev
   ```

4. [ ] Verify rollback
   ```bash
   curl http://localhost:5173/api/agents/health
   ```

5. [ ] Investigate failure
   - Check logs
   - Check error messages
   - Check service status

---

## Sign-Off

- [ ] All tests passed
- [ ] All endpoints verified
- [ ] Performance targets met
- [ ] Security review completed
- [ ] Documentation reviewed
- [ ] Deployment approved
- [ ] Monitoring configured
- [ ] Rollback plan ready

**Deployment Date:** _______________
**Deployed By:** _______________
**Approved By:** _______________

---

**Last Updated:** December 15, 2025
**Status:** Ready for Testing & Deployment
**Maintained By:** Kiro IDE

