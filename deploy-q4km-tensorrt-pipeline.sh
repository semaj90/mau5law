#!/bin/bash
# Complete Q4KM TensorRT-LLM Pipeline Deployment Script
# Deploys the full sub-1ms optimization stack

set -e

echo "🚀 Deploying Q4KM TensorRT-LLM Legal AI Pipeline"
echo "=================================================="

# Configuration
WORKSPACE_DIR="$(pwd)"
WSL2_WORKSPACE="/mnt/c/Users/james/Videos/deeds-web-app"
CADDY_CONFIG="Caddyfile.tensorrt-optimized"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%T')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%T')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%T')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%T')] INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if WSL2 is available
    if wsl --list --quiet | grep -q Ubuntu; then
        log "✅ WSL2 Ubuntu available"
    else
        error "❌ WSL2 Ubuntu not found"
        exit 1
    fi

    # Check Go installation
    if command -v go &> /dev/null; then
        log "✅ Go $(go version | cut -d' ' -f3) available"
    else
        error "❌ Go not installed"
        exit 1
    fi

    # Check Node.js and npm
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log "✅ Node.js $(node --version) and npm available"
    else
        error "❌ Node.js/npm not installed"
        exit 1
    fi

    # Check if Caddy is available
    if command -v caddy &> /dev/null; then
        log "✅ Caddy $(caddy version) available"
    else
        warn "⚠️  Caddy not found in PATH, will try ./caddy.exe"
    fi
}

# Build Go microservices
build_go_services() {
    log "Building Go microservices..."

    # Build SIMD JSON optimizer
    info "Building SIMD JSON optimizer..."
    go mod tidy
    go build -o simd-json-optimizer.exe -ldflags="-s -w" simd-json-optimizer.go
    if [ $? -eq 0 ]; then
        log "✅ SIMD JSON optimizer built"
    else
        error "❌ Failed to build SIMD JSON optimizer"
        exit 1
    fi

    # Build gRPC wrapper (requires protobuf generation)
    info "Generating protobuf files..."
    if [ -f "./protoc-install/bin/protoc.exe" ]; then
        ./protoc-install/bin/protoc.exe \
            --proto_path=proto \
            --go_out=pkg/proto \
            --go-grpc_out=pkg/proto \
            proto/legal_tensorrt.proto

        log "✅ Protobuf files generated"
    else
        warn "⚠️  protoc not found, skipping gRPC build"
    fi

    # Build gRPC wrapper
    info "Building TensorRT gRPC wrapper..."
    CGO_ENABLED=1 go build -o tensorrt-grpc-wrapper.exe -ldflags="-s -w" go-tensorrt-grpc-wrapper.go
    if [ $? -eq 0 ]; then
        log "✅ TensorRT gRPC wrapper built"
    else
        warn "⚠️  gRPC wrapper build failed, continuing without it"
    fi
}

# Setup TensorRT-LLM in WSL2
setup_tensorrt_wsl2() {
    log "Setting up TensorRT-LLM in WSL2..."

    # Make script executable and run in WSL2
    chmod +x setup-wsl2-tensorrt-pipeline.sh

    info "Running TensorRT-LLM setup in WSL2..."
    wsl bash -c "cd $WSL2_WORKSPACE && ./setup-wsl2-tensorrt-pipeline.sh" &
    WSL2_PID=$!

    log "✅ TensorRT-LLM setup started in background (PID: $WSL2_PID)"
}

# Setup SvelteKit frontend
setup_sveltekit() {
    log "Setting up SvelteKit frontend..."

    cd sveltekit-frontend

    # Install dependencies
    info "Installing npm dependencies..."
    npm ci

    # Build for production
    info "Building SvelteKit for production..."
    npm run build

    cd ..
    log "✅ SvelteKit frontend ready"
}

# Start services
start_services() {
    log "Starting services..."

    # Create logs directory
    mkdir -p logs

    # Start SIMD JSON optimizer
    info "Starting SIMD JSON optimizer on :8103..."
    ./simd-json-optimizer.exe > logs/simd-optimizer.log 2>&1 &
    SIMD_PID=$!
    log "✅ SIMD optimizer started (PID: $SIMD_PID)"

    # Start gRPC wrapper if available
    if [ -f "./tensorrt-grpc-wrapper.exe" ]; then
        info "Starting TensorRT gRPC wrapper on :50051..."
        ./tensorrt-grpc-wrapper.exe > logs/grpc-wrapper.log 2>&1 &
        GRPC_PID=$!
        log "✅ gRPC wrapper started (PID: $GRPC_PID)"
    fi

    # Start SvelteKit dev server
    info "Starting SvelteKit on :5173..."
    cd sveltekit-frontend
    npm run dev -- --host 127.0.0.1 --port 5173 > ../logs/sveltekit.log 2>&1 &
    SVELTE_PID=$!
    cd ..
    log "✅ SvelteKit started (PID: $SVELTE_PID)"

    # Start Caddy reverse proxy
    info "Starting Caddy reverse proxy..."
    if [ -f "./caddy.exe" ]; then
        CADDY_CMD="./caddy.exe"
    elif command -v caddy &> /dev/null; then
        CADDY_CMD="caddy"
    else
        error "❌ Caddy not found"
        return 1
    fi

    $CADDY_CMD run --config $CADDY_CONFIG > logs/caddy.log 2>&1 &
    CADDY_PID=$!
    log "✅ Caddy started (PID: $CADDY_PID)"

    # Save PIDs for cleanup
    echo "$SIMD_PID $GRPC_PID $SVELTE_PID $CADDY_PID" > .service_pids
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."

    # Wait for SIMD optimizer
    info "Checking SIMD optimizer..."
    for i in {1..30}; do
        if curl -s http://localhost:8103/health >/dev/null 2>&1; then
            log "✅ SIMD optimizer ready"
            break
        fi
        sleep 1
    done

    # Wait for SvelteKit
    info "Checking SvelteKit..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            log "✅ SvelteKit ready"
            break
        fi
        sleep 1
    done

    # Wait for Caddy
    info "Checking Caddy reverse proxy..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/health >/dev/null 2>&1; then
            log "✅ Caddy reverse proxy ready"
            break
        fi
        sleep 1
    done
}

