# Phase 79: Codebase Indexer & RAG Integration Guide

## Overview

The **Codebase Indexer** is the bridge between your project files and the RAG/KAG knowledge system. It:

1. **Indexes TypeScript/Svelte files** from your codebase
2. **Generates semantic embeddings** via Ollama
3. **Stores in MinIO** for persistence
4. **Searches via Qdrant** for RAG-augmented error analysis
5. **Tags errors** with Phase information (66-79) for tracking

This enables Phase 79 to:
- Find similar code patterns before generating patches
- Understand file structure and relationships
- Rank patches by similarity to existing solutions
- Track which error phases each solution addresses

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Codebase                            │
│                (src/, routes/, lib/)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │   Codebase Indexer                │
         │  - Extract files (TS/Svelte)     │
         │  - Extract metadata              │
         │  - Chunk content                 │
         └───────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌──────────┐    ┌──────────┐
   │  MinIO  │      │  Qdrant  │    │  Error   │
   │ (Store) │      │ (Search) │    │ Patterns │
   └─────────┘      └──────────┘    └──────────┘
        ▲                ▲                ▲
        └────────────────┼────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Ollama Embeddings    │
            │  (768-dim vectors)     │
            └────────────────────────┘
```

## Quick Start

### 1. Ensure Services Are Running

```bash
# Ollama (embedding model)
ollama serve

# Qdrant (in another terminal)
docker run -p 6333:6333 qdrant/qdrant

# MinIO (in another terminal)
docker run -p 9000:9000 minio/minio server /data
```

### 2. Index Your Codebase

```bash
# From sveltekit-frontend directory
npm run index:codebase ./src
```

This will:
- Scan `./src` for `*.ts`, `*.svelte`, `*.js` files
- Extract file metadata (imports, exports, types, functions)
- Generate embeddings for 500-char chunks
- Store in `codebase-index` MinIO bucket
- Index in `phase79_codebase` Qdrant collection

### 3. Index Error Patterns

```bash
npm run index:errors
```

This will:
- Query PostgreSQL error_cluster table
- Extract top error patterns
- Generate embeddings
- Store in `error-analysis` MinIO bucket
- Index in `phase79_error_analysis` Qdrant collection

### 4. Search Codebase

```bash
npm run search:codebase "TypeScript error handling"
# Returns similar code chunks with similarity scores

npm run search:errors "cannot find module"
# Returns similar error patterns
```

## Configuration

Edit `.env` to configure storage:

```bash
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# Qdrant Configuration
QDRANT_URL=http://localhost:6333

# Ollama Configuration
OLLAMA_URL=http://localhost:11434

# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db
```

## API Endpoints

### File Indexing

**Command**: `npm run index:codebase [path]`

```javascript
async function indexCodebaseFiles(
  rootPath: string = './src',
  patterns: string[] = ['**/*.ts', '**/*.svelte', '**/*.js']
): Promise<void>
```

**Process**:
1. Find files matching patterns (excludes node_modules, dist, .svelte-kit)
2. Read file content
3. Extract metadata:
   - Language (TypeScript, Svelte, JavaScript)
   - Imports (up to 5)
   - Exports (up to 5)
   - Type count
   - Function count
4. Chunk content (500 chars, 100 overlap)
5. Generate embeddings via Ollama
6. Upload to MinIO bucket `codebase-index`
7. Upsert in Qdrant collection `phase79_codebase`

**Output**:
```
📚 Indexing codebase files...
📝 Found 234 files to index

📄 Processing: src/routes/+page.svelte
   📝 12 chunks
   ✅ 12 vectors in Qdrant

...

✅ Indexed 234/234 files
```

### Error Pattern Indexing

**Command**: `npm run index:errors`

```javascript
async function indexErrorClusters(): Promise<void>
```

**Process**:
1. Query PostgreSQL error_cluster table:
   ```sql
   SELECT DISTINCT file_path, error_code, message, COUNT(*) as error_count
   FROM error_cluster
   WHERE file_path IS NOT NULL
   GROUP BY file_path, error_code, message
   ORDER BY error_count DESC LIMIT 50
   ```
2. For each error cluster, create rich context:
   ```
   Error Code: TS2307
   File: src/lib/utils.ts
   Message: Cannot find module...
   Occurrences: 5
   Phase: Phase 66-79 Error Analysis
   ```
3. Generate embeddings
4. Store in MinIO + Qdrant

**Output**:
```
🔍 Indexing error clusters for analysis...
📋 Found 42 error clusters

⚠️  TS2307: Cannot find module 'svelte/store'
    File: src/routes/page.svelte (5 occurrences)
    ✅ Indexed

...

