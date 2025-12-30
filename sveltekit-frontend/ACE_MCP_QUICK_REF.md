# ACE MCP Quick Reference

**FastMCP Server**: http://localhost:3002
**Test Suite**: `node scripts/test-ace-mcp-tools.mjs`
**Tools**: 14 total (11 existing + 3 ACE)

## 🧠 ACE Tools

### ace_smart_search
**Smart filtering with GPU rerank (87-98% search reduction)**

```javascript
// Call
{
  name: "ace_smart_search",
  arguments: {
    query: "svelte typescript errors",
    limit: 5,                         // default: 5
    collection: "phase89_cache_index" // default
  }
}

// Response
{
  ok: true,
  query: "...",
  intent: { feature_tags: [...], error_tags: [...] },
  results: [{ id, score, confidence, tags, text, payload }],
  timings: { total_ms, embed_ms, hnsw_ms, rerank_ms },
  stats: { total_points, filtered_candidates, reduction_percentage }
}
```

**Confidence Levels**:
- `MISS` (<0.38): Skip
- `VERIFY` (0.38-0.55): Review
- `SAFE_REUSE` (>0.55): Auto-apply

**Performance**: <600ms end-to-end

---

### ace_timeline_recent
**Recent edits from event log**

```javascript
// Call
{
  name: "ace_timeline_recent",
  arguments: {
    hours: 24, // default: 24
    limit: 10  // default: 10
  }
}

// Response
{
  ok: true,
  recent_edits: [
    { event_id, ts, actor, op, collection, point_id, tags, notes }
  ],
  count: 3,
  hours: 24
}
```

**Performance**: <50ms

---

### ace_timeline_verify
**Verify timeline collection status**

```javascript
// Call
{
  name: "ace_timeline_verify",
  arguments: {}
}

// Response
{
  ok: true,
  collection: "phase92_timeline_events",
  exists: true,
  points: 2,
  status: "green"
}
```

**Performance**: <20ms

---

## 📝 Canonical Tags

### Feature Tags (10)
- `svelte`, `sveltekit`, `typescript`, `auth`, `lucia`, `minio`, `redis`, `postgres`, `qdrant`, `ollama`

### Error Tags (5)
- `ts2304` (cannot find name)
- `ts1005` (expected token)
- `ts2345` (argument type mismatch)
- `ts2322` (type not assignable)
- `ts7006` (implicit any)

---

## 🚀 Common Patterns

### Pattern 1: Search + Filter by Confidence
```javascript
const search = await mcp.call('ace_smart_search', {
  query: 'typescript errors',
  limit: 10
});

const highConfidence = search.results.filter(
  r => r.confidence === 'SAFE_REUSE'
);

// Apply fixes automatically
for (const result of highConfidence) {
  await applyFix(result);
}
```

### Pattern 2: Timeline Audit
```javascript
const recent = await mcp.call('ace_timeline_recent', {
  hours: 24
});

// Find who changed what
recent.recent_edits.forEach(edit => {
  console.log(`${edit.actor} did ${edit.op} on ${edit.collection}`);
});
```

### Pattern 3: Health Check
```javascript
const verify = await mcp.call('ace_timeline_verify', {});
if (!verify.exists || verify.status !== 'green') {
  console.error('Timeline collection unhealthy!');
}
```

---

## 🛠️ CLI Equivalents

```powershell
# Smart search
python scripts/phase93-smart-filter.py "typescript errors" --json

# Timeline recent
python scripts/phase92-event-sourcing.py --recent-edits --hours 24 --json

# Timeline verify
python scripts/phase92-timeline-collection.py --verify
```

---

## 🧪 Testing

```powershell
# Start server
node scripts/fastmcp-server.mjs

# Run tests (in new terminal)
node scripts/test-ace-mcp-tools.mjs

# Manual test
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{"name": "ace_smart_search", "arguments": {"query": "svelte errors"}}'
```

---

## 📊 Performance Targets

| Tool | Latency | Notes |
|------|---------|-------|
| `ace_smart_search` | <600ms | GPU rerank ~470ms |
| `ace_timeline_recent` | <50ms | Postgres query |
| `ace_timeline_verify` | <20ms | Qdrant collection info |

---

## 🔧 Troubleshooting

**MCP server not responding?**
```powershell
curl http://localhost:3002/health
node scripts/fastmcp-server.mjs  # If not running
```

**Python script errors?**
```powershell
python scripts/phase93-smart-filter.py "test" --json  # Test directly
python scripts/phase92-event-sourcing.py --recent-edits --json
```

**Empty timeline?**
```powershell
python scripts/phase92-event-sourcing.py --init-db  # Initialize
python scripts/phase92-event-sourcing.py --log-event upsert test test  # Test event
```

---

## 📚 Full Docs

- **ACE_MCP_INTEGRATION_COMPLETE.md**: Complete guide
- **PHASE93_SMART_FILTER_COMPLETE.md**: Smart filtering architecture
- **PHASE93_PRODUCTION_STATUS.md**: Test results
