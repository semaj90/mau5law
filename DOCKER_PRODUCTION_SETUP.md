# Docker Production Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the YoRHa Legal AI Platform with Docker for production deployment.

## Prerequisites

- Docker 24.0+
- Docker Compose 2.0+
- 16GB RAM minimum
- 50GB disk space
- NVIDIA GPU (optional, for GPU acceleration)

## Quick Start

### 1. Environment Setup

```bash
# Copy production environment file
cp .env.production .env

# Update sensitive values
nano .env
# Update: JWT_SECRET, SESSION_SECRET, database passwords, API keys
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Check service health
docker-compose ps
```

### 3. Verify Services

```bash
# Check frontend
curl http://localhost:5173

# Check API health
curl http://localhost:5173/api/health

# Check database
docker-compose exec postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1"

# Check Redis
docker-compose exec redis redis-cli ping

# Check Qdrant
curl http://localhost:6333/collections
```

## Service Configuration

### Frontend Service (SvelteKit)

**Environment Variables:**
```env
NODE_ENV=production
PORT=5173
HOST=0.0.0.0
DATABASE_URL=postgresql://legal_admin:123456@postgres:5432/legal_ai_db
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
```

**Health Check:**
```bash
curl http://localhost:5173/api/health
```

**Logs:**
```bash
docker-compose logs -f frontend
```

### PostgreSQL Database

**Configuration:**
- Version: 17
- Port: 5432
- Database: legal_ai_db
- User: legal_admin
- Extensions: pgvector

**Initialization:**
```bash
# Run migrations
docker-compose exec postgres psql -U legal_admin -d legal_ai_db -f /docker-entrypoint-initdb.d/00-init-db.sql

# Check tables
docker-compose exec postgres psql -U legal_admin -d legal_ai_db -c "\dt"
```

**Backup:**
```bash
docker-compose exec postgres pg_dump -U legal_admin legal_ai_db > backup.sql
```

**Restore:**
```bash
docker-compose exec -T postgres psql -U legal_admin legal_ai_db < backup.sql
```

### Redis Cache

**Configuration:**
- Port: 6379
- Modules: RediSearch, RedisTimeSeries, RedisJSON, RedisBloom
- Max Memory: 2GB
- Eviction Policy: allkeys-lru

**Health Check:**
```bash
docker-compose exec redis redis-cli ping
```

**Monitor:**
```bash
docker-compose exec redis redis-cli monitor
```

### MinIO Object Storage

**Configuration:**
- Port: 9000 (API), 9001 (Console)
- Access Key: minio
- Secret Key: minio123
- Bucket: legal-documents

**Access Console:**
```
http://localhost:9001
Username: minio
Password: minio123
```

**Create Bucket:**
```bash
docker-compose exec minio mc mb minio/legal-documents
```

### Qdrant Vector Database

**Configuration:**
- HTTP Port: 6333
- gRPC Port: 6334

**Health Check:**
```bash
curl http://localhost:6333/collections
```

**Create Collection:**
```bash
curl -X PUT http://localhost:6333/collections/documents \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

### Neo4j Graph Database

**Configuration:**
- HTTP Port: 7474
- Bolt Port: 7687
- User: neo4j
- Password: neo4j123

**Access Browser:**
```
http://localhost:7474
```

**Query:**
```bash
docker-compose exec neo4j cypher-shell -u neo4j -p neo4j123 "MATCH (n) RETURN count(n)"
```

### RabbitMQ Message Queue

**Configuration:**
- AMQP Port: 5672
- Management Port: 15672
- User: legal_admin
- Password: secret123

**Access Management:**
```
http://localhost:15672
Username: legal_admin
Password: secret123
```

## Production Deployment

### 1. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backups created
- [ ] SSL certificates ready
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] API keys rotated

### 2. Deploy with Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify all services
docker-compose ps

# Check logs
docker-compose logs -f
```

### 3. Post-Deployment Verification

```bash
# Test API endpoints
curl -X GET http://localhost:5173/api/health

# Test database connection
curl -X GET http://localhost:5173/api/health/db

# Test cache connection
curl -X GET http://localhost:5173/api/health/cache

# Test search functionality
curl -X POST http://localhost:5173/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### 4. Monitoring & Logging

**View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 frontend
```

**Monitor Resources:**
```bash
# CPU and memory usage
docker stats

# Disk usage
docker system df
```

## Scaling & Performance

### Horizontal Scaling

```bash
# Scale frontend service
docker-compose up -d --scale frontend=3

# Scale worker services
docker-compose up -d --scale worker=5
```

### Resource Limits

Update `docker-compose.yml`:
```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Performance Tuning

**PostgreSQL:**
```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
```

**Redis:**
```bash
# Increase max memory
docker-compose exec redis redis-cli CONFIG SET maxmemory 4gb
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs frontend

# Verify configuration
docker-compose config

# Rebuild images
docker-compose build --no-cache
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1"

# Check network
docker network ls
docker network inspect legal-ai-network
```

### Memory Issues

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit Docker Desktop settings or docker daemon.json
```

### API Errors

```bash
# Check API logs
docker-compose logs -f frontend

# Test endpoint
curl -v http://localhost:5173/api/health

# Check environment variables
docker-compose exec frontend env | grep API
```

## Maintenance

### Regular Backups

```bash
# Daily database backup
docker-compose exec postgres pg_dump -U legal_admin legal_ai_db > backup-$(date +%Y%m%d).sql

# Backup MinIO data
docker-compose exec minio mc mirror minio/legal-documents ./backups/
```

### Update Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Security Best Practices

1. **Secrets Management**
   - Use Docker secrets for sensitive data
   - Rotate credentials regularly
   - Never commit .env to version control

2. **Network Security**
   - Use internal networks for service communication
   - Expose only necessary ports
   - Use HTTPS/TLS for external communication

3. **Access Control**
   - Implement authentication on all services
   - Use role-based access control
   - Audit all access attempts

4. **Data Protection**
   - Enable encryption at rest
   - Use encrypted connections
   - Regular backups and testing

## Production Checklist

- [ ] Environment variables configured
- [ ] Database initialized and backed up
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Logging aggregation set up
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] API authentication working
- [ ] Health checks passing
- [ ] Performance benchmarks met
- [ ] Disaster recovery plan documented
- [ ] Team trained on operations

## Support & Documentation

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation
- Qdrant: https://qdrant.tech/documentation/

---

Last Updated: 2025-12-14
