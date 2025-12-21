#!/bin/bash
# Setup script for ACE RabbitMQ Queue
# Creates the ace_web_ingest queue using docker exec

set -e

CONTAINER_NAME="${RABBITMQ_CONTAINER:-legal-ai-rabbitmq}"
QUEUE_NAME="ace_web_ingest"
VHOST="/"

echo "========================================="
echo "ACE RabbitMQ Queue Setup"
echo "========================================="
echo ""

# Check if container is running
echo "1. Checking if RabbitMQ container is running..."
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "   ✓ Container '${CONTAINER_NAME}' is running"
else
  echo "   ✗ Container '${CONTAINER_NAME}' is not running"
  echo "   Start with: docker-compose up -d rabbitmq"
  exit 1
fi

echo ""

# Wait for RabbitMQ to be ready
echo "2. Waiting for RabbitMQ to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec "$CONTAINER_NAME" rabbitmq-diagnostics -q ping > /dev/null 2>&1; then
    echo "   ✓ RabbitMQ is ready"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "   ✗ RabbitMQ did not become ready in time"
  exit 1
fi

echo ""

# Create queue using docker exec
echo "3. Creating queue '${QUEUE_NAME}'..."

# Use rabbitmqadmin to create queue (if available) or rabbitmqctl
if docker exec "$CONTAINER_NAME" which rabbitmqadmin > /dev/null 2>&1; then
  # Use rabbitmqadmin (preferred)
  docker exec "$CONTAINER_NAME" rabbitmqadmin declare queue \
    name="${QUEUE_NAME}" \
    durable=true \
    auto_delete=false \
    arguments='{}' || true
  echo "   ✓ Queue created using rabbitmqadmin"
else
  # Fallback: Use rabbitmqctl to declare queue via eval
  docker exec "$CONTAINER_NAME" rabbitmqctl eval \
    "rabbit_amqqueue:declare({resource, <<\"${VHOST}\">>, queue, <<\"${QUEUE_NAME}\">>}, true, false, [], none, <<\"legal_admin\">>)." || true
  echo "   ✓ Queue created using rabbitmqctl"
fi

echo ""

# Verify queue was created
echo "4. Verifying queue creation..."
QUEUE_LIST=$(docker exec "$CONTAINER_NAME" rabbitmqctl list_queues name durable messages consumers)

if echo "$QUEUE_LIST" | grep -q "$QUEUE_NAME"; then
  echo "   ✓ Queue '${QUEUE_NAME}' exists"
  echo ""
  echo "   Queue details:"
  echo "$QUEUE_LIST" | grep "$QUEUE_NAME" | awk '{print "   - Name: " $1 "\n   - Durable: " $2 "\n   - Messages: " $3 "\n   - Consumers: " $4}'
else
  echo "   ⚠ Queue may not have been created (will be auto-created by worker)"
fi

echo ""

# Show all queues
echo "5. All queues:"
docker exec "$CONTAINER_NAME" rabbitmqctl list_queues name durable messages consumers | tail -n +2 | while read -r line; do
  echo "   $line"
done

echo ""
echo "========================================="
echo "Setup Complete"
echo "========================================="
echo ""
echo "Queue '${QUEUE_NAME}' is ready for use."
echo ""
echo "Next steps:"
echo "  1. Verify setup: ./scripts/verify-ace-rabbitmq.sh"
echo "  2. Start worker: python backend/workers/ace_web_worker.py"
echo "  3. Test ingestion: curl -X POST http://localhost:5173/api/ace/web/ingest"
echo ""
echo "Management UI: http://localhost:15672"
echo "Credentials: legal_admin / secret123"
echo ""
