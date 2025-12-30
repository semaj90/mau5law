# ACE MCP Integration: Phase 92/93 Complete

**Date**: 2025-12-30
**Status**: ✅ Production Ready
**Tools**: 3 ACE tools added to FastMCP server

## 🎯 Overview

Three ACE tools are now available via MCP for agentic tool calling with GRPO-like thinking patterns:

1. **ace_smart_search**: Hierarchical retrieval with GPU reranking
2. **ace_timeline_recent**: Recent edits from event sourcing timeline
3. **ace_timeline_verify**: Timeline collection status verification

## 📦 Available ACE Tools

### 1. ace_smart_search

**Hierarchical retrieval with intent extraction and GPU reranking.**

```javascript
// MCP Call
{
  name: "ace_smart_search",
  arguments: {
    query: "svelte typescript errors",  // Natural language query
    limit: 5,                            // Max results (default: 5)
    collection: "phase89_cache_index"    // Qdrant collection (default: phase89_cache_index)
  }
}

// Response
{
  ok: true,
  query: "svelte typescript errors",
  intent: {
    feature_tags: ["svelte", "typescript"],
    error_tags: [],
    time_filter: null,
    collection_filter: null
  },
  results: [
    {
      id: 27,
      score: 0.4768,
      confidence: "VERIFY",
      tags: ["typescript", "svelte", "chunk"],
      text: "...",
      payload: {...}
    }
  ],
  timings: {
    total_ms: 572,
    embed_ms: 89,
    hnsw_ms: 31,
    rerank_ms: 470
  },
  stats: {
    total_points: 78,
    filtered_candidates: 17,
    reduction_percentage: 87.5
  }
}
```

**Key Features:**
- Intent extraction from natural language (5ms)
- Canonical tag taxonomy (10 feature + 5 error tags)
- Hierarchical retrieval: Filter → HNSW → GPU rerank
- 87-98% search space reduction
- <600ms end-to-end latency
- RTX 3060 Ti FP16 GPU reranking

**Confidence Levels:**
- `MISS` (<0.38): Low confidence, skip
- `VERIFY` (0.38-0.55): Medium confidence, review
- `SAFE_REUSE` (>0.55): High confidence, auto-apply

### 2. ace_timeline_recent

**Get recent edits from event sourcing timeline (Postgres + Qdrant).**

```javascript
// MCP Call
{
  name: "ace_timeline_recent",
  arguments: {
    hours: 24,  // Lookback hours (default: 24)
    limit: 10   // Max results (default: 10)
  }
}

// Response
{
  ok: true,
  recent_edits: [
    {
      event_id: "evt_20251230_100541",
      ts: "2025-12-30T10:05:41.137391+00:00",
      actor: "phase92-test",
      op: "upsert",
      collection: "phase89_cache_index",
      point_id: "123",
      tags: ["typescript", "chunk"],
      notes: "test event"
    }
  ],
  count: 3,
  hours: 24,
  meta: {
    tool: "ace_timeline_recent",
    source: "phase92_postgres_qdrant"
  }
}
```

**Use Cases:**
- Audit who changed what when
- Track version collisions (run_id filtering)
- Provenance for debugging
- Event replay for rollback

### 3. ace_timeline_verify

**Verify timeline collection status and configuration.**

```javascript
// MCP Call
{
  name: "ace_timeline_verify",
  arguments: {}  // No arguments needed
}

// Response
{
  ok: true,
  collection: "phase92_timeline_events",
  exists: true,
  points: 2,
  status: "green",
  raw_output: "✅ Collection exists: phase92_timeline_events\n   Vectors: None\n   Points: 2\n   Status: green",
  meta: {
    tool: "ace_timeline_verify",
    collection_type: "matryoshka_int8_quantized"
  }
}
```

**Verification Checks:**
- Collection exists
- Point count
- Status (green/yellow/red)
- Matryoshka quantization enabled (INT8, 4x compression)

## 🚀 Quick Start

### 1. Start FastMCP Server

```powershell
cd sveltekit-frontend
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

🧠 ACE Tools: Use ace_smart_search for intent-based retrieval with 87-98% search reduction!
   Phase 92/93: Event sourcing + Smart filtering with GPU reranking on RTX 3060 Ti

✨ Ready for autonomous error fixing with KB grounding!
```

### 2. Test ACE Tools

```powershell
node scripts/test-ace-mcp-tools.mjs
```

