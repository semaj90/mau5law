# Phase 79: RAG/KAG System - Testing & Validation Guide

## Overview

This guide walks through testing the complete RAG/KAG integration for Phase 79 error analysis and patch generation.

## Pre-Flight Checklist

Before starting tests, ensure all services are running:

```bash
# Terminal 1: Ollama (Embeddings)
ollama serve

# Terminal 2: Qdrant (Vector Database)
docker run -p 6333:6333 qdrant/qdrant

# Terminal 3: MinIO (Object Storage)
docker run -p 9000:9000 minio/minio server /data

# Terminal 4: PostgreSQL (Metadata)
# Should already be running from Phase 70 setup

# Terminal 5: SvelteKit Dev Server
npm run dev
```

**Verify all services:**
```bash
curl http://localhost:11434/api/embeddings  # Ollama
curl http://localhost:6333/health           # Qdrant
curl http://localhost:9000                  # MinIO
psql -c "SELECT 1"                          # PostgreSQL
curl http://localhost:5173                  # SvelteKit
```

## Test 1: Knowledge Base System

**Goal:** Verify document ingestion and search works

### Step 1.1: Initialize Database

```bash
npm run knowledge:setup
```

**Expected output:**
```
✅ PostgreSQL connected
✅ Created knowledge_base table with indexes
✅ Qdrant collection created: knowledge_base
✅ Database setup complete
```

**Verify:**
```bash
psql -c "\dt knowledge_base"  # Check table exists
curl http://localhost:6333/collections | jq '.result | length'  # Should show collections
```

### Step 1.2: Upload Test Document

Visit http://localhost:5173/knowledge

1. Click **📤 Upload** tab
2. Select a file: `KNOWLEDGE_BASE_GUIDE.md`
3. Set source: `test-upload`
4. Click **Upload Document**

**Expected output:**
```
✅ Document uploaded successfully
   Chunks: 12
   Vectors: 12
   Size: ~5 KB
```

**Verify:**
```bash
# Check Qdrant vectors
curl http://localhost:6333/collections/knowledge_base | jq '.result.points_count'

# Check PostgreSQL
psql -c "SELECT COUNT(*) FROM knowledge_base"
```

### Step 1.3: Search Documents

1. Click **🔍 Search** tab
2. Enter query: `document upload`
3. Click **Search**

**Expected output:**
```
✅ Found 1 match
   File: KNOWLEDGE_BASE_GUIDE.md
   Similarity: 87.3%
   Content: "Upload documents via REST API or web UI..."
```

### Step 1.4: Generate with RAG

1. Click **🤖 Generate** tab
2. Enter prompt: `How do I upload documents?`
3. Toggle: Use Local LLM
4. Click **Generate**

**Expected output:**
```
✅ Generated response using RAG context
   Tokens: 150
   Model: Ollama (gemma3-legal:latest)
   Sources: 1 document (87% match)
```

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 2: Codebase Indexing

**Goal:** Verify code file indexing and semantic search

### Step 2.1: Index Codebase

Visit http://localhost:5173/indexing

1. Click **📚 Index** tab
2. Set path: `./src`
3. Click **📚 Index Codebase**

**Expected output:**
```
✅ Indexed 50 files (limited for testing)
   Chunks: 245
   Vectors: 245
   Time: ~3-5 minutes
```

**Monitor progress:**
```bash
# Watch Qdrant growth
watch -n 1 'curl -s http://localhost:6333/collections/phase79_codebase | jq .result.points_count'
```

### Step 2.2: Verify Index Stats

1. Click **📊 Status** tab
2. Check **Codebase Index** card

**Expected:**
```
Codebase Index
245+ vectors indexed
```

**Verify manually:**
```bash
curl http://localhost:6333/collections/phase79_codebase | jq '.result | {points_count, config}'
```

### Step 2.3: Search Codebase

1. Click **🔍 Search** tab
2. Toggle: **Search Codebase** (default)
3. Enter query: `Svelte reactive state`
4. Click **🔍 Search**

