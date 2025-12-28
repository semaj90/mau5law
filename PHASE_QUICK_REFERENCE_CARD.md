# 🎯 Quick Reference: Phase 66 vs 76 vs 87 vs 88

**Last Updated**: December 28, 2025

---

## One-Line Answer

**Phase 66** = Isolated ingestion Docker stack | **Phase 76** = Host KB services | **Phase 87** = RAG middleware (needs config fix) | **Phase 88** = Ingestion scripts (uses Phase 76)

---

## Database Breakdown

| Phase | PostgreSQL Port | Database Name | Network | Shared? |
|-------|----------------|---------------|---------|---------|
| **66** | 5432 (isolated) | `legalai` | phase66-network | ❌ No |
| **76** | 5432 (host) | `legal_ai_db` | localhost | ✅ Phase 87/88 use this |
| **87** | ⚠️ 5434 (WRONG) | `legal` (WRONG) | host.docker.internal | ❌ Misconfigured |
| **88** | 5432 (via Phase 76) | `legal_ai_db` | localhost | ✅ Uses Phase 76 |

---

## Qdrant Breakdown

| Phase | Port | Collection | Vector Dim | Shared? |
|-------|------|------------|------------|---------|
| **66** | 6333 (isolated) | Phase 66 specific | Varies | ❌ No |
| **76** | 6333 (host) | `phase76_knowledge_base` | 768 | ✅ Phase 87/88 use this |
| **87** | 6333 (host) | `phase76_knowledge_base` | 768 | ✅ Shares with Phase 76 |
| **88** | 6333 (host) | `phase76_knowledge_base` | 768 | ✅ **Populates** this collection |

**Current Status**: `phase76_knowledge_base` has **810 points** (Svelte 5 + SvelteKit 2 docs)

---

## Service Sharing Matrix

| Service | Phase 66 | Phase 76 | Phase 87 | Phase 88 |
|---------|----------|----------|----------|----------|
| **PostgreSQL** | ❌ Isolated (5432) | ✅ Host (5432) | ⚠️ Wrong port (5434) | ✅ Uses 76 (5432) |
| **Qdrant** | ❌ Isolated (6333) | ✅ Host (6333) | ✅ Shares 76 (6333) | ✅ Uses 76 (6333) |
| **Redis** | ❌ Isolated (6379) | ✅ Host (6379) | ✅ Shares 76 (6379) | ✅ Uses 76 (6379) |
| **CouchDB** | ❌ Not used | ✅ Host (5984) | ⚠️ Wrong creds | ✅ Uses 76 (5984) |
| **Ollama** | ✅ Host (11434) | ✅ Host (11434) | ✅ Host (11434) | ✅ Host (11434) |
| **MinIO** | ❌ Isolated (9000) | ✅ Host (9000) | ❌ Not used | ✅ Uses 76 (9000) |

---

## Phase Purposes

### Phase 66: Full Ingestion Stack (Docker Compose)
**Purpose**: Document ingestion, OCR, evidence processing, GPU inference
**Network**: Isolated `phase66-network`
**Start**: `docker-compose -f docker-compose.phase66-full.yml up -d`

**Containers**:
- sveltekit-frontend (5173)
- phase66-mcp-server (3003)
- phase66-tensorrt-llm (8099) - GPU inference
- phase66-postgres (5432) - isolated
- phase66-qdrant (6333) - isolated
- phase66-redis (6379) - isolated
- phase66-minio (9000) - isolated
- phase66-rabbitmq (5672, 15672)
- caddy-quic (80, 443)

**Use Cases**:
- Legal document ingestion
- OCR processing
- GPU-accelerated inference
- Evidence chain processing

---

### Phase 76: Knowledge Graph Services (PowerShell Scripts)
**Purpose**: Knowledge base, ACP tools, documentation search
**Network**: Host ports (localhost)
**Start**: `cd sveltekit-frontend; .\scripts\start-services.ps1`

**Containers** (started by script):
- phase76-postgres (5432) - **Used by Phase 87 & 88**
- phase76-qdrant (6333) - **Used by Phase 87 & 88**
- phase76-redis (6379) - **Used by Phase 87 & 88**
- phase76-couchdb (5984) - **Used by Phase 87 & 88**
- phase76-minio (9000) - **Used by Phase 88**
- phase76-rabbitmq (5672, 15672)

**Services**:
- FastMCP (3002) - 11 tools including `knowledge_retrieve`
- Knowledge Plane (8099) - Go hybrid RAG service

**Use Cases**:
- Knowledge base queries
- ACP tool execution
- Documentation search
- Svelte 5/SvelteKit 2 KB retrieval

---

### Phase 87: RAG/KAG Middleware (Docker Compose)
**Purpose**: CouchDB-backed KAG synthesis, LLM reasoning
**Network**: `host.docker.internal` bridge
**Start**: `docker-compose -f docker-compose.middleware.yml up -d`

**Container**:
- phase87-rag-middleware (8765)

**⚠️ Configuration Issues**:
```yaml
# Current (WRONG)
DATABASE_URL: postgresql://user:pass@host.docker.internal:5434/legal
COUCHDB_URL: http://admin:legal_ai_pass@host.docker.internal:5984

# Should be (CORRECT)
DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db
COUCHDB_URL: http://admin:password@host.docker.internal:5984
```

