# Deployment Guide: Legal AI GPU RAG System

## Quick Start (VS Code Tasks)

### 1. Deploy Full Infrastructure
```
Cmd+Shift+P → Tasks: Run Task → Deploy All Infrastructure (Full Setup)
```

This will:
- ✅ Start Postgres 17 + pgvector
- ✅ Start Redis
- ✅ Start Ollama Gemma-Legal
- ✅ Start Qdrant GPU

### 2. Start MLP Workers
```
Cmd+Shift+P → Tasks: Run Task → Start Supervisord (MLP Workers)
```

This will:
- ✅ Start DocLing Gateway
- ✅ Start Mirror Service
- ✅ Start MLP Workers (2 processes)
- ✅ Start Sync Worker

### 3. Verify Deployment
```
Cmd+Shift+P → Tasks: Run Task → Check Supervisord Status
Cmd+Shift+P → Tasks: Run Task → Check Qdrant GPU Status
```

---

## Manual Deployment (if not using VS Code)

### Prerequisites
- Docker + Docker Compose
- Python 3.10+
- CUDA 11.8+
- RTX 3060 Ti (8GB VRAM)

### Step 1: Deploy Infrastructure

```bash
# Postgres 17 + pgvector
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=legal_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  pgvector/pgvector:pg15

# Redis
docker run -d \
  --name redis-legal-ai \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine

# Qdrant GPU
docker run -d \
  --name qdrant-gpu \
  --gpus all \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  -v qdrant_snapshots:/qdrant/snapshots \
  -e QDRANT_API_KEY=your-api-key \
  qdrant/qdrant:latest-gpu

# Ollama Gemma-Legal
docker run -d \
  --name ollama-gemma \
  --gpus all \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama:latest
```

### Step 2: Start MLP Workers

```bash
# Start supervisord
supervisord -c backend/supervisord.conf

# Check status
supervisorctl -c backend/supervisord.conf status all

# View logs
tail -f /var/log/supervisor/docling-gateway.log
tail -f /var/log/supervisor/mirror-service.log
tail -f /var/log/supervisor/mlp-worker-00.log
```

### Step 3: Verify Services

```bash
# Check Postgres
psql -h localhost -U postgres -d legal_db -c "SELECT version();"

# Check Redis
redis-cli ping

# Check Qdrant
curl http://localhost:6333/health

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## VS Code Tasks Reference

### Infrastructure Tasks
- **Deploy All Infrastructure (Full Setup)** - Deploy Postgres, Redis, Qdrant, Ollama
- **Setup Postgres 17 + pgvector** - Deploy Postgres container
- **Setup Redis** - Deploy Redis container
- **Setup Ollama Gemma-Legal** - Deploy Ollama container
- **Deploy Qdrant with GPU Support** - Deploy Qdrant GPU container
- **Stop All Containers** - Stop all running containers
- **Clean Up All Containers** - Remove all containers

### Worker Tasks
- **Start Supervisord (MLP Workers)** - Start all MLP workers
- **Check Supervisord Status** - View worker status
- **Restart All MLP Workers** - Restart all workers
- **Stop All MLP Workers** - Stop all workers

### Logging Tasks
- **View DocLing Gateway Logs** - Stream DocLing logs
- **View Mirror Service Logs** - Stream Mirror Service logs
- **View MLP Worker Logs** - Stream MLP Worker logs

### Health Check Tasks
- **Check Qdrant GPU Status** - Verify Qdrant is running
- **Deploy Full Stack (Qdrant + Supervisord)** - Deploy Qdrant + start workers

---

## Debugging

### Python Debugging (VS Code)

```
Cmd+Shift+P → Debug: Select and Start Debugging
```

Available configurations:
- **Python: MLP Scheduler** - Debug MLP task scheduler
- **Python: Mirror Service** - Debug mirror service
- **Python: DocLing Gateway** - Debug DocLing gateway
- **Python: Sync Worker** - Debug sync worker
- **All MLP Workers** - Debug all workers together

### View Logs

```bash
# All logs
tail -f /var/log/supervisor/*.log

# Specific service
supervisorctl -c backend/supervisord.conf tail -f docling-gateway

# Follow all MLP workers
supervisorctl -c backend/supervisord.conf tail -f mlp-worker:*
```

### Restart Services

```bash
# Restart specific service
supervisorctl -c backend/supervisord.conf restart mirror-service

# Restart all
supervisorctl -c backend/supervisord.conf restart all

# Stop all
supervisorctl -c backend/supervisord.conf stop all
```

---

## Troubleshooting

### Qdrant GPU Not Starting
```bash
# Check GPU availability
nvidia-smi

# Check Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.8.0-runtime-ubuntu22.04 nvidia-smi

# Restart Qdrant
docker restart qdrant-gpu
```

### Supervisord Not Starting
```bash
# Check if supervisord is already running
ps aux | grep supervisord

# Kill existing process
pkill -f supervisord

# Start fresh
supervisord -c backend/supervisord.conf
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping

# Restart Redis
docker restart redis-legal-ai
```

### Postgres Connection Issues
```bash
# Check Postgres is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d legal_db -c "SELECT 1;"

# Restart Postgres
docker restart postgres-pgvector
```

---

## Performance Monitoring

### Check GPU Usage
```bash
# Real-time GPU monitoring
watch -n 1 nvidia-smi

# Check specific process
nvidia-smi -l 1 | grep python
```

### Check Memory Usage
```bash
# System memory
free -h

# Docker container memory
docker stats qdrant-gpu postgres-pgvector redis-legal-ai ollama-gemma
```

### Check Disk Usage
```bash
# Docker volumes
docker volume ls

# Disk space
df -h
```

---

## Production Deployment

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: legal_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest-gpu
    environment:
      QDRANT_API_KEY: your-api-key
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
      - qdrant_snapshots:/qdrant/snapshots
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  postgres_data:
  redis_data:
  qdrant_storage:
  qdrant_snapshots:
  ollama_data:
```

Deploy:
```bash
docker-compose up -d
```

---

## Monitoring & Alerts

### Health Checks

```bash
# All services
curl http://localhost:6333/health  # Qdrant
redis-cli ping                      # Redis
psql -h localhost -U postgres -c "SELECT 1;"  # Postgres
curl http://localhost:11434/api/tags  # Ollama
```

### Logs Aggregation

```bash
# Centralize logs
supervisorctl -c backend/supervisord.conf tail -f all
```

---

## Scaling

### Add More MLP Workers

Edit `backend/supervisord.conf`:

```ini
[program:mlp-worker]
numprocs=4  # Increase from 2 to 4
```

Restart:
```bash
supervisorctl -c backend/supervisord.conf restart mlp-worker:*
```

### Scale Qdrant

Use Qdrant cluster mode (see Qdrant docs for multi-node setup).

---

## Backup & Recovery

### Backup Postgres
```bash
docker exec postgres-pgvector pg_dump -U postgres legal_db > backup.sql
```

### Backup Qdrant
```bash
docker exec qdrant-gpu tar czf /qdrant/snapshots/backup.tar.gz /qdrant/storage
```

### Restore Postgres
```bash
docker exec -i postgres-pgvector psql -U postgres legal_db < backup.sql
```

---

## Next Steps

1. ✅ Deploy infrastructure (VS Code task)
2. ✅ Start MLP workers (VS Code task)
3. ✅ Verify all services running
4. ✅ Test upload → mirror → search flow
5. ✅ Build frontend UI components
6. ✅ Deploy SvelteKit frontend

Ready to deploy? Run: **Deploy All Infrastructure (Full Setup)**

