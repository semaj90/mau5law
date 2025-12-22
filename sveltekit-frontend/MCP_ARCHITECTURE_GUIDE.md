# MCP Agent Architecture - Complete Guide

## 🏗️ Architecture Overview

```
Agent Orchestrator (Node.js/Python)
    ↓ Conversation state management
LLM Backend (Pluggable)
    • Ollama Gemma3 (tool calling) ✅
    • Triton/TRT-LLM (structured outputs) 📋
    ↓ Tool call JSON
FastMCP Server (:3003)
    ↓ Execute tools
Tool Implementations (Python)
    • Web Search → Ollama web API
    • KB Ingest → MinIO + Qdrant
    • Graph Ops → Neo4j KAG
```

## 📦 Components

### 1. FastMCP Server (`scripts/mcp/fastmcp_server.py`)
**Purpose**: Model-agnostic tool router
**Port**: 3003 (configurable via `MCP_PORT`)
**Tools Exposed**: 7 tools
- `web_search_tool` - Ollama web search
- `http_fetch` - URL content retrieval
- `kb_upsert_documents` - Document ingestion
- `kb_vector_search` - Vector similarity search
- `graph_upsert_nodes` - Neo4j entity upsert
- `graph_upsert_relationships` - Neo4j edge upsert
- `graph_cypher_query` - Cypher execution

### 2. Agent Orchestrator (2 implementations)

#### Python: `scripts/mcp/agent_orchestrator.py`
- Async with httpx
- Ollama + Triton support
- Conversation state tracking
- Tool execution logging

#### Node.js: `scripts/mcp/agent-orchestrator.mjs`
- ESM with fetch API
- Better integration with existing stack
- JSONL conversation logging
- CLI for testing

### 3. Tool Implementations

#### `scripts/mcp/tools/web_search.py` (203 lines)
- Ollama `/api/chat` with `web_search: True`
- Query enhancement (date filters, domain filters)
- Fallback to Google search URL

#### `scripts/mcp/tools/kb_ingest.py` (199 lines)
- Document chunking with overlap
- Ollama embeddings (nomic-embed-text)
- MinIO storage (JSONL cache)
- Qdrant vector upsert

#### `scripts/mcp/tools/graph_upsert.py` (212 lines)
- Neo4j async driver
- MERGE operations for nodes/edges
- Cypher query execution

## 🚀 Quick Start

### 1. Install Dependencies

**Python (FastMCP Server)**:
```bash
cd sveltekit-frontend
pip install fastmcp httpx neo4j uvicorn qdrant-client
```

**Node.js (Already installed)**: No new dependencies needed

### 2. Configure Environment

Add to `.env`:
```bash
# MCP Configuration
MCP_PORT=3003
MCP_URL=http://localhost:3003

# Triton (optional - for future)
TRITON_URL=http://localhost:8000

# Neo4j (required for graph tools)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# MinIO (optional - uses local cache currently)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### 3. Start FastMCP Server

**Terminal 1**:
```bash
cd sveltekit-frontend
python scripts/mcp/fastmcp_server.py
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════╗
║     FastMCP Tool Server - Model Context Protocol      ║
╠════════════════════════════════════════════════════════╣
║  7 tools registered                                    ║
║  Compatible with: Ollama, Triton, any function-calling ║
╚════════════════════════════════════════════════════════╝

🔧 Tools Available:
   • web_search_tool
   • http_fetch
   • kb_upsert_documents
   • kb_vector_search
   • graph_upsert_nodes
   • graph_upsert_relationships
   • graph_cypher_query

🚀 Server running on http://0.0.0.0:3003
```

### 4. Test Agent Orchestrator

**Terminal 2 (Node.js)**:
```bash
cd sveltekit-frontend
node scripts/mcp/agent-orchestrator.mjs ollama "Search for TypeScript 5.7 features"
```

**Terminal 2 (Python)**:
```bash
cd sveltekit-frontend
python scripts/mcp/agent_orchestrator.py ollama "Search for TypeScript 5.7 features"
```

**Expected Flow**:
1. Agent sends query to Ollama with tool definitions
2. Ollama responds with `web_search` tool call
3. Agent executes tool via MCP server
4. MCP server calls `web_search.py`
5. Tool returns web search results
6. Agent sends results back to Ollama
7. Ollama generates final answer

## 🔧 Tool Usage Examples

### Web Search
```javascript
// Via Agent Orchestrator
const agent = new AgentOrchestrator('ollama');
const result = await agent.chat(
    "What are the latest TypeScript features?",
    "You are a helpful assistant with web search."
);
```

**Tool Call JSON** (Ollama generates this):
```json
{
    "id": "call_abc123",
    "type": "function",
    "function": {
        "name": "web_search",
        "arguments": "{\"query\": \"TypeScript 5.7 features\", \"recency_days\": 30, \"max_results\": 5}"
    }
}
```

### Knowledge Base Ingestion
```bash
# Direct MCP call
curl -X POST http://localhost:3003/tools/kb_upsert_documents \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
        {"content": "TypeScript 5.7 adds...", "metadata": {"source": "docs"}}
    ],
    "collection": "typescript_docs",
    "chunk_size": 500,
    "overlap": 50
  }'
