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
   - Ollama: Docker uses 11435, host uses 11434ctionalStream();
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
## Integration Pointser = `
      @compute @workgroup_size(64)
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
4. **No `<slot>`** - Use `{#snippet}` insteadto arrays for length operations
4. **GPU Types**: Install @webgpu/types or stub GPUBufferUsage constants
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
#### Component Props & Bindable search (> 1M vectors)
- **Neo4j**: Graph database for case relationships
```svelteer: `http://localhost:7474`
<script lang="ts">localhost:7687`
  // ❌ WRONG - Svelte 4 style
  export let value: string;ta Science
  export let readonly = false; precedent graphs, entity relationships

  // ✅ CORRECT - Svelte 5 with $props()
  let {C**: High-performance Go-to-Go communication with protobuf schemas
    value = $bindable(""),backend integration with type-safe APIs
    readonly = false,-time updates for evidence canvas collaboration
    placeholder = "Enter text...",sport for tensor streaming
    onchangebly**: Browser-side computation without server round-trips
  }: {
    value?: string;wledge
    readonly?: boolean;
    placeholder?: string;
    onchange?: (val: string) => void;nce mapping
  } = $props();chronization via WebSocket
- PostgreSQL persistence with Redis caching
  // Update bindable prop directly (no $ prefix needed)
  function handleInput(e: Event) {
    value = (e.target as HTMLInputElement).value;
    onchange?.(value);ing Ollama's nomic-embed-text
  }emantic search with pgvector cosine similarity
</script>
### AI Assistant Integration
<inputext7 MCP server provides legal document context
  bind:value={value}nce: Gemma3 for chat, specialized models for analysis
  {placeholder}g capabilities for background processing
  {readonly}
  oninput={handleInput}s
/>
``` TypeScript Best Practices
- Prefer `type` over `interface` for unions
#### Reactive Statements → $derived & $effect types
- Stub missing external types rather than ignore errors
```svelte
<script lang="ts"> - Complete Migration Guide
  // ❌ WRONG - Old $: reactive statements
  $: if (count > 10) {ject uses Svelte 5 with runes. All components MUST follow these patterns.
    alert("Too high!");
  }# Core Principles
  $: doubled = count * 2;ted** - Never manually import `$state`, `$derived`, `$effect`, `$props`, or `$bindable`
  $: console.log(count); Use `$props()` instead
3. **No `$:` reactive statements** - Use `$derived()` or `$effect()` instead
  // ✅ CORRECT - Use $derived for computed values
  let doubled = $derived(count * 2);
  let isHigh = $derived(count > 10);

  // ✅ CORRECT - Use $effect for side effects
  $effect(() => {>
    console.log('Count:', count);rns
  });ort { $state, $props } from 'svelte'; // Don't import runes!
  export let count = 0; // Don't use export let
  $effect(() => {unt * 2; // Don't use $: reactive statements
    if (count > 10) {
      alert("Too high!"); runes (auto-imported)
    }ort { onMount, onDestroy } from 'svelte'; // Only lifecycle imports
  });
  // Props with $props()
  // Effect with dependencies and cleanup
  $effect(() => {able(0),
    const subscription = dataStore.subscribe(count);
    return () => subscription.unsubscribe();
  });{
</script>?: number;
``` title?: string;
    onUpdate?: (value: number) => void;
#### Slots → Snippets

```sveltetive state with $state()
<!-- ❌ WRONG - Old Svelte 4 slots -->
<script>ems = $state<string[]>([]);
  export let header;{ name: '', email: '' });
  export let footer;
</script>ved values with $derived()
  let doubled = $derived(count * 2);
<div class="card">= $derived(items.filter(i => i.active).length);
  <slot name="header" />d(`${user.firstName} ${user.lastName}`);
  <slot /> <!-- default slot -->
  <slot name="footer" />effect()
</div>ect(() => {
    console.log('Count changed:', count);
<!-- ✅ CORRECT - Svelte 5 snippets -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  // Cleanup effects
  let {ct(() => {
    header,nterval = setInterval(() => tick++, 1000);
    children, => clearInterval(interval);
    footer
  }: {pt>
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;& Bindable
  } = $props();
</script>
<script lang="ts">
<div class="card">lte 4 style
  {#if header}alue: string;
    {@render header()}= false;
  {/if}
  // ✅ CORRECT - Svelte 5 with $props()
  {#if children}
    {@render children()}),
  {/if}donly = false,
    placeholder = "Enter text...",
  {#if footer}
    {@render footer()}
  {/if}ue?: string;
</div>adonly?: boolean;
``` placeholder?: string;
    onchange?: (val: string) => void;
#### Component Imports

