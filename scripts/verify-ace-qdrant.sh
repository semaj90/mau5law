#!/bin/bash
# Verification script for ACE Qdrant Collection Setup
# Checks if Qdrant is running and collection is properly configured

set -e

QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
COLLECTION_NAME="ace_chunks"

echo "========================================="
echo "ACE Qdrant Collection Verification"
echo "========================================="
echo ""

# Check if Qdrant is running
echo "1. Checking if Qdrant is running..."
if curl -s -f "${QDRANT_URL}/collections" > /dev/null 2>&1; then
  echo "   ✓ Qdrant is running at ${QDRANT_URL}"
else
  echo "   ✗ Qdrant is not running at ${QDRANT_URL}"
  echo "   Start Qdrant with: docker-compose up -d qdrant"
  exit 1
fi

echo ""

# Check if collection exists
echo "2. Checking if collection '${COLLECTION_NAME}' exists..."
COLLECTION_RESPONSE=$(curl -s "${QDRANT_URL}/collections/${COLLECTION_NAME}")

if echo "$COLLECTION_RESPONSE" | grep -q '"status":"ok"'; then
  echo "   ✓ Collection '${COLLECTION_NAME}' exists"

  # Extract collection info
  VECTOR_SIZE=$(echo "$COLLECTION_RESPONSE" | grep -o '"size":[0-9]*' | head -1 | cut -d':' -f2)
  DISTANCE=$(echo "$COLLECTION_RESPONSE" | grep -o '"distance":"[^"]*"' | head -1 | cut -d'"' -f4)
  POINTS_COUNT=$(echo "$COLLECTION_RESPONSE" | grep -o '"points_count":[0-9]*' | cut -d':' -f2)

  echo "   - Vector size: ${VECTOR_SIZE:-384}"
  echo "   - Distance metric: ${DISTANCE:-Cosine}"
  echo "   - Points count: ${POINTS_COUNT:-0}"
else
  echo "   ✗ Collection '${COLLECTION_NAME}' does not exist"
  echo "   Collection will be created automatically on first use"
  echo "   Or run: npm run ace:setup-qdrant"
fi

echo ""

# Check collection configuration
echo "3. Verifying collection configuration..."
if echo "$COLLECTION_RESPONSE" | grep -q '"size":384'; then
  echo "   ✓ Vector dimension is 384"
else
  echo "   ⚠ Vector dimension is not 384 (expected for nomic-embed-text)"
fi

if echo "$COLLECTION_RESPONSE" | grep -q '"distance":"Cosine"'; then
  echo "   ✓ Distance metric is Cosine"
else
  echo "   ⚠ Distance metric is not Cosine"
fi

echo ""

# List all collections
echo "4. Available collections:"
ALL_COLLECTIONS=$(curl -s "${QDRANT_URL}/collections" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ALL_COLLECTIONS" ]; then
  echo "$ALL_COLLECTIONS" | while read -r collection; do
    echo "   - $collection"
  done
else
  echo "   (no collections found)"
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. If collection doesn't exist, it will be created automatically"
echo "  2. Test ingestion: npm run ace:test-ingest"
echo "  3. Test search: npm run ace:test-search"
echo ""
