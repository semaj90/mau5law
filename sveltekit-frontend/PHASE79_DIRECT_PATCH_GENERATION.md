# Phase 79: Direct Patch Generation with RAG/KAG Ranking

## Problem Statement

**The Issue:**
- Phase 78 generates explanatory text instead of code patches
- Bad suggestions get stored in database and corrupt files when applied
- Example: "The error summary indicates a problem within the `__non_route__#internal` file..." (not code!)

**The Solution:**
- Bypass Phase 78 entirely
- Generate patches directly from error clusters
- Use RAG/KAG to find similar solutions
- Rank by cosine similarity + validation confidence
- Output JSONL dataset with 1-10 ranking

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Phase 79: Direct Patch Generation                      │
└─────────────────────────────────────────────────────────┘

STEP 1: Error Clusters
  ↓
  Read compile_errors table
  Group by error_code
  Skip if Phase 78 already applied

STEP 2: RAG/KAG Query
  ↓
  Search Qdrant for similar solutions
  Fallback to PostgreSQL similarity search
  Get 3-5 most relevant chunks

STEP 3: LLM Generation
  ↓
  Send to Ollama/Gemini with KB context
  Prompt: "Generate ONLY valid code (no explanations)"
  Use temperature=0.3 for deterministic output

STEP 4: Safety Gate Validation
  ↓
  Check content type (must be >80% code confidence)
  Validate TypeScript/JavaScript syntax
  Block if any documentation indicators found

STEP 5: JSONL Dataset Creation
  ↓
  Rank by composite score:
    - Validation score: 60% weight
    - Similarity score: 40% weight
  Create 1-10 ranking (1=best, 10=worst)
  Output: recommendations.jsonl

STEP 6: Database Storage
  ↓
  Insert into error_suggestions table
  Mark as "direct_generation" type
  Store KB references for traceability
```

---

## Output Format: JSONL Dataset

**File:** `recommendations.jsonl`

Each line is a JSON object with:

```json
{
  "error_code": "TS1005",
  "rank": 1,
  "cosine_similarity": 0.92,
  "similarity_rank_1_to_10": 9,
  "inverse_rank_1_to_10": 2,
  "validation_score": 95.5,
  "composite_score": 88.3,
  "confidence_level": "HIGH",
  "patch_summary": "const x: string = 'fixed code...'",
  "kb_references": 3,
  "is_valid": true,
  "generated_at": "2025-12-21T10:30:00Z"
}
```

**Ranking Explanation:**
- `similarity_rank_1_to_10`: Cosine similarity from knowledge base (1=best match, 10=worst)
- `inverse_rank_1_to_10`: Reverse rank for applying fixes (1=apply first, 10=apply last)
- `composite_score`: Combined ranking (validation 60% + similarity 40%)

---

## Database Setup

### 1. Ensure error_suggestions table exists

```bash
$env:PGPASSWORD='123456'
psql -h localhost -U legal_admin -d legal_ai_db -c @"
CREATE TABLE IF NOT EXISTS error_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code TEXT NOT NULL UNIQUE,
  suggestion_text TEXT,
  suggestion_type TEXT DEFAULT 'phase78', -- Change to 'direct_generation'
  confidence_score FLOAT DEFAULT 0,
  validation_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, applied, rejected
  risk_level TEXT DEFAULT 'medium', -- low, medium, high
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  CONSTRAINT fk_compile_errors FOREIGN KEY (error_code)
    REFERENCES compile_errors(error_code)
);

CREATE INDEX IF NOT EXISTS idx_error_suggestions_status ON error_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_error_suggestions_confidence ON error_suggestions(confidence_score DESC);
"@
```

### 2. Optional: Clear bad Phase 78 suggestions

```bash
# See what Phase 78 generated
psql -c "SELECT error_code, suggestion_text FROM error_suggestions WHERE suggestion_type='phase78' LIMIT 5;"