```typescriptindable prop directly (no $ prefix needed)
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
      : 0> <!-- default slot -->
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
  // Effect with store subscription
## Platform Comparison: Architectural Superiority
    console.log('Theme:', $theme); // Auto-subscribes in effect
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
```
  function handleSubmit(e: SubmitEvent) {
This codebase represents **next-generation AI architecture** that surpasses current market leaders through local control, legal domain specialization, and cutting-edge WebAssembly/QUIC optimizations. The platform combines the best aspects of ChatGPT (model orchestration), Perplexity (search capabilities), and Claude (context handling) while adding legal-specific innovations like evidence canvas collaboration and unlimited persistent context.
    if (isValid) {
## Bits UI Best Practices);
    }
### Overview
Bits UI is a headless component library for Svelte 5 that provides accessible, unstyled primitives. This means **you are responsible for ALL styling** (spacing, colors, positioning, etc.).

### Critical Setup Requirements
  <input
#### 1. Global CSS Import
**DON'T** import `uno.css` in every component's `onMount()` - this causes overhead and FOUC.
    placeholder="Email"
```svelte
<!-- ❌ WRONG - Component-level import -->
<script>="password"
  import { onMount } from 'svelte';
  onMount(async () => {rd"
    await import('uno.css');
  });
</script>rorMessage}
    <p class="error">{errorMessage}</p>
<!-- ✅ CORRECT - Global import in root layout -->
<!-- src/routes/+layout.svelte -->
<script>hildren}
  import 'uno.css'; // Import once at root level
</script>
```
  <button type="submit" disabled={!isValid}>
#### 2. SSR Considerations
- Ensure UnoCSS/Tailwind is properly configured in `vite.config.js` for SSR
- Avoid double CSS imports that cause FOUC (Flash of Unstyled Content)
- Use `@unocss/reset` to normalize styles across browsers

```typescriptdling
// vite.config.jst health checks for services
import UnoCSS from 'unocss/vite';with error codes
- Log errors to Redis-based centralized logging
export default {
  plugins: [Comparison: Architectural Superiority
    UnoCSS({
      mode: 'svelte-scoped' // Prevents SSR issuesrable to major AI systems but with specialized advantages:
    })
  ] vs. ChatGPT Infrastructure
};**Model Inference**: Local Ollama + WebAssembly vs. centralized Azure GPUs → **Local control, no data leakage**
```*API Gateway**: 37+ specialized Go microservices vs. single entry point → **Domain specialization**
- **State Management**: XState v5 persistent machines vs. stateless conversation → **Persistent context, evidence canvas**
#### 3. API Version - Svelte 5 Migrationcket + WebAssembly vs. HTTP → **Ultra-low latency**
Bits UI v1+ has breaking changes for Svelte 5. Key differences:**Predictable performance**

```svelteerplexity Search
<!-- Old Bits UI (pre-v1) -->atabases + case law vs. web scraping → **Domain authority**
<Dialog.Root bind:open={isOpen}> with legal specialization vs. general knowledge → **Legal expertise**
  <Dialog.Trigger>Open</Dialog.Trigger>+ evidence linking vs. web URLs → **Legal standards compliance**
  <Dialog.Content>sis**: Multi-source legal analysis vs. web summarization → **Legal reasoning**
    <slot />
  </Dialog.Content>ext Handling
</Dialog.Root>ndow**: Unlimited with XState persistence vs. 200K tokens → **Unlimited context**
- **Memory Management**: PostgreSQL + Redis + XState vs. session-based → **Permanent memory**
<!-- New Bits UI v1 (Svelte 5) -->ce canvas + workflow orchestration vs. conversation chains → **Visual reasoning**
<Dialog.Root bind:open={isOpen}> WebAssembly + GPU vs. text analysis → **Advanced multi-modal processing**
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>ral Advantages
    {#if children}
      {@render children()}chestration comparable to ChatGPT
    {/if}alAIModelOrchestrator {
  </Dialog.Content>malModel(query: LegalQuery): Promise<ModelResponse> {
</Dialog.Root>ery.complexity.type) {
```   case 'document_analysis': return await this.wasmInference.processDocument(query);
      case 'legal_reasoning': return await this.ollama.gemma3(query);
### Transitions & Animations: return await this.vectorSearch.findSimilarCases(query);
      case 'evidence_mapping': return await this.evidenceCanvas.generateVisualization(query);
Bits UI requires the `forceMount` + child snippet pattern for custom transitions:
  }
```svelte
<script lang="ts">
  import * as Dialog from 'bits-ui';ior to Claude's 200K limit)
  import { fade, fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';ng): Promise<CaseContext> {
    return {
  let { open = $bindable(false) }: { open?: boolean } = $props();imited
</script>lyses: await this.db.getAnalysisHistory(caseId),   // Persistent
      evidenceGraph: await this.buildEvidenceGraph(caseId), // Graph structure
<Dialog.Root bind:open={open}>ldCaseTimeline(caseId)        // Visual timeline
  <Dialog.Trigger>Open Dialog</Dialog.Trigger>
  }
  <!-- Use forceMount to control transitions manually -->
  <Dialog.Portal forceMount>
    {#if open}IC ultra-low latency (faster than any current AI platform)
      <Dialog.Overlay transition:fade={{ duration: 200 }} />
      <Dialog.Content transition:fly={{ y: 10, duration: 200 }}>or<AnalysisChunk>> {
        <Dialog.Title>Title</Dialog.Title>tps://localhost:8447/legal-stream');
        <Dialog.Description>Description</Dialog.Description>text
        <!-- Content -->
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>represents **next-generation AI architecture** that surpasses current market leaders through local control, legal domain specialization, and cutting-edge WebAssembly/QUIC optimizations. The platform combines the best aspects of ChatGPT (model orchestration), Perplexity (search capabilities), and Claude (context handling) while adding legal-specific innovations like evidence canvas collaboration and unlimited persistent context.
```
## Bits UI Best Practices
### Accessibility Requirements
### Overview
Even though Bits UI handles ARIA attributes, **you must ensure**:s accessible, unstyled primitives. This means **you are responsible for ALL styling** (spacing, colors, positioning, etc.).

#### 1. Focus Statesequirements
All interactive elements need visible focus indicators:
#### 1. Global CSS Import
```cssT** import `uno.css` in every component's `onMount()` - this causes overhead and FOUC.
/* ✅ CORRECT - Visible focus for retro theme */
.nes-btn:focus-visible,
.dialog-close:focus-visible {l import -->
  outline: 2px solid #d4af37; /* Gold accent */
  outline-offset: 2px;rom 'svelte';
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
}   await import('uno.css');
  });
/* ❌ WRONG - Removing focus outline */
button:focus {
  outline: none; /* Never do this without alternative */
}!-- src/routes/+layout.svelte -->
```ript>
  import 'uno.css'; // Import once at root level
#### 2. Color Contrast
Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text):

