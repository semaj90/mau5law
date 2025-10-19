- no assist me
●
  2. Then I'll help you copy it to WSL and install it using the existing trt_env.
    Download that wheel file and let me know when it's ready.
- check if it's already installed before attempting to isntall anything
- ubuntu password = 123456
- always use verbose output (-v) for pip installs to get detailed error messages
- grpo is needed
- use Install-TensorRT-LLM-WSL-Fixed.ps1 for faster downloads with intelligent caching
- cache system enables: offline wheel installs, faster repeated setups, engine/.plan file building
- PowerShell script includes PyTorch cache (pytorch_cache.json), TensorRT-LLM wheel cache, dependencies cache
- optimized for legal AI: GEMMA_MODEL_PATH integration, TARGET_LATENCY_MS=500, MAX_BATCH_SIZE=8
- he TensorRT-LLM installations completed successfully. Your Ubuntu & Docker
  Desktop legal AI system is ready with:

  - Native Ubuntu TensorRT-LLM: ✅ Installed (7GB complete)
  - wsl use wsl, Ubuntu router scripts: ✅ Created
  - Legal AI optimization: ✅ Working (2.47 req/sec)
  - Cache integration: ✅ trt_cache/ and trt_wheels/ directories

  I should have just checked completion status instead of running parallel
  processes and lengthy explanations.

  The system works - you can now use
  TensorRT-LLM for 2-10x faster legal AI inference on Ubuntu

## TensorRT-LLM Requirements
- **CRITICAL**: TensorRT-LLM is built for Python 3.10 ONLY
- Python 3.12 does NOT work with TensorRT-LLM
- Must use Python 3.10 environment for safetensor conversion to .plan engines
- Use: `python3.10` specifically, not `python3` or `python3.12`

## Working TensorRT Environment
- **Location**: `~/trt_env_310/bin/activate`
- **Python Version**: 3.10.18 ✅
- **Packages Installed**:
  - safetensors 0.6.2 ✅
  - tensorrt-llm 1.1.0rc5 ✅
  - tensorrt 10.11.0.33 ✅
- **Activation Command**: `wsl bash -c "source ~/trt_env_310/bin/activate"`
- **Status**: Ready for safetensor → .plan engine conversion
- enhanced-bits  Fixed the Popover import issue in
  DropdownBits.svelte. The problem was that Popover
  was being imported as a named import from "bits-ui",
   but it should be imported as a namespace from
  "bits-ui/popover" to access the Root, Trigger, and
  Content sub-components.

## Docker Service URL Mappings - Production Stack

### Core Infrastructure Services
- **PostgreSQL (pgvector)**: `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`
  - Container: `pgvector/pgvector:pg17`
  - Host Port: `5434:5432`
  - Vector Extension: pgvector enabled for embeddings
  - Health: `http://localhost:5434` (pg_isready check)

- **PostgreSQL Test Instance**: `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`
  - Container: `pgvector/pgvector:pg17`
  - Host Port: `5434:5432`
  - Isolated test database instance

- **Redis Cache**: `redis://:redis@localhost:6379/0`
  - Container: `redis:7-alpine` or `redis/redis-stack:latest`
  - Host Port: `6379:6379`
  - Password: `redis`
  - RedisInsight UI: `http://localhost:8001`
  - Modules: RediSearch, RedisJSON, RedisTimeSeries, RedisBloom
  - Health: `redis-cli ping`

- **Redis Test Instance**: `redis://localhost:6380`
  - Container: `redis:7-alpine`
  - Host Port: `6380:6379`
  - Isolated test cache instance

### Vector & Graph Databases
- **Qdrant Vector DB**: `http://localhost:6333`
  - Container: `qdrant/qdrant:latest`
  - HTTP Port: `6333:6333`
  - gRPC Port: `6334:6334`
  - Health: `http://localhost:6333/health`
  - Use: Advanced vector similarity search

- **Neo4j Graph Database**: `bolt://localhost:7687`
  - Container: `neo4j:5-community`
  - HTTP Browser: `http://localhost:7474`
  - Bolt Protocol: `7687:7687`
  - Auth: `neo4j/legal123456`
  - Plugins: APOC, Graph Data Science
  - Memory: 1GB pagecache, 1GB heap

### Message Queue & Storage
- **RabbitMQ**: `amqp://legal_admin:123456@localhost:5672`
  - Container: `rabbitmq:3-management-alpine`
  - AMQP Port: `5672:5672`
  - Management UI: `http://localhost:15672`
  - Default vhost: `/`
  - Health: `rabbitmq-diagnostics -q ping`

- **MinIO Object Storage**: `http://localhost:9000`
  - Container: `minio/minio:latest`
  - API Port: `9000:9000`
  - Console UI: `http://localhost:9001`
  - Access Key: `minio` or `minioadmin`
  - Secret Key: `minio123` or `minioadmin123`
  - Bucket: `legal-documents`
  - Health: `http://localhost:9000/minio/health/live`

