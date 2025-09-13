#!/bin/bash
# Stop Docker infrastructure services
# Use this after start-hybrid-dev.sh to clean up Docker containers

echo "🛑 Stopping Docker Infrastructure Services"
echo "═══════════════════════════════════════════"

# Stop and remove containers
echo "🐳 Stopping Docker services..."
docker-compose -f docker-compose.yml down

# Optional: Remove volumes (uncomment if you want to reset data)
# echo "🗑️  Removing data volumes..."
# docker-compose -f docker-compose.yml down -v

echo "✅ Docker infrastructure stopped"
echo ""
echo "💡 Your npm run dev frontend can still run independently"
echo "💡 Run './start-hybrid-dev.sh' to restart Docker infrastructure"