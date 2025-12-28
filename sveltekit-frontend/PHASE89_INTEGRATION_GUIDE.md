# Phase 89: Enhanced Integration Quick Reference
## Redis Cache, CUDA Tagging, RRF Fusion & Streaming

> **Updated**: Post-integration enhancement guide
> **Related**: See `PHASE89_QUICK_REFERENCE.md` for system startup

---

## 🚀 Quick Start

### 1. Verify Integration
```powershell
.\scripts\phase89-verify-integration.ps1
```

### 2. Test Embedding Cache
```bash
node scripts/phase89-raw-text-embedder.mjs
# Run again to see cache hits
node scripts/phase89-raw-text-embedder.mjs
```

### 3. Test Retrieval Cache
```bash
node scripts/phase89-similarity-ranker.mjs "TS2345"
# Run again for instant results
node scripts/phase89-similarity-ranker.mjs "TS2345"
```

### 4. Scan for CUDA Patterns
```bash
node scripts/phase89-cuda-scan.mjs --path ./src
```

### 5. Start MCP Server
```bash
node scripts/phase89-fastmcp-tools.mjs
```

---

## 📚 New Library Modules

### `phase89-cache.mjs` - Redis Utilities
```javascript
import { sha256, redisFromEnv, getJson, setJson } from './lib/phase89-cache.mjs';

const redis = redisFromEnv();
const hash = sha256('some text');

// Get cached value
const data = await getJson(redis, 'mykey');

// Set cached value (1 hour TTL)
await setJson(redis, 'mykey', { foo: 'bar' }, 3600);
```

### `phase89-cuda-tags.mjs` - Pattern Detection
```javascript
import { extractTags, cudaTags } from './lib/phase89-cuda-tags.mjs';

const code = '__global__ void kernel() { }';
const tags = cudaTags(code);
// => ['cuda:kernel-launch', 'cuda:device-code']

const allTags = extractTags(code, 'kernel.cu');
// => [...cuda tags, ...file tags]
```

### `phase89-embed.mjs` - Cached Embeddings
```javascript
import { embedCached } from './lib/phase89-embed.mjs';

const embedding = await embedCached({
  rds: redis,
  text: 'TypeScript error TS2345',
  model: 'embeddinggemma:latest',
  ollamaUrl: 'http://localhost:11434'
});
// Returns cached if available (7 day TTL)
```

### `phase89-rrf.mjs` - Reciprocal Rank Fusion
```javascript
import { fuseRRF } from './lib/phase89-rrf.mjs';

const fused = fuseRRF(
  [vectorResults, ripgrepResults],
  [0.7, 0.3] // 70% vector, 30% ripgrep
);
```

### `phase89-sse-stream.mjs` - Streaming Retrieval
```javascript
// Server-side (SvelteKit endpoint)
import { createStreamEndpoint } from '$lib/server/phase89-sse-stream.mjs';
export const GET = createStreamEndpoint();

// Client-side (EventSource)
const es = new EventSource('/api/kb/stream-retrieve?query=TS2345');
es.addEventListener('batch', (e) => {
  const data = JSON.parse(e.data);
  results.push(...data.results);
});
```

---

## 💾 Redis Key Patterns

| Pattern | TTL | Description |
|---------|-----|-------------|
| `emb:<model>:<sha256>` | 7 days | Embedding cache |
| `ret:<sha256>` | 2 hours | Retrieval results |
| `topk:<errorId>` | 1 day | Precomputed neighbors |
| `cuda:<sha256>` | 1 day | CUDA pattern matches |

---

## 🗄️ New Database Tables

### `raw_error_embeddings` (Updated)
```sql
-- New column added:
tags TEXT[] -- CUDA/TS/Svelte pattern tags
```

### `phase89_cuda_patterns` (New)
```sql
CREATE TABLE phase89_cuda_patterns (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  line_number INT NOT NULL,
  pattern TEXT NOT NULL,
  matched_content TEXT NOT NULL,
  context TEXT,
  tags TEXT[],
  hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing Commands

### Integration Verification
```powershell
.\scripts\phase89-verify-integration.ps1
```

### Cache Performance Test
```bash
# First run (cache miss) - expect ~500ms
time node scripts/phase89-similarity-ranker.mjs "TS2345"

# Second run (cache hit) - expect ~10-20ms
time node scripts/phase89-similarity-ranker.mjs "TS2345"
```

### CUDA Scanner Test
```bash
node scripts/phase89-cuda-scan.mjs --path ./src

# Check results
psql -h localhost -p 5434 -U user -d legal -c \
  "SELECT pattern, COUNT(*) FROM phase89_cuda_patterns GROUP BY pattern"
```

---

## 📊 Monitoring

### Check Redis Stats
```bash
redis-cli INFO stats
redis-cli DBSIZE

# Count cache types
redis-cli KEYS 'emb:*' | wc -l
redis-cli KEYS 'ret:*' | wc -l
redis-cli KEYS 'topk:*' | wc -l
```

### Check Database Stats
```bash
psql -h localhost -p 5434 -U user -d legal -c "
SELECT
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
  COUNT(*) FILTER (WHERE tags IS NOT NULL) as tagged,
  COUNT(*) as total
FROM raw_error_embeddings;
"
```

---

## 🐛 Common Issues

### Cache Not Working
```javascript
// Test Redis connection
import { redisFromEnv } from './lib/phase89-cache.mjs';
const redis = redisFromEnv();
console.log(await redis.ping()); // Should print 'PONG'
```

### Embeddings Slow
```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Verify embedding model
ollama list | grep embeddinggemma
```

### CUDA Scanner Empty Results
```bash
# Test ripgrep directly
rg '__global__' ./src --type cpp

# Check if ripgrep is installed
rg --version
```

---

## 📈 Performance Metrics

| Operation | Before Cache | After Cache | Speedup |
|-----------|--------------|-------------|---------|
| Embedding | 150-300ms | 1-5ms | 30-300x |
| Retrieval | 500-800ms | 10-20ms | 25-80x |
| Total Pipeline | 650-1100ms | 11-25ms | 26-100x |

**Expected cache hit rate**: 80%+ after warmup

---

## 🔗 Related Files

- [PHASE89_ENHANCED_ARCHITECTURE.md](./PHASE89_ENHANCED_ARCHITECTURE.md) - Full architecture docs
- [PHASE89_QUICK_REFERENCE.md](./PHASE89_QUICK_REFERENCE.md) - System startup guide
- [scripts/phase89-verify-integration.ps1](./scripts/phase89-verify-integration.ps1) - Integration tests

---

**Version**: 1.0.0 (Enhanced)
**Last Updated**: 2025-01-XX
**Status**: ✅ Integration Complete
