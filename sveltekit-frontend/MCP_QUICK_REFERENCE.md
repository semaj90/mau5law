# MCP Quick Reference Card

## 🚀 Start Services

```bash
# Start FastMCP Server (Terminal 1)
npm run mcp:server

# Test Web Search (Terminal 2)
npm run mcp:test:search

# Test Knowledge Base (Terminal 3)
npm run mcp:test:kb

# Full Stack (Server + Agent)
npm run mcp:full-stack
```

## 📦 Install Dependencies

```bash
# Python dependencies
pip install fastmcp httpx neo4j uvicorn qdrant-client

# Node.js dependencies (already installed)
# No new dependencies needed
```

## ⚙️ Environment Variables

Add to `.env`:
```bash
MCP_PORT=3003
MCP_URL=http://localhost:3003
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
TRITON_URL=http://localhost:8000  # Optional - for future
```

## 🔧 Available Tools

| Tool | Description | Endpoint |
|------|-------------|----------|
| `web_search_tool` | Ollama web search | `/tools/web_search_tool` |
| `http_fetch` | URL content retrieval | `/tools/http_fetch` |
| `kb_upsert_documents` | Ingest to KB | `/tools/kb_upsert_documents` |
| `kb_vector_search` | Vector search | `/tools/kb_vector_search` |
| `graph_upsert_nodes` | Neo4j entities | `/tools/graph_upsert_nodes` |
| `graph_upsert_relationships` | Neo4j edges | `/tools/graph_upsert_relationships` |
| `graph_cypher_query` | Cypher queries | `/tools/graph_cypher_query` |

## 🧪 Testing

```bash
# Run full test suite
.\scripts\mcp\test-mcp-stack.ps1

# Test web search
curl -X POST http://localhost:3003/tools/web_search_tool \
  -H "Content-Type: application/json" \
  -d '{"query": "TypeScript 5.7", "max_results": 5}'

# Test KB ingestion
curl -X POST http://localhost:3003/tools/kb_upsert_documents \
  -H "Content-Type: application/json" \
  -d '{"documents": [{"content": "test", "metadata": {}}]}'

# Test graph operations
curl -X POST http://localhost:3003/tools/graph_upsert_nodes \
  -H "Content-Type: application/json" \
  -d '{"entities": [{"id": "test", "properties": {"name": "Test"}}], "label": "Entity"}'
```

## 💻 Agent Usage

### Node.js
```javascript
import AgentOrchestrator from './scripts/mcp/agent-orchestrator.mjs';

const agent = new AgentOrchestrator('ollama'); // or 'triton'

const result = await agent.chat(
    "Search for TypeScript 5.7 features",
    "You are a helpful assistant."
);

console.log(result.response);
agent.saveConversation('data/agent-conversations.jsonl');
```

### Python
```python
from scripts.mcp.agent_orchestrator import AgentOrchestrator

agent = AgentOrchestrator(backend='ollama')

result = await agent.chat(
    user_message="Search for TypeScript 5.7 features",
    system_prompt="You are a helpful assistant."
)

print(result['response'])
```

### CLI
```bash
# Ollama backend
node scripts/mcp/agent-orchestrator.mjs ollama "Your question here"

# Python version
python scripts/mcp/agent_orchestrator.py ollama "Your question here"
```

## 📊 File Structure

```
scripts/mcp/
├── fastmcp_server.py          # Main MCP server (250+ lines)
├── agent_orchestrator.py      # Python orchestrator (320+ lines)
├── agent-orchestrator.mjs     # Node.js orchestrator (450+ lines)
├── test-mcp-stack.ps1         # Test suite
└── tools/
    ├── web_search.py          # Web search tool (203 lines)
    ├── kb_ingest.py           # KB ingestion (199 lines)
    └── graph_upsert.py        # Neo4j graph (212 lines)
```

## 🔍 Monitoring

```bash
# View conversation logs
cat data/agent-conversations.jsonl | jq .

# Count tool calls
cat data/agent-conversations.jsonl | jq '.tool_calls[].tool' | sort | uniq -c

# Average iterations
cat data/agent-conversations.jsonl | jq '.metadata.iterations' | awk '{sum+=$1; count++} END {print sum/count}'
```

## 🐛 Troubleshooting

### FastMCP Server Won't Start
```bash
# Check Python version (3.10+)
python --version

# Reinstall dependencies
pip uninstall fastmcp httpx neo4j uvicorn -y
pip install fastmcp httpx neo4j uvicorn qdrant-client
```

### Ollama Not Responding
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Neo4j Connection Failed
```bash
# Check Neo4j status
curl http://localhost:7474

# Verify credentials in .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

### Web Search Not Working
**Expected**: Ollama may not support `web_search` option yet
**Fallback**: Tool returns Google search URL instead

## 📖 Documentation

| File | Description |
|------|-------------|
| `MCP_IMPLEMENTATION_SUMMARY.md` | Complete implementation overview |
| `MCP_ARCHITECTURE_GUIDE.md` | Detailed architecture guide (500+ lines) |
| `MCP_QUICK_REFERENCE.md` | This file |

## 🎯 Next Actions

1. ✅ Install dependencies: `pip install fastmcp httpx neo4j uvicorn qdrant-client`
2. ✅ Configure `.env` with Neo4j credentials
3. ✅ Start server: `npm run mcp:server`
4. ✅ Test: `npm run mcp:test:search`
5. ✅ Read guide: `MCP_ARCHITECTURE_GUIDE.md`

---

**Status**: ✅ Ready to deploy and test
**Total Code**: ~2,300+ lines
**Documentation**: 500+ lines