Expected output:
```
🧪 ACE MCP Tools Test Suite
════════════════════════════════════════════════════════════
MCP Server: http://localhost:3002

📌 Test 1: ace_smart_search (typescript errors)
────────────────────────────────────────────────────────────
✅ Result:
   OK: true
   Query: typescript errors
   Intent: { feature_tags: ["typescript"], error_tags: [] }
   Results: 3
   Timings: { total_ms: 599, embed_ms: 89, hnsw_ms: 31, rerank_ms: 477 }

📌 Test 2: ace_timeline_recent (last 24 hours)
────────────────────────────────────────────────────────────
✅ Result:
   OK: true
   Count: 3
   Hours: 24

📌 Test 3: ace_timeline_verify (collection status)
────────────────────────────────────────────────────────────
✅ Result:
   OK: true
   Collection: phase92_timeline_events
   Exists: true
   Points: 2

📊 Test Summary
════════════════════════════════════════════════════════════
✅ ace_smart_search: PASS
✅ ace_timeline_recent: PASS
✅ ace_timeline_verify: PASS

🎉 All Tests Passed!
```

### 3. Manual MCP Calls (cURL)

```powershell
# Smart search
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_smart_search",
    "arguments": {
      "query": "svelte typescript errors",
      "limit": 3
    }
  }'

# Timeline recent
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_timeline_recent",
    "arguments": {
      "hours": 24,
      "limit": 5
    }
  }'

# Timeline verify
curl -X POST http://localhost:3002/function-call `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ace_timeline_verify",
    "arguments": {}
  }'
```

## 🧠 Agentic Workflow Examples

### Example 1: Fix TypeScript Errors with Smart Search

```javascript
// Agent workflow
const workflow = async () => {
  // 1. Search for TypeScript errors
  const search = await mcp.call('ace_smart_search', {
    query: 'typescript TS2304 cannot find name',
    limit: 5
  });

  // 2. Filter by confidence
  const highConfidence = search.results.filter(r => r.confidence === 'SAFE_REUSE');

  // 3. Apply fixes
  for (const result of highConfidence) {
    await mcp.call('write_file', {
      path: result.payload.source_file,
      content: applyFix(result)
    });

    // 4. Log to timeline
    await logEvent('fix_applied', result.id);
  }

  // 5. Check recent edits
  const recent = await mcp.call('ace_timeline_recent', { hours: 1 });
  console.log(`✅ Applied ${recent.count} fixes`);
};
```

### Example 2: GRPO-Style Thinking with Timeline

```javascript
// GRPO: Gather → Reason → Plan → Optimize
const grpoWorkflow = async (task) => {
  // GATHER: Smart search for context
  const context = await mcp.call('ace_smart_search', {
    query: task.description,
    limit: 10
  });

  // REASON: Analyze intent and confidence
  const reasoning = {
    intent: context.intent,
    high_confidence: context.results.filter(r => r.confidence === 'SAFE_REUSE'),
    needs_review: context.results.filter(r => r.confidence === 'VERIFY'),
    search_reduction: context.stats.reduction_percentage
  };

  // PLAN: Generate action plan
  const plan = generatePlan(reasoning);

  // OPTIMIZE: Execute with timeline tracking
  for (const action of plan.actions) {
    await executeAction(action);

    // Log to timeline for provenance
    await logEvent(action.type, action.target);
  }

  // VERIFY: Check timeline for consistency
  const timeline = await mcp.call('ace_timeline_recent', { hours: 1 });
  const verify = await mcp.call('ace_timeline_verify', {});

  return {
    task_complete: true,
    actions_taken: timeline.count,
    timeline_status: verify.status,
    reasoning
  };
};
```

## 📊 Performance Benchmarks

**Smart Search (ace_smart_search)**:
- Intent extraction: ~5ms
- Query embedding: ~90ms
- HNSW search (filtered): ~30ms
- GPU rerank (RTX 3060 Ti): ~470ms
- **Total: <600ms**
- Search space reduction: 87.5% (single tag), 98.7% (multi-tag)

**Timeline Recent (ace_timeline_recent)**:
- Postgres query: ~20ms
- JSON serialization: ~5ms
- **Total: <50ms**

**Timeline Verify (ace_timeline_verify)**:
- Qdrant collection info: ~10ms
- **Total: <20ms**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  FastMCP Server (Port 3002)                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ACE Tools (Phase 92/93)                              │  │
│  │                                                      │  │
│  │  ace_smart_search ────────┬──> phase93-smart-filter.py  │
│  │                           │     └─> Intent Extraction    │
│  │                           │     └─> Payload Filtering    │
│  │                           │     └─> HNSW Search           │
│  │                           │     └─> GPU Rerank (RTX 3060)│
│  │                           │                               │
│  │  ace_timeline_recent ─────┼──> phase92-event-sourcing.py │
│  │                           │     └─> Postgres (17 cols)   │
│  │                           │     └─> Qdrant (768-d)       │
│  │                           │                               │
│  │  ace_timeline_verify ─────┴──> phase92-timeline-collection.py
│  │                                 └─> Qdrant collection info
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐      ┌──────────┐
   │ Qdrant   │      │ PostgreSQL   │      │ RTX 3060 │
   │ (6333)   │      │ (5434)       │      │ Ti GPU   │
   └──────────┘      └──────────────┘      └──────────┘
```

