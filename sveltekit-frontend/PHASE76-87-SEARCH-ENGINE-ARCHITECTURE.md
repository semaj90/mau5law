# Phase 76-87: RAG+KAG Search Engine Architecture

## Overview

This document maps the complete **Retrieval-Augmented Generation (RAG)** + **Knowledge-Augmented Generation (KAG)** architecture for autonomous error fixing with contextual engineering and self-improving LLM outputs.

---

## 🏗️ Architecture Map

### A. RAG (Retrieval-Augmented Generation)

**Core Services:**
- `src/lib/services/real-vector-search-service.ts` - Hybrid vector search
- `src/lib/services/enhanced-ai-analysis.ts` - EnhancedRAGPipeline

**Vector Stores:**
- **Qdrant** (semantic): 15 collections, 55,561 vectors
  - `phase76_knowledge_base` - Operator docs + ACE prompts + LLM outputs
  - `phase72_ast_knowledge_base` - AST surgical patterns
  - `phase72_error_patterns` - Error corpus embeddings
  - `successful_fixes` - Proven patches
- **pgvector** (HNSW): `error_embeddings table(768)` - Fast similarity search

**Embedding Models:**
- `embeddinggemma:latest` (768D) - Primary
- `nomic-embed-text` (384D) - Legacy

**Retrieval Flow:**
```
Error + Code Context
    ↓
Embed (embeddinggemma 768D)
    ↓
Qdrant Semantic Search (cosine, topK=8, threshold=0.7)
    ↓
pgvector HNSW Search (cosine, topK=10, threshold=0.75)
    ↓
Merge + Rerank (Qdrant 40%, pgvector 30%, KAG 30%)
    ↓
Top 5 Results
```

---

### B. KAG (Knowledge-Augmented Generation)

**Graph Engine:**
- **Neo4j** - Primary graph store (`evidence-graph-service.ts`)
- **Postgres `knowledge_graph` table** - Fast local graph joins

**Graph Schema:**
```sql
CREATE TABLE knowledge_graph (
  id serial PRIMARY KEY,
  source_id int REFERENCES ts_errors(id),
  target_id int REFERENCES ts_errors(id),
  relationship text NOT NULL,  -- 'CAUSES', 'FIXES', 'SIMILAR_PATTERN', 'SAME_FILE'
  pattern text NOT NULL,        -- Deterministic label (TS1005:missing-comma)
  pattern_confidence real,
  created_at timestamptz DEFAULT now()
);
```

**Pattern Labeling (Deterministic):**
```javascript
// scripts/phase76-kb-update.mjs
TS1005: (message, snippet) => {
  if (message.includes("',' expected")) return { pattern: 'missing-comma', conf: 0.9 };
  if (message.includes("';' expected")) return { pattern: 'missing-semicolon', conf: 0.9 };
  // ... etc
}
```

**Graph Algorithms:**
- `PageRankSimilarityRetrieval` - Rank nodes by influence
- **KAG Expansion**: `SELECT * FROM knowledge_graph WHERE source_id = $errorId OR target_id = $errorId`

**Sync:**
- `scripts/phase76-couchdb-graph-sync.mjs` - CouchDB ↔ Graph sync

---

### C. Web & Ingestion

**Crawling:**
- `scripts/phase76-knowledge-builder.mjs` - Primary ingestion tool
  - Google, Bing, DuckDuckGo fallback
  - `--crawl <url> --depth 2`
  - `--search <query>`
  - `--ingest-code ./src/routes`
- `scripts/phase86-agent-server.mjs` - Firecrawl agentic search
- `ProductionPipelineService` - XState orchestrator

**Storage:**
- **MinIO (S3)**: Raw crawled HTML/PDFs (`blob_path`)
- **CouchDB**: Document metadata + graph relationships (`couchdb_id`)
- **Postgres**: Structured metadata + search index

