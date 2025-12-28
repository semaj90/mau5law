# Phase 89: CUDA Integration & FastAPI Server Stabilization Guide

**Last Updated**: December 28, 2025
**Status**: ✅ Production-ready with degraded mode fallback

---

## 🎯 Overview

This guide documents the CUDA-accelerated RAG pipeline and FastAPI server stabilization, including:

1. **Redis Non-Fatal Mode** - Server runs even if Redis is down
2. **Database URL Correction** - Fixed Phase 86/87 portable stack defaults
3. **Docker Networking** - Proper host/container communication
4. **CUDA Graceful Degradation** - CPU fallback when CUDA unavailable
5. **Exception Handling** - Global handlers prevent silent crashes

---

## 🚨 Critical Fixes Applied

### Fix 1: Redis Non-Fatal Connection

**Problem**: FastAPI server crashes on startup if Redis is unreachable

**Root Cause**:
- Redis client created at import time
- Connection failures bubble into process shutdown
- No fallback mechanism

**Solution**: Lifespan manager with degraded mode

```python
from __future__ import annotations
import redis.asyncio as redis
from redis.exceptions import RedisError
from contextlib import asynccontextmanager
import logging

log = logging.getLogger("phase89")

# Minimal TTL in-memory cache
class TTLCache:
    def __init__(self, max_items: int = 50_000):
        self.max_items = max_items
        self._store: Dict[str, Tuple[float, bytes]] = {}

    def get(self, key: str) -> Optional[bytes]:
        v = self._store.get(key)
        if not v:
            return None
        exp, data = v
        if exp < time.time():
            self._store.pop(key, None)
            return None
        return data

    def set(self, key: str, data: bytes, ttl_s: int) -> None:
        # Naive eviction
        if len(self._store) > self.max_items:
            for k in list(self._store.keys())[: max(1, self.max_items // 10)]:
                self._store.pop(k, None)
        self._store[key] = (time.time() + ttl_s, data)

mem_cache = TTLCache()

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Phase89 server starting...")
    app.state.redis = None

    # Create Redis client BUT DO NOT allow failures to kill the server
    try:
        r = redis.from_url(
            REDIS_URL,
            decode_responses=False,
            socket_connect_timeout=2,
            socket_timeout=3,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        await r.ping()
        app.state.redis = r
        log.info("Redis connected OK")
    except Exception:
        app.state.redis = None
        log.exception("Redis unavailable. Running in DEGRADED mode (mem_cache fallback).")

    yield

    # Shutdown
    try:
        if app.state.redis is not None:
            await app.state.redis.close()
            log.info("Redis closed")
    except Exception:
        log.exception("Redis close failed (ignored)")

app = FastAPI(title="Phase89 CUDA RAG Server", lifespan=lifespan)

# Catch-all exception handler
@app.exception_handler(Exception)
async def unhandled(req: Request, exc: Exception):
    log.exception("Unhandled exception for %s %s", req.method, req.url.path)
    return JSONResponse(status_code=500, content={"error": "internal_error", "detail": str(exc)})
```

**Result**: Server stays alive even if Redis is down, falls back to in-memory TTL cache

---

### Fix 2: Database URL Correction

**Problem**: Phase 86/87 stack uses wrong database (port 5432 instead of 5434)

**Root Cause**:
- `DATABASE_URL` defaults to app database (5432)
- Phase 86/87 portable stack needs Docker database (5434)
- Silent failures due to schema mismatches

**Solution**: Explicit environment variables

```python
# CRITICAL FIX: Phase 87 portable defaults
DATABASE_URL_PHASE87 = os.getenv(
    "DATABASE_URL_PHASE87",
    "postgresql://user:pass@127.0.0.1:5434/legal"
)
DATABASE_URL_APP = os.getenv(
    "DATABASE_URL_APP",
    "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
)

REDIS_URL  = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
```

