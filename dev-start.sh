#!/bin/bash
# Legal AI Development Environment Startup Script
# Integrates with existing LLM orchestrator and adds Go hot-reload

set -e

echo "🚀 Starting Legal AI Development Environment..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    netstat -tuln | grep ":$1 " >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts...${NC}"
        sleep 2
    done

    echo -e "${RED}❌ $service_name failed to start within timeout${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

if ! command_exists go; then
    echo -e "${RED}❌ Go is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ Node.js/npm is not installed${NC}"
    exit 1
fi

# Install Air if not present
if ! command_exists air; then
    echo -e "${YELLOW}📦 Installing Air for Go hot reload...${NC}"
    go install github.com/cosmtrek/air@latest
    export PATH="$PATH:$(go env GOPATH)/bin"
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"

# Step 1: Start backend infrastructure
echo -e "\n${BLUE}📦 Starting backend infrastructure...${NC}"

# Stop any existing containers
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d postgres redis minio qdrant

# Wait for databases to be ready
wait_for_service "http://localhost:5432" "PostgreSQL" || {
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
}

wait_for_service "http://localhost:6379" "Redis" || {
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
}

echo -e "${GREEN}✅ Infrastructure services started${NC}"

# Step 2: Start Go services with hot reload
echo -e "\n${BLUE}🐹 Starting Go microservices with hot reload...${NC}"

# Create tmp directory for binaries
mkdir -p tmp

# Start Go services in background
echo -e "${YELLOW}   Starting Legal Gateway (port 8080)...${NC}"
if port_in_use 8080; then
    echo -e "${YELLOW}⚠️ Port 8080 already in use, skipping Legal Gateway${NC}"
else
    air -c .air.toml > tmp/legal-gateway.log 2>&1 &
    LEGAL_GATEWAY_PID=$!
    echo "Legal Gateway PID: $LEGAL_GATEWAY_PID" > tmp/pids.txt
fi

echo -e "${YELLOW}   Starting Enhanced RAG Service (port 8094)...${NC}"
if port_in_use 8094; then
    echo -e "${YELLOW}⚠️ Port 8094 already in use, skipping Enhanced RAG${NC}"
else
    air -c .air-rag.toml > tmp/enhanced-rag.log 2>&1 &
    ENHANCED_RAG_PID=$!
    echo "Enhanced RAG PID: $ENHANCED_RAG_PID" >> tmp/pids.txt
fi

echo -e "${YELLOW}   Starting GPU Orchestrator (port 8095)...${NC}"
if port_in_use 8095; then
    echo -e "${YELLOW}⚠️ Port 8095 already in use, skipping GPU Orchestrator${NC}"
else
    air -c .air-gpu.toml > tmp/gpu-orchestrator.log 2>&1 &
    GPU_ORCHESTRATOR_PID=$!
    echo "GPU Orchestrator PID: $GPU_ORCHESTRATOR_PID" >> tmp/pids.txt
fi

# Give Go services time to start
sleep 5

# Step 3: Start MCP Multi-core server
echo -e "\n${BLUE}🔄 Starting MCP Multi-core server...${NC}"
cd sveltekit-frontend

if [ -f "scripts/mcp-multicore-server.mjs" ]; then
    if port_in_use 3002; then
        echo -e "${YELLOW}⚠️ Port 3002 already in use, skipping MCP server${NC}"
    else
        echo -e "${YELLOW}   Starting MCP server (port 3002)...${NC}"
        MCP_PORT=3002 node scripts/mcp-multicore-server.mjs > ../tmp/mcp-multicore.log 2>&1 &
        MCP_PID=$!
        echo "MCP Server PID: $MCP_PID" >> ../tmp/pids.txt
    fi
else
    echo -e "${YELLOW}⚠️ MCP server script not found, skipping${NC}"
fi

# Step 4: Start SvelteKit with LLM orchestrator
echo -e "\n${BLUE}⚡ Starting SvelteKit with LLM orchestrator...${NC}"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
    npm install
fi

# Start SvelteKit dev server
echo -e "${YELLOW}   Starting SvelteKit dev server (port 5173)...${NC}"

# Check if dev:full script exists
if npm run --silent dev:full --dry-run >/dev/null 2>&1; then
    npm run dev:full > ../tmp/sveltekit.log 2>&1 &
    SVELTEKIT_PID=$!
    echo "SvelteKit PID: $SVELTEKIT_PID" >> ../tmp/pids.txt
else
    echo -e "${YELLOW}⚠️ dev:full script not found, using regular dev${NC}"
    npm run dev > ../tmp/sveltekit.log 2>&1 &
    SVELTEKIT_PID=$!
    echo "SvelteKit PID: $SVELTEKIT_PID" >> ../tmp/pids.txt