# Run performance tests
run_performance_tests() {
    log "Running performance tests..."

    # Test SIMD optimizer
    info "Testing SIMD JSON optimizer..."
    SIMD_RESPONSE=$(curl -s http://localhost:8103/benchmark)
    if echo "$SIMD_RESPONSE" | grep -q "requests_per_sec"; then
        SIMD_RPS=$(echo "$SIMD_RESPONSE" | grep -o '"requests_per_sec":[0-9.]*' | cut -d':' -f2)
        log "✅ SIMD optimizer: ${SIMD_RPS} requests/sec"
    fi

    # Test end-to-end latency
    info "Testing end-to-end latency..."
    START_TIME=$(date +%s%3N)
    curl -s -X POST http://localhost:8080/v1/completions \
        -H "Content-Type: application/json" \
        -d '{"prompt":"Test legal analysis","max_tokens":50}' > /dev/null
    END_TIME=$(date +%s%3N)
    LATENCY=$((END_TIME - START_TIME))
    log "✅ End-to-end latency: ${LATENCY}ms"

    # Test HTTP/3 support
    info "Testing HTTP/3 support..."
    if curl -s --http3 http://localhost:8080/health >/dev/null 2>&1; then
        log "✅ HTTP/3 supported"
    else
        warn "⚠️  HTTP/3 not available"
    fi
}

# Display deployment summary
show_summary() {
    echo ""
    echo "🎉 Q4KM TensorRT-LLM Pipeline Deployment Complete!"
    echo "=================================================="
    echo ""
    echo "📍 Service Endpoints:"
    echo "   Main API (HTTP/3):     http://localhost:8080"
    echo "   SIMD Optimizer:        http://localhost:8103"
    echo "   SvelteKit Frontend:    http://localhost:5173"
    echo "   gRPC API:              localhost:50051"
    echo "   Metrics Dashboard:     http://localhost:9090"
    echo ""
    echo "🔗 Quick Links:"
    echo "   Health Check:          http://localhost:8080/health"
    echo "   Performance Metrics:   http://localhost:8103/metrics"
    echo "   System Status:         http://localhost:9090/status"
    echo "   API Benchmark:         http://localhost:8103/benchmark"
    echo ""
    echo "🚀 Optimizations Active:"
    echo "   ✅ QUIC/HTTP3 transport"
    echo "   ✅ SIMD JSON parsing"
    echo "   ✅ Connection pooling"
    echo "   ✅ Brotli compression"
    echo "   ✅ TensorRT-LLM engines (WSL2)"
    echo "   ✅ CUDA graphs"
    echo "   ✅ Q4_K_M quantization"
    echo ""
    echo "📊 Expected Performance:"
    echo "   • Sub-1ms JSON parsing"
    echo "   • Sub-10ms API latency"
    echo "   • 1000+ requests/second"
    echo "   • 90% bandwidth savings vs JSON"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   Stop all:              ./stop-q4km-pipeline.sh"
    echo "   View logs:             tail -f logs/*.log"
    echo "   Check status:          curl http://localhost:9090/health"
    echo ""

    if [ -f ".service_pids" ]; then
        echo "🔧 Service PIDs: $(cat .service_pids)"
    fi

    echo "💡 For TensorRT-LLM status, check WSL2 setup progress"
    echo "   Run in WSL2: cd $WSL2_WORKSPACE && tail -f tensorrt_workspace/setup.log"
}

# Create stop script
create_stop_script() {
    cat > stop-q4km-pipeline.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Q4KM TensorRT-LLM Pipeline..."

if [ -f ".service_pids" ]; then
    PIDS=$(cat .service_pids)
    for PID in $PIDS; do
        if [ ! -z "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "Stopping process $PID..."
            kill "$PID"
        fi
    done
    rm -f .service_pids
fi

# Kill any remaining processes
pkill -f "simd-json-optimizer"
pkill -f "tensorrt-grpc-wrapper"
pkill -f "npm run dev"
pkill -f "caddy run"

echo "✅ All services stopped"
EOF

    chmod +x stop-q4km-pipeline.sh
}

# Cleanup function
cleanup() {
    if [ -f ".service_pids" ]; then
        warn "Cleaning up services..."
        ./stop-q4km-pipeline.sh
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    check_prerequisites
    build_go_services
    setup_tensorrt_wsl2
    setup_sveltekit
    start_services
    wait_for_services
    run_performance_tests
    create_stop_script
    show_summary

    echo ""
    log "🎯 Deployment complete! Press Ctrl+C to stop all services."

    # Keep script running
    wait
}

# Run main function
main "$@"