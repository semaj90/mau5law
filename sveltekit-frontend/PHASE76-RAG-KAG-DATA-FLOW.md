# 🔍 Phase 76 RAG/KAG Deep Dive: Complete Data Flow
**Search Query**: `webcrawl parse sort index minio couchdb postgresql pgvector qdrant mirrored search faiss hwsw cosine similarity results knowledge base`

---

## 📊 Data Flow Architecture

```
┌─────────────────┐
│  WEB CRAWL      │  Firecrawl API (phase76-knowledge-builder.mjs)
│  firecrawl.mjs  │  → Crawls documentation sites (kit.svelte.dev, etc.)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PARSE          │  langextract Docker (port 8095)
│  langextract    │  → Extracts text from PDFs/HTML
│  docling        │  → Structured chunking (semantic boundaries)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  STORE RAW      │  MinIO (localhost:9000)
│  minio_fetch    │  Buckets:
│                 │  - legal-documents (raw PDFs)
│                 │  - text-summaries (parsed text)
│                 │  - phase76-knowledge (KB exports)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  EMBED          │  Ollama embeddinggemma:latest (768D)
│  ollama         │  → Generate vector embeddings
│  embeddings     │  → Batch processing (50 chunks at a time)
└────────┬────────┘
         │
         ├─────────────────────────┬─────────────────────────┐
         │                         │                         │
         ↓                         ↓                         ↓
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  QDRANT      │         │  POSTGRES    │         │  COUCHDB     │
│  Vector DB   │◀────────│  pgvector    │         │  Doc Store   │
│  15 colls    │ mirror  │  HNSW index  │         │  phase76 DB  │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │                        │                        │
       └────────────┬───────────┴────────────────────────┘
                    │
                    ↓
           ┌────────────────┐
           │  KNOWLEDGE     │  knowledge_graph table
           │  GRAPH         │  - nodes: errors, patterns, files
           │  (KAG)         │  - edges: caused_by, fixed_by, similar_to
           └────────┬───────┘
                    │
                    ↓
           ┌────────────────┐
           │  REDIS CACHE   │  phase76:semantic:${hash}
           │  Search Cache  │  - Cached similarity results
           └────────┬───────┘
                    │
                    ↓
           ┌────────────────┐
           │  PHASE87       │  Autonomous Error Fixer
           │  AUTONOMOUS    │  - Priority queue via impact_score
           │  FIXER         │  - HNSW + Qdrant cosine search
           │                │  - Auto-apply if confidence >0.85
           └────────────────┘
```

---

## 🔄 Component Details

### 1. WEBCRAWL (Data Acquisition)

**File**: `scripts/phase76-knowledge-builder.mjs` (Lines 47-200)

**Purpose**: Fetch documentation from official sources

**Implementation**:
```javascript
import { FirecrawlApp } from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

async function crawlDocs(urls) {
  for (const url of urls) {
    const response = await firecrawl.scrapeUrl(url, {
      pageOptions: {
        onlyMainContent: true,
        includeHtml: false,
        includeRawHtml: false
      }
    });

    // Store raw HTML in MinIO
    await storeInMinio('phase76-docs', url, response.markdown);

    // Parse and chunk
    const chunks = await parseAndChunk(response.markdown);

    // Embed each chunk
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      await storeVector(embedding, chunk);
    }
  }
}
```

**Firecrawl Features**:
- ✅ JavaScript rendering (Puppeteer-based)
- ✅ Main content extraction (removes nav/footer)
- ✅ Rate limiting (automatic retry)
- ✅ Sitemap crawling (recursive depth control)

**Example Crawl Targets**:
- `https://kit.svelte.dev/docs` → SvelteKit 2.0 docs
- `https://svelte.dev/docs/introduction` → Svelte 5 docs
- `https://www.typescriptlang.org/docs/` → TypeScript 5.6 docs

**Storage**:
- **MinIO Bucket**: `phase76-docs`
- **CouchDB DB**: `phase76` (metadata + crawl status)

---

### 2. PARSE (Document Processing)

**File**: `scripts/phase76-knowledge-builder.mjs` + `langextract` Docker

**Purpose**: Convert raw HTML/PDF → structured text chunks

#### langextract Docker Container
**Port**: 8095
**Image**: Custom (docling + pypdf + BeautifulSoup)
**Endpoints**:
- `POST /langextract/analyze` - Parse PDF
- `POST /langextract/chunk` - Smart chunking

