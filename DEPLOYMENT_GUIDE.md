# WardenNet Deployment Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WardenNet Frontend                        │
│  (SvelteKit + UnoCSS + YoRHa Aesthetic)                     │
│  - Command Center Dashboard                                 │
│  - Evidence Board (HTML5 Canvas)                            │
│  - AI Legal Terminal (CRT UI)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │ Ollama │  │ Postgres│  │Elasticsearch
    │ Gemma  │  │pgvector │  │ (BM25)
    │ 7B     │  │         │  │
    └────────┘  └────────┘  └──────────┘
```

---

## Phase 1: Local Development Setup

### 1.1 Prerequisites

```bash
# Node.js 18+
node --version

# npm or yarn
npm --version

# Docker (optional, for services)
docker --version
```

### 1.2 Install Dependencies

```bash
cd sveltekit-frontend
npm install
```

### 1.3 Environment Configuration

Create `.env.local`:

```env
# Ollama
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=gemma:7b

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wardennet

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Auth
AUTH_SECRET=your-secret-key-here

# API
PUBLIC_API_URL=http://localhost:5173
```

### 1.4 Start Services

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=wardennet \
  -p 5432:5432 \
  postgres:15

# Terminal 3: Elasticsearch
docker run -d \
  --name elasticsearch \
  -e discovery.type=single-node \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0

# Terminal 4: WardenNet
npm run dev
```

### 1.5 Verify Setup

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test PostgreSQL
psql postgresql://user:password@localhost:5432/wardennet

# Test Elasticsearch
curl http://localhost:9200

# Test WardenNet
curl http://localhost:5173/dashboard
```

---

## Phase 2: Database Setup

### 2.1 Create Schema

```bash
# Run migrations
npm run migrate

# Or manually create tables
psql wardennet < scripts/schema.sql
```

### 2.2 Schema Overview

```sql
-- Cases
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Evidence
CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  title VARCHAR(255),
  classification VARCHAR(50),
  status VARCHAR(50),
  content TEXT,
  embedding vector(768),
  created_at TIMESTAMP
);

-- Relationships
CREATE TABLE evidence_relationships (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES evidence(id),
  target_id UUID REFERENCES evidence(id),
  type VARCHAR(50),
  confidence FLOAT,
  created_at TIMESTAMP
);

-- Audit Log (L3 Compliance)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(255),
  payload JSONB,
  signature TEXT,
  hash TEXT,
  timestamp TIMESTAMP
);
```

### 2.3 Enable pgvector

```bash
# Connect to PostgreSQL
psql wardennet

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Create index for faster searches
CREATE INDEX ON evidence USING ivfflat (embedding vector_cosine_ops);
```

---

## Phase 3: Elasticsearch Setup

### 3.1 Create Index

```bash
curl -X PUT http://localhost:9200/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "legal_analyzer": {
            "type": "standard",
            "stopwords": "_english_"
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "case_id": { "type": "keyword" },
        "title": { "type": "text", "analyzer": "legal_analyzer" },
        "content": { "type": "text", "analyzer": "legal_analyzer" },
        "classification": { "type": "keyword" },
        "status": { "type": "keyword" },
        "created_at": { "type": "date" }
      }
    }
  }'
```

### 3.2 Index Evidence

```bash
# Bulk index evidence
curl -X POST http://localhost:9200/evidence/_bulk \
  -H "Content-Type: application/json" \
  -d @scripts/evidence-bulk.jsonl
```

---

## Phase 4: Ollama Configuration

### 4.1 Pull Gemma Model

```bash
ollama pull gemma:7b
```

### 4.2 Verify Model

```bash
curl http://localhost:11434/api/tags | jq '.models[].name'
```

### 4.3 Test Query

```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma:7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

---

## Phase 5: Authentication Setup

### 5.1 Configure Lucia v3

```typescript
// src/lib/server/auth.ts
import { Lucia } from "lucia";
import { PostgresAdapter } from "@lucia-auth/adapter-postgresql";

const adapter = new PostgresAdapter(pool, {
  user: "auth_user",
  session: "auth_session"
});

export const auth = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production"
    }
  }
});
```

### 5.2 Create Auth Tables

```sql
CREATE TABLE auth_user (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  expires_at TIMESTAMP NOT NULL
);
```

---

## Phase 6: Audit Logging (L3 Compliance)

### 6.1 Enable Audit Mode