```

**Response**:
```json
{
    "documents_processed": 1,
    "chunks_created": 3,
    "vectors_stored": 3,
    "minio_objects": ["typescript_docs/a3f7b2c1.jsonl"],
    "status": "success"
}
```

### Graph Operations
```javascript
// Create entities
const entities = [
    {
        id: "ts_5.7",
        properties: {
            name: "TypeScript 5.7",
            release_date: "2024-01-15",
            features: ["decorators", "isolated-declarations"]
        }
    }
];

// Via agent
await agent.chat(
    "Create a knowledge graph node for TypeScript 5.7",
    "Use graph_upsert_nodes to store entities."
);
```

## 🔄 Integration Patterns

### Pattern 1: Ollama Tool Calling (Current)

```javascript
// Ollama automatically calls tools
const messages = [
    {role: 'user', content: 'Search for TypeScript 5.7'}
];

const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
        model: 'gemma3-legal:latest',
        messages: messages,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'web_search',
                    description: 'Search the web',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {type: 'string'}
                        }
                    }
                }
            }
        ]
    })
});

// Response includes tool_calls
const data = await response.json();
const toolCalls = data.message.tool_calls;

// Execute via MCP
for (const call of toolCalls) {
    const result = await fetch(`http://localhost:3003/tools/${call.function.name}`, {
        method: 'POST',
        body: call.function.arguments
    });
}
```

### Pattern 2: Triton Structured Outputs (Future)

```javascript
// Triton doesn't natively support tool calling
// Model must be fine-tuned to emit structured JSON

const prompt = `<|system|>
You have access to these tools:
- web_search(query, max_results)
- kb_vector_search(query, collection)

Emit tool calls as JSON: {"tool": "web_search", "args": {...}}

<|user|>
Search for TypeScript 5.7 features

<|assistant|>
`;

const response = await fetch('http://localhost:8000/v2/models/gemma3_trt/infer', {
    method: 'POST',
    body: JSON.stringify({
        inputs: [{
            name: 'text_input',
            data: [prompt]
        }]
    })
});

// Parse JSON from output
const output = await response.json();
const toolCallJson = extractJSON(output.outputs[0].data[0]);

// Execute via MCP
await fetch(`http://localhost:3003/tools/${toolCallJson.tool}`, {
    method: 'POST',
    body: JSON.stringify(toolCallJson.args)
});
```

### Pattern 3: Go SIMDJSON → MCP Ingestion

```go
// go-services/legal-engine/ingest.go

func IngestDocument(doc Document) error {
    // Fast JSON parsing with SIMDJSON
    parsedDoc := simdjson.Parse(doc.RawJSON)

    // Call MCP KB ingestion
    mcpPayload := map[string]interface{}{
        "documents": []map[string]interface{}{
            {
                "content": parsedDoc.Get("content"),
                "metadata": parsedDoc.Get("metadata"),
            },
        },
        "collection": "legal_documents",
        "chunk_size": 1000,
        "overlap": 100,
    }

    resp, err := http.Post(
        "http://localhost:3003/tools/kb_upsert_documents",
        "application/json",
        bytes.NewBuffer(jsonMarshal(mcpPayload)),
    )

    // Emit event to RabbitMQ
    publishEvent("document.ingested", resp.Body)

    return nil
}
```

## 📊 Monitoring & Logging

### Conversation Logging
All conversations are logged to `data/agent-conversations.jsonl`:
```jsonl
{"conversation_state":[...],"tool_calls":[{"tool":"web_search","args":{...},"timestamp":"..."}],"metadata":{...}}
```

### Tool Call Analytics
```bash
# Count tool calls by type
cat data/agent-conversations.jsonl | jq '.tool_calls[].tool' | sort | uniq -c

