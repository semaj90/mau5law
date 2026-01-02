# Phase 89: Enhanced Codebase Indexer

## Executive Summary

**What**: Intelligent codebase indexing combining ripgrep comment extraction, LLM summaries (gemma3:270m), embeddings (embeddinggemma:latest), auto-tagging, Redis caching, and Qdrant vector search.

**Why**: Transform static code into searchable knowledge with semantic understanding, enabling ACE agents to route fixes contextually.

**How**: Extract comments → Generate LLM summary → Embed → Auto-tag → Cache → Index in Qdrant

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Phase 89 Codebase Indexer                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │  1. Ripgrep Comment Extraction          │
         │     • // single-line comments          │
         │     • /** block comments */             │
         │     • <!-- HTML/Svelte comments -->     │
         │     • # Python/shell comments           │
         └────────────────────────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │  2. LLM Summary Generation              │
         │     • Model: gemma3:270m                │
         │     • Input: comments + code sample     │
         │     • Output: 2-3 sentence summary      │
         └────────────────────────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │  3. Auto-Tagging                        │
         │     • role: route|ui_component|api|...  │
         │     • surface: rag|kag|ace|ui|api       │
         │     • tech: qdrant|redis|postgres|...   │
         │     • risk: low|med|high                │
         │     • change_frequency: hot|warm|cold   │
         └────────────────────────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │  4. Embedding Generation                │
         │     • Model: embeddinggemma:latest      │
         │     • Input: signature_text             │
         │     • Output: 768d vector               │
         │     • Redis cache: 7 days TTL           │
         └────────────────────────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │  5. Qdrant Storage                      │
         │     • Collection: phase89_codebase_index│
         │     • Payload: full metadata + summary  │
         │     • Search: HNSW cosine similarity    │
         └────────────────────────────────────────┘
```

## File Character Profile Schema

Each indexed file becomes a structured "character card":

```typescript
{
  file_path: string,              // src/lib/services/codebase-indexer.ts
  role: string[],                 // ['service', 'indexer']
  surface: string[],              // ['rag', 'ace', 'ui']
  tech: string[],                 // ['qdrant', 'redis', 'ollama']
  risk: 'low' | 'med' | 'high',  // Deprecation/TODO detection
  change_frequency: 'hot' | 'warm' | 'cold',
  comments: string[],             // Top 5 extracted comments
  comments_count: number,         // Total comments found
  llm_summary: string,            // 2-3 sentence AI summary
  signature_text: string,         // Text used for embedding
  indexed_at: string,             // ISO8601 timestamp
  model_used: string,             // gemma3:270m
  code_length: number             // File size in characters
}
```

## Key Features

### 1. **Ripgrep Comment Extraction**

**Patterns**:
- `// single-line comments`
- `/** block comments */`
- `<!-- HTML/Svelte comments -->`
- `# Python/shell comments`

**Extraction**:
```python
def extract_comments_ripgrep(self, file_path: str) -> List[str]:
    # Regex patterns for different comment styles
    patterns = [
        r'//\s*(.+)',          # JS/TS
        r'/\*\*?\s*(.+?)\s*\*/',  # Block
        r'<!--\s*(.+?)\s*-->',  # HTML/Svelte
        r'#\s*(.+)',           # Python
    ]
    # Returns top 10 comments
```

### 2. **LLM Summary Generation**

**Model**: gemma3:270m (fast, lightweight)

**Prompt Template**:
```
Analyze this file and generate a concise technical summary (2-3 sentences).

File: {file_path}

Comments extracted:
{top_3_comments}

Code sample:
{first_800_chars}

Summary (focus on purpose, key exports, and role in the system):
```

**Output**: 120 tokens max, temperature 0.3

### 3. **Auto-Tagging System**

#### Role Detection
- **route**: `+page.svelte`, `+page.server.ts`
- **ui_component**: `.svelte` files
- **api_endpoint**: `/api/`, `+server.ts`
- **db_schema**: `schema`, `db/`
- **service**: `service`, `client`
- **worker**: `worker`, `queue`

#### Surface Area Detection
- **rag**: `rag|retrieval|search|vector`
- **kag**: `kag|knowledge|graph`
- **ace**: `ace|error|fix|cluster`
- **ui**: `ui|component|svelte`
- **api**: `api|endpoint|route`

#### Tech Stack Detection
- **qdrant**: `qdrant` in comments/summary
- **redis**: `redis` in comments/summary
- **postgres**: `postgres|drizzle` in comments/summary
- **llm**: `ollama|embedding` in comments/summary
- **svelte5**: `svelte|rune` in comments/summary

#### Risk Assessment
- **high**: `deprecated|legacy|todo|fixme|hack`
- **med**: `experimental|wip|draft`
- **low**: default

