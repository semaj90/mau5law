# 📚 Knowledge Base Ingestion Pipeline

Complete document ingestion, RAG retrieval, and LLM generation system with Qdrant vector search and dual LLM support (Gemma3-legal + Gemini).

## 🎯 Features

✅ **Multi-format ingestion** - PDF, TXT, HTML, Markdown
✅ **Semantic chunking** - 500-char chunks with 100-char overlap
✅ **Vector embeddings** - embeddinggemma:latest (768-dim, Cosine similarity)
✅ **Vector storage** - Qdrant collection for fast retrieval
✅ **Metadata tracking** - PostgreSQL for document & chunk management
✅ **RAG search** - Cosine similarity ranking, 0.6 threshold
✅ **Dual LLM** - Gemma3-legal (local) + Gemini (cloud)
✅ **Web UI** - Beautiful tabbed interface for all operations

## 🚀 Quick Start

### 1. Setup Database & Vector Store

```bash
npm run knowledge:setup
```

Creates:
- PostgreSQL table: `knowledge_base` (doc_name, chunk_idx, content, source)
- Qdrant collection: `knowledge_base` (768-dim vectors, Cosine distance)

### 2. Run Development Server

```bash
npm run dev
```

Open: http://localhost:5175/knowledge

### 3. Upload Documents

1. Click **📤 Upload** tab
2. Select PDF, TXT, HTML, or MD files
3. Click **🚀 Upload**
4. View results (chunks, vectors stored)

### 4. Search Knowledge Base

1. Click **🔍 Search** tab
2. Enter query (e.g., "TypeScript error handling")
3. View matches with similarity scores (0-100%)
4. See source documents

### 5. Generate with RAG

1. Click **🤖 Generate** tab
2. Ask a question
3. Toggle **Use Gemini API** (optional, default: Gemma3)
4. View generated response with sources

## 📡 API Endpoints

### POST /api/knowledge
Upload documents for ingestion.

**Request:**
```bash
curl -X POST http://localhost:5175/api/knowledge \
  -F "files=@document.pdf" \
  -F "source=myapp"
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 1 file(s)",
  "results": [
    {
      "file": "document.pdf",
      "chunks": 12,
      "points": 12,
      "status": "success"
    }
  ]
}
```

### GET /api/knowledge?q=query&limit=5
Search knowledge base with vector similarity.

**Request:**
```bash
curl "http://localhost:5175/api/knowledge?q=TypeScript+generics&limit=5"
```

**Response:**
```json
{
  "success": true,
  "query": "TypeScript generics",
  "matches": [
    {
      "id": 12345,
      "score": 0.92,
      "document": "typescript-guide.md",
      "chunk": 3,
      "content": "Generics allow reusable components...",
      "source": "ui-upload"
    }
  ],
  "count": 1,
  "avg_similarity": "0.92"
}
```

### PATCH /api/knowledge
Generate response using RAG + LLM.

**Request:**
```bash
curl -X PATCH http://localhost:5175/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are TypeScript generics?",
    "max_context_chunks": 5,
    "use_gemini": false
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Generics in TypeScript allow you to...",
  "llm": "gemma3-legal:latest",
  "rag_context": {
    "matches": 3,
    "avg_similarity": "0.87",
    "documents": ["typescript-guide.md"]
  }
}
```

## 🏗️ Architecture

```
User Document
    ↓
[Extract Text] (PDF, HTML, TXT, MD)
    ↓
[Chunk Text] (500 chars, 100 overlap)
    ↓
[Generate Embeddings] (embeddinggemma:latest, 768-dim)
    ↓
[Store in Qdrant] (vector search)
[Store in PostgreSQL] (metadata)
    ↓
[RAG Query] (Cosine similarity, threshold 0.6)
    ↓
[Augmented Prompt] + [Context] → [LLM]
    ↓
[Gemma3-legal] or [Gemini API]
    ↓
[Response] → User
```

## 📊 Database Schema

### PostgreSQL: knowledge_base

