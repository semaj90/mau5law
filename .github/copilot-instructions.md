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
   - Redis doesn't have a password but if it requires one use `redis`
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

### Svelte 5 Runes - Complete Migration Guide

**CRITICAL**: This project uses Svelte 5 with runes. All components MUST follow these patterns.

#### Core Principles
1. **Runes are auto-imported** - Never manually import `$state`, `$derived`, `$effect`, `$props`, or `$bindable`
2. **No `export let`** - Use `$props()` instead
3. **No `$:` reactive statements** - Use `$derived()` or `$effect()` instead
4. **No `<slot>`** - Use `{#snippet}` instead

#### State Management Patterns

```svelte
<script lang="ts">
  // ❌ WRONG - Old Svelte 4 patterns
  import { $state, $props } from 'svelte'; // Don't import runes!
  export let count = 0; // Don't use export let
  $: doubled = count * 2; // Don't use $: reactive statements

  // ✅ CORRECT - Svelte 5 runes (auto-imported)
  import { onMount, onDestroy } from 'svelte'; // Only lifecycle imports

  // Props with $props()
  let {
    count = $bindable(0),
    title = "Default Title",
    onUpdate
  }: {
    count?: number;
    title?: string;
    onUpdate?: (value: number) => void;
  } = $props();

  // Reactive state with $state()
  let isActive = $state(false);
  let items = $state<string[]>([]);
  let user = $state({ name: '', email: '' });

  // Derived values with $derived()
  let doubled = $derived(count * 2);
  let activeCount = $derived(items.filter(i => i.active).length);
  let fullName = $derived(`${user.firstName} ${user.lastName}`);

  // Side effects with $effect()
  $effect(() => {
    console.log('Count changed:', count);
    onUpdate?.(count);
  });

  // Cleanup effects
  $effect(() => {
    const interval = setInterval(() => tick++, 1000);
    return () => clearInterval(interval);
  });
</script>
```

#### Component Props & Bindable

```svelte
<script lang="ts">
  // ❌ WRONG - Svelte 4 style
  export let value: string;
  export let readonly = false;

  // ✅ CORRECT - Svelte 5 with $props()
  let {
    value = $bindable(""),
    readonly = false,
    placeholder = "Enter text...",
    onchange
  }: {
    value?: string;
    readonly?: boolean;
    placeholder?: string;
    onchange?: (val: string) => void;
  } = $props();

  // Update bindable prop directly (no $ prefix needed)
  function handleInput(e: Event) {
    value = (e.target as HTMLInputElement).value;
    onchange?.(value);
  }
</script>

<input
  bind:value={value}
  {placeholder}
  {readonly}
  oninput={handleInput}
/>
```

#### Reactive Statements → $derived & $effect

```svelte
<script lang="ts">
  // ❌ WRONG - Old $: reactive statements
  $: if (count > 10) {
    alert("Too high!");
  }
  $: doubled = count * 2;
  $: console.log(count);

  // ✅ CORRECT - Use $derived for computed values
  let doubled = $derived(count * 2);
  let isHigh = $derived(count > 10);

  // ✅ CORRECT - Use $effect for side effects
  $effect(() => {
    console.log('Count:', count);
  });

  $effect(() => {
    if (count > 10) {
      alert("Too high!");
    }
  });

  // Effect with dependencies and cleanup
  $effect(() => {
    const subscription = dataStore.subscribe(count);
    return () => subscription.unsubscribe();
  });
</script>
```

#### Slots → Snippets

```svelte
<!-- ❌ WRONG - Old Svelte 4 slots -->
<script>
  export let header;
  export let footer;
</script>

<div class="card">
  <slot name="header" />
  <slot /> <!-- default slot -->
  <slot name="footer" />
</div>

<!-- ✅ CORRECT - Svelte 5 snippets -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    header,
    children,
    footer
  }: {
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
  } = $props();
</script>

<div class="card">
  {#if header}
    {@render header()}
  {/if}

  {#if children}
    {@render children()}
  {/if}

  {#if footer}
    {@render footer()}
  {/if}
</div>
```

