# Copilot Development Instructions

## 🚀 Quick Start - Using Docker Environments with npm run dev:quic

### Development Server with Full Docker Environment Setup

```bash
# Option 1: Using npm script (recommended)
npm run dev:quic:simple

# Option 2: Manual with all Docker environment variables
REDIS_PASSWORD="redis" \
DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" \
VECTOR_BACKEND="pgvector" \
EMBEDDING_MODEL="gemma" \
EMBEDDING_DIMENSION="768" \
OLLAMA_URL="http://localhost:11434" \
REDIS_URL="redis://127.0.0.1:6379/0" \
npm run dev:quic:simple

# Option 3: Full stack with Docker containers
docker-compose up -d redis postgres ollama
npm run dev:quic
```

---

## 📋 Essential Docker Environment Variables

All environment variables should be set when running development servers or building for production.

### Database Configuration
```bash
DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db"
```
- PostgreSQL connection string with pgvector extension
- Required for all database operations
- Must include username, password, host, port, and database name

### Redis Configuration
```bash
REDIS_URL="redis://127.0.0.1:6379/0"
REDIS_PASSWORD="redis"
```
- Redis cache connection for embeddings and search results
- REDIS_PASSWORD required for authentication
- Used by vector service for caching

### Vector Search Configuration
```bash
VECTOR_BACKEND="pgvector"        # Options: pgvector, pinecone, qdrant, faiss
EMBEDDING_MODEL="gemma"           # Options: gemma, openai, nomic (default: gemma)
EMBEDDING_DIMENSION="768"         # Vector dimension (default: 768 for Gemma)
OLLAMA_URL="http://localhost:11434"
```

### Optional - Pinecone Backend
```bash
PINECONE_API_KEY="your-api-key"
PINECONE_ENVIRONMENT="us-west-2-gpu"
PINECONE_INDEX_NAME="legal-ai-documents"
```

### Optional - Qdrant Backend
```bash
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="optional-api-key"
QDRANT_COLLECTION="legal-documents"
```

---

## 🔍 Vector Search API Endpoint

### Overview
The unified vector search service is available at `/api/search/vector` with production-ready Docker environment support.

### Endpoint: `POST /api/search/vector`

**Request:**
```json
{
  "query": "employment termination clause",
  "limit": 10,
  "threshold": 0.6,
  "metadata_filter": {
    "document_type": "contract"
  },
  "include_metadata": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc_123",
        "score": 0.92,
        "content": "...",
        "metadata": { "document_type": "contract" }
      }
    ],
    "total_results": 1,
    "execution_time_ms": 45,
    "backend": "pgvector",
    "embedding_model": "gemma"
  }
}
```

### Testing with curl

```bash
# Simple query
curl -X POST http://localhost:5174/api/search/vector \
  -H "Content-Type: application/json" \
  -d '{"query": "employment contract"}'

# With metadata filter
curl -X POST http://localhost:5174/api/search/vector \
  -H "Content-Type: application/json" \
  -d '{
    "query": "termination clause",
    "limit": 20,
    "threshold": 0.7,
    "metadata_filter": {"document_type": "contract"},
    "include_metadata": true
  }'

# Health check
curl http://localhost:5174/api/search/vector
```

---

## 🐳 Docker Services Required

### PostgreSQL with pgvector
```bash
docker run -d \
  --name legal-ai-postgres \
  -e POSTGRES_USER=legal_admin \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=legal_ai_db \
  -p 5432:5432 \
  pgvector/pgvector:pg15
```

### Redis
```bash
docker run -d \
  --name legal-ai-redis \
  -e REDIS_PASSWORD=redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass redis
```

### Ollama (for embeddings)
```bash
docker run -d \
  --name legal-ai-ollama \
  -p 11434:11434 \
  ollama/ollama
```

Pull the embedding model:
```bash
ollama pull embeddinggemma:latest
ollama pull gemma:7b
```

### Docker Compose (all-in-one)
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: legal_admin
      POSTGRES_PASSWORD: '123456'
      POSTGRES_DB: legal_ai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  postgres_data:
  redis_data:
  ollama_data:
```

---

## 🎯 Common Development Workflows

### 1. Start Complete Development Environment
```bash
# Step 1: Start Docker services
docker-compose -f docker-compose.yml up -d

# Step 2: Wait for services to be ready (10-30 seconds)
sleep 30

# Step 3: Pull required embedding models
docker exec legal-ai-ollama ollama pull embeddinggemma:latest

# Step 4: Start SvelteKit dev server
REDIS_PASSWORD="redis" \
DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" \
VECTOR_BACKEND="pgvector" \
EMBEDDING_MODEL="gemma" \
npm run dev:quic:simple
```

### 2. Test Vector Search Endpoint
```bash
# After starting dev server, test the endpoint:
curl -X POST http://localhost:5174/api/search/vector \
  -H "Content-Type: application/json" \
  -d '{"query":"test query"}'
