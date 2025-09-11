#!/bin/bash
# Legal AI Development Environment Cleanup Script

set -e

echo "🛑 Stopping Legal AI Development Environment..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill process if running
kill_process() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}   Stopping $name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}   ✅ $name stopped${NC}"
                return 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo -e "${YELLOW}   Force killing $name...${NC}"
        kill -9 "$pid" 2>/dev/null || true
        echo -e "${GREEN}   ✅ $name force stopped${NC}"
    else
        echo -e "${BLUE}   $name was not running${NC}"
    fi
}

# Stop processes from PID file
if [ -f "tmp/pids.txt" ]; then
    echo -e "${BLUE}🔄 Stopping Go services and Node processes...${NC}"
    
    while IFS= read -r line; do
        if [[ $line == *"PID:"* ]]; then
            pid=$(echo "$line" | grep -o '[0-9]\+')
            service=$(echo "$line" | sed 's/ PID:.*//')
            kill_process "$pid" "$service"
        fi
    done < "tmp/pids.txt"
    
    rm -f "tmp/pids.txt"
else
    echo -e "${YELLOW}⚠️ No PID file found, trying alternative cleanup...${NC}"
fi

# Alternative cleanup - kill by process name/port
echo -e "\n${BLUE}🧹 Alternative cleanup by process name...${NC}"

# Kill Air processes
echo -e "${YELLOW}   Stopping Air processes...${NC}"
pkill -f "air.*legal-gateway" 2>/dev/null || true
pkill -f "air.*enhanced-rag" 2>/dev/null || true
pkill -f "air.*gpu-orchestrator" 2>/dev/null || true

# Kill Node processes for SvelteKit and MCP
echo -e "${YELLOW}   Stopping Node.js processes...${NC}"
pkill -f "node.*sveltekit" 2>/dev/null || true
pkill -f "node.*mcp-multicore" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Kill any remaining processes on our ports
echo -e "${YELLOW}   Checking for processes on development ports...${NC}"

for port in 5173 8080 8094 8095 3002; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}   Killing process on port $port (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
    fi
done

# Stop Docker containers
echo -e "\n${BLUE}🐳 Stopping Docker containers...${NC}"
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || {
    echo -e "${YELLOW}⚠️ Docker compose file not found or error stopping containers${NC}"
}

# Stop regular docker-compose if running
docker-compose down --remove-orphans 2>/dev/null || true

# Clean up temporary files
echo -e "\n${BLUE}🧹 Cleaning up temporary files...${NC}"
rm -rf tmp/*.log 2>/dev/null || true
rm -rf tmp/legal-gateway tmp/enhanced-rag-service tmp/gpu-orchestrator 2>/dev/null || true

# Clean up build artifacts
echo -e "${YELLOW}   Cleaning Go build artifacts...${NC}"
go clean -cache 2>/dev/null || true

# Optional: Clean Docker volumes (uncomment if you want to reset data)
# echo -e "${YELLOW}   Cleaning Docker volumes...${NC}"
# docker volume prune -f 2>/dev/null || true

# Show final status
echo -e "\n${GREEN}✅ Legal AI Development Environment Stopped${NC}"
echo -e "==========================================\n"

echo -e "${BLUE}📊 Final Status Check:${NC}"

# Check if ports are free
for port in 5173 8080 8094 8095 3002 5433 6379; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "   Port $port: ${RED}Still in use${NC}"
    else
        echo -e "   Port $port: ${GREEN}Free${NC}"
    fi
done

# Check Docker containers
running_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(legal-ai|postgres|redis|minio|qdrant)" || true)
if [ -n "$running_containers" ]; then
    echo -e "\n${YELLOW}⚠️ Some Docker containers are still running:${NC}"
    echo "$running_containers"
    echo -e "\n${BLUE}To force stop all containers:${NC}"
    echo -e "   ${YELLOW}docker stop \$(docker ps -q)${NC}"
else
    echo -e "\n${GREEN}✅ All Docker containers stopped${NC}"
fi

echo -e "\n${BLUE}🚀 To restart development environment:${NC}"
echo -e "   ${YELLOW}./dev-start.sh${NC}"

echo -e "\n${GREEN}🎯 Environment successfully cleaned up!${NC}"