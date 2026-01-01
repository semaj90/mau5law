# Source Validation RAG Implementation Status

**Phase**: Agentic RAG with Human-in-the-Loop Source Validation
**Pattern**: CopilotKit + Pydantic AI
**Started**: January 1, 2025
**Status**: Phase 1 Backend Complete ✅

---

## ✅ COMPLETED (This Session)

### Infrastructure Setup

**CouchDB Graph Analysis** (Task 2.1)
- ✅ 3 databases created: `codebase_graph`, `llm_summaries`, `error_clusters`
- ✅ MapReduce views:
  - `_design/topology`: by_error_count, by_import_count, dependency_graph
  - `_design/summaries`: by_file, by_provider
  - `_design/clusters`: by_size, by_label
- ✅ 4,720 files indexed (208 Python, 4,512 TypeScript/Svelte)
- ✅ Fixed CouchDB 3.3 compatibility (removed temporary views)

**PostgreSQL Schema** (Task 1.2)
- ✅ `case_source_validations` - Human approval/rejection tracking
- ✅ `kb_answer_citations` - LLM answers with full provenance
- ✅ `kb_provenance_graph` - Knowledge graph edges (entities + relationships)
- ✅ `auto_approval_rules` - Rules for auto-approving high-confidence sources
- ✅ Views: `validation_stats`, `citation_usage`
- ✅ Indexes: GIN indexes on JSONB, full-text search on answers/queries

**Backend API Endpoints** (Task 1.1)
- ✅ `/api/kb/search` - Extended search with confidence scores, snippet preview, source_type
- ✅ `/api/kb/validate-sources` - Store human validation in PostgreSQL
- ✅ `/api/kb/generate-answer` - LLM generation with validated sources + citations
- ✅ `/api/kb/update-kag` - Persist knowledge graph edges
- ✅ `/api/kb/health` - System health check

---

## 📋 WORKFLOW IMPLEMENTED

### 1. Knowledge Base Search
```http
POST /api/kb/search
{
  "query": "How do I use Svelte 5 runes?",
  "top_k": 20,
  "include_codebase": true
}
```

**Returns**:
- Top 20 candidates from Qdrant + CouchDB
- `snippet_preview` (first 200 chars)
- `confidence_score` (Qdrant similarity or 0.7 for exact code matches)
- `source_type` (documentation/code/error_fix/community)

### 2. Human Validation
```http
POST /api/kb/validate-sources
{
  "case_id": "case_001",
  "query": "How do I use Svelte 5 runes?",
  "selected_chunk_ids": ["chunk_1", "chunk_2", "chunk_3"],
  "rejected_chunk_ids": ["chunk_4"],
  "validation_notes": "Approved official Svelte docs"
}
```

**Returns**:
- `validation_id` (for answer generation)
- `approved_chunks` (full metadata)
- `timestamp` (audit trail)

### 3. Answer Generation with Citations
```http
POST /api/kb/generate-answer
{
  "validation_id": "val_case_001_1735776000",
  "case_id": "case_001",
  "query": "How do I use Svelte 5 runes?",
  "llm_provider": "gemma3-legal",
  "max_tokens": 2000
}
```

**Returns**:
- `answer` (LLM-generated with [Source N] citations)
- `citations` (array with chunk_id, source_file, snippet, used_in_answer, confidence)
- `validation_id` (links back to validated sources)

### 4. Knowledge Graph Update
```http
POST /api/kb/update-kag
{
  "validation_id": "val_case_001_1735776000",
  "entities_extracted": ["Svelte 5", "$state", "$derived", "$effect"],
  "relationships": [
    {"from": "Svelte 5", "to": "$state", "type": "HAS_FEATURE"},
    {"from": "$derived", "to": "$state", "type": "DEPENDS_ON"}
  ]
}
```

**Stores**: Graph edges in `kb_provenance_graph` table

---

## 🧪 TESTING INSTRUCTIONS

### 1. Verify Infrastructure

```powershell
# Check CouchDB health
docker exec phase66-couchdb curl -s http://admin:password@localhost:5984/_up

# View indexed files
curl http://admin:password@localhost:5984/_utils/#database/codebase_graph/_all_docs

# Check PostgreSQL tables
docker exec phase66-postgres psql -U user -d legal -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%source%' OR table_name LIKE '%citation%' OR table_name LIKE '%provenance%';"

# Test Qdrant collection
curl http://localhost:6333/collections/phase92_kb_chunks
```

### 2. Test API Endpoints

**Prerequisites**:
- Backend server running on port 8000
- Qdrant collection `phase92_kb_chunks` exists (from Phase 92)
- CouchDB running with indexed files