### AI & ML Services
- **Ollama LLM**: `http://localhost:11434`
  - Container: `ollama/ollama:latest`
  - Host Port: `11434:11434` (native) or `11435:11434` (docker)
  - Models: gemma3, embeddinggemma:latest, nomic-embed-text
  - GPU: NVIDIA RTX 3060 Ti (CUDA enabled)
  - Model Storage: `/root/.ollama/models`

- **FastAPI Embedding Service**: `http://localhost:8000`
  - Container: Custom build (python-workers/fastapi-embed)
  - Port: `8000:8000`
  - Health: `http://localhost:8000/health`
  - Cache: Transformers model cache at `/app/cache`

### Frontend & Gateway Services
- **SvelteKit Frontend**: `http://localhost:5173-5179`
  - Container: legal-ai-frontend
  - Main Ports: `5173-5179` (SvelteKit instances)
  - HMR WebSocket: `6173-6179` (+1000 from main)
  - Custom WebSocket: `7173-7179` (+2000 from main)
  - Environment: Development with hot reload

- **Caddy Reverse Proxy**:
  - HTTPS: `https://localhost:443` (TCP)
  - QUIC/HTTP3: `https://localhost:443` (UDP)
  - HTTP Redirect: `http://localhost:80`
  - Container: `caddy:latest`
  - Config: `./Caddyfile` or `./Caddyfile.ws`

- **QUIC Server**: `quic://localhost:4433`
  - Container: legal-ai-quic
  - QUIC Ports: `4433:4433/udp`, `4434:4434/udp`
  - HTTP Fallback: `http://localhost:8095`
  - Protocol: Ultra-low latency transport
  - Use: Tensor streaming, real-time legal data

### Go Microservices (Ports 8080-8136)
- **Legal Gateway**: `http://localhost:8080`
- **Enhanced RAG Service**: `http://localhost:8094`
- **GPU Orchestrator**: `http://localhost:8095`
- **TensorRT Bridge**: `http://localhost:8086`
- **Context7 MCP Server**: `http://localhost:8777`
- **All Services**: Standardized `/health` endpoints

### Error Analysis & Debugging Checklist

#### Database Connection Issues
```bash
# PostgreSQL
PGPASSWORD=123456 psql -h localhost -p 5434 -U legal_admin -d legal_ai_db -c "\dt"

# Redis
redis-cli -p 6379 -a redis ping

# Neo4j
curl http://localhost:7474
```

#### Service Health Monitoring
```bash
# All microservices health
curl http://localhost:5173/api/go/health

# XState status
curl http://localhost:5173/api/v1/xstate

# Context7 MCP
curl http://localhost:8777/health

# Qdrant vector DB
curl http://localhost:6333/health

# MinIO storage
curl http://localhost:9000/minio/health/live

# RabbitMQ
curl -u legal_admin:123456 http://localhost:15672/api/overview
```

#### Common Port Conflicts
- PostgreSQL: Use 5434 (not 5432) to avoid conflicts
- Ollama: Use 11435 in Docker to avoid host Ollama on 11434
- Redis: Standard 6379, test instance on 6380
- SvelteKit: Multiple instances 5173-5179 for parallel dev

#### Docker Network
- Network Name: `legal-ai-network`
- Driver: `bridge`
- Internal DNS: Services resolve by container name
- Example: `postgres` resolves to PostgreSQL container
- Host Access: Use `host.docker.internal` for host services (Ollama)

### Vector Search Architecture
```typescript
// PostgreSQL pgvector (primary)
const pgResults = await db.execute(sql`
  SELECT * FROM legal_documents
  ORDER BY embedding <-> ${queryEmbedding}::vector
  LIMIT 10
`);

// Qdrant (advanced similarity)
const qdrantResults = await qdrantClient.search('legal_docs', {
  vector: queryEmbedding,
  limit: 10,
  score_threshold: 0.8
});

// Redis cache layer
const cachedResults = await redis.get(`search:${queryHash}`);
```

### Graph Database Integration
```typescript
// Neo4j case relationship queries
const neo4jSession = driver.session();
const result = await neo4jSession.run(`
  MATCH (c1:Case)-[r:CITES]->(c2:Case)
  WHERE c1.id = $caseId
  RETURN c2.id, c2.title, r.relevance
  ORDER BY r.relevance DESC
  LIMIT 10
`, { caseId });
```

### Message Queue Patterns
```typescript
// RabbitMQ async processing
await channel.assertQueue('legal.documents.queue', { durable: true });
channel.sendToQueue('legal.documents.queue',
  Buffer.from(JSON.stringify({ documentId, action: 'embed' }))
);

// XState integration
xstateIntegration.sendEvent('documentProcessing', {
  type: 'PROCESS_DOCUMENT',
  documentId
});
```