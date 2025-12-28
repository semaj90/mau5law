# Phase 66 vs Phase 76 vs Phase 87 - Quick Answer

**Question**: Do ingestion Phase 66 docker containers use different databases than knowledge graph Phase 76 docker containers?

**Answer**: **YES** - They use different PostgreSQL databases, but can share Qdrant and Redis if configured correctly.

---

## TL;DR

### Phase 66: Document Ingestion Pipeline
- **Network**: Isolated Docker network (`phase66-network`)
- **PostgreSQL**: `phase66-postgres:5432` → Database: `legalai`
- **Purpose**: OCR, document ingestion, evidence processing, GPU inference
- **Qdrant**: Isolated instance (port 6333 within Docker network)
- **Redis**: Isolated instance (port 6379 within Docker network)

### Phase 76: Knowledge Graph & ACP Tools
- **Network**: Host ports (localhost)
- **PostgreSQL**: `localhost:5432` → Database: `legal_ai_db`
- **Purpose**: Knowledge base, documentation search, ACP tool registry
- **Qdrant**: Shared host port 6333 (collection: `phase76_knowledge_base`)
- **Redis**: Shared host port 6379
- **CouchDB**: Unique to Phase 76 (port 5984)

### Phase 87: RAG/KAG Middleware + LLM Synthesis
- **Network**: Bridges to host via `host.docker.internal`
- **PostgreSQL**: ⚠️ **CONFIGURATION ERROR** - Uses port 5434 (doesn't exist)
  - Should use: `localhost:5432` (Phase 76's database)
- **Purpose**: CouchDB-backed knowledge graphs, LLM synthesis, RAG orchestration
- **Qdrant**: Shares Phase 76's Qdrant (port 6333) ✅
- **Redis**: Shares Phase 76's Redis (port 6379) ✅
- **CouchDB**: ⚠️ **CREDENTIAL MISMATCH** - Uses `admin:legal_ai_pass` instead of `admin:password`

---

## Current Issues

### 1. Phase 87 PostgreSQL Port Mismatch
```yaml
# Current (WRONG)
DATABASE_URL: postgresql://user:pass@host.docker.internal:5434/legal

# Should be
DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db
```

### 2. Phase 87 CouchDB Credentials Mismatch
```yaml
# Current (WRONG)
COUCHDB_URL: http://admin:legal_ai_pass@host.docker.internal:5984

# Should be
COUCHDB_URL: http://admin:password@host.docker.internal:5984
```

### 3. Database Name Mismatch
- Phase 76 uses: `legal_ai_db`
- Phase 87 expects: `legal`
- **Solution**: Phase 87 should use `legal_ai_db`

---

## Service Sharing

| Service | Phase 66 | Phase 76 | Phase 87 | Shared? |
|---------|----------|----------|----------|---------|
| **PostgreSQL** | 5432 (isolated) | 5432 (host) | 5434 ⚠️ | ❌ Different DBs |
| **Qdrant** | 6333 (isolated) | 6333 (host) | 6333 (host) | ✅ Phase 76/87 share |
| **Redis** | 6379 (isolated) | 6379 (host) | 6379 (host) | ✅ Phase 76/87 share |
| **CouchDB** | ❌ Not used | 5984 (host) | 5984 (host) | ⚠️ Credential mismatch |
| **Ollama** | 11434 (host) | 11434 (host) | 11434 (host) | ✅ All phases share |

---

## Quick Fix

Run the automated fix script:

```powershell
cd C:\Users\james\Videos\deeds-web-app
.\fix-phase87-config.ps1
```

Or manually update `docker-compose.middleware.yml`:

```yaml
services:
  rag-kag-middleware:
    environment:
      DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db
      COUCHDB_URL: http://admin:password@host.docker.internal:5984
      QDRANT_URL: http://host.docker.internal:6333  # ✅ Already correct
      REDIS_URL: redis://host.docker.internal:6379  # ✅ Already correct
      OLLAMA_URL: http://host.docker.internal:11434  # ✅ Already correct
```

Then restart:

```powershell
docker-compose -f docker-compose.middleware.yml down
docker-compose -f docker-compose.middleware.yml up -d
```

---

## Architecture Diagrams

📄 **Full Analysis**: `DOCKER_CONTAINER_ARCHITECTURE_ANALYSIS.md`
🎨 **Visual Diagram**: `DOCKER_ARCHITECTURE_VISUAL.txt`
🔧 **Auto-Fix Script**: `fix-phase87-config.ps1`

---

## Verification

After applying the fix:

```powershell
# Check Phase 87 is running
docker ps | Select-String phase87

# Verify configuration
docker exec phase87-rag-middleware env | Select-String "DATABASE_URL|COUCHDB_URL"

# Test connectivity
Invoke-RestMethod -Uri "http://localhost:8765/health"

# Check logs
docker logs phase87-rag-middleware --tail 50
```

---

## Summary Table

| Aspect | Different or Shared? | Notes |
|--------|---------------------|-------|
| **PostgreSQL Databases** | ❌ Different | Phase 66: `legalai`, Phase 76: `legal_ai_db`, Phase 87: misconfigured |
| **Qdrant Instances** | ⚠️ Partially | Phase 66 isolated, Phase 76/87 share |
| **Redis Instances** | ⚠️ Partially | Phase 66 isolated, Phase 76/87 share |
| **Network Architecture** | ❌ Different | Phase 66 uses Docker network, Phase 76/87 use host ports |
| **Ollama LLM** | ✅ Shared | All phases use host Ollama on port 11434 |
| **CouchDB** | 🆕 Unique to Phase 76/87 | Not used in Phase 66 |

**Recommendation**: Fix Phase 87 configuration to properly connect to Phase 76 services.
