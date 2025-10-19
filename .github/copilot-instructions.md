# Legal AI Platform - AI Agent Instructions
sveltekit-complete.txt

use mcp-server tools get-library-docs: use context7, sveltekit 2, typescript, drizzle-orm, bits-ui, svelte 5, qdrant, pg vector, postgresql, redis, xstate, webgpu, cuda, uno.css

## Project Overview
This is a sophisticated legal AI platform with microservices architecture featuring SvelteKit 5 frontend, 37+ Go microservices, XState v5 state management, and WebAssembly/GPU acceleration.

## Architecture Essentials

### Service Ecosystem
- **Frontend**: SvelteKit 2 + Svelte 5 runes on ports 5173-5179
- **Go Services**: Ports 8080-8136 (37 microservices with health checks)
- **Context7 MCP**: Port 8777 (AI documentation server, official endpoint: `http://localhost:8777`)
- **Databases**:
  - PostgreSQL:5434 (pgvector/pgvector:pg17) - `postgresql://legal_admin:123456@localhost:5434/legal_ai_db`
  - PostgreSQL Test:5434 (isolated test instance)
  - Redis:6379 (redis-stack with RediSearch, RedisJSON) - `redis://:redis@localhost:6379/0`
  - Redis Test:6380 (isolated test cache)
  - Neo4j:7474 (HTTP), :7687 (Bolt) - `bolt://localhost:7687` auth: `neo4j/legal123456`
  - Qdrant:6333 (HTTP), :6334 (gRPC) - `http://localhost:6333`
- **AI**:
  - Ollama:11434 (host) or :11435 (docker) - `http://localhost:11434`
  - FastAPI Embed:8000 - `http://localhost:8000`
  - GPU: NVIDIA RTX 3060 Ti (CUDA enabled)
  - Models: gemma3, embeddinggemma:latest, nomic-embed-text
  - WebAssembly inference (browser-side)
- **Infrastructure**:
  - RabbitMQ:5672 (AMQP), :15672 (Management UI) - `amqp://legal_admin:123456@localhost:5672`
  - MinIO:9000 (API), :9001 (Console) - `http://localhost:9000`
  - Caddy:443 (HTTPS/QUIC), :80 (HTTP)
  - QUIC Server:4433/udp, :4434/udp, :8095 (HTTP fallback)

### Route Discovery Pattern
```typescript
// src/routes/all-routes/+page.server.ts - Service discovery
export interface RoutePageData {
  systemHealth: SystemHealthData;
  availableRoutes: RouteDefinition[];
  routeInventory: {
    counts: { config: number; fileBased: number };
    fileRoutesSample: Array<{ route: string; title: string }>;
  };
}
```

### Critical File Patterns

#### XState Integration (Core Pattern)
```typescript
// src/lib/services/xstate-integration.ts - Central coordinator
import xstateIntegration from '$lib/services/xstate-integration'
const state = xstateIntegration.getGlobalState()
xstateIntegration.sendEvent(machineId, event)
```

#### Go Microservice Communication
```typescript
// Always use productionServiceClient for Go services
import { productionServiceClient } from '$lib/api/production-service-client'
const result = await productionServiceClient.makeRequest(endpoint, data)
```

#### Database Operations
```typescript
// src/lib/server/db/drizzle-vector-config.ts patterns
const results = await VectorSearchService.searchDocuments(embedding, threshold)
// Always handle vector operations with proper type casting
```

## Development Workflows

### Essential Commands
```bash
# Development with GPU detection
npm run dev:gpu

# TypeScript validation (current: 247 errors)
npx tsc --noEmit --skipLibCheck

# Health check all services
curl http://localhost:5173/api/health/status
```

### Error Resolution Patterns
- **XState Issues**: Check xstate-integration service, ensure all 4 machines (auth, session, AI assistant, agent shell) are properly wired
- **Type Errors**: Use ReturnType<typeof postgres> for PostgreSQL, stub missing dependencies with interfaces
- **Service Communication**: All Go services have standardized health checks on /health endpoint

## Key Conventions

### State Management
- Use XState v5 syntax: `createMachine()`, `fromPromise()`, `assign()`
- Central integration via `xstate-integration.ts` service
- Event-driven architecture: machines communicate through events, not direct calls

### API Patterns
```typescript
// Standard SvelteKit +server.ts pattern
export async function GET({ url, params }) {
  const service = url.searchParams.get('service')
  return json(await serviceRegistry[service].health())
}
```

### Docker Integration
- Use `docker-compose.yml` for infrastructure (postgres, redis, rabbitmq, minio, qdrant)
- Services auto-discover via standardized health checks
- Environment variables from `.env.development`

