# Phase 76: ACP Tool Registry - Complete Documentation
**Agent Communication Protocol - Unified Tool Calling System**

## 🎯 Overview

The ACP Tool Registry provides a **unified interface** to **19 agentic tools** across **9 categories**, enabling LLMs and agents to discover and execute tools automatically.

### Architecture

```
VS Code Extension (MCP Client)
         ↓
    MCP Protocol
         ↓
    REST API (/api/acp/*)
         ↓
    ACP Tool Registry (TypeScript)
         ↓
    ┌────┴────┬────────┬─────────┬──────────┐
    ↓         ↓        ↓         ↓          ↓
Knowledge  Code    LLM      Agent    Database
Search    Tools   Tools    Tools    /Cache/Storage
(Qdrant)  (ACE)  (Ollama)  (A2A)   (Docker Exec)
```

## 📚 Tool Categories (9)

### 1. Knowledge Tools (2)
- `knowledge:search` - Search knowledge base with hybrid ranking
- `knowledge:stats` - Get knowledge base statistics

### 2. Database Tools (2)
- `db:query` - Execute read-only SQL queries (PostgreSQL)
- `db:tables` - List all database tables

### 3. Cache Tools (3)
- `cache:get` - Get value from Redis cache
- `cache:set` - Set value in Redis cache with TTL
- `cache:stats` - Get Redis statistics

### 4. Storage Tools (3)
- `minio:upload` - Upload file to MinIO S3
- `minio:list` - List objects in MinIO bucket
- `minio:stats` - Get MinIO storage statistics

### 5. LLM Tools (3)
- `llm:generate` - Generate text (Ollama, Gemini, Claude, GPT-4)
- `llm:embed` - Generate embeddings
- `llm:models` - List available Ollama models

### 6. Code Tools (2)
- `code:analyze` - Run svelte-check/tsc analysis
- `code:search` - Search codebase with ripgrep

### 7. Agent Tools (2)
- `agent:discover` - Discover available agents via A2A protocol
- `agent:delegate` - Delegate task to agent

### 8. Fix Tools (1)
- `fix:svelte5` - Auto-migrate Svelte 4 → 5

### 9. System Tools (1)
- `system:health` - Check health of all services

---

## 🚀 Quick Start

### 1. List All Tools

```bash
# cURL
curl http://localhost:5175/api/acp/tools

# PowerShell
Invoke-RestMethod http://localhost:5175/api/acp/tools
```

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "name": "knowledge:search",
      "description": "Search knowledge base...",
      "category": "search",
      "inputSchema": {...},
      "outputSchema": {...}
    }
  ],
  "count": 14
}
```

### 2. Execute a Tool

```bash
# Search knowledge base
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "knowledge:search",
    "args": {
      "query": "Svelte 5 runes",
      "topK": 5,
      "synthesize": true
    }
  }'

# PowerShell
$body = @{
  tool = "knowledge:search"
  args = @{
    query = "Svelte 5 runes"
    topK = 5
    synthesize = $true
  }
} | ConvertTo-Json

Invoke-RestMethod http://localhost:5175/api/acp/execute `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Response:**
```json
{
  "success": true,
  "tool": "knowledge:search",
  "result": {
    "results": [
      {
        "title": "Svelte 5 Runes Tutorial",
        "url": "https://svelte.dev/docs/svelte/runes",
        "summary": "Learn about $state, $derived, $effect...",
        "scores": {
          "semantic": 0.92,
          "tfidf": 0.78,
          "combined": 0.878
        }
      }
    ],
    "synthesized": "Svelte 5 runes are..."
  },
  "metadata": {
    "duration": 456,
    "timestamp": "2025-01-21T12:00:00.000Z"
  }
}
```

---

## 🔧 TypeScript Usage

### Import Registry
```typescript
import {
  getACPToolRegistry,
  executeACPTool
} from '$lib/services/knowledge-search/ACPToolRegistry';
```

