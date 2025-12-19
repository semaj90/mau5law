# Multi-AI Meta-Analysis System - Quick Guide

## 🎯 What It Does

Sends your AST RAG/KAG recommendations to **multiple AI systems** for comparative analysis:

- **Ollama Gemma3** (local, always available)
- **Google Gemini 2.0 Flash** (requires API key)
- **Claude Sonnet 4.5** (via GitHub Copilot Chat - manual)

**Advanced Features:**
- 🔍 **Web Search Integration** (Brave Search API)
- 🌐 **Web Crawling & Parsing** (documentation, logs)
- 📊 **Cosine Similarity Ranking** (semantic relevance)
- 💾 **Vector Storage** (Qdrant for retrieval)
- 🔄 **Consensus Building** (compare multiple AI responses)

---

## 🚀 Quick Start

### 1. Basic Usage (Ollama Only)
```bash
node scripts/multi-ai-meta-analyzer.mjs
```

**Output:**
```
🧠 OLLAMA GEMMA3 ANALYSIS
═══════════════════════════════════════════════════════════

Critical Analysis:
1. The recommendations lack specific code examples...
2. Missing consideration for backwards compatibility...
...

✅ Meta-analysis saved to: reports/latest/multi-ai-meta-analysis.md
```

### 2. Compare All AI Models
```bash
# Requires GEMINI_API_KEY environment variable
node scripts/multi-ai-meta-analyzer.mjs --compare-all
```

**Compares:**
- Ollama Gemma3 response
- Google Gemini response
- Identifies consensus vs divergent opinions

### 3. With Web Search Augmentation
```bash
# Requires BRAVE_API_KEY environment variable
node scripts/multi-ai-meta-analyzer.mjs --with-web-search --compare-all
```

**Adds:**
- 🔍 Web search for TypeScript best practices
- 📄 Parse and embed top 5 search results
- 📊 Rank by cosine similarity to your recommendations
- 💾 Store in Qdrant for future retrieval

---

## 📊 Example Output

### Ollama Gemma3 Analysis
```markdown
## Critical Analysis

1. **Missing Context**: The recommendations assume all errors are fixable...
2. **Priority Concerns**: File with 421 errors might need complete rewrite...
3. **Dependencies**: No mention of breaking changes in dependent files...

## Alternative Approaches

Instead of fixing `context7-orchestration-integration.ts` in place:
- Consider splitting into smaller modules
- Extract business logic from orchestration
- Use dependency injection for testability
...
```

### Google Gemini Analysis
```markdown
## Critical Analysis

The recommendations focus heavily on error reduction but overlook:
1. **Performance implications** of refactoring
2. **Team bandwidth** - some fixes may take weeks
3. **Testing strategy** - no mention of test coverage

## Improved Recommendations

1. [Critical] Add integration tests BEFORE refactoring
2. [High] Create feature flags for gradual rollout
...
```

### Web Search Results (Ranked by Similarity)
```
📊 Top 3 Most Relevant Results:

1. [Similarity: 87.3%] TypeScript Circular Dependency Detection and Resolution
   https://dev.to/typescript-best-practices-circular-deps
   Learn how to detect and resolve circular dependencies...

2. [Similarity: 82.1%] Refactoring Large TypeScript Codebases
   https://blog.example.com/typescript-refactoring-guide
   A comprehensive guide to safely refactoring...

3. [Similarity: 78.9%] Managing High Error Counts in Legacy Code
   https://stackoverflow.com/questions/typescript-error-management
   Strategies for incrementally fixing large error counts...
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in `sveltekit-frontend/`:

```bash
# Required for Ollama (local)
OLLAMA_URL=http://localhost:11434

# Optional: Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Brave Search API (for web search)
BRAVE_API_KEY=your_brave_api_key_here

# Qdrant (for vector storage)
QDRANT_URL=http://localhost:6333
```

### Get API Keys

**Google Gemini:**
1. Visit https://makersuite.google.com/app/apikey
2. Create new API key
3. Add to `.env` as `GEMINI_API_KEY`

**Brave Search:**
1. Visit https://brave.com/search/api/
2. Sign up for free tier (2,000 queries/month)
3. Add to `.env` as `BRAVE_API_KEY`

---

## 🎯 Use Cases

### 1. Validate AI Recommendations
**Problem:** Not sure if AI recommendations are accurate/complete
**Solution:**
```bash
node scripts/multi-ai-meta-analyzer.mjs --compare-all
```
**Result:** Compare Ollama vs Gemini responses, find consensus

### 2. Research Best Practices
**Problem:** Need industry best practices for TypeScript refactoring
**Solution:**
```bash
node scripts/multi-ai-meta-analyzer.mjs --with-web-search
```
**Result:** Top 5 web results ranked by relevance, stored in Qdrant

### 3. Build Knowledge Base
**Problem:** Want to accumulate learnings over time
**Solution:**
```bash
# Run with web search multiple times on different topics
node scripts/multi-ai-meta-analyzer.mjs --with-web-search
# Query accumulated knowledge
curl -X POST http://localhost:6333/collections/phase72_meta_analysis/points/search \
  -d '{"vector": [...], "limit": 10}'
```

---

## 🔍 Advanced Features

### Cosine Similarity Ranking

The system embeds both your recommendations AND web search results, then ranks by similarity:

```javascript
// 1. Embed your recommendations
const queryEmbedding = await generateEmbedding(recommendations);

// 2. Embed each search result
const resultEmbeddings = await parseAndEmbedResults(searchResults);

// 3. Calculate cosine similarity
const similarity = cosineSimilarity(queryEmbedding, resultEmbedding);

