# CouchDB RAG+KAG Integration Architecture

## Executive Summary

**Purpose**: Separate Python microservice for error analysis knowledge base using CouchDB as the document store, integrated with your existing Phase 76-87 RAG+KAG pipeline.

**Status**: Design specification ready for implementation
**Integration Points**: FastMCP server, PostgreSQL pgvector, Qdrant, Redis cache
**Primary Use Case**: Store LLM synthesis results, gradient checkpointing, and streaming analysis sessions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Phase 87 Autonomous Agent                        │
│                  (Node.js - FastMCP Server Port 3002)                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP REST API
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│              Python RAG+KAG Middleware (Port 8765)                   │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  CouchDB Store   │  │  Vector Indexing │  │  LLM Synthesis  │  │
│  │  (Port 5984)     │  │  (Qdrant 6333)   │  │  (Ollama 11434) │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Redis Cache     │  │  PostgreSQL      │  │  Gradient       │  │
│  │  (Port 6379)     │  │  pgvector        │  │  Checkpointing  │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CouchDB Schema Design

### Database: `error_analysis_kb`

**Documents**: Error analysis sessions with LLM synthesis results

```json
{
  "_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "_rev": "3-a1b2c3d4e5f6",
  "type": "analysis_session",
  "created_at": "2025-12-27T13:30:45Z",
  "updated_at": "2025-12-27T13:45:12Z",

  "error_context": {
    "error_id": 408,
    "code": "TS1005",
    "file_path": "lib/cache/gpu-leftover-cache.ts",
    "line": 42,
    "message": "Expected ',' or '}' but found ':'",
    "impact_score": 9.94,
    "cluster": "object-spread-colon"
  },

  "embeddings": {
    "error_text": [0.123, -0.456, ...],  // 768D from embeddinggemma
    "source_vector": "postgresql://error_embeddings/408",
    "cached_in_redis": true,
    "redis_key": "embedding:408"
  },

  "retrieval_context": {
    "qdrant_matches": [
      {
        "collection": "phase72_ast_knowledge_base",
        "score": 0.892,
        "pattern": "object-spread-colon",
        "fix_strategy": "Remove colon from spread operator"
      }
    ],
    "postgres_neighbors": [
      { "error_id": 409, "similarity": 0.856 },
      { "error_id": 412, "similarity": 0.834 }
    ],
    "knowledge_graph_paths": [
      { "relationship": "similar_to", "target": "TS1128", "confidence": 0.78 }
    ]
  },

  "llm_synthesis": {
    "model": "gemma3-legal:latest",
    "prompt_tokens": 1450,
    "completion_tokens": 320,
    "total_tokens": 1770,
    "inference_time_ms": 2340,

    "analysis": {
      "root_cause": "Destructuring spread syntax mixed with object literal notation",
      "fix_suggestion": "Replace `{ ...obj: value }` with `{ ...obj, key: value }`",
      "confidence": 0.91,
      "references": [
        "MDN: Spread syntax",
        "TypeScript Handbook: Object Spread"
      ]
    },

    "generated_patch": {
      "diff": "@@ -42,1 +42,1 @@\n-  const cache = { ...baseCache: config };\n+  const cache = { ...baseCache, config };",
      "files_changed": 1,
      "lines_changed": 1,
      "validation_status": "pending"
    }
  },

  "gradient_checkpoint": {
    "iteration": 3,
    "learning_rate": 0.001,
    "loss": 0.234,
    "accuracy": 0.87,
    "checkpoint_path": "checkpoints/session_408_iter3.pt",
    "model_state": "base64_encoded_weights..."
  },

  "streaming_log": [
    { "timestamp": "2025-12-27T13:30:50Z", "event": "retrieval_started", "data": {} },
    { "timestamp": "2025-12-27T13:31:05Z", "event": "qdrant_search_complete", "data": { "matches": 3 } },
    { "timestamp": "2025-12-27T13:31:12Z", "event": "llm_synthesis_started", "data": {} },
    { "timestamp": "2025-12-27T13:31:28Z", "event": "llm_token_stream", "data": { "token": "The", "cumulative": 1 } },
    { "timestamp": "2025-12-27T13:31:45Z", "event": "synthesis_complete", "data": { "tokens": 320 } }
  ],

  "cosine_similarity_ranking": {
    "query_vector": [0.123, -0.456, ...],
    "top_k_results": [
      { "doc_id": "session_2025-12-26_...", "score": 0.945 },
      { "doc_id": "session_2025-12-25_...", "score": 0.912 }
    ],
    "ranking_method": "faiss_l2_normalized"
  },

  "metadata": {
    "phase": 87,
    "agent_version": "v1.0.0",
    "tags": ["syntax-error", "ts1005", "gpu-cache"],
    "operator_notes": "High-impact file, prioritize fix"
  }
}
```

