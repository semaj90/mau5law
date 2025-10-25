#!/bin/bash

# Test Vector Search + RAG Integration
# Tests all components after HNSW index creation

set -e

echo "🧪 Testing Vector Search + RAG Integration"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test results
test_result() {
  local test_name=$1
  local result=$2

  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    ((TESTS_FAILED++))
  fi
}

# Test 1: PostgreSQL Connection
echo "📋 Test 1: PostgreSQL Connection"
PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1;" > /dev/null 2>&1
test_result "PostgreSQL connection" $?
echo ""

# Test 2: pgvector Extension
echo "📋 Test 2: pgvector Extension"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT extname FROM pg_extension WHERE extname='vector';" 2>/dev/null)
if [ "$RESULT" = "vector" ]; then
  echo -e "${GREEN}✅ PASS${NC}: pgvector extension installed"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: pgvector extension not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: Evidence Table Embedding Column
echo "📋 Test 3: Evidence Table Embedding Column"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT data_type FROM information_schema.columns WHERE table_name='evidence' AND column_name='embedding';" 2>/dev/null)
if [[ "$RESULT" == *"USER-DEFINED"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: evidence.embedding column exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: evidence.embedding column not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: Documents Table Embedding Column
echo "📋 Test 4: Documents Table Embedding Column"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT data_type FROM information_schema.columns WHERE table_name='documents' AND column_name='embedding';" 2>/dev/null)
if [[ "$RESULT" == *"USER-DEFINED"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: documents.embedding column exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: documents.embedding column not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 5: Documents Table Title Column
echo "📋 Test 5: Documents Table Title Column"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT data_type FROM information_schema.columns WHERE table_name='documents' AND column_name='title';" 2>/dev/null)
if [[ "$RESULT" == *"character varying"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: documents.title column exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: documents.title column not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 6: HNSW Index on Evidence
echo "📋 Test 6: HNSW Index on Evidence Table"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT indexname FROM pg_indexes WHERE tablename='evidence' AND indexname LIKE '%hnsw%';" 2>/dev/null)
if [[ "$RESULT" == *"idx_evidence_embedding_hnsw"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: evidence HNSW index exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: evidence HNSW index not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 7: HNSW Index on Documents
echo "📋 Test 7: HNSW Index on Documents Table"
RESULT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT indexname FROM pg_indexes WHERE tablename='documents' AND indexname LIKE '%hnsw%';" 2>/dev/null)
if [[ "$RESULT" == *"idx_documents_embedding_hnsw"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: documents HNSW index exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: documents HNSW index not found"
  ((TESTS_FAILED++))
fi
echo ""

# Test 8: Redis Connection
echo "📋 Test 8: Redis Connection with Authentication"
RESULT=$(redis-cli -a redis ping 2>/dev/null)
if [ "$RESULT" = "PONG" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Redis authenticated and responding"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Redis connection failed"
  ((TESTS_FAILED++))
fi
echo ""

# Test 9: Ollama Connection
echo "📋 Test 9: Ollama Embeddings Service"
RESULT=$(curl -s http://localhost:11434/api/tags 2>/dev/null | grep -q "embedding" && echo "found" || echo "notfound")
if [ "$RESULT" = "found" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Ollama embeddings available"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠️  WARNING${NC}: Ollama embeddings might not be available"
  echo "        Run: ollama pull embeddinggemma:latest"
  ((TESTS_FAILED++))
fi
echo ""

# Test 10: API Health Endpoint
echo "📋 Test 10: Vector Search API Health Check"
RESULT=$(curl -s http://localhost:5173/api/search-drizzle-pgvector 2>/dev/null | grep -q "healthy" && echo "healthy" || echo "unhealthy")
if [ "$RESULT" = "healthy" ]; then
  echo -e "${GREEN}✅ PASS${NC}: API health endpoint responding"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠️  WARNING${NC}: API might not be running"
  echo "        Run: npm run dev"
  ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Your vector search + RAG integration is ready:"
  echo "  • HNSW indexes: Active (20-40x speedup)"
  echo "  • Database schema: Aligned with Drizzle ORM"
  echo "  • Redis: Authenticated and ready"
  echo "  • API: Responding to health checks"
  echo ""
  echo "Next steps:"
  echo "  1. Upload documents via /api/rag/upload"
  echo "  2. Test vector search at /api/search-drizzle-pgvector"
  echo "  3. Monitor query performance in PostgreSQL"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  echo ""
  echo "Issues to resolve:"
  if [ "$RESULT" = "notfound" ]; then
    echo "  • Ollama: Pull embedding model with 'ollama pull embeddinggemma:latest'"
  fi
  echo ""
  echo "See HNSW_AND_RAG_INTEGRATION_FIXES.md for troubleshooting"
  exit 1
fi
