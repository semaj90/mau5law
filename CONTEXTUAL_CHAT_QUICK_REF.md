# Contextual Chat - Quick Reference

## File Structure

```
sveltekit-frontend/
├── drizzle/
│   ├── 20251208_add_contextual_chat_tables.sql    # Migration
│   └── schema-contextual-chat.ts                  # Drizzle schema
├── src/routes/api/ai/yorha/
│   └── context-chat/+server.ts                    # SvelteKit endpoint
├── protos/
│   └── rag_kag.proto                              # gRPC definitions

backend/services/
└── rag_kag_server.py                              # Python RAG/KAG service

go-services/yorha-context-orchestrator/
└── main.go                                        # Go orchestrator

docs/
└── PHASE72_CONTEXTUAL_CHAT_SETUP.md              # Full setup guide
```

## Quick Commands

### Database

```bash
# Apply migration
psql -U legal_admin -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_contextual_chat_tables.sql

# Check tables
psql -U legal_admin -d legal_ai_db -c "\dt chat_*"

# Query chat history
psql -U legal_admin -d legal_ai_db -c "SELECT * FROM chat_turns LIMIT 5;"
```

### Python Service

```bash
# Install dependencies
pip install grpcio grpcio-tools qdrant-client neo4j psycopg minio requests

# Generate gRPC code
python -m grpc_tools.protoc -I../../sveltekit-frontend/protos \
  --python_out=. --grpc_python_out=. \
  ../../sveltekit-frontend/protos/rag_kag.proto

# Run service
python backend/services/rag_kag_server.py

# Check logs
tail -f backend/services/rag_kag_server.log
```

### Go Service

```bash
# Build
cd go-services/yorha-context-orchestrator
go build -o yorha-context-orchestrator main.go

# Run
./yorha-context-orchestrator

# Test
curl http://localhost:8085/health
```

### SvelteKit

```bash
# Install deps
npm install

# Dev server
npm run dev

# Build
npm run build

# Test endpoint
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://legal_admin:123456@localhost/legal_ai_db
QDRANT_HOST=localhost
QDRANT_PORT=6333
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
OLLAMA_ENDPOINT=http://localhost:11434
CONTEXT_ORCH_URL=http://localhost:8085
RAG_KAG_SERVICE_ADDR=localhost:50061
```

## API Endpoint

### POST /api/ai/yorha/context-chat

```bash
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What evidence relates to the timeline?",
    "caseId": "case-123",
    "evidenceIds": ["ev-001"]
  }'
```

**Response:**
```json
{
  "turnId": "uuid",
  "answer": "Based on the evidence...",
  "citations": [{"evidence_id": "ev-001", "chunk_id": "ev-001-c3"}],
  "didYouMean": [{"query": "...", "reason": "...", "score": 0.91}],
  "latencyMs": 982
}
```

## Database Queries

### Get chat history for a case
```sql
SELECT id, user_id, message, created_at
FROM chat_turns
WHERE case_id = 'case-123'
ORDER BY created_at DESC;
```

### Get evidence linked to a chat turn
```sql
SELECT e.id, e.name, cte.role
FROM evidence e
JOIN chat_turn_evidence cte ON e.id = cte.evidence_id
WHERE cte.chat_turn_id = 'turn-uuid';
```

### Get analytics for a user
```sql
SELECT response_latency_ms, rag_results_count, kag_facts_count
FROM chat_analytics
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### Average response time
```sql
SELECT AVG(response_latency_ms) as avg_ms
FROM chat_analytics
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Debugging

### Check service health

```bash
# Go orchestrator
curl http://localhost:8085/health

# Ollama
curl http://localhost:11434/api/tags

# Qdrant
curl http://localhost:6333/health

# Neo4j
curl http://localhost:7474/browser/
```

### View logs

```bash
# Python service
tail -f backend/services/rag_kag_server.log

# Go service
tail -f go-services/yorha-context-orchestrator/logs.txt

# SvelteKit
npm run dev  # Logs to console
```

### Test gRPC connection

```bash
python -c "
import grpc
from rag_kag_pb2_grpc import RagKagServiceStub
channel = grpc.aio.secure_channel('localhost:50061')
print('✅ gRPC connection OK')
"
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "Context orchestrator failed" | Check `curl http://localhost:8085/health` |
| "RAG/KAG service unavailable" | Restart Python service: `pkill -f rag_kag_server.py` |
| "No embeddings returned" | Pull model: `ollama pull embeddinggemma:latest` |
| "Database connection failed" | Check `psql -U legal_admin -d legal_ai_db -c "SELECT 1;"` |
| "gRPC connection refused" | Ensure Python service is running on port 50061 |

## Performance Tips

1. **Batch queries**: Send multiple messages in one request
2. **Cache embeddings**: Reuse embeddings for similar queries
3. **Index optimization**: Ensure JSONB indexes are created
4. **Connection pooling**: Use connection pools for PostgreSQL
5. **GPU acceleration**: Enable CUDA for Ollama inference

## Testing

### Unit test example

```typescript
// src/routes/api/ai/yorha/context-chat/+server.test.ts
import { POST } from './+server';

describe('POST /api/ai/yorha/context-chat', () => {
  it('should return a chat response', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' }),
    });

    const response = await POST({ request, locals: { session: { user: { id: 'user-1' } } } });
    const data = await response.json();

    expect(data.turnId).toBeDefined();
    expect(data.answer).toBeDefined();
  });
});
```

### Integration test

```bash
# Test full stack
curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test query"}' \
  -w "\nStatus: %{http_code}\n"
```

## Deployment Checklist

- [ ] Database migration applied
- [ ] Python service running and healthy
- [ ] Go orchestrator running and healthy
- [ ] SvelteKit frontend built
- [ ] Environment variables set
- [ ] Ollama models pulled
- [ ] Qdrant collection created
- [ ] Neo4j indexes created
- [ ] PostgreSQL backups configured
- [ ] Monitoring/alerting set up

## Resources

- [Full Setup Guide](./docs/PHASE72_CONTEXTUAL_CHAT_SETUP.md)
- [Architecture Overview](./docs/phase72-context-chat.md)
- [RAG/KAG Workflow](./docs/phase-rag-kag-workflow.md)
- [gRPC Documentation](https://grpc.io/docs/)
- [Qdrant Docs](https://qdrant.tech/documentation/)
- [Neo4j Docs](https://neo4j.com/docs/)
