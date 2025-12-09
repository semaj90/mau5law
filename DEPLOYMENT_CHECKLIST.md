# Phase 72: Contextual Chat - Deployment Checklist

## Pre-Deployment

### Prerequisites
- [ ] PostgreSQL 14+ installed and running
- [ ] Python 3.10+ installed
- [ ] Go 1.21+ installed
- [ ] Node.js 18+ installed
- [ ] Qdrant running (port 6333)
- [ ] Neo4j running (port 7687)
- [ ] Ollama running with models:
  - [ ] `embeddinggemma:latest`
  - [ ] `gemma3-legal:latest`
  - [ ] `gemma3-vision:latest` (optional)

### Environment Setup
- [ ] `.env.local` file created with all required variables
- [ ] Database credentials verified
- [ ] Service endpoints accessible
- [ ] Network connectivity tested

## Database Setup

### Migration
- [ ] Migration file exists: `sveltekit-frontend/drizzle/20251208_add_contextual_chat_tables.sql`
- [ ] Migration applied successfully:
  ```bash
  psql -U legal_admin -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_contextual_chat_tables.sql
  ```
- [ ] Tables created:
  - [ ] `chat_turns`
  - [ ] `chat_turn_evidence`
  - [ ] `chat_analytics`
- [ ] Indexes created:
  - [ ] `idx_chat_turns_case_id`
  - [ ] `idx_chat_turns_user_id`
  - [ ] `idx_chat_turns_created_at`
  - [ ] `idx_chat_turns_llm_output` (GIN)
  - [ ] `idx_chat_turns_rag_context` (GIN)
  - [ ] `idx_chat_turns_kag_context` (GIN)
  - [ ] `idx_chat_turns_did_you_mean` (GIN)

### Verification
- [ ] Tables exist:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "\dt chat_*"
  ```
- [ ] Indexes exist:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "\di chat_*"
  ```
- [ ] Foreign keys work:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "SELECT * FROM chat_turns LIMIT 1;"
  ```

## Python Service Setup

### Installation
- [ ] Python dependencies installed:
  ```bash
  pip install grpcio grpcio-tools qdrant-client neo4j psycopg minio requests
  ```
- [ ] gRPC code generated:
  ```bash
  python -m grpc_tools.protoc -I../../sveltekit-frontend/protos \
    --python_out=. --grpc_python_out=. \
    ../../sveltekit-frontend/protos/rag_kag.proto
  ```

### Configuration
- [ ] Environment variables set:
  - [ ] `QDRANT_HOST`
  - [ ] `QDRANT_PORT`
  - [ ] `NEO4J_URI`
  - [ ] `NEO4J_USER`
  - [ ] `NEO4J_PASSWORD`
  - [ ] `DATABASE_URL`
  - [ ] `MINIO_HOST`
  - [ ] `MINIO_ACCESS_KEY`
  - [ ] `MINIO_SECRET_KEY`
  - [ ] `OLLAMA_ENDPOINT`

### Testing
- [ ] Service starts without errors:
  ```bash
  python backend/services/rag_kag_server.py
  ```
- [ ] Logs show successful connections:
  - [ ] "✅ Connected to Qdrant"
  - [ ] "✅ Connected to Neo4j"
  - [ ] "✅ Connected to PostgreSQL"
  - [ ] "✅ Connected to MinIO"
  - [ ] "🚀 RAG/KAG gRPC server listening on [::]:50061"

## Go Service Setup

### Build
- [ ] Go module initialized:
  ```bash
  cd go-services/yorha-context-orchestrator
  go mod init yorha-context-orchestrator
  ```
- [ ] Dependencies installed:
  ```bash
  go get google.golang.org/grpc
  ```
- [ ] Service builds successfully:
  ```bash
  go build -o yorha-context-orchestrator main.go
  ```

### Configuration
- [ ] Environment variables set:
  - [ ] `RAG_KAG_SERVICE_ADDR`
  - [ ] `GEMMA_ENDPOINT`
  - [ ] `DATABASE_URL`
  - [ ] `PORT`

### Testing
- [ ] Service starts without errors:
  ```bash
  ./yorha-context-orchestrator
  ```
- [ ] Health endpoint responds:
  ```bash
  curl http://localhost:8085/health
  ```
- [ ] Logs show successful startup:
  - [ ] "🚀 YoRHa Context Orchestrator listening on :8085"

## SvelteKit Setup

### Installation
- [ ] Dependencies installed:
  ```bash
  cd sveltekit-frontend
  npm install
  ```
- [ ] API endpoint exists:
  - [ ] `src/routes/api/ai/yorha/context-chat/+server.ts`

### Configuration
- [ ] Environment variables set in `.env.local`:
  - [ ] `CONTEXT_ORCH_URL`
  - [ ] `RAG_KAG_SERVICE_ADDR`
  - [ ] `OLLAMA_ENDPOINT`
  - [ ] `DATABASE_URL`

### Testing
- [ ] Dev server starts:
  ```bash
  npm run dev
  ```
- [ ] Frontend accessible at `http://localhost:5173`
- [ ] API endpoint responds:
  ```bash
  curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
  ```

## Integration Testing