#### Component Imports

```typescript
// ❌ WRONG - Named imports for components
import { Button } from '$lib/components/ui/Button.svelte';
import { Card, CardContent } from '$lib/components/ui/card';

// ✅ CORRECT - Default imports
import Button from '$lib/components/ui/Button.svelte';
import { Card, CardContent } from '$lib/components/ui/card'; // This is OK if re-exported
```

#### Event Handlers

```svelte
<script lang="ts">
  let count = $state(0);

  // ❌ WRONG - Old on: syntax in some contexts
  // (on: still works but oninput is preferred for native events)

  // ✅ CORRECT - Use oninput, onclick, etc. for native events
  function handleClick() {
    count++;
  }
</script>

<button onclick={handleClick}>
  Count: {count}
</button>

<!-- Both work, but prefer onclick for consistency -->
<button on:click={handleClick}>Also works</button>
```

#### Advanced Patterns

```svelte
<script lang="ts">
  // Context with Svelte 5
  import { setContext, getContext } from 'svelte';

  // Stores still work with Svelte 5
  import { writable, derived } from 'svelte/store';

  const theme = writable('dark');
  const isDark = derived(theme, $theme => $theme === 'dark');

  // Use $state for component state, stores for shared state
  let localCount = $state(0);

  // Effect with store subscription
  $effect(() => {
    console.log('Theme:', $theme); // Auto-subscribes in effect
  });

  // Complex derived state
  let stats = $derived({
    total: items.length,
    active: items.filter(i => i.active).length,
    percentage: items.length > 0
      ? (items.filter(i => i.active).length / items.length) * 100
      : 0
  });
</script>
```

#### Common Migration Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Module 'svelte' has no exported member '$state'` | Manually importing runes | Remove import, runes are auto-imported |
| `Block-scoped variable '$state' used before declaration` | Import conflict | Remove manual import |
| `Cannot use 'state' as a store` | Using `$state` as store | Remove `$` when accessing $state variables |
| `',' expected` | Missing semicolon after object | Add `;` after const/let objects |
| `export let` not working | Old Svelte 4 syntax | Use `$props()` destructuring |
| Reactive statement not updating | Using `$:` | Replace with `$derived()` or `$effect()` |

