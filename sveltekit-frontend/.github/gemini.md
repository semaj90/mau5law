# Google Gemini Context: Phase 72 Knowledge Base & Embedding Pipeline

## Mission: Semantic Error Clustering with Ollama + Qdrant

### Architecture Overview
```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  TypeScript     │      │   Ollama     │      │    Qdrant       │
│  Compiler       │─────>│  gemma:latest│─────>│  Vector Store   │
│  (tsc errors)   │      │  Embeddings  │      │  (similarity)   │
└─────────────────┘      └──────────────┘      └─────────────────┘
         │                       │                       │
         │                       │                       │
         v                       v                       v
  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
  │ errors.jsonl│        │ embeddings  │        │ clusters.json│
  │ (19,821)    │        │ (768-dim)   │        │ (auto-tagged)│
  └─────────────┘        └─────────────┘        └─────────────┘
```

---

## 📊 Error Analysis: submitWithProgress.ts

### File Metadata
- **Path**: `src/lib/api/submitWithProgress.ts`
- **Type**: TypeScript utility module
- **LOC**: 32 lines (including comments)
- **Dependencies**: `./xhr` (uploadWithXhr type import)
- **Consumers**: 2 routes (evidenceboard, upload-demo)

### Error Pattern (Historical)
**Corruption Type**: Mojibake UTF-8 encoding
**Detected**: 2025-12-18 (backups in `.phase72-backups/`)
**Fixed**: 2025-12-18 via `mojibake-cleanup.mjs`
**Status**: ✅ CLEAN (current version has no syntax errors)

### Syntax Error Breakdown
```
# Before Fix (Backup):
Line 3: status: number: responseText? , string
        ├─ Issue 1: Double colon (should be semicolon)
        ├─ Issue 2: Missing property separator after `status`
        ├─ Issue 3: Extra comma before `string`
        └─ Issue 4: Missing `string` keyword context

# After Fix (Current):
Line 3: status: number;
Line 4: responseText?: string;
        ├─ ✅ Correct semicolon separator
        ├─ ✅ Proper optional property syntax
        └─ ✅ Clean type definition
```

---

## 🧠 Ollama Embedding Strategy

### Model Configuration
```javascript
// Embedding generation
const ollamaConfig = {
  model: 'gemma:latest',           // Google Gemma 2B (optimized for semantic tasks)
  endpoint: 'http://localhost:11434/api/embeddings',
  dimension: 768,                  // Verify with: curl http://localhost:11434/api/show -d '{"name":"gemma:latest"}'
  batchSize: 32,                   // Process 32 error signatures at once
  timeout: 30000                   // 30 second timeout per batch
};
```

### Error Signature Embedding Pipeline
```javascript
// scripts/embed-error-signatures.mjs
import ollama from 'ollama';
import { computeSignature } from './kag-fix-store.mjs';

async function embedErrorBatch(errors) {
  const signatures = errors.map(e => computeSignature(e));

  const embeddings = await Promise.all(
    signatures.map(async (sig) => {
      const response = await ollama.embeddings({
        model: 'gemma:latest',
        prompt: `${sig.tool} error in ${sig.fileExt} file: ${sig.message}\nContext: ${sig.code}`
      });

      return {
        signature: sig.sig,
        embedding: response.embedding,  // Float32Array (768-dim)
        metadata: {
          file: sig.file,
          tool: sig.tool,
          fileExt: sig.fileExt,
          message: sig.message
        }
      };
    })
  );

  return embeddings;
}
```

### Prompt Engineering for Error Embeddings
```
Input Format:
  "tsc error in ts file: error ts(X,Y) *.ts ; expected
   Context: export type SubmitResult = { status: number: responseText?"

Output: 768-dimensional vector capturing:
  - Error type (syntax, type, import)
  - File type (ts, js, svelte)
  - Contextual code pattern
  - Semantic similarity to other errors
```

---

## 🎯 Qdrant Integration

### Collection Schema
```javascript
// scripts/setup-qdrant-collection.mjs
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

await qdrant.createCollection('phase72_error_signatures', {
  vectors: {
    size: 768,              // Match gemma:latest dimension
    distance: 'Cosine'      // Semantic similarity metric
  },
  optimizers_config: {
    memmap_threshold: 20000  // Optimize for 20k+ vectors
  },
  quantization_config: {
    scalar: {
      type: 'int8',         // Reduce memory footprint
      quantile: 0.99        // Preserve 99% precision
    }
  }
});
```

### Payload Schema (Metadata)
```javascript
{
  id: "86fb84dcb19c898f...",        // SHA-256 signature hash
  vector: [0.123, -0.456, ...],     // 768-dim embedding
  payload: {
    signature: "86fb84dcb...",       // Full signature
    file: "src/lib/api/submitWithProgress.ts",
    tool: "tsc",                     // Compiler: tsc | svelte-check
    fileExt: "ts",                   // File extension
    category: "syntax",              // Auto-tagged: syntax | import | type | migration
    errorCode: "TS1005",             // TypeScript error code
    message: "error ts(X,Y) *.ts ; expected",
    fixApplied: true,                // Has verified fix in KAG
    confidence: 1.0,                 // Fix confidence (0.0-1.0)
    appliedAt: "2025-12-18T04:51:43.714Z",
    successCount: 1,                 // Times fix worked
    tier: 1,                         // Fix tier (1=safe, 2=medium, 3=risky)

    // Context
    contextBefore: "export type SubmitResult = { ",
    contextAfter: ": responseText?: string };",

    // Index rank (priority)
    indexRank: 10,                   // 10=production, 7=lib, 3=parked, 1=backup
    isProduction: true,              // In active routes
    usageCount: 2                    // Used in 2 locations
  }
}
```