**Pipeline:**
```
Web Crawl (Firecrawl/HTTP)
    ↓
Parse (langextract Docker container)
    ↓
Chunk (1800 chars, 200 overlap)
    ↓
Embed (embeddinggemma 768D)
    ↓
Store (Qdrant + Postgres + MinIO)
    ↓
Index (pgvector HNSW + CouchDB views)
```

---

### D. Phase 76-87 Scripts Inventory

**Phase 76: Knowledge Base Foundation**
- `phase76-ace-prompt-engineer.mjs` - ACE agent logic
- `phase76-knowledge-builder.mjs` - Crawl + ingest
- `phase76-storage-layer.mjs` - Storage abstraction
- `phase76-mcp-server.mjs` - MCP tool server (deprecated)
- `phase76-knowledge-mcp-server.mjs` - Knowledge-specific MCP
- `phase76-fastmcp-server.mjs` - Legacy FastMCP (replaced by scripts/fastmcp-server.mjs)
- `phase76-couchdb-graph-sync.mjs` - Graph sync
- `phase76-kb-update.mjs` - **NEW: Operator docs + ACE prompts + LLM outputs**

**Phase 80-87: Autonomous Error Fixing**
- `phase80-stratify-errors.mjs` - Priority scoring
- `phase81-fix-semicolon-comma.mjs` - TS1005 micro-fixer
- `phase82-micro-fixers.mjs` - Pattern-based fixers
- `phase84-hot-fix.mjs` - Regex rewrite for specific patterns
- `phase86-autonomous-loop.mjs` - Main autonomous loop
- `phase87-autonomous-fixer.mjs` - Advanced fixer with RAG+KAG
- `phase87-ingest-error-corpus.mjs` - Embed 33,599 errors
- `phase87-knowledge-sync.mjs` - Sync Qdrant ↔ Postgres ↔ Graph

**Support Scripts:**
- `init-qdrant.mjs` - Create `phase76_knowledge_base`
- `index-knowledge-base.mjs` - Scroll Qdrant + generate datasets
- `generate-training-data.mjs` - Export for fine-tuning
- `error-index-qdrant.mjs` - Index errors in Qdrant
- `embed-errors-batch-optimized.mjs` - Batch embedding
- `cached-error-collector.mjs` - Collect errors from TSC output

---

## 🔧 FastMCP Server (Unified Tool Layer)

**Location:** `scripts/fastmcp-server.mjs`

**Port:** 3002

**Tools (10):**
1. `qdrant_search` - Search knowledge base
2. `postgres_query` - Query PostgreSQL
3. `minio_fetch` - Fetch from MinIO
4. `redis_cache` - Cache operations
5. `read_file` - **Read files with line range support**
6. `ripgrep` - **Symbol/pattern search**
7. `search_codebase` - Full-text search
8. `web_search` - External search (disabled by default)
9. `write_file` - Write/patch files
10. `run_command` - Execute shell commands

**Request Schema (normalized):**
```json
{
  "name": "read_file",  // or "tool", "function", "function_name"
  "arguments": {
    "filepath": "./package.json",
    "startLine": 1,
    "endLine": 10
  }
}
```

**Error Handling:** Never crashes, returns `{ok: false, error}` on failure

---

## 📊 Knowledge Base Content Types

### 1. **kb_doc** (Operator Documentation)
**Sources:**
- `NEXT_STEPS_LOG.md`
- `MCP_SESSION_SUMMARY.md`
- `MCP_IMPLEMENTATION_SUMMARY.md`
- `PHASE86_ENHANCEMENT_ROADMAP.md`
- `FASTMCP-STATUS-REPORT.md`

**Tags:** `phase76`, `ace`, `mcp`, `contextual-engineering`, `operator-docs`

**Purpose:** When Phase86 asks "what should I do next / how does ACE work / which tool", retrieve canonical playbooks

**Ingest:**
```bash
node scripts/phase76-kb-update.mjs \
  --paths NEXT_STEPS_LOG.md MCP_SESSION_SUMMARY.md MCP_IMPLEMENTATION_SUMMARY.md \
  --tags phase76 ace mcp contextual-engineering operator-docs \
  --kind kb_doc
```

