## 🤖 Copilot progress & todo (DB layer)

Recent work (automated):
 - Centralized Drizzle expression imports and helpers into `src/lib/server/db/utils.ts` (exports: eq, and, or, gt, lt, like, not, asc, desc, sql, db, adminDb, waitForDb, pgvectorCosineSql, genRandomUUID).
 - Added high-level helpers in `src/lib/server/db/drizzle.ts`: `cachedQuery`, `hybridVectorSearch`, `storeEmbedding`, and `fetchDocumentFromMinIO`.
 - Migrated a small sample of files to prefer `$lib/server/db/utils` imports (examples: `src/lib/server/db/query-utils.ts`, `src/routes/api/activities/+server.ts`).

Next steps (recommended):
1. Run TypeScript & Svelte checks (sveltekit-frontend): `npx tsc --noEmit --skipLibCheck` and `npx svelte-check` and capture the first 50 errors.
2. Batch-migrate remaining files that import Drizzle expressions directly to `$lib/server/db/utils` in small passes (20–50 files), re-running type checks between passes.
3. Tighten types in `src/lib/server/db/drizzle.ts` to remove `any`/`unknown` and drop file-scoped lint disables.
4. Run runtime smoke tests (start dev server) to ensure lazy DB init and MinIO/Redis fallbacks don't crash at import time.

If you want, I can continue the migration in small, verified batches and run the TypeScript checks after each pass — tell me to proceed and I'll start the first batch.
<!-- NOTE: This file is documentation containing many Svelte examples and template markers.
  known tool or toolset" errors, treat the content as plain text.
     The rest of the file is unchanged documentation. -->
— you’re on drizzle-orm@0.44.7, which means you’re using the new modular import system introduced after v0.30.

So the error message you saw is 100% correct:
👉 eq (and other operators like and, or, gt, etc.) are no longer exported from 'drizzle-orm' directly.

✅ Correct Import for Drizzle ORM v0.44.7

Use:

import { eq } from 'drizzle-orm/expressions';

💡 Example (Postgres + Drizzle)

Here’s what a working query looks like in your SvelteKit + Drizzle setup:

import { eq } from 'drizzle-orm/expressions';
import { db } from '$lib/server/db/drizzle';
import { users } from '$lib/server/db/schema';

const result = await db
  .select()
  .from(users)
  .where(eq(users.id, 'user_123'));

🧩 If you also use operators like and, or, gt, lt:

They come from the same path:

import { eq, and, or, gt, lt, like } from 'drizzle-orm/expressions';

🧱 Optional — Common Patterns for your project

Since you’re using:

Lucia v3

Postgres with pgvector

SvelteKit 2 / Drizzle ORM 0.44.7
```text
# Legal AI Platform - AI Agent Instructions
sveltekit-complete.txt

use mcp-server tools get-library-docs: use context7, sveltekit 2, typescript, drizzle-orm, bits-ui, svelte 5, qdrant, pg vector, postgresql, redis, xstate, webgpu, cuda, uno.css

## Project Overview
This is a sophisticated legal AI platform with microservices architecture featuring SvelteKit 5 frontend, 37+ Go microservices, XState v5 state management, and WebAssembly/GPU acceleration.add to #file:copilot-instructions.md You only need them when you’re querying or mutating via Drizzle ORM (not when running raw SQL via db.execute).

## Architecture Essentials

### Service Ecosystem
- **Frontend**: SvelteKit 2 + Svelte 5 runes on ports 5173-5179
- **Go Services**: Ports 8080-8136 (37 microservices with health checks)
- **Context7 MCP**: Port 8777 (AI documentation server, official endpoint: `http://localhost:8777`)
- **Databases**:execute() to run raw SQL strings that create tables manually.
  - PostgreSQL:5434 (pgvector/pgvector:pg17) - `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`ags them as unused.
  - PostgreSQL Test:5434 (isolated test instance)
  - Redis:6379 (redis-stack with RediSearch, RedisJSON) - `redis://:redis@localhost:6379/0`
  - Redis Test:6380 (isolated test cache)
  - Neo4j:7474 (HTTP), :7687 (Bolt) - `bolt://localhost:7687` auth: `neo4j/legal123456`
  - Qdrant:6333 (HTTP), :6334 (gRPC) - `http://localhost:6333`
- **AI**:eeded unless you do something like:
  - Ollama:11434 (host) or :11435 (docker) - `http://localhost:11434`
  - FastAPI Embed:8000 - `http://localhost:8000`
  - GPU: NVIDIA RTX 3060 Ti (CUDA enabled)
  - Models: gemma3, embeddinggemma:latest, nomic-embed-text
  - WebAssembly inference (browser-side)
- **Infrastructure**:m(sessions);
  - RabbitMQ:5672 (AMQP), :15672 (Management UI) - `amqp://legal_admin:123456@localhost:5672`
  - MinIO:9000 (API), :9001 (Console) - `http://localhost:9000`
  - Caddy:443 (HTTPS/QUIC), :80 (HTTP)
  - QUIC Server:4433/udp, :4434/udp, :8095 (HTTP fallback)

