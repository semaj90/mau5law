# Codebase Index

**Generated**: 2025-12-29 | **Total Files**: ~17,480

This index organizes the codebase using tags from [steering documents](.kiro/steering/).

---

## 📚 How to Navigate

1. **Start with Steering Docs** (`.kiro/steering/`)
   - [`product.md`](.kiro/steering/product.md) - Product vision (evidence, search, vision, inference)
   - [`structure.md`](.kiro/steering/structure.md) - Codebase organization
   - [`tech.md`](.kiro/steering/tech.md) - Technology stack

2. **Use This Index** to map concepts → file paths
3. **Use ripgrep** to explore: `rg --files <pattern>`

---

## 🎯 Product Tags

### Evidence
**Document processing and evidence boards**
- `src/routes/(app)/evidence/**` - Evidence UI
- `src/lib/components/evidence/**` - Evidence components
- `src/lib/services/evidence.ts` - Evidence service
- `go-services/legal-engine/evidence/**` - Backend evidence processing

### Search
**Semantic search with Qdrant and embeddings**
- `src/routes/(app)/search/**` - Search UI
- `src/routes/(app)/admin/knowledge-search/**` - Admin knowledge search
- `src/lib/services/qdrant.ts` - Qdrant vector search
- `src/lib/services/vector-search.ts` - Vector search utilities
- `scripts/phase89-*.mjs` - ACE/RAG/KAG analyzers

### Vision
**OCR and document analysis**
- `src/lib/services/vision.ts` - Vision service
- `src/lib/services/ocr.ts` - OCR integration
- `go-services/legal-engine/vision/**` - Backend vision processing

### Inference
**AI/LLM inference and analysis**
- `src/lib/services/llm.ts` - LLM orchestration
- `src/lib/services/gemini.ts` - Gemini API
- `src/lib/services/ollama.ts` - Ollama local LLM
- `scripts/phase89-ace-rag-kag.mjs` - ACE contextual engineering
- `scripts/llm-router.mjs` - Multi-provider LLM router

---

## 🏗️ Structure Tags

### Frontend

#### Routes (~500 files)
- `src/routes/(app)/**` - Main application routes
- `src/routes/(auth)/**` - Authentication routes
- `src/routes/api/**` - API endpoints

#### Lib (~300 files)
- `src/lib/components/**` - Svelte components
- `src/lib/services/**` - Business logic services
- `src/lib/stores/**` - Svelte stores
- `src/lib/utils/**` - Utility functions

#### Scripts (~200 files)
- `scripts/phase*.mjs` - Phase automation scripts
- `scripts/llm-*.mjs` - LLM utilities
- `scripts/test-*.mjs` - Test scripts

### Backend

#### Go (~49 files)
- `go-services/legal-engine/**` - Legal document engine
- `go-services/rag-service/**` - RAG service

#### Python (~20 files)
- `python/**` - ML and data processing
- `scripts/*.py` - Python automation

#### SQL (~30 files)
- `drizzle/**` - Drizzle ORM schemas
- `scripts/*-schema.sql` - SQL schemas
- `migrations/**` - Database migrations

### Infrastructure

#### Docker (~10 files)
- `docker-compose*.yml` - Docker Compose configurations
- `Dockerfile*` - Container definitions

#### Config (~50 files)
- `.env*` - Environment configurations
- `*.config.*` - Build/tool configurations
- `tsconfig*.json` - TypeScript configurations

### Docs

#### Steering (~3 files)
- `.kiro/steering/product.md` - Product vision
- `.kiro/steering/structure.md` - Codebase structure
- `.kiro/steering/tech.md` - Tech stack

#### Specs (~20 files)
- `.kiro/specs/agentic-knowledge-integration/**` - Agentic KB spec
- `.kiro/specs/**` - Feature specifications

#### Phase Docs (~200 files)
- `PHASE*.md` - Phase documentation
- `reports/**` - Analysis reports

---

## 🔧 Technology Tags