## Microservice Integration Patterns

### RabbitMQ + XState Coordination
```typescript
// src/lib/messaging/rabbitmq-xstate-integration.ts
export class RabbitMQXStateIntegration {
  static async processLegalAIMessage(message: LegalAIMessage): Promise<any> {
    switch (message.type) {
      case 'document_ingestion': return await this.processDocumentIngestion(message.payload);
      case 'vector_search': return await this.processVectorSearch(message.payload);
      case 'wasm_inference': return await this.processWASMInference(message.payload);
    }
  }
}
```

### Legal AI Workflow Orchestration
```typescript
// Multi-service legal document processing pipeline
class LegalDocumentProcessor {
  async processDocument(file: File): Promise<ProcessingResult> {
    // 1. Upload to MinIO storage
    const storedFile = await minioStorage.upload(file);

    // 2. XState triggers OCR workflow
    const ocrState = documentProcessingMachine.send('START_OCR');

    // 3. RabbitMQ distributes processing tasks
    await rabbitmq.publish('legal.documents.queue', { fileId: storedFile.id });

    // 4. Vector embedding with Ollama
    const embeddings = await ollama.embed(extractedText);

    // 5. Store in pgvector + cache in Redis
    await Promise.all([
      pgvector.store(embeddings),
      redis.cache(`doc:${fileId}`, results, 3600)
    ]);
  }
}
```

### Service Health Monitoring
```typescript
// src/routes/api/go/+server.ts - 37 microservice registry
const goServices = {
  'legal-gateway': { baseUrl: 'http://localhost:8080', healthPath: '/health' },
  'enhanced-rag': { baseUrl: 'http://localhost:8094', protocols: ['http', 'grpc'] },
  'gpu-orchestrator': { baseUrl: 'http://localhost:8095', capabilities: ['cuda', 'tensor'] },
  // ... 34 more services
};
```

## Legal AI Domain Workflows

### Evidence Canvas Integration
```typescript
// Fabric.js + WebSocket + PostgreSQL persistence
class EvidenceCanvasManager {
  async syncCanvasState(canvasData: FabricCanvasData): Promise<void> {
    // Real-time collaboration via WebSocket
    websocket.broadcast('canvas:update', canvasData);

    // PostgreSQL persistence with Redis caching
    await db.evidenceCanvas.upsert(canvasData);
    await redis.set(`canvas:${caseId}`, canvasData, 300);
  }
}
```

### Self-Prompting AI System
```typescript
// Background AI analysis based on user patterns
export const selfPromptingMachine = createMachine({
  id: 'legalAISelfPrompting',
  context: {
    userHistory: [],
    pendingTasks: [],
    performanceMetrics: { successRate: 0.95, cacheHitRate: 0.8 }
  },
  states: {
    analyzing: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          const patterns = analyzeUserPatterns(input.userHistory);
          return generateRecommendations(patterns);
        })
      }
    }
  }
});
```

## Performance Considerations

### WebAssembly Inference Pipeline
```typescript
// src/lib/webasm/llama-cpp-engine.ts - Browser-side LLM inference
export class WebASMLlamaCppEngine {
  async runInference(prompt: string): Promise<InferenceResult> {
    // Load WASM module with threading support
    const wasmModule = await WebAssembly.instantiateStreaming(
      fetch('/wasm/llama-cpp.wasm'),
      { env: { memory: new WebAssembly.Memory({ initial: 256, maximum: 1024, shared: true }) } }
    );

    // GPU-accelerated vector operations
    const embeddings = await this.computeEmbeddings(prompt);

    // Multi-threaded inference with Web Workers
    const result = await this.workerPool.execute({
      type: 'INFERENCE',
      prompt,
      embeddings,
      config: { contextSize: 2048, threads: navigator.hardwareConcurrency }
    });

    return result;
  }
}
```

### QUIC Protocol Implementation
```typescript
// src/lib/cache/proto-serializer.ts - Ultra-low latency communication
export class QUICTensorStream {
  async connect(url: string) {
    if (!('WebTransport' in window)) throw new Error('WebTransport not supported');

    // @ts-ignore - WebTransport API
    const transport = new WebTransport(url);
    await transport.ready;

    // Bidirectional streaming for real-time tensor data
    const stream = await transport.createBidirectionalStream();
    this.stream = stream.writable;
  }

  async sendTensor(tensor: Float32Array): Promise<void> {
    const compressed = this.serializer.compressTensor(tensor);
    await this.stream.write(compressed);
  }
}
```