### Execute Tool
```typescript
// Simple execution
const result = await executeACPTool('knowledge:search', {
  query: 'Svelte 5 runes',
  topK: 5
});

if (result.success) {
  console.log(result.data);
}

// Advanced usage with registry
const registry = getACPToolRegistry();
const tools = registry.list();
console.log(`Available tools: ${tools.length}`);

const knowledgeTools = registry.byCategory('knowledge');
console.log(`Knowledge tools: ${knowledgeTools.length}`);
```

### Register Custom Tool
```typescript
import { getACPToolRegistry } from '$lib/services/knowledge-search/ACPToolRegistry';

const registry = getACPToolRegistry();

registry.register({
  name: 'custom:analyze',
  description: 'Custom analysis tool',
  category: 'database',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    },
    required: ['data']
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string' }
    }
  },
  examples: [],
  handler: async (args) => {
    return {
      success: true,
      data: { result: 'Analysis complete' },
      duration: 100
    };
  }
});

// Now execute it
const result = await registry.execute('custom:analyze', { data: 'test' });
```

---

## 📖 Tool Reference

### knowledge:search

Search knowledge base with hybrid semantic + keyword ranking.

**Input:**
```typescript
{
  query: string;           // Required: Search query
  topK?: number;           // Optional: Number of results (default: 10)
  threshold?: number;      // Optional: Min similarity score (default: 0.5)
  synthesize?: boolean;    // Optional: Use LLM synthesis (default: false)
  llmProvider?: 'ollama' | 'gemini';  // Optional: LLM provider
  tags?: string[];         // Optional: Filter by tags
}
```

**Output:**
```typescript
{
  results: Array<{
    id: string;
    title: string;
    url: string;
    summary: string;
    tags: string[];
    scores: {
      semantic: number;   // Qdrant cosine similarity
      tfidf: number;      // TF-IDF keyword score
      combined: number;   // 0.7*semantic + 0.3*tfidf
    };
  }>;
  synthesized?: string;  // LLM-generated answer (if synthesize=true)
}
```

**Example:**
```bash
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "knowledge:search",
    "args": {
      "query": "How do I use Svelte 5 runes?",
      "topK": 3,
      "synthesize": true,
      "llmProvider": "ollama"
    }
  }'
```

---

### llm:generate

Generate text using LLM (Ollama, Gemini, Claude, GPT-4).

**Input:**
```typescript
{
  prompt: string;               // Required: Prompt for LLM
  provider?: 'ollama' | 'gemini' | 'claude' | 'gpt4';  // Default: ollama
  model?: string;               // Default: gemma3-legal
  temperature?: number;         // Default: 0.3
  maxTokens?: number;           // Default: 2048
}
```

**Output:**
```typescript
{
  text: string;      // Generated text
  provider: string;  // Provider used
}
```

**Example:**
```bash
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "llm:generate",
    "args": {
      "prompt": "Explain Svelte 5 runes in simple terms",
      "provider": "ollama",
      "temperature": 0.7
    }
  }'
```

---

### code:analyze

Analyze code using svelte-check and tsc.

**Input:**
```typescript
{
  filePath: string;           // Required: File path to analyze
  tools?: string[];           // Optional: ['svelte-check', 'tsc']
}
```

**Output:**
```typescript
{
  errors: Array<{
    file: string;
    line: number;
    column: number;
    message: string;
    code: string;
  }>;
  warnings: Array<{...}>;
}
```

**Example:**
```bash
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "code:analyze",
    "args": {
      "filePath": "src/lib/components/MyComponent.svelte",
      "tools": ["svelte-check"]
    }
  }'
```

---

### agent:delegate

Delegate task to another agent via A2A Protocol.

**Input:**
```typescript
{
  agentId: string;   // Required: Target agent ID
  task: {            // Required: Task to delegate
    type: string;
    data: unknown;
  };
}
```