### Service Health
- [ ] Go orchestrator health:
  ```bash
  curl http://localhost:8085/health
  ```
  Expected: `{"status":"ok"}`

- [ ] Python service connectivity:
  ```bash
  python -c "import grpc; print('✅ gRPC OK')"
  ```

- [ ] Ollama models available:
  ```bash
  curl http://localhost:11434/api/tags | grep -E "embeddinggemma|gemma3"
  ```

- [ ] Database connectivity:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "SELECT 1;"
  ```

### API Testing
- [ ] Send test message:
  ```bash
  curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
    -H "Content-Type: application/json" \
    -d '{"message": "What evidence relates to the timeline?"}'
  ```
  Expected: JSON response with `turnId`, `answer`, `citations`, `didYouMean`

- [ ] Verify database persistence:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
  ```
  Expected: Count > 0

- [ ] Check analytics:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "SELECT * FROM chat_analytics LIMIT 1;"
  ```
  Expected: Analytics record with latency metrics

### Performance Testing
- [ ] Response time acceptable (< 3 seconds):
  ```bash
  time curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
  ```

- [ ] Multiple concurrent requests:
  ```bash
  for i in {1..10}; do
    curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
      -H "Content-Type: application/json" \
      -d '{"message": "test"}' &
  done
  wait
  ```

## Production Deployment

### Docker Setup
- [ ] Dockerfile created for each service:
  - [ ] `backend/services/Dockerfile.rag-kag`
  - [ ] `go-services/yorha-context-orchestrator/Dockerfile`
  - [ ] `sveltekit-frontend/Dockerfile`

- [ ] Docker images built:
  ```bash
  docker build -t rag-kag-service backend/services
  docker build -t yorha-context-orchestrator go-services/yorha-context-orchestrator
  docker build -t sveltekit-frontend sveltekit-frontend
  ```

- [ ] Docker Compose configured:
  - [ ] `docker-compose.yml` updated with new services
  - [ ] All environment variables set
  - [ ] Volume mounts configured
  - [ ] Network connectivity verified

### Kubernetes Setup (if applicable)
- [ ] Deployment manifests created:
  - [ ] `k8s/rag-kag-deployment.yaml`
  - [ ] `k8s/yorha-context-orchestrator-deployment.yaml`
  - [ ] `k8s/sveltekit-frontend-deployment.yaml`

- [ ] ConfigMaps created for environment variables
- [ ] Secrets created for sensitive data
- [ ] Services exposed correctly
- [ ] Ingress configured

### Monitoring & Logging
- [ ] Prometheus metrics configured
- [ ] Grafana dashboards created:
  - [ ] Response latency dashboard
  - [ ] RAG/KAG effectiveness dashboard
  - [ ] User engagement dashboard
  - [ ] Error rate dashboard

- [ ] ELK stack configured:
  - [ ] Elasticsearch running
  - [ ] Logstash configured
  - [ ] Kibana dashboards created

- [ ] Alerting rules configured:
  - [ ] High latency alert (> 5s)
  - [ ] Service unavailability alert
  - [ ] Database connection failure alert
  - [ ] gRPC error alert

### Backup & Recovery
- [ ] PostgreSQL backups configured:
  ```bash
  pg_dump -U legal_admin legal_ai_db > backup.sql
  ```

- [ ] Backup schedule set (daily)
- [ ] Backup retention policy defined (30 days)
- [ ] Recovery procedure tested
- [ ] Disaster recovery plan documented

### Security
- [ ] SSL/TLS certificates installed
- [ ] API authentication enabled
- [ ] Rate limiting configured
- [ ] CORS headers set correctly
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

## Post-Deployment

### Verification
- [ ] All services running:
  ```bash
  docker ps | grep -E "rag-kag|yorha-context|sveltekit"
  ```

- [ ] Database tables populated:
  ```bash
  psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
  ```

- [ ] Logs clean (no errors):
  ```bash
  docker logs rag-kag-service
  docker logs yorha-context-orchestrator
  docker logs sveltekit-frontend
  ```

- [ ] Performance metrics acceptable:
  - [ ] Response latency < 2s (p95)
  - [ ] Error rate < 0.1%
  - [ ] Throughput > 50 req/s

### Documentation
- [ ] Deployment guide updated
- [ ] Runbook created for common operations
- [ ] Troubleshooting guide updated
- [ ] Team trained on new system

### Monitoring
- [ ] Dashboards accessible
- [ ] Alerts configured and tested
- [ ] On-call rotation established
- [ ] Escalation procedures defined

## Rollback Plan

If issues occur:

1. [ ] Stop new services:
   ```bash
   docker-compose down
   ```

2. [ ] Restore database from backup:
   ```bash
   psql -U legal_admin legal_ai_db < backup.sql
   ```

3. [ ] Restart previous version:
   ```bash
   docker-compose up -d
   ```

4. [ ] Verify system health:
   ```bash
   curl http://localhost:8085/health
   ```

5. [ ] Notify team and stakeholders

## Sign-Off

- [ ] Development team sign-off
- [ ] QA team sign-off
- [ ] Operations team sign-off
- [ ] Security team sign-off
- [ ] Product owner sign-off

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Verified By**: _______________

**Notes**:
