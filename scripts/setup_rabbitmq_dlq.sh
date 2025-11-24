#!/bin/bash

# RabbitMQ Dead Letter Queue (DLQ) Setup
# Configures retry logic and dead letter exchange for failed tasks

set -e

RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_ADMIN_USER="${RABBITMQ_ADMIN_USER:-guest}"
RABBITMQ_ADMIN_PASS="${RABBITMQ_ADMIN_PASS:-guest}"
RABBITMQ_VHOST="${RABBITMQ_VHOST:-/legalai}"

echo "🐰 Setting up RabbitMQ Dead Letter Queue"
echo "=========================================="
echo "Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "VHost: $RABBITMQ_VHOST"
echo ""

# Check if RabbitMQ is running
echo "⏳ Checking RabbitMQ connection..."
if ! curl -s http://$RABBITMQ_HOST:15672/api/overview > /dev/null 2>&1; then
    echo "❌ RabbitMQ is not running on $RABBITMQ_HOST:15672"
    exit 1
fi

echo "✅ RabbitMQ is running"
echo ""

# Declare Dead Letter Exchange (DLX)
echo "📝 Creating Dead Letter Exchange..."
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/exchanges/$RABBITMQ_VHOST/dlx" \
    -d '{"type":"direct","durable":true}' 2>/dev/null || echo "  (DLX may already exist)"

echo "✅ Dead Letter Exchange created"
echo ""

# Declare Dead Letter Queue (DLQ)
echo "📝 Creating Dead Letter Queue..."
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/queues/$RABBITMQ_VHOST/dlq" \
    -d '{"durable":true}' 2>/dev/null || echo "  (DLQ may already exist)"

echo "✅ Dead Letter Queue created"
echo ""

# Bind DLX to DLQ
echo "📝 Binding DLX to DLQ..."
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPOST "http://$RABBITMQ_HOST:15672/api/bindings/$RABBITMQ_VHOST/e/dlx/q/dlq" \
    -d '{"routing_key":"dlq"}' 2>/dev/null || echo "  (Binding may already exist)"

echo "✅ DLX bound to DLQ"
echo ""

# Configure queues with DLX
QUEUES=("embedding" "mirror" "rerank" "citation")

for queue in "${QUEUES[@]}"; do
    echo "📝 Configuring queue: $queue"

    # Delete existing queue (to update arguments)
    curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
        -XDELETE "http://$RABBITMQ_HOST:15672/api/queues/$RABBITMQ_VHOST/$queue" 2>/dev/null || true

    # Recreate with DLX
    curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
        -H "content-type:application/json" \
        -XPUT "http://$RABBITMQ_HOST:15672/api/queues/$RABBITMQ_VHOST/$queue" \
        -d '{
            "durable": true,
            "arguments": {
                "x-dead-letter-exchange": "dlx",
                "x-dead-letter-routing-key": "dlq",
                "x-message-ttl": 86400000
            }
        }' 2>/dev/null || echo "  (Queue may already exist)"

    echo "  ✅ Queue configured: $queue"
done

echo ""
echo "✅ RabbitMQ Dead Letter Queue setup complete"
echo ""
echo "📊 Queue Configuration:"
echo "  - embedding → dlx → dlq (on failure)"
echo "  - mirror → dlx → dlq (on failure)"
echo "  - rerank → dlx → dlq (on failure)"
echo "  - citation → dlx → dlq (on failure)"
echo ""
echo "🔍 View DLQ:"
echo "  http://$RABBITMQ_HOST:15672 (Queues → dlq)"
