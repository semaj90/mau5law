# YoRHa Detective: Contextual AI Chat System

## Overview

This is a production-ready contextual AI chat system for your legal AI platform. The Detective (YoRHa) can now engage in intelligent conversations with full context from your RAG/KAG infrastructure.

**Key Features:**
- 🤖 Contextual chat with evidence attachment
- 📚 RAG (Qdrant) + KAG (Neo4j) context retrieval
- 💡 "Did you mean?" suggestions from past queries
- 📊 Full analytics and user behavior tracking
- ⚡ Sub-second response times with GPU acceleration
- 🔒 Enterprise-grade security and audit trails

## Quick Start (5 minutes)

### Prerequisites
- PostgreSQL 14+
- Python 3.10+
- Go 1.21+
- Node.js 18+
- Qdrant running (port 6333)
- Neo4j running (port 7687)
- Ollama with `embeddinggemma:latest` and `gemma3-legal:latest`

### 1. Database Setup

```bash
# Apply migration
psql -U legal_admin -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_contextual_chat_tables.sql

# Verify
psql -U legal_admin -d legal_ai_db -c "\dt chat_*"
```

### 2. Start Services

```bash
# Terminal 1: Python RAG/KAG service
cd backend/services
python rag_kag_server.py

# Terminal 2: Go context orchestrator
cd go-services/yorha-context-orchestrator
go run main.go

# Terminal 3: SvelteKit frontend
cd sveltekit-frontend
npm run dev
```

### 3. Test

```bash
# Health check
curl http://localhost:8085/health

# Send a chat message
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What evidence relates to the timeline?"}'
```

## Architecture

### Data Flow

```
User Message
    ↓
SvelteKit API (/api/ai/yorha/context-chat)
    ↓
Go Orchestrator (HTTP)
    ├─ gRPC → Python RAG/KAG Service
    │   ├─ Embed query (embeddinggemma)
    │   ├─ Search Qdrant (RAG)
    │   ├─ Query Neo4j (KAG)
    │   └─ Compute suggestions
    ├─ HTTP → Ollama (Gemma LLM)
    │   └─ Generate answer with context
    └─ PostgreSQL (Persistence)
        ├─ Save chat_turns
        ├─ Link chat_turn_evidence
        └─ Record chat_analytics
    ↓
Response to Frontend
    ├─ Answer
    ├─ Citations
    ├─ Did you mean suggestions
    └─ Latency metrics
```

### Database Schema

#### chat_turns
Stores each conversation turn with full context:
```sql
CREATE TABLE chat_turns (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases(id),
  user_id uuid REFERENCES users(id),
  message text,
  llm_output jsonb,      -- Full LLM response
  rag_context jsonb,     -- Retrieved evidence
  kag_context jsonb,     -- Graph facts
  did_you_mean jsonb,    -- Suggestions
  created_at timestamptz
);
```

#### chat_turn_evidence
Links evidence to chat turns:
```sql
CREATE TABLE chat_turn_evidence (
  id uuid PRIMARY KEY,
  chat_turn_id uuid REFERENCES chat_turns(id),
  evidence_id uuid REFERENCES evidence(id),
  object_uri text,       -- minio://bucket/key or qdrant://collection/chunk
  role text,             -- 'uploaded' or 'retrieved'
  created_at timestamptz
);
```

#### chat_analytics
Tracks performance and user behavior:
```sql
CREATE TABLE chat_analytics (
  id uuid PRIMARY KEY,
  chat_turn_id uuid REFERENCES chat_turns(id),
  user_id uuid REFERENCES users(id),
  case_id uuid REFERENCES cases(id),
  response_latency_ms integer,
  rag_results_count integer,
  kag_facts_count integer,
  suggestions_count integer,
  user_feedback text,
  created_at timestamptz
);
```

## API Reference

### POST /api/ai/yorha/context-chat

Send a chat message with optional evidence attachment.

**Request:**
```json
{
  "message": "What evidence relates to the timeline?",
  "caseId": "case-123",
  "evidenceIds": ["ev-001", "ev-002"]
}
```

**Response:**
```json
{
  "turnId": "turn-uuid",
  "answer": "Based on the provided evidence...",
  "citations": [
    {
      "evidence_id": "ev-001",
      "chunk_id": "ev-001-c3"
    }
  ],
  "didYouMean": [
    {
      "query": "timeline of events on 12/03",
      "reason": "similar past successful query",
      "score": 0.91
    }
  ],
  "latencyMs": 982
}
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://legal_admin:123456@localhost/legal_ai_db

# Vector Search (Qdrant)
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Knowledge Graph (Neo4j)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# LLM (Ollama)
OLLAMA_ENDPOINT=http://localhost:11434
GEMMA_MODEL=gemma3-legal:latest
EMBEDDING_MODEL=embeddinggemma:latest

# Services
CONTEXT_ORCH_URL=http://localhost:8085
RAG_KAG_SERVICE_ADDR=localhost:50061

# MinIO (Evidence Storage)
MINIO_HOST=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## Integration Examples

### 1. Add to Terminal Chat Page

```svelte
<!-- src/routes/terminal/+page.svelte -->
<script>
  import YoRHaChat from '$lib/components/YoRHaChat.svelte';
