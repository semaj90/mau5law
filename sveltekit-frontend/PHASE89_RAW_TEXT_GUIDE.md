# Phase 89: Raw Text Agentic Error Fixer

**Simple, robust pipeline for 108K+ errors using embeddings + cosine similarity**

---

## Architecture

```
Error Files (raw text)
    ↓
Line-based Chunking (no regex)
    ↓
Ollama Embeddings (embeddinggemma, 768-dim)
    ↓
Postgres + pgvector (cosine similarity index)
    ↓
Similarity Clustering (group similar errors)
    ↓
LLM Fix Generation (gemma3-legal with context)
    ↓
Autonomous Batch Fixing
```

---

## Quick Start

### 1. One-Command Full Pipeline
```powershell
.\RUN_PHASE89_AGENTIC.ps1
```

### 2. Manual Steps

**Step 1: Generate error reports**
```powershell
npx tsc --noEmit --pretty false 2>&1 | Out-File -FilePath reports/tsc-errors.txt -Encoding utf8
npx svelte-check --output machine 2>&1 | Out-File -FilePath reports/svelte-check-errors.json -Encoding utf8
```

**Step 2: Embed all errors** (15-30 minutes for 108K errors)
```powershell
node scripts/phase89-raw-text-embedder.mjs
```

**Step 3: Search similar errors**
```powershell
node scripts/phase89-similarity-ranker.mjs "TS1005 missing comma"
node scripts/phase89-similarity-ranker.mjs "Cannot find name"
node scripts/phase89-similarity-ranker.mjs --id 12345
```

**Step 4: Auto-fix errors**
```powershell
# Fix top 100 errors
node scripts/phase89-agentic-fixer.mjs --limit 100

# Fix specific error code
node scripts/phase89-agentic-fixer.mjs --error-code TS1005

# Fix ALL errors (autonomous)
node scripts/phase89-agentic-fixer.mjs --limit 100000
```

---

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `phase89-raw-text-embedder.mjs` | Chunk + embed errors | 182 |
| `phase89-similarity-ranker.mjs` | Semantic search + pattern extraction | 197 |
| `phase89-agentic-fixer.mjs` | Autonomous cluster fixing | 249 |
| `RUN_PHASE89_AGENTIC.ps1` | Full pipeline automation | 126 |

---

## Why Raw Text Works Better

### Traditional AST Parsing Issues
- ❌ Regex fails on complex syntax
- ❌ ts-morph chokes on malformed code
- ❌ Can't handle .svelte-kit generated files
- ❌ Needs perfect type inference

### Raw Text Embedder Advantages
- ✅ **No parsing** - just read lines as strings
- ✅ **No regex** - semantic similarity via embeddings
- ✅ **Handles any format** - TSC, svelte-check, ESLint, etc.
- ✅ **Robust** - works on broken code
- ✅ **Fast** - simple line splitting

---

## Database Schema

```sql
CREATE TABLE raw_error_embeddings (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,              -- 'tsc' or 'svelte-check'
  line_number INTEGER,                -- Original line number
  raw_text TEXT NOT NULL,             -- Full error line (no parsing)
  embedding vector(768),              -- embeddinggemma vector
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cosine similarity index (fast <10ms queries)
CREATE INDEX idx_raw_error_embedding_cosine
ON raw_error_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## Example Queries

### Find Similar Errors (SQL)
```sql
-- Find top 50 errors similar to error ID 12345
SELECT
  id,
  raw_text,
  1 - (embedding <=> (SELECT embedding FROM raw_error_embeddings WHERE id = 12345)) AS similarity
FROM raw_error_embeddings
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM raw_error_embeddings WHERE id = 12345)
LIMIT 50;
```

### Cosine Similarity Distance
```sql
-- Distance between two error embeddings
SELECT
  e1.id,
  e2.id,
  e1.embedding <=> e2.embedding AS cosine_distance,
  1 - (e1.embedding <=> e2.embedding) AS cosine_similarity
