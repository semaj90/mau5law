# Phase 72 Topology Brain - Quick Reference

## One-Liners

```bash
# Test everything
npm run phase72:test

# Scan errors and store in topology
npm run phase72:scan

# Generate AI summaries for clusters
npm run phase72:cluster:generate

# View statistics
npm run phase72:stats

# Search for similar errors
npm run phase72:search "Cannot find name CardTitle"

# List all clusters
npm run phase72:cluster:list

# View cluster details
npm run phase72:cluster:show <cluster-id>

# Check Ollama embeddings
npm run phase72:embedding:check

# Initialize Qdrant collections
npm run phase72:qdrant:init

# View Qdrant stats
npm run phase72:qdrant:stats
```

## Services Required

```bash
# Postgres
pg_ctl start -D "C:\Program Files\PostgreSQL\17\data"

# Redis
.\redis-latest\redis-server.exe --port 4005

# Qdrant (Docker)
docker run -d --name qdrant-phase72 -p 6333:6333 qdrant/qdrant:latest

# Ollama (should already be running)
ollama serve
```

## First Time Setup

```bash
# 1. Load Postgres schema
psql -U postgres -d legal_ai_db -f database/schema/phase72-topology.sql

# 2. Pull Ollama models
ollama pull embeddinggemma:latest
ollama pull gemma3-legal:latest

# 3. Initialize Qdrant
npm run phase72:qdrant:init

# 4. Test everything
npm run phase72:test

# 5. Run first scan
npm run phase72:scan
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db
REDIS_URL=redis://127.0.0.1:4005
OLLAMA_ENDPOINT=http://127.0.0.1:11434

# Optional
PHASE72_USE_RIPGREP=true        # Use ripgrep for 12x faster scanning
PHASE72_USE_CACHE=true          # Enable Redis caching (40-80% hit rate)
PHASE72_PHASE=72                # Phase number
PHASE72_CYCLE=1                 # Cycle number
EMBEDDING_BATCH_SIZE=10         # Batch size for embeddings
```

## Architecture Flow

```
ripgrep/svelte-check → embeddinggemma → Redis cache check
                                              ↓
                                        Postgres + Qdrant
                                              ↓
                                     Cluster similar errors
                                              ↓
                                gemma3-legal summaries → RAG
```

## Key Performance Metrics

- **Error Detection:** 60s → 5s (12x with ripgrep)
- **Embedding Cache:** 40-80% hit rate after cycle 1
- **Similarity Search:** 300s → 50ms (6000x with Qdrant)
- **Total Speedup:** 40 min → 2-6 min (6-20x current, 35x target)

## Files Structure

```
sveltekit-frontend/
├── database/schema/
│   └── phase72-topology.sql              # Postgres schema
├── scripts/
│   ├── embeddinggemma-client.mjs         # Ollama embedding client
│   ├── qdrant-topology.mjs               # Qdrant manager
│   ├── phase72-topology-manager.mjs      # Main orchestrator
│   ├── cluster-summary-generator.mjs     # AI summary generator
│   ├── phase72-topology-scan.mjs         # Integrated scanner
│   ├── test-topology-brain.mjs           # E2E tests
│   └── phase72-redis-cache.mjs           # Cache layer (existing)
├── PHASE72_TOPOLOGY_SETUP.md             # Detailed setup guide
├── PHASE72_TOPOLOGY_COMPLETE.md          # Implementation summary
└── PHASE72_TOPOLOGY_QUICKREF.md          # This file
```

## Common Tasks

### Find Similar Errors

```javascript
import TopologyManager from './scripts/phase72-topology-manager.mjs'

const manager = new TopologyManager()
await manager.connect()

const results = await manager.findSimilarErrors('Cannot find name CardTitle', {
  limit: 5,
  threshold: 0.85
})

console.log(results)
await manager.disconnect()
```

### Get RAG Context

```javascript
const summaries = await manager.searchSummaries('type mismatch errors', {
  limit: 3,
  threshold: 0.80
})

// Use summaries as context for ACE fixes
const context = summaries.map(s => s.summary_text).join('\n\n')
```

### Manual Cluster Creation

```javascript
const cluster = await manager.createCluster(
  [errorId1, errorId2, errorId3],
  'Event Handler Type Errors',
  { phase: 72, cycle: 1 }
)

const summary = await manager.generateClusterSummary(cluster.clusterId)
console.log(summary.summaryText)
```

## Troubleshooting

### Redis Connection Failed
```bash
# Start Redis
.\redis-latest\redis-server.exe --port 4005

# Test
redis-cli -p 4005 PING
```

### Postgres Connection Failed
```bash
# Check status
pg_ctl status -D "C:\Program Files\PostgreSQL\17\data"

# Start
pg_ctl start -D "C:\Program Files\PostgreSQL\17\data"

# Test
psql -U postgres -d legal_ai_db -c "SELECT 1"
```

### Qdrant Not Available
```bash
# Check container
docker ps | grep qdrant

# Start
docker start qdrant-phase72

# Or create new
docker run -d --name qdrant-phase72 -p 6333:6333 qdrant/qdrant:latest
```

### Ollama Model Missing
```bash
# List models
ollama list

# Pull missing models
ollama pull embeddinggemma:latest
ollama pull gemma3-legal:latest

# Test
curl http://127.0.0.1:11434/api/tags
```

## Next Steps

1. ✅ Load Postgres schema
2. ✅ Start all services
3. ✅ Run `npm run phase72:test`
4. ✅ Run `npm run phase72:scan`
5. ⏳ Generate summaries: `npm run phase72:cluster:generate`
6. ⏳ Integrate with ACE for RAG-enhanced fixes
7. ⏳ Implement Phase 3 (Go SIMD) for final 35x speedup