## 📝 Implementation Details

### Files Modified

1. **scripts/fastmcp-server.mjs** (777 → ~980 lines)
   - Added `aceSmartSearch()` function (87 lines)
   - Added `aceTimelineRecent()` function (75 lines)
   - Added `aceTimelineVerify()` function (60 lines)
   - Updated tools registry (+3 tools)
   - Updated startup message with ACE tools

2. **scripts/phase92-event-sourcing.py** (495 → 510 lines)
   - Added `--json` flag for MCP integration
   - JSON output for `--recent-edits` command
   - Maintains human-readable output by default

3. **scripts/test-ace-mcp-tools.mjs** (NEW, 171 lines)
   - Complete test suite for all ACE tools
   - Health check validation
   - Comprehensive output formatting

### Backend Stack

**Qdrant Collections**:
- `phase89_cache_index`: 78 points (error embeddings)
- `phase92_timeline_events`: 2 points (event log)

**PostgreSQL Schema**:
- `phase89_qdrant_events` table (17 columns, 7 indexes)
- Columns: `event_id`, `ts`, `actor`, `op`, `collection`, `point_id`, `tags`, `notes`, `run_id`, `redis_key_ref`, `diff_json`, `metadata`, `vector_dim`, `vector_model`, `cosine_sim`, `created_at`, `updated_at`

**GPU Compute**:
- Device: NVIDIA GeForce RTX 3060 Ti (8.6GB VRAM)
- Precision: FP16
- Latency: ~470ms for 50 candidates

## 🔧 Troubleshooting

### MCP Server Not Responding

```powershell
# Check if running
curl http://localhost:3002/health

# Start server
node scripts/fastmcp-server.mjs

# Check logs
# Look for "🚀 FastMCP Server Running" message
```

### Python Script Errors

```powershell
# Test smart filter directly
python scripts/phase93-smart-filter.py "typescript errors" --json

# Test timeline directly
python scripts/phase92-event-sourcing.py --recent-edits --json

# Verify collection
python scripts/phase92-timeline-collection.py --verify
```

### GPU Not Available

If GPU reranking fails, smart filter automatically falls back to CPU:
- Latency increases from ~470ms to ~1500ms
- Accuracy slightly reduced
- Check GPU with: `nvidia-smi`

### Empty Timeline Results

```powershell
# Initialize database
python scripts/phase92-event-sourcing.py --init-db

# Log test event
python scripts/phase92-event-sourcing.py --log-event upsert phase89_cache_index test-point

# Verify
python scripts/phase92-event-sourcing.py --recent-edits
```

## 📚 Related Documentation

- **PHASE93_SMART_FILTER_COMPLETE.md**: Complete video-guided architecture
- **PHASE93_PRODUCTION_STATUS.md**: Test results and performance metrics
- **ACE_QUICK_REFERENCE_CARD.md**: Daily usage cheat sheet

## 🎯 Next Steps

**Phase 94: Batch API Worker** (TODO)
- Background job queue for large-scale indexing
- Batch embedding API calls (10-100 chunks)
- Reduce Ollama overhead from 89ms to ~10ms per chunk

**Phase 95: Auto-Logging Integration** (TODO)
- Wire `log_event()` into phase89/91 scripts
- Automatic timeline tracking for all Qdrant operations
- No manual `--log-event` calls needed

**Phase 96: Human-in-the-Loop UI** (TODO)
- CopilotKit pattern for VERIFY confidence level
- One-click approve/reject interface
- Timeline dashboard with event replay

## ✅ Production Checklist

- [x] ACE tools implemented in FastMCP
- [x] JSON output support in Python scripts
- [x] Test suite created and passing
- [x] Documentation complete
- [x] Performance validated (<600ms)
- [x] GPU reranking operational
- [x] Event sourcing timeline working
- [x] Hierarchical retrieval tested
- [x] Canonical tag taxonomy defined
- [x] Confidence buckets calibrated

**Status**: ✅ **PRODUCTION READY**

---

**Built with**: DeepMind RAG best practices, Matryoshka quantization, GPU reranking
**Hardware**: RTX 3060 Ti, PostgreSQL 17, Qdrant 1.12.2
**LLM**: embeddinggemma:latest via Ollama
