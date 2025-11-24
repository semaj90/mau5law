# Quick Start: Infrastructure + Workers

## One-Command Setup

```bash
# Terminal 1: Start Docker infrastructure
chmod +x scripts/start_infrastructure.sh
./scripts/start_infrastructure.sh start

# Terminal 2: Start Python workers
chmod +x scripts/start_workers.sh
./scripts/start_workers.sh start

# Terminal 3: Start frontend
cd sveltekit-frontend
npm run dev
```

---

## Verify Everything Works

```bash
# Check Docker services
docker ps

# Check Python workers
supervisorctl -c backend/supervisord.conf status

# Check RabbitMQ
curl -u guest:guest http://localhost:15672/api/overview

# Check Postgres
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1;"

# Check Redis
redis-cli ping

# Check Qdrant
curl http://localhost:6333/collections
```

---

## Service Endpoints

| Service | Endpoint | Credentials |
|---------|----------|-------------|
| Postgres | `postgresql://localhost:5432/legal_ai_db` | `legal_admin:123456` |
| Redis | `redis://localhost:6379` | (none) |
| RabbitMQ | `amqp://localhost:5672/legalai` | `legalai:legalai123` |
| RabbitMQ UI | `http://localhost:15672` | `guest:guest` |
| Qdrant | `http://localhost:6333` | (none) |
| Frontend | `http://localhost:5173` | (none) |

---

## Common Commands

### Infrastructure

```bash
# Start all services
./scripts/start_infrastructure.sh start

# Stop all services
./scripts/start_infrastructure.sh stop

# Check status
./scripts/start_infrastructure.sh status

# Restart all services
./scripts/start_infrastructure.sh restart
```

### Workers

```bash
# Start all workers
./scripts/start_workers.sh start

# Stop all workers
./scripts/start_workers.sh stop

# Check worker status
./scripts/start_workers.sh status

# View embedding worker logs
./scripts/start_workers.sh logs embedding

# View rerank worker logs
./scripts/start_workers.sh logs rerank

# Restart all workers
./scripts/start_workers.sh restart
```

### Docker

```bash
# View all containers
docker ps

# View logs
docker logs -f postgres-pgvector
docker logs -f legal-ai-redis
docker logs -f rabbitmq-legal
docker logs -f legal-ai-qdrant

# Stop a container
docker stop postgres-pgvector

# Remove a container
docker rm postgres-pgvector
```

### Database

```bash
# Connect to Postgres
psql -h localhost -U legal_admin -d legal_ai_db

# Check pgvector extension
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_extension WHERE extname='vector';"

# View tables
psql -h localhost -U legal_admin -d legal_ai_db -c "\dt"
```

### Redis

```bash
# Connect to Redis
redis-cli

# Check memory
redis-cli INFO memory

# View all keys
redis-cli KEYS "*"

# Monitor commands
redis-cli MONITOR
```

### RabbitMQ

```bash
# List vhosts
docker exec rabbitmq-legal rabbitmqctl list_vhosts

# List users
docker exec rabbitmq-legal rabbitmqctl list_users

# List queues
docker exec rabbitmq-legal rabbitmqctl list_queues -p /legalai
```

---

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# Check ports are available
lsof -i :5432  # Postgres
lsof -i :6379  # Redis
lsof -i :5672  # RabbitMQ
lsof -i :6333  # Qdrant

# Kill process using port
kill -9 <PID>
```

### Workers not processing

```bash
# Check supervisord is running
ps aux | grep supervisord

# Check worker logs
tail -f /tmp/embedding-worker.out.log
tail -f /tmp/embedding-worker.err.log

# Restart workers
./scripts/start_workers.sh restart
```

### Postgres connection failed

```bash
# Check container is running
docker ps | grep postgres

# View logs
docker logs postgres-pgvector

# Restart
docker restart postgres-pgvector
```

### RabbitMQ connection failed

```bash
# Check container is running
docker ps | grep rabbitmq

# Check vhost exists
docker exec rabbitmq-legal rabbitmqctl list_vhosts

# Recreate vhost
docker exec rabbitmq-legal rabbitmqctl add_vhost /legalai
docker exec rabbitmq-legal rabbitmqctl add_user legalai legalai123
docker exec rabbitmq-legal rabbitmqctl set_permissions -p /legalai legalai ".*" ".*" ".*"
```

---

## Performance Monitoring

### CPU/Memory

```bash
# Docker resource usage
docker stats

# System resources
top
htop

# GPU usage
nvidia-smi
nvidia-smi -l 1  # Update every 1 second
```

### Database

```bash
# Active connections
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Redis

```bash
# Memory usage
redis-cli INFO memory

# Key count
redis-cli DBSIZE

# Slowlog
redis-cli SLOWLOG GET 10
```

### RabbitMQ

```bash
# Queue depth
curl -u guest:guest http://localhost:15672/api/queues/%2Flegalai

# Connection count
curl -u guest:guest http://localhost:15672/api/connections

# Channel count
curl -u guest:guest http://localhost:15672/api/channels
```

---

## Shutdown

```bash
# Stop workers
./scripts/start_workers.sh stop

# Stop infrastructure
./scripts/start_infrastructure.sh stop

# Verify
docker ps
supervisorctl -c backend/supervisord.conf status
```

---

## Next Steps

1. ✅ Start infrastructure: `./scripts/start_infrastructure.sh start`
2. ✅ Start workers: `./scripts/start_workers.sh start`
3. ✅ Start frontend: `npm run dev`
4. 📋 Upload evidence document
5. 📊 Monitor processing in worker logs
6. 🔍 Search statutes and cases
7. 💬 Chat with Gemma legal assistant

---

## Documentation

- **Full Setup Guide**: `INFRASTRUCTURE_SETUP.md`
- **Patch Details**: `.kiro/INFRASTRUCTURE_PATCH_PLAN.md`
- **Patch Summary**: `.kiro/INFRASTRUCTURE_PATCHES_SUMMARY.md`
- **Spec Tasks**: `.kiro/specs/PHASE_3_RAG_CAG_TENSORRT/tasks.md`

---

## Support

For issues:
1. Check logs: `tail -f /tmp/*.log`
2. Check Docker: `docker logs <container>`
3. Check RabbitMQ UI: http://localhost:15672
4. Check Redis: `redis-cli`
5. Check Qdrant: `curl http://localhost:6333/collections`
