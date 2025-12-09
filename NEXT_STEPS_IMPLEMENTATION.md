# Next Steps Implementation - Phase 14 + GPU Phase 72

**Status**: Phase 14 synced, Phase 6 has minor TypeScript cache issue, ready to proceed

---

## ✅ Completed

### Step 1: Sync Phase 14 to Go Services
```
✅ go-services/legal-engine/.env - Synced
✅ go-services/rag-service/.env - Synced
✅ go-services/upload-service/.env - Synced
```

### Step 2: Phase 6 Validation
- ⚠️ Minor TypeScript cache issue in embedding-worker.ts (comment vs code)
- Core machines and routes identified
- Can proceed with implementation

---

## ⏭️ Next: Implement GPU Phase 72 Wrapper

### Option 1: Quick Implementation (Recommended)

Create the three wrapper files from templates in `PHASE72_GPU_VECTORIZER_INTEGRATION.md`:

**File 1**: `sveltekit-frontend/src/lib/server/phase72/astVectorizer.ts`
```typescript
import path from 'node:path';
import fs from 'node:fs';

let ASTVectorizerCtor: any | null = null;

function loadAddon() {
  if (ASTVectorizerCtor) return ASTVectorizerCtor;

  const candidate = path.resolve('build', 'Release', 'ast_error_vectorizer.node');

  if (!fs.existsSync(candidate)) {
    throw new Error(
      `ast_error_vectorizer.node not found at ${candidate}. Run CMake build first.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const addon = require(candidate);
  if (!addon.ASTVectorizer) {
    throw new Error('ASTVectorizer export missing from ast_error_vectorizer.node');
  }

  ASTVectorizerCtor = addon.ASTVectorizer;
  return ASTVectorizerCtor;
}

export function createAstVectorizer(modelPath: string) {
  const Ctor = loadAddon();
  const instance = new Ctor();

  const ok = instance.loadModel(modelPath);
  if (!ok) {
    throw new Error(`Failed to load BERT model at: ${modelPath}`);
  }

  return instance as {
    generateEmbedding(msg: string): number[];
    generateBatch(errs: string[]): number[][];
    getErrorCount(): number;
    exportErrors(): string;
  };
}
```

**File 2**: `sveltekit-frontend/src/lib/server/phase72/vectorizeErrors.ts`
```typescript
import { createAstVectorizer } from './astVectorizer';

let gpuVectorizer: ReturnType<typeof createAstVectorizer> | null = null;

function ensureGpuVectorizer() {
  if (gpuVectorizer) return gpuVectorizer;

  const modelPath = 'models/phase72/bert_error_encoder.pt';
  gpuVectorizer = createAstVectorizer(modelPath);

  return gpuVectorizer;
}

export function vectorizeErrorsGPU(errors: string[]): number[][] {
  const v = ensureGpuVectorizer();
  return v.generateBatch(errors);
}

export function vectorizeErrorGPU(error: string): number[] {
  const v = ensureGpuVectorizer();
  return v.generateEmbedding(error);
}

export function getErrorCountGPU(): number {
  const v = ensureGpuVectorizer();
  return v.getErrorCount();
}
```

**File 3**: `sveltekit-frontend/src/lib/server/phase72/clusterErrors.ts`
```typescript
import { vectorizeErrorsGPU } from './vectorizeErrors';

export interface ErrorCluster {
  id: string;
  errors: string[];
  centroid: number[];
  size: number;
  avgSimilarity: number;
}

export function clusterErrorsPhase72(errors: string[], k: number = 8): ErrorCluster[] {
  try {
    const embeddings = vectorizeErrorsGPU(errors);
    const clusters = kmeansCluster(embeddings, errors, k);
    return clusters;
  } catch (err) {
    console.error('[Phase72] GPU clustering failed:', err);
    return [];
  }
}