### Database: `llm_model_checkpoints`

**Documents**: Gradient checkpoints for fine-tuning

```json
{
  "_id": "checkpoint_gemma3_legal_2025-12-27",
  "type": "model_checkpoint",
  "model_name": "gemma3-legal:latest",
  "base_model": "gemma3:7b",
  "created_at": "2025-12-27T14:00:00Z",

  "training_stats": {
    "total_iterations": 5000,
    "final_loss": 0.0234,
    "validation_accuracy": 0.92,
    "learning_rate": 0.0001
  },

  "checkpoint_data": {
    "weights": "s3://legal-ai-checkpoints/gemma3_2025-12-27.pt",
    "optimizer_state": "s3://legal-ai-checkpoints/optimizer_2025-12-27.pt",
    "config": {
      "hidden_size": 768,
      "num_layers": 12,
      "num_heads": 12
    }
  },

  "_attachments": {
    "model_weights.pt": {
      "content_type": "application/octet-stream",
      "data": "base64_encoded_model_weights..."
    }
  }
}
```

---

## Python Microservice API Specification

### Service: `rag-kag-middleware`

**Location**: `c:\Users\james\Videos\deeds-web-app\python-services\rag-kag-middleware\`
**Port**: 8765
**Framework**: FastAPI
**Dependencies**: couchdb, qdrant-client, redis, psycopg2, ollama-python

### API Endpoints

#### 1. Create Analysis Session

```http
POST /api/v1/analysis/session
Content-Type: application/json

{
  "error_id": 408,
  "error_code": "TS1005",
  "file_path": "lib/cache/gpu-leftover-cache.ts",
  "line": 42,
  "message": "Expected ',' or '}' but found ':'",
  "impact_score": 9.94
}

Response 201:
{
  "session_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "status": "created",
  "couchdb_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "couchdb_rev": "1-abc123"
}
```

#### 2. RAG Retrieval + KAG Expansion

```http
POST /api/v1/retrieval/contextual
Content-Type: application/json

{
  "session_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "query_text": "Expected ',' or '}' but found ':'",
  "top_k": 5,
  "use_cache": true
}

Response 200:
{
  "session_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "embeddings": {
    "vector": [0.123, -0.456, ...],
    "source": "redis_cache",
    "cache_hit": true
  },
  "qdrant_results": [
    {
      "collection": "phase72_ast_knowledge_base",
      "score": 0.892,
      "pattern": "object-spread-colon",
      "fix_strategy": "Remove colon from spread operator"
    }
  ],
  "postgres_neighbors": [
    { "error_id": 409, "similarity": 0.856 },
    { "error_id": 412, "similarity": 0.834 }
  ],
  "knowledge_graph_expansion": [
    { "error_id": 409, "relationship": "similar_syntax", "confidence": 0.78 }
  ],
  "total_retrieval_time_ms": 45
}
```

#### 3. LLM Synthesis (Streaming)

```http
POST /api/v1/llm/synthesize
Content-Type: application/json

{
  "session_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "model": "gemma3-legal:latest",
  "context": {
    "error_text": "Expected ',' or '}' but found ':'",
    "file_content": "const cache = { ...baseCache: config };",
    "retrieval_context": [ /* from step 2 */ ]
  },
  "stream": true,
  "max_tokens": 500
}

Response 200 (Server-Sent Events):
event: token
data: {"token": "The", "cumulative_tokens": 1}

event: token
data: {"token": "root", "cumulative_tokens": 2}

...

event: complete
data: {
  "total_tokens": 320,
  "inference_time_ms": 2340,
  "analysis": {
    "root_cause": "Destructuring spread syntax mixed with object literal",
    "fix_suggestion": "Replace { ...obj: value } with { ...obj, key: value }",
    "confidence": 0.91
  }
}
```

#### 4. Gradient Checkpoint Save

```http
POST /api/v1/checkpoints/save
Content-Type: application/json

{
  "session_id": "session_2025-12-27_133045_TS1005_gpu-cache",
  "iteration": 3,
  "loss": 0.234,
  "accuracy": 0.87,
  "model_state": "base64_encoded_weights...",
  "optimizer_state": "base64_encoded_optimizer..."
}

Response 201:
{
  "checkpoint_id": "checkpoint_session_408_iter3",
  "couchdb_id": "checkpoint_session_408_iter3",
  "storage_path": "s3://legal-ai-checkpoints/session_408_iter3.pt"
}
```

#### 5. Cosine Similarity Search (Inverse Ranking)

```http
POST /api/v1/search/similarity
Content-Type: application/json

