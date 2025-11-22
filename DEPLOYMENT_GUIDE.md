# Case Reporter Summarizer - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Case Reporter Summarizer system to production, staging, and development environments.

---

## Prerequisites

- Docker & Docker Compose (v20.10+)
- PostgreSQL 15+ with pgvector extension
- Redis 7.0+
- Neo4j 5.0+
- RabbitMQ 3.12+
- Node.js 18+ (for local development)
- 8GB+ RAM, 50GB+ disk space

---

## Environment Setup

### 1. Development Environment

```bash
# Clone repository
git clone <repo-url>
cd sveltekit-frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Configure environment variables
cat > .env.local << EOF
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/legal_ai_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Services
OLLAMA_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Authentication
LUCIA_SESSION_SECRET=your_session_secret

# API Configuration
API_BASE_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Feature Flags
ENABLE_CACHING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_ERROR_RECOVERY=true
EOF

# Start development server
npm run dev
```

### 2. Docker Compose Setup

```bash
# Use the optimized docker-compose for case reporter
docker-compose -f docker-compose.legal-ai-optimized.yml up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f sveltekit-frontend
```

---

## Production Deployment

### 1. Build Docker Image

```bash
# Build optimized production image
docker build -f Dockerfile.sveltekit -t case-reporter-summarizer:latest .

# Tag for registry
docker tag case-reporter-summarizer:latest registry.example.com/case-reporter-summarizer:latest

# Push to registry
docker push registry.example.com/case-reporter-summarizer:latest
```

### 2. Production Environment Variables

```bash
cat > .env.production << EOF
# Database (use managed service)
DATABASE_URL=postgresql://prod_user:${DB_PASSWORD}@db.example.com:5432/legal_ai_prod
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis (use managed service)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_TLS=true

# Services
OLLAMA_URL=http://ollama-service:11434
QDRANT_URL=http://qdrant-service:6333
NEO4J_URL=bolt://neo4j-service:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq-service:5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}

# Authentication
LUCIA_SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}

# API Configuration
API_BASE_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com

# Performance
CACHE_TTL=86400
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30000

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090

# Feature Flags
ENABLE_CACHING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_ERROR_RECOVERY=true
ENABLE_PERFORMANCE_MONITORING=true
EOF
```

### 3. Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: case-reporter-summarizer
  namespace: legal-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: case-reporter-summarizer
  template:
    metadata:
      labels:
        app: case-reporter-summarizer
    spec:
      containers:
      - name: app
        image: registry.example.com/case-reporter-summarizer:latest
        ports:
        - containerPort: 5173
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: password
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5173
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5173
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: case-reporter-summarizer
  namespace: legal-ai
spec:
  selector:
    app: case-reporter-summarizer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5173
  type: LoadBalancer
```

### 4. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace legal-ai

# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=url=$DATABASE_URL \
  -n legal-ai

kubectl create secret generic redis-credentials \
  --from-literal=password=$REDIS_PASSWORD \
  -n legal-ai

# Deploy
kubectl apply -f deployment.yaml

# Verify deployment
kubectl get pods -n legal-ai
kubectl logs -f deployment/case-reporter-summarizer -n legal-ai
```

---

## Database Migration

### 1. Run Migrations

```bash
# Development
npm run db:migrate:dev

# Production
npm run db:migrate:prod

# Verify schema
npm run db:verify
```

### 2. Backup Strategy

```bash
# Daily backup
0 2 * * * pg_dump -h db.example.com -U prod_user legal_ai_prod | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Verify backup
pg_restore -l /backups/db-20240115.sql.gz | head -20
```

---

## Monitoring & Logging

### 1. Health Checks

```bash
# API health
curl http://localhost:5173/health

# Database health
curl http://localhost:5173/api/health/database

# Redis health
curl http://localhost:5173/api/health/redis

# All services
curl http://localhost:5173/api/health/all
```

### 2. Metrics Collection

