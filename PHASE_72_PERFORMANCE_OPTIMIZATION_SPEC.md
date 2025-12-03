# Phase 72 Performance Optimization Specification

**Date:** December 2, 2025
**Status:** Specification Complete – Ready to Implement
**Speedup Target:** 6-12x (30-60s → <5s for 10k errors)

---

## Executive Summary

Phase 72 today works great but is slow (~30-60s for 10k errors). We can make it **6-12x faster** by moving the hot path to Go + ripgrep + SIMD + gRPC, keeping the PyTorch model in GPU memory, and using Redis + Qdrant for caching and clustering.

**Key insight:** The bottleneck is not GPU vectorization (already fast), but log parsing, model reload overhead, and redundant work across cycles.

---

## Current Phase 72 (Baseline)

```
svelte-check output
    ↓ (Node regex parsing)
Extract errors (~1s for 10k)
    ↓ (Python script startup)
Load PyTorch model (~500ms)
    ↓ (GPU vectorization)
Embed errors (~1.5s for 10k)
    ↓ (WebGPU SOM clustering)
Cluster vectors (~2s)
    ↓ (ACE fixes)
Apply fixes (~5-10s)
    ↓
Total: ~30-60s
```

**Bottlenecks:**
- Node regex parsing: slow for large logs
- Python model reload: 500ms per run
- No caching: re-embed identical errors
- Full SOM clustering: O(N²) distance computations

---

## Optimized Phase 72 (Target)

```
svelte-check output
    ↓ (Go ripgrep + simdjson)
Parse errors (<100ms for 10k)
    ↓ (Redis cache check)
Check cache (<1ms per error)
    ↓ (Python long-lived service)
Embed uncached errors (~1.5s, no reload)
    ↓ (Redis cache store)
Store vectors (<1ms per error)
    ↓ (Qdrant nearest-neighbor)
Cluster vectors (<500ms)
    ↓ (AST topology)
Build context (<100ms per error)
    ↓ (ACE fixes)
Apply fixes (~5-10s)
    ↓
Total: <5s (for 10k errors, with cache hits)
```

**Improvements:**
- Go parser: 10-100x faster than Node regex
- Long-lived service: no model reload cost
- Redis cache: >80% hit rate on repeated errors
- Qdrant clustering: faster than full SOM
- AST topology: full context for fixes

---

## Architecture

### 1. Go Error Parser Service
- **Purpose:** Parse svelte-check logs using ripgrep + simdjson
- **Latency:** <100ms for 10k errors
- **Interface:** gRPC + HTTP gateway
- **Fallback:** Node regex parser

### 2. Python GPU Vectorizer Service
- **Purpose:** Keep PyTorch model in GPU memory, batch encode errors
- **Latency:** ~1.5s for 10k errors (no reload)
- **Interface:** FastAPI `/embed` endpoint
- **Fallback:** Simple features

### 3. Redis Cache Layer
- **Purpose:** Cache error → vector mappings
- **Hit Rate:** >80% on repeated errors
- **TTL:** 24 hours
- **Fallback:** Skip caching (no error)

### 4. Qdrant Clustering
- **Purpose:** Find nearest neighbors, build clustering graph
- **Latency:** <500ms for 10k errors
- **Interface:** Qdrant API
- **Fallback:** WebGPU SOM

### 5. AST Topology Graph
- **Purpose:** Build error context using ts-morph
- **Latency:** <100ms per error (cached)
- **Storage:** In-memory or Neo4j
- **Fallback:** Skip context (no error)

### 6. Unified Orchestrator
- **Purpose:** Orchestrate all components
- **Latency:** <5s for 10k errors
- **Logging:** JSONL for ACE analysis
- **Fallback:** Graceful degradation

---

## Performance Targets

