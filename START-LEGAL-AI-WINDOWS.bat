@echo off
setlocal ENABLEDELAYEDEXPANSION
title Legal AI - Windows Startup

cd /d "%~dp0"
echo [Legal AI] Initializing (Windows) at %DATE% %TIME%

where node >nul 2>nul
if errorlevel 1 (
	echo [Error] Node.js is not on PATH. Install Node 18+ and re-run.
	exit /b 1
)

echo [Legal AI] Starting Dev Orchestrator (npm run dev:full)
set "NODE_OPTIONS="
set "RABBITMQ_URL=%RABBITMQ_URL%"
set "PG_WINDOWS_SERVICE=%PG_WINDOWS_SERVICE%"

REM Optional: speed up installs when needed
REM call npm i --workspaces=false 1>nul 2>nul

call npm run dev:full
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
	echo [Legal AI] Orchestrator exited with code %RC%
	exit /b %RC%
)

echo [Legal AI] Orchestrator launched successfully.
exit /b 0

