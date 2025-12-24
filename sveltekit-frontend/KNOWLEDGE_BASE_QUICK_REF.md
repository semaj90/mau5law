# Knowledge Base Quick Reference

## 🚀 Quick Start

```bash
# Query knowledge base
npm run kb:query -- "your query here"

# Re-index all documents
npm run kb:index

# Health check
npm run kb:health

# View statistics
npm run kb:stats
```

## 📚 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `kb:query` | Semantic search with caching | `npm run kb:query -- "Redis TTL"` |
| `kb:index` | Re-index markdown files | `npm run kb:index` |
| `kb:health` | System health check | `npm run kb:health` |
| `kb:stats` | Collection statistics | `npm run kb:stats` |

## 🔍 Query Examples

```bash
# Svelte 5 patterns
npm run kb:query -- '$state.frozen immutable patterns'

# TypeScript best practices
npm run kb:query -- 'TypeScript 5.6 type guards'

# Redis caching
npm run kb:query -- 'Redis TTL invalidation strategies'

# ACE agent workflows
npm run kb:query -- 'autonomous code fixing loop'

# SvelteKit API patterns
npm run kb:query -- 'SvelteKit rate limiting middleware'
```

## 📊 Knowledge Base Contents

### Core Documentation (11 files)

1. **Svelte 5**
   - `svelte5-best-practices.md` - Migration guide, runes, reactivity
   - `svelte5-reactive-snippets.md` - Code examples for $state, $derived, $effect
   - `advanced-svelte5-patterns.md` - Component composition, stores, context

2. **TypeScript**
   - `typescript-best-practices.md` - Type guards, generics, branded types

3. **SvelteKit**
   - `sveltekit-api-patterns.md` - API design, auth, rate limiting, validation

4. **Infrastructure**
   - `rag-kag-integration-guide.md` - RAG/KAG workflows, vector search
   - `redis-caching-patterns.md` - Cache strategies, TTL, invalidation

5. **Agentic Workflows**
   - `ace-agentic-patterns.md` - ACE agent, Gemma3, FastMCP, Phase integration

6. **Error Resolution**
   - `error-resolution-db-export.md` - Common errors and fixes
   - `schema-migration-uuid-consistency.md` - Database migration patterns
   - `typescript-language-server-cache.md` - LSP debugging

## 💾 Cache Behavior

### Cache TTLs
- **Embeddings**: 1 hour (deterministic)
- **Search Results**: 30 minutes (may change with new data)
- **Stats**: 5 minutes (frequently changing)

### Cache Keys
```
emb:{model}:{hash}              # Embedding cache
search:{collection}:{query}     # Search result cache
metrics:cache:{type}            # Performance metrics
```

### Bypass Cache
```bash
node scripts/test-knowledge-query.mjs "query" --no-cache
```

## 🏥 Health Check Output

```
🏥 Knowledge Base Health Check

1. Qdrant Vector Database
   ✅ Connected
   Collection: knowledge_base
   Points: 244
   Dimension: 768

2. Redis Cache
   ✅ Connected
   Hit Rate: 62.50%

3. Ollama (Embedding Model)
   ✅ Connected
   Embedding Model: embeddinggemma:latest
```

## 🔧 Configuration

### Environment Variables

```bash
# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=knowledge_base

# Redis
REDIS_URL=redis://localhost:6379

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=embeddinggemma:latest

# Debug
DEBUG_QUERY=1  # Show raw argv for query debugging
```

## 🐛 Troubleshooting

### Redis Not Available
```
⚠️  Redis unavailable, proceeding without cache
```
**Fix**: Start Redis with `redis-server`

### Qdrant Collection Not Found
```
❌ Qdrant search failed: HTTP 404
```
**Fix**: Re-index with `npm run kb:index`

### Embedding Model Not Found
```
❌ Embedding error: HTTP 404
```
**Fix**: Pull model with `ollama pull embeddinggemma:latest`

### Query Mangled (e.g., $state → empty)
**Cause**: PowerShell interpreting $ as variable
**Fix**: Use single quotes: `npm run kb:query -- '$state.frozen'`

### Stale Cache Results
**Fix**: Clear cache
```bash
# Option 1: Re-index (auto-invalidates)
npm run kb:index

# Option 2: Manual Redis clear
redis-cli KEYS "search:*" | xargs redis-cli DEL
```

## 📈 Performance Tips

1. **Repeated Queries**: Cache hits return in ~50-100ms (95% faster)
2. **Batch Indexing**: Index all files at once with `npm run kb:index`
3. **Monitor Hit Rate**: Run `npm run kb:health` to check cache effectiveness
4. **Clear Unused Cache**: Automatic TTL expiration keeps memory usage low

## 🔗 Integration Examples

### TypeScript/JavaScript

```typescript
// Import cache functions
import {
  getCachedEmbedding,
  setCachedEmbedding,
  getCachedSearchResults,
  setCachedSearchResults,
  invalidateAllSearchCaches,
  onDocumentIndexed
} from '$lib/server/knowledge-cache';

// Cached search
const results = await getCachedSearchResults('knowledge_base', query);
if (!results) {
  // Fetch from Qdrant, then cache
  const fresh = await fetchFromQdrant(query);
  await setCachedSearchResults('knowledge_base', query, fresh);
}

// After indexing
await onDocumentIndexed(docId);
```

### Python (via HTTP)

```python
import requests

# Query knowledge base
response = requests.post('http://localhost:6333/collections/knowledge_base/points/search', json={
    'vector': embedding,
    'limit': 5,
    'score_threshold': 0.5
})

results = response.json()['result']
```

## 🎯 Common Use Cases

### 1. Find Svelte 5 Migration Pattern
```bash
npm run kb:query -- "migrate export let to $state"
```

### 2. Lookup TypeScript Type Guard
```bash
npm run kb:query -- "branded types type predicates"
```

### 3. Check Redis Caching Strategy
```bash
npm run kb:query -- "Redis cache invalidation patterns"
```

### 4. Get ACE Agent Workflow
```bash
npm run kb:query -- "autonomous fixing loop safety gates"
```

### 5. SvelteKit API Best Practice
```bash
npm run kb:query -- "API route rate limiting middleware"
```

## 📝 Adding New Documents

1. Create markdown file in `data/knowledge/`
2. Use H2 (`##`) for section headings
3. Add tags: `#tag1 #tag2 #tag3`
4. Re-index: `npm run kb:index`
5. Query: `npm run kb:query -- "your topic"`

### Example Document Structure

```markdown
# Your Document Title

## Tags
#tag1 #tag2 #tag3

## Section 1

Content here...

## Section 2

More content...
```

## 🔑 Key Concepts

- **Embedding**: 768-dimensional vector representation of text
- **Semantic Search**: Find similar content by meaning, not keywords
- **RAG**: Retrieval-Augmented Generation - use knowledge to improve LLM responses
- **KAG**: Knowledge-Augmented Generation - structured knowledge graphs
- **Cache Hit**: Result found in Redis (fast)
- **Cache Miss**: Result fetched from source (slower, then cached)
- **TTL**: Time To Live - how long cache entry is valid
- **Deduplication**: Remove duplicate results using composite keys

---

**For full details**: See `PHASE76_KNOWLEDGE_ENHANCEMENT_COMPLETE.md`