---

## 🏷️ Auto-Tagging Strategy

### Category Classification
```javascript
// scripts/auto-tag-errors.mjs
function classifyError(sig, embedding) {
  const categories = {
    syntax: ['TS1005', 'TS1128', 'TS1109'],        // Missing punctuation
    import: ['TS2305', 'TS2307', 'TS7016'],        // Cannot find module
    type: ['TS2322', 'TS2339', 'TS2345'],          // Type mismatch
    migration: ['TS2564', 'TS2531', 'TS18048']     // Svelte 4→5, strict mode
  };

  // Rule-based classification
  for (const [category, codes] of Object.entries(categories)) {
    if (sig.message.match(new RegExp(codes.join('|')))) {
      return category;
    }
  }

  // Semantic classification (if no rule matches)
  return await semanticClassify(embedding);
}

async function semanticClassify(embedding) {
  // Query Qdrant for nearest neighbors
  const results = await qdrant.search('phase72_error_signatures', {
    vector: embedding,
    limit: 5,
    with_payload: true
  });

  // Vote: Most common category among top 5 neighbors
  const votes = results.map(r => r.payload.category);
  return mode(votes); // Most frequent category
}
```

### Index Rank Calculation
```javascript
function calculateIndexRank(file, usageCount, fixApplied) {
  let rank = 0;

  // Production routes: +10
  if (file.startsWith('src/routes/') && !file.includes('routes_parked')) {
    rank += 10;
  }

  // API utilities: +7
  if (file.startsWith('src/lib/api/')) {
    rank += 7;
  }

  // Parked routes: +3
  if (file.includes('routes_parked') || file.includes('archive')) {
    rank += 3;
  }

  // Backups: +1
  if (file.includes('.phase72-backups') || file.includes('backups/')) {
    rank += 1;
  }

  // Usage multiplier
  rank += Math.min(usageCount, 5); // Cap at +5

  // Fix applied bonus
  if (fixApplied) {
    rank += 2;
  }

  return rank;
}
```

---

## 🔍 Semantic Search Examples

### Query 1: Find Similar Syntax Errors
```javascript
// User submits new error: "expected ';' after property"
const queryEmbedding = await ollama.embeddings({
  model: 'gemma:latest',
  prompt: 'tsc error in ts file: expected ; after property'
});

const similar = await qdrant.search('phase72_error_signatures', {
  vector: queryEmbedding.embedding,
  limit: 10,
  filter: {
    must: [
      { key: 'category', match: { value: 'syntax' } },
      { key: 'fixApplied', match: { value: true } }
    ]
  }
});

// Returns: submitWithProgress.ts error + 9 other similar syntax errors with verified fixes
```

### Query 2: Find Errors in API Utilities
```javascript
const results = await qdrant.scroll('phase72_error_signatures', {
  filter: {
    must: [
      { key: 'file', match: { text: 'src/lib/api/' } },
      { key: 'confidence', range: { gte: 0.95 } }
    ]
  },
  limit: 100
});

// Returns: All high-confidence fixes in src/lib/api/ directory
```

### Query 3: Cluster Errors by Semantic Similarity
```javascript
// Get all embeddings
const allErrors = await qdrant.scroll('phase72_error_signatures', { limit: 19821 });

// K-means clustering on embeddings
const clusters = kmeans(
  allErrors.map(e => e.vector),
  k = 20  // 20 semantic clusters
);

// Auto-tag each cluster
clusters.forEach((cluster, i) => {
  const commonCategory = mode(cluster.points.map(p => p.payload.category));
  console.log(`Cluster ${i}: ${commonCategory} (${cluster.points.length} errors)`);
});
```

---

## 📈 Knowledge Base Metrics

### Current Statistics
```
Phase 72 KAG (Redis):
  - Total Signatures: 2 (as of 2025-12-18)
  - Verified Fixes: 2
  - Confidence Range: 0.95 - 1.0
  - Average Fix Time: 3,069s CPU time
  - Memory Usage: 1.4GB

Qdrant Vector Store (Planned):
  - Target Signatures: 19,821 (from errors.jsonl)
  - Embeddings Generated: 0 (pending pipeline execution)
  - Expected Storage: ~60MB (768-dim float32 × 19,821)
  - Query Time: <50ms (with indexing)
```