**Features**:
- ✅ PDF table extraction
- ✅ Semantic chunking (paragraph boundaries)
- ✅ Metadata extraction (title, author, dates)

**Example Call**:
```javascript
const response = await fetch('http://localhost:8095/langextract/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_path: 'legal-doc.pdf',
    extract_tables: true
  })
});

const { text, tables, metadata } = await response.json();
```

#### Semantic Chunking Strategy
**File**: `scripts/phase76-knowledge-builder.mjs` (Lines 300-400)

```javascript
function smartChunk(text, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}
```

**Chunk Metadata**:
```json
{
  "chunk_id": "abc123",
  "source_url": "https://kit.svelte.dev/docs",
  "chunk_index": 5,
  "total_chunks": 42,
  "section_title": "Routing",
  "tokens": 250,
  "created_at": "2025-12-27T..."
}
```

**Storage**:
- **MinIO**: `text-summaries` bucket (raw chunks)
- **Postgres**: `chunks` table (metadata)
- **Qdrant**: Embedded chunks (vectors)

---

### 3. SORT (Metadata Indexing)

**Purpose**: Organize chunks by relevance, recency, source

#### PostgreSQL Sorting
**File**: `scripts/phase76-storage-layer.mjs` (Lines 50-150)

**Tables**:
```sql
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,  -- 'web', 'pdf', 'code'
  section_title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  token_count INTEGER,
  relevance_score DECIMAL(5,2) DEFAULT 0.0,  -- Computed from user feedback
  access_count INTEGER DEFAULT 0             -- Popularity metric
);

CREATE INDEX idx_chunks_relevance ON chunks(relevance_score DESC);
CREATE INDEX idx_chunks_created ON chunks(created_at DESC);
CREATE INDEX idx_chunks_source ON chunks(source_type, source_url);
```

#### Multi-Criteria Sorting
```javascript
async function getSortedChunks(options = {}) {
  const {
    sortBy = 'relevance',  // 'relevance', 'recency', 'popularity'
    sourceType = null,
    limit = 10
  } = options;

  let orderClause;
  switch (sortBy) {
    case 'relevance':
      orderClause = 'ORDER BY relevance_score DESC, created_at DESC';
      break;
    case 'recency':
      orderClause = 'ORDER BY created_at DESC';
      break;
    case 'popularity':
      orderClause = 'ORDER BY access_count DESC, relevance_score DESC';
      break;
  }

  const query = `
    SELECT * FROM chunks
    WHERE ($1::TEXT IS NULL OR source_type = $1)
    ${orderClause}
    LIMIT $2
  `;

  return await pool.query(query, [sourceType, limit]);
}
```

#### CouchDB Sorting Views
**Database**: `phase76`
**Design Doc**: `_design/phase76`

**Views**:
```javascript
// By priority (urgency * relevance)
function(doc) {
  if (doc.type === 'chunk') {
    const priority = doc.urgency * doc.relevance_score;
    emit(priority, doc);
  }
}

// By status (for migration tracking)
function(doc) {
  if (doc.type === 'migration_task') {
    emit([doc.status, doc.priority], doc);
  }
}

// By source type
function(doc) {
  if (doc.source_type) {
    emit([doc.source_type, doc.created_at], doc);
  }
}
```

**Query Example**:
```bash
# Top 10 high-priority chunks
curl http://localhost:5984/phase76/_design/phase76/_view/by_priority?descending=true&limit=10

# All Svelte 5 docs
curl "http://localhost:5984/phase76/_design/phase76/_view/by_source?key=\"svelte5\""
```

---

### 4. INDEX (Vector + Full-Text)

#### 4.1 Qdrant Vector Index
**URL**: http://localhost:6333
**Collections**: 15 (55,561 vectors)

**Schema**:
```javascript
{
  collection_name: 'phase76_knowledge_base',
  vectors: {
    size: 768,
    distance: 'Cosine'  // Cosine similarity
  },
  optimizers_config: {
    indexing_threshold: 20000
  },
  hnsw_config: {
    m: 16,                // Number of connections per node
    ef_construct: 200,    // Construction quality
    full_scan_threshold: 10000
  }
}
```

**HNSW (Hierarchical Navigable Small World)**:
- **Purpose**: Sub-millisecond approximate nearest neighbor search
- **Algorithm**: Graph-based index (layers of skip lists)
- **Trade-off**: 99% accuracy, 100x faster than brute-force
- **Memory**: ~1.5 MB per 10,000 768D vectors