# Check if any are pure documentation (not code)
psql -c "SELECT COUNT(*) as bad_suggestions FROM error_suggestions WHERE suggestion_text LIKE 'The error%' OR suggestion_text LIKE 'This%';"

# If needed, remove them:
psql -c "DELETE FROM error_suggestions WHERE suggestion_type='phase78' AND suggestion_text NOT LIKE '%const%' AND suggestion_text NOT LIKE '%function%' AND suggestion_text NOT LIKE '%import%';"
```

---

## Usage

### Quick Start

```bash
cd sveltekit-frontend

# Run the direct patch generator
node scripts/phase79-direct-patch-generation.mjs

# View the JSONL output
cat recommendations.jsonl | head -20

# Import JSONL into your analysis pipeline
Get-Content recommendations.jsonl | ConvertFrom-Json | Group-Object -Property confidence_level | Select-Object Name, Count
```

### With Parameters

```bash
# Generate patches for 50 error clusters
node scripts/phase79-direct-patch-generation.mjs --limit 50

# Use specific LLM provider
LLM_PROVIDER=gemini node scripts/phase79-direct-patch-generation.mjs

# With Ollama GPU
OLLAMA_MODEL=gemma3-legal:latest node scripts/phase79-direct-patch-generation.mjs
```

---

## Integration with Existing Pipelines

### Phase 72: Auto-Iterate

```javascript
// scripts/phase72-auto-iterate.mjs

import { fetchErrorClusters, createRecommendationsDataset } from './phase79-direct-patch-generation.mjs';

// Instead of using Phase 78 suggestions...
// const suggestions = await fetchPhase78Suggestions(); // ❌ BAD

// ...use Phase 79 direct generation:
const clusters = await fetchErrorClusters(50);
const recommendations = await generatePatches(clusters); // ✅ GOOD
```

### Phase 76: ACE Agent

```javascript
// scripts/phase76-ace-prompt-engineer.mjs

import { queryKnowledgeBase, generatePatchWithContext } from './phase79-direct-patch-generation.mjs';

// For each error cluster:
const kbResults = await queryKnowledgeBase(errorCode, errorMessage);
const patch = await generatePatchWithContext(
  errorCode,
  errorMessage,
  affectedFiles,
  kbResults
);

// Then validate with Phase 79 safety gate:
import { validateFileContent } from './phase79-safety-gate.mjs';
const validation = validateFileContent(patch, filePath);

if (validation.canWrite) {
  await applyPatch(patch);
}
```

### Phase 78: Error Brain (Deprecated for Code)

Phase 78 is now for **error tracking and analysis only**, not patch generation:

```javascript
// Store errors and error patterns
// DON'T store "fixes" or "suggestions" in error_brain

await storeError({
  code: 'TS1005',
  pattern: 'unexpected keyword',
  frequency: 47,
  sources: ['flatbuffer-node-data.ts', 'simd-json-integration.ts']
});

// Phase 79 generates the actual fix from error cluster
```

---

## Validation Rules

Phase 79 only accepts patches that pass:

1. **Content Type Check** (Safety Gate)
   - Must be >80% code confidence
   - Blocks purely explanatory text

2. **Syntax Validation**
   - Balanced braces/brackets/parentheses
   - Valid string quotes
   - No duplicate patterns (like `catch)catch)catch)`)

3. **Knowledge Base Ranking**
   - Uses cosine similarity from Qdrant
   - Requires >50% similarity to existing solutions
   - Low similarity = low confidence = apply last

---

## Example Output

```
═══ STEP 1: Fetch Error Clusters (Direct from Errors) ═══

✓ Found 20 error clusters
  • Error TS1005: 47 occurrences (3 files)
  • Error TS2304: 38 occurrences (2 files)
  • Error TS1109: 29 occurrences (4 files)

═══ STEP 2-4: Generate Patches with RAG/KAG Context ═══