```css. SSR Considerations
/* ✅ CORRECT - High contrast for legal platform */ `vite.config.js` for SSR
.dialog-content {S imports that cause FOUC (Flash of Unstyled Content)
  background: #212529; /* Dark background */ross browsers
  color: #d4af37; /* Gold text - meets WCAG AA */
}``typescript
// vite.config.js
.nes-btn.is-primary {nocss/vite';
  background: #0066cc;
  color: #ffffff; /* 7.5:1 contrast ratio */
} plugins: [
    UnoCSS({
/* ❌ WRONG - Low contrast */// Prevents SSR issues
.button {
  background: #555;
  color: #666; /* Fails WCAG */
}``
```
#### 3. API Version - Svelte 5 Migration
#### 3. Keyboard Navigationanges for Svelte 5. Key differences:
Test that all Bits UI components work with:
- **Tab/Shift+Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons/toggles
- **Escape**: Close dialogs/popovers
- **Arrow keys**: Navigate menus/lists>
  <Dialog.Content>
```svelte />
<!-- ✅ CORRECT - Proper keyboard handling -->
<Dialog.Root bind:open={open}>
  <Dialog.Trigger>
    <button class="nes-btn is-primary">
      Open Dialog:open={isOpen}>
    </button>gger>Open</Dialog.Trigger>
  </Dialog.Trigger>
    {#if children}
  <Dialog.Content>ldren()}
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Close aria-label="Close dialog">
      <X class="h-4 w-4" />
    </Dialog.Close>
  </Dialog.Content>
</Dialog.Root>s & Animations
```
Bits UI requires the `forceMount` + child snippet pattern for custom transitions:
### Dark/Light Mode Support
```svelte
Configure UnoCSS dark mode variants:
  import * as Dialog from 'bits-ui';
```typescriptde, fly } from 'svelte/transition';
// uno.config.tsSnippet } from 'svelte';
import { defineConfig, presetUno } from 'unocss';
  let { open = $bindable(false) }: { open?: boolean } = $props();
export default defineConfig({
  presets: [
    presetUno({nd:open={open}>
      dark: 'class' // or 'media' for system preference
    })
  ],-- Use forceMount to control transitions manually -->
  shortcuts: {al forceMount>
    'dialog-overlay': 'fixed inset-0 bg-black/80 dark:bg-black/90',
    'dialog-content': 'bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-50'
  }   <Dialog.Content transition:fly={{ y: 10, duration: 200 }}>
});     <Dialog.Title>Title</Dialog.Title>
```     <Dialog.Description>Description</Dialog.Description>
        <!-- Content -->
```svelteialog.Content>
<!-- Usage in components -->
<Dialog.Overlay class="dialog-overlay" />
<Dialog.Content class="dialog-content border border-slate-700 dark:border-slate-600">
  <!-- Content adapts to theme -->