**Indexing Code**:
```javascript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

await qdrant.createCollection('phase76_knowledge_base', {
  vectors: {
    size: 768,
    distance: 'Cosine'
  }
});

// Batch upsert
const points = chunks.map((chunk, idx) => ({
  id: idx + 1,
  vector: chunk.embedding,  // 768D array
  payload: {
    content: chunk.text,
    source_url: chunk.url,
    section: chunk.section,
    created_at: chunk.timestamp
  }
}));

await qdrant.upsert('phase76_knowledge_base', {
  wait: true,
  points
});
```

#### 4.2 PostgreSQL pgvector Index
**Extension**: pgvector
**Index Type**: HNSW
**Distance Metric**: Cosine

**Schema**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE error_embeddings (
  error_id INTEGER REFERENCES ts_errors(id),
  embedding vector(768),  -- 768-dimensional vector
  model TEXT NOT NULL DEFAULT 'embeddinggemma:latest',
  created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for cosine similarity
CREATE INDEX ON error_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Search Query**:
```sql
-- Find 5 most similar errors
SELECT
  ts.error_code,
  ts.error_message,
  1 - (ee1.embedding <=> ee2.embedding) AS similarity
FROM error_embeddings ee1
JOIN error_embeddings ee2 ON ee1.error_id != ee2.error_id
JOIN ts_errors ts ON ts.id = ee2.error_id
WHERE ee1.error_id = 42
ORDER BY ee1.embedding <=> ee2.embedding  -- Cosine distance operator
LIMIT 5;
```

**HNSW Parameters**:
- `m = 16`: Number of neighbors per node (default: 16, range: 4-128)
- `ef_construction = 64`: Quality during index build (higher = better, slower)
- `ef_search = 40`: Quality during search (set per query)

#### 4.3 Full-Text Index (Postgres)
**Extension**: pg_trgm (trigram similarity)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for full-text search
CREATE INDEX idx_chunks_content_gin ON chunks
USING gin (content gin_trgm_ops);

-- Search query
SELECT *, similarity(content, 'TypeScript error handling') AS score
FROM chunks
WHERE content % 'TypeScript error handling'  -- Trigram match
ORDER BY score DESC
LIMIT 10;
```

---

### 5. MIRRORED SEARCH (Qdrant ↔ Postgres)

**Purpose**: Redundancy + fallback when Qdrant unavailable

**File**: `scripts/phase76-storage-layer.mjs` (Lines 200-300)

**Implementation**:
```javascript
async function hybridSearch(query, options = {}) {
  const { limit = 10, threshold = 0.7, fallback = true } = options;

  // Generate embedding
  const embedding = await generateEmbedding(query);

  // Try Qdrant first (faster)
  try {
    const qdrantResults = await qdrant.search('phase76_knowledge_base', {
      vector: embedding,
      limit,
      score_threshold: threshold,
      with_payload: true
    });

    if (qdrantResults.length > 0) {
      return { source: 'qdrant', results: qdrantResults };
    }
  } catch (e) {
    console.warn('Qdrant unavailable, falling back to Postgres...');
  }

  // Fallback to Postgres pgvector
  if (fallback) {
    const pgResults = await pool.query(`
      SELECT
        c.id,
        c.content,
        1 - (ee.embedding <=> $1::vector) AS score
      FROM error_embeddings ee
      JOIN chunks c ON c.id = ee.error_id
      WHERE 1 - (ee.embedding <=> $1::vector) > $2
      ORDER BY ee.embedding <=> $1::vector
      LIMIT $3
    `, [JSON.stringify(embedding), threshold, limit]);

    return { source: 'postgres', results: pgResults.rows };
  }

  return { source: 'none', results: [] };
}
```

**Sync Strategy**:
```javascript
// Phase87: Sync Qdrant → Postgres (hourly cron job)
async function syncQdrantToPostgres() {
  const collections = await qdrant.getCollections();

  for (const coll of collections.collections) {
    const { points } = await qdrant.scroll(coll.name, {
      limit: 1000,
      with_payload: true,
      with_vector: true
    });

    for (const point of points) {
      await pool.query(`
        INSERT INTO qdrant_mirror (collection, point_id, vector, payload)
        VALUES ($1, $2, $3::vector, $4)
        ON CONFLICT (collection, point_id) DO UPDATE
        SET vector = EXCLUDED.vector, payload = EXCLUDED.payload
      `, [coll.name, point.id, JSON.stringify(point.vector), point.payload]);
    }
  }
}
```

---

### 6. FAISS (Not Currently Used)

**Note**: FAISS is **not implemented** in your stack. You're using **HNSW** instead.

**Why HNSW > FAISS for Your Use Case**:

| Feature | HNSW (Qdrant/pgvector) | FAISS |
|---------|------------------------|-------|
| Language | Native (Rust/C++) | Python (ctypes) |
| Persistence | Database-backed | File-based |
| Updates | Real-time | Requires rebuild |
| Concurrency | Multi-client safe | Single-process |
| Memory | Efficient (lazy load) | All in RAM |

**If you need FAISS later**, integration example:
```python
# scripts/faiss-indexer.py (NOT CURRENTLY IMPLEMENTED)
import faiss
import numpy as np

# Load embeddings from Postgres
embeddings = np.array(fetch_all_embeddings())  # Shape: (N, 768)

# Create HNSW index
index = faiss.IndexHNSWFlat(768, 32)  # m=32
index.hnsw.efConstruction = 200
index.add(embeddings)

# Save to disk
faiss.write_index(index, 'data/phase76_faiss.index')

# Search
query_vec = np.array([embedding_for('TypeScript error')])
distances, indices = index.search(query_vec, k=10)
```

**Current Decision**: Stick with Qdrant HNSW (no Python dependency, database-backed)

---

### 7. COSINE SIMILARITY (Distance Metric)

**Formula**:
```
cosine_similarity(A, B) = (A · B) / (||A|| * ||B||)

Where:
- A · B = dot product (sum of element-wise products)
- ||A|| = Euclidean norm (sqrt of sum of squares)

Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)
```

**Why Cosine > Euclidean for Embeddings**:
- ✅ Invariant to magnitude (only direction matters)
- ✅ Better for high-dimensional sparse vectors
- ✅ Matches how neural networks compare concepts

**Implementation in Qdrant**:
```javascript
// Qdrant automatically uses cosine when configured
await qdrant.createCollection('phase76_knowledge_base', {
  vectors: {
    size: 768,
    distance: 'Cosine'  // Options: 'Cosine', 'Euclid', 'Dot'
  }
});
```

**Implementation in Postgres**:
```sql
-- pgvector operator: <=> (cosine distance)
-- Distance = 1 - similarity
SELECT 1 - (vec1 <=> vec2) AS similarity
FROM ...
ORDER BY vec1 <=> vec2  -- Sort by distance (lower = more similar)
```

**Practical Example**:
```javascript
// Error message: "Type 'string' is not assignable to type 'number'"
const embedding1 = [0.12, -0.34, 0.56, ...];  // 768D