#### Real-World Example: Form Component

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    formData = $bindable({ email: '', password: '' }),
    onSubmit,
    children
  }: {
    formData?: { email: string; password: string };
    onSubmit?: (data: typeof formData) => void;
    children?: Snippet;
  } = $props();

  let isValid = $derived(
    formData.email.includes('@') &&
    formData.password.length >= 8
  );

  let errorMessage = $state('');

  $effect(() => {
    if (!isValid && formData.email) {
      errorMessage = 'Please check your inputs';
    } else {
      errorMessage = '';
    }
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (isValid) {
      onSubmit?.(formData);
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <input
    type="email"
    bind:value={formData.email}
    placeholder="Email"
  />
  <input
    type="password"
    bind:value={formData.password}
    placeholder="Password"
  />

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  {#if children}
    {@render children()}
  {/if}

  <button type="submit" disabled={!isValid}>
    Submit
  </button>
</form>
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

## Bits UI Best Practices

### Overview
Bits UI is a headless component library for Svelte 5 that provides accessible, unstyled primitives. This means **you are responsible for ALL styling** (spacing, colors, positioning, etc.).

### Critical Setup Requirements

#### 1. Global CSS Import
**DON'T** import `uno.css` in every component's `onMount()` - this causes overhead and FOUC.

```svelte
<!-- ❌ WRONG - Component-level import -->
<script>
  import { onMount } from 'svelte';
  onMount(async () => {
    await import('uno.css');
  });
</script>

<!-- ✅ CORRECT - Global import in root layout -->
<!-- src/routes/+layout.svelte -->
<script>
  import 'uno.css'; // Import once at root level
</script>
```

#### 2. SSR Considerations
- Ensure UnoCSS/Tailwind is properly configured in `vite.config.js` for SSR
- Avoid double CSS imports that cause FOUC (Flash of Unstyled Content)
- Use `@unocss/reset` to normalize styles across browsers

```typescript
// vite.config.js
import UnoCSS from 'unocss/vite';

export default {
  plugins: [
    UnoCSS({
      mode: 'svelte-scoped' // Prevents SSR issues
    })
  ]
};
```

#### 3. API Version - Svelte 5 Migration
Bits UI v1+ has breaking changes for Svelte 5. Key differences:

```svelte
<!-- Old Bits UI (pre-v1) -->
<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <slot />
  </Dialog.Content>
</Dialog.Root>

<!-- New Bits UI v1 (Svelte 5) -->
<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Content>
</Dialog.Root>
```

### Transitions & Animations

Bits UI requires the `forceMount` + child snippet pattern for custom transitions:

```svelte
<script lang="ts">
  import * as Dialog from 'bits-ui';
  import { fade, fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Trigger>Open Dialog</Dialog.Trigger>

  <!-- Use forceMount to control transitions manually -->
  <Dialog.Portal forceMount>
    {#if open}
      <Dialog.Overlay transition:fade={{ duration: 200 }} />
      <Dialog.Content transition:fly={{ y: 10, duration: 200 }}>
        <Dialog.Title>Title</Dialog.Title>
        <Dialog.Description>Description</Dialog.Description>
        <!-- Content -->
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
```

### Accessibility Requirements

Even though Bits UI handles ARIA attributes, **you must ensure**:

#### 1. Focus States
All interactive elements need visible focus indicators:

```css
/* ✅ CORRECT - Visible focus for retro theme */
.nes-btn:focus-visible,
.dialog-close:focus-visible {
  outline: 2px solid #d4af37; /* Gold accent */
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
}

/* ❌ WRONG - Removing focus outline */
button:focus {
  outline: none; /* Never do this without alternative */
}
```

#### 2. Color Contrast
Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text):

```css
/* ✅ CORRECT - High contrast for legal platform */
.dialog-content {
  background: #212529; /* Dark background */
  color: #d4af37; /* Gold text - meets WCAG AA */
}

.nes-btn.is-primary {
  background: #0066cc;
  color: #ffffff; /* 7.5:1 contrast ratio */
}

/* ❌ WRONG - Low contrast */
.button {
  background: #555;
  color: #666; /* Fails WCAG */
}
```

#### 3. Keyboard Navigation
Test that all Bits UI components work with:
- **Tab/Shift+Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons/toggles
- **Escape**: Close dialogs/popovers
- **Arrow keys**: Navigate menus/lists

```svelte
<!-- ✅ CORRECT - Proper keyboard handling -->
<Dialog.Root bind:open={open}>
  <Dialog.Trigger>
    <button class="nes-btn is-primary">
      Open Dialog
    </button>
  </Dialog.Trigger>

  <Dialog.Content>
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Close aria-label="Close dialog">
      <X class="h-4 w-4" />
    </Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
```

### Dark/Light Mode Support

Configure UnoCSS dark mode variants:

```typescript
// uno.config.ts
import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUno({
      dark: 'class' // or 'media' for system preference
    })
  ],
  shortcuts: {
    'dialog-overlay': 'fixed inset-0 bg-black/80 dark:bg-black/90',
    'dialog-content': 'bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-50'
  }
});
```

```svelte
<!-- Usage in components -->
<Dialog.Overlay class="dialog-overlay" />
<Dialog.Content class="dialog-content border border-slate-700 dark:border-slate-600">
  <!-- Content adapts to theme -->
</Dialog.Content>
```

### Legal AI Platform Styling Standards

Our retro NES.css + UnoCSS theme requires:

```css
/* Primary color palette */
:root {
  --nier-bg-primary: #212529;      /* Dark background */
  --nier-bg-secondary: #1a1d20;    /* Darker sections */
  --nier-accent-gold: #d4af37;     /* Primary accent */
  --nier-accent-cool: #4a90e2;     /* Links/info */
  --nier-accent-warm: #e67e22;     /* Warnings */
  --nier-border: #d4af37;          /* Gold borders */
}

/* Bits UI component styling example */
.dialog-content {
  background: var(--nier-bg-primary);
  border: 4px solid var(--nier-border);
  border-radius: 0; /* Retro square corners */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  font-family: 'Press Start 2P', 'Courier New', monospace;
  font-size: 12px;
  padding: 1.5rem;
}

.dialog-overlay {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}
```

### Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| FOUC on page load | Multiple CSS imports | Import `uno.css` once in root `+layout.svelte` |
| Transitions not working | Missing `forceMount` | Use `forceMount` + `{#if open}` pattern |
| Low contrast text | Dark theme without proper colors | Test with WCAG contrast checker tools |
| Focus not visible | Browser default overridden | Add explicit `:focus-visible` styles |
| SSR hydration mismatch | Client-only CSS | Configure UnoCSS for SSR in `vite.config.js` |
| Dialog not closing on Escape | Missing accessibility props | Ensure Dialog.Content has proper ARIA attributes |

### Testing Checklist

Before deploying Bits UI components:

- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Verify color contrast meets WCAG AA
- [ ] Check focus indicators are visible
- [ ] Test in dark/light mode
- [ ] Verify no FOUC on initial load
- [ ] Test SSR/hydration in production build
- [ ] Verify transitions work smoothly

### Resources

- **Bits UI Docs**: https://bits-ui.com/docs/introduction
- **Svelte 5 Migration**: https://bits-ui.com/docs/migration
- **WCAG Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **UnoCSS Dark Mode**: https://unocss.dev/presets/uno#dark-mode

## Comprehensive Type Definitions

### Three Core Type Definition Endpoints

The legal AI platform has **complete type definitions** for all API operations, organized into three comprehensive endpoints:

#### 1️⃣ Endpoint 1: Database Response Types
**Location**: `src/lib/types/database.ts`

Solves: Components querying `db.query()` don't know response types

**Core Types**:
```typescript
// Entity types
User, Case, CaseMetadata, Evidence, EvidenceAnalysis, EvidenceMetadata, Document, ChatMessage, AnalysisResult

// Query response wrappers
QueryResult<T>           // Single item response
ListQueryResult<T>       // List with pagination
CreateQueryResult<T>     // Create response
UpdateQueryResult<T>     // Update response
DeleteQueryResult        // Delete response
VectorSearchQueryResult  // Vector search results
BatchQueryResult<T>      // Batch operations

// Domain-specific shortcuts
CaseQueryResult, CaseListResult
EvidenceQueryResult, EvidenceListResult
UserQueryResult, UserListResult
ChatMessageQueryResult, ChatMessageListResult
DocumentQueryResult, DocumentListResult
```

**Usage Pattern**:
```typescript
import type { ListQueryResult, Case } from '$lib/types';

async function loadCases() {
  const response = await fetch('/api/cases');
  const result: ListQueryResult<Case> = await response.json();
  // ✅ TypeScript knows result.data is Case[], result.pagination exists
}
```

#### 2️⃣ Endpoint 2: Admin API Response Types
**Location**: `src/lib/types/admin.ts`

Solves: Admin endpoints return unknown response structures

**Core Types**:
```typescript
// Health & Status
AdminHealthResponse, AdminStatusResponse, SystemMetrics, ServiceHealth

// System Details
CPUMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics

// Service Status
DatabaseStatus, CacheStatus, MessageQueueStatus, VectorStoreStatus

// Configuration
AdminConfiguration, DatabaseConfig, CacheConfig, GPUConfig

// Audit & Actions
AuditLogResponse, AuditLog
AdminActionResponse, DatabaseMaintenanceResponse, CacheClearResponse, ServiceRestartResponse
```

**Usage Pattern**:
```typescript
import type { AdminStatusResponse } from '$lib/types';

async function checkSystem() {
  const response = await fetch('/api/admin/status');
  const status: AdminStatusResponse = await response.json();
  // ✅ Access: status.metrics.cpu.usage, status.services.database.status
}
```

#### 3️⃣ Endpoint 3: Worker/Cluster State Types
**Location**: `src/lib/types/cluster.ts`

Solves: Background workers and file uploads have unknown state

**Core Types**:
```typescript
// Cluster & Workers
ClusterStatusResponse, ClusterMetadata, Worker, WorkerMetrics, WorkerPool

// Worker Health
BackgroundWorkerStatus, WorkerHealthCheckResponse

// Job Queue
BackgroundJob, JobQueueStats, JobStatusResponse, JobBatchResponse

// File Upload & Processing
FileUploadJob, FileUploadInfo, FileProcessingStage, FileUploadResponse, FileProcessingProgress

// Specific Workers
OCRWorkerStatus, OCRJob
EmbeddingWorkerStatus, EmbeddingJob
AutotagWorkerStatus, AutotagJob

// Events & Commands
ClusterEvent, ClusterEventStreamResponse
ClusterCommandResponse, ClusterRestartResponse, WorkerScaleResponse
```

**Usage Pattern**:
```typescript
import type { WorkerHealthCheckResponse, FileUploadResponse } from '$lib/types';

// Monitor workers
async function checkWorkers() {
  const health: WorkerHealthCheckResponse = await fetch('/api/health/workers').then(r => r.json());
  health.workers.forEach(w => console.log(`${w.workerName}: ${w.status}`));
}

// Upload file
async function uploadFile(file: File) {
  const upload: FileUploadResponse = await fetch('/api/files/upload', {
    method: 'POST',
    body: new FormData().append('file', file)
  }).then(r => r.json());
  // ✅ Know exact structure of upload.file, upload.uploadJob, upload.processingJobs
}
```

### Type Definitions Documentation

- **Full Guide**: `TYPE_DEFINITIONS_GUIDE.md` - Comprehensive examples for all three endpoints
- **Quick Reference**: `TYPE_DEFINITIONS_CHEATSHEET.md` - Patterns and imports quick copy
- **Central Export**: `src/lib/types/index.ts` - All types re-exported from one location

### When to Use Each Type

| Type | Use When | Example |
|------|----------|---------|
| **Database Types** | Querying database, displaying entities | Showing case details, user info, evidence |
| **Admin Types** | System monitoring, admin dashboard | CPU usage, service health, metrics display |
| **Cluster Types** | Monitoring workers, tracking uploads, jobs | Worker status, file upload progress, job queue |

### Benefits of Type System

✅ **Compile-time Safety**: Errors caught before runtime
✅ **Full IDE Support**: Autocomplete, jump to definition, refactoring
✅ **Self-documenting**: Types serve as inline documentation
✅ **Consistency**: Standardized responses across all APIs
✅ **Easy Refactoring**: Change types once, update everywhere
✅ **Type Inference**: Components automatically know result shapes

### Quick Start

```typescript
// Import what you need
import type {
  // Database
  ListQueryResult, Case, Evidence,
  // Admin
  AdminStatusResponse, SystemMetrics,
  // Workers
  FileUploadResponse, WorkerHealthCheckResponse
} from '$lib/types';

// Use in component
async function loadData() {
  const cases: ListQueryResult<Case> = await fetch('/api/cases').then(r => r.json());
  const admin: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());
  const upload: FileUploadResponse = await uploadFile(file);
  // ✅ Full type safety and autocomplete
}
```

### Type Implementation Patterns

#### Pattern 1: Safe Data Access
```typescript
import type { ListQueryResult, Case } from '$lib/types';

const result: ListQueryResult<Case> = await fetchCases();

// ✅ CORRECT - Always check success before accessing data
if (result.success && result.data) {
  result.data.forEach(c => {
    console.log(c.title); // TypeScript knows this is string
    console.log(c.metadata?.jurisdiction); // Knows about optional metadata
  });
}

// ❌ WRONG - No type safety if you don't check
// result.data.forEach(...) // TypeScript error if result.success is false
```

#### Pattern 2: Error Handling with Types
```typescript
import type { QueryResult, Case } from '$lib/types';

async function getCaseById(id: string): Promise<Case | null> {
  const result: QueryResult<Case> = await fetch(`/api/cases/${id}`).then(r => r.json());

  // ✅ CORRECT - Type-safe error handling
  if (!result.success) {
    console.error('Failed to fetch case:', result.error);
    return null;
  }

  return result.data ?? null;
}
```

#### Pattern 3: Metadata Access for Legal Domains
```typescript
import type { Evidence, EvidenceMetadata } from '$lib/types';

function processEvidence(evidence: Evidence) {
  // ✅ CORRECT - Type-safe metadata access
  const metadata: EvidenceMetadata | null = evidence.metadata;

  if (metadata?.processingStatus === 'completed') {
    const text = metadata.ocrResult;
    const hash = metadata.fileHash;
    // All types inferred correctly
  }

  // Chain of custody access
  evidence.chainOfCustody?.forEach(record => {
    console.log(`${record.handler} - ${record.action} at ${record.location}`);
  });
}
```

#### Pattern 4: Admin Monitoring
```typescript
import type { AdminStatusResponse, ServiceHealth } from '$lib/types';

async function monitorServices(): Promise<void> {
  const status: AdminStatusResponse = await fetch('/api/admin/status').then(r => r.json());

  if (!status.success) {
    console.error('Admin check failed:', status.error);
    return;
  }

  // ✅ CORRECT - Type inference on nested objects
  const dbHealth: ServiceHealth = status.services.database;
  const cacheHealth: ServiceHealth = status.services.cache;

  if (dbHealth.status === 'unhealthy') {
    console.error('Database unavailable:', dbHealth.error);
  }

  // Metrics access
  console.log(`CPU: ${status.metrics.cpu.usage}%`);
  console.log(`Memory: ${status.metrics.memory.percentage}%`);
}
```

#### Pattern 5: Worker Health Monitoring
```typescript
import type { WorkerHealthCheckResponse, BackgroundWorkerStatus } from '$lib/types';

async function checkAllWorkers(): Promise<boolean> {
  const health: WorkerHealthCheckResponse = await fetch('/api/health/workers').then(r => r.json());

  if (!health.success) {
    return false;
  }

  // ✅ CORRECT - Type-safe worker iteration
  const allHealthy = health.workers.every((worker: BackgroundWorkerStatus) => {
    return worker.status === 'online' && worker.healthy;
  });

  // Get summaries with type safety
  console.log(`Online: ${health.summary?.online}`);
  console.log(`Offline: ${health.summary?.offline}`);

  return allHealthy;
}
```

#### Pattern 6: File Upload with Progress Tracking
```typescript
import type { FileUploadResponse, FileProcessingProgress } from '$lib/types';

async function uploadAndTrack(file: File): Promise<void> {
  // Initial upload
  const formData = new FormData();
  formData.append('file', file);

  const upload: FileUploadResponse = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  }).then(r => r.json());

  if (!upload.success) {
    console.error('Upload failed:', upload.error);
    return;
  }

  const fileId = upload.file.fileId;
  console.log(`Uploaded: ${upload.file.fileName} (${upload.file.fileSize}MB)`);

  // Monitor processing with real-time updates
  const eventSource = new EventSource(`/api/files/${fileId}/progress`);

  eventSource.onmessage = (event) => {
    const progress: FileProcessingProgress = JSON.parse(event.data);

    console.log(`Progress: ${progress.overallProgress}%`);
    console.log(`Current Stage: ${progress.currentStage}`);

    progress.stages.forEach(stage => {
      console.log(`  ${stage.stageName}: ${stage.progress}% (${stage.status})`);
    });

    if (progress.overallProgress === 100) {
      eventSource.close();
    }
  };
}
```

#### Pattern 7: Batch Operations
```typescript
import type { BatchQueryResult, Case } from '$lib/types';

async function deleteCasesBatch(ids: string[]): Promise<void> {
  const result: BatchQueryResult<Case> = await fetch('/api/cases/batch/delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }).then(r => r.json());

  if (!result.success) {
    console.error('Batch operation failed:', result.error);
    return;
  }

  // ✅ CORRECT - Type-safe batch result iteration
  result.results.forEach(item => {
    if (item.success) {
      console.log(`✅ Deleted case ${item.id}`);
    } else {
      console.error(`❌ Failed to delete ${item.id}: ${item.error}`);
    }
  });

  console.log(`Summary: ${result.successCount}/${result.results.length} successful`);
}
```

#### Pattern 8: Vector Search
```typescript
import type { VectorSearchQueryResult } from '$lib/types';

async function searchDocuments(query: string, embedding: number[]): Promise<void> {
  const results: VectorSearchQueryResult = await fetch('/api/search/semantic', {
    method: 'POST',
    body: JSON.stringify({ query, embedding })
  }).then(r => r.json());

  if (!results.success) {
    console.error('Search failed:', results.error);
    return;
  }

  // ✅ CORRECT - Type-safe result processing
  if (results.results) {
    results.results.forEach(result => {
      console.log(`${result.title}`);
      console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`Excerpt: ${result.content.substring(0, 100)}...`);

      if (result.metadata) {
        console.log(`Metadata:`, result.metadata);
      }
    });
  }

  console.log(`Total Results: ${results.totalResults}`);
}
```

### Copilot Guidance for Type Generation

When generating new API endpoints, Copilot should:

1. **Always return typed responses** using the wrapper types:
   ```typescript
   // ✅ CORRECT endpoint pattern
   export const GET: RequestHandler = async () => {
     try {
       const data = await db.select().from(cases).limit(20);
       return json<ListQueryResult<Case>>({
         success: true,
         data: data,
         pagination: { page: 1, pageSize: 20, total: 100, pages: 5, hasMore: true },
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       return json<ListQueryResult<Case>>({
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
         timestamp: new Date().toISOString()
       }, { status: 500 });
     }
   };
   ```

2. **Include error cases** in response typing:
   ```typescript
   // ✅ CORRECT - Both success and error cases typed
   async function processCase(id: string): Promise<QueryResult<Case>> {
     try {
       const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
       return {
         success: !!result[0],
         data: result[0],
         timestamp: new Date().toISOString()
       };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
         timestamp: new Date().toISOString()
       };
     }
   }
   ```

3. **Use domain-specific types** when available:
   ```typescript
   // ✅ CORRECT - Use CaseQueryResult instead of QueryResult<Case>
   async function fetchCase(id: string): Promise<CaseQueryResult> {
     // Implementation
   }

   // Less clear, but equivalent:
   async function fetchCase(id: string): Promise<QueryResult<Case>> {
     // Implementation
   }
   ```

4. **Provide metadata context** for complex entities:
   ```typescript
   // ✅ CORRECT - Include all available metadata
   const evidence: Evidence = {
     id: evidenceId,
     caseId: caseId,
     title: 'Contract',
     evidenceType: 'document',
     aiAnalysis: {
       documentType: 'contract',
       extractedEntities: ['John Doe', 'Jane Smith'],
       keyTerms: ['termination', 'breach', 'liability'],
       sentiment: -0.3,
       confidence: 0.95
     },
     metadata: {
       fileHash: 'sha256:abc123...',
       fileSize: 2048,
       processingStatus: 'completed',
       ocrResult: 'extracted text...'
     },
     // ... other fields
   };
   ```

### Common Type Patterns for Svelte Components

```svelte
<script lang="ts">
  import type {
    ListQueryResult, Case,
    AdminStatusResponse,
    WorkerHealthCheckResponse
  } from '$lib/types';

  // ✅ CORRECT - Type component data loading
  let cases: ListQueryResult<Case> | null = null;
  let adminStatus: AdminStatusResponse | null = null;
  let workerHealth: WorkerHealthCheckResponse | null = null;

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function loadData() {
    isLoading = true;
    error = null;

    try {
      const casesResp = await fetch('/api/cases');
      cases = await casesResp.json();

      if (!cases.success) {
        error = cases.error ?? 'Failed to load cases';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  // ✅ CORRECT - Derived computed value
  let caseCount = $derived(cases?.data?.length ?? 0);
  let hasError = $derived(!!error || (cases && !cases.success));
</script>

{#if isLoading}
  <p>Loading...</p>
{:else if error}
  <p class="error">{error}</p>
{:else if cases?.success && cases.data}
  <ul>
    {#each cases.data as legalCase}
      <li>{legalCase.title}</li>
    {/each}
  </ul>

  {#if cases.pagination}
    <p>Page {cases.pagination.page} of {cases.pagination.pages}</p>
  {/if}
{:else}
  <p>No data available</p>
{/if}
```

### Type Coverage Checklist

When reviewing code, ensure:

- [ ] All API responses use typed wrappers (`QueryResult<T>`, `ListQueryResult<T>`, etc.)
- [ ] Components check `success` before accessing `data`
- [ ] Error messages are handled from `error` property
- [ ] Pagination info is accessed safely when present
- [ ] Optional fields use `?` operator (`metadata?.field`)
- [ ] Worker health includes all status fields
- [ ] File uploads track processing stages
- [ ] Batch operations iterate over `results` array
- [ ] Vector search results include similarity scores
- [ ] Admin metrics have proper unit context (%, MB, ms, etc.)

### Files to Reference

- **Type Definitions**: `src/lib/types/index.ts` (main export hub)
  - `src/lib/types/database.ts` (195+ database types)
  - `src/lib/types/admin.ts` (70+ admin types)
  - `src/lib/types/cluster.ts` (65+ worker/cluster types)
- **Documentation**:
  - `TYPE_DEFINITIONS_GUIDE.md` (comprehensive guide)
  - `TYPE_DEFINITIONS_CHEATSHEET.md` (quick reference)
  - `DATABASE_ACCESS_PATTERNS.md` (API-only patterns)

## ⚠️ CRITICAL: Database Access Patterns

### 🚨 RULE: API-Route Access Only (Never in SSR)

**All database imports MUST happen inside endpoint handlers (`+server.ts`), NOT during `load()` or SSR module load.**

### ✅ CORRECT Pattern

```typescript
// src/routes/api/cases/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ListQueryResult, Case } from '$lib/types';
import { db } from '$lib/server/db';
import { cases } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Database access ONLY here in handler
    const data = await db.select().from(cases).limit(20);

    const result: ListQueryResult<Case> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };

    return json(result);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ListQueryResult<Case>, { status: 500 });
  }
};
```

### ❌ WRONG Patterns (DO NOT DO)

```typescript
// ❌ WRONG: Database in +page.server.ts load()
export async function load() {
  const data = await db.select().from(cases);
  return { data };
}

// ❌ WRONG: Database in +layout.server.ts
export async function load() {
  const config = await db.select().from(config);
  return { config };
}

// ❌ WRONG: Database at module level
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