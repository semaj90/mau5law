#!/bin/bash

# Legal AI Evidence Processing System - GPU Docker Run Startup
# WSL Linux Build and Run Script
# Usage: ./docker/start-gpu-wsl.sh [action]
# Actions: build, run, stop, logs, shell, clean

set -e

# Configuration
IMAGE_NAME="legal-ai-gpu"
IMAGE_TAG="latest"
CONTAINER_NAME="legal-ai-gpu-container"
DOCKERFILE="docker/Dockerfile.cuda"
CONTEXT="."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check NVIDIA Docker runtime
    if ! docker run --rm --gpus all nvidia/cuda:12.0-runtime-ubuntu22.04 nvidia-smi &> /dev/null; then
        print_warning "NVIDIA Docker runtime not available. GPU support may not work."
        print_info "Install NVIDIA Container Toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    else
        print_success "NVIDIA Docker runtime available"
    fi

    # Check Dockerfile
    if [ ! -f "$DOCKERFILE" ]; then
        print_error "Dockerfile not found at $DOCKERFILE"
        exit 1
    fi
    print_success "Dockerfile found"

    # Check requirements.txt
    if [ ! -f "requirements.txt" ]; then
        print_warning "requirements.txt not found - build may fail"
    else
        print_success "requirements.txt found"
    fi
}

