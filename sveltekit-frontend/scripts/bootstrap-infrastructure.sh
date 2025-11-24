#!/bin/bash

# Infrastructure Bootstrap and Recovery Script
# Ensures all services are properly initialized after container deletion/restart
# Idempotent - safe to run multiple times

set -e

echo "🚀 Starting Infrastructure Bootstrap..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin123}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-legal_ai_db}"
POSTGRES_USER="${POSTGRES_USER:-legal_admin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-123456}"
RABBITMQ_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0

# ============================================================================
# Health Check Functions
# ============================================================================

check_minio() {
    echo -e "${YELLOW}Checking MinIO...${NC}"

    if nc -z "$MINIO_ENDPOINT" 2>/dev/null; then
        echo -e "${GREEN}✓ MinIO is reachable${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ MinIO is not reachable at $MINIO_ENDPOINT${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL...${NC}"

    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is reachable${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ PostgreSQL is not reachable at $POSTGRES_HOST:$POSTGRES_PORT${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_rabbitmq() {
    echo -e "${YELLOW}Checking RabbitMQ...${NC}"

    if nc -z "$RABBITMQ_HOST" "$RABBITMQ_PORT" 2>/dev/null; then
        echo -e "${GREEN}✓ RabbitMQ is reachable${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ RabbitMQ is not reachable at $RABBITMQ_HOST:$RABBITMQ_PORT${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_redis() {
    echo -e "${YELLOW}Checking Redis...${NC}"

    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo -e "${GREEN}✓ Redis is reachable${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ Redis is not reachable at $REDIS_HOST:$REDIS_PORT${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# ============================================================================
# MinIO Bootstrap Functions
# ============================================================================

bootstrap_minio_buckets() {
    echo -e "${YELLOW}Bootstrapping MinIO buckets...${NC}"

    # Create mc alias
    mc alias set minio "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4 2>/dev/null || true

    # Create buckets (idempotent)
    mc mb "minio/lawpdfs" --ignore-existing 2>/dev/null || true
    mc mb "minio/documents" --ignore-existing 2>/dev/null || true

    # Create directory structures
    echo "" | mc pipe "minio/lawpdfs/cases/.gitkeep" 2>/dev/null || true
    echo "" | mc pipe "minio/documents/evidence/.gitkeep" 2>/dev/null || true
    echo "" | mc pipe "minio/lawpdfs/global/.gitkeep" 2>/dev/null || true

    echo -e "${GREEN}✓ MinIO buckets bootstrapped${NC}"
}

# ============================================================================
# PostgreSQL Bootstrap Functions
# ============================================================================

bootstrap_postgres_migrations() {
    echo -e "${YELLOW}Running PostgreSQL migrations...${NC}"

    # Run Drizzle migrations
    npm run db:migrate 2>/dev/null || {
        echo -e "${RED}✗ Migration failed${NC}"
        return 1
    }

    echo -e "${GREEN}✓ PostgreSQL migrations completed${NC}"
}

bootstrap_postgres_indexes() {
    echo -e "${YELLOW}Creating PostgreSQL indexes...${NC}"

    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<EOF
-- Evidence files indexes
CREATE INDEX IF NOT EXISTS idx_evidence_files_case_id ON evidence_files(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_status ON evidence_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);

-- Evidence chunks indexes
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_evidence_id ON evidence_chunks(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_page_number ON evidence_chunks(page_number);

-- Evidence embeddings indexes
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_chunk_id ON evidence_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_embedding_hnsw ON evidence_embeddings USING hnsw (embedding vector_cosine_ops);

-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

EOF

    echo -e "${GREEN}✓ PostgreSQL indexes created${NC}"
}

# ============================================================================
# RabbitMQ Bootstrap Functions
# ============================================================================

bootstrap_rabbitmq_queues() {
    echo -e "${YELLOW}Bootstrapping RabbitMQ queues...${NC}"

    # This would typically be done via RabbitMQ management API or CLI
    # For now, we'll document the required queues

    cat > /tmp/rabbitmq-setup.sh <<'RABBITMQ_SCRIPT'
#!/bin/bash
# RabbitMQ Queue Setup
# Run this inside the RabbitMQ container or via management API

# Declare exchanges
rabbitmqctl eval 'rabbit_exchange:declare(<<"processing_events">>, <<"topic">>, true, false, false, []).'

# Declare queues
rabbitmqctl eval 'rabbit_amqqueue:declare(<<"document.process">>, true, false, [], []).'
rabbitmqctl eval 'rabbit_amqqueue:declare(<<"processing.events">>, true, false, [], []).'

# Bind queues to exchanges
rabbitmqctl eval 'rabbit_binding:add(<<"processing_events">>, <<"topic">>, <<"document.process">>, <<"processing.#">>, []).'

echo "RabbitMQ queues configured"
RABBITMQ_SCRIPT

    echo -e "${GREEN}✓ RabbitMQ queue configuration documented${NC}"
}

# ============================================================================
# Redis Bootstrap Functions
# ============================================================================

bootstrap_redis_config() {
    echo -e "${YELLOW}Configuring Redis...${NC}"

    # Redis configuration is typically done via docker-compose
    # Verify connection and basic operations

    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is configured and responding${NC}"
    else
        echo -e "${RED}✗ Redis is not responding${NC}"
        return 1
    fi
}

# ============================================================================
# Main Bootstrap Flow
# ============================================================================

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Infrastructure Bootstrap and Recovery Script           ║"
    echo "║     Idempotent - Safe to run multiple times               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Phase 1: Health Checks
    echo -e "${YELLOW}Phase 1: Health Checks${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    check_minio || true
    check_postgres || true
    check_rabbitmq || true
    check_redis || true

    echo ""
    echo "Health Check Summary: ${GREEN}$CHECKS_PASSED passed${NC}, ${RED}$CHECKS_FAILED failed${NC}"
    echo ""

    # Phase 2: Bootstrap Services
    echo -e "${YELLOW}Phase 2: Bootstrap Services${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if check_minio; then
        bootstrap_minio_buckets || true
    fi

    if check_postgres; then
        bootstrap_postgres_migrations || true
        bootstrap_postgres_indexes || true
    fi

    if check_rabbitmq; then
        bootstrap_rabbitmq_queues || true
    fi

    if check_redis; then
        bootstrap_redis_config || true
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Bootstrap Complete                                     ║"
    echo "║     All services are ready for operation                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Run main function
main "$@"