---

### 2. **ace_prompt_template** (ACE Prompt Templates)

**Schema:**
```json
{
  "name": "surgical-fix-template",
  "task_type": "error-fix",
  "template": "Fix this TypeScript error with the SMALLEST possible patch...",
  "constraints": {
    "max_lines": 30,
    "max_files": 1,
    "min_confidence": 0.85
  },
  "expected_output_schema": {
    "type": "code_snippet",
    "fields": ["fixed_code", "explanation", "confidence"]
  }
}
```

**Tags:** `ace`, `prompt`, `contextual-engineering`

**Purpose:** Retrieve proven prompt structures for specific task types

**Ingest:**
```bash
node scripts/phase76-kb-update.mjs --kind ace_prompt_templates
```

---

### 3. **ace_llm_output** (Successful LLM Outputs)

**Schema:**
```json
{
  "run_id": "run-00041",
  "error": {
    "code": "TS1005",
    "message": "',
' expected.",
    "file": "src/routes/+page.svelte",
    "line": 42
  },
  "pattern": "TS1005:missing-comma",
  "confidence": 0.92,
  "toolCalls": [
    { "tool": "qdrant_search", "args": {...} },
    { "tool": "read_file", "args": {...} }
  ],
  "patch": "...",
  "diffStats": { "linesChanged": 1, "filesChanged": 1 },
  "errorDelta": 3,
  "success": true
}
```

**Tags:** `ace`, `llm-output`, `successful-fix`, `ts1005`

**Purpose:** Retrieve proven fixes for similar errors (self-improving system)

**Ingest:**
```bash
# After successful Phase86 run
node scripts/phase76-kb-update.mjs --kind ace_llm_outputs --run-id 00041
```

---

## 🔍 Hybrid Retrieval Strategy

**Query Flow:**
```javascript
// 1. Embed query
const queryVector = await embed(`${error.code}: ${error.message}\n${codeContext}`);

// 2. Qdrant semantic search (40% weight)
const qdrantResults = await qdrant.search({
  collection: 'phase76_knowledge_base',
  vector: queryVector,
  limit: 8,
  scoreThreshold: 0.7
});

// 3. pgvector HNSW search (30% weight)
const pgvectorResults = await postgres.query(`
  SELECT *, 1 - (embedding <=> $1) as similarity
  FROM error_embeddings
  WHERE 1 - (embedding <=> $1) > 0.75
  ORDER BY similarity DESC
  LIMIT 10
`, [queryVector]);

// 4. KAG expansion (30% weight)
const graphResults = await postgres.query(`
  SELECT * FROM knowledge_graph
  WHERE source_id = $1 OR target_id = $1
  ORDER BY pattern_confidence DESC
`, [errorId]);

// 5. Merge + Rerank
const confidence = (
  (qdrantResults[0]?.score || 0) * 0.4 +
  (pgvectorResults[0]?.similarity || 0) * 0.3 +
  (graphResults[0]?.pattern_confidence || 0) * 0.3
);

// 6. Filter by confidence
if (confidence < 0.85) {
  skip(); // Don't apply low-confidence fixes
}
```

---

## 🛡️ Budget Constraints (Phase 86 Safety Rails)

```javascript
const BUDGET = {
  maxFilesPerIteration: 1,         // Only 1 file per cycle
  maxLinesPerPatch: 30,            // Prefer surgical fixes
  stopIfWorsens: true,             // Rollback if TSC errors increase
  maxIterations: 100,              // Stop after 100 cycles
  maxConsecutiveFailures: 5,       // Stop if 5 fixes fail in a row
  minConfidenceThreshold: 0.85,    // Only high-confidence fixes
  requireHumanApprovalAbove: 50    // Ask if patch > 50 lines
};
```

---

## 🚀 Deployment Checklist

