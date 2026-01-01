# 🚀 Source Validation RAG - Quick Start Guide

## 🎯 What is This?

**Human-in-the-loop RAG system** that lets users validate knowledge base sources before LLM generates answers.

**Pattern**: CopilotKit + Pydantic AI
**Result**: 100% source traceability + full audit trail

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/types/source-validation.ts` | All TypeScript types |
| `src/lib/services/source-validation-api.ts` | API client (5 methods) |
| `src/lib/components/source-validation/SourceValidator.svelte` | Search + validate UI |
| `src/lib/components/source-validation/AnswerGenerator.svelte` | LLM answer + citations |
| `src/lib/components/source-validation/CitationInspector.svelte` | View full source |
| `src/lib/components/source-validation/ProvenanceGraph.svelte` | D3.js graph viz |
| `src/routes/test-source-validation/+page.svelte` | Integration test |
| `backend/api/source_validation_api.py` | 5 REST endpoints |
| `backend/migrations/20250101_source_validation_schema.sql` | PostgreSQL schema |

---

## 🔧 Quick Start (5 Steps)

### 1. Start Services
```powershell
docker start phase66-postgres phase66-couchdb
# Qdrant should already be running
```

### 2. Verify Health
```powershell
curl http://localhost:8000/api/kb/health
```

### 3. Start Frontend
```powershell
cd sveltekit-frontend
npm run dev -- --port 5175
```

### 4. Open Test Page
```
http://localhost:5175/test-source-validation
```

### 5. Run Workflow
1. Enter query: "How do I use Svelte 5 runes?"
2. Click **Search**
3. **Approve 2-3 sources**
4. Click **Validate**
5. Watch answer generation + KAG update

---

## 🎨 Using Components in Your App

### Example: Full Workflow Page

```svelte
<script lang="ts">
import SourceValidator from '$lib/components/source-validation/SourceValidator.svelte';
import AnswerGenerator from '$lib/components/source-validation/AnswerGenerator.svelte';
import ProvenanceGraph from '$lib/components/source-validation/ProvenanceGraph.svelte';

let caseId = $state('my_case_123');
let validationId = $state<string | null>(null);
let entities = $state<string[]>([]);
let relationships = $state([]);

function handleValidation(valId: string, chunks: any[]) {
  validationId = valId;
}

function handleAnswer(answer: string, citations: any[]) {
  // Extract entities/relationships from answer
  entities = extractEntities(answer);
  relationships = extractRelationships(answer);
}
</script>

<!-- Step 1: Validate Sources -->
<SourceValidator
  {caseId}
  onValidationComplete={handleValidation}
  initialQuery="Your question here"
/>

