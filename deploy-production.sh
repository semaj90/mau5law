#!/bin/bash
set -e

echo "🚀 TensorRT-LLM Legal AI Production Deployment"
echo "=============================================="

# Configuration
COMPOSE_FILES="-f docker-compose.existing-stack.yml -f docker-compose.override.yml"
SERVICES="redis-legal rabbitmq-legal minio-legal qdrant-legal legal-ai-tensorrt nginx-legal-tensorrt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check for NVIDIA Docker support
    if ! docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi &> /dev/null; then
        log_warn "NVIDIA Docker support not detected - GPU acceleration may not work"
    else
        log_info "✅ NVIDIA Docker support detected"
    fi

    log_info "✅ Prerequisites check passed"
}

# Build images
build_images() {
    log_info "Building TensorRT-LLM container..."

    if [ ! -d "TensorRT-LLM/tensorrt_env" ]; then
        log_error "TensorRT-LLM environment not found at TensorRT-LLM/tensorrt_env"
        log_error "Please run the TensorRT-LLM installation first"
        exit 1
    fi

    docker-compose $COMPOSE_FILES build legal-ai-tensorrt
    log_info "✅ Container build completed"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."

    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose $COMPOSE_FILES down --remove-orphans

    # Start infrastructure services first
    log_info "Starting infrastructure services..."
    docker-compose $COMPOSE_FILES up -d redis-legal rabbitmq-legal minio-legal qdrant-legal

    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure services..."
    sleep 30

    # Start TensorRT-LLM service
    log_info "Starting TensorRT-LLM service..."
    docker-compose $COMPOSE_FILES up -d legal-ai-tensorrt

    # Wait for TensorRT service to initialize
    log_info "Waiting for TensorRT-LLM service to initialize..."
    sleep 60

    # Start load balancer
    log_info "Starting load balancer..."
    docker-compose $COMPOSE_FILES up -d nginx-legal-tensorrt

    log_info "✅ All services deployed"
}

# Health check
health_check() {
    log_info "Performing health checks..."

    # Check service status
    echo ""
    docker-compose $COMPOSE_FILES ps
    echo ""

    # Wait for services to be fully ready
    log_info "Waiting for services to be ready..."
    sleep 30

    # Test endpoints
    max_retries=10
    retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        if curl -f http://localhost:8090/health > /dev/null 2>&1; then
            log_info "✅ Health endpoint responding"
            break
        else
            retry_count=$((retry_count + 1))
            log_warn "Health check attempt $retry_count/$max_retries failed, retrying..."
            sleep 10
        fi
    done

    if [ $retry_count -eq $max_retries ]; then
        log_error "Health checks failed after $max_retries attempts"
        return 1
    fi

    log_info "✅ Health checks passed"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."

    if [ -f "smoke-test.py" ]; then
        python3 smoke-test.py
    else
        log_warn "smoke-test.py not found, skipping automated tests"
        log_info "Manual test commands:"
        echo "  curl http://localhost:8090/health"
        echo "  curl -X POST http://localhost:8090/api/legal/query -H 'Content-Type: application/json' -d '{\"query\":\"What is contract law?\"}'"
    fi
}

# Show status
show_status() {
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo ""
    echo "Services:"
    echo "  - Legal AI API: http://localhost:8090"
    echo "  - Health Check: http://localhost:8090/health"
    echo "  - Metrics:      http://localhost:8090/metrics"
    echo ""
    echo "Infrastructure:"
    echo "  - Redis:        localhost:6379"
    echo "  - RabbitMQ:     localhost:5672 (Management: localhost:15672)"
    echo "  - MinIO:        localhost:9000 (Console: localhost:9001)"
    echo "  - Qdrant:       localhost:6333"
    echo ""
    echo "Your PostgreSQL 17 + pgvector containers:"
    echo "  - Connected via host.docker.internal:5433"
    echo ""
    echo "Example API call:"
    echo "  curl -X POST http://localhost:8090/api/legal/query \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"query\": \"What is consideration in contract law?\", \"max_results\": 5}'"
    echo ""
    echo "Logs:"
    echo "  docker logs legal-ai-tensorrt -f"
    echo "  docker-compose $COMPOSE_FILES logs -f"
}

# Cleanup function
cleanup() {
    if [ "$1" = "clean" ]; then
        log_info "Cleaning up deployment..."
        docker-compose $COMPOSE_FILES down --remove-orphans --volumes
        docker system prune -f
        log_info "✅ Cleanup completed"
        exit 0
    fi
}

# Main deployment flow
main() {
    case "${1:-deploy}" in
        "clean")
            cleanup clean
            ;;
        "deploy")
            check_prerequisites
            build_images
            deploy_services
            health_check
            run_smoke_tests
            show_status
            ;;
        "test")
            run_smoke_tests
            ;;
        "status")
            docker-compose $COMPOSE_FILES ps
            echo ""
            curl -s http://localhost:8090/health || echo "Health endpoint not responding"
            ;;
        *)
            echo "Usage: $0 [deploy|test|status|clean]"
            echo ""
            echo "Commands:"
            echo "  deploy  - Full deployment (default)"
            echo "  test    - Run smoke tests only"
            echo "  status  - Show service status"
            echo "  clean   - Stop and remove all services"
            exit 1
            ;;
    esac
}

# Handle Ctrl+C
trap 'echo ""; log_warn "Deployment interrupted"; exit 1' INT

# Run main function
main "$@"