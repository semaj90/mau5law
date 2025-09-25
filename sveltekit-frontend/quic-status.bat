@echo off
echo.
echo 🚀 Legal AI QUIC Development Stack Status
echo ==========================================
echo.

echo 📋 Current Services:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul | findstr legal-ai

echo.
echo 🌐 Access URLs:
echo   • Agent Demo (QUIC):  http://localhost:5178/agent-demo
echo   • API Endpoints:      http://localhost:5178/api/
echo   • Health Check:       http://localhost:8082/health
echo   • Network Access:     http://10.0.0.243:5178/agent-demo
echo.

echo 🔧 Management Commands:
echo   • npm run dev:quic          - Start complete QUIC stack
echo   • npm run caddy:stop        - Stop QUIC proxy
echo   • npm run caddy:logs        - View proxy logs
echo.

curl -s http://localhost:8082/health 2>nul | find "ready" >nul
if %errorlevel%==0 (
    echo ✅ QUIC Proxy: READY
) else (
    echo ❌ QUIC Proxy: NOT RUNNING
)

echo.
echo 🎯 Ready for Agentic Development with QUIC/HTTP3!
echo.