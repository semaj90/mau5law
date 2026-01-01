# ACE Phase 10: Real-Time Source Validation + Universal AST RAG/KAG/DAG

## Overview
Complete agentic error fixing with human-in-the-loop source validation,
universal AST analysis, and instruction tuning from LLM thinking logs.

---

## 🎯 Task 10.1: Source Validation Pipeline (CopilotKit + PydanticAI Pattern)

### 10.1.1 Retrieve Candidates (RAG)
- [ ] **API endpoint**: `POST /api/kb/search`
  - Embed query using `embeddinggemma:latest`
  - Qdrant topK (limit: 20)
  - Optional BM25 rerank via Postgres tsvector
  - Return: `{ chunks: Chunk[], query_id: string, timestamp: string }`

### 10.1.2 Validate Sources (Human-in-the-Loop)
- [ ] **UI Component**: `SourceValidationPanel.svelte`
  - Display retrieved chunks with:
    - Checkbox for selection
    - Title + URL + section
    - Snippet preview (highlighted match)
    - Confidence score badge
    - "Open source" link
  - User selects 3-10 sources
  - "Approve Sources" button

### 10.1.3 Persist Validation (KAG + Case Canvas)
- [ ] **Postgres table**: `validated_sources`
  ```sql
  CREATE TABLE validated_sources (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    query TEXT,
    selected_chunk_ids TEXT[],
    selected_urls TEXT[],
    user_id UUID,
    validated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Pin to Evidence Canvas (case-specific state)

### 10.1.4 Generate Answer (LLM)
- [ ] **API endpoint**: `POST /api/kb/answer`
  - Input: `{ query: string, approved_chunk_ids: string[] }`
  - Use only approved chunks as context
  - Call `gemma3-legal:latest`
  - Return: `{ answer: string, citations: Citation[], todos: string[] }`

### 10.1.5 Update KAG
- [ ] Run LangExtract over approved snippets + answer
- [ ] Store entities/relations with `claims_based_on -> source_chunk_id` edges
- [ ] Log to CouchDB for map-reduce analysis

---

## 🎯 Task 10.2: CouchDB Graph Analysis Integration

### 10.2.1 Verify CouchDB Connection
- [x] CouchDB running at `localhost:5984` (phase66-couchdb)
- [ ] Create databases:
  - `ace_graphs`: AST trees, DAG structures
  - `ace_llm_logs`: LLM thinking/reasoning traces
  - `ace_summaries`: Cluster summaries, tag definitions

### 10.2.2 CouchDB Map-Reduce Views
- [ ] View: `errors_by_file` - Count errors per file
- [ ] View: `entities_by_type` - Group LangExtract entities
- [ ] View: `relations_graph` - Build relation adjacency
- [ ] View: `llm_traces_by_pattern` - Pattern match success rate

### 10.2.3 Graph Export Pipeline
- [ ] Export AST nodes to CouchDB documents
- [ ] Export Qdrant clusters as CouchDB docs
- [ ] Build cross-reference edges

---

## 🎯 Task 10.3: Universal AST for Codebase Analysis

### 10.3.1 AST Parser Integration
- [ ] **TypeScript AST**: Use `ts-morph` or `@typescript-eslint/parser`
- [ ] **Svelte AST**: Use `svelte-parse`
- [ ] **Python AST**: Use `ast` module via Phase72 Python

### 10.3.2 Universal AST Schema
```json
{
  "id": "ast_<hash>",
  "file_path": "src/lib/components/Foo.svelte",
  "language": "svelte",
  "root": {
    "type": "Program",
    "children": [
      { "type": "Script", "lang": "ts", "children": [...] },
      { "type": "Template", "children": [...] },
      { "type": "Style", "scoped": true, "children": [...] }
    ]
  },
  "imports": ["svelte", "$lib/stores"],
  "exports": ["Foo"],
  "dependencies": ["Button", "Modal"],
  "errors": [{ "line": 42, "code": "TS2304", "message": "..." }]
}
```

### 10.3.3 AST → Qdrant Indexing
- [ ] Chunk AST nodes (functions, classes, components)
- [ ] Embed node signatures + docstrings
- [ ] Store in Qdrant collection: `ace_ast_nodes`

### 10.3.4 AST → CouchDB Trees
- [ ] Store full AST trees for map-reduce
- [ ] Build file dependency graph
- [ ] Track import/export relationships

---

## 🎯 Task 10.4: Comprehensive Qdrant Tag Summarization

### 10.4.1 Cluster All Components
- [ ] **Collection**: `ace_errors` → cluster by error pattern
- [ ] **Collection**: `ace_ast_nodes` → cluster by component type
- [ ] **Collection**: `ace_docs` → cluster by topic

### 10.4.2 LLM Summarize Clusters
- [ ] For each cluster (>5 members):
  - Sample 10 representative points
  - Call `gemma3-legal:latest` for summary
  - Generate 3-5 semantic tags
  - Store summary + tags in Qdrant payload

### 10.4.3 Build Tag Hierarchy
- [ ] Group tags into categories
- [ ] Create tag taxonomy in CouchDB
- [ ] Enable tag-based filtering in UI

---

## 🎯 Task 10.5: LLM Thinking Logs for Instruction Tuning

### 10.5.1 Structured Log Schema
```json
{
  "log_id": "llm_<uuid>",
  "timestamp": "2025-01-01T00:00:00Z",
  "model": "gemma3-legal:latest",
  "task_type": "error_fix|code_gen|summary|extraction",
  "input": {
    "prompt": "...",
    "context_chunks": ["chunk_1", "chunk_2"],
    "metadata": {}
  },
  "output": {
    "response": "...",
    "tokens_in": 1024,
    "tokens_out": 512,
    "latency_ms": 2500
  },
  "evaluation": {
    "success": true,
    "errors_fixed": 5,
    "human_feedback": null,
    "ace_score": 0.85
  }
}
```

### 10.5.2 Log Storage Strategy
- [ ] Real-time: Redis (last 1000 logs, 1hr TTL)
- [ ] Persistent: CouchDB (full logs, 30-day retention)
- [ ] Indexed: Qdrant (embed prompt+response for similar retrieval)

### 10.5.3 Instruction Tuning Pipeline
- [ ] Filter logs with `success: true && ace_score > 0.8`
- [ ] Format as JSONL for fine-tuning
- [ ] Export winning patterns:
  ```
  {"instruction": "Fix TS2304 error...", "input": "...", "output": "..."}
  ```

---

## 🎯 Task 10.6: Agentic ACE Contextual Engineering

### 10.6.1 DAG Orchestration
- [ ] Define ACE DAG nodes:
  1. `scan_repo` → ripgrep patterns
  2. `chunk_embed` → document embedding
  3. `cluster_tag` → CUDA clustering
  4. `kb_search` → semantic retrieval
  5. `validate_sources` → human gate
  6. `generate_answer` → LLM synthesis
  7. `langextract` → entity extraction
  8. `update_kag` → graph update
  9. `log_thinking` → instruction tuning

### 10.6.2 ACE Error Safeguard Loop
```
detect_errors → cluster → select_cluster → retrieve_context
     ↓                                          ↓
  log_pattern                            validate_sources
     ↓                                          ↓
  store_kag ←─── update_graph ←─── generate_fix
     ↓                                          ↓
  apply_fix → test_fix → {success: commit, fail: retry}
```

### 10.6.3 Feature Guard
- [ ] Before merging new features:
  - Run full error scan
  - Compare to baseline
  - Block if error count increases
  - Log reasoning for review

---

## 📊 Implementation Priority

| Priority | Task | Est. Time | Dependencies |
|----------|------|-----------|--------------|
| 🔴 P0 | 10.2.1 CouchDB connection | 30min | Docker running |
| 🔴 P0 | 10.5.1 LLM log schema | 1hr | None |
| 🟠 P1 | 10.1.1 kb/search API | 2hr | Qdrant |
| 🟠 P1 | 10.3.2 Universal AST schema | 2hr | None |
| 🟡 P2 | 10.4.2 Cluster summarization | 3hr | CUDA clustering |
| 🟡 P2 | 10.1.2 SourceValidationPanel | 3hr | kb/search |
| 🟢 P3 | 10.5.3 Instruction tuning | 4hr | LLM logs |
| 🟢 P3 | 10.6.3 Feature guard | 2hr | ACE loop |

---

## 🔧 Quick Start Commands

```bash
# Verify CouchDB
curl http://localhost:5984/_all_dbs

# Create databases
curl -X PUT http://admin:password@localhost:5984/ace_graphs
curl -X PUT http://admin:password@localhost:5984/ace_llm_logs
curl -X PUT http://admin:password@localhost:5984/ace_summaries

# Test Qdrant
curl http://localhost:6333/collections

# Run Phase94 synthesis loop
python scripts/phase94-ace-synthesis-loop.py --status
```

---

## 📁 New Files to Create

```
src/lib/schemas/
  source-validation.schema.json
  llm-log.schema.json
  universal-ast.schema.json

src/lib/server/tools/handlers/
  validateSources.ts
  generateAnswer.ts
  logThinking.ts

src/lib/services/
  couchdb-client.ts
  ast-parser.ts
  llm-logger.ts

src/routes/api/
  kb/answer/+server.ts
  kb/validate/+server.ts
  ace/logs/+server.ts

scripts/
  phase10-couchdb-setup.py
  phase10-ast-indexer.py
  phase10-instruction-export.py
```
