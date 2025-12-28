# Phase 89: Enhanced Agentic Error Fixer - Quick Reference

## Features Added ✨

### 1. **Redis Cache Integration**
- Embedding cache: `emb:<sha256>` (7 day TTL)
- Solution cache: `solution:<error_code>` (30 day TTL)
- Fix cache: `fix:<sha256>` (30 day TTL)

### 2. **Language-Aware Grouping**
- Clusters errors by language (TypeScript, Svelte, JavaScript)
- Provides language statistics via `--lang-stats`

### 3. **Top-K Inverse Relations**
- Configurable `topKSimilar` (default: 20 similar errors)
- Cosine similarity threshold: 0.85 (high precision)

### 4. **Web Search (Gemini Grounding)**
- Enable with `--web-search` flag
- Automatically searches for error code solutions
- Caches results for 30 days

---

## Usage Examples

### 1. Basic Batch Fix (Local LLM)
```bash
node scripts/phase89-agentic-fixer.mjs --limit 100
```
- Uses Ollama `gemma3-legal:latest`
- Fixes up to 100 errors
- Uses Redis cache for embeddings

### 2. Web Search Mode (Gemini + Google)
```bash
node scripts/phase89-agentic-fixer.mjs --limit 50 --web-search
```
- Enables Gemini with web search grounding
- Fetches official solutions for error codes
- Caches solutions in Redis (30 days)

### 3. Target Specific Error Code
```bash
node scripts/phase89-agentic-fixer.mjs --error-code TS1005 --limit 50
```
- Only fixes TS1005 errors
- Clusters similar TS1005 instances

### 4. Language Statistics
```bash
node scripts/phase89-agentic-fixer.mjs --lang-stats
```
**Output:**
```
Source    | Total  | Embedded | Unique Codes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
tsc       |  26000 |    25890 |          45
svelte    |    150 |      150 |           8

🔝 Top 15 Error Codes:
   TS1005         8423 errors
   TS2322         4156 errors
   TS2345         1892 errors
```

---

## Configuration

Edit `CONFIG` in `phase89-agentic-fixer.mjs`:

```javascript
const CONFIG = {
  fixing: {
    maxErrorsPerRun: 100,       // Max errors per batch
    similarityThreshold: 0.85,  // Cosine similarity (0-1)
    topKSimilar: 20,            // Top-K similar errors for context
    useWebSearch: false         // Override with --web-search flag
  },
  redis: {
    ttl: {
      solution: 86400 * 30,  // 30 days
      analysis: 86400 * 7     // 7 days
    }
  }
};
```

---

## Redis Cache Keys

Monitor cache usage:

```bash
# Check embedding cache
docker exec phase66-redis redis-cli KEYS "emb:*" | wc -l

# Check solution cache
docker exec phase66-redis redis-cli KEYS "solution:*"

# Check fix cache
docker exec phase66-redis redis-cli KEYS "fix:*"

# Get a cached solution
docker exec phase66-redis redis-cli GET "solution:TS1005"
```

---

## Workflow Example

### Step 1: Ingest errors (if not done)
```bash
node scripts/phase89-ingest-errors.mjs
```

### Step 2: Embed errors (if not done)
```bash
node scripts/phase89-raw-text-embedder.mjs
```

### Step 3: Check statistics
```bash
node scripts/phase89-agentic-fixer.mjs --lang-stats
```

### Step 4: Fix with web search
```bash
node scripts/phase89-agentic-fixer.mjs --limit 100 --web-search
```

### Step 5: Verify fixes
```bash
npx tsc --noEmit
```

---

## Output Example

```
🤖 Phase 89: Agentic Batch Error Fixer (Enhanced)

✅ Connected to Postgres + Redis
🌐 Web search enabled (Gemini)

📊 Finding top 100 unfixed errors...
   Found 87 errors to fix

🔗 Clustering errors by similarity...
   Created 23 error clusters

🛠️  Fixing error clusters...

[1/23] Cluster with 12 similar errors
   Primary: src/lib/stores/barrel-store.svelte.ts(45,12): error TS1005...
   🔍 Searching web for TS1005...
   ✅ Solution cached
   ✅ Applied fix to src/lib/stores/barrel-store.svelte.ts:45

[2/23] Cluster with 8 similar errors
   Primary: src/routes/+layout.svelte(23,5): error TS2322...
   💾 Using cached solution for TS2322
   ✅ Applied fix to src/routes/+layout.svelte:23

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Agentic Fixer Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Clusters processed:  23
  Errors fixed:        21
  Errors failed:       2
  Cached solutions:    8
  Success rate:        91.3%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Agentic fixing complete!

Next: npx tsc --noEmit (verify fixes)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 89: Agentic Error Fixer Architecture                │
└─────────────────────────────────────────────────────────────┘

   1. Ingest Errors
      ↓
   2. Embed with Redis Cache (emb:<hash>)
      ↓
   3. Cluster by Cosine Similarity (Top-K)
      ↓
   4. Group by Language (TS/Svelte/JS)
      ↓
   5. [Optional] Web Search (Gemini + Google)
      ↓
   6. Generate Fix (LLM)
      ↓
   7. Cache Solution (Redis, 30d TTL)
      ↓
   8. Apply Fix to File
      ↓
   9. Verify with TSC
```

---

## Next Steps

1. **Run language stats**:
   ```bash
   node scripts/phase89-agentic-fixer.mjs --lang-stats
   ```

2. **Fix top error clusters with web search**:
   ```bash
   node scripts/phase89-agentic-fixer.mjs --limit 50 --web-search
   ```

3. **Query similar errors** (for analysis):
   ```bash
   node scripts/phase89-similarity-ranker.mjs "TS1005 missing comma"
   ```

4. **Check Redis cache hit rate**:
   ```bash
   docker exec phase66-redis redis-cli INFO stats | grep keyspace_hits
   ```

---

## Troubleshooting

### "No similar errors found"
- Lower `minSimilarity` in `phase89-similarity-ranker.mjs` (default: 0.7)
- Check embeddings are complete: `.\scripts\phase89-monitor-progress.ps1`

### "Redis connection failed"
```bash
docker start phase66-redis
docker ps --filter name=redis
```

### "Web search failed"
- Check Gemini API key in `.env`
- Verify `llm-router.mjs` has Gemini configured
- Try without `--web-search` flag

### "Fix applied but error persists"
- Run `npx tsc --noEmit` to verify
- Check that the fix was semantically correct
- Manually review the changed file

---

## Performance Tips

1. **Use Redis caching** - Saves ~95% of embedding time on re-runs
2. **Start with `--lang-stats`** - Identify which error codes to target
3. **Fix high-frequency errors first** - Use `--error-code TS####`
4. **Enable web search selectively** - Only for unknown error codes
5. **Batch size** - Increase `maxErrorsPerRun` for larger codebases (default: 100)

---

## Cache Management

### Clear all caches
```bash
docker exec phase66-redis redis-cli FLUSHDB
```

### Clear specific cache
```bash
# Clear embedding cache
docker exec phase66-redis redis-cli --scan --pattern "emb:*" | xargs docker exec -i phase66-redis redis-cli DEL

# Clear solution cache
docker exec phase66-redis redis-cli --scan --pattern "solution:*" | xargs docker exec -i phase66-redis redis-cli DEL
```

### Check cache size
```bash
docker exec phase66-redis redis-cli DBSIZE
```

---

**Status**: ✅ Enhanced with Redis caching, web search, and language-aware grouping
**Version**: Phase 89.2
**Last Updated**: Dec 28, 2025
