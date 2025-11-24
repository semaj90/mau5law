# Infrastructure Setup Guide: WSL2 + Docker + Local GPU

## Overview

This guide sets up a hybrid infrastructure for the Legal AI system:
- **Docker**: Infrastructure services (Postgres, Redis, RabbitMQ, Qdrant)
- **Bare Metal**: Python workers (embedding, reranking, citation extraction)
- **GPU**: Direct CUDA access for TensorRT models

This approach avoids GPU driver conflicts while keeping infrastructure isolated.

---

## Prerequisites

### Windows/WSL2
- WSL2 with Ubuntu 22.04 LTS
- Docker Desktop with WSL2 backend
- NVIDIA GPU with CUDA 11.8+ support
- NVIDIA Container Toolkit (for GPU containers)

### Python
- Python 3.11+
- pip + venv

### System Requirements
- 8GB+ RAM (4GB for Docker, 4GB for Python workers)
- 50GB+ disk space
- RTX 3060 Ti or better (8GB VRAM)

---

## Step 1: Prepare Environment

### 1.1 Create Virtual Environment

```bash
# Navigate to project root
cd /path/to/deeds-web-app

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Linux/WSL2
# or
venv\Scripts\activate  # Windows CMD
```

### 1.2 Install Python Dependencies

```bash
# Core dependencies
pip install -r requirements.txt

# Add supervisord for worker management
pip install supervisor

# Add RabbitMQ client
pip install aio-pika

# Add database drivers
pip install asyncpg psycopg2-binary redis

# Add ML dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers sentence-transformers tensorrt
```

### 1.3 Create Required Directories

```bash
mkdir -p sql/init
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/rabbitmq
mkdir -p data/qdrant
```

---

## Step 2: Start Infrastructure Services

### 2.1 Start Docker Services

```bash
# Make script executable
chmod +x scripts/start_infrastructure.sh

# Start all services (Postgres, Redis, RabbitMQ, Qdrant)
./scripts/start_infrastructure.sh start

# Check status
./scripts/start_infrastructure.sh status
```

**Expected Output:**
```
✅ postgres-pgvector (running)
✅ legal-ai-redis (running)
✅ rabbitmq-legal (running)
✅ legal-ai-qdrant (running)

Service Endpoints:
Postgres:  postgresql://legal_admin:123456@localhost:5432/legal_ai_db
Redis:     redis://localhost:6379
RabbitMQ:  amqp://legalai:legalai123@localhost:5672/legalai
RabbitMQ UI: http://localhost:15672 (guest/guest)
Qdrant:    http://localhost:6333
```

### 2.2 Verify Services

```bash
# Postgres
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_extension WHERE extname='vector';"

# Redis
redis-cli ping
# Expected: PONG

# RabbitMQ
curl -u guest:guest http://localhost:15672/api/overview

# Qdrant
curl http://localhost:6333/collections
```

---

## Step 3: Start Python Workers

### 3.1 Start Workers

```bash
# Make script executable
chmod +x scripts/start_workers.sh

# Start all workers (embedding, mirror, rerank, citation)
./scripts/start_workers.sh start

# Check status
./scripts/start_workers.sh status
```

**Expected Output:**
```
embedding-worker_00             RUNNING   pid 12345, uptime 0:00:05
embedding-worker_01             RUNNING   pid 12346, uptime 0:00:05
mirror-worker_00                RUNNING   pid 12347, uptime 0:00:05
rerank-worker_00                RUNNING   pid 12348, uptime 0:00:05
citation-worker_00              RUNNING   pid 12349, uptime 0:00:05
```

### 3.2 Monitor Worker Logs

```bash
# View embedding worker logs
./scripts/start_workers.sh logs embedding

# View rerank worker logs
./scripts/start_workers.sh logs rerank

# View all logs
tail -f /tmp/*-worker.out.log
```

---

## Step 4: Test the Pipeline

### 4.1 Publish a Test Task

```bash
# Create test script
cat > test_pipeline.py << 'EOF'
import asyncio
from backend.mq_client import RabbitMQClient

async def test():
    client = RabbitMQClient(
        host="localhost",
        port=5672,
        user="legalai",
        password="legalai123",
        vhost="/legalai",
    )

    await client.connect()

    # Publish embedding task
    task_id = await client.publish_task(
        task_type="embedding",
        payload={
            "chunk_id": "test_chunk_001",
            "text": "The defendant was charged with assault under PC 245.",
        },
    )

    print(f"✅ Published task: {task_id}")

    await client.close()

asyncio.run(test())
EOF

# Run test
python test_pipeline.py
```