// Similar error: "Argument of type 'string' is not assignable to parameter of type 'number'"
const embedding2 = [0.15, -0.32, 0.58, ...];  // 768D

cosine_similarity(embedding1, embedding2) = 0.94  // Very similar!

// Unrelated error: "Cannot find module 'react'"
const embedding3 = [-0.78, 0.22, -0.11, ...];  // 768D

cosine_similarity(embedding1, embedding3) = 0.12  // Not similar
```

---

### 8. KNOWLEDGE BASE (Multi-Tier)

#### Tier 1: Qdrant (Fast Semantic Search)
**Collections**:
- `phase72_ast_knowledge_base` (14 surgical patterns)
- `phase72_error_patterns` (53,227 historical errors)
- `phase76_knowledge_base` (35 docs)
- `surgical_fixes_phase66_85` (48 OpenAI patterns)

**Access Pattern**:
```javascript
// Fast lookup for known patterns
const results = await qdrant.search('phase72_ast_knowledge_base', {
  vector: errorEmbedding,
  limit: 5,
  score_threshold: 0.85
});

if (results[0].score > 0.85) {
  // High confidence: Apply known fix
  applySurgicalFix(results[0].payload.fix_pattern);
}
```

#### Tier 2: Postgres (Structured Metadata + Graph)
**Tables**:
- `ts_errors`: Error records with priority queue
- `error_embeddings`: HNSW index for similarity
- `knowledge_graph`: Relationships (error→pattern→fix)
- `fix_attempts`: Validation history

**Access Pattern**:
```javascript
// Get error with context
const error = await pool.query(`
  SELECT
    ts.*,
    array_agg(kg.target_id) AS related_patterns
  FROM ts_errors ts
  LEFT JOIN knowledge_graph kg ON kg.source_id = ts.id::text
  WHERE ts.id = $1
  GROUP BY ts.id
`, [errorId]);

