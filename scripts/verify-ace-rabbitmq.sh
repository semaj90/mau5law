#!/bin/bash
# Verification script for ACE RabbitMQ Queue Setup
# Checks if RabbitMQ is running and queue is properly configured

set -e

RABBITMQ_URL="${RABBITMQ_URL:-http://localhost:15672}"
RABBITMQ_USER="${RABBITMQ_USER:-legal_admin}"
RABBITMQ_PASS="${RABBITMQ_PASS:-secret123}"
QUEUE_NAME="ace_web_ingest"

echo "========================================="
echo "ACE RabbitMQ Queue Verification"
echo "========================================="
echo ""

# Check if RabbitMQ is running
echo "1. Checking if RabbitMQ is running..."
if curl -s -f -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" "${RABBITMQ_URL}/api/overview" > /dev/null 2>&1; then
  echo "   ✓ RabbitMQ is running at ${RABBITMQ_URL}"
else
  echo "   ✗ RabbitMQ is not running at ${RABBITMQ_URL}"
  echo "   Start RabbitMQ with: docker-compose up -d rabbitmq"
  exit 1
fi

echo ""

# Get RabbitMQ version and status
echo "2. Checking RabbitMQ version and status..."
OVERVIEW=$(curl -s -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" "${RABBITMQ_URL}/api/overview")

if [ -n "$OVERVIEW" ]; then
  VERSION=$(echo "$OVERVIEW" | grep -o '"rabbitmq_version":"[^"]*"' | cut -d'"' -f4)
  CLUSTER_NAME=$(echo "$OVERVIEW" | grep -o '"cluster_name":"[^"]*"' | cut -d'"' -f4)

  echo "   - Version: ${VERSION:-unknown}"
  echo "   - Cluster: ${CLUSTER_NAME:-unknown}"
  echo "   ✓ RabbitMQ is healthy"
else
  echo "   ✗ Could not retrieve RabbitMQ status"
fi

echo ""

# Check if queue exists
echo "3. Checking if queue '${QUEUE_NAME}' exists..."
QUEUE_INFO=$(curl -s -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" "${RABBITMQ_URL}/api/queues/%2F/${QUEUE_NAME}")

if echo "$QUEUE_INFO" | grep -q '"name":"'${QUEUE_NAME}'"'; then
  echo "   ✓ Queue '${QUEUE_NAME}' exists"

  # Extract queue info
  MESSAGES=$(echo "$QUEUE_INFO" | grep -o '"messages":[0-9]*' | head -1 | cut -d':' -f2)
  CONSUMERS=$(echo "$QUEUE_INFO" | grep -o '"consumers":[0-9]*' | cut -d':' -f2)
  DURABLE=$(echo "$QUEUE_INFO" | grep -o '"durable":[a-z]*' | cut -d':' -f2)

  echo "   - Messages: ${MESSAGES:-0}"
  echo "   - Consumers: ${CONSUMERS:-0}"
  echo "   - Durable: ${DURABLE:-false}"

  if [ "$DURABLE" = "true" ]; then
    echo "   ✓ Queue is durable (survives restarts)"
  else
    echo "   ⚠ Queue is not durable"
  fi
else
  echo "   ✗ Queue '${QUEUE_NAME}' does not exist"
  echo "   Queue will be created automatically by worker on first use"
  echo "   Or create manually via Management UI: ${RABBITMQ_URL}"
fi

echo ""

# List all queues
echo "4. Available queues:"
ALL_QUEUES=$(curl -s -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" "${RABBITMQ_URL}/api/queues" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ALL_QUEUES" ]; then
  echo "$ALL_QUEUES" | while read -r queue; do
    echo "   - $queue"
  done
else
  echo "   (no queues found)"
fi

echo ""

# Check connections
echo "5. Checking active connections..."
CONNECTIONS=$(curl -s -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" "${RABBITMQ_URL}/api/connections")
CONNECTION_COUNT=$(echo "$CONNECTIONS" | grep -o '"name":"[^"]*"' | wc -l)

echo "   - Active connections: ${CONNECTION_COUNT}"

if [ "$CONNECTION_COUNT" -gt 0 ]; then
  echo "   ✓ Workers are connected"
else
  echo "   ⚠ No workers connected (expected if worker not started)"
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Management UI: ${RABBITMQ_URL}"
echo "Credentials: ${RABBITMQ_USER} / ${RABBITMQ_PASS}"
echo ""
echo "Next steps:"
echo "  1. Access Management UI: open ${RABBITMQ_URL}"
echo "  2. Start worker: python backend/workers/ace_web_worker.py"
echo "  3. Test ingestion: curl -X POST http://localhost:5173/api/ace/web/ingest"
echo ""