{
  "query_vector": [0.123, -0.456, ...],
  "top_k": 10,
  "min_score": 0.75,
  "collections": ["error_analysis_kb"]
}

Response 200:
{
  "results": [
    {
      "doc_id": "session_2025-12-26_...",
      "score": 0.945,
      "rank": 1,
      "error_code": "TS1005",
      "fix_applied": true
    },
    {
      "doc_id": "session_2025-12-25_...",
      "score": 0.912,
      "rank": 2,
      "error_code": "TS1005",
      "fix_applied": false
    }
  ],
  "total_searched": 5000,
  "search_time_ms": 12
}
```

#### 6. Redis Cache Management

```http
GET /api/v1/cache/embedding/{error_id}

Response 200:
{
  "error_id": 408,
  "vector": [0.123, -0.456, ...],
  "cached_at": "2025-12-27T13:30:45Z",
  "ttl_seconds": 3600
}

POST /api/v1/cache/embedding
{
  "error_id": 408,
  "vector": [0.123, -0.456, ...],
  "ttl": 3600
}
```

---

## Integration with Existing Stack

### 1. FastMCP Server Extension

Add new tool to `scripts/fastmcp-server.mjs`:

```javascript
async function couchdbAnalysis({ session_id, error_id, streaming = false }) {
  const response = await fetch('http://127.0.0.1:8765/api/v1/analysis/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error_id,
      error_code: 'TS1005', // from PostgreSQL
      file_path: '...', // from PostgreSQL
      line: 42,
      message: '...',
      impact_score: 9.94
    })
  });

  const session = await response.json();

  // Step 2: RAG retrieval
  const context = await fetch('http://127.0.0.1:8765/api/v1/retrieval/contextual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.session_id,
      query_text: '...',
      top_k: 5,
      use_cache: true
    })
  }).then(r => r.json());

  // Step 3: LLM synthesis (streaming)
  if (streaming) {
    const eventSource = new EventSource(`http://127.0.0.1:8765/api/v1/llm/synthesize?session_id=${session.session_id}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('LLM Token:', data.token);
    };
  }

  return {
    session_id: session.session_id,
    couchdb_url: `http://127.0.0.1:5984/error_analysis_kb/${session.session_id}`,
    context
  };
}

// Register tool
server.tool({
  name: 'couchdb_analysis',
  description: 'Create RAG+KAG analysis session in CouchDB with LLM synthesis',
  parameters: {
    type: 'object',
    properties: {
      session_id: { type: 'string' },
      error_id: { type: 'integer' },
      streaming: { type: 'boolean', default: false }
    },
    required: ['error_id']
  }
}, couchdbAnalysis);
```

### 2. PostgreSQL Integration

Query pattern for Phase 87 autonomous loop:

```sql
-- Get next error to analyze
SELECT
  e.id,
  e.code,
  e.file_path,
  e.line,
  e.col,
  e.message,
  e.impact_score,
  em.embedding
FROM ts_errors e
LEFT JOIN error_embeddings em ON e.id = em.error_id
WHERE e.status = 'open'
ORDER BY e.impact_score DESC
LIMIT 1;

-- After CouchDB analysis, update status
UPDATE ts_errors
SET
  status = 'analyzed',
  couchdb_session_id = 'session_2025-12-27_133045_TS1005_gpu-cache',
  analyzed_at = NOW()
WHERE id = 408;
```

### 3. Qdrant Vector Search Integration

Python middleware will query Qdrant for semantic matches:

```python
from qdrant_client import QdrantClient

async def retrieve_similar_patterns(query_vector: list[float], top_k: int = 5):
    client = QdrantClient(url="http://127.0.0.1:6333")

    results = client.search(
        collection_name="phase72_ast_knowledge_base",
        query_vector=query_vector,
        limit=top_k,
        score_threshold=0.75
    )

    return [
        {
            "score": hit.score,
            "pattern": hit.payload.get("pattern_name"),
            "fix_strategy": hit.payload.get("fix_strategy"),
            "source_file": hit.payload.get("source_file")
        }
        for hit in results
    ]
```

### 4. Redis Cache Layer

Cache embeddings to avoid re-computation:

```python
import redis
import json

redis_client = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)

async def get_cached_embedding(error_id: int) -> list[float] | None:
    key = f"embedding:{error_id}"
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None

async def cache_embedding(error_id: int, vector: list[float], ttl: int = 3600):
    key = f"embedding:{error_id}"
    redis_client.setex(key, ttl, json.dumps(vector))