### 4.2 Verify Task Processing

```bash
# Check RabbitMQ queue
curl -u guest:guest http://localhost:15672/api/queues/%2Flegalai/embedding.queue

# Check worker logs
tail -f /tmp/embedding-worker.out.log

# Expected output:
# 📥 Received task: <task_id> (embedding)
# ✅ Completed task: <task_id>
```

---

## Step 5: Integration with Frontend

### 5.1 Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://legalai:legalai123@localhost:5672/legalai

# Qdrant
QDRANT_URL=http://localhost:6333

# Ollama (local LLM)
OLLAMA_URL=http://localhost:11434

# API
PUBLIC_API_URL=http://localhost:8080
```

### 5.2 Start Frontend

```bash
# In a new terminal
cd sveltekit-frontend

npm install
npm run dev

# Frontend will be available at http://localhost:5173
```

---

## Troubleshooting

### Postgres Connection Failed

```bash
# Check if container is running
docker ps | grep postgres

# View logs
docker logs postgres-pgvector

# Restart
docker restart postgres-pgvector
```

### RabbitMQ Connection Failed

```bash
# Check if container is running
docker ps | grep rabbitmq

# Check vhost and user
docker exec rabbitmq-legal rabbitmqctl list_vhosts
docker exec rabbitmq-legal rabbitmqctl list_users

# Recreate vhost/user
docker exec rabbitmq-legal rabbitmqctl add_vhost /legalai
docker exec rabbitmq-legal rabbitmqctl add_user legalai legalai123
docker exec rabbitmq-legal rabbitmqctl set_permissions -p /legalai legalai ".*" ".*" ".*"
```

### Workers Not Processing Tasks

```bash
# Check supervisord status
supervisorctl -c backend/supervisord.conf status

# Check worker logs
tail -f /tmp/embedding-worker.err.log

# Restart workers
./scripts/start_workers.sh restart
```

### GPU Not Available

```bash
# Check CUDA
nvidia-smi

# Check Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.8.0-runtime-ubuntu22.04 nvidia-smi

# Set CUDA device
export CUDA_VISIBLE_DEVICES=0
```

---

## Monitoring

### Docker Services

```bash
# View all containers
docker ps

# View logs
docker logs -f postgres-pgvector
docker logs -f legal-ai-redis
docker logs -f rabbitmq-legal
docker logs -f legal-ai-qdrant

# Resource usage
docker stats
```

### Python Workers

```bash
# View worker status
supervisorctl -c backend/supervisord.conf status

# View worker logs
tail -f /tmp/embedding-worker.out.log
tail -f /tmp/rerank-worker.out.log

# Monitor system resources
top
nvidia-smi
```

### RabbitMQ Management UI

```
http://localhost:15672
Username: guest
Password: guest
```

### Redis CLI

```bash
redis-cli
> KEYS *
> INFO
> MONITOR
```

---

## Shutdown

### Stop Everything

```bash
# Stop Python workers
./scripts/start_workers.sh stop

# Stop Docker services
./scripts/start_infrastructure.sh stop

# Verify
docker ps
supervisorctl -c backend/supervisord.conf status
```

---

## Performance Tuning

### Embedding Workers

Increase parallelism:
```ini
# backend/supervisord.conf
[program:embedding-worker]
numprocs=4  # Increase from 2 to 4
```

### Redis Memory

```bash
# Check memory usage
redis-cli INFO memory

# Increase max memory
docker exec legal-ai-redis redis-cli CONFIG SET maxmemory 4gb
```

### Postgres Connections

```bash
# Check active connections
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT count(*) FROM pg_stat_activity;"

# Increase max connections
docker exec postgres-pgvector psql -U legal_admin -d legal_ai_db -c "ALTER SYSTEM SET max_connections = 200;"
docker restart postgres-pgvector
```

---

## Next Steps

1. **Upload Evidence**: Use the frontend to upload legal documents
2. **Monitor Processing**: Watch workers process embedding/reranking tasks
3. **Search**: Query statutes and cases via the search interface
4. **Chat**: Interact with Gemma legal assistant

---

## Support

For issues or questions:
1. Check logs: `tail -f /tmp/*.log`
2. Check Docker: `docker logs <container>`
3. Check RabbitMQ UI: http://localhost:15672
4. Check Redis: `redis-cli`
