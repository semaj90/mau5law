# Phase 72 Topology Brain - Setup Guide

## Overview

The Phase 72 Topology Brain is a complete RAG (Retrieval-Augmented Generation) system that learns from TypeScript errors across multiple cycles. It combines:

- **Postgres 17 + pgvector** - Relational storage with 768-dim vector similarity
- **Qdrant** - Fast vector search for errors and summaries
- **Redis** - Cache layer for embeddings and LLM responses
- **Ollama embeddinggemma** - 768-dim embedding generation
- **Ollama gemma3-legal** - Cluster summary generation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 72 Topology Brain                   │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐         ┌─────────┐
    │ Postgres│          │  Qdrant │         │  Redis  │
    │ +pgvector│          │ Vector  │         │  Cache  │
    │         │          │  Search │         │         │
    └────┬────┘          └────┬────┘         └────┬────┘
         │                    │                    │
         │  Source of Truth   │  Fast Similarity  │  Cache Layer
         │                    │  Search (50ms)    │  (40-80% hits)
         │                    │                   │
         └────────────────────┴───────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              ┌──────────┐        ┌──────────┐
              │ Ollama   │        │ Ollama   │
              │embedding │        │  gemma3  │
              │ gemma    │        │  -legal  │
              │(768-dim) │        │(summaries)│
              └──────────┘        └──────────┘
```

## Prerequisites

### 1. Postgres 17 with pgvector

**Install pgvector extension:**

```sql
-- Connect to your database
psql -U postgres -d legal_ai_db

-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Load Phase 72 schema:**

```bash
psql -U postgres -d legal_ai_db -f database/schema/phase72-topology.sql
```

**Verify tables:**

```sql
\dt phase72_*

-- Should show:
-- phase72_error
-- phase72_error_vector
-- phase72_cluster
-- phase72_cluster_summary
-- phase72_fix_history
```

### 2. Qdrant Vector Database

**Start Qdrant (Docker):**

```bash
docker run -d --name qdrant-phase72 \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

**Verify:**

```bash
curl http://localhost:6333/collections
# Should return: {"result":{"collections":[]},"status":"ok"}
```

**Initialize collections:**

```bash
node scripts/qdrant-topology.mjs init 768
```

### 3. Redis Cache

**Start Redis (Windows):**

```powershell
# Using existing Redis instance
cd C:\Users\james\Videos\deeds-web-app
.\redis-latest\redis-server.exe --port 4005
```

**Verify:**

```bash
redis-cli -p 4005 PING
# Should return: PONG
```

### 4. Ollama Models

**Pull required models:**

```bash
# Embedding model (768-dim vectors)
ollama pull embeddinggemma:latest

# Summary generation model
ollama pull gemma3-legal:latest
```

**Verify models:**

```bash
ollama list
# Should show both embeddinggemma and gemma3-legal
```

**Test embedding:**

```bash
node scripts/embeddinggemma-client.mjs check
# Expected: "✅ embeddinggemma:latest is available (768 dimensions)"
```

## Installation

**Install Node.js dependencies:**

```bash
cd sveltekit-frontend
npm install pg ioredis ora cli-progress
```

## Configuration

**Environment variables (.env):**

```bash
# Postgres connection
DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db

# Redis connection
REDIS_URL=redis://127.0.0.1:4005

# Ollama endpoint
OLLAMA_ENDPOINT=http://127.0.0.1:11434

# Phase 72 settings
PHASE72_USE_RIPGREP=true
PHASE72_USE_CACHE=true
PHASE72_PHASE=72
PHASE72_CYCLE=1
```

## Testing

**Run comprehensive test suite:**

```bash
node scripts/test-topology-brain.mjs
```

**Expected output:**

```
=== Prerequisites ===
✅ All prerequisites available
  Postgres: ✅
  Redis: ✅
  Qdrant: ✅
  Ollama: ✅

=== Embedding Generation ===
✅ Generated 2 embeddings (768-dim)

=== Qdrant Collections ===
✅ Qdrant collections ready (0 error vectors, 0 summary vectors)

=== Topology Ingestion ===
✅ Ingested 2 test errors (0 cache hits, 2 new)

=== Similarity Search ===
✅ Found 2 similar errors (threshold 0.80)

=== Cluster Summary ===
✅ Generated summary: "These errors indicate TypeScript type mismatches..."

=== RAG Retrieval ===
✅ Retrieved 1 summaries for RAG context

✅ All tests passed!
```

## Usage

### 1. Scan and Ingest Errors

```bash
# Run Phase 72 scan with topology storage
node scripts/phase72-topology-scan.mjs
```

**Output:**

```
[phase72-scan] Starting Phase 72 Cycle 1 error scan
[phase72-scan] Config: ripgrep=true, cache=true
✅ ripgrep found 127 errors
✅ Connected to Postgres + Qdrant + Redis
✅ Ingested 127 errors (45 cache hits, 82 new embeddings)