✅ Indexed 42/42 error clusters
```

## Search API

### Search Codebase

```javascript
async function searchCodebase(query: string, limit: number = 5)
```

**Example**:
```bash
npm run search:codebase "reactive declarations with runes"
```

**Process**:
1. Generate embedding for query
2. Search Qdrant collection `phase79_codebase` (threshold: 0.7)
3. Return top 5 matches with similarity

**Response**:
```json
[
  {
    "file": "src/routes/page.svelte",
    "chunk": 3,
    "similarity": "89.2",
    "content": "let count = $state(0); function increment() { count++; } ..."
  },
  {
    "file": "src/lib/Counter.svelte",
    "chunk": 1,
    "similarity": "85.7",
    "content": "const data = $state([...]); ..."
  }
]
```

### Search Error Patterns

```javascript
async function searchErrorPatterns(query: string, limit: number = 5)
```

**Example**:
```bash
npm run search:errors "TypeScript interface property missing"
```

**Process**:
1. Generate embedding for query
2. Search Qdrant collection `phase79_error_analysis` (threshold: 0.6)
3. Return top 5 matching error patterns

**Response**:
```json
[
  {
    "code": "TS2741",
    "file": "src/routes/admin/+page.ts",
    "count": 12,
    "similarity": "92.1",
    "message": "Property 'config' is missing..."
  },
  {
    "code": "TS2339",
    "file": "src/lib/utils.ts",
    "count": 8,
    "similarity": "78.5",
    "message": "Property 'status' does not exist..."
  }
]
```

## Integration with Phase 79

### Before Generating Patches

Phase 79 now:
1. **Receives error** (e.g., TS2307 in src/routes/page.svelte)
2. **Searches codebase** for similar imports/patterns
   - Query: "import statement for store in Svelte"
   - Results: 5 similar import patterns from codebase
3. **Searches error patterns** for similar errors
   - Query: "Cannot find module svelte/store"
   - Results: 3 previous occurrences with fixes applied
4. **Builds RAG context** combining:
   - Similar code patterns
   - Previous error solutions
   - File metadata
5. **Generates patch** with high confidence (similarity + validation score)

### Example Flow

```
Error: TS2307 "Cannot find module 'svelte/store'" in src/routes/page.svelte

1. Extract file context:
   - File: src/routes/page.svelte
   - Imports: [...10 existing imports...]
   - Exports: [...]
   - Functions: [increment, decrement]

2. Search codebase for similar patterns:
   "How to import from svelte/store in Svelte components?"
   Results:
   - src/lib/Counter.svelte (89% match): "import { writable } from 'svelte/store'"
   - src/routes/admin/+page.ts (87% match): "import { derived } from 'svelte/store'"

3. Search error patterns:
   "Cannot find module svelte/store"
   Results:
   - Previous fix: Add "svelte/store" to alias in svelte.config.js
   - Previous fix: Update import path from "svelte/store" to "$lib/store"

4. Generate patch with RAG context:
   Input to LLM:
   ---
   Error: TS2307 Cannot find module 'svelte/store'
   File: src/routes/page.svelte

   Similar patterns in codebase:
   - src/lib/Counter.svelte: import { writable } from 'svelte/store'

   Previous solutions:
   - Check svelte.config.js alias configuration
   - Verify 'svelte/store' is exported from node_modules

   File context:
   - 12 existing imports
   - 5 functions
   - 3 exports
   ---

   Output: "import { readable } from 'svelte/store';" with proper placement

5. Validation:
   - Syntax: ✅ Valid TypeScript import
   - Balance: ✅ Adds import without removing others
   - Logic: ✅ Uses exported names from svelte/store

6. Rank patch:
   - Validation score: 95%
   - Similarity score: 89% (similar to codebase patterns)
   - Composite: 93% (0.95 × 0.6 + 0.89 × 0.4)
   - Action: Apply with HIGH confidence
