#!/bin/bash

# RabbitMQ Bootstrap Script
#
# Sets up RabbitMQ vhost, users, and permissions for legal AI system
#
# Usage:
#   ./scripts/bootstrap_rabbitmq.sh
#   ./scripts/bootstrap_rabbitmq.sh --host rabbitmq.example.com --user admin --password admin123

set -e

# Configuration
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_ADMIN_USER="${RABBITMQ_ADMIN_USER:-guest}"
RABBITMQ_ADMIN_PASS="${RABBITMQ_ADMIN_PASS:-guest}"
VHOST="/legalai"
USER="legalai"
PASSWORD="legalai123"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            RABBITMQ_HOST="$2"
            shift 2
            ;;
        --port)
            RABBITMQ_PORT="$2"
            shift 2
            ;;
        --admin-user)
            RABBITMQ_ADMIN_USER="$2"
            shift 2
            ;;
        --admin-pass)
            RABBITMQ_ADMIN_PASS="$2"
            shift 2
            ;;
        --user)
            USER="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🐰 RabbitMQ Bootstrap"
echo "===================="
echo "Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "VHost: $VHOST"
echo "User: $USER"
echo ""

# Check if RabbitMQ is running (use curl instead of nc for cross-platform compatibility)
echo "⏳ Checking RabbitMQ connection..."
if ! curl -s http://$RABBITMQ_HOST:15672/api/overview > /dev/null 2>&1; then
    echo "❌ RabbitMQ is not running on $RABBITMQ_HOST:15672"
    echo ""
    echo "Start RabbitMQ with Docker:"
    echo "  docker run -d --name rabbitmq-legal -p 5672:5672 -p 15672:15672 rabbitmq:3-management"
    exit 1
fi

echo "✅ RabbitMQ is running"
echo ""

# Use rabbitmqctl if available (local installation)
if command -v rabbitmqctl &> /dev/null; then
    echo "📝 Using local rabbitmqctl..."

    # Add vhost
    echo "Creating vhost: $VHOST"
    rabbitmqctl add_vhost "$VHOST" || echo "  (vhost may already exist)"

    # Add user
    echo "Creating user: $USER"
    rabbitmqctl add_user "$USER" "$PASSWORD" || echo "  (user may already exist)"

    # Set permissions
    echo "Setting permissions..."
    rabbitmqctl set_permissions -p "$VHOST" "$USER" ".*" ".*" ".*"

    echo "✅ RabbitMQ bootstrap complete"
    exit 0
fi

# Use Docker if rabbitmqctl not available
if command -v docker &> /dev/null; then
    echo "📝 Using Docker..."

    # Check if container is running (prefer the start_services.sh name)
    CONTAINER_NAME="rabbitmq-legal"
    CONTAINER_ID=$(docker ps -q -f "name=${CONTAINER_NAME}" 2>/dev/null || echo "")
    if [ -z "$CONTAINER_ID" ]; then
        CONTAINER_NAME="rabbitmq"
        CONTAINER_ID=$(docker ps -q -f "name=${CONTAINER_NAME}" 2>/dev/null || echo "")
    fi

    if [ -z "$CONTAINER_ID" ]; then
        echo "❌ RabbitMQ Docker container not found"
        echo ""
        echo "Start RabbitMQ with:"
        echo "  docker run -d --name rabbitmq-legal -p 5672:5672 -p 15672:15672 rabbitmq:3-management"
        exit 1
    fi

    # Add vhost
    echo "Creating vhost: $VHOST"
    docker exec -i "$CONTAINER_NAME" rabbitmqctl add_vhost "$VHOST" || echo "  (vhost may already exist)"

    # Add user
    echo "Creating user: $USER"
    docker exec -i "$CONTAINER_NAME" rabbitmqctl add_user "$USER" "$PASSWORD" || echo "  (user may already exist)"

    # Set permissions
    echo "Setting permissions..."
    docker exec -i "$CONTAINER_NAME" rabbitmqctl set_permissions -p "$VHOST" "$USER" ".*" ".*" ".*"

    # Declare exchange and queues (including ingest) via rabbitmqadmin
    for cmd in \
        "declare exchange name=rag_ai type=direct durable=true" \
        "declare exchange name=rag_ai_dlx type=direct durable=true"
    do
        docker exec -i "$CONTAINER_NAME" rabbitmqadmin -u "$RABBITMQ_ADMIN_USER" -p "$RABBITMQ_ADMIN_PASS" -V "$VHOST" $cmd || echo "  (exchange may already exist)"
    done

    for q in ingest embedding mirror rerank citation; do
        docker exec -i "$CONTAINER_NAME" rabbitmqadmin -u "$RABBITMQ_ADMIN_USER" -p "$RABBITMQ_ADMIN_PASS" -V "$VHOST" declare queue name=$q durable=true arguments='{"x-dead-letter-exchange":"rag_ai_dlx"}' || echo "  (queue $q may already exist)"
        docker exec -i "$CONTAINER_NAME" rabbitmqadmin -u "$RABBITMQ_ADMIN_USER" -p "$RABBITMQ_ADMIN_PASS" -V "$VHOST" declare binding source=rag_ai destination_type=queue destination=$q routing_key=$q || echo "  (binding for $q may already exist)"
    done

    # Dead-letter queue
    docker exec -i "$CONTAINER_NAME" rabbitmqadmin -u "$RABBITMQ_ADMIN_USER" -p "$RABBITMQ_ADMIN_PASS" -V "$VHOST" declare queue name=dlq durable=true || echo "  (dlq may already exist)"
    docker exec -i "$CONTAINER_NAME" rabbitmqadmin -u "$RABBITMQ_ADMIN_USER" -p "$RABBITMQ_ADMIN_PASS" -V "$VHOST" declare binding source=rag_ai_dlx destination_type=queue destination=dlq routing_key=dlq || echo "  (dlq binding may already exist)"

    echo "✅ RabbitMQ bootstrap complete"
    exit 0
