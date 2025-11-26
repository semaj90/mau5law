# Phase 73: Unified Reasoning Engine - Implementation Guide

## 🎯 Quick Overview

Phase 73 creates a **Unified Reasoning Engine** that orchestrates:
- **C++ CUDA gRPC Service** (clustering, SOM, centroids)
- **FastAPI Python Bridge** (embeddings, caching, citations)
- **Go Hybrid Re-ranker** (BM25 + semantic + cluster scoring)
- **SvelteKit UI** (cluster badges, results display)
- **Redis + Qdrant + PostgreSQL** (caching, vectors, metadata)

**Goal**: <500ms end-to-end latency with 70-90% GPU utilization

---

## 📊 Architecture at a Glance

```
User Search Query
       ↓
SvelteKit UI
       ↓
Node API Routes (/search/unified)
       ↓
Go Hybrid Re-ranker
  ├─ BM25 Score (40%)
  ├─ Semantic Score (40%)
  └─ Cluster Score (20%)
       ↓
FastAPI Bridge
  ├─ Generate Embeddings
  ├─ Check Redis Cache
  └─ Call CUDA gRPC
       ↓
C++ CUDA gRPC Service
  ├─ ComputeCentroids (cuBLAS)
  ├─ TrainSOM (CUDA kernels)
  └─ PredictCluster (cosine similarity)
       ↓
Results with Cluster Badges
  🔖 Precedent | 💰 Restitution | ⚠️ Kidnapping | 🚫 Forced Labor
```

---

## 🚀 Implementation Phases

### Phase 1: CUDA & gRPC (Days 1-4)

**Task 1: Protocol Buffers**
```bash
# Create cuda_cluster.proto
cat > cpp-ast-exporter/cuda_cluster.proto << 'EOF'
syntax = "proto3";

service ClusterEngine {
  rpc ComputeCentroids (EmbeddingBatch) returns (CentroidResponse);
  rpc TrainSOM (SOMRequest) returns (SOMResponse);
  rpc PredictCluster (EmbeddingVector) returns (ClusterLabel);
}

message EmbeddingVector {
  repeated float values = 1;
}

message EmbeddingBatch {
  repeated EmbeddingVector vectors = 1;
}

message SOMRequest {
  int32 grid_size = 1;
  repeated EmbeddingVector vectors = 2;
}

message SOMResponse {
  repeated int32 bmu_indices = 1;
}

message CentroidResponse {
  repeated EmbeddingVector centroids = 1;
}

message ClusterLabel {
  int32 label = 1;
}
EOF

# Generate C++ stubs
protoc --cpp_out=. --grpc_out=. --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` cuda_cluster.proto
```

**Task 2: CUDA Kernels**
```cpp
// cpp-ast-exporter/cuda_cluster_kernels.cu
#include <cuda_runtime.h>
#include <cublas_v2.h>

__global__ void cosineSimilarityKernel(
    const float* query,
    const float* candidates,
    float* similarities,
    int embedding_dim,
    int num_candidates
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < num_candidates) {
        float dot_product = 0.0f;
        float query_norm = 0.0f;
        float candidate_norm = 0.0f;

        for (int i = 0; i < embedding_dim; i++) {
            dot_product += query[i] * candidates[idx * embedding_dim + i];
            query_norm += query[i] * query[i];
            candidate_norm += candidates[idx * embedding_dim + i] *
                             candidates[idx * embedding_dim + i];
        }

        similarities[idx] = dot_product / (sqrtf(query_norm) * sqrtf(candidate_norm));
    }
}
```

**Task 3: C++ gRPC Service**
```cpp
// cpp-ast-exporter/cuda_cluster_service.cpp
#include <grpcpp/grpcpp.h>
#include "cuda_cluster.grpc.pb.h"

class ClusterEngineImpl : public ClusterEngine::Service {
public:
    grpc::Status ComputeCentroids(
        grpc::ServerContext* context,
        const EmbeddingBatch* request,
        CentroidResponse* response
    ) override {
        // Use cuBLAS GEMM to compute centroids
        // Return centroids in response
        return grpc::Status::OK;
    }