**Example Test Flow**:
```powershell
# Step 1: Search knowledge base
curl -X POST http://localhost:8000/api/kb/search `
  -H "Content-Type: application/json" `
  -d '{"query": "Svelte 5 state management", "top_k": 10, "include_codebase": true}'

# Step 2: Validate sources (use chunk_ids from Step 1)
curl -X POST http://localhost:8000/api/kb/validate-sources `
  -H "Content-Type: application/json" `
  -d '{"case_id": "test_001", "query": "Svelte 5 state management", "selected_chunk_ids": ["chunk_1", "chunk_2"]}'

# Step 3: Generate answer (use validation_id from Step 2)
curl -X POST http://localhost:8000/api/kb/generate-answer `
  -H "Content-Type: application/json" `
  -d '{"validation_id": "val_test_001_1735776000", "case_id": "test_001", "query": "Svelte 5 state management", "llm_provider": "gemma3-legal"}'

# Step 4: Update knowledge graph
curl -X POST http://localhost:8000/api/kb/update-kag `
  -H "Content-Type: application/json" `
  -d '{"validation_id": "val_test_001_1735776000", "entities_extracted": ["Svelte 5", "$state"], "relationships": [{"from": "Svelte 5", "to": "$state", "type": "HAS_FEATURE"}]}'
```

### 3. Verify Data Persistence

```sql
-- Check validations
SELECT * FROM case_source_validations ORDER BY created_at DESC LIMIT 5;

-- Check generated answers
SELECT validation_id, case_id, LEFT(answer_text, 100) as answer_preview, llm_provider
FROM kb_answer_citations ORDER BY created_at DESC LIMIT 5;

-- Check knowledge graph
SELECT validation_id, entities, relationships
FROM kb_provenance_graph ORDER BY created_at DESC LIMIT 5;

-- View auto-approval rules
SELECT * FROM auto_approval_rules;
```

---

## ⏳ PENDING TASKS

### Phase 1: Frontend UI (Week 1)

**Task 1.3: Svelte Components**
- [ ] `SourceValidator.svelte` - Enhanced with approval/rejection buttons
- [ ] `AnswerGenerator.svelte` - LLM answer display with citations
- [ ] `CitationInspector.svelte` - Click citation to view full source
- [ ] `ProvenanceGraph.svelte` - Visualize knowledge graph with D3.js

**Task 1.4: TypeScript Types**
- [ ] `src/lib/types/source-validation.ts` - Type definitions
- [ ] Pydantic models in `backend/models/source_validation.py`

### Phase 2: CouchDB Features (Week 2)

**Task 2.3: LLM Summary Generator**
- [ ] Script: `backend/scripts/generate_summaries.py`
- [ ] Generate gemma3-legal summaries of top error files
- [ ] Store in `llm_summaries` database
- [ ] Cache for 7 days

**Task 2.4: MapReduce Analytics**
- [ ] Most imported files (dependency analysis)
- [ ] Dependency depth calculation
- [ ] Error propagation chains

**Task 2.5: Phase 89 GPU Clustering Integration**
- [ ] Store GPU error clusters in CouchDB
- [ ] Link error clusters to file nodes
- [ ] Visualize cluster → file → dependency graph

### Phase 3: Agentic Error Fixing (Week 3)

**Task 3.1: Error Fixing with Source Validation**
- [ ] `/api/kb/fix-error-with-validation` endpoint
- [ ] Human approves docs before LLM generates fix
- [ ] Store fix provenance in `kb_answer_citations`

**Task 3.2: Auto-Approval Engine**
- [ ] Implement rules from `auto_approval_rules` table
- [ ] Auto-approve if confidence >0.95 + official source
- [ ] Auto-approve if previously validated >3 times
- [ ] Fallback to human validation

### Phase 4: Dashboard & Monitoring (Week 4)

**Task 4.1: Grafana Panels**
- [ ] Validations over time (approval vs rejection rate)
- [ ] Auto-approval rate by rule type
- [ ] Most cited sources (citation_usage view)
- [ ] LLM provider performance

**Task 4.2: Codebase Health Dashboard**
- [ ] Error hotspots visualization (CouchDB by_error_count)
- [ ] Dependency graph (D3.js force-directed graph)
- [ ] LLM summary coverage (% of files with summaries)

---

## 🛠️ TECHNICAL STACK

**Database Layer**:
- PostgreSQL Phase 66 - Relational data (validations, citations, graph edges)
- Qdrant - Vector search (document chunks, embeddings)
- CouchDB 3.3 - Document store (file graph, LLM summaries, error clusters)
- Redis Phase 66 - Caching layer

