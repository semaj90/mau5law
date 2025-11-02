@echo off
echo ================================================
echo    CONTEXT7 MCP SERVER - MULTICORE STARTER
echo ================================================

echo [1/2] Checking Node.js availability...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
) else (
    echo ✅ Node.js available
)

echo [2/2] Starting Context7 MCP Multicore Server...
cd mcp-servers

echo 📋 Available MCP servers:
dir *.js /b

echo.
echo 🚀 Starting context7-server.js...
echo 📊 This provides documentation access for your Legal AI system
echo 🔧 Integrated with MinIO and Context7 documentation service
echo.

node context7-server.js

echo.
echo ⚠️  Context7 MCP Server stopped
pause