    grpc::Status PredictCluster(
        grpc::ServerContext* context,
        const EmbeddingVector* request,
        ClusterLabel* response
    ) override {
        // Use cosine similarity kernel
        // Return cluster label
        return grpc::Status::OK;
    }
};
```

### Phase 2: FastAPI & Caching (Days 5-7)

**Task 4: FastAPI Bridge**
```python
# backend/cluster_bridge.py
import redis
import grpc
from proto import cuda_cluster_pb2, cuda_cluster_pb2_grpc

cache = redis.Redis(host="redis", decode_responses=False)
channel = grpc.insecure_channel("cuda-cluster:50051")
cuda = cuda_cluster_pb2_grpc.ClusterEngineStub(channel)

async def get_cluster(embedding: List[float]) -> int:
    """Get cluster assignment with Redis caching"""
    key = f"cluster:{hash(str(embedding))}"

    if cached := cache.get(key):
        return int.from_bytes(cached)

    req = cuda_cluster_pb2.EmbeddingVector(values=embedding)
    res = cuda.PredictCluster(req)

    cache.set(key, res.label, ex=86400)  # 24h TTL
    return res.label
```

**Task 5: Redis Cache**
```python
# backend/redis_cache.py
class RedisCache:
    def __init__(self, host="redis", port=6379):
        self.redis = redis.Redis(host=host, port=port, decode_responses=False)

    def get_embedding(self, doc_id: str) -> Optional[List[float]]:
        key = f"embedding:{doc_id}"
        if data := self.redis.get(key):
            return json.loads(data)
        return None

    def set_embedding(self, doc_id: str, embedding: List[float]):
        key = f"embedding:{doc_id}"
        self.redis.set(key, json.dumps(embedding), ex=86400)  # 24h TTL

    def get_centroid(self, cluster_id: int) -> Optional[List[float]]:
        key = f"centroid:{cluster_id}"
        if data := self.redis.get(key):
            return json.loads(data)
        return None

    def set_centroid(self, cluster_id: int, centroid: List[float]):
        key = f"centroid:{cluster_id}"
        self.redis.set(key, json.dumps(centroid), ex=604800)  # 7d TTL
```

### Phase 3: Go Re-ranking (Days 8-10)

**Task 6: Go Hybrid Re-ranker**
```go
// go-services/hybrid_reranker.go
package main

type RankingScore struct {
    BM25Score      float64
    SemanticScore  float64
    ClusterScore   float64
    FinalScore     float64
}

func (r *Reranker) ComputeScore(result SearchResult) RankingScore {
    bm25 := r.computeBM25(result)           // 40% weight
    semantic := r.computeSemantic(result)   // 40% weight
    cluster := r.computeCluster(result)     // 20% weight

    final := (bm25 * 0.4) + (semantic * 0.4) + (cluster * 0.2)

    return RankingScore{
        BM25Score:     bm25,
        SemanticScore: semantic,
        ClusterScore:  cluster,
        FinalScore:    final,
    }
}

func (r *Reranker) computeCluster(result SearchResult) float64 {
    cluster := r.pythonBridge.GetCluster(result.Embedding)
    affinity := r.clusterGraph.GetAffinity(cluster, result.CaseType)
    return affinity
}
```

### Phase 4: UI Integration (Days 11-12)

**Task 8: Cluster Badge Component**
```svelte
<!-- sveltekit-frontend/src/lib/components/ClusterBadge.svelte -->
<script>
  export let cluster: string;

  const badgeMap = {
    'precedent_cluster': { icon: '🔖', label: 'Precedent', color: 'badge-primary' },
    'restitution_cluster': { icon: '💰', label: 'Restitution', color: 'badge-success' },
    'kidnapping_cluster': { icon: '⚠️', label: 'Kidnapping', color: 'badge-warning' },
    'forced_labor_cluster': { icon: '🚫', label: 'Forced Labor', color: 'badge-danger' },
  };

  $: badge = badgeMap[cluster] || { icon: '📋', label: 'Case', color: 'badge-info' };
</script>

<span class="badge {badge.color}">
  {badge.icon} {badge.label}