```

## MinIO Buckets

### codebase-index
Contains indexed source files:
```
minio/codebase-index/
├── a1b2c3d4.ts          # src/routes/page.svelte (hashed)
├── e5f6g7h8.ts          # src/lib/utils.ts (hashed)
├── i9j0k1l2.ts          # src/lib/Counter.svelte (hashed)
...
```

Metadata headers:
```
X-Amz-Meta-RelativePath: src/routes/page.svelte
```

### error-analysis
Contains error pattern snapshots:
```
minio/error-analysis/
├── TS2307_1702123456789.json  # Cannot find module
├── TS2741_1702123456799.json  # Property missing
├── TS2339_1702123456809.json  # Property doesn't exist
...
```

Content:
```json
{
  "file_path": "src/routes/page.svelte",
  "error_code": "TS2307",
  "message": "Cannot find module 'svelte/store'",
  "error_count": 5
}
```

## Qdrant Collections

### phase79_codebase

**Size**: 768 dimensions (embeddinggemma:latest)
**Distance**: Cosine similarity
**Threshold**: 0.7 (70% similarity required)

**Payload Schema**:
```json
{
  "file_path": "src/routes/page.svelte",
  "file_hash": "a1b2c3d4e5f6g7h8",
  "chunk_index": 0,
  "chunk_count": 12,
  "content": "let count = $state(0); function...",
  "language": "svelte",
  "imports": ["import { writable } from 'svelte/store'", ...],
  "exports": ["export default Page", ...],
  "type_count": 5,
  "function_count": 12,
  "indexed_at": "2024-01-15T10:30:00Z"
}
```

### phase79_error_analysis

**Size**: 768 dimensions
**Distance**: Cosine similarity
**Threshold**: 0.6 (60% similarity required)

**Payload Schema**:
```json
{
  "error_code": "TS2307",
  "file_path": "src/routes/page.svelte",
  "message": "Cannot find module 'svelte/store'",
  "error_count": 5,
  "phase": "phase66-79",
  "indexed_at": "2024-01-15T10:30:00Z"
}
```

## Database Schema

### error_cluster (PostgreSQL)

```sql
CREATE TABLE error_cluster (
  id SERIAL PRIMARY KEY,
  error_code VARCHAR(50),          -- e.g., TS2307
  message TEXT,                     -- Full error message
  file_path VARCHAR(255),           -- e.g., src/routes/page.svelte
  error_count INTEGER DEFAULT 1,   -- Number of occurrences
  phase VARCHAR(20),                -- Phase 66-79 tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_code ON error_cluster(error_code);
CREATE INDEX idx_file_path ON error_cluster(file_path);
CREATE INDEX idx_phase ON error_cluster(phase);
```

Used by:
- `npm run index:errors` to get top error patterns
- Queries limited to phase 66-79, filtered by phase

## Performance Notes

### Indexing Speed
- **File extraction**: ~50ms per file
- **Embedding generation**: ~200-500ms per chunk (Ollama local)
- **Qdrant upsert**: ~100ms per point
- **MinIO upload**: ~50-200ms per file

**Full indexing (234 files)**: ~2-5 minutes

### Search Speed
- **Embedding query**: ~300ms
- **Qdrant search**: ~50-100ms
- **Total search**: ~400ms per query

### Storage
- **MinIO**: ~2-3 MB per 100 source files
- **Qdrant**: ~1 MB per 1000 vectors (compressed)
- **Total**: ~3-5 MB for typical project

## Troubleshooting

### Embedding Generation Fails

**Symptom**: "Failed to generate embedding"

**Solutions**:
1. Check Ollama is running: `curl http://localhost:11434/api/embeddings`
2. Verify model: `ollama pull embeddinggemma:latest`
3. Check text length (max 8000 chars)

### Qdrant Collection Already Exists

**Symptom**: "Collection already exists"

**Solutions**:
1. Delete collection: `curl -X DELETE http://localhost:6333/collections/phase79_codebase`
2. Or skip indexing if already populated

### MinIO Bucket Access Denied

**Symptom**: "Access denied" when uploading

**Solutions**:
1. Verify credentials in .env
2. Check bucket exists: `minio ls buckets`
3. Create bucket: `minio mb minio/codebase-index`

### No Search Results

**Symptom**: Empty results when searching

**Solutions**:
1. Verify indexing completed: Check Qdrant stats
   ```bash
   curl http://localhost:6333/collections/phase79_codebase
   ```
2. Check similarity threshold (0.7 is high)
3. Try broader query: "import" instead of "specific module"
4. Re-index if files changed

## Advanced Usage

### Custom Search Threshold

Modify threshold in `searchCodebase()`:
```typescript
const results = await qdrant.search(collection, {
  vector: embedding,
  limit: 5,
  score_threshold: 0.6  // Lower threshold = more results
});
```

### Incremental Indexing

Index only new/modified files:
```bash
npm run index:codebase ./src --since "2024-01-15"
```

(Feature: timestamp-based reindexing)

### Error Phase Filtering

Search only Phase 72 errors:
```bash
npm run search:errors "module error" --phase phase72
```

### Integration with Phase 79

Phase 79 script automatically calls:
```typescript
// Before generating patch
const codebaseContext = await searchCodebase(errorDescription, 5);
const errorContext = await searchErrorPatterns(errorMessage, 5);
const ragContext = { codebaseContext, errorContext };

// Generate patch with RAG context
const patch = await generatePatchWithRAG(error, ragContext);
```

## Next Steps

1. **Run initial indexing**:
   ```bash
   npm run index:codebase ./src
   npm run index:errors
   ```

2. **Test searches**:
   ```bash
   npm run search:codebase "state management"
   npm run search:errors "Cannot find"
   ```

3. **Integrate with Phase 79**:
   - Phase 79 calls `searchCodebase()` and `searchErrorPatterns()`
   - Uses results to augment LLM prompts
   - Ranks patches by composite score

4. **Monitor and tune**:
   - Check Qdrant collection sizes
   - Adjust thresholds based on result quality
   - Reindex as codebase evolves

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [MinIO Documentation](https://docs.min.io/)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Codebase Indexer Source](./src/lib/services/codebase-indexer.ts)
- [Phase 79 Integration](./PHASE79_RAG_INTEGRATION.md)
