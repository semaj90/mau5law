#!/bin/bash

# ============================================================================
# FILE UPLOAD TEST FOR LEGAL AI PLATFORM
# ============================================================================
# This script will:
# 1. Start the SvelteKit dev server
# 2. Wait for it to be ready
# 3. Test file upload via REST API
# 4. Verify MinIO storage
# 5. Monitor embedding pipeline
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  LEGAL AI PLATFORM - FILE UPLOAD TEST                 ║"
echo "║  REST API → MinIO → Embedding Pipeline                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd /c/Users/james/Videos/deeds-web-app/sveltekit-frontend

# ============================================================================
# STEP 1: Start Dev Server
# ============================================================================
echo -e "${YELLOW}📦 STEP 1: Starting SvelteKit Dev Server${NC}"
echo "  Command: npm run dev:quic:simple"
echo "  Port: 5174"
echo "  Auth: DISABLED (DEV_BYPASS_AUTH=true)"
echo ""

# Start dev server in background
npm run dev:quic:simple > /tmp/dev-server.log 2>&1 &
DEV_PID=$!
echo -e "${GREEN}✓ Server process started (PID: $DEV_PID)${NC}"

# ============================================================================
# STEP 2: Wait for Server to be Ready
# ============================================================================
echo ""
echo -e "${YELLOW}⏳ STEP 2: Waiting for Server to be Ready${NC}"
echo "  Checking: http://localhost:5174/api/health/status"
echo ""

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s -f http://localhost:5174/api/health/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo -ne "\r  Attempt $ATTEMPT/$MAX_ATTEMPTS - Waiting..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo -e "${RED}✗ Server failed to start${NC}"
  echo -e "${RED}  Check: tail -f /tmp/dev-server.log${NC}"
  kill $DEV_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo ""

# ============================================================================
# STEP 3: Check Dependencies
# ============================================================================
echo -e "${YELLOW}🔍 STEP 3: Checking Dependencies${NC}"
echo ""

# Check MinIO
echo -n "  MinIO (localhost:9000): "
if curl -s -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Running${NC}"
else
  echo -e "${YELLOW}⚠ Check Docker containers${NC}"
fi

# Check Redis
echo -n "  Redis (localhost:6379): "
if redis-cli -p 6379 ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Running${NC}"
else
  echo -e "${YELLOW}⚠ May not be responding${NC}"
fi

# Check PostgreSQL
echo -n "  PostgreSQL (localhost:5432): "
if PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Running${NC}"
else
  echo -e "${YELLOW}⚠ Check connection${NC}"
fi

# Check Ollama
echo -n "  Ollama (localhost:11434): "
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Running${NC}"
else
  echo -e "${YELLOW}⚠ Start with: ollama serve${NC}"
fi

echo ""

# ============================================================================
# STEP 4: Test File Upload
# ============================================================================
echo -e "${YELLOW}📤 STEP 4: Testing File Upload${NC}"
echo ""

# Create test file
TEST_FILE="/tmp/test_evidence.txt"
cat > "$TEST_FILE" << 'EOF'
LEGAL DOCUMENT - TEST EVIDENCE

Case: Test Case v. Legal AI Platform
Date: $(date)
Type: Evidence Document

This is a test document for the file upload and embedding pipeline.

Content Areas:
- Evidence Classification
- Document Type: Legal Brief
- Confidence: High
- AI Processing Status: Pending

Document Summary:
Testing the complete flow of uploading a legal document through the REST API,
storing it in MinIO, indexing it with Ollama embeddings (embeddinggemma:latest),
and making it available for RAG-based semantic search.

Expected Processing:
1. ✓ Upload via REST API
2. ⏳ Store in MinIO legal-evidence bucket
3. ⏳ Persist metadata in PostgreSQL
4. ⏳ Generate embeddings with embeddinggemma
5. ⏳ Index in pgvector with HNSW
6. ⏳ Secondary index in Qdrant
7. ⏳ Cache in Redis
8. ⏳ Available for RAG queries
EOF

CASE_ID="case-test-$(date +%s)"