### Prerequisites
- [x] FastMCP server running (port 3002)
- [x] Qdrant running (port 6333)
- [ ] Postgres running (port 5434)
- [x] Operator docs ingested
- [x] ACE prompt templates ingested
- [ ] Embeddings scaled (100 → 10,000)
- [x] knowledge_graph patterns fixed

### Commands
```bash
# 1. Start services
docker start phase66-postgres qdrant

# 2. Start FastMCP
node scripts/fastmcp-server.mjs

# 3. Ingest KB content
node scripts/phase76-kb-update.mjs \
  --paths NEXT_STEPS_LOG.md MCP_SESSION_SUMMARY.md MCP_IMPLEMENTATION_SUMMARY.md \
  --tags phase76 ace mcp \
  --kind kb_doc

node scripts/phase76-kb-update.mjs --kind ace_prompt_templates
node scripts/phase76-kb-update.mjs --fix-graph-patterns

# 4. Scale embeddings
node scripts/phase87-ingest-error-corpus.mjs --limit 10000 --codes TS1005,TS1128,TS1109

# 5. Run Phase 86 autonomous loop
node scripts/phase86-autonomous-loop.mjs

# 6. After successful runs, ingest LLM outputs
node scripts/phase76-kb-update.mjs --kind ace_llm_outputs
```

---

## 📈 Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Embedded Errors | 100 | 10,000 | 🔴 1% |
| Qdrant Collections | 15 | 15 | ✅ 100% |
| Vector Count | 55,561 | 65,000 | ✅ 85% |
| Graph Patterns Fixed | 10 | 1,000 | 🔴 1% |
| ACE Prompts | 0 | 5 | ✅ 2/5 |
| Successful Fixes | 0 | 100 | 🔴 0% |

---

## 🔗 Graph Relationships

```
ERROR_1 --[CAUSES]--> ERROR_2
ERROR_1 --[FIXED_BY]--> PATCH_1
ERROR_1 --[SIMILAR_PATTERN]--> ERROR_3
ERROR_1 --[SAME_FILE]--> ERROR_4
ERROR_1 --[MENTIONS]--> DOC_1
PROMPT_1 --[PRODUCED]--> OUTPUT_1
OUTPUT_1 --[FIXED]--> ERROR_1
DOC_1 --[DESCRIBES]--> PATTERN_1
```

---

## 🧪 Testing

**Full Stack Test:**
```bash
.\scripts\phase76-87-full-deployment.ps1
```

**Quick Validation:**
```bash
.\scripts\test-phase86-stack.ps1
```

**Manual Tests:**
```bash
# Health check
Invoke-RestMethod -Uri "http://127.0.0.1:3002/health"

# Search KB
$body = @{
  name = "qdrant_search"
  arguments = @{
    collection = "phase76_knowledge_base"
    query = "ACE contextual engineering prompting"
    topK = 5
  }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:3002/function-call" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

---

## 📚 References

**Documentation:**
- `PHASE86_ENHANCEMENT_ROADMAP.md` - Phase 86 upgrade plan
- `FASTMCP-STATUS-REPORT.md` - Current status + next steps
- `PHASE76-87-RAG-KAG-ARCHITECTURE.md` - Complete architecture
- `CRAWLER_MANIFEST.md` - Knowledge base sources

**Key Scripts:**
- `scripts/phase76-kb-update.mjs` - KB ingestion
- `scripts/phase86-autonomous-loop.mjs` - Main loop
- `scripts/phase87-autonomous-fixer.mjs` - Advanced fixer
- `scripts/fastmcp-server.mjs` - Unified tool server

**Services:**
- Qdrant: http://localhost:6333
- Postgres: 127.0.0.1:5434
- FastMCP: http://localhost:3002
- MinIO: http://localhost:9000
- CouchDB: http://localhost:5984

---

**Last Updated:** December 27, 2025
**Phase:** 76-87 Integration Complete
**Status:** Ready for autonomous deployment (pending embedding scale-up)
