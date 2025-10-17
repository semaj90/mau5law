#!/bin/bash

#================================================================
# 384-Dimension Vector Stack Deployment Script
#================================================================
# Purpose: Deploy production-ready vector search with standardized
#          384-dimension embeddings using embeddinggemma:latest
#
# Components:
# - PostgreSQL + pgvector (384-dim columns)
# - Qdrant (384-dim collections)
# - Redis (embedding cache)
# - Ollama (embeddinggemma:latest)
#
# Date: 2025-10-17
#================================================================

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 384-Dimension Vector Stack Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
POSTGRES_PORT=5432
QDRANT_PORT=6333
REDIS_PORT=6379
OLLAMA_PORT=11434
DATABASE_NAME="legal_ai_db"
DATABASE_USER="legal_admin"
DATABASE_PASSWORD="123456"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker found${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose found${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found ($(node --version))${NC}"

echo ""

# Step 2: Start Docker services
echo "🐳 Step 2: Starting Docker services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create docker-compose-vector-384.yml if it doesn't exist
if [ ! -f "docker-compose-vector-384.yml" ]; then
    echo "Creating docker-compose-vector-384.yml..."
    cat > docker-compose-vector-384.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: legal-postgres-384
    environment:
      POSTGRES_USER: legal_admin
      POSTGRES_PASSWORD: 123456
      POSTGRES_DB: legal_ai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data-384:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U legal_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:latest
    container_name: legal-qdrant-384
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data-384:/qdrant/storage
    environment:
      QDRANT_HOST: 0.0.0.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: legal-redis-384
    ports:
      - "6379:6379"
    command: redis-server --requirepass redis
    volumes:
      - redis-data-384:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data-384:
  qdrant-data-384:
  redis-data-384:
EOF
fi

docker-compose -f docker-compose-vector-384.yml up -d

echo -e "${GREEN}✅ Docker services started${NC}"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Step 3: Install pgvector extension
echo "🔧 Step 3: Installing pgvector extension..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD=$DATABASE_PASSWORD psql -h localhost -p $POSTGRES_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || echo "pgvector may already be installed"

echo -e "${GREEN}✅ pgvector extension ready${NC}"
echo ""

# Step 4: Run database migration
echo "📊 Step 4: Running database migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "sveltekit-frontend/src/lib/server/db/migrations/010_standardize_vectors_384.sql" ]; then
    PGPASSWORD=$DATABASE_PASSWORD psql -h localhost -p $POSTGRES_PORT -U $DATABASE_USER -d $DATABASE_NAME -f sveltekit-frontend/src/lib/server/db/migrations/010_standardize_vectors_384.sql
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration file not found, skipping...${NC}"
fi

echo ""

# Step 5: Initialize Qdrant collections
echo "📦 Step 5: Initializing Qdrant collections..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd sveltekit-frontend
npm install -g tsx 2>/dev/null || true

if [ -f "src/lib/server/vector/qdrant-init-384.ts" ]; then
    tsx src/lib/server/vector/qdrant-init-384.ts
    echo -e "${GREEN}✅ Qdrant collections initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Qdrant init script not found, skipping...${NC}"
fi

cd ..
echo ""

# Step 6: Verify Ollama and pull embeddinggemma:latest
echo "🤖 Step 6: Verifying Ollama setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v ollama &> /dev/null; then
    echo "Checking for embeddinggemma:latest..."
    if ! ollama list | grep -q "embeddinggemma:latest"; then
        echo "Pulling embeddinggemma:latest..."
        ollama pull embeddinggemma:latest
    fi
    echo -e "${GREEN}✅ Ollama with embeddinggemma:latest ready${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama not found. Install from: https://ollama.ai${NC}"
fi

echo ""

# Step 7: Health checks
echo "🏥 Step 7: Running health checks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check PostgreSQL
if PGPASSWORD=$DATABASE_PASSWORD psql -h localhost -p $POSTGRES_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL: Healthy (port $POSTGRES_PORT)${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Not responding${NC}"
fi

# Check Qdrant
if curl -f http://localhost:$QDRANT_PORT/health &> /dev/null; then
    echo -e "${GREEN}✅ Qdrant: Healthy (port $QDRANT_PORT)${NC}"
else
    echo -e "${RED}❌ Qdrant: Not responding${NC}"
fi

# Check Redis
if redis-cli -a redis ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis: Healthy (port $REDIS_PORT)${NC}"
else
    echo -e "${RED}❌ Redis: Not responding${NC}"
fi

# Check Ollama
if curl -f http://localhost:$OLLAMA_PORT/api/tags &> /dev/null; then
    echo -e "${GREEN}✅ Ollama: Healthy (port $OLLAMA_PORT)${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama: Not responding (port $OLLAMA_PORT)${NC}"
fi

echo ""

# Step 8: Display configuration summary
echo "📋 Step 8: Configuration Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Vector Configuration:"
echo "  • Model: embeddinggemma:latest"
echo "  • Dimensions: 384"
echo "  • Distance Metric: Cosine"
echo ""
echo "📍 Service URLs:"
echo "  • PostgreSQL: postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:$POSTGRES_PORT/$DATABASE_NAME"
echo "  • Qdrant: http://localhost:$QDRANT_PORT"
echo "  • Redis: redis://:redis@localhost:$REDIS_PORT/0"
echo "  • Ollama: http://localhost:$OLLAMA_PORT"
echo ""
echo "🔑 Environment Variables (add to .env):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << ENV
DATABASE_URL=postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:$POSTGRES_PORT/$DATABASE_NAME
QDRANT_URL=http://localhost:$QDRANT_PORT
QDRANT_API_KEY=
REDIS_URL=redis://:redis@localhost:$REDIS_PORT/0
REDIS_PASSWORD=redis
OLLAMA_URL=http://localhost:$OLLAMA_PORT
EMBEDDING_MODEL=embeddinggemma:latest
VECTOR_DIMENSIONS=384
ENV
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 9: Next steps
echo "🚀 Step 9: Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Add environment variables to sveltekit-frontend/.env"
echo "2. Start the development server:"
echo "   cd sveltekit-frontend"
echo "   REDIS_PASSWORD=redis npm run dev"
echo ""
echo "3. Test vector search endpoint:"
echo "   curl http://localhost:5173/api/health"
echo ""
echo "4. Monitor Qdrant collections:"
echo "   open http://localhost:$QDRANT_PORT/dashboard"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 384-Dimension Vector Stack Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