⚙ Processing error TS1005 (47 occurrences)...
ℹ   Found 3 similar solutions in KB
⚙ Generating patch for TS1005...
✓   Patch validated successfully
  Validation: 95.5% | Similarity: 92% | Composite: 88.3

Generated 18 valid patches

═══ STEP 5: Create JSONL Dataset with Rankings ═══

✓ Created recommendations.jsonl with 18 entries
  Output: /sveltekit-frontend/recommendations.jsonl

Dataset Summary:
  Total recommendations: 18
  High confidence (>80%): 14
  Medium confidence (50-80%): 3
  Low confidence (<50%): 1

Top 5 Recommendations:
  [1] Error TS1005 - Score: 88.3 (Similarity: 92%)
  [2] Error TS2304 - Score: 85.1 (Similarity: 87%)
  [3] Error TS1109 - Score: 82.7 (Similarity: 81%)
  [4] Error TS2688 - Score: 78.4 (Similarity: 76%)
  [5] Error TS2593 - Score: 75.2 (Similarity: 71%)

═══ COMPLETE ═══

✓ Pipeline executed successfully!
ℹ Generated 18 recommendations with RAG/KAG ranking
```

---

## Performance Metrics

- **Error Cluster Fetching:** ~50ms
- **KB Query per error:** ~100ms (Qdrant) or ~50ms (PostgreSQL fallback)
- **LLM Generation per patch:** ~2-5 seconds (Ollama) or ~1-3 seconds (local)
- **Validation per patch:** ~20ms
- **JSONL Creation:** ~50ms
- **Total for 20 patches:** ~2-3 minutes

---

## Troubleshooting

### "No error clusters found"
**Cause:** No errors in compile_errors table
**Fix:** Run Phase 72 error collection first
```bash
npm run phase72:collect-errors
```

### "KB query failed"
**Cause:** Qdrant or PostgreSQL connection failed
**Fix:** Check services
```bash
psql -c "SELECT COUNT(*) FROM knowledge_base;"
curl http://localhost:6333/health
```

### "Patch validation failed"
**Cause:** LLM generated documentation instead of code
**Fix:** Improvement prompt in `generatePatchWithContext()`
**Current:** Includes "Generate ONLY valid code (no explanations)"

### "Database insert failed"
**Cause:** Schema mismatch or missing columns
**Fix:** Verify table schema
```bash
psql -c "\d error_suggestions"
```

---

## Next Steps

1. **Run the generator:**
   ```bash
   node scripts/phase79-direct-patch-generation.mjs
   ```

2. **Review recommendations.jsonl:**
   ```bash
   cat recommendations.jsonl | ConvertFrom-Json | Select-Object error_code, rank, composite_score | Format-Table
   ```

3. **Apply high-confidence patches:**
   ```bash
   # Filter for rank 1-5 (best matches)
   node scripts/phase79-apply-recommendations.mjs --min-rank 1 --max-rank 5
   ```

4. **Monitor success rate:**
   ```bash
   psql -c "SELECT status, COUNT(*) FROM error_suggestions WHERE suggestion_type='direct_generation' GROUP BY status;"
   ```

---

## Architecture Comparison

### Before (Phase 78 → Bad Suggestions)
```
Error → Phase 78 LLM → "The error indicates..." → Store in DB → Corrupt file ❌
```

### After (Phase 79 → Valid Patches)
```
Error → RAG/KAG Search → LLM (with context) → Validate → JSONL ranking → Apply ✓
```

**Key Difference:**
- Phase 78: Stateless, no context, generates explanations
- Phase 79: Context-aware (RAG/KAG), validated, code-only, ranked

---

## Files Modified

- `scripts/phase79-direct-patch-generation.mjs` - Main implementation (NEW)
- `scripts/phase79-safety-gate.mjs` - Used for validation
- `recommendations.jsonl` - Output dataset (GENERATED)
- `error_suggestions` table - Stores results (UPDATED)

No modifications to Phase 72, 76, 78 yet - ready for integration when approved.