</script>

<div class="terminal">
  <YoRHaChat />
</div>
```

### 2. Attach Evidence to Chat

```typescript
// Send chat with evidence
const response = await fetch('/api/ai/yorha/context-chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    message: 'Analyze this evidence',
    caseId: 'case-123',
    evidenceIds: ['ev-001', 'ev-002'],
  }),
});
```

### 3. Query Chat History

```sql
-- Get all chat turns for a case
SELECT * FROM chat_turns
WHERE case_id = 'case-123'
ORDER BY created_at DESC;

-- Get evidence linked to a chat turn
SELECT e.* FROM evidence e
JOIN chat_turn_evidence cte ON e.id = cte.evidence_id
WHERE cte.chat_turn_id = 'turn-uuid';

-- Get analytics for a user
SELECT * FROM chat_analytics
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

## Performance Optimization

### 1. Vector Search (Qdrant)

- Collection: `phase_rag_evidence`
- Dimensions: 768 (embeddinggemma)
- Distance: Cosine
- Indexed: Yes

```bash
# Check collection stats
curl http://localhost:6333/collections/phase_rag_evidence
```

### 2. Knowledge Graph (Neo4j)

- Indexes on: `Case.id`, `Evidence.id`, `Entity.id`
- Query optimization: Use EXPLAIN PROFILE

```cypher
EXPLAIN PROFILE
MATCH (c:Case {id: 'case-123'})-[:HAS_EVIDENCE]->(e:Evidence)
RETURN e;
```

### 3. Database Indexes

All JSONB fields are indexed with GIN for fast queries:
```sql
CREATE INDEX idx_chat_turns_llm_output ON chat_turns USING GIN (llm_output);
CREATE INDEX idx_chat_turns_rag_context ON chat_turns USING GIN (rag_context);
```

## Troubleshooting

### "Context orchestrator failed"

```bash
# Check service is running
curl http://localhost:8085/health

# Check logs
tail -f go-services/yorha-context-orchestrator/logs.txt
```

### "RAG/KAG service unavailable"

```bash
# Check Python service
ps aux | grep rag_kag_server.py

# Check gRPC connection
python -c "import grpc; print('gRPC OK')"

# Restart service
pkill -f rag_kag_server.py
python backend/services/rag_kag_server.py
```

### "No embeddings returned"

```bash
# Check Ollama
curl http://localhost:11434/api/tags | grep embeddinggemma

# Pull model if missing
ollama pull embeddinggemma:latest
```

### "Database connection failed"

```bash
# Test connection
psql -U legal_admin -d legal_ai_db -c "SELECT 1;"

# Check credentials in .env
cat .env | grep DATABASE_URL
```

## Production Deployment

### Docker Compose

```yaml
services:
  rag-kag-service:
    build: ./backend/services
    ports:
      - "50061:50061"
    environment:
      QDRANT_HOST: qdrant
      NEO4J_URI: bolt://neo4j:7687
      DATABASE_URL: postgresql://legal_admin:123456@postgres/legal_ai_db
    depends_on:
      - qdrant
      - neo4j
      - postgres

  yorha-context-orchestrator:
    build: ./go-services/yorha-context-orchestrator
    ports:
      - "8085:8085"
    environment:
      RAG_KAG_SERVICE_ADDR: rag-kag-service:50061
      DATABASE_URL: postgresql://legal_admin:123456@postgres/legal_ai_db
    depends_on:
      - rag-kag-service
      - postgres
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yorha-context-orchestrator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yorha-context-orchestrator
  template:
    metadata:
      labels:
        app: yorha-context-orchestrator
    spec:
      containers:
      - name: orchestrator
        image: yorha-context-orchestrator:latest
        ports:
        - containerPort: 8085
        env:
        - name: RAG_KAG_SERVICE_ADDR
          value: rag-kag-service:50061
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

## Monitoring & Analytics

### Query Chat Metrics

```sql
-- Average response time by user
SELECT user_id, AVG(response_latency_ms) as avg_latency
FROM chat_analytics
GROUP BY user_id
ORDER BY avg_latency DESC;

-- Most common queries
SELECT message, COUNT(*) as count
FROM chat_turns
GROUP BY message
ORDER BY count DESC
LIMIT 10;

-- RAG effectiveness
SELECT AVG(rag_results_count) as avg_results,
       AVG(kag_facts_count) as avg_facts
FROM chat_analytics;
```

### Grafana Dashboard

Create a dashboard with:
- Response latency (p50, p95, p99)
- RAG/KAG context retrieval rates
- User engagement metrics
- Error rates and types

## Next Steps

1. **Fine-tune Gemma**: Train on legal domain for better responses
2. **Add Voice Chat**: Integrate speech-to-text
3. **Implement Feedback Loop**: Use user feedback to improve suggestions
4. **Add Multi-turn Context**: Remember conversation history
5. **Integrate with Case Management**: Link chat to case workflows

## Support

For issues or questions:
1. Check the [troubleshooting guide](#troubleshooting)
2. Review [setup documentation](./docs/PHASE72_CONTEXTUAL_CHAT_SETUP.md)
3. Check service logs
4. Open an issue with logs and reproduction steps

## License

Part of the Legal AI Platform. See LICENSE for details.