```sql
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  doc_name VARCHAR(255),           -- "typescript-guide.md"
  chunk_idx INTEGER,               -- 0, 1, 2, ...
  content TEXT,                    -- "TypeScript allows..."
  source VARCHAR(100),             -- "ui-upload", "phase80-crawler", etc.
  embedding_id VARCHAR(255),       -- Qdrant point ID
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Qdrant: knowledge_base

```javascript
{
  points: [
    {
      id: 12345,
      vector: [0.12, 0.45, ...768 dimensions],
      payload: {
        document_name: "typescript-guide.md",
        chunk_index: 0,
        content: "TypeScript allows reusable...",
        source: "ui-upload",
        uploaded_at: "2025-12-22T10:30:00Z",
        chunk_count: 12
      }
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/legal_ai_db

# Ollama (embeddings + local LLM)
OLLAMA_URL=http://localhost:11434

# Gemini (optional, for cloud LLM)
GEMINI_API_KEY=your-api-key

# Qdrant (vector search)
QDRANT_URL=http://localhost:6333
```

### LLM Selection Logic

**Gemma3-legal (Local):**
- Default choice
- No API key required
- Good for privacy
- Supports custom domain knowledge (legal AI)

**Gemini API (Cloud):**
- Better reasoning for complex queries
- Optional: Enable with checkbox
- Requires GEMINI_API_KEY
- Slightly slower but more accurate

## 📈 Performance

| Metric | Typical Value |
|--------|--------------|
| Document Upload | ~2-5s per file |
| Embedding Gen | ~0.5s per chunk |
| Vector Search | ~50ms (Qdrant) |
| LLM Generation | ~2-10s (Gemma3) / ~1-5s (Gemini) |
| **Total E2E** | ~5-20s per document |

## 🧪 Testing

Run full pipeline test:

```bash
npm run knowledge:test
```

Tests:
1. Creates sample Markdown file
2. Uploads to API
3. Searches knowledge base
4. Generates response with RAG

Expected output:
```
1️⃣  Creating sample document...
   ✅ Created typescript-guide.md

2️⃣  Uploading document...
   ✅ Uploaded: 8 chunks, 8 vectors

3️⃣  Searching knowledge base...
   ✅ Found 2 matches:
      1. [92.0%] typescript-guide.md

4️⃣  Generating response with RAG...
   ✅ Generated (gemma3-legal:latest):
      RAG: 2 matches, avg 92% similarity
   Response: "Generics are..."

✅ PIPELINE TEST COMPLETE
```

## 🔐 Safety & Privacy

- **Local embeddings**: embeddinggemma:latest (stays on device)
- **Local LLM option**: gemma3-legal:latest (no cloud)
- **Data isolation**: Documents stored in PostgreSQL + Qdrant
- **No cache**: Each query generates fresh embeddings
- **Chunk safety**: 500-char chunks prevent context leakage

## 🚀 Integration with Phase 79

The knowledge base powers Phase 79's RAG/KAG pipeline:

1. User uploads TypeScript docs → Knowledge base
2. Phase 79 encounters error
3. Phase 79 queries: "Fix TS2307 in utils.ts" + file context
4. Knowledge base returns similar fixes
5. Phase 79 uses as RAG context for LLM prompt
6. LLM generates better patch with higher confidence

## 📚 Example: Ingesting TypeScript Docs

```bash
# Create a doc
cat > typescript-tips.md << 'EOF'
# TypeScript Tips

## Type Guards
Use type guards to narrow union types:
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

## Mapped Types
Create new types from existing ones:
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};
EOF

# Upload it
curl -X POST http://localhost:5175/api/knowledge \
  -F "files=@typescript-tips.md" \
  -F "source=documentation"

# Search for it
curl "http://localhost:5175/api/knowledge?q=type+guards"

# Generate explanation
curl -X PATCH http://localhost:5175/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain TypeScript type guards"}'
```

## 🐛 Troubleshooting

**"Collection not found"**
- Run `npm run knowledge:setup`
- Check Qdrant is running: `curl http://localhost:6333/collections`

**"Embedding failed"**
- Check Ollama: `curl http://localhost:11434/api/tags`
- Ensure embeddinggemma:latest is installed: `ollama pull embeddinggemma:latest`

**"Upload failed"**
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify table exists: `psql ... -c "SELECT * FROM knowledge_base;"`

**"No matches found"**
- Document might not be uploaded yet
- Try different search query
- Check Qdrant has vectors: `curl http://localhost:6333/collections/knowledge_base`

## 📝 License & Deployment

Ready for production:
- ✅ Error handling
- ✅ Rate limiting ready (add via middleware)
- ✅ Logging implemented
- ✅ Database indexes
- ✅ Graceful fallbacks

Deploy to cloud:
```bash
# Docker build
docker build -t knowledge-base .
docker run -e DATABASE_URL=... -e OLLAMA_URL=... knowledge-base

# Cloud functions (Vercel, AWS Lambda)
- Use serverless-postgres for connection pooling
- Cache embeddings in Redis
- Use MinIO for large file storage
```