```typescript
// src/lib/server/audit.ts
import crypto from 'crypto';

export function generateSignature(
  userId: string,
  email: string,
  role: string,
  timestamp: string,
  payload: any
): string {
  const data = `${userId}${email}${role}${timestamp}${JSON.stringify(payload)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function logAction(
  userId: string,
  action: string,
  payload: any
): Promise<void> {
  const signature = generateSignature(
    userId,
    user.email,
    user.role,
    new Date().toISOString(),
    payload
  );

  await db.insert(auditLog).values({
    userId,
    action,
    payload,
    signature,
    hash: crypto.createHash('sha256').update(signature).digest('hex'),
    timestamp: new Date()
  });
}
```

### 6.2 Audit Mode Settings

```sql
CREATE TABLE warden_settings (
  id UUID PRIMARY KEY,
  audit_mode VARCHAR(3) DEFAULT 'L3',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- L3: Full forensic compliance (immutable)
-- L2: Versioned logging (mutable with history)
-- L1: Dev mode (minimal logging)
```

---

## Phase 7: Production Deployment

### 7.1 Build for Production

```bash
npm run build
```

### 7.2 Environment Variables (Production)

```env
# Security
NODE_ENV=production
AUTH_SECRET=<generate-secure-key>

# Database
DATABASE_URL=postgresql://prod_user:prod_pass@prod-db:5432/wardennet

# Ollama
OLLAMA_ENDPOINT=http://ollama-service:11434

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch-service:9200

# API
PUBLIC_API_URL=https://wardennet.example.com
```

### 7.3 Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "build/index.js"]
```

```bash
# Build image
docker build -t wardennet:latest .

# Run container
docker run -d \
  --name wardennet \
  -p 3000:3000 \
  --env-file .env.production \
  wardennet:latest
```

### 7.4 Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.8'

services:
  wardennet:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/wardennet
      OLLAMA_ENDPOINT: http://ollama:11434
      ELASTICSEARCH_URL: http://elasticsearch:9200
    depends_on:
      - postgres
      - elasticsearch
      - ollama

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: wardennet
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      discovery.type: single-node
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

volumes:
  postgres_data:
  elasticsearch_data:
  ollama_data:
```

```bash
# Deploy full stack
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f wardennet
```

---

## Phase 8: Monitoring & Maintenance

### 8.1 Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/api/health/db

# Ollama health
curl http://localhost:11434/api/tags

# Elasticsearch health
curl http://localhost:9200/_cluster/health
```

### 8.2 Performance Monitoring

```bash
# Database query performance
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

# Elasticsearch cluster stats
curl http://localhost:9200/_stats

# Ollama model performance
curl http://localhost:11434/api/tags | jq '.models[].size'
```

### 8.3 Backup Strategy

```bash
# PostgreSQL backup
pg_dump wardennet > backup.sql

# Restore
psql wardennet < backup.sql

# Elasticsearch snapshot
curl -X PUT http://localhost:9200/_snapshot/backup

# Ollama models backup
tar -czf ollama_backup.tar.gz ~/.ollama
```

---

## Phase 9: Security Hardening

### 9.1 SSL/TLS

```bash
# Generate certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Configure in SvelteKit
export HTTPS=true
export SSL_KEY_FILE=key.pem
export SSL_CERT_FILE=cert.pem
```

### 9.2 Rate Limiting

```typescript
// src/lib/server/rateLimit.ts
import { RateLimiter } from 'bottleneck';

export const limiter = new RateLimiter({
  minTime: 100, // ms between requests
  maxConcurrent: 10
});
```

### 9.3 Input Validation

```typescript
// Validate all user inputs
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1).max(1000),
  caseId: z.string().uuid().optional()
});

export async function POST({ request }) {
  const body = await request.json();
  const validated = querySchema.parse(body);
  // Process validated data
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ollama connection refused | Ensure `ollama serve` is running |
| Database connection error | Check `DATABASE_URL` and PostgreSQL is running |
| Elasticsearch not responding | Verify Elasticsearch container is running |
| Slow queries | Enable pgvector indexes and Elasticsearch caching |
| Out of memory | Reduce model size or increase system RAM |

---

## Next Steps

1. ✅ Complete local development setup
2. ✅ Test all endpoints
3. ✅ Configure production environment
4. ✅ Deploy to staging
5. ✅ Run security audit
6. ✅ Deploy to production
7. ✅ Monitor and maintain

---

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation: See `scripts/` directory
- Test endpoints: Use `scripts/test-ollama.sh`