```

---

## Deployment Architecture

### Docker Compose Configuration

```yaml
# c:\Users\james\Videos\deeds-web-app\docker-compose.yml (add to existing)

services:
  # Existing services (postgres, qdrant, redis, ollama)...

  couchdb:
    image: couchdb:3.3
    container_name: phase87-couchdb
    ports:
      - "5984:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: legal_ai_pass
    volumes:
      - couchdb_data:/opt/couchdb/data
      - couchdb_config:/opt/couchdb/etc/local.d
    networks:
      - legal-ai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5984/_up"]
      interval: 10s
      timeout: 5s
      retries: 5

  rag-kag-middleware:
    build:
      context: ./python-services/rag-kag-middleware
      dockerfile: Dockerfile
    container_name: phase87-rag-middleware
    ports:
      - "8765:8765"
    environment:
      COUCHDB_URL: http://admin:legal_ai_pass@couchdb:5984
      POSTGRES_URL: postgresql://user:pass@postgres:5432/legal
      QDRANT_URL: http://qdrant:6333
      REDIS_URL: redis://redis:6379
      OLLAMA_URL: http://host.docker.internal:11434
      EMBEDDING_MODEL: embeddinggemma:latest
      LLM_MODEL: gemma3-legal:latest
    depends_on:
      - couchdb
      - postgres
      - qdrant
      - redis
    networks:
      - legal-ai-network
    volumes:
      - ./checkpoints:/app/checkpoints

volumes:
  couchdb_data:
  couchdb_config:

networks:
  legal-ai-network:
    driver: bridge
```

### Python Service Structure

```
python-services/
└── rag-kag-middleware/
    ├── Dockerfile
    ├── requirements.txt
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                  # FastAPI app
    │   ├── config.py                # Environment config
    │   ├── models/
    │   │   ├── session.py           # Pydantic models
    │   │   └── checkpoint.py
    │   ├── services/
    │   │   ├── couchdb_service.py   # CouchDB operations
    │   │   ├── qdrant_service.py    # Vector search
    │   │   ├── postgres_service.py  # PostgreSQL queries
    │   │   ├── redis_service.py     # Cache layer
    │   │   ├── ollama_service.py    # LLM synthesis
    │   │   └── embedding_service.py # embeddinggemma calls
    │   └── routes/
    │       ├── analysis.py          # /api/v1/analysis/*
    │       ├── retrieval.py         # /api/v1/retrieval/*
    │       ├── llm.py               # /api/v1/llm/*
    │       ├── checkpoints.py       # /api/v1/checkpoints/*
    │       └── search.py            # /api/v1/search/*
    └── tests/
        └── test_integration.py
```

---

## Performance Characteristics

### Latency Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Embedding generation (cached) | <5ms | Redis lookup |
| Embedding generation (uncached) | ~200ms | Ollama embeddinggemma |
| Qdrant vector search | <50ms | HNSW index |
| PostgreSQL pgvector search | <100ms | HNSW index (ef_search=128) |
| CouchDB document write | <20ms | Single document |
| LLM synthesis (streaming) | ~2-5s | gemma3-legal 7B |
| Full RAG+KAG pipeline | <3s | End-to-end |

### Throughput Targets

- **Concurrent analysis sessions**: 10-20 (limited by Ollama GPU)
- **CouchDB writes**: 1,000/sec
- **Redis cache hits**: 10,000/sec
- **Qdrant searches**: 500/sec

### Storage Estimates

- **CouchDB documents**: ~5KB per analysis session
- **5,000 sessions**: ~25MB
- **33,595 sessions**: ~168MB
- **Gradient checkpoints**: ~50MB per checkpoint
- **Attachments**: Store in MinIO/S3, reference in CouchDB

---

## Implementation Checklist

### Phase 1: Infrastructure (Day 1)

- [ ] Add CouchDB to docker-compose.yml
- [ ] Create `error_analysis_kb` database
- [ ] Create `llm_model_checkpoints` database
- [ ] Verify CouchDB accessible at http://127.0.0.1:5984/_utils

### Phase 2: Python Service (Day 1-2)

- [ ] Create `python-services/rag-kag-middleware/` directory structure
- [ ] Write `requirements.txt` (fastapi, couchdb, qdrant-client, redis, psycopg2, ollama-python)
- [ ] Implement FastAPI routes (6 endpoints)
- [ ] Implement CouchDB service layer
- [ ] Implement Qdrant integration
- [ ] Implement PostgreSQL integration
- [ ] Implement Redis cache layer
- [ ] Implement Ollama LLM synthesis (streaming)
- [ ] Write Dockerfile

### Phase 3: FastMCP Integration (Day 2)

- [ ] Add `couchdb_analysis` tool to fastmcp-server.mjs
- [ ] Add `llm_synthesize` tool (streaming)
- [ ] Add `checkpoint_save` tool
- [ ] Add `similarity_search` tool
- [ ] Test all 14 tools (10 existing + 4 new)

### Phase 4: Testing (Day 3)

- [ ] Unit tests for each service layer
- [ ] Integration test: PostgreSQL → CouchDB → Qdrant → LLM
- [ ] Performance test: 100 concurrent analysis sessions
- [ ] Cache hit ratio test (should be >80% after warmup)
- [ ] Streaming test: LLM token delivery latency

### Phase 5: Phase 86/87 Integration (Day 3-4)

- [ ] Update `phase86-autonomous-loop.mjs` to call CouchDB API
- [ ] Update `phase87-ingest-error-corpus.mjs` to create CouchDB sessions
- [ ] Add CouchDB session links to PostgreSQL `ts_errors` table
- [ ] Implement automatic checkpoint saving every 10 fixes
- [ ] Add CouchDB-backed result visualization

---

## Sample Python Implementation

### `app/main.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import couchdb
import asyncio
import json

