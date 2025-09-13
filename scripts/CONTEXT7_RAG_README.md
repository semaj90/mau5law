# 🚀 Context7 RAG Pipeline with Gemma Embeddings

A comprehensive documentation retrieval and search system that integrates Context7 MCP server, Gemma embeddings, and Go-based RAG queries.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Context7 MCP  │    │   Go RAG Query   │    │   SvelteKit     │
│   Server        │────│   Server         │────│   API           │
│   (Port 4000)   │    │   (Port 8090)    │    │   (Port 5173)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │ Library │              │ Gemma   │              │ Client  │
    │ Docs    │              │ Embed   │              │ Apps    │
    └─────────┘              └─────────┘              └─────────┘
                                   │
                             ┌─────────────┐
                             │ PostgreSQL  │
                             │ + pgvector  │
                             │ (Port 5433) │
                             └─────────────┘
```

## 📚 Supported Libraries

- **TypeScript**: Types, interfaces, generics, decorators, modules
- **WebGPU**: Shaders, buffers, compute, rendering, pipelines
- **PostgreSQL 17**: JSONB, indexes, performance, replication
- **Drizzle ORM**: Schema, queries, migrations, relations

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Ensure you have:
- Go 1.25+
- Node.js 18+
- PostgreSQL with pgvector extension
- Ollama with embeddinggemma model
```

### 2. Setup Services

```bash
# Start PostgreSQL
npm run postgres:start

# Start Ollama
ollama serve

# Install Gemma embedding model
ollama pull embeddinggemma:latest

# Start Context7 MCP Server (if not running)
npm run start:mcp-context7
```

### 3. Run Complete Pipeline

```bash
cd scripts
./run-complete-context7-pipeline.bat
```

This will:
- ✅ Check all prerequisites
- ✅ Build Go components
- ✅ Initialize database schema
- ✅ Fetch documentation from Context7
- ✅ Generate Gemma embeddings
- ✅ Start RAG query server
- ✅ Test all endpoints

## 🔧 Manual Setup

### Build Go Components

```bash
cd scripts

# Build RAG pipeline
go build -o context7-rag-pipeline.exe context7-rag-pipeline.go

# Build query server
go build -o context7-rag-query-server.exe context7-rag-query-server.go
```

### Run Pipeline

```bash
# Fetch docs and generate embeddings
./context7-rag-pipeline.exe

# Start query server
./context7-rag-query-server.exe
```

## 📡 API Endpoints

### Go RAG Query Server (Port 8090)

```bash
# Health check
GET http://localhost:8090/health

# List libraries
GET http://localhost:8090/api/rag/libraries

# List topics
GET http://localhost:8090/api/rag/topics?library=typescript

# Search documentation
POST http://localhost:8090/api/rag/search
Content-Type: application/json
{
  "query": "TypeScript interfaces",
  "library": "typescript",
  "limit": 10,
  "threshold": 0.7
}
```

### SvelteKit API (Port 5173)

```bash
# List libraries via SvelteKit
GET http://localhost:5173/api/context7/docs?action=libraries

# Search via SvelteKit
POST http://localhost:5173/api/context7/docs
Content-Type: application/json
{
  "action": "search",
  "query": "WebGPU shaders",
  "useEnhancedRAG": true
}

# Fetch fresh documentation
POST http://localhost:5173/api/context7/docs
Content-Type: application/json
{
  "action": "fetch",
  "library": "postgresql",
  "topic": "jsonb"
}
```

## 🧪 Testing

Run comprehensive tests:

```bash
cd scripts
npx tsx test-context7-rag.ts
```

Tests include:
- ✅ Service health checks
- ✅ Context7 documentation fetching
- ✅ Gemma embedding generation
- ✅ RAG search functionality
- ✅ SvelteKit API integration
- ✅ Performance benchmarks

## 📊 Database Schema

