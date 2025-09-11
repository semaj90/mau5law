@echo off
REM Legal AI Development Environment Cleanup Script for Windows

setlocal enabledelayedexpansion

echo 🛑 Stopping Legal AI Development Environment...
echo ==============================================

REM Stop Node.js processes for SvelteKit and MCP
echo 🔄 Stopping Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

REM Stop Go processes (Air and compiled binaries)
echo 🐹 Stopping Go processes...
taskkill /f /im air.exe >nul 2>&1
taskkill /f /im legal-gateway.exe >nul 2>&1
taskkill /f /im enhanced-rag-service.exe >nul 2>&1
taskkill /f /im gpu-orchestrator.exe >nul 2>&1

REM Stop processes by window title (from start /b commands)
echo 📱 Stopping background processes...
taskkill /f /fi "WINDOWTITLE eq Legal Gateway*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Enhanced RAG*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq GPU Orchestrator*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq SvelteKit*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq MCP Server*" >nul 2>&1

REM Stop Docker containers
echo 🐳 Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down --remove-orphans >nul 2>&1
docker-compose down --remove-orphans >nul 2>&1

REM Clean up temporary files
echo 🧹 Cleaning up temporary files...
if exist tmp\*.log del /q tmp\*.log >nul 2>&1
if exist tmp\legal-gateway.exe del /q tmp\legal-gateway.exe >nul 2>&1
if exist tmp\enhanced-rag-service.exe del /q tmp\enhanced-rag-service.exe >nul 2>&1
if exist tmp\gpu-orchestrator.exe del /q tmp\gpu-orchestrator.exe >nul 2>&1

REM Clean Go build cache
echo 🗂️ Cleaning Go build artifacts...
go clean -cache >nul 2>&1

echo.
echo ✅ Legal AI Development Environment Stopped
echo ==========================================
echo.

echo 📊 Final Status Check:
echo.

REM Check if ports are free (basic check)
echo Checking key ports...

REM Simple port check using netstat
for %%p in (5173 8080 8094 8095 3002 5433 6379) do (
    netstat -an | findstr ":%%p " >nul 2>&1
    if !errorlevel! equ 0 (
        echo    Port %%p: ⚠️ Still in use
    ) else (
        echo    Port %%p: ✅ Free
    )
)

echo.
echo 🚀 To restart development environment:
echo    .\dev-start.bat
echo.

REM Check for running Docker containers
echo 🐳 Checking Docker containers...
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "legal-ai\|postgres\|redis\|minio\|qdrant" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ Some Docker containers may still be running
    echo To force stop all containers: docker stop $(docker ps -q)
) else (
    echo ✅ All development Docker containers stopped
)

echo.
echo 🎯 Environment successfully cleaned up!
echo.

pause