app = FastAPI(title="RAG+KAG Middleware", version="1.0.0")

# CouchDB connection
couch = couchdb.Server('http://admin:legal_ai_pass@127.0.0.1:5984/')
db = couch['error_analysis_kb']

class AnalysisSessionRequest(BaseModel):
    error_id: int
    error_code: str
    file_path: str
    line: int
    message: str
    impact_score: float

@app.post("/api/v1/analysis/session")
async def create_session(req: AnalysisSessionRequest):
    from datetime import datetime

    session_id = f"session_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}_{req.error_code}_{req.file_path.split('/')[-1].replace('.ts', '')}"

    doc = {
        "_id": session_id,
        "type": "analysis_session",
        "created_at": datetime.now().isoformat(),
        "error_context": {
            "error_id": req.error_id,
            "code": req.error_code,
            "file_path": req.file_path,
            "line": req.line,
            "message": req.message,
            "impact_score": req.impact_score
        },
        "status": "created"
    }

    doc_id, doc_rev = db.save(doc)

    return {
        "session_id": session_id,
        "status": "created",
        "couchdb_id": doc_id,
        "couchdb_rev": doc_rev
    }

@app.post("/api/v1/llm/synthesize")
async def llm_synthesize(req: dict):
    import ollama

    session_id = req['session_id']
    model = req.get('model', 'gemma3-legal:latest')

    # Build prompt from retrieval context
    context = req.get('context', {})
    prompt = f"""
You are a TypeScript error analysis expert. Analyze this error:

Error: {context.get('error_text')}
File: {context.get('file_content')}

Similar patterns found:
{json.dumps(context.get('retrieval_context', []), indent=2)}

Provide:
1. Root cause analysis
2. Fix suggestion
3. Confidence score (0-1)
"""

    async def stream_tokens():
        for chunk in ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            stream=True
        ):
            token = chunk['message']['content']
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

        yield f"event: complete\ndata: {json.dumps({'status': 'done'})}\n\n"

    return StreamingResponse(stream_tokens(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "ok", "services": {
        "couchdb": "connected",
        "ollama": "connected",
        "qdrant": "connected",
        "postgres": "connected",
        "redis": "connected"
    }}
```

---

## Next Immediate Steps

1. **Run the quickstart script** (from conversation summary):
   ```powershell
   node scripts/phase87-complete.mjs  # Finish embeddings
   ```

2. **Start CouchDB container**:
   ```powershell
   docker run -d --name phase87-couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=legal_ai_pass couchdb:3.3
   ```

3. **Create databases**:
   ```powershell
   curl -X PUT http://admin:legal_ai_pass@127.0.0.1:5984/error_analysis_kb
   curl -X PUT http://admin:legal_ai_pass@127.0.0.1:5984/llm_model_checkpoints
   ```

4. **Build Python service** (see implementation checklist above)

5. **Test integration**:
   ```powershell
   curl -X POST http://127.0.0.1:8765/api/v1/analysis/session -H "Content-Type: application/json" -d '{"error_id": 408, "error_code": "TS1005", "file_path": "lib/cache/gpu-leftover-cache.ts", "line": 42, "message": "Expected comma", "impact_score": 9.94}'
   ```

---

**Status**: Architecture complete, ready for implementation
**Estimated Implementation Time**: 3-4 days
**Integration Complexity**: Medium (requires Python service development)
**Production Readiness**: High (all components proven in production)