| Component | Current | Optimized | Speedup |
|-----------|---------|-----------|---------|
| Error parsing | ~1s | <100ms | 10x |
| Model reload | ~500ms | 0ms | ∞ |
| Vectorization | ~1.5s | ~1.5s | 1x |
| Caching | 0ms | <1ms | N/A |
| Clustering | ~2s | <500ms | 4x |
| **Total** | **~30-60s** | **<5s** | **6-12x** |

---

## Implementation Roadmap

### Phase 1: Go Error Parser (Day 1-2)
- [ ] Create Go project
- [ ] Implement ripgrep + simdjson parser
- [ ] Implement gRPC service
- [ ] Test & benchmark

### Phase 2: Python GPU Vectorizer Service (Day 1-2)
- [ ] Wrap existing vectorizer as FastAPI
- [ ] Keep model in GPU memory
- [ ] Implement `/embed` endpoint
- [ ] Test & benchmark

### Phase 3: Redis Cache Layer (Day 2)
- [ ] Implement Redis cache
- [ ] Integrate with orchestrator
- [ ] Test & benchmark

### Phase 4: Qdrant Clustering (Day 2-3)
- [ ] Implement Qdrant integration
- [ ] Build clustering graph
- [ ] Test & benchmark

### Phase 5: AST Topology Graph (Day 3)
- [ ] Implement AST topology
- [ ] Build error context
- [ ] Test & benchmark

### Phase 6: Unified Orchestrator (Day 3-4)
- [ ] Create orchestrator script
- [ ] Add npm script
- [ ] Test end-to-end

### Phase 7: Documentation & Testing (Day 4-5)
- [ ] Write documentation
- [ ] Create tests
- [ ] Benchmark & compare

**Total Effort:** 3-5 days
**Parallelizable:** Yes (Go + Python can be done in parallel)

---

## Fallback Strategy

If any service is unavailable, Phase 72 gracefully falls back:

1. **Go Parser unavailable** → Use Node regex parser
2. **Python Vectorizer unavailable** → Use simple features
3. **Redis unavailable** → Skip caching
4. **Qdrant unavailable** → Use WebGPU SOM
5. **AST Topology unavailable** → Skip context

**Result:** Pipeline always works, just slower

---

## Success Criteria

- [ ] Phase 72 latency: <5s for 10k errors
- [ ] Cache hit rate: >80%
- [ ] All services have health checks
- [ ] Graceful fallback works
- [ ] JSONL logging complete
- [ ] Tests passing
- [ ] Documentation complete

---

## Files to Create

### Go Services
- `go-services/phase72-error-parser/main.go` – Error parser service
- `go-services/phase72-error-parser/proto/parser.proto` – gRPC definitions

### Python Services
- `python-services/phase72_vectorizer_service.py` – FastAPI service

### Node Scripts
- `scripts/phase72-redis-cache.mjs` – Redis cache layer
- `scripts/phase72-qdrant-clustering.mjs` – Qdrant clustering
- `scripts/phase72-ast-topology.mjs` – AST topology graph
- `scripts/phase72-optimized.mjs` – Unified orchestrator

### Documentation
- `PHASE_72_PERFORMANCE_GUIDE.md` – User guide
- `PHASE_72_PERFORMANCE_OPTIMIZATION_SPEC.md` – This file

---

## Next Steps

1. **Approve this spec**
2. **Start Phase 1** (Go parser)
3. **Parallelize** Phases 1-2
4. **Integrate** components as they're ready
5. **Benchmark** each step
6. **Deploy** and measure speedup

---

## Questions?

- **Why Go?** Ripgrep + simdjson are AVX2-optimized, concurrent, and fast
- **Why long-lived Python service?** Avoid model reload overhead (500ms per run)
- **Why Redis?** Cache hit rate >80% on repeated errors
- **Why Qdrant?** Faster than full SOM, enables nearest-neighbor clustering
- **Why AST topology?** Full context for Phase 73 fixes

---

**Status:** ✅ Specification Complete
**Next:** Implementation (3-5 days)
**Expected Outcome:** 6-12x speedup (30-60s → <5s)