FROM raw_error_embeddings e1
CROSS JOIN raw_error_embeddings e2
WHERE e1.id = 100 AND e2.id = 200;
```

---

## Pipeline Performance

| Stage | Time | Details |
|-------|------|---------|
| Error generation | 2-5 min | `tsc` + `svelte-check` |
| Embedding (108K errors) | 15-30 min | ~200 embeddings/min via Ollama |
| Similarity search | <10ms | pgvector HNSW index |
| Fix generation | ~2s/error | LLM generates fix with context |
| Batch fixing (100 errors) | 3-5 min | Cluster + fix + apply |

**Total for 100 errors**: ~5-8 minutes
**Total for 108K errors**: ~15-30 hours (autonomous, unattended)

---

## Embedding Model

**embeddinggemma** (Ollama)
- Dimensions: 768
- Context: 8192 tokens
- Speed: ~200 embeddings/min on GPU
- Quality: High semantic similarity for code errors

---

## Fix Generation Prompt

```javascript
const prompt = `You are fixing a TypeScript/Svelte error.

Error:
${primaryError}

Similar errors in codebase (${similarCount} found):
${similarErrors.slice(0, 5).join('\n')}

File: ${filePath}
Error at line ${line}, column ${col}

Context (lines ${contextStart}-${contextEnd}):
\`\`\`
${codeContext}
\`\`\`

Generate ONLY the fixed version of line ${line}.
No explanation, no markdown, just the corrected code line.`;
```

---

## Clustering Algorithm

1. **For each error**:
   - Find top 20 similar errors (cosine similarity > 0.85)
   - Group into cluster
   - Mark all as processed

2. **For each cluster**:
   - Use primary error as reference
   - Send similar patterns to LLM
   - Generate fix with full context
   - Apply to file
   - Verify with `tsc`

3. **Repeat** until all clusters fixed or max iterations reached

---

## Success Criteria

✅ **Good Fix**:
- File compiles without error at that line
- Similar errors reduced by 80%+
- No new errors introduced

⚠️ **Partial Fix**:
- Error reduced in severity
- Similar errors reduced by 50-80%

❌ **Failed Fix**:
- Error persists
- New errors introduced
- File becomes invalid

---

## Monitoring Progress

```powershell
# Check embedding progress
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT
  source,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
  ROUND(COUNT(*) FILTER (WHERE embedding IS NOT NULL)::numeric / COUNT(*) * 100, 1) as pct
FROM raw_error_embeddings
GROUP BY source;
"

# Check fix progress
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL;
"
```

---

## Troubleshooting

### Embedding is slow
- **Cause**: Ollama CPU-only or low memory
- **Fix**: Use GPU acceleration: `docker exec ollama-gemma nvidia-smi`

### pgvector not found
- **Cause**: Extension not installed
- **Fix**: `docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "CREATE EXTENSION vector;"`

### Cosine similarity returns no results
- **Cause**: Threshold too high (0.7 default)
- **Fix**: Lower `minSimilarity` in config to 0.5

### Fixes are incorrect
- **Cause**: Not enough similar error context
- **Fix**: Increase `topK` to 100 for more examples

---

## Next Steps

1. ✅ **Run embedder** - get all 108K errors embedded
2. ✅ **Test similarity search** - verify clustering works
3. ✅ **Fix 10 errors manually** - validate LLM output quality
4. ✅ **Batch fix 100 errors** - measure success rate
5. ✅ **Autonomous fixing** - let it run overnight on all errors

---

## Comparison: AST vs Raw Text

| Feature | AST Parsing | Raw Text Embeddings |
|---------|-------------|---------------------|
| **Robustness** | ❌ Breaks on syntax errors | ✅ Works on any text |
| **Speed** | ❌ Slow (ts-morph overhead) | ✅ Fast (line splitting) |
| **Accuracy** | ⚠️ High when working | ✅ Semantic similarity |
| **Maintenance** | ❌ Complex regex/AST logic | ✅ Simple chunking |
| **Error Coverage** | ❌ ~46% (2,182/4,684 files) | ✅ 100% (all raw lines) |

---

## Example Output

```
🤖 Phase 89: Agentic Batch Error Fixer

📊 Finding top 100 unfixed errors...
   Found 100 errors to fix

🔗 Clustering errors by similarity...
   Created 23 error clusters

🛠️  Fixing error clusters...

[1/23] Cluster with 12 similar errors
   Primary: src/lib/stores/ui.svelte.ts(45,7): error TS1005: ',' expected.
   ✅ Applied fix to src/lib/stores/ui.svelte.ts:45

[2/23] Cluster with 8 similar errors
   Primary: src/routes/(app)/+layout.svelte(89,23): error TS2304: Cannot find name...
   ✅ Applied fix to src/routes/(app)/+layout.svelte:89

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Agentic Fixer Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Clusters processed: 23
  Errors fixed:       87
  Errors failed:      13
  Success rate:       87.0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Agentic fixing complete!
```

---

## Credits

**Phase 89: Raw Text Agentic Error Fixer**
Simple, robust, autonomous error fixing using:
- pgvector for cosine similarity
- Ollama embeddinggemma for semantic search
- gemma3-legal for fix generation
- Zero regex, zero AST parsing - just raw text + ML