</Dialog.Content>
``` Accessibility Requirements

### Legal AI Platform Styling Standardsutes, **you must ensure**:

Our retro NES.css + UnoCSS theme requires:
All interactive elements need visible focus indicators:
```css
/* Primary color palette */
:root {RRECT - Visible focus for retro theme */
  --nier-bg-primary: #212529;      /* Dark background */
  --nier-bg-secondary: #1a1d20;    /* Darker sections */
  --nier-accent-gold: #d4af37;     /* Primary accent */
  --nier-accent-cool: #4a90e2;     /* Links/info */
  --nier-accent-warm: #e67e22;     /* Warnings */
  --nier-border: #d4af37;          /* Gold borders */
}
/* ❌ WRONG - Removing focus outline */
/* Bits UI component styling example */
.dialog-content {/* Never do this without alternative */
  background: var(--nier-bg-primary);
  border: 4px solid var(--nier-border);
  border-radius: 0; /* Retro square corners */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  font-family: 'Press Start 2P', 'Courier New', monospace;large text):
  font-size: 12px;
  padding: 1.5rem;
}* ✅ CORRECT - High contrast for legal platform */
.dialog-content {
.dialog-overlay {2529; /* Dark background */
  background: rgba(0, 0, 0, 0.85);eets WCAG AA */
  backdrop-filter: blur(4px);
}
```s-btn.is-primary {
  background: #0066cc;
### Common Pitfalls & Solutionsrast ratio */
}
| Issue | Cause | Solution |
|-------|-------|----------|
| FOUC on page load | Multiple CSS imports | Import `uno.css` once in root `+layout.svelte` |
| Transitions not working | Missing `forceMount` | Use `forceMount` + `{#if open}` pattern |
| Low contrast text | Dark theme without proper colors | Test with WCAG contrast checker tools |
| Focus not visible | Browser default overridden | Add explicit `:focus-visible` styles |
| SSR hydration mismatch | Client-only CSS | Configure UnoCSS for SSR in `vite.config.js` |
| Dialog not closing on Escape | Missing accessibility props | Ensure Dialog.Content has proper ARIA attributes |
#### 3. Keyboard Navigation
### Testing Checklist components work with:
- **Tab/Shift+Tab**: Navigate through interactive elements
Before deploying Bits UI components:toggles
- **Escape**: Close dialogs/popovers
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Verify color contrast meets WCAG AA
- [ ] Check focus indicators are visibleg -->
- [ ] Test in dark/light mode>
- [ ] Verify no FOUC on initial load
- [ ] Test SSR/hydration in production build
- [ ] Verify transitions work smoothly
    </button>
### Resourcesigger>

- **Bits UI Docs**: https://bits-ui.com/docs/introduction
- **Svelte 5 Migration**: https://bits-ui.com/docs/migration
- **WCAG Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **UnoCSS Dark Mode**: https://unocss.dev/presets/uno#dark-mode
    </Dialog.Close>
## Comprehensive Type Definitions
</Dialog.Root>
### Three Core Type Definition Endpoints

The legal AI platform has **complete type definitions** for all API operations, organized into three comprehensive endpoints:

#### 1️⃣ Endpoint 1: Database Response Types
**Location**: `src/lib/types/database.ts`
```typescript
Solves: Components querying `db.query()` don't know response types
import { defineConfig, presetUno } from 'unocss';
**Core Types**:
```typescriptt defineConfig({
// Entity types
User, Case, CaseMetadata, Evidence, EvidenceAnalysis, EvidenceMetadata, Document, ChatMessage, AnalysisResult
      dark: 'class' // or 'media' for system preference
// Query response wrappers
QueryResult<T>           // Single item response
ListQueryResult<T>       // List with pagination
CreateQueryResult<T>     // Create responseck/80 dark:bg-black/90',
UpdateQueryResult<T>     // Update response-slate-950 text-slate-100 dark:text-slate-50'
DeleteQueryResult        // Delete response
VectorSearchQueryResult  // Vector search results
BatchQueryResult<T>      // Batch operations

// Domain-specific shortcuts
CaseQueryResult, CaseListResult
EvidenceQueryResult, EvidenceListResult/>
UserQueryResult, UserListResultontent border border-slate-700 dark:border-slate-600">
ChatMessageQueryResult, ChatMessageListResult
DocumentQueryResult, DocumentListResult
```

**Usage Pattern**:orm Styling Standards
```typescript
import type { ListQueryResult, Case } from '$lib/types';

async function loadCases() {
  const response = await fetch('/api/cases');
  const result: ListQueryResult<Case> = await response.json();
  // ✅ TypeScript knows result.data is Case[], result.pagination exists
} --nier-bg-secondary: #1a1d20;    /* Darker sections */
```-nier-accent-gold: #d4af37;     /* Primary accent */
  --nier-accent-cool: #4a90e2;     /* Links/info */
#### 2️⃣ Endpoint 2: Admin API Response Typess */
**Location**: `src/lib/types/admin.ts`Gold borders */
}
Solves: Admin endpoints return unknown response structures
/* Bits UI component styling example */
**Core Types**: {
```typescript var(--nier-bg-primary);
// Health & Statusd var(--nier-border);
AdminHealthResponse, AdminStatusResponse, SystemMetrics, ServiceHealth
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
// System Detailsress Start 2P', 'Courier New', monospace;
CPUMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics
  padding: 1.5rem;
// Service Status
DatabaseStatus, CacheStatus, MessageQueueStatus, VectorStoreStatus
.dialog-overlay {
// Configurationba(0, 0, 0, 0.85);
AdminConfiguration, DatabaseConfig, CacheConfig, GPUConfig
}
// Audit & Actions
AuditLogResponse, AuditLog
AdminActionResponse, DatabaseMaintenanceResponse, CacheClearResponse, ServiceRestartResponse
```
| Issue | Cause | Solution |
**Usage Pattern**:---------|
```typescripte load | Multiple CSS imports | Import `uno.css` once in root `+layout.svelte` |
import type { AdminStatusResponse } from '$lib/types'; `forceMount` + `{#if open}` pattern |
| Low contrast text | Dark theme without proper colors | Test with WCAG contrast checker tools |
async function checkSystem() {default overridden | Add explicit `:focus-visible` styles |
  const response = await fetch('/api/admin/status');re UnoCSS for SSR in `vite.config.js` |
  const status: AdminStatusResponse = await response.json(); | Ensure Dialog.Content has proper ARIA attributes |
  // ✅ Access: status.metrics.cpu.usage, status.services.database.status
}## Testing Checklist
```
Before deploying Bits UI components:
#### 3️⃣ Endpoint 3: Worker/Cluster State Types
**Location**: `src/lib/types/cluster.ts`
- [ ] Test with screen reader (NVDA/JAWS)
Solves: Background workers and file uploads have unknown state
- [ ] Check focus indicators are visible
**Core Types**:ark/light mode
```typescriptno FOUC on initial load
// Cluster & Workerstion in production build
ClusterStatusResponse, ClusterMetadata, Worker, WorkerMetrics, WorkerPool

// Worker Health
BackgroundWorkerStatus, WorkerHealthCheckResponse
- **Bits UI Docs**: https://bits-ui.com/docs/introduction
// Job Queue Migration**: https://bits-ui.com/docs/migration
BackgroundJob, JobQueueStats, JobStatusResponse, JobBatchResponsetchecker/
- **UnoCSS Dark Mode**: https://unocss.dev/presets/uno#dark-mode
// File Upload & Processing
FileUploadJob, FileUploadInfo, FileProcessingStage, FileUploadResponse, FileProcessingProgress

// Specific Workers Definition Endpoints
OCRWorkerStatus, OCRJob
EmbeddingWorkerStatus, EmbeddingJobe type definitions** for all API operations, organized into three comprehensive endpoints:
AutotagWorkerStatus, AutotagJob
#### 1️⃣ Endpoint 1: Database Response Types
// Events & Commandsib/types/database.ts`
ClusterEvent, ClusterEventStreamResponse
ClusterCommandResponse, ClusterRestartResponse, WorkerScaleResponse
```
**Core Types**:
**Usage Pattern**:
```typescriptes
import type { WorkerHealthCheckResponse, FileUploadResponse } from '$lib/types';, ChatMessage, AnalysisResult

// Monitor workerswrappers
async function checkWorkers() {gle item response
  const health: WorkerHealthCheckResponse = await fetch('/api/health/workers').then(r => r.json());
  health.workers.forEach(w => console.log(`${w.workerName}: ${w.status}`));
}pdateQueryResult<T>     // Update response
DeleteQueryResult        // Delete response
// Upload fileeryResult  // Vector search results
async function uploadFile(file: File) {tions
  const upload: FileUploadResponse = await fetch('/api/files/upload', {
    method: 'POST',shortcuts
    body: new FormData().append('file', file)
  }).then(r => r.json());enceListResult
  // ✅ Know exact structure of upload.file, upload.uploadJob, upload.processingJobs
}hatMessageQueryResult, ChatMessageListResult
```umentQueryResult, DocumentListResult
```
### Type Definitions Documentation
**Usage Pattern**:
- **Full Guide**: `TYPE_DEFINITIONS_GUIDE.md` - Comprehensive examples for all three endpoints
- **Quick Reference**: `TYPE_DEFINITIONS_CHEATSHEET.md` - Patterns and imports quick copy
- **Central Export**: `src/lib/types/index.ts` - All types re-exported from one location
async function loadCases() {
### When to Use Each Typefetch('/api/cases');
  const result: ListQueryResult<Case> = await response.json();
| Type | Use When | Example |t.data is Case[], result.pagination exists
|------|----------|---------|
| **Database Types** | Querying database, displaying entities | Showing case details, user info, evidence |
| **Admin Types** | System monitoring, admin dashboard | CPU usage, service health, metrics display |
| **Cluster Types** | Monitoring workers, tracking uploads, jobs | Worker status, file upload progress, job queue |
**Location**: `src/lib/types/admin.ts`
### Benefits of Type System
Solves: Admin endpoints return unknown response structures
✅ **Compile-time Safety**: Errors caught before runtime
✅ **Full IDE Support**: Autocomplete, jump to definition, refactoring
✅ **Self-documenting**: Types serve as inline documentation
✅ **Consistency**: Standardized responses across all APIs
✅ **Easy Refactoring**: Change types once, update everywhereviceHealth
✅ **Type Inference**: Components automatically know result shapes
// System Details
### Quick StartoryMetrics, DiskMetrics, NetworkMetrics

```typescriptatus
// Import what you needatus, MessageQueueStatus, VectorStoreStatus
import type {
  // Databaseion
  ListQueryResult, Case, Evidence,, CacheConfig, GPUConfig
  // Admin
  AdminStatusResponse, SystemMetrics,
  // Workersonse, AuditLog
  FileUploadResponse, WorkerHealthCheckResponsee, CacheClearResponse, ServiceRestartResponse
} from '$lib/types';

// Use in component
async function loadData() {
  const cases: ListQueryResult<Case> = await fetch('/api/cases').then(r => r.json());
  const admin: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());
  const upload: FileUploadResponse = await uploadFile(file);
  // ✅ Full type safety and autocompletein/status');
} const status: AdminStatusResponse = await response.json();
```/ ✅ Access: status.metrics.cpu.usage, status.services.database.status
}
### Type Implementation Patterns

#### Pattern 1: Safe Data Accesster State Types
```typescript `src/lib/types/cluster.ts`
import type { ListQueryResult, Case } from '$lib/types';
Solves: Background workers and file uploads have unknown state
const result: ListQueryResult<Case> = await fetchCases();
**Core Types**:
// ✅ CORRECT - Always check success before accessing data
if (result.success && result.data) {
  result.data.forEach(c => {erMetadata, Worker, WorkerMetrics, WorkerPool
    console.log(c.title); // TypeScript knows this is string
    console.log(c.metadata?.jurisdiction); // Knows about optional metadata
  });roundWorkerStatus, WorkerHealthCheckResponse
}
// Job Queue
// ❌ WRONG - No type safety if you don't checke, JobBatchResponse
// result.data.forEach(...) // TypeScript error if result.success is false
```File Upload & Processing
FileUploadJob, FileUploadInfo, FileProcessingStage, FileUploadResponse, FileProcessingProgress
#### Pattern 2: Error Handling with Types
```typescriptorkers
import type { QueryResult, Case } from '$lib/types';
EmbeddingWorkerStatus, EmbeddingJob
async function getCaseById(id: string): Promise<Case | null> {
  const result: QueryResult<Case> = await fetch(`/api/cases/${id}`).then(r => r.json());
// Events & Commands
  // ✅ CORRECT - Type-safe error handling
  if (!result.success) {ClusterRestartResponse, WorkerScaleResponse
    console.error('Failed to fetch case:', result.error);
    return null;
  }sage Pattern**:
```typescript
  return result.data ?? null;ckResponse, FileUploadResponse } from '$lib/types';
}
```Monitor workers
async function checkWorkers() {
#### Pattern 3: Metadata Access for Legal Domains fetch('/api/health/workers').then(r => r.json());
```typescripters.forEach(w => console.log(`${w.workerName}: ${w.status}`));
import type { Evidence, EvidenceMetadata } from '$lib/types';

function processEvidence(evidence: Evidence) {
  // ✅ CORRECT - Type-safe metadata access
  const metadata: EvidenceMetadata | null = evidence.metadata;pload', {
    method: 'POST',
  if (metadata?.processingStatus === 'completed') {
    const text = metadata.ocrResult;
    const hash = metadata.fileHash;ad.file, upload.uploadJob, upload.processingJobs
    // All types inferred correctly
  }

  // Chain of custody accesstation
  evidence.chainOfCustody?.forEach(record => {
    console.log(`${record.handler} - ${record.action} at ${record.location}`); three endpoints
  });uick Reference**: `TYPE_DEFINITIONS_CHEATSHEET.md` - Patterns and imports quick copy
} **Central Export**: `src/lib/types/index.ts` - All types re-exported from one location
```
### When to Use Each Type
#### Pattern 4: Admin Monitoring
```typescriptWhen | Example |
import type { AdminStatusResponse, ServiceHealth } from '$lib/types';
| **Database Types** | Querying database, displaying entities | Showing case details, user info, evidence |
async function monitorServices(): Promise<void> {board | CPU usage, service health, metrics display |
  const status: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());ad progress, job queue |

  if (!status.success) {tem
    console.error('Admin check failed:', status.error);
    return;-time Safety**: Errors caught before runtime
  }*Full IDE Support**: Autocomplete, jump to definition, refactoring
✅ **Self-documenting**: Types serve as inline documentation
  // ✅ CORRECT - Type inference on nested objectsall APIs
  const dbHealth: ServiceHealth = status.services.database;e
  const cacheHealth: ServiceHealth = status.services.cache;shapes

  if (dbHealth.status === 'unhealthy') {
    console.error('Database unavailable:', dbHealth.error);
  }typescript
// Import what you need
  // Metrics access
  console.log(`CPU: ${status.metrics.cpu.usage}%`);
  console.log(`Memory: ${status.metrics.memory.percentage}%`);
} // Admin
```dminStatusResponse, SystemMetrics,
  // Workers
#### Pattern 5: Worker Health Monitoringesponse
```typescripttypes';
import type { WorkerHealthCheckResponse, BackgroundWorkerStatus } from '$lib/types';
// Use in component
async function checkAllWorkers(): Promise<boolean> {
  const health: WorkerHealthCheckResponse = await fetch('/api/health/workers').then(r => r.json());
  const admin: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());
  if (!health.success) {adResponse = await uploadFile(file);
    return false;safety and autocomplete
  }
```
  // ✅ CORRECT - Type-safe worker iteration
  const allHealthy = health.workers.every((worker: BackgroundWorkerStatus) => {
    return worker.status === 'online' && worker.healthy;
  });Pattern 1: Safe Data Access
```typescript
  // Get summaries with type safety } from '$lib/types';
  console.log(`Online: ${health.summary?.online}`);
  console.log(`Offline: ${health.summary?.offline}`);s();

  return allHealthy;s check success before accessing data
}f (result.success && result.data) {
```esult.data.forEach(c => {
    console.log(c.title); // TypeScript knows this is string
#### Pattern 6: File Upload with Progress Trackings about optional metadata
```typescript
import type { FileUploadResponse, FileProcessingProgress } from '$lib/types';

async function uploadAndTrack(file: File): Promise<void> {
  // Initial uploadach(...) // TypeScript error if result.success is false
  const formData = new FormData();
  formData.append('file', file);
#### Pattern 2: Error Handling with Types
  const upload: FileUploadResponse = await fetch('/api/files/upload', {
    method: 'POST',Result, Case } from '$lib/types';
    body: formData
  }).then(r => r.json());d(id: string): Promise<Case | null> {
  const result: QueryResult<Case> = await fetch(`/api/cases/${id}`).then(r => r.json());
  if (!upload.success) {
    console.error('Upload failed:', upload.error);
    return;lt.success) {
  } console.error('Failed to fetch case:', result.error);
    return null;
  const fileId = upload.file.fileId;
  console.log(`Uploaded: ${upload.file.fileName} (${upload.file.fileSize}MB)`);
  return result.data ?? null;
  // Monitor processing with real-time updates
  const eventSource = new EventSource(`/api/files/${fileId}/progress`);

  eventSource.onmessage = (event) => {gal Domains
    const progress: FileProcessingProgress = JSON.parse(event.data);
import type { Evidence, EvidenceMetadata } from '$lib/types';
    console.log(`Progress: ${progress.overallProgress}%`);
    console.log(`Current Stage: ${progress.currentStage}`);
  // ✅ CORRECT - Type-safe metadata access
    progress.stages.forEach(stage => {ull = evidence.metadata;
      console.log(`  ${stage.stageName}: ${stage.progress}% (${stage.status})`);
    });etadata?.processingStatus === 'completed') {
    const text = metadata.ocrResult;
    if (progress.overallProgress === 100) {
      eventSource.close();correctly
    }
  };
} // Chain of custody access
```vidence.chainOfCustody?.forEach(record => {
    console.log(`${record.handler} - ${record.action} at ${record.location}`);
#### Pattern 7: Batch Operations
```typescript
import type { BatchQueryResult, Case } from '$lib/types';

async function deleteCasesBatch(ids: string[]): Promise<void> {
  const result: BatchQueryResult<Case> = await fetch('/api/cases/batch/delete', {
    method: 'POST',StatusResponse, ServiceHealth } from '$lib/types';
    body: JSON.stringify({ ids })
  }).then(r => r.json());vices(): Promise<void> {
  const status: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());
  if (!result.success) {
    console.error('Batch operation failed:', result.error);
    return;.error('Admin check failed:', status.error);
  } return;
  }
  // ✅ CORRECT - Type-safe batch result iteration
  result.results.forEach(item => { nested objects
    if (item.success) {ceHealth = status.services.database;
      console.log(`✅ Deleted case ${item.id}`);vices.cache;
    } else {
      console.error(`❌ Failed to delete ${item.id}: ${item.error}`);
    }onsole.error('Database unavailable:', dbHealth.error);
  });

  console.log(`Summary: ${result.successCount}/${result.results.length} successful`);
} console.log(`CPU: ${status.metrics.cpu.usage}%`);
```onsole.log(`Memory: ${status.metrics.memory.percentage}%`);
}
#### Pattern 8: Vector Search
```typescript
import type { VectorSearchQueryResult } from '$lib/types';
```typescript
async function searchDocuments(query: string, embedding: number[]): Promise<void> {;
  const results: VectorSearchQueryResult = await fetch('/api/search/semantic', {
    method: 'POST',kAllWorkers(): Promise<boolean> {
    body: JSON.stringify({ query, embedding })ait fetch('/api/health/workers').then(r => r.json());
  }).then(r => r.json());
  if (!health.success) {
  if (!results.success) {
    console.error('Search failed:', results.error);
    return;
  }/ ✅ CORRECT - Type-safe worker iteration
  const allHealthy = health.workers.every((worker: BackgroundWorkerStatus) => {
  // ✅ CORRECT - Type-safe result processingker.healthy;
  if (results.results) {
    results.results.forEach(result => {
      console.log(`${result.title}`);
      console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`Excerpt: ${result.content.substring(0, 100)}...`);

      if (result.metadata) {
        console.log(`Metadata:`, result.metadata);
      }
    });
  }# Pattern 6: File Upload with Progress Tracking
```typescript
  console.log(`Total Results: ${results.totalResults}`); } from '$lib/types';
}
```nc function uploadAndTrack(file: File): Promise<void> {
  // Initial upload
### Copilot Guidance for Type Generation
  formData.append('file', file);
When generating new API endpoints, Copilot should:
  const upload: FileUploadResponse = await fetch('/api/files/upload', {
1. **Always return typed responses** using the wrapper types:
   ```typescriptta
   // ✅ CORRECT endpoint pattern
   export const GET: RequestHandler = async () => {
     try {oad.success) {
       const data = await db.select().from(cases).limit(20);
       return json<ListQueryResult<Case>>({
         success: true,
         data: data,
         pagination: { page: 1, pageSize: 20, total: 100, pages: 5, hasMore: true },
         timestamp: new Date().toISOString()ame} (${upload.file.fileSize}MB)`);
       });
     } catch (error) {g with real-time updates
       return json<ListQueryResult<Case>>({/files/${fileId}/progress`);
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
         timestamp: new Date().toISOString() JSON.parse(event.data);
       }, { status: 500 });
     }nsole.log(`Progress: ${progress.overallProgress}%`);
   };onsole.log(`Current Stage: ${progress.currentStage}`);
   ```
    progress.stages.forEach(stage => {
2. **Include error cases** in response typing:ge.progress}% (${stage.status})`);
   ```typescript
   // ✅ CORRECT - Both success and error cases typed
   async function processCase(id: string): Promise<QueryResult<Case>> {
     try {tSource.close();
       const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
       return {
         success: !!result[0],
         data: result[0],
         timestamp: new Date().toISOString()
       };ern 7: Batch Operations
     } catch (error) {
       return {atchQueryResult, Case } from '$lib/types';
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
         timestamp: new Date().toISOString()it fetch('/api/cases/batch/delete', {
       };d: 'POST',
     }dy: JSON.stringify({ ids })
   }.then(r => r.json());
   ```
  if (!result.success) {
3. **Use domain-specific types** when available:ult.error);
   ```typescript
   // ✅ CORRECT - Use CaseQueryResult instead of QueryResult<Case>
   async function fetchCase(id: string): Promise<CaseQueryResult> {
     // Implementationsafe batch result iteration
   }sult.results.forEach(item => {
    if (item.success) {
   // Less clear, but equivalent: ${item.id}`);
   async function fetchCase(id: string): Promise<QueryResult<Case>> {
     // Implementation Failed to delete ${item.id}: ${item.error}`);
   }}
   ```

4. **Provide metadata context** for complex entities:lt.results.length} successful`);
   ```typescript
   // ✅ CORRECT - Include all available metadata
   const evidence: Evidence = {
     id: evidenceId,or Search
     caseId: caseId,
     title: 'Contract',rchQueryResult } from '$lib/types';
     evidenceType: 'document',
     aiAnalysis: {rchDocuments(query: string, embedding: number[]): Promise<void> {
       documentType: 'contract',ryResult = await fetch('/api/search/semantic', {
       extractedEntities: ['John Doe', 'Jane Smith'],
       keyTerms: ['termination', 'breach', 'liability'],
       sentiment: -0.3,);
       confidence: 0.95
     },results.success) {
     metadata: {r('Search failed:', results.error);
       fileHash: 'sha256:abc123...',
       fileSize: 2048,
       processingStatus: 'completed',
       ocrResult: 'extracted text...'cessing
     },esults.results) {
     // ... other fieldsach(result => {
   }; console.log(`${result.title}`);
   ```console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`Excerpt: ${result.content.substring(0, 100)}...`);