**Output:**
```typescript
{
  result: unknown;    // Task result from agent
  agentName: string;  // Agent that executed task
}
```

**Example:**
```bash
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "agent:delegate",
    "args": {
      "agentId": "ace-agent-1",
      "task": {
        "type": "analyze_errors",
        "data": { "filePath": "src/lib/components/MyComponent.svelte" }
      }
    }
  }'
```

---

### fix:svelte5

Auto-migrate Svelte 4 component to Svelte 5 with runes.

**Input:**
```typescript
{
  filePath: string;     // Required: Path to .svelte file
  patterns?: string[];  // Optional: Patterns to fix
  dryRun?: boolean;     // Optional: Don't apply changes (default: true)
}
```

**Output:**
```typescript
{
  fixes: Array<{
    pattern: string;
    original: string;
    fixed: string;
    confidence: number;
  }>;
  applied: boolean;  // Whether changes were applied
}
```

**Example:**
```bash
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "fix:svelte5",
    "args": {
      "filePath": "src/lib/components/OldComponent.svelte",
      "dryRun": false
    }
  }'
```

---

## 🔌 VS Code MCP Integration

### 1. MCP Configuration

Create/edit `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "phase76-acp": {
      "command": "node",
      "args": ["scripts/phase76-acp-server.mjs"],
      "env": {
        "MCP_PORT": "3003",
        "ACP_API_URL": "http://localhost:5175/api/acp"
      },
      "enabled": true,
      "alwaysOn": true
    }
  }
}
```

### 2. MCP Server Script

Create `scripts/phase76-acp-server.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Phase 76: ACP MCP Server
 * Exposes ACP Tool Registry to VS Code via MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const ACP_API_URL = process.env.ACP_API_URL || 'http://localhost:5175/api/acp';

const server = new Server(
  {
    name: 'phase76-acp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List tools
server.setRequestHandler('tools/list', async () => {
  const response = await fetch(`${ACP_API_URL}/tools`);
  const data = await response.json();

  return {
    tools: data.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Execute tool
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  const response = await fetch(`${ACP_API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: name, args })
  });

  const result = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result.result, null, 2)
      }
    ]
  };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Phase 76 ACP MCP Server running on stdio');
```

### 3. Make Script Executable

```bash
chmod +x scripts/phase76-acp-server.mjs
```

### 4. Test MCP Server

```bash
# Start server
node scripts/phase76-acp-server.mjs

# VS Code should detect it automatically
# Check output: View → Output → MCP
```

---

## 🧪 Testing

### 1. Unit Tests

```bash
npm run test src/lib/services/knowledge-search/ACPToolRegistry.test.ts
```

### 2. API Tests

```bash
# Test tools listing
curl http://localhost:5175/api/acp/tools | jq

# Test tool execution
curl -X POST http://localhost:5175/api/acp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"knowledge:search","args":{"query":"test"}}' | jq
```

### 3. Integration Tests

```bash
# Start all services
npm run dev:quic

# Run integration tests
npm run test:integration
```

---

## 📊 Statistics

Query tool statistics:

```typescript
import { getACPToolRegistry } from '$lib/services/knowledge-search/ACPToolRegistry';

const registry = getACPToolRegistry();
const tools = registry.list();

