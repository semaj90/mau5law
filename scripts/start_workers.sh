#!/bin/bash

# Start Python Workers with supervisord
#
# This script starts all MLP workers (embedding, mirror, rerank, citation)
# on bare metal (not in Docker) to avoid CUDA/torch conflicts.
#
# Usage:
#   ./scripts/start_workers.sh
#   ./scripts/start_workers.sh --stop
#   ./scripts/start_workers.sh --status

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_ROOT/venv"
SUPERVISORD_CONF="$PROJECT_ROOT/backend/supervisord.conf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
ACTION="${1:-start}"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

check_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        log_error "Virtual environment not found at $VENV_DIR"
        echo ""
        echo "Create it with:"
        echo "  python -m venv $VENV_DIR"
        echo "  source $VENV_DIR/bin/activate"
        echo "  pip install -r requirements.txt"
        exit 1
    fi
}

activate_venv() {
    if [ -f "$VENV_DIR/bin/activate" ]; then
        source "$VENV_DIR/bin/activate"
        log_info "Virtual environment activated"
    else
        log_error "Could not activate virtual environment"
        exit 1
    fi
}

install_supervisord() {
    if ! python -c "import supervisor" 2>/dev/null; then
        log_warn "supervisord not installed, installing..."
        pip install supervisor -q
        log_info "supervisord installed"
    fi
}

# ============================================================================
# Main Actions
# ============================================================================

case "$ACTION" in
    start)
        echo "🚀 Starting Python Workers"
        echo "=========================="
        echo ""

        # Check prerequisites
        check_venv
        activate_venv
        install_supervisord

        # Verify RabbitMQ is running
        echo "⏳ Checking RabbitMQ..."
        if ! curl -s http://localhost:15672/api/overview > /dev/null 2>&1; then
            log_error "RabbitMQ is not running on localhost:15672"
            echo ""
            echo "Start RabbitMQ with Docker:"
            echo "  docker-compose up -d rabbitmq"
            exit 1
        fi
        log_info "RabbitMQ is running"

        # Verify Postgres is running
        echo "⏳ Checking Postgres..."
        if ! psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1" > /dev/null 2>&1; then
            log_error "Postgres is not running on localhost:5432"
            echo ""
            echo "Start Postgres with Docker:"
            echo "  docker-compose up -d postgres"
            exit 1
        fi
        log_info "Postgres is running"

        # Verify Redis is running
        echo "⏳ Checking Redis..."
        if ! redis-cli ping > /dev/null 2>&1; then
            log_error "Redis is not running on localhost:6379"
            echo ""
            echo "Start Redis with Docker:"
            echo "  docker-compose up -d redis"
            exit 1
        fi
        log_info "Redis is running"

        echo ""
        log_info "All prerequisites met"
        echo ""

        # Start supervisord
        echo "🔄 Starting supervisord..."
        supervisord -c "$SUPERVISORD_CONF"

        echo ""
        log_info "Workers started"
        echo ""
        echo "Monitor workers:"
        echo "  supervisorctl -c $SUPERVISORD_CONF status"
        echo ""
        echo "View logs:"
        echo "  tail -f /tmp/embedding-worker.out.log"
        echo "  tail -f /tmp/mirror-worker.out.log"
        echo "  tail -f /tmp/rerank-worker.out.log"
        echo "  tail -f /tmp/citation-worker.out.log"
        echo ""
        ;;

    stop)
        echo "🛑 Stopping Python Workers"
        echo "=========================="
        echo ""

        if [ -f /tmp/supervisord.pid ]; then
            supervisorctl -c "$SUPERVISORD_CONF" shutdown
            log_info "Workers stopped"
        else
            log_warn "supervisord is not running"
        fi
        ;;

    status)
        echo "📊 Worker Status"
        echo "================"
        echo ""

        if [ -f /tmp/supervisord.pid ]; then
            supervisorctl -c "$SUPERVISORD_CONF" status
        else
            log_warn "supervisord is not running"
            exit 1
        fi
        ;;

    restart)
        echo "🔄 Restarting Python Workers"
        echo "============================"
        echo ""

        if [ -f /tmp/supervisord.pid ]; then
            supervisorctl -c "$SUPERVISORD_CONF" restart all
            log_info "Workers restarted"
        else
            log_warn "supervisord is not running, starting..."
            "$0" start
        fi
        ;;

    logs)
        echo "📋 Worker Logs"
        echo "=============="
        echo ""

        WORKER="${2:-embedding}"
        case "$WORKER" in
            embedding)
                tail -f /tmp/embedding-worker.out.log
                ;;
            mirror)
                tail -f /tmp/mirror-worker.out.log
                ;;
            rerank)
                tail -f /tmp/rerank-worker.out.log
                ;;
            citation)
                tail -f /tmp/citation-worker.out.log
                ;;
            *)
                log_error "Unknown worker: $WORKER"
                echo "Available workers: embedding, mirror, rerank, citation"
                exit 1
                ;;
        esac
        ;;

    *)
        echo "Usage: $0 {start|stop|status|restart|logs [worker]}"
        echo ""
        echo "Actions:"
        echo "  start              Start all workers"
        echo "  stop               Stop all workers"
        echo "  status             Show worker status"
        echo "  restart            Restart all workers"
        echo "  logs [worker]      Show logs for a worker"
        echo ""
        echo "Workers:"
        echo "  embedding          Embedding generation (2 processes)"
        echo "  mirror             Qdrant + Postgres mirroring (1 process)"
        echo "  rerank             MiniLM reranking (1 process)"
        echo "  citation           Citation extraction (1 process)"
        echo ""
        exit 1
        ;;
esac