**Startup Script** (`start-phase89-server.ps1`):
```powershell
# Set environment before launching
$env:DATABASE_URL_PHASE87 = "postgresql://user:pass@127.0.0.1:5434/legal"
$env:DATABASE_URL_APP = "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
$env:REDIS_URL = "redis://127.0.0.1:6379"
$env:QDRANT_URL = "http://127.0.0.1:6333"
$env:OLLAMA_URL = "http://127.0.0.1:11434"

# Launch with fault handler
python -X faulthandler -m uvicorn scripts.phase89-fastapi-server:app `
  --host 0.0.0.0 --port 8765 --log-level debug
```

**Health Check Validation**:
```powershell
curl http://localhost:8765/health | ConvertFrom-Json
```

Expected output:
```json
{
  "ok": true,
  "redis": "ok",
  "phase87_db": "postgresql://user:pass@127.0.0.1:5434/legal",
  "app_db": "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
}
```

---

### Fix 3: Docker Networking

**Problem**: FastAPI in Docker can't reach Redis/Qdrant/Ollama on host

**Root Cause**:
- `127.0.0.1` inside Docker container = container's localhost
- Host services are unreachable from container

**Solution**: Use `host.docker.internal` in containers

**For FastAPI in Docker**:
```powershell
# .env.phase89 (for containerized FastAPI)
REDIS_URL=redis://host.docker.internal:6379
QDRANT_URL=http://host.docker.internal:6333
OLLAMA_URL=http://host.docker.internal:11434
```

**For FastAPI on Host** (current setup):
```powershell
# Use 127.0.0.1 when running on host
REDIS_URL=redis://127.0.0.1:6379
QDRANT_URL=http://127.0.0.1:6333
OLLAMA_URL=http://127.0.0.1:11434
```

**Smoke Test Script** (`scripts/phase89-redis-smoketest.ps1`):
```powershell
param(
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379
)

Write-Host "== Redis Smoke Test ==" -ForegroundColor Cyan
Write-Host "Host=$RedisHost Port=$RedisPort"

# 1) Container check
docker ps --format "{{.Names}}\t{{.Status}}" | Select-String -Pattern "redis|phase66-redis"

# 2) Host TCP check
Test-NetConnection -ComputerName $RedisHost -Port $RedisPort | Format-List

# 3) Docker exec ping
docker exec phase66-redis redis-cli ping

# 4) Python ping from host
python - << 'PY'
import redis
r = redis.Redis(host="$RedisHost", port=$RedisPort, socket_connect_timeout=2)
print("ping:", r.ping())
PY
```

**Usage**:
```powershell
# FastAPI on host
.\scripts\phase89-redis-smoketest.ps1 -RedisHost 127.0.0.1

# FastAPI in Docker
.\scripts\phase89-redis-smoketest.ps1 -RedisHost host.docker.internal
```

---

### Fix 4: CUDA Graceful Degradation

**Problem**: Server crashes if CUDA libraries missing on Windows

**Solution**: Try/except with CPU fallback

```python
try:
    import cupy as cp
    CUDA_AVAILABLE = True
    log.info("CUDA available: CuPy %s", cp.__version__)
except ImportError:
    CUDA_AVAILABLE = False
    log.warning("CuPy not installed - CUDA acceleration disabled, using CPU fallback")

@app.post("/embed")
async def embed(payload: Dict[str, Any]):
    text = payload.get("text", "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"error": "missing_text"})

    if CUDA_AVAILABLE:
        # Use CUDA-accelerated embedding
        vec = await cuda_embed(text)
    else:
        # CPU fallback
        vec = await cpu_embed(text)

    return {"vector": vec, "backend": "cuda" if CUDA_AVAILABLE else "cpu"}
```

---

### Fix 5: Global Exception Handling

**Problem**: Unhandled exceptions silently kill the server

**Solution**: Global exception handler + fault handler

```python
# Catch-all exception handler
@app.exception_handler(Exception)
async def unhandled(req: Request, exc: Exception):
    log.exception("Unhandled exception for %s %s", req.method, req.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "detail": str(exc),
            "path": req.url.path
        }
    )