```bash
# Prometheus metrics
curl http://localhost:9090/metrics

# Performance metrics
curl http://localhost:5173/api/metrics/performance

# Cache statistics
curl http://localhost:5173/api/metrics/cache
```

### 3. Logging

```bash
# View application logs
docker-compose logs -f sveltekit-frontend

# View error logs
docker-compose logs -f sveltekit-frontend | grep ERROR

# Export logs
docker-compose logs sveltekit-frontend > app.log
```

---

## Performance Optimization

### 1. Caching Configuration

```typescript
// Optimize cache TTLs based on usage
const CACHE_CONFIG = {
  summary: 24 * 60 * 60,        // 24 hours
  similarCases: 24 * 60 * 60,   // 24 hours
  ragResults: 12 * 60 * 60,     // 12 hours
  statutes: 7 * 24 * 60 * 60,   // 7 days
};
```

### 2. Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX idx_case_reports_case_id ON case_reports(case_id);
CREATE INDEX idx_case_reports_created_at ON case_reports(created_at);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM case_reports WHERE case_id = 'case-123';
```

### 3. Connection Pooling

```typescript
// Configure connection pool
const pool = new Pool({
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Idle timeout
  connectionTimeoutMillis: 2000,
});
```

---

## Scaling Strategy

### 1. Horizontal Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment case-reporter-summarizer --replicas=5 -n legal-ai

# Auto-scaling based on CPU
kubectl autoscale deployment case-reporter-summarizer \
  --min=3 --max=10 --cpu-percent=80 -n legal-ai
```

### 2. Load Balancing

```nginx
# Nginx configuration
upstream case_reporter {
    server app1:5173;
    server app2:5173;
    server app3:5173;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://case_reporter;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Security Hardening

### 1. SSL/TLS Configuration

```bash
# Generate SSL certificate
certbot certonly --standalone -d api.example.com

# Configure in nginx
ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
```

### 2. Environment Security

```bash
# Use secrets management
export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id db-url --query SecretString --output text)
export REDIS_PASSWORD=$(aws secretsmanager get-secret-value --secret-id redis-password --query SecretString --output text)
```

### 3. Network Security

```yaml
# Network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: case-reporter-policy
spec:
  podSelector:
    matchLabels:
      app: case-reporter-summarizer
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: legal-ai
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: legal-ai
```

---

## Disaster Recovery

### 1. Backup & Restore

```bash
# Backup all data
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup-20240115.tar.gz
```

### 2. Failover Strategy

```bash
# Health check and automatic failover
kubectl set probe deployment/case-reporter-summarizer \
  --liveness --initial-delay-seconds=30 --period-seconds=10
```

---

## Rollback Procedure

```bash
# View deployment history
kubectl rollout history deployment/case-reporter-summarizer -n legal-ai

# Rollback to previous version
kubectl rollout undo deployment/case-reporter-summarizer -n legal-ai

# Rollback to specific revision
kubectl rollout undo deployment/case-reporter-summarizer --to-revision=2 -n legal-ai
```

---

## Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   ```bash
   # Check database connectivity
   psql -h db.example.com -U prod_user -d legal_ai_prod -c "SELECT 1"
   ```

2. **Redis Connection Failed**
   ```bash
   # Test Redis connection
   redis-cli -h redis.example.com -a $REDIS_PASSWORD ping
   ```

3. **High Memory Usage**
   ```bash
   # Check memory metrics
   docker stats case-reporter-summarizer

   # Restart container
   docker-compose restart sveltekit-frontend
   ```

---

## Maintenance Schedule

- **Daily**: Monitor logs and metrics
- **Weekly**: Review performance metrics and cache hit rates
- **Monthly**: Database maintenance and index optimization
- **Quarterly**: Security updates and dependency upgrades

---

## Support & Documentation

- API Documentation: `API_DOCUMENTATION.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Performance Optimization: `PERFORMANCE_FIXES_DOCUMENTATION/`
- Health Check Endpoints: `/api/health/*`