### SvelteKit
**SvelteKit 2 framework**
```bash
rg --files -g "*.svelte" -g "*+page.ts" -g "*+server.ts"
```
- `src/routes/**` - SvelteKit routes
- `src/lib/**/*.svelte` - Svelte components
- `svelte.config.js` - SvelteKit configuration

### Go
**Go backend services**
```bash
rg --files -g "*.go" go-services/
```
- `go-services/**` - All Go services

### QUIC
**QUIC protocol implementation**
```bash
rg --files -g "*quic*"
```
- `go-services/quic/**` - Go QUIC server
- `src/lib/services/quic.ts` - QUIC client

### pgvector
**PostgreSQL vector extension**
```bash
rg --files -g "*vector*.sql"
```
- `drizzle/schema/**` - Vector-enabled schemas
- `scripts/*-vector-*.sql` - Vector utilities

### Qdrant
**Qdrant vector database**
```bash
rg --files -g "*qdrant*"
```
- `src/lib/services/qdrant.ts` - Qdrant client
- `scripts/phase89-*-qdrant-*.mjs` - Qdrant utilities

### Neo4j
**Neo4j graph database**
```bash
rg --files -g "*neo4j*" -g "*graph*"
```
- `src/lib/services/neo4j.ts` - Neo4j client
- `scripts/*-neo4j-*.mjs` - Graph utilities

### Redis
**Redis caching and pub/sub**
```bash
rg --files -g "*redis*" -g "*cache*"
```
- `src/lib/services/redis.ts` - Redis client
- `scripts/phase89-ace-rag-kag.mjs` - Redis GPU cache

### MinIO
**MinIO object storage**
```bash
rg --files -g "*minio*" -g "*storage*"
```
- `src/lib/services/minio.ts` - MinIO client
- `scripts/*-minio-*.mjs` - Storage utilities

---

## ⚠️ Known Issues

1. **SSR Module Error** - Requires SvelteKit rebuild
   - Fix: `npm run build && npm run dev`

2. **Route Conflict** - `/(app)/api/phase89/clusters` duplicate
   - Location: Check `src/routes/(app)/api/phase89/`

---

## 🚀 Quick Links

### Admin UI
- **Codebase Viewer**: http://localhost:5175/admin/codebase-viewer
- **Knowledge Search**: http://localhost:5175/admin/knowledge-search

### CLI Tools
```bash
# ACE Analyzer (with Redis cache + docs)
node scripts/phase89-ace-rag-kag.mjs "Your query"

# Agentic Fixer (with RAG+KAG)
node scripts/phase89-agentic-fixer.mjs --limit 200 --with-kag

# LLM Router (multi-provider)
node scripts/llm-router.mjs --compare --prompt "Test"
```

### Database Ports
- PostgreSQL: `localhost:5434`
- Redis: `localhost:6379`
- Qdrant: `localhost:6333`
- CouchDB: `localhost:5984`
- MinIO: `localhost:9000` (API), `localhost:9001` (Console)

---

## 📊 File Inventory

| Category | Files | Description |
|----------|-------|-------------|
| **Frontend** | ~17,000 | SvelteKit routes, components, services |
| **Backend** | ~70 | Go/Python microservices |
| **Docs** | ~400 | Specs, phase docs, reports |
| **Config** | ~60 | Docker, env, build configs |
| **Total** | **~17,480** | All tracked files |

---

## 🔍 Search Patterns

### Find Routes
```bash
rg --files src/routes/ -g "*+page.svelte" -g "*+server.ts"
```

### Find Components
```bash
rg --files src/lib/components/ -g "*.svelte"
```

### Find Services
```bash
rg --files src/lib/services/ -g "*.ts"
```

### Find Phase Scripts
```bash
rg --files scripts/ -g "phase*.mjs"
```

### Find Specs
```bash
rg --files .kiro/specs/
```

---

**Last Updated**: 2025-12-29
**Indexer**: phase89-codebase-indexer
**Steering Docs**: `.kiro/steering/` (product, structure, tech)
