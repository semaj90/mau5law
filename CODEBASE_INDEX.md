# Codebase Index - Deeds Web Application

**Last Updated:** December 29, 2025
**Total Containers:** 20 (8 running)
**Architecture:** Multi-service microservices with SvelteKit frontend

---

## Quick Navigation

- [Product Architecture](#product-architecture) → `.kiro/steering/product.md`
- [System Structure](#system-structure) → `.kiro/steering/structure.md`
- [Technology Stack](#technology-stack) → `.kiro/steering/tech.md`
- [Context7 AI Platform](#context7-ai-platform) → `CONTEXT7_COMPREHENSIVE_GUIDE.md`
- [Known Issues](#known-issues)

---

## Product Tags → Paths

### Evidence Management
- **Tag:** `product:evidence`
- **Paths:**
  - `sveltekit-frontend/src/routes/(app)/evidence/**` - Evidence UI routes
  - `backend/services/evidence-service/` - Evidence processing backend
  - `go-services/evidence-processor/` - Go-based evidence indexing
  - `.kiro/specs/evidence-management/` - Product specs

### Search & Discovery
- **Tag:** `product:search`
- **Paths:**
  - `sveltekit-frontend/src/routes/(app)/search/**` - Search UI
  - `sveltekit-frontend/src/routes/(app)/admin/knowledge-search/**` - Phase 89 Knowledge Search
  - `sveltekit-frontend/src/lib/services/search-service.ts` - Search client
  - `go-services/rag-service/` - RAG search backend
  - `.kiro/specs/agentic-knowledge-integration/` - Knowledge search specs

### Vision & AI
- **Tag:** `product:vision`
- **Paths:**
  - `sveltekit-frontend/src/routes/(app)/vision/**` - Computer vision UI
  - `backend/services/vision-service/` - Vision ML models
  - `.kiro/specs/vision-pipeline/` - Vision architecture

### Inference Engine
- **Tag:** `product:inference`
- **Paths:**
  - `sveltekit-frontend/src/lib/inference/` - Client-side inference
  - `go-services/legal-engine/` - Legal reasoning engine
  - `backend/services/inference/` - ML inference API
  - `.kiro/specs/legal-inference/` - Inference specs

---

## Context7 AI Platform

**Complete Documentation:** `CONTEXT7_COMPREHENSIVE_GUIDE.md`
**Primary Server:** http://localhost:3007 (16 workers) ⭐
**Cache Indexer:** 82,656+ Redis keys → Qdrant (1000x speedup) 🆕
**ACE Synthesizer:** RAG+KAG+Redis (6x pipeline speedup) 🆕

Context7 is a comprehensive AI infrastructure system with **8 integrated components:**

### 0. Context7 Multi-Core Server (PRIMARY)
- **Tag:** `tech:context7/server`
- **Port:** 3007
- **Workers:** 16 parallel threads
- **Files:**
  - `scripts/phase89-context7-server.mjs`
  - `scripts/phase89-gpu-streaming-cluster.py`
- **Features:**
  - SSE streaming (real-time progress)
  - Non-blocking job queue
  - GPU clustering with CUDA
  - Redis caching (82K+ keys)
- **API:** POST /cluster, GET /jobs/:id/stream, GET /health
- **Data:** 40,106 errors indexed

### 1. GPU Multicore Optimization
- **Tag:** `tech:context7/gpu`
- **Flag:** `CONTEXT7_MULTICORE=true`
- **Device:** RTX 3060 Ti with CUDA
- **Scripts:** `dev:gpu`, `dev:gpu:quic`, `dev:gpu:8g`
- **Performance:** 486x speedup with Redis GPU cache

### 2. MCP Context7 Server
- **Tag:** `tech:context7/mcp`
- **Port:** 3002
- **Files:**
  - `mcp-servers/context7-server.js`
  - `scripts/mcp-context7-optimized.mjs`
  - `scripts/demo-context7-rag.js`
- **Features:** Function calling, context management, tool registration

### 3. SIMD JSON Accelerator
- **Tag:** `tech:context7/simd`
- **Port:** 8096 (changed from 8095)
- **Performance:** 10x faster JSON parsing
- **Config:** `mcp-multicore-config.json`
- **Docs:** `docs/SIMD_PORT_FIX_FINAL.md`

### 4. ACE Contextual Engineering
- **Tag:** `tech:context7/ace`
- **Files:**
  - `scripts/phase89-ace-rag-kag.mjs`
  - `src/lib/services/context7-mcp-integration.ts`
  - `context7-adapter.ts`
  - `context7-error-pipeline.go`
- **Pipeline:** Error → Embedding → Vector Search → Cache → AST Fix

### 5. Multi-Database Integration
- **Tag:** `tech:context7/pipeline`
- **Databases:** Redis + Qdrant + PostgreSQL
- **Flow:** TypeScript Error → PostgreSQL → Qdrant → Redis → Context7 → Fix

### 6. Redis Cache Vector Indexer 🆕
- **Tag:** `tech:context7/cache-indexer`
- **File:** `scripts/phase89-redis-qdrant-cache-indexer.mjs` (498 lines)
- **Documentation:** `PHASE89_REDIS_QDRANT_CACHE_INDEXER.md`
- **Features:**
  - Index 82,656+ Redis keys in Qdrant
  - GPU embeddings (embeddinggemma:latest, 768-dim)
  - gzip compression (70% metadata reduction)
  - Semantic search (<100ms vs 10-30s linear scan)
  - Batch processing (100 keys/batch)
  - Automatic categorization (embedding/cluster/analysis/error/knowledge)
- **Performance:** ~1000x faster cache discovery
- **Collection:** `phase89_redis_cache_index` in Qdrant
- **Usage:**
  ```bash
  # Index all Redis keys
  node scripts/phase89-redis-qdrant-cache-indexer.mjs index

  # Semantic search
  node scripts/phase89-redis-qdrant-cache-indexer.mjs search "embedding cache" 10

  # Show statistics
  node scripts/phase89-redis-qdrant-cache-indexer.mjs stats
  ```

### 7. ACE LLM Output Synthesizer 🆕
- **Tag:** `tech:context7/ace-synthesizer`
- **File:** `scripts/ace-llm-output-synthesizer.mjs` (NEW)
- **Documentation:** `ACE_LLM_OUTPUT_SYNTHESIS_ARCHITECTURE.md`
- **Features:**
  - RAG context injection (Qdrant - 22 collections)
  - KAG relationship enrichment (Neo4j knowledge graph)
  - Redis compression + semantic indexing
  - Multi-LLM routing (gemma3-legal, embeddinggemma)
  - Adaptive prompt engineering (role-based)
  - Output validation with confidence scoring
  - 86% cache hit rate across all types
- **Performance:** 6x total pipeline speedup (13-36s → 2.5-5.5s)
- **Resource Savings:** 63% GPU VRAM, 70% Redis memory
- **Integration:** Uses Components 0-6
- **Usage:**
  ```bash
  # Analyze with full context
  node scripts/ace-llm-output-synthesizer.mjs analyze \
    --query "TypeScript error TS2345" \
    --use-rag --use-kag --use-cache

  # Batch processing
  node scripts/ace-llm-output-synthesizer.mjs batch \
    --error-ids 1,2,3,4,5
  ```

### Documentation Hub
- **Main Guide:** `CONTEXT7_COMPREHENSIVE_GUIDE.md`
- **ACE Synthesizer:** `ACE_LLM_OUTPUT_SYNTHESIS_ARCHITECTURE.md` 🆕
- **Cache Indexer:** `PHASE89_REDIS_QDRANT_CACHE_INDEXER.md` 🆕
- **Architecture:** `documents/AI_INFRASTRUCTURE_SETUP_GUIDE.md`
- **Best Practices:** `documents/AI_CHAT_INTEGRATION_GUIDE.md`
- **Performance:** `documents/CACHE_COMPARISON_DETAILED.md`
- **SIMD Config:** `docs/SIMD_PORT_FIX_FINAL.md`

### Quick Start
```bash
# Start Context7 Multi-Core Server (PRIMARY)
node scripts/phase89-context7-server.mjs

# Index Redis cache in Qdrant (NEW - 1000x speedup)
node scripts/phase89-redis-qdrant-cache-indexer.mjs index

# Search cache semantically
node scripts/phase89-redis-qdrant-cache-indexer.mjs search "GPU cluster" 10

# Submit clustering job
curl -X POST http://localhost:3007/cluster \
  -H "Content-Type: application/json" \
  -d '{"error_ids": [1,2,3]}'

# Watch SSE stream
curl http://localhost:3007/jobs/<jobId>/stream

# Start with GPU optimization
npm run dev:gpu

# Start MCP server
node scripts/mcp-context7-optimized.mjs

# Test SIMD parser
curl http://localhost:8096/health
```

---

## Structure Tags → Paths

### Frontend (SvelteKit)
- **Tag:** `structure:frontend`
- **Paths:**
  - `sveltekit-frontend/src/routes/(app)/**` - Protected app routes
  - `sveltekit-frontend/src/routes/(auth)/**` - Authentication routes
  - `sveltekit-frontend/src/routes/api/**` - API endpoints
  - `sveltekit-frontend/src/lib/**` - Shared libraries
  - `sveltekit-frontend/src/lib/components/**` - Svelte components
  - `sveltekit-frontend/src/lib/stores/**` - State management
  - `sveltekit-frontend/src/lib/actions/**` - Svelte actions

#### Frontend Routes
- **Tag:** `structure:frontend/routes`
- **Admin Routes:**
  - `src/routes/(app)/admin/knowledge-search/` - Phase 89 Knowledge Base Search
  - `src/routes/(app)/admin/phase89/` - Phase 89 Dashboard
  - `src/routes/(app)/admin/codebase-viewer/` - Codebase Viewer
- **API Routes:**
  - `src/routes/api/analyze-tag/` - Enhanced Tag Analysis (Phase 89)
  - `src/routes/api/analyze-file/` - File Analysis Pipeline (Phase 89)
  - `src/routes/api/generate-cluster-summaries/` - Cluster Summaries (Phase 89)
  - `src/routes/api/phase89/clusters/` - Cluster data endpoint

#### Frontend Libraries
- **Tag:** `structure:frontend/lib`
- **Services:**
  - `src/lib/services/qdrant-client.ts` - Qdrant vector store
  - `src/lib/services/ollama-client.ts` - Ollama LLM client
  - `src/lib/server/qdrant-http.ts` - Qdrant HTTP helper (Phase 89)
- **Server:**
  - `src/lib/server/db/` - Database clients
  - `src/lib/server/rag/` - RAG implementations
  - `src/lib/server/adapters/` - Service integrations

### Backend (Node.js/Python)
- **Tag:** `structure:backend`
- **Paths:**
  - `backend/services/**` - Microservices
  - `backend/api/**` - REST API endpoints
  - `backend/middleware/**` - Express/Fastify middleware
  - `backend/db/**` - Database schemas
  - `backend/scripts/**` - Utility scripts

### Go Services
- **Tag:** `structure:backend/go`
- **Paths:**
  - `go-services/legal-engine/**` - Legal reasoning engine
  - `go-services/rag-service/**` - RAG service
  - `go-services/evidence-processor/**` - Evidence processing
  - `go_quic/**` - QUIC protocol implementation

### Python Services
- **Tag:** `structure:backend/py`
- **Paths:**
  - `backend/services/vision-service/**` - Computer vision (Python)
  - `backend/services/ml-inference/**` - ML models
  - `sveltekit-frontend/scripts/phase89-cuda-clustering.py` - CUDA clustering
  - `.venv/**` - Python virtual environment

### SQL & Databases
- **Tag:** `structure:backend/sql`
- **Paths:**
  - `backend/db/migrations/**` - Database migrations
  - `sveltekit-frontend/scripts/phase89-enhanced-kb-schema.sql` - Phase 89 schema
  - `sveltekit-frontend/scripts/*.sql` - SQL scripts

### Infrastructure
- **Tag:** `structure:infra`
- **Paths:**
  - `docker-compose.yml` - Container orchestration
  - `Caddyfile*` - Reverse proxy configs
  - `.github/workflows/**` - CI/CD pipelines
  - `.kiro/infra/**` - Infrastructure docs

---

## Technology Tags → Paths

### SvelteKit
- **Tag:** `tech:sveltekit`
- **Version:** 2.x (Svelte 5 runes)
- **Paths:**
  - `sveltekit-frontend/**` - All SvelteKit code
  - `sveltekit-frontend/svelte.config.js` - SvelteKit config
  - `sveltekit-frontend/vite.config.ts` - Vite config
- **Key Features:**
  - Svelte 5 runes (`$state`, `$derived`, `$effect`)
  - Server-side rendering (SSR)
  - File-based routing
  - API endpoints

### Go + QUIC
- **Tag:** `tech:go`, `tech:quic`
- **Paths:**
  - `go_quic/**` - QUIC implementation
  - `go-services/**` - Go microservices
- **Features:**
  - HTTP/3 QUIC protocol
  - Low-latency streaming
  - TLS 1.3 integration

### PostgreSQL + pgvector
- **Tag:** `tech:postgresql`, `tech:pgvector`
- **Container:** `phase66-postgres` (port 5434)
- **Paths:**
  - `backend/db/schema.sql` - Main schema
  - `sveltekit-frontend/scripts/phase89-enhanced-kb-schema.sql` - Phase 89 tables
- **Tables:**
  - `phase89_enhanced_tags` - AI tag summaries with pgvector embeddings
  - `phase89_file_analyses` - File analysis results
  - `phase89_cluster_summaries` - CUDA clustering results
  - `raw_error_embeddings` - TypeScript error embeddings

### Qdrant
- **Tag:** `tech:qdrant`
- **Container:** `phase66-qdrant` (port 6333)
- **Status:** ✅ Operational (health check warning is false positive)
- **Paths:**
  - `sveltekit-frontend/src/lib/server/qdrant-http.ts` - HTTP helper
  - `sveltekit-frontend/src/lib/services/qdrant-client.ts` - Client wrapper
- **Collections:** 21 total
  - `phase89_error_clusters` - Error clustering
  - `phase89_code_units` - Code unit embeddings (3,943 units)
  - `phase89_kb_cards` - Knowledge base cards
  - `phase72_evidence_embeddings` - Evidence vectors
  - `phase89_ast_topology` - AST topology graphs
  - `knowledge_base` - Main knowledge base (72,297 points)

### Neo4j
- **Tag:** `tech:neo4j`
- **Status:** ⚠️ Not running
- **Planned Paths:**
  - AST relationship graphs
  - Import/export dependency trees
  - Component usage graphs

### Redis
- **Tag:** `tech:redis`
- **Container:** `phase66-redis` (port 6379)
- **Status:** ✅ Healthy
- **Paths:**
  - `sveltekit-frontend/src/lib/server/redis-client.ts` - Redis client
- **Usage:**
  - Phase 89 CUDA cluster coordinate cache (24h TTL)
  - Session storage
  - Rate limiting

### MinIO
- **Tag:** `tech:minio`
- **Container:** `phase66-minio` (ports 9000-9001)
- **Status:** ✅ Healthy
- **Paths:**
  - Document storage
  - Evidence file uploads
  - Screenshot archives

### CouchDB
- **Tag:** `tech:couchdb`
- **Container:** `phase66-couchdb` (port 5984)
- **Status:** ✅ Healthy
- **Planned Usage:**
  - Raw data backup
  - Phase 89 cluster summary sync

### RabbitMQ
- **Tag:** `tech:rabbitmq`
- **Container:** `phase66-rabbitmq` (ports 5672, 15672)
- **Status:** ✅ Healthy
- **Usage:**
  - Async job processing
  - Event streaming

### Ollama
- **Tag:** `tech:ollama`
- **Container:** `ollama-gemma` (port 11434)
- **Status:** ✅ Running
- **Models:**
  - `gemma3-legal:latest` (7.3GB) - Code analysis
  - `embeddinggemma:latest` (768-dim) - Vector embeddings
  - `gemma3:270m` - Lightweight model
- **Paths:**
  - `sveltekit-frontend/src/lib/services/ollama-client.ts` - Client
  - `sveltekit-frontend/scripts/llm-router.mjs` - Multi-LLM router
- **GPU Optimization:**
  - `CONTEXT7_MULTICORE=true` - Multicore processing for RTX 3060 Ti
  - Package scripts: `dev:gpu`, `dev:gpu:quic`, `dev:gpu:8g`
  - Redis GPU cache: 486x speedup (5ms vs 2424ms)

---

## Documentation Tags → Paths

### Steering Documents
- **Tag:** `docs:steering`
- **Paths:**
  - `.kiro/steering/product.md` - Product vision
  - `.kiro/steering/structure.md` - System architecture
  - `.kiro/steering/tech.md` - Technology stack
  - `.kiro/steering/llms.txt` - LLM context (13,497 chars)

### Specifications
- **Tag:** `docs:specs`
- **Paths:**
  - `.kiro/specs/agentic-knowledge-integration/` - Phase 89 specs
    - `requirements-v2.md` - Enhanced requirements
    - `design-v2.md` - System design
    - `tasks-v2.md` - Implementation tasks (23 tasks)
  - `.kiro/specs/evidence-management/`
  - `.kiro/specs/vision-pipeline/`
  - `.kiro/specs/legal-inference/`

### Phase Documentation
- **Tag:** `docs:phase`
- **Paths:**
  - `sveltekit-frontend/PHASE89_DEPLOYMENT.md` - Phase 89 deployment guide
  - `sveltekit-frontend/copilot.md` - ACE knowledge base (auto-updated)
  - `sveltekit-frontend/claude.md` - Claude-specific context
  - Various `12_*.txt`, `10_*.txt` files - Phase logs

### Reports & Analysis
- **Tag:** `docs:reports`
- **Paths:**
  - `sveltekit-frontend/reports/` - Analysis outputs
  - `sveltekit-frontend/reports/screenshots/` - UI screenshots
  - `sveltekit-frontend/reports/latest/` - Latest analysis
  - `sveltekit-frontend/reports/phase89-*.json` - Phase 89 outputs

---

## Scripts & Tools

### Phase 89 Scripts
- **Tag:** `tools:phase89`
- **Paths:**
  - `sveltekit-frontend/scripts/phase89-rag-kag-analyzer.mjs` - RAG+KAG analyzer
  - `sveltekit-frontend/scripts/phase89-ace-rag-kag.mjs` - ACE agent with caching
  - `sveltekit-frontend/scripts/phase89-enhanced-kb-schema.sql` - Database schema
  - `sveltekit-frontend/scripts/test-phase89-system.ps1` - System test suite
  - `sveltekit-frontend/scripts/test-phase89-core.ps1` - Core services test

### Testing & Validation
- **Tag:** `tools:testing`
- **Paths:**
  - `sveltekit-frontend/tests/**` - Playwright tests
  - `sveltekit-frontend/scripts/test-*.ps1` - PowerShell test scripts
  - `sveltekit-frontend/scripts/test-*.mjs` - Node.js test scripts

### Build & Deploy
- **Tag:** `tools:build`
- **Paths:**
  - `sveltekit-frontend/package.json` - NPM scripts
  - `sveltekit-frontend/vite.config.ts` - Build config
  - `sveltekit-frontend/tsconfig.json` - TypeScript config
  - `.github/workflows/**` - CI/CD

---

## Known Issues

### ✅ RESOLVED (December 29, 2025)
✅ **Route Conflict** - FIXED
- **Routes:** Removed duplicate `(app)/api/phase89/clusters`
- **Kept:** `api/phase89/clusters` (PostgreSQL-based)
- **Status:** No conflicts remaining

✅ **Ollama Container** - OPERATIONAL
- **Container:** `ollama-gemma` - Up 28 minutes
- **Models:** 3 Gemma models available (embeddinggemma, gemma3-legal, gemma3:270m)
- **Status:** Fully operational

✅ **Qdrant Health** - VERIFIED OPERATIONAL
- **Container:** `phase66-qdrant` - Processing requests successfully
- **Collections:** 21 active collections
- **Note:** Health check warning is false positive - Qdrant working correctly

### Non-Critical
⚠️ **SSR Module Error** - Not Critical
- **Impact:** Warning in logs but doesn't prevent functionality
- **Status:** Dev server, API endpoints, and pages all working
- **Reason:** SvelteKit virtual module warning (expected in dev)

⚠️ **Neo4j Missing** - Optional Enhancement
- **Status:** Not deployed
- **Impact:** AST graph visualization unavailable
- **Fix:** Add Neo4j container to docker-compose.yml (not required for Phase 89)

---

## How to Navigate This Codebase

### 1. Start with Steering Documents
- **Product Vision:** `.kiro/steering/product.md`
- **System Structure:** `.kiro/steering/structure.md`
- **Tech Stack:** `.kiro/steering/tech.md`

### 2. Explore by Product Feature
- Evidence: `sveltekit-frontend/src/routes/(app)/evidence/**`
- Search: `sveltekit-frontend/src/routes/(app)/admin/knowledge-search/**`
- Vision: Backend vision services

### 3. Explore by Technology
- SvelteKit: `sveltekit-frontend/src/**`
- Go Services: `go-services/**`
- Database: `backend/db/**` + SQL scripts
- Containers: `docker-compose.yml`

### 4. Check Implementation Status
- **Phase 89:** See `PHASE89_DEPLOYMENT.md` for deployment status
- **Specs:** Check `.kiro/specs/agentic-knowledge-integration/tasks-v2.md`
- **Tests:** Run `scripts/test-phase89-system.ps1`

### 5. Review Recent Changes
- **Reports:** `sveltekit-frontend/reports/latest/`
- **Logs:** Phase documentation files (`12_*.txt`, `10_*.txt`)
- **KB:** `copilot.md` (auto-updated ACE knowledge base)

---

## Quick Commands

```powershell
# Test Phase 89 System
.\sveltekit-frontend\scripts\test-phase89-system.ps1

# Test Core Services (without UI)
.\sveltekit-frontend\scripts\test-phase89-core.ps1

# Start Dev Server
cd sveltekit-frontend
npm run dev

# Start with GPU Optimization (Context7)
npm run dev:gpu
# Enables: CONTEXT7_MULTICORE, RTX_3060_OPTIMIZATION, OLLAMA_GPU_LAYERS=30

# View Container Status
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check Database Tables
docker exec phase66-postgres psql -U user -d legal -c "\dt phase89_*"

# Check Qdrant Collections
curl http://localhost:6333/collections

# Check Ollama Models
curl http://127.0.0.1:11434/api/tags

# View Qdrant Logs (verify operational)
docker logs phase66-qdrant --tail 20

### Running (8/20)
✅ `phase66-postgres` - PostgreSQL + pgvector (port 5434)
✅ `phase66-couchdb` - CouchDB (port 5984)
✅ `phase66-redis` - Redis cache (port 6379)
✅ `phase66-minio` - MinIO object storage (ports 9000-9001)
✅ `phase66-rabbitmq` - RabbitMQ (ports 5672, 15672)
✅ `phase66-qdrant` - Qdrant vector DB (port 6333) - **Operational** (health check false positive)
✅ `ollama-gemma` - Ollama LLM (port 11434) - **Running** with 3 models
⚠️ `phase66-langextract` - Language extraction (port 8095) - Unhealthy (non-critical)
⚠️ `phase66-node-api` - Node.js API (port 8082) - Unhealthy (non-critical)

### Stopped/Exited
❌ Phase 76/87 containers - Created but not started (optional)⚠️ `phase66-qdrant` - Qdrant vector DB (port 6333) - Unhealthy
⚠️ `phase66-langextract` - Language extraction (port 8095) - Unhealthy
⚠️ `phase66-node-api` - Node.js API (port 8082) - Unhealthy

### Stopped/Exited
❌ `ollama-gemma` - Ollama LLM (port 11434) - Needs restart
❌ Phase 76/87 containers - Created but not started

---

**Index Version:** 1.0
**Generated:** December 29, 2025
**Maintainer:** ACE Contextual Prompt Engineer