**Backend**:
- FastAPI - REST API endpoints
- Pydantic - Data validation
- SQLAlchemy - ORM for PostgreSQL
- LLMRouter - Multi-provider LLM abstraction (gemma3-legal, Claude, GPT-4, Gemini)

**Frontend** (Pending):
- SvelteKit - Server-side rendering
- Svelte 5 - Reactive components with runes
- D3.js - Graph visualization
- TailwindCSS - Styling

**ML Pipeline**:
- Ollama (embeddinggemma:latest) - Embeddings
- Qdrant - Vector storage
- CouchDB MapReduce - Graph analytics

---

## 📊 METRICS & ANALYTICS

**Validation Statistics** (SQL View):
```sql
SELECT * FROM validation_stats;
-- Shows: date, total_validations, avg_approved_per_validation, avg_rejected_per_validation
```

**Citation Usage** (SQL View):
```sql
SELECT * FROM citation_usage ORDER BY times_cited DESC LIMIT 10;
-- Shows: Most frequently cited sources with confidence scores
```

**CouchDB Analytics**:
```javascript
// Error hotspots
http://localhost:5984/codebase_graph/_design/topology/_view/by_error_count?descending=true&limit=10

// Most imported files
http://localhost:5984/codebase_graph/_design/topology/_view/by_import_count?descending=true&limit=10

// Dependency graph for file
http://localhost:5984/codebase_graph/_design/topology/_view/dependency_graph?key="src/lib/stores/barrel.svelte.ts"
```

---

## 🚀 NEXT STEPS

**Immediate** (Today):
1. ✅ Fix CouchDB query methods (DONE - using design doc views)
2. ✅ Create PostgreSQL migration (DONE - 4 tables + views + indexes)
3. ✅ Implement backend API endpoints (DONE - 4 endpoints)
4. [ ] Test API endpoints with Postman/curl
5. [ ] Create Svelte UI components (Task 1.3)

**Week 1** (January 1-7):
- [ ] Task 1.3: Svelte components (SourceValidator, AnswerGenerator, CitationInspector, ProvenanceGraph)
- [ ] Task 1.4: TypeScript type definitions
- [ ] Integration testing (end-to-end workflow)

**Week 2** (January 8-14):
- [ ] Task 2.3: LLM summary generator
- [ ] Task 2.4: CouchDB MapReduce analytics
- [ ] Task 2.5: Phase 89 GPU clustering integration

**Week 3** (January 15-21):
- [ ] Task 3.1: Agentic error fixing with validation
- [ ] Task 3.2: Auto-approval engine

**Week 4** (January 22-28):
- [ ] Task 4.1: Grafana dashboards
- [ ] Task 4.2: Codebase health UI
- [ ] Documentation + demo video

---

## 🎯 SUCCESS CRITERIA

**Week 1 Goals**:
- [ ] 100% source traceability (every answer links to validated sources)
- [ ] <10s validation UX (search → validate → answer)
- [ ] Full audit trail in PostgreSQL

**Week 2 Goals**:
- [ ] LLM summaries for top 100 error files
- [ ] Dependency graph visualization working

**Week 3 Goals**:
- [ ] >70% auto-approval rate for high-confidence sources
- [ ] Error fixing with human-validated docs

**Week 4 Goals**:
- [ ] Grafana dashboard live
- [ ] Full documentation published
- [ ] Demo video recorded

---

## 📚 REFERENCES

**Documentation**:
- `TASKS_SOURCE_VALIDATION_COUCHDB.md` - Complete task breakdown
- `AGENTIC_RAG_ARCHITECTURE.md` - System architecture (66KB)
- YouTube: "Build a RAG AI Agent with REAL-TIME Source Validation (CopilotKit + Pydantic AI)"

**Code Files**:
- `backend/api/source_validation_api.py` - REST API (4 endpoints)
- `backend/services/couchdb_client.py` - CouchDB client (file graph, summaries, clusters)
- `backend/migrations/20250101_source_validation_schema.sql` - PostgreSQL schema
- `backend/scripts/setup_couchdb.py` - CouchDB initialization
- `backend/scripts/index_codebase.py` - Codebase indexer (4,720 files)

**Database Schemas**:
- PostgreSQL: `case_source_validations`, `kb_answer_citations`, `kb_provenance_graph`, `auto_approval_rules`
- CouchDB: `codebase_graph` (4,721 docs), `llm_summaries` (1 doc), `error_clusters` (1 doc)
- Qdrant: `phase92_kb_chunks` (document embeddings)

---

**Last Updated**: January 1, 2025
**Status**: Phase 1 Backend Complete ✅ | Frontend UI Pending 🔄