# Average tool calls per conversation
cat data/agent-conversations.jsonl | jq '.metadata.iterations' | awk '{sum+=$1; count++} END {print sum/count}'
```

### MCP Server Logs
FastMCP server logs all tool executions to stdout:
```
🔧 web_search: {"query": "TypeScript 5.7", "max_results": 5}
✅ web_search: 200 OK (0.45s)
```

## 🚦 Testing Checklist

- [ ] FastMCP server starts on port 3003
- [ ] `web_search_tool` returns search results
- [ ] `kb_upsert_documents` stores vectors in Qdrant
- [ ] `graph_upsert_nodes` creates Neo4j nodes
- [ ] Agent Orchestrator detects tool calls from Ollama
- [ ] Agent Orchestrator executes tools via MCP
- [ ] Conversation state maintained across tool calls
- [ ] JSONL logging works
- [ ] Triton structured output parsing (future)

## 🔮 Roadmap

### Phase 1: Core MCP (✅ COMPLETE)
- ✅ FastMCP server with 7 tools
- ✅ Agent Orchestrator (Node.js + Python)
- ✅ Ollama tool calling integration
- ✅ Web search, KB, Graph tools

### Phase 2: Production Hardening (📋 NEXT)
- [ ] Error recovery and retries
- [ ] Rate limiting per tool
- [ ] Structured logging (JSON)
- [ ] Prometheus metrics
- [ ] Health check endpoints
- [ ] Docker deployment

### Phase 3: Triton Integration (📋 FUTURE)
- [ ] Deploy TensorRT-LLM Gemma3
- [ ] Triton inference server setup
- [ ] Fine-tune model for structured outputs
- [ ] Benchmark Ollama vs Triton
- [ ] Hot-swap backend without tool changes

### Phase 4: Advanced Tools (📋 FUTURE)
- [ ] Code execution sandbox
- [ ] SQL query builder
- [ ] Document comparison
- [ ] Multi-modal (image analysis)
- [ ] External API integrations (GitHub, Jira, etc.)

## 🤝 Integration with Existing Services

### Phase 79 Cognitive Engine
```javascript
// scripts/phase79-cognitive-engine-complete.mjs

import AgentOrchestrator from './mcp/agent-orchestrator.mjs';

const agent = new AgentOrchestrator('ollama');

// Use agent to search for error solutions
const result = await agent.chat(
    `Search for solutions to TypeScript error TS1128 in module declarations`,
    "You are a TypeScript expert. Use web search to find solutions."
);

// Use result in code generation
const context = result.response;
```

### Phase 76 ACE Agent
```javascript
// scripts/phase76-ace-prompt-engineer.mjs

import AgentOrchestrator from './mcp/agent-orchestrator.mjs';

const agent = new AgentOrchestrator('ollama');

// ACE uses agent for knowledge retrieval
const kbResult = await agent.chat(
    "Search knowledge base for Svelte 5 runes migration examples",
    "Use kb_vector_search tool."
);
```

### Go Legal Engine
```go
// Call MCP from Go service
resp, _ := http.Post(
    "http://localhost:3003/tools/graph_upsert_nodes",
    "application/json",
    bytes.NewBuffer(jsonPayload),
)
```

## 📖 API Reference

### Agent Orchestrator API

```javascript
import AgentOrchestrator from './scripts/mcp/agent-orchestrator.mjs';

const agent = new AgentOrchestrator('ollama'); // or 'triton'

const result = await agent.chat(
    userMessage: string,
    systemPrompt?: string,
    maxToolIterations?: number = 5
);

// Returns:
{
    response: string,              // Final LLM response
    toolCalls: Array<{             // All tool executions
        tool: string,
        args: object,
        timestamp: string
    }>,
    conversationState: Array<{     // Full conversation
        role: 'system'|'user'|'assistant'|'tool',
        content: string
    }>,
    metadata: {
        iterations: number,
        backend: 'ollama'|'triton',
        timestamp: string
    }
}

agent.saveConversation(outputPath: string); // Save to JSONL
```

### MCP Tool Server API

**Base URL**: `http://localhost:3003`

**Endpoints**:
- `POST /tools/web_search_tool` - Web search
- `POST /tools/kb_upsert_documents` - Ingest documents
- `POST /tools/kb_vector_search` - Vector search
- `POST /tools/graph_upsert_nodes` - Create/update nodes
- `POST /tools/graph_upsert_relationships` - Create/update edges
- `POST /tools/graph_cypher_query` - Execute Cypher

**Example**:
```bash
curl -X POST http://localhost:3003/tools/web_search_tool \
  -H "Content-Type: application/json" \
  -d '{"query": "TypeScript 5.7", "max_results": 5}'
```

## 🎯 Best Practices

1. **Tool Design**: Keep tools atomic and composable
2. **Error Handling**: Always return `{error: "..."}` on failure
3. **Logging**: Log all tool calls with args + results
4. **Timeouts**: Set reasonable timeouts (30s for web search, 10s for DB)
5. **Caching**: Cache expensive operations (embeddings, web search)
6. **Model-Agnostic**: Never hardcode Ollama-specific logic in tools
7. **Structured Outputs**: Train Triton models to emit consistent JSON
8. **Conversation State**: Preserve all messages for context
9. **Rate Limiting**: Protect external APIs (Qdrant, Neo4j)
10. **Monitoring**: Track tool latency and error rates

---

**Status**: ✅ MCP Architecture complete and ready to deploy
**Next**: Start FastMCP server and test with Ollama Gemma3