=== Topology Statistics ===
Total errors in DB: 127
Total clusters: 0
Total summaries: 0
Qdrant error vectors: 127
Qdrant summary vectors: 0
Redis cache: 82 embeddings, 0 fixes

✅ Phase 72 Cycle 1 complete
Results saved to phase72-cycle1-results.json
```

### 2. Find Similar Errors

```bash
# Search for errors similar to a query
node scripts/phase72-topology-manager.mjs search "Cannot find name CardTitle"
```

**Output:**

```
[
  {
    "error_hash": "a3b5c7...",
    "code": "TS2304",
    "message": "Cannot find name 'CardTitle'",
    "file_path": "src/lib/ui/card.svelte",
    "line": 42,
    "similarity": 0.98
  },
  {
    "error_hash": "d8e9f1...",
    "code": "TS2304",
    "message": "Cannot find name 'CardDescription'",
    "file_path": "src/lib/ui/card.svelte",
    "line": 48,
    "similarity": 0.92
  }
]
```

### 3. Generate Cluster Summaries

```bash
# Generate summaries for all clusters without them
node scripts/cluster-summary-generator.mjs generate
```

**Output:**

```
✅ Found 5 clusters
✅ Generated summary for cluster abc123: "These errors relate to missing component imports..."
✅ Generated summary for cluster def456: "Type mismatch errors in event handlers..."

Summary generation complete:
  ✅ Generated: 5
  ❌ Failed: 0
```

### 4. View Cluster Details

```bash
node scripts/cluster-summary-generator.mjs show <cluster-id>
```

### 5. RAG Context Retrieval

```bash
# Get summaries for RAG context
node -e "
import TopologyManager from './scripts/phase72-topology-manager.mjs';
const m = new TopologyManager();
await m.connect();
const summaries = await m.searchSummaries('event handler type errors', { limit: 3 });
console.log(JSON.stringify(summaries, null, 2));
await m.disconnect();
"
```

## Performance Metrics

### Expected Speedups

| Stage | Baseline | Phase 1 (ripgrep+Redis) | Phase 2 (Qdrant) | Phase 3 (Go SIMD) |
|-------|----------|------------------------|------------------|------------------|
| Error Detection | 60s | 5s (12x) | 5s | 2s (30x) |
| Embedding Generation | 300s | 120s (2.5x cache) | 60s (5x cache) | 60s |
| Clustering | 300s | 300s | 0.05s (6000x) | 0.05s |
| Total (3 cycles) | 40 min | 6 min (6.7x) | 2 min (20x) | 1.2 min (35x) |

### Cache Hit Rates

- **Cycle 1:** 0% (cold start)
- **Cycle 2:** 40-60% (similar errors cached)
- **Cycle 3:** 70-80% (most errors cached)

## Troubleshooting

### Postgres Connection Failed

```bash
# Check if Postgres is running
pg_ctl status -D "C:\Program Files\PostgreSQL\17\data"

# Start Postgres
pg_ctl start -D "C:\Program Files\PostgreSQL\17\data"

# Test connection
psql -U postgres -d legal_ai_db -c "SELECT 1"
```

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli -p 4005 PING

# Start Redis
cd C:\Users\james\Videos\deeds-web-app
.\redis-latest\redis-server.exe --port 4005
```

### Qdrant Not Available

```bash
# Check Docker container
docker ps | grep qdrant

# Start Qdrant
docker start qdrant-phase72

# Or run new container
docker run -d --name qdrant-phase72 -p 6333:6333 qdrant/qdrant:latest
```

### Ollama Model Not Found

```bash
# List installed models
ollama list

# Pull missing model
ollama pull embeddinggemma:latest
ollama pull gemma3-legal:latest

# Test embedding
curl http://127.0.0.1:11434/api/embeddings -d '{
  "model": "embeddinggemma:latest",
  "prompt": "test"
}'
```

### Out of Memory

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" node scripts/phase72-topology-scan.mjs

# Reduce batch size
EMBEDDING_BATCH_SIZE=5 node scripts/phase72-topology-scan.mjs
```

## Next Steps

1. **Run first scan:** `node scripts/phase72-topology-scan.mjs`
2. **Generate summaries:** `node scripts/cluster-summary-generator.mjs generate`
3. **Test similarity search:** Search for common errors
4. **Integrate with ACE:** Use RAG summaries for smarter fixes
5. **Monitor performance:** Track cache hit rates and speedup

## Files Created

- `database/schema/phase72-topology.sql` - Postgres schema
- `scripts/embeddinggemma-client.mjs` - Ollama embedding client
- `scripts/qdrant-topology.mjs` - Qdrant collection manager
- `scripts/phase72-topology-manager.mjs` - Main topology orchestrator
- `scripts/cluster-summary-generator.mjs` - LLM summary generator
- `scripts/phase72-topology-scan.mjs` - Integrated error scanner
- `scripts/test-topology-brain.mjs` - E2E test suite
- `PHASE72_TOPOLOGY_SETUP.md` - This guide
