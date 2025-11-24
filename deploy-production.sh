#!/bin/bash

# Production Deployment Script for Legal AI Platform
# This script deploys the complete production stack using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
PROJECT_NAME="legal-ai-production"
ENV_FILE=".env.production"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env.production file exists
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file $ENV_FILE not found. Creating template..."
        create_env_template
    fi

    print_success "Prerequisites check passed"
}

# Function to create environment template
create_env_template() {
    cat > "$ENV_FILE" << EOF
# Production Environment Configuration
# Please update these values before deployment

# Database Configuration
POSTGRES_PASSWORD=secure_password_123

# MinIO Configuration
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password123

# Grafana Configuration
GRAFANA_PASSWORD=admin

# AI API Configuration
REDIS_URL=redis://redis:6379
RAY_HEAD_NODE=ray-head:6379
DISTRIBUTED_MODE=true
NUM_WORKERS=4
BATCH_SIZE=64
CACHE_TTL=7200

# Frontend Configuration
PUBLIC_API_BASE=http://advanced-ai-api:8001
PUBLIC_WS_URL=ws://advanced-ai-api:8001/ws/advanced-ai
DATABASE_URL=postgresql://ai_user:\${POSTGRES_PASSWORD}@postgres:5432/legal_ai_prod
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio:9000
EOF

    print_warning "Created $ENV_FILE template. Please update the values before proceeding."
    echo "Press Enter to continue after updating the environment file..."
    read -r
}

# Function to build and deploy
deploy_stack() {
    print_status "Starting production deployment..."

    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down || true

    # Remove old images (optional)
    read -p "Remove old Docker images to free up space? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing unused Docker images..."
        docker image prune -f
    fi

    # Build and start services
    print_status "Building and starting production stack..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up --build -d

    # Wait for services to be healthy
    print_status "Waiting for services to become healthy..."
    sleep 30

    # Check service health
    check_services_health

    print_success "Production deployment completed successfully!"
    print_status "Access your application at:"
    echo "  - Frontend: http://localhost"
    echo "  - API: http://localhost/api/"
    echo "  - Grafana: http://localhost:3001 (admin/admin)"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - MinIO Console: http://localhost:9001"
}

# Function to check service health
check_services_health() {
    print_status "Checking service health..."

    services=("advanced-ai-api" "sveltekit-frontend" "postgres" "redis" "minio" "prometheus" "grafana")

    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service failed to start"
        fi
    done
}

# Function to show logs
show_logs() {
    print_status "Showing service logs..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
}

# Function to stop stack
stop_stack() {
    print_status "Stopping production stack..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    print_success "Production stack stopped"
}

# Function to restart stack
restart_stack() {
    print_status "Restarting production stack..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart
    print_success "Production stack restarted"
}

# Function to update stack
update_stack() {
    print_status "Updating production stack..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" pull
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    print_success "Production stack updated"
}

# Function to backup data
backup_data() {
    print_status "Creating data backup..."

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="./backups/$TIMESTAMP"

    mkdir -p "$BACKUP_DIR"

    # Backup PostgreSQL
    print_status "Backing up PostgreSQL data..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T postgres pg_dump -U ai_user legal_ai_prod > "$BACKUP_DIR/postgres_backup.sql"

    # Backup Redis (if needed)
    print_status "Backing up Redis data..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T redis redis-cli --rdb "$BACKUP_DIR/redis_backup.rdb"

    print_success "Backup completed: $BACKUP_DIR"
}

# Main menu
show_menu() {
    echo
    echo "========================================"
    echo "  Legal AI Platform - Production Deployment"
    echo "========================================"
    echo "1. Deploy Production Stack"
    echo "2. Check Service Health"
    echo "3. Show Logs"
    echo "4. Stop Stack"
    echo "5. Restart Stack"
    echo "6. Update Stack"
    echo "7. Backup Data"
    echo "8. Exit"
    echo "========================================"
    echo
}

# Main script logic
main() {
    check_prerequisites

    while true; do
        show_menu
        read -p "Choose an option (1-8): " choice

        case $choice in
            1)
                deploy_stack
                ;;
            2)
                check_services_health
                ;;
            3)
                show_logs
                ;;
            4)
                stop_stack
                ;;
            5)
                restart_stack
                ;;
            6)
                update_stack
                ;;
            7)
                backup_data
                ;;
            8)
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-8."
                ;;
        esac

        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"