// Find similar past errors
const similar = await pool.query(`
  SELECT
    ts2.error_code,
    ts2.error_message,
    fa.fix_strategy,
    fa.success,
    1 - (ee1.embedding <=> ee2.embedding) AS similarity
  FROM error_embeddings ee1
  JOIN error_embeddings ee2 ON ee1.error_id != ee2.error_id
  JOIN ts_errors ts2 ON ts2.id = ee2.error_id
  LEFT JOIN fix_attempts fa ON fa.error_id = ts2.id AND fa.success = true
  WHERE ee1.error_id = $1
  ORDER BY ee1.embedding <=> ee2.embedding
  LIMIT 10
`, [errorId]);
```

#### Tier 3: MinIO (Raw Documents)
**Buckets**:
- `legal-documents`: Source PDFs
- `text-summaries`: Parsed text
- `phase76-knowledge`: KB exports

**Access Pattern**:
```javascript
// Lazy load raw document when needed
if (needFullContext) {
  const rawDoc = await minioClient.getObject(
    'text-summaries',
    `svelte5-routing-docs.txt`
  );
  const fullText = await streamToString(rawDoc);
}
```

#### Tier 4: CouchDB (Migration Tracking)
**Design Docs**:
- `_design/phase76/_view/by_priority`
- `_design/phase76/_view/by_status`
- `_design/phase76/_view/recommendations`

**Access Pattern**:
```bash
# Get top 10 migration tasks
curl "http://localhost:5984/phase76/_design/phase76/_view/by_priority?descending=true&limit=10"
```

#### Tier 5: Redis (Hot Cache)
**Keys**:
- `phase76:semantic:${hash}`: Cached search results (TTL: 1 hour)
- `phase76:codebase:${pattern}`: Ripgrep results (TTL: 5 min)

**Access Pattern**:
```javascript
const cacheKey = `phase76:semantic:${hashQuery(query)}`;
let results = await redis.get(cacheKey);

if (!results) {
  results = await expensiveSemanticSearch(query);
  await redis.set(cacheKey, JSON.stringify(results), 'EX', 3600);
}
```

---

## 🎯 End-to-End Example: Autonomous Error Fixing

### Scenario: Fix TypeScript Error TS2345

**Error Record** (Postgres `ts_errors`):
```json
{
  "id": 42,
  "file_path": "src/routes/+page.server.ts",
  "line": 15,
  "column": 22,
  "error_code": "TS2345",
  "error_message": "Argument of type 'string' is not assignable to parameter of type 'number'",
  "impact_score": 7.5,
  "status": "open"
}
```

### Step 1: EMBED (Ollama)
```javascript
const embedding = await ollama.embeddings({
  model: 'embeddinggemma:latest',
  prompt: "Argument of type 'string' is not assignable to parameter of type 'number'"
});
// Result: [0.12, -0.34, 0.56, ..., 0.78]  // 768D
```

### Step 2: SEARCH QDRANT (Fast Semantic)
```javascript
const qdrantResults = await qdrant.search('phase72_ast_knowledge_base', {
  vector: embedding.embedding,
  limit: 5,
  score_threshold: 0.7
});

// Top result:
{
  "score": 0.92,
  "payload": {
    "pattern_id": "type-mismatch-string-number",
    "fix_strategy": "surgical",
    "fix_template": "Convert argument with Number(${arg}) or parseInt(${arg}, 10)",
    "confidence": 0.95
  }
}
```

### Step 3: SEARCH POSTGRES (HNSW Fallback)
```javascript
const pgResults = await pool.query(`
  SELECT
    ts.error_message,
    fa.fix_strategy,
    fa.confidence,
    1 - (ee1.embedding <=> ee2.embedding) AS similarity
  FROM error_embeddings ee1
  JOIN error_embeddings ee2 ON ee1.error_id != ee2.error_id
  JOIN ts_errors ts ON ts.id = ee2.error_id
  JOIN fix_attempts fa ON fa.error_id = ts.id AND fa.success = true
  WHERE ee1.error_id = 42
  ORDER BY ee1.embedding <=> ee2.embedding
  LIMIT 5
`, []);

// Top result (cosine similarity: 0.89):
{
  "error_message": "Type 'string' is not assignable to type 'number'",
  "fix_strategy": "Add explicit type conversion with Number()",
  "confidence": 0.88
}
```

### Step 4: CHECK KNOWLEDGE GRAPH
```javascript
const relationships = await pool.query(`
  SELECT target_type, target_id, relationship
  FROM knowledge_graph
  WHERE source_type = 'error' AND source_id = '42'
`, []);

