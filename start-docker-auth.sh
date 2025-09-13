#!/bin/bash
# Start SvelteKit with Authentication in Docker Desktop
# Supports dynamic port allocation and service discovery

set -e

echo "🐳 Starting Legal AI SvelteKit with Authentication"
echo "════════════════════════════════════════════════"

# Check if Docker Desktop is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Load environment variables
if [ -f "./sveltekit-frontend/.env.docker" ]; then
    export $(cat ./sveltekit-frontend/.env.docker | grep -v '#' | xargs)
fi

# Create network if it doesn't exist
echo "🔗 Creating Docker network..."
docker network create legal-ai-network 2>/dev/null || echo "Network already exists"

# Dynamic port allocation
VITE_PORT=${VITE_PORT:-5174}
PROXY_PORT=${PROXY_PORT:-8080}

echo "📊 Port Configuration:"
echo "   Vite Dev Server: $VITE_PORT"
echo "   Error Logger Proxy: $PROXY_PORT"
echo "   PostgreSQL: 5433"
echo "   Redis: 6379"

# Start core infrastructure first
echo "🏗️  Starting infrastructure services..."
docker-compose -f docker-compose.yml up -d postgres redis minio

# Wait for services to be healthy
echo "⏳ Waiting for infrastructure services..."
until docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

until docker exec legal-ai-redis redis-cli ping | grep -q PONG; do
    echo "   Waiting for Redis..."
    sleep 2
done

echo "✅ Infrastructure ready!"

# Start SvelteKit with authentication
echo "🚀 Starting SvelteKit with Authentication..."
VITE_PORT=$VITE_PORT PROXY_PORT=$PROXY_PORT docker-compose -f docker-compose.sveltekit.yml up --build

echo ""
echo "🎉 SvelteKit with Authentication is ready!"
echo "════════════════════════════════════════════════"
echo "🌐 Frontend (Direct):     http://localhost:$VITE_PORT"
echo "🔧 Error Logger Proxy:    http://localhost:$PROXY_PORT"
echo "🔒 Protected Route:       http://localhost:$VITE_PORT/protected"
echo "👤 Login:                 http://localhost:$VITE_PORT/auth/login"
echo "📝 Register:              http://localhost:$VITE_PORT/auth/register"
echo ""
echo "💡 Tip: Use Ctrl+C to stop all services"