```sql
-- Documentation storage with vector embeddings
CREATE TABLE context7_documentation (
    id SERIAL PRIMARY KEY,
    doc_id TEXT UNIQUE NOT NULL,
    library_id TEXT NOT NULL,
    library_name TEXT NOT NULL,
    topic TEXT,
    content TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding vector(768),  -- Gemma embeddings
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimized indexes
CREATE INDEX idx_context7_docs_library ON context7_documentation(library_id);
CREATE INDEX idx_context7_docs_topic ON context7_documentation(topic);
CREATE INDEX idx_context7_docs_embedding ON context7_documentation 
    USING hnsw (embedding vector_cosine_ops);
```

## 🎯 Integration Examples

### SvelteKit Frontend

```typescript
// Fetch TypeScript documentation
const response = await fetch('/api/context7/docs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'search',
    query: 'TypeScript generic constraints',
    library: 'typescript',
    limit: 5
  })
});

const { results } = await response.json();
```

### Direct Go RAG Query

```typescript
// Search across all libraries
const response = await fetch('http://localhost:8090/api/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'WebGPU compute shaders',
    threshold: 0.8
  })
});

const searchResults = await response.json();
```

## 🔄 Updating Documentation

To refresh documentation with latest content:

```bash
# Re-run the pipeline
./context7-rag-pipeline.exe

# Or use the complete setup script
./run-complete-context7-pipeline.bat
```

## ⚡ Performance Features

- **🧠 Gemma Embeddings**: High-quality semantic embeddings optimized for documentation
- **📊 Vector Search**: HNSW indexing for sub-second similarity search
- **🚀 Chunking**: Intelligent text chunking for optimal retrieval
- **💾 Caching**: Multi-level caching in Go RAG query server
- **📈 Monitoring**: Health checks and performance metrics

## 🔧 Configuration

Key configuration points:

```go
// In context7-rag-pipeline.go
const (
    MCP_CONTEXT7_ENDPOINT = "http://localhost:4000"
    OLLAMA_URL           = "http://localhost:11434"
    DATABASE_URL         = "postgres://legal_admin:123456@localhost:5433/legal_ai_db?sslmode=disable"
    GEMMA_EMBED_MODEL    = "embeddinggemma:latest"
    DOCS_OUTPUT_DIR      = "./docs/context7-library-docs"
)
```

## 🎯 Use Cases

1. **Documentation Search**: Semantic search across TypeScript, WebGPU, PostgreSQL, and Drizzle ORM docs
2. **Code Examples**: Find relevant code snippets and examples
3. **Integration Guidance**: Get context-aware integration advice
4. **Best Practices**: Discover recommended patterns and practices
5. **Error Resolution**: Find solutions to common issues

## 🔍 Troubleshooting

### Common Issues

1. **Context7 MCP Server not running**
   ```bash
   npm run start:mcp-context7
   ```

2. **Gemma model not found**
   ```bash
   ollama pull embeddinggemma:latest
   ```

3. **PostgreSQL connection failed**
   ```bash
   npm run postgres:start
   PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db
   ```

4. **No search results**
   - Check if documentation was properly ingested
   - Verify embeddings were generated
   - Lower the similarity threshold

### Debug Commands

```bash
# Check service status
curl http://localhost:8090/health
curl http://localhost:4000/health
curl http://localhost:11434/api/tags

# Check database
PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM context7_documentation;"

# Test embedding generation
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "embeddinggemma:latest", "prompt": "test"}'
```

## 🚀 Integration with Enhanced RAG

This system integrates seamlessly with your existing Enhanced RAG architecture:

- **Port 8080**: Enhanced RAG Service (CUDA-accelerated)
- **Port 8090**: Context7 RAG Query Server (Documentation-focused)
- **Port 5173**: SvelteKit API Gateway

Use `useEnhancedRAG: true` in API calls to leverage CUDA acceleration for complex queries.

## 📈 Monitoring

Monitor system performance:

```bash
# Check documentation count
curl http://localhost:8090/api/rag/libraries

# Monitor search performance
curl -X POST http://localhost:8090/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "performance test", "limit": 1}'

# Run full test suite
npx tsx test-context7-rag.ts
```

---

**Built with**: Go 1.25, PostgreSQL + pgvector, Ollama + Gemma embeddings, Context7 MCP, SvelteKit