console.log(`Total tools: ${tools.length}`);
console.log(`Knowledge tools: ${registry.byCategory('knowledge').length}`);
console.log(`Code tools: ${registry.byCategory('code').length}`);
console.log(`LLM tools: ${registry.byCategory('llm').length}`);
```

**Output:**
```
Total tools: 14
Knowledge tools: 3
Code tools: 3
LLM tools: 2
Web tools: 3
Agent tools: 3
Fix tools: 2
```

---

## 🔍 Error Handling

All tool executions return standardized error format:

```typescript
{
  success: false,
  error: string,           // Error message
  duration: number,        // Execution time (ms)
  metadata?: {
    code?: string,         // Error code
    details?: unknown      // Additional details
  }
}
```

**Example:**
```json
{
  "success": false,
  "error": "Unknown tool: invalid:tool",
  "duration": 2,
  "metadata": {
    "availableTools": ["knowledge:search", "llm:generate", ...]
  }
}
```

---

## 🚦 Rate Limiting

API endpoints are rate-limited:

- **GET /api/acp/tools**: 60 requests/minute
- **POST /api/acp/execute**: 30 requests/minute

Override in `.env`:
```bash
ACP_RATE_LIMIT_TOOLS=60
ACP_RATE_LIMIT_EXECUTE=30
```

---

## 📝 Logging

Enable debug logging:

```bash
# .env
ACP_DEBUG=true
ACP_LOG_LEVEL=debug
```

Logs are written to:
- Console: `DEBUG=acp:* npm run dev`
- File: `logs/acp-tools.log`

---

## 🎯 Use Cases

### 1. LLM-Powered Search

```typescript
// Agent discovers and uses knowledge search
const result = await executeACPTool('knowledge:search', {
  query: 'How to fix TypeScript errors in Svelte 5?',
  synthesize: true,
  llmProvider: 'ollama'
});

console.log(result.data.synthesized);
// "To fix TypeScript errors in Svelte 5..."
```

### 2. Automated Code Analysis

```typescript
// Analyze file and suggest fixes
const analysis = await executeACPTool('code:analyze', {
  filePath: 'src/lib/components/MyComponent.svelte'
});

const fixes = await executeACPTool('fix:suggest', {
  error: analysis.data.errors[0]
});

console.log(fixes.data.suggestion);
```

### 3. Multi-Agent Workflows

```typescript
// Discover available agents
const agents = await executeACPTool('agent:discover', {
  capability: 'error_fixing'
});

// Delegate task to ACE agent
const result = await executeACPTool('agent:delegate', {
  agentId: agents.data.agents[0].id,
  task: {
    type: 'fix_errors',
    data: { filePath: 'src/lib/components/MyComponent.svelte' }
  }
});
```

---

## 🗄️ Database, Cache & Storage Tools

### Database Tools (PostgreSQL via docker exec)

#### `db:query` - Execute Read-Only SQL
```typescript
// Execute SELECT query
const result = await executeACPTool('db:query', {
  query: 'SELECT * FROM users LIMIT 10'
});

// With parameters (safe from SQL injection)
const result = await executeACPTool('db:query', {
  query: "SELECT * FROM users WHERE email = $1",
  params: ['user@example.com']
});
```

**CLI:**
```bash
# npm
npm run phase76:acp:execute db:query -- --query "SELECT COUNT(*) FROM users"