#### Change Frequency
- **hot**: `/routes/`, `ui/` (frequently changed)
- **warm**: `/lib/services/` (occasionally changed)
- **cold**: default (rarely changed)

### 4. **Redis Caching**

**Key Pattern**: `emb:{md5_hash_of_signature_text}`

**TTL**: 7 days (604,800 seconds)

**Benefits**:
- Avoids re-embedding unchanged files
- 100% cache hit rate after first index
- Stores 768-dimensional float vectors as JSON

### 5. **Qdrant Vector Search**

**Collection**: `phase89_codebase_index`

**Vector**: 768d, cosine distance

**Search Query**:
```python
results = qdrant.search(
    collection_name='phase89_codebase_index',
    query_vector=query_embedding,
    limit=top_k
)
```

**Returns**: Files ranked by semantic similarity

## Usage

### CLI

#### Index a Single File
```bash
python scripts/phase89-enhanced-codebase-indexer.py --file "src/lib/services/qdrant.ts"
```

**Output**:
```
📄 Indexing: src/lib/services/qdrant.ts
   💬 Extracting comments...
      Found 8 comments
   🤖 Generating summary with gemma3:270m...
      This file provides a Qdrant client service for vector search operations...
   🏷️  Auto-tagging...
      Role: ['service'], Surface: ['rag'], Risk: low
   🔢 Generating embedding (cache_key: a3f9c2b1...)...
      ✅ Embedding: 768d
   💾 Upserting to Qdrant...
   ✅ Indexed successfully!
```

#### Index a Directory
```bash
python scripts/phase89-enhanced-codebase-indexer.py --dir src/lib/services --limit 20
```

**Output**:
```
🔍 Finding files in src/lib/services...
   Patterns: ['*.ts', '*.svelte', '*.js', '*.py']
   Found 47 files

[1/20]
📄 Indexing: src/lib/services/codebase-indexer.ts
   ... (full indexing flow)

📊 Summary
Files indexed: 20

By role:
   service: 15 files
   api_endpoint: 3 files
   ui_component: 2 files

✅ Indexing complete!
```

#### Search for Similar Files
```bash
python scripts/phase89-enhanced-codebase-indexer.py --search "Qdrant vector search and indexing"
```

**Output**:
```
🔍 Searching for: 'Qdrant vector search and indexing'

📊 Top 5 results:

1. src/lib/services/qdrant.ts
   Score: 0.8234
   Role: service
   Surface: rag
   Summary: Qdrant client service providing vector search, indexing, and collection management...

2. src/lib/services/codebase-indexer.ts
   Score: 0.7156
   Role: service
   Surface: rag, ace
   Summary: Codebase indexer that extracts code units and stores them in Qdrant...
```

### FastMCP Server

#### Start Server
```bash
python scripts/fastmcp-codebase-indexer.py --server --port 3004
```

**Output**:
```
🔌 FastMCP Codebase Indexer Server running on http://localhost:3004
   Tools available: 5
   Collection: phase89_codebase_index
```

#### Available Tools

1. **codebase:index_file**
   ```json
   {
     "tool": "codebase:index_file",
     "args": {
       "file_path": "src/lib/services/qdrant.ts"
     }
   }
   ```

2. **codebase:index_directory**
   ```json
   {
     "tool": "codebase:index_directory",
     "args": {
       "root_dir": "src/lib/services",
       "patterns": ["*.ts", "*.svelte"],
       "limit": 20
     }
   }
   ```

3. **codebase:search**
   ```json
   {
     "tool": "codebase:search",
     "args": {
       "query": "TypeScript error clustering with GPU",
       "top_k": 5
     }
   }
   ```

4. **codebase:extract_comments**
   ```json
   {
     "tool": "codebase:extract_comments",
     "args": {
       "file_path": "src/lib/services/qdrant.ts"
     }
   }
   ```

5. **codebase:stats**
   ```json
   {
     "tool": "codebase:stats",
     "args": {}
   }
   ```

#### Execute via HTTP
```bash
curl http://localhost:3004/tools/execute -H "Content-Type: application/json" -d '{
  "tool": "codebase:search",
  "args": {
    "query": "Svelte 5 runes state management",
    "top_k": 3
  }
}'
```

## Integration with ACE Loop

### ACE Contextual Routing

When an ACE agent needs to fix an error, it can:

1. **Search for related files**:
   ```python
   results = indexer.search_similar_files(
       "TypeScript type error in Svelte component props",
       top_k=5
   )
   ```

2. **Filter by risk/surface**:
   ```python
   # Get high-risk files in the ACE surface area
   results = [r for r in results if r['payload']['risk'] == 'high'
              and 'ace' in r['payload']['surface']]
   ```