# Build Docker image
build_image() {
    print_header "Building Docker Image"

    print_info "Building $IMAGE_NAME:$IMAGE_TAG from $DOCKERFILE"
    print_info "Context: $CONTEXT"

    docker build \
        -f "$DOCKERFILE" \
        -t "$IMAGE_NAME:$IMAGE_TAG" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        "$CONTEXT"

    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully"
        docker images | grep "$IMAGE_NAME"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Run Docker container
run_container() {
    print_header "Starting Docker Container"

    # Check if container already running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_warning "Container $CONTAINER_NAME already running"
        print_info "Use './docker/start-gpu-wsl.sh stop' to stop it first"
        return
    fi

    # Check if container exists but stopped
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_info "Removing stopped container $CONTAINER_NAME"
        docker rm "$CONTAINER_NAME"
    fi

    print_info "Starting container with GPU support..."

    docker run \
        --name "$CONTAINER_NAME" \
        --gpus all \
        -d \
        -p 8000:8000 \
        -p 5432:5432 \
        -p 6379:6379 \
        -p 6333:6333 \
        -p 9000:9000 \
        -p 5672:5672 \
        -p 7687:7687 \
        -e CUDA_VISIBLE_DEVICES=0 \
        -e PYTHONUNBUFFERED=1 \
        -e LOG_LEVEL=INFO \
        -v "$(pwd)/backend:/app/backend" \
        -v "$(pwd)/sveltekit-frontend:/app/frontend" \
        -v legal-ai-cuda-cache:/app/.cuda_cache \
        "$IMAGE_NAME:$IMAGE_TAG"

    if [ $? -eq 0 ]; then
        print_success "Container started successfully"
        print_info "Container name: $CONTAINER_NAME"
        print_info "Container ID: $(docker ps --filter "name=$CONTAINER_NAME" --format '{{.ID}}')"

        # Wait for container to be ready
        print_info "Waiting for container to be ready..."
        sleep 5

        # Check if container is still running
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            print_success "Container is running"
            print_info "API available at: http://localhost:8000"
            print_info "View logs: ./docker/start-gpu-wsl.sh logs"
        else
            print_error "Container stopped unexpectedly"
            print_info "Check logs: docker logs $CONTAINER_NAME"
            exit 1
        fi
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Stop container
stop_container() {
    print_header "Stopping Docker Container"

    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_warning "Container $CONTAINER_NAME is not running"
        return
    fi

    print_info "Stopping container $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME"

    if [ $? -eq 0 ]; then
        print_success "Container stopped successfully"
    else
        print_error "Failed to stop container"
        exit 1
    fi
}

# View logs
view_logs() {
    print_header "Container Logs"

    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "Container $CONTAINER_NAME does not exist"
        exit 1
    fi

    docker logs -f "$CONTAINER_NAME"
}

# Open shell in container
open_shell() {
    print_header "Opening Shell in Container"

    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "Container $CONTAINER_NAME is not running"
        exit 1
    fi

    print_info "Opening bash shell in $CONTAINER_NAME..."
    docker exec -it "$CONTAINER_NAME" bash
}

# Clean up
clean_up() {
    print_header "Cleaning Up"

    # Stop container
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_info "Stopping container..."
        docker stop "$CONTAINER_NAME"
    fi

    # Remove container
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_info "Removing container..."
        docker rm "$CONTAINER_NAME"
    fi

    # Remove image
    if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
        print_info "Removing image..."
        docker rmi "$IMAGE_NAME:$IMAGE_TAG"
    fi

    # Remove volume
    if docker volume ls --format '{{.Name}}' | grep -q "^legal-ai-cuda-cache$"; then
        print_info "Removing volume..."
        docker volume rm legal-ai-cuda-cache
    fi

    print_success "Cleanup completed"
}

# Status
show_status() {
    print_header "System Status"

    print_info "Docker version:"
    docker --version

    print_info "Image status:"
    if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
        docker images | grep "$IMAGE_NAME"
    else
        print_warning "Image not found"
    fi

    print_info "Container status:"
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker ps -a | grep "$CONTAINER_NAME"
    else
        print_warning "Container not found"
    fi

    print_info "GPU status:"
    docker run --rm --gpus all nvidia/cuda:12.0-runtime-ubuntu22.04 nvidia-smi || print_warning "GPU not available"

    print_info "Volumes:"
    docker volume ls | grep legal-ai || print_warning "No volumes found"
}

# Help
show_help() {
    cat << EOF
${BLUE}Legal AI GPU Docker Run Startup${NC}

${YELLOW}Usage:${NC}
    ./docker/start-gpu-wsl.sh [action]

${YELLOW}Actions:${NC}
    build       - Build Docker image
    run         - Run Docker container
    stop        - Stop Docker container
    logs        - View container logs
    shell       - Open shell in container
    status      - Show system status
    clean       - Clean up (stop, remove container, image, volume)
    help        - Show this help message

${YELLOW}Examples:${NC}
    ./docker/start-gpu-wsl.sh build       # Build image
    ./docker/start-gpu-wsl.sh run         # Start container
    ./docker/start-gpu-wsl.sh logs        # View logs
    ./docker/start-gpu-wsl.sh shell       # Open shell
    ./docker/start-gpu-wsl.sh stop        # Stop container
    ./docker/start-gpu-wsl.sh clean       # Clean everything

${YELLOW}Ports:${NC}
    8000  - FastAPI server
    5432  - PostgreSQL
    6379  - Redis
    6333  - Qdrant
    9000  - MinIO
    5672  - RabbitMQ
    7687  - Neo4j

${YELLOW}Volumes:${NC}
    legal-ai-cuda-cache - CUDA cache

${YELLOW}Environment:${NC}
    CUDA_VISIBLE_DEVICES=0
    PYTHONUNBUFFERED=1
    LOG_LEVEL=INFO

${YELLOW}Notes:${NC}
    - Requires Docker with NVIDIA GPU support
    - WSL 2 with GPU passthrough recommended
    - Build happens in WSL Linux environment
    - Existing compose and build files are not modified

EOF
}

# Main
main() {
    local action="${1:-help}"

    case "$action" in
        build)
            check_prerequisites
            build_image
            ;;
        run)
            check_prerequisites
            if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
                print_warning "Image not found, building first..."
                build_image
            fi
            run_container
            ;;
        stop)
            stop_container
            ;;
        logs)
            view_logs
            ;;
        shell)
            open_shell
            ;;
        status)
            show_status
            ;;
        clean)
            clean_up
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown action: $action"
            show_help
            exit 1
            ;;
    esac
}

# Run main
main "$@"