### Performance Targets
```
Embedding Generation:
  - Throughput: 100 errors/sec (batch size 32)
  - Total Time: ~3-5 minutes for 19,821 errors
  - Memory: <2GB peak

Qdrant Indexing:
  - Insert Rate: 1000 vectors/sec
  - Total Time: ~20 seconds for 19,821 vectors
  - Disk Storage: ~60MB (vectors) + ~20MB (metadata)

Query Performance:
  - Similarity Search: <50ms (top 10)
  - Filtered Search: <100ms (top 100)
  - Full Scan: <500ms (all 19,821)
```

---

## 🚀 Execution Plan: End-to-End Pipeline

### Step 1: Generate Embeddings
```bash
# scripts/embed-error-signatures.mjs
node scripts/embed-error-signatures.mjs \
  --input errors.jsonl \
  --output embeddings.jsonl \
  --model gemma:latest \
  --batch-size 32
```

**Output**:
```jsonl
{"sig":"86fb84dcb...","embedding":[0.123,-0.456,...],"metadata":{...}}
{"sig":"4e86ac2b6...","embedding":[0.789,-0.012,...],"metadata":{...}}
...
```

### Step 2: Auto-Tag Categories
```bash
# scripts/auto-tag-errors.mjs
node scripts/auto-tag-errors.mjs \
  --input embeddings.jsonl \
  --output tagged.jsonl \
  --rules scripts/tagging-rules.json
```

**Output**:
```jsonl
{"sig":"86fb84dcb...","category":"syntax","indexRank":10,...}
{"sig":"4e86ac2b6...","category":"import","indexRank":7,...}
...
```

### Step 3: Upload to Qdrant
```bash
# scripts/upload-to-qdrant.mjs
node scripts/upload-to-qdrant.mjs \
  --input tagged.jsonl \
  --collection phase72_error_signatures \
  --batch-size 100
```

**Output**:
```
✅ Uploaded 19,821 vectors to Qdrant
✅ Created HNSW index (M=16, ef_construct=200)
✅ Query performance: 42ms (avg)
```

### Step 4: Create Knowledge Base Index
```bash
# scripts/create-kb-index.mjs
node scripts/create-kb-index.mjs \
  --source qdrant \
  --output knowledge-base/index.json \
  --include-summaries
```

**Output**:
```json
{
  "totalErrors": 19821,
  "categories": {
    "syntax": 8234,
    "import": 4521,
    "type": 5123,
    "migration": 1943
  },
  "topFiles": [
    {"file": "src/lib/api/submitWithProgress.ts", "errors": 4, "rank": 10},
    ...
  ],
  "indexRankDistribution": {
    "10": 1234,  // Production routes
    "7": 2345,   // API utilities
    "3": 890,    // Parked routes
    "1": 567     // Backups
  }
}
```

---

## 📝 Codebase Indexer Implementation

### File Scanner
```javascript
// scripts/codebase-indexer.mjs
import { glob } from 'glob';
import { computeSignature } from './kag-fix-store.mjs';

async function indexCodebase() {
  const files = await glob('src/**/*.{ts,js,svelte}', {
    ignore: ['**/*.spec.ts', '**/node_modules/**', '**/.phase72-backups/**']
  });

  const index = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const errors = await getErrorsForFile(file); // From errors.jsonl

    const signatures = errors.map(e => computeSignature(e));
    const embeddings = await embedErrorBatch(errors);

    index.push({
      file,
      loc: content.split('\n').length,
      errors: errors.length,
      signatures: signatures.map(s => s.sig),
      indexRank: calculateIndexRank(file, getUsageCount(file), hasFixInKAG(file)),
      embeddings: embeddings.map(e => e.signature)
    });
  }

  await fs.writeFile('knowledge-base/codebase-index.json', JSON.stringify(index, null, 2));
}
```

---

## 🎯 Next Steps Checklist

- [ ] **Install Ollama** (if not already installed)
  ```bash
  # Download from: https://ollama.ai
  ollama pull gemma:latest
  ```

- [ ] **Verify Embedding Dimension**
  ```bash
  curl http://localhost:11434/api/show -d '{"name":"gemma:latest"}'
  # Check "parameters" → "embedding_dim" (should be 768)
  ```

- [ ] **Install Qdrant**
  ```bash
  docker run -p 6333:6333 qdrant/qdrant
  # Or download: https://qdrant.tech/documentation/quick-start/
  ```

- [ ] **Generate Embeddings**
  ```bash
  node scripts/embed-error-signatures.mjs --input errors.jsonl
  ```

- [ ] **Upload to Qdrant**
  ```bash
  node scripts/upload-to-qdrant.mjs --input embeddings.jsonl
  ```

- [ ] **Create Knowledge Base**
  ```bash
  node scripts/create-kb-index.mjs --source qdrant
  ```

- [ ] **Test Semantic Search**
  ```bash
  node scripts/test-semantic-search.mjs --query "missing semicolon in type definition"
  ```

---

**Prepared For**: Google Gemini AI
**Context Type**: Semantic clustering, embedding pipelines, knowledge base indexing
**Model**: gemma:latest (Google Gemma 2B)
**Last Updated**: 2025-12-18
**Phase**: 72 (KAG Population + Semantic Error Analysis)
**Status**: ✅ Redis KAG operational | ⏳ Qdrant pipeline pending
