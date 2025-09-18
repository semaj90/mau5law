#!/bin/bash

# Legal AI Platform QUIC/HTTP3 Startup Script
# Orchestrates Docker Compose with Caddy + SvelteKit 2 + Go Bridge + TensorRT Services
# Optimized for Docker Desktop via WSL2 with RTX 3060 Ti 8GB

set -e

echo "🚀 Starting Legal AI Platform with QUIC/HTTP3 Support"
echo "=================================================="

# Check Docker Desktop is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop first."
    exit 1
fi

# Check NVIDIA Docker runtime
if ! docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu20.04 nvidia-smi >/dev/null 2>&1; then
    echo "⚠️  Warning: NVIDIA Docker runtime not available. TensorRT services will not have GPU access."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs models ollama/models src/lib/server/db/migrations

# Validate Caddyfile
echo "🔍 Validating Caddyfile configuration..."
if command -v caddy &> /dev/null; then
    caddy validate --config Caddyfile.quic
    if [ $? -eq 0 ]; then
        echo "✅ Caddyfile validation passed"
    else
        echo "❌ Caddyfile validation failed. Please check configuration."
        exit 1
    fi
else
    echo "⚠️  Caddy not found locally, skipping validation"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.quic.yml down --remove-orphans

# Pull latest images
echo "⬇️  Pulling latest Docker images..."
docker-compose -f docker-compose.quic.yml pull

# Build custom images
echo "🔨 Building custom images..."
docker-compose -f docker-compose.quic.yml build

# Start core infrastructure first
echo "🗄️  Starting core infrastructure..."
docker-compose -f docker-compose.quic.yml up -d postgres redis qdrant

# Wait for databases to be ready
echo "⏳ Waiting for databases to initialize..."
sleep 15

# Verify database connections
echo "🔗 Verifying database connections..."
docker-compose -f docker-compose.quic.yml exec -T postgres pg_isready -U legal_admin -d legal_ai_db
docker-compose -f docker-compose.quic.yml exec -T redis redis-cli --no-auth-warning -a redis ping

# Start AI services
echo "🤖 Starting AI services..."
docker-compose -f docker-compose.quic.yml up -d ollama

# Wait for Ollama to initialize
echo "⏳ Waiting for Ollama to initialize..."
sleep 10

# Pull required models in Ollama
echo "📥 Pulling required models..."
docker-compose -f docker-compose.quic.yml exec -T ollama ollama pull gemma3:270m
docker-compose -f docker-compose.quic.yml exec -T ollama ollama pull embeddinggemma:latest

# Start TensorRT services (if GPU available)
echo "🔥 Starting TensorRT services..."
docker-compose -f docker-compose.quic.yml up -d tensorrt-legal tensorrt-270m

# Start Go Bridge
echo "🌉 Starting enhanced Go bridge..."
docker-compose -f docker-compose.quic.yml up -d tensorrt-bridge

# Start SvelteKit instances
echo "🎨 Starting SvelteKit frontend instances..."
docker-compose -f docker-compose.quic.yml up -d sveltekit-1 sveltekit-2

# Start Caddy with QUIC/HTTP3
echo "⚡ Starting Caddy with QUIC/HTTP3 support..."
docker-compose -f docker-compose.quic.yml up -d caddy-quic

# Wait for all services to be ready
echo "⏳ Waiting for all services to be ready..."
sleep 20

# Health checks
echo "🏥 Performing health checks..."

# Check main application
if curl -f http://localhost:8080 >/dev/null 2>&1; then
    echo "✅ Main application (Port 8080): Healthy"
else
    echo "❌ Main application (Port 8080): Not responding"
fi

# Check API Gateway
if curl -f http://localhost:8090 >/dev/null 2>&1; then
    echo "✅ API Gateway (Port 8090): Healthy"
else
    echo "❌ API Gateway (Port 8090): Not responding"
fi

# Check Go Bridge
if curl -f http://localhost:8087/health >/dev/null 2>&1; then
    echo "✅ TensorRT Bridge (Port 8087): Healthy"
else
    echo "❌ TensorRT Bridge (Port 8087): Not responding"
fi

# Check health endpoint
if curl -f http://localhost:8888/health >/dev/null 2>&1; then
    echo "✅ Health Check Endpoint (Port 8888): Healthy"
else
    echo "❌ Health Check Endpoint (Port 8888): Not responding"
fi

# Display service status
echo ""
echo "🎯 Legal AI Platform Status"
echo "=========================="
docker-compose -f docker-compose.quic.yml ps

echo ""
echo "🌐 Access Points"
echo "==============="
echo "Main Application (QUIC):  http://localhost:8080"
echo "API Gateway (QUIC):       http://localhost:8090"
echo "SvelteKit Instance 1:     http://localhost:5170"
echo "SvelteKit Instance 2:     http://localhost:5171"
echo "TensorRT Bridge:          http://localhost:8087"
echo "Health Check:             http://localhost:8888/health"
echo ""
echo "🔧 Development Access"
echo "===================="
echo "Direct SvelteKit 1:       http://localhost:5173"
echo "Direct SvelteKit 2:       http://localhost:5174"
echo "PostgreSQL:               localhost:5433"
echo "Redis:                    localhost:6379"
echo "Qdrant:                   http://localhost:6333"
echo ""
echo "💾 GPU Memory Allocation (RTX 3060 Ti 8GB)"
echo "=========================================="
echo "TensorRT Legal Model:     7GB VRAM (Port 8090)"
echo "TensorRT 270M Model:      512MB VRAM (Port 8091)"
echo "Ollama Fallback:          CPU only (Port 11434)"
echo ""
echo "🚀 Platform ready! QUIC/HTTP3 enabled for maximum performance."

# Follow logs
echo ""
echo "📜 Following logs (Ctrl+C to exit)..."
docker-compose -f docker-compose.quic.yml logs -f caddy-quic tensorrt-bridge sveltekit-1