**Expected output:**
```
✅ Found 5 matches
   1. src/routes/+page.svelte (89% similarity)
      Content: "let count = $state(0)..."
   2. src/lib/Counter.svelte (86% similarity)
      ...
```

**If no results:**
- Verify files were indexed (check status)
- Try broader query: "state"
- Lower threshold from 0.7 to 0.6

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 3: Error Pattern Indexing

**Goal:** Verify error cluster analysis and pattern search

### Step 3.1: Check Error Database

```bash
psql -c "SELECT COUNT(*) FROM error_cluster WHERE file_path IS NOT NULL"
```

**Expected:** >0 rows

If empty, create test errors:
```bash
psql << 'EOF'
INSERT INTO error_cluster (error_code, message, file_path, error_count)
VALUES
  ('TS2307', 'Cannot find module ''svelte/store''', 'src/routes/page.svelte', 3),
  ('TS2339', 'Property ''value'' does not exist', 'src/lib/utils.ts', 2),
  ('TS2741', 'Property ''config'' is missing', 'src/routes/admin/+page.ts', 5);
EOF
```

### Step 3.2: Index Error Patterns

1. Click **⚠️ Index Errors** button
2. Wait for completion

**Expected output:**
```
✅ Indexed 3 error clusters
   Code TS2307: 3 occurrences
   Code TS2339: 2 occurrences
   Code TS2741: 5 occurrences
```

### Step 3.3: Search Error Patterns

1. Click **🔍 Search** tab
2. Toggle: **Search Errors**
3. Enter query: `cannot find module store`
4. Click **🔍 Search**

**Expected output:**
```
✅ Found matches
   1. TS2307 in src/routes/page.svelte
      Similarity: 92%
      Occurrences: 3
      Message: "Cannot find module 'svelte/store'"
```

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 4: Phase 79 Integration

**Goal:** Verify Phase 79 uses RAG context for patch generation

### Step 4.1: Create Test Error

Create a file with a known error:

**File: test-error.ts**
```typescript
import { writable } from 'svelte/store';  // This will error in some contexts

export function Counter() {
  const count = writable(0);
  return count;
}
```

### Step 4.2: Run Phase 79

```bash
npm run phase79 test-error.ts
```

**Expected output:**
```
📋 Phase 79: Cognitive Engine
═══════════════════════════════════════════════════════════

🔍 Analyzing: test-error.ts
   Error: TS2307 - Cannot find module 'svelte/store'

📚 Searching RAG/KAG:
   1. Codebase search: "import svelte/store"
      ✅ Found 3 similar patterns
   2. Error search: "Cannot find module"
      ✅ Found 2 similar errors

🤖 Generating patch with RAG context:
   Prompt: [file analysis + similar patterns + previous solutions]
   Model: Ollama (gemma3-legal:latest)
   Output: "import { writable } from 'svelte/store';"

✅ Validation:
   Syntax: ✅ Valid TypeScript
   Balance: ✅ Imports maintained
   Logic: ✅ Correct export usage

📊 Ranking:
   Validation Score: 95%
   Similarity Score: 89%
   Composite Score: 92%
   Confidence: ✅ HIGH

✅ PATCH APPLIED
   File: test-error.ts
   Status: Fixed
```

**Verify patch applied:**
```bash
grep "import { writable }" test-error.ts
```

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 5: API Endpoints

**Goal:** Verify all REST endpoints function correctly

### Test 5.1: Get Status

```bash
curl http://localhost:5173/api/indexing
```

**Expected:**
```json
{
  "success": true,
  "collections": {
    "codebase": { "points_count": 245 },
    "errors": { "points_count": 3 }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Test 5.2: Search Codebase

```bash
curl -X POST http://localhost:5173/api/indexing/search \
  -H "Content-Type: application/json" \
  -d '{"query": "state management", "limit": 5}'