# PowerShell
node scripts/phase76-acp-cli.mjs execute db:query --query "SELECT * FROM sessions LIMIT 5"
```

**Docker Exec Example:**
```bash
# Direct docker exec (what the tool uses internally)
docker exec legal-ai-postgres psql -U legal_admin -d legal_ai_db -c "SELECT * FROM users LIMIT 5"
```

**Security:** Only `SELECT` queries are allowed. `INSERT`, `UPDATE`, `DELETE` are blocked.

#### `db:tables` - List All Tables
```typescript
const tables = await executeACPTool('db:tables', {
  schema: 'public'
});
// Returns: { tables: ['users', 'sessions', 'cases', ...] }
```

**CLI:**
```bash
npm run phase76:acp:execute db:tables
```

**VS Code Task:** `📊 Phase 76: List Database Tables`

---

### Cache Tools (Redis via docker exec)

#### `cache:get` - Get Value from Redis
```typescript
const result = await executeACPTool('cache:get', {
  key: 'knowledge:graph',
  parse: true  // Auto-parse JSON
});
// Returns: { value: {...}, exists: true }
```

**CLI:**
```bash
npm run phase76:acp:execute cache:get -- --key "session:user123" --parse true
```

**Docker Exec Example:**
```bash
docker exec legal-ai-redis redis-cli GET "knowledge:graph"
```

#### `cache:set` - Set Value in Redis
```typescript
const result = await executeACPTool('cache:set', {
  key: 'user:session:abc123',
  value: { userId: 123, timestamp: Date.now() },
  ttl: 3600  // 1 hour
});
```

**CLI:**
```bash
node scripts/phase76-acp-cli.mjs execute cache:set --key "test" --value "hello" --ttl 60
```

**Docker Exec Example:**
```bash
docker exec legal-ai-redis redis-cli SETEX "session:abc" 3600 "{\"userId\":123}"
```

#### `cache:stats` - Redis Statistics
```typescript
const stats = await executeACPTool('cache:stats', {});
// Returns: { keys: 1234, memory: "12.5M", uptime: 86400 }
```

**CLI:**
```bash
npm run phase76:acp:execute cache:stats
```

**VS Code Task:** `📈 Phase 76: Cache Statistics`

---

### Storage Tools (MinIO S3-Compatible)

#### `minio:upload` - Upload File
```typescript
const result = await executeACPTool('minio:upload', {
  bucket: 'legal-documents',
  key: 'evidence/doc001.pdf',
  content: base64Content,
  contentType: 'application/pdf'
});
// Returns: { success: true, url: 'http://...' }
```

**Note:** For large files, use MinIO SDK directly. This tool is for small text/JSON files.

#### `minio:list` - List Objects
```typescript
const objects = await executeACPTool('minio:list', {
  bucket: 'legal-documents',
  prefix: 'evidence/'
});
// Returns: { objects: [{ key: 'evidence/doc001.pdf', size: 1024 }] }
```

**CLI:**
```bash
npm run phase76:acp:execute minio:list -- --bucket "legal-documents" --prefix "evidence/"
```

**VS Code Task:** `📦 Phase 76: MinIO - List Objects`

#### `minio:stats` - Storage Statistics
```typescript
const stats = await executeACPTool('minio:stats', {});
// Returns: { totalSize: 1234567, objectCount: 42 }
```

---

### LLM Model Management

#### `llm:models` - List Available Models
```typescript
const models = await executeACPTool('llm:models', {});
// Returns: { models: [{ name: 'gemma3-legal:latest', size: '4.7GB' }] }
```

**CLI:**
```bash
npm run phase76:acp:execute llm:models
```

**Example Output:**
```json
{
  "models": [
    { "name": "gemma3-legal:latest", "size": "4.7GB", "modified_at": "2025-12-01T..." },
    { "name": "embeddinggemma:latest", "size": "274MB", "modified_at": "..." }
  ]
}
```

---

### System Health

#### `system:health` - Check All Services
```typescript
const health = await executeACPTool('system:health', {});
/* Returns:
{
  services: {
    ollama: 'healthy',
    qdrant: 'healthy',
    postgres: 'healthy',
    redis: 'healthy',
    minio: 'offline'
  }
}
*/
```

**CLI:**
```bash
npm run phase76:acp:execute system:health
```

**VS Code Task:** `🏥 Phase 76: ACP - System Health Check`

**Example Output:**
```json
{
  "services": {
    "ollama": "healthy",
    "qdrant": "healthy",
    "postgres": "healthy",
    "redis": "healthy",
    "knowledge_mcp": "offline",
    "a2a_protocol": "offline"
  }
}
```

---

## 🔄 Batch Execution

Execute multiple tools in parallel or sequence:

### Using Templates

```bash
# Health check (sequential)
node scripts/phase76-acp-batch.mjs --template health-check --verbose

