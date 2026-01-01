# Week 3 Task 1: Human-in-the-Loop Error Fixing API

## ✅ COMPLETED

**Created**: `backend/api/kb_fixing_api.py` (487 lines)
**Status**: Integrated in main.py, test scripts created, ready for testing

---

## 🎯 Overview

Human-in-the-loop workflow for safe, auditable error fixing with knowledge base validation.

**Key Innovation**: User explicitly validates all knowledge sources BEFORE LLM generates fix, ensuring safety and preventing hallucinations.

---

## 📋 API Endpoints

### 1. `POST /api/kb/search-fix-sources`
**Search Qdrant + CouchDB for relevant fix sources**

**Input**: `ErrorContext`
```json
{
  "file_path": "src/lib/components/ErrorExample.svelte",
  "error_message": "Cannot find name 'useState'",
  "error_type": "typescript",
  "line_number": 42,
  "code_context": "...",
  "stack_trace": "..."
}
```

**Output**: `error_id`, `sources[]`, `total_found`

**Sources**:
- **Qdrant**: Vector similarity search on `phase92_knowledge_base` collection
- **CouchDB**: LLM summaries from `llm_summaries` database

---

### 2. `POST /api/kb/validate-sources`
**User approves/rejects sources**

**Input**: `SourceValidationRequest`
```json
{
  "error_id": "error_20250115_123456789",
  "validated_sources": ["src_001", "src_003"],
  "rejected_sources": ["src_002"],
  "validation_notes": "Approved high-quality Qdrant sources"
}
```

**Output**: `validated_count`, `rejected_count`, `status: "ready_for_fix_generation"`

**Safety**: Only validated sources will be sent to LLM.

---

### 3. `POST /api/kb/generate-fix`
**LLM generates fix using validated sources**

**Input**: `FixGenerationRequest`
```json
{
  "error_id": "error_20250115_123456789",
  "validated_sources": ["src_001", "src_003"],
  "llm_provider": "gemma3-legal:latest",
  "include_explanation": true
}
```

**Output**: `GeneratedFix`
```json
{
  "fix_id": "fix_20250115_123500000",
  "original_code": "...",
  "fixed_code": "...",
  "explanation": "...",
  "source_citations": ["src_001", "src_003"],
  "confidence_score": 0.85,
  "generated_at": "2025-01-15T12:35:00Z",
  "llm_provider": "gemma3-legal:latest"
}
```

**LLM Integration**: POST to `localhost:11434/api/generate` (Ollama)

---

### 4. `POST /api/kb/apply-fix`
**Apply fix and track provenance**

**Input**: `ApplyFixRequest`
```json
{
  "fix_id": "fix_20250115_123500000",
  "user_approved": true,
  "application_notes": "Applied after review"
}
```

**Output**: `FixProvenanceRecord`
```json
{
  "fix_id": "fix_20250115_123500000",
  "file_path": "src/lib/components/ErrorExample.svelte",
  "applied_at": "2025-01-15T12:36:00Z",
  "user_id": "system",
  "validated_sources": ["src_001", "src_003"],
  "fix_content": "...",
  "success": true,
  "error_message": null
}
```

**TODO**: Currently in-memory storage, needs PostgreSQL migration (Task 3.3)

---

### 5. `GET /api/kb/fix-history/{file_path}`
**Query fix history for a file**

**Example**: `GET /api/kb/fix-history/src/lib/components/ErrorExample.svelte`

**Output**: Array of `FixProvenanceRecord[]` (most recent first)

**Use Cases**:
- Audit trail for all fixes applied to a file
- Revert analysis
- Source effectiveness tracking

---

### 6. `GET /api/kb/stats`
**Overall KB fixing statistics**

**Output**:
```json
{
  "active_error_sessions": 3,
  "generated_fixes": 8,
  "applied_fixes": 5,
  "success_rate": 0.625,
  "total_sources_validated": 47
}
```

---

## 🏗️ Architecture

### Workflow Flow

```
┌──────────────────┐
│ 1. Submit Error  │
│   (User Input)   │
└────────┬─────────┘
         │
         ▼
┌────────────────────────┐
│ 2. Search KB           │
│   - Qdrant (vectors)   │
│   - CouchDB (summaries)│
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 3. User Validates      │
│   - Approve sources    │
│   - Reject sources     │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 4. LLM Generates Fix   │
│   (Ollama + validated  │
│    sources only)       │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 5. Apply Fix           │
│   - Track provenance   │
│   - Audit trail        │
└────────────────────────┘
```

---

## 🗄️ Storage (Current State)

**In-Memory Dictionaries** (Temporary):
- `error_sessions: Dict[str, Dict]` - Active error contexts
- `generated_fixes: Dict[str, GeneratedFix]` - Generated fixes
- `fix_history: List[FixProvenanceRecord]` - Applied fixes