```

### 3. Monitor Service Health
```bash
# Check vector service health
curl http://localhost:5174/api/search/vector

# Expected response:
{
  "success": true,
  "status": "healthy",
  "services": {
    "vectorBackend": "pgvector",
    "embeddingModel": "gemma",
    "redis": "operational",
    "database": "operational",
    "ollama": "operational"
  }
}
```

### 4. View Service Logs
```bash
# SvelteKit dev server
# Logs appear in terminal

# Docker services
docker logs legal-ai-postgres   # Database logs
docker logs legal-ai-redis      # Redis logs
docker logs legal-ai-ollama     # Ollama logs
```

---

## 🔧 npm Scripts

### Available Scripts
```bash
# Development with QUIC protocol
npm run dev:quic              # Full stack
npm run dev:quic:simple       # Simplified (recommended)
npm run dev:quic:local        # Local-only
npm run dev:quic:full         # Full features

# Production
npm run build                 # Build for production
npm run preview               # Preview production build

# Database
npm run db:migrate            # Run migrations
npm run db:seed               # Seed test data
npm run db:introspect         # Introspect existing schema

# Type checking
npm run check                 # Run TypeScript check
npm run check:ultra-fast      # Fast type checking
```

---

## 🔐 Environment Variable Checklist

Before starting development, ensure these are set:

```bash
# Required
✓ DATABASE_URL                # PostgreSQL connection
✓ REDIS_PASSWORD              # Redis authentication

# Recommended
✓ VECTOR_BACKEND              # Vector search backend (default: pgvector)
✓ EMBEDDING_MODEL             # Embedding model (default: gemma)
✓ OLLAMA_URL                  # Ollama service URL (default: http://localhost:11434)

# Optional (based on backend)
  PINECONE_API_KEY            # If using Pinecone
  QDRANT_URL                  # If using Qdrant
  VECTOR_AI_KEY               # If using other services
```

---

## 📝 Implementation Notes

### Vector Service Files
- **Service**: `src/lib/server/services/unified-vector-service.ts`
- **Endpoint**: `src/routes/api/search/vector/+server.ts`
- **Configuration**: Uses Docker environment variables for all settings

### Key Features
- ✅ Multiple vector backend support (pgvector, Pinecone, Qdrant, FAISS)
- ✅ Embedding model flexibility (Gemma, OpenAI, Nomic)
- ✅ Redis caching for embeddings and search results
- ✅ Metadata filtering and hybrid search
- ✅ Health checks and monitoring
- ✅ Production-ready error handling
- ✅ Detailed execution metrics

### Performance Considerations
- Embeddings are cached in Redis (24-hour TTL)
- Search results are cached (1-hour TTL)
- pgvector uses cosine similarity for optimal performance
- Metadata filters reduce result set before vector comparison

---

## 🚨 Troubleshooting

### Vector Search Not Working
```bash
# 1. Check health endpoint
curl http://localhost:5174/api/search/vector

# 2. Check environment variables
env | grep -E "DATABASE_URL|REDIS_PASSWORD|EMBEDDING_MODEL"

# 3. Check Docker services are running
docker ps | grep -E "postgres|redis|ollama"

# 4. Check server logs for errors
# Look for [Vector Service] error messages
```

### Redis Connection Issues
```bash
# Check Redis is running and accepting connections
redis-cli -a redis ping
# Expected response: PONG

# If not, restart Redis
docker restart legal-ai-redis
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1"

# If fails, restart PostgreSQL
docker restart legal-ai-postgres
```

### Ollama Model Not Found
```bash
# Pull the required models
docker exec legal-ai-ollama ollama pull embeddinggemma:latest
docker exec legal-ai-ollama ollama pull gemma:7b

# List available models
docker exec legal-ai-ollama ollama list
```

---

## 🔄 Useful Commands

```bash
# Kill all Node processes (if stuck)
pkill -f "node"

# Clear Redis cache
redis-cli -a redis FLUSHALL

# Reset database
docker exec legal-ai-postgres psql -U legal_admin -d legal_ai_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Monitor CPU/Memory usage
docker stats legal-ai-postgres legal-ai-redis legal-ai-ollama
```

---

## 📚 Related Documentation

- **Vector Search Guide**: `VECTOR_SEARCH_GUIDE.md`
- **Development Setup**: `DEVELOPMENT_SETUP.md`
- **API Documentation**: `API_DOCUMENTATION.md`
- **Database Schema**: `src/lib/server/db/schema-postgres.ts`

---

**Last Updated**: 2025-10-26
**Status**: ✅ Production-Ready
**Framework**: SvelteKit 2.43.5+ with Svelte 5