## Docker Service Endpoints (Use These Envs Everywhere)

Always code endpoints to respect Docker service names first, with localhost fallbacks for dev without Compose. Prefer process.env and central helpers over literals.

- PostgreSQL
  - `DATABASE_URL=postgresql://legal_admin:123456@postgres:5432/legal_ai_db`
  - Admin URL if needed: `ADMIN_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres`
- Redis
  - `REDIS_URL=redis://:redis@redis:6379/0`
  - Or split: `REDIS_HOST=redis`, `REDIS_PORT=6379`, `REDIS_PASSWORD=redis`
- Qdrant
  - `QDRANT_URL=http://qdrant:6333`
- Ollama
  - `OLLAMA_URL=http://ollama:11434`
- MinIO
  - `MINIO_ENDPOINT=minio:9000`, `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin`
- Neo4j
  - `NEO4J_URI=bolt://neo4j:7687`, `NEO4J_USER=neo4j`, `NEO4J_PASSWORD=password`

Guidelines
- Centralize service endpoints in small utility functions (e.g., `getOllamaEndpoint()` or db client factory) and import them across routes/services.
- Never hardcode `http://localhost` in server code; use envs and fallbacks like `process.env.OLLAMA_URL || 'http://localhost:11434'` only at the edge.
- When inserting records via Drizzle, prefer schema defaults (e.g., `defaultRandom()` on UUIDs). If you hit legacy schemas (e.g., `documents.uuid NOT NULL`), handle with a raw SQL fallback that sets `uuid = gen_random_uuid()`.
- For WebSocket URLs, derive from `request.url` or `location` with protocol switch `ws/wss`.

Code patterns
- Database client: use `$lib/server/db/client` which picks up `DATABASE_URL` and supports production pooling.
- Redis cache: use `$lib/server/cache/redis` or `$lib/server/optimize/query-cache` which respect `REDIS_*` envs.
- Vector search: use the unified `enhancedVectorSearchService` which reads `PGVECTOR_URL`/`QDRANT_URL`.