function kmeansCluster(
  embeddings: number[][],
  errors: string[],
  k: number
): ErrorCluster[] {
  // Initialize centroids randomly
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * embeddings.length);
    centroids.push([...embeddings[idx]]);
  }

  // K-means iterations (simplified)
  for (let iter = 0; iter < 10; iter++) {
    const assignments: number[] = embeddings.map((emb) => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = 1 - cosineSimilarity(emb, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      return bestCluster;
    });

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterIndices = assignments
        .map((a, i) => (a === c ? i : -1))
        .filter((i) => i >= 0);

      if (clusterIndices.length === 0) continue;

      const newCentroid = new Array(embeddings[0].length).fill(0);
      for (const idx of clusterIndices) {
        for (let d = 0; d < embeddings[idx].length; d++) {
          newCentroid[d] += embeddings[idx][d];
        }
      }
      for (let d = 0; d < newCentroid.length; d++) {
        newCentroid[d] /= clusterIndices.length;
      }
      centroids[c] = newCentroid;
    }
  }

  // Build final clusters
  const assignments: number[] = embeddings.map((emb) => {
    let minDist = Infinity;
    let bestCluster = 0;
    for (let c = 0; c < centroids.length; c++) {
      const dist = 1 - cosineSimilarity(emb, centroids[c]);
      if (dist < minDist) {
        minDist = dist;
        bestCluster = c;
      }
    }
    return bestCluster;
  });

  const clusters: ErrorCluster[] = [];
  for (let c = 0; c < k; c++) {
    const clusterIndices = assignments
      .map((a, i) => (a === c ? i : -1))
      .filter((i) => i >= 0);

    if (clusterIndices.length === 0) continue;

    const clusterErrors = clusterIndices.map((i) => errors[i]);
    const clusterEmbeddings = clusterIndices.map((i) => embeddings[i]);

    let totalSim = 0;
    let count = 0;
    for (let i = 0; i < clusterEmbeddings.length; i++) {
      for (let j = i + 1; j < clusterEmbeddings.length; j++) {
        totalSim += cosineSimilarity(clusterEmbeddings[i], clusterEmbeddings[j]);
        count++;
      }
    }
    const avgSimilarity = count > 0 ? totalSim / count : 0;

    clusters.push({
      id: `cluster-${c}`,
      errors: clusterErrors,
      centroid: centroids[c],
      size: clusterErrors.length,
      avgSimilarity,
    });
  }

  return clusters;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## ⏭️ Then: Start Infrastructure Services

```bash
# Start Postgres
docker-compose up -d postgres

# Start Redis
docker-compose up -d redis

# Start Ollama
ollama serve

# Start Qdrant
docker-compose up -d qdrant

# Start MinIO
docker-compose up -d minio
```

---

## ⏭️ Then: Start Go Services

```bash
# Terminal 1: Legal Engine
cd go-services/legal-engine
go run main.go

# Terminal 2: RAG Service
cd go-services/rag-service
go run main.go

# Terminal 3: Upload Service
cd go-services/upload-service
go run main.go
```

---

## ⏭️ Finally: Test Full Stack

### Test URLs
1. **Frontend**: http://127.0.0.1:5173/
2. **Legal Engine**: http://localhost:8080/health
3. **RAG Service**: http://localhost:8081/health
4. **Ollama**: http://localhost:11434/api/tags
5. **Qdrant**: http://localhost:6333/health

### Test GPU Phase 72
```bash
# In Node.js REPL
const { clusterErrorsPhase72 } = require('./src/lib/server/phase72/clusterErrors');
const errors = ['error 1', 'error 2', 'error 3'];
const clusters = clusterErrorsPhase72(errors);
console.log(clusters);
```

---

## Summary

**Current State**:
- ✅ Phase 14 env synced to all Go services
- ✅ Dev server running at http://127.0.0.1:5173/
- ✅ GPU addon verified and ready
- ✅ Phase 6 validation ready (minor cache issue)

**Ready for**:
1. GPU Phase 72 wrapper implementation (3 files)
2. Infrastructure services startup
3. Go services startup
4. Full stack testing

**Estimated Time**: 30 minutes to full stack operational

