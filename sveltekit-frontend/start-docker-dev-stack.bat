@echo off
echo 🚀 Starting Legal AI Docker Development Stack...
echo ===================================================

echo 📋 Stack Components:
echo   • PostgreSQL 17 + pgvector (port 5432)
echo   • Redis 7 with authentication (port 6379)
echo   • Ollama Gemma3 LLM server (port 11434)
echo   • SvelteKit dev server with HMR (port 5174)
echo   • Caddy QUIC/HTTP3 proxy (port 5178)
echo   • MinIO document storage (ports 9000/9001)
echo   • Agent Demo Interface (http://localhost:5178/agent-demo)
echo.

echo 🔧 Building and starting services...
docker-compose -f docker-compose.dev.yml up --build -d

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 10 /nobreak > nul

echo.
echo 🏥 Health Check:
echo   • Postgres:
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U legal_admin -d legal_ai_db 2>nul && echo "    ✅ PostgreSQL Ready" || echo "    ⏳ PostgreSQL Starting..."

echo   • Redis:
docker-compose -f docker-compose.dev.yml exec redis redis-cli -a redis ping 2>nul && echo "    ✅ Redis Ready" || echo "    ⏳ Redis Starting..."

echo   • Caddy QUIC:
curl -s http://localhost:8082/health 2>nul | find "healthy" >nul && echo "    ✅ Caddy QUIC Ready" || echo "    ⏳ Caddy Starting..."

echo.
echo 🌐 Access URLs:
echo   • Agent Demo:     http://localhost:5178/agent-demo
echo   • API Endpoints:  http://localhost:5178/api/
echo   • Direct Vite:    http://localhost:5174/
echo   • Health Check:   http://localhost:8082/health
echo   • MinIO Console:  http://localhost:9001/
echo   • Ollama:         http://localhost:11434/
echo.

echo 📊 Development Commands:
echo   • npm run docker:logs     - View all container logs
echo   • npm run docker:stop     - Stop all services
echo   • npm run docker:dev      - Restart stack
echo.

echo 🎯 Ready for Agentic Development!
echo   Visit: http://localhost:5178/agent-demo
echo.

pause