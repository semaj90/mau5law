# Real-Time Source Validation RAG + CouchDB Graph Analysis
## Implementation Task List

> **Reference**: [Build a RAG AI Agent with REAL-TIME Source Validation](https://www.youtube.com/watch?v=Be2OQ3LQZcQ)
> **Integration**: CopilotKit + Pydantic AI patterns for Legal-AI ACE stack
> **Status**: Ready for Implementation
> **Date**: December 31, 2025

---

## 🎯 Overview

Implement human-in-the-loop source validation RAG with CouchDB graph analysis for:
1. **Legal Document RAG**: User validates sources before LLM answer generation
2. **Error Fixing RAG**: Developer validates docs before applying code patches
3. **Knowledge Graph Analysis**: CouchDB MapReduce for codebase indexing + LLM summaries

---

## 📋 Task List

### Phase 1: Core RAG Source Validation (Week 1)

#### Task 1.1: Backend API Endpoints ✅ (Partially Complete)
**Status**: Foundation exists in `backend/api/rag_source_validation_api.py`

**Subtasks**:
- [ ] 1.1.1 - Extend `/api/kb/search` endpoint with metadata enhancement
  - Add `snippet_preview` (first 200 chars)
  - Add `confidence_score` from Qdrant payload
  - Add `source_type` classification (legal_doc, code, documentation)
  - Return top-20 candidates (not just top-5)

- [ ] 1.1.2 - Create `/api/kb/validate-sources` endpoint (NEW)
  - Input: `{ case_id, query, selected_chunk_ids[] }`
  - Store validation in PostgreSQL `case_source_validations` table
  - Return: `{ validation_id, approved_chunks[], timestamp }`

- [ ] 1.1.3 - Create `/api/kb/generate-answer` endpoint (NEW)
  - Input: `{ validation_id, temperature, max_tokens }`
  - Fetch approved chunks from validation record
  - Call LLM (gemma3-legal:latest) with approved context only
  - Return: `{ answer, citations[], next_actions[], confidence }`

- [ ] 1.1.4 - Create `/api/kb/update-kag` endpoint (NEW)
  - Input: `{ validation_id, answer, citations[] }`
  - Run LangExtract on approved snippets + answer
  - Store entities/relations in PostgreSQL
  - Create edges: `claims_based_on -> source_chunk_id`
  - Return: `{ entities_created, relations_created, graph_updated }`

**Files to Edit**:
- `backend/api/rag_source_validation_api.py`
- `backend/services/qdrant_service.py` (add metadata extraction)
- `backend/services/llm_service.py` (add citation tracking)

---

#### Task 1.2: PostgreSQL Schema Extensions
**Status**: New tables needed

**Subtasks**:
- [ ] 1.2.1 - Create `case_source_validations` table
  ```sql
  CREATE TABLE case_source_validations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id UUID REFERENCES cases(id),
      query TEXT NOT NULL,
      selected_chunk_ids TEXT[] NOT NULL,
      selected_urls TEXT[],
      chunk_metadata JSONB,
      validated_at TIMESTAMPTZ DEFAULT NOW(),
      validated_by UUID REFERENCES users(id),
      validation_method TEXT DEFAULT 'human',  -- 'human', 'auto-approved', 'hybrid'
      confidence_threshold FLOAT
  );
  ```

- [ ] 1.2.2 - Create `kb_answer_citations` table
  ```sql
  CREATE TABLE kb_answer_citations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      validation_id UUID REFERENCES case_source_validations(id),
      answer TEXT NOT NULL,
      citations JSONB NOT NULL,  -- [{ chunk_id, url, title, relevance_score }]
      next_actions JSONB,  -- [{ type, description, priority }]
      llm_provider TEXT,
      llm_model TEXT,
      temperature FLOAT,
      tokens_used INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] 1.2.3 - Create `kb_provenance_graph` table (for KAG)
  ```sql
  CREATE TABLE kb_provenance_graph (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id TEXT NOT NULL,
      entity_type TEXT,  -- 'claim', 'fact', 'argument'
      source_chunk_id TEXT,
      source_url TEXT,
      relation_type TEXT,  -- 'based_on', 'contradicts', 'supports'
      confidence FLOAT,
      extracted_at TIMESTAMPTZ DEFAULT NOW(),
      validation_id UUID REFERENCES case_source_validations(id)
  );
  ```

**Migration Script**:
- [ ] 1.2.4 - Create Drizzle migration: `migrations/xxxx_source_validation_tables.sql`

**Files to Create**:
- `backend/migrations/20251231_source_validation_schema.sql`

---

#### Task 1.3: Frontend UI Components (Svelte 5)
**Status**: `SourceValidator.svelte` exists, needs enhancement

**Subtasks**:
- [ ] 1.3.1 - Enhance `SourceValidator.svelte`
  - Add "confidence meter" for each chunk (visual bar)
  - Add "open in new tab" button for source URLs
  - Add "Select All" / "Deselect All" buttons
  - Add search/filter within retrieved chunks
  - Add "Why was this retrieved?" explanation (show BM25 + semantic scores)

- [ ] 1.3.2 - Create `AnswerGenerator.svelte` (NEW)
  - Input: approved chunk IDs from SourceValidator
  - Display: "Generating answer from X approved sources..."
  - Show: streaming answer with inline citations [1], [2]
  - Show: "Next Actions" TODOs extracted from answer
  - Export: "Add to case canvas" button

- [ ] 1.3.3 - Create `CitationInspector.svelte` (NEW)
  - Click on citation [1] → show full chunk text in modal
  - Show: confidence score, source URL, timestamp
  - Button: "Remove this citation" (regenerate answer without it)

- [ ] 1.3.4 - Create `ProvenanceGraph.svelte` (NEW)
  - Visualize: Claims → Sources graph (D3.js or Cytoscape.js)
  - Show: "This argument is based on these 3 sources"
  - Interactive: Click node → show full text

**Files to Create/Edit**:
- `sveltekit-frontend/src/lib/components/rag/SourceValidator.svelte` (enhance)
- `sveltekit-frontend/src/lib/components/rag/AnswerGenerator.svelte` (new)
- `sveltekit-frontend/src/lib/components/rag/CitationInspector.svelte` (new)
- `sveltekit-frontend/src/lib/components/rag/ProvenanceGraph.svelte` (new)

---

#### Task 1.4: TypeScript Type Definitions
**Status**: Partial types exist

**Subtasks**:
- [ ] 1.4.1 - Extend `$lib/types/rag-source-validation.ts`
  ```typescript
  export interface RetrieveCandidatesResponse {
      query: string;
      total_results: number;
      chunks: RetrievedChunk[];
      retrieval_time_ms: number;
      bm25_weight: number;
      semantic_weight: number;
  }

  export interface ValidateSourcesRequest {
      case_id: string;
      query: string;
      selected_chunk_ids: string[];
      validation_method: 'human' | 'auto-approved' | 'hybrid';
      confidence_threshold?: number;
  }

  export interface AnswerRequest {
      validation_id: string;
      temperature?: number;
      max_tokens?: number;
      citation_style?: 'inline' | 'footnote' | 'bibliography';
  }

  export interface AnswerResponse {
      answer: string;
      citations: Citation[];
      next_actions: NextAction[];
      confidence: number;
      llm_provider: string;
      tokens_used: number;
  }

  export interface Citation {
      chunk_id: string;
      url: string;
      title: string;
      relevance_score: number;
      position_in_answer: number;  // Character offset
      citation_number: number;  // [1], [2], etc.
  }

  export interface NextAction {
      type: 'research' | 'draft' | 'review' | 'file';
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimated_time?: string;
  }
  ```

- [ ] 1.4.2 - Generate Pydantic models (auto-sync)
  - Use existing `generate-types.mts` script
  - Add Pydantic export to `backend/models/rag_types.py`

**Files to Create/Edit**:
- `sveltekit-frontend/src/lib/types/rag-source-validation.ts` (extend)
- `backend/models/rag_types.py` (new)

---

### Phase 2: CouchDB Graph Analysis (Week 2)

#### Task 2.1: Start Existing CouchDB Container
**Status**: Container defined in `docker-compose.phase89.yml`

**Subtasks**:
- [ ] 2.1.1 - Start CouchDB container (NO REBUILD)
  ```bash
  docker start phase89-couchdb
  # OR if not created:
  docker-compose -f docker-compose.phase89.yml up -d couchdb
  ```

- [ ] 2.1.2 - Verify CouchDB health
  ```bash
  curl http://admin:password@localhost:5984/_up
  # Expected: {"status":"ok"}
  ```

- [ ] 2.1.3 - Create databases via Fauxton UI
  - Navigate: http://localhost:5984/_utils
  - Create: `codebase_graph` (for AST topology)
  - Create: `llm_summaries` (for AI-generated code summaries)
  - Create: `error_clusters` (for Phase 89 GPU clustering results)

**Commands**:
```bash
# One-liner database creation
curl -X PUT http://admin:password@localhost:5984/codebase_graph
curl -X PUT http://admin:password@localhost:5984/llm_summaries
curl -X PUT http://admin:password@localhost:5984/error_clusters
```

---

#### Task 2.2: Codebase Indexing Service
**Status**: New service needed

**Subtasks**:
- [ ] 2.2.1 - Create `backend/services/codebase_indexer.py`
  - Scan: `src/`, `sveltekit-frontend/src/` directories
  - Extract: file path, imports, exports, classes, functions
  - Generate: dependency graph (A imports B)
  - Store: CouchDB `codebase_graph` as documents

- [ ] 2.2.2 - Create CouchDB views for graph queries
  ```javascript
  // Design document: _design/topology
  // View: by_file
  function(doc) {
      if (doc.type === 'file') {
          emit(doc.path, doc);
      }
  }

  // View: by_imports
  function(doc) {
      if (doc.imports) {
          doc.imports.forEach(function(imp) {
              emit(imp, doc.path);
          });
      }
  }

  // View: by_error_count
  function(doc) {
      if (doc.error_count) {
          emit(doc.error_count, doc);
      }
  }
  ```

- [ ] 2.2.3 - Integrate with existing `phase89-code-unit-indexer.mjs`
  - Add CouchDB upload step after Qdrant indexing
  - Store: routes, components, modules as CouchDB documents

**Files to Create**:
- `backend/services/codebase_indexer.py`
- `backend/services/couchdb_views.json` (view definitions)

---

#### Task 2.3: LLM Summary Generator
**Status**: New service needed

**Subtasks**:
- [ ] 2.3.1 - Create `backend/services/llm_summary_service.py`
  - Input: File path, code content
  - LLM: gemma3-legal:latest or Gemini 2.0 Flash
  - Prompt: "Summarize this code file in 2-3 sentences. Include: purpose, key functions, dependencies."
  - Output: `{ file_path, summary, key_entities[], generated_at }`
  - Store: CouchDB `llm_summaries`

- [ ] 2.3.2 - Batch processing script
  - Process: Top 100 files by error count (from Phase 89)
  - Rate limit: 10 summaries/minute (avoid API throttling)
  - Progress: Store checkpoint in CouchDB `_local/summary_progress`

- [ ] 2.3.3 - Create API endpoint `/api/codebase/summary/:file_path`
  - Check: CouchDB cache first
  - Fallback: Generate on-demand if not cached
  - Return: `{ summary, cached, generated_at }`

**Files to Create**:
- `backend/services/llm_summary_service.py`
- `backend/scripts/generate_codebase_summaries.py`

---

#### Task 2.4: MapReduce Graph Analysis
**Status**: New CouchDB MapReduce views needed

**Subtasks**:
- [ ] 2.4.1 - Create view: Most imported files
  ```javascript
  // Map
  function(doc) {
      if (doc.imports) {
          doc.imports.forEach(function(imp) {
              emit(imp, 1);
          });
      }
  }

  // Reduce
  _sum
  ```

- [ ] 2.4.2 - Create view: Error hotspots
  ```javascript
  // Map
  function(doc) {
      if (doc.error_count && doc.error_count > 0) {
          emit(doc.path, {
              errors: doc.error_count,
              category: doc.file_type,
              last_modified: doc.modified_at
          });
      }
  }

  // Reduce
  function(keys, values, rereduce) {
      if (rereduce) {
          return {
              total_errors: sum(values.map(v => v.errors)),
              files: values.length
          };
      } else {
          return {
              total_errors: sum(values.map(v => v.errors)),
              files: values.length
          };
      }
  }
  ```

- [ ] 2.4.3 - Create view: Dependency depth analysis
  - Find: Files with most transitive dependencies
  - Use: For identifying refactoring candidates

**Files to Create**:
- `backend/couchdb/design_docs/topology.json`
- `backend/couchdb/design_docs/error_analysis.json`

---

#### Task 2.5: Integration with Phase 89 GPU Clustering
**Status**: Connect existing GPU pipeline to CouchDB

**Subtasks**:
- [ ] 2.5.1 - Modify `sveltekit-frontend/scripts/phase89-cuda-clustering.py`
  - Add: CouchDB client initialization
  - After clustering: Store cluster results in `error_clusters` database
  - Document format:
    ```json
    {
        "_id": "cluster_42",
        "type": "error_cluster",
        "cluster_id": 42,
        "centroid": [...],  // 768-dim vector
        "member_files": ["file1.ts", "file2.svelte"],
        "representative_errors": [...],
        "cluster_label": "TypeScript type errors",
        "created_at": "2025-12-31T..."
    }
    ```

- [ ] 2.5.2 - Create query API: `/api/errors/clusters/:cluster_id`
  - Fetch: Cluster from CouchDB
  - Return: Member files, representative errors, suggested fixes

- [ ] 2.5.3 - Visualize clusters in UI
  - Component: `ClusterExplorer.svelte`
  - Show: Cluster heatmap (D3.js force graph)
  - Interactive: Click cluster → show files → show errors

**Files to Edit**:
- `sveltekit-frontend/scripts/phase89-cuda-clustering.py`
- `backend/api/error_cluster_api.py` (new)

---

### Phase 3: Agentic Error Fixing with Source Validation (Week 3)

#### Task 3.1: Error Fixing RAG Pipeline
**Status**: Integrate source validation into agentic fixer

**Subtasks**:
- [ ] 3.1.1 - Modify `sveltekit-frontend/scripts/phase89-agentic-fixer.mjs`
  - Step 1: Parse error
  - Step 2: Retrieve docs (Svelte, SvelteKit, Drizzle)
  - **Step 3: Human validation** (NEW)
    - Show: Top 10 retrieved docs
    - User: Approve 3-5 most relevant
  - Step 4: Generate fix with approved context only
  - Step 5: Validate + commit

- [ ] 3.1.2 - Create terminal UI for source validation
  - Use: `enquirer` or `prompts` npm package
  - Display: Checkbox list of docs with snippets
  - Controls: ↑/↓ navigate, Space select, Enter confirm

- [ ] 3.1.3 - Store fix provenance
  - Table: `code_fix_provenance`
  - Columns: `fix_id`, `error_text`, `approved_doc_urls[]`, `patch`, `validated`
  - Link: KAG graph (fix → based_on → doc)

**Files to Edit**:
- `sveltekit-frontend/scripts/phase89-agentic-fixer.mjs`
- Add: `backend/migrations/xxxx_fix_provenance.sql`

---

#### Task 3.2: Auto-Approval Rules
**Status**: Reduce human burden gradually

**Subtasks**:
- [ ] 3.2.1 - Define auto-approval criteria
  - Rule 1: If confidence > 0.95, auto-approve
  - Rule 2: If doc from official Svelte.dev, auto-approve
  - Rule 3: If same error fixed before with same doc, auto-approve

- [ ] 3.2.2 - Create `AutoApprovalEngine` class
  ```python
  class AutoApprovalEngine:
      def should_auto_approve(self, chunk: RetrievedChunk) -> bool:
          if chunk.confidence > 0.95:
              return True
          if chunk.source_url.startswith("https://svelte.dev/docs"):
              return True
          if self.is_previously_validated(chunk):
              return True
          return False
  ```

- [ ] 3.2.3 - Hybrid mode: Auto-approve + human review
  - Auto-approve: High-confidence docs
  - Human review: Medium-confidence docs (0.6-0.95)
  - Reject: Low-confidence docs (<0.6)

**Files to Create**:
- `backend/services/auto_approval_engine.py`

---

### Phase 4: Dashboard & Monitoring (Week 4)

#### Task 4.1: Source Validation Dashboard
**Status**: New Grafana panel

**Subtasks**:
- [ ] 4.1.1 - Create metrics endpoint `/api/metrics/source-validation`
  - Total validations (today, this week, all-time)
  - Avg chunks per validation
  - Auto-approval rate
  - Human intervention rate

- [ ] 4.1.2 - Grafana dashboard: "RAG Source Validation"
  - Panel 1: Validations over time (line graph)
  - Panel 2: Auto-approval rate (gauge)
  - Panel 3: Top validated sources (table)
  - Panel 4: Avg confidence distribution (histogram)

**Files to Create**:
- `backend/api/metrics_api.py` (extend)
- `grafana/dashboards/rag_source_validation.json`

---

#### Task 4.2: CouchDB Analytics Dashboard
**Status**: New dashboard for codebase insights

**Subtasks**:
- [ ] 4.2.1 - Create `/api/analytics/codebase-health`
  - Query: CouchDB MapReduce views
  - Return: Error hotspots, dependency depth, most imported files

- [ ] 4.2.2 - Frontend component: `CodebaseHealthDashboard.svelte`
  - Show: Top 10 files by error count
  - Show: Dependency graph (interactive D3.js)
  - Show: Recent LLM summaries

- [ ] 4.2.3 - Refresh mechanism
  - Button: "Re-index codebase" (trigger `codebase_indexer.py`)
  - Button: "Re-generate summaries" (batch LLM calls)

**Files to Create**:
- `sveltekit-frontend/src/routes/dashboard/codebase-health/+page.svelte`

---

## 🗂️ File Structure

```
deeds-web-app/
├── backend/
│   ├── api/
│   │   ├── rag_source_validation_api.py (extend)
│   │   ├── error_cluster_api.py (new)
│   │   └── metrics_api.py (extend)
│   ├── services/
│   │   ├── codebase_indexer.py (new)
│   │   ├── llm_summary_service.py (new)
│   │   ├── auto_approval_engine.py (new)
│   │   └── couchdb_client.py (new)
│   ├── models/
│   │   └── rag_types.py (new - Pydantic)
│   ├── migrations/
│   │   ├── 20251231_source_validation_schema.sql (new)
│   │   └── 20251231_fix_provenance.sql (new)
│   ├── couchdb/
│   │   └── design_docs/
│   │       ├── topology.json (new)
│   │       └── error_analysis.json (new)
│   └── scripts/
│       └── generate_codebase_summaries.py (new)
│
├── sveltekit-frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   └── rag/
│   │   │   │       ├── SourceValidator.svelte (enhance)
│   │   │   │       ├── AnswerGenerator.svelte (new)
│   │   │   │       ├── CitationInspector.svelte (new)
│   │   │   │       ├── ProvenanceGraph.svelte (new)
│   │   │   │       └── ClusterExplorer.svelte (new)
│   │   │   └── types/
│   │   │       └── rag-source-validation.ts (extend)
│   │   └── routes/
│   │       └── dashboard/
│   │           └── codebase-health/
│   │               └── +page.svelte (new)
│   └── scripts/
│       ├── phase89-agentic-fixer.mjs (modify)
│       └── phase89-cuda-clustering.py (modify)
│
├── granite-docling-worker/
│   └── src/
│       └── agentic_rag/
│           ├── doc_crawler.py (from architecture doc)
│           ├── embedding_service.py (from architecture doc)
│           ├── error_parser.py (from architecture doc)
│           └── retrieval_engine.py (from architecture doc)
│
└── docker-compose.phase89.yml (use existing, just start couchdb)
```

---

## 🚀 Quick Start Checklist

### Day 1: Setup
- [ ] Start CouchDB: `docker start phase89-couchdb`
- [ ] Create databases: `curl -X PUT http://admin:password@localhost:5984/{codebase_graph,llm_summaries,error_clusters}`
- [ ] Verify: http://localhost:5984/_utils (Fauxton UI)

### Day 2: Backend Schema
- [ ] Run migration: `20251231_source_validation_schema.sql`
- [ ] Test: Insert sample validation record
- [ ] Verify: Query from PostgreSQL

### Day 3: Frontend Components
- [ ] Enhance `SourceValidator.svelte` with confidence meters
- [ ] Create `AnswerGenerator.svelte` with citation tracking
- [ ] Test: Mock data flow (retrieve → validate → generate)

### Day 4: CouchDB Integration
- [ ] Implement `codebase_indexer.py`
- [ ] Create MapReduce views
- [ ] Test: Query top error files

### Day 5: End-to-End Test
- [ ] Full flow: Legal query → retrieve → validate → generate → store KAG
- [ ] Full flow: Error → retrieve docs → validate → fix → commit
- [ ] Metrics: Capture validation rate, auto-approval rate

---

## 📊 Success Metrics

1. **Source Validation**:
   - 100% of RAG answers traceable to validated sources
   - <10 seconds for human validation UX (retrieve → select → confirm)
   - >70% auto-approval rate after 2 weeks of training

2. **CouchDB Performance**:
   - <50ms for MapReduce view queries
   - 10,000+ codebase documents indexed
   - 1,000+ LLM summaries generated

3. **Agentic Error Fixing**:
   - >80% fix success rate with validated docs
   - <3 human interventions per 10 errors (auto-approval working)
   - 100% provenance tracking (every fix → approved docs)

---

## 🔗 References

- **Video**: https://www.youtube.com/watch?v=Be2OQ3LQZcQ
- **CopilotKit Docs**: https://docs.copilotkit.ai
- **Pydantic AI**: https://ai.pydantic.dev
- **CouchDB**: https://docs.couchdb.org
- **Existing Components**:
  - `backend/api/rag_source_validation_api.py`
  - `sveltekit-frontend/src/lib/components/rag/SourceValidator.svelte`
  - `python-services/rag-kag-middleware/app/services/graph_store.py`

---

**Next Step**: Start with Task 1.1.1 (extend `/api/kb/search` endpoint)
**Estimated Total Time**: 4 weeks (20 days × 4 hours/day = 80 hours)
**Priority**: HIGH (blocks legal case workflow + error fixing automation)
