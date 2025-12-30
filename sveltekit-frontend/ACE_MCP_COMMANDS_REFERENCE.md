# ACE MCP Commands - Copy-Paste Reference

## 🚀 Start Server

```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/fastmcp-server.mjs
```

Expected output:
```
🚀 FastMCP Server Running
   Port: 3002
   URL: http://localhost:3002/function-call

📦 Available Tools (14):
   ...
   - ace_smart_search: 🧠 Hierarchical retrieval (filter → HNSW → GPU rerank)
   - ace_timeline_recent: 📊 Recent edits from event sourcing timeline
   - ace_timeline_verify: ✅ Verify timeline collection status
```

---

## 🧪 Test All ACE Tools

```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/test-ace-mcp-tools.mjs
```

Expected output:
```
🧪 ACE MCP Tools Test Suite
✅ ace_smart_search: PASS
✅ ace_timeline_recent: PASS
✅ ace_timeline_verify: PASS
🎉 All Tests Passed!
```

---

## 📋 Individual Tool Tests

### Smart Search (cURL)
```powershell
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_smart_search",
    "arguments": {
      "query": "svelte typescript errors",
      "limit": 5,
      "collection": "phase89_cache_index"
    }
  }'
```

### Timeline Recent (cURL)
```powershell
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_timeline_recent",
    "arguments": {
      "hours": 24,
      "limit": 10
    }
  }'
```

### Timeline Verify (cURL)
```powershell
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_timeline_verify",
    "arguments": {}
  }'
```

---

## 🛠️ Direct Python Execution (Bypass MCP)

### Smart Filter
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase93-smart-filter.py "svelte typescript errors" --limit 5 --collection phase89_cache_index --json
```

### Timeline Recent
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-event-sourcing.py --recent-edits --hours 24 --limit 10 --json
```

### Timeline Verify
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-timeline-collection.py --verify
```

---

## 🔍 Health Checks

### MCP Server Health
```powershell
curl http://localhost:3002/health
```

Expected:
```json
{
  "ok": true,
  "status": "healthy",
  "tools": 14
}
```

### List All Tools
```powershell
curl http://localhost:3002/tools
```

### GPU Check
```powershell
nvidia-smi
```

Look for:
```
NVIDIA GeForce RTX 3060 Ti
```

---

## 📊 Status Checks

### Qdrant Collections
```powershell
curl http://localhost:6333/collections
```

Should include:
- `phase89_cache_index` (78 points)
- `phase92_timeline_events` (2+ points)

### PostgreSQL
```powershell
docker exec phase66-postgres psql -U user -d legal -c "SELECT COUNT(*) FROM phase89_qdrant_events;"
```

### Redis
```powershell
docker exec phase66-redis redis-cli DBSIZE
```

---

## 🧹 Maintenance Commands

### Initialize Timeline Database
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-event-sourcing.py --init-db
```

### Log Test Event
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-event-sourcing.py --log-event upsert phase89_cache_index test-point --actor "manual-test" --notes "Testing timeline"
```

### Create Timeline Collection
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-timeline-collection.py --create --quantize
```

### Verify Timeline Collection
```powershell
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
python scripts/phase92-timeline-collection.py --verify
```

---

## 📝 Example Queries

### TypeScript Errors
```json
{
  "name": "ace_smart_search",
  "arguments": {
    "query": "typescript TS2304 cannot find name",
    "limit": 5
  }
}
```

### Svelte 5 Runes
```json
{
  "name": "ace_smart_search",
  "arguments": {
    "query": "svelte $state $derived runes",
    "limit": 5
  }
}
```

### Auth/Lucia Issues
```json
{
  "name": "ace_smart_search",
  "arguments": {
    "query": "lucia auth login session",
    "limit": 5
  }
}
```

### Recent Changes (Last Hour)
```json
{
  "name": "ace_timeline_recent",
  "arguments": {
    "hours": 1,
    "limit": 20
  }
}
```

---

## 🚨 Troubleshooting Commands

### Restart MCP Server
```powershell
# Kill existing
Get-Process -Name node | Where-Object { $_.MainWindowTitle -like "*fastmcp*" } | Stop-Process

# Start new
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/fastmcp-server.mjs
```

### Check Python Environment
```powershell
python --version  # Should be 3.11+
pip list | Select-String -Pattern "qdrant|asyncpg|ollama"
```

### Clear GPU Memory
```powershell
nvidia-smi --gpu-reset
```

### Docker Status
```powershell
docker ps -a --filter "name=phase66"
```

Should show:
- `phase66-postgres` (UP)
- `phase66-redis` (UP)
- `phase66-qdrant` (UP)

---

## 📚 Documentation Links

**In `sveltekit-frontend/`:**
- ACE_MCP_INTEGRATION_COMPLETE.md (full guide)
- ACE_MCP_QUICK_REF.md (quick reference)
- PHASE93_SMART_FILTER_COMPLETE.md (architecture)
- PHASE93_PRODUCTION_STATUS.md (test results)
- ACE_QUICK_REFERENCE_CARD.md (daily usage)

**In main project:**
- ACE_PHASE92_93_MCP_COMPLETE.md (summary)

---

## 🎯 Common Workflows

### Workflow 1: Fix Errors
```powershell
# 1. Search for errors
curl -X POST http://localhost:3002/function-call -H "Content-Type: application/json" -d '{"name": "ace_smart_search", "arguments": {"query": "typescript errors", "limit": 10}}'

# 2. Filter by confidence (SAFE_REUSE)
# (in code: results.filter(r => r.confidence === 'SAFE_REUSE'))

# 3. Apply fixes
# (use write_file tool)

# 4. Check timeline
curl -X POST http://localhost:3002/function-call -H "Content-Type: application/json" -d '{"name": "ace_timeline_recent", "arguments": {"hours": 1}}'
```

### Workflow 2: Audit Changes
```powershell
# 1. Get recent edits
python scripts/phase92-event-sourcing.py --recent-edits --hours 24 --json

# 2. Verify collection health
python scripts/phase92-timeline-collection.py --verify

# 3. Search timeline
python scripts/phase92-event-sourcing.py --search-timeline "typescript" --hours 24
```

---

**Quick Reference**: ACE_MCP_COMMANDS_REFERENCE.md
**Full Docs**: ACE_MCP_INTEGRATION_COMPLETE.md
**Status**: ✅ Production Ready