echo "  Test File: $TEST_FILE"
echo "  Case ID: $CASE_ID"
echo "  File Size: $(stat -f%z $TEST_FILE 2>/dev/null || wc -c < $TEST_FILE) bytes"
echo ""
echo -e "${YELLOW}  Uploading...${NC}"

UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:5174/api/evidence/upload" \
  -F "file=@$TEST_FILE" \
  -F "caseId=$CASE_ID" \
  -F "evidenceType=document" \
  -F "title=Test Evidence Document" \
  -F "description=Test file for RAG pipeline validation")

echo ""
echo -e "${YELLOW}  Response:${NC}"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Extract evidence ID
EVIDENCE_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.evidenceId // .data.evidenceId // empty' 2>/dev/null)

if [ -z "$EVIDENCE_ID" ] && echo "$UPLOAD_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✅ Upload successful${NC}"
elif echo "$UPLOAD_RESPONSE" | grep -q "evidenceId\|success"; then
  echo -e "${GREEN}✅ Upload successful${NC}"
  echo "  Evidence ID: $EVIDENCE_ID"
else
  echo -e "${RED}✗ Upload may have failed${NC}"
fi

echo ""

# ============================================================================
# STEP 5: Monitor Pipeline
# ============================================================================
echo -e "${YELLOW}📊 STEP 5: Monitoring Pipeline${NC}"
echo ""

echo "  The following should happen automatically:"
echo "  1. File stored in MinIO"
echo "  2. Metadata inserted in PostgreSQL"
echo "  3. RabbitMQ job queued"
echo "  4. Ollama generates embeddings (768 dimensions)"
echo "  5. Vectors stored in pgvector + Qdrant"
echo ""

# Check PostgreSQL for evidence
echo -e "${YELLOW}  Checking PostgreSQL...${NC}"
EVIDENCE_COUNT=$(PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -t -c "SELECT COUNT(*) FROM evidence WHERE case_id='$CASE_ID';" 2>/dev/null || echo "0")

if [ "$EVIDENCE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}  ✓ Evidence record found: $EVIDENCE_COUNT${NC}"
else
  echo -e "${YELLOW}  ⏳ Waiting for metadata to be inserted...${NC}"
fi

# Check Redis cache
echo -e "${YELLOW}  Checking Redis...${NC}"
REDIS_KEYS=$(redis-cli -p 6379 KEYS "*evidence*" 2>/dev/null | wc -l || echo "0")

if [ "$REDIS_KEYS" -gt 0 ]; then
  echo -e "${GREEN}  ✓ Evidence cache entries: $REDIS_KEYS${NC}"
else
  echo -e "${YELLOW}  ⏳ Waiting for cache entries...${NC}"
fi

echo ""

# ============================================================================
# STEP 6: Next Steps & Commands
# ============================================================================
echo -e "${YELLOW}📋 STEP 6: Next Steps & Monitoring Commands${NC}"
echo ""

echo "  Server Running:"
echo "    URL: http://localhost:5174"
echo "    Dev Console: /tmp/dev-server.log"
echo ""

echo "  MinIO Console:"
echo "    URL: http://localhost:9001"
echo "    Username: minioadmin"
echo "    Password: minioadmin"
echo "    Bucket: legal-evidence"
echo ""

echo "  Monitor Evidence in Database:"
echo "    PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -c \\"
echo "      'SELECT id, case_id, title, file_size, created_at FROM evidence ORDER BY created_at DESC LIMIT 5;'"
echo ""

echo "  Monitor Embeddings Generated:"
echo "    PGPASSWORD=123456 psql -h localhost -U legal_admin -d legal_ai_db -c \\"
echo "      'SELECT COUNT(*) as total, model FROM embeddings GROUP BY model;'"
echo ""

echo "  Test RAG Search (after embeddings complete):"
echo "    curl -X POST http://localhost:5174/api/rag/search \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"query\": \"legal evidence document\", \"limit\": 5}'"
echo ""

echo "  View Server Logs:"
echo "    tail -f /tmp/dev-server.log"
echo ""

# ============================================================================
# STEP 7: Keep Server Running
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Test Complete - Server Running${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Press CTRL+C to stop the server"
echo ""

# Wait for server
wait $DEV_PID
