#!/bin/bash
# Docker + npm run dev integration script
# This gives you the best of both worlds: Docker infrastructure + native frontend performance

set -e

echo "🚀 Starting Hybrid Development Environment"
echo "Docker Infrastructure + Native Frontend Performance"
echo "════════════════════════════════════════════════════"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service on port $port..."
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service is ready on port $port"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting for $service..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service failed to start on port $port"
    return 1
}

# Create Docker network
echo "🔗 Setting up Docker network..."
docker network create legal-ai-network 2>/dev/null || echo "   Network already exists"

# Start Docker infrastructure (PostgreSQL, Redis, MinIO)
echo "🐳 Starting Docker infrastructure services..."
cd "$(dirname "$0")"
docker-compose -f docker-compose.yml up -d postgres redis minio

# Wait for services to be ready
check_service "PostgreSQL" 5433
check_service "Redis" 6379
check_service "MinIO" 9000

echo ""
echo "🎯 Docker Infrastructure Ready!"
echo "   PostgreSQL: localhost:5433"
echo "   Redis: localhost:6379"
echo "   MinIO: localhost:9000"
echo ""

# Now start the native frontend with npm run dev
echo "🖥️  Starting native SvelteKit frontend..."
echo "   Using npm run dev for optimal performance and hot reload"
echo ""

cd sveltekit-frontend

# Check if we should use the current npm run dev or a Docker-aware version
if command -v npm &> /dev/null; then
    echo "🚀 Starting SvelteKit with npm run dev..."
    echo "   Frontend: http://localhost:5174"
    echo "   Protected Route: http://localhost:5174/protected"
    echo "   Login: http://localhost:5174/auth/login"
    echo ""
    echo "💡 Press Ctrl+C to stop (Docker services will keep running)"
    echo "💡 Run './stop-docker-infra.sh' to stop Docker services"
    echo ""

    # Start with environment variables for Docker services
    POSTGRES_HOST=localhost \
    POSTGRES_PORT=5433 \
    REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    DATABASE_URL="postgresql://legal_admin:123456@localhost:5433/legal_ai_db" \
    REDIS_URL="redis://localhost:6379" \
    npm run dev
else
    echo "❌ npm not found. Please install Node.js and npm."
    exit 1
fi