```

**Launch with Fault Handler**:
```powershell
python -X faulthandler -m uvicorn scripts.phase89-fastapi-server:app --log-level debug
```

**Benefits**:
- Stack traces for "hard" failures
- No silent crashes
- Detailed error responses

---

## 🧪 Testing & Validation

### 1. Health Check
```powershell
curl http://localhost:8765/health
```

Expected:
```json
{
  "ok": true,
  "redis": "ok",
  "phase87_db": "postgresql://user:pass@127.0.0.1:5434/legal",
  "qdrant": "http://127.0.0.1:6333",
  "ollama": "http://127.0.0.1:11434",
  "models": {"embed": "embeddinggemma:latest", "chat": "gemma3-legal:latest"}
}
```

### 2. Test Redis Degraded Mode
```powershell
# Stop Redis
docker stop phase66-redis

# Health check should show degraded mode
curl http://localhost:8765/health

# Expected: "redis": "degraded(mem_cache)"

# Restart Redis
docker start phase66-redis
```

### 3. Test Embedding Endpoint
```powershell
curl -X POST http://localhost:8765/embed `
  -H "Content-Type: application/json" `
  -d '{"text": "error TS1005: semicolon expected"}'
```

Expected:
```json
{
  "cached": false,
  "vector": [0.123, 0.456, ...]
}
```

### 4. Test SSE Streaming
```powershell
curl -X POST http://localhost:8765/query/stream `
  -H "Content-Type: application/json" `
  -d '{"query": "TS1005"}' `
  --no-buffer
```

Expected:
```
data: {"stage":"start","query":"TS1005"}

data: {"stage":"retrieval","results":50}

data: {"stage":"done"}
```

---

## 🔧 CUDA RAG Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Query                           │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│               Redis Query Cache                         │
│               (instant, 7-day TTL)                      │
└───────────────────┬─────────────────────────────────────┘
                    ↓ (miss)
┌─────────────────────────────────────────────────────────┐
│          PostgreSQL Top-K Index                         │
│          (pre-computed neighbors)                       │
└───────────────────┬─────────────────────────────────────┘
                    ↓ (miss)
┌─────────────────────────────────────────────────────────┐
│          Qdrant Semantic Search                         │
│          (phase89_error_chunks collection)              │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│          Reciprocal Rank Fusion (RRF)                   │
│          Combine: Text match + Semantic + Top-K         │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│          CUDA Reranking (if available)                  │
│          CPU fallback: numpy cosine similarity          │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│          LLM Fix Generation                             │
│          (Ollama gemma3-legal)                          │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│          Cache Result & Return                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Tuning

### Redis Cache Configuration

```python
# Optimal TTL settings
EMBEDDING_CACHE_TTL = 7 * 24 * 3600  # 7 days
QUERY_CACHE_TTL = 7 * 24 * 3600      # 7 days
TOPK_CACHE_TTL = 24 * 3600           # 1 day (rebuild index daily)
```

### In-Memory Cache Tuning

```python
# Balance memory vs. performance
mem_cache = TTLCache(max_items=50_000)  # ~50MB for 50k cached items

# For high-traffic:
mem_cache = TTLCache(max_items=200_000)  # ~200MB

# For low-memory:
mem_cache = TTLCache(max_items=10_000)   # ~10MB
```

### CUDA Batch Size

```python
# Optimal for GPU memory
CUDA_BATCH_SIZE = 1024  # Embed 1024 texts in parallel

# For limited VRAM:
CUDA_BATCH_SIZE = 256

# For high VRAM (24GB+):
CUDA_BATCH_SIZE = 4096
```

---

## 🐛 Troubleshooting Guide

### Server Won't Start

**Symptom**: `uvicorn` crashes immediately

**Check**:
1. Database URLs correct?
   ```powershell
   $env:DATABASE_URL_PHASE87
   $env:DATABASE_URL_APP
   ```

2. Ports available?
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 8765
   ```