**PostgreSQL Migration** (Task 3.3):
```sql
CREATE TABLE kb_provenance_graph (
  fix_id VARCHAR(50) PRIMARY KEY,
  file_path TEXT,
  applied_at TIMESTAMP,
  user_id VARCHAR(50),
  validated_sources JSONB,
  fix_content TEXT,
  success BOOLEAN,
  error_message TEXT
);

CREATE TABLE auto_approval_rules (
  rule_id SERIAL PRIMARY KEY,
  source_pattern VARCHAR(255),
  auto_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

### 1. Verification Script
**File**: `backend/scripts/verify_week3_ready.py`

**Checks**:
- ✅ Qdrant collection exists (phase92_knowledge_base)
- ✅ CouchDB summaries populated
- ✅ Ollama running with gemma3-legal:latest
- ✅ KB Fixing API registered
- ⏳ PostgreSQL tables (Task 3.3)

**Run**: `python backend/scripts/verify_week3_ready.py`

---

### 2. Workflow Test
**File**: `backend/scripts/test_kb_fixing_workflow.py`

**Tests**:
1. Search for fix sources (Qdrant + CouchDB)
2. Validate sources (approve/reject)
3. Generate fix with LLM
4. Apply fix and track provenance
5. Query fix history
6. Overall statistics

**Run**: `python backend/scripts/test_kb_fixing_workflow.py`

**Expected Output**:
```
🧪 KB FIXING WORKFLOW TEST
==================================================
STEP 1: Search KB for Fix Sources
   ✅ Search complete!
   Error ID: error_20250115_123456789
   Sources found: 8

STEP 2: Validate Sources
   ✅ Approved: 5 sources
   ❌ Rejected: 3 sources

STEP 3: Generate Fix with LLM
   ✅ Fix generated! (took 3.2s)
   Confidence: 0.85

STEP 4: Apply Fix
   ✅ Fix applied!
   Success: true

STEP 5: Query Fix History
   ✅ History retrieved!
   Total fixes: 1

✅ WORKFLOW TEST COMPLETE!
```

---

## 🚀 Next Steps

### Immediate (Before Week 3 Task 2):
1. **Run verification**: `python backend/scripts/verify_week3_ready.py`
2. **Test workflow**: `python backend/scripts/test_kb_fixing_workflow.py`
3. **Fix any failures**: Ensure Qdrant, CouchDB, Ollama running
4. **Review logs**: Check LLM output quality

### Week 3 Task 2 (Auto-Approval Engine):
- Create `auto_approval_rules` table
- Add pattern matching logic
- Update `validate-sources` endpoint
- Auto-approve trusted sources

### Week 3 Task 3 (Provenance Tracking):
- PostgreSQL migration script
- Replace in-memory storage
- Provenance graph queries
- Neo4j visualization (optional)

### Week 3 Task 4 (Agentic Fix Generator):
- Multi-step reasoning
- Autonomous validation
- Integration with Week 1 RAG
- Complex error handling

---

## 📊 Integration Points

### Qdrant (Week 1)
- **Collection**: `phase92_knowledge_base`
- **Endpoint**: `POST localhost:6333/collections/phase92_knowledge_base/points/search`
- **Query**: Error context → Similar error fixes

### CouchDB (Week 2)
- **Database**: `llm_summaries`
- **Endpoint**: `GET localhost:5984/llm_summaries/_all_docs`
- **Filter**: File extension matching

### Ollama (Week 2)
- **Model**: `gemma3-legal:latest`
- **Endpoint**: `POST localhost:11434/api/generate`
- **Prompt**: Error + validated sources → Fixed code

---

## 🎓 Key Learnings

### Safety First
- **User validation prevents hallucinations**: LLM only sees approved sources
- **Provenance tracking enables audits**: Full chain from error → sources → fix
- **Confidence scoring guides decisions**: Low confidence → manual review

### Source Quality Matters
- **Qdrant sources**: High relevance (vector similarity)
- **CouchDB summaries**: Contextual (file type, language)
- **Combined ranking**: Merge + sort by relevance score

### LLM Integration
- **Structured prompts**: FIXED_CODE and EXPLANATION sections
- **Source citations**: LLM must cite which sources used
- **Confidence estimation**: Based on source quality + LLM certainty

---

## 📝 Example Workflow

### Scenario: Svelte 5 Migration

**Error**:
```typescript
// src/lib/components/Counter.svelte
import { useState } from 'svelte'; // ❌ Svelte 4 syntax

let count = useState(0);
```

**Search Result**:
- Source 1 (Qdrant): "Svelte 5 uses $state rune instead of useState" (0.92 relevance)
- Source 2 (CouchDB): "Counter.svelte migration guide" (0.78 relevance)
- Source 3 (Qdrant): "$state syntax examples" (0.85 relevance)

**User Validation**:
- ✅ Approve: Source 1, Source 3 (high quality)
- ❌ Reject: Source 2 (outdated)

**Generated Fix**:
```typescript
// src/lib/components/Counter.svelte
let count = $state(0); // ✅ Svelte 5 syntax

// EXPLANATION:
// In Svelte 5, the `useState` API was replaced with the `$state` rune.
// This provides the same reactivity with simpler syntax.
// SOURCE CITATIONS: src_001, src_003
```

**Applied**: Fix written to file, provenance tracked in database

**Result**: ✅ Error fixed, audit trail preserved

---

## 📚 Related Docs

- **Week 1**: Source Validation RAG (`sveltekit-frontend/src/routes/phase92-rag/README.md`)
- **Week 2**: Analytics Dashboard (`sveltekit-frontend/src/routes/couchdb-analytics/README.md`)
- **API Spec**: `backend/api/kb_fixing_api.py` (inline docstrings)
- **Test Scripts**: `backend/scripts/test_kb_fixing_workflow.py`, `verify_week3_ready.py`

---

**Status**: ✅ Week 3 Task 1 Complete - Ready for testing and Week 3 Tasks 2-4