### Route Discovery Patternits adapter)
```typescript
// src/routes/all-routes/+page.server.ts - Service discovery
export interface RoutePageData {
  systemHealth: SystemHealthData;ibutes matches your schema)
  availableRoutes: RouteDefinition[];
  routeInventory: {ports inside:
    counts: { config: number; fileBased: number };
    fileRoutesSample: Array<{ route: string; title: string }>;
  };lib/server/db/schema-postgres.ts
}rc/hooks.server.ts
```
…but not inside one-off setup or admin endpoints like /api/setup-db/+server.ts.
### Critical File Patterns
🧠 Recommended Fix
#### XState Integration (Core Pattern)
```typescripthe unused imports — they’re not required for the setup route.
// src/lib/services/xstate-integration.ts - Central coordinator
import xstateIntegration from '$lib/services/xstate-integration'
const state = xstateIntegration.getGlobalState()
xstateIntegration.sendEvent(machineId, event)
```ort type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
#### Go Microservice Communication
```typescript SvelteKit 2: Correct pattern
// Always use productionServiceClient for Go services
import { productionServiceClient } from '$lib/api/production-service-client'
const result = await productionServiceClient.makeRequest(endpoint, data)
```src/lib/server/auth/lucia.ts
import { Lucia } from 'lucia';
#### Database Operations } from '$lib/server/db/schema-postgres';
```typescript from '$lib/server/db/client';
// src/lib/server/db/drizzle-vector-config.ts patternsadapter-drizzle';
const results = await VectorSearchService.searchDocuments(embedding, threshold)
// Always handle vector operations with proper type casting
``` DrizzlePostgreSQLAdapter(db, sessions, users),
{
## Development Workflowssession', attributes: { secure: true } },
getUserAttributes: (user) => ({
### Essential Commands
```bashser.name,
# Development with GPU detection
npm run dev:gpu
}
# TypeScript validation (current: 247 errors)
npx tsc --noEmit --skipLibCheck
Then in your hooks:
# Health check all services
curl http://localhost:5173/api/health/status
```ort { lucia } from '$lib/server/auth/lucia';

### Error Resolution PatternsandleHooks();
- **XState Issues**: Check xstate-integration service, ensure all 4 machines (auth, session, AI assistant, agent shell) are properly wired
- **Type Errors**: Use ReturnType<typeof postgres> for PostgreSQL, stub missing dependencies with interfaces
- **Service Communication**: All Go services have standardized health checks on /health endpoint

## Key Conventionsp

### State Management
- Use XState v5 syntax: `createMachine()`, `fromPromise()`, `assign()`
- Central integration via `xstate-integration.ts` serviceson (as we discussed before).
- Event-driven architecture: machines communicate through events, not direct calls
Move this /api/setup-db script under scripts/ instead of routes if it’s just a one-time migration.
### API Patterns
```typescriptLocals": true in tsconfig.json to automatically catch unused imports next time.
// Standard SvelteKit +server.ts pattern
export async function GET({ url, params }) {r this setup script to use Drizzle’s schema builders instead of raw SQL — so it stays schema-synced with Lucia v3 and can be reused for future migrations?
  const service = url.searchParams.get('service')
  return json(await serviceRegistry[service].health())
}
```
## Architecture Essentials
### Docker Integration
- Use `docker-compose.yml` for infrastructure (postgres, redis, rabbitmq, minio, qdrant)
- Services auto-discover via standardized health checks173-5179
- Environment variables from `.env.development`vices with health checks)
- **Context7 MCP**: Port 8777 (AI documentation server, official endpoint: `http://localhost:8777`)
## Microservice Integration Patterns
  - PostgreSQL:5434 (pgvector/pgvector:pg17) - `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`
### RabbitMQ + XState Coordination test instance)
```typescript9 (redis-stack with RediSearch, RedisJSON) - `redis://:redis@localhost:6379/0`
// src/lib/messaging/rabbitmq-xstate-integration.ts
export class RabbitMQXStateIntegration {olt://localhost:7687` auth: `neo4j/legal123456`
  static async processLegalAIMessage(message: LegalAIMessage): Promise<any> {
    switch (message.type) {
      case 'document_ingestion': return await this.processDocumentIngestion(message.payload);
      case 'vector_search': return await this.processVectorSearch(message.payload);
      case 'wasm_inference': return await this.processWASMInference(message.payload);
    }odels: gemma3, embeddinggemma:latest, nomic-embed-text
  } WebAssembly inference (browser-side)
} **Infrastructure**:
``` RabbitMQ:5672 (AMQP), :15672 (Management UI) - `amqp://legal_admin:123456@localhost:5672`
  - MinIO:9000 (API), :9001 (Console) - `http://localhost:9000`
### Legal AI Workflow OrchestrationTP)
```typescripter:4433/udp, :4434/udp, :8095 (HTTP fallback)
// Multi-service legal document processing pipeline
class LegalDocumentProcessor {
  async processDocument(file: File): Promise<ProcessingResult> {
    // 1. Upload to MinIO storagerver.ts - Service discovery
    const storedFile = await minioStorage.upload(file);
  systemHealth: SystemHealthData;
    // 2. XState triggers OCR workflow
    const ocrState = documentProcessingMachine.send('START_OCR');
    counts: { config: number; fileBased: number };
    // 3. RabbitMQ distributes processing taskstle: string }>;
    await rabbitmq.publish('legal.documents.queue', { fileId: storedFile.id });
}
    // 4. Vector embedding with Ollama
    const embeddings = await ollama.embed(extractedText);
### Critical File Patterns
    // 5. Store in pgvector + cache in Redis
    await Promise.all([ (Core Pattern)
      pgvector.store(embeddings),
      redis.cache(`doc:${fileId}`, results, 3600)al coordinator
    ]);xstateIntegration from '$lib/services/xstate-integration'
  }st state = xstateIntegration.getGlobalState()
}stateIntegration.sendEvent(machineId, event)
```

### Service Health Monitoringation
```typescript
// src/routes/api/go/+server.ts - 37 microservice registry
const goServices = {erviceClient } from '$lib/api/production-service-client'
  'legal-gateway': { baseUrl: 'http://localhost:8080', healthPath: '/health' },
  'enhanced-rag': { baseUrl: 'http://localhost:8094', protocols: ['http', 'grpc'] },
  'gpu-orchestrator': { baseUrl: 'http://localhost:8095', capabilities: ['cuda', 'tensor'] },
  // ... 34 more services
};`typescript
```src/lib/server/db/drizzle-vector-config.ts patterns
const results = await VectorSearchService.searchDocuments(embedding, threshold)
## Legal AI Domain Workflowsations with proper type casting
```
### Evidence Canvas Integration
```typescriptt Workflows
// Fabric.js + WebSocket + PostgreSQL persistence
class EvidenceCanvasManager {
  async syncCanvasState(canvasData: FabricCanvasData): Promise<void> {
    // Real-time collaboration via WebSocket
    websocket.broadcast('canvas:update', canvasData);

    // PostgreSQL persistence with Redis caching
    await db.evidenceCanvas.upsert(canvasData);
    await redis.set(`canvas:${caseId}`, canvasData, 300);
  }ealth check all services
}url http://localhost:5173/api/health/status
```

### Self-Prompting AI Systems
```typescriptsues**: Check xstate-integration service, ensure all 4 machines (auth, session, AI assistant, agent shell) are properly wired
// Background AI analysis based on user patternss> for PostgreSQL, stub missing dependencies with interfaces
export const selfPromptingMachine = createMachine({tandardized health checks on /health endpoint
  id: 'legalAISelfPrompting',
  context: {ntions
    userHistory: [],
    pendingTasks: [],
    performanceMetrics: { successRate: 0.95, cacheHitRate: 0.8 }ign()`
  },ntral integration via `xstate-integration.ts` service
  states: {ven architecture: machines communicate through events, not direct calls
    analyzing: {
      invoke: {s
        src: fromPromise(async ({ input }) => {
          const patterns = analyzeUserPatterns(input.userHistory);
          return generateRecommendations(patterns);
        })rvice = url.searchParams.get('service')
      }n json(await serviceRegistry[service].health())
    }
  }
});
``` Docker Integration
- Use `docker-compose.yml` for infrastructure (postgres, redis, rabbitmq, minio, qdrant)
## Performance Considerationsstandardized health checks
- Environment variables from `.env.development`
### WebAssembly Inference Pipeline
```typescriptce Integration Patterns
// src/lib/webasm/llama-cpp-engine.ts - Browser-side LLM inference
export class WebASMLlamaCppEngine {
  async runInference(prompt: string): Promise<InferenceResult> {
    // Load WASM module with threading supporton.ts
    const wasmModule = await WebAssembly.instantiateStreaming(
      fetch('/wasm/llama-cpp.wasm'),(message: LegalAIMessage): Promise<any> {
      { env: { memory: new WebAssembly.Memory({ initial: 256, maximum: 1024, shared: true }) } }
    );case 'document_ingestion': return await this.processDocumentIngestion(message.payload);
      case 'vector_search': return await this.processVectorSearch(message.payload);
    // GPU-accelerated vector operationst this.processWASMInference(message.payload);
    const embeddings = await this.computeEmbeddings(prompt);
  }
    // Multi-threaded inference with Web Workers
    const result = await this.workerPool.execute({
      type: 'INFERENCE',
      prompt,Workflow Orchestration
      embeddings,
      config: { contextSize: 2048, threads: navigator.hardwareConcurrency }
    });egalDocumentProcessor {
  async processDocument(file: File): Promise<ProcessingResult> {
    return result;o MinIO storage
  } const storedFile = await minioStorage.upload(file);
}
``` // 2. XState triggers OCR workflow
    const ocrState = documentProcessingMachine.send('START_OCR');
### QUIC Protocol Implementation
```typescriptbitMQ distributes processing tasks
// src/lib/cache/proto-serializer.ts - Ultra-low latency communicationle.id });
export class QUICTensorStream {
  async connect(url: string) {h Ollama
    if (!('WebTransport' in window)) throw new Error('WebTransport not supported');

    // @ts-ignore - WebTransport APIin Redis
    const transport = new WebTransport(url);
    await transport.ready;dings),
      redis.cache(`doc:${fileId}`, results, 3600)
    // Bidirectional streaming for real-time tensor data
    const stream = await transport.createBidirectionalStream();
    this.stream = stream.writable;
  }

  async sendTensor(tensor: Float32Array): Promise<void> {
    const compressed = this.serializer.compressTensor(tensor);
    await this.stream.write(compressed);roservice registry
  }st goServices = {
} 'legal-gateway': { baseUrl: 'http://localhost:8080', healthPath: '/health' },
```enhanced-rag': { baseUrl: 'http://localhost:8094', protocols: ['http', 'grpc'] },
  'gpu-orchestrator': { baseUrl: 'http://localhost:8095', capabilities: ['cuda', 'tensor'] },
### GPU Acceleration Strategy
```typescript
// WebGPU compute shaders for vector operations
class WebGPUVectorProcessor {
  async computeSimilarityMatrix(embeddings: Float32Array): Promise<Float32Array> {
    const computeShader = `
      @compute @workgroup_size(64)
      fn computeSimilarity(@builtin(global_invocation_id) id: vec3<u32>) {
        // Parallel cosine similarity computation
        let idx = id.x;ager {
        similarity[idx] = dot(vectorA[idx], vectorB[idx]) /ise<void> {
                         (length(vectorA[idx]) * length(vectorB[idx]));
      }socket.broadcast('canvas:update', canvasData);
    `;
    // PostgreSQL persistence with Redis caching
    // Execute on GPU with WebGPUt(canvasData);
    const resultBuffer = await this.executeComputeShader(computeShader, embeddings);
    return new Float32Array(await resultBuffer.mapAsync(GPUMapMode.READ));
  }
}``
```
### Self-Prompting AI System
### Caching Strategy
- **Redis**: API responses, session data, vector similarity cache
- **MinIO**: Large document storage with CDN-like access patterns
- **Browser**: IndexedDB for offline WASM model caching
- **Service Worker**: Background tensor computation caching
    userHistory: [],
## Debugging Patterns
    performanceMetrics: { successRate: 0.95, cacheHitRate: 0.8 }
### Service Health Monitoring
```bashs: {
# Check all microservices
curl http://localhost:5173/api/go/health
        src: fromPromise(async ({ input }) => {
# XState status patterns = analyzeUserPatterns(input.userHistory);
curl http://localhost:5173/api/v1/xstate(patterns);
        })
# Context7 MCP server
curl http://localhost:8777/health
  }
# Qdrant vector database
curl http://localhost:6333/health

# MinIO object storagerations
curl http://localhost:9000/minio/health/live
### WebAssembly Inference Pipeline
# RabbitMQ management
curl -u legal_admin:123456 http://localhost:15672/api/overviewence
export class WebASMLlamaCppEngine {
# QUIC serverference(prompt: string): Promise<InferenceResult> {
curl http://localhost:8095/healthading support
``` const wasmModule = await WebAssembly.instantiateStreaming(
      fetch('/wasm/llama-cpp.wasm'),
### Database Connection Testingssembly.Memory({ initial: 256, maximum: 1024, shared: true }) } }
```bash
# PostgreSQL main instance
PGPASSWORD=123456 psql -h localhost -p 5434 -U legal_admin -d legal_ai_db -c "\dt"
    const embeddings = await this.computeEmbeddings(prompt);
# PostgreSQL test instance
PGPASSWORD=123456 psql -h localhost -p 5434 -U legal_admin -d legal_ai_db -c "\d cases"
    const result = await this.workerPool.execute({
# Redis main instanceE',
redis-cli -p 6379 -a redis ping
redis-cli -p 6379 -a redis INFO
      config: { contextSize: 2048, threads: navigator.hardwareConcurrency }
# Redis test instance
redis-cli -p 6380 ping
    return result;
# Neo4j browser
curl http://localhost:7474

# 🤖 Copilot Instructions: Legal AI DB Layer

This section explains how GitHub Copilot or VS Code AI can assist you when editing the database layer.

---

## 💡 Primary Goals
- Simplify repetitive Drizzle query patterns.
- Help generate schema migrations and vector queries.
- Autocomplete `db.select().from(schema.table).where(eq(...))` syntax.
- Suggest helper utilities (cachedQuery, hybridVectorSearch, storeEmbedding).

---

## 🧩 Suggested Copilot Prompts
### For queries
> "Generate a Drizzle ORM query to get all documents for a user with Redis caching."

### For schema
> "Add a new 'legal_opinions' table with vector and AI summary support, similar to documents."

### For AI integration
> "Suggest a pgvector + Qdrant hybrid search query for finding related cases."

### For migrations
> "Generate a Drizzle migration to add 'confidence' and 'tokens' columns to the embeddings table."

### For performance
> "Add an index to the cases table on (userId, status)."

---

## 🧠 Context Aware Completions
- **CONFIG** → sourced from `env.server.ts`
- **Redis** → `$lib/server/cache/redis.ts`
- **Qdrant** → `$lib/server/vector/qdrant.ts`
- **MinIO** → `$lib/server/storage/minio.ts`
- **Gemma Summarizer** → `$lib/server/ai/summarization.ts`
- **Lucia Auth** → `$lib/server/auth/lucia.ts`

These modules are already aligned with the stack and recognized in SvelteKit import aliases.

---

## ✅ Best Practices
- Always define new fields in `schema.ts` **before** using them in TypeScript models.
- Prefer `eq`, `and`, `or`, and `vectorCosineDistance` from `$lib/server/db/utils`.
- For vector data: store embeddings in both Postgres + Qdrant for redundancy.
- Cache query-heavy endpoints (like `/api/search`) using `cachedQuery`.
- Run `npm run db:migrate` after schema changes to keep the database synced.
```
# Qdrant collections
curl http://localhost:6333/collections
```typescript
// src/lib/cache/proto-serializer.ts - Ultra-low latency communication
### Common IssuesTensorStream {
1. **Missing Dependencies**: Stub with interfaces, avoid crashing builds
2. **XState v5 Migration**: Use actor-based patterns, not services not supported');
3. **Vector Operations**: Cast RowList types to arrays for length operations
4. **GPU Types**: Install @webgpu/types or stub GPUBufferUsage constants
5. **WASM Loading**: Ensure proper CORS headers for .wasm files
6. **QUIC Protocol**: Requires HTTPS in production environments
7. **Port Conflicts**:
   - PostgreSQL: Use port 5434 (not 5432) to avoid conflicts with other instances
   - Ollama: Docker uses 11435, host uses 11434
   - Redis: Main on 6379, test on 6380
   - SvelteKit: Multiple instances on 5173-5179 for parallel development
8. **Docker Network Issues**:
   - Services communicate via container names in `legal-ai-network`
   - Use `host.docker.internal` to access host services from containers
   - Example: Ollama on host is `http://host.docker.internal:11434` from container
9. **Database Connection Errors**:
   - Check if PostgreSQL is on 5432 or 5434 (docker-compose uses 5434)
   - Redis doesn't have a password but if it requires one use `redis`
   - Neo4j auth is `neo4j/legal123456`
10. **Vector Search Performance**:
    - Use pgvector for primary searches (fastest for < 1M vectors)
    - Use Qdrant for advanced similarity (HNSW index, > 1M vectors)
    - Always cache results in Redis with 5-15 minute TTL
  async computeSimilarityMatrix(embeddings: Float32Array): Promise<Float32Array> {

### External Servicesarity(@builtin(global_invocation_id) id: vec3<u32>) {
- **Ollama**: Local LLM inferencerity computation
  - URL: `http://localhost:11434` (host) or `http://localhost:11435` (docker)
  - Models: gemma3, embeddinggemma:latest, nomic-embed-text
  - Model storage: `/root/.ollama/models` (docker) or `~/.ollama/models` (host)
  - GPU: NVIDIA RTX 3060 Ti with CUDA support
- **Context7**: MCP server for document retrieval and AI orchestration
  - URL: `http://localhost:8777`
  - Health: `http://localhost:8777/health`
  - Port: 8777 (standard), 3002-3003 (alternative)Shader(computeShader, embeddings);
- **MinIO**: Object storage for legal documentsmapAsync(GPUMapMode.READ));
  - API: `http://localhost:9000`
  - Console: `http://localhost:9001`
  - Credentials: `minio/minio123` or `minioadmin/minioadmin123`
  - Bucket: `legal-documents`
  - Use: PDF storage, evidence files, case documents
- **RabbitMQ**: Message queues for async legal document processing
  - AMQP: `amqp://legal_admin:123456@localhost:5672`cess patterns
  - Management UI: `http://localhost:15672`odel caching
  - Queues: `legal.documents.queue`, `legal.embeddings.queue`
  - Use: OCR processing, vector embedding, batch operations
- **Qdrant**: Advanced vector database for semantic search
  - HTTP: `http://localhost:6333`
  - gRPC: `localhost:6334`ing
  - Collections: `legal_docs`, `case_embeddings`
  - Use: Large-scale similarity search (> 1M vectors)
- **Neo4j**: Graph database for case relationships
  - Browser: `http://localhost:7474`
  - Bolt: `bolt://localhost:7687`
  - Auth: `neo4j/legal123456`i/v1/xstate
  - Plugins: APOC, Graph Data Science
  - Use: Case citations, legal precedent graphs, entity relationships
curl http://localhost:8777/health
### Cross-Service Communication
- **gRPC**: High-performance Go-to-Go communication with protobuf schemas
- **HTTP/JSON**: Frontend-backend integration with type-safe APIs
- **WebSocket**: Real-time updates for evidence canvas collaboration
- **QUIC**: Ultra-low latency transport for tensor streaming
- **WebAssembly**: Browser-side computation without server round-trips

## Legal Domain Knowledge
curl -u legal_admin:123456 http://localhost:15672/api/overview
### Evidence Canvas
- Fabric.js-based collaborative evidence mapping
- Real-time synchronization via WebSocket
- PostgreSQL persistence with Redis caching

### Document Processing Testing
- OCR pipeline with XState workflow orchestration
- Vector embeddings using Ollama's nomic-embed-text
- Semantic search with pgvector cosine similaritygal_admin -d legal_ai_db -c "\dt"

### AI Assistant Integration
- Context7 MCP server provides legal document contextadmin -d legal_ai_db -c "\d cases"
- Multi-model inference: Gemma3 for chat, specialized models for analysis
- Self-prompting capabilities for background processing
redis-cli -p 6379 -a redis ping
## Code Quality Patternsis INFO

### TypeScript Best Practices
- Prefer `type` over `interface` for unions
- Use `ReturnType<typeof>` for complex return types
- Stub missing external types rather than ignore errors
curl http://localhost:7474
### Svelte 5 Runes - Complete Migration Guide
# Qdrant collections
**CRITICAL**: This project uses Svelte 5 with runes. All components MUST follow these patterns.


```
#### Core Principles
1. **Runes are auto-imported** - Never manually import `$state`, `$derived`, `$effect`, `$props`, or `$bindable`
2. **No `export let`** - Use `$props()` insteades, avoid crashing builds
3. **No `$:` reactive statements** - Use `$derived()` or `$effect()` instead
4. **No** `\<slot\>` **- Use** `` `{#snippet}` `` **instead to avoid tag parsing issues and to keep the documentation plain-text friendly**
#### State Management Patternsoper CORS headers for .wasm files
6. **QUIC Protocol**: Requires HTTPS in production environments
```svelte Conflicts**:
<script lang="ts">se port 5434 (not 5432) to avoid conflicts with other instances
  // ❌ WRONG - Old Svelte 4 patterns uses 11434
  import { $state, $props } from 'svelte'; // Don't import runes!
  export let count = 0; // Don't use export let for parallel development
  $: doubled = count * 2; // Don't use $: reactive statements
   - Services communicate via container names in `legal-ai-network`
  // ✅ CORRECT - Svelte 5 runes (auto-imported)services from containers
  import { onMount, onDestroy } from 'svelte'; // Only lifecycle imports container
9. **Database Connection Errors**:
  // Props with $props() is on 5432 or 5434 (docker-compose uses 5434)
  let {dis doesn't have a password but if it requires one use `redis`
    count = $bindable(0),/legal123456`
    title = "Default Title",nce**:
    onUpdatevector for primary searches (fastest for < 1M vectors)
  }: {Use Qdrant for advanced similarity (HNSW index, > 1M vectors)
    count?: number;results in Redis with 5-15 minute TTL
    title?: string;
    onUpdate?: (value: number) => void;
  } = $props();
### External Services
  // Reactive state with $state()
  let isActive = $state(false);4` (host) or `http://localhost:11435` (docker)
  let items = $state<string[]>([]);latest, nomic-embed-text
  let user = $state({ name: '', email: '' });cker) or `~/.ollama/models` (host)
  - GPU: NVIDIA RTX 3060 Ti with CUDA support
  // Derived values with $derived()ment retrieval and AI orchestration
  let doubled = $derived(count * 2);
  let activeCount = $derived(items.filter(i => i.active).length);
  let fullName = $derived(`${user.firstName} ${user.lastName}`);
- **MinIO**: Object storage for legal documents
  // Side effects with $effect()
  $effect(() => {p://localhost:9001`
    console.log('Count changed:', count);ioadmin/minioadmin123`
    onUpdate?.(count);uments`
  });se: PDF storage, evidence files, case documents
- **RabbitMQ**: Message queues for async legal document processing
  // Cleanup effectsgal_admin:123456@localhost:5672`
  $effect(() => {: `http://localhost:15672`
    const interval = setInterval(() => tick++, 1000);s.queue`
    return () => clearInterval(interval);, batch operations
  });drant**: Advanced vector database for semantic search
</script> `http://localhost:6333`
``` gRPC: `localhost:6334`
  - Collections: `legal_docs`, `case_embeddings`
#### Component Props & Bindable
  // ❌ WRONG - Named imports for components
import { Button } from '$lib/components/ui/Button.svelte';
import { Card, CardContent } from '$lib/components/ui/card';
  }
// ✅ CORRECT - Default imports
import Button from '$lib/components/ui/Button.svelte';
import { Card, CardContent } from '$lib/components/ui/card'; // This is OK if re-exported
```ind:value={value}
  {placeholder}
#### Event Handlers
  oninput={handleInput}
```svelte
<script lang="ts">
  let count = $state(0);
#### Reactive Statements → $derived & $effect
  // ❌ WRONG - Old on: syntax in some contexts
  // (on: still works but oninput is preferred for native events)
<script lang="ts">
  // ✅ CORRECT - Use oninput, onclick, etc. for native events
  function handleClick() {
    count++;oo high!");
  }
</script>led = count * 2;
  $: console.log(count);
<button onclick={handleClick}>
  Count: {count} Use $derived for computed values
</button>bled = $derived(count * 2);
  let isHigh = $derived(count > 10);
<!-- Both work, but prefer onclick for consistency -->
<button on:click={handleClick}>Also works</button>
```effect(() => {
    console.log('Count:', count);
#### Advanced Patterns

```svelte(() => {
<script lang="ts">) {
  // Context with Svelte 5
  import { setContext, getContext } from 'svelte';
  });
  // Stores still work with Svelte 5
  import { writable, derived } from 'svelte/store';
  $effect(() => {
  const theme = writable('dark');e.subscribe(count);
  const isDark = derived(theme, $theme => $theme === 'dark');
  });
  // Use $state for component state, stores for shared state
  let localCount = $state(0);

  // Effect with store subscription
  $effect(() => {
    console.log('Theme:', $theme); // Auto-subscribes in effect
  });❌ WRONG - Old Svelte 4 slots -->
<script>
  // Complex derived state
  let stats = $derived({
    total: items.length,
    active: items.filter(i => i.active).length,
    percentage: items.length > 0
      ? (items.filter(i => i.active).length / items.length) * 100
      : 0
  });ot name="footer" />
</script>
```
<!-- ✅ CORRECT - Svelte 5 snippets -->
#### Common Migration Errors & Fixes
  import type { Snippet } from 'svelte';
| Error | Cause | Fix |
|-------|-------|-----|
| `Module 'svelte' has no exported member '$state'` | Manually importing runes | Remove import, runes are auto-imported |
| `Block-scoped variable '$state' used before declaration` | Import conflict | Remove manual import |
| `Cannot use 'state' as a store` | Using `$state` as store | Remove `$` when accessing $state variables |
| `',' expected` | Missing semicolon after object | Add `;` after const/let objects |
| `export let` not working | Old Svelte 4 syntax | Use `$props()` destructuring |
| Reactive statement not updating | Using `$:` | Replace with `$derived()` or `$effect()` |
    footer?: Snippet;
#### Real-World Example: Form Component
</script>
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
    {@render header()}
  let {
    formData = $bindable({ email: '', password: '' }),
    onSubmit,en}
    children children()}
  }: {}
    formData?: { email: string; password: string };
    onSubmit?: (data: typeof formData) => void;
    children?: Snippet;
  } = $props();
</div>
  let isValid = $derived(
    formData.email.includes('@') &&
    formData.password.length >= 8
  );
```typescript
  let errorMessage = $state('');omponents
import { Button } from '$lib/components/ui/Button.svelte';
  $effect(() => {rdContent } from '$lib/components/ui/card';
    if (!isValid && formData.email) {
      errorMessage = 'Please check your inputs';
    } else {n from '$lib/components/ui/Button.svelte';
      errorMessage = '';nt } from '$lib/components/ui/card'; // This is OK if re-exported
    }
  });
#### Event Handlers
  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (isValid) {
      onSubmit?.(formData);
    }
  }/ ❌ WRONG - Old on: syntax in some contexts
</script> still works but oninput is preferred for native events)

<form onsubmit={handleSubmit}>onclick, etc. for native events
  <inputon handleClick() {
    type="email"
    bind:value={formData.email}
    placeholder="Email"
  />
  <inputonclick={handleClick}>
    type="password"
    bind:value={formData.password}
    placeholder="Password"
  /> Both work, but prefer onclick for consistency -->
<button on:click={handleClick}>Also works</button>
  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}vanced Patterns

  {#if children}
    {@render children()}
  {/if}ntext with Svelte 5
  import { setContext, getContext } from 'svelte';
  <button type="submit" disabled={!isValid}>
    Submits still work with Svelte 5
  </button>writable, derived } from 'svelte/store';
</form>
```onst theme = writable('dark');
  const isDark = derived(theme, $theme => $theme === 'dark');
### Error Handling
- Always implement health checks for servicesor shared state
- Use structured error responses with error codes
- Log errors to Redis-based centralized logging
## Comparison: Architectural Superiority
This legal AI platform demonstrates patterns comparable to major AI systems but with specialized advantages:

### vs. ChatGPT Infrastructure
- **Model Inference**: Local Ollama + WebAssembly vs. centralized Azure GPUs → **Local control, no data leakage**
- **API Gateway**: 37+ specialized Go microservices vs. single entry point → **Domain specialization**
- **State Management**: XState v5 persistent machines vs. stateless conversation → **Persistent context, evidence canvas**
- **Real-time Processing**: QUIC + WebSocket + WebAssembly vs. HTTP → **Ultra-low latency**
- **Scaling**: Multi-core + GPU cluster vs. horizontal cloud → **Predictable performance**
      : 0
### vs. Perplexity Search
- **Search Sources**: Legal databases + case law vs. web scraping → **Domain authority**
- **RAG Pipeline**: Enhanced RAG with legal specialization vs. general knowledge → **Legal expertise**
- **Citation System**: Legal citations + evidence linking vs. web URLs → **Legal standards compliance**
- **Context Synthesis**: Multi-source legal analysis vs. web summarization → **Legal reasoning**

### vs. Claude Context Handling
- **Context Window**: Unlimited with XState persistence vs. 200K tokens → **Unlimited context**
- **Memory Management**: PostgreSQL + Redis + XState vs. session-based → **Permanent memory**t, runes are auto-imported |
- **Multi-turn Reasoning**: Evidence canvas + workflow orchestration vs. conversation chains → **Visual reasoning**
- **Document Processing**: OCR + WebAssembly + GPU vs. text analysis → **Advanced multi-modal processing**
| `',' expected` | Missing semicolon after object | Add `;` after const/let objects |
### Key Architectural Advantages Svelte 4 syntax | Use `$props()` destructuring |
```typescriptatement not updating | Using `$:` | Replace with `$derived()` or `$effect()` |
// Example: Multi-model orchestration comparable to ChatGPT
class LegalAIModelOrchestrator {mponent
  async routeToOptimalModel(query: LegalQuery): Promise<ModelResponse> {
    switch (query.complexity.type) {
      case 'document_analysis': return await this.wasmInference.processDocument(query);
      case 'legal_reasoning': return await this.ollama.gemma3(query);
      case 'case_similarity': return await this.vectorSearch.findSimilarCases(query);
      case 'evidence_mapping': return await this.evidenceCanvas.generateVisualization(query);
    }ormData = $bindable({ email: '', password: '' }),
  } onSubmit,
}   children
  }: {
// Example: Unlimited context (superior to Claude's 200K limit)
class PersistentLegalContext {ormData) => void;
  async maintainCaseContext(caseId: string): Promise<CaseContext> {
    return {();
      documents: await this.db.getDocumentHistory(caseId), // Unlimited
      analyses: await this.db.getAnalysisHistory(caseId),   // Persistent
      evidenceGraph: await this.buildEvidenceGraph(caseId), // Graph structure
      timeline: await this.buildCaseTimeline(caseId)        // Visual timeline
    };
  }
} let errorMessage = $state('');

// Example: QUIC ultra-low latency (faster than any current AI platform)
class QUICLegalDataStream {a.email) {
  async streamLegalAnalysis(query: string): Promise<AsyncGenerator<AnalysisChunk>> {
    const transport = new WebTransport('https://localhost:8447/legal-stream');
    // Sub-millisecond latency streaming with persistent context
  } }
} });