// Results:
[
  { target_type: 'pattern', target_id: 'type-mismatch', relationship: 'caused_by' },
  { target_type: 'fix', target_id: 'surgical-type-conversion', relationship: 'fixed_by' }
]
```

### Step 5: READ FILE (FastMCP)
```javascript
const fileContent = await callAgent('read_file', {
  filepath: 'src/routes/+page.server.ts'
});

// Extract line 15:
const lines = fileContent.content.split('\n');
const errorLine = lines[14];  // 0-indexed
// "const result = processData(userId);"
```

### Step 6: APPLY FIX (Surgical)
```javascript
// Use ripgrep to find all usages
const usages = await callAgent('search_codebase', {
  pattern: 'processData\\(',
  filePattern: '*.ts'
});

// Apply fix at line 15
const fixedLine = "const result = processData(Number(userId));";
const newContent = lines.slice(0, 14)
  .concat([fixedLine])
  .concat(lines.slice(15))
  .join('\n');

await callAgent('write_file', {
  filepath: 'src/routes/+page.server.ts',
  content: newContent
});
```

### Step 7: VALIDATE (TSC Recount)
```javascript
const before = await callAgent('run_command', {
  command: 'npx tsc --noEmit 2>&1 | grep "Found" | awk \'{print $2}\''
});
// Before: "33,599"

const after = await callAgent('run_command', {
  command: 'npx tsc --noEmit 2>&1 | grep "Found" | awk \'{print $2}\''
});
// After: "33,598"

const success = parseInt(after.stdout) < parseInt(before.stdout);
```

### Step 8: UPDATE KNOWLEDGE BASE
```javascript
// Record fix attempt
await pool.query(`
  INSERT INTO fix_attempts (error_id, fix_strategy, confidence, tsc_before, tsc_after, success)
  VALUES ($1, $2, $3, $4, $5, $6)
`, [42, 'surgical', 0.92, 33599, 33598, true]);

// Update knowledge graph
await pool.query(`
  INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relationship)
  VALUES ('error', '42', 'pattern', 'type-mismatch-string-number', 'fixed_by')
`, []);

// Update error status
await pool.query(`
  UPDATE ts_errors
  SET status = 'fixed'
  WHERE id = 42
`, []);

// Add successful pattern to Qdrant (for future searches)
await qdrant.upsert('phase72_ast_knowledge_base', {
  points: [{
    id: Date.now(),
    vector: embedding.embedding,
    payload: {
      error_code: 'TS2345',
      fix_strategy: 'surgical',
      fix_template: 'Number(${arg})',
      confidence: 0.92,
      validated_at: new Date().toISOString()
    }
  }]
});
```

### Step 9: CACHE RESULT (Redis)
```javascript
await redis.set(
  `phase76:semantic:${hashQuery('TS2345 string to number')}`,
  JSON.stringify({
    pattern_id: 'type-mismatch-string-number',
    fix_template: 'Number(${arg})',
    confidence: 0.92
  }),
  'EX',
  3600  // 1 hour TTL
);
```

---

## 📊 Performance Metrics

**Qdrant HNSW Search**: 5-10ms for 55K vectors
**Postgres pgvector Search**: 20-50ms for 100 embeddings
**Redis Cache Hit**: <1ms
**Ollama Embedding**: 50-100ms per text
**Full Pipeline**: 200-500ms per error

**Throughput**: ~5-10 errors/second (limited by TSC validation)

---

## 🔧 Quick Start Commands

```powershell
# 1. Start all services
docker-compose -f docker-compose.phase76.yml up -d

# 2. Verify services
.\scripts\check-phase79-status.mjs

# 3. Start FastMCP server
node scripts/fastmcp-server.mjs

# 4. Run autonomous fixer
node scripts/phase87-autonomous-fixer.mjs

# 5. Monitor progress
watch -n 5 'psql -U user -h 127.0.0.1 -p 5434 -d legal -c "SELECT status, COUNT(*) FROM ts_errors GROUP BY status"'
```

---

## 📚 Related Files

- **Architecture Docs**: `PHASE76-87-RAG-KAG-ARCHITECTURE.md`
- **FastMCP Server**: `scripts/fastmcp-server.mjs`
- **Phase 87 Fixer**: `scripts/phase87-autonomous-fixer.mjs`
- **Knowledge Builder**: `scripts/phase76-knowledge-builder.mjs`
- **Storage Layer**: `scripts/phase76-storage-layer.mjs`
- **Test Script**: `quick-fastmcp-test.ps1`
