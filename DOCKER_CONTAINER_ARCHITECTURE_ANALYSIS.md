# Docker Container Architecture Analysis
## Phase 66 vs Phase 76 vs Phase 87 + ACE/RAG/KAG

**Date**: December 28, 2025
**Status**: Production containers running with different service boundaries

---

## Executive Summary

Your deeds-web-app uses **three distinct Docker ecosystems** that share some infrastructure but have different purposes:

1. **Phase 66** - Full ingestion & MCP pipeline (isolated network)
2. **Phase 76** - Knowledge Graph services (shared host ports)
3. **Phase 87** - RAG/KAG middleware with CouchDB + LLM synthesis (host.docker.internal)

**Key Finding**: They use **different database instances** but can share Qdrant/Redis if properly configured.

---

## Architecture Comparison

### Phase 66: Full Stack Ingestion Pipeline

**Network**: `phase66-network` (isolated Docker bridge)
**Purpose**: Legal document ingestion, OCR, embeddings, MCP server
**Docker Compose**: `docker-compose.phase66-full.yml`

#### Containers

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| `sveltekit-frontend` | Custom | 5173 | Frontend UI |
| `legal-ai-caddy-quic` | caddy:2.8-alpine | 80, 443 | HTTPS/QUIC proxy |
| `phase66-mcp-server` | Custom (Dockerfile.phase66) | 3003 | MCP tools + orchestration |
| `phase66-tensorrt-llm` | Custom (Dockerfile.trtllm) | 8099 | GPU inference (TensorRT) |
| `phase66-postgres` | pgvector/pgvector:pg17 | 5432 | PostgreSQL + pgvector |
| `phase66-redis` | redis/redis-stack:latest | 6379 | Cache + pub/sub |
| `phase66-minio` | minio/minio:latest | 9000, 9001 | Object storage |
| `phase66-qdrant` | qdrant/qdrant:latest | 6333 | Vector search |
| `phase66-rabbitmq` | rabbitmq:3-management | 5672, 15672 | Message queue |

#### Environment Configuration

```yaml
# MCP Server connects to Phase 66 network services
PG_URL: postgresql://postgres:postgres@phase66-postgres:5432/legalai
REDIS_URL: redis://phase66-redis:6379
MINIO_URL: http://phase66-minio:9000
QDRANT_URL: http://phase66-qdrant:6333
RABBITMQ_URL: amqp://guest:guest@phase66-rabbitmq:5672/
OLLAMA_URL: http://host.docker.internal:11434  # Host Ollama
```

**Database**: `legalai` (PostgreSQL 17)
**Qdrant Collection**: Phase 66 specific collections
**Network Isolation**: All services communicate via `phase66-network`

---

### Phase 76: Knowledge Graph & ACP Tools

**Network**: Uses **host ports** (no dedicated network)
**Purpose**: Knowledge base building, ACP tool registry, documentation ingestion
**Docker Management**: PowerShell scripts (`start-services.ps1`)

#### Containers

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| `phase76-postgres` | pgvector/pgvector:pg17 | 5432 | Knowledge graph DB |
| `phase76-redis` | redis:7 | 6379 | Cache layer |
| `phase76-qdrant` | qdrant/qdrant:latest | 6333 | Vector search |
| `phase76-rabbitmq` | rabbitmq:3-management | 5672, 15672 | Message broker |
| `phase76-couchdb` | couchdb:3.3 | 5984 | Document store |
| `phase76-minio` | minio/minio | 9000, 9001 | Object storage |

#### Environment Configuration

```bash
# Services accessed via localhost (no Docker network)
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
COUCHDB_URL=http://admin:password@localhost:5984
MINIO_URL=http://localhost:9000
```

**Database**: `legal_ai_db` (PostgreSQL 17)
**Qdrant Collection**: `phase76_knowledge_base`
**CouchDB**: Knowledge document storage (unique to Phase 76)
**Network**: Containers expose ports to host, scripts connect via `localhost`

#### Services

- **FastMCP Server** (port 3002) - 11 unified tools
- **Knowledge Plane** (port 8099) - Go service for hybrid RAG
- **ACP Tool Registry** - 14 tools (DB, cache, MinIO, knowledge search)