fi

cd ..

# Step 5: Wait for services to be ready
echo -e "\n${BLUE}⏳ Waiting for services to be ready...${NC}"

# Wait for Go services
sleep 10

echo -e "${YELLOW}   Checking Legal Gateway...${NC}"
wait_for_service "http://localhost:8080/health" "Legal Gateway" || echo -e "${YELLOW}⚠️ Legal Gateway may not be ready${NC}"

echo -e "${YELLOW}   Checking Enhanced RAG Service...${NC}"
wait_for_service "http://localhost:8094/health" "Enhanced RAG" || echo -e "${YELLOW}⚠️ Enhanced RAG may not be ready${NC}"

echo -e "${YELLOW}   Checking SvelteKit...${NC}"
wait_for_service "http://localhost:5173" "SvelteKit" || echo -e "${YELLOW}⚠️ SvelteKit may not be ready${NC}"

# Step 6: Display status and usage information
echo -e "\n${GREEN}🎉 Legal AI Development Environment Started!${NC}"
echo -e "================================================"
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "   🌐 Frontend (SvelteKit): ${GREEN}http://localhost:5173${NC}"
echo -e "   🔧 Legal Gateway API: ${GREEN}http://localhost:8080${NC}"
echo -e "   🤖 Enhanced RAG API: ${GREEN}http://localhost:8094${NC}"
echo -e "   🖥️  GPU Orchestrator: ${GREEN}http://localhost:8095${NC}"
echo -e "   🔄 MCP Multi-core: ${GREEN}http://localhost:3002${NC}"
echo -e "   🗄️  PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "   🔴 Redis: ${GREEN}localhost:6379${NC}"
echo -e "   📦 MinIO: ${GREEN}http://localhost:9001${NC}"

echo -e "\n${BLUE}🧠 LLM Orchestrator Features:${NC}"
echo -e "   • Smart routing between server/client/MCP orchestrators"
echo -e "   • Automatic fallback handling"
echo -e "   • Legal domain detection"
echo -e "   • Performance monitoring"

echo -e "\n${BLUE}🧪 Testing & Development:${NC}"
echo -e "   • Test integration: ${YELLOW}curl http://localhost:5173/api/ai/test-orchestrator${NC}"
echo -e "   • Chat API: ${YELLOW}curl -X POST http://localhost:5173/api/ai/chat -H 'Content-Type: application/json' -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'${NC}"
echo -e "   • Load testing: ${YELLOW}cd load-tester && go run . -ramp -rampStart 1 -rampMax 10${NC}"

echo -e "\n${BLUE}📝 Log Files:${NC}"
echo -e "   • Legal Gateway: ${YELLOW}tmp/legal-gateway.log${NC}"
echo -e "   • Enhanced RAG: ${YELLOW}tmp/enhanced-rag.log${NC}"
echo -e "   • GPU Orchestrator: ${YELLOW}tmp/gpu-orchestrator.log${NC}"
echo -e "   • SvelteKit: ${YELLOW}tmp/sveltekit.log${NC}"
echo -e "   • MCP Server: ${YELLOW}tmp/mcp-multicore.log${NC}"

echo -e "\n${BLUE}🔧 Hot Reload Active:${NC}"
echo -e "   • Go services will auto-rebuild on code changes"
echo -e "   • SvelteKit will auto-reload on frontend changes"
echo -e "   • Database schema changes require manual migration"

echo -e "\n${BLUE}🛑 To stop all services:${NC}"
echo -e "   ${YELLOW}./dev-stop.sh${NC} or ${YELLOW}Ctrl+C${NC} then cleanup with:"
echo -e "   ${YELLOW}docker-compose -f docker-compose.dev.yml down${NC}"

echo -e "\n${GREEN}🚀 Ready for development! Open http://localhost:5173${NC}"

# Keep script running and monitor services
echo -e "\n${BLUE}📡 Monitoring services... (Ctrl+C to stop)${NC}"

# Function to check if process is still running
check_process() {
    if [ -n "$1" ] && kill -0 "$1" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Monitor loop
while true; do
    sleep 30

    # Check if any Go processes died
    if [ -f "tmp/pids.txt" ]; then
        while IFS= read -r line; do
            if [[ $line == *"PID:"* ]]; then
                pid=$(echo "$line" | grep -o '[0-9]\+')
                service=$(echo "$line" | cut -d' ' -f1-2)

                if ! check_process "$pid"; then
                    echo -e "${RED}⚠️ $service died (PID: $pid)${NC}"
                fi
            fi
        done < "tmp/pids.txt"
    fi

    # Optional: Add restart logic here
done