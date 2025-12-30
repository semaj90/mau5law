# Context7 MCP Server - Docker Container Configuration

## Summary

The Context7 MCP Agentic Server uses **existing Docker containers** - no new containers needed!

---

## Container Inventory

### ✅ phase66-rabbitmq (RabbitMQ)

**Status**: Running (healthy)
**Ports**: 5672 (AMQP), 15672 (Management UI)
**Version**: RabbitMQ 3.13.7
**Credentials**: guest/guest
**Connection URL**: `amqp://guest:guest@localhost:5672`

**Usage in Context7**:
- Work queues for concurrent job processing
- 4 queues: tools, embeddings, analysis, results
- 16+ workers distributed across queues
- Fanout and direct exchanges

**Management UI**:
```
http://localhost:15672
Username: guest
Password: guest
```

---

### ✅ phase66-postgres (PostgreSQL 17)

**Status**: Running
**Port**: 5434
**Database**: legal_ai_db
**User**: legal_admin

**Usage in Context7**:
- Read-only SQL queries via `query_database` tool
- Connection pooling (max: 20 connections)
- Tables: raw_error_embeddings, phase89_*

---

### ✅ phase66-redis (Redis)

**Status**: Running (healthy)
**Port**: 6379
**Database**: 0

**Usage in Context7**:
- Embedding cache (1h TTL, 486x speedup)
- Tool result cache (24h TTL)
- Analysis cache (1 week TTL)
- 24,615+ phase89:* keys indexed

---

### ✅ phase66-qdrant (Qdrant Vector DB)

**Status**: Running (unhealthy warning - benign)
**Port**: 6333
**Collections**: 22 total

**Usage in Context7**:
- phase89_redis_cache_index (semantic cache search)
- phase76_knowledge_base (ACE prompting context)
- context7_tool_registry (tool discovery)
- 21 other collections for analysis

---

### ✅ ollama-gemma (Ollama)

**Status**: Running
**Port**: 11434

**Models**:
- gemma3-legal:latest (7.3GB, 128K context)
- embeddinggemma:latest (621MB, 768-dim)

**Usage in Context7**:
- LLM analysis via `analyze_errors` tool
- Embedding generation for all vector operations
- ACE contextual prompting with KB integration

---

## Quick Commands

### Check All Containers

```bash
docker ps --filter "name=phase66" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Start All Required Containers

```bash
docker start phase66-postgres phase66-redis phase66-qdrant phase66-rabbitmq ollama-gemma
```

### Check RabbitMQ Queues

```bash
# Via Management UI
curl -u guest:guest http://localhost:15672/api/queues

# Or open in browser
Start-Process http://localhost:15672
```

### Verify RabbitMQ Connection

```bash
# Test connection
node -e "import('amqplib').then(amqp => amqp.connect('amqp://localhost:5672').then(() => console.log('✅ RabbitMQ connected')))"
```

---

## Context7 Server Startup

### Automated (Recommended)

```bash
pwsh scripts/start-context7-agentic.ps1
```

**This script will**:
1. Check all container prerequisites
2. Verify RabbitMQ is running
3. Check Node.js dependencies
4. Start Context7 server in background
5. Run health check
6. Display endpoints and commands

### Manual

```bash
# 1. Verify containers
docker ps | grep -E "phase66|ollama"

# 2. Start server
node scripts/context7-mcp-agentic-server.mjs

# 3. Test
node scripts/test-context7-agentic.mjs
```

---

## RabbitMQ Queue Setup

The Context7 server will **automatically create** these queues on startup:

1. **context7.tools** (durable)
   - Tool function calls
   - 8 workers
   - Prefetch: 10 messages

2. **context7.embeddings** (durable)
   - Embedding generation
   - 4 workers
   - Prefetch: 10 messages

3. **context7.analysis** (durable)
   - LLM analysis with gemma3-legal
   - 4 workers
   - Prefetch: 10 messages

4. **context7.results** (durable)
   - Result aggregation
   - All workers subscribe
   - Prefetch: 10 messages

**Exchanges**:
- `context7.fanout` (fanout, durable)
- `context7.direct` (direct, durable)

---

## Troubleshooting

### RabbitMQ Not Running

```bash
# Check status
docker ps -a --filter "name=phase66-rabbitmq"

# Start if stopped
docker start phase66-rabbitmq

# Check logs
docker logs phase66-rabbitmq --tail 50

# Restart if needed
docker restart phase66-rabbitmq
```

### Port 5672 Already in Use

```bash
# Find process using port
Get-NetTCPConnection -LocalPort 5672 -State Listen

# If it's not phase66-rabbitmq, kill it
Stop-Process -Id <PID> -Force
```

### Management UI Not Accessible

```bash
# Check port 15672
curl http://localhost:15672

# If not accessible, restart container
docker restart phase66-rabbitmq

# Wait 10 seconds
Start-Sleep -Seconds 10

# Try again
Start-Process http://localhost:15672
```

### Queue Not Created

**Cause**: Context7 server not started or crashed during startup

**Solution**:
```bash
# Check server logs
# Server should show:
#   ✅ Queue: context7.tools (tools)
#   ✅ Queue: context7.embeddings (embeddings)
#   ✅ Queue: context7.analysis (analysis)
#   ✅ Queue: context7.results (results)

# If not, restart server
node scripts/context7-mcp-agentic-server.mjs
```

---

## Performance Monitoring

### RabbitMQ Management UI

**Queue Metrics**:
- Message rate (in/out)
- Queue depth
- Consumer count
- Ack/Nack rates

**Navigate to**:
```
http://localhost:15672/#/queues
```

### Docker Stats

```bash
# Real-time stats
docker stats phase66-rabbitmq phase66-redis phase66-qdrant

# Expected RabbitMQ usage:
# - CPU: 5-15% (under load)
# - Memory: 100-200MB
# - Network: Variable based on message rate
```

---

## Summary

✅ **All required containers already exist**
✅ **phase66-rabbitmq is running and healthy**
✅ **Default credentials work (guest/guest)**
✅ **Ports 5672 and 15672 are accessible**
✅ **Context7 server will auto-create queues**

**No additional Docker setup required!**

Simply run:
```bash
pwsh scripts/start-context7-agentic.ps1
```