---

### Phase 87: RAG/KAG Middleware + LLM Synthesis

**Network**: Uses `host.docker.internal` to access host services
**Purpose**: CouchDB-backed KAG synthesis with LLM reasoning
**Docker Compose**: `docker-compose.middleware.yml`

#### Container

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| `phase87-rag-middleware` | Custom Python | 8765 | RAG/KAG synthesis API |

#### Environment Configuration

```yaml
# Connects to Phase 66 services via host
COUCHDB_URL: http://admin:legal_ai_pass@host.docker.internal:5984
DATABASE_URL: postgresql://user:pass@host.docker.internal:5434/legal
QDRANT_URL: http://host.docker.internal:6333
REDIS_URL: redis://host.docker.internal:6379
OLLAMA_URL: http://host.docker.internal:11434
EMBEDDING_MODEL: embeddinggemma:latest
LLM_MODEL: gemma3-legal:latest
```

**Key Features**:
- CouchDB for knowledge graph storage
- PostgreSQL port **5434** (different from Phase 66's 5432)
- Ollama LLM for synthesis
- Qdrant for vector search

**Unique Aspect**: Only phase with **CouchDB integration** for KAG

---

## Port Conflicts & Resolution

### Overlapping Ports

| Service | Phase 66 Port | Phase 76 Port | Phase 87 Port | Resolution |
|---------|---------------|---------------|---------------|------------|
| PostgreSQL | 5432 (isolated) | 5432 (host) | 5434 (host) | Different DBs, Phase 87 uses 5434 |
| Redis | 6379 (isolated) | 6379 (host) | 6379 (host) | **Shared** via host |
| Qdrant | 6333 (isolated) | 6333 (host) | 6333 (host) | **Shared** via host |
| MinIO | 9000 (isolated) | 9000 (host) | N/A | Phase 87 doesn't use MinIO |
| RabbitMQ | 5672 (isolated) | 5672 (host) | N/A | Phase 87 doesn't use RabbitMQ |
| CouchDB | N/A | 5984 (host) | 5984 (host) | **Shared** - unique to Phase 76/87 |

### Conflict Resolution Strategy

1. **Phase 66** runs in **isolated Docker network**
   - No port conflicts with host
   - Services communicate via container names (e.g., `phase66-postgres:5432`)

2. **Phase 76/87** share **host ports**
   - Both access `localhost:6333` (Qdrant)
   - Both access `localhost:6379` (Redis)
   - Phase 87 uses PostgreSQL on **5434** to avoid conflict with Phase 76's **5432**

3. **Recommended Fix**:
   ```yaml
   # Phase 87 should use Phase 76's PostgreSQL on 5432
   DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db
   ```

---

## Database Differences

### Phase 66 Database

```sql
Database: legalai
User: postgres
Password: postgres
Host: phase66-postgres:5432 (within Docker network)
      localhost:5432 (from host)

Schema:
- Legal document metadata
- OCR text extractions
- Evidence embeddings
- MCP tool outputs
```

### Phase 76 Database

```sql
Database: legal_ai_db
User: legal_admin
Password: 123456
Host: localhost:5432

Schema (from migrations/phase76_knowledge_graph_schema.sql):
- knowledge_documents (with vector(384))
- knowledge_chunks
- knowledge_sync_queue
- Triggers for Qdrant auto-sync
```

### Phase 87 Database

```sql
Database: legal (based on environment variable)
User: user
Password: pass
Host: localhost:5434

Purpose:
- Metadata for RAG/KAG synthesis
- Integration with CouchDB documents
```

**Issue**: Phase 87 uses port **5434** but this port isn't exposed by Phase 76's PostgreSQL container.

---

## Qdrant Collection Strategy

### Phase 66 Collections

- Ingestion-specific embeddings
- Evidence chunks from legal documents
- OCR results

### Phase 76 Collections

```javascript
// From init-qdrant.mjs
const collections = [
  'phase72_evidence_embeddings',
  'phase72_summaries',
  'phase76_knowledge_base',      // ← Main KB collection
  'phase72_error_patterns'
];
```

**Collection**: `phase76_knowledge_base`
**Dimension**: 768 (embeddinggemma:latest)
**Payload**: `{couchdb_id, postgres_id, type, metadata, title}`

### Phase 87 Collections

Uses **Phase 76's Qdrant** via `host.docker.internal:6333`
Likely uses `phase76_knowledge_base` collection

---

## CouchDB Integration (Unique to Phase 76/87)

### Phase 76 CouchDB

```yaml
Container: phase76-couchdb
Image: couchdb:3.3
Port: 5984
Credentials: admin / password
```

**Purpose**:
- Polyglot persistence architecture
- Document-oriented storage for knowledge articles
- Synced with PostgreSQL via triggers

**Files**:
- `src/lib/server/db/couchdb-knowledge.ts` - CouchDB client
- `PHASE76_POLYGLOT_PERSISTENCE.md` - Architecture docs

### Phase 87 CouchDB

```yaml
Environment:
  COUCHDB_URL: http://admin:legal_ai_pass@host.docker.internal:5984
```

**Different Password**: `legal_ai_pass` vs Phase 76's `password`

**Issue**: Phase 87 expects CouchDB on port 5984 with different credentials than Phase 76 provides.

---

## ACE/RAG/KAG Integration

### Current State

```
┌─────────────────────────────────────────┐
│     Phase 87 RAG/KAG Middleware         │
│     (port 8765)                         │
└────────────┬────────────────────────────┘
             │
             ├─► CouchDB (5984) - Knowledge docs
             ├─► PostgreSQL (5434) - Metadata ⚠️ PORT MISMATCH
             ├─► Qdrant (6333) - Vector search ✅
             ├─► Redis (6379) - Cache ✅
             └─► Ollama (11434) - LLM synthesis ✅
```

### Integration Issues

1. **PostgreSQL Port Mismatch**
   - Phase 87 expects port **5434**
   - Phase 76 exposes port **5432**
   - **Fix**: Update Phase 87 to use `5432`

2. **CouchDB Credentials Mismatch**
   - Phase 87 expects `admin:legal_ai_pass`
   - Phase 76 provides `admin:password`
   - **Fix**: Align credentials or update Phase 87 config

3. **Database Name Mismatch**
   - Phase 87 expects database `legal`
   - Phase 76 uses database `legal_ai_db`
   - **Fix**: Update Phase 87 to use `legal_ai_db`

---

## Recommended Unified Configuration

### Option 1: Phase 87 Uses Phase 76 Services (Recommended)

```yaml
# docker-compose.middleware.yml
services:
  rag-kag-middleware:
    environment:
      # Use Phase 76 services on host
      COUCHDB_URL: http://admin:password@host.docker.internal:5984
      DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db
      QDRANT_URL: http://host.docker.internal:6333
      REDIS_URL: redis://host.docker.internal:6379
      OLLAMA_URL: http://host.docker.internal:11434
```

**Benefits**:
- Single PostgreSQL instance
- Single Qdrant instance
- Single CouchDB instance
- No port conflicts

### Option 2: Phase 87 Joins Phase 66 Network

```yaml
# docker-compose.middleware.yml
services:
  rag-kag-middleware:
    networks:
      - phase66-network
    external_links:
      - phase66-postgres:postgres
      - phase66-qdrant:qdrant
      - phase66-redis:redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/legalai
      QDRANT_URL: http://qdrant:6333
      REDIS_URL: redis://redis:6379
      # Still need host.docker.internal for Ollama and CouchDB
      OLLAMA_URL: http://host.docker.internal:11434
      COUCHDB_URL: http://host.docker.internal:5984
```

**Benefits**:
- Direct container-to-container communication
- No `host.docker.internal` for Phase 66 services

**Drawbacks**:
- CouchDB still external (not in Phase 66 stack)
- Requires Phase 66 to be running

### Option 3: Unified Docker Compose (Future)

Create `docker-compose.unified.yml`:

```yaml
services:
  # PostgreSQL shared by all phases
  postgres:
    image: pgvector/pgvector:pg17
    ports: ["5432:5432"]
    environment:
      POSTGRES_MULTIPLE_DATABASES: legalai,legal_ai_db

  # Qdrant shared by all phases
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]

  # CouchDB for Phase 76/87
  couchdb:
    image: couchdb:3.3
    ports: ["5984:5984"]

  # Phase 66 services
  phase66-mcp-server:
    depends_on: [postgres, qdrant, redis]

  # Phase 87 middleware
  rag-kag-middleware:
    depends_on: [postgres, qdrant, redis, couchdb]
```

---

## Current Running State

Based on your terminal output:

```
Container: phase87-rag-middleware
Status: Up 1 hour
Ports: 8765:8765
Image: deeds-web-app-rag-kag-middleware
Memory: 95.52MB / 19.53GB (0.48%)
```

**Verified**: Phase 87 is running successfully at 0.15% CPU usage.

### Expected Connections

```bash
# Check Phase 87 logs
docker logs phase87-rag-middleware

# Should show connections to:
# - CouchDB (5984)
# - PostgreSQL (5434 or 5432)
# - Qdrant (6333)
# - Redis (6379)
# - Ollama (11434)
```

---

## Quick Reference

### Start All Services

```powershell
# 1. Start Phase 76 services (host ports)
cd sveltekit-frontend
.\scripts\start-services.ps1

# 2. Start Phase 66 stack (isolated network)
cd ..
docker-compose -f docker-compose.phase66-full.yml up -d

# 3. Start Phase 87 middleware
docker-compose -f docker-compose.middleware.yml up -d

# 4. Start FastMCP server (Phase 76)
cd sveltekit-frontend
node scripts/fastmcp-server.mjs

# 5. Start Knowledge Plane (Phase 76)
cd ../go-services/knowledge-plane
$env:DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db"
$env:KNOWLEDGE_PLANE_PORT="8099"
.\knowledge-plane.exe
```

### Health Checks

```powershell
# Phase 66
Invoke-RestMethod -Uri "http://localhost:3003/mcp/health"

# Phase 76 FastMCP
Invoke-RestMethod -Uri "http://localhost:3002/health"

# Phase 76 Knowledge Plane
Invoke-RestMethod -Uri "http://localhost:8099/health"

# Phase 87 Middleware
Invoke-RestMethod -Uri "http://localhost:8765/health"

# Qdrant
Invoke-RestMethod -Uri "http://localhost:6333/collections"

# CouchDB
Invoke-RestMethod -Uri "http://admin:password@localhost:5984/_all_dbs"
```

---

## Summary

### Key Differences

| Aspect | Phase 66 | Phase 76 | Phase 87 |
|--------|----------|----------|----------|
| **Network** | phase66-network | Host ports | host.docker.internal |
| **PostgreSQL** | 5432 (legalai) | 5432 (legal_ai_db) | 5434 (legal) ⚠️ |
| **Qdrant** | 6333 (isolated) | 6333 (host) | 6333 (host, shared) ✅ |
| **Redis** | 6379 (isolated) | 6379 (host) | 6379 (host, shared) ✅ |
| **CouchDB** | ❌ None | 5984 (host) | 5984 (host, shared) ✅ |
| **Purpose** | Document ingestion | Knowledge graph | RAG/KAG synthesis |
| **LLM** | TensorRT (8099) | Ollama (11434) | Ollama (11434) |

### Recommended Actions

1. ✅ **Fix Phase 87 PostgreSQL port**: Change from `5434` to `5432`
2. ✅ **Align CouchDB credentials**: Use `admin:password` consistently
3. ✅ **Update Phase 87 database name**: Use `legal_ai_db` instead of `legal`
4. ⚠️ **Consider unified Docker Compose**: Merge Phase 76 and Phase 87 services
5. 📝 **Document service dependencies**: Update `.env` files with correct URLs

---

**Next Steps**: Which integration path do you want to take?
- **Option A**: Fix Phase 87 to use Phase 76 services (quickest)
- **Option B**: Create unified Docker Compose (cleanest)
- **Option C**: Keep separate but document interactions (current state)