```

**Expected:**
```json
{
  "success": true,
  "query": "state management",
  "results": [
    {
      "file": "src/lib/stores.ts",
      "chunk": 2,
      "similarity": "87.3",
      "language": "typescript",
      "content": "..."
    }
  ]
}
```

### Test 5.3: Search Errors

```bash
curl -X POST http://localhost:5173/api/indexing/search-errors \
  -H "Content-Type: application/json" \
  -d '{"query": "cannot find", "limit": 5}'
```

**Expected:**
```json
{
  "success": true,
  "query": "cannot find",
  "results": [
    {
      "code": "TS2307",
      "file": "src/routes/page.svelte",
      "count": 3,
      "similarity": "92.1",
      "message": "Cannot find module 'svelte/store'"
    }
  ]
}
```

### Test 5.4: Index Codebase

```bash
curl -X POST http://localhost:5173/api/indexing/codebase \
  -H "Content-Type: application/json" \
  -d '{"rootPath": "./src"}'
```

**Expected:**
```json
{
  "success": true,
  "indexed": 50,
  "total": 234,
  "results": [
    {
      "file": "src/routes/+page.svelte",
      "chunks": 5,
      "vectors": 5
    }
  ],
  "message": "Indexed 50 of 50 files"
}
```

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 6: MinIO Storage Verification

**Goal:** Verify documents are persisted in MinIO

### Step 6.1: List Buckets

```bash
minio ls minio/
```

**Expected:**
```
codebase-index
error-analysis
```

### Step 6.2: List Files in Buckets

```bash
minio ls minio/codebase-index/
```

**Expected:**
```
a1b2c3d4.ts
e5f6g7h8.ts
i9j0k1l2.ts
...
```

### Step 6.3: Download & Verify File

```bash
minio cat minio/codebase-index/a1b2c3d4.ts | head -20
```

**Expected:** Source code content

### Step 6.4: Check Error Snapshots

```bash
minio ls minio/error-analysis/
```

**Expected:**
```
TS2307_1702123456789.json
TS2339_1702123456799.json
...
```

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 7: Performance & Load

**Goal:** Verify system handles realistic workloads

### Test 7.1: Large Search Query

```bash
curl -X POST http://localhost:5173/api/indexing/search \
  -H "Content-Type: application/json" \
  -d '{"query": "TypeScript error handling patterns with try catch finally blocks and error recovery mechanisms", "limit": 10}'

# Time the request
time curl -X POST http://localhost:5173/api/indexing/search ...
```

**Expected:**
```
< 500ms total response time
< 100ms Qdrant search time
Results: 10 items
```

### Test 7.2: Batch Searches

```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:5173/api/indexing/search \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"query $i\", \"limit\": 5}"
done

# Monitor Qdrant performance
curl http://localhost:6333/collections/phase79_codebase
```

**Expected:** All searches complete in <5 seconds

### Test 7.3: Memory Usage

```bash
# Check Ollama memory
ps aux | grep ollama | grep -v grep

# Check Qdrant memory
docker stats qdrant

# Check MinIO memory
docker stats minio
```

**Expected:** <2GB each service

**Test Result:** ✅ PASS/❌ FAIL

---

## Test 8: Error Handling

**Goal:** Verify system handles errors gracefully

### Test 8.1: Bad Request

```bash
curl -X POST http://localhost:5173/api/indexing/search \
  -H "Content-Type: application/json" \
  -d '{"query": ""}'  # Empty query
```

**Expected:**
```json
{ "success": false, "error": "..." }
```

### Test 8.2: Missing Service

Stop Ollama, then search:

```bash
# Kill Ollama in Terminal 1
# Then try search
curl -X POST http://localhost:5173/api/indexing/search ...
```

**Expected:**
```json
{ "success": false, "error": "Failed to generate embedding" }
```

**Recovery:**
```bash
# Restart Ollama
ollama serve
```

### Test 8.3: Full Disk

Create a file filling available space, then try index:

```bash
npm run index:codebase
```

**Expected:** Graceful error message about disk space

**Test Result:** ✅ PASS/❌ FAIL

---

## Performance Baseline

Record these metrics for comparison:

```bash
# Indexing speed
time npm run index:codebase ./src