// 4. Rank by similarity (highest first)
results.sort((a, b) => b.similarity - a.similarity);
```

**Why This Matters:**
- Finds most relevant results (not just keyword matches)
- Semantic understanding (e.g., "circular dependency" vs "cyclic import")
- Works across languages/frameworks

### Vector Storage (Qdrant)

All embeddings stored in `phase72_meta_analysis` collection:

```bash
# Search for similar content
curl -X POST http://localhost:6333/collections/phase72_meta_analysis/points/search \
  -d '{
    "vector": [0.234, 0.567, ...],  # Your query embedding
    "limit": 5,
    "with_payload": true
  }'
```

**Stored Data:**
- Web search result title
- URL
- Description
- Full 768D embedding vector
- Timestamp

### Log Parsing & Embedding

**Future Enhancement** (not yet implemented):

```javascript
// Parse TypeScript compiler logs
const logs = parseTscLogs('tsc-output.log');

// Embed each error message
const embeddings = await Promise.all(
  logs.map(log => generateEmbedding(log.message))
);

// Find similar errors across projects
const similar = await searchQdrant(embeddings[0]);
```

---

## 📊 Output Files

### 1. `multi-ai-meta-analysis.md`

**Location:** `reports/latest/multi-ai-meta-analysis.md`

**Contents:**
- Ollama Gemma3 analysis
- Google Gemini analysis (if `--compare-all`)
- Consensus points
- Divergent opinions
- Recommended action plan
- Web search results (if `--with-web-search`)

### 2. Qdrant Collection

**Collection:** `phase72_meta_analysis`
**URL:** http://localhost:6333/dashboard#/collections/phase72_meta_analysis

**Query Example:**
```bash
# Get all stored embeddings
curl http://localhost:6333/collections/phase72_meta_analysis/points/scroll \
  -d '{"limit": 10, "with_payload": true}'
```

---

## 🔄 Integration with Phase 72 Pipeline

### Full Workflow

```bash
# 1. Generate AST knowledge base
node scripts/ast-error-analyzer.mjs --graph project-knowledge-base.json

# 2. Run RAG/KAG integration (generates recommendations)
node scripts/rag-kag-ast-integrator.mjs --auto-recommendations

# 3. Multi-AI meta-analysis (critique recommendations)
node scripts/multi-ai-meta-analyzer.mjs --compare-all --with-web-search

# 4. Review all outputs
#    - reports/latest/ast-rag-recommendations.md (original)
#    - reports/latest/multi-ai-meta-analysis.md (critique)

# 5. Implement prioritized fixes
#    (Use insights from both reports)
```

### Automated Pipeline

Run `PHASE72-MULTI-AI-ANALYSIS.bat` for full automation with prompts.

---

## 🤖 Manual Claude Sonnet 4.5 Analysis

Since Claude is accessed via GitHub Copilot Chat (not API), do this manually:

1. Open GitHub Copilot Chat in VS Code
2. Paste contents of `reports/latest/ast-rag-recommendations.md`
3. Ask:
   ```
   Review these AI-generated recommendations. Provide:
   1. Critical analysis
   2. Priority validation
   3. Alternative approaches
   4. Implementation risks
   5. Improved recommendations
   ```
4. Copy response and append to `multi-ai-meta-analysis.md`

---

## 🐛 Troubleshooting

### Issue: "Gemini API key not configured"
**Solution:**
```bash
# Get API key from https://makersuite.google.com/app/apikey
# Add to .env
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### Issue: "Brave Search API failed"
**Solution:**
- Free tier: 2,000 queries/month
- Check usage: https://brave.com/search/api/dashboard
- Fallback: Use without `--with-web-search`

### Issue: "Qdrant storage failed"
**Solution:**
```bash
# Restart Qdrant
cd qdrant-windows
./qdrant.exe
# Wait for: "Qdrant HTTP listening on 6333"
```

### Issue: "Out of memory during embedding"
**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=8192" node scripts/multi-ai-meta-analyzer.mjs
```

---

## 📚 API References

### Ollama API
- **Docs:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **Chat:** `POST /api/chat`
- **Embeddings:** `POST /api/embeddings`

### Google Gemini API
- **Docs:** https://ai.google.dev/docs
- **Models:** https://ai.google.dev/models/gemini
- **Generate Content:** `POST /v1beta/models/{model}:generateContent`

### Brave Search API
- **Docs:** https://brave.com/search/api/
- **Web Search:** `GET /res/v1/web/search`
- **Rate Limits:** 1 req/sec (free tier)

### Qdrant API
- **Docs:** https://qdrant.tech/documentation/
- **Collections:** `PUT /collections/{collection_name}`
- **Points:** `PUT /collections/{collection_name}/points`
- **Search:** `POST /collections/{collection_name}/points/search`

---

## 🎯 Next Steps

1. **Get API Keys** (optional but recommended):
   - Gemini: https://makersuite.google.com/app/apikey
   - Brave Search: https://brave.com/search/api/

2. **Run Basic Analysis**:
   ```bash
   node scripts/multi-ai-meta-analyzer.mjs
   ```

3. **Compare Models**:
   ```bash
   node scripts/multi-ai-meta-analyzer.mjs --compare-all
   ```

4. **Add Web Search**:
   ```bash
   node scripts/multi-ai-meta-analyzer.mjs --with-web-search --compare-all
   ```

5. **Review Outputs**:
   - Check `reports/latest/multi-ai-meta-analysis.md`
   - Query Qdrant: http://localhost:6333/dashboard

6. **Implement Fixes**:
   - Use consensus from multiple AI models
   - Prioritize based on web search best practices
   - Leverage vector store for ongoing research

---

**Created:** 2025-12-19
**Part of:** Phase 72 RAG/KAG Self-Prompting System
**Status:** ✅ Ready to use