<!-- Step 2: Generate Answer (only if validated) -->
{#if validationId}
  <AnswerGenerator
    {validationId}
    {caseId}
    query="Your question here"
    onAnswerGenerated={handleAnswer}
  />
{/if}

<!-- Step 3: Show Knowledge Graph -->
{#if entities.length > 0}
  <ProvenanceGraph
    {validationId}
    {entities}
    {relationships}
  />
{/if}
```

---

## 📡 API Usage

### 1. Search Knowledge Base
```typescript
import { sourceValidationAPI } from '$lib/services/source-validation-api';

const results = await sourceValidationAPI.search({
  query: 'How do I use Svelte 5 runes?',
  top_k: 20,
  include_codebase: true
});

// results.results: KBSearchResult[]
// Each has: chunk_id, source_file, content, snippet_preview, confidence_score, source_type
```

### 2. Validate Sources
```typescript
const validation = await sourceValidationAPI.validateSources({
  case_id: 'case_123',
  query: 'How do I use Svelte 5 runes?',
  selected_chunk_ids: ['chunk_1', 'chunk_2', 'chunk_3'],
  rejected_chunk_ids: ['chunk_4'],
  validation_notes: 'Approved official Svelte docs'
});

// validation.validation_id: string (use for answer generation)
```

### 3. Generate Answer
```typescript
const answer = await sourceValidationAPI.generateAnswer({
  validation_id: 'val_case_123_1735776000',
  case_id: 'case_123',
  query: 'How do I use Svelte 5 runes?',
  llm_provider: 'gemma3-legal'
});

// answer.answer: string (with [Source N] citations)
// answer.citations: CitationMetadata[]
```

### 4. Update Knowledge Graph
```typescript
const kagUpdate = await sourceValidationAPI.updateKAG({
  validation_id: 'val_case_123_1735776000',
  entities_extracted: ['Svelte 5', '$state', '$derived'],
  relationships: [
    { from: 'Svelte 5', to: '$state', type: 'HAS_FEATURE' }
  ]
});

// kagUpdate.entities_stored: number
// kagUpdate.relationships_stored: number
```

---

## 🗄️ Database Queries

### Check Recent Validations
```sql
SELECT
  validation_id,
  case_id,
  query,
  array_length(approved_chunks, 1) as approved,
  array_length(rejected_chunks, 1) as rejected,
  created_at
FROM case_source_validations
ORDER BY created_at DESC
LIMIT 5;
```

### View Citation Usage
```sql
SELECT * FROM citation_usage ORDER BY times_cited DESC LIMIT 10;
```

### Check Knowledge Graph
```sql
SELECT
  validation_id,
  entities,
  jsonb_array_length(relationships) as rel_count
FROM kb_provenance_graph
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎨 Component Props Reference

### SourceValidator
```typescript
{
  caseId: string;                                    // Required: Case identifier
  onValidationComplete?: (                           // Callback on validation
    validationId: string,
    approvedChunks: KBSearchResult[]
  ) => void;
  initialQuery?: string;                            // Pre-fill search query
}
```

### AnswerGenerator
```typescript
{
  validationId: string;                             // Required: From validation
  caseId: string;                                   // Required: Case identifier
  query: string;                                    // Required: Original query
  onAnswerGenerated?: (                             // Callback on answer
    answer: string,
    citations: CitationMetadata[]
  ) => void;
  llmProvider?: string;                             // Default: 'gemma3-legal'
}
```

### CitationInspector
```typescript
{
  citation: CitationMetadata;                       // Required: Citation to show
  isOpen: boolean;                                  // Required: Modal visibility
  onClose: () => void;                              // Required: Close callback
}
```

### ProvenanceGraph
```typescript
{
  validationId: string;                             // Required: For context
  entities: string[];                               // Required: Graph nodes
  relationships: Array<{                            // Required: Graph edges
    from: string;
    to: string;
    type: string;
  }>;
  width?: number;                                   // Default: 800
  height?: number;                                  // Default: 600
}
```

---

## 🔍 Debugging Tips

### Backend not responding?
```powershell
# Check backend server
curl http://localhost:8000/api/kb/health

# Check logs
docker logs phase66-postgres
docker logs phase66-couchdb
```

### Frontend errors?
```powershell
# Check console for TypeScript errors
# Verify API_BASE_URL in .env:
# VITE_API_URL=http://localhost:8000
```

### No search results?
```powershell
# Verify Qdrant collection exists
curl http://localhost:6333/collections/phase92_kb_chunks

# Index some test data if empty
```

---

## 📚 Documentation

- **Full Architecture**: `AGENTIC_RAG_ARCHITECTURE.md`
- **Task Breakdown**: `TASKS_SOURCE_VALIDATION_COUCHDB.md`
- **Implementation Status**: `SOURCE_VALIDATION_IMPLEMENTATION_STATUS.md`
- **Week 1 Summary**: `WEEK1_COMPLETE_SUMMARY.md`

---

## 🎯 Common Use Cases

### Use Case 1: Legal Research
1. User searches: "What is the statute of limitations for breach of contract?"
2. System retrieves 15 sources (law docs + previous cases)
3. User approves 3 official sources, rejects 2 blog posts
4. LLM generates answer using only approved sources
5. Citations link to approved documents

### Use Case 2: Technical Documentation
1. Developer searches: "How do I implement server-side rendering in Svelte 5?"
2. System retrieves docs + code examples from codebase
3. Developer approves official docs + working code examples
4. LLM generates implementation guide with citations
5. Knowledge graph shows dependencies (SvelteKit → load functions → data fetching)

### Use Case 3: Error Resolution
1. User searches: "How to fix TypeScript error TS2345?"
2. System retrieves error docs + previously fixed similar errors
3. User approves docs + 1 previous fix
4. LLM generates fix with step-by-step instructions
5. Fix is stored with provenance for future reuse

---

**Created**: January 1, 2025
**Status**: ✅ Week 1 Complete
**Next**: Week 2 - CouchDB Features