# Search speed
time curl -X POST http://localhost:5173/api/indexing/search \
  -H "Content-Type: application/json" \
  -d '{"query": "state", "limit": 5}'

# Qdrant stats
curl http://localhost:6333/collections/phase79_codebase | jq '.result | {points_count, config.vector_size}'

# Memory usage
ps aux | awk '{sum+=$6} END {print "Total: " sum/1024 " MB"}'
```

**Acceptable Baselines:**
- Indexing: <5 min for 234 files
- Search: <500ms per query
- Memory: <8GB total
- Vectors: >200 for typical project

---

## Troubleshooting Test Failures

### Test 1 Fails: Knowledge Base

**Issue:** "Failed to generate embedding"
```bash
# Check Ollama
curl http://localhost:11434/api/embeddings
# If fails, restart: ollama serve
```

**Issue:** "PostgreSQL connection refused"
```bash
# Check PostgreSQL
psql -c "SELECT 1"
# If fails, check DATABASE_URL environment variable
echo $DATABASE_URL
```

### Test 2 Fails: Codebase Indexing

**Issue:** "No files found"
```bash
# Check glob pattern
ls -la src/**/*.ts | head
# Verify files exist in src/
```

**Issue:** "Qdrant collection error"
```bash
# Delete collection and retry
curl -X DELETE http://localhost:6333/collections/phase79_codebase
# Then re-run indexing
```

### Test 3 Fails: Error Pattern Indexing

**Issue:** "No error clusters found"
```bash
# Check if error_cluster table has data
psql -c "SELECT COUNT(*) FROM error_cluster WHERE file_path IS NOT NULL"
# If 0, insert test data as shown in Test 3.1
```

### Test 4 Fails: Phase 79 Integration

**Issue:** "Phase 79 script not found"
```bash
# Check file exists
ls -la scripts/phase79-cognitive-engine.mjs
# If missing, create from PHASE79_COGNITIVE_ENGINE_GUIDE.md
```

**Issue:** "RAG context not used"
```bash
# Check Phase 79 implementation calls search functions
grep -n "searchCodebase\|searchErrorPatterns" scripts/phase79-cognitive-engine.mjs
# Should have both calls
```

---

## Success Criteria

| Test | Criteria | Status |
|------|----------|--------|
| 1.1 | Database setup completes | ☐ |
| 1.2 | Document uploads successfully | ☐ |
| 1.3 | Search returns ≥1 result | ☐ |
| 1.4 | RAG generation works | ☐ |
| 2.1 | Codebase indexing completes | ☐ |
| 2.2 | Qdrant shows vectors | ☐ |
| 2.3 | Search returns results | ☐ |
| 3.1 | Error DB has data | ☐ |
| 3.2 | Error indexing completes | ☐ |
| 3.3 | Error search returns results | ☐ |
| 4.1 | Error file created | ☐ |
| 4.2 | Phase 79 uses RAG & applies patch | ☐ |
| 5.1-5.4 | All API endpoints work | ☐ |
| 6.1-6.4 | MinIO has files | ☐ |
| 7.1-7.3 | Performance acceptable | ☐ |
| 8.1-8.3 | Error handling graceful | ☐ |

**Overall Status:**

If **16/16 tests pass** ✅ → **RAG/KAG SYSTEM READY FOR PRODUCTION**

If <16 tests pass → Debug failures using troubleshooting guide above

---

## Continuous Testing

Add to CI/CD pipeline:

```yaml
# .github/workflows/rag-tests.yml
name: RAG/KAG Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      ollama:
        image: ollama/ollama
        options: --name ollama
      qdrant:
        image: qdrant/qdrant
        ports:
          - 6333:6333
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: 123456
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run knowledge:setup
      - run: npm run index:codebase ./src
      - run: npm run index:errors
      - run: npm test
```

---

## Completion

Once all tests pass, RAG/KAG system is **production-ready**!

Next steps:
1. Deploy to staging environment
2. Monitor error reduction metrics
3. Tune similarity thresholds based on real data
4. Expand knowledge base with more documents
5. Integrate Phase 72 and Phase 80 components