fi

# Use HTTP API as fallback
echo "📝 Using HTTP API..."

# Add vhost
echo "Creating vhost: $VHOST"
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/vhosts/$VHOST" \
    -d '{}' 2>/dev/null || echo "  (vhost may already exist)"

# Add user
echo "Creating user: $USER"
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/users/$USER" \
    -d "{\"password\":\"$PASSWORD\",\"tags\":\"\"}" 2>/dev/null || echo "  (user may already exist)"

# Set permissions
echo "Setting permissions..."
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/permissions/$VHOST/$USER" \
    -d '{"configure":".*","write":".*","read":".*"}' 2>/dev/null

# Declare exchange and queues (HTTP API)
curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/exchanges/$VHOST/rag_ai" \
    -d '{"type":"direct","durable":true}' 2>/dev/null || echo "  (exchange may already exist)"

curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/exchanges/$VHOST/rag_ai_dlx" \
    -d '{"type":"direct","durable":true}' 2>/dev/null || echo "  (dlx may already exist)"

for q in ingest embedding mirror rerank citation; do
    curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
        -H "content-type:application/json" \
        -XPUT "http://$RABBITMQ_HOST:15672/api/queues/$VHOST/$q" \
        -d "{\"durable\":true,\"arguments\":{\"x-dead-letter-exchange\":\"rag_ai_dlx\"}}" 2>/dev/null || echo "  (queue $q may already exist)"
    curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
        -H "content-type:application/json" \
        -XPOST "http://$RABBITMQ_HOST:15672/api/bindings/$VHOST/e/rag_ai/q/$q" \
        -d "{\"routing_key\":\"$q\"}" 2>/dev/null || echo "  (binding $q may already exist)"
done

curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPUT "http://$RABBITMQ_HOST:15672/api/queues/$VHOST/dlq" \
    -d '{"durable":true}' 2>/dev/null || echo "  (dlq may already exist)"

curl -i -u "$RABBITMQ_ADMIN_USER:$RABBITMQ_ADMIN_PASS" \
    -H "content-type:application/json" \
    -XPOST "http://$RABBITMQ_HOST:15672/api/bindings/$VHOST/e/rag_ai_dlx/q/dlq" \
    -d "{\"routing_key\":\"dlq\"}" 2>/dev/null || echo "  (dlq binding may already exist)"

echo "✅ RabbitMQ bootstrap complete"
echo ""
echo "📊 RabbitMQ Management UI:"
echo "  http://$RABBITMQ_HOST:15672"
echo "  Username: $RABBITMQ_ADMIN_USER"
echo "  Password: $RABBITMQ_ADMIN_PASS"