</span>

<style>
  .badge {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-weight: 600;
    display: inline-block;
  }
</style>
```

### Phase 5: API & Deployment (Days 13-15)

**Task 11: Node API Routes**
```typescript
// sveltekit-frontend/src/routes/api/search/unified/+server.ts
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const { query } = await request.json();

    // 1. Generate embeddings (FastAPI)
    const embedding = await generateEmbedding(query);

    // 2. Get cluster (CUDA gRPC via FastAPI)
    const cluster = await getCluster(embedding);

    // 3. Perform search (Qdrant)
    const results = await searchQdrant(embedding);

    // 4. Re-rank (Go service)
    const reranked = await rerank(results, embedding, cluster);

    // 5. Add cluster badges
    const withBadges = reranked.map(r => ({
        ...r,
        clusterBadge: cluster
    }));

    return json(withBadges);
}
```

**Task 12: Docker Compose**
```yaml
# docker/docker-compose.reasoning-engine.yml
version: '3.8'

services:
  cuda-cluster:
    build:
      context: .
      dockerfile: Dockerfile.cuda-cluster
    ports:
      - "50051:50051"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  fastapi-bridge:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    environment:
      - CUDA_CLUSTER_HOST=cuda-cluster
      - REDIS_HOST=redis
    depends_on:
      - cuda-cluster
      - redis

  go-reranker:
    build:
      context: ./go-services
      dockerfile: Dockerfile
    ports:
      - "8002:8000"
    environment:
      - PYTHON_BRIDGE_HOST=fastapi-bridge
    depends_on:
      - fastapi-bridge

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

---

## 📊 Performance Checklist

- [ ] CUDA ComputeCentroids: <100ms
- [ ] CUDA TrainSOM: <500ms
- [ ] CUDA PredictCluster: <10ms
- [ ] FastAPI (cached): <5ms
- [ ] FastAPI (uncached): <100ms
- [ ] Go Re-ranking: <50ms
- [ ] UI Render: <200ms
- [ ] **Total Pipeline: <500ms**

---

## 🔧 Testing Commands

```bash
# Test CUDA gRPC service
grpcurl -plaintext localhost:50051 list

# Test FastAPI bridge
curl http://localhost:8001/api/cluster -X POST -d '{"embedding": [...]}'

# Test Go re-ranker
curl http://localhost:8002/api/rerank -X POST -d '{"results": [...]}'

# Test full pipeline
curl http://localhost:3000/api/search/unified -X POST -d '{"query": "..."}'

# Monitor GPU
nvidia-smi -l 1

# Check Redis cache
redis-cli KEYS "cluster:*"
```

---

## 🎯 Success Criteria

✅ CUDA kernels compute correctly
✅ gRPC service responds in <100ms
✅ FastAPI caching works with >80% hit rate
✅ Go re-ranking produces valid scores
✅ Cluster badges display correctly
✅ Full pipeline latency <500ms
✅ All tests pass
✅ Docker stack deploys successfully
✅ GPU utilization 70-90%
✅ No memory leaks

---

## 📚 Documentation

- **Specification**: `.kiro/specs/phase-73-unified-reasoning-engine/`
- **Requirements**: `.kiro/specs/phase-73-unified-reasoning-engine/requirements.md`
- **Design**: `.kiro/specs/phase-73-unified-reasoning-engine/design.md`
- **Tasks**: `.kiro/specs/phase-73-unified-reasoning-engine/tasks.md`
- **Summary**: `.kiro/PHASE_73_SPEC_COMPLETE.md`

---

## 🚀 Next Steps

1. **Start Task 1**: Create Protocol Buffer definitions
2. **Implement CUDA kernels**: Tasks 2-3
3. **Build FastAPI bridge**: Tasks 4-5
4. **Implement Go re-ranker**: Tasks 6-7
5. **Create UI components**: Tasks 8-9
6. **Deploy and test**: Tasks 10-12

---

**Status**: ✅ Ready for implementation

**Timeline**: 13-20 days for full implementation

**Expected Outcome**: Unified reasoning engine with <500ms end-to-end latency