### GPU Acceleration Strategy
```typescript
// WebGPU compute shaders for vector operations
class WebGPUVectorProcessor {
  async computeSimilarityMatrix(embeddings: Float32Array): Promise<Float32Array> {
    const computeShader = `
      @compute @workgroup_size(64)
      fn computeSimilarity(@builtin(global_invocation_id) id: vec3<u32>) {
        // Parallel cosine similarity computation
        let idx = id.x;
        similarity[idx] = dot(vectorA[idx], vectorB[idx]) /
                         (length(vectorA[idx]) * length(vectorB[idx]));
      }
    `;

    // Execute on GPU with WebGPU
    const resultBuffer = await this.executeComputeShader(computeShader, embeddings);
    return new Float32Array(await resultBuffer.mapAsync(GPUMapMode.READ));
  }
}
```

### Caching Strategy
- **Redis**: API responses, session data, vector similarity cache
- **MinIO**: Large document storage with CDN-like access patterns
- **Browser**: IndexedDB for offline WASM model caching
- **Service Worker**: Background tensor computation caching

## Debugging Patterns

### Service Health Monitoring
```bash
# Check all microservices
curl http://localhost:5173/api/go/health

# XState status
curl http://localhost:5173/api/v1/xstate

# Context7 MCP server
curl http://localhost:8777/health

# Qdrant vector database
curl http://localhost:6333/health

# MinIO object storage
curl http://localhost:9000/minio/health/live

# RabbitMQ management
curl -u legal_admin:123456 http://localhost:15672/api/overview

# QUIC server
curl http://localhost:8095/health
```

### Database Connection Testing
```bash
# PostgreSQL main instance
PGPASSWORD=123456 psql -h localhost -p 5434 -U legal_admin -d legal_ai_db -c "\dt"

# PostgreSQL test instance
PGPASSWORD=123456 psql -h localhost -p 5434 -U legal_admin -d legal_ai_db -c "\d cases"

# Redis main instance
redis-cli -p 6379 -a redis ping
redis-cli -p 6379 -a redis INFO

# Redis test instance
redis-cli -p 6380 ping

# Neo4j browser
curl http://localhost:7474

# Qdrant collections
curl http://localhost:6333/collections
```

### Common Issues
1. **Missing Dependencies**: Stub with interfaces, avoid crashing builds
2. **XState v5 Migration**: Use actor-based patterns, not services
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
   - Redis password is `redis` (not empty)
   - Neo4j auth is `neo4j/legal123456`
10. **Vector Search Performance**:
    - Use pgvector for primary searches (fastest for < 1M vectors)
    - Use Qdrant for advanced similarity (HNSW index, > 1M vectors)
    - Always cache results in Redis with 5-15 minute TTL

## Integration Points

### External Services
- **Ollama**: Local LLM inference
  - URL: `http://localhost:11434` (host) or `http://localhost:11435` (docker)
  - Models: gemma3, embeddinggemma:latest, nomic-embed-text
  - Model storage: `/root/.ollama/models` (docker) or `~/.ollama/models` (host)
  - GPU: NVIDIA RTX 3060 Ti with CUDA support
- **Context7**: MCP server for document retrieval and AI orchestration
  - URL: `http://localhost:8777`
  - Health: `http://localhost:8777/health`
  - Port: 8777 (standard), 3002-3003 (alternative)
- **MinIO**: Object storage for legal documents
  - API: `http://localhost:9000`
  - Console: `http://localhost:9001`
  - Credentials: `minio/minio123` or `minioadmin/minioadmin123`
  - Bucket: `legal-documents`
  - Use: PDF storage, evidence files, case documents
- **RabbitMQ**: Message queues for async legal document processing
  - AMQP: `amqp://legal_admin:123456@localhost:5672`
  - Management UI: `http://localhost:15672`
  - Queues: `legal.documents.queue`, `legal.embeddings.queue`
  - Use: OCR processing, vector embedding, batch operations
- **Qdrant**: Advanced vector database for semantic search
  - HTTP: `http://localhost:6333`
  - gRPC: `localhost:6334`
  - Collections: `legal_docs`, `case_embeddings`
  - Use: Large-scale similarity search (> 1M vectors)
- **Neo4j**: Graph database for case relationships
  - Browser: `http://localhost:7474`
  - Bolt: `bolt://localhost:7687`
  - Auth: `neo4j/legal123456`
  - Plugins: APOC, Graph Data Science
  - Use: Case citations, legal precedent graphs, entity relationships