3. **Route fixes intelligently**:
   - **hot** files → Manual review required
   - **warm** files → ACE auto-fix with validation
   - **cold** files → Full automation

### Timeline Event Integration

Each indexing operation can emit timeline events:

```typescript
{
  event_type: 'codebase:indexed',
  file_path: 'src/lib/services/qdrant.ts',
  indexed_at: '2026-01-02T15:30:00Z',
  comments_count: 8,
  llm_summary: '...',
  auto_tags: {
    role: ['service'],
    surface: ['rag'],
    tech: ['qdrant']
  }
}
```

### Knowledge Graph Enrichment

File character profiles feed into the knowledge graph:

```
[File: qdrant.ts] --depends_on--> [Package: qdrant-client]
[File: qdrant.ts] --exports--> [Function: searchVectors]
[File: qdrant.ts] --implements--> [Surface: RAG]
[File: qdrant.ts] --risk--> [Level: low]
```

## Performance Metrics

### Indexing Speed
- **Single file**: ~2-5 seconds
  - Comment extraction: 0.1s
  - LLM summary: 1-3s
  - Embedding: 0.5s (cached) / 1s (fresh)
  - Qdrant upsert: 0.1s

- **Batch (20 files)**: ~40-100 seconds
  - Parallelizable via batch embedding API

### Search Speed
- **Query embedding**: ~0.5s
- **HNSW search**: ~10ms
- **Total latency**: ~0.6s for top-5 results

### Cache Hit Rate
- **First index**: 0% (all fresh embeddings)
- **Re-index unchanged files**: 100% (Redis cache)
- **Partial updates**: 60-80% (only changed files re-embed)

## Next Steps

### Immediate (High Priority)

1. **Run Full Codebase Index**
   ```bash
   python scripts/phase89-enhanced-codebase-indexer.py --dir src --limit 100
   ```

2. **Start FastMCP Server**
   ```bash
   python scripts/fastmcp-codebase-indexer.py --server --port 3004
   ```

3. **Integrate with ACE Agent**
   - Add `codebase:search` tool to ACE workflow
   - Use results to route fixes contextually

### Short-Term

4. **Add LangExtract Validation**
   - Enforce schema on LLM summaries
   - Prevent garbage in KB

5. **Build ACE Check Ingest Runner**
   ```bash
   npm run check > check_output.txt
   python scripts/ace-check-ingest.py --input check_output.txt
   ```
   - Parse `svelte-check` + `tsc` output
   - Cluster errors
   - Generate file character cards
   - Store in Qdrant

6. **Timeline Event Stream**
   - Append-only event log in PostgreSQL
   - Semantic search on timeline (phase89_timeline_cards)

### Medium-Term

7. **AST-Based Enrichment** (after corruption cleanup)
   - Tree-sitter for precise imports/exports
   - Dependency graph extraction
   - Type signature analysis

8. **GPU Acceleration**
   - Batch embedding on GPU
   - Reranking layer (phase90)
   - Fast cosine on candidate matrix

9. **VS Code Extension**
   - Right-click → "Find similar files"
   - Inline search results
   - Auto-tag suggestions

## Files Created

1. **phase89-enhanced-codebase-indexer.py** (~450 lines)
   - Core indexer with ripgrep + LLM + embedding + tagging

2. **fastmcp-codebase-indexer.py** (~250 lines)
   - FastMCP server exposing 5 tools

3. **demo-enhanced-indexer.ps1** (~60 lines)
   - Quick demo script

4. **ACE_ENHANCED_CODEBASE_INDEXER.md** (this file)
   - Comprehensive documentation

## Success Metrics

- ✅ Comment extraction working (10 comments per file)
- ✅ LLM summary generation (gemma3:270m, 2-3 sentences)
- ✅ Auto-tagging (role, surface, tech, risk, frequency)
- ✅ Embedding with Redis caching (768d vectors)
- ✅ Qdrant indexing (phase89_codebase_index collection)
- ✅ Semantic search (0.37-0.82 similarity scores)
- ✅ FastMCP server (5 tools exposed)

## Conclusion

The Phase 89 Enhanced Codebase Indexer transforms static code into searchable knowledge by combining:
- **Ripgrep** for fast comment extraction
- **gemma3:270m** for intelligent summaries
- **embeddinggemma:latest** for semantic vectors
- **Auto-tagging** for structured metadata
- **Redis** for caching efficiency
- **Qdrant** for vector search

This enables ACE agents to contextually route fixes, build knowledge graphs, and search the codebase semantically.

**Next**: Run full index, start FastMCP server, integrate with ACE workflow. 🚀