**Fix**: Run `.\fix-phase87-config.ps1`

**Use Cases**:
- RAG/KAG synthesis
- LLM-powered knowledge graph reasoning
- CouchDB document queries

---

### Phase 88: KB Ingestion Scripts (No Containers)
**Purpose**: Populate Phase 76's Qdrant with Svelte 5/SvelteKit 2 docs
**Type**: Node.js scripts (not Docker containers)
**Uses**: Phase 76 services (Qdrant, PostgreSQL, Redis, Ollama)

**Scripts**:
- `phase88-ingest-web.mjs` - Crawl web documentation
- `phase88-ingest-repo.mjs` - Ingest local docs
- `phase88-update-kb-from-fixes.mjs` - Learn from error fixes
- `phase88-test-error-fixes.mjs` - Test KB retrieval quality

**Current Status**: ✅ **810 points in `phase76_knowledge_base`**

**Use Cases**:
- Populate KB with Svelte 5 runes documentation
- Ingest SvelteKit 2 routing guides
- Store error fix patterns (positive + negative reinforcement)
- Test KB retrieval accuracy

---

## Quick Health Checks

```powershell
# Phase 66 (if running)
Invoke-RestMethod -Uri "http://localhost:3003/mcp/health"

# Phase 76 FastMCP
Invoke-RestMethod -Uri "http://localhost:3002/health"

# Phase 76 Knowledge Plane
Invoke-RestMethod -Uri "http://localhost:8099/health"

# Phase 87 Middleware
Invoke-RestMethod -Uri "http://localhost:8765/health"

# Qdrant (shared by 76/87/88)
Invoke-RestMethod -Uri "http://localhost:6333/collections/phase76_knowledge_base"

# Ollama (shared by all)
Invoke-RestMethod -Uri "http://localhost:11434/api/version"
```

---

## Common Confusion

### "Does Phase 88 use Phase 66 containers?"

**No.** Despite some script comments mentioning Phase 66, Phase 88 scripts **only use Phase 76 services**:
- Phase 76 Qdrant (6333) ✅
- Phase 76 PostgreSQL (5432) ✅
- Phase 76 Redis (6379) ✅
- Host Ollama (11434) ✅

Phase 66 is **completely isolated** with its own network and databases.

### "Why doesn't Phase 87 work with PostgreSQL?"

Phase 87's `docker-compose.middleware.yml` has the **wrong port** (5434 instead of 5432). Run `.\fix-phase87-config.ps1` to fix it.

### "Can I run Phase 66 and Phase 76 at the same time?"

**Yes!** They use different networks:
- Phase 66: Internal `phase66-network`
- Phase 76: Host ports (localhost)

Port 5432 and 6333 are exposed by Phase 66 containers to the host, but Phase 76 also uses these ports. This could cause conflicts if both try to bind to the same host ports.

**Recommendation**: Run Phase 76 OR Phase 66, not both simultaneously, unless you remap Phase 66's host port bindings.

---

## File Locations

### Documentation
- `DOCKER_CONTAINER_ARCHITECTURE_ANALYSIS.md` - Full analysis (500+ lines)
- `DOCKER_ARCHITECTURE_VISUAL.txt` - ASCII diagrams
- `PHASE_COMPARISON_QUICK_ANSWER.md` - Quick comparison
- `PHASE88_INTEGRATION_COMPLETE.md` - Integration guide
- `PHASE88_COMPLETE.md` - Phase 88 overview
- `PHASE88_STATUS.md` - Current ingestion status

### Configuration
- `docker-compose.phase66-full.yml` - Phase 66 stack
- `docker-compose.middleware.yml` - Phase 87 middleware
- `sveltekit-frontend/scripts/start-services.ps1` - Phase 76 startup

### Fix Scripts
- `fix-phase87-config.ps1` - Auto-fix Phase 87 configuration

---

## Start Everything (Recommended Order)

```powershell
# 1. Start Phase 76 (knowledge graph services)
cd sveltekit-frontend
.\scripts\start-services.ps1

# 2. Start FastMCP server
node scripts/fastmcp-server.mjs  # Port 3002

# 3. Start Knowledge Plane (optional)
cd ../go-services/knowledge-plane
$env:DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db"
$env:KNOWLEDGE_PLANE_PORT="8099"
.\knowledge-plane.exe

# 4. Fix and start Phase 87 (optional)
cd ../..
.\fix-phase87-config.ps1  # Apply fix first
docker-compose -f docker-compose.middleware.yml up -d

# 5. Run Phase 88 ingestion (if needed)
cd sveltekit-frontend
.\scripts\phase88-complete-setup.ps1  # Already done (810 points ✅)

# 6. Test KB retrieval
node scripts/phase88-quick-test.mjs

# 7. Run autonomous agent
node scripts/phase86-autonomous-loop.mjs
```

---

## TL;DR

- **Phase 66**: Isolated Docker stack for document ingestion (don't mix with Phase 76)
- **Phase 76**: Host services for knowledge graph (PostgreSQL, Qdrant, CouchDB, etc.)
- **Phase 87**: RAG middleware (needs config fix to use Phase 76 services)
- **Phase 88**: Ingestion scripts that populate Phase 76's Qdrant (✅ 810 points)

**For autonomous agents**: Use Phase 76 + Phase 88 (ignore Phase 66 and fix Phase 87)