### Cross-Service Communication
- **gRPC**: High-performance Go-to-Go communication with protobuf schemas
- **HTTP/JSON**: Frontend-backend integration with type-safe APIs
- **WebSocket**: Real-time updates for evidence canvas collaboration
- **QUIC**: Ultra-low latency transport for tensor streaming
- **WebAssembly**: Browser-side computation without server round-trips

## Legal Domain Knowledge

### Evidence Canvas
- Fabric.js-based collaborative evidence mapping
- Real-time synchronization via WebSocket
- PostgreSQL persistence with Redis caching

### Document Processing
- OCR pipeline with XState workflow orchestration
- Vector embeddings using Ollama's nomic-embed-text
- Semantic search with pgvector cosine similarity

### AI Assistant Integration
- Context7 MCP server provides legal document context
- Multi-model inference: Gemma3 for chat, specialized models for analysis
- Self-prompting capabilities for background processing

## Code Quality Patterns

### TypeScript Best Practices
- Prefer `type` over `interface` for unions
- Use `ReturnType<typeof>` for complex return types
- Stub missing external types rather than ignore errors

### Svelte 5 Runes
```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
  let { prop = $bindable() } = $props()
</script>
```

### Error Handling
- Always implement health checks for services
- Use structured error responses with error codes
- Log errors to Redis-based centralized logging

## Platform Comparison: Architectural Superiority

This legal AI platform demonstrates patterns comparable to major AI systems but with specialized advantages:

### vs. ChatGPT Infrastructure
- **Model Inference**: Local Ollama + WebAssembly vs. centralized Azure GPUs → **Local control, no data leakage**
- **API Gateway**: 37+ specialized Go microservices vs. single entry point → **Domain specialization**
- **State Management**: XState v5 persistent machines vs. stateless conversation → **Persistent context, evidence canvas**
- **Real-time Processing**: QUIC + WebSocket + WebAssembly vs. HTTP → **Ultra-low latency**
- **Scaling**: Multi-core + GPU cluster vs. horizontal cloud → **Predictable performance**

### vs. Perplexity Search
- **Search Sources**: Legal databases + case law vs. web scraping → **Domain authority**
- **RAG Pipeline**: Enhanced RAG with legal specialization vs. general knowledge → **Legal expertise**
- **Citation System**: Legal citations + evidence linking vs. web URLs → **Legal standards compliance**
- **Context Synthesis**: Multi-source legal analysis vs. web summarization → **Legal reasoning**

### vs. Claude Context Handling
- **Context Window**: Unlimited with XState persistence vs. 200K tokens → **Unlimited context**
- **Memory Management**: PostgreSQL + Redis + XState vs. session-based → **Permanent memory**
- **Multi-turn Reasoning**: Evidence canvas + workflow orchestration vs. conversation chains → **Visual reasoning**
- **Document Processing**: OCR + WebAssembly + GPU vs. text analysis → **Advanced multi-modal processing**

### Key Architectural Advantages
```typescript
// Example: Multi-model orchestration comparable to ChatGPT
class LegalAIModelOrchestrator {
  async routeToOptimalModel(query: LegalQuery): Promise<ModelResponse> {
    switch (query.complexity.type) {
      case 'document_analysis': return await this.wasmInference.processDocument(query);
      case 'legal_reasoning': return await this.ollama.gemma3(query);
      case 'case_similarity': return await this.vectorSearch.findSimilarCases(query);
      case 'evidence_mapping': return await this.evidenceCanvas.generateVisualization(query);
    }
  }
}

// Example: Unlimited context (superior to Claude's 200K limit)
class PersistentLegalContext {
  async maintainCaseContext(caseId: string): Promise<CaseContext> {
    return {
      documents: await this.db.getDocumentHistory(caseId), // Unlimited
      analyses: await this.db.getAnalysisHistory(caseId),   // Persistent
      evidenceGraph: await this.buildEvidenceGraph(caseId), // Graph structure
      timeline: await this.buildCaseTimeline(caseId)        // Visual timeline
    };
  }
}

// Example: QUIC ultra-low latency (faster than any current AI platform)
class QUICLegalDataStream {
  async streamLegalAnalysis(query: string): Promise<AsyncGenerator<AnalysisChunk>> {
    const transport = new WebTransport('https://localhost:8447/legal-stream');
    // Sub-millisecond latency streaming with persistent context
  }
}
```

This codebase represents **next-generation AI architecture** that surpasses current market leaders through local control, legal domain specialization, and cutting-edge WebAssembly/QUIC optimizations. The platform combines the best aspects of ChatGPT (model orchestration), Perplexity (search capabilities), and Claude (context handling) while adding legal-specific innovations like evidence canvas collaboration and unlimited persistent context.