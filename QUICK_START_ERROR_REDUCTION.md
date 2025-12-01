# 🚀 Quick Start: Error Reduction Pipeline

## TL;DR

Complete AI-powered error reduction with AVX2-optimized SIMD, embeddings, and RL-driven fixes.

## Start Everything

```bash
scripts\start-error-reduction-pipeline.bat
```

## Or Start Manually

```bash
# 1. SIMD (AVX2)
cd sveltekit-frontend && npm run simd:exe:start

# 2. Ollama
ollama serve && ollama pull embeddinggemma:latest

# 3. Storage
docker-compose up -d postgres qdrant minio && redis-server

# 4. Frontend
npm run dev:quic
```

## Check Health

```bash
curl http://localhost:8096/health          # SIMD
curl http://localhost:11434/api/tags       # Ollama
curl http://localhost:6333/health          # Qdrant
```

## Use It

### Python
```python
from backend.services.log_ingest_service import ingest_log_batch

result = await ingest_log_batch(raw_logs, db)
```

### Query Similar Errors
```python
from backend.services.log_ingest_service import find_similar_errors

similar = await find_similar_errors("TS1005: ',' expected.")
```

### Get LLM Fix
```python
from backend.services.llm_broker import llm_broker

fix = await llm_broker.request_fix_suggestion("ollama", error_log)
```

## Dashboards

- AST Analyzer: http://localhost:5173/dev/ast-graph
- Routes: http://localhost:5173/all-routes

## Performance

- SIMD parsing: <1ms
- Embeddings (cached): <1ms
- End-to-end: ~100ms
- Throughput: ~20 errors/sec

## Ports

- 8096: SIMD JSON (AVX2)
- 11434: Ollama
- 6379: Redis
- 5432: Postgres
- 6333: Qdrant
- 9000: MinIO
- 5173: Frontend

## Done! ✅

Your AVX2-optimized error reduction pipeline is ready. Check [full docs](docs/ERROR_REDUCTION_COMPLETE.md) for details.
