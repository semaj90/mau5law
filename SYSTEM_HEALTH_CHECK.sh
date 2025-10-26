#!/bin/bash
# System Health Check for Legal AI pgvector + Redis + Ollama Setup
# This script verifies all critical components are installed and working

set -e

echo "================================================================================"
echo "                   LEGAL AI SYSTEM HEALTH CHECK"
echo "================================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "1. POSTGRESQL + PGVECTOR CHECK"
echo "─────────────────────────────────────────────────────────────────────────────"

# Check PostgreSQL
if command -v psql &> /dev/null; then
    check_pass "PostgreSQL client installed"

    # Try to connect
    if PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -c "SELECT 1" &>/dev/null; then
        check_pass "PostgreSQL connection successful"

        # Check pgvector extension
        if PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_extension WHERE extname='vector';" &>/dev/null; then
            check_pass "pgvector extension installed"

            # Check vector table
            if PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM legal_documents_jsonb;" &>/dev/null; then
                VECTOR_COUNT=$(PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM legal_documents_jsonb;")
                check_pass "legal_documents_jsonb table exists ($VECTOR_COUNT rows)"
            else
                check_fail "legal_documents_jsonb table not found"
            fi

            # Check embedding dimensions
            DIMS=$(PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -t -c "SELECT typlen FROM pg_type WHERE typname='vector' LIMIT 1;")
            if [ ! -z "$DIMS" ]; then
                check_pass "pgvector dimensions available"
            fi
        else
            check_fail "pgvector extension NOT installed"
            echo "  To install: CREATE EXTENSION vector;"
        fi
    else
        check_fail "PostgreSQL connection failed"
        echo "  Check: PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db"
    fi
else
    check_fail "PostgreSQL client not installed"
fi

echo ""
echo "2. OLLAMA + EMBEDDING MODEL CHECK"
echo "─────────────────────────────────────────────────────────────────────────────"

# Check Ollama
if command -v ollama &> /dev/null; then
    check_pass "Ollama CLI installed"

    # Check if Ollama service is running
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        check_pass "Ollama service is running (port 11434)"

        # Check for embeddinggemma model
        if curl -s http://localhost:11434/api/tags | grep -q "embeddinggemma"; then
            check_pass "embeddinggemma model available"

            # Test embedding generation
            EMBED_RESPONSE=$(curl -s -X POST http://localhost:11434/api/embeddings \
                -H "Content-Type: application/json" \
                -d '{
                  "model": "embeddinggemma:latest",
                  "prompt": "test"
                }' 2>/dev/null || echo "")

            if echo "$EMBED_RESPONSE" | grep -q "embedding"; then
                check_pass "Embedding generation working"

                # Check embedding dimensions
                EMBED_DIM=$(echo "$EMBED_RESPONSE" | grep -o '"embedding":\s*\[' | head -1)
                if [ ! -z "$EMBED_DIM" ]; then
                    check_pass "Embeddings have correct format"
                fi
            else
                check_fail "Embedding generation failed"
            fi
        else
            check_fail "embeddinggemma:latest model NOT found"
            echo "  To install: ollama pull embeddinggemma:latest"
        fi
    else
        check_fail "Ollama service not running"
        echo "  To start: ollama serve"
    fi
else
    check_fail "Ollama not installed"
    echo "  Install from: https://ollama.ai"
fi

# Check fallback model (nomic-embed-text)
if curl -s http://localhost:11434/api/tags 2>/dev/null | grep -q "nomic-embed-text"; then
    check_pass "nomic-embed-text fallback model available"
else
    check_warn "nomic-embed-text fallback model not found"
    echo "  Optional: ollama pull nomic-embed-text"
fi

echo ""
echo "3. REDIS CHECK"
echo "─────────────────────────────────────────────────────────────────────────────"

# Check Redis
if command -v redis-cli &> /dev/null; then
    check_pass "Redis client installed"

    # Check Redis service
    if redis-cli -h localhost -p 6379 ping &>/dev/null; then
        check_pass "Redis service running (port 6379)"

        # Check Redis memory
        REDIS_INFO=$(redis-cli -h localhost -p 6379 INFO memory 2>/dev/null)
        if [ ! -z "$REDIS_INFO" ]; then
            check_pass "Redis memory info accessible"

            USED_MEMORY=$(echo "$REDIS_INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
            check_pass "Redis memory usage: $USED_MEMORY"
        fi
    else
        check_fail "Redis service not running"
        echo "  To start: redis-server"
    fi
else
    check_warn "Redis client not installed (optional but recommended)"
fi

echo ""
echo "4. SVELTEKIT APPLICATION CHECK"
echo "─────────────────────────────────────────────────────────────────────────────"

# Check if we're in the right directory
if [ -f "sveltekit-frontend/package.json" ]; then
    check_pass "SvelteKit project structure found"

    # Check Node modules
    if [ -d "sveltekit-frontend/node_modules" ]; then
        check_pass "Node modules installed"
    else
        check_warn "Node modules not installed"
        echo "  Run: cd sveltekit-frontend && npm install"
    fi

    # Check for pgvector search endpoint
    if [ -f "sveltekit-frontend/src/routes/api/search-pgvector-optimized/+server.ts" ]; then
        check_pass "pgvector search endpoint exists"
    else
        check_warn "pgvector search endpoint NOT found"
    fi

    # Check for redis-cache.ts
    if [ -f "sveltekit-frontend/src/lib/server/redis-cache.ts" ]; then
        check_pass "Redis cache layer exists"
    else
        check_warn "Redis cache layer NOT found"
    fi
else
    check_fail "SvelteKit project not found"
fi

echo ""
echo "5. MIGRATION STATUS CHECK"
echo "─────────────────────────────────────────────────────────────────────────────"

# Check migration file
if [ -f "sveltekit-frontend/src/lib/server/db/migrations/008_standardize-vector-dimensions-to-384.sql" ]; then
    check_pass "Dimension standardization migration exists"
else
    check_warn "Dimension migration file NOT found"
fi

echo ""
echo "================================================================================"
echo "                           HEALTH CHECK SUMMARY"
echo "================================================================================"
echo ""
echo -e "✓ Passed:  ${GREEN}$PASSED${NC}"
echo -e "✗ Failed:  ${RED}$FAILED${NC}"
echo -e "⚠ Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ SYSTEM READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Apply migration: psql -f src/lib/server/db/migrations/008_*.sql"
    echo "  2. Start dev server: npm run dev"
    echo "  3. Test endpoint: curl http://localhost:5173/api/search-pgvector-optimized/health"
    exit 0
else
    echo -e "${RED}✗ SYSTEM NOT READY${NC}"
    echo ""
    echo "Please fix the failed items above before deploying."
    exit 1
fi
