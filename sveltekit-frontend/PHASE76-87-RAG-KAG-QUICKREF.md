# 🚀 Phase 76-87: RAG+KAG Quick Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM (Gemini/Ollama/Claude)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Python RAG+KAG Service (Port 8001)                      │
│  - /retrieve → Hybrid vector search                             │
│  - /embed → Cached embeddings                                   │
│  - /stream-llm → SSE streaming                                  │
│  - /chunk → Intelligent chunking                                │
└────────┬────────────────────────┬────────────────────┬──────────┘
         │                        │                    │
         ▼                        ▼                    ▼
    ┌────────┐              ┌─────────┐          ┌─────────┐
    │ Qdrant │              │ Postgres│          │  Redis  │
    │  :6333 │              │  :5434  │          │  :6379  │
    └────────┘              └─────────┘          └─────────┘
    15 collections          pgvector HNSW        Embedding cache
    55k+ vectors            33k+ errors          24hr TTL
```

## Quick Start Commands

### 1. Start Python RAG+KAG Service

```bash
# Install dependencies
pip install fastapi uvicorn httpx redis qdrant-client pydantic

# Run service
python scripts/rag-kag-service.py
# OR with custom port:
RAG_SERVICE_PORT=8001 python scripts/rag-kag-service.py
```

### 2. Monitor Phase 87 Embedding Generation

```powershell
# In a second terminal while Phase 87 is running:
.\scripts\phase87-monitor-ingestion.ps1
```

**Expected Output**:
```
[14:23:45] Check #12
   📊 Vectors: 1,250 (+50)
   [#########################                         ] 25.0%
   🧠 Model: embeddinggemma:latest (0.27 GB)
   💾 Ollama RAM: 1.42 GB
```

### 3. Create Safety Guards (Before Scaling to 10k+)

```powershell
.\scripts\phase87-create-safety-guards.ps1
```

Creates unique indexes:
- `ts_errors_identity_uniq` → Prevents duplicate errors
- `error_embeddings_error_id_uniq` → Prevents re-embedding

### 4. Ingest Operator Documentation

```bash
# Create manifest (already done: data/knowledge/kb-manifest-ace.txt)

# Ingest docs into Qdrant + Postgres
node scripts/phase76-manifest-ingest.mjs \
  --manifest data/knowledge/kb-manifest-ace.txt \
  --kind ace_operator_doc \
  --tags ace,operator-docs,phase76
```

### 5. Ingest Successful LLM Outputs

```bash
# After Phase 86/87 produces successful fixes:
node scripts/phase76-manifest-ingest.mjs \
  --llm-outputs "reports/phase86/runs/*.json"
```

## Python Service API Examples

### Retrieve Context (RAG+KAG Hybrid)

```python
import requests

response = requests.post("http://localhost:8001/retrieve", json={
    "query": "How do I fix TS1005 comma expected errors?",
    "collections": ["phase76_knowledge_base", "phase72_ast_knowledge_base"],
    "top_k": 5,
    "threshold": 0.5,
    "use_kag": False  # KAG not implemented yet
})

results = response.json()["results"]
for r in results:
    print(f"[{r['score']:.3f}] {r['text'][:100]}...")
```

### Generate Cached Embedding

```python
response = requests.post("http://localhost:8001/embed", json={
    "text": "const x = 5; const y = 10;",
    "use_cache": True
})

embedding = response.json()["embedding"]  # 768D vector
cached = response.json()["cached"]        # True if from Redis
```

### Stream LLM with Context

```python
import requests

response = requests.post("http://localhost:8001/stream-llm", json={
    "prompt": "Fix this TS1005 error",
    "context": [
        "TS1005 means: ',' expected",
        "Common fix: Add comma between elements"
    ],
    "model": "gemma3-legal:latest",
    "temperature": 0.7
}, stream=True)

for line in response.iter_lines():
    if line:
        data = json.loads(line.decode().replace("data: ", ""))
        if "token" in data:
            print(data["token"], end="", flush=True)
```

### Intelligent Chunking

```python
response = requests.post("http://localhost:8001/chunk", json={
    "text": "Long document text here...",
    "chunk_size": 1800,
    "overlap": 200,
    "preserve_sentences": True
})

chunks = response.json()["chunks"]
for chunk in chunks:
    print(f"Chunk {chunk['chunk_id']}: {chunk['text'][:50]}...")
```

## Integration with Phase 87

### Before Phase 87 Retrieval

```javascript
// In phase87-autonomous-fixer.mjs

// 1. Get similar errors from RAG service
const response = await fetch('http://localhost:8001/retrieve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: `${error.code} ${error.message} ${error.snippet}`,
        collections: ['phase76_knowledge_base', 'phase72_ast_knowledge_base'],
        top_k: 3,
        threshold: 0.7
    })
});