# Database overview (parallel)
node scripts/phase76-acp-batch.mjs --template database-overview --parallel
```

**Available Templates:**
- `health-check` - System health + stats
- `database-overview` - db:tables + cache:stats + minio:stats
- `knowledge-demo` - Multiple knowledge searches
- `llm-test` - Test LLM generation and embedding

### Using Custom Task File

Create `tasks.json`:
```json
[
  { "tool": "db:tables", "args": {} },
  { "tool": "cache:stats", "args": {} },
  { "tool": "knowledge:search", "args": { "query": "Svelte 5", "topK": 3 } }
]
```

Execute:
```bash
node scripts/phase76-acp-batch.mjs --file tasks.json --parallel --verbose
```

**Options:**
- `--parallel, -p` - Execute tasks in parallel
- `--verbose, -v` - Show detailed output
- `--continue-on-error` - Don't stop on errors

**VS Code Tasks:**
- `🔄 Phase 76: Batch Execute - Health Check`
- `⚡ Phase 76: Batch Execute - Database Overview`

---

## 🧪 Testing with Docker Containers

### Ensure Containers Are Running

```bash
# Check running containers
docker ps

# Expected containers:
# - legal-ai-postgres
# - legal-ai-redis
# - legal-ai-minio
# - legal-ai-qdrant

# Start if needed (example)
docker run -d --name legal-ai-postgres -p 5434:5432 -e POSTGRES_PASSWORD=123456 postgres:15-alpine
docker run -d --name legal-ai-redis -p 6379:6379 redis:7-alpine
docker run -d --name legal-ai-minio -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
docker run -d --name legal-ai-qdrant -p 6333:6333 qdrant/qdrant
```

### Test Database Connection

```bash
# Via tool
npm run phase76:acp:execute db:tables

# Direct docker exec
docker exec legal-ai-postgres pg_isready
docker exec legal-ai-postgres psql -U legal_admin -d legal_ai_db -c "\dt"
```

### Test Redis Connection

```bash
# Via tool
npm run phase76:acp:execute cache:stats

# Direct docker exec
docker exec legal-ai-redis redis-cli PING
docker exec legal-ai-redis redis-cli INFO memory
```

### Test MinIO Connection

```bash
# Via tool
npm run phase76:acp:execute minio:list -- --bucket "legal-documents"

# Direct HTTP
curl http://localhost:9000/minio/health/live
```

---

## 📚 Additional Resources

- **Phase 76 Overview**: `sveltekit-frontend/PHASE76_INTEGRATION.md`
- **Knowledge Search**: `sveltekit-frontend/KNOWLEDGE_SEARCH_API.md`
- **A2A Protocol**: `scripts/PHASE76_A2A_PROTOCOL.md`
- **ACE Agent**: `scripts/PHASE76_ACE_AGENT.md`

---

## 🤝 Contributing

To add a new tool to the registry:

1. **Define tool schema** in `ACPToolRegistry.ts`:
   ```typescript
   'custom:mytool': {
     name: 'custom:mytool',
     description: 'My custom tool',
     category: 'database',
     inputSchema: {...},
     outputSchema: {...},
     handler: handlers.myTool
   }
   ```

2. **Implement handler**:
   ```typescript
   async myTool(args: unknown): Promise<ToolResult> {
     // Implementation
   }
   ```

3. **Test**:
   ```bash
   curl -X POST http://localhost:5175/api/acp/execute \
     -H "Content-Type: application/json" \
     -d '{"tool":"custom:mytool","args":{...}}'
   ```

4. **Document** in this file

---

## 📞 Support

- **Issues**: https://github.com/your-repo/issues
- **Docs**: `/docs/phase76/`
- **Discord**: #phase76-acp

---

**Phase 76 Complete** ✅
- ✅ 14 unified tools across 6 categories
- ✅ REST API endpoints (/api/acp/*)
- ✅ VS Code MCP integration
- ✅ Intelligent routing (TypeScript/Python/MCP/HTTP)
- ✅ Tool discovery and registration
- ✅ Comprehensive documentation

**Next Steps:**
1. Add custom tools via `registry.register()`
2. Integrate with VS Code extension
3. Build UI dashboard for tool management
4. Add performance monitoring