3. Python imports work?
   ```powershell
   python -c "import fastapi, redis, uvicorn; print('OK')"
   ```

**Solution**: Check logs with `-X faulthandler --log-level debug`

---

### Redis Connection Errors

**Symptom**: Server logs show Redis timeouts

**Check**:
1. Container running?
   ```powershell
   docker ps --filter name=phase66-redis
   ```

2. Port reachable?
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 6379
   ```

3. Credentials correct?
   ```powershell
   docker exec phase66-redis redis-cli AUTH password PING
   ```

**Solution**: Server should run in degraded mode automatically

---

### CUDA Not Available

**Symptom**: `"backend": "cpu"` in responses

**Check**:
1. CuPy installed?
   ```powershell
   python -c "import cupy as cp; print(cp.__version__)"
   ```

2. CUDA toolkit installed?
   ```powershell
   nvcc --version
   ```

3. GPU detected?
   ```powershell
   nvidia-smi
   ```

**Solution**: Server falls back to CPU automatically (expected on Windows without CUDA)

---

### Query Returns Empty Results

**Symptom**: `"results": []` even with valid query

**Check**:
1. Embeddings exist?
   ```powershell
   docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
   SELECT COUNT(*) FROM raw_error_embeddings WHERE embedding IS NOT NULL"
   ```

2. Top-K index built?
   ```powershell
   docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "
   SELECT COUNT(*) FROM error_topk_index"
   ```

3. Cache stale?
   ```powershell
   docker exec phase66-redis redis-cli FLUSHDB
   ```

**Solution**: Rebuild embeddings or clear cache

---

## 🎯 Best Practices

### 1. Always Use Environment Variables

❌ **Bad**:
```python
DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"
```

✅ **Good**:
```python
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:5434/legal")
```

### 2. Never Let Dependencies Kill the Server

❌ **Bad**:
```python
redis_client = redis.from_url(REDIS_URL)  # Crashes if Redis down
```

✅ **Good**:
```python
try:
    redis_client = redis.from_url(REDIS_URL)
    await redis_client.ping()
except Exception:
    redis_client = None  # Degraded mode
```

### 3. Always Log Configuration on Startup

✅ **Good**:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting with:")
    log.info("  DATABASE_URL_PHASE87=%s", DATABASE_URL_PHASE87)
    log.info("  REDIS_URL=%s", REDIS_URL)
    log.info("  QDRANT_URL=%s", QDRANT_URL)
    yield
```

### 4. Use Fault Handler in Production

✅ **Always**:
```powershell
python -X faulthandler -m uvicorn scripts.phase89-fastapi-server:app
```

### 5. Validate Health Endpoint Before Traffic

✅ **Before deployment**:
```powershell
$health = curl http://localhost:8765/health | ConvertFrom-Json
if ($health.ok -eq $true) {
    Write-Host "Server ready!"
} else {
    Write-Host "Server unhealthy: $health"
}
```

---

## 📚 Related Documentation

- **PHASE89_KNOWLEDGE_BASE.md** - Complete system documentation
- **PHASE89_CORRECTED_STATUS.md** - Error correction plan
- **PHASE89_REDIS_TOPK_GUIDE.md** - Caching architecture
- **phase89-verify-system.ps1** - System verification script

---

## ✅ Production Readiness Checklist

- [x] Redis non-fatal mode implemented
- [x] Database URLs corrected (5434 vs 5432)
- [x] Docker networking documented
- [x] CUDA graceful degradation
- [x] Global exception handling
- [x] Fault handler enabled
- [x] Health endpoint implemented
- [x] Redis smoke test script
- [x] Degraded mode TTL cache
- [x] Environment variable validation
- [ ] Load testing (pending)
- [ ] Monitoring/alerting (pending)
- [ ] Backup/recovery procedures (pending)

---

**Last Updated**: December 28, 2025
**Status**: ✅ Production-ready with degraded mode fallback