const { results } = await response.json();

// 2. Extract operator playbooks
const playbooks = results
    .filter(r => r.metadata.kind === 'ace_operator_doc')
    .map(r => r.text);

// 3. Extract proven LLM outputs
const successfulFixes = results
    .filter(r => r.metadata.kind === 'ace_llm_output')
    .map(r => r.text);

// 4. Build prompt with context
const prompt = `
[Operator Playbooks]
${playbooks.join('\n\n')}

[Proven Fixes]
${successfulFixes.join('\n\n')}

[Current Error]
${error.code}: ${error.message}
File: ${error.file}:${error.line}
${error.snippet}

Fix this error with a surgical patch.
`;
```

## Scaling Strategy

### Current: 100 errors → 5,000 errors ✅

Your Phase 87 is running now. Expected time: 8-10 minutes.

### Next: 5,000 → 10,000 errors

**After current ingestion finishes**:

```bash
# 1. Create safety guards first
.\scripts\phase87-create-safety-guards.ps1

# 2. Scale up (only new errors will be embedded)
node scripts/phase87-ingest-error-corpus.mjs --limit 10000

# 3. Monitor progress
.\scripts\phase87-monitor-ingestion.ps1
```

### Final: 10,000 → 28,063 (all syntax errors)

```bash
# Target: All TS1005/1128/1109 errors
node scripts/phase87-ingest-error-corpus.mjs --limit 28063 --codes TS1005,TS1128,TS1109
```

## Performance Targets

| Metric | Current | Target (5k) | Target (28k) |
|--------|---------|-------------|--------------|
| Embeddings | 100 | 5,000 | 28,063 |
| Coverage | 0.3% | 14.9% | 83.5% |
| Retrieval Time | <100ms | <150ms | <200ms |
| Fix Quality | 60% | 80% | 90% |
| Error Density | Random | High-density files | Surgical |

## Monitoring Checklist

While Phase 87 is running:

- [ ] Monitor #1: Vector count growing (`phase87-monitor-ingestion.ps1`)
- [ ] Monitor #2: Ollama RAM usage stays < 2GB
- [ ] Monitor #3: No stalls > 2 minutes
- [ ] Verify: Postgres connection stable
- [ ] Verify: Qdrant collections accessible

## Next Steps After Ingestion

1. **Sync with Qdrant**:
   ```bash
   node scripts/phase87-knowledge-sync.mjs
   ```

2. **Verify retrieval works**:
   ```bash
   curl http://localhost:8001/retrieve -X POST -H "Content-Type: application/json" \
     -d '{"query":"TS1005 comma expected","top_k":3}'
   ```

3. **Ingest operator docs**:
   ```bash
   node scripts/phase76-manifest-ingest.mjs \
     --manifest data/knowledge/kb-manifest-ace.txt \
     --kind ace_operator_doc
   ```

4. **Run Phase 87 fixer with budget**:
   ```bash
   node scripts/phase87-autonomous-fixer.mjs \
     --maxIterations 25 \
     --maxFiles 1 \
     --maxLinesChanged 30 \
     --stopOnWorse true
   ```

## Troubleshooting

### Python service won't start

```bash
# Install missing dependencies
pip install fastapi uvicorn httpx redis qdrant-client

# Check port availability
netstat -ano | findstr :8001
```

### Redis connection failed

```bash
# Start Redis (if using Docker)
docker start redis

# Or install Redis locally
# Windows: https://github.com/microsoftarchive/redis/releases
```

### Qdrant search returns 0 results

```bash
# Check collection exists
curl http://localhost:6333/collections/phase76_knowledge_base

# Re-create collection if needed
curl -X PUT http://localhost:6333/collections/phase76_knowledge_base \
  -H "Content-Type: application/json" \
  -d '{"vectors":{"size":768,"distance":"Cosine"}}'
```

## Files Created

| File | Purpose |
|------|---------|
| `scripts/rag-kag-service.py` | FastAPI RAG+KAG middleware |
| `scripts/phase87-monitor-ingestion.ps1` | Real-time embedding monitor |
| `scripts/phase87-create-safety-guards.ps1` | DB unique indexes |
| `scripts/phase76-manifest-ingest.mjs` | Operator docs ingestion |
| `data/knowledge/kb-manifest-ace.txt` | Docs manifest |
| `PHASE76-87-RAG-KAG-QUICKREF.md` | This file |

---

**Status**: Python service ready, Phase 87 ingesting 5,000 errors, monitors ready.

**Next Action**: Wait for Phase 87 to finish (8-10 min), then ingest operator docs.