### Common Type Patterns for Svelte Components
      if (result.metadata) {
```svelteonsole.log(`Metadata:`, result.metadata);
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ListQueryResult, Case } from '$lib/types';

  let cases: ListQueryResult<Case> | null = null; ${results.totalResults}`);

  onMount(async () => {```
    // Call API endpoint from component
    const response = await fetch('/api/cases?page=1');
    cases = await response.json();
  });
</script>
es** using the wrapper types:
{#if cases?.success && cases.data}
  {#each cases.data as c}   // ✅ CORRECT endpoint pattern
    <div>{c.title}</div>andler = async () => {
  {/each}
{/if} = await db.select().from(cases).limit(20);
```       return json<ListQueryResult<Case>>({
success: true,
### File Upload with Database Pattern
ize: 20, total: 100, pages: 5, hasMore: true },
```typescript         timestamp: new Date().toISOString()
// src/routes/api/files/upload/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  try {return json<ListQueryResult<Case>>({
    const formData = await request.formData();alse,
    const file = formData.get('file') as File;rror',
    const caseId = formData.get('caseId') as string;amp: new Date().toISOString()
});
    // Upload to MinIO}
    const buffer = await file.arrayBuffer();};
    const objectName = `${caseId}/${crypto.randomUUID()}/${file.name}`;   ```
    await minioClient.putObject('legal-evidence', objectName, Buffer.from(buffer));

    // Save to database
    const result = await db.insert(evidence).values({ORRECT - Both success and error cases typed
      caseId,   async function processCase(id: string): Promise<QueryResult<Case>> {
      title: file.name,
      evidenceType: 'document' = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    }).returning();

    // Queue embedding job
    await publishToQueue('legal_ai.embedding.document', {   timestamp: new Date().toISOString()
      evidenceId: result[0].id,
      content: file.name
    });rn {
  success: false,
    return json({         error: error instanceof Error ? error.message : 'Unknown error',
      success: true,Date().toISOString()
      evidenceId: result[0].id
    } as FileUploadResponse);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'**Use domain-specific types** when available:
    } as FileUploadResponse, { status: 500 });   ```typescript
  }ueryResult instead of QueryResult<Case>
};   async function fetchCase(id: string): Promise<CaseQueryResult> {
```
   }
### Migration Checklist

- [ ] All `+page.server.ts` files have NO database importsResult<Case>> {
- [ ] All `+layout.server.ts` files have NO database imports
- [ ] All database access is in `+server.ts` endpoint handlers
- [ ] All endpoints return typed responses
- [ ] All endpoints include error handling with try-catch
- [ ] All endpoints return appropriate HTTP status codes (200, 201, 400, 500)s:
- [ ] All responses include timestamp
- [ ] Input validation happens on server side
   const evidence: Evidence = {
### Key Rules
     caseId: caseId,
1. **Location Rule**: Database access ONLY in `src/routes/api/**/*.ts` (+server.ts files)
2. **Type Rule**: All responses must use type definitions from `$lib/types`
3. **Error Rule**: All database operations in try-catch blocks
4. **Response Rule**: Always return JSON with `{ success, data/error, timestamp }`
5. **Isolation Rule**: No database imports in module scope or shared utilitiesties: ['John Doe', 'Jane Smith'],
'],
<!-- APPEND: When Drizzle schema imports are required -->
You only need Drizzle's table objects (e.g. `users`, `sessions`) when you’re actually querying or mutating via Drizzle ORM — not when running raw SQL via `db.execute()`.
     },
Why
- If you run raw SQL with `db.execute()` to create tables or run one-off setup scripts, Drizzle table objects are never referenced and will be flagged as unused.       fileHash: 'sha256:abc123...',
- Only import the table objects when you do something like `await db.insert(users).values({...})` or `await db.select().from(sessions)`.
       processingStatus: 'completed',
When you do need `users` and `sessions`
- Lucia v3 and the Drizzle adapter require these table objects for authentication lookups, session creation/invalidation, and type inference.     },
- Expect to see these imports in:lds
  - `src/lib/server/auth/lucia.ts`   };
  - `src/lib/server/db/schema-postgres.ts`
  - `src/hooks.server.ts`
omponents
Recommended fix for setup scripts
- Remove unused imports from one-off setup/admin endpoints. For example, the clean header for a setup route should be:

```ts
import { json } from '@sveltejs/kit';    ListQueryResult, Case,
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';kerHealthCheckResponse
```

Lucia v3 + SvelteKit 2 pattern (for reference)  // ✅ CORRECT - Type component data loading
- Use Drizzle table objects when wiring the Lucia adapter: null;
dminStatusResponse | null = null;
```tsrHealth: WorkerHealthCheckResponse | null = null;
// src/lib/server/auth/lucia.ts
import { Lucia } from 'lucia';isLoading = $state(false);
import { users, sessions } from '$lib/server/db/schema-postgres';  let error = $state<string | null>(null);
import { db } from '$lib/server/db/client';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';adData() {
rue;
export const lucia = new Lucia(
  new DrizzlePostgreSQLAdapter(db, sessions, users),
  {
    sessionCookie: { name: 'session', attributes: { secure: true } },;
    getUserAttributes: (user) => ({   cases = await casesResp.json();
      email: user.email,
      name: user.name,   if (!cases.success) {
      role: user.role        error = cases.error ?? 'Failed to load cases';
    })
  }    } catch (err) {
); err instanceof Error ? err.message : 'Unknown error';
```

Optional tidy-up suggestions
- Add "useUnknownInCatchVariables": true to tsconfig.json.
- Move one-off setup scripts under a scripts/ folder if they are not regular routes.
- Consider enabling "noUnusedLocals": true in tsconfig.json to catch unused imports early.  // ✅ CORRECT - Derived computed value
ength ?? 0);
Would you like a refactor that uses Drizzle schema builders instead of raw SQL so the setup stays schema-synced with Lucia v3 and can be reused for migrations?// ❌ WRONG: Database at module level
import { db } from '$lib/server/db';
export const config = await db.select()...  // Loads on import!
```

### Why This Matters

- ✅ Prevents Vite module graph pollution
- ✅ Isolates database from SSR rendering
- ✅ Prevents build-time connection issues
- ✅ Lazy loads DB connections only when needed
- ✅ Proper error handling and HTTP status codes
- ✅ Full type safety with API response types

### Component Pattern (Frontend)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ListQueryResult, Case } from '$lib/types';

  let cases: ListQueryResult<Case> | null = null;

  onMount(async () => {
    // Call API endpoint from component
    const response = await fetch('/api/cases?page=1');
    cases = await response.json();
  });
</script>

{#if cases?.success && cases.data}
  {#each cases.data as c}
    <div>{c.title}</div>
  {/each}
{/if}
```

### File Upload with Database Pattern

```typescript
// src/routes/api/files/upload/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string;

    // Upload to MinIO
    const buffer = await file.arrayBuffer();
    const objectName = `${caseId}/${crypto.randomUUID()}/${file.name}`;
    await minioClient.putObject('legal-evidence', objectName, Buffer.from(buffer));

    // Save to database
    const result = await db.insert(evidence).values({
      caseId,
      title: file.name,
      evidenceType: 'document'
    }).returning();

    // Queue embedding job
    await publishToQueue('legal_ai.embedding.document', {
      evidenceId: result[0].id,
      content: file.name
    });

    return json({
      success: true,
      evidenceId: result[0].id
    } as FileUploadResponse);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as FileUploadResponse, { status: 500 });
  }
};
```

### Migration Checklist

- [ ] All `+page.server.ts` files have NO database imports
- [ ] All `+layout.server.ts` files have NO database imports
- [ ] All database access is in `+server.ts` endpoint handlers
- [ ] All endpoints return typed responses
- [ ] All endpoints include error handling with try-catch
- [ ] All endpoints return appropriate HTTP status codes (200, 201, 400, 500)
- [ ] All responses include timestamp
- [ ] Input validation happens on server side

### Key Rules

1. **Location Rule**: Database access ONLY in `src/routes/api/**/*.ts` (+server.ts files)
2. **Type Rule**: All responses must use type definitions from `$lib/types`
3. **Error Rule**: All database operations in try-catch blocks
4. **Response Rule**: Always return JSON with `{ success, data/error, timestamp }`
5. **Isolation Rule**: No database imports in module scope or shared utilities
